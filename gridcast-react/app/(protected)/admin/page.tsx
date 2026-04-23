'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types
import { ForecastData, ResidualData, ModelType, Horizon, MODEL_CONFIGS } from '@/types';

// API
import { fetchForecastData, fetchResidualData } from '@/lib/api';

// Components
import { ForecastChart } from '@/components/charts/ForecastChart';
import { ModelComparison } from '@/components/charts/ModelComparison';
import { ResidualHeatmap } from '@/components/charts/ResidualHeatmap';
import { KPICard } from '@/components/dashboard/KPICard';

// Dynamic background
const DashGridCanvas = dynamic(
  () => import('@/components/three/DashGridCanvas'),
  { ssr: false }
);

type AdminTab = 'forecast' | 'analysis' | 'models' | 'reports';

export default function AdminDashboard() {
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('forecast');
  const [activeModel, setActiveModel] = useState<ModelType>('xgboost');
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('24h');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data for both models to ensure comparison works
  const [xgboostData, setXgboostData] = useState<ForecastData | null>(null);
  const [lstmData, setLstmData] = useState<ForecastData | null>(null);
  const [residualData, setResidualData] = useState<ResidualData | null>(null);

  // Fetch all necessary data
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch both models and residuals in parallel
        const [xgb, lstm, res] = await Promise.all([
          fetchForecastData('xgboost', activeHorizon),
          fetchForecastData('lstm', activeHorizon),
          fetchResidualData(activeModel)
        ]);

        if (mounted) {
          setXgboostData(xgb);
          setLstmData(lstm);
          setResidualData(res);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
        if (mounted) {
          setError('Failed to sync with predictive engines. Please check backend services.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [activeHorizon, activeModel]);

  const currentData = activeModel === 'xgboost' ? xgboostData : lstmData;
  const config = MODEL_CONFIGS[activeModel];

  // Sidebar Items
  const navItems = [
    { id: 'forecast', label: 'Forecast', icon: '📊' },
    { id: 'analysis', label: 'Analysis', icon: '📈' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'reports', label: 'Reports', icon: '📄' },
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020a14] text-[#ff1744]">
        <div className="text-center p-8 border border-[#ff1744] rounded-lg bg-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-bold mb-4">Critical Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-[#ff1744] text-white rounded-md font-medium"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020a14] font-sans text-[#f8faff] flex overflow-hidden">
      {/* Three.js Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <DashGridCanvas />
      </div>

      {/* Sidebar */}
      <aside className="w-[240px] bg-black/40 backdrop-blur-3xl border-r border-white/10 flex flex-col z-10 relative">
        <div className="p-6 border-b border-white/5">
          <Link href="/landing" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold tracking-tight">Grid<span className="text-cyan-400">Cast</span> Admin</span>
          </Link>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Operational Views</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Active Engine</p>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }} 
              />
              <span className="text-xs font-bold">{config.name} v2.4</span>
            </div>
            <p className="text-[9px] text-white/40 mt-1 italic">NRLDC North Region Cluster</p>
          </div>
          
          <button 
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
          >
            <span>←</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 custom-scrollbar">
        {/* Top Header */}
        <header className="sticky top-0 h-20 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              {(['xgboost', 'lstm'] as ModelType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeModel === m 
                      ? 'bg-white text-black shadow-lg' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              {(['24h', '48h', '72h'] as Horizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setActiveHorizon(h)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeHorizon === h 
                      ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Server Time</p>
              <p className="text-sm font-dmmono font-bold text-cyan-400">
                {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400">
              AD
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 max-w-[1600px] mx-auto w-full">
          {activeTab === 'forecast' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">Load Forecast <span className="text-white/30">—</span> <span className="text-cyan-400">{activeHorizon}</span></h1>
                <p className="text-white/50 mt-2 max-w-2xl">
                  Production-grade predictive modeling for the NRLDC North Region grid nodes. 
                  Synchronized with real-time SCADA telemetry.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard 
                  label="Forecast MAPE"
                  value={loading ? '...' : `${currentData?.horizon_metrics[activeHorizon]?.mape?.toFixed(2) ?? '--'}%`}
                  status={loading ? 'neutral' : (currentData?.horizon_metrics[activeHorizon]?.mape ?? 10) < 3 ? 'good' : 'warn'}
                  subtext="Backtest Avg Error"
                  icon={<span className="text-2xl">🎯</span>}
                  modelColor={config.color}
                />
                <KPICard 
                  label="Predicted Peak"
                  value={loading ? '...' : `${Math.max(...(currentData?.forecast.map(p => p.load_mw) ?? [0])).toLocaleString()} MW`}
                  subtext="24h Maximum"
                  icon={<span className="text-2xl">📈</span>}
                  modelColor={config.color}
                />
                <KPICard 
                  label="Model Latency"
                  value="1.2s"
                  subtext="Inference Roundtrip"
                  icon={<span className="text-2xl">⚡</span>}
                  modelColor={config.color}
                />
                <KPICard 
                  label="Last Trained"
                  value={loading ? '...' : currentData?.trained_at.split(' ')[0] ?? '--'}
                  subtext="Season-aware refresh"
                  icon={<span className="text-2xl">🧠</span>}
                  modelColor={config.color}
                  highlighted
                />
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold">Grid Load Visualization</h2>
                        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-bold">Model: {config.name} · {activeHorizon} Window</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          <div className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-[10px] font-bold uppercase">Forecast</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[400px]">
                      <ForecastChart 
                        data={currentData} 
                        model={activeModel} 
                        loading={loading} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Model Comparison - CRITICAL: Shows both errors */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                    <ModelComparison 
                      xgboostData={xgboostData} 
                      lstmData={lstmData} 
                      horizon={activeHorizon}
                      loading={loading} 
                    />
                  </div>

                  {/* Operational Alerts */}
                  <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span>🔔</span> Engine Alerts
                    </h3>
                    <div className="space-y-4">
                      <div className="flex gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5" />
                        <div>
                          <p className="text-sm font-bold text-cyan-400">Forecast Synced</p>
                          <p className="text-[11px] text-white/50">Successfully fetched {activeHorizon} matrix for {activeModel}.</p>
                        </div>
                      </div>
                      <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-400">Peak Load Warning</p>
                          <p className="text-[11px] text-white/50">Approaching seasonal peak in next 4 hours. MAPE variance may increase.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap Section */}
              <div className="mt-8">
                <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
                   <ResidualHeatmap data={residualData} loading={loading} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="animate-in fade-in duration-500">
               <h1 className="text-4xl font-bold tracking-tight mb-8">Performance Analysis</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                   <h3 className="text-xl font-bold mb-4">Error Pattern Insights</h3>
                   <ul className="space-y-4 text-white/60">
                     <li className="flex gap-3"><span className="text-cyan-400">•</span> Morning transition slots (06:00-09:00) show higher variance than mid-day across both models.</li>
                     <li className="flex gap-3"><span className="text-cyan-400">•</span> XGBoost performs superior in seasonal transitions while LSTM excels in steady-state weekend patterns.</li>
                     <li className="flex gap-3"><span className="text-cyan-400">•</span> Residual drift observed at 14:00 IST in west nodes - check SCADA calibration.</li>
                   </ul>
                 </div>
                 <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                   <h3 className="text-xl font-bold mb-4">Operational Status</h3>
                   <div className="space-y-6">
                     <div>
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-white/40">
                         <span>API Availability</span>
                         <span className="text-cyan-400">99.9%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full w-[99.9%] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-white/40">
                         <span>Data Pipeline Health</span>
                         <span className="text-green-400">Operational</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full w-full bg-green-400" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="animate-in fade-in duration-500">
               <h1 className="text-4xl font-bold tracking-tight mb-8">Forecasting Models</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {(['xgboost', 'lstm'] as ModelType[]).map((m) => {
                   const cfg = MODEL_CONFIGS[m];
                   return (
                     <div key={m} className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all group">
                       <div className="flex items-center gap-4 mb-4">
                         <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                           <span className="text-2xl">{m === 'xgboost' ? '🌳' : '🧠'}</span>
                         </div>
                         <div>
                           <h4 className="text-xl font-bold">{cfg.name}</h4>
                           <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Direct Forecast</span>
                         </div>
                       </div>
                       <p className="text-sm text-white/50 mb-6">{cfg.subtitle}</p>
                       <div className="space-y-2">
                         <div className="flex justify-between text-xs">
                           <span className="text-white/40">Status</span>
                           <span className="text-green-400 font-bold">READY</span>
                         </div>
                         <div className="flex justify-between text-xs">
                           <span className="text-white/40">Horizon Support</span>
                           <span className="text-white/80">24h, 48h, 72h</span>
                         </div>
                       </div>
                     </div>
                   );
                 })}
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/5 border-dashed flex flex-col items-center justify-center text-center opacity-50">
                    <span className="text-2xl mb-2">➕</span>
                    <h4 className="text-sm font-bold">Add Ensemble Layer</h4>
                    <p className="text-[10px] text-white/40 mt-1">Coming Q3 2026</p>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="animate-in fade-in duration-500">
               <h1 className="text-4xl font-bold tracking-tight mb-8">System Reports</h1>
               <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                   📅
                 </div>
                 <h3 className="text-xl font-bold mb-2">Operational Digest</h3>
                 <p className="text-white/50 text-sm max-w-md mx-auto mb-6">
                   Automated summaries of grid stability and forecast accuracy for stakeholder review.
                 </p>
                 <div className="flex gap-4 justify-center">
                   <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Download PDF</button>
                   <button className="px-6 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/20 transition-all">Export CSV</button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .font-dmmono {
          font-family: 'JetBrains Mono', 'DM Mono', monospace;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
