# import json
# import os
# import time
# from datetime import datetime
# from pathlib import Path

# import numpy as np
# import pandas as pd
# import tensorflow as tf
# from sklearn.metrics import mean_absolute_error, mean_squared_error
# from sklearn.preprocessing import MinMaxScaler
# from tensorflow.keras.callbacks import (EarlyStopping, ModelCheckpoint,
#                                         ReduceLROnPlateau)
# from tensorflow.keras.layers import LSTM, Dense, Dropout
# from tensorflow.keras.models import Sequential

# # GPU detection
# gpus = tf.config.list_physical_devices("GPU")
# if gpus:
#     for gpu in gpus:
#         try:
#             tf.config.experimental.set_memory_growth(gpu, True)
#         except RuntimeError:
#             # GPU already initialized (common when re-running a Colab cell).
#             # Memory growth cannot be changed now — TF will use its default
#             # allocation strategy, which is fine for T4 with 15 GB VRAM.
#             pass
#     print(f"GPU found: {[g.name for g in gpus]}")
#     print("TF will use GPU for training.")
# else:
#     print("No GPU found — running on CPU.")

# # Reproducibility
# SEED = 42
# np.random.seed(SEED)
# tf.random.set_seed(SEED)

# # Paths
# PROJECT_ROOT = Path(__file__).resolve().parents[3]
# INPUT_PATH = PROJECT_ROOT / "data" / "cleaned" / "nrldc_cleaned.parquet"
# MODEL_DIR = PROJECT_ROOT / "data" / "model"
# LSTM_DIR = MODEL_DIR / "lstm"
# SAVED_MODEL = LSTM_DIR

# # Constants (match XGBoost script)
# BUFFER_LEN = 672
# HOLDOUT_MONTHS = 3
# VAL_MONTHS = 2

# HORIZONS = {
#     "24h": 96,
#     "48h": 192,
#     "72h": 288,
# }

# BACKTEST_CUTOFFS = 5

# # Model hyperparameters
# SEQ_LEN = 192
# BATCH_SIZE = 64
# MAX_EPOCHS = 150
# PATIENCE = 20
# MIN_EPOCHS = 30
# LSTM_UNITS_1 = 128
# LSTM_UNITS_2 = 64
# DROPOUT_RATE = 0.2


# # Custom EarlyStopping with min-epoch guard
# class MinEpochEarlyStopping(EarlyStopping):
#     def __init__(self, min_epochs: int, **kwargs):
#         super().__init__(**kwargs)
#         self.min_epochs = min_epochs

#     def on_epoch_end(self, epoch, logs=None):
#         if epoch < self.min_epochs:
#             return
#         super().on_epoch_end(epoch, logs)


# # Feature engineering
# def add_time_features(series: pd.Series) -> pd.DataFrame:
#     feat = pd.DataFrame({"load": series})
#     hour = series.index.hour + series.index.minute / 60
#     feat["hour_sin"] = np.sin(2 * np.pi * hour / 24)
#     feat["hour_cos"] = np.cos(2 * np.pi * hour / 24)
#     dow = series.index.dayofweek
#     feat["dow_sin"] = np.sin(2 * np.pi * dow / 7)
#     feat["dow_cos"] = np.cos(2 * np.pi * dow / 7)
#     month = series.index.month
#     feat["month_sin"] = np.sin(2 * np.pi * month / 12)
#     feat["month_cos"] = np.cos(2 * np.pi * month / 12)
#     return feat


# # Season-aware train/val/test split
# def make_split(df: pd.DataFrame):
#     test_cutoff = (df.index[-1] - pd.DateOffset(months=HOLDOUT_MONTHS)).replace(
#         day=1, hour=0, minute=0, second=0
#     )
#     val_cutoff = (test_cutoff - pd.DateOffset(months=VAL_MONTHS)).replace(
#         day=1, hour=0, minute=0, second=0
#     )
#     train_df = df[df.index < val_cutoff]
#     val_df = df[(df.index >= val_cutoff) & (df.index < test_cutoff)]
#     test_df = df[df.index >= test_cutoff]
#     return train_df, val_df, test_df, val_cutoff, test_cutoff


