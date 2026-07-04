from flask import Flask, request, jsonify, send_from_directory, abort
import sys
import os
import pickle
import yfinance as yf

# Connect to your backend quantitative modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from services.trust_engine import generate_trust_report
from services.sentiment_engine import analyze_news_sentiment

# Initialize Flask and explicitly disable default folder rules
app = Flask(__name__, static_folder=None, template_folder=None)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# --- 1. CORE HTML ROUTES ---
@app.route('/')
def home():
    return send_from_directory(os.path.join(BASE_DIR, 'templats'), 'index.html')

@app.route('/dashboard')
@app.route('/dashboard.html')
def dashboard():
    return send_from_directory(os.path.join(BASE_DIR, 'template2'), 'dashboard.html')

# --- 2. THE MAGIC ASSET ROUTER (Fixes Video, Images, CSS, JS) ---
# This catches ANY request for a file (like your .mp4 background) and finds it.
@app.route('/<path:filename>')
def serve_assets(filename):
    # First, check if the file is in the 'templats' folder
    if os.path.exists(os.path.join(BASE_DIR, 'templats', filename)):
        return send_from_directory(os.path.join(BASE_DIR, 'templats'), filename)
    # Next, check if it is in the 'template2' folder
    elif os.path.exists(os.path.join(BASE_DIR, 'template2', filename)):
        return send_from_directory(os.path.join(BASE_DIR, 'template2'), filename)
    else:
        # If the file really doesn't exist, return a 404 error safely
        abort(404)

# --- 3. API DATA GATEWAY (The Math) ---
@app.route('/api/analyze')
def analyze():
    ticker = request.args.get('ticker', 'RELIANCE.NS').upper()

    metadata_lookup = {
        "RELIANCE.NS": {"name": "Reliance Industries Ltd.", "sector": "Energy & Retail • NSE"},
        "HDFCBANK.NS": {"name": "HDFC Bank Ltd.", "sector": "Banking & Financial Services • NSE"},
    }
    metadata = metadata_lookup.get(ticker, {"name": ticker, "sector": ticker.split('.')[-1] if '.' in ticker else "NSE"})

    try:
        model_path = f"models/fiducia_engine_{ticker.split('.')[0]}.pkl"
        with open(model_path, 'rb') as file:
            artifact = pickle.load(file)
    except FileNotFoundError as e:
        print(f"[ERROR] Model file for {ticker} does not exist yet: {model_path}")
        return jsonify({
            "error": f"Model for {ticker} not found. Please train this asset first.",
            "status": 404
        }), 404
    except Exception as e:
        return jsonify({
            "error": f"Quantitative engine failed: {str(e)}",
            "status": 500
        }), 500

    try:
        def _as_ratio(value, default=0.0):
            try:
                number = float(value)
            except (TypeError, ValueError):
                return default
            if number > 1:
                number = number / 100
            return max(0.0, min(1.0, number))

        def _latest_probability(value):
            if value is None:
                return None
            if isinstance(value, dict):
                for key in ('bullish', 'positive', 'up', '1', 1):
                    if key in value:
                        return _as_ratio(value[key], None)
                if value:
                    return _as_ratio(max(value.values()), None)
            if isinstance(value, (list, tuple)):
                if not value:
                    return None
                latest = value[-1]
                if isinstance(latest, (list, tuple)):
                    return _as_ratio(max(latest), None)
                return _as_ratio(latest, None)
            return _as_ratio(value, None)

        def _feature_importances():
            if isinstance(artifact.get('feature_importances'), dict):
                return {str(k): float(v) for k, v in artifact['feature_importances'].items()}

            model = artifact.get('model')
            features = artifact.get('features', [])
            importances = getattr(model, 'feature_importances_', None)
            if importances is None:
                return {}
            return {str(name): float(value) for name, value in zip(features, importances)}

        def _bucket(importances, keywords):
            return sum(
                value for name, value in importances.items()
                if any(keyword in name.lower() for keyword in keywords)
            )

        def _pillar(score, max_score):
            score = int(round(max(0, min(max_score, score))))
            return {
                "score": score,
                "max": max_score,
                "pct": int(round((score / max_score) * 100))
            }

        accuracy = _as_ratio(artifact.get('accuracy'), 0.5)
        probability = _latest_probability(artifact.get('probabilities'))
        if probability is None:
            probability = _latest_probability(artifact.get('probability'))
        if probability is None:
            probability = accuracy

        feature_importances = _feature_importances()
        total_importance = sum(abs(v) for v in feature_importances.values()) or 1.0

        sentiment_weight = _bucket(feature_importances, ('sentiment', 'news', 'nlp', 'finbert')) / total_importance
        volatility_weight = _bucket(feature_importances, ('volatility', 'atr', 'risk', 'std')) / total_importance
        trend_weight = _bucket(feature_importances, ('rsi', 'macd', 'sma', 'ema', 'bollinger', 'trend', 'momentum')) / total_importance

        nonzero_features = sum(1 for value in feature_importances.values() if abs(value) > 0)
        feature_count = max(len(feature_importances), 1)
        coverage = nonzero_features / feature_count
        concentration = max((abs(v) for v in feature_importances.values()), default=0.0) / total_importance
        feature_health_ratio = max(0.0, min(1.0, (coverage * 0.65) + ((1 - concentration) * 0.35)))

        confidence_score = 30 * ((probability * 0.72) + (accuracy * 0.28))
        sentiment_score = 25 * max(accuracy * 0.55, min(1.0, sentiment_weight / 0.18))
        volatility_score = 20 * max(0.15, 1 - min(1.0, volatility_weight / 0.28))
        trend_score = 15 * max(accuracy * 0.35, min(1.0, trend_weight / 0.32))
        health_score = 10 * feature_health_ratio

        breakdown = {
            "model_confidence": _pillar(confidence_score, 30),
            "news_sentiment": _pillar(sentiment_score, 25),
            "volatility_penalty": _pillar(volatility_score, 20),
            "trend_strength": _pillar(trend_score, 15),
            "feature_health": _pillar(health_score, 10),
        }

        trust_score = sum(pillar["score"] for pillar in breakdown.values())
        prediction = "BULLISH SIGNAL" if probability >= 0.5 else "BEARISH SIGNAL"

        return jsonify({
            "ticker": ticker,
            "metadata": {
                "name": metadata["name"],
                "ticker": ticker,
                "sector": metadata["sector"],
            },
            "prediction": prediction,
            "trust_score": trust_score,
            "accuracy": round(accuracy * 100, 2),
            "probability": round(probability * 100, 2),
            "breakdown": breakdown
        })
    except Exception as e:
        return jsonify({
            "error": f"Quantitative engine failed: {str(e)}",
            "status": 500
        }), 500

