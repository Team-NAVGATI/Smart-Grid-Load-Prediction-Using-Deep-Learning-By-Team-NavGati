'use client';

import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  status?: 'good' | 'warn' | 'bad' | 'neutral';
  icon?: ReactNode;
  highlighted?: boolean;
  modelColor?: string;
}

export function KPICard({
  label,
  value,
  subtext,
  status = 'neutral',
  icon,
  highlighted = false,
  modelColor,
}: KPICardProps) {
  const statusColors = {
    good: '#00e676',
    warn: '#ffab00',
    bad: '#ff1744',
    neutral: '#003d99',
  };

  const statusColor = statusColors[status];

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        highlighted
          ? 'border-[--model-color] bg-gradient-to-br from-white to-[--model-color-light]'
          : 'border-[#e2e8f0] bg-white hover:border-[--model-color]'
      }`}
      style={
        {
          '--model-color': modelColor,
          '--model-color-light': modelColor ? `${modelColor}15` : '#f0f4fb',
        } as any
      }
    >
      <div className="flex items-start justify-between gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-[0.06em]">
            {label}
          </p>
          <p
            className="text-[24px] font-semibold font-dmmono mt-1.5 tracking-tight"
            style={{ color: statusColor }}
          >
            {value}
          </p>
          {subtext && (
            <p className="text-[11px] text-[#94a3b8] mt-1">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}
