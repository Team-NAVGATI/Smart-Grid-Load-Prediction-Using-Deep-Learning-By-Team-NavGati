'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardNavbar } from './DashboardNavbar';
import { Horizon, ModelType, Region } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  activeModel: ModelType;
  activeHorizon: Horizon;
  activeTab: 'forecast' | 'analysis' | 'models' | 'reports';
  selectedRegions: Region[];
  loading: boolean;
  onModelSwitch: (model: ModelType) => void;
  onHorizonChange: (horizon: Horizon) => void;
  onTabChange: (tab: 'forecast' | 'analysis' | 'models' | 'reports') => void;
  onRegionToggle: (region: Region) => void;
}

export function DashboardLayout({
  children,
  activeModel,
  activeHorizon,
  activeTab,
  selectedRegions,
  loading,
  onModelSwitch,
  onHorizonChange,
  onTabChange,
  onRegionToggle,
}: DashboardLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Navbar */}
      <DashboardNavbar
        activeModel={activeModel}
        activeHorizon={activeHorizon}
        activeTab={activeTab}
        onModelSwitch={onModelSwitch}
        onHorizonChange={onHorizonChange}
        onTabChange={onTabChange}
        loading={loading}
      />

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeModel={activeModel}
          selectedRegions={selectedRegions}
          onRegionToggle={onRegionToggle}
          onModelSwitch={onModelSwitch}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
