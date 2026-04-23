"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadChart from "@/components/charts/LoadChart";
import { usePredictiveEngine } from "@/lib/predictiveEngine";
import { 
  Zap, 
  Cloud, 
  BarChart3, 
  Database, 
  Construction, 
  CheckCircle2, 
  Check, 
  Hourglass, 
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Cpu,
  Activity,
  ArrowDown,
  DownloadCloud,
  FileSearch,
  Filter,
  Server,
  Eye,
  Settings,
  Code2,
  Box,
  Layers,
  LineChart,
  HardDrive,
  Target
} from "lucide-react";

const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), {
  ssr: false,
});

type NodeState = "active" | "warn" | "critical";
interface GridNode {
  id: number;
  label: string;
  state: NodeState;
}

const INITIAL_NODES: GridNode[] = [
  "DEL-N", "DEL-S", "HP-01", "PB-01", "PB-02",
  "HR-01", "HR-02", "UK-01", "UK-02", "RJ-01",
  "RJ-02", "UP-N", "UP-S", "UP-E", "UP-W",
  "BR-01", "JK-01", "HP-02", "CG-01", "MP-01",
].map((label, id) => ({
  id,
  label,
  state: Math.random() > 0.85 ? "warn" : "active",
}));

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [nodes, setNodes] = useState<GridNode[]>(INITIAL_NODES);
  
  // Use real predictions to drive the landing chart instead of mockData
  const { chartData, metrics, loading } = usePredictiveEngine(42000, "xgboost", "24h");

  useEffect(() => {
    // Randomize grid nodes every 3 seconds for visual effect
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => {
          const r = Math.random();
          let state: NodeState = "active";
          if (r > 0.95) state = "critical";
          else if (r > 0.8) state = "warn";
          return { ...n, state };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document
      .querySelectorAll(".gc-reveal")
      .forEach((el, i) => {
        (el as HTMLElement).style.transitionDelay = `${i * 0.05}s`;
        obs.observe(el);
      });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gc-bg)",
        color: "var(--gc-text)",
        fontFamily: "var(--gc-font-sans)",
        overflowX: "hidden",
      }}
    >
      {/* ── NAV ── */}
      <nav
        className={`gc-nav${scrollY > 40 ? " scrolled" : ""}`}
        style={{ padding: "0 48px" }}
      >
        <a href="/" className="gc-logo">
          <span className="gc-logo-dot" />
          Grid<span className="gc-logo-accent">Cast</span>
        </a>

        <div
          style={{
            display: "flex",
            gap: 32,
            fontSize: 13,
            color: "var(--gc-muted)",
          }}
        >
          {["Grid", "Problem", "How It Works", "Impact", "Tech"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                transition: "color 0.2s",
                letterSpacing: "0.03em",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--gc-text)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--gc-muted)")
              }
            >
              {l}
            </a>
          ))}
        </div>

        <Link href="/login" className="gc-btn gc-btn-ghost" style={{ padding: "8px 20px", fontSize: 13 }}>
          Request Demo
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <HeroCanvas />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(2,15,26,0.88) 0%, rgba(2,15,26,0.5) 60%, rgba(2,15,26,0.8) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "0 80px",
            maxWidth: 720,
            animation: "gc-slide-in 1s var(--gc-ease) both",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(6,182,212,0.1)",
              border: "1px solid rgba(6,182,212,0.28)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 24,
            }}
          >
            <span className="gc-led gc-led-green" />
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                color: "var(--gc-cyan)",
                fontWeight: 600,
                textTransform: "uppercase",
                fontFamily: "var(--gc-font-mono)",
              }}
            >
              Smart Grid Forecasting · NRLDC
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-2.5px",
              marginBottom: 20,
            }}
          >
            Predict the Grid.
            <br />
            <span style={{ color: "var(--gc-cyan)" }}>Before It Breaks.</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "var(--gc-text-2)",
              lineHeight: 1.75,
              marginBottom: 32,
              maxWidth: 520,
            }}
          >
            AI-powered electricity load forecasting at 15-minute resolution, 24
            hours ahead. Purpose-built for India&apos;s smart grid operators with
            sub-millisecond inference.
          </p>

          <div
            style={{ display: "flex", gap: 16, marginBottom: 52, flexWrap: "wrap" }}
          >
            <Link
              href="/login"
              className="gc-btn gc-btn-primary"
              style={{ fontSize: 15, padding: "13px 28px", display: "flex", alignItems: "center", gap: 8 }}
            >
              See Live Demo <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="gc-btn gc-btn-ghost" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              How it works <ArrowDown size={16} />
            </a>
          </div>

          <div
            style={{
              display: "flex",
              gap: 36,
              paddingTop: 24,
              borderTop: "1px solid var(--gc-border)",
            }}
          >
            {[
              ["96", "Forecast Steps"],
              ["15min", "Granularity"],
              ["<3%", "Target MAPE"],
            ].map(([val, label]) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--gc-cyan)",
                    fontFamily: "var(--gc-font-mono)",
                    letterSpacing: "-1px",
                  }}
                >
                  {val}
                </div>
                <div style={{ fontSize: 11, color: "var(--gc-muted)", marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IS A SMART GRID ── */}
      <section
        id="grid"
        style={{ padding: "88px 80px", background: "var(--gc-bg)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              What is a Smart Grid
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                marginBottom: 20,
                letterSpacing: "-1px",
                lineHeight: 1.15,
              }}
            >
              The grid is overloaded.
              <br />
              AI makes it smart.
            </h2>
            <p
              style={{
                color: "var(--gc-text-2)",
                lineHeight: 1.8,
                marginBottom: 20,
                fontSize: 15,
              }}
            >
              Traditional grids operate reactively — they respond to demand
              spikes after they happen, causing cascading failures, brownouts,
              and costly reserve dispatch.
            </p>
            <p style={{ color: "var(--gc-text-2)", lineHeight: 1.8, fontSize: 15 }}>
              Smart grids use real-time forecasting to anticipate load, balance
              renewable intermittency, and dispatch reserves precisely — slashing
              waste and carbon emissions by up to 30%.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 32,
              }}
            >
              {[
                ["4.7B+", "People on global grids"],
                ["INR 2T+", "India grid investment"],
                ["30%", "Reserve waste reducible"],
                ["0.716", "tCO₂/MWh India grid"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="gc-card"
                  style={{ padding: "18px 20px" }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "var(--gc-cyan)",
                      fontFamily: "var(--gc-font-mono)",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--gc-muted)",
                      marginTop: 4,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="gc-reveal">
            <div
              style={{
                background: "rgba(6,182,212,0.04)",
                border: "1px solid rgba(6,182,212,0.12)",
                borderRadius: 16,
                padding: 24,
              }}
              className="gc-dots"
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--gc-cyan-dk)",
                  marginBottom: 16,
                  fontWeight: 600,
                  fontFamily: "var(--gc-font-mono)",
                  letterSpacing: "0.15em",
                }}
              >
                LIVE GRID NODES — NORTH REGION
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      border: `1px solid ${
                        n.state === "active"
                          ? "#06b6d4"
                          : n.state === "warn"
                          ? "#f59e0b"
                          : "#ef4444"
                      }`,
                      borderRadius: 8,
                      padding: "8px 4px",
                      textAlign: "center",
                      background:
                        n.state === "active"
                          ? "rgba(6,182,212,0.07)"
                          : n.state === "warn"
                          ? "rgba(245,158,11,0.07)"
                          : "rgba(239,68,68,0.07)",
                      animation:
                        n.state === "critical"
                          ? "gc-blink 1.2s infinite"
                          : undefined,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 8,
                        fontFamily: "var(--gc-font-mono)",
                        color:
                          n.state === "active"
                            ? "#06b6d4"
                            : n.state === "warn"
                            ? "#f59e0b"
                            : "#ef4444",
                        marginBottom: 4,
                      }}
                    >
                      {n.label}
                    </div>
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background:
                          n.state === "active"
                            ? "#06b6d4"
                            : n.state === "warn"
                            ? "#f59e0b"
                            : "#ef4444",
                        margin: "0 auto",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--gc-muted)",
                    marginBottom: 6,
                  }}
                >
                  <span>Current System Load</span>
                  <span
                    style={{
                      color: "var(--gc-cyan)",
                      fontFamily: "var(--gc-font-mono)",
                    }}
                  >
                    {chartData ? `${Math.round(chartData.actual[chartData.actual.length - 1]).toLocaleString()} MW` : "42,180 MW"}
                  </span>
                </div>
                <div
                  style={{
                    background: "var(--gc-bg3, #0a1929)",
                    borderRadius: 4,
                    height: 6,
                  }}
                >
                  <div
                    style={{
                      width: "72%",
                      height: 6,
                      borderRadius: 4,
                      background:
                        "linear-gradient(90deg, var(--gc-cyan-dk), var(--gc-cyan))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section
        id="problem"
        style={{ padding: "88px 80px", background: "var(--gc-bg2)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }} className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              The Challenge
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              Six problems killing grid efficiency
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {[
              [
                <Zap key="zap" size={24} />,
                "Demand Volatility",
                "Load swings 15–40% within minutes during peak events, outpacing manual dispatch by 3–5× the required speed.",
                false,
              ],
              [
                <Cloud key="cloud" size={24} />,
                "Renewable Intermittency",
                "Solar and wind generation can drop 80% in minutes. Without forecasting, grid operators over-provision expensive reserves.",
                false,
              ],
              [
                <BarChart3 key="bar" size={24} />,
                "Dispatch Inefficiency",
                "Without accurate 15-min forecasts, operators carry 20–30% excess reserve capacity at ₹8–12/unit hidden cost.",
                false,
              ],
              [
                <Database key="db" size={24} />,
                "Data Quality Gaps",
                "SCADA telemetry drops, sensor drift, and holiday anomalies create gaps conventional models can't bridge.",
                false,
              ],
              [
                <Construction key="con" size={24} />,
                "Infrastructure Stress",
                "Legacy transmission infrastructure carries 110–125% rated load during heatwaves, risking catastrophic failure.",
                false,
              ],
              [
                <CheckCircle2 key="check" size={24} />,
                "GridCast Solves This",
                "96-step autoregressive XGBoost + LSTM pipeline with anomaly detection and sub-3% MAPE on NRLDC data.",
                true,
              ],
            ].map(([icon, title, desc, highlight]) => (
              <div
                key={title as string}
                className="gc-card gc-reveal"
                style={
                  highlight
                    ? {
                        borderColor: "var(--gc-cyan)",
                        background: "rgba(6,182,212,0.07)",
                        padding: 24,
                      }
                    : { padding: 24 }
                }
              >
                <div style={{ color: "var(--gc-cyan)", marginBottom: 16 }}>{icon}</div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    color: highlight ? "var(--gc-cyan)" : "var(--gc-text)",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--gc-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section
        id="how-it-works"
        style={{ padding: "88px 80px", background: "var(--gc-bg)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }} className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              How It Works
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              Six-stage ML pipeline
            </h2>
          </div>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              gap: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 20,
                left: "8%",
                right: "8%",
                height: 1,
                background:
                  "linear-gradient(90deg, var(--gc-cyan), var(--gc-cyan-dk), var(--gc-cyan))",
                opacity: 0.35,
              }}
            />

            {[
              [<DownloadCloud key="sc" size={16} />, "Scrape", "Selenium ETL from NLDC portal every 15 min"],
              [<FileSearch key="ex" size={16} />, "Extract", "Parquet feature store with lag & calendar features"],
              [<Filter key="cl" size={16} />, "Clean", "Z-score anomaly detection + gap interpolation"],
              [<Cpu key="ml" size={16} />, "Train", "XGBoost + LSTM on 2-year NRLDC data"],
              [<Server key="api" size={16} />, "Serve", "Flask REST endpoint — P95 latency <1ms"],
              [<Eye key="ui" size={16} />, "Visualize", "Operator dashboard for grid intelligence"],
            ].map(([icon, title, desc]) => (
              <div
                key={title as string}
                className="gc-reveal"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "rgba(6,182,212,0.12)",
                    border: "1.5px solid var(--gc-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--gc-cyan)",
                    fontFamily: "var(--gc-font-mono)",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {icon}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--gc-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section
        id="impact"
        style={{ padding: "88px 80px", background: "var(--gc-bg2)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }} className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              Real-Time Operations
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              Live operator dashboard preview
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: 24,
            }}
          >
            {/* Sidebar stats */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
              className="gc-reveal"
            >
              {[
                ["Current Load", chartData ? `${Math.round(chartData.actual[chartData.actual.length - 1]).toLocaleString()} MW` : "42,180 MW", "var(--gc-cyan)"],
                ["Peak Forecast", chartData ? `${Math.round(Math.max(...chartData.forecast)).toLocaleString()} MW` : "45,320 MW", "var(--gc-amber)"],
                ["Model MAPE", metrics?.mape ? `${metrics.mape.toFixed(2)}%` : "2.4%", "var(--gc-green)"],
                ["Last Updated", metrics?.dataEnd ? new Date(metrics.dataEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "14:30 IST", "var(--gc-text-2)"],
                ["API Status", loading ? "SYNCING" : chartData ? "LIVE" : "OFFLINE", loading ? "var(--gc-amber)" : chartData ? "var(--gc-green)" : "var(--gc-red)"],
              ].map(([label, val, color]) => (
                <div
                  key={label}
                  className="gc-card"
                  style={{ padding: "14px 16px" }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--gc-muted)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {label === "API Status" && <Activity size={10} style={{ color }} />}
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color,
                      fontFamily: "var(--gc-font-mono)",
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="gc-card gc-reveal" style={{ padding: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--gc-muted)",
                  marginBottom: 16,
                }}
              >
                24-Hour Load Forecast — North Region (MW)
              </div>
              {loading ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gc-muted)", fontSize: 13 }}>
                  Spinning up predictive engine...
                </div>
              ) : chartData ? (
                <LoadChart 
                  height={180} 
                  actual={chartData.actual} 
                  forecast={chartData.forecast} 
                />
              ) : (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gc-red)", fontSize: 13 }}>
                  [Pipeline Offline] Run `npm run sync:data` to populate metrics.
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  marginTop: 12,
                  fontSize: 11,
                  color: "var(--gc-muted)",
                }}
              >
                {[
                  ["#0e7490", "Actual"],
                  ["#06b6d4", "Forecast"],
                ].map(([color, label]) => (
                  <span
                    key={label}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 2,
                        background: color,
                        display: "inline-block",
                      }}
                    />
                    {label}
                  </span>
                ))}
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 20,
                      height: 8,
                      background: "rgba(6,182,212,0.1)",
                      border: "1px solid rgba(6,182,212,0.22)",
                      display: "inline-block",
                      borderRadius: 2,
                    }}
                  />
                  +/- 5% CI
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT NUMBERS ── */}
      <section
        style={{ padding: "88px 80px", background: "var(--gc-bg)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }} className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              Impact &amp; Roadmap
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              Measurable results, clear path forward
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              marginBottom: 48,
            }}
          >
            {[
              ["-30%", "Reserve capacity waste", <TrendingDown key="td" size={20} />],
              ["<3%", "24hr MAPE target", <Target key="tg" size={20} />],
              ["96×", "Decisions per day", <Zap key="zp" size={20} />],
              ["<1ms", "API inference latency", <Activity key="ac" size={20} />],
            ].map(([val, label, icon]) => (
              <div
                key={label as string}
                className="gc-card gc-reveal"
                style={{ textAlign: "center", padding: "28px 16px" }}
              >
                <div style={{ color: "var(--gc-cyan)", marginBottom: 12, display: "flex", justifyContent: "center" }}>{icon}</div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--gc-cyan)",
                    fontFamily: "var(--gc-font-mono)",
                    letterSpacing: "-1px",
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--gc-muted)",
                    marginTop: 6,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Roadmap Timeline */}
          <div style={{ position: "relative", display: "flex", gap: 0 }}>
            <div
              style={{
                position: "absolute",
                top: 16,
                left: "10%",
                right: "10%",
                height: 2,
                background: "var(--gc-border)",
              }}
            />
            {[
              [<Check key="c1" size={14} />, "Core ML Pipeline", "var(--gc-green)"],
              [<Check key="c2" size={14} />, "Operator Dashboard", "var(--gc-green)"],
              [<Hourglass key="h1" size={14} />, "Weather Features", "var(--gc-amber)"],
              [<Calendar key="cal1" size={14} />, "Multi-Region", "var(--gc-muted)"],
              [<Calendar key="cal2" size={14} />, "LSTM Fine-tune", "var(--gc-muted)"],
            ].map(([icon, title, color]) => (
              <div
                key={title as string}
                className="gc-reveal"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: color as string,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    position: "relative",
                    zIndex: 2,
                    color: "#020f1a",
                    fontWeight: 700,
                  }}
                >
                  {icon}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: color as string,
                    textAlign: "center",
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section
        id="tech"
        style={{ padding: "88px 80px", background: "var(--gc-bg2)" }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }} className="gc-reveal">
            <p className="gc-section-label" style={{ marginBottom: 14 }}>
              Tech Stack
            </p>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              Production-grade infrastructure
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {[
              [
                "XGBoost",
                "Gradient-boosted forecasting with SHAP explainability. 96-step autoregressive rollout.",
                "var(--gc-amber)",
                <TrendingUp key="xgb" size={18} />
              ],
              [
                "Pandas / Parquet",
                "Feature store with lag, rolling stats, and calendar features. Sub-100ms load time.",
                "var(--gc-cyan)",
                <HardDrive key="pd" size={18} />
              ],
              [
                "Flask REST API",
                "P95 latency <1ms. Joblib model serialization. Docker-ready deployment.",
                "var(--gc-green)",
                <Server key="flask" size={18} />
              ],
              [
                "Selenium ETL",
                "Automated NLDC scraping every 15 minutes. Handles auth, retry logic and pagination.",
                "var(--gc-violet)",
                <Code2 key="sel" size={18} />
              ],
              [
                "React / Next.js",
                "Pure SVG + Three.js visualizations. Operator dashboard with real-time data binding.",
                "var(--gc-cyan)",
                <Layers key="react" size={18} />
              ],
              [
                "LSTM (Planned)",
                "PyTorch sequence model for long-range patterns. Captures weekly seasonality across 96+ steps.",
                "var(--gc-amber)",
                <Cpu key="lstm" size={18} />
              ],
            ].map(([title, desc, color, icon]) => (
              <div
                key={title as string}
                className="gc-card gc-reveal"
                style={{ padding: 22 }}
              >
                <div
                  style={{
                    color: color as string,
                    marginBottom: 12,
                  }}
                >
                  {icon}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--gc-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section
        style={{
          padding: "88px 80px",
          background: "var(--gc-bg)",
          textAlign: "center",
          borderTop: "1px solid rgba(6,182,212,0.1)",
        }}
      >
        <h2
          className="gc-reveal"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.8rem)",
            fontWeight: 700,
            letterSpacing: "-1.5px",
            marginBottom: 16,
          }}
        >
          Ready to forecast the grid?
        </h2>
        <p
          className="gc-reveal"
          style={{ color: "var(--gc-muted)", marginBottom: 36, fontSize: 15 }}
        >
          Join grid operators using AI to prevent blackouts, reduce waste, and
          cut carbon.
        </p>
        <div
          className="gc-reveal"
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/login"
            className="gc-btn gc-btn-primary"
            style={{ fontSize: 15, padding: "14px 36px", display: "flex", alignItems: "center", gap: 10 }}
          >
            Request a Demo <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/Team-NAVGATI/GridCast"
            className="gc-btn gc-btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 15, padding: "14px 36px", display: "flex", alignItems: "center", gap: 10 }}
          >
            View on GitHub <TrendingUp size={18} />
          </a>
        </div>

        <div
          style={{
            marginTop: 52,
            color: "var(--gc-ghost)",
            fontSize: 12,
            display: "flex",
            justifyContent: "center",
            gap: 24,
            fontFamily: "var(--gc-font-mono)",
          }}
        >
          {["GridCast v2.1", "MIT License", "(c) 2025 Team NavGati", "Built on NRLDC Open Data"].map(
            (t) => <span key={t}>{t}</span>
          )}
        </div>
      </section>
    </div>
  );
}
