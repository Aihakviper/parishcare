from enum import StrEnum


class UserRole(StrEnum):
    OFFICER = "officer"
    PASTOR = "pastor"
    HQ = "hq"
    AUDITOR = "auditor"
    RESIDENT = "resident"
    ARTISAN = "artisan"
    CAMP_ADMIN = "camp_admin"
    MEDIATOR = "mediator"


class CampRole(StrEnum):
    MEMBER = "member"
    ARTISAN = "artisan"
    PASTOR = "pastor"
    CAMP_ADMIN = "camp_admin"
    MEDIATOR = "mediator"


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


class PaymentMethod(StrEnum):
    MOCK = "mock"


class SettlementStatus(StrEnum):
    PENDING = "pending"
    SETTLED = "settled"
    FAILED = "failed"


class Trade(StrEnum):
    PLUMBER = "plumber"
    ELECTRICIAN = "electrician"
    GENERATOR_TECHNICIAN = "generator_technician"
    GENERATOR_TECH = "generator_tech"
    TAILOR = "tailor"
    MECHANIC = "mechanic"
    CARPENTER = "carpenter"
    PAINTER = "painter"
    CLEANER = "cleaner"
    SECURITY = "security"
    HAIR_BRAIDER = "hair_braider"
    WELDER = "welder"
    MASON = "mason"
    AC_TECH = "AC_tech"
    VULCANIZER = "vulcanizer"


class ArtisanTier(StrEnum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    TRUSTED = "trusted"
    STEWARD = "steward"


class JobStatus(StrEnum):
    REQUESTED = "requested"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    EN_ROUTE = "en_route"
    WORKING = "working"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    CLOSED = "closed"


class EscrowStatus(StrEnum):
    PENDING = "pending"
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"
    FROZEN = "frozen"


class JobEventType(StrEnum):
    STATUS_CHANGE = "status_change"
    PHOTO_UPLOADED = "photo_uploaded"
    VOICE_NOTE = "voice_note"
    PAYMENT = "payment"
    MESSAGE = "message"


class DisputeStatus(StrEnum):
    OPEN = "open"
    MEDIATING = "mediating"
    RESOLVED = "resolved"


class DisputeResolution(StrEnum):
    RELEASE = "release"
    REFUND = "refund"
