# Steward Camp API — Backend Handoff

This document defines the REST contract the **Steward frontend** expects when running with real data.

**Frontend switch:** set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` in `frontend/.env`.

**Client implementation (ready):** `frontend/src/lib/api/camp-backend.ts`  
**Data router:** `frontend/src/lib/api/camp-data-source.ts` (mock vs API)  
**Session scoping:** `frontend/src/hooks/useCampSession.ts` — all surfaces load data for the logged-in user's `member_id` / `artisan_id` / `parish_id`.

---

## 1. Auth extension (required first)

Existing endpoints (already implemented):

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/auth/login` | `application/x-www-form-urlencoded`, optional header `X-MFA-Code` |
| `POST` | `/auth/refresh` | `{ "refresh_token": "..." }` |
| `GET` | `/auth/me` | Bearer access token |

### Extend `GET /auth/me` response

Add Camp profile fields so the frontend knows **whose data** to load:

```json
{
  "id": "uuid",
  "name": "Bisi Oladipo",
  "email": "bisi@camp.rccg",
  "role": "officer",
  "parish_id": "uuid-or-null",
  "mfa_enabled": true,
  "is_active": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z",

  "camp_role": "member",
  "member_id": "uuid",
  "artisan_id": null,
  "active_job_id": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `camp_role` | `"member"` \| `"artisan"` \| `"pastor"` \| `"camp_admin"` | Which Steward surface to open after login |
| `member_id` | `uuid \| null` | FK → `members.id` when user is a camp resident/member |
| `artisan_id` | `uuid \| null` | FK → `artisans.id` when user is an artisan |
| `active_job_id` | `uuid \| null` | Artisan's current in-progress job (for nav deep-link) |

**Mapping today (interim):** until `camp_role` ships, frontend maps legacy roles: `pastor` → Parish Console, `officer` → Member app.

### Recommended data model

```
users (existing)
  ├── camp_role
  ├── member_id  → members.id  (nullable)
  └── artisan_id → artisans.id (nullable)

members
  id, user_id, name, phone, email, parish_id, phase, address, languages[]

artisans
  id, user_id, name, phone, trade, service_area, tier, trust_score,
  completed_jobs, average_rating, years_experience, languages[],
  nin_verified, photo_url, parish_id

jobs
  id, member_id, artisan_id, trade, description, status, price_kobo,
  escrow_status, escrow_ref, release_ref, photos_json, timeline_json,
  rating, review_text, parish_id, created_at, updated_at
