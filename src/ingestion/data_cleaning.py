import pandas as pd
import numpy as np
import os
from pathlib import Path


# Get project root directory (2 levels up from this file)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def load_dataset(file_path):
    df = pd.read_csv(file_path)

    df['datetime'] = pd.to_datetime(
        df['date'].astype(str) + ' ' + df['timestamp'].str.split(' - ').str[0]
    )

    df = df.set_index('datetime').drop(columns=['date', 'timestamp'])
    df = df.sort_index()

    return df


def remove_noise(df):
    rolling_med = df['actual_demand_mw'].rolling(
        96, center=True, min_periods=1
    ).median()

    ratio = df['actual_demand_mw'] / rolling_med

    extreme_count = (ratio > 80).sum()
    moderate_count = ((ratio > 1.8) & (ratio <= 80)).sum()
    negative_count = (df['actual_demand_mw'] < 0).sum()

    # extreme corruption
    df.loc[ratio > 80, 'actual_demand_mw'] /= 100

    # moderate corruption
    df.loc[(ratio > 1.8) & (ratio <= 80), 'actual_demand_mw'] /= 2

    # negative values
    df.loc[df['actual_demand_mw'] < 0, 'actual_demand_mw'] = np.nan

    return df, extreme_count, moderate_count, negative_count


if __name__ == "__main__":
    print("=====NRLDC data cleaning started=====\n")

    file_path = PROJECT_ROOT / 'data' / 'extracted' / 'nrldc_extracted.csv'

    df = load_dataset(file_path)
    print(f"[INFO] Rows: {len(df)} | Range: {df.index.min()} -> {df.index.max()}")

    df_cleaned, extreme_count, moderate_count, negative_count = remove_noise(df)
    print(
        "[INFO] Fixes: "
        f"extreme={extreme_count}, moderate={moderate_count}, negative_to_nan={negative_count}"
    )

    mkdir_p = PROJECT_ROOT / 'data' / 'cleaned'
    os.makedirs(mkdir_p, exist_ok=True)

    output_path = PROJECT_ROOT / 'data' / 'cleaned' / 'nrldc_cleaned.csv'
    df_cleaned.to_csv(output_path)

    print(f"[INFO] Saved: data/cleaned/nrldc_cleaned.csv | Final rows: {len(df_cleaned)}")
    print("\n=====Data cleaning completed=====")