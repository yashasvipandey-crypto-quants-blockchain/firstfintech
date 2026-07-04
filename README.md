# FIDUCIA

```text
FFFFFFFF  II  DDDDDD    UU    UU   CCCCC   II    AAA
FF        II  DD   DD   UU    UU  CC       II   AAAAA
FFFFF     II  DD    DD  UU    UU  CC       II  AA   AA
FF        II  DD   DD   UU    UU  CC       II  AAAAAAA
FF        II  DDDDDD     UUUUUU    CCCCC   II  AA   AA

              Stock Trust Analysis Engine
```

FIDUCIA is a full-stack FinTech analytics project that focuses on **trust in a stock setup**, not only a plain "up or down" prediction.

Most stock prediction demos stop at:

```
Will the stock go UP or DOWN?
```

FIDUCIA asks a more useful question:

```
How much should I trust this signal?
```

The system combines ticker-specific machine learning models, technical market indicators, live chart data, and news sentiment into a structured **Trust Score**. The project is currently scoped to two NSE tickers:

- `RELIANCE.NS`
- `HDFCBANK.NS`

> Original concept and development by **Yashasvi Pandey**.

---

## Project Philosophy

```
                 FIDUCIA IDEA
                      |
      ---------------------------------
      |                               |
 Normal prediction apps          FIDUCIA
      |                               |
 "UP / DOWN" only        "Can this prediction be trusted?"
                                      |
                    --------------------------------
                    |        |        |       |     |
                 Model    News    Trend   Risk   Feature
              Confidence Sentiment Strength Regime Health
                                      |
                                Trust Score
```

FIDUCIA still exposes a bullish or bearish signal, but the core product idea is the **Trust Engine** around that signal. The goal is to show confidence, supporting context, and risk layers instead of showing a naked prediction.

---

## Current Scope

This README is intentionally accurate to the current project implementation.

| Area | Current Implementation |
|---|---|
| Backend | Flask |
| Frontend | HTML, CSS, JavaScript |
| Dashboard charting | Chart.js |
| Landing page visual layer | Three.js |
| Market data | `yfinance` |
| ML model | `RandomForestClassifier` |
| Model artifacts | `.pkl` files in `models/` |
| News sentiment | FinBERT through `transformers` |
| Supported stocks | `RELIANCE.NS`, `HDFCBANK.NS` |
| Main output | Prediction, Trust Score, score breakdown, chart, news sentiment |

---

## What FIDUCIA Does

```
User selects ticker
        |
        v
Flask receives ticker query param
        |
        v
Loads ticker-specific model file
        |
        v
Fetches chart data from yfinance
        |
        v
Fetches ticker-specific news
        |
        v
Calculates sentiment and score layers
        |
        v
Dashboard renders:
  - Company metadata
  - Price chart
  - Trust Score
  - Prediction
  - Score breakdown
  - News sentiment
```

---

## Repository Structure

```text
firstfintech/
|
|-- app.py
|   Flask application, page routes, dashboard APIs
|
|-- models/
|   |-- train_model.py
|   |-- fiducia_engine_RELIANCE.pkl
|   |-- fiducia_engine_HDFCBANK.pkl
|
|-- services/
|   |-- data_pipeline.py
|   |   Fetches OHLCV data and engineers technical indicators
|   |
|   |-- sentiment_engine.py
|   |   Fetches ticker news and scores headlines using FinBERT
|   |
|   |-- trust_engine.py
|       Orchestrates model, data, sentiment, and trust scoring logic
|
|-- templats/
|   |-- index.html
|   |-- style.css
|   |-- script.js
|   |-- DOCTYPE_html___html_lang_en.mp4
|   Landing page assets
|
|-- template2/
|   |-- dashboard.html
|   |-- dashboard.css
|   |-- dashboard.js
|   Dashboard UI
|
|-- README.md
```

---

## Architecture Mind Map

