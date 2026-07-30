"""
Google Analytics 4 service layer.

Wraps the google-analytics-data SDK (BetaAnalyticsDataClient) and exposes
async-friendly helpers for each dashboard use-case.

When GA credentials are absent (e.g. local dev without a service account),
all methods return clearly-labelled stub data so the rest of the stack keeps
working without real credentials.
"""
from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any

from core.config import settings


# ──────────────────────────────────────────
# Lazy client initialisation
# ──────────────────────────────────────────

_ga_client = None


def _get_client():
    """Return a GA4 BetaAnalyticsDataClient, initialising it only once."""
    global _ga_client
    if _ga_client is not None:
        return _ga_client

    if not settings.ga_credentials_available:
        return None

    # Set the env var so the SDK picks up the file path automatically
    os.environ.setdefault(
        "GOOGLE_APPLICATION_CREDENTIALS",
        settings.google_application_credentials,
    )

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        _ga_client = BetaAnalyticsDataClient()
    except Exception:
        _ga_client = None

    return _ga_client


# ──────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────

def _property_id() -> str:
    return f"properties/{settings.ga4_property_id}"


def _date_range(start_date: str, end_date: str):
    from google.analytics.data_v1beta.types import DateRange
    return DateRange(start_date=start_date, end_date=end_date)


def _dim(name: str):
    from google.analytics.data_v1beta.types import Dimension
    return Dimension(name=name)


def _met(name: str):
    from google.analytics.data_v1beta.types import Metric
    return Metric(name=name)


def _run(request):
    """Run a GA4 report request, returning the raw response."""
    client = _get_client()
    if client is None:
        raise RuntimeError("GA4 client not available")
    return client.run_report(request=request)


def _run_realtime(request):
    """Run a GA4 real-time report request."""
    client = _get_client()
    if client is None:
        raise RuntimeError("GA4 client not available")
    return client.run_realtime_report(request=request)


def _safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _safe_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _pct_of(part: int, total: int) -> float:
    return round(part / total * 100, 2) if total else 0.0


# ──────────────────────────────────────────
# Stub data (used when credentials are absent)
# ──────────────────────────────────────────

def _stub_overview(start_date: str, end_date: str) -> dict:
    return {
        "sessions": 12450,
        "users": 9820,
        "new_users": 6240,
        "bounce_rate": 42.3,
        "avg_session_duration": 185.4,
        "pageviews": 34200,
        "date_range": {"start_date": start_date, "end_date": end_date},
    }


def _stub_pageviews(granularity: str) -> dict:
    from datetime import date, timedelta
    today = date.today()
    series = []
    for i in range(30):
        d = today - timedelta(days=29 - i)
        series.append({"date": d.isoformat(), "value": 900 + (i * 20) + (i % 7) * 40})
    return {"series": series, "total": sum(p["value"] for p in series), "granularity": granularity}


def _stub_traffic_sources() -> dict:
    sources = [
        {"channel": "Organic Search", "sessions": 4200, "percentage": 33.7},
        {"channel": "Direct", "sessions": 2800, "percentage": 22.5},
        {"channel": "Organic Social", "sessions": 2200, "percentage": 17.7},
        {"channel": "Referral", "sessions": 1600, "percentage": 12.9},
        {"channel": "Paid Search", "sessions": 900, "percentage": 7.2},
        {"channel": "Email", "sessions": 750, "percentage": 6.0},
    ]
    return {"sources": sources, "total_sessions": 12450}


def _stub_top_pages() -> dict:
    pages = [
        {"page_path": "/", "page_title": "Home", "sessions": 4200, "pageviews": 5100, "avg_time_on_page": 62.3},
        {"page_path": "/exhibitions", "page_title": "Exhibitions", "sessions": 2800, "pageviews": 3500, "avg_time_on_page": 95.1},
        {"page_path": "/membership", "page_title": "Membership", "sessions": 1900, "pageviews": 2300, "avg_time_on_page": 128.4},
        {"page_path": "/artists", "page_title": "Artists", "sessions": 1600, "pageviews": 2100, "avg_time_on_page": 74.6},
        {"page_path": "/blog", "page_title": "Blog", "sessions": 1200, "pageviews": 1700, "avg_time_on_page": 210.8},
        {"page_path": "/contact", "page_title": "Contact Us", "sessions": 750, "pageviews": 900, "avg_time_on_page": 45.2},
    ]
    return {"pages": pages}


