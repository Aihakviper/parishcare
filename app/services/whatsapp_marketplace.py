from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.models.enums import Trade, UserRole
from app.models.user import User
from app.models.whatsapp import WhatsAppConversation, WhatsAppInboundEvent
from app.schemas.marketplace import JobCreate
from app.services.audit import AuditService
from app.services.discovery import DiscoveryService, parse_trade
from app.services.marketplace import MarketplaceService
from app.services.errors import ServiceValidationError
from app.services.whatsapp import WhatsAppInboundMessage, WhatsAppService
from app.utils.crypto import (
    LookupHasher,
    PIICipher,
    normalize_email,
    normalize_phone,
)

WHATSAPP_PHONE_CONTEXT = "whatsapp.conversation.phone"
WHATSAPP_RESPONSE_CONTEXT = "whatsapp.inbound.response"

TRADE_OPTIONS = (
    Trade.PLUMBER,
    Trade.ELECTRICIAN,
    Trade.GENERATOR_TECHNICIAN,
    Trade.TAILOR,
    Trade.MECHANIC,
    Trade.CARPENTER,
    Trade.PAINTER,
    Trade.CLEANER,
    Trade.SECURITY,
)
TRADE_ALIASES = {
    "generator": Trade.GENERATOR_TECHNICIAN,
    "generator tech": Trade.GENERATOR_TECHNICIAN,
    "generator technician": Trade.GENERATOR_TECHNICIAN,
    "security guard": Trade.SECURITY,
}


@dataclass(frozen=True)
class WhatsAppMarketplaceResult:
    processed: bool
    duplicate: bool = False


