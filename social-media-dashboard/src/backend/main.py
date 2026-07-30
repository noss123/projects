from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import certifi
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from core.database import db
from core.config import settings

from routes.ga_routes import router as ga_router
from routes.yt_routes import router as yt_router
from routes.auth_routes import router as auth_router
from routes.li_routes import router as li_router
from routes.ig_routes import router as ig_router
from routes.wa_routes import router as wa_router
from routes.social_insights_routes import router as social_insights_router
from routes.trends_routes import router as trends_router
from routes.competitor_routes import router as competitor_router
from routes.dashboard_routes import router as dashboard_router
from services.scheduler import trends_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — DB first, then scheduler
    # Use certifi's CA bundle to fix TLSV1_ALERT_INTERNAL_ERROR on Python 3.12
    # with MongoDB Atlas (system CA bundle is incompatible with Atlas on some Linux distros)
    db.client = AsyncIOMotorClient(
        settings.mongodb_uri,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,   # fail fast instead of hanging 30s
    )
    from services.competitor_service import load_competitors_from_db
    await load_competitors_from_db()
    await trends_scheduler.start()
    yield
    # Shutdown
    await trends_scheduler.stop()
    db.client.close()

app = FastAPI(
    title="Social Analytics Dashboard API",
    description=(
        "Backend API for the Club Artizen Social Media Analytics Dashboard. "
        "Provides Google Analytics 4 website metrics alongside social channel data."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(ga_router)
app.include_router(yt_router)
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(li_router)
app.include_router(ig_router)
app.include_router(wa_router)
app.include_router(social_insights_router)
app.include_router(trends_router)
app.include_router(competitor_router)
app.include_router(dashboard_router)


# ── Root / Health ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Social Analytics Dashboard API!"}


@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok"}
