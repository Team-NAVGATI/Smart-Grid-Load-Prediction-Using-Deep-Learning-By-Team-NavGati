export type ModelType = 'xgboost' | 'lstm';

export type Horizon = '24h' | '48h' | '72h';

export type Region = 'north' | 'south' | 'east' | 'west';

export interface ForecastPoint {
  datetime: string;
  load_mw: number;
}

export interface HorizonMetrics {
  mae: number;
  rmse: number;
  mape: number;
}

export interface ForecastData {
  generated_at: string;
  model: string;
  data_end: string;
  trained_at: string;
  horizon: Horizon;
  horizon_h: number;
  steps: number;
  horizon_metrics: {
    '24h': HorizonMetrics;
    '48h': HorizonMetrics;
    '72h': HorizonMetrics;
  };
  forecast: ForecastPoint[];
}

export interface ResidualCell {
  day: number;
  hour: number;
  error: number;
  level: number; // 0-5 for color coding
}

export interface ResidualData {
  model: string;
  generated_at: string;
  residuals?: ResidualCell[];
  heatmap_matrix?: number[][];
  heatmap_info?: {
    rows?: string;
    cols?: string;
    values?: string;
    n_cutoffs?: number;
    cutoff_step?: string;
  };
  heatmap_flat?: number[];
}

export interface ModelConfig {
  id: ModelType;
  name: string;
  color: string;
  lightBg: string;
  mutedColor: string;
  description: string;
  subtitle: string;
}

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  xgboost: {
    id: 'xgboost',
    name: 'XGBoost',
    color: '#4c79b8',
    lightBg: '#f0f4fb',
    mutedColor: '#6b91c7',
    description: 'XGBoost — Active Model',
    subtitle: 'Season-aware gradient boosting · Autoregressive multi-horizon',
  },
  lstm: {
    id: 'lstm',
    name: 'LSTM',
    color: '#7C3AED',
    lightBg: '#f5f3ff',
    mutedColor: '#9d6ef7',
    description: 'LSTM — Active Model',
    subtitle: 'Deep learning sequence model · Temporal pattern recognition',
  },
};
