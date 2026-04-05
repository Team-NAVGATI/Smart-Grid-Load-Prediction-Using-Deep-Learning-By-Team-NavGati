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
        xaxis: { categories: [] },
      };
    }

    // Prepare data
    const dates = data.forecast.map((p) => p.datetime);
    const values = data.forecast.map((p) => p.load_mw);

    // Calculate confidence bands (±5%)
    const upper = values.map((v) => v * 1.05);
    const lower = values.map((v) => v * 0.95);

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
      },
      series: [
        {
          name: `${config.name} Forecast`,
          data: values,
          type: 'line',
          color: config.color,
          stroke: {
            width: 2.5,
            curve: 'smooth',
          },
          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 0.1,
              opacityFrom: 0.3,
              opacityTo: 0,
              stops: [0, 100],
              colorStops: [
                {
                  offset: 0,
                  color: config.color,
                  opacity: 0.3,
                },
                {
                  offset: 100,
                  color: config.color,
                  opacity: 0,
                },
              ],
            },
          },
          tooltip: {
            enabled: true,
          },
        },
        {
          name: 'Upper Band (±5%)',
          data: upper,
          type: 'line',
          color: 'rgba(79, 172, 254, 0)',
          stroke: {
            width: 0,
            dashArray: 3,
          },
          fill: {
            type: 'gradient',
            opacity: 0.15,
            gradient: {
              shadeIntensity: 0,
              opacityFrom: 0,
              opacityTo: 0,
            },
          },
          tooltip: { enabled: false },
        },
        {
          name: 'Lower Band (±5%)',
          data: lower,
          type: 'line',
          color: 'rgba(79, 172, 254, 0)',
          stroke: {
            width: 0,
            dashArray: 3,
          },
          fill: {
            type: 'gradient',
            opacity: 0.15,
            gradient: {
              shadeIntensity: 0,
              opacityFrom: 0,
              opacityTo: 0,
            },
          },
          tooltip: { enabled: false },
        },
      ],
      xaxis: {
        categories: dates,
        labels: {
          formatter: (val: string) => {
            const date = new Date(val);
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          },
          style: {
            fontSize: '11px',
            colors: '#94a3b8',
          },
        },
        axisBorder: { show: true, color: '#e2e8f0' },
        axisTicks: { show: false },
        type: 'category' as const,
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
          formatter: (val: any) => {
            const date = new Date(val);
            return date.toLocaleString('en-US');
          },
        },
        y: {
          formatter: (val: number) => Math.round(val) + ' MW',
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
      responsive: [
        {
          breakpoint: 1024,
          options: {
            chart: { height: 300 },
          },
        },
      ],
    };
  }, [data, model, config]);

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
    <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm">
      <div className="mb-2">
        <h3 className="text-13px font-semibold text-[#003d99]">
          Forecast: {data.horizon} Ahead
        </h3>
        <p className="text-11px text-[#94a3b8] mt-0.5">
          Generated: {new Date(data.generated_at).toLocaleString()}
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
