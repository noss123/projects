"""
Pydantic models for the Competitor Metrics API.
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class CompetitorMetrics(BaseModel):
    """Social media metrics for a single competitor."""
    facebook: int = Field(default=0, description="Facebook page followers")
    instagram: int = Field(default=0, description="Instagram followers")
    linkedin: int = Field(default=0, description="LinkedIn followers")
    youtube: int = Field(default=0, description="YouTube subscribers")
    engagement: float = Field(default=0.0, description="Avg engagement rate %")
    postsPerWeek: int = Field(default=0, description="Average posts per week", alias="posts_per_week")
    growth: float = Field(default=0.0, description="Growth rate %")

    class Config:
        populate_by_name = True


class CompetitorGrowthPoint(BaseModel):
    date: str
    value: int


class CompetitorData(BaseModel):
    """Full competitor profile with metrics and growth trend."""
    id: str
    name: str
    handle: str
    metrics: CompetitorMetrics
    growthTrend: list[CompetitorGrowthPoint] = Field(default_factory=list, alias="growth_trend")

    class Config:
        populate_by_name = True


class CompetitorsResponse(BaseModel):
    """Payload returned by GET /api/competitors."""
    competitors: list[CompetitorData]
    last_updated: str
    source: str = Field(description="live | cache | fallback")


class CompetitorCreateRequest(BaseModel):
    """Payload for POST /api/competitors."""
    name: str = Field(..., min_length=2, max_length=50)
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    website: Optional[str] = None
