"""
Unit tests for the Google Analytics API routes.

The GA service layer is mocked with unittest.mock.patch so NO real GA4
credentials are required to run this test suite.

Run:
    cd src/backend
    pytest tests/test_ga_routes.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# ── App import ────────────────────────────────────────────────────────────────
from main import app

client = TestClient(app)

# ── Shared stub payloads ──────────────────────────────────────────────────────

STUB_OVERVIEW = {
    "sessions": 12450,
    "users": 9820,
    "new_users": 6240,
    "bounce_rate": 42.3,
    "avg_session_duration": 185.4,
    "pageviews": 34200,
    "date_range": {"start_date": "30daysAgo", "end_date": "today"},
}

STUB_PAGEVIEWS = {
    "series": [{"date": "2026-02-05", "value": 900.0}],
    "total": 900,
    "granularity": "day",
}

STUB_TRAFFIC_SOURCES = {
    "sources": [{"channel": "Organic Search", "sessions": 4200, "percentage": 33.7}],
    "total_sessions": 12450,
}

STUB_TOP_PAGES = {
    "pages": [
        {
            "page_path": "/",
            "page_title": "Home",
            "sessions": 4200,
            "pageviews": 5100,
            "avg_time_on_page": 62.3,
        }
    ]
}

STUB_DEMOGRAPHICS = {
    "by_country": [{"label": "India", "value": 4200, "percentage": 42.8}],
    "by_age": [{"label": "25-34", "value": 3500, "percentage": 35.7}],
}

STUB_DEVICE_BREAKDOWN = {
    "devices": [{"device": "Mobile", "sessions": 6720, "percentage": 54.0}],
    "total_sessions": 12450,
}

STUB_ENGAGEMENT = {
    "engaged_sessions": 7180,
    "engagement_rate": 57.7,
    "events_per_session": 8.4,
    "avg_engagement_time": 142.6,
}

STUB_CONVERSIONS = {
    "events": [{"event_name": "membership_signup", "count": 142}],
    "total": 142,
}

STUB_REALTIME = {
    "active_users": 34,
    "top_pages": [{"page_path": "/", "active_users": 12}],
}


# ── Helper ────────────────────────────────────────────────────────────────────

def mock_service(function_name: str, return_value: dict):
    """Return a context manager that patches a ga_service function."""
    return patch(f"routes.ga_routes.ga.{function_name}", return_value=return_value)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestOverview:
    def test_returns_200_with_valid_shape(self):
        with mock_service("get_overview", STUB_OVERVIEW):
            res = client.get("/api/ga/overview")
        assert res.status_code == 200
        data = res.json()
        assert "sessions" in data
        assert "users" in data
        assert "bounce_rate" in data
        assert "date_range" in data

    def test_custom_date_range_passed_to_service(self):
        captured = {}

        def spy(start_date, end_date):
            captured["start"] = start_date
            captured["end"] = end_date
            return STUB_OVERVIEW

        with patch("routes.ga_routes.ga.get_overview", side_effect=spy):
            client.get("/api/ga/overview?start_date=2025-01-01&end_date=2025-01-31")

        assert captured["start"] == "2025-01-01"
        assert captured["end"] == "2025-01-31"

    def test_service_error_returns_503(self):
        with patch("routes.ga_routes.ga.get_overview", side_effect=RuntimeError("creds missing")):
            res = client.get("/api/ga/overview")
        assert res.status_code == 503


class TestPageviews:
    def test_returns_200_with_series(self):
        with mock_service("get_pageviews", STUB_PAGEVIEWS):
            res = client.get("/api/ga/pageviews")
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
            return STUB_PAGEVIEWS

        with patch("routes.ga_routes.ga.get_pageviews", side_effect=spy):
            client.get("/api/ga/pageviews")

        assert captured["granularity"] == "day"

    def test_invalid_granularity_returns_422(self):
        res = client.get("/api/ga/pageviews?granularity=quarterly")
        assert res.status_code == 422


class TestTrafficSources:
    def test_returns_200_with_sources(self):
        with mock_service("get_traffic_sources", STUB_TRAFFIC_SOURCES):
            res = client.get("/api/ga/traffic-sources")
        assert res.status_code == 200
        data = res.json()
        assert "sources" in data
        assert len(data["sources"]) >= 1
        assert "channel" in data["sources"][0]
        assert "percentage" in data["sources"][0]


class TestTopPages:
    def test_returns_200_with_pages(self):
        with mock_service("get_top_pages", STUB_TOP_PAGES):
            res = client.get("/api/ga/top-pages")
        assert res.status_code == 200
        data = res.json()
        assert "pages" in data
        assert "page_path" in data["pages"][0]

    def test_limit_out_of_range_returns_422(self):
        res = client.get("/api/ga/top-pages?limit=999")
        assert res.status_code == 422

    def test_limit_zero_returns_422(self):
        res = client.get("/api/ga/top-pages?limit=0")
        assert res.status_code == 422


class TestDemographics:
    def test_returns_200_with_country_and_age(self):
        with mock_service("get_demographics", STUB_DEMOGRAPHICS):
            res = client.get("/api/ga/demographics")
        assert res.status_code == 200
        data = res.json()
        assert "by_country" in data
        assert "by_age" in data


class TestDeviceBreakdown:
    def test_returns_200_with_devices(self):
        with mock_service("get_device_breakdown", STUB_DEVICE_BREAKDOWN):
            res = client.get("/api/ga/device-breakdown")
        assert res.status_code == 200
        data = res.json()
        assert "devices" in data
        assert "total_sessions" in data


class TestEngagement:
    def test_returns_200_with_metrics(self):
        with mock_service("get_engagement", STUB_ENGAGEMENT):
            res = client.get("/api/ga/engagement")
        assert res.status_code == 200
        data = res.json()
        assert "engaged_sessions" in data
        assert "engagement_rate" in data
        assert "events_per_session" in data
        assert "avg_engagement_time" in data


class TestConversions:
    def test_returns_200_with_events(self):
        with mock_service("get_conversions", STUB_CONVERSIONS):
            res = client.get("/api/ga/conversions")
        assert res.status_code == 200
        data = res.json()
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)


class TestRealtime:
    def test_returns_200_with_active_users(self):
        with mock_service("get_realtime", STUB_REALTIME):
            res = client.get("/api/ga/realtime")
        assert res.status_code == 200
        data = res.json()
        assert "active_users" in data
        assert "top_pages" in data
        assert isinstance(data["top_pages"], list)

    def test_realtime_accepts_no_query_params(self):
        """Realtime endpoint should not require any params."""
        with mock_service("get_realtime", STUB_REALTIME):
            res = client.get("/api/ga/realtime")
        assert res.status_code == 200


class TestOpenApiDocs:
    """Verify that all expected routes appear in the OpenAPI schema."""

    EXPECTED_PATHS = [
        "/api/ga/overview",
        "/api/ga/pageviews",
        "/api/ga/traffic-sources",
        "/api/ga/top-pages",
        "/api/ga/demographics",
        "/api/ga/device-breakdown",
        "/api/ga/engagement",
        "/api/ga/conversions",
        "/api/ga/realtime",
    ]

    def test_all_ga_routes_registered(self):
        res = client.get("/openapi.json")
        assert res.status_code == 200
        paths = res.json().get("paths", {})
        for expected in self.EXPECTED_PATHS:
            assert expected in paths, f"Missing route: {expected}"
