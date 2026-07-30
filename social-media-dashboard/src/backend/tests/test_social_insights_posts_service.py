"""Service tests for Instagram post-wise manual insights."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from models.social_insights_models import (
    InstagramDashboardWidgetInstance,
    LinkedInPostInsightDocument,
)
import services.social_insights_service as social_insights


class _FakeCursor:
    def __init__(self, documents: list[dict[str, Any]]):
        self._documents = documents

    def sort(self, *_args, **_kwargs):
        return self

    async def to_list(self, length=None):
        if length is None:
            return self._documents
        return self._documents[:length]


def test_parse_instagram_posts_csv_extracts_post_metrics():
    csv_content = (
        b"Post ID,Account ID,Account username,Account name,Description,Duration (sec),"
        b"Publish time,Permalink,Post type,Data comment,Date,Views,Likes,Shares,Comments,Saves,Reach,Follows\n"
        b"1801,1784,clubartizen,Club Artizen,Caption,0,03/27/2026 06:08,"
        b"https://www.instagram.com/p/example/,IG image,,Lifetime,160,5,3,2,4,45,1\n"
    )

    documents, metric_keys = social_insights._parse_instagram_posts_csv(
        source_name="posts.csv",
        content=csv_content,
        ig_user_id="ClubArtizen",
    )

    assert len(documents) == 1
    assert documents[0].post_id == "1801"
    assert documents[0].ig_user_id == "ClubArtizen"
    assert documents[0].metrics["saved"] == 4
    assert documents[0].metrics["total_interactions"] == 14
    assert "total_interactions" in metric_keys


@pytest.mark.asyncio
async def test_import_instagram_posts_csv_supports_multiple_files():
    class _FakeUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    csv_one = (
        b"Post ID,Account ID,Publish time,Post type,Date,Views,Likes,Shares,Comments,Saves,Reach,Follows\n"
        b"1801,1784,03/27/2026 06:08,IG image,Lifetime,160,5,3,0,0,45,0\n"
    )
    csv_two = (
        b"Post ID,Account ID,Publish time,Post type,Date,Views,Likes,Shares,Comments,Saves,Reach,Follows\n"
        b"1802,1784,03/28/2026 06:08,IG image,Lifetime,120,7,1,1,1,40,0\n"
    )

    with patch(
        "services.social_insights_service._upsert_instagram_posts",
        new=AsyncMock(return_value=(1, 1)),
    ) as mocked_upsert:
        payload = await social_insights.import_instagram_posts_csv(
            "ClubArtizen",
            [
                _FakeUploadFile("posts-1.csv", csv_one),
                _FakeUploadFile("posts-2.csv", csv_two),
            ],
        )

    assert payload["source"] == "uploaded_post_csv_files"
    assert payload["processed_files"] == 2
    assert payload["processed_posts"] == 2
    assert payload["processed_file_names"] == ["posts-1.csv", "posts-2.csv"]
    assert "processed_file" not in payload

    upsert_documents = mocked_upsert.await_args.args[0]
    assert sorted(document.post_id for document in upsert_documents) == ["1801", "1802"]


@pytest.mark.asyncio
async def test_import_instagram_posts_csv_rejects_non_csv_file():
    class _FakeUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    with pytest.raises(HTTPException) as exc_info:
        await social_insights.import_instagram_posts_csv(
            "ClubArtizen",
            [_FakeUploadFile("posts.zip", b"PK\x03\x04not-a-csv")],
        )

    assert exc_info.value.status_code == 400
    assert "CSV" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_instagram_post_insights_returns_lifetime_values_for_post_id():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {"post_id": "1801"}
            return {
                "post_id": "1801",
                "post_type": "IG image",
                "metrics": {"views": 160, "saved": 4, "total_interactions": 14},
            }

        def find(self, _query):
            return _FakeCursor([])

    with patch(
        "services.social_insights_service._get_instagram_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_post_insights(
            instagram_media_id="1801",
            metric="views,saves,total_interactions",
            period="lifetime",
        )

    assert payload["data"][0]["name"] == "views"
    assert payload["data"][0]["values"] == [{"value": 160}]
    assert payload["data"][1]["name"] == "saved"
    assert payload["data"][1]["values"] == [{"value": 4}]
    assert payload["data"][2]["name"] == "total_interactions"
    assert payload["data"][2]["values"] == [{"value": 14}]


@pytest.mark.asyncio
async def test_get_instagram_post_insights_returns_postwise_data_for_ig_user_id():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {"post_id": "ClubArtizen"}
            return None

        def find(self, query):
            user_query = query.get("ig_user_id")
            assert isinstance(user_query, dict)
            assert user_query.get("$options") == "i"
            return _FakeCursor(
                [
                    {
                        "post_id": "1802",
                        "ig_user_id": "ClubArtizen",
                        "account_id": "1784",
                        "post_type": "IG image",
                        "metrics": {"views": 99, "likes": 9},
                    },
                    {
                        "post_id": "1801",
                        "ig_user_id": "ClubArtizen",
                        "account_id": "1784",
                        "post_type": "IG image",
                        "metrics": {"views": 160, "likes": 15},
                    },
                ]
            )

    with patch(
        "services.social_insights_service._get_instagram_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_post_insights(
            instagram_media_id="ClubArtizen",
            metric="views",
            period="lifetime",
        )

    assert len(payload["data"]) == 2
    assert payload["data"][0]["post_id"] == "1802"
    assert payload["data"][0]["insights"][0]["name"] == "views"
    assert payload["data"][0]["insights"][0]["values"] == [{"value": 99}]
    assert payload["data"][1]["post_id"] == "1801"


@pytest.mark.asyncio
async def test_get_instagram_post_insights_returns_all_metrics_when_metric_empty():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {"post_id": "1801"}
            return {
                "post_id": "1801",
                "post_type": "IG image",
                "metrics": {
                    "views": 160,
                    "likes": 5,
                    "shares": 3,
                    "comments": 2,
                    "saved": 4,
                    "reach": 45,
                    "follows": 1,
                },
            }

        def find(self, _query):
            return _FakeCursor([])

    with patch(
        "services.social_insights_service._get_instagram_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_post_insights(
            instagram_media_id="1801",
            metric="",
            period="lifetime",
        )

    returned_metric_names = {item["name"] for item in payload["data"]}
    assert {
        "views",
        "likes",
        "shares",
        "comments",
        "saved",
        "reach",
        "follows",
        "total_interactions",
    }.issubset(returned_metric_names)


@pytest.mark.asyncio
async def test_get_instagram_post_insights_supports_post_id_option_for_user_id():
    class _FakeCollection:
        async def find_one(self, query):
            user_query = query.get("ig_user_id")
            assert isinstance(user_query, dict)
            assert user_query.get("$options") == "i"
            assert query.get("post_id") == "1801"
            return {
                "post_id": "1801",
                "ig_user_id": "ClubArtizen",
                "post_type": "IG image",
                "metrics": {"views": 160, "likes": 5},
            }

        def find(self, _query):
            return _FakeCursor([])

    with patch(
        "services.social_insights_service._get_instagram_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_post_insights(
            instagram_media_id="ClubArtizen",
            post_id="1801",
            metric=None,
            period="lifetime",
        )

    assert payload["data"][0]["name"] == "likes"
    assert payload["data"][0]["id"] == "1801/insights/likes/lifetime"


@pytest.mark.asyncio
async def test_get_instagram_post_insights_rejects_non_lifetime_period():
    with pytest.raises(HTTPException) as exc_info:
        await social_insights.get_instagram_post_insights(
            instagram_media_id="1801",
            metric="views",
            period="day",
        )

    assert exc_info.value.status_code == 400
    assert "period=lifetime" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_instagram_post_insights_rejects_unsupported_metrics():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {"post_id": "1801"}
            return {"post_id": "1801", "post_type": "IG image", "metrics": {"views": 1}}

        def find(self, _query):
            return _FakeCursor([])

    with patch(
        "services.social_insights_service._get_instagram_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await social_insights.get_instagram_post_insights(
                instagram_media_id="1801",
                metric="impressions",
                period="lifetime",
            )

    assert exc_info.value.status_code == 400
    assert "Unsupported metric" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_instagram_dashboard_layout_returns_default_when_missing():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {
                "ig_user_id": "ClubArtizen",
                "dashboard_user_id": "dashboard-user-1",
            }
            return None

    with patch(
        "services.social_insights_service._get_instagram_layout_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_dashboard_layout(
            ig_user_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
        )

    assert payload["ig_user_id"] == "ClubArtizen"
    assert payload["dashboard_user_id"] == "dashboard-user-1"
    assert payload["active_widgets"] == []
    assert payload["updated_at"] is None


@pytest.mark.asyncio
async def test_get_instagram_dashboard_layout_returns_saved_widgets():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {
                "ig_user_id": "ClubArtizen",
                "dashboard_user_id": "dashboard-user-1",
            }
            return {
                "ig_user_id": "ClubArtizen",
                "dashboard_user_id": "dashboard-user-1",
                "active_widgets": [
                    {
                        "instance_id": "top-posts-1",
                        "widget_id": "top-posts",
                        "config": {"postMetricKey": "views"},
                    }
                ],
                "updated_at": datetime(2026, 4, 14, 6, 0, tzinfo=timezone.utc),
            }

    with patch(
        "services.social_insights_service._get_instagram_layout_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_instagram_dashboard_layout(
            ig_user_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
        )

    assert payload["active_widgets"][0]["instance_id"] == "top-posts-1"
    assert payload["active_widgets"][0]["widget_id"] == "top-posts"
    assert payload["updated_at"] == "2026-04-14T06:00:00Z"


@pytest.mark.asyncio
async def test_save_instagram_dashboard_layout_upserts_widgets():
    class _FakeCollection:
        def __init__(self):
            self.captured_query: dict[str, Any] | None = None
            self.captured_update: dict[str, Any] | None = None
            self.captured_upsert: bool | None = None

        async def update_one(self, query, update, upsert=False):
            self.captured_query = query
            self.captured_update = update
            self.captured_upsert = upsert

    fake_collection = _FakeCollection()
    with patch(
        "services.social_insights_service._get_instagram_layout_collection",
        new=AsyncMock(return_value=fake_collection),
    ):
        payload = await social_insights.save_instagram_dashboard_layout(
            ig_user_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
            active_widgets=[
                InstagramDashboardWidgetInstance(
                    instance_id="metric-compare-1",
                    widget_id="metric-scatter-compare",
                    config={"xMetricKey": "views", "yMetricKey": "reach"},
                ),
                InstagramDashboardWidgetInstance(
                    instance_id="top-posts-1",
                    widget_id="top-posts",
                    config={"postMetricKey": "likes"},
                ),
            ],
        )

    assert fake_collection.captured_query == {
        "ig_user_id": "ClubArtizen",
        "dashboard_user_id": "dashboard-user-1",
    }
    assert fake_collection.captured_upsert is True
    assert fake_collection.captured_update is not None
    stored_widgets = fake_collection.captured_update["$set"]["active_widgets"]
    assert len(stored_widgets) == 2
    assert stored_widgets[0]["widget_id"] == "metric-scatter-compare"
    assert stored_widgets[1]["config"]["postMetricKey"] == "likes"
    assert payload["dashboard_user_id"] == "dashboard-user-1"
    assert len(payload["active_widgets"]) == 2
    assert payload["updated_at"] is not None


@pytest.mark.asyncio
async def test_import_linkedin_xls_upserts_channel_and_posts():
    class _FakeUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    fake_post_document = LinkedInPostInsightDocument(
        post_id="7449985017469894657",
        li_org_id="ClubArtizen",
        title="stay tuned!",
        post_link="https://www.linkedin.com/feed/update/urn:li:activity:7449985017469894657",
        post_type="Organic",
        posted_by="Anita Hariharan",
        metrics={
            "impressions": 13,
            "views": "NA",
            "clicks": 6,
            "likes": 0,
            "comments": 0,
            "reposts": 0,
            "engagement_rate": 0.4615384638,
            "total_interactions": 0,
        },
    )
    fake_updates = {
        datetime(2026, 4, 16, tzinfo=timezone.utc): {
            "impressions_total": 120,
            "clicks_total": 12,
        }
    }

    with (
        patch(
            "services.social_insights_service._open_xls_workbook",
            return_value=object(),
        ),
        patch(
            "services.social_insights_service._parse_linkedin_metrics_xls",
            return_value=(fake_updates, {"impressions_total", "clicks_total"}),
        ),
        patch(
            "services.social_insights_service._parse_linkedin_posts_xls",
            return_value=([fake_post_document], ["impressions", "views", "total_interactions"]),
        ),
        patch(
            "services.social_insights_service._upsert_platform_insights",
            new=AsyncMock(return_value=(1, 0)),
        ) as mocked_channel_upsert,
        patch(
            "services.social_insights_service._upsert_linkedin_posts",
            new=AsyncMock(return_value=(1, 0)),
        ) as mocked_post_upsert,
    ):
        payload = await social_insights.import_linkedin_xls(
            "ClubArtizen",
            [_FakeUploadFile("linkedin-export.xls", b"xls-binary")],
        )

    assert payload["message"] == "LinkedIn XLS import completed."
    assert payload["li_org_id"] == "ClubArtizen"
    assert payload["processed_files"] == 1
    assert payload["processed_posts"] == 1
    assert payload["created_entries"] == 1
    assert payload["created_post_entries"] == 1
    assert payload["processed_file"] == "linkedin-export.xls"
    mocked_channel_upsert.assert_awaited_once()
    mocked_post_upsert.assert_awaited_once()


@pytest.mark.asyncio
async def test_import_linkedin_xls_rejects_non_xls_file():
    class _FakeUploadFile:
        def __init__(self, filename: str, content: bytes):
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    with pytest.raises(HTTPException) as exc_info:
        await social_insights.import_linkedin_xls(
            "ClubArtizen",
            [_FakeUploadFile("linkedin-export.csv", b"Date,Impressions\n")],
        )

    assert exc_info.value.status_code == 400
    assert ".xls" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_linkedin_post_insights_returns_na_values_for_empty_metrics():
    class _FakeCollection:
        async def find_one(self, query):
            assert query == {"post_id": "7449985017469894657"}
            return {
                "post_id": "7449985017469894657",
                "li_org_id": "ClubArtizen",
                "metrics": {
                    "impressions": 13,
                    "views": "NA",
                    "clicks": 6,
                    "total_interactions": 0,
                },
            }

        def find(self, _query):
            return _FakeCursor([])

    with patch(
        "services.social_insights_service._get_linkedin_posts_collection",
        new=AsyncMock(return_value=_FakeCollection()),
    ):
        payload = await social_insights.get_linkedin_post_insights(
            linkedin_post_id="7449985017469894657",
            metric="views,impressions",
            period="lifetime",
        )

    assert payload["data"][0]["name"] == "views"
    assert payload["data"][0]["values"] == [{"value": "NA"}]
    assert payload["data"][1]["name"] == "impressions"
    assert payload["data"][1]["values"] == [{"value": 13}]


def test_linkedin_postwise_response_defaults_missing_content_type_to_other():
    post_document = {
        "post_id": "7449985017469894657",
        "li_org_id": "ClubArtizen",
        "created_date": datetime(2026, 4, 16, tzinfo=timezone.utc),
        "metrics": {"impressions": 13},
    }

    payload = social_insights._linkedin_postwise_response_entry(
        post_document=post_document,
        requested_metrics=["impressions"],
    )

    assert payload["content_type"] == "Other"
