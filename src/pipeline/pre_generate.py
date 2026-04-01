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
XGB_BUFFER_PATH = PROJECT_ROOT / "data/model/xgboost/buffer.json"

LSTM_MODEL_PATH = PROJECT_ROOT / "data/model/lstm/lstm_model.h5"
LSTM_BUNDLE_PATH = PROJECT_ROOT / "data/model/lstm/lstm_bundle.joblib"
LSTM_BUFFER_PATH = PROJECT_ROOT / "data/model/lstm/buffer.json"
LSTM_MODEL_PATHS = {
    "24h": PROJECT_ROOT / "data/model/lstm/24h.keras",
    "48h": PROJECT_ROOT / "data/model/lstm/48h.keras",
    "72h": PROJECT_ROOT / "data/model/lstm/72h.keras",
}

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

    scaler = bundle.get("scaler")
    seq_len = int(bundle.get("seq_len") or buffer_meta.get("seq_len", 192))

    buffer = list(buffer_meta["buffer"])
    last_time = pd.Timestamp(buffer_meta["data_end"])

    if scaler is None:
        scaler_meta = buffer_meta.get("load_scaler", {})
        scale = float(scaler_meta.get("scale", 1.0))
        min_offset = float(scaler_meta.get("min", 0.0))

        def scale_value(value):
            return value * scale + min_offset

        def inverse_scale(value):
            return (value - min_offset) / scale

    else:

        def scale_value(value):
            return scaler.transform([[value]])[0][0]

        def inverse_scale(value):
            return scaler.inverse_transform([[value]])[0][0]

    def build_row(value, ts):
        hour = ts.hour + ts.minute / 60
        dow = ts.dayofweek
        month = ts.month

        return [
            scale_value(value),
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

    # Supports both single-step autoregressive models and direct multi-step models.
    x = feat_buffer[-seq_len:].reshape(1, seq_len, feat_buffer.shape[1])
    first_pred = np.asarray(model.predict(x, verbose=0)).reshape(-1)

    if first_pred.shape[0] > 1:
        for pred_scaled in first_pred[:steps]:
            preds.append(float(inverse_scale(float(pred_scaled))))
        return preds

    for i in range(steps):
        next_time = last_time + pd.Timedelta(minutes=15 * (i + 1))

        x = feat_buffer[-seq_len:].reshape(1, seq_len, feat_buffer.shape[1])
        pred_scaled = model.predict(x, verbose=0)[0][0]

        pred = inverse_scale(float(pred_scaled))
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
    with open(LSTM_BUFFER_PATH) as f:
        lstm_buffer = json.load(f)

    lstm_bundle = {}
    if LSTM_BUNDLE_PATH.exists():
        lstm_bundle = joblib.load(LSTM_BUNDLE_PATH)

    lstm_models = {}
    for horizon, model_path in LSTM_MODEL_PATHS.items():
        if model_path.exists():
            lstm_models[horizon] = tf.keras.models.load_model(model_path, compile=False)

    # Backward compatibility with legacy single-model artifact.
    if not lstm_models and LSTM_MODEL_PATH.exists():
        legacy_model = tf.keras.models.load_model(LSTM_MODEL_PATH, compile=False)
        lstm_models = {h: legacy_model for h in HORIZONS}

    if not lstm_models:
        raise FileNotFoundError(
            "No LSTM models found. Expected one of: "
            f"{', '.join(str(p) for p in LSTM_MODEL_PATHS.values())} "
            f"or legacy model at {LSTM_MODEL_PATH}"
        )

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
        if horizon not in lstm_models:
            raise FileNotFoundError(
                f"Missing LSTM model for {horizon}: expected {LSTM_MODEL_PATHS[horizon]}"
            )

        lstm_preds = run_lstm_forecast(
            horizon, lstm_models[horizon], lstm_bundle, lstm_buffer
        )
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

    # Residual heatmap (from LSTM buffer)
    if "heatmap_matrix" in lstm_buffer:
        with open(LSTM_OUTPUT_DIR / "residuals.json", "w") as f:
            json.dump(
                {
                    "heatmap_matrix": lstm_buffer["heatmap_matrix"],
                    "heatmap_flat": lstm_buffer["heatmap_flat"],
                    "heatmap_info": lstm_buffer.get("heatmap_info", {}),
                    "trained_at": lstm_buffer["trained_at"],
                    "data_end": lstm_buffer["data_end"],
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

    with open(LSTM_OUTPUT_DIR / "metrics.json", "w") as f:
        json.dump(
            {
                "trained_at": lstm_buffer["trained_at"],
                "data_end": lstm_buffer["data_end"],
                "horizon_metrics": lstm_buffer.get("horizon_metrics", {}),
            },
            f,
        )

    print("\nDone. XGB + LSTM forecasts generated.")
