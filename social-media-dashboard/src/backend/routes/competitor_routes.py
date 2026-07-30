"""
API routes for competitor social metrics.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from services.competitor_service import get_competitors, add_competitor
from models.competitor_models import CompetitorsResponse, CompetitorCreateRequest

router = APIRouter(prefix="/api/competitors", tags=["Competitor Metrics"])


@router.get("", response_model=CompetitorsResponse)
async def get_competitor_metrics(force_refresh: bool = False):
    """
    Get the latest follower/engagement counts for all competitors.
    Uses memory cache + background scraping to ensure fast frontend response.
    """
    return await get_competitors(force_refresh=force_refresh)


@router.post("", response_model=dict)
async def create_competitor(payload: CompetitorCreateRequest):
    """
    Add a new competitor to the dashboard.
    Persists to MongoDB and triggers a background scrape.
    """
    return await add_competitor(payload)


@router.post("/refresh", response_model=dict)
async def refresh_competitors():
    """Force re-scrape (bypasses cache)."""
    try:
        result = await get_competitors(force_refresh=True)
        return {
            "status": "ok",
            "message": "Competitor data refreshed successfully",
            "source": result.source,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