```text
FIDUCIA
|
|-- Frontend
|   |
|   |-- Landing Page
|   |   |-- Hero section
|   |   |-- Project explanation
|   |   |-- Three.js visual layer
|   |   |-- Dashboard navigation
|   |
|   |-- Dashboard
|       |-- Stock dropdown
|       |-- Dark mode toggle
|       |-- Dynamic company metadata
|       |-- Price chart
|       |-- Trust Engine Verdict
|       |-- Pillar breakdown
|       |-- Ticker-specific news section
|
|-- Backend
|   |
|   |-- Flask routes
|   |   |-- /
|   |   |-- /dashboard
|   |   |-- /api/analyze
|   |   |-- /api/chart
|   |   |-- /api/news
|   |
|   |-- Services
|       |-- data_pipeline.py
|       |-- sentiment_engine.py
|       |-- trust_engine.py
|
|-- Machine Learning
    |
    |-- Random Forest classifier
    |-- Ticker-specific model artifacts
    |-- Technical indicator features
    |-- Prediction + trust scoring
```

---

## Data Pipeline

The data pipeline uses `yfinance` to fetch historical OHLCV data for the selected ticker.

Implemented in:

```text
services/data_pipeline.py
```

Current engineered features include:

| Feature | Purpose |
|---|---|
| RSI | Momentum / overbought-oversold context |
| MACD | Trend and momentum |
| SMA 20 | Short-term moving average |
| SMA 50 | Medium-term moving average |
| Daily Return | Price return behavior |
| Volatility | Rolling risk estimate |
| Volume Ratio | Current volume relative to recent volume |
| ADX | Trend strength |
| ATR | Volatility / range |
| Bollinger Band Width | Price compression / expansion |
| 5-Day Momentum | Short-term price velocity |

The current target label is:

```text
Target = 1 if tomorrow's close > today's close
Target = 0 otherwise
```

Absolute price columns are removed from the model feature matrix to reduce direct price memorization.

---

## Machine Learning Layer

The training script is:

```text
models/train_model.py
```

The model currently uses:

```text
RandomForestClassifier
```

Saved model artifacts follow this naming pattern:

```text
models/fiducia_engine_<TICKER_PREFIX>.pkl
```

Examples:

```text
models/fiducia_engine_RELIANCE.pkl
models/fiducia_engine_HDFCBANK.pkl
```

This is important because the dashboard and backend dynamically load the correct artifact from the selected ticker.

---

## Trust Score Logic

FIDUCIA is not only a classification model. The dashboard shows a Trust Score built from multiple layers.

```text
Trust Score
|
|-- Model Confidence
|-- News Sentiment
|-- Volatility Penalty
|-- Trend Strength
|-- Feature Health
```

The API returns a score breakdown like:

```json
{
  "model_confidence": {
    "score": 18,
    "max": 30,
    "pct": 60
  },
  "news_sentiment": {
    "score": 15,
    "max": 25,
    "pct": 60
  },
  "volatility_penalty": {
    "score": 14,
    "max": 20,
    "pct": 70
  },
  "trend_strength": {
    "score": 9,
    "max": 15,
    "pct": 60
  },
  "feature_health": {
    "score": 7,
    "max": 10,
    "pct": 70
  }
}
```

The values above are only an example of the response structure. Actual values depend on the selected ticker and loaded model artifact.

---

## News Sentiment

News sentiment is handled in:

```text
services/sentiment_engine.py
```

The service:

1. Fetches available ticker-specific news through `yfinance`.
2. Extracts headline, publisher, link, and publish date where available.
3. Runs headline sentiment through FinBERT.
4. Returns scored articles to the dashboard.

The dashboard calls:

```text
/api/news?ticker=RELIANCE.NS
/api/news?ticker=HDFCBANK.NS
```

---

## API Routes

### Page Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/dashboard` | Dashboard page |
| `/dashboard.html` | Dashboard alias |

### Data Routes

| Route | Description |
|---|---|
| `/api/analyze?ticker=RELIANCE.NS` | Loads ticker model and returns trust analysis |
| `/api/chart?ticker=RELIANCE.NS` | Returns 1-month chart data |
| `/api/news?ticker=RELIANCE.NS` | Returns ticker-specific news sentiment |

Example:

```bash
curl "http://127.0.0.1:5000/api/analyze?ticker=RELIANCE.NS"
```

---

## Dynamic Ticker Flow

