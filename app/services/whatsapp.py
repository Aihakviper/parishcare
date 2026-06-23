import hashlib
import hmac
import re
from dataclasses import dataclass

import httpx

from app.core.config import Settings, settings
from app.models.enums import VerificationOutcome
from app.services.errors import ServiceValidationError

WHATSAPP_COMMAND_PATTERN = re.compile(
    r"^\s*(CONFIRM|REJECT)\s+(\S+)\s*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class WhatsAppCommand:
    outcome: VerificationOutcome
    token: str


@dataclass(frozen=True)
class WhatsAppInboundMessage:
    message_id: str
    sender_phone: str
    body: str


class WhatsAppDeliveryError(ServiceValidationError):
    """Raised when WhatsApp Cloud API rejects voucher delivery."""


class WhatsAppService:
    def __init__(
        self,
        *,
        config: Settings = settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._config = config
        self._client = client

    async def send_verification_voucher(
        self,
        *,
        recipient_phone: str,
        token: str,
    ) -> str:
        message = (
            "ParishCare verification request.\n\n"
            "Reply with one of these exact commands:\n"
            f"CONFIRM {token}\n"
            f"REJECT {token}\n\n"
            "Only respond if you recognise this welfare request."
        )
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone.lstrip("+"),
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message,
            },
        }
        headers = {
            "Authorization": (
                "Bearer "
                + self._config.whatsapp_access_token.get_secret_value()
            ),
            "Content-Type": "application/json",
        }
        url = (
            f"{self._config.whatsapp_graph_api_base_url.rstrip('/')}/"
            f"{self._config.whatsapp_phone_number_id}/messages"
        )
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(
            timeout=self._config.whatsapp_request_timeout_seconds
        )
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            messages = body.get("messages", [])
            if not messages or not messages[0].get("id"):
                raise WhatsAppDeliveryError(
                    "WhatsApp did not return a message identifier"
                )
            return str(messages[0]["id"])
        except httpx.HTTPError as exc:
            raise WhatsAppDeliveryError(
                "WhatsApp voucher delivery failed"
            ) from exc
        finally:
            if owns_client:
                await client.aclose()

    async def send_text_message(
        self,
        *,
        recipient_phone: str,
        body: str,
    ) -> str:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone.lstrip("+"),
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }
        response = await self._post_message(payload)
        messages = response.get("messages", [])
        if not messages or not messages[0].get("id"):
            raise WhatsAppDeliveryError(
                "WhatsApp did not return a message identifier"
            )
        return str(messages[0]["id"])

    async def _post_message(
        self, payload: dict[str, object]
    ) -> dict[str, object]:
        headers = {
            "Authorization": (
                "Bearer "
                + self._config.whatsapp_access_token.get_secret_value()
            ),
            "Content-Type": "application/json",
        }
        url = (
            f"{self._config.whatsapp_graph_api_base_url.rstrip('/')}/"
            f"{self._config.whatsapp_phone_number_id}/messages"
        )
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(
            timeout=self._config.whatsapp_request_timeout_seconds
        )
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            if not isinstance(body, dict):
                raise WhatsAppDeliveryError(
                    "WhatsApp returned an invalid response"
                )
            return body
        except httpx.HTTPError as exc:
            raise WhatsAppDeliveryError(
                "WhatsApp message delivery failed"
            ) from exc
        finally:
            if owns_client:
                await client.aclose()

    def verify_webhook_challenge(
        self,
        *,
        mode: str | None,
        verify_token: str | None,
    ) -> bool:
        expected = (
            self._config.whatsapp_webhook_verify_token.get_secret_value()
        )
        return mode == "subscribe" and bool(expected) and hmac.compare_digest(
            verify_token or "",
            expected,
        )

    def verify_webhook_signature(
        self,
        *,
        body: bytes,
        signature_header: str | None,
    ) -> bool:
        if not signature_header or not signature_header.startswith("sha256="):
            return False
        app_secret = self._config.whatsapp_app_secret.get_secret_value()
        if not app_secret:
            return False
        expected = "sha256=" + hmac.new(
            app_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature_header, expected)

    @staticmethod
    def extract_commands(payload: dict[str, object]) -> list[WhatsAppCommand]:
        commands: list[WhatsAppCommand] = []
        for _, _, body in _extract_text_entries(payload):
            match = WHATSAPP_COMMAND_PATTERN.match(body)
            if match is None:
                continue
            outcome = (
                VerificationOutcome.CONFIRMED
                if match.group(1).upper() == "CONFIRM"
                else VerificationOutcome.REJECTED
            )
            commands.append(
                WhatsAppCommand(
                    outcome=outcome,
                    token=match.group(2),
                )
            )
        return commands

    @staticmethod
    def extract_messages(
        payload: dict[str, object],
    ) -> list[WhatsAppInboundMessage]:
        extracted: list[WhatsAppInboundMessage] = []
        for message_id, sender_phone, body in _extract_text_entries(payload):
            if not message_id or not sender_phone:
                continue
            extracted.append(
                WhatsAppInboundMessage(
                    message_id=message_id,
                    sender_phone=sender_phone,
                    body=body,
                )
            )
        return extracted


def _extract_text_entries(
    payload: dict[str, object],
) -> list[tuple[str, str, str]]:
    extracted: list[tuple[str, str, str]] = []
    entries = payload.get("entry", [])
    if not isinstance(entries, list):
        return extracted
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        changes = entry.get("changes", [])
        if not isinstance(changes, list):
            continue
        for change in changes:
            if not isinstance(change, dict):
                continue
            value = change.get("value", {})
            if not isinstance(value, dict):
                continue
            messages = value.get("messages", [])
            if not isinstance(messages, list):
                continue
            for message in messages:
                if not isinstance(message, dict):
                    continue
                message_id = message.get("id")
                sender_phone = message.get("from")
                text = message.get("text", {})
                if not isinstance(text, dict):
                    continue
                body = text.get("body")
                if not isinstance(body, str) or not body:
                    continue
                extracted.append(
                    (
                        message_id if isinstance(message_id, str) else "",
                        (
                            sender_phone
                            if isinstance(sender_phone, str)
                            else ""
                        ),
                        body,
                    )
                )
    return extracted
