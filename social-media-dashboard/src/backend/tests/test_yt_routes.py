"""
Unit tests for the YouTube API routes.

The YT service layer is mocked with unittest.mock.patch so NO real YouTube
API credentials are required to run this test suite.

Run:
    cd src/Backend
    pytest tests/test_yt_routes.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# ── App import ────────────────────────────────────────────────────────────────
from main import app

client = TestClient(app)

# ── Shared stub payloads ──────────────────────────────────────────────────────

STUB_OVERVIEW = {
    "subscribers": "-",
    "total_views": 1_240_000,
    "total_videos": 342,
    "watch_time_hours": 58200,
    "avg_view_duration": 245.8,
    "engagement_rate": 6.4,
    "estimated_revenue": 14320.50,
    "views_last_30d": 85400,
    "subscribers_gained_30d": 620,
    "subscribers_lost_30d": 48,
    "date_range": {"start_date": "30daysAgo", "end_date": "today"},
}

STUB_VIEWS = {
    "series": [
        {"date": "2026-02-01", "value": 3200},
        {"date": "2026-02-02", "value": 2950},
    ],
    "total": 6150,
    "granularity": "day",
}

STUB_SUBSCRIBER_GROWTH = {
    "series": [
        {"date": "2026-02-01", "gained": 45, "lost": 12, "net": 33},
        {"date": "2026-02-02", "gained": 38, "lost": 9, "net": 29},
    ],
    "total_gained": 83,
    "total_lost": 21,
    "net_change": 62,
}

STUB_WATCH_TIME = {
    "series": [
        {"date": "2026-02-01", "value": 320.5},
        {"date": "2026-02-02", "value": 295.8},
    ],
    "total_hours": 616.3,
    "avg_view_duration": 245.8,
    "granularity": "day",
}

STUB_TOP_VIDEOS = {
    "videos": [
        {
            "video_id": "dQw4w9WgXcQ",
            "title": "Our Biggest Event Yet – Full Recap",
            "published_at": "2026-01-15T10:00:00Z",
            "views": 52400,
            "likes": 3200,
            "comments": 890,
            "shares": 420,
            "watch_time_hours": 4200,
            "avg_view_duration": 312.5,
            "impressions_ctr": 5.8,
            "video_type": "video",
        }
    ]
}

STUB_DEMOGRAPHICS = {
    "by_country": [{"label": "India", "value": 4200, "percentage": 42.0}],
    "by_age": [{"label": "25-34", "value": 3500, "percentage": 35.0}],
    "by_gender": [{"label": "Male", "value": 5800, "percentage": 58.0}],
}

STUB_TRAFFIC_SOURCES = {
    "sources": [
        {"source": "YouTube Search", "views": 42000, "watch_time_hours": 2100.0, "percentage": 33.9},
    ],
    "total_views": 124000,
}

STUB_ENGAGEMENT = {
    "total_likes": 78500,
    "total_comments": 12400,
    "total_shares": 8900,
    "likes_per_view": 0.063,
    "comments_per_view": 0.010,
    "shares_per_view": 0.007,
    "avg_engagement_rate": 6.4,
}

STUB_REVENUE = {
    "series": [
        {"date": "2026-02-01", "revenue": 48.20, "rpm": 4.10, "cpm": 6.70},
        {"date": "2026-02-02", "revenue": 52.10, "rpm": 4.30, "cpm": 6.90},
    ],
    "total_revenue": 100.30,
    "avg_rpm": 4.20,
    "avg_cpm": 6.80,
}

STUB_CONTENT_PERFORMANCE = {
    "types": [
        {
            "video_type": "video",
            "count": 180,
            "total_views": 820000,
            "avg_views": 4556,
            "total_watch_time_hours": 42000,
            "avg_engagement_rate": 5.8,
            "subscribers_gained": 340,
        },
        {
            "video_type": "short",
            "count": 120,
            "total_views": 340000,
            "avg_views": 2833,
            "total_watch_time_hours": 1200,
            "avg_engagement_rate": 8.2,
            "subscribers_gained": 180,
        },
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────

def mock_service(function_name: str, return_value: dict):
    """Return a context manager that patches a yt_service function."""
    return patch(f"routes.yt_routes.yt.{function_name}", return_value=return_value)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestOverview:
    def test_returns_200_with_valid_shape(self):
        with mock_service("get_overview", STUB_OVERVIEW):
            res = client.get("/api/yt/overview")
        assert res.status_code == 200
        data = res.json()
        assert "subscribers" in data
        assert "total_views" in data
        assert "watch_time_hours" in data
        assert "engagement_rate" in data
        assert "date_range" in data

    def test_custom_date_range_passed_to_service(self):
        captured = {}

        def spy(start_date, end_date):
            captured["start"] = start_date
            captured["end"] = end_date
            return STUB_OVERVIEW

        with patch("routes.yt_routes.yt.get_overview", side_effect=spy):
            client.get("/api/yt/overview?start_date=2025-01-01&end_date=2025-01-31")

        assert captured["start"] == "2025-01-01"
        assert captured["end"] == "2025-01-31"

    def test_service_error_returns_503(self):
        with patch("routes.yt_routes.yt.get_overview", side_effect=RuntimeError("creds missing")):
            res = client.get("/api/yt/overview")
        assert res.status_code == 503


class TestViews:
    def test_returns_200_with_series(self):
        with mock_service("get_views", STUB_VIEWS):
            res = client.get("/api/yt/views")
        assert res.status_code == 200
        data = res.json()
        assert "series" in data
        assert isinstance(data["series"], list)
        assert "total" in data
        assert "granularity" in data

    def test_default_granularity_is_day(self):
        captured = {}

        def spy(start_date, end_date, granularity):
            captured["granularity"] = granularity
            return STUB_VIEWS

        with patch("routes.yt_routes.yt.get_views", side_effect=spy):
            client.get("/api/yt/views")

        assert captured["granularity"] == "day"

    def test_invalid_granularity_returns_422(self):
        res = client.get("/api/yt/views?granularity=quarterly")
        assert res.status_code == 422


class TestSubscriberGrowth:
    def test_returns_200_with_growth_data(self):
        with mock_service("get_subscriber_growth", STUB_SUBSCRIBER_GROWTH):
            res = client.get("/api/yt/subscriber-growth")
        assert res.status_code == 200
        data = res.json()
        assert "series" in data
        assert "total_gained" in data
        assert "total_lost" in data
        assert "net_change" in data
        # Each series point should have gained/lost/net
        point = data["series"][0]
        assert "gained" in point
        assert "lost" in point
        assert "net" in point


class TestWatchTime:
    def test_returns_200_with_watch_data(self):
        with mock_service("get_watch_time", STUB_WATCH_TIME):
            res = client.get("/api/yt/watch-time")
        assert res.status_code == 200
        data = res.json()
        assert "series" in data
        assert "total_hours" in data
        assert "avg_view_duration" in data
        assert "granularity" in data

    def test_invalid_granularity_returns_422(self):
        res = client.get("/api/yt/watch-time?granularity=yearly")
        assert res.status_code == 422


class TestTopVideos:
    def test_returns_200_with_videos(self):
        with mock_service("get_top_videos", STUB_TOP_VIDEOS):
            res = client.get("/api/yt/top-videos")
        assert res.status_code == 200
        data = res.json()
        assert "videos" in data
        video = data["videos"][0]
        assert "video_id" in video
        assert "title" in video
        assert "views" in video
        assert "likes" in video
        assert "video_type" in video

    def test_limit_out_of_range_returns_422(self):
        res = client.get("/api/yt/top-videos?limit=999")
        assert res.status_code == 422

    def test_limit_zero_returns_422(self):
        res = client.get("/api/yt/top-videos?limit=0")
        assert res.status_code == 422


class TestDemographics:
    def test_returns_200_with_all_breakdowns(self):
        with mock_service("get_demographics", STUB_DEMOGRAPHICS):
            res = client.get("/api/yt/demographics")
        assert res.status_code == 200
        data = res.json()
        assert "by_country" in data
        assert "by_age" in data
        assert "by_gender" in data


class TestTrafficSources:
    def test_returns_200_with_sources(self):
        with mock_service("get_traffic_sources", STUB_TRAFFIC_SOURCES):
            res = client.get("/api/yt/traffic-sources")
        assert res.status_code == 200
        data = res.json()
        assert "sources" in data
        assert len(data["sources"]) >= 1
        source = data["sources"][0]
        assert "source" in source
        assert "views" in source
        assert "watch_time_hours" in source
        assert "percentage" in source


class TestEngagement:
    def test_returns_200_with_metrics(self):
        with mock_service("get_engagement", STUB_ENGAGEMENT):
            res = client.get("/api/yt/engagement")
        assert res.status_code == 200
        data = res.json()
        assert "total_likes" in data
        assert "total_comments" in data
        assert "total_shares" in data
        assert "avg_engagement_rate" in data
        assert "likes_per_view" in data


class TestRevenue:
    def test_returns_200_with_revenue_data(self):
        with mock_service("get_revenue", STUB_REVENUE):
            res = client.get("/api/yt/revenue")
        assert res.status_code == 200
        data = res.json()
        assert "series" in data
        assert "total_revenue" in data
        assert "avg_rpm" in data
        assert "avg_cpm" in data


class TestContentPerformance:
    def test_returns_200_with_type_breakdown(self):
        with mock_service("get_content_performance", STUB_CONTENT_PERFORMANCE):
            res = client.get("/api/yt/content-performance")
        assert res.status_code == 200
        data = res.json()
        assert "types" in data
        assert len(data["types"]) >= 1
        entry = data["types"][0]
        assert "video_type" in entry
        assert "count" in entry
        assert "total_views" in entry
        assert "avg_engagement_rate" in entry

    def test_content_performance_accepts_no_query_params(self):
        """Content performance endpoint should not require any params."""
        with mock_service("get_content_performance", STUB_CONTENT_PERFORMANCE):
            res = client.get("/api/yt/content-performance")
        assert res.status_code == 200


class TestOpenApiDocs:
    """Verify that all expected YouTube routes appear in the OpenAPI schema."""

    EXPECTED_PATHS = [
        "/api/yt/overview",
        "/api/yt/views",
        "/api/yt/subscriber-growth",
        "/api/yt/watch-time",
        "/api/yt/top-videos",
        "/api/yt/demographics",
        "/api/yt/traffic-sources",
        "/api/yt/engagement",
        "/api/yt/revenue",
        "/api/yt/content-performance",
    ]

    def test_all_yt_routes_registered(self):
        res = client.get("/openapi.json")
        assert res.status_code == 200
        paths = res.json().get("paths", {})
        for expected in self.EXPECTED_PATHS:
            assert expected in paths, f"Missing route: {expected}"
