from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict

import httpx

from core.config import settings


FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "generated"
LOGGER = logging.getLogger(__name__)
LINKEDIN_BASE_URL = "https://api.linkedin.com"
LIVE_FETCH_TTL_SECONDS = 60
_LIVE_ANALYTICS_CACHE: Dict[str, tuple[float, list[Dict[str, Any]]]] = {}
_LIVE_ANALYTICS_FAIL_CACHE: Dict[str, float] = {}


def _load_fixture() -> Dict[str, Any] | None:
    fp = FIXTURE_DIR / "linkedin.json"
    if not fp.exists():
        return None
    with open(fp) as f:
        return json.load(f)


def _parse_relative_date(expr: str) -> datetime:
    expr = (expr or "today").strip().lower()
    if expr == "today":
        return datetime.utcnow()
    if expr.endswith("daysago"):
        days = int(expr.replace("daysago", "") or "0")
        return datetime.utcnow() - timedelta(days=days)
    try:
        return datetime.strptime(expr, "%Y-%m-%d")
    except ValueError:
        return datetime.utcnow()


def _linkedin_date_range(start_date: str, end_date: str) -> str:
    start = _parse_relative_date(start_date)
    end = _parse_relative_date(end_date)
    return (
        "(start:(year:{},month:{},day:{}),end:(year:{},month:{},day:{}))".format(
            start.year,
            start.month,
            start.day,
            end.year,
            end.month,
            end.day,
        )
    )


def _get_li_headers(version: str | None = None) -> Dict[str, str] | None:
    if not settings.linkedin_access_token:
        return None
    resolved_version = version or (
        settings.linkedin_api_version
        or settings.linkedin_conversion_api_version
        or "202401"
    )
    headers = {
        "Authorization": f"Bearer {settings.linkedin_access_token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Accept": "application/json",
    }
    if resolved_version:
        headers["LinkedIn-Version"] = resolved_version
    return headers


def _candidate_versions() -> list[str | None]:
    configured = [
        settings.linkedin_api_version,
        settings.linkedin_conversion_api_version,
        "202512",
        "202510",
        "202506",
        "202504",
        "202401",
    ]
    uniq: list[str | None] = []
    seen: set[str] = set()
    for version in configured:
        if version and version not in seen:
            seen.add(version)
            uniq.append(version)
    # Final fallback with no LinkedIn-Version header.
    uniq.append(None)
    return uniq


def _safe_spend(raw_cost: Any) -> float:
    try:
        value = float(raw_cost or 0.0)
    except (TypeError, ValueError):
        return 0.0
    # LinkedIn sometimes returns spend in micros.
    return value / 1_000_000 if value > 100000 else value


def _is_real_env_value(value: str) -> bool:
    if not value:
        return False
    marker = value.strip().upper()
    return not (
        marker.startswith("YOUR_")
        or "YOUR_" in marker
        or marker.endswith("_ID")
        or marker.endswith("_TOKEN")
    )


def _extract_conversion_count(row: Dict[str, Any]) -> int:
    for key in (
        "externalWebsiteConversions",
        "conversions",
        "leadGenerationMailContactInfoShares",
        "fullScreenPlays",
    ):
        if key in row:
            try:
                return int(float(row.get(key) or 0))
            except (TypeError, ValueError):
                return 0
    return 0


def _extract_conversion_value(row: Dict[str, Any], conversions: int) -> float:
    for key in ("conversionValueInUsd", "conversionValue"):
        if key in row:
            try:
                return float(row.get(key) or 0.0)
            except (TypeError, ValueError):
                return 0.0
    # Conservative estimate for dashboards when API does not include value.
    return float(conversions * 50)


def _extract_campaign_id(row: Dict[str, Any]) -> str:
    pivots = row.get("pivotValues") or []
    if pivots and isinstance(pivots, list):
        return str(pivots[0])
    return str(row.get("campaign") or "unknown_campaign")


