import pandas as pd
from pytrends.request import TrendReq
import time
import requests
import os


def get_rising_trends(keywords: list, threshold: float = 20.0) -> list:
    """
    Checks Google Trends for a list of keywords and returns those with
    a 7-day positive momentum crossing the threshold percentage.
    """
    pytrend = TrendReq(hl='en-US', tz=330, timeout=(10, 25))

    rising_trends = []

    # process in chunks of 5 (Google Trends API limit per request)
    for i in range(0, len(keywords), 5):
        chunk = keywords[i:i + 5]

        try:
            pytrend.build_payload(chunk, cat=0, timeframe='today 1-m', geo='IN')
            df = pytrend.interest_over_time()

            if df.empty:
                continue

            if 'isPartial' in df.columns:
                df = df.drop(columns=['isPartial'])

            for term in chunk:
                if term not in df.columns:
                    continue

                if len(df) < 8:
                    print(f"Not enough data points for '{term}' (got {len(df)}, need 8). Skipping.")
                    continue

                historical_avg = df[term].iloc[:-7].mean()
                recent_avg = df[term].iloc[-7:].mean()

                if historical_avg == 0:
                    continue  # prevent division by zero

                momentum = ((recent_avg - historical_avg) / historical_avg) * 100

                if momentum >= threshold:
                    rising_trends.append({
                        "trend": term,
                        "momentum": round(momentum, 2)
                    })

            time.sleep(2)  # avoid rate-limiting

        except Exception as e:
            print(f"Warning: Failed to fetch chunk {chunk}. Error: {e}")

    rising_trends = sorted(rising_trends, key=lambda x: x["momentum"], reverse=True)
    return rising_trends


def fetch_pinterest_trends(keywords: list) -> list:
    """
    Queries the Pinterest API for search volume/trend data on specific keywords.
    """
    PINTEREST_TOKEN = os.getenv("PINTEREST_API_TOKEN")
    if not PINTEREST_TOKEN:
        print("WARNING: PINTEREST_API_TOKEN not set. Skipping Pinterest trends.")
        return []

    headers = {
        "Authorization": f"Bearer {PINTEREST_TOKEN}",
        "Content-Type": "application/json"
    }

    pinterest_trends = []
    url = "https://api.pinterest.com/v5/trends/keywords"

    for term in keywords:
        params = {
            "keywords": term,
            "region": "IN",
            "trend_type": "growing"
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('items'):
                    score = data['items'][0].get('trend_score', 0)
                    if score > 50:
                        pinterest_trends.append({
                            "trend": term,
                            "source": "Pinterest",
                            "momentum": score
                        })
        except Exception as e:
            print(f"Failed to fetch Pinterest data for '{term}': {e}")

    return pinterest_trends


# Quick test
if __name__ == "__main__":
    seed_terms = ["khadi", "diwali hampers", "block print", "sustainable packaging"]
    trends = get_rising_trends(seed_terms, threshold=10.0)
    print("Rising Trends:", trends)