def _stub_demographics() -> dict:
    return {
        "by_country": [
            {"label": "India", "value": 4200, "percentage": 42.8},
            {"label": "United States", "value": 2100, "percentage": 21.4},
            {"label": "United Kingdom", "value": 1300, "percentage": 13.2},
            {"label": "UAE", "value": 800, "percentage": 8.1},
            {"label": "Australia", "value": 620, "percentage": 6.3},
            {"label": "Others", "value": 800, "percentage": 8.2},
        ],
        "by_age": [
            {"label": "18-24", "value": 1750, "percentage": 17.8},
            {"label": "25-34", "value": 3500, "percentage": 35.7},
            {"label": "35-44", "value": 2520, "percentage": 25.7},
            {"label": "45-54", "value": 1300, "percentage": 13.3},
            {"label": "55+", "value": 750, "percentage": 7.5},
        ],
    }


def _stub_device_breakdown() -> dict:
    return {
        "devices": [
            {"device": "Mobile", "sessions": 6720, "percentage": 54.0},
            {"device": "Desktop", "sessions": 4600, "percentage": 36.9},
            {"device": "Tablet", "sessions": 1130, "percentage": 9.1},
        ],
        "total_sessions": 12450,
    }


def _stub_engagement() -> dict:
    return {
        "engaged_sessions": 7180,
        "engagement_rate": 57.7,
        "events_per_session": 8.4,
        "avg_engagement_time": 142.6,
    }


def _stub_conversions() -> dict:
    events = [
        {"event_name": "membership_signup", "count": 142},
        {"event_name": "exhibition_booking", "count": 87},
        {"event_name": "newsletter_subscribe", "count": 264},
        {"event_name": "contact_form_submit", "count": 53},
    ]
    return {"events": events, "total": sum(e["count"] for e in events)}


def _stub_realtime() -> dict:
    return {
        "active_users": 34,
        "top_pages": [
            {"page_path": "/", "active_users": 12},
            {"page_path": "/exhibitions", "active_users": 9},
            {"page_path": "/membership", "active_users": 6},
            {"page_path": "/artists", "active_users": 4},
            {"page_path": "/blog", "active_users": 3},
        ],
    }


# ──────────────────────────────────────────
# GA4 Data Fetcher Functions
# ──────────────────────────────────────────

def get_overview(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return high-level KPI metrics."""
    if not settings.ga_credentials_available:
        return _stub_overview(start_date, end_date)

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        metrics=[
            _met("sessions"),
            _met("totalUsers"),
            _met("newUsers"),
            _met("bounceRate"),
            _met("averageSessionDuration"),
            _met("screenPageViews"),
        ],
    ))

    row = response.rows[0].metric_values if response.rows else []

    def mv(idx: int, default="0") -> str:
        return row[idx].value if row and idx < len(row) else default

    return {
        "sessions": _safe_int(mv(0)),
        "users": _safe_int(mv(1)),
        "new_users": _safe_int(mv(2)),
        "bounce_rate": round(_safe_float(mv(3)) * 100, 2),
        "avg_session_duration": round(_safe_float(mv(4)), 1),
        "pageviews": _safe_int(mv(5)),
        "date_range": {"start_date": start_date, "end_date": end_date},
    }


def get_pageviews(start_date: str = "30daysAgo", end_date: str = "today",
                  granularity: str = "day") -> dict:
    """Return a time-series of page views."""
    if not settings.ga_credentials_available:
        return _stub_pageviews(granularity)

    from google.analytics.data_v1beta.types import RunReportRequest

    dim_name = "date" if granularity == "day" else "yearWeek" if granularity == "week" else "yearMonth"

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim(dim_name)],
        metrics=[_met("screenPageViews")],
        order_bys=[{"dimension": {"dimension_name": dim_name}}],
    ))

    series = [
        {"date": row.dimension_values[0].value, "value": _safe_float(row.metric_values[0].value)}
        for row in response.rows
    ]
    return {"series": series, "total": int(sum(p["value"] for p in series)), "granularity": granularity}


def get_traffic_sources(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return sessions grouped by default channel group."""
    if not settings.ga_credentials_available:
        return _stub_traffic_sources()

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("defaultChannelGroup")],
        metrics=[_met("sessions")],
        order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}],
    ))

    sources = [
        {"channel": row.dimension_values[0].value, "sessions": _safe_int(row.metric_values[0].value)}
        for row in response.rows
    ]
    total = sum(s["sessions"] for s in sources)
    for s in sources:
        s["percentage"] = _pct_of(s["sessions"], total)

    return {"sources": sources, "total_sessions": total}