# # Sequence builder
# def build_sequences(feat_array: np.ndarray, seq_len: int, horizon: int):
#     X, y = [], []
#     for i in range(len(feat_array) - seq_len - horizon + 1):
#         X.append(feat_array[i : i + seq_len])
#         y.append(feat_array[i + seq_len : i + seq_len + horizon, 0])
#     return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


# # Model builder
# def build_lstm_model(seq_len: int, n_features: int, horizon: int) -> tf.keras.Model:
#     model = Sequential(
#         [
#             LSTM(
#                 LSTM_UNITS_1, input_shape=(seq_len, n_features), return_sequences=True
#             ),
#             Dropout(DROPOUT_RATE),
#             LSTM(LSTM_UNITS_2, return_sequences=False),
#             Dropout(DROPOUT_RATE),
#             Dense(horizon),
#         ]
#     )
#     model.compile(
#         optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
#         loss="mse",
#         metrics=["mae"],
#     )
#     return model


# # Metric helpers
# def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
#     mae = mean_absolute_error(y_true, y_pred)
#     rmse = np.sqrt(mean_squared_error(y_true, y_pred))
#     mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
#     return {
#         "mae": round(float(mae), 1),
#         "rmse": round(float(rmse), 1),
#         "mape": round(float(mape), 3),
#     }


# # Autoregressive forecast from a single cutoff
# def forecast_from(
#     cutoff_idx: int,
#     series: pd.Series,
#     feat_scaled: np.ndarray,
#     model: tf.keras.Model,
#     load_scaler: MinMaxScaler,
#     steps: int,
# ):
#     buf_start = cutoff_idx - SEQ_LEN
#     if buf_start < 0:
#         raise ValueError(f"cutoff_idx={cutoff_idx} too small for SEQ_LEN={SEQ_LEN}")

#     feat_buf = list(feat_scaled[buf_start:cutoff_idx])
#     cutoff_time = series.index[cutoff_idx - 1]
#     preds_scaled = []

#     for i in range(steps):
#         x = np.array(feat_buf[-SEQ_LEN:], dtype=np.float32).reshape(1, SEQ_LEN, -1)
#         p_scaled = float(model.predict(x, verbose=0)[0][0])
#         preds_scaled.append(p_scaled)

#         next_time = cutoff_time + pd.Timedelta(minutes=15 * (i + 1))
#         hour = next_time.hour + next_time.minute / 60
#         dow = next_time.dayofweek
#         month = next_time.month
#         next_row = np.array(
#             [
#                 p_scaled,
#                 np.sin(2 * np.pi * hour / 24),
#                 np.cos(2 * np.pi * hour / 24),
#                 np.sin(2 * np.pi * dow / 7),
#                 np.cos(2 * np.pi * dow / 7),
#                 np.sin(2 * np.pi * month / 12),
#                 np.cos(2 * np.pi * month / 12),
#             ],
#             dtype=np.float32,
#         )
#         feat_buf.append(next_row)

#     preds_mw = load_scaler.inverse_transform(
#         np.array(preds_scaled, dtype=np.float32).reshape(-1, 1)
#     ).flatten()

#     pred_index = pd.date_range(start=cutoff_time, periods=steps + 1, freq="15min")[1:]

#     end_idx = cutoff_idx + steps
#     if end_idx <= len(series):
#         actuals_mw = series.iloc[cutoff_idx:end_idx].values
#     else:
#         actuals_mw = np.array([])

#     return pred_index, preds_mw, actuals_mw


