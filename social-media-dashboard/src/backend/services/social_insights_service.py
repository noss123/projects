"""Instagram/Facebook insights service (native backend implementation)."""

from __future__ import annotations

import csv
import io
import re
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from pymongo.errors import PyMongoError
import xlrd

from core.config import settings
from core.database import db
from models.social_insights_models import (
    FacebookDashboardLayoutResponse,
    InstagramDashboardLayoutResponse,
    InstagramDashboardWidgetInstance,
    InstagramPostInsightDocument,
    LinkedInChannelInsightDocument,
    LinkedInDashboardLayoutResponse,
    LinkedInPostInsightDocument,
)

ENCODING_CANDIDATES = (
    "utf-8-sig",
    "utf-16",
    "utf-16le",
    "utf-16be",
    "latin-1",
)

PRIMARY_COLUMN_ALIASES = {"primary", "value", "values"}
VALID_PERIODS = {"day", "week", "days_28", "month", "lifetime", "total_over_range"}

INSTAGRAM_METRIC_NAME_ALIASES = {
    "interactions": "content_interactions",
    "linkclicks": "instagram_link_clicks",
    "link_clicks": "instagram_link_clicks",
    "visits": "instagram_profile_visits",
    "follows": "instagram_follows",
}

FACEBOOK_METRIC_NAME_ALIASES = {
    "interactions": "content_interactions",
    "linkclicks": "facebook_link_clicks",
    "link_clicks": "facebook_link_clicks",
    "visits": "facebook_visits",
    "follows": "facebook_follows",
}

INSTAGRAM_METRIC_QUERY_ALIASES = {
    "total_interactions": "content_interactions",
    "profile_links_taps": "instagram_link_clicks",
    "accounts_engaged": "instagram_profile_visits",
    "additional_follows": "instagram_follows",
}

FACEBOOK_METRIC_QUERY_ALIASES = {
    "total_interactions": "content_interactions",
    "profile_links_taps": "facebook_link_clicks",
    "accounts_engaged": "viewers",
    "additional_follows": "facebook_follows",
}

LINKEDIN_METRIC_NAME_ALIASES = {
    "impressions": "impressions_total",
    "clicks": "clicks_total",
    "reactions": "reactions_total",
    "comments": "comments_total",
    "reposts": "reposts_total",
    "engagement_rate": "engagement_rate_total",
    "unique_impressions": "unique_impressions_organic",
}

LINKEDIN_METRIC_QUERY_ALIASES = {
    "impressions": "impressions_total",
    "clicks": "clicks_total",
    "reactions": "reactions_total",
    "comments": "comments_total",
    "reposts": "reposts_total",
    "engagement_rate": "engagement_rate_total",
    "ctr": "engagement_rate_total",
    "unique_impressions": "unique_impressions_organic",
}

INSTAGRAM_METRIC_META = {
    "views": {
        "title": "Views",
        "description": "Total number of times the content was viewed.",
    },
    "reach": {
        "title": "Reach",
        "description": "Number of unique Instagram accounts that saw the content.",
    },
    "content_interactions": {
        "title": "Content interactions",
        "description": "Interactions such as likes, saves, comments, and shares.",
    },
    "instagram_link_clicks": {
        "title": "Instagram link clicks",
        "description": "Number of taps/clicks on links from Instagram.",
    },
    "instagram_profile_visits": {
        "title": "Instagram profile visits",
        "description": "Number of profile visits.",
    },
    "instagram_follows": {
        "title": "Instagram follows",
        "description": "Number of followers gained.",
    },
}

FACEBOOK_METRIC_META = {
    "views": {
        "title": "Views",
        "description": "Total number of times the content was viewed.",
    },
    "viewers": {
        "title": "Viewers",
        "description": "Number of unique Facebook viewers.",
    },
    "content_interactions": {
        "title": "Content interactions",
        "description": "Interactions such as reactions, comments, and shares.",
    },
    "facebook_link_clicks": {
        "title": "Facebook link clicks",
        "description": "Number of taps/clicks on links from Facebook content.",
    },
    "facebook_visits": {
        "title": "Facebook visits",
        "description": "Number of page visits on Facebook.",
    },
    "facebook_follows": {
        "title": "Facebook follows",
        "description": "Number of followers gained on Facebook.",
    },
}

LINKEDIN_METRIC_META = {
    "impressions_organic": {
        "title": "Impressions (organic)",
        "description": "Organic impressions across LinkedIn content.",
    },
    "impressions_sponsored": {
        "title": "Impressions (sponsored)",
        "description": "Sponsored impressions across LinkedIn content.",
    },
    "impressions_total": {
        "title": "Impressions (total)",
        "description": "Total impressions across organic and sponsored content.",
    },
    "unique_impressions_organic": {
        "title": "Unique impressions (organic)",
        "description": "Unique organic member impressions.",
    },
    "clicks_organic": {
        "title": "Clicks (organic)",
        "description": "Organic clicks on LinkedIn content.",
    },
    "clicks_sponsored": {
        "title": "Clicks (sponsored)",
        "description": "Sponsored clicks on LinkedIn content.",
    },
    "clicks_total": {
        "title": "Clicks (total)",
        "description": "Total clicks across organic and sponsored content.",
    },
    "reactions_organic": {
        "title": "Reactions (organic)",
        "description": "Organic reactions on LinkedIn posts.",
    },
    "reactions_sponsored": {
        "title": "Reactions (sponsored)",
        "description": "Sponsored reactions on LinkedIn posts.",
    },
    "reactions_total": {
        "title": "Reactions (total)",
        "description": "Total reactions across organic and sponsored posts.",
    },
    "comments_organic": {
        "title": "Comments (organic)",
        "description": "Organic comments on LinkedIn posts.",
    },
    "comments_sponsored": {
        "title": "Comments (sponsored)",
        "description": "Sponsored comments on LinkedIn posts.",
    },
    "comments_total": {
        "title": "Comments (total)",
        "description": "Total comments across organic and sponsored posts.",
    },
    "reposts_organic": {
        "title": "Reposts (organic)",
        "description": "Organic reposts on LinkedIn posts.",
    },
    "reposts_sponsored": {
        "title": "Reposts (sponsored)",
        "description": "Sponsored reposts on LinkedIn posts.",
    },
    "reposts_total": {
        "title": "Reposts (total)",
        "description": "Total reposts across organic and sponsored posts.",
    },
    "engagement_rate_organic": {
        "title": "Engagement rate (organic)",
        "description": "Organic engagement rate across LinkedIn posts.",
    },
    "engagement_rate_sponsored": {
        "title": "Engagement rate (sponsored)",
        "description": "Sponsored engagement rate across LinkedIn posts.",
    },
    "engagement_rate_total": {
        "title": "Engagement rate (total)",
        "description": "Total engagement rate across organic and sponsored posts.",
    },
}

INSTAGRAM_POST_METRIC_HEADER_ALIASES = {
    "views": "views",
    "likes": "likes",
    "shares": "shares",
    "comments": "comments",
    "saves": "saved",
    "saved": "saved",
    "reach": "reach",
    "follows": "follows",
}

INSTAGRAM_POST_METRIC_QUERY_ALIASES = {
    "save": "saved",
    "saves": "saved",
    "saved": "saved",
}

LINKEDIN_POST_METRIC_HEADER_ALIASES = {
    "impressions": "impressions",
    "views": "views",
    "offsite_views": "offsite_views",
    "clicks": "clicks",
    "click_through_rate_ctr": "click_through_rate",
    "likes": "likes",
    "comments": "comments",
    "reposts": "reposts",
    "follows": "follows",
    "engagement_rate": "engagement_rate",
}

LINKEDIN_POST_METRIC_QUERY_ALIASES = {
    "ctr": "click_through_rate",
    "click_through_rate_ctr": "click_through_rate",
    "offsite_views": "offsite_views",
}

INSTAGRAM_POST_METRIC_META = {
    "views": {
        "title": "Views",
        "description": "Total number of times the media has been seen.",
    },
    "likes": {
        "title": "Likes",
        "description": "Number of likes on the media object.",
    },
    "comments": {
        "title": "Comments",
        "description": "Number of comments on the media object.",
    },
    "shares": {
        "title": "Shares",
        "description": "Number of shares of the media object.",
    },
    "saved": {
        "title": "Saved",
        "description": "Number of times the media object was saved.",
    },
    "reach": {
        "title": "Reach",
        "description": "Number of unique Instagram users that have seen the media object.",
    },
    "follows": {
        "title": "Follows",
        "description": "Number of Instagram users following the account from this media.",
    },
    "total_interactions": {
        "title": "Total interactions",
        "description": (
            "Total interactions (likes, comments, shares, and saved) computed "
            "from imported post metrics."
        ),
    },
}

LINKEDIN_POST_METRIC_META = {
    "impressions": {
        "title": "Impressions",
        "description": "Total post impressions on LinkedIn.",
    },
    "views": {
        "title": "Views",
        "description": "Total video/views metric for the post.",
    },
    "offsite_views": {
        "title": "Offsite views",
        "description": "Off-platform views attributed to the post.",
    },
    "clicks": {
        "title": "Clicks",
        "description": "Total clicks for the post.",
    },
    "click_through_rate": {
        "title": "Click-through rate",
        "description": "Click-through rate for the post.",
    },
    "likes": {
        "title": "Likes",
        "description": "Total likes/reactions for the post.",
    },
    "comments": {
        "title": "Comments",
        "description": "Total comments for the post.",
    },
    "reposts": {
        "title": "Reposts",
        "description": "Total reposts for the post.",
    },
    "follows": {
        "title": "Follows",
        "description": "Follows attributed to the post.",
    },
    "engagement_rate": {
        "title": "Engagement rate",
        "description": "Engagement rate for the post.",
    },
    "total_interactions": {
        "title": "Total interactions",
        "description": "Likes + comments + reposts for the post.",
    },
}

