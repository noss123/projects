#!/usr/bin/env python3
"""
Generate realistic fixture JSON files for social analytics platforms.

Output: src/backend/fixtures/generated/<platform>.json

Usage:
    python scripts/generate_test_data.py            # all platforms
    python scripts/generate_test_data.py linkedin    # single platform
    python scripts/generate_test_data.py --days 90   # custom period
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "src" / "backend" / "fixtures" / "generated"

PLATFORMS = ["youtube", "linkedin", "instagram", "whatsapp"]

# ── helpers ───────────────────────────────────────────────────────────────────

def _date_series(days: int) -> list[str]:
    today = datetime.utcnow().date()
    return [(today - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]


def _ts(dates: list[str], lo: int, hi: int) -> list[dict]:
    """Random time-series over date range."""
    return [{"date": d, "value": random.randint(lo, hi)} for d in dates]


def _ts_float(dates: list[str], lo: float, hi: float) -> list[dict]:
    return [{"date": d, "value": round(random.uniform(lo, hi), 2)} for d in dates]


def _pct(base: float, spread: float = 15.0) -> float:
    return round(base + random.uniform(-spread, spread), 1)


# ── GA fixture ────────────────────────────────────────────────────────────────

def generate_google_analytics(days: int) -> dict:
    dates = _date_series(days)
    return {
        "overview": {
            "active_users": random.randint(8000, 15000),
            "new_users": random.randint(3000, 8000),
            "sessions": random.randint(12000, 25000),
            "page_views": random.randint(30000, 80000),
            "avg_session_duration": round(random.uniform(90, 300), 1),
            "bounce_rate": round(random.uniform(30, 65), 1),
            "pages_per_session": round(random.uniform(2, 5), 2),
            "events_count": random.randint(50000, 150000),
            "date_range": {"start_date": dates[0], "end_date": dates[-1]},
        },
        "active_users": {"series": _ts(dates, 200, 600), "total": random.randint(8000, 15000)},
        "sessions": {"series": _ts(dates, 300, 900), "total": random.randint(12000, 25000), "avg_duration": round(random.uniform(90, 300), 1)},
        "page_views": {"series": _ts(dates, 800, 3000), "total": random.randint(30000, 80000), "pages_per_session": round(random.uniform(2, 5), 2)},
        "bounce_rate": {"series": _ts_float(dates, 30, 65), "average": round(random.uniform(35, 55), 1)},
        "traffic_sources": [
            {"source": "google", "medium": "organic", "sessions": random.randint(4000, 10000), "percentage": _pct(45)},
            {"source": "(direct)", "medium": "(none)", "sessions": random.randint(2000, 5000), "percentage": _pct(25)},
            {"source": "facebook", "medium": "social", "sessions": random.randint(500, 2000), "percentage": _pct(8)},
            {"source": "linkedin", "medium": "social", "sessions": random.randint(300, 1200), "percentage": _pct(5)},
        ],
        "top_pages": [
            {"path": "/", "views": random.randint(5000, 15000), "avg_time": round(random.uniform(30, 120), 1)},
            {"path": "/about", "views": random.randint(2000, 6000), "avg_time": round(random.uniform(40, 180), 1)},
            {"path": "/services", "views": random.randint(1500, 5000), "avg_time": round(random.uniform(50, 200), 1)},
            {"path": "/contact", "views": random.randint(800, 3000), "avg_time": round(random.uniform(20, 90), 1)},
            {"path": "/blog", "views": random.randint(1000, 4000), "avg_time": round(random.uniform(60, 300), 1)},
        ],
        "demographics": {
            "by_country": [
                {"country": "India", "users": random.randint(4000, 8000), "percentage": _pct(40, 10)},
                {"country": "United States", "users": random.randint(1000, 3000), "percentage": _pct(15, 5)},
                {"country": "United Kingdom", "users": random.randint(500, 1500), "percentage": _pct(8, 3)},
            ],
            "by_device": [
                {"device": "mobile", "sessions": random.randint(6000, 14000), "percentage": _pct(55, 10)},
                {"device": "desktop", "sessions": random.randint(3000, 8000), "percentage": _pct(35, 10)},
                {"device": "tablet", "sessions": random.randint(500, 2000), "percentage": _pct(10, 5)},
            ],
        },
        "conversions": {"series": _ts(dates, 5, 50), "total": random.randint(200, 1500), "rate": round(random.uniform(1, 8), 2)},
    }


# ── YouTube fixture ──────────────────────────────────────────────────────────

def generate_youtube(days: int) -> dict:
    dates = _date_series(days)
    return {
        "overview": {
            "subscribers": random.randint(5000, 50000),
            "total_views": random.randint(100000, 1000000),
            "total_videos": random.randint(50, 500),
            "watch_time_hours": random.randint(5000, 80000),
            "avg_view_duration": round(random.uniform(120, 600), 1),
            "engagement_rate": round(random.uniform(3, 12), 2),
            "estimated_revenue": round(random.uniform(500, 10000), 2),
            "subscriber_delta_30d": random.randint(-100, 2000),
            "views_delta_30d": random.randint(-5000, 50000),
            "date_range": {"start_date": dates[0], "end_date": dates[-1]},
        },
        "views": {"series": _ts(dates, 500, 5000), "total": random.randint(100000, 1000000), "granularity": "day"},
        "subscriber_growth": {
            "series": [{"date": d, "gained": random.randint(5, 80), "lost": random.randint(0, 15), "net": random.randint(-5, 70)} for d in dates],
            "net_change": random.randint(-100, 2000),
        },
        "watch_time": {"series": _ts_float(dates, 50, 400), "total_hours": random.randint(5000, 80000), "avg_view_duration": round(random.uniform(120, 600), 1), "granularity": "day"},
        "top_videos": [
            {
                "video_id": f"vid_{i}", "title": f"Test Video {i}",
                "published_at": (datetime.utcnow() - timedelta(days=random.randint(1, 365))).isoformat(),
                "views": random.randint(1000, 100000), "likes": random.randint(50, 5000),
                "comments": random.randint(5, 500), "shares": random.randint(2, 200),
                "watch_time_hours": round(random.uniform(10, 5000), 1),
                "avg_view_duration": round(random.uniform(60, 600), 1),
                "impressions_ctr": round(random.uniform(2, 15), 2),
                "video_type": random.choice(["regular", "short", "live"]),
            }
            for i in range(10)
        ],
        "demographics": {
            "by_country": [{"country": "India", "views": random.randint(30000, 80000), "percentage": _pct(40)}],
            "by_age": [{"age_group": "25-34", "views": random.randint(20000, 60000), "percentage": _pct(30)}],
            "by_gender": [{"gender": "male", "views": random.randint(40000, 80000), "percentage": _pct(55)}],
        },
        "traffic_sources": [
            {"source": "YouTube search", "views": random.randint(20000, 60000), "watch_time_hours": random.randint(1000, 10000), "percentage": _pct(35)},
            {"source": "Suggested videos", "views": random.randint(15000, 50000), "watch_time_hours": random.randint(800, 8000), "percentage": _pct(28)},
            {"source": "External", "views": random.randint(5000, 20000), "watch_time_hours": random.randint(200, 3000), "percentage": _pct(12)},
        ],
        "engagement": {
            "total_likes": random.randint(5000, 50000), "total_comments": random.randint(500, 10000),
            "total_shares": random.randint(200, 5000), "likes_per_view": round(random.uniform(0.02, 0.08), 4),
            "comments_per_view": round(random.uniform(0.002, 0.01), 4), "shares_per_view": round(random.uniform(0.001, 0.005), 4),
            "avg_engagement_rate": round(random.uniform(3, 12), 2),
        },
        "revenue": {
            "series": [{"date": d, "revenue": round(random.uniform(5, 100), 2), "rpm": round(random.uniform(1, 8), 2), "cpm": round(random.uniform(2, 12), 2)} for d in dates],
            "total_revenue": round(random.uniform(500, 10000), 2),
            "avg_rpm": round(random.uniform(2, 6), 2), "avg_cpm": round(random.uniform(3, 10), 2),
        },
        "content_performance": {
            "by_type": [
                {"video_type": "regular", "count": random.randint(30, 200), "total_views": random.randint(50000, 500000),
                 "avg_views": random.randint(1000, 5000), "total_watch_time_hours": random.randint(2000, 40000),
                 "avg_engagement_rate": round(random.uniform(3, 10), 2), "subscribers_gained": random.randint(100, 5000)},
                {"video_type": "short", "count": random.randint(10, 100), "total_views": random.randint(20000, 300000),
                 "avg_views": random.randint(2000, 10000), "total_watch_time_hours": random.randint(100, 2000),
                 "avg_engagement_rate": round(random.uniform(5, 15), 2), "subscribers_gained": random.randint(50, 3000)},
            ],
        },
    }


# ── LinkedIn fixture ─────────────────────────────────────────────────────────

def generate_linkedin(days: int) -> dict:
    dates = _date_series(days)
    return {
        "overview": {
            "followers": random.randint(2000, 20000), "followers_change": _pct(5),
            "impressions": random.randint(10000, 80000), "impressions_change": _pct(8),
            "engagement_rate": round(random.uniform(2, 8), 2), "engagement_rate_change": _pct(0, 3),
            "click_through_rate": round(random.uniform(1, 5), 2), "ctr_change": _pct(0, 2),
            "shares": random.randint(500, 5000), "shares_change": _pct(3),
            "comments": random.randint(200, 3000), "comments_change": _pct(2),
            "unique_visitors": random.randint(1000, 10000), "unique_visitors_change": _pct(6),
            "period_days": days,
        },
        "follower_growth": {"series": _ts(dates, 5, 60), "total_gained": random.randint(200, 3000), "total_lost": random.randint(10, 200), "net_change": random.randint(100, 2800), "period_days": days},
        "demographics": {
            "by_function": [
                {"category": "Engineering", "value": _pct(28, 8), "count": random.randint(2000, 5000)},
                {"category": "Marketing", "value": _pct(18, 5), "count": random.randint(1000, 3000)},
                {"category": "Sales", "value": _pct(14, 5), "count": random.randint(800, 2500)},
            ],
            "by_seniority": [
                {"category": "Senior", "value": _pct(30, 8), "count": random.randint(2000, 5000)},
                {"category": "Manager", "value": _pct(24, 6), "count": random.randint(1500, 4000)},
                {"category": "Entry", "value": _pct(14, 5), "count": random.randint(800, 2500)},
            ],
            "by_industry": [
                {"category": "Technology", "value": _pct(35, 10), "count": random.randint(3000, 6000)},
                {"category": "Financial Services", "value": _pct(16, 5), "count": random.randint(1000, 3000)},
                {"category": "Healthcare", "value": _pct(12, 4), "count": random.randint(800, 2500)},
            ],
            "by_location": [
                {"category": "India", "value": _pct(42, 10), "count": random.randint(3000, 7000)},
                {"category": "United States", "value": _pct(18, 5), "count": random.randint(1000, 3500)},
                {"category": "United Kingdom", "value": _pct(8, 3), "count": random.randint(500, 1500)},
            ],
            "period_days": days,
        },
        "top_posts": {
            "posts": [
                {
                    "post_id": f"li_post_{i}", "title": f"Sample LinkedIn Post #{i} about analytics insights.",
                    "published": (datetime.utcnow() - timedelta(days=random.randint(1, days))).isoformat(),
                    "impressions": random.randint(500, 10000), "clicks": random.randint(50, 1200),
                    "reactions": random.randint(10, 500),
                    "comments": random.randint(2, 80), "shares": random.randint(1, 40),
                    "engagement_rate": round(random.uniform(2, 12), 2),
                    "post_type": random.choice(["article", "image", "video", "document", "poll"]),
                }
                for i in range(8)
            ],
            "period_days": days,
        },
        "engagement": {"series": _ts_float(dates, 1, 10), "avg_engagement_rate": round(random.uniform(2, 8), 2), "total_reactions": random.randint(2000, 8000), "total_comments": random.randint(500, 3000), "total_shares": random.randint(500, 4000), "total_clicks": random.randint(3000, 10000), "period_days": days},
        "page_views": {"series": _ts(dates, 30, 300), "total_views": random.randint(2000, 15000), "unique_visitors": random.randint(1500, 10000), "period_days": days},
        "content_breakdown": {
            "breakdown": [
                {"content_type": "article", "count": random.randint(5, 30), "avg_impressions": random.randint(800, 5000), "avg_engagement_rate": round(random.uniform(3, 10), 2), "avg_clicks": round(random.uniform(100, 500), 1)},
                {"content_type": "image", "count": random.randint(10, 50), "avg_impressions": random.randint(500, 3000), "avg_engagement_rate": round(random.uniform(4, 12), 2), "avg_clicks": round(random.uniform(50, 300), 1)},
                {"content_type": "video", "count": random.randint(3, 15), "avg_impressions": random.randint(1000, 8000), "avg_engagement_rate": round(random.uniform(5, 15), 2), "avg_clicks": round(random.uniform(200, 800), 1)},
                {"content_type": "document", "count": random.randint(2, 10), "avg_impressions": random.randint(600, 4000), "avg_engagement_rate": round(random.uniform(3, 9), 2), "avg_clicks": round(random.uniform(150, 600), 1)},
            ],
            "period_days": days,
        },
    }


# ── Instagram fixture ────────────────────────────────────────────────────────

def generate_instagram(days: int) -> dict:
    dates = _date_series(days)
    return {
        "overview": {
            "followers": random.randint(5000, 100000), "followers_change": _pct(4),
            "reach": random.randint(20000, 200000), "reach_change": _pct(6),
            "impressions": random.randint(40000, 500000), "impressions_change": _pct(5),
            "engagement_rate": round(random.uniform(2, 10), 2), "engagement_rate_change": _pct(0, 2),
            "profile_visits": random.randint(2000, 30000), "profile_visits_change": _pct(7),
            "website_clicks": random.randint(500, 5000), "website_clicks_change": _pct(4),
            "period_days": days,
        },
        "reach": {"series": _ts(dates, 300, 8000), "total": random.randint(20000, 200000), "period_days": days},
        "impressions": {"series": _ts(dates, 500, 15000), "total": random.randint(40000, 500000), "period_days": days},
        "top_posts": {
            "posts": [
                {
                    "post_id": f"ig_post_{i}", "caption": f"Amazing content #{i} ✨ #analytics #social",
                    "published": (datetime.utcnow() - timedelta(days=random.randint(1, days))).isoformat(),
                    "likes": random.randint(50, 5000), "comments": random.randint(5, 300),
                    "shares": random.randint(2, 200), "saves": random.randint(10, 800),
                    "reach": random.randint(500, 20000), "impressions": random.randint(800, 30000),
                    "engagement_rate": round(random.uniform(2, 15), 2),
                    "post_type": random.choice(["image", "carousel", "reel", "story"]),
                }
                for i in range(10)
            ],
            "period_days": days,
        },
        "demographics": {
            "by_age": [
                {"category": "18-24", "value": _pct(20, 8), "count": random.randint(1000, 5000)},
                {"category": "25-34", "value": _pct(35, 8), "count": random.randint(2000, 8000)},
                {"category": "35-44", "value": _pct(20, 5), "count": random.randint(1000, 4000)},
            ],
            "by_gender": [
                {"category": "Male", "value": _pct(48, 10), "count": random.randint(3000, 10000)},
                {"category": "Female", "value": _pct(48, 10), "count": random.randint(3000, 10000)},
            ],
            "by_city": [
                {"category": "Mumbai", "value": _pct(12, 5), "count": random.randint(500, 3000)},
                {"category": "Delhi", "value": _pct(10, 5), "count": random.randint(400, 2500)},
            ],
            "by_country": [
                {"category": "India", "value": _pct(45, 10), "count": random.randint(5000, 20000)},
                {"category": "United States", "value": _pct(15, 5), "count": random.randint(1000, 5000)},
            ],
            "period_days": days,
        },
        "engagement": {"series": _ts_float(dates, 1, 12), "avg_engagement_rate": round(random.uniform(3, 10), 2), "total_likes": random.randint(10000, 30000), "total_comments": random.randint(1000, 5000), "total_shares": random.randint(500, 3000), "total_saves": random.randint(2000, 8000), "period_days": days},
        "follower_growth": {"series": _ts(dates, 10, 200), "total_gained": random.randint(500, 8000), "total_lost": random.randint(50, 500), "net_change": random.randint(200, 7500), "period_days": days},
        "stories": {
            "stories": [
                {
                    "story_id": f"ig_story_{i}",
                    "published": (datetime.utcnow() - timedelta(days=random.randint(0, min(days, 7)))).isoformat(),
                    "reach": random.randint(500, 10000), "impressions": random.randint(600, 12000),
                    "replies": random.randint(0, 50), "exits": random.randint(10, 200),
                    "taps_forward": random.randint(20, 300), "taps_back": random.randint(5, 100),
                }
                for i in range(6)
            ],
            "period_days": days,
        },
        "content_breakdown": {
            "breakdown": [
                {"content_type": "image", "count": random.randint(15, 60), "avg_reach": random.randint(500, 5000), "avg_engagement_rate": round(random.uniform(3, 10), 2), "avg_saves": round(random.uniform(30, 150), 1)},
                {"content_type": "carousel", "count": random.randint(5, 25), "avg_reach": random.randint(800, 8000), "avg_engagement_rate": round(random.uniform(4, 12), 2), "avg_saves": round(random.uniform(50, 200), 1)},
                {"content_type": "reel", "count": random.randint(5, 20), "avg_reach": random.randint(600, 6000), "avg_engagement_rate": round(random.uniform(5, 14), 2), "avg_saves": round(random.uniform(80, 300), 1)},
                {"content_type": "story", "count": random.randint(3, 15), "avg_reach": random.randint(1000, 15000), "avg_engagement_rate": round(random.uniform(5, 18), 2), "avg_saves": round(random.uniform(5, 30), 1)},
            ],
            "period_days": days,
        },
    }


# ── WhatsApp fixture ─────────────────────────────────────────────────────────

def generate_whatsapp(days: int) -> dict:
    dates = _date_series(days)
    return {
        "overview": {
            "conversations": random.randint(1000, 5000), "conversations_change": _pct(6),
            "messages_sent": random.randint(5000, 25000), "messages_sent_change": _pct(5),
            "messages_received": random.randint(3000, 15000), "messages_received_change": _pct(7),
            "messages_delivered": random.randint(4800, 24500), "delivery_rate": round(random.uniform(95, 99.5), 1),
            "messages_read": random.randint(3500, 18000), "read_rate": round(random.uniform(60, 85), 1),
            "avg_response_time_minutes": round(random.uniform(5, 30), 1), "avg_response_time_change": round(random.uniform(-10, 5), 1),
            "period_days": days,
        },
        "message_volume": {"series": _ts(dates, 80, 500), "total_sent": random.randint(5000, 25000), "total_received": random.randint(3000, 15000), "period_days": days},
        "conversations": {
            "series": _ts(dates, 20, 200),
            "total": random.randint(1000, 5000),
            "user_initiated": random.randint(600, 3000),
            "business_initiated": random.randint(400, 2000),
            "period_days": days,
        },
        "template_performance": {
            "templates": [
                {"template_name": "order_confirmation", "sent": random.randint(1000, 5000), "delivered": random.randint(980, 4950), "read": random.randint(700, 4000), "delivery_rate": round(random.uniform(96, 99.5), 1), "read_rate": round(random.uniform(70, 92), 1), "category": "UTILITY"},
                {"template_name": "welcome_message", "sent": random.randint(500, 3000), "delivered": random.randint(490, 2960), "read": random.randint(400, 2500), "delivery_rate": round(random.uniform(96, 99.5), 1), "read_rate": round(random.uniform(75, 95), 1), "category": "MARKETING"},
                {"template_name": "shipping_update", "sent": random.randint(800, 4000), "delivered": random.randint(780, 3950), "read": random.randint(600, 3400), "delivery_rate": round(random.uniform(96, 99.5), 1), "read_rate": round(random.uniform(70, 90), 1), "category": "UTILITY"},
                {"template_name": "promotional_offer", "sent": random.randint(2000, 8000), "delivered": random.randint(1900, 7600), "read": random.randint(1200, 5500), "delivery_rate": round(random.uniform(93, 98), 1), "read_rate": round(random.uniform(55, 78), 1), "category": "MARKETING"},
            ],
            "period_days": days,
        },
        "response_time": {"series": _ts_float(dates, 3, 40), "avg_minutes": round(random.uniform(8, 25), 1), "median_minutes": round(random.uniform(5, 15), 1), "p95_minutes": round(random.uniform(30, 90), 1), "period_days": days},
        "quality": {"quality_rating": random.choice(["GREEN", "YELLOW"]), "messaging_limit": random.choice(["TIER_1", "TIER_2", "TIER_3"]), "phone_number_status": "CONNECTED", "current_tier": random.choice(["1K messages/day", "10K messages/day", "100K messages/day"])},
        "message_distribution": {
            "hourly": [
                {"hour": h, "sent": random.randint(10, 100 if 9 <= h <= 18 else 30), "received": random.randint(8, 80 if 9 <= h <= 18 else 25)}
                for h in range(24)
            ],
            "busiest_hour": random.choice([10, 11, 14, 15]),
            "quietest_hour": random.choice([2, 3, 4]),
            "period_days": days,
        },
        "limitations": {
            "unsupported": [
                {"metric": "demographics", "reason": "WhatsApp Business API does not expose user demographic data", "available_alternative": "Use Instagram demographics for audience insights"},
                {"metric": "reach", "reason": "WhatsApp does not have a public reach metric; messages are 1-to-1", "available_alternative": "Use delivery_rate and read_rate as proxies"},
            ],
            "note": "WhatsApp Business API provides messaging metrics only.",
        },
    }


# ── main ──────────────────────────────────────────────────────────────────────

GENERATORS = {
    "youtube": generate_youtube,
    "linkedin": generate_linkedin,
    "instagram": generate_instagram,
    "whatsapp": generate_whatsapp,
}


def main():
    parser = argparse.ArgumentParser(description="Generate test fixture data for analytics platforms.")
    parser.add_argument("platforms", nargs="*", default=PLATFORMS, help="Platform(s) to generate. Default: all")
    parser.add_argument("--days", type=int, default=30, help="Number of days for time-series data (default: 30)")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)

    for platform in args.platforms:
        if platform not in GENERATORS:
            print(f"⚠  Unknown platform '{platform}'. Available: {', '.join(GENERATORS)}")
            continue
        data = GENERATORS[platform](args.days)
        out = FIXTURE_DIR / f"{platform}.json"
        with open(out, "w") as f:
            json.dump(data, f, indent=2)
        print(f"✅ {platform:20s} → {out}")

    print(f"\nDone — {len(args.platforms)} fixture(s) written to {FIXTURE_DIR}")


if __name__ == "__main__":
    main()