# # Multi-horizon backtest
# def run_horizon_backtest(
#     series: pd.Series,
#     feat_scaled: np.ndarray,
#     models: dict,
#     load_scaler: MinMaxScaler,
#     test_start_idx: int,
# ) -> dict:
#     print(f"\n[Backtest] {BACKTEST_CUTOFFS} non-overlapping cutoffs per horizon...")
#     horizon_metrics = {}

#     for label, steps in HORIZONS.items():
#         print(f"\n  -- {label} ({steps} steps) --")
#         model = models[label]

#         cutoffs = []
#         idx = test_start_idx
#         while idx + steps <= len(series) and len(cutoffs) < BACKTEST_CUTOFFS:
#             if idx >= SEQ_LEN:
#                 cutoffs.append(idx)
#             idx += steps

#         if not cutoffs:
#             print(f"  [WARN] Not enough test data for {label}. Skipping.")
#             horizon_metrics[label] = {"mae": None, "rmse": None, "mape": None}
#             continue

#         per_cutoff = []
#         for c, cidx in enumerate(cutoffs):
#             ts_label = series.index[cidx].strftime("%Y-%m-%d %H:%M")
#             try:
#                 _, preds, actuals = forecast_from(
#                     cidx, series, feat_scaled, model, load_scaler, steps
#                 )
#             except Exception as e:
#                 print(f"  [WARN] Cutoff {cidx} failed: {e}")
#                 continue

#             if len(actuals) == 0:
#                 continue

#             n = min(len(preds), len(actuals))
#             m = _metrics(actuals[:n], preds[:n])
#             per_cutoff.append(m)
#             print(
#                 f"    [{c+1}/{len(cutoffs)}] {ts_label}  MAE={m['mae']:,.0f} MW  MAPE={m['mape']:.2f}%"
#             )

#         if not per_cutoff:
#             horizon_metrics[label] = {"mae": None, "rmse": None, "mape": None}
#             continue

#         avg = {
#             "mae": round(float(np.mean([m["mae"] for m in per_cutoff])), 1),
#             "rmse": round(float(np.mean([m["rmse"] for m in per_cutoff])), 1),
#             "mape": round(float(np.mean([m["mape"] for m in per_cutoff])), 3),
#         }
#         print(f"  -------------------------------------")
#         print(f"  Avg MAE  : {avg['mae']:,.1f} MW")
#         print(f"  Avg RMSE : {avg['rmse']:,.1f} MW")
#         print(f"  Avg MAPE : {avg['mape']:.3f}%  <- real autoregressive {label}")
#         horizon_metrics[label] = avg

#     return horizon_metrics


# # Residual heatmap (7x24)
# def compute_residual_heatmap(
#     series: pd.Series,
#     feat_scaled: np.ndarray,
#     model_24h: tf.keras.Model,
#     load_scaler: MinMaxScaler,
#     test_start_idx: int,
# ) -> tuple:
#     print(f"\n[Heatmap] Building 7x24 residual heatmap from test set...")
#     HEATMAP_STEPS = HORIZONS["24h"]
#     CUTOFF_STEP = 192
#     steps = HEATMAP_STEPS

#     cutoffs = []
#     idx = test_start_idx
#     while idx + steps <= len(series):
#         if idx >= SEQ_LEN:
#             cutoffs.append(idx)
#         idx += CUTOFF_STEP

#     total = len(cutoffs)
#     print(f"  Cutoffs: {total}  (every {CUTOFF_STEP * 15 // 60}h across test set)")

#     bucket = [[[] for _ in range(24)] for _ in range(7)]

#     for c, cutoff_idx in enumerate(cutoffs):
#         ts_label = series.index[cutoff_idx].strftime("%Y-%m-%d %H:%M")
#         print(f"  [{c+1:3d}/{total}] {ts_label}", end="\r")
#         try:
#             pred_index, preds, actuals = forecast_from(
#                 cutoff_idx, series, feat_scaled, model_24h, load_scaler, steps
#             )
#             if len(actuals) == 0:
#                 continue
#             n = min(len(preds), len(actuals))
#             for i in range(n):
#                 actual = actuals[i]
#                 pred = preds[i]
#                 ts = pred_index[i]
#                 if actual == 0 or np.isnan(actual) or np.isnan(pred):
#                     continue
#                 ape = abs(actual - pred) / actual * 100
#                 dow = ts.dayofweek
#                 hour = ts.hour
#                 bucket[dow][hour].append(ape)
#         except Exception as e:
#             print(f"\n  [WARN] Cutoff {cutoff_idx} failed: {e}")
#             continue

