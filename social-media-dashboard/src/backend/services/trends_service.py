"""
Competitor-aware trend analysis service.

Flow:
    1. scrape_competitor_pages(urls)   – safe HTTP GET + BeautifulSoup extraction
    2. analyze_with_ai(scraped_data)   – Gemini 2.0-flash structured prompt (lean context)
    3. get_competitor_insights()       – orchestrator with 24-hour MongoDB cache

Token-efficiency rules:
    - Only a compact text summary (~200 chars per page) is sent to Gemini.
    - Fallback data is NEVER cached; only successful AI responses are cached.
    - Cache TTL is 24 h; stale cache triggers a fresh scrape+AI call.
"""
from __future__ import annotations

import json
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup

from core.config import settings
from core.database import db
from models.trends_models import (
    CompetitorInsight,
    CompetitorTrend,
    TrendGrowthPoint,
    TrendSuggestion,
    TrendTrajectory,
    TrendsResponse,
)
from services.competitor_service import COMPETITORS

logger = logging.getLogger(__name__)

# ── HTTP config ───────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}
_TIMEOUT = httpx.Timeout(15.0, connect=8.0)
_MAX_CONCURRENT = 3
_SCRAPE_DELAY = 1.5  # seconds between requests


# ── Safe web scraping ─────────────────────────────────────────────────────────

async def _fetch_page(client: httpx.AsyncClient, url: str) -> str | None:
    """GET a single URL; return HTML or None on failure."""
    try:
        resp = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except Exception as exc:
        logger.warning("scrape failed for %s: %s", url, exc)
        return None


def _extract_lean_summary(html: str, url: str) -> dict[str, Any]:
    """
    Extract a COMPACT summary from an HTML page.

    We intentionally limit extracted text so the Gemini prompt stays small
    and stays within free-tier token limits.
    """
    soup = BeautifulSoup(html, "html.parser")
    meta: dict[str, Any] = {"url": url}

    # Title (truncated)
    title_tag = soup.find("title")
    if title_tag:
        meta["title"] = title_tag.get_text(strip=True)[:120]

    # Meta description only
    desc_tag = soup.find("meta", attrs={"name": "description"})
    if desc_tag and desc_tag.get("content"):
        meta["description"] = str(desc_tag["content"])[:200]

    # Top-level nav category names (max 12, short only)
    nav_links: list[str] = []
    for nav in soup.find_all(["nav", "ul"], limit=3):
        for a in nav.find_all("a", limit=15):
            text = a.get_text(strip=True)
            if text and 2 < len(text) < 40:
                nav_links.append(text)
    if nav_links:
        meta["categories"] = list(dict.fromkeys(nav_links))[:10]

    # First two headings only
    headings: list[str] = []
    for tag in soup.find_all(["h1", "h2"], limit=5):
        text = tag.get_text(strip=True)
        if text and len(text) > 3:
            headings.append(text[:80])
        if len(headings) >= 2:
            break
    if headings:
        meta["headings"] = headings

    # Single bio snippet (strictly capped)
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        if len(text) >= 50:
            meta["snippet"] = text[:250]
            break

    return meta


async def scrape_competitor_pages(urls: list[str]) -> list[dict[str, Any]]:
    """Scrape a list of URLs safely with concurrency & rate limiting."""
    results: list[dict[str, Any]] = []
    sem = asyncio.Semaphore(_MAX_CONCURRENT)

    async def _scrape_one(url: str) -> dict[str, Any] | None:
        async with sem:
            # Create a fresh client for each request or pass the shared one
            async with httpx.AsyncClient(headers=_HEADERS, timeout=_TIMEOUT, follow_redirects=True) as client:
                html = await _fetch_page(client, url)
            if html:
                await asyncio.sleep(_SCRAPE_DELAY)
                return _extract_lean_summary(html, url)
            return None

    tasks = [_scrape_one(u) for u in urls]
    for coro in asyncio.as_completed(tasks):
        res = await coro
        if res:
            results.append(res)
    return results


# ── AI analysis ───────────────────────────────────────────────────────────────

