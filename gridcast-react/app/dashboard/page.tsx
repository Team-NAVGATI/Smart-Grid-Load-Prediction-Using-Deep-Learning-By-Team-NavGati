'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { exportToCSV, fetchForecastData, fetchResidualData } from '@/lib/api';
import { ForecastData, Horizon, ModelType, ResidualData } from '@/types';

type TabKey = 'forecast' | 'analysis' | 'models' | 'reports';
type HorizonMetricMap = Partial<ForecastData['horizon_metrics']>;

const MODEL_CFG: Record<
  ModelType,
  {
    color: string;
    light: string;
    muted: string;
    label: string;
    desc: string;
    stripCls: 'xgb' | 'lstm';
    dotCls: 'xgb' | 'lstm';
  }
> = {
  xgboost: {
    color: '#4c79b8',
    light: '#f0f4fb',
    muted: '#6b91c7',
    label: 'XGBoost',
    desc: 'Season-aware gradient boosting · Autoregressive multi-horizon',
    stripCls: 'xgb',
    dotCls: 'xgb',
  },
  lstm: {
    color: '#7C3AED',
    light: '#f5f3ff',
    muted: '#9d6ef7',
    label: 'LSTM',
    desc: 'Sequence model · Direct multi-step output · Bidirectional 2-layer',
    stripCls: 'lstm',
    dotCls: 'lstm',
  },
};

const STATIC_HEATMAP = [
  [0, 1, 2, 1, 0, 0, 1, 3, 4, 3, 2, 1, 0, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1, 0],
  [0, 0, 1, 1, 0, 0, 2, 4, 5, 4, 3, 1, 0, 0, 1, 1, 2, 1, 1, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 1, 2, 2, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 3, 4, 4, 3, 2, 1, 0, 0, 1, 3, 3, 2, 1, 0, 0, 1, 0, 0],
  [0, 1, 1, 0, 0, 2, 3, 5, 4, 3, 2, 1, 1, 0, 2, 3, 4, 3, 2, 1, 1, 2, 1, 0],
  [2, 2, 2, 1, 1, 1, 0, 1, 1, 2, 3, 3, 2, 2, 3, 4, 3, 2, 1, 0, 1, 2, 2, 1],
  [3, 2, 2, 2, 1, 1, 0, 1, 2, 3, 3, 2, 2, 1, 2, 3, 2, 1, 1, 1, 2, 2, 2, 1],
];

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-IN');
}

function fmtMW(n: number) {
  return `${fmt(n)} MW`;
}

function mapeClass(v: number) {
  if (v < 3) return 'good';
  if (v < 4) return 'warn';
  return 'bad';
}