#     print(f"\n  All cutoffs done. Building matrix...")
#     matrix = []
#     for dow in range(7):
#         row = []
#         for hour in range(24):
#             vals = bucket[dow][hour]
#             row.append(round(float(np.mean(vals)), 3) if vals else 0.0)
#         matrix.append(row)

#     flat_list = [matrix[d][h] for d in range(7) for h in range(24)]
#     print(f"  APE range : {min(flat_list):.2f}% - {max(flat_list):.2f}%")
#     print(f"  Mean APE  : {np.mean(flat_list):.2f}%")

#     days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
#     slots = [(matrix[d][h], d, h) for d in range(7) for h in range(24)]
#     slots.sort(reverse=True)
#     print("  Worst 3 slots:")
#     for ape, d, h in slots[:3]:
#         print(f"    {days[d]} {h:02d}:00  ->  {ape:.2f}%")

#     return matrix, flat_list


# # ─────────────────────────────────────────────────────────────────────────────
# # MAIN
# # ─────────────────────────────────────────────────────────────────────────────
# if __name__ == "__main__":
#     run_start = datetime.now()

#     print("=" * 60)
#     print("NRLDC LSTM -- Train & Save  (Colab GPU edition)")
#     print("=" * 60)

#     # 1. Load
#     print(f"\n[1/7] Loading: {INPUT_PATH}")
#     df = pd.read_parquet(INPUT_PATH)
#     df.columns = ["load"]
#     df = df.sort_index()
#     print(f"  Rows : {len(df):,}")
#     print(f"  Range: {df.index[0]}  ->  {df.index[-1]}")

#     #  2. Split
#     print(f"\n[2/7] Season-aware split  (test={HOLDOUT_MONTHS}m, val={VAL_MONTHS}m)")
#     train_df, val_df, test_df, val_cutoff, test_cutoff = make_split(df)
#     print(
#         f"  Train: {train_df.index[0].date()} -> {train_df.index[-1].date()}  ({len(train_df):,} rows)"
#     )
#     print(
#         f"  Val  : {val_df.index[0].date()}  -> {val_df.index[-1].date()}   ({len(val_df):,} rows)"
#     )
#     print(
#         f"  Test : {test_df.index[0].date()}  -> {test_df.index[-1].date()}   ({len(test_df):,} rows)"
#     )

#     train_months = set(train_df.index.month)
#     test_months = set(test_df.index.month)
#     unseen = test_months - train_months
#     if unseen:
#         print(f"  [WARN] Months in test not seen in training: {unseen}")
#     else:
#         print("  All test months seen in training. OK")

#     val_start_month = val_df.index[0].month
#     val_end_month = val_df.index[-1].month
#     if any(m in range(5, 9) for m in range(val_start_month, val_end_month + 1)):
#         print(
#             "  [WARN] Val window overlaps with peak summer months -- val_loss may be noisy."
#         )
#     else:
#         print("  Val window looks gap-free. OK")

#     # 3. Feature engineering + Scaling
#     print(f"\n[3/7] Features + scaling (fit on train only)...")
#     full_feat = add_time_features(df["load"])
#     N_FEATURES = full_feat.shape[1]
#     FEATURE_COLS = list(full_feat.columns)
#     print(f"  Features ({N_FEATURES}): {FEATURE_COLS}")

