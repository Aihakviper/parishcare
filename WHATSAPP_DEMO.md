# WhatsApp presentation setup

The integration uses Meta WhatsApp Cloud API for verification vouchers and
the Steward artisan marketplace presentation flow.

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
PARISHCARE_WHATSAPP_MARKETPLACE_ENABLED=true
PARISHCARE_WHATSAPP_DEMO_RESIDENT_PHONE=+2348012345678
PARISHCARE_WHATSAPP_DEMO_RESIDENT_EMAIL=resident00@demo.steward.local
PARISHCARE_WHATSAPP_MARKETPLACE_RESULT_LIMIT=3
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

Run the database migration and seed data before the presentation:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.cli.seed_demo
```

`PARISHCARE_WHATSAPP_DEMO_RESIDENT_PHONE` must be the E.164 number sending
messages to WhatsApp. The configured email must belong to an active resident
account. The demo seed creates `resident00@demo.steward.local`.

## Marketplace demo flow

Send `HI` to receive the menu:

```text
1. Find a verified artisan
2. View open job feed
3. Create a job request
```

Artisan discovery accepts a menu number or commands such as:

```text
FIND plumber
FIND generator tech
```

Job feed commands:

```text
JOBS
JOBS electrician
```

Linked demo residents can create a job through the guided `BOOK` flow or one
message:

```text
BOOK plumber | Camp Phase 2 | Kitchen pipe is leaking badly
```

Inbound Meta message IDs are stored for idempotency. Conversation phone
numbers and prepared replies are encrypted, and state changes and job
creation are audit logged.

## Verification voucher flow

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
