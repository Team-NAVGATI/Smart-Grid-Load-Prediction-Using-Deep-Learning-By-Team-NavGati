"""
NRLDC Intra-Day Forecast — Ingestion / Extraction
--------------------------------------------------
Scans:   data/raw/<YYYY>/<Month>/nr_forecast_report_DD-MM-YYYY.xlsx
Outputs: data/extracted/nrldc_extracted.csv

Usage:
    python src/ingestion/test.py
"""

import os
import glob
import re
import pandas as pd
from datetime import datetime

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT_DIR     = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOWNLOAD_DIR = os.path.join(ROOT_DIR, "data", "raw")
OUTPUT_DIR   = os.path.join(ROOT_DIR, "data", "extracted")
OUTPUT_FILE  = os.path.join(OUTPUT_DIR, "nrldc_extracted.csv")

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_date_from_filename(file_path: str) -> pd.Timestamp:
    """
    Pull the date from filenames like:
        nr_forecast_report_01-01-2026.xlsx  →  2026-01-01
        nr_forecast_report_22_04_2025.xlsx  →  2025-04-22  (underscore variant)
    """
    match = re.search(r"(\d{2})[_-](\d{2})[_-](\d{4})", os.path.basename(file_path))
    if not match:
        raise ValueError(f"Date not found in filename: {os.path.basename(file_path)}")
    date_str = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    return pd.to_datetime(date_str, format="%d-%m-%Y")


def extract_nrldc_data(file_path: str) -> pd.DataFrame:
    """
    Read one NRLDC forecast Excel file and return a tidy DataFrame with columns:
        date | timestamp | actual_demand_mw
    """
    df = pd.read_excel(file_path, header=None)

    # Row 3 (0-indexed) contains the real column headers
    df.columns = df.iloc[3]
    df = df.iloc[4:].reset_index(drop=True)

    # Columns of interest: Period (col 1) and MW/Actual Demand (col 4)
    df = df.iloc[:, [1, 4]].copy()
    df.columns = ["timestamp", "actual_demand_mw"]

    df["actual_demand_mw"] = pd.to_numeric(df["actual_demand_mw"], errors="coerce")
    df["date"] = extract_date_from_filename(file_path)

    # Drop non-data rows: "Period" footer, blank rows, repeated headers, etc.
    # Any genuine data row always has a numeric actual_demand_mw value.
    df = df.dropna(subset=["actual_demand_mw"])

    return df[["date", "timestamp", "actual_demand_mw"]]


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    pattern = os.path.join(DOWNLOAD_DIR, "**", "**", "*.xlsx")
    all_files = sorted(glob.glob(pattern))
    total = len(all_files)

    if not total:
        print(f"[WARN]  No .xlsx files found under: {DOWNLOAD_DIR}")
        return

    print(f"Scanning  {total} file(s)  →  {os.path.relpath(OUTPUT_FILE, ROOT_DIR)}")

    df_list  = []
    skipped  = 0
    warnings = []

    for idx, file_path in enumerate(all_files, start=1):
        # Overwrite the same line with a live counter
        print(f"  Processing... {idx}/{total}", end="\r", flush=True)
        try:
            df = extract_nrldc_data(file_path)
            df_list.append(df)
        except Exception as e:
            skipped += 1
            warnings.append(f"  [WARN]  {os.path.relpath(file_path, ROOT_DIR)}  — {e}")

    # Clear the progress line
    print(" " * 40, end="\r")

    if warnings:
        print("\n".join(warnings))

    if not df_list:
        print("[ERR]   No files could be processed. Aborting.")
        return

    final_df = (
        pd.concat(df_list, ignore_index=True)
        .sort_values(["date", "timestamp"])
        .reset_index(drop=True)
    )

    final_df.to_csv(OUTPUT_FILE, index=False)

    succeeded = total - skipped
    date_range = f"{final_df['date'].min().date()}  →  {final_df['date'].max().date()}"

    print(f"\n{'─' * 50}")
    print(f"  Processed : {succeeded}/{total} file(s)"
          + (f"  ({skipped} skipped)" if skipped else ""))
    print(f"  Rows      : {len(final_df):,}")
    print(f"  Date span : {date_range}")
    print(f"  Output    : data/extracted/nrldc_extracted.csv")
    print(f"{'─' * 50}")


if __name__ == "__main__":
    main()
