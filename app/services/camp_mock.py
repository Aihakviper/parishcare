from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from app.services.errors import ResourceNotFoundError, ServiceValidationError


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _clone(value: Any) -> Any:
    return deepcopy(value)


ARTISANS: list[dict[str, Any]] = [
    {
        "id": "artisan-tunde-akinwale",
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
        "work_photos": [
            "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80"
        ],
        "vouchers": [
            {
                "id": "voucher-mama-iyabo",
                "from_name": "Mama Iyabo Adewale",
                "from_role": "Elder",
                "date": "2026-03-01",
            }
        ],
        "nin_verified": True,
        "distance_km": 1.2,
        "available_now": True,
        "response_minutes": 15,
        "photo_url": "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80",
    },
    {
        "id": "artisan-aisha-plumber",
        "name": "Aisha Bello",
        "phone": "+2348064451290",
        "trade": "plumber",
        "service_area": "Phase 1 · Redemption Camp",
        "tier": "steward",
        "trust_score": 88,
        "completed_jobs": 61,
        "average_rating": 4.9,
        "years_experience": 11,
        "languages": ["english", "hausa", "pidgin"],
        "work_photos": [],
        "vouchers": [],
        "nin_verified": True,
        "distance_km": 2.4,
        "available_now": True,
        "response_minutes": 11,
        "photo_url": None,
    },
    {
        "id": "artisan-chinedu-electrician",
        "name": "Chinedu Okafor",
        "phone": "+2348091137765",
        "trade": "electrician",
        "service_area": "Phase 3 · Mowe",
        "tier": "verified",
        "trust_score": 54,
        "completed_jobs": 17,
        "average_rating": 4.5,
        "years_experience": 5,
        "languages": ["english", "igbo", "pidgin"],
        "work_photos": [],
        "vouchers": [],
        "nin_verified": True,
        "distance_km": 3.1,
        "available_now": False,
        "response_minutes": 28,
        "photo_url": None,
    },
]

JOBS: list[dict[str, Any]] = [
    {
        "id": "job-hero-generator",
        "resident_id": "member-funmi",
        "member_id": "member-funmi",
        "artisan_id": "artisan-tunde-akinwale",
        "trade": "generator_tech",
        "description": "Generator no dey start and Sunday service preparation is close.",
        "status": "working",
        "price_kobo": 1850000,
        "escrow_status": "held",
        "escrow_ref": "STW-ESC-2026-018500",
        "release_ref": None,
        "created_at": "2026-06-20T09:30:00+00:00",
        "updated_at": "2026-06-22T15:45:00+00:00",
        "timeline": [
            {
                "id": "timeline-hero-1",
                "at": "2026-06-20T09:30:00+00:00",
                "label": "Job requested",
                "kind": "status",
            },
            {
                "id": "timeline-hero-2",
                "at": "2026-06-20T10:05:00+00:00",
                "label": "Escrow funded",
                "kind": "payment",
            },
            {
                "id": "timeline-hero-3",
                "at": "2026-06-22T15:45:00+00:00",
                "label": "Work started",
                "kind": "status",
            },
        ],
        "photos": {},
        "rating": None,
        "review_text": None,
        "is_hero": True,
    },
    {
        "id": "job-plumbing-phase2",
        "resident_id": "member-bisi",
        "member_id": "member-bisi",
        "artisan_id": "artisan-aisha-plumber",
        "trade": "plumber",
        "description": "Kitchen pipe is leaking beside the sink.",
        "status": "requested",
        "price_kobo": 950000,
        "escrow_status": "pending",
        "escrow_ref": None,
        "release_ref": None,
        "created_at": "2026-06-22T08:15:00+00:00",
        "updated_at": "2026-06-22T08:15:00+00:00",
        "timeline": [
            {
                "id": "timeline-plumbing-1",
                "at": "2026-06-22T08:15:00+00:00",
                "label": "Job requested",
                "kind": "status",
            }
        ],
        "photos": {},
        "rating": None,
        "review_text": None,
    },
]

DISPUTES: list[dict[str, Any]] = [
    {
        "id": "dispute-generator-photo",
        "jobId": "job-hero-generator",
        "residentId": "member-funmi",
        "artisanId": "artisan-tunde-akinwale",
        "status": "mediating",
        "reason": "Resident wants photo confirmation before final release.",
        "openedAt": "2026-06-22T16:20:00+00:00",
        "openedBy": "resident",
        "residentStatement": "I need to see the generator running before release.",
        "artisanStatement": "I have fixed it and can upload after photo.",
        "escrowKobo": 1850000,
    }
]

PARISHES: list[dict[str, Any]] = [
    {
        "id": "parish-camp-mowe",
        "name": "RCCG Camp Parish",
        "province": "Ogun Province",
        "pastorName": "Pastor Adekunle",
        "welfareOfficerName": "Bisi Oladipo",
        "phaseCoverage": ["Phase 1", "Phase 2", "Phase 3"],
    }
]