class WhatsAppMarketplaceService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        whatsapp: WhatsAppService,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._whatsapp = whatsapp
        self._config = config
        self._cipher = PIICipher(config.pii_encryption_key)
        self._hasher = LookupHasher(config.pii_lookup_key)
        self._audit = AuditService(session)
        self._discovery = DiscoveryService(session, config=config)

    async def handle(
        self, message: WhatsAppInboundMessage
    ) -> WhatsAppMarketplaceResult:
        existing = await self._event(message.message_id)
        if existing is not None:
            await self._retry_failed_reply(existing, message.sender_phone)
            return WhatsAppMarketplaceResult(processed=False, duplicate=True)

        now = datetime.now(timezone.utc)
        phone = _normalize_meta_phone(message.sender_phone)
        conversation = await self._conversation(phone, now)
        event = WhatsAppInboundEvent(
            provider_message_id=message.message_id,
            conversation_id=conversation.id,
            command="pending",
            status="processing",
            created_at=now,
        )
        self._session.add(event)
        await self._session.flush()
        await self._audit.record(
            actor_id=conversation.user_id,
            action="whatsapp.message_received",
            entity_type="whatsapp_inbound_event",
            entity_id=event.id,
            after_state={"state": conversation.state},
        )

        try:
            try:
                command, response = await self._route(
                    conversation=conversation,
                    body=message.body,
                )
            except ServiceValidationError as exc:
                command = "invalid_input"
                response = f"{exc}. Reply MENU to see the available options."
            event.command = command
            event.response_encrypted = self._cipher.encrypt(
                response,
                context=WHATSAPP_RESPONSE_CONTEXT,
            )
            await self._audit.record(
                actor_id=conversation.user_id,
                action="whatsapp.reply_prepared",
                entity_type="whatsapp_inbound_event",
                entity_id=event.id,
                after_state={
                    "command": command,
                    "state": conversation.state,
                },
            )
            await self._session.commit()

            await self._whatsapp.send_text_message(
                recipient_phone=phone,
                body=response,
            )
            event.status = "processed"
            event.processed_at = datetime.now(timezone.utc)
            await self._audit.record(
                actor_id=conversation.user_id,
                action="whatsapp.reply_sent",
                entity_type="whatsapp_inbound_event",
                entity_id=event.id,
                after_state={"command": command},
            )
            await self._session.commit()
            return WhatsAppMarketplaceResult(processed=True)
        except Exception as exc:
            await self._session.rollback()
            persisted = await self._event(message.message_id)
            if persisted is not None:
                persisted.status = "failed"
                persisted.error_code = type(exc).__name__[:100]
                await self._audit.record(
                    actor_id=conversation.user_id,
                    action="whatsapp.message_failed",
                    entity_type="whatsapp_inbound_event",
                    entity_id=persisted.id,
                    after_state={"error_code": persisted.error_code},
                )
                await self._session.commit()
            raise

    async def _route(
        self,
        *,
        conversation: WhatsAppConversation,
        body: str,
    ) -> tuple[str, str]:
        text = " ".join(body.strip().split())
        normalized = text.casefold()

        if normalized in {"hi", "hello", "help", "menu", "start", "0"}:
            self._set_state(conversation, "menu")
            return "menu", _menu()

        if conversation.state == "awaiting_discovery_trade":
            trade = _parse_user_trade(text)
            self._set_state(conversation, "menu")
            return "find", await self._artisan_results(trade)

        if conversation.state == "awaiting_job_trade":
            trade = _parse_user_trade(text)
            self._set_state(
                conversation,
                "awaiting_job_area",
                {"trade": trade.value},
            )
            return "job_area_prompt", "Enter the service area, e.g. Camp Phase 2."

        if conversation.state == "awaiting_job_area":
            if not 2 <= len(text) <= 200:
                return "job_area_prompt", "Enter a service area of 2-200 characters."
            context = dict(conversation.context)
            context["service_area"] = text
            self._set_state(
                conversation,
                "awaiting_job_description",
                context,
            )
            return (
                "job_description_prompt",
                "Describe the work in at least 10 characters.",
            )

        if conversation.state == "awaiting_job_description":
            if len(text) < 10:
                return (
                    "job_description_prompt",
                    "Please provide a clearer description of at least 10 characters.",
                )
            return await self._create_job(conversation, description=text)

        if normalized in {"1", "find", "find artisan", "artisans"}:
            self._set_state(conversation, "awaiting_discovery_trade")
            return "find_prompt", _trade_menu("Choose an artisan category:")

        if normalized.startswith("find "):
            trade = _parse_user_trade(text[5:])
            self._set_state(conversation, "menu")
            return "find", await self._artisan_results(trade)

        if normalized in {"2", "jobs", "job feed", "feed"}:
            self._set_state(conversation, "menu")
            return "job_feed", await self._job_feed(None)

        if normalized.startswith("jobs "):
            trade = _parse_user_trade(text[5:])
            self._set_state(conversation, "menu")
            return "job_feed", await self._job_feed(trade)

        if normalized in {"3", "book", "create job", "request artisan"}:
            if conversation.user_id is None:
                self._set_state(conversation, "menu")
                return "job_unauthorized", _unlinked_message()
            self._set_state(conversation, "awaiting_job_trade")
            return "job_trade_prompt", _trade_menu("What service do you need?")

        if normalized.startswith("book "):
            return await self._direct_booking(conversation, text[5:])

        self._set_state(conversation, "menu")
        return "unknown", "I did not understand that.\n\n" + _menu()

    async def _direct_booking(
        self,
        conversation: WhatsAppConversation,
        value: str,
    ) -> tuple[str, str]:
        if conversation.user_id is None:
            return "job_unauthorized", _unlinked_message()
        parts = [part.strip() for part in value.split("|")]
        if len(parts) != 3:
            return (
                "job_format_error",
                "Use: BOOK category | service area | job description",
            )
        trade = _parse_user_trade(parts[0])
        self._set_state(
            conversation,
            "awaiting_job_description",
            {"trade": trade.value, "service_area": parts[1]},
        )
        return await self._create_job(conversation, description=parts[2])

    async def _create_job(
        self,
        conversation: WhatsAppConversation,
        *,
        description: str,
    ) -> tuple[str, str]:
        actor = await self._resident(conversation.user_id)
        context = dict(conversation.context)
        trade = parse_trade(str(context.get("trade", "")))
        service_area = str(context.get("service_area", "")).strip()
        job = await MarketplaceService(
            self._session,
            config=self._config,
        ).create_job(
            actor=actor,
            data=JobCreate(
                trade=trade,
                service_area=service_area,
                description=description,
            ),
        )
        self._set_state(conversation, "menu")
        return (
            "job_created",
            "Job request created successfully.\n"
            f"Reference: {str(job.id)[:8]}\n"
            f"Category: {_trade_label(job.trade)}\n"
            f"Area: {job.service_area}\n\n"
            "Reply JOBS to see the public job feed or MENU for options.",
        )

    async def _artisan_results(self, trade: Trade) -> str:
        artisans = await self._discovery.list_artisans(
            trade=trade.value,
            limit=self._config.whatsapp_marketplace_result_limit,
        )
        if not artisans:
            return (
                f"No verified {_trade_label(trade).lower()} is available now.\n"
                "Reply MENU to choose another category."
            )
        lines = [f"Top {_trade_label(trade)} artisans:"]
        for index, artisan in enumerate(artisans, start=1):
            profile = artisan.profile
            lines.append(
                f"{index}. {artisan.name} — {profile.service_area}\n"
                f"   Trust {profile.trust_score}/100, "
                f"{profile.completed_jobs} jobs, "
                f"{profile.average_rating_milli / 1000:.1f} stars"
            )
        lines.append("\nReply BOOK to create a job request.")
        return "\n".join(lines)

    async def _job_feed(self, trade: Trade | None) -> str:
        jobs = await self._discovery.job_feed(
            trade=trade.value if trade else None,
            limit=self._config.whatsapp_marketplace_result_limit,
        )
        if not jobs:
            return "There are no open jobs matching that category."
        lines = ["Open Steward jobs:"]
        for index, job in enumerate(jobs, start=1):
            item = self._discovery.present_job(job)
            lines.append(
                f"{index}. {str(item['trade']).replace('_', ' ').title()} — "
                f"{item['serviceArea']}\n"
                f"   {item['description']}\n"
                f"   Ref: {str(item['id'])[:8]}"
            )
        return "\n".join(lines)

    async def _conversation(
        self,
        phone: str,
        now: datetime,
    ) -> WhatsAppConversation:
        phone_hash = self._hasher.digest(phone)
        conversation = (
            await self._session.execute(
                select(WhatsAppConversation).where(
                    WhatsAppConversation.phone_hash == phone_hash
                )
            )
        ).scalar_one_or_none()
        if conversation is None:
            conversation = WhatsAppConversation(
                phone_encrypted=self._cipher.encrypt(
                    phone,
                    context=WHATSAPP_PHONE_CONTEXT,
                ),
                phone_hash=phone_hash,
                user_id=await self._demo_resident_id(phone),
                state="menu",
                context={},
                last_message_at=now,
            )
            self._session.add(conversation)
            await self._session.flush()
        elif conversation.user_id is None:
            conversation.user_id = await self._demo_resident_id(phone)
        conversation.last_message_at = now
        return conversation

    async def _demo_resident_id(self, phone: str) -> UUID | None:
        configured_phone = self._config.whatsapp_demo_resident_phone.strip()
        configured_email = self._config.whatsapp_demo_resident_email.strip()
        if not configured_phone or not configured_email:
            return None
        try:
            expected_phone = normalize_phone(configured_phone)
        except ValueError:
            return None
        if phone != expected_phone:
            return None
        email_hash = self._hasher.digest(normalize_email(configured_email))
        return (
            await self._session.execute(
                select(User.id).where(
                    User.email_hash == email_hash,
                    User.role == UserRole.RESIDENT,
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()

    async def _resident(self, user_id: UUID | None) -> User:
        if user_id is None:
            raise ValueError("WhatsApp number is not linked to a resident")
        resident = (
            await self._session.execute(
                select(User).where(
                    User.id == user_id,
                    User.role == UserRole.RESIDENT,
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if resident is None:
            raise ValueError("Linked resident account is unavailable")
        return resident

    async def _event(
        self, provider_message_id: str
    ) -> WhatsAppInboundEvent | None:
        return (
            await self._session.execute(
                select(WhatsAppInboundEvent).where(
                    WhatsAppInboundEvent.provider_message_id
                    == provider_message_id
                )
            )
        ).scalar_one_or_none()

    async def _retry_failed_reply(
        self,
        event: WhatsAppInboundEvent,
        sender_phone: str,
    ) -> None:
        if event.status == "processed" or not event.response_encrypted:
            return
        response = self._cipher.decrypt(
            event.response_encrypted,
            context=WHATSAPP_RESPONSE_CONTEXT,
        )
        await self._whatsapp.send_text_message(
            recipient_phone=_normalize_meta_phone(sender_phone),
            body=response,
        )
        event.status = "processed"
        event.error_code = None
        event.processed_at = datetime.now(timezone.utc)
        await self._audit.record(
            actor_id=None,
            action="whatsapp.reply_retried",
            entity_type="whatsapp_inbound_event",
            entity_id=event.id,
            after_state={"command": event.command},
        )
        await self._session.commit()

    @staticmethod
    def _set_state(
        conversation: WhatsAppConversation,
        state: str,
        context: dict[str, object] | None = None,
    ) -> None:
        conversation.state = state
        conversation.context = context or {}


def _normalize_meta_phone(value: str) -> str:
    compact = value.strip().replace(" ", "").replace("-", "")
    if compact.startswith("+"):
        return normalize_phone(compact)
    if compact.isdigit():
        return normalize_phone("+" + compact)
    raise ValueError("WhatsApp sender phone is invalid")


def _parse_user_trade(value: str) -> Trade:
    normalized = " ".join(value.strip().casefold().replace("_", " ").split())
    if normalized.isdigit():
        index = int(normalized) - 1
        if 0 <= index < len(TRADE_OPTIONS):
            return TRADE_OPTIONS[index]
    alias = TRADE_ALIASES.get(normalized)
    if alias is not None:
        return alias
    return parse_trade(normalized.replace(" ", "_"))


def _trade_label(trade: Trade) -> str:
    return trade.value.replace("_", " ").title()


def _trade_menu(title: str) -> str:
    options = "\n".join(
        f"{index}. {_trade_label(trade)}"
        for index, trade in enumerate(TRADE_OPTIONS, start=1)
    )
    return f"{title}\n{options}\n\nReply with a number or category name."


def _menu() -> str:
    return (
        "Welcome to Steward on WhatsApp.\n\n"
        "1. Find a verified artisan\n"
        "2. View open job feed\n"
        "3. Create a job request\n\n"
        "Reply 1, 2, or 3. You can also send HELP anytime."
    )


def _unlinked_message() -> str:
    return (
        "This WhatsApp number is not linked to a resident demo account, "
        "so it cannot create jobs. You can still reply 1 to discover artisans "
        "or 2 to view open jobs."
    )