# Lean prompt — context section filled dynamically but each entry is capped ~400 chars
_SYSTEM_PROMPT = """\
You are a social-media and e-commerce trend analyst for "Club Artizen", an Indian
art & design brand selling handcrafted products, artisan goods, and curated hampers.

Analyse the compact competitor website summaries below and return ONLY a raw JSON object
(no markdown fences, no explanation) with exactly these keys:

{
  "trending_topics": [
    {
      "id": "tr-N",
      "category": "<Design|Content|Marketing|Events|Community|Tech|Product>",
      "topic": "<short trend name, max 8 words>",
      "change": <integer growth % estimate>,
      "confidence": <integer 0-100>,
      "signal": "<rising|steady|emerging>",
      "sources": ["<competitor name>"]
    }
  ],
  "suggested_actions": [
    {
      "id": "sa-N",
      "priority": "<high|medium|low>",
      "title": "<action title, max 8 words>",
      "description": "<1-2 sentences>",
      "channel": "<instagram|linkedin|whatsapp>",
      "expected_impact": "<e.g. +30% engagement>",
      "related_trend": "<trend topic name or null>"
    }
  ],
  "trend_trajectories": [
    {
      "label": "<Topic Name>",
      "color": "<Hex Color Code>",
      "data": [
        {"date": "YYYY-MM", "value": <projected interest 0-100>}
      ]
    }
  ],
  "competitor_insights": [
    {
      "competitor_name": "<name>",
      "observation": "<what they do well, 1 sentence>",
      "opportunity": "<what Club Artizen should do, 1 sentence>"
    }
  ]
}

Rules:
- Return 4-6 trending_topics, 3-5 suggested_actions, 1 insight per competitor.
- Focus on: handcraft categories, sustainability, gifting/hampers, artisan storytelling,
  Indian cultural themes, packaging, digital marketing.
- Keep values concise — short strings only.

COMPETITOR SUMMARIES (compact):
"""


def _build_lean_context(scraped_data: list[dict], url_to_name: dict[str, str]) -> str:
    """
    Build a tight text block for the Gemini prompt.
    Each competitor section is strictly bounded to ~400 chars of content.
    """
    sections: list[str] = []
    seen_names: set[str] = set()

    for data in scraped_data:
        name = url_to_name.get(data.get("url", ""), "Unknown")
        if name in seen_names:
            continue  # one section per competitor — no duplicates from multi-URL scraping
        seen_names.add(name)

        parts: list[str] = [f"[{name}]"]
        if data.get("title"):
            parts.append(f"Title: {data['title'][:100]}")
        if data.get("description"):
            parts.append(f"Desc: {data['description'][:150]}")
        if data.get("categories"):
            parts.append(f"Categories: {', '.join(data['categories'][:8])}")
        if data.get("headings"):
            parts.append(f"Headlines: {' | '.join(data['headings'][:2])}")
        if data.get("snippet"):
            parts.append(f"Snippet: {data['snippet'][:200]}")
        sections.append("\n".join(parts))

    return "\n\n".join(sections)


async def _call_groq(prompt: str) -> dict[str, Any] | None:
    """
    Call Groq's free OpenAI-compatible API using httpx.
    Groq free tier: 14,400 requests/day, 6,000 tokens/minute.
    No extra package needed — just set GROQ_API_KEY in .env.
    """
    if not settings.groq_available:
        return None

    try:
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 1500,
            "response_format": {"type": "json_object"},  # forces valid JSON output
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"].strip()

        # Clean up code blocks if the LLM didn't use response_format correctly
        if "```" in text:
            # Extract content between triple backticks if present
            import re
            match = re.search(r"```(?:json)?\n?(.*?)\n?```", text, re.DOTALL)
            if match:
                text = match.group(1).strip()
            else:
                # Fallback to simple removal if regex fails but backticks exist
                text = text.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(text)
        logger.info(
            "Groq returned %d topics, %d actions, %d insights",
            len(parsed.get("trending_topics", [])),
            len(parsed.get("suggested_actions", [])),
            len(parsed.get("competitor_insights", [])),
        )
        return parsed

    except Exception as exc:
        logger.error("Groq analysis failed: %s", exc)
        return None


