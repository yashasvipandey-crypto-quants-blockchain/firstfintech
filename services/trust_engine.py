import os
import sys
import pickle
import numpy as np
import yfinance as yf

# Connect microservices
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.data_pipeline import fetch_and_engineer_data
from services.sentiment_engine import analyze_news_sentiment

def generate_trust_report(ticker="RELIANCE.NS"):
    print(f"\n[SYSTEM] Booting Trust Orchestrator for {ticker}...")

    # 1. LOAD THE BRAIN (With Error Handling)
    model_path = f"models/fiducia_engine_{ticker.split('.')[0]}.pkl"
    if not os.path.exists(model_path):
        return {"error": f"Model not found at {model_path}. Train the model first!"}
        
    try:
        with open(model_path, 'rb') as file:
            artifact = pickle.load(file)
        model = artifact['model']
        expected_features = artifact['features']
    except Exception as e:
        return {"error": f"Failed to load model artifact: {str(e)}"}

    # 2. GET LATEST TECHNICAL DATA (With Validation)
    print("[SYSTEM] Fetching latest market data...")
    df = fetch_and_engineer_data(ticker)
    
    if df is None or df.empty:
        return {"error": "Data pipeline returned empty data. API might be down."}
        
    latest_data = df.iloc[-1:] 
    
    # Ensure all expected columns exist
    missing_cols = [col for col in expected_features if col not in latest_data.columns]
    if missing_cols:
        return {"error": f"Data missing expected features: {missing_cols}"}
        
    X_latest = latest_data[expected_features]

    # --- THE SURGICAL FIX ---
    # We purposely deleted 'Close' in the data pipeline so the ML model wouldn't hallucinate.
    # But our Trend Engine needs it! So we bypass the pipeline and ask Yahoo for the price directly.
    try:
        recent_data = yf.Ticker(ticker).history(period="5d")
        current_price = recent_data['Close'].iloc[-1]
    except Exception as e:
        print(f"[WARNING] Could not fetch raw price: {e}")
        current_price = 0 # Failsafe

    # Extract indicators for our custom logic
    sma_20 = latest_data['SMA_20'].values[0]
    sma_50 = latest_data['SMA_50'].values[0]
    current_volatility = latest_data['Volatility'].values[0]
    historical_volatility_median = df['Volatility'].median()

    # 3. GET ML PREDICTION & CONFIDENCE (Safely checking classes)
    prediction = model.predict(X_latest)[0]
    probabilities = model.predict_proba(X_latest)[0]
    
    # Find exactly which index corresponds to class 1 (Bullish)
    bullish_index = np.where(model.classes_ == 1)[0][0]
    bearish_index = np.where(model.classes_ == 0)[0][0]
    
    direction = "BULLISH" if prediction == 1 else "BEARISH"
    confidence_prob = probabilities[bullish_index] if prediction == 1 else probabilities[bearish_index]

    # 4. GET NLP SENTIMENT
    sentiment_data = analyze_news_sentiment(ticker)
    nlp_score_100 = sentiment_data.get('sentiment_score', 50) 

    # 5. TRUST ENGINE MATHEMATICS
    print("[SYSTEM] Calculating Multi-Modal Trust Matrix...")
    
    # Pillar 1: Model Confidence (Max 30 pts)
    confidence_pts = int(max(0, (confidence_prob - 0.5) * 2) * 30)
    
    # Pillar 2: News Alignment (Max 25 pts)
    if direction == "BULLISH":
        sentiment_pts = int((nlp_score_100 / 100) * 25)
    else:
        sentiment_pts = int(((100 - nlp_score_100) / 100) * 25)

    # Pillar 3: Structural Trend Engine (Max 15 pts)
    trend_pts = 0
    if direction == "BULLISH":
        if current_price > sma_20 > sma_50:
            trend_pts = 15 # Perfect structural alignment
        elif current_price > sma_50:
            trend_pts = 8  # Mild alignment
    elif direction == "BEARISH":
        if current_price < sma_20 < sma_50:
            trend_pts = 15
        elif current_price < sma_50:
            trend_pts = 8

    # Pillar 4: Volatility Regime (Max 20 pts)
    volatility_pts = 20
    if current_volatility > (historical_volatility_median * 1.5):
        volatility_pts = 5 # Massive penalty for chaotic regime
    elif current_volatility > historical_volatility_median:
        volatility_pts = 12

    # Pillar 5: Feature Health — computed dynamically in section 6 using RF variance proxy

    # 6. PACKAGE THE FINAL JSON PAYLOAD
    # Helper: build a structured pillar object with score, max, and percentage
    def _pillar(score, max_pts):
        return {
            "score": score,
            "max":   max_pts,
            "pct":   round(score / max_pts * 100, 1)
        }

    # Feature Health proxy: use RF probability variance across estimators.
    # High variance = model is uncertain about individual trees → lower health score.
    try:
        tree_probs = np.array([
            est.predict_proba(X_latest)[0][bullish_index]
            for est in model.estimators_
        ])
        prob_variance = float(np.var(tree_probs))
        # Map variance [0, 0.25] → health [10, 0] (lower variance = healthier)
        shap_pts = max(0, min(10, round(10 - (prob_variance / 0.25) * 10)))
    except AttributeError:
        # Fallback for non-ensemble models: keep the static proxy
        shap_pts = 7

    # Recalculate total with updated shap_pts in case it changed
    total_trust_score = confidence_pts + sentiment_pts + trend_pts + volatility_pts + shap_pts
    if confidence_prob < 0.55:
        total_trust_score = min(total_trust_score, 49)

    report = {
        "ticker": ticker,
        "prediction": direction,
        "trust_score": total_trust_score,
        "breakdown": {
            "model_confidence":  _pillar(confidence_pts, 30),
            "news_sentiment":    _pillar(sentiment_pts,  25),
            "volatility_penalty": _pillar(volatility_pts, 20),
            "trend_strength":    _pillar(trend_pts,      15),
            "feature_health":    _pillar(shap_pts,       10),
        },
        "news": sentiment_data.get('articles', [])
    }
    
    return report

# --- TEST EXECUTION ---
if __name__ == "__main__":
    final_report = generate_trust_report("RELIANCE.NS")
    
    if "error" in final_report:
        print(f"\n[FATAL ERROR] {final_report['error']}")
    else:
        print("\n================ FIDUCIA MASTER TERMINAL ================")
        print(f"ASSET:       {final_report['ticker']}")
        print(f"PREDICTION:  {final_report['prediction']}")
        print(f"TRUST SCORE: {final_report['trust_score']} / 100")
        print("---------------------------------------------------------")
        print("[ ENGINE DIAGNOSTICS ]")
        for pillar, score in final_report['breakdown'].items():
            print(f" > {pillar.capitalize().ljust(12)}: {score}")
        print("=========================================================\n")