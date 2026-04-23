"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadChart from "@/components/charts/LoadChart";
import ErrorHeatmap from "@/components/charts/ErrorHeatmap";
import { REGIONS } from "@/lib/constants";

type Model = "xgboost" | "lstm";
type Horizon = "24h" | "48h" | "72h";
type AdminTab = "forecast" | "analysis" | "models" | "reports";

const MODEL_COLORS: Record<Model, string> = {
  xgboost: "#378ADD",
  lstm: "#7C3AED",
};
const MODEL_LABELS: Record<Model, string> = {
  xgboost: "XGBoost",
  lstm: "LSTM",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [model, setModel] = useState<Model>("xgboost");
  const [horizon, setHorizon] = useState<Horizon>("24h");
  const [activeTab, setActiveTab] = useState<AdminTab>("forecast");

  const modelColor = MODEL_COLORS[model];
  const modelLabel = MODEL_LABELS[model];

  // Generate semi-random next 8 step forecasts (stable)
  const nextSteps = Array.from({ length: 8 }, (_, i) => ({
    time: `+${String(Math.floor((i + 1) * 15 / 60)).padStart(2, "0")}:${String(((i + 1) * 15) % 60).padStart(2, "0")}`,
    mw: 42000 + ((i * 137 + 7) % 800) - 400,
  }));

  return (
    <div className="gc-admin-root" style={{ fontFamily: "var(--gc-font-sans)" }}>
      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${modelColor}, transparent)`,
          width: "65%",
          transition: "background 0.4s",
        }}
      />

      {/* ── NAV ── */}
      <nav
        className="gc-admin-nav"
        style={{
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginRight: 24,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f59e0b",
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
            Grid<span style={{ color: "#06b6d4" }}>Cast</span>
          </span>
        </div>

        {(["forecast", "analysis", "models", "reports"] as AdminTab[]).map(
          (t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: "0 16px",
                height: 52,
                border: "none",
                borderBottom: `2px solid ${activeTab === t ? modelColor : "transparent"}`,
                background: "transparent",
                fontFamily: "var(--gc-font-sans)",
                fontSize: 13,
                fontWeight: activeTab === t ? 600 : 400,
                color: activeTab === t ? modelColor : "#64748b",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {t}
            </button>
          )
        )}

        <div style={{ flex: 1 }} />

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(["24h", "48h", "72h"] as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: `1px solid ${horizon === h ? modelColor : "#e2e8f0"}`,
                background: horizon === h ? `${modelColor}18` : "transparent",
                color: horizon === h ? modelColor : "#64748b",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--gc-font-sans)",
                transition: "all 0.2s",
              }}
            >
              {h}
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />

          <button
            onClick={() => setModel(model === "xgboost" ? "lstm" : "xgboost")}
            style={{
              padding: "4px 14px",
              borderRadius: 6,
              border: `1px solid ${modelColor}`,
              background: `${modelColor}18`,
              color: modelColor,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--gc-font-sans)",
              transition: "all 0.3s",
            }}
          >
            {modelLabel} ↕
          </button>

          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              padding: "4px 10px",
              background: "#f1f5f9",
              borderRadius: 6,
              fontFamily: "var(--gc-font-mono)",
            }}
          >
            Static · Weekly
          </div>

          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `${modelColor}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: modelColor,
            }}
          >
            OP
          </div>

          <button
            onClick={() => router.push("/login")}
            style={{
              background: "transparent",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 12,
              color: "#64748b",
              cursor: "pointer",
              fontFamily: "var(--gc-font-sans)",
            }}
          >
            ← Exit
          </button>
        </div>
      </nav>

      <div style={{ display: "flex", height: "calc(100vh - 55px)" }}>
        {/* ── SIDEBAR ── */}
        <aside
          className="gc-admin-sidebar"
          style={{ width: 184, padding: 16, overflowY: "auto" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#94a3b8",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Regions
          </div>

          {REGIONS.map((r) => (
            <label
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                cursor: "pointer",
                fontSize: 12,
                color: r.id === "north" ? r.color : "#64748b",
              }}
            >
              <input
                type="checkbox"
                defaultChecked={r.id === "north"}
                style={{ accentColor: r.color }}
              />
              {r.shortLabel}
              {r.id !== "north" && (
                <span
                  style={{
                    fontSize: 9,
                    color: "#94a3b8",
                    marginLeft: "auto",
                    background: "#f1f5f9",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  Soon
                </span>
              )}
            </label>
          ))}

          <div
            style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }}
          />

          <div
            style={{
              fontSize: 10,
              color: "#94a3b8",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Models
          </div>

          {(["xgboost", "lstm"] as Model[]).map((m) => (
            <div
              key={m}
              onClick={() => setModel(m)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                background: model === m ? `${MODEL_COLORS[m]}12` : "transparent",
                marginBottom: 4,
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: model === m ? MODEL_COLORS[m] : "#64748b",
                }}
              >
                {MODEL_LABELS[m]}
              </span>
              {model === m && (
                <span
                  style={{
                    fontSize: 9,
                    background: `${MODEL_COLORS[m]}22`,
                    color: MODEL_COLORS[m],
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  Active
                </span>
              )}
            </div>
          ))}

          <div
            style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }}
          />

          <div
            style={{
              background: `${modelColor}0a`,
              border: `1px solid ${modelColor}30`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 11,
              transition: "all 0.3s",
            }}
          >
            <div style={{ color: modelColor, fontWeight: 600, marginBottom: 4 }}>
              Active Region
            </div>
            <div style={{ color: "#1e293b" }}>North</div>
            <div style={{ color: "#94a3b8" }}>NRLDC · 15 min</div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            background: "#f8fafc",
          }}
        >
          {/* Model indicator strip */}
          <div
            style={{
              background: `${modelColor}12`,
              border: `1px solid ${modelColor}40`,
              borderRadius: 8,
              padding: "8px 16px",
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
              fontSize: 12,
              transition: "all 0.3s",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: modelColor,
                display: "inline-block",
              }}
            />
            <span style={{ color: modelColor, fontWeight: 600 }}>
              {modelLabel} Active
            </span>
            <span style={{ color: "#64748b" }}>·</span>
            <span style={{ color: "#64748b" }}>
              Data through April 23, 2026 · {horizon} horizon selected
            </span>
          </div>

          {/* KPI row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              ["MAPE 24h", "2.4%", "#10b981"],
              ["MAPE 48h", "3.1%", "#f59e0b"],
              ["MAPE 72h", "4.2%", "#ef4444"],
              ["Avg MAE 24h", "342 MW", "#64748b"],
              ["Pred. Peak", "45,320 MW", modelColor],
              ["Forecast From", "Apr 23", modelColor],
            ].map(([label, val, color]) => (
              <div key={label} className="gc-admin-card" style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color,
                    fontFamily: "var(--gc-font-mono)",
                    transition: "color 0.3s",
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Main chart + sidebar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 240px",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="gc-admin-card" style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Grid Load Forecast — North Region
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["24h", "48h", "72h"] as Horizon[]).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: `1px solid ${horizon === h ? modelColor : "#e2e8f0"}`,
                        background: horizon === h ? `${modelColor}15` : "transparent",
                        color: horizon === h ? modelColor : "#94a3b8",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "var(--gc-font-sans)",
                        transition: "all 0.2s",
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <LoadChart height={200} />
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                <span>— Actual</span>
                <span style={{ color: modelColor }}>— Forecast ({modelLabel})</span>
                <span>▥ ±5% CI</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Model comparison */}
              <div className="gc-admin-card" style={{ padding: 16 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}
                >
                  Model Comparison
                </div>
                {([
                  ["XGBoost", 2.4, "#378ADD"],
                  ["LSTM", 3.1, "#7C3AED"],
                  ["Linear Baseline", 8.7, "#94a3b8"],
                ] as [string, number, string][]).map(([name, mape, color]) => (
                  <div key={name as string} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ color: "#64748b" }}>{name}</span>
                      <span
                        style={{
                          color,
                          fontFamily: "var(--gc-font-mono)",
                          fontWeight: 600,
                        }}
                      >
                        {mape}%
                      </span>
                    </div>
                    <div
                      style={{
                        background: "#f1f5f9",
                        borderRadius: 3,
                        height: 5,
                      }}
                    >
                      <div
                        style={{
                          width: `${(1 - (mape as number) / 10) * 100}%`,
                          height: 5,
                          borderRadius: 3,
                          background: color,
                          transition: "width 0.4s var(--gc-ease)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Forecast alerts */}
              <div className="gc-admin-card" style={{ padding: 16, flex: 1 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}
                >
                  Forecast Alerts
                </div>
                {[
                  ["✓", "#10b981", "Forecast loaded successfully"],
                  ["⚠", "#f59e0b", "Data gap detected May–Jul"],
                  ["ℹ", "#378ADD", "Holiday pattern applied"],
                ].map(([icon, color, msg]) => (
                  <div
                    key={msg}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      marginBottom: 8,
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        color,
                        fontWeight: 600,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {icon}
                    </span>
                    <span style={{ color: "#64748b" }}>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap + Peak Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: 16,
            }}
          >
            <div className="gc-admin-card" style={{ padding: 20 }}>
              <div
                style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}
              >
                Residual Error Heatmap — APE by Slot
              </div>
              <ErrorHeatmap />
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 12,
                  fontSize: 11,
                  color: "#94a3b8",
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["#064e3b", "<1.5%"],
                  ["#065f46", "1.5–3%"],
                  ["#ca8a04", "3–4.5%"],
                  ["#b45309", "4.5–6%"],
                  ["#991b1b", ">6%"],
                ].map(([color, label]) => (
                  <span
                    key={label}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
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

            <div className="gc-admin-card" style={{ padding: 20 }}>
              <div
                style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}
              >
                Peak Summary
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {[
                  ["Pred. Peak", "45,320 MW"],
                  ["Pred. Trough", "38,140 MW"],
                  ["Avg MAPE", "2.4%"],
                  ["Trained", "Apr 20"],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      background: "#f8fafc",
                      borderRadius: 6,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{label}</div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--gc-font-mono)",
                        color: "#1e293b",
                        marginTop: 2,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 8,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Next 2 Hours — 15min Steps
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "5px 12px",
                }}
              >
                {nextSteps.map(({ time, mw }) => (
                  <>
                    <span
                      key={`t-${time}`}
                      style={{
                        color: "#94a3b8",
                        fontFamily: "var(--gc-font-mono)",
                        fontSize: 11,
                      }}
                    >
                      {time}
                    </span>
                    <span
                      key={`v-${time}`}
                      style={{
                        color: modelColor,
                        fontWeight: 600,
                        fontFamily: "var(--gc-font-mono)",
                        fontSize: 11,
                        transition: "color 0.3s",
                      }}
                    >
                      {mw.toLocaleString("en-IN")} MW
                    </span>
                  </>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
