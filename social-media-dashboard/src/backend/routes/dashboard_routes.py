"""Dashboard summary route — aggregates channel health, KPIs, trends, alerts, and top posts."""

from fastapi import APIRouter
import services.dashboard_service as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary():
    """
    Returns a unified snapshot for the main dashboard:
    - channelHealth: computed health score (0-100) for instagram/facebook/linkedin/website
    - channelHealthRates: ARR/ER/CTR (%) used to compute each channel health
    - kpiChanges: % change vs prior period for each top-level KPI
    - engagementTrend: 30-day daily combined engagement series
    - alerts: active and resolved alert list
    - topPosts: top 3 posts by engagement (from CSV data or stubs)
    """
    return await dashboard_service.get_dashboard_summary()
