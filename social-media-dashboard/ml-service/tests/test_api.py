import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import mongomock

# We must mock MongoClient BEFORE importing api
from src import api 

# Override the real database with an in-memory mock database
api.mongo_client = mongomock.MongoClient()
api.db = api.mongo_client["test_db"]
api.terms_collection = api.db["tracked_terms"]
api.posts_collection = api.db["test_posts"]

client = TestClient(api.app)

@pytest.fixture(autouse=True)
def mock_globals(mocker):
    """Mocks the loaded ML models in api.py so we don't need real .joblib files."""
    mocker.patch.object(api, "MODEL", MagicMock())
    mocker.patch.object(api, "EXPLAINER", MagicMock())
    mocker.patch.object(api, "MODEL_COLUMNS", ["hashtag_count", "word_count"])
    
    # Setup mock returns for the ML model
    api.MODEL.predict.return_value = [0.085]
    api.EXPLAINER.shap_values.return_value = [[0.01, -0.005]]
    api.EXPLAINER.expected_value = 0.05

def test_predict_endpoint_success():
    payload = {
        "description": "Awesome new post #test",
        "duration_sec": 15,
        "publish_time": "10/24/2026 18:30",
        "post_type": "IG reel"
    }
    
    response = client.post("/predict", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "predicted_like_rate" in data
    assert "shap_explanations" in data
    assert data["predicted_like_rate"] == 0.085

def test_predict_endpoint_invalid_date():
    payload = {
        "description": "Awesome new post",
        "duration_sec": 0,
        "publish_time": "NOT A REAL DATE",
        "post_type": "IG image"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 400
    assert "Feature extraction failed" in response.json()["detail"]

def test_terms_crud_endpoints():
    # Test Adding
    res_add = client.post("/terms/add", json={"term": "khadi"})
    assert res_add.status_code == 200
    
    # Test Duplicate
    res_dup = client.post("/terms/add", json={"term": "khadi"})
    assert "already being tracked" in res_dup.json()["message"]
    
    # Test Listing
    res_list = client.get("/terms/list")
    assert res_list.status_code == 200
    assert "khadi" in res_list.json()["tracked_terms"]
    
    # Test Removing
    res_del = client.request("DELETE", "/terms/remove", json={"term": "khadi"})
    assert res_del.status_code == 200
    
    # Verify Removal
    res_list_after = client.get("/terms/list")
    assert "khadi" not in res_list_after.json()["tracked_terms"]

def test_generate_ideas_endpoint(mocker):
    # Seed the mock database with a top performing post
    api.posts_collection.insert_one({
        "post_type": "IG reel",
        "like_rate": 0.15,
        "description": "This is a viral example"
    })
    
    # Mock the Gemini Client response
    mock_response = MagicMock()
    mock_response.text = "Here are 3 ideas..."
    mocker.patch.object(api.client.models, "generate_content", return_value=mock_response)
    
    payload = {"topic": "Diwali", "post_type": "IG reel"}
    response = client.post("/generate_ideas", json=payload)
    
    assert response.status_code == 200
    assert response.json()["ideas"] == "Here are 3 ideas..."

def test_generate_insight_no_seed_terms():
    """Test RAG pipeline aborts cleanly if the user hasn't added any terms."""
    # Ensure terms collection is empty
    api.terms_collection.delete_many({})
    
    response = client.post("/generate_insight")
    assert response.status_code == 200
    assert "No seed terms configured" in response.json()["message"]

def test_generate_insight_success(mocker):
    """Tests the full RAG pipeline: DB -> Trends -> Vector Search -> LLM"""
    
    # Mock DB: Add a seed term
    api.terms_collection.insert_one({"term": "khadi", "active": True})
    
    # Mock Trend Ingestor: Force it to detect a trend
    mocker.patch("src.api.get_rising_trends", return_value=[{"trend": "khadi", "momentum": 50.0}])
    mocker.patch("src.api.fetch_pinterest_trends", return_value=[])
    
    # Mock Vector DB: Return a fake historical post
    mock_similar_posts = [{
        "description": "Old khadi post",
        "metadata": {"Post_type": "IG reel", "Like_Rate": 0.05}
    }]
    mocker.patch("src.api.retrieve_similar_posts", return_value=mock_similar_posts)
    
    # Mock Gemini LLM
    mock_llm_response = mocker.Mock()
    mock_llm_response.text = "Here is your strategic insight on khadi."
    mocker.patch.object(api.client.models, "generate_content", return_value=mock_llm_response)
    
    # Run Endpoint
    response = client.post("/generate_insight")
    
    assert response.status_code == 200
    data = response.json()
    assert data["detected_trend"] == "khadi"
    assert data["momentum"] == 50.0
    assert data["historical_posts_referenced"] == 1
    assert data["strategy_and_caption"] == "Here is your strategic insight on khadi."

def test_admin_reload_model(mocker):
    """Ensures the hot-reload endpoint works."""
    # Mock joblib.load so it doesn't actually try to read files from disk
    mocker.patch("src.api.joblib.load", return_value="mocked_artifact")
    mocker.patch("src.api.shap.TreeExplainer", return_value="mocked_explainer")
    
    response = client.post("/admin/reload_model")
    
    assert response.status_code == 200
    assert "successfully hot-reloaded" in response.json()["message"]