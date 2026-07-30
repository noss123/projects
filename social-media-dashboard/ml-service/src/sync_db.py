import os
import time
from pymongo import MongoClient
import chromadb
from dotenv import load_dotenv

try:
    from src.vector_store import embed_text
except ModuleNotFoundError:
    from vector_store import embed_text  # type: ignore

load_dotenv()

# connect to MongoDB Atlas
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "social_media_db")
MONGO_DB_IG_CLUSTER = os.getenv("MONGO_DB_IG_CLUSTER", "posts")

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[MONGO_DB_NAME]
posts_collection = db[MONGO_DB_IG_CLUSTER]

# connect to ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")
chroma_collection = chroma_client.get_or_create_collection(name="social_posts")

def sync_new_posts() -> int:
    """
    Syncs new posts from MongoDB into ChromaDB.
    Returns the number of documents already present in ChromaDB before syncing,
    so the caller can detect a true cold start (empty vector DB).
    """
    print("Starting MongoDB -> ChromaDB Sync...")
 
    existing_data = chroma_collection.get(include=["metadatas"])
    existing_ids_str: set[str] = set(existing_data["ids"]) if existing_data["ids"] else set()
    count_before = len(existing_ids_str)
 
    def try_int(v: str):
        try:
            return int(v)
        except ValueError:
            return v
 
    existing_ids_typed = [try_int(i) for i in existing_ids_str]
 
    new_posts = list(posts_collection.find({"post_id": {"$nin": existing_ids_typed}}))

    max_sync = os.getenv("MAX_SYNC_EMBEDS")
    if max_sync and max_sync.isdigit():
        limit = int(max_sync)
        if len(new_posts) > limit:
            print(f"Limiting sync to {limit} posts to prevent rate limiting.")
            new_posts = new_posts[:limit]
 
    if not new_posts:
        print("Everything is up to date. No new posts to sync.")
        return count_before
 
    print(f"Found {len(new_posts)} new posts. Embedding and storing...")
 
    ids = []
    documents = []
    embeddings = []
    metadatas = []
 
    for post in new_posts:
        post_id = str(post["post_id"])
        text = str(post.get("description", ""))
 
        if not text.strip():
            continue
 
        ids.append(post_id)
        documents.append(text)
        embeddings.append(embed_text(text))
        time.sleep(0.65)
        metadatas.append({
            "Post_type": post.get("post_type", "unknown"),
            "Like_Rate": float(post.get("like_rate", 0.0))
        })
 
    if ids:
        chroma_collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        print(f"Successfully synced {len(ids)} new posts to Vector DB.")
 
    return count_before

if __name__ == "__main__":
    sync_new_posts()