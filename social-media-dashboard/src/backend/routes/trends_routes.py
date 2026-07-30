"""
API routes for competitor-driven predictive trends.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from services import trends_service as ts
from services.scheduler import get_scheduler_status
from models.trends_models import TrendsResponse, TrendingTopicsResponse, RefreshResponse

router = APIRouter(prefix="/api/trends", tags=["Trends"])


@router.get("/insights", response_model=TrendsResponse)
async def get_insights():
    """
    Full predictive insights payload: trending topics, suggested actions,
    competitor insights, and trend trajectories.
    """
    try:
        return await ts.get_competitor_insights()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/trending", response_model=TrendingTopicsResponse)
async def get_trending():
    """Trending topics list only."""
    try:
        insights = await ts.get_competitor_insights()
        return TrendingTopicsResponse(topics=insights.trending_topics, source=insights.source)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_trends():
    """Force re-scrape and re-analyse (bypasses cache)."""
    try:
        result = await ts.get_competitor_insights(force_refresh=True)
        return RefreshResponse(
            status="ok",
            message="Trends refreshed successfully",
            source=result.source,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/status")
async def get_trends_status():
    """
    Returns scheduler state: last_run, next_run, interval_hours, last_status.
    Used by the frontend to display the next-scrape countdown badge.
    """
    return get_scheduler_status()

