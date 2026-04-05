'use client';

import { Horizon, ModelType } from '@/types';
import { useState } from 'react';

interface DashboardNavbarProps {
  activeModel: ModelType;
  activeHorizon: Horizon;
  activeTab: 'forecast' | 'analysis' | 'models' | 'reports';
  onModelSwitch: (model: ModelType) => void;
  onHorizonChange: (horizon: Horizon) => void;
  onTabChange: (tab: 'forecast' | 'analysis' | 'models' | 'reports') => void;
  loading: boolean;
}

const TABS = ['forecast', 'analysis', 'models', 'reports'] as const;
const HORIZONS: Horizon[] = ['24h', '48h', '72h'];

export function DashboardNavbar({
  activeModel,
  activeHorizon,
  activeTab,
  onModelSwitch,
  onHorizonChange,
  onTabChange,
  loading,
}: DashboardNavbarProps) {
  const [modelLoading, setModelLoading] = useState(false);

  const handleModelSwitch = (model: ModelType) => {
    setModelLoading(true);
    onModelSwitch(model);
    setTimeout(() => setModelLoading(false), 500);
  };

  const modelConfig = {
    xgboost: {
      color: '#4c79b8',
      lightBg: '#f0f4fb',
    },
    lstm: {
      color: '#7C3AED',
      lightBg: '#f5f3ff',
    },
  };

  const model = modelConfig[activeModel];

  return (
    <>
      {/* Loading bar */}
      {modelLoading && (
        <div className="h-[2px] bg-[#e2e8f0] fixed top-[52px] left-0 right-0 z-50 overflow-hidden">
          <div
            className="h-full bg-[--model-color] animate-pulse"
            style={{ background: model.color, width: '80%' }}
          ></div>
        </div>
      )}

      <nav className="sticky top-0 z-40 h-[52px] flex items-center px-6 gap-5 bg-white border-b border-[#e2e8f0]">
        {/* Logo */}
        <div className="font-syne text-[17px] font-extrabold text-[#003d99] flex items-center gap-[7px] tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse"></span>
          GridCast
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-[#e2e8f0]"></div>

        {/* Tabs */}
        <div className="flex gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all ${
                activeTab === tab
                  ? 'bg-[#f0f4fb] text-[#003d99] shadow-[inset_0_-2px_0_#d97706]'
                  : 'text-[#64748b] hover:text-[#003d99]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-3">
          {/* Horizon selector - only on forecast tab */}
          {activeTab === 'forecast' && (
            <div className="flex gap-1">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  onClick={() => onHorizonChange(h)}
                  className={`h-6 px-2.5 rounded-md text-[12px] font-semibold transition-all ${
                    activeHorizon === h
                      ? 'bg-[#003d99] text-white'
                      : 'bg-[#f1f5f9] text-[#64748b] hover:text-[#003d99]'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          {/* Model switcher */}
          <div className="text-[11px] text-[#94a3b8] font-medium">Model:</div>
          <div className="flex items-center bg-[#f1f5f9] rounded-lg p-0.5 gap-0.5 border border-[#e2e8f0]">
            {['xgboost', 'lstm'].map((m) => {
              const modelColors =
                modelConfig[m as 'xgboost' | 'lstm'];
              const isActive = activeModel === m;

              return (
                <button
                  key={m}
                  onClick={() =>
                    handleModelSwitch(m as 'xgboost' | 'lstm')
                  }
                  disabled={loading}
                  className={`h-6 px-3 rounded-md border-none font-semibold text-[12px] transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                    isActive
                      ? 'bg-white text-[#003d99] shadow-sm'
                      : 'bg-transparent text-[#64748b]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: modelColors.color,
                    }}
                  ></span>
                  {m.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Status pill */}
          <div className="text-[11px] text-[#94a3b8] font-medium px-2 py-1 bg-[#f1f5f9] rounded-md">
            {loading ? '⏳ Loading...' : '✓ Ready'}
          </div>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#8fd9e8] flex-shrink-0"></div>
        </div>
      </nav>
    </>
  );
}