def _fetch_live_ad_analytics(start_date: str, end_date: str) -> list[Dict[str, Any]] | None:
    headers = _get_li_headers()
    account_urn = settings.linkedin_ad_account_urn

    if not headers or not _is_real_env_value(account_urn):
        return None

    cache_key = f"{account_urn}:{start_date}:{end_date}"
    now = time.time()

    fail_until = _LIVE_ANALYTICS_FAIL_CACHE.get(cache_key)
    if fail_until and fail_until > now:
        return None

    cached = _LIVE_ANALYTICS_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    params = {
        "q": "analytics",
        "pivot": "CAMPAIGN",
        "timeGranularity": "DAILY",
        "dateRange": _linkedin_date_range(start_date, end_date),
        "accounts": f"List({account_urn})",
    }

    endpoints = (
        f"{LINKEDIN_BASE_URL}/rest/adAnalytics",
        f"{LINKEDIN_BASE_URL}/v2/adAnalyticsV2",
    )

    last_error: Exception | None = None
    with httpx.Client(timeout=20.0) as client:
        for url in endpoints:
            for version in _candidate_versions():
                try:
                    req_headers = _get_li_headers(version)
                    if not req_headers:
                        continue
                    resp = client.get(url, headers=req_headers, params=params)

                    if resp.status_code == 426:
                        # Try next API version (or endpoint) without flooding warning logs.
                        LOGGER.info(
                            "LinkedIn ad analytics requires different API version at %s (tried version=%s)",
                            url,
                            version,
                        )
                        continue

                    resp.raise_for_status()
                    payload = resp.json()
                    elements = payload.get("elements") if isinstance(payload, dict) else None
                    if isinstance(elements, list) and elements:
                        _LIVE_ANALYTICS_CACHE[cache_key] = (now + LIVE_FETCH_TTL_SECONDS, elements)
                        return elements
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    continue

    if last_error:
        _LIVE_ANALYTICS_FAIL_CACHE[cache_key] = now + LIVE_FETCH_TTL_SECONDS
        LOGGER.warning("LinkedIn live analytics fetch failed, using fallback data: %s", last_error)
    return None


def _live_conversions_payload(start_date: str, end_date: str) -> Dict[str, Any] | None:
    rows = _fetch_live_ad_analytics(start_date, end_date)
    if not rows:
        return None

    conversions: list[Dict[str, Any]] = []
    total_conversions = 0
    total_value = 0.0

    for idx, row in enumerate(rows):
        conv_count = _extract_conversion_count(row)
        conv_value = _extract_conversion_value(row, conv_count)
        total_conversions += conv_count
        total_value += conv_value

        date_str = row.get("dateRange", {}).get("end", {})
        if isinstance(date_str, dict):
            date_str = "{year:04d}-{month:02d}-{day:02d}".format(
                year=int(date_str.get("year", datetime.utcnow().year)),
                month=int(date_str.get("month", datetime.utcnow().month)),
                day=int(date_str.get("day", datetime.utcnow().day)),
            )
        elif not date_str:
            date_str = datetime.utcnow().strftime("%Y-%m-%d")

        conversions.append(
            {
                "date": str(date_str),
                "conversion_id": f"li_live_conv_{idx}",
                "campaign_id": _extract_campaign_id(row),
                "campaign_name": _extract_campaign_id(row),
                "conversion_type": "external_website_conversion",
                "conversion_value": float(conv_value),
                "currency": "USD",
                "user_id": None,
                "email": None,
            }
        )

    clicks = sum(int(float(r.get("clicks", 0) or 0)) for r in rows)
    conversion_rate = (total_conversions / clicks * 100.0) if clicks else 0.0

    return {
        "conversions": conversions,
        "summary": {
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "total_conversions": int(total_conversions),
            "total_conversion_value": float(total_value),
            "avg_conversion_value": float(total_value / total_conversions) if total_conversions else 0.0,
            "conversion_rate": float(conversion_rate),
            "unique_conversions": int(total_conversions),
        },
    }


