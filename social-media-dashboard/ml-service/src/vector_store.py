import chromadb
import polars as pl
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# initialize local ChromaDB 
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="social_posts")

def embed_text(text: str) -> list[float]:
    """Generates an embedding using Gemini."""
    response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=text
    )
    return response.embeddings[0].values

def build_vector_db(historical_df: pl.DataFrame):
    """
    Vectorizes the historical dataset. Run this once, or whenever new data is added.
    """
    print("Embedding historical posts into Vector DB...")
    
    # convert to a list of dicts for easier iteration
    records = historical_df.to_dicts()
    
    ids = []
    documents = []
    embeddings = []
    metadatas = []
    
    for i, row in enumerate(records):
        doc = str(row["Description"])
        if not doc.strip(): continue
        
        ids.append(str(row["Post ID"]))
        documents.append(doc)
        embeddings.append(embed_text(doc))
        
        # store metadata to feed to the LLM later
        metadatas.append({
            "Post_type": str(row["Post type"]),
            "Like_Rate": float(row["Like_Rate"])
        })

    # upsert into ChromaDB
    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )
    print(f"Successfully embedded {len(ids)} posts.")

def retrieve_similar_posts(query: str, top_k: int = 3) -> list[dict]:
    """Retrieves the most semantically similar historical posts."""
    query_embedding = embed_text(query)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    retrieved_data = []
    if results['documents'] and results['documents'][0]:
        for i in range(len(results['documents'][0])):
            retrieved_data.append({
                "description": results['documents'][0][i],
                "metadata": results['metadatas'][0][i]
            })
            
    return retrieved_data