INSTAGRAM_POST_ALLOWED_METRICS_BY_MEDIA_PRODUCT = {
    "FEED": {"views", "likes", "comments", "shares", "saved", "reach", "follows", "total_interactions"},
    "REELS": {"views", "likes", "comments", "shares", "saved", "reach", "total_interactions"},
    "STORY": {"views", "reach", "follows", "shares", "total_interactions"},
}

def _metric_name_aliases(platform: str) -> dict[str, str]:
    if platform == "instagram":
        return INSTAGRAM_METRIC_NAME_ALIASES
    if platform == "facebook":
        return FACEBOOK_METRIC_NAME_ALIASES
    return LINKEDIN_METRIC_NAME_ALIASES


def _get_collection(platform: str):
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    if platform == "instagram":
        collection_name = settings.instagram_collection_name
    elif platform == "facebook":
        collection_name = settings.facebook_collection_name
    elif platform == "linkedin":
        collection_name = settings.linkedin_collection_name
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{platform}'.")

    return db.client[settings.database_name][collection_name]


async def _get_instagram_posts_collection():
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    collection = db.client[settings.database_name][settings.instagram_posts_collection_name]
    try:
        await collection.create_index("post_id", unique=True, name="instagram_post_id_unique")
        await collection.create_index("ig_user_id", name="instagram_post_ig_user_id")
        await collection.create_index("publish_time", name="instagram_post_publish_time")
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database index setup failed: {exc}") from exc

    return collection


async def _get_instagram_layout_collection():
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    collection = db.client[settings.database_name][settings.instagram_dashboard_layout_collection_name]
    try:
        await collection.create_index(
            [("ig_user_id", 1), ("dashboard_user_id", 1)],
            unique=True,
            name="instagram_dashboard_layout_user_unique",
        )
        await collection.create_index("updated_at", name="instagram_dashboard_layout_updated_at")
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database index setup failed: {exc}") from exc

    return collection


async def _get_facebook_layout_collection():
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    collection = db.client[settings.database_name][settings.facebook_dashboard_layout_collection_name]
    try:
        await collection.create_index(
            [("fb_user_id", 1), ("dashboard_user_id", 1)],
            unique=True,
            name="facebook_dashboard_layout_user_unique",
        )
        await collection.create_index("updated_at", name="facebook_dashboard_layout_updated_at")
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database index setup failed: {exc}") from exc

    return collection


async def _get_linkedin_posts_collection():
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    collection = db.client[settings.database_name][settings.linkedin_posts_collection_name]
    try:
        await collection.create_index(
            [("li_org_id", 1), ("post_id", 1)],
            unique=True,
            name="linkedin_post_org_post_unique",
        )
        await collection.create_index("li_org_id", name="linkedin_post_li_org_id")
        await collection.create_index("created_date", name="linkedin_post_created_date")
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database index setup failed: {exc}") from exc

    return collection


async def _get_linkedin_layout_collection():
    if db.client is None:
        raise HTTPException(status_code=503, detail="Database is not initialized.")

    collection = db.client[settings.database_name][settings.linkedin_dashboard_layout_collection_name]
    try:
        await collection.create_index(
            [("li_org_id", 1), ("dashboard_user_id", 1)],
            unique=True,
            name="linkedin_dashboard_layout_user_unique",
        )
        await collection.create_index("updated_at", name="linkedin_dashboard_layout_updated_at")
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database index setup failed: {exc}") from exc

    return collection


def normalize_metric_name(value: str, aliases: dict[str, str] | None = None) -> str:
    value = value.strip().lower()
    normalized = []
    previous_was_separator = False

    for character in value:
        if character.isalnum():
            normalized.append(character)
            previous_was_separator = False
        elif not previous_was_separator:
            normalized.append("_")
            previous_was_separator = True

    result = "".join(normalized).strip("_")
    if aliases is None:
        return result
    return aliases.get(result, result)


def parse_date_value(value: str) -> datetime:
    text = value.strip().strip('"')
    if not text:
        raise ValueError("Date value is empty.")

    try:
        timestamp = float(text)
        parsed = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    except ValueError:
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            for date_format in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    parsed = datetime.strptime(text, date_format)
                    break
                except ValueError:
                    continue
            else:
                raise ValueError(
                    f"Unsupported date '{text}'. Use ISO-8601, YYYY-MM-DD, or Unix timestamp."
                )

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def parse_numeric_value(value: str) -> int | float:
    text = value.strip().strip('"')
    if not text:
        raise ValueError("Numeric value is empty.")

    cleaned = text.replace(",", "")
    number = float(cleaned)
    if number.is_integer():
        return int(number)
    return number


def decode_csv_bytes(content: bytes) -> str:
    for encoding in ENCODING_CANDIDATES:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to decode CSV. Supported encodings include UTF-8 and UTF-16.")


def _is_zip_payload(content: bytes) -> bool:
    return zipfile.is_zipfile(io.BytesIO(content))


def _is_supported_zip_csv_member(member: zipfile.ZipInfo) -> bool:
    if member.is_dir():
        return False

    member_path = PurePosixPath(member.filename)
    if member_path.suffix.lower() != ".csv":
        return False

    for part in member_path.parts:
        if not part:
            continue
        if part == "__MACOSX":
            return False
        if part.startswith(".") or part.startswith("._"):
            return False

    return True


def _load_csv_rows(content: bytes) -> list[list[str]]:
    decoded = decode_csv_bytes(content)
    lines = [line for line in decoded.splitlines() if line.strip()]
    if not lines:
        raise ValueError("CSV is empty.")

    delimiter = ","
    first_line = lines[0].strip().lstrip("\ufeff")
    if first_line.lower().startswith("sep="):
        declared_delimiter = first_line.split("=", 1)[1].strip()
        delimiter = declared_delimiter or ","
        lines = lines[1:]

    reader = csv.reader(lines, delimiter=delimiter)
    rows = [[cell.strip().lstrip("\ufeff") for cell in row] for row in reader]
    rows = [row for row in rows if any(cell.strip() for cell in row)]
    if not rows:
        raise ValueError("CSV has no usable rows.")
    return rows


def _open_xls_workbook(source_name: str, content: bytes) -> xlrd.book.Book:
    try:
        return xlrd.open_workbook(file_contents=content)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"{source_name}: invalid .xls workbook.") from exc


def _xls_cell_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if value is None:
        return ""
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return str(value)
    return str(value).strip()


def _is_na_marker(text: str) -> bool:
    normalized = text.strip().upper()
    return normalized in {"NA", "N/A", "NONE", "-", "--"}


def _find_sheet_header_row(
    sheet: xlrd.sheet.Sheet,
    *,
    source_name: str,
    sheet_name: str,
    required_headers: set[str],
) -> int:
    scan_limit = min(40, sheet.nrows)
    for row_idx in range(scan_limit):
        available_headers = {
            normalize_metric_name(_xls_cell_text(sheet.cell_value(row_idx, col_idx)))
            for col_idx in range(sheet.ncols)
            if _xls_cell_text(sheet.cell_value(row_idx, col_idx))
        }
        if required_headers.issubset(available_headers):
            return row_idx

    required_columns = ", ".join(sorted(required_headers))
    raise ValueError(
        f"{source_name}: sheet '{sheet_name}' is missing required columns: {required_columns}."
    )


def _parse_xls_date_cell(
    *,
    sheet: xlrd.sheet.Sheet,
    row_idx: int,
    col_idx: int,
    source_name: str,
    column_name: str,
) -> datetime | None:
    cell = sheet.cell(row_idx, col_idx)
    if cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        return None

    raw_value = cell.value
    if cell.ctype in (xlrd.XL_CELL_DATE, xlrd.XL_CELL_NUMBER):
        try:
            parsed = xlrd.xldate_as_datetime(float(raw_value), sheet.book.datemode)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc).replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )
        except (TypeError, ValueError, OverflowError):
            pass

    raw_text = _xls_cell_text(raw_value)
    if not raw_text:
        return None

    try:
        return parse_date_value(raw_text)
    except ValueError as exc:
        raise ValueError(
            f"{source_name}: invalid date '{raw_text}' for '{column_name}' at row {row_idx + 1}."
        ) from exc


def _parse_xls_optional_number(
    *,
    value: Any,
    source_name: str,
    row_number: int,
    column_name: str,
) -> int | float | None:
    if value is None:
        return None

    if isinstance(value, bool):
        return int(value)

    if isinstance(value, (int, float)):
        return _coerce_number(float(value))

    raw_text = _xls_cell_text(value)
    if not raw_text or _is_na_marker(raw_text):
        return None

    try:
        return parse_numeric_value(raw_text)
    except ValueError as exc:
        raise ValueError(
            f"{source_name}: invalid number '{raw_text}' for '{column_name}' at row {row_number}."
        ) from exc


def _extract_linkedin_post_id(post_link: str) -> str:
    link = post_link.strip()
    if not link:
        return ""

    activity_match = re.search(r"activity:(\d+)", link)
    if activity_match:
        return activity_match.group(1)

    ugc_match = re.search(r"ugcPost:(\d+)", link)
    if ugc_match:
        return ugc_match.group(1)

    return link