def _live_campaign_payload(start_date: str, end_date: str) -> Dict[str, Any] | None:
    rows = _fetch_live_ad_analytics(start_date, end_date)
    if not rows:
        return None

    by_campaign: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        campaign_id = _extract_campaign_id(row)
        current = by_campaign.setdefault(
            campaign_id,
            {
                "campaign_id": campaign_id,
                "campaign_name": campaign_id,
                "spend": 0.0,
                "conversions": 0,
                "conversion_value": 0.0,
                "cpc": 0.0,
                "roas": 0.0,
                "ctr": 0.0,
                "impressions": 0,
                "clicks": 0,
                "status": "active",
            },
        )

        spend = _safe_spend(row.get("costInUsd") or row.get("costInLocalCurrency"))
        clicks = int(float(row.get("clicks", 0) or 0))
        impressions = int(float(row.get("impressions", 0) or 0))
        conversions = _extract_conversion_count(row)
        value = _extract_conversion_value(row, conversions)

        current["spend"] += spend
        current["clicks"] += clicks
        current["impressions"] += impressions
        current["conversions"] += conversions
        current["conversion_value"] += value

    campaigns = list(by_campaign.values())
    for campaign in campaigns:
        spend = float(campaign["spend"])
        clicks = int(campaign["clicks"])
        impressions = int(campaign["impressions"])
        conversions = int(campaign["conversions"])
        conv_value = float(campaign["conversion_value"])
        campaign["cpc"] = (spend / conversions) if conversions else 0.0
        campaign["roas"] = (conv_value / spend) if spend else 0.0
        campaign["ctr"] = (clicks / impressions * 100.0) if impressions else 0.0

    total_spend = sum(float(c["spend"]) for c in campaigns)
    total_conversions = sum(int(c["conversions"]) for c in campaigns)
    total_value = sum(float(c["conversion_value"]) for c in campaigns)

    return {
        "campaigns": campaigns,
        "total_spend": total_spend,
        "total_conversions": total_conversions,
        "total_conversion_value": total_value,
        "overall_roas": (total_value / total_spend) if total_spend else 0.0,
    }


def _fallback_overview() -> Dict[str, Any]:
    return {
        "total_followers": 15420,
        "new_followers": 342,
        "total_page_views": 8500,
        "total_post_impressions": 45000,
        "avg_engagement_rate": 4.8,
    }


def get_overview(start_date: str, end_date: str) -> Dict[str, Any]:
    fixture = _load_fixture()
    if not fixture or "overview" not in fixture:
        return _fallback_overview()

    ov = fixture["overview"]
    return {
        "total_followers": int(ov.get("followers", 0)),
        "new_followers": int(max(0, ov.get("followers_change", 0) * 100)),
        "total_page_views": int(ov.get("unique_visitors", 0)),
        "total_post_impressions": int(ov.get("impressions", 0)),
        "avg_engagement_rate": float(ov.get("engagement_rate", 0.0)),
    }


def get_posts_performance(start_date: str, end_date: str) -> Dict[str, Any]:
    fixture = _load_fixture()
    if fixture and "top_posts" in fixture and "posts" in fixture["top_posts"]:
        posts = []
        for p in fixture["top_posts"]["posts"]:
            posts.append(
                {
                    "date": p.get("published", "")[:10],
                    "post_id": p.get("post_id", ""),
                    "post_type": p.get("post_type", "Post"),
                    "reach": int(p.get("impressions", 0)),
                    "impressions": int(p.get("impressions", 0)),
                    "likes": int(p.get("reactions", 0)),
                    "comments": int(p.get("comments", 0)),
                    "shares": int(p.get("shares", 0)),
                    "clicks": int(p.get("clicks", 0)),
                    "engagement_rate": float(p.get("engagement_rate", 0.0)),
                }
            )
        return {"posts": posts}

    return {
        "posts": [
            {
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "post_id": "urn:li:share:12345",
                "post_type": "Article",
                "reach": 12000,
                "impressions": 15000,
                "likes": 340,
                "comments": 45,
                "shares": 20,
                "clicks": 800,
                "engagement_rate": 5.2,
            }
        ]
    }


