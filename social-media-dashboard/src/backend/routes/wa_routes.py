"""WhatsApp Business Analytics API routes — stub/fixture-based."""

from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException
from models.wa_models import (
    WAOverview, WAMessageVolume, WAConversations,
    WATemplatePerformance, WAResponseTime, WAQualityMetrics,
    WAMessageDistribution, WALimitations,
)
import services.wa_service as wa

router = APIRouter(prefix="/api/wa", tags=["WhatsApp Analytics"])


def _handle(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"WhatsApp service error: {exc}")


@router.get("/overview", response_model=WAOverview)
def overview(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_overview, days)


@router.get("/message-volume", response_model=WAMessageVolume)
def message_volume(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_message_volume, days)


@router.get("/conversations", response_model=WAConversations)
def conversations(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_conversations, days)


@router.get("/template-performance", response_model=WATemplatePerformance)
def template_performance(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_template_performance, days)


@router.get("/response-time", response_model=WAResponseTime)
def response_time(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_response_time, days)


@router.get("/quality", response_model=WAQualityMetrics)
def quality():
    return _handle(wa.get_quality)


@router.get("/message-distribution", response_model=WAMessageDistribution)
def message_distribution(days: int = Query(30, ge=1, le=365)):
    return _handle(wa.get_message_distribution, days)


@router.get("/limitations", response_model=WALimitations)
def limitations():
    return _handle(wa.get_limitations)
