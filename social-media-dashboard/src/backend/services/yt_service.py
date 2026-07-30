"""
YouTube service layer.

Mirrors the GA service architecture: every public function checks whether
YouTube credentials are available.  When they are, data is fetched from the
YouTube Data API v3 / YouTube Analytics API.  When they are not (local dev,
CI, demo), clearly-labelled **stub data** is returned so the rest of the
stack keeps working.

Required env vars for real data:
    YOUTUBE_API_KEY       – a YouTube Data API v3 key
    YOUTUBE_CHANNEL_ID    – the target channel (e.g. "UCxxxxxxxx")
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from core.config import settings


# ──────────────────────────────────────────
# Lazy client initialisation
# ──────────────────────────────────────────

_yt_client: Any = None
_yt_analytics_client: Any = None
FIXTURE_FILE = Path(__file__).resolve().parent.parent / "fixtures" / "generated" / "youtube.json"


def _load_fixture(key: str | None = None) -> dict | None:
    if not FIXTURE_FILE.exists():
        return None
    try:
        with open(FIXTURE_FILE) as f:
            data = json.load(f)
        return data.get(key) if key else data
    except Exception:
        return None


def _get_client():
    """Return a googleapiclient Resource for YouTube Data API v3."""
    global _yt_client
    if _yt_client is not None:
        return _yt_client

    if not settings.yt_credentials_available:
        return None

    try:
        from googleapiclient.discovery import build
        _yt_client = build("youtube", "v3", developerKey=settings.youtube_api_key)
    except Exception:
        _yt_client = None

    return _yt_client


def _get_analytics_client():
    """Return a googleapiclient Resource for YouTube Analytics API v2."""
    global _yt_analytics_client
    if _yt_analytics_client is not None:
        return _yt_analytics_client

    if not settings.yt_analytics_credentials_available:
        return None

    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=settings.youtube_refresh_token,
            token_uri=settings.youtube_token_uri,
            client_id=settings.youtube_client_id,
            client_secret=settings.youtube_client_secret,
            scopes=[
                "https://www.googleapis.com/auth/yt-analytics.readonly",
                "https://www.googleapis.com/auth/youtube.readonly",
            ],
        )
        _yt_analytics_client = build("youtubeAnalytics", "v2", credentials=creds)
    except Exception:
        _yt_analytics_client = None

    return _yt_analytics_client


# ──────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────

def _channel_id() -> str:
    return settings.youtube_channel_id


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _pct_of(part: int | float, total: int | float) -> float:
    return round(part / total * 100, 2) if total else 0.0


def _resolve_date(value: str) -> str:
    """Convert relative date tokens (e.g. 30daysAgo/today) into YYYY-MM-DD."""
    if not value:
        return date.today().isoformat()

    v = value.strip().lower()
    if v == "today":
        return date.today().isoformat()
    if v == "yesterday":
        return (date.today() - timedelta(days=1)).isoformat()

    m = re.fullmatch(r"(\d+)daysago", v)
    if m:
        days = int(m.group(1))
        return (date.today() - timedelta(days=days)).isoformat()

    # Assume already in YYYY-MM-DD format.
    return value


def _duration_to_seconds(duration: str | None) -> int:
    """Parse an ISO8601 YouTube duration (PT#H#M#S) into seconds."""
    if not duration or not duration.startswith("PT"):
        return 0
    hours = minutes = seconds = 0
    m = re.search(r"(\d+)H", duration)
    if m:
        hours = int(m.group(1))
    m = re.search(r"(\d+)M", duration)
    if m:
        minutes = int(m.group(1))
    m = re.search(r"(\d+)S", duration)
    if m:
        seconds = int(m.group(1))
    return hours * 3600 + minutes * 60 + seconds


def _granularity_dimension(granularity: str) -> str:
    return "month" if granularity == "month" else "day"


def _analytics_query(
    metrics: str,
    start_date: str,
    end_date: str,
    dimensions: str | None = None,
    sort: str | None = None,
    max_results: int | None = None,
    filters: str | None = None,
) -> dict | None:
    """Execute a YouTube Analytics report query, returning API response or None."""
    client = _get_analytics_client()
    if client is None:
        return None

    kwargs: dict[str, Any] = {
        "ids": "channel==MINE",
        "startDate": _resolve_date(start_date),
        "endDate": _resolve_date(end_date),
        "metrics": metrics,
    }
    if dimensions:
        kwargs["dimensions"] = dimensions
    if sort:
        kwargs["sort"] = sort
    if max_results:
        kwargs["maxResults"] = max_results
    if filters:
        kwargs["filters"] = filters

    try:
        return client.reports().query(**kwargs).execute()
    except Exception:
        return None


def _col_index(headers: list[dict], name: str) -> int:
    for i, h in enumerate(headers):
        if h.get("name") == name:
            return i
    return -1


def _as_float(value: Any, default: float = 0.0) -> float:
    return _safe_float(value, default)


def _as_int(value: Any, default: int = 0) -> int:
    return _safe_int(value, default)


# ──────────────────────────────────────────
# Stub data (used when credentials are absent)
# ──────────────────────────────────────────

def _stub_overview(start_date: str, end_date: str) -> dict:
    fixture = _load_fixture("overview")
    if fixture:
        delta = _safe_int(fixture.get("subscriber_delta_30d", 0))
        return {
            "subscribers": _safe_int(fixture.get("subscribers", 0)),
            "total_views": _safe_int(fixture.get("total_views", 0)),
            "total_videos": _safe_int(fixture.get("total_videos", 0)),
            "watch_time_hours": _safe_float(fixture.get("watch_time_hours", 0)),
            "avg_view_duration": _safe_float(fixture.get("avg_view_duration", 0)),
            "engagement_rate": _safe_float(fixture.get("engagement_rate", 0)),
            "estimated_revenue": _safe_float(fixture.get("estimated_revenue", 0)),
            "views_last_30d": _safe_int(fixture.get("views_delta_30d", 0)),
            "subscribers_gained_30d": max(delta, 0),
            "subscribers_lost_30d": max(-delta, 0),
            "date_range": {"start_date": start_date, "end_date": end_date},
        }
    return {
        "subscribers": "-",
        "total_views": 1_245_600,
        "total_videos": 142,
        "watch_time_hours": 52400,
        "avg_view_duration": 284.5,
        "engagement_rate": 5.6,
        "estimated_revenue": 3842.50,
        "views_last_30d": 372400,
        "subscribers_gained_30d": 1840,
        "subscribers_lost_30d": 310,
        "date_range": {"start_date": start_date, "end_date": end_date},
    }


def _stub_views(granularity: str) -> dict:
    fixture = _load_fixture("views")
    if fixture and "series" in fixture:
        return {
            "series": fixture.get("series", []),
            "total": _safe_int(fixture.get("total", 0)),
            "granularity": fixture.get("granularity", granularity),
        }

    today = date.today()
    series = []
    for i in range(30):
        d = today - timedelta(days=29 - i)
        base = 10000 + i * 200
        weekend_boost = 2500 if d.weekday() >= 5 else 0
        series.append({"date": d.isoformat(), "value": base + weekend_boost + (i % 5) * 300})
    return {
        "series": series,
        "total": sum(p["value"] for p in series),
        "granularity": granularity,
    }


def _stub_subscriber_growth() -> dict:
    fixture = _load_fixture("subscriber_growth")
    if fixture and "series" in fixture:
        series = fixture.get("series", [])
        total_gained = sum(_safe_int(p.get("gained", 0)) for p in series)
        total_lost = sum(_safe_int(p.get("lost", 0)) for p in series)
        return {
            "series": series,
            "total_gained": total_gained,
            "total_lost": total_lost,
            "net_change": _safe_int(fixture.get("net_change", total_gained - total_lost)),
        }

    today = date.today()
    series = []
    total_gained = 0
    total_lost = 0
    for i in range(30):
        d = today - timedelta(days=29 - i)
        gained = 55 + (i % 7) * 8
        lost = 8 + (i % 5) * 2
        total_gained += gained
        total_lost += lost
        series.append({
            "date": d.isoformat(),
            "gained": gained,
            "lost": lost,
            "net": gained - lost,
        })
    return {
        "series": series,
        "total_gained": total_gained,
        "total_lost": total_lost,
        "net_change": total_gained - total_lost,
    }


def _stub_watch_time(granularity: str) -> dict:
    fixture = _load_fixture("watch_time")
    if fixture and "series" in fixture:
        return {
            "series": fixture.get("series", []),
            "total_hours": _safe_float(fixture.get("total_hours", 0)),
            "avg_view_duration": _safe_float(fixture.get("avg_view_duration", 0)),
            "granularity": fixture.get("granularity", granularity),
        }

    today = date.today()
    series = []
    for i in range(30):
        d = today - timedelta(days=29 - i)
        series.append({"date": d.isoformat(), "value": round(140 + i * 5.2 + (i % 4) * 12, 1)})
    return {
        "series": series,
        "total_hours": round(sum(p["value"] for p in series), 1),
        "avg_view_duration": 284.5,
        "granularity": granularity,
    }


def _stub_top_videos() -> dict:
    fixture = _load_fixture("top_videos")
    if isinstance(fixture, list):
        return {"videos": fixture}
    if isinstance(fixture, dict) and "videos" in fixture:
        return {"videos": fixture.get("videos", [])}

    videos = [
        {
            "video_id": "yt-stub-001",
            "title": "How We Built a Giant Mural in 48 Hours | Club Artizen",
            "published_at": "2026-03-03T12:00:00Z",
            "views": 45200,
            "likes": 2340,
            "comments": 189,
            "shares": 456,
            "watch_time_hours": 3800,
            "avg_view_duration": 302.0,
            "impressions_ctr": 5.1,
            "video_type": "video",
        },
        {
            "video_id": "yt-stub-002",
            "title": "60-Second Art Challenge: Painting with Only Primary Colors",
            "published_at": "2026-03-02T15:00:00Z",
            "views": 128000,
            "likes": 8900,
            "comments": 456,
            "shares": 2340,
            "watch_time_hours": 1420,
            "avg_view_duration": 42.0,
            "impressions_ctr": 3.7,
            "video_type": "short",
        },
        {
            "video_id": "yt-stub-003",
            "title": "LIVE: Friday Night Art Jam",
            "published_at": "2026-02-28T19:00:00Z",
            "views": 12400,
            "likes": 1890,
            "comments": 1245,
            "shares": 89,
            "watch_time_hours": 8200,
            "avg_view_duration": 2380.0,
            "impressions_ctr": 4.4,
            "video_type": "live",
        },
        {
            "video_id": "yt-stub-004",
            "title": "Top 10 Art Techniques Every Beginner Should Know",
            "published_at": "2026-02-25T10:00:00Z",
            "views": 67800,
            "likes": 4560,
            "comments": 312,
            "shares": 890,
            "watch_time_hours": 12400,
            "avg_view_duration": 658.0,
            "impressions_ctr": 4.3,
            "video_type": "video",
        },
        {
            "video_id": "yt-stub-005",
            "title": "Club Artizen 2026 Collection Reveal — World Premiere",
            "published_at": "2026-02-20T18:00:00Z",
            "views": 23400,
            "likes": 3120,
            "comments": 567,
            "shares": 345,
            "watch_time_hours": 4600,
            "avg_view_duration": 708.0,
            "impressions_ctr": 4.5,
            "video_type": "premiere",
        },
        {
            "video_id": "yt-stub-006",
            "title": "POV: You find a hidden art studio in your city",
            "published_at": "2026-03-01T08:00:00Z",
            "views": 95600,
            "likes": 6780,
            "comments": 234,
            "shares": 1560,
            "watch_time_hours": 980,
            "avg_view_duration": 37.0,
            "impressions_ctr": 3.4,
            "video_type": "short",
        },
    ]
    return {"videos": videos}


def _stub_demographics() -> dict:
    fixture = _load_fixture("demographics")
    if fixture:
        by_country = [
            {
                "label": item.get("country", item.get("label", "Unknown")),
                "value": _safe_int(item.get("views", item.get("value", 0))),
                "percentage": _safe_float(item.get("percentage", 0)),
            }
            for item in fixture.get("by_country", [])
        ]
        by_age = [
            {
                "label": item.get("age_group", item.get("label", "Unknown")),
                "value": _safe_int(item.get("views", item.get("value", 0))),
                "percentage": _safe_float(item.get("percentage", 0)),
            }
            for item in fixture.get("by_age", [])
        ]
        by_gender = [
            {
                "label": item.get("gender", item.get("label", "Unknown")),
                "value": _safe_int(item.get("views", item.get("value", 0))),
                "percentage": _safe_float(item.get("percentage", 0)),
            }
            for item in fixture.get("by_gender", [])
        ]
        return {"by_country": by_country, "by_age": by_age, "by_gender": by_gender}

    return {
        "by_country": [
            {"label": "India", "value": 3200, "percentage": 36.6},
            {"label": "United States", "value": 1800, "percentage": 20.6},
            {"label": "United Kingdom", "value": 980, "percentage": 11.2},
            {"label": "Brazil", "value": 650, "percentage": 7.4},
            {"label": "Germany", "value": 520, "percentage": 5.9},
            {"label": "Others", "value": 1600, "percentage": 18.3},
        ],
        "by_age": [
            {"label": "13-17", "value": 620, "percentage": 7.1},
            {"label": "18-24", "value": 2450, "percentage": 28.0},
            {"label": "25-34", "value": 3100, "percentage": 35.4},
            {"label": "35-44", "value": 1500, "percentage": 17.1},
            {"label": "45-54", "value": 680, "percentage": 7.8},
            {"label": "55+", "value": 400, "percentage": 4.6},
        ],
        "by_gender": [
            {"label": "Male", "value": 4800, "percentage": 54.9},
            {"label": "Female", "value": 3500, "percentage": 40.0},
            {"label": "Other", "value": 450, "percentage": 5.1},
        ],
    }


def _stub_traffic_sources() -> dict:
    fixture = _load_fixture("traffic_sources")
    if isinstance(fixture, list):
        return {
            "sources": fixture,
            "total_views": sum(_safe_int(item.get("views", 0)) for item in fixture),
        }
    if isinstance(fixture, dict) and "sources" in fixture:
        sources = fixture.get("sources", [])
        return {
            "sources": sources,
            "total_views": _safe_int(fixture.get("total_views", sum(_safe_int(item.get("views", 0)) for item in sources))),
        }

    sources = [
        {"source": "YouTube Search", "views": 112000, "percentage": 30.1, "watch_time_hours": 15400},
        {"source": "Suggested Videos", "views": 98000, "percentage": 26.3, "watch_time_hours": 14200},
        {"source": "Browse Features", "views": 67000, "percentage": 18.0, "watch_time_hours": 8900},
        {"source": "External", "views": 42000, "percentage": 11.3, "watch_time_hours": 5200},
        {"source": "Channel Pages", "views": 28000, "percentage": 7.5, "watch_time_hours": 4100},
        {"source": "Notifications", "views": 15400, "percentage": 4.1, "watch_time_hours": 2300},
        {"source": "Shorts Feed", "views": 10000, "percentage": 2.7, "watch_time_hours": 420},
    ]
    return {"sources": sources, "total_views": sum(s["views"] for s in sources)}


def _stub_engagement() -> dict:
    fixture = _load_fixture("engagement")
    if fixture:
        return {
            "total_likes": _safe_int(fixture.get("total_likes", 0)),
            "total_comments": _safe_int(fixture.get("total_comments", 0)),
            "total_shares": _safe_int(fixture.get("total_shares", 0)),
            "likes_per_view": _safe_float(fixture.get("likes_per_view", 0)),
            "comments_per_view": _safe_float(fixture.get("comments_per_view", 0)),
            "shares_per_view": _safe_float(fixture.get("shares_per_view", 0)),
            "avg_engagement_rate": _safe_float(fixture.get("avg_engagement_rate", 0)),
        }

    total_views = 372400
    total_likes = 28200
    total_comments = 3890
    total_shares = 5670
    return {
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "likes_per_view": round(total_likes / total_views, 4),
        "comments_per_view": round(total_comments / total_views, 4),
        "shares_per_view": round(total_shares / total_views, 4),
        "avg_engagement_rate": round(
            (total_likes + total_comments + total_shares) / total_views * 100, 2
        ),
    }


def _stub_revenue() -> dict:
    fixture = _load_fixture("revenue")
    if fixture and "series" in fixture:
        return {
            "series": fixture.get("series", []),
            "total_revenue": _safe_float(fixture.get("total_revenue", 0)),
            "avg_rpm": _safe_float(fixture.get("avg_rpm", 0)),
            "avg_cpm": _safe_float(fixture.get("avg_cpm", 0)),
        }

    today = date.today()
    series = []
    total = 0.0
    for i in range(30):
        d = today - timedelta(days=29 - i)
        rev = round(80 + i * 3.5 + (i % 3) * 8, 2)
        total += rev
        series.append({
            "date": d.isoformat(),
            "revenue": rev,
            "rpm": round(rev / 12.5, 2),   # simplified RPM
            "cpm": round(rev / 8.2, 2),     # simplified CPM
        })
    return {
        "series": series,
        "total_revenue": round(total, 2),
        "avg_rpm": round(total / 30 / 12.5, 2),
        "avg_cpm": round(total / 30 / 8.2, 2),
    }


def _stub_content_performance() -> dict:
    fixture = _load_fixture("content_performance")
    if isinstance(fixture, dict):
        if "types" in fixture:
            return {"types": fixture.get("types", [])}
        if "by_type" in fixture:
            return {"types": fixture.get("by_type", [])}

    return {
        "types": [
            {
                "video_type": "video",
                "count": 68,
                "total_views": 524000,
                "avg_views": 7706,
                "total_watch_time_hours": 38200,
                "avg_engagement_rate": 5.4,
                "subscribers_gained": 890,
            },
            {
                "video_type": "short",
                "count": 52,
                "total_views": 612000,
                "avg_views": 11769,
                "total_watch_time_hours": 5800,
                "avg_engagement_rate": 7.8,
                "subscribers_gained": 1240,
            },
            {
                "video_type": "live",
                "count": 14,
                "total_views": 78000,
                "avg_views": 5571,
                "total_watch_time_hours": 6400,
                "avg_engagement_rate": 4.2,
                "subscribers_gained": 320,
            },
            {
                "video_type": "premiere",
                "count": 8,
                "total_views": 31600,
                "avg_views": 3950,
                "total_watch_time_hours": 2000,
                "avg_engagement_rate": 6.1,
                "subscribers_gained": 210,
            },
        ]
    }


# ──────────────────────────────────────────
# Public API (dual-mode: real API or stubs)
# ──────────────────────────────────────────

def get_overview(start_date: str = "30daysAgo", end_date: str = "today") -> dict:
    """Channel-level KPI summary."""
    if not settings.yt_credentials_available:
        return _stub_overview(start_date, end_date)

    client = _get_client()
    if client is None:
        return _stub_overview(start_date, end_date)

    # --- Real YouTube Data API v3 ---
    resp = client.channels().list(
        part="statistics,snippet,contentDetails",
        id=_channel_id(),
    ).execute()

    ch = resp["items"][0] if resp.get("items") else {}
    stats = ch.get("statistics", {})

    views_30d = 0
    subs_gained = 0
    subs_lost = 0
    watch_minutes = 0.0
    avg_view_duration = 0.0
    engagement_rate = 0.0
    estimated_revenue = 0.0

    perf = _analytics_query(
        metrics="views,subscribersGained,subscribersLost,estimatedMinutesWatched,averageViewDuration,likes,comments,shares",
        start_date=start_date,
        end_date=end_date,
    )
    if perf and perf.get("rows"):
        row = perf["rows"][0]
        headers = perf.get("columnHeaders", [])
        views_30d = _as_int(row[_col_index(headers, "views")])
        subs_gained = _as_int(row[_col_index(headers, "subscribersGained")])
        subs_lost = _as_int(row[_col_index(headers, "subscribersLost")])
        watch_minutes = _as_float(row[_col_index(headers, "estimatedMinutesWatched")])
        avg_view_duration = _as_float(row[_col_index(headers, "averageViewDuration")])
        likes = _as_int(row[_col_index(headers, "likes")])
        comments = _as_int(row[_col_index(headers, "comments")])
        shares = _as_int(row[_col_index(headers, "shares")])
        engagement_rate = _pct_of(likes + comments + shares, views_30d)

    rev = _analytics_query(
        metrics="estimatedRevenue",
        start_date=start_date,
        end_date=end_date,
    )
    if rev and rev.get("rows"):
        row = rev["rows"][0]
        headers = rev.get("columnHeaders", [])
        estimated_revenue = _as_float(row[_col_index(headers, "estimatedRevenue")])

    return {
        "subscribers": _safe_int(stats.get("subscriberCount")),
        "total_views": _safe_int(stats.get("viewCount")),
        "total_videos": _safe_int(stats.get("videoCount")),
        "watch_time_hours": round(watch_minutes / 60.0, 2),
        "avg_view_duration": round(avg_view_duration, 2),
        "engagement_rate": round(engagement_rate, 2),
        "estimated_revenue": round(estimated_revenue, 2),
        "views_last_30d": views_30d,
        "subscribers_gained_30d": subs_gained,
        "subscribers_lost_30d": subs_lost,
        "date_range": {"start_date": start_date, "end_date": end_date},
    }


def get_views(start_date: str = "30daysAgo", end_date: str = "today",
              granularity: str = "day") -> dict:
    """Views time series."""
    if not settings.yt_credentials_available:
        return _stub_views(granularity)

    resp = _analytics_query(
        metrics="views",
        start_date=start_date,
        end_date=end_date,
        dimensions=_granularity_dimension(granularity),
        sort=_granularity_dimension(granularity),
    )
    if not resp or not resp.get("rows"):
        return _stub_views(granularity)

    headers = resp.get("columnHeaders", [])
    dim_idx = _col_index(headers, _granularity_dimension(granularity))
    views_idx = _col_index(headers, "views")
    series = [
        {"date": str(row[dim_idx]), "value": _as_int(row[views_idx])}
        for row in resp.get("rows", [])
    ]
    return {
        "series": series,
        "total": sum(p["value"] for p in series),
        "granularity": granularity,
    }


def get_subscriber_growth(start_date: str = "30daysAgo",
                          end_date: str = "today") -> dict:
    """Net subscriber change over time."""
    if not settings.yt_credentials_available:
        return _stub_subscriber_growth()

    resp = _analytics_query(
        metrics="subscribersGained,subscribersLost",
        start_date=start_date,
        end_date=end_date,
        dimensions="day",
        sort="day",
    )
    if not resp or not resp.get("rows"):
        return _stub_subscriber_growth()

    headers = resp.get("columnHeaders", [])
    day_idx = _col_index(headers, "day")
    gained_idx = _col_index(headers, "subscribersGained")
    lost_idx = _col_index(headers, "subscribersLost")

    series = []
    total_gained = 0
    total_lost = 0
    for row in resp.get("rows", []):
        gained = _as_int(row[gained_idx])
        lost = _as_int(row[lost_idx])
        total_gained += gained
        total_lost += lost
        series.append(
            {
                "date": str(row[day_idx]),
                "gained": gained,
                "lost": lost,
                "net": gained - lost,
            }
        )

    return {
        "series": series,
        "total_gained": total_gained,
        "total_lost": total_lost,
        "net_change": total_gained - total_lost,
    }


def get_watch_time(start_date: str = "30daysAgo", end_date: str = "today",
                   granularity: str = "day") -> dict:
    """Watch time time series."""
    if not settings.yt_credentials_available:
        return _stub_watch_time(granularity)

    resp = _analytics_query(
        metrics="estimatedMinutesWatched,averageViewDuration",
        start_date=start_date,
        end_date=end_date,
        dimensions=_granularity_dimension(granularity),
        sort=_granularity_dimension(granularity),
    )
    if not resp or not resp.get("rows"):
        return _stub_watch_time(granularity)

    headers = resp.get("columnHeaders", [])
    dim_idx = _col_index(headers, _granularity_dimension(granularity))
    watched_idx = _col_index(headers, "estimatedMinutesWatched")
    avg_idx = _col_index(headers, "averageViewDuration")

    series = []
    total_minutes = 0.0
    avg_view_duration_vals: list[float] = []
    for row in resp.get("rows", []):
        minutes = _as_float(row[watched_idx])
        avg_duration = _as_float(row[avg_idx])
        total_minutes += minutes
        if avg_duration > 0:
            avg_view_duration_vals.append(avg_duration)
        series.append(
            {
                "date": str(row[dim_idx]),
                "value": round(minutes / 60.0, 2),
            }
        )

    return {
        "series": series,
        "total_hours": round(total_minutes / 60.0, 2),
        "avg_view_duration": round(
            sum(avg_view_duration_vals) / len(avg_view_duration_vals), 2
        ) if avg_view_duration_vals else 0.0,
        "granularity": granularity,
    }


def get_top_videos(start_date: str = "30daysAgo", end_date: str = "today",
                   limit: int = 10) -> dict:
    """Top performing videos by views."""
    if not settings.yt_credentials_available:
        return _stub_top_videos()

    client = _get_client()
    if client is None:
        return _stub_top_videos()

    analytics = _analytics_query(
        metrics="views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration,impressionsCtr",
        start_date=start_date,
        end_date=end_date,
        dimensions="video",
        sort="-views",
        max_results=limit,
    )
    analytics_rows = analytics.get("rows", []) if analytics else []
    analytics_headers = analytics.get("columnHeaders", []) if analytics else []
    video_metrics_map: dict[str, dict[str, Any]] = {}
    if analytics_rows:
        vid_idx = _col_index(analytics_headers, "video")
        views_idx = _col_index(analytics_headers, "views")
        likes_idx = _col_index(analytics_headers, "likes")
        comments_idx = _col_index(analytics_headers, "comments")
        shares_idx = _col_index(analytics_headers, "shares")
        watched_idx = _col_index(analytics_headers, "estimatedMinutesWatched")
        avg_idx = _col_index(analytics_headers, "averageViewDuration")
        ctr_idx = _col_index(analytics_headers, "impressionsCtr")
        for row in analytics_rows:
            vid = str(row[vid_idx])
            video_metrics_map[vid] = {
                "views": _as_int(row[views_idx]),
                "likes": _as_int(row[likes_idx]),
                "comments": _as_int(row[comments_idx]),
                "shares": _as_int(row[shares_idx]),
                "watch_time_hours": round(_as_float(row[watched_idx]) / 60.0, 2),
                "avg_view_duration": round(_as_float(row[avg_idx]), 2),
                "impressions_ctr": round(_as_float(row[ctr_idx]), 2),
            }

    # --- Real YouTube Data API v3 ---
    # Prefer analytics-sorted videos, fallback to Data API search if analytics unavailable.
    video_ids = list(video_metrics_map.keys())
    if not video_ids:
        search_resp = client.search().list(
            part="id",
            channelId=_channel_id(),
            type="video",
            order="viewCount",
            maxResults=limit,
        ).execute()
        video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]

    if not video_ids:
        return {"videos": []}

    # Step 2: get detailed statistics for those videos
    videos_resp = client.videos().list(
        part="snippet,statistics,contentDetails",
        id=",".join(video_ids),
    ).execute()

    videos = []
    for item in videos_resp.get("items", []):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content_details = item.get("contentDetails", {})
        duration_seconds = _duration_to_seconds(content_details.get("duration"))
        live_content = snippet.get("liveBroadcastContent", "none")
        if live_content == "live":
            video_type = "live"
        elif duration_seconds and duration_seconds <= 60:
            video_type = "short"
        else:
            video_type = "video"

        metrics = video_metrics_map.get(item["id"], {})
        videos.append({
            "video_id": item["id"],
            "title": snippet.get("title", ""),
            "published_at": snippet.get("publishedAt", ""),
            "views": _as_int(metrics.get("views", _safe_int(stats.get("viewCount")))),
            "likes": _as_int(metrics.get("likes", _safe_int(stats.get("likeCount")))),
            "comments": _as_int(metrics.get("comments", _safe_int(stats.get("commentCount")))),
            "shares": _as_int(metrics.get("shares", 0)),
            "watch_time_hours": _as_float(metrics.get("watch_time_hours", 0)),
            "avg_view_duration": _as_float(metrics.get("avg_view_duration", 0)),
            "impressions_ctr": _as_float(metrics.get("impressions_ctr", 0)),
            "video_type": video_type,
        })

    videos.sort(key=lambda x: x.get("views", 0), reverse=True)
    return {"videos": videos[:limit]}


