#!/usr/bin/env python3
"""
Simulation test harness — exercises every analytics endpoint and validates
HTTP status + JSON structure using FastAPI's TestClient (no running server).

Usage:
    python scripts/test_live_simulation.py          # all platforms
    python scripts/test_live_simulation.py linkedin  # one platform

Exit code 0 if all probes pass, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass, field

# ── bootstrap: ensure src/backend is importable ─────────────────────────────
from pathlib import Path
backend = Path(__file__).resolve().parent.parent / "src" / "backend"
sys.path.insert(0, str(backend))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@dataclass
class ProbeResult:
    endpoint: str
    status: int
    ok: bool
    detail: str = ""
    duration_ms: float = 0


@dataclass
class PlatformReport:
    name: str
    results: list[ProbeResult] = field(default_factory=list)

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.ok)

    @property
    def failed(self) -> int:
        return len(self.results) - self.passed


def probe(endpoint: str, required_keys: list[str] | None = None, params: dict | None = None) -> ProbeResult:
    """Hit an endpoint, check 200 and optionally required top-level keys."""
    t0 = time.perf_counter()
    try:
        r = client.get(endpoint, params=params or {})
        ms = (time.perf_counter() - t0) * 1000
        if r.status_code != 200:
            return ProbeResult(endpoint, r.status_code, False, f"Non-200: {r.text[:120]}", ms)
        data = r.json()
        if required_keys:
            missing = [k for k in required_keys if k not in data]
            if missing:
                return ProbeResult(endpoint, 200, False, f"Missing keys: {missing}", ms)
        return ProbeResult(endpoint, 200, True, "OK", ms)
    except Exception as exc:
        ms = (time.perf_counter() - t0) * 1000
        return ProbeResult(endpoint, 0, False, str(exc), ms)


# ── Platform definitions ─────────────────────────────────────────────────────

GA_PROBES = [
    ("/api/ga/overview", ["sessions", "users", "pageviews"]),
    ("/api/ga/pageviews", ["series", "total"]),
    ("/api/ga/traffic-sources", ["sources", "total_sessions"]),
    ("/api/ga/top-pages", ["pages"]),
    ("/api/ga/demographics", ["by_country", "by_age"]),
    ("/api/ga/device-breakdown", ["devices", "total_sessions"]),
    ("/api/ga/engagement", ["engaged_sessions", "engagement_rate"]),
    ("/api/ga/conversions", ["events", "total"]),
    ("/api/ga/realtime", ["active_users", "top_pages"]),
]

YT_PROBES = [
    ("/api/yt/overview", ["subscribers", "total_views", "total_videos"]),
    ("/api/yt/views", ["series", "total"]),
    ("/api/yt/subscriber-growth", ["series", "net_change"]),
    ("/api/yt/watch-time", ["series", "total_hours"]),
    ("/api/yt/top-videos", None),
    ("/api/yt/demographics", None),
    ("/api/yt/traffic-sources", None),
    ("/api/yt/engagement", None),
    ("/api/yt/revenue", ["series", "total_revenue"]),
    ("/api/yt/content-performance", None),
]

LI_PROBES = [
    ("/api/li/overview", ["total_followers", "total_page_views", "total_post_impressions", "avg_engagement_rate"]),
    ("/api/li/posts", ["posts"]),
    ("/api/li/demographics", ["total_followers", "demographics"]),
    ("/api/li/page-traffic", ["traffic_data"]),
]

IG_PROBES = [
    ("/api/ig/overview", ["followers", "reach", "impressions", "engagement_rate", "period_days"]),
    ("/api/ig/reach", ["series", "total"]),
    ("/api/ig/impressions", ["series", "total"]),
    ("/api/ig/top-posts", ["posts"]),
    ("/api/ig/demographics", ["by_age", "by_gender", "by_city", "by_country"]),
    ("/api/ig/engagement", ["series", "avg_engagement_rate"]),
    ("/api/ig/follower-growth", ["series", "net_change"]),
    ("/api/ig/stories", ["stories"]),
    ("/api/ig/content-breakdown", ["breakdown"]),
]

WA_PROBES = [
    ("/api/wa/overview", ["conversations", "messages_sent", "messages_delivered", "period_days"]),
    ("/api/wa/message-volume", ["series", "total_sent", "total_received"]),
    ("/api/wa/conversations", ["series", "total", "user_initiated"]),
    ("/api/wa/template-performance", ["templates"]),
    ("/api/wa/response-time", ["series", "avg_minutes", "p95_minutes"]),
    ("/api/wa/quality", ["quality_rating", "messaging_limit"]),
    ("/api/wa/message-distribution", ["hourly", "busiest_hour"]),
    ("/api/wa/limitations", ["unsupported", "note"]),
]

PLATFORMS = {
    "google_analytics": ("Google Analytics", GA_PROBES),
    "youtube": ("YouTube", YT_PROBES),
    "linkedin": ("LinkedIn", LI_PROBES),
    "instagram": ("Instagram", IG_PROBES),
    "whatsapp": ("WhatsApp", WA_PROBES),
}


def run_platform(name: str, probes: list[tuple]) -> PlatformReport:
    report = PlatformReport(name)
    for endpoint, keys in probes:
        result = probe(endpoint, keys)
        report.results.append(result)
    return report


def print_report(report: PlatformReport) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {report.name}  —  {report.passed}/{len(report.results)} passed")
    print(f"{'─' * 60}")
    for r in report.results:
        icon = "✅" if r.ok else "❌"
        print(f"  {icon}  [{r.status:3d}]  {r.endpoint:40s}  {r.duration_ms:6.1f}ms  {r.detail}")


def main():
    parser = argparse.ArgumentParser(description="Hit all analytics endpoints and validate responses.")
    parser.add_argument("platforms", nargs="*", default=list(PLATFORMS.keys()), help="Platform(s) to test.")
    args = parser.parse_args()

    reports: list[PlatformReport] = []
    for key in args.platforms:
        if key not in PLATFORMS:
            print(f"⚠  Unknown platform '{key}'. Available: {', '.join(PLATFORMS)}")
            continue
        name, probes = PLATFORMS[key]
        reports.append(run_platform(name, probes))

    for r in reports:
        print_report(r)

    total_pass = sum(r.passed for r in reports)
    total_fail = sum(r.failed for r in reports)
    total = total_pass + total_fail

    print(f"\n{'=' * 60}")
    print(f"  TOTAL: {total_pass}/{total} passed", end="")
    if total_fail:
        print(f"  ({total_fail} FAILED)")
    else:
        print("  — all green! 🎉")
    print(f"{'=' * 60}\n")

    sys.exit(1 if total_fail else 0)


if __name__ == "__main__":
    main()
