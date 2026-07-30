from fastapi import APIRouter, Query, HTTPException
from typing import Annotated
import services.li_service as li

from models.li_models import (
    LIOverview,
    LIPostResponse,
    LIFollowerDemographics,
    LIPageTrafficResponse,
    LIConversionResponse,
    LICampaignConversionResponse,
    LIROIResponse,
)

router = APIRouter(prefix="/api/li", tags=["LinkedIn"])

@router.get("/overview", response_model=LIOverview, summary="LinkedIn Overview")
def overview(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    try:
        return li.get_overview(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/posts", response_model=LIPostResponse, summary="LinkedIn Post Performance")
def posts_performance(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    try:
        return li.get_posts_performance(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/demographics", response_model=LIFollowerDemographics, summary="LinkedIn Follower Demographics")
def demographics():
    try:
        return li.get_demographics()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/page-traffic", response_model=LIPageTrafficResponse, summary="LinkedIn Page Traffic")
def page_traffic(
    start_date: Annotated[str, Query()] = "7daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    try:
        return li.get_page_traffic(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# LinkedIn Conversions API Endpoints
@router.get("/conversions", response_model=LIConversionResponse, summary="LinkedIn Conversion Records")
def conversions(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    """
    Fetch conversion records from LinkedIn Conversions API.
    Returns individual conversions and daily summary statistics.
    """
    try:
        return li.get_conversions(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaigns/performance", response_model=LICampaignConversionResponse, summary="LinkedIn Campaign Performance")
def campaign_performance(
    start_date: Annotated[str, Query()] = "30daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    """
    Fetch campaign-level performance metrics including spend, conversions, ROAS, and ROI.
    Helps analyze which campaigns are driving the most conversions and revenue.
    """
    try:
        return li.get_campaign_performance(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/roi", response_model=LIROIResponse, summary="LinkedIn ROI Analysis")
def roi_analysis(
    start_date: Annotated[str, Query()] = "90daysAgo",
    end_date: Annotated[str, Query()] = "today",
):
    """
    Get ROI analysis for campaigns showing return on investment percentage and multiplier.
    Useful for understanding long-term campaign profitability and fund allocation decisions.
    """
    try:
        return li.get_roi_analysis(start_date, end_date)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
