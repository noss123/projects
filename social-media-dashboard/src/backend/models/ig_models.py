"""Pydantic response models for Instagram Analytics endpoints."""

from __future__ import annotations
from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    date: str
    value: float


class DemographicItem(BaseModel):
    category: str
    value: float
    count: int


class IGOverview(BaseModel):
    followers: int
    followers_change: float
    reach: int
    reach_change: float
    impressions: int
    impressions_change: float
    engagement_rate: float
    engagement_rate_change: float
    profile_visits: int
    profile_visits_change: float
    website_clicks: int
    website_clicks_change: float
    period_days: int


class IGReach(BaseModel):
    series: list[TimeSeriesPoint]
    total: int
    period_days: int


class IGImpressions(BaseModel):
    series: list[TimeSeriesPoint]
    total: int
    period_days: int


class IGPostMetric(BaseModel):
    post_id: str
    caption: str
    published: str
    likes: int
    comments: int
    shares: int
    saves: int
    reach: int
    impressions: int
    engagement_rate: float
    post_type: str


class IGTopPosts(BaseModel):
    posts: list[IGPostMetric]
    period_days: int


class IGAudienceDemographics(BaseModel):
    by_age: list[DemographicItem]
    by_gender: list[DemographicItem]
    by_city: list[DemographicItem]
    by_country: list[DemographicItem]
    period_days: int


class IGEngagement(BaseModel):
    series: list[TimeSeriesPoint]
    avg_engagement_rate: float
    total_likes: int
    total_comments: int
    total_shares: int
    total_saves: int
    period_days: int


class IGFollowerGrowth(BaseModel):
    series: list[TimeSeriesPoint]
    total_gained: int
    total_lost: int
    net_change: int
    period_days: int


class IGStoryMetric(BaseModel):
    story_id: str
    published: str
    impressions: int
    reach: int
    exits: int
    replies: int
    taps_forward: int
    taps_back: int


class IGStories(BaseModel):
    stories: list[IGStoryMetric]
    period_days: int


class IGContentPerformance(BaseModel):
    content_type: str
    count: int
    avg_reach: float
    avg_engagement_rate: float
    avg_saves: float


class IGContentBreakdown(BaseModel):
    breakdown: list[IGContentPerformance]
    period_days: int
