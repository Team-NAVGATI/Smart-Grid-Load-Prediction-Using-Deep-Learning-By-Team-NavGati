"""
pre_generate.py (XGB + LSTM)
----------------------------
Generates forecasts for:
  - XGBoost
  - LSTM

Outputs:
  forecast_24h_xgb.json
  forecast_24h_lstm.json
  ...
"""

import json
import os
import sys
import warnings
from datetime import datetime
from pathlib import Path

# Suppress all warnings BEFORE importing TensorFlow
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Suppress absl logging
import logging

logging.getLogger("absl").setLevel(logging.ERROR)

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf

# Suppress TensorFlow logging
tf.get_logger().setLevel("ERROR")

# ================= PATHS =================
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

XGB_MODEL_PATH = PROJECT_ROOT / "data/model/xgboost/xgboost_model.joblib"
XGB_BUFFER_PATH = PROJECT_ROOT / "data/model/xgboost/xgboost/buffer.json"

LSTM_MODEL_PATH = PROJECT_ROOT / "data/model/lstm/lstm_model.h5"
LSTM_BUNDLE_PATH = PROJECT_ROOT / "data/model/lstm/lstm_bundle.joblib"
LSTM_BUFFER_PATH = PROJECT_ROOT / "data/model/lstm/lstm_buffer.json"

OUTPUT_DIR = PROJECT_ROOT / "data/public/data"
XGB_OUTPUT_DIR = OUTPUT_DIR / "xgboost"
LSTM_OUTPUT_DIR = OUTPUT_DIR / "lstm"

HORIZONS = {"24h": 96, "48h": 192, "72h": 288}


# ================= XGBOOST =================
def run_xgb_forecast(horizon, model, buffer_meta):
    steps = HORIZONS[horizon]
    buffer = list(buffer_meta["buffer"])
    feature_cols = buffer_meta["feature_cols"]
    last_time = pd.Timestamp(buffer_meta["data_end"])

    preds = []

    for i in range(steps):
        next_time = last_time + pd.Timedelta(minutes=15 * (i + 1))

        row = {
            "lag1": buffer[-1],
            "lag2": buffer[-2],
            "lag3": buffer[-3],
            "lag4": buffer[-4],
            "lag96": buffer[-96],
            "lag192": buffer[-192],
            "lag672": buffer[-672],
            "rolling_mean_4": float(np.mean(buffer[-4:])),
            "rolling_mean_12": float(np.mean(buffer[-12:])),
            "rolling_std_12": float(np.std(buffer[-12:], ddof=1)),
            "hour": next_time.hour,
            "day_of_week": next_time.dayofweek,
            "month": next_time.month,
            "is_weekend": int(next_time.dayofweek >= 5),
        }

        pred = float(model.predict(pd.DataFrame([row])[feature_cols])[0])
        preds.append(pred)
        buffer.append(pred)

    return preds


# ================= LSTM =================
def run_lstm_forecast(horizon, model, bundle, buffer_meta):
    steps = HORIZONS[horizon]

    scaler = bundle["scaler"]
    seq_len = bundle["seq_len"]

    buffer = list(buffer_meta["buffer"])
    last_time = pd.Timestamp(buffer_meta["data_end"])

    def build_row(value, ts):
        hour = ts.hour + ts.minute / 60
        dow = ts.dayofweek
        month = ts.month

        return [
            scaler.transform([[value]])[0][0],
            np.sin(2 * np.pi * hour / 24),
            np.cos(2 * np.pi * hour / 24),
            np.sin(2 * np.pi * dow / 7),
            np.cos(2 * np.pi * dow / 7),
            np.sin(2 * np.pi * month / 12),
            np.cos(2 * np.pi * month / 12),
        ]

    feat_buffer = []
    for i in range(seq_len):
        ts = last_time - pd.Timedelta(minutes=15 * (seq_len - i))
        feat_buffer.append(build_row(buffer[-seq_len + i], ts))

    feat_buffer = np.array(feat_buffer)

    preds = []

    for i in range(steps):
        next_time = last_time + pd.Timedelta(minutes=15 * (i + 1))

        x = feat_buffer[-seq_len:].reshape(1, seq_len, feat_buffer.shape[1])
        pred_scaled = model.predict(x, verbose=0)[0][0]

        pred = scaler.inverse_transform([[pred_scaled]])[0][0]
        preds.append(pred)

        new_row = build_row(pred, next_time)
        feat_buffer = np.vstack([feat_buffer, new_row])

    return preds


