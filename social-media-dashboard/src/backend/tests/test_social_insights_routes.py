"""Tests for Instagram/Facebook insights routes."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestInstagramInsightsRoutes:
    def test_insights_route_calls_service(self):
        expected_payload = {"data": [{"name": "views", "values": [{"value": 123}]}]}
        with patch(
            "routes.social_insights_routes.social_insights.get_instagram_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/insta/insights/test_user",
                params={
                    "metric": "views",
                    "period": "day",
                    "since": "2026-04-01",
                    "until": "2026-04-10",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            "test_user",
            "views",
            "day",
            "2026-04-01",
            "2026-04-10",
        )

    def test_csv_import_route_calls_service(self):
        expected_payload = {"message": "CSV import completed."}
        with patch(
            "routes.social_insights_routes.social_insights.import_instagram_csvs",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/insta/csvs/test_user",
                files=[
                    (
                        "files",
                        ("Views.csv", b"Date,Primary\n2026-04-10,100\n", "text/csv"),
                    )
                ],
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_user"
        assert len(args[1]) == 1
        assert args[1][0].filename == "Views.csv"

    def test_folder_import_route_calls_service(self):
        expected_payload = {"message": "CSV import completed.", "source": "uploaded_folder_zip"}
        with patch(
            "routes.social_insights_routes.social_insights.import_instagram_folder",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/insta/folders/test_user",
                files={
                    "folder_archive": (
                        "channelwise.zip",
                        b"PK\x03\x04zip-content",
                        "application/zip",
                    )
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_user"
        assert args[1].filename == "channelwise.zip"

    def test_folders_alias_calls_service(self):
        expected_payload = {"message": "CSV import completed.", "source": "uploaded_folder_zip"}
        with patch(
            "routes.social_insights_routes.social_insights.import_instagram_folder",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/insta/folder/test_user",
                files={
                    "folder_archive": (
                        "channelwise.zip",
                        b"PK\x03\x04zip-content",
                        "application/zip",
                    )
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_user"
        assert args[1].filename == "channelwise.zip"

    def test_get_instagram_layout_route_calls_service(self):
        expected_payload = {
            "ig_user_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "top-posts-1",
                    "widget_id": "top-posts",
                    "config": {"postMetricKey": "views"},
                }
            ],
            "updated_at": "2026-04-14T00:00:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.get_instagram_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/insta/layout/ClubArtizen",
                params={"dashboard_user_id": "dashboard-user-1"},
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            ig_user_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
        )

    def test_save_instagram_layout_route_calls_service(self):
        expected_payload = {
            "ig_user_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "dynamic-metric-line-1",
                    "widget_id": "dynamic-metric-line",
                    "config": {"metricKey": "reach"},
                },
                {
                    "instance_id": "top-posts-1",
                    "widget_id": "top-posts",
                    "config": {"postMetricKey": "views"},
                },
            ],
            "updated_at": "2026-04-14T00:10:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.save_instagram_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.put(
                "/manual/insta/layout/ClubArtizen",
                json={
                    "dashboard_user_id": "dashboard-user-1",
                    "active_widgets": [
                        {
                            "instance_id": "dynamic-metric-line-1",
                            "widget_id": "dynamic-metric-line",
                            "config": {"metricKey": "reach"},
                        },
                        {
                            "instance_id": "top-posts-1",
                            "widget_id": "top-posts",
                            "config": {"postMetricKey": "views"},
                        },
                    ],
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        kwargs = mocked_service.await_args.kwargs
        assert kwargs["ig_user_id"] == "ClubArtizen"
        assert kwargs["dashboard_user_id"] == "dashboard-user-1"
        assert len(kwargs["active_widgets"]) == 2
        assert kwargs["active_widgets"][0].instance_id == "dynamic-metric-line-1"
        assert kwargs["active_widgets"][1].widget_id == "top-posts"

    def test_post_csv_import_route_calls_service(self):
        expected_payload = {"message": "Post CSV import completed."}
        with patch(
            "routes.social_insights_routes.social_insights.import_instagram_posts_csv",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/insta/posts/test_user/csvs",
                files=[
                    (
                        "posts_csv",
                        (
                            "posts-1.csv",
                            (
                                b"Post ID,Account ID,Publish time,Post type,Date,Views,Likes,Shares,Comments,Saves,Reach,Follows\n"
                                b"1801,1784,03/27/2026 06:08,IG image,Lifetime,160,5,3,0,0,45,0\n"
                            ),
                            "text/csv",
                        ),
                    ),
                    (
                        "posts_csv",
                        (
                            "posts-2.csv",
                            (
                                b"Post ID,Account ID,Publish time,Post type,Date,Views,Likes,Shares,Comments,Saves,Reach,Follows\n"
                                b"1802,1784,03/28/2026 06:08,IG image,Lifetime,120,7,1,1,1,40,0\n"
                            ),
                            "text/csv",
                        ),
                    ),
                ],
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_user"
        assert len(args[1]) == 2
        assert [uploaded.filename for uploaded in args[1]] == ["posts-1.csv", "posts-2.csv"]

    def test_post_insights_route_calls_service(self):
        expected_payload = {"data": [{"name": "views", "values": [{"value": 160}]}]}
        with patch(
            "routes.social_insights_routes.social_insights.get_instagram_post_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/insta/posts/1801/insights",
                params={
                    "metric": "views",
                    "period": "lifetime",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            instagram_media_id="1801",
            metric="views",
            period="lifetime",
            post_id=None,
            breakdown=None,
        )

    def test_post_insights_route_allows_empty_metric_and_post_id_option(self):
        expected_payload = {"data": []}
        with patch(
            "routes.social_insights_routes.social_insights.get_instagram_post_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/insta/posts/ClubArtizen/insights",
                params={
                    "period": "lifetime",
                    "post_id": "1801",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            instagram_media_id="ClubArtizen",
            metric=None,
            period="lifetime",
            post_id="1801",
            breakdown=None,
        )


class TestFacebookInsightsRoutes:
    def test_insights_route_calls_service(self):
        expected_payload = {"data": [{"name": "viewers", "values": [{"value": 42}]}]}
        with patch(
            "routes.social_insights_routes.social_insights.get_facebook_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/facebook/insights/test_page",
                params={
                    "metric": "viewers",
                    "period": "day",
                    "since": "2026-04-01",
                    "until": "2026-04-10",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            "test_page",
            "viewers",
            "day",
            "2026-04-01",
            "2026-04-10",
        )

    def test_get_facebook_layout_route_calls_service(self):
        expected_payload = {
            "fb_user_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "dynamic-metric-line-1",
                    "widget_id": "dynamic-metric-line",
                    "config": {"metricKey": "views"},
                }
            ],
            "updated_at": "2026-04-14T00:00:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.get_facebook_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/facebook/layout/ClubArtizen",
                params={"dashboard_user_id": "dashboard-user-1"},
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            fb_user_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
        )

    def test_save_facebook_layout_route_calls_service(self):
        expected_payload = {
            "fb_user_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "channel-overview-1",
                    "widget_id": "channel-overview",
                    "config": {},
                },
                {
                    "instance_id": "dynamic-metric-line-1",
                    "widget_id": "dynamic-metric-line",
                    "config": {"metricKey": "viewers"},
                },
            ],
            "updated_at": "2026-04-14T00:10:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.save_facebook_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.put(
                "/manual/facebook/layout/ClubArtizen",
                json={
                    "dashboard_user_id": "dashboard-user-1",
                    "active_widgets": [
                        {
                            "instance_id": "channel-overview-1",
                            "widget_id": "channel-overview",
                            "config": {},
                        },
                        {
                            "instance_id": "dynamic-metric-line-1",
                            "widget_id": "dynamic-metric-line",
                            "config": {"metricKey": "viewers"},
                        },
                    ],
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        kwargs = mocked_service.await_args.kwargs
        assert kwargs["fb_user_id"] == "ClubArtizen"
        assert kwargs["dashboard_user_id"] == "dashboard-user-1"
        assert len(kwargs["active_widgets"]) == 2
        assert kwargs["active_widgets"][0].instance_id == "channel-overview-1"
        assert kwargs["active_widgets"][1].widget_id == "dynamic-metric-line"

    def test_csv_import_route_calls_service(self):
        expected_payload = {"message": "CSV import completed."}
        with patch(
            "routes.social_insights_routes.social_insights.import_facebook_csvs",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/facebook/csvs/test_page",
                files=[
                    (
                        "files",
                        ("Viewers.csv", b"Date,Primary\n2026-04-10,50\n", "text/csv"),
                    )
                ],
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_page"
        assert len(args[1]) == 1
        assert args[1][0].filename == "Viewers.csv"

    def test_folder_import_route_calls_service(self):
        expected_payload = {"message": "CSV import completed.", "source": "uploaded_folder_zip"}
        with patch(
            "routes.social_insights_routes.social_insights.import_facebook_folder",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/facebook/folders/test_page",
                files={
                    "folder_archive": (
                        "facebook-channelwise.zip",
                        b"PK\x03\x04zip-content",
                        "application/zip",
                    )
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_page"
        assert args[1].filename == "facebook-channelwise.zip"


class TestLinkedInInsightsRoutes:
    def test_insights_route_calls_service(self):
        expected_payload = {"data": [{"name": "impressions_total", "values": [{"value": 420}]}]}
        with patch(
            "routes.social_insights_routes.social_insights.get_linkedin_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/linkedin/insights/test_org",
                params={
                    "metric": "impressions_total",
                    "period": "day",
                    "since": "2026-04-01",
                    "until": "2026-04-10",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            "test_org",
            "impressions_total",
            "day",
            "2026-04-01",
            "2026-04-10",
        )

    def test_xls_import_route_calls_service(self):
        expected_payload = {"message": "LinkedIn XLS import completed."}
        with patch(
            "routes.social_insights_routes.social_insights.import_linkedin_xls",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/linkedin/xls/test_org",
                files=[
                    (
                        "xls_file",
                        (
                            "linkedin-export.xls",
                            b"D0CF11E0A1B11AE1-binary",
                            "application/vnd.ms-excel",
                        ),
                    )
                ],
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_org"
        assert len(args[1]) == 1
        assert args[1][0].filename == "linkedin-export.xls"

    def test_get_linkedin_layout_route_calls_service(self):
        expected_payload = {
            "li_org_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "dynamic-metric-line-1",
                    "widget_id": "dynamic-metric-line",
                    "config": {"metricKey": "impressions_total"},
                }
            ],
            "updated_at": "2026-04-14T00:00:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.get_linkedin_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/linkedin/layout/ClubArtizen",
                params={"dashboard_user_id": "dashboard-user-1"},
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            li_org_id="ClubArtizen",
            dashboard_user_id="dashboard-user-1",
        )

    def test_save_linkedin_layout_route_calls_service(self):
        expected_payload = {
            "li_org_id": "ClubArtizen",
            "dashboard_user_id": "dashboard-user-1",
            "active_widgets": [
                {
                    "instance_id": "channel-overview-1",
                    "widget_id": "channel-overview",
                    "config": {},
                }
            ],
            "updated_at": "2026-04-14T00:10:00Z",
        }
        with patch(
            "routes.social_insights_routes.social_insights.save_linkedin_dashboard_layout",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.put(
                "/manual/linkedin/layout/ClubArtizen",
                json={
                    "dashboard_user_id": "dashboard-user-1",
                    "active_widgets": [
                        {
                            "instance_id": "channel-overview-1",
                            "widget_id": "channel-overview",
                            "config": {},
                        }
                    ],
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        kwargs = mocked_service.await_args.kwargs
        assert kwargs["li_org_id"] == "ClubArtizen"
        assert kwargs["dashboard_user_id"] == "dashboard-user-1"
        assert len(kwargs["active_widgets"]) == 1
        assert kwargs["active_widgets"][0].widget_id == "channel-overview"

    def test_post_insights_route_calls_service(self):
        expected_payload = {"data": [{"name": "impressions", "values": [{"value": 120}]}]}
        with patch(
            "routes.social_insights_routes.social_insights.get_linkedin_post_insights",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.get(
                "/manual/linkedin/posts/123456789/insights",
                params={
                    "metric": "impressions",
                    "period": "lifetime",
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        mocked_service.assert_awaited_once_with(
            linkedin_post_id="123456789",
            metric="impressions",
            period="lifetime",
            post_id=None,
            breakdown=None,
        )

    def test_folders_alias_calls_service(self):
        expected_payload = {"message": "CSV import completed.", "source": "uploaded_folder_zip"}
        with patch(
            "routes.social_insights_routes.social_insights.import_facebook_folder",
            new=AsyncMock(return_value=expected_payload),
        ) as mocked_service:
            response = client.post(
                "/manual/facebook/folder/test_page",
                files={
                    "folder_archive": (
                        "facebook-channelwise.zip",
                        b"PK\x03\x04zip-content",
                        "application/zip",
                    )
                },
            )

        assert response.status_code == 200
        assert response.json() == expected_payload
        args = mocked_service.await_args.args
        assert args[0] == "test_page"
        assert args[1].filename == "facebook-channelwise.zip"
