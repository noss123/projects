"""
Pydantic response models for all Google Analytics 4 API endpoints.
"""
from __future__ import annotations

from pydantic import BaseModel


# ──────────────────────────────────────────
# Shared / primitives
# ──────────────────────────────────────────

class TimeSeriesPoint(BaseModel):
    date: str
    value: float


class DemographicItem(BaseModel):
    label: str
    value: int
    percentage: float


# ──────────────────────────────────────────
# /overview
# ──────────────────────────────────────────

class GAOverview(BaseModel):
    sessions: int
    users: int
    new_users: int
    bounce_rate: float          # percentage 0-100
    avg_session_duration: float  # seconds
    pageviews: int
    date_range: dict[str, str]  # {"start_date": ..., "end_date": ...}


# ──────────────────────────────────────────
# /pageviews
# ──────────────────────────────────────────

class GAPageviews(BaseModel):
    series: list[TimeSeriesPoint]
    total: int
    granularity: str  # "day" | "week" | "month"


# ──────────────────────────────────────────
# /traffic-sources
# ──────────────────────────────────────────

class TrafficSource(BaseModel):
    channel: str
    sessions: int
    percentage: float


class GATrafficSources(BaseModel):
    sources: list[TrafficSource]
    total_sessions: int


# ──────────────────────────────────────────
# /top-pages
# ──────────────────────────────────────────

class TopPage(BaseModel):
    page_path: str
    page_title: str
    sessions: int
    pageviews: int
    avg_time_on_page: float  # seconds


class GATopPages(BaseModel):
    pages: list[TopPage]


# ──────────────────────────────────────────
# /demographics
# ──────────────────────────────────────────

class GADemographics(BaseModel):
    by_country: list[DemographicItem]
    by_age: list[DemographicItem]


# ──────────────────────────────────────────
# /device-breakdown
# ──────────────────────────────────────────

class DeviceItem(BaseModel):
    device: str
    sessions: int
    percentage: float


class GADeviceBreakdown(BaseModel):
    devices: list[DeviceItem]
    total_sessions: int


# ──────────────────────────────────────────
# /engagement
# ──────────────────────────────────────────

class GAEngagement(BaseModel):
    engaged_sessions: int
    engagement_rate: float   # percentage 0-100
    events_per_session: float
    avg_engagement_time: float  # seconds


# ──────────────────────────────────────────
# /conversions
# ──────────────────────────────────────────

class ConversionEvent(BaseModel):
    event_name: str
    count: int


class GAConversions(BaseModel):
    events: list[ConversionEvent]
    total: int


# ──────────────────────────────────────────
# /realtime
# ──────────────────────────────────────────

class RealtimeActivePage(BaseModel):
    page_path: str
    active_users: int


class GARealtimeReport(BaseModel):
    active_users: int
    top_pages: list[RealtimeActivePage]
