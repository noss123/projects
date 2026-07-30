"""
WhatsApp Business Analytics service — fixture-loading stubs.

Data priority:
  1. Generated fixture file (fixtures/generated/whatsapp.json) if it exists
  2. Hardcoded stub dicts (always available)

Real WhatsApp Business API integration is NOT implemented.
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
    fp = FIXTURE_DIR / "whatsapp.json"
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
        "conversations": 2_340, "conversations_change": 8.5,
        "messages_sent": 12_800, "messages_sent_change": 5.2,
        "messages_received": 9_600, "messages_received_change": 6.1,
        "messages_delivered": 12_500, "delivery_rate": 97.6,
        "messages_read": 8_900, "read_rate": 71.2,
        "avg_response_time_minutes": 12.5, "avg_response_time_change": -3.2,
        "period_days": days,
    }


def _stub_message_volume(days: int) -> dict:
    fixture = _load_fixture("message_volume")
    if fixture:
        fixture["period_days"] = days
        if "series" in fixture and len(fixture["series"]) > days:
            fixture["series"] = fixture["series"][-days:]
        return fixture
    dates = _date_series(days)
    series = [{"date": d, "value": random.randint(80, 500)} for d in dates]
    return {
        "series": series,
        "total_sent": 12_800, "total_received": 9_600,
        "period_days": days,
    }


def _stub_conversations(days: int) -> dict:
    dates = _date_series(days)
    series = [{"date": d, "value": random.randint(40, 150)} for d in dates]
    total = sum(int(p["value"]) for p in series)
    return {
        "series": series,
        "total": total,
        "user_initiated": int(total * 0.62),
        "business_initiated": int(total * 0.38),
        "period_days": days,
    }


def _stub_template_performance(days: int) -> dict:
    return {
        "templates": [
            {"template_name": "order_confirmation", "sent": 3200, "delivered": 3150, "read": 2800,
             "delivery_rate": 98.4, "read_rate": 88.9, "category": "UTILITY"},
            {"template_name": "welcome_message", "sent": 1800, "delivered": 1780, "read": 1500,
             "delivery_rate": 98.9, "read_rate": 84.3, "category": "MARKETING"},
            {"template_name": "shipping_update", "sent": 2500, "delivered": 2460, "read": 2100,
             "delivery_rate": 98.4, "read_rate": 85.4, "category": "UTILITY"},
            {"template_name": "promotional_offer", "sent": 4200, "delivered": 4050, "read": 2900,
             "delivery_rate": 96.4, "read_rate": 71.6, "category": "MARKETING"},
            {"template_name": "appointment_reminder", "sent": 980, "delivered": 970, "read": 890,
             "delivery_rate": 99.0, "read_rate": 91.8, "category": "UTILITY"},
        ],
        "period_days": days,
    }


def _stub_response_time(days: int) -> dict:
    dates = _date_series(days)
    series = [{"date": d, "value": round(random.uniform(5, 30), 1)} for d in dates]
    return {
        "series": series,
        "avg_minutes": 12.5, "median_minutes": 8.3, "p95_minutes": 45.0,
        "period_days": days,
    }


def _stub_quality() -> dict:
    return {
        "quality_rating": "GREEN",
        "messaging_limit": "TIER_2",
        "phone_number_status": "CONNECTED",
        "current_tier": "100K messages/day",
    }


def _stub_message_distribution(days: int) -> dict:
    hourly = []
    for h in range(24):
        base_sent = 20 if 0 <= h <= 6 else (80 if 9 <= h <= 18 else 40)
        hourly.append({
            "hour": h,
            "sent": base_sent + random.randint(-10, 20),
            "received": int((base_sent + random.randint(-10, 20)) * 0.75),
        })
    busiest = max(hourly, key=lambda x: x["sent"] + x["received"])
    quietest = min(hourly, key=lambda x: x["sent"] + x["received"])
    return {
        "hourly": hourly,
        "busiest_hour": busiest["hour"],
        "quietest_hour": quietest["hour"],
        "period_days": days,
    }


def _stub_limitations() -> dict:
    return {
        "unsupported": [
            {"metric": "demographics", "reason": "WhatsApp Business API does not expose user demographic data",
             "available_alternative": "Use Instagram demographics for audience insights"},
            {"metric": "reach", "reason": "WhatsApp does not have a public reach metric; messages are 1-to-1",
             "available_alternative": "Use delivery_rate and read_rate as proxies"},
            {"metric": "impressions", "reason": "WhatsApp is a messaging platform, not a feed-based platform",
             "available_alternative": "Track messages_delivered and messages_read instead"},
        ],
        "note": "WhatsApp Business API provides messaging metrics only. Audience demographics and content discovery metrics are not available.",
    }


# ── public API ───────────────────────────────────────────────────────────

def get_overview(days: int = 30) -> dict:
    return _stub_overview(days)

def get_message_volume(days: int = 30) -> dict:
    return _stub_message_volume(days)

def get_conversations(days: int = 30) -> dict:
    return _stub_conversations(days)

def get_template_performance(days: int = 30) -> dict:
    return _stub_template_performance(days)

def get_response_time(days: int = 30) -> dict:
    return _stub_response_time(days)

def get_quality() -> dict:
    return _stub_quality()

def get_message_distribution(days: int = 30) -> dict:
    return _stub_message_distribution(days)

def get_limitations() -> dict:
    return _stub_limitations()
