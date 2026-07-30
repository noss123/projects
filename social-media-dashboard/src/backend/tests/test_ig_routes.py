"""Tests for Instagram Analytics API routes — fixture/stub mode."""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

DAYS_PARAMS = [
    {},           # default (30 days)
    {"days": 7},
    {"days": 90},
]


# ── /api/ig/overview ─────────────────────────────────────────────────────────

class TestOverview:
    def test_returns_200(self):
        r = client.get("/api/ig/overview")
        assert r.status_code == 200

    def test_response_schema(self):
        data = client.get("/api/ig/overview").json()
        for field in ("followers", "followers_change", "reach", "impressions",
                       "engagement_rate", "profile_visits", "period_days"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.parametrize("params", DAYS_PARAMS)
    def test_respects_days_param(self, params):
        r = client.get("/api/ig/overview", params=params)
        assert r.status_code == 200
        assert r.json()["period_days"] == params.get("days", 30)

    def test_invalid_days_rejected(self):
        r = client.get("/api/ig/overview", params={"days": -1})
        assert r.status_code == 422


# ── /api/ig/reach ────────────────────────────────────────────────────────────

class TestReach:
    def test_returns_200(self):
        r = client.get("/api/ig/reach")
        assert r.status_code == 200

    def test_series_present(self):
        data = client.get("/api/ig/reach").json()
        assert "series" in data
        assert isinstance(data["series"], list)
        assert len(data["series"]) > 0
        assert "total" in data


# ── /api/ig/impressions ──────────────────────────────────────────────────────

class TestImpressions:
    def test_returns_200(self):
        r = client.get("/api/ig/impressions")
        assert r.status_code == 200

    def test_response_schema(self):
        data = client.get("/api/ig/impressions").json()
        assert "series" in data
        assert "total" in data


# ── /api/ig/top-posts ────────────────────────────────────────────────────────

class TestTopPosts:
    def test_returns_200(self):
        r = client.get("/api/ig/top-posts")
        assert r.status_code == 200

    def test_posts_schema(self):
        data = client.get("/api/ig/top-posts").json()
        assert "posts" in data
        post = data["posts"][0]
        for field in ("post_id", "caption", "post_type", "published",
                       "likes", "comments", "reach", "impressions"):
            assert field in post, f"Missing field: {field}"


# ── /api/ig/demographics ─────────────────────────────────────────────────────

class TestDemographics:
    def test_returns_200(self):
        r = client.get("/api/ig/demographics")
        assert r.status_code == 200

    def test_response_schema(self):
        data = client.get("/api/ig/demographics").json()
        for key in ("by_age", "by_gender", "by_city", "by_country"):
            assert key in data, f"Missing key: {key}"
            assert isinstance(data[key], list)


# ── /api/ig/engagement ───────────────────────────────────────────────────────

class TestEngagement:
    def test_returns_200(self):
        r = client.get("/api/ig/engagement")
        assert r.status_code == 200

    def test_series_and_avg(self):
        data = client.get("/api/ig/engagement").json()
        assert "series" in data
        assert "avg_engagement_rate" in data


# ── /api/ig/follower-growth ──────────────────────────────────────────────────

class TestFollowerGrowth:
    def test_returns_200(self):
        r = client.get("/api/ig/follower-growth")
        assert r.status_code == 200

    def test_series_and_net(self):
        data = client.get("/api/ig/follower-growth").json()
        assert "series" in data
        assert "net_change" in data


# ── /api/ig/stories ──────────────────────────────────────────────────────────

class TestStories:
    def test_returns_200(self):
        r = client.get("/api/ig/stories")
        assert r.status_code == 200

    def test_stories_schema(self):
        data = client.get("/api/ig/stories").json()
        assert "stories" in data
        story = data["stories"][0]
        for field in ("story_id", "published", "reach", "impressions",
                       "replies", "exits", "taps_forward", "taps_back"):
            assert field in story, f"Missing field: {field}"


# ── /api/ig/content-breakdown ────────────────────────────────────────────────

class TestContentBreakdown:
    def test_returns_200(self):
        r = client.get("/api/ig/content-breakdown")
        assert r.status_code == 200

    def test_breakdown_schema(self):
        data = client.get("/api/ig/content-breakdown").json()
        assert "breakdown" in data
        item = data["breakdown"][0]
        for field in ("content_type", "count", "avg_reach", "avg_engagement_rate"):
            assert field in item, f"Missing field: {field}"
