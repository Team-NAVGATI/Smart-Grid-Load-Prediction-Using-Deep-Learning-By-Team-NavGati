"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import LoadChart from "@/components/charts/LoadChart";
import ErrorHeatmap from "@/components/charts/ErrorHeatmap";
import RegionGridMap from "@/components/grid/RegionGridMap";
import {
  REGIONS,
  SCHEDULED_TASKS,
  INDIA_GRID_EMISSION_FACTOR,
  INR_PER_KWH,
} from "@/lib/constants";
import { 
  Leaf, 
  Zap, 
  IndianRupee, 
  BarChart3, 
  Sun, 
  Target, 
  Calendar, 
  FileText, 
  TreePine, 
  Home, 
  Car, 
  Factory,
  ArrowLeft
} from "lucide-react";

const DashGridCanvas = dynamic(
  () => import("@/components/three/DashGridCanvas"),
  { ssr: false }
);

import { usePredictiveEngine } from "@/lib/predictiveEngine";

const BASE_MW = 8.5;

type Tab = "overview" | "forecast" | "carbon" | "schedule" | "reports";

export default function CompanyDashboard() {
  const router = useRouter();
  const { loading, error, savings, chartData, residualMatrix } = usePredictiveEngine(BASE_MW, "xgboost", "24h");
  
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [newTaskTime, setNewTaskTime] = useState("02:00");
  const [newTaskRegion, setNewTaskRegion] = useState("north");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gc-bg)", color: "var(--gc-cyan)" }}>
        Loading GridCast Engine...
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gc-bg)", color: "var(--gc-red)" }}>
        Error loading predictive models: {error}
      </div>
    );
  }

  const kpiCards = [
    {
      label: "CO₂ Avoided (MTD)",
      value: (savings.co2Saved / 12).toFixed(1),
      unit: "tCO₂",
      color: "var(--gc-green)",
      icon: <Leaf size={18} />,
      trend: "+8.2% vs last month",
    },
    {
      label: "Energy Optimised (MTD)",
      value: (savings.savingsMWh / 12).toFixed(0),
      unit: "MWh",
      color: "var(--gc-cyan)",
      icon: <Zap size={18} />,
      trend: "+12.1% vs last month",
    },
    {
      label: "Cost Saved (MTD)",
      value: `₹${((savings.inrSaved / 12) / 100000).toFixed(1)}L`,
      unit: "",
      color: "var(--gc-amber)",
      icon: <IndianRupee size={18} />,
      trend: "+9.5% vs last month",
    },
    {
      label: "Grid Carbon Intensity",
      value: INDIA_GRID_EMISSION_FACTOR.toString(),
      unit: "tCO₂/MWh",
      color: "var(--gc-violet)",
      icon: <BarChart3 size={18} />,
      trend: "CEA FY2022-23 baseline",
    },
    {
      label: "Renewable Share",
      value: "22",
      unit: "%",
      color: "var(--gc-green)",
      icon: <Sun size={18} />,
      trend: "Target: 40% by 2027",
    },
    {
      label: "Forecast Accuracy",
      value: "97.6",
      unit: "%",
      color: "var(--gc-cyan)",
      icon: <Target size={18} />,
      trend: "MAPE 2.4% · 24hr horizon",
    },
  ];

  const navItems: { icon: any; label: string; id: Tab }[] = [
    { icon: <BarChart3 size={14} />, label: "Overview", id: "overview" },
    { icon: <Zap size={14} />, label: "Load Forecast", id: "forecast" },
    { icon: <Leaf size={14} />, label: "Carbon Tracker", id: "carbon" },
    { icon: <Calendar size={14} />, label: "Schedule Optimizer", id: "schedule" },
    { icon: <FileText size={14} />, label: "Reports", id: "reports" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gc-bg)",
        fontFamily: "var(--gc-font-sans)",
        color: "var(--gc-text)",
        display: "flex",
      }}
    >
      {/* Three.js background */}
      <DashGridCanvas />

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: 220,
          background: "rgba(2,10,20,0.97)",
          borderRight: "1px solid rgba(6,182,212,0.1)",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <Link
          href="/landing"
          className="gc-logo"
          style={{
            paddingBottom: 20,
            borderBottom: "1px solid var(--gc-border)",
            marginBottom: 6,
          }}
        >
          <span className="gc-logo-dot" />
          Grid<span className="gc-logo-accent">Cast</span>
        </Link>

        <div className="gc-section-label" style={{ margin: "6px 0 4px", paddingLeft: 4 }}>
          Navigation
        </div>

        {navItems.map(({ icon, label, id }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`gc-sidebar-item${activeTab === id ? " is-active" : ""}`}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            {label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Active region widget */}
        <div
          style={{
            background: "rgba(6,182,212,0.05)",
            border: "1px solid rgba(6,182,212,0.12)",
            borderRadius: 8,
            padding: "14px 12px",
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              color: "var(--gc-cyan-dk)",
              fontWeight: 600,
              marginBottom: 6,
              fontFamily: "var(--gc-font-mono)",
              letterSpacing: "0.12em",
            }}
          >
            ACTIVE REGION
          </div>
          <div style={{ color: "var(--gc-text)", marginBottom: 2 }}>
            North (NRLDC)
          </div>
          <div style={{ color: "var(--gc-muted)" }}>15-min resolution</div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="gc-led gc-led-green" />
            <span style={{ color: "var(--gc-green)", fontSize: 11 }}>
              API Live
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push("/login")}
          className="gc-btn gc-btn-dim"
          style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
        >
          <ArrowLeft size={14} /> Sign Out
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <div
          style={{
            borderBottom: "1px solid rgba(6,182,212,0.08)",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(2,10,20,0.82)",
            backdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {navItems.map(({ icon, id }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  border: "none",
                  background:
                    activeTab === id ? "rgba(6,182,212,0.12)" : "transparent",
                  color:
                    activeTab === id ? "var(--gc-cyan)" : "var(--gc-muted)",
                  fontFamily: "var(--gc-font-sans)",
                  transition: "all 0.2s",
                }}
              >
                {icon}{" "}
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--gc-muted)",
                fontFamily: "var(--gc-font-mono)",
              }}
            >
              April 23, 2026 · 14:32 IST
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(6,182,212,0.18)",
                border: "1.5px solid var(--gc-cyan-dk)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--gc-cyan)",
              }}
            >
              TC
            </div>
          </div>
        </div>

        <div style={{ padding: "28px 28px" }}>
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  Company Energy Dashboard
                </h1>
                <p style={{ color: "var(--gc-muted)", fontSize: 13 }}>
                  Your real-time electricity intelligence — powered by GridCast AI
                </p>
              </div>

              {/* KPI Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {kpiCards.map((k) => (
                  <div key={k.label} className="gc-kpi">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--gc-muted)" }}>
                        {k.label}
                      </span>
                      <span style={{ fontSize: 18 }}>{k.icon}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: k.color,
                        fontFamily: "var(--gc-font-mono)",
                        letterSpacing: "-1px",
                      }}
                    >
                      {k.value}
                      <span style={{ fontSize: 13, marginLeft: 4 }}>
                        {k.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--gc-subtle)",
                        marginTop: 6,
                      }}
                    >
                      {k.trend}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load chart + CO2 equiv */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 340px",
                  gap: 20,
                  marginBottom: 24,
                }}
              >
                <div className="gc-card" style={{ padding: 22 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        Today&apos;s Load Curve
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gc-muted)" }}>
                        Actual vs Forecast (MW) · 15-min intervals
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--gc-green)",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 6,
                        padding: "4px 10px",
                      }}
                    >
                      MAPE 2.4%
                    </div>
                  </div>
                  <LoadChart 
                    height={180} 
                    actual={chartData?.actual} 
                    forecast={chartData?.forecast}
                  />
                </div>

                <div className="gc-card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 16 }}>
                    CO₂ Equivalents Avoided
                  </div>
                  {[
                    [
                      `${savings.treesEquiv.toLocaleString("en-IN")}`,
                      "Trees grown for 10 yrs",
                      <TreePine key="tree" size={20} />,
                      "var(--gc-green)",
                    ],
                    [
                      `${savings.homeEquiv.toLocaleString("en-IN")}`,
                      "Indian homes powered for 1 yr",
                      <Home key="home" size={20} />,
                      "var(--gc-cyan)",
                    ],
                    [
                      `${savings.carsEquiv.toFixed(0)}`,
                      "Cars off road for 1 yr",
                      <Car key="car" size={20} />,
                      "var(--gc-amber)",
                    ],
                    [
                      `${savings.coalEquiv.toFixed(1)} t`,
                      "Coal not burned equivalent",
                      <Factory key="factory" size={20} />,
                      "var(--gc-violet)",
                    ],
                  ].map(([val, label, icon, color]) => (
                    <div
                      key={label as string}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--gc-border)",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: color as string,
                            fontFamily: "var(--gc-font-mono)",
                          }}
                        >
                          {val}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gc-muted)" }}>
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Grid Map */}
              <div className="gc-card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      National Grid — Regional Status
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gc-muted)" }}>
                      Live node connectivity map · Click region to inspect
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    {REGIONS.map((r) => (
                      <span
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--gc-muted)",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: r.color,
                            display: "inline-block",
                          }}
                        />
                        {r.shortLabel}
                      </span>
                    ))}
                  </div>
                </div>
                <RegionGridMap />
              </div>
            </>
          )}

          {/* ── FORECAST TAB ── */}
          {activeTab === "forecast" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  Load Forecast — 24hr Ahead
                </h1>
                <p style={{ color: "var(--gc-muted)", fontSize: 13 }}>
                  XGBoost model · 96 steps · MAPE 2.4% · North NRLDC grid
                </p>
              </div>

              <div
                className="gc-card"
                style={{ padding: 24, marginBottom: 20 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    Company Load vs Grid Forecast
                  </div>
                  <button
                    style={{
                      background: "rgba(6,182,212,0.1)",
                      border: "1px solid rgba(6,182,212,0.2)",
                      borderRadius: 6,
                      padding: "6px 14px",
                      color: "var(--gc-cyan)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "var(--gc-font-sans)",
                    }}
                  >
                    ↓ Export CSV
                  </button>
                </div>
                <LoadChart 
                  height={220} 
                  actual={chartData?.actual} 
                  forecast={chartData?.forecast} 
                  optimized={chartData?.optimized} 
                />
              </div>

              <div className="gc-card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 16 }}>
                  Residual Error Heatmap (APE %)
                </div>
                <ErrorHeatmap matrix={residualMatrix} />
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 14,
                    fontSize: 11,
                    color: "var(--gc-muted)",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    ["#064e3b", "<1.5%"],
                    ["#065f46", "1.5–2.5%"],
                    ["#ca8a04", "2.5–3.5%"],
                    ["#b45309", "3.5–5%"],
                    ["#991b1b", ">5%"],
                  ].map(([color, label]) => (
                    <span
                      key={label}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: color,
                          display: "inline-block",
                        }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CARBON TRACKER ── */}
          {activeTab === "carbon" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  Carbon Footprint Tracker
                </h1>
                <p style={{ color: "var(--gc-muted)", fontSize: 13 }}>
                  Scope 2 emissions from grid electricity · India CEA emission
                  factor 0.716 tCO₂/MWh
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {[
                  [
                    "Annual CO₂ Footprint",
                    `${(BASE_MW * 8760 * INDIA_GRID_EMISSION_FACTOR).toFixed(0)} tCO₂`,
                    "Scope 2 (grid electricity)",
                    "var(--gc-red)",
                  ],
                  [
                    "CO₂ Avoided (YTD)",
                    `${savings.co2Saved.toFixed(0)} tCO₂`,
                    "Through demand optimisation",
                    "var(--gc-green)",
                  ],
                  [
                    "Carbon Intensity Now",
                    "0.716 tCO₂/MWh",
                    "India national grid avg · CEA",
                    "var(--gc-amber)",
                  ],
                  [
                    "Net Zero Target Gap",
                    `${(BASE_MW * 8760 * INDIA_GRID_EMISSION_FACTOR - savings.co2Saved).toFixed(0)} tCO₂`,
                    "Remaining to neutralise",
                    "var(--gc-violet)",
                  ],
                ].map(([label, val, sub, color]) => (
                  <div key={label} className="gc-kpi">
                    <div style={{ fontSize: 11, color: "var(--gc-muted)", marginBottom: 8 }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color,
                        fontFamily: "var(--gc-font-mono)",
                      }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--gc-subtle)",
                        marginTop: 4,
                      }}
                    >
                      {sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly carbon bar chart */}
              <div className="gc-card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 16 }}>
                  Monthly Carbon Trend (tCO₂)
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                    height: 120,
                  }}
                >
                  {[
                    "Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec",
                  ].map((month, i) => {
                    const emission =
                      BASE_MW *
                      (i < 4 ? 730 : 720) *
                      INDIA_GRID_EMISSION_FACTOR *
                      (1 - i * 0.003);
                    const maxEmission =
                      BASE_MW * 730 * INDIA_GRID_EMISSION_FACTOR;
                    const h = (emission / maxEmission) * 100;
                    const isPast = i <= 3;
                    return (
                      <div
                        key={month}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <div
                          title={`${emission.toFixed(0)} tCO₂`}
                          style={{
                            width: "100%",
                            height: `${h}%`,
                            borderRadius: "3px 3px 0 0",
                            background: isPast
                              ? "linear-gradient(180deg, var(--gc-cyan), var(--gc-cyan-dk))"
                              : "var(--gc-border)",
                            transition: "height 0.5s var(--gc-ease)",
                            cursor: "default",
                          }}
                        />
                        <div style={{ fontSize: 9, color: "var(--gc-subtle)" }}>
                          {month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── SCHEDULE OPTIMIZER ── */}
          {activeTab === "schedule" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  Schedule Optimizer
                </h1>
                <p style={{ color: "var(--gc-muted)", fontSize: 13 }}>
                  Shift energy-intensive tasks to low-tariff, low-carbon grid
                  windows and watch your savings compound.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 340px",
                  gap: 20,
                }}
              >
                {/* Task list */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      Scheduled Tasks
                    </div>
                    <button
                      onClick={() => setSchedulerOpen(true)}
                      className="gc-btn gc-btn-primary"
                      style={{ fontSize: 12, padding: "7px 14px" }}
                    >
                      + Add Task
                    </button>
                  </div>

                  {SCHEDULED_TASKS.map((task) => {
                    const region = REGIONS.find((r) => r.id === task.region);
                    const mwSaved = (BASE_MW * task.savingsPercent) / 100;
                    const co2TaskSaved = (mwSaved * 2 * INDIA_GRID_EMISSION_FACTOR).toFixed(2);
                    const costSaved = (mwSaved * 2 * INR_PER_KWH * 1000).toFixed(0);
                    const energyShifted = (mwSaved * 2).toFixed(1);
                    const isOpen = selectedTask === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`gc-schedule-row${isOpen ? " is-open" : ""}`}
                        onClick={() =>
                          setSelectedTask(isOpen ? null : task.id)
                        }
                      >
                        <div
                          style={{
                            width: 4,
                            height: 40,
                            borderRadius: 2,
                            background: region?.color ?? "var(--gc-cyan)",
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              marginBottom: 4,
                            }}
                          >
                            {task.name}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              fontSize: 11,
                              color: "var(--gc-muted)",
                            }}
                          >
                            <span>
                              Current:{" "}
                              <span
                                style={{ fontFamily: "var(--gc-font-mono)", color: "var(--gc-text)" }}
                              >
                                {task.currentTime}
                              </span>
                            </span>
                            <span>
                              → Optimal:{" "}
                              <span
                                style={{ fontFamily: "var(--gc-font-mono)", color: "var(--gc-green)" }}
                              >
                                {task.optimalTime}
                              </span>
                            </span>
                            <span style={{ color: region?.color }}>
                              {region?.shortLabel}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "var(--gc-green)",
                              fontFamily: "var(--gc-font-mono)",
                            }}
                          >
                            -{task.savingsPercent}%
                          </div>
                          <div style={{ fontSize: 10, color: "var(--gc-muted)" }}>
                            cost saving
                          </div>
                        </div>

                        {/* Expanded impact panel */}
                        {isOpen && (
                          <div
                            style={{
                              position: "absolute",
                              background: "rgba(2,15,26,0.98)",
                              border: "1px solid var(--gc-cyan)",
                              borderRadius: 10,
                              padding: 16,
                              zIndex: 10,
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: 4,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--gc-cyan)",
                                marginBottom: 12,
                                fontFamily: "var(--gc-font-mono)",
                                letterSpacing: "0.12em",
                              }}
                            >
                              IMPACT ANALYSIS — {task.name.toUpperCase()}
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 12,
                                marginBottom: 14,
                              }}
                            >
                              {[
                                [`${co2TaskSaved} tCO₂`, "Carbon saved / shift"],
                                [`₹${costSaved}`, "Cost saved / shift"],
                                [`${energyShifted} MWh`, "Energy shifted"],
                              ].map(([v, l]) => (
                                <div
                                  key={l}
                                  style={{
                                    textAlign: "center",
                                    background: "rgba(6,182,212,0.05)",
                                    borderRadius: 8,
                                    padding: "10px 8px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      color: "var(--gc-cyan)",
                                      fontFamily: "var(--gc-font-mono)",
                                      fontSize: 14,
                                    }}
                                  >
                                    {v}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "var(--gc-muted)",
                                      marginTop: 3,
                                    }}
                                  >
                                    {l}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--gc-muted)",
                                lineHeight: 1.65,
                              }}
                            >
                              Shifting from{" "}
                              <span style={{ color: "var(--gc-amber)" }}>
                                {task.currentTime}
                              </span>{" "}
                              to{" "}
                              <span style={{ color: "var(--gc-green)" }}>
                                {task.optimalTime}
                              </span>{" "}
                              avoids peak tariff period on the{" "}
                              {region?.label} grid. Grid carbon intensity drops
                              ~{task.savingsPercent - 5}% at night due to
                              baseload thermal dominance.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Total impact */}
                  <div className="gc-card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 16 }}>
                      Total Optimizer Impact
                    </div>
                    {[
                      ["Annual CO₂ Saved", `${(savings.co2Saved * 0.15).toFixed(1)} tCO₂`, "var(--gc-green)"],
                      ["Annual Cost Saved", `₹${((savings.inrSaved * 0.15) / 100000).toFixed(1)}L`, "var(--gc-amber)"],
                      ["Energy Shifted", `${(savings.savingsMWh * 0.15).toFixed(0)} MWh`, "var(--gc-cyan)"],
                      ["Peak Load Reduction", "14.2%", "var(--gc-violet)"],
                    ].map(([label, val, color]) => (
                      <div
                        key={label as string}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--gc-border)",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--gc-muted)" }}>
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color,
                            fontFamily: "var(--gc-font-mono)",
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Carbon window bar */}
                  <div className="gc-card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>
                      Grid Carbon Window
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--gc-muted)",
                        lineHeight: 1.7,
                        marginBottom: 12,
                      }}
                    >
                      India grid carbon intensity varies by time-of-day. Night
                      hours (01:00–05:00) see 8–15% lower carbon intensity as
                      high-emission peaker plants back off.
                    </p>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: 24 }, (_, h) => {
                        const isLow = h >= 1 && h <= 5;
                        const isMed =
                          h === 0 || h >= 22 || (h >= 6 && h <= 8);
                        return (
                          <div
                            key={h}
                            title={`${h}:00 — ${isLow ? "Low carbon" : isMed ? "Medium" : "Peak"}`}
                            style={{
                              flex: 1,
                              height: 28,
                              borderRadius: 3,
                              background: isLow
                                ? "var(--gc-green)"
                                : isMed
                                ? "var(--gc-amber)"
                                : "var(--gc-red)",
                              opacity: 0.75,
                              cursor: "default",
                            }}
                          />
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 8,
                        fontSize: 10,
                        color: "var(--gc-muted)",
                        flexWrap: "wrap",
                      }}
                    >
                      {[
                        ["var(--gc-green)", "Low (01–05)"],
                        ["var(--gc-amber)", "Medium"],
                        ["var(--gc-red)", "Peak (08–22)"],
                      ].map(([c, l]) => (
                        <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: c,
                              display: "inline-block",
                            }}
                          />
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add task modal */}
              {schedulerOpen && (
                <div className="gc-modal-overlay">
                  <div className="gc-modal">
                    <div
                      style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}
                    >
                      Schedule New Task
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label className="gc-label">Task Name</label>
                        <input
                          className="gc-input"
                          placeholder="e.g. Cold storage defrost cycle"
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label className="gc-label">Preferred Time</label>
                          <input
                            type="time"
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(e.target.value)}
                            className="gc-input"
                          />
                        </div>
                        <div>
                          <label className="gc-label">Grid Region</label>
                          <select
                            value={newTaskRegion}
                            onChange={(e) => setNewTaskRegion(e.target.value)}
                            className="gc-input gc-select"
                            style={{ cursor: "pointer" }}
                          >
                            {REGIONS.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(16,185,129,0.05)",
                          border: "1px solid rgba(16,185,129,0.2)",
                          borderRadius: 8,
                          padding: 14,
                          fontSize: 12,
                          color: "var(--gc-text-2)",
                        }}
                      >
                        🟢 Scheduling at{" "}
                        <strong>{newTaskTime}</strong> in the{" "}
                        <strong>
                          {REGIONS.find((r) => r.id === newTaskRegion)?.label}
                        </strong>{" "}
                        region saves approximately{" "}
                        <span style={{ color: "var(--gc-green)", fontWeight: 600 }}>
                          12–18%
                        </span>{" "}
                        on peak charges based on current forecasts.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                      <button
                        onClick={() => setSchedulerOpen(false)}
                        className="gc-btn gc-btn-dim"
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setSchedulerOpen(false)}
                        className="gc-btn gc-btn-primary"
                        style={{ flex: 2, justifyContent: "center" }}
                      >
                        Schedule Task →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── REPORTS ── */}
          {activeTab === "reports" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  Reports &amp; Compliance
                </h1>
                <p style={{ color: "var(--gc-muted)", fontSize: 13 }}>
                  Download GHG inventory reports, BEE compliance summaries, and
                  grid interaction logs.
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                }}
              >
                {[
                  ["📊", "Monthly Energy Report", "April 2026 · PDF", "GHG inventory, load curve, savings summary"],
                  ["🌿", "Scope 2 Carbon Report", "Q1 2026 · PDF", "CEA-compliant carbon accounting"],
                  ["📋", "BEE PAT Compliance", "FY2025-26 · XLSX", "Bureau of Energy Efficiency data"],
                  ["⚡", "Grid Interaction Log", "April 23 · CSV", "15-min demand & export data"],
                ].map(([icon, title, meta, desc]) => (
                  <div
                    key={title}
                    className="gc-card"
                    style={{
                      padding: 20,
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--gc-cyan)",
                          marginBottom: 4,
                          fontFamily: "var(--gc-font-mono)",
                        }}
                      >
                        {meta}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gc-muted)" }}>
                        {desc}
                      </div>
                    </div>
                    <span style={{ color: "var(--gc-cyan)", fontSize: 18 }}>↓</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
