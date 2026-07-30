"""
FastAPI router: Google Analytics 4 endpoints.

All routes are prefixed with /api/ga.
Query parameters default to the last 30 days when no date range is provided.
"""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Query, HTTPException

from models.ga_models import (
    GAOverview, GAPageviews, GATrafficSources, GATopPages,
    GADemographics, GADeviceBreakdown, GAEngagement,
    GAConversions, GARealtimeReport,
)
import services.ga_service as ga

router = APIRouter(prefix="/api/ga", tags=["Google Analytics"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _handle(func, *args, **kwargs):
    """Call a GA service function and convert RuntimeError to 503."""
    try:
        return func(*args, **kwargs)
    except RuntimeError as exc:
        print(f"DEBUG GA ERROR: {exc}")  # Add this line!
        raise HTTPException(status_code=503, detail=str(exc))


# ── endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/overview",
    response_model=GAOverview,
    summary="KPI Overview",
    description=(
        "Returns high-level website KPIs for the requested date range: "
        "sessions, users, new users, bounce rate, average session duration, and total page views. "
        "Defaults to the last 30 days."
    ),
)
def overview(
    start_date: Annotated[str, Query(description="GA4 date string, e.g. '30daysAgo' or '2025-01-01'")] = "30daysAgo",
    end_date: Annotated[str, Query(description="GA4 date string, e.g. 'today' or '2025-01-31'")] = "today",
):
    return _handle(ga.get_overview, start_date, end_date)


@router.get(
    "/pageviews",
    response_model=GAPageviews,
    summary="Page Views Time Series",
    description=(
        "Returns a time-series of page views grouped by the requested granularity "
        "(day / week / month). Useful for the trend chart on the Statistics page."
    ),
)
def pageviews(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
    granularity: Annotated[Literal["day", "week", "month"], Query(description="Aggregation granularity")] = "day",
):
    return _handle(ga.get_pageviews, start_date, end_date, granularity)


@router.get(
    "/traffic-sources",
    response_model=GATrafficSources,
    summary="Traffic Sources Breakdown",
    description=(
        "Returns sessions grouped by GA4 default channel group "
        "(Organic Search, Direct, Organic Social, Referral, Paid Search, Email, etc.). "
        "Useful for pie / donut charts showing acquisition mix."
    ),
)
def traffic_sources(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(ga.get_traffic_sources, start_date, end_date)


@router.get(
    "/top-pages",
    response_model=GATopPages,
    summary="Top Pages by Sessions",
    description=(
        "Returns the N most-visited pages ranked by sessions, including page path, "
        "page title, session count, page views, and average time on page."
    ),
)
def top_pages(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
    limit: Annotated[int, Query(ge=1, le=50, description="Maximum number of pages to return")] = 10,
):
    return _handle(ga.get_top_pages, start_date, end_date, limit)


@router.get(
    "/demographics",
    response_model=GADemographics,
    summary="Audience Demographics",
    description=(
        "Returns audience breakdowns by country and by age bracket. "
        "Mirrors the audience data already displayed on the Statistics → demographics section."
    ),
)
def demographics(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(ga.get_demographics, start_date, end_date)


@router.get(
    "/device-breakdown",
    response_model=GADeviceBreakdown,
    summary="Device Category Breakdown",
    description=(
        "Returns sessions split across Mobile, Desktop, and Tablet. "
        "Useful for a donut or stacked-bar chart on the Statistics page."
    ),
)
def device_breakdown(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(ga.get_device_breakdown, start_date, end_date)


@router.get(
    "/engagement",
    response_model=GAEngagement,
    summary="Engagement Quality Metrics",
    description=(
        "Returns GA4 engagement metrics: engaged sessions, engagement rate, "
        "average events per session, and average engagement time. "
        "Higher engagement rate indicates more meaningful site interactions."
    ),
)
def engagement(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(ga.get_engagement, start_date, end_date)


@router.get(
    "/conversions",
    response_model=GAConversions,
    summary="Conversion / Key Events",
    description=(
        "Returns counts of GA4 key events (formerly 'conversions'). "
        "Typical examples: membership_signup, exhibition_booking, newsletter_subscribe, "
        "contact_form_submit. Only events marked as key events in GA4 are returned."
    ),
)
def conversions(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(ga.get_conversions, start_date, end_date)


@router.get(
    "/realtime",
    response_model=GARealtimeReport,
    summary="Real-Time Active Users",
    description=(
        "Returns the number of users currently active on the website and "
        "a list of the top pages they are viewing right now. "
        "Refreshes each time this endpoint is called (no caching on the backend)."
    ),
)
def realtime():
    return _handle(ga.get_realtime)