async def analyze_with_ai(
    scraped_data: list[dict[str, Any]],
    competitor_names: list[str],
) -> dict[str, Any] | None:
    """
    Send lean scraped metadata to an AI and parse the structured response.

    Provider priority (all free-tier):
        1. Gemini 2.0 Flash Lite  (free: 1500 req/day)
        2. Gemini 2.0 Flash       (free: separate quota)
        3. Gemini 2.5 Flash Lite  (free: separate quota)
        4. Groq llama-3.3-70b    (free: 14,400 req/day — fallback)

    If all providers fail the caller falls back to hardcoded data (not cached).
    """
    # Build prompt context from unified registry
    url_to_name: dict[str, str] = {}
    for comp in COMPETITORS:
        web = comp.get("website")
        if web:
            if isinstance(web, list):
                for url in web: url_to_name[url] = comp["name"]
            else:
                url_to_name[web] = comp["name"]

    context = _build_lean_context(scraped_data, url_to_name)
    if not context.strip():
        logger.warning("No scrape context — skipping AI analysis")
        return None

    prompt = f"Today's date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n\n" + _SYSTEM_PROMPT + context
    logger.info("AI prompt size: %d chars (~%d tokens)", len(prompt), len(prompt) // 4)

    # ── 1. Try Gemini (multiple models) ──────────────────────────────────────
    if settings.gemini_available:
        _GEMINI_MODELS = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
        ]
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key)

            for model_name in _GEMINI_MODELS:
                try:
                    logger.info("Trying Gemini model: %s", model_name)
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.4,
                            max_output_tokens=1500,
                        ),
                    )
                    text = response.text.strip()
                    if text.startswith("```"):
                        lines = text.split("\n")
                        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

                    parsed = json.loads(text)
                    logger.info(
                        "Gemini (%s) OK — %d topics, %d actions, %d insights",
                        model_name,
                        len(parsed.get("trending_topics", [])),
                        len(parsed.get("suggested_actions", [])),
                        len(parsed.get("competitor_insights", [])),
                    )
                    return parsed

                except Exception as model_err:
                    err_str = str(model_err)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        logger.warning("Gemini %s quota exhausted, trying next", model_name)
                        continue
                    elif "404" in err_str or "NOT_FOUND" in err_str:
                        logger.warning("Gemini %s not found, trying next", model_name)
                        continue
                    else:
                        logger.error("Gemini %s error: %s", model_name, model_err)
                        break  # non-quota error — stop trying Gemini, go to Groq

        except Exception as setup_err:
            logger.error("Gemini SDK setup failed: %s", setup_err)

    logger.info("All Gemini models failed/exhausted — trying Groq (free fallback)")

    # ── 2. Try Groq (free, no daily cap issues for this scale) ───────────────
    return await _call_groq(prompt)

# ── Cache config ──────────────────────────────────────────────────────────────

CACHE_COLLECTION = "trends_cache"
CACHE_TTL_HOURS = 72  # 3 days — survive Gemini daily quota resets


# ── Cache helpers ─────────────────────────────────────────────────────────────

# In-memory fallback used when MongoDB is unreachable
_mem_cache: dict[str, Any] = {}


async def _get_cached() -> dict[str, Any] | None:
    """Return cached AI insights if fresh enough. Rejects fallback-tagged entries."""
    # ── Try MongoDB first ──
    try:
        col = db.client[settings.database_name][CACHE_COLLECTION]
        doc = await col.find_one({"_id": "latest"}, server_selection_timeout=3000)
        if doc:
            if doc.get("source") == "fallback":
                return None
            cached_at = doc.get("cached_at")
            if cached_at:
                if cached_at.tzinfo is None:
                    cached_at = cached_at.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                    doc.pop("_id", None)
                    doc.pop("cached_at", None)
                    return doc
    except Exception as exc:
        logger.debug("MongoDB cache read skipped (%s) — trying in-memory", exc.__class__.__name__)

    # ── Fall back to in-memory cache ──
    mem = _mem_cache.get("latest")
    if mem:
        cached_at = mem.get("cached_at")
        if cached_at and datetime.now(timezone.utc) - cached_at < timedelta(hours=CACHE_TTL_HOURS):
            result = {k: v for k, v in mem.items() if k not in ("_id", "cached_at")}
            result["source"] = "cache"
            return result
    return None


async def _set_cache(data: dict[str, Any]) -> None:
    """Upsert cached insights. Saves to in-memory always; MongoDB when available."""
    now = datetime.now(timezone.utc)
    # Always persist in-memory so the demo works without MongoDB
    _mem_cache["latest"] = {**data, "cached_at": now}
    logger.info("AI results saved to in-memory cache")

    # Best-effort MongoDB write
    try:
        col = db.client[settings.database_name][CACHE_COLLECTION]
        await col.replace_one(
            {"_id": "latest"},
            {**data, "_id": "latest", "cached_at": now},
            upsert=True,
        )
        logger.info("AI results also persisted to MongoDB")
    except Exception as exc:
        logger.warning("MongoDB cache write skipped (%s) — using in-memory only", exc.__class__.__name__)


