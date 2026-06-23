# WhatsApp presentation setup

The integration uses Meta WhatsApp Cloud API for verification vouchers.

## Environment

Configure these values in the backend `.env`:

```env
PARISHCARE_VERIFICATION_DELIVERY_CHANNEL=whatsapp
PARISHCARE_WHATSAPP_GRAPH_API_BASE_URL=https://graph.facebook.com/v23.0
PARISHCARE_WHATSAPP_PHONE_NUMBER_ID=
PARISHCARE_WHATSAPP_ACCESS_TOKEN=
PARISHCARE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=
PARISHCARE_WHATSAPP_APP_SECRET=
PARISHCARE_WHATSAPP_PUBLIC_BASE_URL=https://your-public-api.example
PARISHCARE_WHATSAPP_REQUEST_TIMEOUT_SECONDS=10
```

Do not put these credentials in the frontend or commit the backend `.env`.

## Meta webhook

Expose the backend through HTTPS and configure this callback in Meta:

```text
https://your-public-api.example/api/v1/webhooks/whatsapp
```

Use the same value configured in
`PARISHCARE_WHATSAPP_WEBHOOK_VERIFY_TOKEN` as Meta's verification token.
Subscribe the WhatsApp Business Account webhook to the `messages` field.

## Demo flow

1. Send a WhatsApp message from the recipient phone to the Meta test/business
   number first. This opens the customer-service conversation window required
   for a free-form response.
2. Ensure the beneficiary's home parish contact phone is that recipient.
3. Start verification through:

   ```text
   POST /api/v1/welfare-requests/{request_id}/verify
   ```

4. WhatsApp receives a message containing:

   ```text
   CONFIRM <voucher>
   REJECT <voucher>
   ```

5. Reply with one exact command. Meta sends the signed webhook and ParishCare
   updates the beneficiary and welfare request.

The webhook validates `X-Hub-Signature-256` using the configured Meta app
secret. Voucher tokens remain single-use and expiry-controlled.

For production-initiated conversations outside the service window, replace
the free-form message with an approved WhatsApp message template.
