import polars as pl
import pandas as pd
import numpy as np
import joblib
import shap
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

from src.features import engineer_features
from src.data_loader import load_and_clean_data
from src.trend_ingestor import get_rising_trends, fetch_pinterest_trends
from src.vector_store import build_vector_db, retrieve_similar_posts
from src.retrain_model import trigger_retraining
from src.sync_db import sync_new_posts

# load environment variables
load_dotenv()

# connect to MongoDB Atlas
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
MONGO_DB_IG_CLUSTER = os.getenv("MONGO_DB_IG_CLUSTER")

if not MONGO_URI or not MONGO_DB_NAME or not MONGO_DB_IG_CLUSTER:
    print("Missing critical environment variables.")

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB_NAME]
terms_collection = db["tracked_terms"]
posts_collection = db[MONGO_DB_IG_CLUSTER]

# configure Gemini API
gemini_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=gemini_key)

app = FastAPI(title="Engagement Prediction & Generation API")

# global variables for RAM state
MODEL = None
MODEL_COLUMNS = None
EXPLAINER = None

class PostRequest(BaseModel):
    description: str
    duration_sec: int
    publish_time: str
    post_type: str

class TermRequest(BaseModel):
    term: str

class IdeationRequest(BaseModel):
    topic: str
    post_type: str = "IG reel" # default, but can be overridden

# on startup
# to never be populated and cold-start/vector-DB sync logic to be lost.
@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL, MODEL_COLUMNS, EXPLAINER
 
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "../models/rf_engagement_model.joblib")
    cols_path = os.path.join(base_dir, "../models/model_columns.joblib")
 
    if not os.getenv("GEMINI_API_KEY"):
        print("WARNING: GEMINI_API_KEY not found in .env")
 
    # cold-start check: train model if artifacts are missing
    if not os.path.exists(model_path):
        print("WARNING: Model artifacts not found. Initiating Cold Start sequence...")
        print("Fetching data and training initial model...")
        trigger_retraining()  # pulls Mongo data and creates the .joblib files
  
    # sync Vector Database — ensure ChromaDB is aligned with MongoDB.
    # If ChromaDB is empty (true cold start), seed it from the historical CSV data.
    print("Syncing Vector Database...")
    sync_new_posts()
 
    # load ML model artifacts into RAM
    print("Loading ML models into memory...")
    MODEL = joblib.load(model_path)
    MODEL_COLUMNS = joblib.load(cols_path)
    EXPLAINER = shap.TreeExplainer(MODEL)
 
    print("Server initialized and ready for traffic.")
    yield  # application runs here
    # (shutdown logic can go here if needed)

