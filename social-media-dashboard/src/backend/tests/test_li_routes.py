import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_li_overview_returns_200():
    response = client.get("/api/li/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_followers" in data
    assert "new_followers" in data

def test_li_posts_returns_200():
    response = client.get("/api/li/posts")
    assert response.status_code == 200
    data = response.json()
    assert "posts" in data
    assert len(data["posts"]) > 0
    assert "reach" in data["posts"][0]

def test_li_demographics_returns_200():
    response = client.get("/api/li/demographics")
    assert response.status_code == 200
    data = response.json()
    assert "demographics" in data
    assert len(data["demographics"]) > 0
    assert "category" in data["demographics"][0]

def test_li_page_traffic_returns_200():
    response = client.get("/api/li/page-traffic")
    assert response.status_code == 200
    data = response.json()
    assert "traffic_data" in data
    assert len(data["traffic_data"]) > 0
    assert "page_views" in data["traffic_data"][0]
