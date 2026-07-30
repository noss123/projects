import pytest
import pandas as pd
from src.trend_ingestor import get_rising_trends, fetch_pinterest_trends

def test_get_rising_trends(mocker):
    # Create a dummy dataframe simulating Google Trends API response
    # 3 weeks of low volume (value = 10), 1 week of high volume (value = 50)
    dates = pd.date_range(end=pd.Timestamp.today(), periods=28)
    data = [10] * 21 + [50] * 7
    mock_df = pd.DataFrame({"khadi": data}, index=dates)

    # 2. Mock the pytrends class
    mock_trend_req = mocker.patch("src.trend_ingestor.TrendReq")
    mock_instance = mock_trend_req.return_value
    mock_instance.interest_over_time.return_value = mock_df

    # Run the function
    trends = get_rising_trends(["khadi"], threshold=10.0)

    # Assertions
    assert len(trends) == 1
    assert trends[0]["trend"] == "khadi"
    # Momentum = ((50 - 10) / 10) * 100 = 400.0%
    assert trends[0]["momentum"] == 400.0 

def test_fetch_pinterest_trends_success(mocker):
    # Mock the requests library to return a fake JSON payload
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "items": [{"trend_score": 85}]
    }
    mocker.patch("src.trend_ingestor.requests.get", return_value=mock_response)

    trends = fetch_pinterest_trends(["boho decor"])
    
    assert len(trends) == 1
    assert trends[0]["trend"] == "boho decor"
    assert trends[0]["momentum"] == 85

def test_pinterest_api_timeout(mocker):
    """Simulates the Pinterest API timing out or returning a 500 error."""
    mock_response = mocker.Mock()
    mock_response.status_code = 500 # Internal Server Error
    mocker.patch("src.trend_ingestor.requests.get", return_value=mock_response)

    # It should catch the error and return an empty list, not crash the app
    trends = fetch_pinterest_trends(["khadi"])
    assert trends == []

def test_google_trends_empty_response(mocker):
    """Simulates Google Trends returning no data for an obscure keyword."""
    # Return an empty dataframe
    mock_trend_req = mocker.patch("src.trend_ingestor.TrendReq")
    mock_instance = mock_trend_req.return_value
    mock_instance.interest_over_time.return_value = pd.DataFrame()

    trends = get_rising_trends(["super_obscure_term_nobody_searches"])
    assert trends == []