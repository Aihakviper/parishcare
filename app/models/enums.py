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


class WelfareRequestType(StrEnum):
    SCHOOL = "school"
    MEDICAL = "medical"
    FOOD = "food"
    LOAN = "loan"
    WIDOW = "widow"
    RENT = "rent"


class WelfareRequestStatus(StrEnum):
    PENDING = "pending"
    VERIFIED = "verified"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"


class PriorityBand(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class VerificationOutcome(StrEnum):
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    EXPIRED = "expired"


class VerificationChannel(StrEnum):
    MOCK = "mock"
    WHATSAPP = "whatsapp"
    SMS = "sms"