def get_demographics(start_date: str = "30daysAgo",
                     end_date: str = "today") -> dict:
    """Viewer demographics: country, age, gender."""
    if not settings.yt_credentials_available:
        return _stub_demographics()

    country_resp = _analytics_query(
        metrics="views",
        start_date=start_date,
        end_date=end_date,
        dimensions="country",
        sort="-views",
        max_results=10,
    )

    age_resp = _analytics_query(
        metrics="views",
        start_date=start_date,
        end_date=end_date,
        dimensions="ageGroup",
        sort="-views",
    )
    gender_resp = _analytics_query(
        metrics="views",
        start_date=start_date,
        end_date=end_date,
        dimensions="gender",
        sort="-views",
    )

    if not country_resp or not country_resp.get("rows"):
        return _stub_demographics()

    def _map_breakdown(resp: dict, dim_name: str) -> list[dict]:
        headers = resp.get("columnHeaders", [])
        rows = resp.get("rows", [])
        d_idx = _col_index(headers, dim_name)
        v_idx = _col_index(headers, "views")
        total = sum(_as_int(r[v_idx]) for r in rows) or 1
        return [
            {
                "label": str(r[d_idx]),
                "value": _as_int(r[v_idx]),
                "percentage": round(_as_int(r[v_idx]) / total * 100, 2),
            }
            for r in rows
        ]

    by_country = _map_breakdown(country_resp, "country")
    by_age = _map_breakdown(age_resp, "ageGroup") if age_resp and age_resp.get("rows") else []
    by_gender = _map_breakdown(gender_resp, "gender") if gender_resp and gender_resp.get("rows") else []

    if not by_age or not by_gender:
        fallback = _stub_demographics()
        by_age = by_age or fallback["by_age"]
        by_gender = by_gender or fallback["by_gender"]

    return {
        "by_country": by_country,
        "by_age": by_age,
        "by_gender": by_gender,
    }


