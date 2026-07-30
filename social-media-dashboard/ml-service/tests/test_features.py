import pytest
import polars as pl
import numpy as np
from src.features import engineer_features, get_sentiment

def test_get_sentiment():
    assert get_sentiment("I love this beautiful product!") > 0
    assert get_sentiment("This is terrible and awful.") < 0
    assert get_sentiment("") == 0.0
    assert get_sentiment(None) == 0.0

def test_engineer_features_shape_and_types(sample_raw_data):
    X, y = engineer_features(sample_raw_data)
    
    # Check return types
    assert X is not None
    assert y is not None
    assert len(X) == len(sample_raw_data)
    assert len(y) == len(sample_raw_data)
    
    # Check that text features were engineered correctly
    assert "hashtag_count" in X.columns
    assert "word_count" in X.columns
    assert "sentiment" in X.columns
    
    # Check the specific hashtag counts based on our sample data
    hashtag_counts = X["hashtag_count"].to_list()
    assert hashtag_counts[0] == 2 # "#khadi #sustainable"
    assert hashtag_counts[1] == 0 
    assert hashtag_counts[2] == 0

def test_engineer_features_cyclical_encoding(sample_raw_data):
    X, _ = engineer_features(sample_raw_data)
    
    # Ensure sine/cosine features were created
    expected_cols = ["hour_sin", "hour_cos", "weekday_sin", "weekday_cos"]
    for col in expected_cols:
        assert col in X.columns
        
        # Verify values are bounded between -1 and 1
        max_val = X[col].max()
        min_val = X[col].min()
        assert max_val <= 1.0
        assert min_val >= -1.0

def test_engineer_features_one_hot_encoding(sample_raw_data):
    X, _ = engineer_features(sample_raw_data)
    
    # Check that the categorical column was dropped and replaced with dummies
    assert "Post type" not in X.columns
    assert "Post type_IG reel" in X.columns
    assert "Post type_IG image" in X.columns

def test_engineer_features_inference_mode():
    """Tests the pipeline when 'Like_Rate' is missing (how the API uses it during /predict)."""
    inference_df = pl.DataFrame({
        "Description": ["Just testing inference"],
        "Duration (sec)": [10],
        "Publish time": ["10/24/2026 18:30"],
        "Post type": ["IG reel"]
    })
    
    X, y = engineer_features(inference_df)
    
    # y should be None during inference
    assert y is None
    
    # X should still process correctly
    assert "hashtag_count" in X.columns
    assert X.shape[0] == 1

def test_engineer_features_empty_dataframe():
    """Ensures the pipeline doesn't crash on an empty dataframe."""
    schema = {
        "Description": pl.Utf8, "Duration (sec)": pl.Int64, 
        "Publish time": pl.Utf8, "Post type": pl.Utf8, "Like_Rate": pl.Float64
    }
    empty_df = pl.DataFrame(schema=schema)
    
    X, y = engineer_features(empty_df)
    assert len(X) == 0
    assert len(y) == 0