def get_top_pages(start_date: str = "30daysAgo", end_date: str = "today", limit: int = 10) -> dict:
    """Return top pages ranked by sessions."""
    if not settings.ga_credentials_available:
        return _stub_top_pages()

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("pagePath"), _dim("pageTitle")],
        metrics=[_met("sessions"), _met("screenPageViews"), _met("averageSessionDuration")],
        order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}],
        limit=limit,
    ))

    pages = [
        {
            "page_path": row.dimension_values[0].value,
            "page_title": row.dimension_values[1].value,
            "sessions": _safe_int(row.metric_values[0].value),
            "pageviews": _safe_int(row.metric_values[1].value),
            "avg_time_on_page": round(_safe_float(row.metric_values[2].value), 1),
        }
        for row in response.rows
    ]
    return {"pages": pages}


def get_demographics(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return audience breakdown by country and age bracket."""
    if not settings.ga_credentials_available:
        return _stub_demographics()

    from google.analytics.data_v1beta.types import RunReportRequest

    # By country
    country_resp = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("country")],
        metrics=[_met("totalUsers")],
        order_bys=[{"metric": {"metric_name": "totalUsers"}, "desc": True}],
        limit=10,
    ))

    countries = [
        {"label": row.dimension_values[0].value, "value": _safe_int(row.metric_values[0].value)}
        for row in country_resp.rows
    ]
    country_total = sum(c["value"] for c in countries)
    for c in countries:
        c["percentage"] = _pct_of(c["value"], country_total)

    # By age
    age_resp = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("userAgeBracket")],
        metrics=[_met("totalUsers")],
        order_bys=[{"dimension": {"dimension_name": "userAgeBracket"}}],
    ))

    age_groups = [
        {"label": row.dimension_values[0].value, "value": _safe_int(row.metric_values[0].value)}
        for row in age_resp.rows
    ]
    age_total = sum(a["value"] for a in age_groups)
    for a in age_groups:
        a["percentage"] = _pct_of(a["value"], age_total)

    return {"by_country": countries, "by_age": age_groups}


def get_device_breakdown(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return sessions split by device category."""
    if not settings.ga_credentials_available:
        return _stub_device_breakdown()

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("deviceCategory")],
        metrics=[_met("sessions")],
        order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}],
    ))

    devices = [
        {"device": row.dimension_values[0].value.title(), "sessions": _safe_int(row.metric_values[0].value)}
        for row in response.rows
    ]
    total = sum(d["sessions"] for d in devices)
    for d in devices:
        d["percentage"] = _pct_of(d["sessions"], total)

    return {"devices": devices, "total_sessions": total}


def get_engagement(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return engagement quality metrics."""
    if not settings.ga_credentials_available:
        return _stub_engagement()

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        metrics=[
            _met("engagedSessions"),
            _met("engagementRate"),
            _met("eventsPerSession"),
            _met("averageSessionDuration"),
        ],
    ))

    row = response.rows[0].metric_values if response.rows else []

    def mv(idx: int, default="0") -> str:
        return row[idx].value if row and idx < len(row) else default

    return {
        "engaged_sessions": _safe_int(mv(0)),
        "engagement_rate": round(_safe_float(mv(1)) * 100, 2),
        "events_per_session": round(_safe_float(mv(2)), 2),
        "avg_engagement_time": round(_safe_float(mv(3)), 1),
    }


def get_conversions(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Return key event (conversion) counts."""
    if not settings.ga_credentials_available:
        return _stub_conversions()

    from google.analytics.data_v1beta.types import RunReportRequest

    response = _run(RunReportRequest(
        property=_property_id(),
        date_ranges=[_date_range(start_date, end_date)],
        dimensions=[_dim("eventName")],
        metrics=[_met("eventCount")],
        dimension_filter={
            "filter": {
                "field_name": "isKeyEvent",
                "string_filter": {"value": "true"},
            }
        },
        order_bys=[{"metric": {"metric_name": "eventCount"}, "desc": True}],
    ))

    events = [
        {"event_name": row.dimension_values[0].value, "count": _safe_int(row.metric_values[0].value)}
        for row in response.rows
    ]
    return {"events": events, "total": sum(e["count"] for e in events)}


def get_realtime() -> dict:
    """Return currently active users and top active pages."""
    if not settings.ga_credentials_available:
        return _stub_realtime()

    from google.analytics.data_v1beta.types import RunRealtimeReportRequest

    response = _run_realtime(RunRealtimeReportRequest(
        property=_property_id(),
        dimensions=[_dim("unifiedScreenName")],
        metrics=[_met("activeUsers")],
        limit=10,
    ))

    top_pages = [
        {
            "page_path": row.dimension_values[0].value,
            "active_users": _safe_int(row.metric_values[0].value),
        }
        for row in response.rows
    ]
    total_active = sum(p["active_users"] for p in top_pages)

    return {"active_users": total_active, "top_pages": top_pages}
