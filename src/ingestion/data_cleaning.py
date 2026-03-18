"""
NRLDC Data Cleaning
--------------------
Reads : data/extracted/nrldc_extracted.parquet
         (columns: date, timestamp, actual_demand_mw)

Outputs: data/cleaned/nrldc_cleaned.parquet
         (index: datetime 15-min, column: actual_demand_mw)

Detection logic (physically grounded for NRLDC grid):
  1. Step-change spikes  — |diff| > 5000 MW in one 15-min step
  2. Absolute range      — load < 25,000 MW  or  > 95,000 MW
  Both types are nulled and repaired via linear time-interpolation.
  Neighbours of large spikes (>10,000 MW) are also nulled to catch
  the "recovery" step that accompanies a spike.

No version suffixes — always overwrites the same output file.

Usage:
    python src/ingestion/data_cleaning.py
"""

import os
from pathlib import Path

import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_PATH = PROJECT_ROOT / "data" / "extracted" / "nrldc_extracted.parquet"
OUTPUT_DIR = PROJECT_ROOT / "data" / "cleaned"
OUTPUT_PATH = OUTPUT_DIR / "nrldc_cleaned.parquet"

# ── Physical constants for NRLDC North Region ─────────────────────────────────
STEP_THRESHOLD = 5_000  # MW — impossible to change this fast in 15 min
LOW_BOUND = 25_000  # MW — grid never goes below this
HIGH_BOUND = 95_000  # MW — grid never goes above this
LARGE_SPIKE = 10_000  # MW — for these, null neighbours too


# ── Step 1: Load & build datetime index ───────────────────────────────────────
def load_dataset(path):
    """
    Reads the extracted parquet (date + timestamp + actual_demand_mw)
    and returns a datetime-indexed single-column DataFrame.
    """
    df = pd.read_parquet(path, engine="pyarrow")

    df["datetime"] = pd.to_datetime(
        df["date"].astype(str) + " " + df["timestamp"].str.split(" - ").str[0]
    )
    df = df.set_index("datetime").drop(columns=["date", "timestamp"]).sort_index()

    # Drop any duplicate timestamps — keep last (most recently scraped wins)
    dupes = df.index.duplicated(keep="last").sum()
    if dupes:
        print(f"  [INFO] Removed {dupes} duplicate timestamps")
        df = df[~df.index.duplicated(keep="last")]

    return df


# ── Step 2: Detect bad points ─────────────────────────────────────────────────
def detect_bad_points(series):
    """
    Returns a boolean mask of bad timestamps using two physical rules:
      Rule 1 — step-change: |diff| > STEP_THRESHOLD in one 15-min step
      Rule 2 — absolute range: value outside [LOW_BOUND, HIGH_BOUND]

    For large spikes (>LARGE_SPIKE), also flags the immediate neighbours
    to catch the recovery step.
    """
    diff = series.diff().abs()

    step_mask = diff > STEP_THRESHOLD
    range_mask = (series < LOW_BOUND) | (series > HIGH_BOUND)
    base_mask = step_mask | range_mask

    # Expand neighbours only for very large spikes
    large_mask = diff > LARGE_SPIKE
    expanded = (
        large_mask
        | large_mask.shift(1).fillna(False)
        | large_mask.shift(-1).fillna(False)
    )

    final_mask = base_mask | expanded

    return (
        final_mask,
        step_mask.sum(),
        range_mask.sum(),
        expanded.sum() - large_mask.sum(),
    )


# ── Step 3: Repair via interpolation ─────────────────────────────────────────
def repair(df, bad_mask):
    """
    Nulls all flagged points then repairs with linear time-interpolation.
    Returns cleaned DataFrame and count of points that couldn't be filled.
    """
    df_clean = df.copy()
    df_clean.loc[bad_mask, "actual_demand_mw"] = np.nan

    df_clean["actual_demand_mw"] = df_clean["actual_demand_mw"].interpolate(
        method="time"
    )

    remaining_nulls = df_clean["actual_demand_mw"].isna().sum()
    return df_clean, remaining_nulls


# ── Step 4: Verify nothing bad remains ───────────────────────────────────────
def verify(df_clean):
    """
    Re-runs detection on cleaned data. Prints a warning if anything remains.
    Should always be zero after interpolation unless there are edge-of-series gaps.
    """
    diff = df_clean["actual_demand_mw"].diff().abs()
    still_step = (diff > STEP_THRESHOLD).sum()
    still_range = (
        (df_clean["actual_demand_mw"] < LOW_BOUND)
        | (df_clean["actual_demand_mw"] > HIGH_BOUND)
    ).sum()

    if still_step == 0 and still_range == 0:
        print("  [OK]  No bad points remain after cleaning.")
    else:
        print(
            f"  [WARN] Still has {still_step} step-spikes and {still_range} out-of-range values."
        )
        print("         These are likely at series edges — inspect manually.")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("NRLDC Data Cleaning")
    print("=" * 55)

    # Load
    print(f"\n[1/4] Loading: {INPUT_PATH.relative_to(PROJECT_ROOT)}")
    df = load_dataset(INPUT_PATH)
    print(f"      Rows : {len(df):,}")
    print(f"      Range: {df.index[0]}  →  {df.index[-1]}")
    print(
        f"      MW   : min={df['actual_demand_mw'].min():,.0f}  "
        f"max={df['actual_demand_mw'].max():,.0f}"
    )

    # Detect
    print(f"\n[2/4] Detecting bad points...")
    bad_mask, n_step, n_range, n_neighbours = detect_bad_points(df["actual_demand_mw"])
    print(f"      Step-change spikes (>{STEP_THRESHOLD:,} MW) : {n_step}")
    print(f"      Out-of-range values                        : {n_range}")
    print(f"      Neighbour expansions (large spikes)        : {n_neighbours}")
    print(f"      Total flagged                              : {bad_mask.sum()}")

    # Repair
    print(f"\n[3/4] Repairing via linear interpolation...")
    df_clean, remaining_nulls = repair(df, bad_mask)
    repaired = bad_mask.sum() - remaining_nulls
    print(f"      Repaired : {repaired}")
    if remaining_nulls:
        print(f"      Could not fill: {remaining_nulls} (edge-of-series gaps)")

    # Verify
    print(f"\n[4/4] Verifying...")
    verify(df_clean)

    # Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    df_clean.to_parquet(OUTPUT_PATH, engine="pyarrow", index=True)
    print(f"\n      Saved: data/cleaned/nrldc_cleaned.parquet")
    print(f"      Final rows : {len(df_clean):,}")
    print(
        f"      Final MW   : min={df_clean['actual_demand_mw'].min():,.0f}  "
        f"max={df_clean['actual_demand_mw'].max():,.0f}"
    )

    print("\n" + "=" * 55)
    print("Cleaning complete.")
    print("=" * 55)
