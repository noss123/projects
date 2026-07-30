"""
Pydantic response models for all YouTube API endpoints.

Mirrors the GA models structure — one model per endpoint response.
Based on YouTube Data API v3 and YouTube Analytics API.
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
# /overview  — channel-level KPIs
# ──────────────────────────────────────────

class YTOverview(BaseModel):
    subscribers: int
    total_views: int
    total_videos: int
    watch_time_hours: float
    avg_view_duration: float        # seconds
    engagement_rate: float          # percentage 0-100
    estimated_revenue: float        # USD
    views_last_30d: int
    subscribers_gained_30d: int
    subscribers_lost_30d: int
    date_range: dict[str, str]


# ──────────────────────────────────────────
# /views  — views time series
# ──────────────────────────────────────────

class YTViewsTimeSeries(BaseModel):
    series: list[TimeSeriesPoint]
    total: int
    granularity: str                # "day" | "week" | "month"


# ──────────────────────────────────────────
# /subscriber-growth  — net subscriber change
# ──────────────────────────────────────────

class SubscriberGrowthPoint(BaseModel):
    date: str
    gained: int
    lost: int
    net: int


class YTSubscriberGrowth(BaseModel):
    series: list[SubscriberGrowthPoint]
    total_gained: int
    total_lost: int
    net_change: int


# ──────────────────────────────────────────
# /watch-time  — watch time time series
# ──────────────────────────────────────────

class YTWatchTime(BaseModel):
    series: list[TimeSeriesPoint]   # value = hours
    total_hours: float
    avg_view_duration: float        # seconds
    granularity: str


# ──────────────────────────────────────────
# /top-videos  — best performing videos
# ──────────────────────────────────────────

class TopVideo(BaseModel):
    video_id: str
    title: str
    published_at: str
    views: int
    likes: int
    comments: int
    shares: int
    watch_time_hours: float
    avg_view_duration: float        # seconds
    impressions_ctr: float          # percentage
    video_type: str                 # "video" | "short" | "live" | "premiere"


class YTTopVideos(BaseModel):
    videos: list[TopVideo]


# ──────────────────────────────────────────
# /demographics  — viewer demographics
# ──────────────────────────────────────────

class YTDemographics(BaseModel):
    by_country: list[DemographicItem]
    by_age: list[DemographicItem]
    by_gender: list[DemographicItem]


# ──────────────────────────────────────────
# /traffic-sources
# ──────────────────────────────────────────

class TrafficSourceItem(BaseModel):
    source: str                     # "Search", "Suggested", "External", "Browse", etc.
    views: int
    percentage: float
    watch_time_hours: float


class YTTrafficSources(BaseModel):
    sources: list[TrafficSourceItem]
    total_views: int


# ──────────────────────────────────────────
# /engagement  — likes, comments, shares breakdown
# ──────────────────────────────────────────

class YTEngagement(BaseModel):
    total_likes: int
    total_comments: int
    total_shares: int
    likes_per_view: float           # ratio
    comments_per_view: float
    shares_per_view: float
    avg_engagement_rate: float      # percentage


# ──────────────────────────────────────────
# /revenue  — estimated ad revenue
# ──────────────────────────────────────────

class RevenuePoint(BaseModel):
    date: str
    revenue: float
    rpm: float                      # revenue per mille (1000 views)
    cpm: float                      # cost per mille (advertiser side)


class YTRevenue(BaseModel):
    series: list[RevenuePoint]
    total_revenue: float
    avg_rpm: float
    avg_cpm: float


# ──────────────────────────────────────────
# /content-performance  — by video type
# ──────────────────────────────────────────

class ContentTypeMetrics(BaseModel):
    video_type: str                 # "video" | "short" | "live" | "premiere"
    count: int
    total_views: int
    avg_views: float
    total_watch_time_hours: float
    avg_engagement_rate: float
    subscribers_gained: int


class YTContentPerformance(BaseModel):
    types: list[ContentTypeMetrics]
