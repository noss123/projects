import polars as pl
import os
import glob

def load_and_clean_data(data_dir: str = "../data/raw/posts") -> pl.DataFrame:
    """
    Loads all CSVs from the raw directory, cleans them, 
    and calculates the target variable.
    """
    # find all csv files in the directory
    base_path = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.join(base_path, data_dir, "*.csv")
    csv_files = glob.glob(target_path)
    
    if not csv_files:
         raise FileNotFoundError("No CSV files found in the data/raw directory.")

    # use polars lazy execution to scan all csv
    # scan_csv doesn't load data into memory yet; it just creates a computation graph
    lazy_frames = [pl.scan_csv(file) for file in csv_files]
    
    # concatenate all frames into one master lazy frame
    lf = pl.concat(lazy_frames, how="diagonal")

    # transformation pipeline
    cleaned_df = (
        lf
        # filter out invalid rows immediately to save processing power later
        .filter(pl.col("Reach").is_not_null() & (pl.col("Reach") > 0))
        .filter(pl.col("Likes").is_not_null())
        
        # calculate like Rate
        .with_columns([
            (pl.col("Likes") / pl.col("Reach")).alias("Like_Rate")
        ])
        
        # select only the columns we actually need for feature engineering later
        .select([
            "Post ID", 
            "Description", 
            "Duration (sec)", 
            "Publish time", 
            "Post type",
            "Like_Rate"
        ])
        # Execute the query plan and pull it into RAM
        .collect()
    )

    print(f"successfully loaded and cleaned {cleaned_df.height} posts.")
    return cleaned_df

# quick test block
if __name__ == "__main__":
    df = load_and_clean_data()
    print(df.head())