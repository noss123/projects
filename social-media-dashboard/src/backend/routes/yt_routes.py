"""
FastAPI router: YouTube endpoints.

All routes are prefixed with /api/yt.
Query parameters default to the last 30 days when no date range is provided.

Architecture mirrors /api/ga — when YouTube credentials are absent the service
layer returns stub data transparently.
"""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Query, HTTPException

from models.yt_models import (
    YTOverview, YTViewsTimeSeries, YTSubscriberGrowth, YTWatchTime,
    YTTopVideos, YTDemographics, YTTrafficSources, YTEngagement,
    YTRevenue, YTContentPerformance,
)
import services.yt_service as yt

router = APIRouter(prefix="/api/yt", tags=["YouTube"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _handle(func, *args, **kwargs):
    """Call a YT service function and convert RuntimeError to 503."""
    try:
        return func(*args, **kwargs)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"YouTube API error: {exc}")


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/overview",
    response_model=YTOverview,
    summary="Channel KPI Overview",
    description=(
        "Returns high-level YouTube channel KPIs: subscribers, total views, "
        "total videos, watch time, engagement rate, estimated revenue, and "
        "30-day subscriber/view deltas.  Defaults to the last 30 days."
    ),
)
def overview(
    start_date: Annotated[str, Query(description="Start date, e.g. '30daysAgo' or '2026-01-01'")] = "30daysAgo",
    end_date: Annotated[str, Query(description="End date, e.g. 'today' or '2026-03-01'")] = "today",
):
    return _handle(yt.get_overview, start_date, end_date)


@router.get(
    "/views",
    response_model=YTViewsTimeSeries,
    summary="Views Time Series",
    description=(
        "Returns a time-series of video views grouped by the requested "
        "granularity (day / week / month).  Useful for the trend chart "
        "on the YouTube channel dashboard."
    ),
)
def views(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
    granularity: Annotated[Literal["day", "week", "month"], Query()] = "day",
):
    return _handle(yt.get_views, start_date, end_date, granularity)


@router.get(
    "/subscriber-growth",
    response_model=YTSubscriberGrowth,
    summary="Subscriber Growth",
    description=(
        "Returns daily gained, lost, and net subscriber counts.  "
        "Powers the subscriber growth chart on the YouTube dashboard."
    ),
)
def subscriber_growth(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(yt.get_subscriber_growth, start_date, end_date)


@router.get(
    "/watch-time",
    response_model=YTWatchTime,
    summary="Watch Time Time Series",
    description=(
        "Returns a time-series of watch time in hours, plus the overall "
        "average view duration in seconds."
    ),
)
def watch_time(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
    granularity: Annotated[Literal["day", "week", "month"], Query()] = "day",
):
    return _handle(yt.get_watch_time, start_date, end_date, granularity)


@router.get(
    "/top-videos",
    response_model=YTTopVideos,
    summary="Top Performing Videos",
    description=(
        "Returns the N most-viewed videos, including per-video metrics "
        "(views, likes, comments, shares, watch time, CTR, video type)."
    ),
)
def top_videos(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
    limit: Annotated[int, Query(ge=1, le=50, description="Maximum number of videos")] = 10,
):
    return _handle(yt.get_top_videos, start_date, end_date, limit)


@router.get(
    "/demographics",
    response_model=YTDemographics,
    summary="Viewer Demographics",
    description=(
        "Returns viewer breakdowns by country, age bracket, and gender."
    ),
)
def demographics(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(yt.get_demographics, start_date, end_date)


@router.get(
    "/traffic-sources",
    response_model=YTTrafficSources,
    summary="Traffic Sources Breakdown",
    description=(
        "Returns views and watch time grouped by traffic source "
        "(YouTube Search, Suggested Videos, External, Browse Features, etc.)."
    ),
)
def traffic_sources(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(yt.get_traffic_sources, start_date, end_date)


@router.get(
    "/engagement",
    response_model=YTEngagement,
    summary="Engagement Metrics",
    description=(
        "Returns aggregate engagement metrics: total likes, comments, "
        "shares, per-view ratios, and average engagement rate."
    ),
)
def engagement(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(yt.get_engagement, start_date, end_date)


@router.get(
    "/revenue",
    response_model=YTRevenue,
    summary="Estimated Ad Revenue",
    description=(
        "Returns a time-series of estimated ad revenue with RPM and CPM. "
        "Requires YouTube Partner Program enrollment for real data."
    ),
)
def revenue(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    return _handle(yt.get_revenue, start_date, end_date)


@router.get(
    "/content-performance",
    response_model=YTContentPerformance,
    summary="Performance by Video Type",
    description=(
        "Returns aggregate metrics broken down by video type: "
        "regular video, Short, live stream, and premiere."
    ),
)
def content_performance():
    return _handle(yt.get_content_performance)