app = FastAPI(title="Engagement Prediction & Generation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate_ideas")
def generate_ideas_from_top_posts(req: IdeationRequest):
    """Generates post ideas based on historical top performers."""
    
    # fetch top performing posts of the requested type from MongoDB
    # sort by like_rate descending, limit to top 5
    top_historical_posts = list(posts_collection.find(
        {"post_type": req.post_type}
    ).sort("like_rate", -1).limit(5))

    if not top_historical_posts:
        return {"message": "Not enough historical data for this post type."}

    # 2. Format context for Gemini
    context_text = "\n\n".join([
        f"- High-Performing Example (Like Rate: {post.get('like_rate', 0):.4f}): {post.get('description', '')}" 
        for post in top_historical_posts
    ])

    # prompt gemini
    prompt = f"""
    You are an expert social media strategist. 
    The client wants to post about: "{req.topic}" using the format: {req.post_type}.

    Here are our highest performing past posts for this format to understand our brand voice and what our audience likes:
    {context_text}

    Based on the tone and structure of these successful posts, generate 3 unique, highly engaging post ideas for the new topic. 
    For each idea, provide:
    1. A short visual hook/concept
    2. The full caption
    """

    try:
        response = client.models.generate_content(
            model='gemma-3-4b-it',
            contents=prompt
        )
        return {"topic": req.topic, "ideas": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# the predictor
@app.post("/predict")
def predict_engagement(post: PostRequest):
    df = pl.DataFrame({
        "Description": [post.description],
        "Duration (sec)": [post.duration_sec],
        "Publish time": [post.publish_time],
        "Post type": [post.post_type],
        "Post ID": [0], 
        "Like_Rate": [0.0] 
    })

    try:
        X_polars, _ = engineer_features(df)
        X_pandas = X_polars.to_pandas()

        # Catch silent nulls caused by bad date parsing
        if X_pandas.isna().any().any():
            raise ValueError("Invalid publish_time format.")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature extraction failed: {str(e)}")

    for col in MODEL_COLUMNS:
        if col not in X_pandas.columns:
            X_pandas[col] = 0
            
    X_final = X_pandas[MODEL_COLUMNS]
    prediction = MODEL.predict(X_final)[0]
    shap_values = EXPLAINER.shap_values(X_final)
    
    shap_dict = {
        col: float(val) 
        for col, val in zip(MODEL_COLUMNS, shap_values[0]) 
        if abs(val) > 0.0001
    }
    shap_dict = dict(sorted(shap_dict.items(), key=lambda item: abs(item[1]), reverse=True))

    baseline = EXPLAINER.expected_value
    if isinstance(baseline, np.ndarray):
        baseline = baseline[0]

    return {
        "predicted_like_rate": round(float(prediction), 4),
        "baseline_rate": round(float(baseline), 4),
        "shap_explanations": shap_dict
    }
    
@app.post("/generate_insight")
def generate_trend_insight():
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")

    # pull the dynamic list of terms from Mongo
    active_terms_docs = list(terms_collection.find({"active": True}))
    seed_keywords = [doc["term"] for doc in active_terms_docs]
    
    if not seed_keywords:
        return {"message": "No seed terms configured. Please add some via /terms/add."}

    print(f"Scanning ecosystem for trends across {len(seed_keywords)} terms...")
    
    # check both sources
    google_spikes = get_rising_trends(seed_keywords) # from trend_ingestor.py
    pinterest_spikes = fetch_pinterest_trends(seed_keywords) # from trend_ingestor.py
    
    # combine and sort to find the absolute hottest trend
    all_trends = google_spikes + pinterest_spikes
    all_trends = sorted(all_trends, key=lambda x: x["momentum"], reverse=True)
    
    if not all_trends:
        return {"message": "No significant trends detected today based on your active seed terms."}
        
    top_trend_data = all_trends[0]
    top_trend = top_trend_data["trend"]
    momentum = top_trend_data["momentum"]
    
    # retrieve similar historical posts from our Vector DB
    print(f"Retrieving internal context for: {top_trend}")
    similar_posts = retrieve_similar_posts(top_trend, top_k=3)
    
    if not similar_posts:
        context_text = "We have no historical posts related to this trend."
    else:
        context_text = "\n\n".join([
            f"- Caption: {post['description']}\n  Format: {post['metadata']['Post_type']}\n  Like Rate: {post['metadata']['Like_Rate']:.4f}" 
            for post in similar_posts
        ])

    # construct the RAG Prompt for Gemini
    prompt = f"""
    You are an expert social media strategist for an artisanal lifestyle brand.
    
    MARKET ALERT: Google Search volume for '{top_trend}' has spiked by {momentum}% in the last 7 days.
    
    OUR HISTORICAL PERFORMANCE ON THIS TOPIC:
    {context_text}

    ------------------------
    TASK:
    Based on the market trend and our historical data, generate:
    1. A short, actionable strategic recommendation (Should we post about this? What format works best?)
    2. A ready-to-post, highly engaging caption capitalizing on this trend.
    
    Format your response clearly.
    """

    try:
        response = client.models.generate_content(
            model='gemma-3-4b-it',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=500
            )
        )
        
        return {
            "detected_trend": top_trend,
            "momentum": momentum,
            "strategy_and_caption": response.text,
            "historical_posts_referenced": len(similar_posts)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Generation failed: {str(e)}")
    


@app.post("/terms/add")
def add_seed_term(request: TermRequest):
    # Check if it already exists to avoid duplicates
    existing = terms_collection.find_one({"term": request.term.lower()})
    if existing:
        return {"message": f"Term '{request.term}' is already being tracked."}
        
    terms_collection.insert_one({"term": request.term.lower(), "active": True})
    return {"message": f"Successfully added '{request.term}' to the daily Watchtower list."}

@app.get("/terms/list")
def get_seed_terms():
    terms = list(terms_collection.find({"active": True}, {"_id": 0, "term": 1}))
    return {"tracked_terms": [t["term"] for t in terms]}

@app.delete("/terms/remove")
def remove_seed_term(request: TermRequest):
    result = terms_collection.delete_one({"term": request.term.lower()})
    if result.deleted_count > 0:
         return {"message": f"Removed '{request.term}' from tracking."}
    raise HTTPException(status_code=404, detail="Term not found.")

# api endpoint to hot load the model after update
@app.post("/admin/reload_model")
def reload_model_into_ram():
    global MODEL, MODEL_COLUMNS, EXPLAINER
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "../models/rf_engagement_model.joblib")
    cols_path = os.path.join(base_dir, "../models/model_columns.joblib")
    
    try:
        MODEL = joblib.load(model_path)
        MODEL_COLUMNS = joblib.load(cols_path)
        EXPLAINER = shap.TreeExplainer(MODEL)
        return {"message": "Model successfully hot-reloaded into RAM."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")