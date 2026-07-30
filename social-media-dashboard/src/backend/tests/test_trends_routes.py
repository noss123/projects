"""
Unit tests for the Competitor Trends API routes.

The trends service layer is mocked so NO real Gemini API key or network
access is required.

Run:
    cd src/backend
    pytest tests/test_trends_routes.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app
from models.trends_models import TrendsResponse

client = TestClient(app)

# ── Shared stub payloads ──────────────────────────────────────────────────────

STUB_INSIGHTS = TrendsResponse(
    trending_topics=[
        {
            "id": "tr-1",
            "category": "Design",
            "topic": "Pastel Shades as Wedding Themes",
            "change": 320,
            "confidence": 94,
            "signal": "rising",
            "sources": ["ArtHouse Studios"],
        },
        {
            "id": "tr-2",
            "category": "Content",
            "topic": "AI-Generated Art Collaborations",
            "change": 280,
            "confidence": 92,
            "signal": "rising",
            "sources": ["Creative Collective"],
        },
    ],
    suggested_actions=[
        {
            "id": "sa-1",
            "priority": "high",
            "title": "Launch Pastel Wedding Theme Reel Series",
            "description": "Create a Reel series on pastel wedding themes.",
            "channel": "instagram",
            "expected_impact": "+50% Reel engagement",
            "related_trend": "Pastel Shades as Wedding Themes",
        }
    ],
    trend_trajectories=[
        {
            "label": "Pastel Wedding Themes",
            "color": "#E5A100",
            "data": [
                {"date": "2026-01", "value": 15},
                {"date": "2026-02", "value": 32},
            ],
        }
    ],
    competitor_insights=[
        {
            "competitor_name": "ArtHouse Studios",
            "observation": "Heavily promoting pastel wedding décor content.",
            "opportunity": "Create a competing pastel art series.",
        }
    ],
    last_updated="2026-04-01T00:00:00+00:00",
    source="fallback",
)


# ── Helper ────────────────────────────────────────────────────────────────────

def mock_insights(return_value=STUB_INSIGHTS, side_effect=None):
    """Patch the get_competitor_insights coroutine."""
    mock = AsyncMock(return_value=return_value, side_effect=side_effect)
    return patch("routes.trends_routes.ts.get_competitor_insights", mock)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestInsights:
    def test_returns_200_with_valid_shape(self):
        with mock_insights():
            res = client.get("/api/trends/insights")
        assert res.status_code == 200
        data = res.json()
        assert "trending_topics" in data
        assert "suggested_actions" in data
        assert "trend_trajectories" in data
        assert "competitor_insights" in data
        assert "last_updated" in data
        assert "source" in data

    def test_trending_topics_structure(self):
        with mock_insights():
            res = client.get("/api/trends/insights")
        data = res.json()
        topics = data["trending_topics"]
        assert isinstance(topics, list)
        assert len(topics) >= 1
        topic = topics[0]
        assert "id" in topic
        assert "category" in topic
        assert "topic" in topic
        assert "change" in topic
        assert "confidence" in topic
        assert "signal" in topic
        assert "sources" in topic

    def test_suggested_actions_structure(self):
        with mock_insights():
            res = client.get("/api/trends/insights")
        data = res.json()
        actions = data["suggested_actions"]
        assert isinstance(actions, list)
        assert len(actions) >= 1
        action = actions[0]
        assert "priority" in action
        assert "title" in action
        assert "channel" in action
        assert "expected_impact" in action

    def test_competitor_insights_structure(self):
        with mock_insights():
            res = client.get("/api/trends/insights")
        data = res.json()
        insights = data["competitor_insights"]
        assert isinstance(insights, list)
        assert len(insights) >= 1
        ci = insights[0]
        assert "competitor_name" in ci
        assert "observation" in ci
        assert "opportunity" in ci

    def test_service_error_returns_503(self):
        with mock_insights(side_effect=RuntimeError("service down")):
            res = client.get("/api/trends/insights")
        assert res.status_code == 503


class TestTrending:
    def test_returns_200_with_topics(self):
        with mock_insights():
            res = client.get("/api/trends/trending")
        assert res.status_code == 200
        data = res.json()
        assert "topics" in data
        assert "source" in data
        assert isinstance(data["topics"], list)

    def test_service_error_returns_503(self):
        with mock_insights(side_effect=RuntimeError("boom")):
            res = client.get("/api/trends/trending")
        assert res.status_code == 503


class TestRefresh:
    def test_returns_200_on_success(self):
        with mock_insights():
            res = client.post("/api/trends/refresh")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "message" in data
        assert "source" in data

    def test_service_error_returns_503(self):
        with mock_insights(side_effect=RuntimeError("fail")):
            res = client.post("/api/trends/refresh")
        assert res.status_code == 503


class TestOpenApiDocs:
    """Verify that all trends routes appear in the OpenAPI schema."""

    EXPECTED_PATHS = [
        "/api/trends/insights",
        "/api/trends/trending",
        "/api/trends/refresh",
    ]

    def test_all_trends_routes_registered(self):
        res = client.get("/openapi.json")
        assert res.status_code == 200
        paths = res.json().get("paths", {})
        for expected in self.EXPECTED_PATHS:
            assert expected in paths, f"Missing route: {expected}"
