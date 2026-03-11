"""
NRLDC XGBoost — Flask Forecast API
------------------------------------
Endpoints:
  GET /health     → API status + model metadata
  GET /forecast   → 96-step 24h ahead forecast as JSON

Startup:
  Loads model.joblib + buffer.json ONCE at startup.
  All requests are served from memory — no retraining on demand.

Usage (Windows):
  cd <project_root>
  python src/api/app.py

  API runs at: http://localhost:5000
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PATH   = PROJECT_ROOT / "data" / "model" / "xgboost_model.joblib"
BUFFER_PATH  = PROJECT_ROOT / "data" / "model" / "buffer.json"

# ── Constants (must match train_and_save.py exactly) ──────────────────────────
STEPS      = 96    # 24-hour forecast horizon
BUFFER_LEN = 672   # 1 week of 15-min steps

# ── Load model + buffer at startup (once) ─────────────────────────────────────
print("=" * 55)
print("NRLDC Forecast API — Starting up")
print("=" * 55)

print(f"\n[1/2] Loading model: {MODEL_PATH.relative_to(PROJECT_ROOT)}")
model = joblib.load(MODEL_PATH)
print(f"      OK.")

print(f"\n[2/2] Loading buffer: {BUFFER_PATH.relative_to(PROJECT_ROOT)}")
with open(BUFFER_PATH, "r") as f:
    buffer_meta = json.load(f)

FEATURE_COLS = buffer_meta["feature_cols"]
DATA_END     = buffer_meta["data_end"]
TRAINED_AT   = buffer_meta["trained_at"]
TEST_METRICS = buffer_meta["test_metrics"]

print(f"      Model trained at : {TRAINED_AT}")
print(f"      Data ends at     : {DATA_END}")
print(f"      Test MAPE        : {TEST_METRICS['mape']}%")
print(f"      Feature cols     : {FEATURE_COLS}")
print(f"\n{'=' * 55}")
print(f"API ready. Running on http://localhost:5000")
print(f"{'=' * 55}\n")

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)   # allows the dashboard HTML to call this API from the browser


# ── Forecast logic (identical to your notebook's forecast_from) ───────────────
def run_forecast():
    """
    Runs the 96-step autoregressive forecast loop.
    Seeds from the last 672 actual values in buffer.json.
    Returns a list of dicts: [{datetime, load_mw}, ...]
    """
    buffer     = list(buffer_meta["buffer"])   # fresh copy every call
    last_time  = pd.Timestamp(DATA_END)
    preds      = []

    for i in range(STEPS):
        next_time = last_time + pd.Timedelta(minutes=15 * (i + 1))

        row = {
            "lag1"           : buffer[-1],
            "lag2"           : buffer[-2],
            "lag3"           : buffer[-3],
            "lag4"           : buffer[-4],
            "lag96"          : buffer[-96],
            "lag192"         : buffer[-192],
            "lag672"         : buffer[-672],
            "rolling_mean_4" : np.mean(buffer[-4:]),
            "rolling_mean_12": np.mean(buffer[-12:]),
            "rolling_std_12" : np.std(buffer[-12:], ddof=1),
            "hour"           : next_time.hour,
            "day_of_week"    : next_time.dayofweek,
            "month"          : next_time.month,
            "is_weekend"     : int(next_time.dayofweek >= 5),
        }

        row_df    = pd.DataFrame([row])[FEATURE_COLS]   # enforce column order
        predicted = float(model.predict(row_df)[0])

        preds.append({
            "datetime": next_time.strftime("%Y-%m-%d %H:%M"),
            "load_mw" : round(predicted, 2),
        })
        buffer.append(predicted)

    return preds


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status"      : "ok",
        "trained_at"  : TRAINED_AT,
        "data_end"    : DATA_END,
        "test_metrics": TEST_METRICS,
        "model"       : "XGBoost — Season-Aware",
        "horizon"     : f"{STEPS} steps (24h)",
    })


@app.route("/residuals", methods=["GET"])
def residuals():
    """
    Returns the 7x24 real residual heatmap computed during training.
    matrix[day_of_week][hour] = mean APE % from test set forecasts.
    """
    if "heatmap_matrix" not in buffer_meta:
        return jsonify({"error": "Heatmap not found. Re-run train_and_save.py."}), 404

    return jsonify({
        "heatmap_matrix": buffer_meta["heatmap_matrix"],  # list[7][24]
        "heatmap_flat"  : buffer_meta["heatmap_flat"],    # list[168]
        "heatmap_info"  : buffer_meta.get("heatmap_info", {}),
        "trained_at"    : TRAINED_AT,
        "data_end"      : DATA_END,
    })


@app.route("/forecast", methods=["GET"])
def forecast():
    try:
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        predictions  = run_forecast()

        return jsonify({
            "generated_at": generated_at,
            "model"       : "XGBoost — Season-Aware",
            "data_end"    : DATA_END,
            "trained_at"  : TRAINED_AT,
            "steps"       : STEPS,
            "horizon_h"   : 24,
            "test_metrics": TEST_METRICS,
            "forecast"    : predictions,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # debug=False for stability
    # use_reloader=False so the model isn't loaded twice on startup
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)