import pytest
import polars as pl
import os
from src.data_loader import load_and_clean_data

def test_load_and_clean_data(tmp_path, mocker):
    # Create a dummy CSV file in a temporary directory
    data_dir = tmp_path / "raw" / "posts"
    data_dir.mkdir(parents=True)
    
    csv_file = data_dir / "dummy_data.csv"
    csv_file.write_text(
        "Post ID,Description,Duration (sec),Publish time,Post type,Reach,Likes\n"
        "1,Great post!,15,10/24/2026 18:30,IG reel,1000,50\n"
        "2,Bad row no reach,0,10/25/2026 09:00,IG image,0,10\n"
        "3,Bad row no likes,30,10/26/2026 23:45,IG reel,500,\n"
        "4,Another good one,0,10/27/2026 12:00,IG image,2000,100\n"
    )
    
    # Mock the glob pattern to look at our temporary directory
    mocker.patch("src.data_loader.glob.glob", return_value=[str(csv_file)])
    
    # 3. Run the function
    df = load_and_clean_data(data_dir=str(data_dir))
    
    # Assertions
    # It should have dropped row 2 (Reach=0) and row 3 (Likes=null)
    assert len(df) == 2
    
    # Check if Like_Rate was calculated correctly (50/1000 = 0.05)
    like_rates = df["Like_Rate"].to_list()
    assert like_rates[0] == 0.05
    assert like_rates[1] == 0.05
    
    # Check if unnecessary columns were dropped
    assert "Reach" not in df.columns
    assert "Likes" not in df.columns

def test_load_data_no_files(tmp_path, mocker):
    # Test that it properly raises an error if no CSVs exist
    mocker.patch("src.data_loader.glob.glob", return_value=[])
    with pytest.raises(FileNotFoundError):
         load_and_clean_data(data_dir=str(tmp_path))