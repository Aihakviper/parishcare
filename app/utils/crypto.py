import base64
import hashlib
import hmac
import secrets
import re
import unicodedata
from binascii import Error as Base64Error

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

TOKEN_VERSION = "v1"
NONCE_SIZE_BYTES = 12
KEY_SIZE_BYTES = 32


class CryptographyError(ValueError):
    """Raised when encrypted data or key material is invalid."""


def decode_key(encoded_key: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(encoded_key.encode("ascii"))
    except (Base64Error, UnicodeEncodeError, ValueError) as exc:
        raise CryptographyError("Key must be URL-safe base64") from exc

    if len(key) != KEY_SIZE_BYTES:
        raise CryptographyError("Key must decode to exactly 32 bytes")
    return key


class PIICipher:
    def __init__(self, encoded_key: str) -> None:
        self._cipher = AESGCM(decode_key(encoded_key))

    def encrypt(self, value: str, *, context: str) -> str:
        if not value:
            raise CryptographyError("Cannot encrypt an empty value")
        if not context:
            raise CryptographyError("Encryption context is required")

        nonce = secrets.token_bytes(NONCE_SIZE_BYTES)
        ciphertext = self._cipher.encrypt(
            nonce,
            value.encode("utf-8"),
            context.encode("utf-8"),
        )
        payload = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")
        return f"{TOKEN_VERSION}.{payload}"

    def decrypt(self, token: str, *, context: str) -> str:
        try:
            version, encoded_payload = token.split(".", maxsplit=1)
        except ValueError as exc:
            raise CryptographyError("Encrypted value has an invalid format") from exc

        if version != TOKEN_VERSION:
            raise CryptographyError("Encrypted value uses an unsupported version")
        if not context:
            raise CryptographyError("Encryption context is required")

        try:
            payload = base64.urlsafe_b64decode(encoded_payload.encode("ascii"))
        except (Base64Error, UnicodeEncodeError, ValueError) as exc:
            raise CryptographyError("Encrypted value is not valid base64") from exc

        if len(payload) <= NONCE_SIZE_BYTES:
            raise CryptographyError("Encrypted value is truncated")

        nonce = payload[:NONCE_SIZE_BYTES]
        ciphertext = payload[NONCE_SIZE_BYTES:]
        try:
            plaintext = self._cipher.decrypt(
                nonce,
                ciphertext,
                context.encode("utf-8"),
            )
        except InvalidTag as exc:
            raise CryptographyError(
                "Encrypted value failed authentication"
            ) from exc
        return plaintext.decode("utf-8")


class LookupHasher:
    def __init__(self, encoded_key: str) -> None:
        self._key = decode_key(encoded_key)

    def digest(self, value: str) -> str:
        if not value:
            raise CryptographyError("Cannot hash an empty value")
        return hmac.new(
            self._key,
            value.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()


def normalize_email(email: str) -> str:
    normalized = email.strip().casefold()
    if not normalized:
        raise ValueError("Email cannot be empty")
    return normalized


def normalize_phone(phone: str) -> str:
    normalized = phone.strip().replace(" ", "").replace("-", "")
    if not normalized.startswith("+") or not normalized[1:].isdigit():
        raise ValueError("Phone must use E.164 format")
    return normalized


def normalize_person_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name.strip().casefold())
    without_diacritics = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(character)
    )
    normalized = re.sub(r"[^a-z0-9]+", " ", without_diacritics).strip()
    normalized = re.sub(r"\s+", " ", normalized)
    if len(normalized) < 2:
        raise ValueError("Name must contain at least two searchable characters")
    return " ".join(sorted(normalized.split()))
