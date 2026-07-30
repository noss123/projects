"""
Pydantic models for the Predictive Trends / Competitor Insights API.
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class CompetitorTrend(BaseModel):
    """A single trending topic identified from competitor analysis."""
    id: str
    category: str
    topic: str
    change: float = Field(description="Percentage change / growth indicator")
    confidence: int = Field(ge=0, le=100, description="AI confidence 0-100")
    signal: str = Field(description="rising | steady | emerging")
    sources: list[str] = Field(default_factory=list, description="Competitor names this trend was observed in")


class TrendSuggestion(BaseModel):
    """An actionable suggestion derived from trend analysis."""
    id: str
    priority: str = Field(description="high | medium | low")
    title: str
    description: str
    channel: str = Field(description="instagram | linkedin | whatsapp")
    expected_impact: str
    related_trend: Optional[str] = None


class TrendGrowthPoint(BaseModel):
    date: str
    value: float


class TrendTrajectory(BaseModel):
    label: str
    color: str
    data: list[TrendGrowthPoint]


class CompetitorInsight(BaseModel):
    """An observation about a specific competitor with an opportunity for the user."""
    competitor_name: str
    observation: str
    opportunity: str


class TrendsResponse(BaseModel):
    """Full payload returned by GET /api/trends/insights."""
    trending_topics: list[CompetitorTrend]
    suggested_actions: list[TrendSuggestion]
    trend_trajectories: list[TrendTrajectory]
    competitor_insights: list[CompetitorInsight]
    last_updated: str
    source: str = Field(description="ai | cache | fallback")


class TrendingTopicsResponse(BaseModel):
    """Payload returned by GET /api/trends/trending."""
    topics: list[CompetitorTrend]
    source: str


class RefreshResponse(BaseModel):
    """Payload returned by POST /api/trends/refresh."""
    status: str
    message: str
    source: str