def get_traffic_sources(start_date: str = "30daysAgo",
                        end_date: str = "today") -> dict:
    """Traffic sources breakdown."""
    if not settings.yt_credentials_available:
        return _stub_traffic_sources()

    resp = _analytics_query(
        metrics="views,estimatedMinutesWatched",
        start_date=start_date,
        end_date=end_date,
        dimensions="insightTrafficSourceType",
        sort="-views",
    )
    if not resp or not resp.get("rows"):
        return _stub_traffic_sources()

    headers = resp.get("columnHeaders", [])
    src_idx = _col_index(headers, "insightTrafficSourceType")
    views_idx = _col_index(headers, "views")
    watched_idx = _col_index(headers, "estimatedMinutesWatched")

    rows = resp.get("rows", [])
    total_views = sum(_as_int(r[views_idx]) for r in rows)
    sources = []
    for row in rows:
        views = _as_int(row[views_idx])
        sources.append(
            {
                "source": str(row[src_idx]),
                "views": views,
                "percentage": _pct_of(views, total_views),
                "watch_time_hours": round(_as_float(row[watched_idx]) / 60.0, 2),
            }
        )

    return {"sources": sources, "total_views": total_views}


def get_engagement(start_date: str = "30daysAgo",
                   end_date: str = "today") -> dict:
    """Engagement aggregates: likes, comments, shares."""
    if not settings.yt_credentials_available:
        return _stub_engagement()

    resp = _analytics_query(
        metrics="likes,comments,shares,views",
        start_date=start_date,
        end_date=end_date,
    )
    if not resp or not resp.get("rows"):
        return _stub_engagement()

    headers = resp.get("columnHeaders", [])
    row = resp["rows"][0]
    likes = _as_int(row[_col_index(headers, "likes")])
    comments = _as_int(row[_col_index(headers, "comments")])
    shares = _as_int(row[_col_index(headers, "shares")])
    views = _as_int(row[_col_index(headers, "views")])
    return {
        "total_likes": likes,
        "total_comments": comments,
        "total_shares": shares,
        "likes_per_view": round(likes / views, 4) if views else 0.0,
        "comments_per_view": round(comments / views, 4) if views else 0.0,
        "shares_per_view": round(shares / views, 4) if views else 0.0,
        "avg_engagement_rate": _pct_of(likes + comments + shares, views),
    }