def get_demographics() -> Dict[str, Any]:
    fixture = _load_fixture()
    if fixture and "demographics" in fixture and "overview" in fixture:
        dem = fixture["demographics"]
        flattened = []
        mapping = {
            "by_function": "Function",
            "by_seniority": "Seniority",
            "by_industry": "Industry",
            "by_location": "Geography",
        }
        for key, label in mapping.items():
            for item in dem.get(key, []):
                flattened.append(
                    {
                        "category": label,
                        "value": item.get("category", "Unknown"),
                        "follower_count": int(item.get("count", 0)),
                        "percentage": float(item.get("value", 0.0)),
                    }
                )

        return {
            "total_followers": int(fixture["overview"].get("followers", 0)),
            "demographics": flattened,
        }

    return {
        "total_followers": 15420,
        "demographics": [
            {"category": "Geography", "value": "North America", "follower_count": 6168, "percentage": 40.0},
            {"category": "Industry", "value": "Technology", "follower_count": 7710, "percentage": 50.0},
            {"category": "Seniority", "value": "Senior", "follower_count": 5397, "percentage": 35.0},
        ],
    }


def get_page_traffic(start_date: str, end_date: str) -> Dict[str, Any]:
    fixture = _load_fixture()
    if fixture and "page_views" in fixture and "series" in fixture["page_views"]:
        traffic = []
        for row in fixture["page_views"]["series"]:
            views = int(row.get("value", 0))
            traffic.append(
                {
                    "date": row.get("date", ""),
                    "page_views": views,
                    "unique_visitors": int(views * 0.75),
                    "custom_button_clicks": int(views * 0.04),
                }
            )
        return {"traffic_data": traffic}

    traffic = []
    for i in range(7):
        date_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        traffic.append({
            "date": date_str,
            "page_views": 1200 - (i * 50),
            "unique_visitors": 800 - (i * 30),
            "custom_button_clicks": 45 - (i * 2),
        })
    return {"traffic_data": traffic}


# LinkedIn Conversions API Service Functions
def _load_conversions_fixture() -> Dict[str, Any] | None:
    """Load conversion fixture data"""
    fp = FIXTURE_DIR / "linkedin_conversions.json"
    if not fp.exists():
        return None
    with open(fp) as f:
        return json.load(f)


def _fallback_conversions() -> Dict[str, Any]:
    """Fallback conversion data for demo purposes"""
    return {
        "conversions": [
            {
                "date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"),
                "conversion_id": f"conv_{i}",
                "campaign_id": "camp_B2B_leads",
                "campaign_name": "B2B Lead Generation",
                "conversion_type": "lead_submit",
                "conversion_value": 50.0,
                "currency": "USD",
            } for i in range(7)
        ],
        "summary": {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_conversions": 45,
            "total_conversion_value": 2250.0,
            "avg_conversion_value": 50.0,
            "conversion_rate": 2.5,
            "unique_conversions": 42,
        }
    }


def get_conversions(start_date: str, end_date: str) -> Dict[str, Any]:
    """Fetch conversion records from LinkedIn Conversions API"""
    live = _live_conversions_payload(start_date, end_date)
    if live:
        return live

    fixture = _load_conversions_fixture()
    if fixture and "conversions" in fixture:
        conversions = []
        for c in fixture["conversions"]:
            conversions.append({
                "date": c.get("date", ""),
                "conversion_id": c.get("conversion_id", ""),
                "campaign_id": c.get("campaign_id", ""),
                "campaign_name": c.get("campaign_name", ""),
                "conversion_type": c.get("conversion_type", "lead_submit"),
                "conversion_value": float(c.get("conversion_value", 0.0)),
                "currency": c.get("currency", "USD"),
                "user_id": c.get("user_id"),
                "email": c.get("email"),
            })
        summary = fixture.get("summary", _fallback_conversions()["summary"])
        return {
            "conversions": conversions,
            "summary": summary
        }

    fallback = _fallback_conversions()
    return fallback


