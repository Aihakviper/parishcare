from enum import StrEnum


class UserRole(StrEnum):
    OFFICER = "officer"
    PASTOR = "pastor"
    HQ = "hq"
    AUDITOR = "auditor"


class VerificationStatus(StrEnum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
