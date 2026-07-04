import yfinance as yf
from transformers import pipeline
import logging
from datetime import datetime, timezone

# Suppress HuggingFace warnings globally
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

print("[SYSTEM] Booting Global NLP Engine (FinBERT)...")
# Load the model ONCE to prevent the N+1 memory crash
analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert")

def _nested_get(data, *path):
    current = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current

def _format_news_time(value):
    if not value:
        return "Latest"

    try:
        if isinstance(value, (int, float)):
            published = datetime.fromtimestamp(value, tz=timezone.utc)
        else:
            published = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return published.strftime("%b %d, %Y")
    except Exception:
        return "Latest"

def _extract_article(item):
    content = item.get("content", {}) if isinstance(item, dict) else {}

    headline = (item.get("title") or content.get("title") or "").strip()
    if not headline:
        return None

    publisher = (
        item.get("publisher")
        or _nested_get(content, "provider", "displayName")
        or "Market News"
    )
    link = (
        item.get("link")
        or _nested_get(content, "clickThroughUrl", "url")
        or _nested_get(content, "canonicalUrl", "url")
        or ""
    )
    published_at = item.get("providerPublishTime") or content.get("pubDate")

    return {
        "headline": headline,
        "publisher": publisher,
        "summary": content.get("summary", ""),
        "link": link,
        "published_label": _format_news_time(published_at)
    }

def analyze_news_sentiment(ticker="RELIANCE.NS"):
    print(f"\n[SYSTEM] Analyzing live semantic context for {ticker}...")

    stock = yf.Ticker(ticker)
    news_items = stock.news

    # Graceful handling of missing news
    if not news_items:
        print("[WARNING] No recent news found. Defaulting to Neutral (50/100).")
        return {"average_raw_score": 0.0, "sentiment_score": 50, "articles": []}

    processed_articles = []
    total_score = 0

    # Process only the top 5 recent headlines to manage latency
    for item in news_items[:5]:
        article = _extract_article(item)
        if not article:
            continue
        headline = article["headline"]

        result = analyzer(headline)[0]
        label = result["label"].lower()
        confidence = result["score"] 

        # Mathematical weighting using exact AI probability
        if label == "positive":
            math_score = confidence
        elif label == "negative":
            math_score = -confidence
        else:
            math_score = 0.0

        total_score += math_score

        processed_articles.append({
            "headline": headline,
            "sentiment": label.upper(),
            "confidence": f"{confidence * 100:.1f}%",
            "publisher": article["publisher"],
            "summary": article["summary"],
            "link": article["link"],
            "published_label": article["published_label"]
        })

    # Normalization
    avg_score = total_score / len(processed_articles) if processed_articles else 0
    
    # Map the -1.0 to 1.0 raw scale to a clean 0 to 100 sentiment score
    normalized_sentiment = int((avg_score + 1) * 50)

    return {
        "average_raw_score": round(avg_score, 3),
        "sentiment_score": normalized_sentiment,
        "articles": processed_articles
    }

# --- TEST EXECUTION ---
if __name__ == "__main__":
    sentiment_data = analyze_news_sentiment("RELIANCE.NS")
    
    print("\n================ FINBERT NLP REPORT ================")
    print(f"Raw Math Score: {sentiment_data['average_raw_score']}")
    print(f"Normalized Sentiment Score: {sentiment_data['sentiment_score']} / 100")
    print("\n[ Headline Breakdown ]")
    for art in sentiment_data['articles']:
        print(f"-> [{art['sentiment']}] (Conf: {art['confidence']}) | {art['headline']}")