def get_campaign_performance(start_date: str, end_date: str) -> Dict[str, Any]:
    """Fetch campaign-level performance and conversion metrics"""
    live = _live_campaign_payload(start_date, end_date)
    if live:
        return live

    fixture = _load_conversions_fixture()
    if fixture and "campaigns" in fixture:
        campaigns = []
        for camp in fixture["campaigns"]:
            campaigns.append({
                "campaign_id": camp.get("campaign_id", ""),
                "campaign_name": camp.get("campaign_name", ""),
                "spend": float(camp.get("spend", 0.0)),
                "conversions": int(camp.get("conversions", 0)),
                "conversion_value": float(camp.get("conversion_value", 0.0)),
                "cpc": float(camp.get("cpc", 0.0)),
                "roas": float(camp.get("roas", 0.0)),
                "ctr": float(camp.get("ctr", 0.0)),
                "impressions": int(camp.get("impressions", 0)),
                "clicks": int(camp.get("clicks", 0)),
                "status": camp.get("status", "active"),
            })
        
        total_spend = sum(c["spend"] for c in campaigns)
        total_conversions = sum(c["conversions"] for c in campaigns)
        total_value = sum(c["conversion_value"] for c in campaigns)
        overall_roas = total_value / total_spend if total_spend > 0 else 0.0
        
        return {
            "campaigns": campaigns,
            "total_spend": total_spend,
            "total_conversions": total_conversions,
            "total_conversion_value": total_value,
            "overall_roas": overall_roas,
        }

    # Fallback campaign data
    campaigns = [
        {
            "campaign_id": "camp_B2B_leads",
            "campaign_name": "B2B Lead Generation",
            "spend": 5000.0,
            "conversions": 95,
            "conversion_value": 4750.0,
            "cpc": 52.63,
            "roas": 0.95,
            "ctr": 3.2,
            "impressions": 125000,
            "clicks": 4000,
            "status": "active",
        },
        {
            "campaign_id": "camp_awareness",
            "campaign_name": "Brand Awareness",
            "spend": 3000.0,
            "conversions": 45,
            "conversion_value": 1350.0,
            "cpc": 66.67,
            "roas": 0.45,
            "ctr": 2.1,
            "impressions": 85000,
            "clicks": 1800,
            "status": "active",
        },
        {
            "campaign_id": "camp_retargeting",
            "campaign_name": "Retargeting Campaign",
            "spend": 2000.0,
            "conversions": 78,
            "conversion_value": 2340.0,
            "cpc": 25.64,
            "roas": 1.17,
            "ctr": 4.8,
            "impressions": 45000,
            "clicks": 2160,
            "status": "active",
        },
    ]
    
    total_spend = sum(c["spend"] for c in campaigns)
    total_conversions = sum(c["conversions"] for c in campaigns)
    total_value = sum(c["conversion_value"] for c in campaigns)
    
    return {
        "campaigns": campaigns,
        "total_spend": total_spend,
        "total_conversions": total_conversions,
        "total_conversion_value": total_value,
        "overall_roas": total_value / total_spend if total_spend > 0 else 0.0,
    }


