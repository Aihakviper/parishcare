class ServiceError(Exception):
    """Base error for application service failures."""


class ResourceNotFoundError(ServiceError):
    """Raised when a requested resource does not exist."""


class ResourceConflictError(ServiceError):
    """Raised when a unique or state constraint would be violated."""


class ServiceValidationError(ServiceError):
    """Raised when a requested state transition is invalid."""


class VoucherInvalidError(ServiceError):
    """Raised when a voucher token is malformed or cannot be resolved."""


class VoucherExpiredError(ServiceError):
    """Raised when a voucher has expired."""


class VoucherUsedError(ServiceError):
    """Raised when a voucher has already been consumed."""
