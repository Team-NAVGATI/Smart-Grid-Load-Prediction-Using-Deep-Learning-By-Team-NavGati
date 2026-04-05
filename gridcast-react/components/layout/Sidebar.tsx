'use client';

import { Region } from '@/types';
import { useState } from 'react';

interface SidebarProps {
  activeModel: 'xgboost' | 'lstm';
  selectedRegions: Region[];
  onRegionToggle: (region: Region) => void;
  onModelSwitch: (model: 'xgboost' | 'lstm') => void;
}

const REGIONS: Region[] = ['north', 'south', 'east', 'west'];

export function Sidebar({
  activeModel,
  selectedRegions,
  onRegionToggle,
  onModelSwitch,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const getModelColors = (model: 'xgboost' | 'lstm') => {
    return model === 'xgboost'
      ? { bg: '#f0f4fb', color: '#003d99', dot: '#4c79b8' }
      : { bg: '#f5f3ff', color: '#7C3AED', dot: '#7C3AED' };
  };

  return (
    <aside
      className={`${
        isOpen ? 'w-[200px]' : 'w-0'
      } bg-white border-r border-[#e2e8f0] overflow-hidden transition-all duration-300 flex flex-col min-h-[calc(100vh-52px)]`}
    >
      {/* Regions Section */}
      <div className="p-3">
        <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.08em] px-2 py-2 mb-1">
          Regions
        </div>

        <div className="space-y-1">
          {REGIONS.map((region) => (
            <label
              key={region}
              className="flex items-center gap-2 px-2 py-2 rounded-md text-[13px] font-medium text-[#64748b] hover:bg-[#f1f5f9] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedRegions.includes(region)}
                onChange={() => onRegionToggle(region)}
                className="w-4 h-4 rounded border border-[#cfd8e3] cursor-pointer"
              />
              <span className="capitalize">{region}</span>
            </label>
          ))}
        </div>

        {selectedRegions.length > 0 && (
          <div className="mt-2 px-2 py-1 text-[11px] text-[#94a3b8]">
            {selectedRegions.length} selected
          </div>
        )}
      </div>

      {/* Models Section */}
      <div className="px-3 mt-3">
        <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.08em] px-2 py-2 mb-1">
          Models
        </div>

        <div className="space-y-1">
          {['xgboost', 'lstm'].map((model) => {
            const isActive = activeModel === model;
            const colors = getModelColors(model as 'xgboost' | 'lstm');

            return (
              <button
                key={model}
                onClick={() => onModelSwitch(model as 'xgboost' | 'lstm')}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#003d99] shadow-sm'
                    : 'text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: colors.dot }}
                ></span>
                <span className="flex-1 text-left capitalize">
                  {model.toUpperCase()}
                </span>
                {isActive && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: colors.bg, color: colors.color }}
                  >
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Region Info */}
      <div className="mt-auto px-3 pb-3">
        <div className="border border-[#e2e8f0] rounded-lg p-2.5">
          <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.07em] mb-1">
            Active Region
          </div>
          <div className="text-[13px] font-bold text-[#003d99] mb-0.5">
            {selectedRegions.length > 0
              ? selectedRegions.join('/').toUpperCase()
              : 'None'}
          </div>
          <div className="text-[11px] text-[#94a3b8]">NRLDC · 15 min</div>
        </div>
      </div>
    </aside>
  );
}
