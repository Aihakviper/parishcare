class ServiceError(Exception):
    """Base error for application service failures."""


class ResourceNotFoundError(ServiceError):
    """Raised when a requested resource does not exist."""


class ResourceConflictError(ServiceError):
    """Raised when a unique or state constraint would be violated."""


class ServiceValidationError(ServiceError):
    """Raised when a requested state transition is invalid."""
