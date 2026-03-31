"""
NRLDC LSTM — Train & Save (Production v3)
-----------------------------------------
Full parity with XGBoost pipeline

Outputs:
  data/model/lstm_model.h5
  data/model/lstm_bundle.joblib
  data/model/lstm_buffer.json
"""

import json
import os
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.models import Sequential

# ── Paths ───────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_PATH = PROJECT_ROOT / "data" / "cleaned" / "nrldc_cleaned.parquet"

MODEL_DIR = PROJECT_ROOT / "data" / "model"
MODEL_PATH = MODEL_DIR / "lstm_model.h5"
BUNDLE_PATH = MODEL_DIR / "lstm_bundle.joblib"
BUFFER_PATH = MODEL_DIR / "lstm_buffer.json"

# ── Constants ───────────────────────────────
BUFFER_LEN = 672
SEQ_LEN = 192
HOLDOUT_MONTHS = 3

HORIZONS = {
    "24h": 96,
    "48h": 192,
    "72h": 288,
}

BACKTEST_CUTOFFS = 7

# ── Model Config ────────────────────────────
LSTM_UNITS_1 = 128
LSTM_UNITS_2 = 64
DROPOUT = 0.2


# ── Feature Engineering ─────────────────────
def add_time_features(series):
    df = pd.DataFrame({"load": series})

    hour = series.index.hour + series.index.minute / 60
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    dow = series.index.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    month = series.index.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    return df


# ── Split ───────────────────────────────────
def make_split(df):
    cutoff = (df.index[-1] - pd.DateOffset(months=HOLDOUT_MONTHS)).replace(
        day=1, hour=0, minute=0
    )
    return cutoff


# ── Metrics ─────────────────────────────────
def _metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    return {
        "mae": round(float(mae), 1),
        "rmse": round(float(rmse), 1),
        "mape": round(float(mape), 3),
    }


# ── Model ───────────────────────────────────
def build_model(seq_len, n_features):
    model = Sequential(
        [
            LSTM(
                LSTM_UNITS_1, return_sequences=True, input_shape=(seq_len, n_features)
            ),
            Dropout(DROPOUT),
            LSTM(LSTM_UNITS_2),
            Dropout(DROPOUT),
            Dense(1),  # single-step prediction
        ]
    )

    model.compile(optimizer="adam", loss="mse")
    return model


# ── Autoregressive Forecast ─────────────────
def forecast_from(cutoff_idx, feat_array, series, model, scaler, steps):

    buffer = feat_array[cutoff_idx - SEQ_LEN : cutoff_idx].copy()
    cutoff_time = series.index[cutoff_idx - 1]

    preds = []

    for i in range(steps):
        x = buffer[-SEQ_LEN:].reshape(1, SEQ_LEN, buffer.shape[1])
        pred_scaled = model.predict(x, verbose=0)[0][0]

        preds.append(pred_scaled)

        # build next row
        next_time = cutoff_time + pd.Timedelta(minutes=15 * (i + 1))

        new_row = buffer[-1].copy()
        new_row[0] = pred_scaled

        # update time features
        hour = next_time.hour + next_time.minute / 60
        new_row[1] = np.sin(2 * np.pi * hour / 24)
        new_row[2] = np.cos(2 * np.pi * hour / 24)

        dow = next_time.dayofweek
        new_row[3] = np.sin(2 * np.pi * dow / 7)
        new_row[4] = np.cos(2 * np.pi * dow / 7)

        month = next_time.month
        new_row[5] = np.sin(2 * np.pi * month / 12)
        new_row[6] = np.cos(2 * np.pi * month / 12)

        buffer = np.vstack([buffer, new_row])

    preds = scaler.inverse_transform(np.array(preds).reshape(-1, 1)).flatten()

    actuals = series.iloc[cutoff_idx : cutoff_idx + steps].values

    return preds, actuals


# ── Backtest ────────────────────────────────
def run_backtest(series, feat_array, model, scaler, test_start_idx):

    horizon_metrics = {}

    for label, steps in HORIZONS.items():

        cutoffs = []
        idx = test_start_idx

        while idx + steps <= len(series) and len(cutoffs) < BACKTEST_CUTOFFS:
            if idx >= SEQ_LEN:
                cutoffs.append(idx)
            idx += steps

        all_metrics = []

        for cidx in cutoffs:
            preds, actuals = forecast_from(
                cidx, feat_array, series, model, scaler, steps
            )

            m = _metrics(actuals[: len(preds)], preds[: len(actuals)])
            all_metrics.append(m)

        horizon_metrics[label] = {
            "mae": np.mean([m["mae"] for m in all_metrics]),
            "rmse": np.mean([m["rmse"] for m in all_metrics]),
            "mape": np.mean([m["mape"] for m in all_metrics]),
        }

    return horizon_metrics


# ── Heatmap ─────────────────────────────────
def compute_heatmap(series, feat_array, model, scaler, test_start_idx):

    bucket = [[[] for _ in range(24)] for _ in range(7)]

    idx = test_start_idx

    while idx + 96 <= len(series):
        if idx >= SEQ_LEN:

            preds, actuals = forecast_from(idx, feat_array, series, model, scaler, 96)

            for i in range(len(preds)):
                actual = actuals[i]
                pred = preds[i]

                ts = series.index[idx + i]

                ape = abs(actual - pred) / actual * 100
                bucket[ts.dayofweek][ts.hour].append(ape)

        idx += 192

    matrix = [
        [round(np.mean(bucket[d][h]), 3) if bucket[d][h] else 0 for h in range(24)]
        for d in range(7)
    ]

    flat = [matrix[d][h] for d in range(7) for h in range(24)]

    return matrix, flat


# ── MAIN ────────────────────────────────────
if __name__ == "__main__":

    print("LSTM v3 — Production Pipeline")

    df = pd.read_parquet(INPUT_PATH)
    df.columns = ["load"]
    df = df.sort_index()

    series = df["load"]

    feat = add_time_features(series)

    scaler = MinMaxScaler()
    feat["load"] = scaler.fit_transform(feat[["load"]])

    feat_array = feat.values

    cutoff = make_split(df)
    test_start_idx = df.index.searchsorted(cutoff)

    # ── Train ──
    X, y = [], []
    for i in range(len(feat_array[:test_start_idx]) - SEQ_LEN - 1):
        X.append(feat_array[i : i + SEQ_LEN])
        y.append(feat_array[i + SEQ_LEN][0])

    X, y = np.array(X), np.array(y)

    model = build_model(SEQ_LEN, feat_array.shape[1])
    model.fit(X, y, epochs=30, batch_size=64, verbose=1)

    # ── Backtest ──
    horizon_metrics = run_backtest(series, feat_array, model, scaler, test_start_idx)

    heatmap_matrix, heatmap_flat = compute_heatmap(
        series, feat_array, model, scaler, test_start_idx
    )

    # ── Save ──
    os.makedirs(MODEL_DIR, exist_ok=True)

    model.save(MODEL_PATH)

    joblib.dump(
        {
            "scaler": scaler,
            "seq_len": SEQ_LEN,
            "n_features": feat_array.shape[1],
        },
        BUNDLE_PATH,
    )

    buffer_payload = {
        "trained_at": datetime.now().isoformat(),
        "buffer": series.values[-BUFFER_LEN:].tolist(),
        "horizon_metrics": horizon_metrics,
        "heatmap_matrix": heatmap_matrix,
        "heatmap_flat": heatmap_flat,
    }

    with open(BUFFER_PATH, "w") as f:
        json.dump(buffer_payload, f, indent=2)

    print("\nDone. LSTM ready for deployment.")