def get_roi_analysis(start_date: str, end_date: str) -> Dict[str, Any]:
    """Fetch ROI analysis for campaigns"""
    live_campaigns = _live_campaign_payload(start_date, end_date)
    if live_campaigns:
        roi_data = []
        for camp in live_campaigns["campaigns"]:
            total_spend = float(camp.get("spend", 0.0))
            total_revenue = float(camp.get("conversion_value", 0.0))
            roi_pct = ((total_revenue - total_spend) / total_spend * 100.0) if total_spend else 0.0
            roi_data.append(
                {
                    "campaign_id": camp.get("campaign_id", ""),
                    "campaign_name": camp.get("campaign_name", ""),
                    "total_spend": total_spend,
                    "total_revenue": total_revenue,
                    "roi_percentage": roi_pct,
                    "roi_multiplier": (total_revenue / total_spend) if total_spend else 0.0,
                    "payback_period_days": None,
                    "break_even_date": None,
                }
            )

        total_spend = sum(r["total_spend"] for r in roi_data)
        total_revenue = sum(r["total_revenue"] for r in roi_data)
        return {
            "roi_data": roi_data,
            "portfolio_roi": ((total_revenue - total_spend) / total_spend * 100.0) if total_spend else 0.0,
            "total_spend": total_spend,
            "total_revenue": total_revenue,
        }

    fixture = _load_conversions_fixture()
    if fixture and "roi_data" in fixture:
        roi_data = []
        for roi in fixture["roi_data"]:
            roi_pct = ((roi.get("total_revenue", 0) - roi.get("total_spend", 0)) / roi.get("total_spend", 1)) * 100
            roi_data.append({
                "campaign_id": roi.get("campaign_id", ""),
                "campaign_name": roi.get("campaign_name", ""),
                "total_spend": float(roi.get("total_spend", 0.0)),
                "total_revenue": float(roi.get("total_revenue", 0.0)),
                "roi_percentage": roi_pct,
                "roi_multiplier": roi.get("total_revenue", 0) / roi.get("total_spend", 1) if roi.get("total_spend", 0) > 0 else 0.0,
                "payback_period_days": roi.get("payback_period_days"),
                "break_even_date": roi.get("break_even_date"),
            })
        
        total_spend = sum(r["total_spend"] for r in roi_data)
        total_revenue = sum(r["total_revenue"] for r in roi_data)
        portfolio_roi = ((total_revenue - total_spend) / total_spend * 100) if total_spend > 0 else 0.0
        
        return {
            "roi_data": roi_data,
            "portfolio_roi": portfolio_roi,
            "total_spend": total_spend,
            "total_revenue": total_revenue,
        }

    # Fallback ROI data
    roi_data = [
        {
            "campaign_id": "camp_B2B_leads",
            "campaign_name": "B2B Lead Generation",
            "total_spend": 5000.0,
            "total_revenue": 9500.0,
            "roi_percentage": 90.0,
            "roi_multiplier": 1.9,
            "payback_period_days": 15,
            "break_even_date": (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d"),
        },
        {
            "campaign_id": "camp_awareness",
            "campaign_name": "Brand Awareness",
            "total_spend": 3000.0,
            "total_revenue": 4200.0,
            "roi_percentage": 40.0,
            "roi_multiplier": 1.4,
            "payback_period_days": 22,
            "break_even_date": (datetime.now() - timedelta(days=38)).strftime("%Y-%m-%d"),
        },
        {
            "campaign_id": "camp_retargeting",
            "campaign_name": "Retargeting Campaign",
            "total_spend": 2000.0,
            "total_revenue": 3500.0,
            "roi_percentage": 75.0,
            "roi_multiplier": 1.75,
            "payback_period_days": 12,
            "break_even_date": (datetime.now() - timedelta(days=48)).strftime("%Y-%m-%d"),
        },
    ]
    
    total_spend = sum(r["total_spend"] for r in roi_data)
    total_revenue = sum(r["total_revenue"] for r in roi_data)
    
    return {
        "roi_data": roi_data,
        "portfolio_roi": ((total_revenue - total_spend) / total_spend * 100) if total_spend > 0 else 0.0,
        "total_spend": total_spend,
        "total_revenue": total_revenue,
    }