```text
Dashboard dropdown
        |
        v
/dashboard?ticker=HDFCBANK.NS
        |
        v
dashboard.js reads URLSearchParams
        |
        v
currentTicker = HDFCBANK.NS
        |
        |-----------------------------|
        |                             |
        v                             v
/api/chart?ticker=HDFCBANK.NS   /api/analyze?ticker=HDFCBANK.NS
        |                             |
        v                             v
Chart updates                Model file loads:
                             models/fiducia_engine_HDFCBANK.pkl
        |
        v
/api/news?ticker=HDFCBANK.NS
        |
        v
News section updates
```

---

## Dashboard Features

- Dynamic stock dropdown
- Ticker-specific company metadata
- Ticker-specific chart data
- Ticker-specific model loading
- Ticker-specific news sentiment
- Dark mode toggle
- Trust Score verdict
- Pillar-level diagnostics
- Responsive dashboard UI
- Landing page with project explanation

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 2. Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

This project currently does not include a `requirements.txt` file, so install the required packages directly:

```bash
pip install flask yfinance pandas numpy scikit-learn ta transformers torch
```

Depending on your system, installing `torch` may require the official PyTorch install command for your platform.

### 4. Run the Flask app

```bash
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

Dashboard:

```text
http://127.0.0.1:5000/dashboard
```

---

## Training Models

Train the default model:

```bash
python models/train_model.py
```

Train a specific ticker from Python:

```bash
python -c "from models.train_model import train_fudicia_model; train_fudicia_model('HDFCBANK.NS')"
```

Model output:

```text
models/fiducia_engine_HDFCBANK.pkl
```

For any new ticker, the backend expects this pattern:

```text
models/fiducia_engine_<TICKER_PREFIX>.pkl
```

Example:

```text
Ticker: HDFCBANK.NS
Model:  models/fiducia_engine_HDFCBANK.pkl
```

---

## Deployment Notes

This project can be deployed as an educational/demo FinTech analytics app, but there are practical considerations.

### Required production changes

- Set `debug=False` in production.
- Add a proper `requirements.txt`.
- Add a production server such as `gunicorn` for Linux deployment.
- Add graceful loading and error states on the frontend.
- Include a clear "Not financial advice" disclaimer.
- Ensure model artifacts are shipped with the app or loaded from reliable storage.
- Be aware that FinBERT and `torch` can be heavy for small free hosting tiers.

### Good hosting options

| Platform | Notes |
|---|---|
| Render | Simple Flask deployment |
| Railway | Good for prototypes, may need paid resources |
| Hugging Face Spaces | Good for ML-heavy demos |
| AWS / GCP / Azure | More scalable, more setup |

---

## Important Limitations

FIDUCIA is a project and research-style prototype, not a financial advisory system.

Current limitations:

- Only two supported tickers are configured in the dashboard.
- `yfinance` can fail, rate-limit, or return missing data.
- News availability depends on Yahoo Finance data.
- FinBERT can be slow on CPU-only machines.
- Model performance should be evaluated carefully before making any real-world claims.
- The Trust Score is an engineered project metric, not a certified investment rating.

---

## Responsible Use

```
FIDUCIA is for learning, experimentation, and portfolio demonstration.
It is not financial advice.
Do not use it as the only basis for investing or trading decisions.
```

---

## Future Roadmap

```text
Short Term
|
|-- Add requirements.txt
|-- Add loading and error states
|-- Add more supported tickers
|-- Add model training CLI arguments
|-- Add clearer frontend disclaimers

Medium Term
|
|-- Store model metadata per ticker
|-- Show real per-ticker validation metrics
|-- Add caching for yfinance/news calls
|-- Add unit tests for API routes
|-- Add model registry structure

Long Term
|
|-- Add portfolio-level analysis
|-- Add sector comparison
|-- Add historical trust score timeline
|-- Add explainability charts
|-- Add production deployment pipeline
```

---

## Why This Project Stands Out

```
Not just:

  "Stock will go up"
  "Stock will go down"

But:

  "Here is the signal"
  "Here is the confidence"
  "Here is the sentiment"
  "Here is the volatility context"
  "Here is how much the system trusts the setup"
```

FIDUCIA is built around the idea that prediction without context is weak. A trust-based stock intelligence system gives users a more complete view of the signal.

---

## Author

**Yashasvi Pandey**  
B.Tech Mathematics and Computing  
FinTech, Machine Learning, Explainable AI, and Stock Intelligence

---
