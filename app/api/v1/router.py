from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.beneficiaries import router as beneficiaries_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.parishes import router as parishes_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.welfare_requests import router as welfare_requests_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(beneficiaries_router, tags=["Beneficiaries"])
api_router.include_router(parishes_router, tags=["Parishes"])
api_router.include_router(users_router, tags=["Users"])
api_router.include_router(welfare_requests_router, tags=["Welfare Requests"])