# ── Fallback ──────────────────────────────────────────────────────────────────
def _build_fallback() -> dict[str, Any]:
    """Return hardcoded data based on real competitors so the UI always renders."""
    now = datetime.now(timezone.utc).isoformat()
    # Generate dynamic dates for trajectories so it feels "live"
    # Returns 3 months in past, current month, and 1-2 months in future
    traj_data = []
    base_date = datetime.now(timezone.utc)
    for i in range(-3, 2):
        dt = base_date + timedelta(days=i * 30)
        # deterministic-ish random values
        val = 40 + (i * 15) + (hash(str(i)) % 10)
        traj_data.append({"date": dt.strftime("%Y-%m"), "value": max(10, min(100, val))})

    return {
        "trending_topics": [
            {"id": "tr-1", "category": "Product", "topic": "Handwoven Textiles & Block Print Revival", "change": 340, "confidence": 92, "signal": "rising", "sources": ["Jaypore", "iTokri", "Okhai"]},
            {"id": "tr-2", "category": "Marketing", "topic": "Artisan Storytelling & Craft Heritage Content", "change": 260, "confidence": 89, "signal": "rising", "sources": ["Okhai", "GoCoop"]},
            {"id": "tr-3", "category": "Design", "topic": "Sustainable & Upcycled Packaging", "change": 195, "confidence": 87, "signal": "rising", "sources": ["Sirohi", "The Good Road"]},
            {"id": "tr-4", "category": "Community", "topic": "Curated Gifting & Hamper Collections", "change": 155, "confidence": 84, "signal": "rising", "sources": ["The Good Road", "Jaypore"]},
            {"id": "tr-5", "category": "Content", "topic": "Behind-the-Scenes Craft Process Videos", "change": 120, "confidence": 80, "signal": "steady", "sources": ["iTokri", "Okhai"]},
            {"id": "tr-6", "category": "Marketing", "topic": "Cooperative & Fair-Trade Certification Messaging", "change": 90, "confidence": 76, "signal": "emerging", "sources": ["GoCoop", "Sirohi"]},
        ],
        "suggested_actions": [
            {"id": "sa-1", "priority": "high", "title": "Launch Artisan Story Reel Series", "description": "Competitors like Okhai and GoCoop are winning with artisan-forward content. Create weekly Instagram Reels featuring your makers' stories and craft techniques.", "channel": "instagram", "expected_impact": "+55% Reel engagement", "related_trend": "Artisan Storytelling & Craft Heritage Content"},
            {"id": "sa-2", "priority": "high", "title": "Curated Gifting WhatsApp Campaign", "description": "The Good Road is leading in hamper curation. Launch a WhatsApp broadcast campaign showcasing Club Artizen's curated gift sets ahead of festivals.", "channel": "whatsapp", "expected_impact": "+40% conversion on hampers", "related_trend": "Curated Gifting & Hamper Collections"},
            {"id": "sa-3", "priority": "high", "title": "Sustainable Packaging LinkedIn Feature", "description": "Publish a LinkedIn article positioning Club Artizen as a leader in eco-conscious packaging, referencing Sirohi's upcycled materials approach.", "channel": "linkedin", "expected_impact": "+35% professional reach", "related_trend": "Sustainable & Upcycled Packaging"},
            {"id": "sa-4", "priority": "medium", "title": "Block Print Collection Instagram Carousel", "description": "Jaypore and iTokri are seeing massive traction on handwoven and block print content. Create a carousel series highlighting your textile collections.", "channel": "instagram", "expected_impact": "+45% carousel saves", "related_trend": "Handwoven Textiles & Block Print Revival"},
            {"id": "sa-5", "priority": "medium", "title": "Craft Process Behind-the-Scenes Stories", "description": "Post weekly Instagram Stories showing the end-to-end craft process — raw materials to finished product — to differentiate from mass-market competitors.", "channel": "instagram", "expected_impact": "+30% story views", "related_trend": "Behind-the-Scenes Craft Process Videos"},
        ],
        "trend_trajectories": [
            {"label": "Handwoven Textiles", "color": "#E5A100", "data": traj_data},
            {"label": "Artisan Storytelling", "color": "#C75B39", "data": [p.copy() for p in traj_data]},
            {"label": "Sustainable Packaging", "color": "#50B88C", "data": [p.copy() for p in traj_data]},
            {"label": "Gift Hampers", "color": "#9B6AD4", "data": [p.copy() for p in traj_data]},
        ],
        "competitor_insights": [
            {"competitor_name": "Jaypore", "observation": "Dominating the premium handcrafted jewellery and apparel space with strong editorial-style photography and curated collections by craft region.", "opportunity": "Club Artizen can differentiate by adding interactive craft region maps and artisan profiles to match Jaypore's curation depth."},
            {"competitor_name": "Okhai", "observation": "Strong artisan-empowerment narrative with Tata-backed credibility, heavily promoting rural women artisans and cooperative craft communities.", "opportunity": "Lean into your own artisan partnership stories with video content — authenticity over brand backing resonates with younger buyers."},
            {"competitor_name": "iTokri", "observation": "Widest SKU range in handloom and block print textiles; leverages scarcity messaging ('limited pieces') and craft provenance effectively.", "opportunity": "Adopt scarcity and provenance messaging for limited-edition drops to drive urgency and collectibility."},
            {"competitor_name": "GoCoop", "observation": "Positioning as a cooperative marketplace with fair-trade and sustainability certifications front and centre.", "opportunity": "Pursue or prominently feature fair-trade/sustainability credentials to compete with GoCoop in the conscious-consumer segment."},
            {"competitor_name": "Sirohi", "observation": "Niche leader in upcycled waste-material packaging and eco products — strong B2B gifting angle for corporates.", "opportunity": "Develop a dedicated corporate gifting line with upcycled/eco packaging to tap Sirohi's underserved B2B market."},
            {"competitor_name": "The Good Road", "observation": "Curated hampers and gifting bundles are their hero product — strong seasonal campaigns (Diwali, weddings) drive repeat purchases.", "opportunity": "Launch Club Artizen signature hampers with a story card featuring the artisans behind each item — this personalisation edge is missing from The Good Road."},
        ],
        "last_updated": now,
        "source": "fallback",
    }


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def get_competitor_insights(force_refresh: bool = False) -> TrendsResponse:
    """
    Main entry point.

    1.  Check cache (skip if force_refresh). NOTE: cached fallback is rejected.
    2.  Scrape competitor pages (lean extraction only)
    3.  Analyse with Gemini (compact prompt, low token usage)
    4.  Cache only AI results; serve fallback without caching

    Falls back to hardcoded data on any failure so the UI always renders.
    """
    # 1. Cache check (fallback is never served from cache)
    if not force_refresh:
        cached = await _get_cached()
        if cached:
            cached["source"] = "cache"
            logger.info("Serving trends from cache")
            return TrendsResponse(**cached)

    # 2. Scrape all competitor URLs from the unified registry
    all_urls: list[str] = []
    names: list[str] = []
    for comp in COMPETITORS:
        # Use primary website URL. 
        # Support both single string and legacy list if needed, but DB-based are strings.
        web = comp.get("website")
        if web:
            if isinstance(web, list):
                all_urls.extend(web)
            else:
                all_urls.append(web)
            names.append(comp["name"])

    logger.info("Scraping %d URLs for %d competitors from registry", len(all_urls), len(names))
    scraped = await scrape_competitor_pages(all_urls)
    logger.info("Successfully scraped %d pages", len(scraped))

    # 3. AI analysis (only if we have scrape data)
    ai_result = await analyze_with_ai(scraped, names) if scraped else None

    if ai_result:
        fallback = _build_fallback()
        result = {
            "trending_topics": ai_result.get("trending_topics", fallback["trending_topics"]),
            "suggested_actions": ai_result.get("suggested_actions", fallback["suggested_actions"]),
            "trend_trajectories": ai_result.get("trend_trajectories", fallback["trend_trajectories"]),
            "competitor_insights": ai_result.get("competitor_insights", fallback["competitor_insights"]),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "ai",
        }
        await _set_cache(result)  # ← only cache real AI results
        logger.info("Trends analysis complete — source: ai")
        return TrendsResponse(**result)

    # 4. Fallback — NOT cached so next request retries AI
    logger.info("Using fallback competitor data (not caching)")
    return TrendsResponse(**_build_fallback())