def get_revenue(start_date: str = "30daysAgo",
                end_date: str = "today") -> dict:
    """Estimated ad revenue (requires YouTube Partner Program)."""
    if not settings.yt_credentials_available:
        return _stub_revenue()

    rev_series = _analytics_query(
        metrics="estimatedRevenue,cpm",
        start_date=start_date,
        end_date=end_date,
        dimensions="day",
        sort="day",
    )
    views_series = _analytics_query(
        metrics="views",
        start_date=start_date,
        end_date=end_date,
        dimensions="day",
        sort="day",
    )

    if not rev_series or not rev_series.get("rows"):
        return _stub_revenue()

    rev_headers = rev_series.get("columnHeaders", [])
    day_idx = _col_index(rev_headers, "day")
    rev_idx = _col_index(rev_headers, "estimatedRevenue")
    cpm_idx = _col_index(rev_headers, "cpm")

    views_by_day: dict[str, int] = {}
    if views_series and views_series.get("rows"):
        v_headers = views_series.get("columnHeaders", [])
        v_day_idx = _col_index(v_headers, "day")
        v_views_idx = _col_index(v_headers, "views")
        for row in views_series.get("rows", []):
            views_by_day[str(row[v_day_idx])] = _as_int(row[v_views_idx])

    total_revenue = 0.0
    total_views = 0
    cpm_vals: list[float] = []
    series = []
    for row in rev_series.get("rows", []):
        d = str(row[day_idx])
        revenue = _as_float(row[rev_idx])
        cpm = _as_float(row[cpm_idx])
        day_views = views_by_day.get(d, 0)
        total_revenue += revenue
        total_views += day_views
        if cpm > 0:
            cpm_vals.append(cpm)
        rpm = (revenue / day_views * 1000) if day_views else 0.0
        series.append(
            {
                "date": d,
                "revenue": round(revenue, 2),
                "rpm": round(rpm, 2),
                "cpm": round(cpm, 2),
            }
        )

    avg_rpm = (total_revenue / total_views * 1000) if total_views else 0.0
    avg_cpm = (sum(cpm_vals) / len(cpm_vals)) if cpm_vals else 0.0
    return {
        "series": series,
        "total_revenue": round(total_revenue, 2),
        "avg_rpm": round(avg_rpm, 2),
        "avg_cpm": round(avg_cpm, 2),
    }


