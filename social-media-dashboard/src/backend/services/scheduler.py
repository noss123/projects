"""
Background scheduler for periodic competitor scraping.

Runs `get_competitor_insights(force_refresh=True)` on a configurable interval
(default: every 6 hours) so the predictive trends data is always pre-computed
and served instantly from cache.

Usage (wired into FastAPI lifespan in main.py):
    from services.scheduler import trends_scheduler
    await trends_scheduler.start()
    ...
    await trends_scheduler.stop()
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from core.config import settings

logger = logging.getLogger(__name__)

# ── Shared state (read by the status endpoint) ─────────────────────────────────

_state: dict[str, Any] = {
    "last_run": None,          # ISO string or None
    "next_run": None,          # ISO string or None
    "last_status": "pending",  # pending | running | ok | error
    "last_error": None,        # last error message or None
    "interval_hours": settings.scrape_interval_hours,
}


def get_scheduler_status() -> dict[str, Any]:
    """Return a snapshot of the scheduler state (used by the status route)."""
    return {**_state}


# ── Job ────────────────────────────────────────────────────────────────────────

async def _run_scrape_job() -> None:
    """The periodic job: scrape + AI analysis, update cache."""
    # Import here to avoid circular imports at module load time
    from services.trends_service import get_competitor_insights

    _state["last_status"] = "running"
    _state["last_error"] = None
    logger.info("Scheduled trends scrape starting…")

    try:
        result = await get_competitor_insights(force_refresh=True)
        _state["last_run"] = datetime.now(timezone.utc).isoformat()
        _state["last_status"] = "ok"
        logger.info(
            "Scheduled trends scrape complete — source: %s, topics: %d",
            result.source,
            len(result.trending_topics),
        )
    except Exception as exc:
        _state["last_run"] = datetime.now(timezone.utc).isoformat()
        _state["last_status"] = "error"
        _state["last_error"] = str(exc)
        logger.error("Scheduled trends scrape failed: %s", exc)
    finally:
        # Always update next_run in shared state after a job attempt
        trends_scheduler.update_next_run()


# ── Scheduler wrapper ──────────────────────────────────────────────────────────

class _TrendsScheduler:
    def __init__(self) -> None:
        self._scheduler: AsyncIOScheduler | None = None

    async def start(self) -> None:
        """Start the APScheduler AsyncIOScheduler and register the scrape job."""
        interval_h = settings.scrape_interval_hours
        _state["interval_hours"] = interval_h

        self._scheduler = AsyncIOScheduler()
        # Set next_run_time to now so it fires immediately upon start()
        # then reschedules according to the interval.
        first_run = datetime.now(timezone.utc)
        
        self._scheduler.add_job(
            _run_scrape_job,
            trigger="interval",
            hours=interval_h,
            id="competitor_scrape",
            replace_existing=True,
            next_run_time=first_run, 
        )
        self._scheduler.start()

        # Capture next_run time right after starting
        job = self._scheduler.get_job("competitor_scrape")
        if job and job.next_run_time:
            _state["next_run"] = job.next_run_time.isoformat()

        logger.info(
            "Trends scheduler started — interval: %dh, next run: %s",
            interval_h,
            _state["next_run"],
        )

        # Kick off an immediate first scrape in the background so the cache is
        # populated as soon as the server starts (without blocking startup)
        asyncio.create_task(_initial_scrape())

    async def stop(self) -> None:
        """Gracefully shut down the scheduler."""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Trends scheduler stopped")

    def update_next_run(self) -> None:
        """Refresh the next_run state from the live scheduler (called after each job run)."""
        if self._scheduler:
            job = self._scheduler.get_job("competitor_scrape")
            if job and job.next_run_time:
                _state["next_run"] = job.next_run_time.isoformat()


async def _initial_scrape() -> None:
    """Runs once at startup (10-second delay) to warm the cache."""
    await asyncio.sleep(10)
    logger.info("Initial trends scrape (cache warm-up)…")
    await _run_scrape_job()
    # Update next_run display after the initial scrape completes
    trends_scheduler.update_next_run()


# Singleton exported for use in main.py
trends_scheduler = _TrendsScheduler()