def _parse_linkedin_metrics_xls(
    *,
    source_name: str,
    workbook: xlrd.book.Book,
    li_org_id: str,
) -> tuple[dict[datetime, dict[str, int | float]], set[str]]:
    try:
        sheet = workbook.sheet_by_name("Metrics")
    except xlrd.biffh.XLRDError as exc:
        raise ValueError(f"{source_name}: missing required sheet 'Metrics'.") from exc

    header_row_idx = _find_sheet_header_row(
        sheet,
        source_name=source_name,
        sheet_name="Metrics",
        required_headers={"date", "impressions_organic", "impressions_total"},
    )

    header_row = [_xls_cell_text(sheet.cell_value(header_row_idx, col_idx)) for col_idx in range(sheet.ncols)]
    normalized_headers = [normalize_metric_name(column) for column in header_row]

    try:
        date_idx = normalized_headers.index("date")
    except ValueError as exc:
        raise ValueError(f"{source_name}: sheet 'Metrics' is missing required 'Date' column.") from exc

    metric_columns: dict[int, str] = {}
    for col_idx, column_name in enumerate(header_row):
        if col_idx == date_idx:
            continue
        if not column_name:
            continue
        metric_key = normalize_metric_name(column_name, LINKEDIN_METRIC_NAME_ALIASES)
        if not metric_key or metric_key == "date":
            continue
        metric_columns[col_idx] = metric_key

    if not metric_columns:
        raise ValueError(f"{source_name}: sheet 'Metrics' does not contain metric columns.")

    updates_by_date: dict[datetime, dict[str, int | float]] = defaultdict(dict)
    discovered_metrics: set[str] = set()

    for row_idx in range(header_row_idx + 1, sheet.nrows):
        if all(
            sheet.cell(row_idx, col_idx).ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK)
            for col_idx in range(sheet.ncols)
        ):
            continue

        parsed_date = _parse_xls_date_cell(
            sheet=sheet,
            row_idx=row_idx,
            col_idx=date_idx,
            source_name=source_name,
            column_name=header_row[date_idx] or "Date",
        )
        if parsed_date is None:
            continue

        metric_updates: dict[str, int | float] = {}
        for col_idx, metric_key in metric_columns.items():
            parsed_value = _parse_xls_optional_number(
                value=sheet.cell_value(row_idx, col_idx),
                source_name=source_name,
                row_number=row_idx + 1,
                column_name=header_row[col_idx] or f"column_{col_idx + 1}",
            )
            if parsed_value is None:
                continue
            metric_updates[metric_key] = parsed_value

        if not metric_updates:
            continue

        merged_updates = dict(updates_by_date[parsed_date])
        merged_updates.update(metric_updates)
        LinkedInChannelInsightDocument(
            li_org_id=li_org_id,
            date=parsed_date,
            metrics=merged_updates,
        )
        updates_by_date[parsed_date] = merged_updates
        discovered_metrics.update(metric_updates.keys())

    return updates_by_date, discovered_metrics


def _parse_linkedin_posts_xls(
    *,
    source_name: str,
    workbook: xlrd.book.Book,
    li_org_id: str,
) -> tuple[list[LinkedInPostInsightDocument], list[str]]:
    try:
        sheet = workbook.sheet_by_name("All posts")
    except xlrd.biffh.XLRDError as exc:
        raise ValueError(f"{source_name}: missing required sheet 'All posts'.") from exc

    header_row_idx = _find_sheet_header_row(
        sheet,
        source_name=source_name,
        sheet_name="All posts",
        required_headers={"post_title", "post_link", "created_date", "impressions", "clicks"},
    )
    headers = [_xls_cell_text(sheet.cell_value(header_row_idx, col_idx)) for col_idx in range(sheet.ncols)]
    header_map: dict[str, int] = {}
    for col_idx, header in enumerate(headers):
        normalized_header = normalize_metric_name(header)
        if normalized_header and normalized_header not in header_map:
            header_map[normalized_header] = col_idx

    post_link_idx = header_map.get("post_link")
    if post_link_idx is None:
        raise ValueError(f"{source_name}: sheet 'All posts' is missing required 'Post link' column.")

    metric_columns: dict[int, str] = {}
    for normalized_header, metric_key in LINKEDIN_POST_METRIC_HEADER_ALIASES.items():
        col_idx = header_map.get(normalized_header)
        if col_idx is None:
            continue
        metric_columns[col_idx] = metric_key

    if not metric_columns:
        raise ValueError(f"{source_name}: sheet 'All posts' has no supported metric columns.")

    documents_by_post_id: dict[str, LinkedInPostInsightDocument] = {}
    discovered_metrics: set[str] = set()

    for row_idx in range(header_row_idx + 1, sheet.nrows):
        if all(
            sheet.cell(row_idx, col_idx).ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK)
            for col_idx in range(sheet.ncols)
        ):
            continue

        post_link = _xls_cell_text(sheet.cell_value(row_idx, post_link_idx))
        if not post_link:
            raise ValueError(f"{source_name}: missing Post link at row {row_idx + 1}.")

        post_id = _extract_linkedin_post_id(post_link)
        if not post_id:
            raise ValueError(f"{source_name}: invalid Post link at row {row_idx + 1}.")

        metrics: dict[str, int | float | str] = {}
        for col_idx, metric_key in metric_columns.items():
            header_name = headers[col_idx] or f"column_{col_idx + 1}"
            cell = sheet.cell(row_idx, col_idx)
            parsed_value = _parse_xls_optional_number(
                value=cell.value,
                source_name=source_name,
                row_number=row_idx + 1,
                column_name=header_name,
            )
            if parsed_value is None:
                metrics[metric_key] = "NA"
            else:
                metrics[metric_key] = parsed_value

        interaction_values: list[float] = []
        for key in ("likes", "comments", "reposts"):
            raw_value = metrics.get(key)
            if isinstance(raw_value, (int, float)):
                interaction_values.append(float(raw_value))

        if interaction_values:
            metrics["total_interactions"] = _coerce_number(sum(interaction_values))
        else:
            metrics["total_interactions"] = "NA"

        discovered_metrics.update(metrics.keys())

        def _cell_text_or_none(header_key: str) -> str | None:
            column_index = header_map.get(header_key)
            if column_index is None:
                return None
            value = _xls_cell_text(sheet.cell_value(row_idx, column_index))
            return value or None

        created_date = None
        created_date_idx = header_map.get("created_date")
        if created_date_idx is not None:
            created_date = _parse_xls_date_cell(
                sheet=sheet,
                row_idx=row_idx,
                col_idx=created_date_idx,
                source_name=source_name,
                column_name=headers[created_date_idx] or "Created date",
            )

        campaign_start_date = None
        campaign_start_idx = header_map.get("campaign_start_date")
        if campaign_start_idx is not None:
            campaign_start_date = _parse_xls_date_cell(
                sheet=sheet,
                row_idx=row_idx,
                col_idx=campaign_start_idx,
                source_name=source_name,
                column_name=headers[campaign_start_idx] or "Campaign start date",
            )

        campaign_end_date = None
        campaign_end_idx = header_map.get("campaign_end_date")
        if campaign_end_idx is not None:
            campaign_end_date = _parse_xls_date_cell(
                sheet=sheet,
                row_idx=row_idx,
                col_idx=campaign_end_idx,
                source_name=source_name,
                column_name=headers[campaign_end_idx] or "Campaign end date",
            )

        document = LinkedInPostInsightDocument(
            post_id=post_id,
            li_org_id=li_org_id,
            title=_cell_text_or_none("post_title"),
            post_link=post_link,
            post_type=_cell_text_or_none("post_type"),
            campaign_name=_cell_text_or_none("campaign_name"),
            posted_by=_cell_text_or_none("posted_by"),
            created_date=created_date,
            campaign_start_date=campaign_start_date,
            campaign_end_date=campaign_end_date,
            audience=_cell_text_or_none("audience"),
            content_type=_cell_text_or_none("content_type") or "Other",
            period="lifetime",
            metrics=metrics,
        )
        documents_by_post_id[post_id] = document

    if not documents_by_post_id:
        raise ValueError(f"{source_name}: sheet 'All posts' has no data rows.")

    return list(documents_by_post_id.values()), sorted(discovered_metrics)


