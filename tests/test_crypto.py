import base64

import pytest

from app.utils.crypto import (
    CryptographyError,
    LookupHasher,
    PIICipher,
    normalize_email,
    normalize_phone,
)

TEST_KEY = base64.urlsafe_b64encode(bytes(range(32))).decode("ascii")


def test_pii_encryption_round_trip_and_random_nonce() -> None:
    cipher = PIICipher(TEST_KEY)

    first = cipher.encrypt("sensitive value", context="users.email")
    second = cipher.encrypt("sensitive value", context="users.email")

    assert first != second
    assert cipher.decrypt(first, context="users.email") == "sensitive value"
    assert cipher.decrypt(second, context="users.email") == "sensitive value"


def test_pii_cipher_rejects_wrong_context_and_tampering() -> None:
    cipher = PIICipher(TEST_KEY)
    encrypted = cipher.encrypt("sensitive value", context="users.email")

    with pytest.raises(CryptographyError):
        cipher.decrypt(encrypted, context="beneficiaries.phone")

    replacement = "A" if encrypted[-1] != "A" else "B"
    with pytest.raises(CryptographyError):
        cipher.decrypt(encrypted[:-1] + replacement, context="users.email")


def test_lookup_hash_is_deterministic_and_keyed() -> None:
    hasher = LookupHasher(TEST_KEY)
    another_key = base64.urlsafe_b64encode(bytes(reversed(range(32)))).decode(
        "ascii"
    )

    first = hasher.digest(normalize_email(" Admin@Example.COM "))
    second = hasher.digest(normalize_email("admin@example.com"))

    assert first == second
    assert first != LookupHasher(another_key).digest("admin@example.com")
    assert len(first) == 64


def test_normalize_phone_requires_e164() -> None:
    assert normalize_phone("+234 801-234-5678") == "+2348012345678"

    with pytest.raises(ValueError):
        normalize_phone("08012345678")
