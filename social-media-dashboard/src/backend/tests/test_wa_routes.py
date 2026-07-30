"""Tests for WhatsApp Business Analytics API routes — fixture/stub mode."""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

DAYS_PARAMS = [
    {},           # default (30 days)
    {"days": 7},
    {"days": 90},
]


# ── /api/wa/overview ─────────────────────────────────────────────────────────

class TestOverview:
    def test_returns_200(self):
        r = client.get("/api/wa/overview")
        assert r.status_code == 200

    def test_response_schema(self):
        data = client.get("/api/wa/overview").json()
        for field in ("conversations", "messages_sent", "messages_received",
                       "messages_delivered", "delivery_rate", "messages_read",
                       "read_rate", "avg_response_time_minutes", "period_days"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.parametrize("params", DAYS_PARAMS)
    def test_respects_days_param(self, params):
        r = client.get("/api/wa/overview", params=params)
        assert r.status_code == 200
        assert r.json()["period_days"] == params.get("days", 30)

    def test_invalid_days_rejected(self):
        r = client.get("/api/wa/overview", params={"days": 0})
        assert r.status_code == 422


# ── /api/wa/message-volume ───────────────────────────────────────────────────

class TestMessageVolume:
    def test_returns_200(self):
        r = client.get("/api/wa/message-volume")
        assert r.status_code == 200

    def test_series_present(self):
        data = client.get("/api/wa/message-volume").json()
        assert "series" in data
        assert isinstance(data["series"], list)
        assert "total_sent" in data
        assert "total_received" in data


# ── /api/wa/conversations ────────────────────────────────────────────────────

class TestConversations:
    def test_returns_200(self):
        r = client.get("/api/wa/conversations")
        assert r.status_code == 200

    def test_response_schema(self):
        data = client.get("/api/wa/conversations").json()
        assert "series" in data
        assert "total" in data
        assert "user_initiated" in data
        assert "business_initiated" in data


# ── /api/wa/template-performance ─────────────────────────────────────────────

class TestTemplatePerformance:
    def test_returns_200(self):
        r = client.get("/api/wa/template-performance")
        assert r.status_code == 200

    def test_templates_schema(self):
        data = client.get("/api/wa/template-performance").json()
        assert "templates" in data
        tmpl = data["templates"][0]
        for field in ("template_name", "sent", "delivered", "read",
                       "delivery_rate", "read_rate", "category"):
            assert field in tmpl, f"Missing field: {field}"


# ── /api/wa/response-time ────────────────────────────────────────────────────

class TestResponseTime:
    def test_returns_200(self):
        r = client.get("/api/wa/response-time")
        assert r.status_code == 200

    def test_percentiles_present(self):
        data = client.get("/api/wa/response-time").json()
        assert "avg_minutes" in data
        assert "median_minutes" in data
        assert "p95_minutes" in data
        assert "series" in data


# ── /api/wa/quality ──────────────────────────────────────────────────────────

class TestQuality:
    def test_returns_200(self):
        r = client.get("/api/wa/quality")
        assert r.status_code == 200

    def test_quality_schema(self):
        data = client.get("/api/wa/quality").json()
        for field in ("quality_rating", "messaging_limit",
                       "phone_number_status", "current_tier"):
            assert field in data, f"Missing field: {field}"

    def test_no_days_param(self):
        """Quality endpoint does not accept days; returns static info."""
        r = client.get("/api/wa/quality")
        assert r.status_code == 200


# ── /api/wa/message-distribution ─────────────────────────────────────────────

class TestMessageDistribution:
    def test_returns_200(self):
        r = client.get("/api/wa/message-distribution")
        assert r.status_code == 200

    def test_24_hours(self):
        data = client.get("/api/wa/message-distribution").json()
        assert "hourly" in data
        assert len(data["hourly"]) == 24
        assert "busiest_hour" in data
        assert "quietest_hour" in data


# ── /api/wa/limitations ──────────────────────────────────────────────────────

class TestLimitations:
    def test_returns_200(self):
        r = client.get("/api/wa/limitations")
        assert r.status_code == 200

    def test_limitations_schema(self):
        data = client.get("/api/wa/limitations").json()
        assert "unsupported" in data
        assert "note" in data
        item = data["unsupported"][0]
        assert "metric" in item
        assert "reason" in item