APPRENTICESHIPS: list[dict[str, Any]] = [
    {
        "id": "apprentice-emeka-001",
        "masterArtisanId": "artisan-tunde-akinwale",
        "apprenticeName": "Emeka Okonkwo",
        "apprenticePhone": "+2348072213344",
        "trade": "generator_tech",
        "status": "active",
        "parishId": "parish-camp-mowe",
        "startedAt": "2026-04-01T08:00:00+00:00",
        "monthsIn": 3,
        "stipendKoboRequested": 500000,
        "supportedByMemberIds": ["member-funmi"],
    }
]

PASTORAL_CONFIRMATIONS: list[dict[str, Any]] = [
    {
        "id": "confirmation-tunde-standing",
        "subjectType": "artisan",
        "subjectId": "artisan-tunde-akinwale",
        "subjectName": "Tunde Akinwale",
        "confirmingPastorId": "admin-adekunle",
        "parishId": "parish-camp-mowe",
        "status": "pending",
        "note": "Confirm continued good standing after recent vouch.",
    }
]

GENEROSITY: list[dict[str, Any]] = [
    {
        "id": "gen-tunde-mentor",
        "actorId": "artisan-tunde-akinwale",
        "actorName": "Tunde Akinwale",
        "actType": "mentor_hours",
        "beneficiaryLabel": "Emeka Okonkwo",
        "occurredAt": "2026-06-18T12:00:00+00:00",
    },
    {
        "id": "gen-funmi-fund",
        "actorId": "member-funmi",
        "actorName": "Funmi Adeyemi",
        "actType": "fund_contribution",
        "amountKobo": 18500,
        "beneficiaryLabel": "Stewards Fund",
        "occurredAt": "2026-06-20T10:05:00+00:00",
    },
]

STEWARDS_FUND: dict[str, Any] = {
    "balanceKobo": 3425000,
    "monthlyInflowKobo": 1285000,
    "monthlyOutflowKobo": 740000,
    "entries": [
        {
            "id": "fund-entry-hero",
            "type": "contribution",
            "amountKobo": 92500,
            "sourceJobId": "job-hero-generator",
            "note": "Escrow funded",
            "at": "2026-06-20T10:05:00+00:00",
        }
    ],
}

VOUCH_REQUESTS: list[dict[str, Any]] = []


