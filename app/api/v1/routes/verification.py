from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.enums import VerificationOutcome
from app.models.user import User
from app.schemas.errors import ErrorResponse
from app.schemas.verification import (
    VerificationOutcomeResponse,
    VerificationStartResponse,
    VerificationVoucherResponse,
    WhatsAppWebhookResponse,
)
from app.services.verification import VerificationService
from app.services.whatsapp import WhatsAppService

router = APIRouter()

ERROR_RESPONSES = {
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    410: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "/welfare-requests/{request_id}/verify",
    response_model=VerificationStartResponse,
    responses=ERROR_RESPONSES,
    summary="Start beneficiary verification for a welfare request",
)
async def start_verification(
    request_id: UUID,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.VERIFICATION_START)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> VerificationStartResponse:
    result = await VerificationService(session).start(
        actor=actor,
        welfare_request_id=request_id,
    )
    return VerificationStartResponse(
        mode=result.mode,
        welfare_request_id=result.welfare_request.id,
        welfare_request_status=result.welfare_request.status,
        beneficiary_verification_status=(
            result.beneficiary.verification_status
        ),
        verification_request_id=(
            result.verification_request.id
            if result.verification_request is not None
            else None
        ),
        channel=result.voucher.channel if result.voucher is not None else None,
        expires_at=(
            result.voucher.expires_at if result.voucher is not None else None
        ),
        voucher_token=result.raw_token,
    )


@router.post(
    "/verification-vouchers/respond",
    response_model=VerificationOutcomeResponse,
    responses=ERROR_RESPONSES,
    summary="Confirm or reject a single-use verification voucher",
)
async def respond_to_verification_voucher(
    data: VerificationVoucherResponse,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> VerificationOutcomeResponse:
    result = await VerificationService(session).respond(
        token=data.token,
        outcome=VerificationOutcome(data.outcome),
    )
    return VerificationOutcomeResponse(
        verification_request_id=result.verification_request.id,
        outcome=result.verification_request.outcome,
        welfare_request_id=result.welfare_request.id,
        welfare_request_status=result.welfare_request.status,
        beneficiary_id=result.beneficiary.id,
        beneficiary_verification_status=(
            result.beneficiary.verification_status
        ),
        responded_at=result.verification_request.responded_at,
    )


@router.get(
    "/webhooks/whatsapp",
    response_class=PlainTextResponse,
    include_in_schema=False,
)
async def verify_whatsapp_webhook(
    mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    verify_token: Annotated[
        str | None,
        Query(alias="hub.verify_token"),
    ] = None,
    challenge: Annotated[
        str | None,
        Query(alias="hub.challenge"),
    ] = None,
) -> PlainTextResponse:
    if not WhatsAppService().verify_webhook_challenge(
        mode=mode,
        verify_token=verify_token,
    ):
        raise HTTPException(status_code=403, detail="Invalid webhook token")
    return PlainTextResponse(challenge or "")


@router.post(
    "/webhooks/whatsapp",
    response_model=WhatsAppWebhookResponse,
    responses={403: {"model": ErrorResponse}},
    summary="Receive signed WhatsApp verification replies",
)
async def receive_whatsapp_webhook(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    signature: Annotated[
        str | None,
        Header(alias="X-Hub-Signature-256"),
    ] = None,
) -> WhatsAppWebhookResponse:
    body = await request.body()
    whatsapp = WhatsAppService()
    if not whatsapp.verify_webhook_signature(
        body=body,
        signature_header=signature,
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid webhook signature",
        )
    payload = await request.json()
    commands = whatsapp.extract_commands(payload)
    processed = 0
    failed = 0
    service = VerificationService(session)
    for command in commands:
        try:
            await service.respond(
                token=command.token,
                outcome=command.outcome,
            )
            processed += 1
        except Exception:
            failed += 1
    return WhatsAppWebhookResponse(
        processed_commands=processed,
        failed_commands=failed,
    )