function deriveHorizonHours(data?: ForecastData | null) {
  if (!data) return 24;
  if (Number.isFinite(data.horizon_h)) return data.horizon_h;
  if (typeof data.horizon === 'string') {
    const parsed = parseInt(data.horizon, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (Number.isFinite(data.steps)) return Math.round(data.steps / 4);
  if (Array.isArray(data.forecast)) return Math.round(data.forecast.length / 4);
  return 24;
}

function getHorizonMetrics(data?: ForecastData | null) {
  return (data?.horizon_metrics ?? {}) as HorizonMetricMap;
}

function getForecastSpanLabel(data?: ForecastData | null) {
  if (!data?.forecast?.length) return 'Loading...';
  return `${data.forecast[0].datetime} → ${data.forecast[data.forecast.length - 1].datetime}`;
}

function getHeatmapLevel(value: number) {
  if (value < 1.5) return 0;
  if (value < 2.5) return 1;
  if (value < 3.5) return 2;
  if (value < 4.5) return 3;
  if (value < 5.5) return 4;
  return 5;
}

function getLevelColor(level: number) {
  const colors = ['#D1FAE5', '#6EE7B7', '#FEF3C7', '#FCD34D', '#F87171', '#DC2626'];
  return colors[level] ?? colors[5];
}

export default function DashboardPage() {
  const [activeModel, setActiveModel] = useState<ModelType>('xgboost');
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('24h');
  const [activeTab, setActiveTab] = useState<TabKey>('forecast');
  const [loading, setLoading] = useState(true);
  const [modelLoading, setModelLoading] = useState(true);
  const [xgbData, setXgbData] = useState<ForecastData | null>(null);
  const [lstmData, setLstmData] = useState<ForecastData | null>(null);
  const [residualData, setResidualData] = useState<ResidualData | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; left: number; top: number; label: string; value: string }>({
    visible: false,
    left: 0,
    top: 0,
    label: '',
    value: '',
  });
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [chartHeight, setChartHeight] = useState(0);

  useEffect(() => {
    document.title = 'Grid Load Forecast — GridCast';
  }, []);

  useEffect(() => {
    const resize = () => {
      if (!chartWrapRef.current) return;
      const rect = chartWrapRef.current.getBoundingClientRect();
      setChartWidth(rect.width || 600);
      setChartHeight(rect.height || 200);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setModelLoading(true);

      try {
        const [xgb, lstm, residuals] = await Promise.all([
          fetchForecastData('xgboost', activeHorizon),
          fetchForecastData('lstm', activeHorizon),
          fetchResidualData(activeModel),
        ]);

        if (cancelled) return;

        setXgbData(xgb);
        setLstmData(lstm);
        setResidualData(residuals);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load dashboard data:', error);
        }
      } finally {
        if (cancelled) return;
        setLoading(false);
        if (loadingTimerRef.current) {
          window.clearTimeout(loadingTimerRef.current);
        }
        loadingTimerRef.current = window.setTimeout(() => setModelLoading(false), 850);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }
      if (tooltipTimerRef.current) {
        window.clearTimeout(tooltipTimerRef.current);
      }
    };
  }, [activeModel, activeHorizon]);

  const activeData = activeModel === 'xgboost' ? xgbData : lstmData;
  const cfg = MODEL_CFG[activeModel];
  const horizonMetrics = getHorizonMetrics(activeData);
  const activeMetrics = horizonMetrics[activeHorizon];
  const xgbMetrics = getHorizonMetrics(xgbData)[activeHorizon];
  const lstmMetrics = getHorizonMetrics(lstmData)[activeHorizon];
  const metrics48 = horizonMetrics['48h'];
  const metrics72 = horizonMetrics['72h'];

  const forecast = activeData?.forecast ?? [];
  const loads = forecast.map((point) => point.load_mw);
  const peak = loads.length ? Math.max(...loads) : 0;
  const peakIdx = loads.length ? loads.indexOf(peak) : 0;
  const trough = loads.length ? Math.min(...loads) : 0;
  const troughIdx = loads.length ? loads.indexOf(trough) : 0;
  const forecastFrom = activeData?.data_end?.slice(0, 10) ?? '—';
  const peakTime = forecast[peakIdx]?.datetime?.slice(11) ?? '—';
  const troughTime = forecast[troughIdx]?.datetime?.slice(11) ?? '—';
  const trainedAt = activeData?.trained_at?.slice(0, 10) ?? '—';
  const navDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const chartData = useMemo(() => {
    if (!forecast.length) return null;

    const effectiveWidth = chartWidth || 600;
    const effectiveHeight = chartHeight || 200;
    const minV = Math.min(...loads) * 0.985;
    const maxV = Math.max(...loads) * 1.015;
    const range = maxV - minV || 1;

    const scaleX = (index: number) => (index / Math.max(loads.length - 1, 1)) * effectiveWidth;
    const scaleY = (value: number) => effectiveHeight - ((value - minV) / range) * effectiveHeight;

    const yLabels = Array.from({ length: 7 }, (_, i) => Math.round((minV + (range / 6) * (6 - i)) / 1000) + 'k');
    const xStep = Math.max(Math.floor(forecast.length / 8), 1);
    const xLabels = Array.from({ length: 9 }, (_, i) => forecast[Math.min(i * xStep, forecast.length - 1)].datetime.slice(11, 16));

    const upperPts = loads.map((value, index) => `${scaleX(index).toFixed(1)},${scaleY(value * 1.05).toFixed(1)}`).join(' ');
    const lowerPts = [...loads]
      .reverse()
      .map((value, index) => `${scaleX(loads.length - 1 - index).toFixed(1)},${scaleY(value * 0.95).toFixed(1)}`)
      .join(' ');
    const linePts = loads.map((value, index) => `${scaleX(index).toFixed(1)},${scaleY(value).toFixed(1)}`).join(' ');

    return {
      effectiveWidth,
      effectiveHeight,
      yLabels,
      xLabels,
      upperPts,
      lowerPts,
      linePts,
      peakX: scaleX(peakIdx),
      peakY: scaleY(peak),
      peakIdx,
    };
  }, [forecast, loads, chartWidth, chartHeight, peak, peakIdx]);

  const heatmapData = useMemo(() => {
    const matrix = residualData?.heatmap_matrix;
    const isReal = Array.isArray(matrix) && matrix.length > 0;
    const source = isReal ? matrix : STATIC_HEATMAP;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const cells: Array<{ day: number; hour: number; error: number; level: number; title: string }> = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = Number(source[day]?.[hour] ?? 0);
        const level = isReal ? getHeatmapLevel(value) : value;
        cells.push({
          day,
          hour,
          error: value,
          level,
          title: isReal
            ? `${days[day]} ${String(hour).padStart(2, '0')}:00 — ${value.toFixed(2)}% APE`
            : `${days[day]} ${String(hour).padStart(2, '0')}:00 — illustrative`,
        });
      }
    }

    let subtitle = `Illustrative · run pre_generate.py for real ${cfg.label} residuals`;
    let note = `Showing illustrative pattern · ${cfg.label}`;

    if (isReal) {
      const sorted = cells.slice().sort((a, b) => b.error - a.error).slice(0, 3);
      subtitle = `Real APE % · Hour-of-day × Day-of-week · ${cfg.label} test set`;
      note = `⚑ Worst: ${sorted
        .map((cell) => `${days[cell.day]} ${String(cell.hour).padStart(2, '0')}h (${cell.error.toFixed(1)}%)`)
        .join(' · ')}`;
    }

    return { cells, subtitle, note };
  }, [residualData, cfg.label]);

  const handleModelSwitch = (model: ModelType) => {
    if (model === activeModel) return;
    setActiveModel(model);
    setActiveHorizon('24h');
  };

  const handleHorizonSwitch = (horizon: Horizon) => {
    setActiveHorizon(horizon);
  };

  const handleExport = () => {
    if (!activeData) return;
    exportToCSV(activeData, activeModel, ['north']);
  };

  return (
    <>
      <div className={`model-loading-bar${modelLoading ? ' running' : ''}`} id="modelLoadingBar">
        <div className="model-loading-bar-inner" id="modelLoadingInner"></div>
      </div>

      <div
        className="chart-tooltip"
        id="chartTooltip"
        style={{ display: tooltip.visible ? 'block' : 'none', left: tooltip.left, top: tooltip.top }}
      >
        <div style={{ fontSize: 10, marginBottom: 4, color: '#9CA3AF' }}>{tooltip.label}</div>
        <div className="tooltip-row">
          <div className="tooltip-dot" style={{ background: cfg.color }}></div>
          {tooltip.value}
        </div>
      </div>

      <div className="gridcast-dashboard">
        <nav>
          <div className="nav-logo">
            <span className="nav-logo-dot"></span>
            GridCast
          </div>
          <div className="nav-sep"></div>
          <div className="nav-tabs">
            {(['forecast', 'analysis', 'models', 'reports'] as TabKey[]).map((tab) => (
              <div
                key={tab}
                className={`nav-tab${activeTab === tab ? ' active' : ''}`}
                data-view={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>
          <div className="nav-right">
            <span className="model-sw-label">Model:</span>
            <div className="model-switcher" id="modelSwitcher">
              <button
                className={`model-sw-btn${activeModel === 'xgboost' ? ' active-xgb' : ''}`}
                id="swXgb"
                onClick={() => handleModelSwitch('xgboost')}
              >
                <span className="sw-dot" style={{ background: '#4c79b8' }}></span> XGBoost
              </button>
              <button
                className={`model-sw-btn${activeModel === 'lstm' ? ' active-lstm' : ''}`}
                id="swLstm"
                onClick={() => handleModelSwitch('lstm')}
              >
                <span className="sw-dot" style={{ background: '#7C3AED' }}></span> LSTM
              </button>
            </div>
            <div className="nav-sep"></div>
            <div className="wf-pill" id="navDate">
              {navDate}
            </div>
            <div className="wf-pill sm static" id="modeIndicator">
              Static · Weekly
            </div>
            <div className="wf-avatar"></div>
          </div>
        </nav>

        <div className="layout">
          <aside>
            <div className="aside-label">Regions</div>
            <div className="aside-item active">
              <div className="aside-dot active"></div>North
            </div>
            <div className="aside-item">
              <div className="aside-dot"></div>South <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>Soon</span>
            </div>
            <div className="aside-item">
              <div className="aside-dot"></div>East <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>Soon</span>
            </div>
            <div className="aside-item">
              <div className="aside-dot"></div>West <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>Soon</span>
            </div>

            <div className="aside-label" style={{ marginTop: 10 }}>
              Models
            </div>
            <div className={`aside-item${activeModel === 'xgboost' ? ' active' : ''}`} id="aside-xgb" onClick={() => handleModelSwitch('xgboost')}>
              <div className={`aside-dot${activeModel === 'xgboost' ? ' active' : ''}`} id="aside-xgb-dot"></div>XGBoost
              <span className="aside-model-badge xgb" id="aside-xgb-badge" style={{ display: activeModel === 'xgboost' ? '' : 'none' }}>
                Active
              </span>
            </div>
            <div className={`aside-item${activeModel === 'lstm' ? ' active' : ''}`} id="aside-lstm" onClick={() => handleModelSwitch('lstm')}>
              <div className={`aside-dot${activeModel === 'lstm' ? ' active' : ''}`} id="aside-lstm-dot"></div>LSTM
              <span className="aside-model-badge lstm" id="aside-lstm-badge" style={{ display: activeModel === 'lstm' ? '' : 'none' }}>
                Active
              </span>
            </div>

            <div className="aside-spacer"></div>
            <div className="aside-region">
              <div className="aside-region-label">Active Region</div>
              <div className="aside-region-val">North</div>
              <div className="aside-region-sub">NRLDC · 15 min</div>
            </div>
          </aside>

          <main>
            <div className={`view${activeTab === 'forecast' ? ' active' : ''}`} id="view-forecast">
              <div className="page-header">
                <div>
                  <div className="page-title" id="pageTitle">Grid Load Forecast — North Region</div>
                  <div className="page-sub" id="pageSubtitle">
                    {loading ? 'Loading forecast...' : `Pre-generated from ${forecastFrom} · ${cfg.label} active · Updated weekly`}
                  </div>
                </div>
                <div className="header-controls">
                  <div className="wf-pill accent" onClick={handleExport}>
                    ↓ Export CSV
                  </div>
                </div>
              </div>

              <div className={`model-indicator-strip ${cfg.stripCls}`} id="modelStrip">
                <div className={`mis-dot ${cfg.dotCls}`} id="missDot"></div>
                <div className="mis-text">
                  <div className="mis-label" id="missLabel">
                    {cfg.label} — Active Model
                  </div>
                  <div className="mis-sub" id="missSub">
                    {cfg.desc}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', opacity: 0.7 }} id="missDataEnd">
                  Data end: {forecastFrom}
                </div>
              </div>

              <div className="section-label" id="kpiSectionLabel">
                Model Performance — {cfg.label} (Autoregressive Backtest · 7 Cutoffs)
              </div>
              <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }} id="kpiRow">
                <div className="kpi-card">
                  <div className="kpi-label">MAPE · 24h Ahead</div>
                  <div className={`kpi-value ${activeMetrics?.mape != null ? mapeClass(activeMetrics.mape) : 'neutral'}`} id="kpiMape24">
                    {activeMetrics?.mape != null ? `${activeMetrics.mape.toFixed(2)}%` : '—'}
                  </div>
                  <div className="kpi-sub" id="kpiMape24Sub">
                    {activeMetrics?.mape != null ? <span className={`badge ${mapeClass(activeMetrics.mape)}`}>{activeMetrics.mape < 4 ? '✓ On target' : '⚠ Investigate'}</span> : <span className="skeleton" style={{ width: 80, height: 12 }}></span>}
                    {activeMetrics?.mape != null ? '7-cutoff backtest' : ''}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">MAPE · 48h Ahead</div>
                  <div className={`kpi-value ${metrics48?.mape != null ? mapeClass(metrics48.mape) : 'neutral'}`} id="kpiMape48">
                    {metrics48?.mape != null ? `${metrics48.mape.toFixed(2)}%` : '—'}
                  </div>
                  <div className="kpi-sub" id="kpiMape48Sub">
                    {metrics48?.mape != null ? <span className={`badge ${mapeClass(metrics48.mape)}`}>{metrics48.mape < 4 ? '✓ On target' : '⚠ Investigate'}</span> : <span className="skeleton" style={{ width: 80, height: 12 }}></span>}
                    {metrics48?.mape != null ? '7-cutoff backtest' : ''}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">MAPE · 72h Ahead</div>
                  <div className={`kpi-value ${metrics72?.mape != null ? mapeClass(metrics72.mape) : 'neutral'}`} id="kpiMape72">
                    {metrics72?.mape != null ? `${metrics72.mape.toFixed(2)}%` : '—'}
                  </div>
                  <div className="kpi-sub" id="kpiMape72Sub">
                    {metrics72?.mape != null ? <span className={`badge ${mapeClass(metrics72.mape)}`}>{metrics72.mape < 4 ? '✓ On target' : '⚠ Investigate'}</span> : <span className="skeleton" style={{ width: 80, height: 12 }}></span>}
                    {metrics72?.mape != null ? '7-cutoff backtest' : ''}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Avg MAE · 24h Ahead</div>
                  <div className="kpi-value neutral" id="kpiMae">
                    {activeMetrics?.mae != null ? `${fmt(activeMetrics.mae)} MW` : '—'}
                  </div>
                  <div className="kpi-sub" id="kpiMaeSub">
                    {activeMetrics?.mae != null ? 'Avg over 7 backtest cutoffs' : <span className="skeleton" style={{ width: 80, height: 12 }}></span>}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Predicted Peak</div>
                  <div className="kpi-value neutral" id="kpiPeak">
                    {forecast.length ? fmtMW(peak) : '—'}
                  </div>
                  <div className="kpi-sub" id="kpiPeakSub">
                    {forecast.length ? `at ${peakTime} IST · 24h` : <span className="skeleton" style={{ width: 80, height: 12 }}></span>}
                  </div>
                </div>
                <div className="kpi-card model-highlight">
                  <div className="kpi-label">Forecast From</div>
                  <div className="kpi-value model-colored" style={{ fontSize: 15 }} id="kpiTime">
                    {forecastFrom}
                  </div>
                  <div className="kpi-sub" id="kpiTimeSub">
                    {loading ? <span className="skeleton" style={{ width: 80, height: 12 }}></span> : `${cfg.label} forecast seeded`}
                  </div>
                </div>
              </div>

              <div className="main-grid">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title" id="chartTitle">
                        Next {deriveHorizonHours(activeData)}-Hour Forecast
                      </div>
                      <div className="card-subtitle" id="chartSubtitle">
                        {loading ? 'Loading...' : `${cfg.label} ${activeHorizon} · ${getForecastSpanLabel(activeData)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['24h', '48h', '72h'] as Horizon[]).map((h) => (
                          <button key={h} className={`horizon-btn${activeHorizon === h ? ' active' : ''}`} data-h={h} onClick={() => handleHorizonSwitch(h)}>
                            {h}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }} id="dataEndLabel">
                        Data end: {forecastFrom}
                      </div>
                    </div>
                  </div>
                  <div className="card-body" style={{ paddingBottom: 0 }}>
                    <div className="forecast-chart" id="forecastChartWrap" ref={chartWrapRef}>
                      <div className="fc-yaxis" id="yAxis">
                        {chartData?.yLabels.map((label) => (
                          <span key={label}>{label}</span>
                        )) ?? <span>—</span>}
                      </div>
                      <div
                        className="fc-plot"
                        id="fcPlot"
                        onMouseMove={(event) => {
                          if (!forecast.length || !chartData) return;
                          const rect = event.currentTarget.getBoundingClientRect();
                          const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
                          const idx = Math.min(Math.max(Math.floor(ratio * forecast.length), 0), forecast.length - 1);
                          const row = forecast[idx];

                          if (tooltipTimerRef.current) {
                            window.clearTimeout(tooltipTimerRef.current);
                          }

                          setTooltip({
                            visible: true,
                            left: event.clientX + 14,
                            top: event.clientY - 52,
                            label: `${row.datetime} IST`,
                            value: `${MODEL_CFG[activeModel].label}: ${fmt(row.load_mw)} MW`,
                          });
                        }}
                        onMouseLeave={() => {
                          tooltipTimerRef.current = window.setTimeout(() => setTooltip((current) => ({ ...current, visible: false })), 20);
                        }}
                      >
                        <div className="gridlines">
                          <div className="gridline" style={{ top: '0%' }}></div>
                          <div className="gridline" style={{ top: '20%' }}></div>
                          <div className="gridline" style={{ top: '40%' }}></div>
                          <div className="gridline" style={{ top: '60%' }}></div>
                          <div className="gridline" style={{ top: '80%' }}></div>
                        </div>
                        {chartData && (
                          <svg className="chart-svg" id="forecastSvg" width={chartData.effectiveWidth} height={chartData.effectiveHeight} viewBox={`0 0 ${chartData.effectiveWidth} ${chartData.effectiveHeight}`}>
                            <defs>
                              <linearGradient id="bandGrad" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.04" />
                              </linearGradient>
                            </defs>
                            <polygon points={`${chartData.upperPts} ${chartData.lowerPts}`} fill="url(#bandGrad)" stroke="none" />
                            <polyline points={chartData.linePts} fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={chartData.peakX.toFixed(1)} cy={chartData.peakY.toFixed(1)} r="4.5" fill="#d97706" />
                          </svg>
                        )}
                        <div
                          className="annotation"
                          id="peakAnnotation"
                          style={{ display: forecast.length ? 'block' : 'none', left: chartData ? Math.min((chartData.peakIdx / Math.max(forecast.length - 1, 1)) * 100, 78) + '%' : '0%', top: '6%' }}
                        >
                          {forecast.length ? `Peak · ${fmt(peak)} MW · ${peakTime}` : ''}
                        </div>
                      </div>
                      <div className="fc-xaxis" id="xAxis">
                        {chartData?.xLabels.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="legend" id="chartLegend">
                    <div className="legend-item">
                      <div className="legend-line" id="legendLine" style={{ background: cfg.color }}></div>
                      <span id="legendLabel">{cfg.label} Forecast</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-band" id="legendBand" style={{ background: cfg.color, width: 20, height: 10, borderRadius: 3 }}></div>
                      ±5% Band
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>MW · North Region</div>
                  </div>
                </div>

                <div className="right-col">
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Model Comparison</div>
                        <div className="card-subtitle" id="modelCompSubtitle">
                          MAPE · {activeHorizon} autoregressive backtest · 7 cutoffs
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="model-row" id="compXgbRow">
                        <div className="model-dot" style={{ background: '#4c79b8' }}></div>
                        <div style={{ flex: 1 }}>
                          <div className="model-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            XGBoost
                            <span id="xgbHorizonBadge" style={{ fontSize: 10, fontWeight: 600, background: 'var(--amber-bg)', color: 'var(--amber)', padding: '1px 6px', borderRadius: 10 }}>
                              {activeHorizon}
                            </span>
                          </div>
                          <div className="model-type" id="xgbModelType">
                            {activeModel === 'xgboost' ? 'Season-aware · Active' : 'Season-aware'}
                          </div>
                        </div>
                        <div className="model-bar-wrap">
                          <div className="model-bar-bg">
                            <div
                              className="model-bar-fill"
                              id="xgbBar"
                              style={{ width: xgbMetrics?.mape != null ? `${Math.min(Math.round((xgbMetrics.mape / 6) * 100), 100)}%` : '0%', background: '#4c79b8' }}
                            ></div>
                          </div>
                        </div>
                        <div className={`model-metric ${xgbMetrics?.mape != null ? mapeClass(xgbMetrics.mape) : ''}`} id="xgbMape">
                          {xgbMetrics?.mape != null ? `${xgbMetrics.mape.toFixed(2)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="model-row" id="compLstmRow">
                        <div className="model-dot" style={{ background: '#7C3AED' }}></div>
                        <div style={{ flex: 1 }}>
                          <div className="model-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            LSTM
                            <span id="lstmHorizonBadge" style={{ fontSize: 10, fontWeight: 600, background: 'var(--accent-lstm-light)', color: 'var(--accent-lstm)', padding: '1px 6px', borderRadius: 10, display: activeModel === 'lstm' ? '' : 'none' }}>
                              {activeHorizon}
                            </span>
                          </div>
                          <div className="model-type" id="lstmModelType">
                            {activeModel === 'lstm' ? 'Sequence model · Active' : 'Sequence model'}
                          </div>
                        </div>
                        <div className="model-bar-wrap">
                          <div className="model-bar-bg">
                            <div
                              className="model-bar-fill"
                              id="lstmBar"
                              style={{ width: lstmMetrics?.mape != null ? `${Math.min(Math.round((lstmMetrics.mape / 6) * 100), 100)}%` : '0%', background: '#7C3AED' }}
                            ></div>
                          </div>
                        </div>
                        <div className={`model-metric ${lstmMetrics?.mape != null ? mapeClass(lstmMetrics.mape) : ''}`} id="lstmMape" style={{ color: lstmMetrics?.mape == null ? 'var(--text-tertiary)' : undefined }}>
                          {lstmMetrics?.mape != null ? `${lstmMetrics.mape.toFixed(2)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="model-row">
                        <div className="model-dot" style={{ background: '#059669' }}></div>
                        <div style={{ flex: 1 }}>
                          <div className="model-name">Linear Reg.</div>
                          <div className="model-type">Baseline</div>
                        </div>
                        <div className="model-bar-wrap">
                          <div className="model-bar-bg">
                            <div className="model-bar-fill" style={{ width: '100%', background: '#059669' }}></div>
                          </div>
                        </div>
                        <div className="model-metric" style={{ color: 'var(--amber)' }}>
                          ~5.0%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Forecast Alerts</div>
                    </div>
                    <div id="alertFeed">
                      <div className="alert-item">
                        <div className="alert-icon green">
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <circle cx="5" cy="5" r="4" fill="#059669" />
                          </svg>
                        </div>
                        <div className="alert-body">
                          <div className="alert-title" id="alertTitle">
                            {cfg.label} Forecast Loaded
                          </div>
                          <div className="alert-desc" id="alertApiDesc">
                            {loading ? 'Loading data...' : `Pre-generated · ${forecast.length} steps · Peak ${fmtMW(peak)}`}
                          </div>
                        </div>
                        <div className="alert-time" id="alertApiTime">
                          {forecastFrom.slice(5, 10) || '—'}
                        </div>
                      </div>
                      <div className="alert-item">
                        <div className="alert-icon amber">
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <path d="M5 1L9 9H1L5 1Z" fill="#d97706" />
                          </svg>
                        </div>
                        <div className="alert-body">
                          <div className="alert-title">Data Gap · May–Jul 2025</div>
                          <div className="alert-desc">~67-day gap in peak season — handled via gap-aware sequences</div>
                        </div>
                        <div className="alert-time">Known</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bottom-row">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Residual Error Heatmap</div>
                      <div className="card-subtitle" id="heatmapSubtitle">
                        {heatmapData.subtitle}
                      </div>
                    </div>
                    <div className="wf-pill sm" id="heatmapModelBadge">
                      {cfg.label}
                    </div>
                  </div>
                  <div className="heatmap-wrap">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 2, minWidth: 24 }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <span key={day} style={{ fontSize: 10, color: 'var(--text-tertiary)', height: 20, display: 'flex', alignItems: 'center' }}>
                            {day}
                          </span>
                        ))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="hm-grid" id="heatmapGrid" style={{ gridTemplateRows: 'repeat(7, 20px)' }}>
                          {heatmapData.cells.map((cell) => (
                            <div key={`${cell.day}-${cell.hour}`} className={`hm-cell l${cell.level}`} title={cell.title}></div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                          {['00h', '03h', '06h', '09h', '12h', '15h', '18h', '21h', '23h'].map((label) => (
                            <span key={label} style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="hm-scale" style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Low error</span>
                      <div className="hm-scale-bar">
                        {Array.from({ length: 6 }, (_, index) => (
                          <div key={index} className="hm-scale-cell" style={{ background: getLevelColor(index) }}></div>
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>High error</span>
                    </div>
                    <div id="heatmapNote" style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      {heatmapData.note}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Daily Peak Load Summary</div>
                    <div className="wf-pill sm">North Region</div>
                  </div>
                  <div className="peak-grid">
                    <div className="peak-item">
                      <div className="peak-item-label">Predicted Peak</div>
                      <div className="peak-item-val" id="peakVal">
                        {forecast.length ? fmtMW(peak) : '—'}
                      </div>
                      <div className="peak-item-sub" id="peakTime">
                        {forecast.length ? `${peakTime} IST · ${cfg.label}` : 'Loading...'}
                      </div>
                    </div>
                    <div className="peak-item">
                      <div className="peak-item-label">Predicted Trough</div>
                      <div className="peak-item-val" id="troughVal">
                        {forecast.length ? fmtMW(trough) : '—'}
                      </div>
                      <div className="peak-item-sub" id="troughTime">
                        {forecast.length ? `${troughTime} IST` : 'Overnight low'}
                      </div>
                    </div>
                    <div className="peak-item">
                      <div className="peak-item-label">Avg MAPE (Backtest)</div>
                      <div className="peak-item-val" id="peakMape">
                        {activeMetrics?.mape != null ? `${activeMetrics.mape.toFixed(2)}%` : '—'}
                      </div>
                      <div className="peak-item-sub">7 cutoffs · 24h ahead</div>
                    </div>
                    <div className="peak-item" id="trainedCard" style={{ background: 'var(--accent-light)' }}>
                      <div className="peak-item-label" id="trainedLabel" style={{ color: 'var(--accent)' }}>
                        Model Trained
                      </div>
                      <div className="peak-item-val" id="trainedAt" style={{ color: 'var(--accent)', fontSize: 13 }}>
                        {trainedAt}
                      </div>
                      <div className="peak-item-sub" id="trainedSub" style={{ color: 'var(--accent-muted)' }}>
                        Season-aware split
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 18px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Next 2 Hours · 15-min intervals</div>
                    <div id="forecastTable" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {forecast.slice(0, 8).map((row) => (
                        <div key={row.datetime} style={{ background: 'var(--bg)', borderRadius: 6, padding: '7px 9px', border: '1px solid var(--border)', animation: 'fadeIn .15s ease' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'DM Mono, monospace' }}>{row.datetime.slice(11)}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{fmt(row.load_mw)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>MW</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingBottom: 8, display: 'flex', gap: 16 }}>
                <span>⬡ GridCast v0.2 · NRLDC North Region</span>
                <span id="footerDataEnd">Forecast from: {forecastFrom}</span>
                <span style={{ marginLeft: 'auto' }} id="footerModel">
                  Static mode · Vercel · Model: XGBoost · LSTM available
                </span>
              </div>
            </div>

            <div className={`view${activeTab === 'analysis' ? ' active' : ''}`} id="view-analysis">
              <div className="page-header">
                <div>
                  <div className="page-title">Load Analysis — North Region</div>
                  <div className="page-sub">Operational analysis summary for current forecast cycle</div>
                </div>
              </div>
              <div className="placeholder-grid">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Error Pattern Insights</div>
                      <div className="card-subtitle">Focus areas from recent forecast behavior</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="placeholder-line">• Morning transition slots show higher variance than mid-day.</div>
                    <div className="placeholder-line">• Weekday peaks remain more stable than weekend peaks.</div>
                    <div className="placeholder-line">• Backtest heatmap remains primary source for slot-level reliability.</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Operational Notes</div>
                      <div className="card-subtitle">Action-oriented review points</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="placeholder-line">• Monitor high-demand windows around peak ramp-up hours.</div>
                    <div className="placeholder-line">• Cross-check abnormal spikes with weather and holiday signals.</div>
                    <div className="placeholder-line">• Re-run training after material demand pattern shifts.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`view${activeTab === 'models' ? ' active' : ''}`} id="view-models">
              <div className="page-header">
                <div>
                  <div className="page-title">Model Stack</div>
                  <div className="page-sub">Status and readiness of forecasting models</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Model Readiness Matrix</div>
                    <div className="card-subtitle">Current and planned forecasting pipelines</div>
                  </div>
                </div>
                <div>
                  <div className="model-row">
                    <div className="model-dot" style={{ background: '#4c79b8' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="model-name">XGBoost</div>
                      <div className="model-type">Production model · Season-aware features</div>
                    </div>
                    <div className="wf-pill sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      Active
                    </div>
                  </div>
                  <div className="model-row">
                    <div className="model-dot" style={{ background: '#7C3AED' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="model-name">LSTM</div>
                      <div className="model-type">Sequence model · Direct multi-step output · Bidirectional</div>
                    </div>
                    <div className="wf-pill sm" style={{ background: 'var(--accent-lstm-light)', color: 'var(--accent-lstm)' }}>
                      Active
                    </div>
                  </div>
                  <div className="model-row">
                    <div className="model-dot" style={{ background: '#059669' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="model-name">Linear Regression</div>
                      <div className="model-type">Baseline benchmark for drift checks</div>
                    </div>
                    <div className="wf-pill sm">Baseline</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`view${activeTab === 'reports' ? ' active' : ''}`} id="view-reports">
              <div className="page-header">
                <div>
                  <div className="page-title">Reports</div>
                  <div className="page-sub">Generated artifacts and export-ready summaries</div>
                </div>
              </div>
              <div className="placeholder-grid">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Forecast Reporting</div>
                      <div className="card-subtitle">Daily and weekly operational summaries</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="placeholder-line">• Daily forecast snapshot with peak/trough summary.</div>
                    <div className="placeholder-line">• Weekly accuracy digest for stakeholder review.</div>
                    <div className="placeholder-line">• CSV export available from Forecast tab.</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Model Governance</div>
                      <div className="card-subtitle">Tracking quality and retraining posture</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="placeholder-line">• Log model performance against rolling benchmarks.</div>
                    <div className="placeholder-line">• Maintain retraining notes and data coverage updates.</div>
                    <div className="placeholder-line">• Use residual heatmap trends for exception reporting.</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <style jsx global>{`
        * , *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #ffffff;
          --surface: #ffffff;
          --border: #e2e8f0;
          --border-strong: #cfd8e3;
          --text-primary: #111827;
          --text-secondary: #64748b;
          --text-tertiary: #94a3b8;
          --accent: #003d99;
          --accent-light: #f0f4fb;
          --accent-muted: #6b91c7;
          --accent-lstm: #7C3AED;
          --accent-lstm-light: #f5f3ff;
          --accent-lstm-muted: #9d6ef7;
          --green: #059669;
          --green-bg: rgba(5,150,105,0.12);
          --amber: #d97706;
          --amber-bg: rgba(217,119,6,0.12);
          --red: #dc2626;
          --red-bg: rgba(220,38,38,0.12);
          --wf-fill: #f1f5f9;
          --wf-fill-dark: #d9e2ee;
          --wf-fill-accent: #d9f2f8;
          --wf-fill-accent-dark: #8fd9e8;
          --radius: 10px;
          --shadow: 0 1px 3px rgba(15,23,42,.06), 0 6px 20px rgba(15,23,42,.06);
          --model-color: #4c79b8;
          --model-light: #f0f4fb;
          --model-muted: #6b91c7;
        }

        html, body, #__next { min-height: 100%; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text-primary);
          min-height: 100vh;
          font-size: 13px;
        }

        .gridcast-dashboard { min-height: 100vh; background: var(--bg); }
        nav { background: var(--surface); border-bottom: 1px solid var(--border); height: 52px; display: flex; align-items: center; padding: 0 24px; gap: 20px; position: sticky; top: 0; z-index: 100; }
        .nav-logo { font-family:'Syne',sans-serif; font-size: 17px; font-weight: 800; color: var(--accent); display: flex; align-items: center; gap: 7px; letter-spacing: -.02em; }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #d97706; animation: brandPulse 2s ease-in-out infinite; }
        .nav-sep { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }
        .nav-tabs { display: flex; gap: 2px; }
        .nav-tab { padding: 5px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all .15s; }
        .nav-tab.active { background: var(--accent-light); color: var(--accent); box-shadow: inset 0 -2px 0 var(--amber); }
        .nav-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .wf-pill { height: 28px; border-radius: 6px; background: var(--wf-fill); display: inline-flex; align-items: center; padding: 0 12px; font-size: 12px; color: var(--text-secondary); font-weight: 500; white-space: nowrap; }
        .wf-pill.sm { padding: 0 9px; height: 24px; }
        .wf-pill.accent { background: var(--accent); color: #ffffff; cursor: pointer; transition: opacity .15s; }
        .wf-pill.accent:hover { opacity: .88; }
        .wf-pill.static::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--amber); margin-right: 5px; }
        .wf-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--wf-fill-accent-dark); flex-shrink: 0; }

        .model-switcher { display: flex; align-items: center; background: var(--wf-fill); border-radius: 8px; padding: 3px; gap: 2px; border: 1px solid var(--border); }
        .model-sw-btn { height: 24px; padding: 0 12px; border-radius: 6px; border: none; background: transparent; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .18s; display: flex; align-items: center; gap: 5px; }
        .model-sw-btn .sw-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .model-sw-btn.active-xgb { background: #ffffff; color: var(--accent); box-shadow: 0 1px 4px rgba(15,23,42,.12); }
        .model-sw-btn.active-lstm { background: #ffffff; color: var(--accent-lstm); box-shadow: 0 1px 4px rgba(15,23,42,.12); }
        .model-sw-label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; white-space: nowrap; }
        .model-loading-bar { height: 2px; background: var(--border); position: fixed; top: 52px; left: 0; right: 0; z-index: 200; overflow: hidden; }
        .model-loading-bar-inner { height: 100%; width: 0%; background: var(--model-color); transition: width .3s ease; border-radius: 1px; }
        .model-loading-bar.running .model-loading-bar-inner { animation: loadBar .8s ease forwards; }
        @keyframes loadBar { 0%{width:0%} 60%{width:80%} 100%{width:100%} }
        @keyframes brandPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .layout { display: flex; height: calc(100vh - 52px); }
        aside { width: 200px; min-width: 200px; background: var(--surface); border-right: 1px solid var(--border); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
        .aside-label { font-size: 10px; font-weight: 600; color: var(--text-tertiary); letter-spacing: .08em; text-transform: uppercase; padding: 8px 8px 4px; }
        .aside-item { height: 32px; border-radius: 7px; display: flex; align-items: center; padding: 0 10px; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: background .12s; }
        .aside-item:hover { background: var(--wf-fill); }
        .aside-item.active { background: var(--accent-light); color: var(--accent); }
        .aside-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--wf-fill-dark); flex-shrink: 0; }
        .aside-dot.active { background: var(--accent); }
        .aside-spacer { flex: 1; }
        .aside-region { border: 1px solid var(--border); border-radius: 8px; padding: 10px 10px 8px; margin-top: 4px; }
        .aside-region-label { font-size: 10px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; }
        .aside-region-val { font-size: 13px; font-weight: 600; color: var(--accent); }
        .aside-region-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }
        .aside-model-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-left: auto; }
        .aside-model-badge.xgb { background: var(--accent-light); color: var(--accent); }
        .aside-model-badge.lstm { background: var(--accent-lstm-light); color: var(--accent-lstm); }
        main { flex: 1; overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
        main::-webkit-scrollbar { width: 5px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
        .view { display: none; flex-direction: column; gap: 16px; }
        .view.active { display: flex; animation: fadeIn .2s ease; }
        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title { font-size: 17px; font-weight: 900; font-family: 'Red Hat Display', sans-serif; letter-spacing: -.3px; }
        .page-sub { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
        .header-controls { display: flex; gap: 8px; align-items: center; }
        .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--text-tertiary); margin-bottom: -6px; }
        .kpi-row { display: grid; gap: 12px; }
        .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); transition: border-color .2s; }
        .kpi-card.model-highlight { border-color: var(--model-color); background: linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--model-color) 4%, white) 100%); }
        .kpi-label { font-size: 11px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .06em; }
        .kpi-value { font-size: 24px; font-weight: 600; font-family: 'DM Mono', monospace; margin: 6px 0 4px; letter-spacing: -1px; transition: color .2s; }
        .kpi-value.good { color: var(--green); }
        .kpi-value.warn { color: var(--amber); }
        .kpi-value.bad { color: var(--red); }
        .kpi-value.neutral { color: var(--text-primary); }
        .kpi-value.model-colored { color: var(--model-color); }
        .kpi-sub { font-size: 11px; color: var(--text-tertiary); display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
        .badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge.green { background: var(--green-bg); color: var(--green); }
        .badge.amber { background: var(--amber-bg); color: var(--amber); }
        .badge.red { background: var(--red-bg); color: var(--red); }
        .badge.model { background: color-mix(in srgb, var(--model-color) 15%, white); color: var(--model-color); }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
        .card-header { padding: 14px 18px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-size: 13px; font-weight: 600; }
        .card-subtitle { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .card-body { padding: 18px; }
        .main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
        .right-col { display: flex; flex-direction: column; gap: 16px; }
        .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .forecast-chart { height: 260px; background: var(--surface); position: relative; }
        .fc-yaxis { position: absolute; left: 0; top: 0; bottom: 28px; width: 52px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 8px; }
        .fc-yaxis span { font-size: 10px; color: var(--text-tertiary); font-family: 'DM Mono', monospace; }
        .fc-plot { position: absolute; left: 52px; right: 0; top: 0; bottom: 28px; }
        .fc-xaxis { position: absolute; left: 52px; right: 0; bottom: 0; height: 28px; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 4px; }
        .fc-xaxis span { font-size: 10px; color: var(--text-tertiary); }
        .gridlines { position: absolute; inset: 0; }
        .gridline { position: absolute; left: 0; right: 0; height: 1px; background: var(--border); }
        .chart-svg { width: 100%; height: 100%; }
        .legend { display: flex; gap: 16px; align-items: center; padding: 10px 18px; border-top: 1px solid var(--border); flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
        .legend-line { width: 20px; height: 2px; border-radius: 2px; }
        .legend-band { width: 20px; height: 10px; border-radius: 3px; opacity: .35; }
        .annotation { position: absolute; background: #fff9ea; border: 1px solid rgba(217,119,6,.35); border-radius: 6px; padding: 4px 8px; font-size: 10px; font-family: 'DM Mono', monospace; font-weight: 500; color: #8a5a00; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .horizon-btn { height: 26px; padding: 0 11px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; }
        .horizon-btn:hover { border-color: var(--model-color); color: var(--model-color); }
        .horizon-btn.active { background: var(--model-color); border-color: var(--model-color); color: #ffffff; }
        .chart-tooltip { position: fixed; background: #0f1b2f; color: #e2e8f0; padding: 7px 10px; border-radius: 7px; font-size: 11px; pointer-events: none; display: none; z-index: 500; white-space: nowrap; border: 1px solid #1e3a5f; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
        .tooltip-row { display: flex; gap: 6px; align-items: center; margin-top: 3px; }
        .tooltip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .model-row { display: flex; align-items: center; padding: 11px 18px; border-bottom: 1px solid var(--border); gap: 10px; }
        .model-row:last-child { border-bottom: none; }
        .model-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .model-name { font-size: 12px; font-weight: 600; flex: 1; }
        .model-type { font-size: 11px; color: var(--text-tertiary); }
        .model-bar-wrap { flex: 2; }
        .model-bar-bg { height: 6px; background: var(--wf-fill); border-radius: 3px; overflow: hidden; }
        .model-bar-fill { height: 100%; border-radius: 3px; transition: width .6s ease; }
        .model-metric { font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 500; min-width: 44px; text-align: right; }
        .alert-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 18px; border-bottom: 1px solid var(--border); animation: fadeIn .2s ease; }
        .alert-item:last-child { border-bottom: none; }
        .alert-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .alert-icon.amber { background: var(--amber-bg); }
        .alert-icon.green { background: var(--green-bg); }
        .alert-icon.red { background: var(--red-bg); }
        .alert-icon.purple { background: var(--accent-lstm-light); }
        .alert-body { flex: 1; }
        .alert-title { font-size: 12px; font-weight: 600; }
        .alert-desc { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
        .alert-time { font-size: 10px; color: var(--text-tertiary); font-family: 'DM Mono', monospace; white-space: nowrap; }
        .heatmap-wrap { padding: 16px 18px; }
        .hm-grid { display: grid; grid-template-columns: repeat(24, 1fr); gap: 2px; }
        .hm-cell { height: 20px; border-radius: 2px; cursor: pointer; transition: opacity .1s; }
        .hm-cell:hover { opacity: .75; }
        .hm-cell.l0 { background: #D1FAE5; }
        .hm-cell.l1 { background: #6EE7B7; }
        .hm-cell.l2 { background: #FEF3C7; }
        .hm-cell.l3 { background: #FCD34D; }
        .hm-cell.l4 { background: #F87171; }
        .hm-cell.l5 { background: #DC2626; }
        .hm-scale { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
        .hm-scale-bar { display: flex; gap: 2px; flex: 1; }
        .hm-scale-cell { flex: 1; height: 8px; border-radius: 1px; }
        .peak-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 18px; }
        .peak-item { padding: 12px; background: var(--bg); border-radius: 8px; }
        .peak-item-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-tertiary); font-weight: 600; }
        .peak-item-val { font-size: 20px; font-weight: 600; font-family: 'DM Mono', monospace; margin-top: 4px; letter-spacing: -.5px; }
        .peak-item-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
        #peakVal { color: var(--amber); }
        .model-indicator-strip { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 8px; border: 1px solid; font-size: 12px; font-weight: 500; transition: all .2s; }
        .model-indicator-strip.xgb { background: var(--accent-light); border-color: rgba(76,121,184,.25); color: var(--accent); }
        .model-indicator-strip.lstm { background: var(--accent-lstm-light); border-color: rgba(124,58,237,.25); color: var(--accent-lstm); }
        .mis-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; animation: brandPulse 2s ease-in-out infinite; }
        .mis-dot.xgb { background: var(--accent); }
        .mis-dot.lstm { background: var(--accent-lstm); }
        .mis-text { flex: 1; }
        .mis-label { font-weight: 700; font-size: 13px; }
        .mis-sub { font-size: 11px; opacity: .75; margin-top: 1px; }
        .skeleton { background: linear-gradient(90deg, var(--wf-fill) 25%, var(--border) 50%, var(--wf-fill) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px; display: inline-block; }
        .placeholder-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .placeholder-line { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
        .placeholder-line:last-child { margin-bottom: 0; }

        @media (max-width: 1280px) {
          .main-grid, .bottom-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 980px) {
          .layout { flex-direction: column; height: auto; }
          aside { width: 100%; min-width: 0; border-right: none; border-bottom: 1px solid var(--border); }
          nav { padding: 0 16px; overflow-x: auto; }
          main { padding: 16px; }
          .kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}