# --- 4. CHART DATA API ---
@app.route('/api/news')
def news_data():
    ticker = request.args.get('ticker', 'RELIANCE.NS').upper()
    try:
        sentiment_data = analyze_news_sentiment(ticker)
        return jsonify({
            "ticker": ticker,
            "sentiment_score": sentiment_data.get("sentiment_score", 50),
            "articles": sentiment_data.get("articles", [])
        })
    except Exception as e:
        return jsonify({"error": f"News fetch failed for {ticker}: {str(e)}"}), 500

@app.route('/api/chart')
def chart_data():
    ticker = request.args.get('ticker', 'RELIANCE.NS').upper()
    try:
        hist = yf.Ticker(ticker).history(period="1mo")
        if hist.empty:
            return jsonify({"error": f"No data found for ticker: {ticker}"}), 404

        hist = hist[['Close']].dropna()

        # Serialize dates to clean, JSON-safe strings
        dates = hist.index.strftime('%b %d').tolist()

        # Convert prices to rounded floats — avoids numpy type serialization crash
        prices = hist['Close'].round(2).tolist()

        # 5-Day Simple Moving Average using pandas rolling
        sma_series = hist['Close'].rolling(window=5).mean().round(2)
        # Replace NaN (first 4 entries) with None so JSON serializes them as null
        sma = [None if (v != v) else float(v) for v in sma_series.tolist()]

        current_price = prices[-1]

        return jsonify({
            "dates": dates,
            "prices": prices,
            "sma": sma,
            "current_price": current_price
        })
    except Exception as e:
        return jsonify({"error": f"Chart data fetch failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("\n[SYSTEM] Universal Asset Router Active. Serving Fiducia Engine on Port 5000...")
    app.run(debug=True, port=5000)
