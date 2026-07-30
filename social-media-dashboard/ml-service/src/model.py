import polars as pl
import pandas as pd
import numpy as np
import joblib
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import os

def train_and_evaluate(X_polars: pl.DataFrame, y_polars: pl.Series):
    """
    Trains a constrained Random Forest Regressor and extracts SHAP interpretability.
    """
    # convert polars to pandas for scikit-learn/SHAP compatibility
    X = X_polars.to_pandas()
    y = y_polars.to_pandas()

    # split into Training and Testing sets (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # model architecture
    # max_depth=3 prevents the tree from growing too deep and memorizing the small dataset
    # min_samples_leaf=5 ensures every decision branch has at least 5 posts backing it up
    model = RandomForestRegressor(
        n_estimators=100, 
        max_depth=3, 
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1 # utilize all CPU cores
    )

    print("Training Random Forest Regressor...")
    model.fit(X_train, y_train)

    # evaluation
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print("\n--- Model Evaluation ---")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")
    print(f"R-squared (R2): {r2:.4f}")

    # interpretability (SHAP)
    print("\nCalculating SHAP values for feature importance...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_train)
    
    # calculate global feature importance
    importance_df = pd.DataFrame({
        'Feature': X.columns,
        'Importance (Mean Absolute SHAP)': np.abs(shap_values).mean(axis=0)
    }).sort_values(by='Importance (Mean Absolute SHAP)', ascending=False)
    
    print("\n--- Top 5 Drivers of Engagement ---")
    print(importance_df.head(5).to_string(index=False))

    # save the model artifact
    # save this so the FastAPI server doesn't have to retrain it on every request
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "rf_engagement_model.joblib")
    
    joblib.dump(model, model_path)
    # also save the training columns so we know the exact schema later
    joblib.dump(list(X.columns), os.path.join(model_dir, "model_columns.joblib"))
    
    print(f"\nModel successfully saved to {model_path}")

    return model, explainer

# quick test block
if __name__ == "__main__":
    from data_loader import load_and_clean_data
    from features import engineer_features
    
    raw_df = load_and_clean_data()
    X, y = engineer_features(raw_df)
    
    model, explainer = train_and_evaluate(X, y)