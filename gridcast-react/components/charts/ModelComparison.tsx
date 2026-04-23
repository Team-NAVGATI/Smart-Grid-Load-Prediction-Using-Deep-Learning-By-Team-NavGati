'use client';

import Chart from 'react-apexcharts';
import { useMemo } from 'react';
import { ForecastData, Horizon } from '@/types';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModelComparisonProps {
  xgboostData: ForecastData | null;
  lstmData: ForecastData | null;
  horizon: Horizon;
  loading: boolean;
}

export function ModelComparison({
  xgboostData,
  lstmData,
  horizon,
  loading,
}: ModelComparisonProps) {
  const chartOptions = useMemo(() => {
    if (!xgboostData || !lstmData) {
      return {
        chart: { type: 'bar' as const },
        series: [],
        xaxis: { categories: [] },
      };
    }

    const metrics = ['MAPE (%)'];
    const xgbValues = [
      xgboostData.horizon_metrics[horizon]?.mape || 0,
    ];
    const lstmValues = [
      lstmData.horizon_metrics[horizon]?.mape || 0,
    ];

    // Find max value to set headroom
    const allValues = [...xgbValues, ...lstmValues];
    const maxValue = Math.max(...allValues);

    return {
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        fontFamily: 'DM Sans, sans-serif',
        background: 'transparent',
        height: 250,
      },
      series: [
        {
          name: 'XGBoost',
          data: xgbValues,
          color: '#4c79b8',
        },
        {
          name: 'LSTM',
          data: lstmValues,
          color: '#7C3AED',
        },
      ],
      xaxis: {
        categories: metrics,
        labels: {
          style: {
            fontSize: '12px',
            colors: '#94a3b8',
            fontWeight: 600,
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        max: maxValue * 1.25, // Add 25% headroom for data labels
        title: {
          text: 'Error (%)',
          style: {
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 600,
          },
        },
        labels: {
          style: {
            fontSize: '11px',
            colors: '#94a3b8',
          },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: '10px',
          colors: ['#475569'],
          fontWeight: 700,
        },
        formatter: (val: number) => `${val.toFixed(2)}%`,
      },
      tooltip: {
        enabled: true,
        theme: 'dark',
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `${val.toFixed(3)}%`,
        },
      },
      legend: {
        position: 'top' as const,
        horizontalAlign: 'right' as const,
        fontSize: '12px',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        labels: {
          colors: '#64748b'
        }
      },
      grid: {
        show: true,
        borderColor: '#e2e8f0',
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '45%',
          borderRadius: 6,
          dataLabels: {
            position: 'top' as const,
          },
        },
      },
    };
  }, [xgboostData, lstmData, horizon]);

  if (loading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 h-72 animate-pulse flex items-center justify-center">
        <span className="text-sm text-[#94a3b8]">Syncing comparison data...</span>
      </div>
    );
  }

  if (!xgboostData || !lstmData) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 flex items-center justify-center h-72">
        <span className="text-sm text-[#94a3b8]">No comparison data available</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-6 border-b border-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-[#003d99] rounded-full" />
          <h3 className="text-16px font-extrabold text-[#003d99] tracking-tight uppercase ml-2">
            Model Comparison
          </h3>
        </div>
        <p className="text-11px text-slate-400 font-bold uppercase tracking-wider ml-[22px]">
          Backtest MAPE (%): {horizon} Horizon
        </p>
      </div>

      <div className="px-4 py-8 flex-1">
        <Chart
          options={chartOptions}
          series={chartOptions.series}
          type="bar"
          height={240}
        />
      </div>
    </div>
  );
}
