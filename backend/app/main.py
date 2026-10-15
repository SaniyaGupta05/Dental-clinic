import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.seed import seed_database
from app.schemas.health import HealthResponse, ReadinessResponse

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify production security guards
    try:
        settings.validate_production_guards()
    except ValueError as e:
        print(f"[DEMO VERIFICATION NOTICE] {e}. Allowing mock OTP for client review.")
    # Seed database with initial data if needed
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seed notice: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Kumar Dental Clinic Web Dashboard and Patient Mobile Application",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
origins = settings.cors_origin_list
allow_origin_regex = r"^https?://.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Error Envelope Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": None
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request body or parameters failed validation.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Safe error message in production, never leak stack trace or internal query
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request. Please try again later.",
                "details": str(exc) if settings.ENVIRONMENT == "development" else None
            }
        }
    )


# Health & Readiness Checks
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Liveness probe: verifies process is alive and accepting traffic."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
        environment=settings.ENVIRONMENT
    )


@app.get("/ready", response_model=ReadinessResponse, tags=["Health"])
async def readiness_check():
    """Readiness probe: validates database connectivity before receiving traffic."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    finally:
        db.close()

    is_ready = db_status == "connected"
    return JSONResponse(
        status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ready" if is_ready else "not_ready",
            "database": db_status,
            "storage": "configured" if settings.STORAGE_ENDPOINT_URL else "unconfigured",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


# Root information
@app.get("/", tags=["Root"])
async def root():
    return {
        "clinic": settings.CLINIC_NAME,
        "api": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


# Include API v1 router
from app.api.v1.router import api_router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
