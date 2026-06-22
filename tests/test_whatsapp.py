import hashlib
import hmac

import httpx
import pytest

from app.models.enums import VerificationOutcome
from app.services.whatsapp import WhatsAppService
from tests.settings import build_test_settings


def whatsapp_settings():
    return build_test_settings(
        verification_delivery_channel="whatsapp",
        whatsapp_phone_number_id="123456789",
        whatsapp_access_token="access-token",
        whatsapp_webhook_verify_token="verify-token",
        whatsapp_app_secret="app-secret",
    )


@pytest.mark.asyncio
async def test_sends_voucher_through_cloud_api_without_plus_prefix() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers["Authorization"]
        captured["json"] = request.content.decode("utf-8")
        return httpx.Response(
            200,
            json={"messages": [{"id": "wamid.presentation-message"}]},
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler)
    ) as client:
        message_id = await WhatsAppService(
            config=whatsapp_settings(),
            client=client,
        ).send_verification_voucher(
            recipient_phone="+2348012345678",
            token="signed-voucher",
        )

    assert message_id == "wamid.presentation-message"
    assert captured["authorization"] == "Bearer access-token"
    assert str(captured["url"]).endswith("/123456789/messages")
    assert '"to":"2348012345678"' in str(captured["json"])
    assert "CONFIRM signed-voucher" in str(captured["json"])


def test_verifies_challenge_and_signed_webhook() -> None:
    service = WhatsAppService(config=whatsapp_settings())
    body = b'{"object":"whatsapp_business_account"}'
    signature = "sha256=" + hmac.new(
        b"app-secret",
        body,
        hashlib.sha256,
    ).hexdigest()

    assert service.verify_webhook_challenge(
        mode="subscribe",
        verify_token="verify-token",
    )
    assert service.verify_webhook_signature(
        body=body,
        signature_header=signature,
    )
    assert not service.verify_webhook_signature(
        body=body,
        signature_header="sha256=invalid",
    )


def test_extracts_confirm_and_reject_commands() -> None:
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {"text": {"body": "CONFIRM token-one"}},
                                {"text": {"body": " reject token-two "}},
                                {"text": {"body": "hello"}},
                            ]
                        }
                    }
                ]
            }
        ]
    }

    commands = WhatsAppService.extract_commands(payload)

    assert commands == [
        commands[0].__class__(
            outcome=VerificationOutcome.CONFIRMED,
            token="token-one",
        ),
        commands[1].__class__(
            outcome=VerificationOutcome.REJECTED,
            token="token-two",
        ),
    ]