```

One `users` row links to **at most one** of `members` or `artisans` for v1. Pastors/admins use `camp_role=pastor` + `parish_id` only.

---

## 2. Authorization rules

All `/camp/*` routes require `Authorization: Bearer <access_token>`.

| `camp_role` | Can read | Can write |
|-------------|----------|-----------|
| `member` | Own jobs, discover artisans in parish, own apprentices supported | Create job, fund/release escrow (own jobs), vouch, review |
| `artisan` | Own jobs, own profile, own apprentices/lineage | Accept job, update status/photos, complete job |
| `pastor` / `camp_admin` | All jobs/disputes/stats in `parish_id` | Confirm standing, resolve disputes, view patterns |

**Server must enforce:** even if the client passes `member_id` / `artisan_id` query params, filter by the authenticated user's linked profile. Params are hints for admin views only.

---

## 3. Camp endpoints

Base path: `/api/v1/camp`  
JSON bodies use **snake_case**. Amounts in **kobo** (integer).

Types mirror `frontend/src/lib/types/camp.ts`.

### Artisans (discovery)

```
GET /camp/artisans?trade=&tier=&near=&q=
GET /camp/artisans/{id}
GET /camp/artisans/{id}/lineage
```

**Artisan response (example):**

```json
{
  "id": "uuid",
  "name": "Tunde Akinwale",
  "phone": "+2348032219844",
  "trade": "generator_tech",
  "service_area": "Phase 2 · Mowe",
  "tier": "trusted",
  "trust_score": 72,
  "completed_jobs": 34,
  "average_rating": 4.8,
  "years_experience": 8,
  "languages": ["english", "yoruba", "pidgin"],
  "work_photos": ["https://..."],
  "vouchers": [
    { "id": "uuid", "from_name": "Mama Iyabo Adewale", "from_role": "Elder", "date": "2026-03-01" }
  ],
  "nin_verified": true,
  "distance_km": 1.2,
  "available_now": true,
  "response_minutes": 15,
  "photo_url": "https://..."
}
```

### Jobs

```
GET  /camp/jobs?member_id=&artisan_id=&status=
GET  /camp/jobs/{id}
POST /camp/jobs
POST /camp/jobs/{id}/accept
POST /camp/jobs/{id}/status
POST /camp/jobs/{id}/fund-escrow
POST /camp/jobs/{id}/release-escrow
POST /camp/jobs/{id}/review
```

**Create job** (`POST /camp/jobs`) — `member_id` from token, not body:

```json
{
  "artisan_id": "uuid",
  "trade": "generator_tech",
  "description": "Generator no dey start",
  "price_kobo": 1850000
}
```

**Update status** (`POST /camp/jobs/{id}/status`):

```json
{
  "status": "working",
  "photo": "during",
  "photo_url": "https://..."
}
```

**Review** (`POST /camp/jobs/{id}/review`):

```json
{ "rating": 5, "text": "Tunde fixed am sharp sharp." }
```

**Payment split on fund/release:** apply 90% artisan / 5% ops / 5% Stewards Fund (see `computePaymentSplit` in frontend types). Credit Stewards Fund on `fund-escrow`.

### Disputes (Parish Console)

```
GET  /camp/disputes
GET  /camp/disputes/{id}
POST /camp/disputes/{id}/resolve
```

```json
{ "outcome": "release", "note": "Photos confirm completion." }
```

### Parish Console aggregates

```
GET /camp/stats
GET /camp/patterns
GET /camp/parishes
```

### Apprenticeship & standing

```
GET  /camp/apprenticeships?master_id=&member_id=
GET  /camp/pastoral-confirmations
POST /camp/pastoral-confirmations/{id}/confirm
POST /camp/mentor-enrollments
```

**Mentor enrollment:**

```json
{ "artisan_id": "uuid", "trade": "generator_tech" }
```

### Trust & fund

```
GET  /camp/generosity?actor_id=
GET  /camp/stewards-fund
POST /camp/vouch-requests
POST /camp/vouch-requests/{id}/confirm
```

**Vouch request:**

```json
{ "artisan_id": "uuid" }
```

Triggers WhatsApp to listed voucher (Mama Iyabo flow in demo).

---

## 4. Error format

Match existing API envelope:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You cannot view this job."
  }
}
```

HTTP status: `401` unauthenticated, `403` wrong profile, `404` not found, `422` validation.

---

## 5. Suggested implementation order

1. **DB migrations** — `members`, `artisans`, extend `users` with camp FKs  
2. **`GET /auth/me`** — return `camp_role`, `member_id`, `artisan_id`  
3. **Seed users** — Bisi (member), Tunde (artisan), Pastor Adekunle (pastor) with passwords for demo  
4. **`GET /camp/jobs`** — scoped list + detail  
5. **Job mutations** — create, accept, status, escrow  
6. **`GET /camp/artisans`** — discovery  
7. **Console** — stats, disputes, pastoral confirmations  
8. **Vouch / WhatsApp** — async webhook or mock channel  

---

## 6. Frontend env for integration testing

```env
# frontend/.env.local
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Demo mode (no login, hero data, role switcher):

```env
VITE_DATA_SOURCE=mock
```

---

## 7. Files your teammate should read

| File | Purpose |
|------|---------|
| `frontend/src/lib/types/camp.ts` | Canonical TypeScript types |
| `frontend/src/lib/api/camp-backend.ts` | HTTP client (paths + mapping) |
| `frontend/src/hooks/useCampSession.ts` | How login maps to profile IDs |
| `frontend/src/lib/mock-api/camp.ts` | Reference behaviour / seed data |
| `app/api/v1/routes/auth.py` | Existing auth to extend |

---

## 8. Open questions for backend

1. **Phone OTP login** for members/artisans without email? (Future: `POST /auth/otp/request`, `POST /auth/otp/verify`)
2. **Photo upload** — presigned S3 URLs vs base64 on job status?
3. **Escrow** — mock ledger table vs payment provider webhooks?
4. **Multi-parish** — can one pastor admin multiple `parish_id`s?

Ping frontend when `/auth/me` camp fields + `GET /camp/jobs` are ready — we can smoke-test with `VITE_DATA_SOURCE=api`.
