"""Instagram Analytics API routes — stub/fixture-based."""

from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException
from models.ig_models import (
    IGOverview, IGReach, IGImpressions, IGTopPosts,
    IGAudienceDemographics, IGEngagement, IGFollowerGrowth,
    IGStories, IGContentBreakdown,
)
import services.ig_service as ig

router = APIRouter(prefix="/api/ig", tags=["Instagram Analytics"])


def _handle(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Instagram service error: {exc}")


@router.get("/overview", response_model=IGOverview)
def overview(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_overview, days)


@router.get("/reach", response_model=IGReach)
def reach(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_reach, days)


@router.get("/impressions", response_model=IGImpressions)
def impressions(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_impressions, days)


@router.get("/top-posts", response_model=IGTopPosts)
def top_posts(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_top_posts, days)


@router.get("/demographics", response_model=IGAudienceDemographics)
def demographics(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_demographics, days)


@router.get("/engagement", response_model=IGEngagement)
def engagement(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_engagement, days)


@router.get("/follower-growth", response_model=IGFollowerGrowth)
def follower_growth(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_follower_growth, days)


@router.get("/stories", response_model=IGStories)
def stories(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_stories, days)


@router.get("/content-breakdown", response_model=IGContentBreakdown)
def content_breakdown(days: int = Query(30, ge=1, le=365)):
    return _handle(ig.get_content_breakdown, days)
