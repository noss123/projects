import os
import pytest
import polars as pl

# mock environment variables (Runs before any other imports)
os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["MONGO_DB_NAME"] = "test_db"
os.environ["MONGO_DB_IG_CLUSTER"] = "test_posts"
os.environ["GEMINI_API_KEY"] = "dummy_gemini_key"
os.environ["PINTEREST_API_TOKEN"] = "dummy_pinterest_key"

@pytest.fixture
def sample_raw_data() -> pl.DataFrame:
    """Provides a consistent, dummy Polars DataFrame for ML testing."""
    return pl.DataFrame({
        "Post ID": [1, 2, 3],
        "Description": [
            "Check out our new khadi collection! #khadi #sustainable",
            "Beautiful pastel vibes today.",
            "No hashtags here, just a plain sentence."
        ],
        "Duration (sec)": [15, 0, 30],
        "Publish time": ["10/24/2026 18:30", "10/25/2026 09:00", "10/26/2026 23:45"],
        "Post type": ["IG reel", "IG image", "IG reel"],
        "Like_Rate": [0.05, 0.02, 0.08]
    })