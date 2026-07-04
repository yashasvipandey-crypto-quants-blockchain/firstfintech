import yfinance as yf
import pandas as pd
import ta
import numpy as np

def fetch_and_engineer_data(ticker_symbol, period_length="2y"):
    print(f"[SYSTEM] Fetching raw data for {ticker_symbol}...")
    df = yf.Ticker(ticker_symbol).history(period=period_length)
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna()

    print("[SYSTEM] Engineering Technical Features (Zero Leakage)...")
    df['RSI'] = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()
    macd = ta.trend.MACD(close=df['Close'])
    df['MACD'] = macd.macd()
    df['SMA_20'] = ta.trend.SMAIndicator(close=df['Close'], window=20).sma_indicator()
    df['SMA_50'] = ta.trend.SMAIndicator(close=df['Close'], window=50).sma_indicator()
    df['Daily_Return'] = df['Close'].pct_change()
    df['Volatility'] = df['Daily_Return'].rolling(window=20).std()
    df['Volume_Avg_5d'] = df['Volume'].rolling(window=5).mean()
    df['Volume_Ratio'] = df['Volume'] / df['Volume_Avg_5d']

    # --- ADVANCED QUANT FEATURES (The Upgrade) ---
    print("[SYSTEM] Injecting Advanced Quant Features (ADX, ATR, Bollinger)...")
    
    # Trend Strength: ADX
    df['ADX'] = ta.trend.ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14).adx()
    
    # Absolute Volatility: ATR
    df['ATR'] = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14).average_true_range()
    
    # Price Extremes: Bollinger Band Width
    df['BB_Width'] = ta.volatility.BollingerBands(close=df['Close'], window=20, window_dev=2).bollinger_wband()
    
    # Velocity: 5-Day Momentum
    df['Momentum_5d'] = df['Close'].diff(periods=5)

    df = df.dropna()

    # --- NEW: STEP 3 - LABELING (THE ANSWER KEY) ---
    print("[SYSTEM] Generating Predictive Target Labels...")
    
    # Create a column for Tomorrow's Close by shifting the Close column backwards by 1
    df['Tomorrow_Close'] = df['Close'].shift(-1)
    
    # If Tomorrow > Today, Target is 1. Else 0.
    df['Target'] = (df['Tomorrow_Close'] > df['Close']).astype(int)
    
    # We must drop the very last row because we don't know "tomorrow" for today yet!
    df = df.dropna()

    # --- NEW: HURDLE 1 PREVENTION ---
    # Drop absolute prices so the model doesn't memorize them. 
    # We keep only the mathematically bounded indicators.
    features_to_keep = ['RSI', 'MACD', 'SMA_20', 'SMA_50', 'Volatility', 'Volume_Ratio', 'Target','ADX', 'ATR', 'BB_Width', 'Momentum_5d']
    final_df = df[features_to_keep]
    
    return final_df

# --- TEST EXECUTION ---
if __name__ == "__main__":
    test_ticker = "RELIANCE.NS"
    ml_ready_data = fetch_and_engineer_data(test_ticker)
    
    print("\n[SUCCESS] Data is ready for Machine Learning. Final Shape:", ml_ready_data.shape)
    print("\n--- The Final ML Matrix (Features + Target) ---")
    print(ml_ready_data.tail())