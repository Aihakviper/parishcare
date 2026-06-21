"""Security primitives for the authentication layer.

Token issuance, password verification, and RBAC dependencies will be added in
the authentication phase.
"""

from app.core.config import settings

JWT_ALGORITHM = settings.jwt_algorithm