#     load_scaler = MinMaxScaler(feature_range=(0, 1))
#     load_scaler.fit(train_df[["load"]])
#     print(
#         f"  Scaler range: {load_scaler.data_min_[0]:.0f} - {load_scaler.data_max_[0]:.0f} MW"
#     )

#     full_feat_scaled = full_feat.copy()
#     full_feat_scaled["load"] = load_scaler.transform(full_feat[["load"]])
#     feat_array = full_feat_scaled.values.astype(np.float32)

#     train_len = len(train_df)
#     val_len = len(val_df)
#     val_start_idx = train_len
#     val_end_idx = train_len + val_len
#     test_start_idx = val_end_idx

#     # 4. Train one model per horizon
#     print(f"\n[4/7] Training LSTM -- one model per horizon...")
#     os.makedirs(SAVED_MODEL, exist_ok=True)
#     os.makedirs(LSTM_DIR, exist_ok=True)

#     trained_models = {}
#     training_log = {}

#     for horizon_name, horizon_steps in HORIZONS.items():
#         print(f"\n{'='*55}")
#         print(
#             f"  HORIZON: {horizon_name}  ({horizon_steps} steps = {horizon_steps*15//60}h)"
#         )
#         print(f"{'='*55}")

#         train_array = feat_array[:val_start_idx]
#         X_train, y_train = build_sequences(train_array, SEQ_LEN, horizon_steps)

#         val_array = feat_array[val_start_idx - SEQ_LEN : val_end_idx]
#         X_val, y_val = build_sequences(val_array, SEQ_LEN, horizon_steps)

#         print(f"  Train sequences : {X_train.shape}")
#         print(f"  Val   sequences : {X_val.shape}")

#         model = build_lstm_model(SEQ_LEN, N_FEATURES, horizon_steps)
#         model.summary(line_length=60, print_fn=lambda x: print(f"    {x}"))

#         ckpt_path = str(SAVED_MODEL / f"best_{horizon_name}.weights.h5")

#         callbacks = [
#             MinEpochEarlyStopping(
#                 min_epochs=MIN_EPOCHS,
#                 monitor="val_loss",
#                 patience=PATIENCE,
#                 restore_best_weights=True,
#                 verbose=1,
#             ),
#             ReduceLROnPlateau(
#                 monitor="val_loss",
#                 factor=0.5,
#                 patience=8,
#                 min_lr=1e-6,
#                 verbose=1,
#             ),
#             ModelCheckpoint(
#                 filepath=ckpt_path,
#                 monitor="val_loss",
#                 save_best_only=True,
#                 save_weights_only=True,
#                 verbose=0,
#             ),
#         ]

#         t0 = time.time()
#         history = model.fit(
#             X_train,
#             y_train,
#             epochs=MAX_EPOCHS,
#             batch_size=BATCH_SIZE,
#             validation_data=(X_val, y_val),
#             callbacks=callbacks,
#             verbose=1,
#         )
#         elapsed = time.time() - t0

#         best_epoch = int(np.argmin(history.history["val_loss"])) + 1
#         best_val = float(min(history.history["val_loss"]))
#         total_epochs = len(history.history["loss"])

#         print(f"\n  Best epoch  : {best_epoch} / {total_epochs}")
#         print(f"  Best val MSE: {best_val:.6f}")
#         print(f"  Train time  : {elapsed:.0f}s")

#         if best_epoch < 10:
#             print("  [WARN] Best epoch still low -- check val window for data gaps.")

#         save_path = str(SAVED_MODEL / f"{horizon_name}.keras")
#         model.save(save_path)
#         print(f"  Saved -> {save_path}")

#         trained_models[horizon_name] = model
#         training_log[horizon_name] = {
#             "best_epoch": best_epoch,
#             "total_epochs": total_epochs,
#             "best_val_mse": round(best_val, 6),
#             "train_time_s": round(elapsed, 1),
#         }