def _parse_csv_content(
    source_name: str,
    content: bytes,
    metric_aliases: dict[str, str],
) -> tuple[dict[datetime, dict[str, int | float]], set[str]]:
    rows = _load_csv_rows(content)

    metric_title = ""
    if len(rows[0]) == 1:
        candidate_title = rows[0][0].strip().strip('"')
        if normalize_metric_name(candidate_title) != "date":
            metric_title = candidate_title
            rows = rows[1:]

    if len(rows) < 2:
        raise ValueError(f"{source_name}: CSV is missing a header row or data rows.")

    header_row = [column.strip().strip('"') for column in rows[0]]
    normalized_headers = [normalize_metric_name(column) for column in header_row]

    try:
        date_index = normalized_headers.index("date")
    except ValueError as exc:
        raise ValueError(f"{source_name}: missing required 'Date' column.") from exc

    value_indices = [
        index
        for index, column_name in enumerate(header_row)
        if index != date_index and column_name.strip()
    ]
    if not value_indices:
        raise ValueError(f"{source_name}: no metric columns were found.")

    metric_keys: dict[int, str] = {}
    for index in value_indices:
        metric_key = normalize_metric_name(header_row[index], metric_aliases)
        if len(value_indices) == 1 and metric_key in PRIMARY_COLUMN_ALIASES:
            fallback = metric_title or Path(source_name).stem
            metric_key = normalize_metric_name(fallback, metric_aliases)

        if not metric_key or metric_key == "date":
            raise ValueError(f"{source_name}: invalid metric column '{header_row[index]}'.")
        metric_keys[index] = metric_key

    updates_by_date: dict[datetime, dict[str, int | float]] = defaultdict(dict)

    for row_number, row in enumerate(rows[1:], start=2):
        if len(row) < len(header_row):
            row = row + [""] * (len(header_row) - len(row))

        raw_date = row[date_index].strip().strip('"')
        if not raw_date:
            continue

        try:
            normalized_date = parse_date_value(raw_date)
        except ValueError as exc:
            raise ValueError(
                f"{source_name}: invalid date '{raw_date}' at row {row_number}."
            ) from exc

        metric_updates: dict[str, int | float] = {}
        for column_index, metric_key in metric_keys.items():
            raw_value = row[column_index].strip().strip('"') if column_index < len(row) else ""
            if not raw_value:
                continue

            try:
                metric_updates[metric_key] = parse_numeric_value(raw_value)
            except ValueError as exc:
                column_name = header_row[column_index] or f"column_{column_index + 1}"
                raise ValueError(
                    f"{source_name}: invalid number '{raw_value}' for '{column_name}' at row {row_number}."
                ) from exc

        if metric_updates:
            updates_by_date[normalized_date].update(metric_updates)

    return updates_by_date, set(metric_keys.values())


def expand_csv_payloads(uploaded_files: list[tuple[str, bytes]]) -> list[tuple[str, bytes]]:
    expanded_payloads: list[tuple[str, bytes]] = []

    for source_name, content in uploaded_files:
        lower_name = source_name.lower()
        if lower_name.endswith(".zip") or _is_zip_payload(content):
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as archive:
                    zip_csv_members = [
                        member
                        for member in archive.infolist()
                        if _is_supported_zip_csv_member(member)
                    ]
                    if not zip_csv_members:
                        raise ValueError(f"{source_name}: ZIP does not contain any CSV files.")

                    for member in zip_csv_members:
                        member_content = archive.read(member)
                        member_name = f"{source_name}:{member.filename}"
                        expanded_payloads.append((member_name, member_content))
            except zipfile.BadZipFile as exc:
                raise ValueError(f"{source_name}: invalid ZIP file.") from exc
            continue

        if lower_name.endswith(".csv"):
            expanded_payloads.append((source_name, content))
            continue

        raise ValueError(
            f"{source_name}: unsupported file type. Upload CSV files or a ZIP of CSV files."
        )

    return expanded_payloads


def merge_csv_updates(
    csv_payloads: list[tuple[str, bytes]],
    metric_aliases: dict[str, str],
) -> tuple[dict[datetime, dict[str, int | float]], int, list[str]]:
    merged_updates: dict[datetime, dict[str, int | float]] = defaultdict(dict)
    discovered_metrics: set[str] = set()

    for source_name, content in csv_payloads:
        file_updates, metric_keys = _parse_csv_content(source_name, content, metric_aliases)
        discovered_metrics.update(metric_keys)

        for date_key, metric_updates in file_updates.items():
            merged_updates[date_key].update(metric_updates)

    return merged_updates, len(csv_payloads), sorted(discovered_metrics)


def _parse_instagram_post_publish_time(
    raw_value: str,
    source_name: str,
    row_number: int,
) -> datetime | None:
    text = raw_value.strip().strip('"')
    if not text:
        return None

    for date_format in ("%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S"):
        try:
            parsed = datetime.strptime(text, date_format)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(
            f"{source_name}: invalid publish time '{text}' at row {row_number}."
        ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _post_csv_cell(
    row: dict[str, str | None],
    header_map: dict[str, str],
    normalized_header: str,
) -> str:
    source_column = header_map.get(normalized_header)
    if not source_column:
        return ""
    return (row.get(source_column) or "").strip().strip('"')


def _parse_optional_post_number(
    *,
    raw_value: str,
    source_name: str,
    row_number: int,
    column_name: str,
) -> int | float | None:
    if not raw_value:
        return None

    try:
        return parse_numeric_value(raw_value)
    except ValueError as exc:
        raise ValueError(
            f"{source_name}: invalid number '{raw_value}' for '{column_name}' at row {row_number}."
        ) from exc


def _parse_instagram_posts_csv(
    source_name: str,
    content: bytes,
    ig_user_id: str,
) -> tuple[list[InstagramPostInsightDocument], list[str]]:
    decoded = decode_csv_bytes(content)
    reader = csv.DictReader(io.StringIO(decoded))
    if reader.fieldnames is None:
        raise ValueError(f"{source_name}: CSV is missing a header row.")

    header_map: dict[str, str] = {}
    for raw_header in reader.fieldnames:
        if not raw_header:
            continue
        normalized_header = normalize_metric_name(raw_header)
        if normalized_header and normalized_header not in header_map:
            header_map[normalized_header] = raw_header

    if "post_id" not in header_map:
        raise ValueError(f"{source_name}: missing required 'Post ID' column.")

    metric_columns: dict[str, str] = {}
    for normalized_header, metric_key in INSTAGRAM_POST_METRIC_HEADER_ALIASES.items():
        source_column = header_map.get(normalized_header)
        if source_column and metric_key not in metric_columns:
            metric_columns[metric_key] = source_column

    if not metric_columns:
        raise ValueError(
            f"{source_name}: no supported metric columns found. "
            "Expected at least one of Views, Likes, Shares, Comments, Saves, Reach, Follows."
        )

    documents_by_post_id: dict[str, InstagramPostInsightDocument] = {}
    discovered_metrics: set[str] = set()

    for row_number, row in enumerate(reader, start=2):
        post_id = _post_csv_cell(row, header_map, "post_id")
        if not post_id:
            raise ValueError(f"{source_name}: missing Post ID at row {row_number}.")

        metrics: dict[str, int | float] = {}
        for metric_key, source_column in metric_columns.items():
            raw_value = (row.get(source_column) or "").strip().strip('"')
            parsed_value = _parse_optional_post_number(
                raw_value=raw_value,
                source_name=source_name,
                row_number=row_number,
                column_name=source_column,
            )
            if parsed_value is None:
                continue
            metrics[metric_key] = parsed_value

        interaction_keys = ("likes", "comments", "shares", "saved")
        interaction_values = [float(metrics[key]) for key in interaction_keys if key in metrics]
        if interaction_values:
            metrics["total_interactions"] = _coerce_number(sum(interaction_values))

        discovered_metrics.update(metrics.keys())

        publish_time_value = _post_csv_cell(row, header_map, "publish_time")
        publish_time = _parse_instagram_post_publish_time(
            publish_time_value,
            source_name,
            row_number,
        )

        duration_sec = _parse_optional_post_number(
            raw_value=_post_csv_cell(row, header_map, "duration_sec"),
            source_name=source_name,
            row_number=row_number,
            column_name="Duration (sec)",
        )

        post_document = InstagramPostInsightDocument(
            post_id=post_id,
            ig_user_id=ig_user_id,
            account_id=_post_csv_cell(row, header_map, "account_id") or None,
            account_username=_post_csv_cell(row, header_map, "account_username") or None,
            account_name=_post_csv_cell(row, header_map, "account_name") or None,
            description=_post_csv_cell(row, header_map, "description") or None,
            duration_sec=duration_sec,
            publish_time=publish_time,
            permalink=_post_csv_cell(row, header_map, "permalink") or None,
            post_type=_post_csv_cell(row, header_map, "post_type") or None,
            data_comment=_post_csv_cell(row, header_map, "data_comment") or None,
            period=(_post_csv_cell(row, header_map, "date").lower() or "lifetime"),
            metrics=metrics,
        )
        documents_by_post_id[post_id] = post_document

    if not documents_by_post_id:
        raise ValueError(f"{source_name}: no data rows were found.")

    return list(documents_by_post_id.values()), sorted(discovered_metrics)


def _infer_instagram_media_product_type(post_type: str | None) -> str:
    normalized = normalize_metric_name(post_type or "")
    if "reel" in normalized:
        return "REELS"
    if "story" in normalized:
        return "STORY"
    return "FEED"


def _normalize_instagram_post_metric_query(metric_name: str) -> str:
    normalized = normalize_metric_name(metric_name)
    if not normalized:
        return normalized
    return INSTAGRAM_POST_METRIC_QUERY_ALIASES.get(normalized, normalized)


def _normalize_linkedin_post_metric_query(metric_name: str) -> str:
    normalized = normalize_metric_name(metric_name)
    if not normalized:
        return normalized
    return LINKEDIN_POST_METRIC_QUERY_ALIASES.get(normalized, normalized)


def _validate_requested_linkedin_post_metrics(metric: str | None) -> list[str] | None:
    if metric is None:
        return None

    requested_metrics = [item.strip() for item in metric.split(",") if item.strip()]
    if not requested_metrics:
        return None

    supported_metrics = set(LINKEDIN_POST_METRIC_META.keys())
    normalized_metrics: list[str] = []
    for requested_metric in requested_metrics:
        normalized_metric = _normalize_linkedin_post_metric_query(requested_metric)
        if normalized_metric not in supported_metrics:
            supported = ",".join(sorted(supported_metrics))
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported metric '{requested_metric}'. Supported metrics: {supported}.",
            )
        if normalized_metric not in normalized_metrics:
            normalized_metrics.append(normalized_metric)

    return normalized_metrics


