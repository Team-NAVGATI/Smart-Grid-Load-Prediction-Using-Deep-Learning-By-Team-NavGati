'use client';

import { ForecastData, ModelType } from '@/types';
import Chart from 'react-apexcharts';
import { useMemo } from 'react';

interface ForecastChartProps {
  data: ForecastData | null;
  model: ModelType;
  loading: boolean;
}

export function ForecastChart({ data, model, loading }: ForecastChartProps) {
  const modelConfig = {
    xgboost: { color: '#4c79b8', name: 'XGBoost' },
    lstm: { color: '#7C3AED', name: 'LSTM' },
  };

  const config = modelConfig[model];

  const chartOptions = useMemo(() => {
    if (!data) {
      return {
        chart: {
          type: 'line' as const,
          toolbar: { show: false },
          sparkline: { enabled: false },
        },
        series: [],
        xaxis: { type: 'datetime' as const },
      };
    }

    const seriesData = data.forecast.map(p => ({
      x: new Date(p.datetime).getTime(),
      y: p.load_mw
    }));

    const upperBand = data.forecast.map(p => ({
      x: new Date(p.datetime).getTime(),
      y: p.load_mw * 1.05
    }));

    const lowerBand = data.forecast.map(p => ({
      x: new Date(p.datetime).getTime(),
      y: p.load_mw * 0.95
    }));

    return {
      chart: {
        type: 'line' as const,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        sparkline: { enabled: false },
        background: 'transparent',
        fontFamily: 'DM Sans, sans-serif',
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
      },
      series: [
        {
          name: `${config.name} Forecast`,
          data: seriesData,
          color: config.color,
        },
        {
          name: 'Upper Band (±5%)',
          data: upperBand,
          color: 'rgba(79, 172, 254, 0)',
        },
        {
          name: 'Lower Band (±5%)',
          data: lowerBand,
          color: 'rgba(79, 172, 254, 0)',
        },
      ],
      stroke: {
        width: [3, 0, 0],
        curve: 'smooth' as const,
        dashArray: [0, 4, 4]
      },
      xaxis: {
        type: 'datetime' as const,
        labels: {
          datetimeUTC: false,
          style: {
            fontSize: '11px',
            colors: '#94a3b8',
          },
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'dd MMM',
            hour: 'HH:mm',
          },
        },
        tickAmount: 8,
        axisBorder: { show: true, color: '#e2e8f0' },
        axisTicks: { show: false },
      },
      yaxis: {
        title: {
          text: 'Load (MW)',
          style: {
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 500,
          },
        },
        labels: {
          formatter: (val: number) => Math.round(val).toLocaleString(),
          style: {
            fontSize: '11px',
            colors: '#94a3b8',
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      tooltip: {
        enabled: true,
        theme: 'dark',
        x: {
          format: 'dd MMM yyyy, HH:mm',
        },
        y: {
          formatter: (val: number) => Math.round(val).toLocaleString() + ' MW',
        },
        style: {
          fontSize: '12px',
          fontFamily: 'DM Sans, sans-serif',
        },
      },
      grid: {
        show: true,
        borderColor: '#e2e8f0',
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      legend: {
        position: 'bottom' as const,
        horizontalAlign: 'left' as const,
        fontSize: '12px',
        fontFamily: 'DM Sans, sans-serif',
      },
    };
  }, [data, config]);

  if (loading) {
    return (
      <div className="h-[300px] bg-[#f8faff] rounded-lg animate-pulse flex items-center justify-center border border-[#e2e8f0]">
        <span className="text-sm text-[#94a3b8]">Loading chart...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-[300px] bg-white rounded-lg border border-[#e2e8f0] flex items-center justify-center">
        <span className="text-sm text-[#94a3b8]">No data available</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-[#003d99] rounded-full" />
          <h3 className="text-16px font-extrabold text-[#003d99] tracking-tight uppercase ml-2">
            Forecast: {data.horizon} Ahead
          </h3>
        </div>
        <p className="text-11px text-slate-400 font-bold uppercase tracking-wider ml-[22px]">
          Engine Sync: {new Date(data.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Chart
        options={chartOptions}
        series={chartOptions.series}
        type="line"
        height={300}
      />
    </div>
  );
}
