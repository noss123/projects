"""
Unit tests for the Competitor Metrics API routes.

The competitor service layer is mocked so NO real network access is required.

Run:
    cd src/backend
    pytest tests/test_competitor_routes.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app
from models.competitor_models import CompetitorsResponse

client = TestClient(app)

# ── Shared stub payload ───────────────────────────────────────────────────────

STUB_COMPETITORS = CompetitorsResponse(
    competitors=[
        {
            "id": "comp-1",
            "name": "Jaypore",
            "handle": "@jaypore",
            "metrics": {
                "facebook": 125000,
                "instagram": 892000,
                "linkedin": 18500,
                "youtube": 12400,
                "engagement": 3.8,
                "posts_per_week": 14,
                "growth": 5.2,
            },
            "growth_trend": [
                {"date": "2026-01-01", "value": 845000},
                {"date": "2026-02-01", "value": 892000},
            ],
        },
        {
            "id": "comp-2",
            "name": "Okhai",
            "handle": "@okhai_org",
            "metrics": {
                "facebook": 42000,
                "instagram": 67500,
                "linkedin": 8200,
                "youtube": 3100,
                "engagement": 4.5,
                "posts_per_week": 8,
                "growth": 6.8,
            },
            "growth_trend": [
                {"date": "2026-01-01", "value": 58000},
                {"date": "2026-02-01", "value": 67500},
            ],
        },
    ],
    last_updated="2026-04-01T00:00:00+00:00",
    source="fallback",
)


# ── Helper ────────────────────────────────────────────────────────────────────

def mock_competitors(return_value=STUB_COMPETITORS, side_effect=None):
    """Patch the get_competitors coroutine."""
    mock = AsyncMock(return_value=return_value, side_effect=side_effect)
    return patch("routes.competitor_routes.cs.get_competitors", mock)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestGetCompetitors:
    def test_returns_200_with_valid_shape(self):
        with mock_competitors():
            res = client.get("/api/competitors")
        assert res.status_code == 200
        data = res.json()
        assert "competitors" in data
        assert "last_updated" in data
        assert "source" in data

    def test_competitors_structure(self):
        with mock_competitors():
            res = client.get("/api/competitors")
        data = res.json()
        comps = data["competitors"]
        assert isinstance(comps, list)
        assert len(comps) >= 1
        comp = comps[0]
        assert "id" in comp
        assert "name" in comp
        assert "handle" in comp
        assert "metrics" in comp
        assert "growth_trend" in comp

    def test_metrics_fields(self):
        with mock_competitors():
            res = client.get("/api/competitors")
        data = res.json()
        metrics = data["competitors"][0]["metrics"]
        assert "instagram" in metrics
        assert "facebook" in metrics
        assert "linkedin" in metrics
        assert "youtube" in metrics
        assert "engagement" in metrics
        assert "posts_per_week" in metrics
        assert "growth" in metrics

    def test_service_error_returns_503(self):
        with mock_competitors(side_effect=RuntimeError("service down")):
            res = client.get("/api/competitors")
        assert res.status_code == 503


class TestRefreshCompetitors:
    def test_returns_200_on_success(self):
        with mock_competitors():
            res = client.post("/api/competitors/refresh")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "message" in data
        assert "source" in data

    def test_service_error_returns_503(self):
        with mock_competitors(side_effect=RuntimeError("fail")):
            res = client.post("/api/competitors/refresh")
        assert res.status_code == 503


class TestOpenApiDocs:
    """Verify that all competitor routes appear in the OpenAPI schema."""

    EXPECTED_PATHS = [
        "/api/competitors",
        "/api/competitors/refresh",
    ]

    def test_all_competitor_routes_registered(self):
        res = client.get("/openapi.json")
        assert res.status_code == 200
        paths = res.json().get("paths", {})
        for expected in self.EXPECTED_PATHS:
            assert expected in paths, f"Missing route: {expected}"
