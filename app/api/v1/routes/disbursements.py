from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.api.presenters import present_disbursement
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.disbursement import DisbursementCreate, DisbursementResponse
from app.schemas.errors import ErrorResponse
from app.services.disbursement import DisbursementService

router = APIRouter(prefix="/disbursements")

ERROR_RESPONSES = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "",
    response_model=DisbursementResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **ERROR_RESPONSES,
        200: {
            "model": DisbursementResponse,
            "description": "Existing result returned for an idempotent retry",
        },
    },
    summary="Execute an idempotent mock disbursement",
)
async def execute_disbursement(
    data: DisbursementCreate,
    response: Response,
    idempotency_key: Annotated[
        UUID,
        Header(alias="Idempotency-Key"),
    ],
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.DISBURSEMENT_EXECUTE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DisbursementResponse:
    result = await DisbursementService(session).execute(
        actor=actor,
        data=data,
        idempotency_key=idempotency_key,
    )
    if result.idempotent_replay:
        response.status_code = status.HTTP_200_OK
    return present_disbursement(
        result.disbursement,
        idempotent_replay=result.idempotent_replay,
    )