# ================= SAVE =================
def save_json(preds, horizon, model_name, buffer_meta):
    steps = HORIZONS[horizon]
    last_time = pd.Timestamp(buffer_meta["data_end"])

    forecast = []
    for i, p in enumerate(preds):
        ts = last_time + pd.Timedelta(minutes=15 * (i + 1))
        forecast.append(
            {"datetime": ts.strftime("%Y-%m-%d %H:%M"), "load_mw": round(float(p), 2)}
        )

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model": model_name,
        "data_end": buffer_meta["data_end"],
        "trained_at": buffer_meta["trained_at"],
        "horizon": horizon,
        "horizon_h": int(horizon.replace("h", "")),
        "steps": steps,
        "horizon_metrics": buffer_meta.get("horizon_metrics", {}),
        "forecast": forecast,
    }


# ================= MAIN =================
if __name__ == "__main__":

    print("Loading models...")

    # XGB
    xgb_model = joblib.load(XGB_MODEL_PATH)
    with open(XGB_BUFFER_PATH) as f:
        xgb_buffer = json.load(f)

    # LSTM
    lstm_model = tf.keras.models.load_model(LSTM_MODEL_PATH, compile=False)
    lstm_bundle = joblib.load(LSTM_BUNDLE_PATH)
    with open(LSTM_BUFFER_PATH) as f:
        lstm_buffer = json.load(f)

    # Use XGB's data_end as reference point for LSTM
    lstm_buffer["data_end"] = xgb_buffer["data_end"]

    # Create output directories
    XGB_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LSTM_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for horizon in HORIZONS:

        print(f"\n=== {horizon} ===")

        # XGB
        xgb_preds = run_xgb_forecast(horizon, xgb_model, xgb_buffer)
        xgb_json = save_json(xgb_preds, horizon, "XGBoost", xgb_buffer)

        with open(XGB_OUTPUT_DIR / f"forecast_{horizon}.json", "w") as f:
            json.dump(xgb_json, f)

        print("XGB done")

        # LSTM
        lstm_preds = run_lstm_forecast(horizon, lstm_model, lstm_bundle, lstm_buffer)
        lstm_json = save_json(lstm_preds, horizon, "LSTM", lstm_buffer)

        with open(LSTM_OUTPUT_DIR / f"forecast_{horizon}.json", "w") as f:
            json.dump(lstm_json, f)

        print("LSTM done")

    # Residual heatmap (from XGB buffer)
    if "heatmap_matrix" in xgb_buffer:
        with open(XGB_OUTPUT_DIR / "residuals.json", "w") as f:
            json.dump(
                {
                    "heatmap_matrix": xgb_buffer["heatmap_matrix"],
                    "heatmap_flat": xgb_buffer["heatmap_flat"],
                    "heatmap_info": xgb_buffer.get("heatmap_info", {}),
                    "trained_at": xgb_buffer["trained_at"],
                    "data_end": xgb_buffer["data_end"],
                },
                f,
            )

    with open(XGB_OUTPUT_DIR / "metrics.json", "w") as f:
        json.dump(
            {
                "trained_at": xgb_buffer["trained_at"],
                "data_end": xgb_buffer["data_end"],
                "horizon_metrics": xgb_buffer.get("horizon_metrics", {}),
            },
            f,
        )

    print("\nDone. XGB + LSTM forecasts generated.")