#     # 5. Multi-horizon backtest
#     print(
#         f"\n[5/7] Multi-horizon autoregressive backtest ({BACKTEST_CUTOFFS} windows)..."
#     )
#     series = df["load"]
#     horizon_metrics = run_horizon_backtest(
#         series, feat_array, trained_models, load_scaler, test_start_idx
#     )

#     # 6. Residual heatmap
#     print(f"\n[6/7] Residual heatmap (24h model across full test set)...")
#     heatmap_matrix, heatmap_flat = compute_residual_heatmap(
#         series, feat_array, trained_models["24h"], load_scaler, test_start_idx
#     )

#     # 7. Save buffer.json
#     print(f"\n[7/7] Saving buffer.json...")

#     buffer_payload = {
#         "trained_at": run_start.isoformat(),
#         "data_end": str(df.index[-1]),
#         "buffer_len": BUFFER_LEN,
#         "feature_cols": FEATURE_COLS,
#         "model_type": "lstm",
#         "seq_len": SEQ_LEN,
#         "n_features": N_FEATURES,
#         "horizons": HORIZONS,
#         "load_scaler": {
#             "data_min": float(load_scaler.data_min_[0]),
#             "data_max": float(load_scaler.data_max_[0]),
#             "scale": float(load_scaler.scale_[0]),
#             "min": float(load_scaler.min_[0]),
#         },
#         "horizon_metrics": horizon_metrics,
#         "training_log": training_log,
#         "buffer": df["load"].values[-BUFFER_LEN:].tolist(),
#         "heatmap_matrix": heatmap_matrix,
#         "heatmap_flat": heatmap_flat,
#         "heatmap_info": {
#             "rows": "day_of_week (0=Mon ... 6=Sun)",
#             "cols": "hour_of_day (0-23)",
#             "values": "mean absolute percentage error % (24h autoregressive vs actuals)",
#             "model": "lstm",
#             "cutoff_step": "192 steps = every 2 days",
#         },
#     }

#     buffer_out = LSTM_DIR / "buffer.json"
#     with open(buffer_out, "w") as f:
#         json.dump(buffer_payload, f, indent=2)

#     print(f"  Saved -> data/model/lstm/buffer.json")
#     print(f"    -> {BUFFER_LEN} raw load values  ({BUFFER_LEN * 15 // 60}h history)")
#     print(f"    -> scaler params for deployment")
#     print(f"    -> 7x24 real residual heatmap")
#     print(f"    -> horizon_metrics: 24h / 48h / 72h autoregressive backtest")
#     print(f"    -> training_log: epochs, val_mse, train time per horizon")

#     print(f"\n  Saved models -> data/model/lstm/")
#     for h in HORIZONS:
#         print(f"    -> {h}.keras")

#     # Final comparison
#     duration = (datetime.now() - run_start).seconds
#     XGB_MAPE = {"24h": 1.69, "48h": 2.11, "72h": 2.74}

#     print(f"\n{'='*60}")
#     print(f"NRLDC LSTM -- Complete in {duration}s")
#     print(f"{'='*60}")
#     print(
#         f"{'Horizon':<10} {'LSTM MAPE':>12} {'XGB MAPE':>12} {'Delta':>10} {'Winner':>12}"
#     )
#     print("-" * 60)
#     for h, m in horizon_metrics.items():
#         if m["mape"] is None:
#             print(f"{h:<10} {'N/A':>12}")
#             continue
#         xmape = XGB_MAPE[h]
#         lmape = m["mape"]
#         delta = lmape - xmape
#         sign = "+" if delta > 0 else ""
#         winner = "LSTM" if lmape < xmape else "XGBoost"
#         print(
#             f"{h:<10} {lmape:>11.3f}% {xmape:>11.2f}% {sign+str(round(delta,2))+'%':>10} {winner:>12}"
#         )

#     print(f"\n  Heatmap range : {min(heatmap_flat):.2f}% - {max(heatmap_flat):.2f}%")
#     print(f"\n  Next step     : python src/api/app.py")
#     print(f"{'='*60}")
