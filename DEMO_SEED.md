# Steward marketplace demo data

The seed command creates an idempotent demo dataset:

- 40 artisans
- 24 residents
- 80 jobs
- mock escrow transactions
- completed-job reviews
- one open dispute

All seeded mutations are written to the tamper-evident audit chain. Running the
command again does not duplicate data.

## Configure

Set these values temporarily in the backend `.env`:

```env
PARISHCARE_DEMO_SEED_ENABLED=true
PARISHCARE_DEMO_SEED_USER_PASSWORD=Choose-A-Demo-Password-2026!
```

The password is only for local demo accounts. Do not reuse a real password.

## Run

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.cli.seed_demo
```

Disable seeding afterwards:

```env
PARISHCARE_DEMO_SEED_ENABLED=false
PARISHCARE_DEMO_SEED_USER_PASSWORD=
```

## Public endpoints

```text
GET /api/v1/public/artisans
GET /api/v1/public/artisans/{artisan_id}
GET /api/v1/public/jobs/feed
```

Artisan filters:

```text
query
trade
tier
service_area
limit
```

Job-feed filters:

```text
trade
service_area
limit
```

The endpoints intentionally omit account emails, phone numbers, resident IDs,
and exact residential addresses. `generator_tech` is accepted as an alias for
the backend `generator_technician` trade.
