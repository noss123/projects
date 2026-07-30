import os
import sys
import polars as pl
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

try:
    from src.features import engineer_features
    from src.model import train_and_evaluate
except ModuleNotFoundError:
    from features import engineer_features  # type: ignore
    from model import train_and_evaluate    # type: ignore


def trigger_retraining():
    print("Initiating automated model retraining...")

    mongo_db_name = os.getenv("MONGO_DB_NAME")
    mongo_collection = os.getenv("MONGO_DB_IG_CLUSTER")

    mongo_client = MongoClient(os.getenv("MONGO_URI"))
    db = mongo_client[mongo_db_name]
    posts = list(db[mongo_collection].find({}, {"_id": 0}))  # exclude Mongo _id

    if len(posts) < 50:
        print("Not enough data to warrant retraining. Aborting.")
        return

    # convert to Polars DataFrame matching what features.py expects
    df = pl.DataFrame(posts)

    # rename snake_case Mongo fields to the title-case names features.py uses
    df = df.rename({
        "post_id": "Post ID",
        "description": "Description",
        "duration_sec": "Duration (sec)",
        "publish_time": "Publish time",
        "post_type": "Post type",
        "like_rate": "Like_Rate"
    })

    X, y = engineer_features(df)
    train_and_evaluate(X, y)  # saves new .joblib files automatically

    print("Retraining complete. New model artifacts saved.")


if __name__ == "__main__":
    trigger_retraining()