import polars as pl
import numpy as np
from textblob import TextBlob

def get_sentiment(text: str) -> float:
    """Returns a polarity score from -1.0 (negative) to 1.0 (positive)."""
    if not text:
        return 0.0
    return TextBlob(str(text)).sentiment.polarity

def engineer_features(df: pl.DataFrame) -> tuple[pl.DataFrame, pl.Series]:
    """
    Transforms raw columns into a numerical feature matrix (X) 
    and extracts the target variable (y).
    """
    # fill null descriptions with empty strings to prevent errors
    df = df.with_columns(pl.col("Description").fill_null("").alias("desc_clean"))
    
    df = df.with_columns([
        # count the number of hashtags
        pl.col("desc_clean").str.count_matches(r"#").cast(pl.Int64).alias("hashtag_count"),
        # count words by splitting on spaces
        pl.col("desc_clean").str.split(" ").list.len().cast(pl.Int64).alias("word_count"),
        # apply TextBlob sentiment analysis
        pl.col("desc_clean").map_elements(get_sentiment, return_dtype=pl.Float64).alias("sentiment")
    ])

    # Based on data "03/31/2025", the format is MM/DD/YYYY
    df = df.with_columns(
        pl.col("Publish time").str.strptime(pl.Datetime, format="%m/%d/%Y %H:%M", strict=False).alias("dt_parsed")
    )
    
    df = df.with_columns([
        pl.col("dt_parsed").dt.hour().alias("hour"),
        pl.col("dt_parsed").dt.weekday().alias("weekday") # 1 = Monday, 7 = Sunday
    ])

    # transform time into sine/cosine waves so the model knows 23:00 is close to 01:00
    df = df.with_columns([
        (np.sin(2 * np.pi * pl.col("hour") / 24)).alias("hour_sin"),
        (np.cos(2 * np.pi * pl.col("hour") / 24)).alias("hour_cos"),
        (np.sin(2 * np.pi * pl.col("weekday") / 7)).alias("weekday_sin"),
        (np.cos(2 * np.pi * pl.col("weekday") / 7)).alias("weekday_cos"),
    ])

    # one-hot encoding
    # turns "Post type" into binary columns: "Post type_IG reel", "Post type_IG image", etc.
    df = df.to_dummies(columns=["Post type"])

    # extract target variable only when it carries real training data
    has_target = "Like_Rate" in df.columns
    y: pl.Series | None = df["Like_Rate"] if has_target else None
    
    # select only our finalized numerical columns for the feature matrix
    cols_to_drop = [
        "Post ID", "Description", "Publish time", "Like_Rate", 
        "desc_clean", "dt_parsed", "hour", "weekday", "Date",
    ]

    if has_target:
        cols_to_drop.append("Like_Rate")
    
    # grab all columns that are not in the drop list
    feature_cols = [col for col in df.columns if col not in cols_to_drop]
    X = df.select(feature_cols)

    return X, y

# quick test block
if __name__ == "__main__":
    from data_loader import load_and_clean_data
    
    raw_df = load_and_clean_data()
    X, y = engineer_features(raw_df)
    
    print("\nFeature Matrix (X) Shape:", X.shape)
    print("Features generated:", X.columns)
    print("\nFirst row of features:")
    print(X.head(1))