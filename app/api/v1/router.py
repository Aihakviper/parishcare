from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.beneficiaries import router as beneficiaries_router
from app.api.v1.routes.camp import router as camp_router
from app.api.v1.routes.disbursements import router as disbursements_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.marketplace import router as marketplace_router
from app.api.v1.routes.parishes import router as parishes_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.welfare_requests import router as welfare_requests_router
from app.api.v1.routes.verification import router as verification_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(camp_router, tags=["Steward Camp Mock"])
api_router.include_router(marketplace_router, tags=["Steward Marketplace"])
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(beneficiaries_router, tags=["Beneficiaries"])
api_router.include_router(disbursements_router, tags=["Disbursements"])
api_router.include_router(parishes_router, tags=["Parishes"])
api_router.include_router(users_router, tags=["Users"])
api_router.include_router(welfare_requests_router, tags=["Welfare Requests"])
api_router.include_router(verification_router, tags=["Verification"])
