import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import sys
import os

# Add the parent directory to the path so we can import our pipeline
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.data_pipeline import fetch_and_engineer_data

def train_fudicia_model(ticker="RELIANCE.NS"):
    print(f"\n[SYSTEM] Initializing Model Training Protocol for {ticker}...")
    
    df = fetch_and_engineer_data(ticker)
    
    X = df.drop(columns=['Target'])
    y = df['Target']
    
    # Chronological Split
    split_index = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_index], X.iloc[split_index:]
    y_train, y_test = y.iloc[:split_index], y.iloc[split_index:]
    
    print(f"[SYSTEM] Training on {len(X_train)} days. Testing on {len(X_test)} days.")
    
    # Initialize Model with slightly tuned parameters to reduce false alarms
    model = RandomForestClassifier(
        n_estimators=150,      
        max_depth=6,           
        min_samples_leaf=5,    # Prevents model from making wild guesses on tiny data patterns
        class_weight='balanced', 
        random_state=42        
    )
    
    print("[SYSTEM] Compiling Random Forest... Learning patterns...")
    model.fit(X_train, y_train)
    
    # Predict outcomes AND probabilities
    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)
    
    accuracy = accuracy_score(y_test, predictions)
    
    print("\n================ THE VERDICT ================")
    print(f"Model Accuracy: {accuracy * 100:.2f}%")
    
    print("\n[ Confusion Matrix ]")
    # Top Row: Actual Down days. Bottom Row: Actual Up days.
    print(confusion_matrix(y_test, predictions))
    
    print("\n[ Detailed Performance Report ]")
    print(classification_report(
        y_test, 
        predictions, 
        labels=[0, 1], 
        target_names=["Bearish (0)", "Bullish (1)"]
    ))
    
    print("\n[ Trust Engine Probability Sample (Last 3 Days) ]")
    for i in range(1, 4):
        bull_prob = probabilities[-i][1] * 100
        direction = "BULLISH" if predictions[-i] == 1 else "BEARISH"
        print(f"Day -{i}: Predicted {direction} (Confidence: {bull_prob:.1f}%)")

    # --- PACKAGING THE ARTIFACT ---
    # Create the directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    # Save metadata alongside the model
    artifact = {
        "model": model,
        "ticker": ticker,
        "features": list(X.columns),
        "accuracy": accuracy,
        "version": "1.1"
    }
    
    model_filename = f"models/fiducia_engine_{ticker.split('.')[0].upper()}.pkl"
    with open(model_filename, 'wb') as file:
        pickle.dump(artifact, file)
        
    print(f"\n[SYSTEM] Artifact packaged and secured at {model_filename}")
    return artifact

if __name__ == "__main__":
    train_fudicia_model("RELIANCE.NS")
