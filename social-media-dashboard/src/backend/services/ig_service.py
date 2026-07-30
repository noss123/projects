"""
Instagram Analytics service — fixture-loading stubs.

Data priority:
  1. Generated fixture file (fixtures/generated/instagram.json) if it exists
  2. Hardcoded stub dicts (always available)

Real Instagram Graph API integration is NOT implemented.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "generated"


def _date_series(days: int) -> list[str]:
    today = datetime.utcnow().date()
    return [(today - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]


def _load_fixture(key: str | None = None) -> dict | None:
    fp = FIXTURE_DIR / "instagram.json"
    if fp.exists():
        with open(fp) as f:
            data = json.load(f)
        return data.get(key) if key else data
    return None


# ── stub generators ──────────────────────────────────────────────────────

def _stub_overview(days: int) -> dict:
    fixture = _load_fixture("overview")
    if fixture:
        fixture["period_days"] = days
        return fixture
    return {
        "followers": 24_500, "followers_change": 3.8,
        "reach": 185_000, "reach_change": 7.2,
        "impressions": 342_000, "impressions_change": 5.1,
        "engagement_rate": 4.7, "engagement_rate_change": 0.3,
        "profile_visits": 8_400, "profile_visits_change": 2.9,
        "website_clicks": 1_250, "website_clicks_change": 4.1,
        "period_days": days,
    }


def _stub_reach(days: int) -> dict:
    fixture = _load_fixture("reach")
    if fixture:
        fixture["period_days"] = days
        return fixture
    dates = _date_series(days)
    series = [{"date": d, "value": random.randint(3000, 9000)} for d in dates]
    return {"series": series, "total": sum(int(p["value"]) for p in series), "period_days": days}


def _stub_impressions(days: int) -> dict:
    dates = _date_series(days)
    series = [{"date": d, "value": random.randint(5000, 15000)} for d in dates]
    return {"series": series, "total": sum(int(p["value"]) for p in series), "period_days": days}


def _stub_top_posts(days: int) -> dict:
    fixture = _load_fixture("top_posts")
    if fixture:
        fixture["period_days"] = days
        return fixture
    types = ["image", "carousel", "reel", "story"]
    posts = []
    for i in range(12):
        posts.append({
            "post_id": f"ig_post_{i+1}",
            "caption": f"Sample Instagram post #{i+1}",
            "published": (datetime.utcnow() - timedelta(days=random.randint(1, days))).isoformat(),
            "likes": random.randint(50, 5000),
            "comments": random.randint(5, 500),
            "shares": random.randint(2, 200),
            "saves": random.randint(10, 800),
            "reach": random.randint(500, 30000),
            "impressions": random.randint(800, 50000),
            "engagement_rate": round(random.uniform(1, 8), 2),
            "post_type": random.choice(types),
        })
    posts.sort(key=lambda p: p["engagement_rate"], reverse=True)
    return {"posts": posts, "period_days": days}


def _stub_demographics(days: int) -> dict:
    return {
        "by_age": [
            {"category": "13-17", "value": 5.2, "count": 1274},
            {"category": "18-24", "value": 32.1, "count": 7864},
            {"category": "25-34", "value": 35.8, "count": 8771},
            {"category": "35-44", "value": 16.4, "count": 4018},
            {"category": "45-54", "value": 7.1, "count": 1739},
            {"category": "55+", "value": 3.4, "count": 833},
        ],
        "by_gender": [
            {"category": "Male", "value": 48.2, "count": 11809},
            {"category": "Female", "value": 49.5, "count": 12127},
            {"category": "Other", "value": 2.3, "count": 563},
        ],
        "by_city": [
            {"category": "Mumbai", "value": 18.5, "count": 4532},
            {"category": "Delhi", "value": 12.3, "count": 3013},
            {"category": "Bangalore", "value": 9.7, "count": 2376},
            {"category": "London", "value": 5.1, "count": 1249},
            {"category": "New York", "value": 4.8, "count": 1176},
        ],
        "by_country": [
            {"category": "India", "value": 52.0, "count": 12740},
            {"category": "United States", "value": 15.3, "count": 3748},
            {"category": "United Kingdom", "value": 8.2, "count": 2009},
            {"category": "Canada", "value": 4.1, "count": 1004},
            {"category": "Other", "value": 20.4, "count": 4998},
        ],
        "period_days": days,
    }


def _stub_engagement(days: int) -> dict:
    dates = _date_series(days)
    series = [{"date": d, "value": round(random.uniform(2.5, 7.0), 2)} for d in dates]
    return {
        "series": series,
        "avg_engagement_rate": 4.7,
        "total_likes": 18_400, "total_comments": 2_340,
        "total_shares": 1_890, "total_saves": 4_560,
        "period_days": days,
    }


def _stub_follower_growth(days: int) -> dict:
    dates = _date_series(days)
    base = 23_500
    series = []
    for d in dates:
        base += random.randint(-10, 50)
        series.append({"date": d, "value": base})
    return {
        "series": series,
        "total_gained": 1_200, "total_lost": 180, "net_change": 1_020,
        "period_days": days,
    }


def _stub_stories(days: int) -> dict:
    stories = []
    for i in range(8):
        stories.append({
            "story_id": f"ig_story_{i+1}",
            "published": (datetime.utcnow() - timedelta(days=random.randint(1, min(days, 7)))).isoformat(),
            "impressions": random.randint(2000, 15000),
            "reach": random.randint(1500, 12000),
            "exits": random.randint(100, 2000),
            "replies": random.randint(5, 150),
            "taps_forward": random.randint(200, 3000),
            "taps_back": random.randint(50, 800),
        })
    return {"stories": stories, "period_days": days}


def _stub_content_breakdown(days: int) -> dict:
    return {
        "breakdown": [
            {"content_type": "image", "count": 35, "avg_reach": 4200.0, "avg_engagement_rate": 4.5, "avg_saves": 85.0},
            {"content_type": "carousel", "count": 18, "avg_reach": 5800.0, "avg_engagement_rate": 5.8, "avg_saves": 145.0},
            {"content_type": "reel", "count": 22, "avg_reach": 12500.0, "avg_engagement_rate": 6.2, "avg_saves": 210.0},
            {"content_type": "story", "count": 45, "avg_reach": 3100.0, "avg_engagement_rate": 2.1, "avg_saves": 12.0},
        ],
        "period_days": days,
    }


# ── public API ───────────────────────────────────────────────────────────

def get_overview(days: int = 30) -> dict:
    return _stub_overview(days)

def get_reach(days: int = 30) -> dict:
    return _stub_reach(days)

def get_impressions(days: int = 30) -> dict:
    return _stub_impressions(days)

def get_top_posts(days: int = 30) -> dict:
    return _stub_top_posts(days)

def get_demographics(days: int = 30) -> dict:
    return _stub_demographics(days)

def get_engagement(days: int = 30) -> dict:
    return _stub_engagement(days)

def get_follower_growth(days: int = 30) -> dict:
    return _stub_follower_growth(days)

def get_stories(days: int = 30) -> dict:
    return _stub_stories(days)

def get_content_breakdown(days: int = 30) -> dict:
    return _stub_content_breakdown(days)
