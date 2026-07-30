from typing import List, Optional
from pydantic import BaseModel, Field

class LIMetricBase(BaseModel):
    date: str

class LIPostPerformance(LIMetricBase):
    post_id: str
    post_type: str
    reach: int = 0
    impressions: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    engagement_rate: float = 0.0

class LIPostResponse(BaseModel):
    posts: List[LIPostPerformance]

class LIDemographicData(BaseModel):
    category: str # e.g. "Geography", "Industry", "Seniority"
    value: str # e.g. "North America", "Tech", "Senior"
    follower_count: int
    percentage: float

class LIFollowerDemographics(BaseModel):
    total_followers: int
    demographics: List[LIDemographicData]

class LIPageTraffic(LIMetricBase):
    page_views: int = 0
    unique_visitors: int = 0
    custom_button_clicks: int = 0

class LIPageTrafficResponse(BaseModel):
    traffic_data: List[LIPageTraffic]

class LIOverview(BaseModel):
    total_followers: int = 0
    new_followers: int = 0
    total_page_views: int = 0
    total_post_impressions: int = 0
    avg_engagement_rate: float = 0.0

# LinkedIn Conversions API Models
class LIConversion(LIMetricBase):
    """Individual conversion record"""
    conversion_id: str
    campaign_id: str
    campaign_name: str
    conversion_type: str  # e.g., "lead_submit", "page_view", "purchase", "click"
    conversion_value: float = 0.0
    currency: str = "USD"
    user_id: Optional[str] = None
    email: Optional[str] = None

class LIConversionSummary(LIMetricBase):
    """Daily conversion summary"""
    total_conversions: int = 0
    total_conversion_value: float = 0.0
    avg_conversion_value: float = 0.0
    conversion_rate: float = 0.0
    unique_conversions: int = 0


class LICampaignPerformance(BaseModel):
    """Campaign-level conversion metrics"""
    campaign_id: str
    campaign_name: str
    spend: float = 0.0
    conversions: int = 0
    conversion_value: float = 0.0
    cpc: float = 0.0  # Cost Per Conversion
    roas: float = 0.0  # Return on Ad Spend
    ctr: float = 0.0  # Click Through Rate
    impressions: int = 0
    clicks: int = 0
    status: str = "active"  # active, paused, archived


class LIConversionResponse(BaseModel):
    """Response containing conversion data"""
    conversions: List[LIConversion]
    summary: LIConversionSummary


class LICampaignConversionResponse(BaseModel):
    """Response containing campaign conversion performance"""
    campaigns: List[LICampaignPerformance]
    total_spend: float = 0.0
    total_conversions: int = 0
    total_conversion_value: float = 0.0
    overall_roas: float = 0.0


class LIROI(BaseModel):
    """ROI Analysis for campaigns"""
    campaign_id: str
    campaign_name: str
    total_spend: float
    total_revenue: float
    roi_percentage: float
    roi_multiplier: float  # Revenue / Spend
    payback_period_days: Optional[int] = None
    break_even_date: Optional[str] = None


class LIROIResponse(BaseModel):
    """Response containing ROI analysis"""
    roi_data: List[LIROI]
    portfolio_roi: float
    total_spend: float
    total_revenue: float