class CampMockService:
    def list_artisans(
        self,
        *,
        trade: str | None = None,
        tier: str | None = None,
        near: str | None = None,
        q: str | None = None,
    ) -> list[dict[str, Any]]:
        rows = _clone(ARTISANS)
        if trade:
            rows = [row for row in rows if row["trade"] == trade]
        if tier:
            rows = [row for row in rows if row["tier"] == tier]
        if near:
            needle = near.casefold()
            rows = [row for row in rows if needle in row["service_area"].casefold()]
        if q:
            needle = q.casefold()
            rows = [
                row
                for row in rows
                if needle in row["name"].casefold()
                or needle in row["trade"].replace("_", " ").casefold()
            ]
        return sorted(
            rows,
            key=lambda row: (
                {"steward": 0, "trusted": 1, "verified": 2, "unverified": 3}[
                    row["tier"]
                ],
                row.get("distance_km") or 99,
            ),
        )

    def get_artisan(self, artisan_id: str) -> dict[str, Any]:
        return _clone(_find(ARTISANS, artisan_id, "Artisan not found"))

    def get_lineage(self, artisan_id: str) -> list[dict[str, Any]]:
        if artisan_id == "artisan-tunde-akinwale":
            return [
                {
                    "id": "master-adebayo",
                    "name": "Chief Adebayo",
                    "tier": "steward",
                    "role": "master",
                },
                {
                    "id": "artisan-tunde-akinwale",
                    "name": "Tunde Akinwale",
                    "tier": "trusted",
                    "role": "self",
                },
                {
                    "id": "apprentice-emeka-001",
                    "name": "Emeka Okonkwo",
                    "tier": "verified",
                    "role": "apprentice",
                },
            ]
        artisan = self.get_artisan(artisan_id)
        return [
            {
                "id": artisan["id"],
                "name": artisan["name"],
                "tier": artisan["tier"],
                "role": "self",
            }
        ]

    def list_jobs(
        self,
        *,
        member_id: str | None = None,
        artisan_id: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        rows = _clone(JOBS)
        if member_id:
            rows = [row for row in rows if row["member_id"] == member_id]
        if artisan_id:
            rows = [row for row in rows if row["artisan_id"] == artisan_id]
        if status:
            rows = [row for row in rows if row["status"] == status]
        return sorted(rows, key=lambda row: row["created_at"], reverse=True)

    def get_job(self, job_id: str) -> dict[str, Any]:
        return _clone(_find(JOBS, job_id, "Job not found"))

    def create_job(self, data: dict[str, Any]) -> dict[str, Any]:
        artisan_id = data["artisan_id"]
        artisan = _find(ARTISANS, artisan_id, "Artisan not found")
        now = _now()
        job = {
            "id": f"job-demo-{len(JOBS) + 1}",
            "resident_id": data.get("member_id") or "member-funmi",
            "member_id": data.get("member_id") or "member-funmi",
            "artisan_id": artisan_id,
            "trade": data.get("trade") or artisan["trade"],
            "description": data["description"],
            "status": "requested",
            "price_kobo": data["price_kobo"],
            "escrow_status": "pending",
            "escrow_ref": None,
            "release_ref": None,
            "created_at": now,
            "updated_at": now,
            "timeline": [
                {
                    "id": f"timeline-{len(JOBS) + 1}-1",
                    "at": now,
                    "label": "Job requested",
                    "kind": "status",
                }
            ],
            "photos": {},
            "rating": None,
            "review_text": None,
        }
        JOBS.insert(0, job)
        return _clone(job)

    def accept_job(self, job_id: str) -> dict[str, Any]:
        job = _find(JOBS, job_id, "Job not found")
        job["status"] = "accepted"
        job["updated_at"] = _now()
        job["timeline"].append(_timeline("Artisan accepted job", "status"))
        return _clone(job)

    def update_job_status(
        self,
        job_id: str,
        *,
        status: str,
        photo: str | None = None,
        photo_url: str | None = None,
    ) -> dict[str, Any]:
        if status not in {
            "requested",
            "quoted",
            "accepted",
            "en_route",
            "working",
            "completed",
            "disputed",
            "closed",
        }:
            raise ServiceValidationError("Unsupported job status")
        job = _find(JOBS, job_id, "Job not found")
        job["status"] = status
        job["updated_at"] = _now()
        if photo and photo_url:
            job["photos"][photo] = photo_url
        job["timeline"].append(
            _timeline(
                {
                    "en_route": "Artisan en route",
                    "working": "Work started",
                    "completed": "Work marked complete",
                    "closed": "Job closed",
                }.get(status, f"Status changed to {status}"),
                "photo" if photo else "status",
                photo_url=photo_url,
            )
        )
        return _clone(job)

    def fund_escrow(self, job_id: str) -> dict[str, Any]:
        job = _find(JOBS, job_id, "Job not found")
        job["escrow_status"] = "held"
        job["escrow_ref"] = job["escrow_ref"] or f"STW-ESC-2026-{len(JOBS):06d}"
        job["updated_at"] = _now()
        fund_kobo = round(job["price_kobo"] * 0.05)
        STEWARDS_FUND["balanceKobo"] += fund_kobo
        STEWARDS_FUND["monthlyInflowKobo"] += fund_kobo
        STEWARDS_FUND["entries"].insert(
            0,
            {
                "id": f"fund-entry-{len(STEWARDS_FUND['entries']) + 1}",
                "type": "contribution",
                "amountKobo": fund_kobo,
                "sourceJobId": job["id"],
                "note": "Escrow funded",
                "at": _now(),
            },
        )
        job["timeline"].append(_timeline("Escrow funded", "payment"))
        return _clone(job)

    def release_escrow(self, job_id: str) -> dict[str, Any]:
        job = _find(JOBS, job_id, "Job not found")
        job["escrow_status"] = "released"
        job["status"] = "closed"
        job["release_ref"] = f"STW-RLS-2026-{len(JOBS):06d}"
        job["updated_at"] = _now()
        job["timeline"].append(_timeline("Escrow released", "payment"))
        return _clone(job)

    def review_job(self, job_id: str, *, rating: int, text: str | None) -> dict[str, Any]:
        if rating < 1 or rating > 5:
            raise ServiceValidationError("Rating must be between 1 and 5")
        job = _find(JOBS, job_id, "Job not found")
        job["rating"] = rating
        job["review_text"] = text
        job["updated_at"] = _now()
        return _clone(job)

    def list_disputes(self) -> list[dict[str, Any]]:
        return _clone(DISPUTES)

    def get_dispute(self, dispute_id: str) -> dict[str, Any]:
        return _clone(_find(DISPUTES, dispute_id, "Dispute not found"))

    def resolve_dispute(self, dispute_id: str, *, outcome: str, note: str) -> dict[str, Any]:
        if outcome not in {"release", "refund"}:
            raise ServiceValidationError("Outcome must be release or refund")
        dispute = _find(DISPUTES, dispute_id, "Dispute not found")
        dispute["status"] = "resolved"
        dispute["resolutionNote"] = note
        job = next((row for row in JOBS if row["id"] == dispute["jobId"]), None)
        if job:
            job["escrow_status"] = "released" if outcome == "release" else "refunded"
            job["status"] = "closed"
            job["updated_at"] = _now()
        return _clone(dispute)

    def stats(self) -> dict[str, Any]:
        return {
            "jobsCompletedWeek": 47,
            "activeArtisans": len([row for row in ARTISANS if row["tier"] != "unverified"]),
            "avgResponseMinutes": 18,
            "disputesPending": len([row for row in DISPUTES if row["status"] != "resolved"]),
            "totalDisbursedKobo": sum(
                row["price_kobo"] for row in JOBS if row["escrow_status"] == "released"
            ),
        }

    def patterns(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "pat-1",
                "title": "Three plumbing requests in Phase 2",
                "explanation": "Three plumbing requests in Phase 2 in the last 72 hours.",
                "suggestedAction": "Schedule Camp facilities inspection for Faith Avenue mains.",
                "status": "new",
                "trade": "plumber",
                "area": "Phase 2",
            },
            {
                "id": "pat-2",
                "title": "Generator repairs up 22% this week",
                "explanation": "Generator repair requests rose 22% this week.",
                "suggestedAction": "Pre-position two generator techs for Phase 2–3.",
                "status": "acknowledged",
                "trade": "generator_tech",
            },
        ]

    def parishes(self) -> list[dict[str, Any]]:
        return _clone(PARISHES)

    def apprenticeships(self, *, master_id: str | None, member_id: str | None) -> list[dict[str, Any]]:
        rows = _clone(APPRENTICESHIPS)
        if master_id:
            rows = [row for row in rows if row["masterArtisanId"] == master_id]
        if member_id:
            rows = [row for row in rows if member_id in row["supportedByMemberIds"]]
        return rows

    def pastoral_confirmations(self) -> list[dict[str, Any]]:
        return _clone(PASTORAL_CONFIRMATIONS)

    def confirm_standing(self, confirmation_id: str, *, note: str) -> dict[str, Any]:
        row = _find(PASTORAL_CONFIRMATIONS, confirmation_id, "Confirmation not found")
        row["status"] = "confirmed"
        row["note"] = note
        row["confirmedAt"] = _now()
        return _clone(row)

    def generosity(self, *, actor_id: str | None) -> list[dict[str, Any]]:
        rows = _clone(GENEROSITY)
        if actor_id:
            rows = [row for row in rows if row["actorId"] == actor_id]
        return rows

    def stewards_fund(self) -> dict[str, Any]:
        return _clone(STEWARDS_FUND)

    def request_vouch(self, *, artisan_id: str) -> dict[str, Any]:
        artisan = _find(ARTISANS, artisan_id, "Artisan not found")
        request = {
            "id": f"vouch-{len(VOUCH_REQUESTS) + 1}",
            "artisanId": artisan_id,
            "voucherName": "Mama Iyabo Adewale",
            "voucherPhone": "+2348035567821",
            "status": "pending",
            "message": (
                f"Good afternoon Mama Iyabo. {artisan['name']} listed you as "
                "someone who can speak for his work. Reply YES or NO."
            ),
        }
        VOUCH_REQUESTS.append(request)
        return _clone(request)

    def confirm_vouch(self, request_id: str) -> dict[str, Any]:
        request = _find(VOUCH_REQUESTS, request_id, "Vouch request not found")
        request["status"] = "confirmed"
        request["response"] = (
            "YES. I know Tunde from Phase 2 church. He fixed my neighbour generator "
            "last year. He is honest."
        )
        return _clone(request)

    def enroll_mentor(self, *, artisan_id: str, trade: str) -> dict[str, Any]:
        artisan = _find(ARTISANS, artisan_id, "Artisan not found")
        row = {
            "id": f"mentor-{len(PASTORAL_CONFIRMATIONS) + 1}",
            "subjectType": "artisan",
            "subjectId": artisan_id,
            "subjectName": artisan["name"],
            "confirmingPastorId": "admin-adekunle",
            "parishId": "parish-camp-mowe",
            "status": "pending",
            "note": f"Mentor enrollment · {trade}",
        }
        PASTORAL_CONFIRMATIONS.insert(0, row)
        return _clone(row)


def _find(rows: list[dict[str, Any]], row_id: str, message: str) -> dict[str, Any]:
    row = next((item for item in rows if item["id"] == row_id), None)
    if row is None:
        raise ResourceNotFoundError(message)
    return row


def _timeline(label: str, kind: str, *, photo_url: str | None = None) -> dict[str, Any]:
    event = {
        "id": f"timeline-{datetime.now(UTC).timestamp()}",
        "at": _now(),
        "label": label,
        "kind": kind,
    }
    if photo_url:
        event["photo_url"] = photo_url
    return event