def get_content_performance() -> dict:
    """Performance breakdown by video type (video, short, live, premiere)."""
    if not settings.yt_credentials_available:
        return _stub_content_performance()

    analytics = _analytics_query(
        metrics="views,estimatedMinutesWatched,likes,comments,shares,subscribersGained",
        start_date="30daysAgo",
        end_date="today",
        dimensions="video",
        sort="-views",
        max_results=50,
    )
    if not analytics or not analytics.get("rows"):
        return _stub_content_performance()

    headers = analytics.get("columnHeaders", [])
    vid_idx = _col_index(headers, "video")
    views_idx = _col_index(headers, "views")
    watched_idx = _col_index(headers, "estimatedMinutesWatched")
    likes_idx = _col_index(headers, "likes")
    comments_idx = _col_index(headers, "comments")
    shares_idx = _col_index(headers, "shares")
    subs_idx = _col_index(headers, "subscribersGained")

    video_ids = [str(r[vid_idx]) for r in analytics.get("rows", [])]

    client = _get_client()
    if client is None or not video_ids:
        return _stub_content_performance()

    videos_resp = client.videos().list(
        part="snippet,contentDetails",
        id=",".join(video_ids),
    ).execute()
    meta_map = {item.get("id"): item for item in videos_resp.get("items", [])}

    by_type: dict[str, dict[str, float]] = defaultdict(
        lambda: {
            "count": 0,
            "total_views": 0,
            "total_watch_time_hours": 0.0,
            "engagement_rate_acc": 0.0,
            "subscribers_gained": 0,
        }
    )

    for row in analytics.get("rows", []):
        vid = str(row[vid_idx])
        meta = meta_map.get(vid, {})
        snippet = meta.get("snippet", {})
        duration = _duration_to_seconds(meta.get("contentDetails", {}).get("duration"))
        live_content = snippet.get("liveBroadcastContent", "none")
        if live_content == "live":
            vtype = "live"
        elif duration and duration <= 60:
            vtype = "short"
        else:
            vtype = "video"

        views = _as_int(row[views_idx])
        watch_hours = _as_float(row[watched_idx]) / 60.0
        likes = _as_int(row[likes_idx])
        comments = _as_int(row[comments_idx])
        shares = _as_int(row[shares_idx])
        subs = _as_int(row[subs_idx])
        eng_rate = _pct_of(likes + comments + shares, views)

        agg = by_type[vtype]
        agg["count"] += 1
        agg["total_views"] += views
        agg["total_watch_time_hours"] += watch_hours
        agg["engagement_rate_acc"] += eng_rate
        agg["subscribers_gained"] += subs

    types = []
    for vtype, agg in by_type.items():
        count = int(agg["count"]) or 1
        total_views = int(agg["total_views"])
        types.append(
            {
                "video_type": vtype,
                "count": int(agg["count"]),
                "total_views": total_views,
                "avg_views": round(total_views / count, 2),
                "total_watch_time_hours": round(agg["total_watch_time_hours"], 2),
                "avg_engagement_rate": round(agg["engagement_rate_acc"] / count, 2),
                "subscribers_gained": int(agg["subscribers_gained"]),
            }
        )

    return {"types": sorted(types, key=lambda x: x["total_views"], reverse=True)}
