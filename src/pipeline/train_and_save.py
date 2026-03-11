"""
NRLDC XGBoost — Train & Save
------------------------------
Reads : data/cleaned/nrldc_cleaned.parquet
         (index: datetime 15-min, column: actual_demand_mw)

Outputs:
  data/model/xgboost_model.joblib   — trained XGBoost model
  data/model/buffer.json            — last 672 values + metadata
                                      + real residual heatmap (7x24)

This script runs ONCE per week (scheduled).
The Flask API never retrains — it just loads these two files.

Usage:
    python src/pipeline/train_and_save.py
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_PATH   = PROJECT_ROOT / "data" / "cleaned" / "nrldc_cleaned.parquet"
MODEL_DIR    = PROJECT_ROOT / "data" / "model"
MODEL_PATH   = MODEL_DIR / "xgboost_model.joblib"
BUFFER_PATH  = MODEL_DIR / "buffer.json"

# ── Constants (must match app.py exactly) ─────────────────────────────────────
BUFFER_LEN     = 672   # 1 week of 15-min steps — needed for lag672
STEPS          = 96    # 24-hour forecast horizon
HOLDOUT_MONTHS = 3     # last 3 months held out as test (season-aware split)

# ── XGBoost hyperparameters ───────────────────────────────────────────────────
XGB_PARAMS = dict(
    n_estimators     = 300,
    learning_rate    = 0.05,
    max_depth        = 6,
    subsample        = 0.8,
    colsample_bytree = 0.8,
    random_state     = 42,
)


# ── Feature engineering ───────────────────────────────────────────────────────
def add_features(df_part, full_series):
    out = df_part.copy()
    for i in range(1, 5):
        out[f"lag{i}"] = full_series.shift(i).loc[out.index]
    out["lag96"]  = full_series.shift(96).loc[out.index]
    out["lag192"] = full_series.shift(192).loc[out.index]
    out["lag672"] = full_series.shift(672).loc[out.index]
    s = full_series.shift(1)
    out["rolling_mean_4"]  = s.rolling(4).mean().loc[out.index]
    out["rolling_mean_12"] = s.rolling(12).mean().loc[out.index]
    out["rolling_std_12"]  = s.rolling(12).std().loc[out.index]
    out["hour"]        = out.index.hour
    out["day_of_week"] = out.index.dayofweek
    out["month"]       = out.index.month
    out["is_weekend"]  = (out.index.dayofweek >= 5).astype(int)
    return out.dropna()


# ── Season-aware train/test split ─────────────────────────────────────────────
def make_split(df):
    cutoff = (
        df.index[-1] - pd.DateOffset(months=HOLDOUT_MONTHS)
    ).replace(day=1, hour=0, minute=0, second=0)
    train_mask = df.index < cutoff
    test_mask  = df.index >= cutoff
    return train_mask, test_mask, cutoff


# ── One-step evaluation ───────────────────────────────────────────────────────
def evaluate(y_true, y_pred, label=""):
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    print(f"  {label}")
    print(f"    MAE  : {mae:,.1f} MW")
    print(f"    RMSE : {rmse:,.1f} MW")
    print(f"    MAPE : {mape:.3f} %")
    return {"mae": round(mae, 1), "rmse": round(rmse, 1), "mape": round(mape, 3)}


# ── Autoregressive 24h forecast from a single cutoff ─────────────────────────
def forecast_from(cutoff_idx, series, model, feature_cols):
    """
    Runs the 96-step autoregressive loop from cutoff_idx.
    Returns (pred_index, preds, actuals).
    actuals will be empty array if cutoff is at end of series (live forecast).
    """
    buffer      = list(series.iloc[cutoff_idx - BUFFER_LEN : cutoff_idx])
    cutoff_time = series.index[cutoff_idx - 1]
    preds       = []

    for i in range(STEPS):
        next_time = cutoff_time + pd.Timedelta(minutes=15 * (i + 1))
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
        p = float(model.predict(pd.DataFrame([row])[feature_cols])[0])
        preds.append(p)
        buffer.append(p)

    pred_index   = pd.date_range(
        start=cutoff_time, periods=STEPS + 1, freq="15min"
    )[1:]
    # actuals — only available if we're inside the series (not at the live edge)
    end_idx = cutoff_idx + STEPS
    if end_idx <= len(series):
        actuals = series.iloc[cutoff_idx : end_idx].values
    else:
        actuals = np.array([])

    return pred_index, np.array(preds), actuals


# ── Residual heatmap — real APE per (day_of_week, hour) ──────────────────────
def compute_residual_heatmap(series, model, feature_cols, test_start_idx):
    """
    Runs autoregressive 24h forecasts at evenly spaced cutoffs across
    the full test set. For each predicted step that has a real actual,
    records APE = |actual - pred| / actual * 100, bucketed by
    (day_of_week, hour).

    Returns:
      heatmap_matrix : list[7][24]  — avg APE per (dow, hour)
      heatmap_flat   : list[168]    — same, row-major for JSON
    """
    print(f"\n[5/6] Computing residual heatmap across test set...")

    # One cutoff every 2 days (192 steps) — good coverage, manageable runtime
    CUTOFF_STEP = 192
    cutoffs = []
    idx = test_start_idx
    while idx + STEPS <= len(series):
        if idx >= BUFFER_LEN:
            cutoffs.append(idx)
        idx += CUTOFF_STEP

    total = len(cutoffs)
    print(f"      Cutoffs to run : {total}  (every {CUTOFF_STEP * 15 // 60}h across test set)")
    print(f"      Test set covers: {series.index[test_start_idx].date()} "
          f"→ {series.index[-1].date()}")

    # bucket[dow][hour] = list of APE values collected across all cutoffs
    bucket = [[[] for _ in range(24)] for _ in range(7)]

    for c, cutoff_idx in enumerate(cutoffs):
        ts_label = series.index[cutoff_idx].strftime("%Y-%m-%d %H:%M")
        print(f"      [{c+1:3d}/{total}] {ts_label}", end="\r")

        try:
            pred_index, preds, actuals = forecast_from(
                cutoff_idx, series, model, feature_cols
            )

            # Only use steps where we have real actuals
            if len(actuals) == 0:
                continue

            n = min(len(preds), len(actuals))
            for i in range(n):
                actual = actuals[i]
                pred   = preds[i]
                ts     = pred_index[i]

                if actual == 0 or np.isnan(actual) or np.isnan(pred):
                    continue

                ape  = abs(actual - pred) / actual * 100
                dow  = ts.dayofweek   # 0=Mon … 6=Sun
                hour = ts.hour        # 0–23
                bucket[dow][hour].append(ape)

        except Exception as e:
            print(f"\n      [WARN] Cutoff {cutoff_idx} failed: {e}")
            continue

    print(f"\n      All cutoffs done. Building 7×24 matrix...")

    # Average each bucket — 0.0 if somehow empty
    matrix = []
    for dow in range(7):
        row = []
        for hour in range(24):
            vals = bucket[dow][hour]
            avg  = round(float(np.mean(vals)), 3) if vals else 0.0
            row.append(avg)
        matrix.append(row)

    flat_vals = [v for row in matrix for v in row]
    print(f"      APE range : {min(flat_vals):.2f}% – {max(flat_vals):.2f}%")
    print(f"      Mean APE  : {np.mean(flat_vals):.2f}%")

    # Worst slots — useful for diagnosis
    slots = [(matrix[d][h], d, h) for d in range(7) for h in range(24)]
    slots.sort(reverse=True)
    days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    print(f"      Worst 3 slots:")
    for ape, d, h in slots[:3]:
        print(f"        {days[d]} {h:02d}:00  →  {ape:.2f}%")

    # flat list row-major: Mon-00h, Mon-01h, … Sun-23h
    flat_list = [matrix[d][h] for d in range(7) for h in range(24)]

    return matrix, flat_list


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    run_start = datetime.now()

    print("=" * 55)
    print("NRLDC XGBoost — Train & Save")
    print("=" * 55)

    # ── 1. Load ───────────────────────────────────────────────────────────────
    print(f"\n[1/6] Loading: {INPUT_PATH.relative_to(PROJECT_ROOT)}")
    df = pd.read_parquet(INPUT_PATH, engine="pyarrow")
    df.columns = ["load"]
    df = df.sort_index()
    print(f"      Rows : {len(df):,}")
    print(f"      Range: {df.index[0]}  →  {df.index[-1]}")

    # ── 2. Split ──────────────────────────────────────────────────────────────
    print(f"\n[2/6] Season-aware split (holdout = last {HOLDOUT_MONTHS} months)")
    train_mask, test_mask, cutoff = make_split(df)
    print(f"      Train: {df.index[train_mask][0].date()}  →  "
          f"{df.index[train_mask][-1].date()}  ({train_mask.sum():,} rows)")
    print(f"      Test : {df.index[test_mask][0].date()}   →  "
          f"{df.index[test_mask][-1].date()}   ({test_mask.sum():,} rows)")

    train_months = set(df.index[train_mask].month)
    test_months  = set(df.index[test_mask].month)
    unseen       = test_months - train_months
    if unseen:
        print(f"      [WARN] Months in test not seen in training: {unseen}")
    else:
        print(f"      All test months seen in training. ✓")

    # ── 3. Features ───────────────────────────────────────────────────────────
    print(f"\n[3/6] Building features...")
    full_series  = df["load"]
    train_feat   = add_features(df[train_mask].copy(), full_series)
    test_feat    = add_features(df[test_mask].copy(),  full_series)

    X_train      = train_feat.drop("load", axis=1)
    y_train      = train_feat["load"]
    X_test       = test_feat.drop("load", axis=1)
    y_test       = test_feat["load"]
    FEATURE_COLS = list(X_train.columns)

    print(f"      Features : {FEATURE_COLS}")
    print(f"      X_train  : {X_train.shape}  |  X_test: {X_test.shape}")

    # ── 4. Train ──────────────────────────────────────────────────────────────
    print(f"\n[4/6] Training XGBoost...")
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(X_train, y_train)
    print(f"      Done.")

    pred_test = model.predict(X_test)
    metrics   = evaluate(y_test.values, pred_test, label="Test set (one-step ahead)")

    # ── 5. Residual heatmap ───────────────────────────────────────────────────
    test_start_idx = int(df.index.searchsorted(cutoff))
    heatmap_matrix, heatmap_flat = compute_residual_heatmap(
        full_series, model, FEATURE_COLS, test_start_idx
    )

    # ── 6. Save ───────────────────────────────────────────────────────────────
    print(f"\n[6/6] Saving model and buffer...")
    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(model, MODEL_PATH)
    print(f"      Saved model : data/model/xgboost_model.joblib")

    buffer_payload = {
        "trained_at"    : run_start.isoformat(),
        "data_end"      : str(df.index[-1]),
        "buffer_len"    : BUFFER_LEN,
        "feature_cols"  : FEATURE_COLS,
        "test_metrics"  : metrics,
        "buffer"        : df["load"].values[-BUFFER_LEN:].tolist(),

        # Real residuals from test set autoregressive forecasts
        # matrix[day_of_week][hour] = mean APE %
        # 0=Mon … 6=Sun,  hour 0–23
        "heatmap_matrix": heatmap_matrix,
        "heatmap_flat"  : heatmap_flat,   # 168 values, row-major
        "heatmap_info"  : {
            "rows"        : "day_of_week (0=Mon … 6=Sun)",
            "cols"        : "hour_of_day (0–23)",
            "values"      : "mean absolute percentage error % (real forecasts vs actuals)",
            "n_cutoffs"   : len([i for i in range(test_start_idx, len(df) - STEPS, 192)
                                 if i >= BUFFER_LEN]),
            "cutoff_step" : "192 steps = every 2 days",
        },
    }

    with open(BUFFER_PATH, "w") as f:
        json.dump(buffer_payload, f, indent=2)

    print(f"      Saved buffer: data/model/buffer.json")
    print(f"        ↳ last {BUFFER_LEN} actual values  ({BUFFER_LEN * 15 // 60}h history)")
    print(f"        ↳ 7×24 real residual heatmap from test set")

    duration = (datetime.now() - run_start).seconds
    print(f"\n{'=' * 55}")
    print(f"Complete in {duration}s.")
    print(f"  One-step MAPE : {metrics['mape']:.3f}%")
    print(f"  Heatmap range : {min(heatmap_flat):.2f}% – {max(heatmap_flat):.2f}%")
    print(f"  Next step     : python src/api/app.py")
    print(f"{'=' * 55}")