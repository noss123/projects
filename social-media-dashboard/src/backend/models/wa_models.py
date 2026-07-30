"""Pydantic response models for WhatsApp Business Analytics endpoints."""

from __future__ import annotations
from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    date: str
    value: float


class WAOverview(BaseModel):
    conversations: int
    conversations_change: float
    messages_sent: int
    messages_sent_change: float
    messages_received: int
    messages_received_change: float
    messages_delivered: int
    delivery_rate: float
    messages_read: int
    read_rate: float
    avg_response_time_minutes: float
    avg_response_time_change: float
    period_days: int


class WAMessageVolume(BaseModel):
    series: list[TimeSeriesPoint]
    total_sent: int
    total_received: int
    period_days: int


class WAConversations(BaseModel):
    series: list[TimeSeriesPoint]
    total: int
    user_initiated: int
    business_initiated: int
    period_days: int


class WATemplateMetric(BaseModel):
    template_name: str
    sent: int
    delivered: int
    read: int
    delivery_rate: float
    read_rate: float
    category: str


class WATemplatePerformance(BaseModel):
    templates: list[WATemplateMetric]
    period_days: int


class WAResponseTime(BaseModel):
    series: list[TimeSeriesPoint]
    avg_minutes: float
    median_minutes: float
    p95_minutes: float
    period_days: int


class WAQualityMetrics(BaseModel):
    quality_rating: str
    messaging_limit: str
    phone_number_status: str
    current_tier: str


class WAHourlyDistribution(BaseModel):
    hour: int
    sent: int
    received: int


class WAMessageDistribution(BaseModel):
    hourly: list[WAHourlyDistribution]
    busiest_hour: int
    quietest_hour: int
    period_days: int


class WAUnsupportedMetric(BaseModel):
    metric: str
    reason: str
    available_alternative: str | None = None


class WALimitations(BaseModel):
    unsupported: list[WAUnsupportedMetric]
    note: str
