# GridCast — Smart Grid Load Prediction (Team NavGati)

Production-oriented electricity load forecasting system for smart grids using a **data pipeline + XGBoost model + Flask API + dashboard frontend**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [What This Repository Delivers](#what-this-repository-delivers)
4. [Repository Architecture](#repository-architecture)
5. [System Flow (Mermaid)](#system-flow-mermaid)
6. [Tech Stack](#tech-stack)
7. [Data Sources and Data Contracts](#data-sources-and-data-contracts)
8. [Detailed Module and Function Reference](#detailed-module-and-function-reference)
   - [Scraper (`src/scrapping/scrap_excel.py`)](#1-scraper-srcscrappingscrap_excelpy)
   - [Merger (`src/ingestion/data_merger.py`)](#2-merger-srcingestiondata_mergerpy)
   - [Cleaner (`src/ingestion/data_cleaning.py`)](#3-cleaner-srcingestiondata_cleaningpy)
   - [Training (`src/pipeline/train_and_save.py`)](#4-training-srcpipelinetrain_and_savepy)
   - [API (`src/api/app.py`)](#5-api-srcapiapppy)
   - [Frontend (`src/Frontend/dashboard.html`)](#6-frontend-srcfrontenddashboardhtml)
9. [Runbook (End-to-End)](#runbook-end-to-end)
10. [API Contract](#api-contract)
11. [Modeling Strategy and Metrics](#modeling-strategy-and-metrics)
12. [Observability and Logs](#observability-and-logs)
13. [Research and Design Synthesis](#research-and-design-synthesis)
14. [External Research Notes (Web + Context7)](#external-research-notes-web--context7)
15. [Known Constraints](#known-constraints)
16. [Roadmap](#roadmap)
17. [References](#references)

---

## Project Overview

This project builds an AI-assisted forecasting workflow for **short-term electricity demand prediction** in a smart-grid setting (NRLDC-focused workflow in current implementation). It provides:

- Automated historical forecast-file collection from NRLDC web portal
- Structured extraction and cleaning pipeline for 15-minute demand series
- Feature-engineered XGBoost training with seasonal holdout validation
- Precomputed residual heatmap for operational reliability analysis
- Flask API serving 24-hour (96-step) forecasts
- Dashboard UI for operations teams to view forecast, KPIs, and residual patterns

The system is designed as a practical bridge between research-grade forecasting and operations-grade deployment patterns.

---

## Problem Statement

Modern grids must continuously balance supply and demand under volatility from:

- Intraday consumption pattern shifts
- Renewable generation variability
- Operational constraints during peak windows
- Data quality issues (spikes, missingness, inconsistent records)

Static or weak forecasting increases risk of:

- Dispatch inefficiency
- Higher operating cost
- Peak handling stress
- Reduced resilience and reliability

This repository addresses that gap with a reproducible ML pipeline and lightweight serving layer.

---

## What This Repository Delivers

- **Forecast horizon:** 24 hours ahead at 15-minute granularity (`96` steps)
- **Model family:** XGBoost (season-aware split, autoregressive inference)
- **Data cadence:** 15-minute load points
- **Pipeline stages:** scrape → extract/merge → clean → train → serve → visualize
- **Model artifacting:** `joblib` model + JSON metadata/buffer
- **Operational diagnostics:** residual heatmap over day-of-week × hour-of-day

---

## Repository Architecture

```text
requirements.txt
README.md

data/
  raw/                # downloaded NRLDC files by year/month
  extracted/          # merged extracted parquet
  cleaned/            # cleaned parquet used for training
  model/
    xgboost_model.joblib
    buffer.json

docs/
  research.md
  system_design.md
  synopsis/
    Synopsis Report-NavGati Updated.pdf

logs/
  scrap_excel.log
  data_merger.log

notebooks/
  01_eda.ipynb
  02_Baseline_model.ipynb

src/
  scrapping/
    scrap_excel.py
  ingestion/
    data_merger.py
    data_cleaning.py
  pipeline/
    train_and_save.py
  api/
    app.py
  Frontend/
    dashboard.html
```

---

## System Flow (Mermaid)

### 1) End-to-End Pipeline

```mermaid
flowchart TD
    A[NRLDC Portal] --> B[scrap_excel.py\nDownload monthly files]
    B --> C[data/raw]
    C --> D[data_merger.py\nExtract + normalize rows]
    D --> E[data/extracted/nrldc_extracted.parquet]
    E --> F[data_cleaning.py\nSpike/range detection + interpolation]
    F --> G[data/cleaned/nrldc_cleaned.parquet]
    G --> H[train_and_save.py\nFeature engineering + XGBoost]
    H --> I[data/model/xgboost_model.joblib]
    H --> J[data/model/buffer.json]
    I --> K[app.py\nFlask inference service]
    J --> K
    K --> L[dashboard.html\nForecast + KPIs + heatmap]
```

### 2) Forecast Serving Sequence

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as Flask API
    participant M as xgboost_model.joblib
    participant B as buffer.json

    UI->>API: GET /health
    API-->>UI: model metadata + metrics

    UI->>API: GET /forecast
    API->>B: Load latest buffer in memory
    API->>M: Autoregressive step prediction (96x)
    API-->>UI: forecast array [{datetime, load_mw}]

    UI->>API: GET /residuals
    API-->>UI: heatmap_matrix (7x24 APE)
```

### 3) Data Quality Logic

```mermaid
flowchart LR
    X[Raw extracted demand series] --> Y{Rule checks}
    Y --> Y1[Step-change > 5000 MW]
    Y --> Y2[Outside 25000-95000 MW]
    Y --> Y3[Neighbor expansion for >10000 MW spikes]
    Y1 --> Z[Flag as NaN]
    Y2 --> Z
    Y3 --> Z
    Z --> W[Time interpolation]
    W --> V[Verified cleaned series]
```

---

## Tech Stack

- **Language:** Python 3.x, JavaScript, HTML/CSS
- **Data:** pandas, pyarrow, fastparquet
- **ML:** xgboost, scikit-learn, numpy, joblib
- **API:** Flask, Flask-CORS
- **Automation:** selenium, webdriver-manager
- **Notebook analysis:** Jupyter notebooks under `notebooks/`

---

## Data Sources and Data Contracts

### Primary operational source

- **NRLDC intraday forecast portal** (`https://nrldc.in/forecast/intra-day-forecast`)
- Downloaded files are grouped as `data/raw/<year>/<month>/...xlsx`

### Research-aligned public benchmark source

- **UCI ElectricityLoadDiagrams20112014** (15-minute consumption benchmark dataset)

### Internal data contracts across pipeline

1. **Extracted parquet** (`data/extracted/nrldc_extracted.parquet`)
   - columns: `date`, `timestamp`, `actual_demand_mw`
2. **Cleaned parquet** (`data/cleaned/nrldc_cleaned.parquet`)
   - datetime index
   - column: `actual_demand_mw`
3. **Model metadata** (`data/model/buffer.json`)
   - `feature_cols`, `test_metrics`, rolling `buffer`, residual heatmap artifacts

---

## Detailed Module and Function Reference

## 1) Scraper (`src/scrapping/scrap_excel.py`)

### Purpose
Automates NRLDC SPA navigation, iterates year/month folders, downloads files with pagination, and logs run summary.

### Key constants

- `BASE_URL`: target portal
- `BASE_DOWNLOAD_DIR`: local raw-data root
- `TABLE_ID`: DataTable id (`operationsTable`)
- `MONTH_MAP`: month name to integer mapping
- Runtime counters: `_total_files_downloaded`, `_total_files_checked`, `_total_files_skipped`

### Function-by-function details

| Function | Inputs | Returns | What it does | Why it matters |
|---|---|---|---|---|
| `get_driver(download_dir)` | download directory | configured `webdriver.Chrome` | Creates Chrome driver with download prefs and stability flags | Ensures unattended, deterministic downloads |
| `set_download_dir(driver, directory)` | driver, target dir | None | Switches active browser download path via CDP | Supports year/month folder routing |
| `wait_for_downloads(directory, timeout=90)` | folder, timeout | bool | Waits until `.crdownload`/`.tmp` files disappear | Prevents partial-file processing |
| `count_files(directory)` | folder path | int | Counts files in directory | Utility for summary checks |
| `get_existing_files(directory)` | folder path | `set[str]` | Snapshot of existing filenames | Enables skip/new download calculation |
| `wait_table_loaded(wait)` | `WebDriverWait` | None | Waits for DataTable processing spinner to clear | Reduces race conditions with SPA updates |
| `click_btn(driver, el)` | driver, element | None | Scrolls into view + JS click | Improves click reliability in dynamic UI |
| `get_folder_buttons(driver)` | driver | element list | Returns sidebar folder buttons | Base primitive for year/month traversal |
| `find_btn_by_fid(driver, fid)` | driver, folder id | element or None | Finds folder button by `data-folderid` | Stable selector in changing DOM layouts |
| `table_has_no_data(driver)` | driver | bool | Detects “no data/no record” table states | Avoids empty-page download loops |
| `try_set_50_rows(driver)` | driver | bool | Sets DataTable page size to 50 using robust selectors | Reduces pagination overhead |
| `get_download_links(driver)` | driver | `(links, strategy)` | Finds file download anchors using icon/href fallbacks | Handles icon or link-type differences |
| `_find_link_by_href(driver, href, timeout=4)` | driver, href | element or None | Re-locates an anchor after table re-render | Mitigates stale element references |
| `click_download_links(driver, links, existing_files)` | driver, link elements, file set | bool | Bulk-clicks links using re-query + JS fallback | Maximizes download success on dynamic pages |
| `month_is_future(year, month_name)` | year, month text | bool | Filters out future months relative to current date | Prevents invalid scraping targets |
| `open_year(driver, wait, year_fid)` | driver, wait, year folder id | bool | Fresh page load then opens a year accordion | Maintains clean state per year |

### Script-level runtime flow (top-level block)

- Initializes logger and webdriver
- Discovers available year folders
- Iterates years → months (with future-month filter)
- Downloads each page’s files and paginates until exhaustion
- Writes aggregated run summary to `logs/scrap_excel.log`
- Exits non-zero on fatal failure (`sys.exit(1)`)

---

## 2) Merger (`src/ingestion/data_merger.py`)

### Purpose
Parses raw Excel files into a single normalized parquet file for downstream cleaning and model training.

### Function-by-function details

| Function | Inputs | Returns | What it does |
|---|---|---|---|
| `extract_date_from_filename(file_path)` | file path | `pd.Timestamp` | Extracts date token from filename patterns `DD-MM-YYYY` / `DD_MM_YYYY` |
| `extract_nrldc_data(file_path)` | file path | `pd.DataFrame` | Reads one Excel file, fixes headers, selects useful columns, numeric-casts demand, drops non-data rows |
| `main()` | none | None | Scans all `.xlsx` recursively, processes each file, concatenates, de-duplicates, sorts, saves to parquet |

### Output contract

- Writes `data/extracted/nrldc_extracted.parquet`
- Final columns: `date`, `timestamp`, `actual_demand_mw`

---

## 3) Cleaner (`src/ingestion/data_cleaning.py`)

### Purpose
Applies physically grounded anomaly detection and interpolation repair to demand time series.

### Domain thresholds used

- `STEP_THRESHOLD = 5000` MW (15-min step-change)
- `LOW_BOUND = 25000` MW
- `HIGH_BOUND = 95000` MW
- `LARGE_SPIKE = 10000` MW (neighbor-expansion trigger)

### Function-by-function details

| Function | Inputs | Returns | What it does |
|---|---|---|---|
| `load_dataset(path)` | parquet path | DataFrame (datetime index) | Creates datetime index from `date + timestamp`, sorts, deduplicates index |
| `detect_bad_points(series)` | load series | `(mask, n_step, n_range, n_neighbour)` | Flags impossible jumps/range breaches and expands neighbors for large spikes |
| `repair(df, bad_mask)` | dataframe, bool mask | `(clean_df, remaining_nulls)` | Nulls flagged points and fills with time interpolation |
| `verify(df_clean)` | cleaned dataframe | None | Re-runs checks and prints post-clean status |

### Script behavior

- Loads extracted parquet
- Detects anomalies
- Repairs series
- Verifies residual anomalies
- Saves cleaned output to `data/cleaned/nrldc_cleaned.parquet`

---

## 4) Training (`src/pipeline/train_and_save.py`)

### Purpose
Builds model-ready features, performs season-aware split, trains XGBoost, evaluates, computes residual heatmap, and persists artifacts.

### Key constants

- `BUFFER_LEN = 672` (1 week of 15-min history)
- `STEPS = 96` (24-hour horizon)
- `HOLDOUT_MONTHS = 3`

### Function-by-function details

| Function | Inputs | Returns | What it does |
|---|---|---|---|
| `add_features(df_part, full_series)` | partition df, full target series | engineered df | Adds lag features, rolling statistics, and calendar features |
| `make_split(df)` | full df | `(train_mask, test_mask, cutoff)` | Time/season-aware split with last 3 months as holdout |
| `evaluate(y_true, y_pred, label='')` | true and predicted arrays | metrics dict | Computes MAE, RMSE, MAPE |
| `forecast_from(cutoff_idx, series, model, feature_cols)` | cutoff index, series, model, feature order | `(pred_index, preds, actuals)` | 96-step autoregressive forecasting loop from a single cutoff |
| `compute_residual_heatmap(series, model, feature_cols, test_start_idx)` | series, model, features, test start index | `(matrix, flat_list)` | Runs repeated cutoffs over test period and computes mean APE by day/hour bucket |

### Artifact outputs

- `data/model/xgboost_model.joblib`
- `data/model/buffer.json` containing:
  - model metadata (`trained_at`, `data_end`, `feature_cols`)
  - `test_metrics`
  - last 672 observed loads (`buffer`)
  - residual heatmap (`heatmap_matrix`, `heatmap_flat`, `heatmap_info`)

---

## 5) API (`src/api/app.py`)

### Purpose
Loads model + metadata once at startup and serves low-latency forecast and diagnostics endpoints.

### Function-by-function details

| Function | Route | Method | Output |
|---|---|---|---|
| `run_forecast()` | internal | internal | Generates 96-step forecast using autoregressive feature updates |
| `health()` | `/health` | `GET` | API status, model metadata, test metrics |
| `residuals()` | `/residuals` | `GET` | 7×24 residual heatmap data from training artifact |
| `forecast()` | `/forecast` | `GET` | full forecast payload + metadata |

### Runtime notes

- Uses `Flask` + `Flask-CORS`
- Uses `use_reloader=False` to avoid duplicate startup loads
- Exposes service on `0.0.0.0:5000`

---

## 6) Frontend (`src/Frontend/dashboard.html`)

### Purpose
Single-file dashboard that fetches API data and renders operational forecast views, KPIs, model comparison, residual heatmap, and CSV export.

### JavaScript function reference

| Function | Inputs | Returns | Responsibility |
|---|---|---|---|
| `fmt(n)` | number | localized string | Integer formatting for display |
| `fmtMW(n)` | number | string | Adds `MW` unit suffix |
| `mapeClass(v)` | number | class token | Maps MAPE to `good/warn/bad` styling |
| `nowIST()` | none | string | Current IST time string |
| `loadForecast()` | none | Promise | Fetches `/health`, `/forecast`, `/residuals` and triggers render |
| `refreshForecast()` | none | None | Manual refresh hook |
| `renderAll(health, data)` | API payloads | None | Updates all dashboard sections from latest data |
| `drawForecastChart(fc, peak, peakIdx)` | forecast list + peak metadata | None | Draws SVG line + confidence band + tooltip behaviors |
| `buildHeatmap(matrix)` | 7×24 matrix or null | None | Renders real residual heatmap or static fallback |
| `exportCSV()` | none | None | Exports forecast rows as CSV file |
| `setupNavTabs()` | none | None | Handles tab switching between Forecast/Analysis/Models/Reports |

### UI interaction model

- On load: `setupNavTabs(); loadForecast();`
- Error handling: Shows API connectivity banner when fetch fails
- Progressive enhancement: if `/residuals` unavailable, uses fallback heatmap

---

## Runbook (End-to-End)

## 1) Install dependencies

```bash
pip install -r requirements.txt
```

## 2) Run data ingestion

```bash
python src/scrapping/scrap_excel.py
python src/ingestion/data_merger.py
python src/ingestion/data_cleaning.py
```

## 3) Train and persist model

```bash
python src/pipeline/train_and_save.py
```

## 4) Start API

```bash
python src/api/app.py
```

## 5) Open frontend

Open `src/Frontend/dashboard.html` in browser (ensure API is running on `http://localhost:5000`).

---

## API Contract

### `GET /health`

Returns service and model metadata.

### `GET /forecast`

Returns:

- generation timestamp
- model details
- horizon metadata
- `forecast` array with 96 points:
  - `datetime` (string)
  - `load_mw` (number)

### `GET /residuals`

Returns:

- `heatmap_matrix` (`7x24`, day-of-week × hour)
- `heatmap_flat` (168 values)
- `heatmap_info`

---

## Modeling Strategy and Metrics

### Model strategy in this implementation

- Feature-rich autoregressive regression with XGBoost
- Season-aware holdout (last 3 months) to test temporal generalization
- Sliding-cutoff residual analysis for operational reliability map

### Metrics tracked

- **MAE** (absolute error magnitude)
- **RMSE** (penalizes larger misses)
- **MAPE** (relative error)

### Why this is deployment-friendly

- Fast inference
- Explainable lag/calendar feature set
- Artifact-based serving (no online retrain dependency)

---

## Observability and Logs

- `logs/scrap_excel.log`: scraping execution summary and failures
- `logs/data_merger.log`: extraction/merge completion summaries
- API startup prints model metadata, training time, and data end timestamp

Suggested production add-ons:

- Structured JSON logging
- Request/latency metrics for API endpoints
- Scheduled retraining and drift alerting

---

## Research and Design Synthesis

Based on `docs/research.md` and `docs/system_design.md`, the project direction combines:

- Time-series forecasting for grid stability
- Data engineering rigor (validation, cleaning, feature pipelines)
- ML/DL comparative approach (Linear/GRU/LSTM/XGBoost references)
- Operational objective alignment (peak-risk mitigation, reliability, sustainability)

Design patterns reflected in code:

- Modular pipeline stages
- Artifact-based model lifecycle
- Monitoring-oriented residual diagnostics
- API + dashboard for applied decision support

> Note: `docs/synopsis/Synopsis Report-NavGati Updated.pdf` is included in repository documentation scope but is not machine-parsed in this README generation flow.

---

## External Research Notes (Web + Context7)

### Grid context (web research)

- IEA report emphasis: grids are central to secure clean-energy transitions, and planning/management upgrades are critical to avoid grid bottlenecks.
- U.S. DOE grid modernization framing: smarter, data-enabled grids improve resilience, outage response, renewable integration, and operational efficiency.
- UCI electricity load benchmark confirms broad use of 15-minute cadence load data for forecasting tasks.

### Library guidance (Context7)

- **XGBoost (`/dmlc/xgboost`)**: strong fit for tabular time-series feature sets, scikit-learn style `XGBRegressor`, robust parameterization and importance analysis.
- **Flask (`/pallets/flask`)**: standard route and JSON serving patterns, stable local server model.
- **Pandas (`/pandas-dev/pandas`)**: DatetimeIndex-first operations and `interpolate(method='time')` align with this project’s cleaning path.

---

## Known Constraints

- Scraper relies on target portal DOM stability; UI changes may require selector updates.
- No formal test suite is currently present.
- Current pipeline is single-region operationalized (North) though docs discuss multi-region ambitions.
- API currently serves from static artifacts; online updates require explicit retraining.

---

## Roadmap

1. Add weather/exogenous features for peak-window robustness.
2. Add model registry and retraining scheduler.
3. Add CI tests for pipeline invariants and API contracts.
4. Add region abstraction for North/South/East/West scaling.
5. Integrate LSTM/GRU pipeline as optional model backend.

---

## References

### Repository documentation

- `docs/research.md`
- `docs/system_design.md`
- `docs/synopsis/Synopsis Report-NavGati Updated.pdf`

### External

- IEA — Electricity Grids and Secure Energy Transitions: https://www.iea.org/reports/electricity-grids-and-secure-energy-transitions
- U.S. DOE — Grid Modernization and the Smart Grid: https://www.energy.gov/oe/activities/technology-development/grid-modernization-and-smart-grid
- UCI ML Repository — ElectricityLoadDiagrams20112014: https://archive.ics.uci.edu/dataset/321/electricityloaddiagrams20112014
- XGBoost docs (Context7 index): `/dmlc/xgboost`
- Flask docs (Context7 index): `/pallets/flask`
- Pandas docs (Context7 index): `/pandas-dev/pandas`

---

## Quick Start (minimal)

```bash
pip install -r requirements.txt
python src/ingestion/data_merger.py
python src/ingestion/data_cleaning.py
python src/pipeline/train_and_save.py
python src/api/app.py
```

Then open dashboard:

- `src/Frontend/dashboard.html`

---

If you want, a second version of this README can be generated as a **GitHub landing-page variant** (shorter executive narrative at top + collapsible technical appendices).
