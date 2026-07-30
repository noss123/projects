from src.features import engineer_features
from src.model import train_and_evaluate
import os
import joblib

def test_train_and_evaluate(sample_raw_data, tmp_path, mocker):
    # Mock the directory path so we don't overwrite real models during tests
    mocker.patch("src.model.os.path.dirname", return_value=str(tmp_path))
    
    X, y = engineer_features(sample_raw_data)
    
    # We duplicate the sample data a few times so the Random Forest 
    # has enough rows to actually split and train without throwing errors
    X_large = X.sample(n=50, with_replacement=True)
    y_large = y.sample(n=50, with_replacement=True)
    
    model, explainer = train_and_evaluate(X_large, y_large)
    
    # Verify outputs
    assert model is not None
    assert explainer is not None
    
    # Verify artifacts were actually saved to the mocked disk
    model_dir = os.path.join(str(tmp_path), "../models")
    assert os.path.exists(os.path.join(model_dir, "rf_engagement_model.joblib"))
    assert os.path.exists(os.path.join(model_dir, "model_columns.joblib"))