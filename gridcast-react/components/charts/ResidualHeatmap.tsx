'use client';

import { ResidualData } from '@/types';
import { useMemo } from 'react';

interface ResidualHeatmapProps {
  data: ResidualData | null;
  loading: boolean;
}

export function ResidualHeatmap({ data, loading }: ResidualHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!data) return [];

    // Create 24x7 grid (24 hours × 7 days)
    const matrix = data.heatmap_matrix;
    if (Array.isArray(matrix) && matrix.length > 0) {
      const grid: any[] = [];
      for (let day = 0; day < 7; day++) {
        const dayValues = matrix[day] ?? [];
        for (let hour = 0; hour < 24; hour++) {
          const error = Number(dayValues[hour] ?? 0);
          const level = error < 1.5 ? 0 : error < 2.5 ? 1 : error < 3.5 ? 2 : error < 4.5 ? 3 : error < 5.5 ? 4 : 5;
          grid.push({
            day,
            hour,
            error,
            level,
          });
        }
      }
      return grid;
    }

    if (Array.isArray(data.residuals) && data.residuals.length > 0) {
      const grid: any[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const cell = data.residuals.find(
            (r) => r.day === day && r.hour === hour
          );
          grid.push({
            day,
            hour,
            error: cell?.error || 0,
            level: cell?.level || 0,
          });
        }
      }
      return grid;
    }

    const grid: any[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        grid.push({
          day,
          hour,
          error: 0,
          level: 0,
        });
      }
    }
    return grid;
  }, [data]);

  const getLevelColor = (level: number) => {
    const colors = [
      '#D1FAE5', // 0 - green
      '#6EE7B7', // 1 - light green
      '#FEF3C7', // 2 - yellow
      '#FCD34D', // 3 - amber
      '#F87171', // 4 - light red
      '#DC2626', // 5 - red
    ];
    return colors[level] || colors[5];
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 h-32 animate-pulse flex items-center justify-center">
        <span className="text-sm text-[#94a3b8]">Loading heatmap...</span>
      </div>
    );
  }

  if (!data || heatmapData.length === 0) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 flex items-center justify-center">
        <span className="text-sm text-[#94a3b8]">No residual data</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-[#003d99] rounded-full" />
          <h3 className="text-16px font-extrabold text-[#003d99] tracking-tight uppercase ml-2">
            Residual Errors (7 Days × 24 Hours)
          </h3>
        </div>
        <p className="text-11px text-slate-400 font-bold uppercase tracking-wider ml-[22px]">
          Error distribution heatmap · Green = Optimal
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
        {heatmapData.map((cell, idx) => (
          <div
            key={idx}
            className="h-5 rounded-sm cursor-pointer hover:opacity-75 transition-opacity group relative"
            style={{ background: getLevelColor(cell.level) }}
            title={`Day ${cell.day}, Hour ${cell.hour}: ${cell.error.toFixed(2)}`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0f1b2f] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
              {`${cell.error.toFixed(2)} @ Day ${cell.day} H${cell.hour}`}
            </div>
          </div>
        ))}
      </div>

      {/* Scale Legend */}
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className="text-[#94a3b8]">Scale:</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className="w-4 h-3 rounded-sm"
              style={{ background: getLevelColor(level) }}
              title={`Level ${level}`}
            ></div>
          ))}
        </div>
        <span className="text-[#94a3b8] ml-auto">Low ← Error → High</span>
      </div>
    </div>
  );
}