def _selected_linkedin_post_metrics(
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> list[str]:
    if requested_metrics is not None:
        return requested_metrics

    stored_metrics = post_document.get("metrics")
    if isinstance(stored_metrics, dict):
        available = [
            metric_name
            for metric_name in stored_metrics.keys()
            if metric_name in LINKEDIN_POST_METRIC_META
        ]
        if available:
            return sorted(set(available))

    return sorted(LINKEDIN_POST_METRIC_META.keys())


def _linkedin_post_metric_payload(
    *,
    post_document: dict[str, Any],
    metric: str,
    response_metric: str,
    linkedin_post_id: str,
) -> dict[str, Any]:
    metric_meta = _metric_meta(metric, LINKEDIN_POST_METRIC_META)
    values: list[dict[str, int | float | str]] = []
    stored_metrics = post_document.get("metrics")
    if isinstance(stored_metrics, dict):
        raw_value = stored_metrics.get(metric)
        if isinstance(raw_value, str) and _is_na_marker(raw_value):
            values = [{"value": "NA"}]
        elif raw_value is not None:
            try:
                values = [{"value": _coerce_number(float(raw_value))}]
            except (TypeError, ValueError):
                values = []

    return {
        "name": response_metric,
        "period": "lifetime",
        "values": values,
        "title": metric_meta["title"],
        "description": metric_meta["description"],
        "id": f"{linkedin_post_id}/insights/{response_metric}/lifetime",
    }


def _linkedin_post_insights_for_single_document(
    *,
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> list[dict[str, Any]]:
    post_id = str(post_document.get("post_id") or "")
    metric_keys = _selected_linkedin_post_metrics(post_document, requested_metrics)
    return [
        _linkedin_post_metric_payload(
            post_document=post_document,
            metric=metric_key,
            response_metric=metric_key,
            linkedin_post_id=post_id,
        )
        for metric_key in metric_keys
    ]


def _case_insensitive_exact_match(value: str) -> dict[str, str]:
    return {"$regex": f"^{re.escape(value)}$", "$options": "i"}


def _post_metrics_with_derived_interactions(
    post_document: dict[str, Any],
) -> dict[str, int | float]:
    stored_metrics = post_document.get("metrics")
    if not isinstance(stored_metrics, dict):
        return {}

    metrics = dict(stored_metrics)
    if "total_interactions" in metrics:
        return metrics

    interaction_keys = ("likes", "comments", "shares", "saved")
    interaction_values: list[float] = []
    for key in interaction_keys:
        raw_value = metrics.get(key)
        if raw_value is None:
            continue
        try:
            interaction_values.append(float(raw_value))
        except (TypeError, ValueError):
            continue

    if interaction_values:
        metrics["total_interactions"] = _coerce_number(sum(interaction_values))

    return metrics


def _validate_requested_post_metrics(metric: str | None) -> list[str] | None:
    if metric is None:
        return None

    requested_metrics = [item.strip() for item in metric.split(",") if item.strip()]
    if not requested_metrics:
        return None

    supported_metrics = set(INSTAGRAM_POST_METRIC_META.keys())
    normalized_metrics: list[str] = []
    for requested_metric in requested_metrics:
        normalized_metric = _normalize_instagram_post_metric_query(requested_metric)
        if normalized_metric not in supported_metrics:
            supported = ",".join(sorted(supported_metrics))
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported metric '{requested_metric}'. Supported metrics: {supported}.",
            )
        if normalized_metric not in normalized_metrics:
            normalized_metrics.append(normalized_metric)

    return normalized_metrics


def _selected_post_metrics(
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> list[str]:
    if requested_metrics is not None:
        return requested_metrics

    media_product_type = _infer_instagram_media_product_type(post_document.get("post_type"))
    allowed_metrics = INSTAGRAM_POST_ALLOWED_METRICS_BY_MEDIA_PRODUCT.get(
        media_product_type,
        set(INSTAGRAM_POST_METRIC_META.keys()),
    )

    metrics = _post_metrics_with_derived_interactions(post_document)
    available_metrics = [
        metric_name
        for metric_name in metrics.keys()
        if metric_name in INSTAGRAM_POST_METRIC_META and metric_name in allowed_metrics
    ]

    if available_metrics:
        return sorted(set(available_metrics))

    return sorted(allowed_metrics)


def _instagram_post_metric_payload(
    *,
    post_document: dict[str, Any],
    metric: str,
    response_metric: str,
    instagram_media_id: str,
) -> dict[str, Any]:
    metric_meta = _metric_meta(metric, INSTAGRAM_POST_METRIC_META)
    media_product_type = _infer_instagram_media_product_type(post_document.get("post_type"))
    allowed_metrics = INSTAGRAM_POST_ALLOWED_METRICS_BY_MEDIA_PRODUCT.get(media_product_type, set())

    values: list[dict[str, int | float]] = []
    if metric in allowed_metrics:
        metrics = _post_metrics_with_derived_interactions(post_document)
        raw_value = metrics.get(metric)
        if raw_value is not None:
            try:
                values = [{"value": _coerce_number(float(raw_value))}]
            except (TypeError, ValueError):
                values = []

    return {
        "name": response_metric,
        "period": "lifetime",
        "values": values,
        "title": metric_meta["title"],
        "description": metric_meta["description"],
        "id": f"{instagram_media_id}/insights/{response_metric}/lifetime",
    }


def _post_insights_for_single_document(
    *,
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> list[dict[str, Any]]:
    post_id = str(post_document.get("post_id") or "")
    metric_keys = _selected_post_metrics(post_document, requested_metrics)
    return [
        _instagram_post_metric_payload(
            post_document=post_document,
            metric=metric_key,
            response_metric=metric_key,
            instagram_media_id=post_id,
        )
        for metric_key in metric_keys
    ]


def _as_utc_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_non_empty_identifier(value: str, field_name: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be empty.")
    return normalized


def _resolve_dashboard_user_id(ig_user_id: str, dashboard_user_id: str | None) -> str:
    normalized_dashboard_user_id = (dashboard_user_id or "").strip()
    if normalized_dashboard_user_id:
        return normalized_dashboard_user_id
    return ig_user_id


def _serialize_layout_widgets(
    widgets: list[dict[str, Any]] | list[InstagramDashboardWidgetInstance],
) -> list[dict[str, Any]]:
    normalized_widgets: list[dict[str, Any]] = []
    for index, widget in enumerate(widgets):
        try:
            validated = (
                widget
                if isinstance(widget, InstagramDashboardWidgetInstance)
                else InstagramDashboardWidgetInstance.model_validate(widget)
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Stored dashboard layout is invalid at widget index {index}.",
            ) from exc
        normalized_widgets.append(validated.model_dump(mode="python"))
    return normalized_widgets


def _build_layout_response(
    *,
    ig_user_id: str,
    dashboard_user_id: str,
    active_widgets: list[dict[str, Any]] | list[InstagramDashboardWidgetInstance],
    updated_at: datetime | None,
) -> dict[str, Any]:
    payload = InstagramDashboardLayoutResponse(
        ig_user_id=ig_user_id,
        dashboard_user_id=dashboard_user_id,
        active_widgets=[
            InstagramDashboardWidgetInstance.model_validate(widget)
            for widget in _serialize_layout_widgets(active_widgets)
        ],
        updated_at=updated_at,
    )
    response = payload.model_dump(mode="python")
    response["updated_at"] = _as_utc_iso(updated_at)
    return response


def _build_facebook_layout_response(
    *,
    fb_user_id: str,
    dashboard_user_id: str,
    active_widgets: list[dict[str, Any]] | list[InstagramDashboardWidgetInstance],
    updated_at: datetime | None,
) -> dict[str, Any]:
    payload = FacebookDashboardLayoutResponse(
        fb_user_id=fb_user_id,
        dashboard_user_id=dashboard_user_id,
        active_widgets=[
            InstagramDashboardWidgetInstance.model_validate(widget)
            for widget in _serialize_layout_widgets(active_widgets)
        ],
        updated_at=updated_at,
    )
    response = payload.model_dump(mode="python")
    response["updated_at"] = _as_utc_iso(updated_at)
    return response


def _build_linkedin_layout_response(
    *,
    li_org_id: str,
    dashboard_user_id: str,
    active_widgets: list[dict[str, Any]] | list[InstagramDashboardWidgetInstance],
    updated_at: datetime | None,
) -> dict[str, Any]:
    payload = LinkedInDashboardLayoutResponse(
        li_org_id=li_org_id,
        dashboard_user_id=dashboard_user_id,
        active_widgets=[
            InstagramDashboardWidgetInstance.model_validate(widget)
            for widget in _serialize_layout_widgets(active_widgets)
        ],
        updated_at=updated_at,
    )
    response = payload.model_dump(mode="python")
    response["updated_at"] = _as_utc_iso(updated_at)
    return response


def _postwise_response_entry(
    *,
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> dict[str, Any]:
    publish_time = post_document.get("publish_time")
    return {
        "post_id": str(post_document.get("post_id") or ""),
        "ig_user_id": post_document.get("ig_user_id"),
        "account_id": post_document.get("account_id"),
        "account_username": post_document.get("account_username"),
        "account_name": post_document.get("account_name"),
        "description": post_document.get("description"),
        "post_type": post_document.get("post_type"),
        "publish_time": _as_utc_iso(publish_time) if isinstance(publish_time, datetime) else None,
        "permalink": post_document.get("permalink"),
        "insights": _post_insights_for_single_document(
            post_document=post_document,
            requested_metrics=requested_metrics,
        ),
    }


def _linkedin_postwise_response_entry(
    *,
    post_document: dict[str, Any],
    requested_metrics: list[str] | None,
) -> dict[str, Any]:
    created_date = post_document.get("created_date")
    campaign_start_date = post_document.get("campaign_start_date")
    campaign_end_date = post_document.get("campaign_end_date")
    return {
        "post_id": str(post_document.get("post_id") or ""),
        "li_org_id": post_document.get("li_org_id"),
        "title": post_document.get("title"),
        "description": post_document.get("title"),
        "post_link": post_document.get("post_link"),
        "permalink": post_document.get("post_link"),
        "post_type": post_document.get("post_type"),
        "campaign_name": post_document.get("campaign_name"),
        "posted_by": post_document.get("posted_by"),
        "account_username": post_document.get("posted_by"),
        "audience": post_document.get("audience"),
        "account_name": post_document.get("audience"),
        "content_type": post_document.get("content_type") or "Other",
        "created_date": _as_utc_iso(created_date) if isinstance(created_date, datetime) else None,
        "publish_time": _as_utc_iso(created_date) if isinstance(created_date, datetime) else None,
        "campaign_start_date": (
            _as_utc_iso(campaign_start_date)
            if isinstance(campaign_start_date, datetime)
            else None
        ),
        "campaign_end_date": (
            _as_utc_iso(campaign_end_date)
            if isinstance(campaign_end_date, datetime)
            else None
        ),
        "insights": _linkedin_post_insights_for_single_document(
            post_document=post_document,
            requested_metrics=requested_metrics,
        ),
    }


async def _upsert_instagram_posts(
    documents: list[InstagramPostInsightDocument],
) -> tuple[int, int]:
    if not documents:
        return 0, 0

    collection = await _get_instagram_posts_collection()
    created_entries = 0
    updated_entries = 0

    for document in documents:
        payload = document.model_dump(mode="python")
        payload["updated_at"] = datetime.now(timezone.utc)
        try:
            result = await collection.update_one(
                {"post_id": document.post_id},
                {"$set": payload},
                upsert=True,
            )
        except PyMongoError as exc:
            raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

        if result.upserted_id is not None:
            created_entries += 1
        elif result.matched_count:
            updated_entries += 1

    return created_entries, updated_entries


async def _upsert_linkedin_posts(
    documents: list[LinkedInPostInsightDocument],
) -> tuple[int, int]:
    if not documents:
        return 0, 0

    collection = await _get_linkedin_posts_collection()
    created_entries = 0
    updated_entries = 0

    for document in documents:
        payload = document.model_dump(mode="python")
        payload["updated_at"] = datetime.now(timezone.utc)
        try:
            result = await collection.update_one(
                {"li_org_id": document.li_org_id, "post_id": document.post_id},
                {"$set": payload},
                upsert=True,
            )
        except PyMongoError as exc:
            raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

        if result.upserted_id is not None:
            created_entries += 1
        elif result.matched_count:
            updated_entries += 1

    return created_entries, updated_entries


def _metric_meta(metric: str, metric_map: dict[str, dict[str, str]]) -> dict[str, str]:
    default_title = metric.replace("_", " ").title()
    return metric_map.get(
        metric,
        {
            "title": default_title,
            "description": f"Imported metric '{metric}'.",
        },
    )


def _normalize_metric_query(metric_name: str, aliases: dict[str, str]) -> str:
    return aliases.get(metric_name, metric_name)


def _coerce_number(value: int | float) -> int | float:
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def _extract_entry_points(
    entries: list[dict[str, Any]],
    stored_metric: str,
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []

    for entry in entries:
        entry_date = entry.get("date")
        metrics = entry.get("metrics")
        if not isinstance(entry_date, datetime) or not isinstance(metrics, dict):
            continue

        raw_value = metrics.get(stored_metric)
        if raw_value is None:
            continue

        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            continue

        points.append(
            {
                "date": entry_date,
                "value": _coerce_number(numeric_value),
            }
        )

    points.sort(key=lambda item: item["date"])
    return points


def _aggregate_for_period(
    entries: list[dict[str, Any]],
    stored_metric: str,
    response_metric: str,
    period: str,
    account_id: str,
    metric_meta_map: dict[str, dict[str, str]],
) -> dict[str, Any]:
    metric_entries = _extract_entry_points(entries, stored_metric)
    metric_meta = _metric_meta(stored_metric, metric_meta_map)

    if not metric_entries:
        return {
            "name": response_metric,
            "period": period,
            "values": [],
            "title": metric_meta["title"],
            "description": metric_meta["description"],
            "id": f"{account_id}/insights/{response_metric}/{period}",
        }

    if period in ("lifetime", "total_over_range"):
        total = _coerce_number(sum(float(entry["value"]) for entry in metric_entries))
        return {
            "name": response_metric,
            "period": period,
            "values": [{"value": total}],
            "title": metric_meta["title"],
            "description": metric_meta["description"],
            "id": f"{account_id}/insights/{response_metric}/{period}",
        }

    if period == "day":
        values = [
            {
                "value": entry["value"],
                "end_time": entry["date"].strftime("%Y-%m-%dT%H:%M:%S+0000"),
            }
            for entry in metric_entries
        ]
        return {
            "name": response_metric,
            "period": period,
            "values": values,
            "title": metric_meta["title"],
            "description": metric_meta["description"],
            "id": f"{account_id}/insights/{response_metric}/{period}",
        }

    window_days = {"week": 7, "days_28": 28, "month": 30}[period]
    buckets: list[dict[str, Any]] = []
    index = 0

    while index < len(metric_entries):
        bucket_start = metric_entries[index]["date"]
        bucket_end = bucket_start + timedelta(days=window_days)
        bucket_entries = [
            entry for entry in metric_entries[index:] if entry["date"] < bucket_end
        ]
        bucket_value = _coerce_number(sum(float(entry["value"]) for entry in bucket_entries))
        buckets.append(
            {
                "value": bucket_value,
                "end_time": bucket_end.strftime("%Y-%m-%dT%H:%M:%S+0000"),
            }
        )
        index += len(bucket_entries)

    return {
        "name": response_metric,
        "period": period,
        "values": buckets,
        "title": metric_meta["title"],
        "description": metric_meta["description"],
        "id": f"{account_id}/insights/{response_metric}/{period}",
    }


async def _upsert_platform_insights(
    platform: str,
    account_field: str,
    account_id: str,
    updates_by_date: dict[datetime, dict[str, int | float]],
) -> tuple[int, int]:
    if not updates_by_date:
        return 0, 0

    collection = _get_collection(platform)
    dates = sorted(updates_by_date.keys())
    min_date = dates[0]
    max_date = dates[-1]

    try:
        existing_entries = await collection.find(
            {
                account_field: account_id,
                "date": {"$gte": min_date, "$lte": max_date},
            }
        ).to_list(length=None)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    existing_by_date = {
        entry["date"].date(): entry
        for entry in existing_entries
        if isinstance(entry.get("date"), datetime)
    }

    created_entries = 0
    updated_entries = 0

    for date_key in dates:
        metric_updates = updates_by_date[date_key]
        existing_entry = existing_by_date.get(date_key.date())

        try:
            if existing_entry:
                merged_metrics = dict(existing_entry.get("metrics") or {})
                merged_metrics.update(metric_updates)
                await collection.update_one(
                    {"_id": existing_entry["_id"]},
                    {
                        "$set": {
                            "platform": platform,
                            "metrics": merged_metrics,
                        }
                    },
                )
                updated_entries += 1
                continue

            await collection.insert_one(
                {
                    "platform": platform,
                    account_field: account_id,
                    "date": date_key,
                    "metrics": metric_updates,
                }
            )
            created_entries += 1
        except PyMongoError as exc:
            raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

    return created_entries, updated_entries


async def _collect_upload_payloads(files: list[UploadFile]) -> list[tuple[str, bytes]]:
    payloads: list[tuple[str, bytes]] = []
    for uploaded_file in files:
        file_name = uploaded_file.filename or "uploaded_file"
        file_content = await uploaded_file.read()
        if not file_content:
            continue
        payloads.append((file_name, file_content))
    return payloads


async def _import_payloads(
    *,
    platform: str,
    account_field: str,
    account_response_key: str,
    account_id: str,
    source: str,
    payloads: list[tuple[str, bytes]],
) -> dict[str, Any]:
    try:
        expanded_payloads = expand_csv_payloads(payloads)
        updates_by_date, processed_files, metric_keys = merge_csv_updates(
            expanded_payloads,
            metric_aliases=_metric_name_aliases(platform),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updates_by_date:
        raise HTTPException(
            status_code=400,
            detail="No valid CSV metric rows were found to import.",
        )

    created_entries, updated_entries = await _upsert_platform_insights(
        platform=platform,
        account_field=account_field,
        account_id=account_id,
        updates_by_date=updates_by_date,
    )

    return {
        "message": "CSV import completed.",
        "source": source,
        account_response_key: account_id,
        "processed_files": processed_files,
        "touched_dates": len(updates_by_date),
        "created_entries": created_entries,
        "updated_entries": updated_entries,
        "metric_keys": metric_keys,
    }


async def _get_insights(
    *,
    platform: str,
    account_field: str,
    account_id: str,
    metric: str,
    period: str,
    since: str | None,
    until: str | None,
    metric_aliases: dict[str, str],
    metric_meta_map: dict[str, dict[str, str]],
) -> dict[str, Any]:
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid period '{period}'. Must be one of: {', '.join(sorted(VALID_PERIODS))}",
        )

    requested_metrics = [item.strip() for item in metric.split(",") if item.strip()]
    if not requested_metrics:
        raise HTTPException(status_code=400, detail="At least one metric is required.")

    query_filters: dict[str, Any] = {account_field: account_id}
    date_filter: dict[str, datetime] = {}

    if since:
        try:
            date_filter["$gte"] = parse_date_value(since)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    if until:
        try:
            date_filter["$lte"] = parse_date_value(until)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if date_filter:
        query_filters["date"] = date_filter

    collection = _get_collection(platform)
    try:
        entries = await collection.find(query_filters).sort("date", 1).to_list(length=None)
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not entries:
        return {"data": []}

    data = []
    for requested_metric in requested_metrics:
        stored_metric = _normalize_metric_query(requested_metric, metric_aliases)
        data.append(
            _aggregate_for_period(
                entries=entries,
                stored_metric=stored_metric,
                response_metric=requested_metric,
                period=period,
                account_id=account_id,
                metric_meta_map=metric_meta_map,
            )
        )

    return {"data": data}


async def get_instagram_insights(
    ig_user_id: str,
    metric: str,
    period: str = "day",
    since: str | None = None,
    until: str | None = None,
) -> dict[str, Any]:
    return await _get_insights(
        platform="instagram",
        account_field="ig_user_id",
        account_id=ig_user_id,
        metric=metric,
        period=period,
        since=since,
        until=until,
        metric_aliases=INSTAGRAM_METRIC_QUERY_ALIASES,
        metric_meta_map=INSTAGRAM_METRIC_META,
    )


async def import_instagram_csvs(ig_user_id: str, files: list[UploadFile]) -> dict[str, Any]:
    payloads = await _collect_upload_payloads(files)
    if not payloads:
        raise HTTPException(status_code=400, detail="No non-empty files were uploaded.")

    return await _import_payloads(
        platform="instagram",
        account_field="ig_user_id",
        account_response_key="ig_user_id",
        account_id=ig_user_id,
        source="uploaded_files",
        payloads=payloads,
    )


async def import_instagram_folder(ig_user_id: str, folder_archive: UploadFile) -> dict[str, Any]:
    archive_name = folder_archive.filename or "folder_upload.zip"
    archive_bytes = await folder_archive.read()
    if not archive_bytes:
        raise HTTPException(status_code=400, detail="Uploaded folder archive is empty.")

    result = await _import_payloads(
        platform="instagram",
        account_field="ig_user_id",
        account_response_key="ig_user_id",
        account_id=ig_user_id,
        source="uploaded_folder_zip",
        payloads=[(archive_name, archive_bytes)],
    )
    result["archive_name"] = archive_name
    return result


async def import_instagram_posts_csv(
    ig_user_id: str,
    posts_csv: list[UploadFile],
) -> dict[str, Any]:
    payloads = await _collect_upload_payloads(posts_csv)
    if not payloads:
        raise HTTPException(status_code=400, detail="No non-empty post CSV files were uploaded.")

    documents_by_post_id: dict[str, InstagramPostInsightDocument] = {}
    all_metric_keys: set[str] = set()
    processed_file_names: list[str] = []

    for file_name, file_content in payloads:
        if not file_name.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Post upload accepts only CSV files.")

        try:
            documents, metric_keys = _parse_instagram_posts_csv(file_name, file_content, ig_user_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        processed_file_names.append(file_name)
        all_metric_keys.update(metric_keys)
        for document in documents:
            documents_by_post_id[document.post_id] = document

    merged_documents = list(documents_by_post_id.values())
    created_entries, updated_entries = await _upsert_instagram_posts(merged_documents)

    response_payload: dict[str, Any] = {
        "message": "Post CSV import completed.",
        "source": "uploaded_post_csv_files",
        "ig_user_id": ig_user_id,
        "processed_files": len(processed_file_names),
        "processed_file_names": processed_file_names,
        "processed_posts": len(merged_documents),
        "created_entries": created_entries,
        "updated_entries": updated_entries,
        "metric_keys": sorted(all_metric_keys),
    }

    if len(processed_file_names) == 1:
        response_payload["processed_file"] = processed_file_names[0]

    return response_payload


async def get_instagram_post_insights(
    instagram_media_id: str,
    metric: str | None = None,
    period: str = "lifetime",
    post_id: str | None = None,
    breakdown: str | None = None,
) -> dict[str, Any]:
    normalized_period = period.strip().lower() or "lifetime"
    if normalized_period != "lifetime":
        raise HTTPException(
            status_code=400,
            detail="Instagram post insights support only period=lifetime.",
        )

    if breakdown:
        raise HTTPException(
            status_code=400,
            detail=(
                "Breakdowns are not available for imported post metrics. "
                "Please request metrics without the breakdown parameter."
            ),
        )

    requested_metrics = _validate_requested_post_metrics(metric)

    collection = await _get_instagram_posts_collection()
    try:
        if post_id:
            post_document = await collection.find_one(
                {
                    "ig_user_id": _case_insensitive_exact_match(instagram_media_id),
                    "post_id": post_id,
                }
            )
            if not post_document:
                return {"data": []}

            return {
                "data": _post_insights_for_single_document(
                    post_document=post_document,
                    requested_metrics=requested_metrics,
                )
            }

        post_document = await collection.find_one({"post_id": instagram_media_id})
        if post_document:
            return {
                "data": _post_insights_for_single_document(
                    post_document=post_document,
                    requested_metrics=requested_metrics,
                )
            }

        post_documents = await (
            collection.find({"ig_user_id": _case_insensitive_exact_match(instagram_media_id)})
            .sort("publish_time", -1)
            .to_list(length=None)
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not post_documents:
        return {"data": []}

    return {
        "data": [
            _postwise_response_entry(
                post_document=post_document,
                requested_metrics=requested_metrics,
            )
            for post_document in post_documents
        ]
    }


async def get_instagram_dashboard_layout(
    ig_user_id: str,
    dashboard_user_id: str | None = None,
) -> dict[str, Any]:
    normalized_ig_user_id = _normalize_non_empty_identifier(ig_user_id, "ig_user_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_ig_user_id, dashboard_user_id)

    collection = await _get_instagram_layout_collection()
    try:
        document = await collection.find_one(
            {
                "ig_user_id": normalized_ig_user_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            }
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not document:
        return _build_layout_response(
            ig_user_id=normalized_ig_user_id,
            dashboard_user_id=resolved_dashboard_user_id,
            active_widgets=[],
            updated_at=None,
        )

    stored_widgets = document.get("active_widgets")
    normalized_widgets = stored_widgets if isinstance(stored_widgets, list) else []
    updated_at = document.get("updated_at")
    normalized_updated_at = updated_at if isinstance(updated_at, datetime) else None

    return _build_layout_response(
        ig_user_id=normalized_ig_user_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=normalized_updated_at,
    )


async def save_instagram_dashboard_layout(
    ig_user_id: str,
    dashboard_user_id: str | None,
    active_widgets: list[InstagramDashboardWidgetInstance],
) -> dict[str, Any]:
    normalized_ig_user_id = _normalize_non_empty_identifier(ig_user_id, "ig_user_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_ig_user_id, dashboard_user_id)
    normalized_widgets = _serialize_layout_widgets(active_widgets)
    updated_at = datetime.now(timezone.utc)

    collection = await _get_instagram_layout_collection()
    try:
        await collection.update_one(
            {
                "ig_user_id": normalized_ig_user_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            },
            {
                "$set": {
                    "ig_user_id": normalized_ig_user_id,
                    "dashboard_user_id": resolved_dashboard_user_id,
                    "active_widgets": normalized_widgets,
                    "updated_at": updated_at,
                }
            },
            upsert=True,
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

    return _build_layout_response(
        ig_user_id=normalized_ig_user_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=updated_at,
    )


async def get_facebook_dashboard_layout(
    fb_user_id: str,
    dashboard_user_id: str | None = None,
) -> dict[str, Any]:
    normalized_fb_user_id = _normalize_non_empty_identifier(fb_user_id, "fb_user_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_fb_user_id, dashboard_user_id)

    collection = await _get_facebook_layout_collection()
    try:
        document = await collection.find_one(
            {
                "fb_user_id": normalized_fb_user_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            }
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not document:
        return _build_facebook_layout_response(
            fb_user_id=normalized_fb_user_id,
            dashboard_user_id=resolved_dashboard_user_id,
            active_widgets=[],
            updated_at=None,
        )

    stored_widgets = document.get("active_widgets")
    normalized_widgets = stored_widgets if isinstance(stored_widgets, list) else []
    updated_at = document.get("updated_at")
    normalized_updated_at = updated_at if isinstance(updated_at, datetime) else None

    return _build_facebook_layout_response(
        fb_user_id=normalized_fb_user_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=normalized_updated_at,
    )


async def save_facebook_dashboard_layout(
    fb_user_id: str,
    dashboard_user_id: str | None,
    active_widgets: list[InstagramDashboardWidgetInstance],
) -> dict[str, Any]:
    normalized_fb_user_id = _normalize_non_empty_identifier(fb_user_id, "fb_user_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_fb_user_id, dashboard_user_id)
    normalized_widgets = _serialize_layout_widgets(active_widgets)
    updated_at = datetime.now(timezone.utc)

    collection = await _get_facebook_layout_collection()
    try:
        await collection.update_one(
            {
                "fb_user_id": normalized_fb_user_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            },
            {
                "$set": {
                    "fb_user_id": normalized_fb_user_id,
                    "dashboard_user_id": resolved_dashboard_user_id,
                    "active_widgets": normalized_widgets,
                    "updated_at": updated_at,
                }
            },
            upsert=True,
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

    return _build_facebook_layout_response(
        fb_user_id=normalized_fb_user_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=updated_at,
    )


async def get_facebook_insights(
    fb_user_id: str,
    metric: str,
    period: str = "day",
    since: str | None = None,
    until: str | None = None,
) -> dict[str, Any]:
    return await _get_insights(
        platform="facebook",
        account_field="fb_user_id",
        account_id=fb_user_id,
        metric=metric,
        period=period,
        since=since,
        until=until,
        metric_aliases=FACEBOOK_METRIC_QUERY_ALIASES,
        metric_meta_map=FACEBOOK_METRIC_META,
    )


async def import_facebook_csvs(fb_user_id: str, files: list[UploadFile]) -> dict[str, Any]:
    payloads = await _collect_upload_payloads(files)
    if not payloads:
        raise HTTPException(status_code=400, detail="No non-empty files were uploaded.")

    return await _import_payloads(
        platform="facebook",
        account_field="fb_user_id",
        account_response_key="fb_user_id",
        account_id=fb_user_id,
        source="uploaded_files",
        payloads=payloads,
    )


async def import_facebook_folder(fb_user_id: str, folder_archive: UploadFile) -> dict[str, Any]:
    archive_name = folder_archive.filename or "folder_upload.zip"
    archive_bytes = await folder_archive.read()
    if not archive_bytes:
        raise HTTPException(status_code=400, detail="Uploaded folder archive is empty.")

    result = await _import_payloads(
        platform="facebook",
        account_field="fb_user_id",
        account_response_key="fb_user_id",
        account_id=fb_user_id,
        source="uploaded_folder_zip",
        payloads=[(archive_name, archive_bytes)],
    )
    result["archive_name"] = archive_name
    return result


async def get_linkedin_insights(
    li_org_id: str,
    metric: str,
    period: str = "day",
    since: str | None = None,
    until: str | None = None,
) -> dict[str, Any]:
    return await _get_insights(
        platform="linkedin",
        account_field="li_org_id",
        account_id=li_org_id,
        metric=metric,
        period=period,
        since=since,
        until=until,
        metric_aliases=LINKEDIN_METRIC_QUERY_ALIASES,
        metric_meta_map=LINKEDIN_METRIC_META,
    )


async def import_linkedin_xls(li_org_id: str, xls_files: list[UploadFile]) -> dict[str, Any]:
    payloads = await _collect_upload_payloads(xls_files)
    if not payloads:
        raise HTTPException(status_code=400, detail="No non-empty XLS files were uploaded.")

    processed_file_names: list[str] = []
    channel_updates_by_date: dict[datetime, dict[str, int | float]] = defaultdict(dict)
    channel_metric_keys: set[str] = set()
    posts_by_id: dict[str, LinkedInPostInsightDocument] = {}
    post_metric_keys: set[str] = set()

    for file_name, file_content in payloads:
        if not file_name.lower().endswith(".xls"):
            raise HTTPException(
                status_code=400,
                detail=f"{file_name}: unsupported file type. Upload .xls files only.",
            )

        try:
            workbook = _open_xls_workbook(file_name, file_content)
            metrics_updates, metrics_keys = _parse_linkedin_metrics_xls(
                source_name=file_name,
                workbook=workbook,
                li_org_id=li_org_id,
            )
            post_documents, post_keys = _parse_linkedin_posts_xls(
                source_name=file_name,
                workbook=workbook,
                li_org_id=li_org_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        processed_file_names.append(file_name)
        channel_metric_keys.update(metrics_keys)
        post_metric_keys.update(post_keys)
        for date_key, metric_updates in metrics_updates.items():
            channel_updates_by_date[date_key].update(metric_updates)
        for post_document in post_documents:
            posts_by_id[post_document.post_id] = post_document

    if not channel_updates_by_date and not posts_by_id:
        raise HTTPException(
            status_code=400,
            detail="No valid LinkedIn metrics or post rows were found to import.",
        )

    created_entries = 0
    updated_entries = 0
    if channel_updates_by_date:
        created_entries, updated_entries = await _upsert_platform_insights(
            platform="linkedin",
            account_field="li_org_id",
            account_id=li_org_id,
            updates_by_date=channel_updates_by_date,
        )

    created_post_entries, updated_post_entries = await _upsert_linkedin_posts(
        list(posts_by_id.values())
    )

    response_payload: dict[str, Any] = {
        "message": "LinkedIn XLS import completed.",
        "source": "uploaded_linkedin_xls_files",
        "li_org_id": li_org_id,
        "processed_files": len(processed_file_names),
        "processed_file_names": processed_file_names,
        "touched_dates": len(channel_updates_by_date),
        "created_entries": created_entries,
        "updated_entries": updated_entries,
        "processed_posts": len(posts_by_id),
        "created_post_entries": created_post_entries,
        "updated_post_entries": updated_post_entries,
        "metric_keys": sorted(channel_metric_keys.union(post_metric_keys)),
        "channel_metric_keys": sorted(channel_metric_keys),
        "post_metric_keys": sorted(post_metric_keys),
    }
    if len(processed_file_names) == 1:
        response_payload["processed_file"] = processed_file_names[0]

    return response_payload


async def get_linkedin_post_insights(
    linkedin_post_id: str,
    metric: str | None = None,
    period: str = "lifetime",
    post_id: str | None = None,
    breakdown: str | None = None,
) -> dict[str, Any]:
    normalized_period = period.strip().lower() or "lifetime"
    if normalized_period != "lifetime":
        raise HTTPException(
            status_code=400,
            detail="LinkedIn post insights support only period=lifetime.",
        )

    if breakdown:
        raise HTTPException(
            status_code=400,
            detail=(
                "Breakdowns are not available for imported LinkedIn post metrics. "
                "Please request metrics without the breakdown parameter."
            ),
        )

    requested_metrics = _validate_requested_linkedin_post_metrics(metric)
    collection = await _get_linkedin_posts_collection()

    try:
        if post_id:
            post_document = await collection.find_one(
                {
                    "li_org_id": _case_insensitive_exact_match(linkedin_post_id),
                    "post_id": post_id,
                }
            )
            if not post_document:
                return {"data": []}

            return {
                "data": _linkedin_post_insights_for_single_document(
                    post_document=post_document,
                    requested_metrics=requested_metrics,
                )
            }

        post_document = await collection.find_one({"post_id": linkedin_post_id})
        if post_document:
            return {
                "data": _linkedin_post_insights_for_single_document(
                    post_document=post_document,
                    requested_metrics=requested_metrics,
                )
            }

        post_documents = await (
            collection.find({"li_org_id": _case_insensitive_exact_match(linkedin_post_id)})
            .sort("created_date", -1)
            .to_list(length=None)
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not post_documents:
        return {"data": []}

    return {
        "data": [
            _linkedin_postwise_response_entry(
                post_document=post_document,
                requested_metrics=requested_metrics,
            )
            for post_document in post_documents
        ]
    }


async def get_linkedin_dashboard_layout(
    li_org_id: str,
    dashboard_user_id: str | None = None,
) -> dict[str, Any]:
    normalized_li_org_id = _normalize_non_empty_identifier(li_org_id, "li_org_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_li_org_id, dashboard_user_id)

    collection = await _get_linkedin_layout_collection()
    try:
        document = await collection.find_one(
            {
                "li_org_id": normalized_li_org_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            }
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}") from exc

    if not document:
        return _build_linkedin_layout_response(
            li_org_id=normalized_li_org_id,
            dashboard_user_id=resolved_dashboard_user_id,
            active_widgets=[],
            updated_at=None,
        )

    stored_widgets = document.get("active_widgets")
    normalized_widgets = stored_widgets if isinstance(stored_widgets, list) else []
    updated_at = document.get("updated_at")
    normalized_updated_at = updated_at if isinstance(updated_at, datetime) else None

    return _build_linkedin_layout_response(
        li_org_id=normalized_li_org_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=normalized_updated_at,
    )


async def save_linkedin_dashboard_layout(
    li_org_id: str,
    dashboard_user_id: str | None,
    active_widgets: list[InstagramDashboardWidgetInstance],
) -> dict[str, Any]:
    normalized_li_org_id = _normalize_non_empty_identifier(li_org_id, "li_org_id")
    resolved_dashboard_user_id = _resolve_dashboard_user_id(normalized_li_org_id, dashboard_user_id)
    normalized_widgets = _serialize_layout_widgets(active_widgets)
    updated_at = datetime.now(timezone.utc)

    collection = await _get_linkedin_layout_collection()
    try:
        await collection.update_one(
            {
                "li_org_id": normalized_li_org_id,
                "dashboard_user_id": resolved_dashboard_user_id,
            },
            {
                "$set": {
                    "li_org_id": normalized_li_org_id,
                    "dashboard_user_id": resolved_dashboard_user_id,
                    "active_widgets": normalized_widgets,
                    "updated_at": updated_at,
                }
            },
            upsert=True,
        )
    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail=f"Database write failed: {exc}") from exc

    return _build_linkedin_layout_response(
        li_org_id=normalized_li_org_id,
        dashboard_user_id=resolved_dashboard_user_id,
        active_widgets=normalized_widgets,
        updated_at=updated_at,
    )
