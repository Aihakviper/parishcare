from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.rbac import AuthorizationError
from app.services.auth import AuthenticationError, MFARequiredError
from app.services.errors import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceValidationError,
    VoucherExpiredError,
    VoucherInvalidError,
    VoucherUsedError,
)


def register_exception_handlers(application: FastAPI) -> None:
    application.add_exception_handler(
        MFARequiredError,
        _mfa_required_handler,
    )
    application.add_exception_handler(
        AuthenticationError,
        _authentication_handler,
    )
    application.add_exception_handler(
        AuthorizationError,
        _authorization_handler,
    )
    application.add_exception_handler(
        ResourceNotFoundError,
        _not_found_handler,
    )
    application.add_exception_handler(
        ResourceConflictError,
        _conflict_handler,
    )
    application.add_exception_handler(
        ServiceValidationError,
        _service_validation_handler,
    )
    application.add_exception_handler(VoucherInvalidError, _voucher_invalid_handler)
    application.add_exception_handler(VoucherExpiredError, _voucher_expired_handler)
    application.add_exception_handler(VoucherUsedError, _voucher_used_handler)
    application.add_exception_handler(
        RequestValidationError,
        _request_validation_handler,
    )
    application.add_exception_handler(HTTPException, _http_exception_handler)


async def _mfa_required_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_428_PRECONDITION_REQUIRED,
        "mfa_required",
        str(exc),
    )


async def _authentication_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_401_UNAUTHORIZED,
        "authentication_failed",
        str(exc),
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _authorization_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_403_FORBIDDEN,
        "forbidden",
        str(exc),
    )


async def _not_found_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_404_NOT_FOUND,
        "not_found",
        str(exc),
    )


async def _conflict_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_409_CONFLICT,
        "conflict",
        str(exc),
    )


async def _service_validation_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "invalid_operation",
        str(exc),
    )


async def _voucher_invalid_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_400_BAD_REQUEST,
        "invalid_voucher",
        str(exc),
    )


async def _voucher_expired_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_410_GONE,
        "voucher_expired",
        str(exc),
    )


async def _voucher_used_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return _error_response(
        status.HTTP_409_CONFLICT,
        "voucher_used",
        str(exc),
    )


async def _request_validation_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "location": list(error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return _error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "validation_error",
        "Request validation failed",
        details=details,
    )


async def _http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    code = {
        status.HTTP_401_UNAUTHORIZED: "authentication_failed",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
    }.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return _error_response(
        exc.status_code,
        code,
        message,
        headers=exc.headers,
    )


def _error_response(
    status_code: int,
    code: str,
    message: str,
    *,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )
