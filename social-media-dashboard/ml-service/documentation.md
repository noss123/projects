# Engagement Prediction & Generation API — Documentation

**Base URL:** `http://localhost:8001`  
**Framework:** FastAPI  
**Version:** 1.0.0

---

## Overview

This API serves a social media engagement intelligence system built for artisanal lifestyle brands. It exposes three categories of functionality:

- **Prediction** — Score a draft post before publishing using a trained Random Forest model with SHAP-based explanations.
- **AI Generation** — Generate post ideas and trend-aware captions using Google Gemini, grounded in your brand's own historical top performers via RAG (Retrieval-Augmented Generation).
- **Trend Watchlist Management** — Manage the list of seed keywords used to monitor Google Trends and Pinterest for rising momentum signals.

### Authentication

No authentication is currently required. All endpoints are open. It is strongly recommended to add API key or OAuth authentication before any production deployment.

### Environment Variables Required

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | Database name |
| `MONGO_DB_IG_CLUSTER` | Collection name for Instagram posts |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PINTEREST_API_TOKEN` | Pinterest API bearer token (optional) |

---

## Server Startup Behaviour

On startup, the server automatically runs the following sequence before accepting any traffic:

1. **Cold-start check** — If ML model artifacts (`rf_engagement_model.joblib`, `model_columns.joblib`) are not found on disk, the server pulls all post data from MongoDB, trains the model from scratch, and saves the artifacts.
2. **Historical data load** — The full post dataset is loaded from source CSVs into RAM for use as LLM context.
3. **Vector DB sync** — New posts in MongoDB that are not yet in ChromaDB are embedded and upserted. If ChromaDB is completely empty, it is seeded from the full historical CSV dataset.
4. **Model load** — The trained `RandomForestRegressor` and `TreeExplainer` are loaded into memory for low-latency inference.

---

## Endpoints

---

### `POST /predict`

Predicts the like rate for a proposed post and explains which features are driving the prediction.

**How it works:**  
The post fields are passed through the same feature engineering pipeline used during training (`features.py`), producing a numerical feature vector. The loaded `RandomForestRegressor` scores it, and a `TreeExplainer` (SHAP) decomposes the prediction into per-feature contributions. Only features with an absolute SHAP value above `0.0001` are returned, sorted by impact.

#### Request Body

```json
{
  "description": "string",
  "duration_sec": "integer",
  "publish_time": "string (MM/DD/YYYY HH:MM)",
  "post_type": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | Yes | The post caption / description text. Used to derive hashtag count, word count, and sentiment score. |
| `duration_sec` | integer | Yes | Video duration in seconds. Pass `0` for image posts. |
| `publish_time` | string | Yes | Scheduled publish time in `MM/DD/YYYY HH:MM` format (e.g. `"04/15/2025 18:30"`). Used to derive cyclical hour and weekday features. |
| `post_type` | string | Yes | The post format. Common values: `"IG reel"`, `"IG image"`, `"IG carousel"`. Must match the values used during training for one-hot encoding to align correctly. |

#### Example Request

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Handcrafted with love. Our new block-print tote bags are here! #handmade #sustainable #blockprint",
    "duration_sec": 0,
    "publish_time": "04/15/2025 18:30",
    "post_type": "IG image"
  }'
```

#### Response

```json
{
  "predicted_like_rate": 0.0412,
  "baseline_rate": 0.0287,
  "shap_explanations": {
    "hour_sin": 0.0089,
    "hashtag_count": 0.0054,
    "sentiment": 0.0031,
    "Post type_IG image": -0.0012
  }
}
```

| Field | Type | Description |
|---|---|---|
| `predicted_like_rate` | float | The model's predicted like rate (Likes / Reach) for this post. |
| `baseline_rate` | float | The model's average expected like rate across all training data. Acts as a reference point. |
| `shap_explanations` | object | Dictionary of feature names → SHAP values. A **positive** value means that feature pushed the prediction **above** baseline; a **negative** value means it pulled it **below**. Sorted by absolute magnitude. |

#### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Feature extraction failed — typically caused by an unparseable `publish_time` format or missing required fields. |
| `500 Internal Server Error` | Model not loaded (server startup failed). |

---

### `POST /generate_ideas`

Generates three creative post ideas for a given topic, grounded in your brand's own top-performing historical posts for that format.

**How it works:**  
The top 5 highest `like_rate` posts matching the requested `post_type` are fetched from MongoDB and formatted as examples. These are passed to `gemini-2.0-flash` as few-shot context, instructing the model to generate new ideas that match the brand's tone and structure.

#### Request Body

```json
{
  "topic": "string",
  "post_type": "string (optional)"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `topic` | string | Yes | — | The subject or theme for the new post (e.g. `"Diwali gifting"`, `"sustainable packaging launch"`). |
| `post_type` | string | No | `"IG reel"` | The format to generate ideas for. Should match values in MongoDB (e.g. `"IG reel"`, `"IG image"`). |

#### Example Request

```bash
curl -X POST http://localhost:8001/generate_ideas \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Diwali gifting hampers",
    "post_type": "IG reel"
  }'
```

#### Response

```json
{
  "topic": "Diwali gifting hampers",
  "ideas": "**Idea 1: The Unboxing Reveal**\nVisual hook: Slow pan over a beautifully wrapped hamper as diyas flicker in the background...\n\n**Idea 2: ...**"
}
```

| Field | Type | Description |
|---|---|---|
| `topic` | string | Echo of the requested topic. |
| `ideas` | string | Free-text markdown response from Gemini containing 3 post ideas, each with a visual hook and full caption. |

#### Soft Failure

If no historical posts exist for the requested `post_type`, the endpoint returns HTTP `200` with:

```json
{
  "message": "Not enough historical data for this post type."
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `500 Internal Server Error` | Gemini API call failed. The `detail` field contains the upstream error message. |

---

### `POST /generate_insight`

Scans Google Trends and Pinterest for the highest-momentum rising trend among your configured seed keywords, then uses RAG to generate a strategy recommendation and a ready-to-post caption.

**How it works:**
1. All active seed terms are fetched from the `tracked_terms` MongoDB collection.
2. Google Trends momentum is computed for each term (7-day recent average vs. prior 3-week average). Pinterest trend scores are fetched from the Pinterest API.
3. All results are merged and sorted by momentum. The single hottest trend is selected.
4. The top 3 semantically similar historical posts are retrieved from ChromaDB using Gemini text embeddings.
5. The trend signal and retrieved posts are assembled into a RAG prompt and sent to `gemma-3-4b-it` with `temperature=0.7`.

#### Request Body

None. This endpoint takes no input — it runs autonomously based on your configured watchlist.

#### Example Request

```bash
curl -X POST http://localhost:8001/generate_insight
```

#### Response

```json
{
  "detected_trend": "khadi fabric",
  "momentum": 73.4,
  "strategy_and_caption": "**Strategic Recommendation:**\nThis is a strong opportunity. Khadi-related content has historically...\n\n**Ready-to-Post Caption:**\nThe fabric of a thousand stories. 🌿 Our new khadi collection...",
  "historical_posts_referenced": 3
}
```

| Field | Type | Description |
|---|---|---|
| `detected_trend` | string | The seed keyword with the highest momentum score. |
| `momentum` | float | The percentage increase in search interest over the past 7 days relative to the prior 3-week average. |
| `strategy_and_caption` | string | Gemini's free-text response containing a strategic recommendation and a ready-to-post caption. |
| `historical_posts_referenced` | integer | Number of historical posts retrieved from ChromaDB and used as context. Will be `0` if no relevant posts were found. |

#### Soft Failures

| Condition | Response |
|---|---|
| No seed terms configured | `{"message": "No seed terms configured. Please add some via /terms/add."}` |
| No trend crossed the momentum threshold | `{"message": "No significant trends detected today based on your active seed terms."}` |

#### Error Responses

| Status | Condition |
|---|---|
| `500 Internal Server Error` | `GEMINI_API_KEY` is not set, or the Gemini API call failed. |

---

### `POST /terms/add`

Adds a new keyword to the trend watchlist used by `/generate_insight`.

**How it works:**  
The term is lowercased and inserted into the `tracked_terms` MongoDB collection with `active: true`. Duplicate terms are rejected.

#### Request Body

```json
{
  "term": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `term` | string | Yes | The keyword to track (e.g. `"block print"`, `"sustainable packaging"`). Stored in lowercase. |

#### Example Request

```bash
curl -X POST http://localhost:8001/terms/add \
  -H "Content-Type: application/json" \
  -d '{"term": "khadi"}'
```

#### Response — Success

```json
{
  "message": "Successfully added 'khadi' to the daily Watchtower list."
}
```

#### Response — Duplicate

```json
{
  "message": "Term 'khadi' is already being tracked."
}
```

---

### `GET /terms/list`

Returns all currently active seed terms on the watchlist.

#### Request Body

None.

#### Example Request

```bash
curl http://localhost:8001/terms/list
```

#### Response

```json
{
  "tracked_terms": ["khadi", "block print", "diwali hampers", "sustainable packaging"]
}
```

| Field | Type | Description |
|---|---|---|
| `tracked_terms` | array of strings | All terms where `active: true` in the `tracked_terms` collection. Returns an empty array if none are set. |

---

### `DELETE /terms/remove`

Removes a keyword from the trend watchlist.

**How it works:**  
Performs a hard delete (`delete_one`) on the matching document in `tracked_terms`. The term is matched case-insensitively (lowercased before lookup).

#### Request Body

```json
{
  "term": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `term` | string | Yes | The keyword to remove. Matched case-insensitively. |

#### Example Request

```bash
curl -X DELETE http://localhost:8001/terms/remove \
  -H "Content-Type: application/json" \
  -d '{"term": "khadi"}'
```

#### Response — Success

```json
{
  "message": "Removed 'khadi' from tracking."
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `404 Not Found` | The term does not exist in the watchlist. |

---

## Data Models

### `PostRequest`

Used by `POST /predict`.

```python
class PostRequest(BaseModel):
    description: str        # Post caption text
    duration_sec: int       # Video duration in seconds (0 for images)
    publish_time: str       # "MM/DD/YYYY HH:MM"
    post_type: str          # e.g. "IG reel", "IG image"
```

### `IdeationRequest`

Used by `POST /generate_ideas`.

```python
class IdeationRequest(BaseModel):
    topic: str
    post_type: str = "IG reel"  # optional, defaults to IG reel
```

### `TermRequest`

Used by `POST /terms/add` and `DELETE /terms/remove`.

```python
class TermRequest(BaseModel):
    term: str
```

---

## Feature Engineering Reference

The following features are computed from raw post fields and fed into the model. Understanding them helps you interpret SHAP explanations from `/predict`.

| Feature | Derived From | Description |
|---|---|---|
| `hashtag_count` | `description` | Number of `#` characters in the caption. |
| `word_count` | `description` | Number of space-separated tokens. |
| `sentiment` | `description` | TextBlob polarity score from `-1.0` (negative) to `1.0` (positive). |
| `hour_sin`, `hour_cos` | `publish_time` | Cyclical sine/cosine encoding of the hour-of-day (0–23), so 23:00 and 01:00 are treated as close. |
| `weekday_sin`, `weekday_cos` | `publish_time` | Cyclical sine/cosine encoding of the day-of-week (1=Mon, 7=Sun). |
| `Duration (sec)` | `duration_sec` | Raw video length passed directly as a feature. |
| `Post type_*` | `post_type` | One-hot encoded columns, one per post type seen during training (e.g. `Post type_IG reel`, `Post type_IG image`). |

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `200 OK` | Request succeeded. Note: some soft failure conditions also return `200` with a `message` field — check for this key. |
| `400 Bad Request` | Invalid input, most commonly a malformed `publish_time` string. |
| `404 Not Found` | Resource not found (e.g. term not in watchlist). |
| `500 Internal Server Error` | Server-side failure — Gemini API error, model not loaded, or missing environment variable. The `detail` field in the response body contains the specific error message. |

### `POST /admin/reload_model`

Hot-reloads the machine learning model artifacts into the server's RAM without dropping traffic or requiring a server restart.

**How it works:** When your automated weekly retraining script (`retrain_model.py`) finishes generating new `.joblib` files, the active FastAPI server doesn't automatically know they exist. This endpoint forces the server to read the disk, load the freshly trained `RandomForestRegressor`, updated `model_columns`, and new `TreeExplainer` (SHAP) from the `../models/` directory, and seamlessly update the global variables used by `/predict`.

#### Request Body

None. This endpoint takes no input parameters.

#### Example Request

```bash
curl -X POST http://localhost:8001/admin/reload_model
```

#### Response — Success (`200 OK`)

```json
{
  "message": "Model successfully hot-reloaded into RAM."
}
```

| Field | Type | Description |
|---|---|---|
| `message` | string | Confirmation that the new model artifacts are active for future predictions. |

#### Error Responses

| Status | Condition |
|---|---|
| `500 Internal Server Error` | Failed to load the model. Usually means the `.joblib` files are missing from the `../models/` directory, corrupted, or there are permission issues preventing the server from reading them. The `detail` field contains the specific Python exception. |