"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  REGIONS,
  INDUSTRY_TYPES,
  SHIFT_PATTERNS,
  COOLING_TYPES,
  INDIA_GRID_EMISSION_FACTOR,
  INR_PER_KWH,
} from "@/lib/constants";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Zap 
} from "lucide-react";

type FormData = {
  companyName: string;
  gstin: string;
  industry: string;
  region: string;
  expectedLoad: string;
  peakLoad: string;
  offPeakLoad: string;
  shift: string;
  cooling: string;
  renewablePercent: number;
  facilitySize: string;
  employees: string;
  contractDemand: string;
  sanctionedLoad: string;
  greenTarget: number;
  budgetRange: string;
};

const STEPS = ["Company Profile", "Electricity Setup", "Goals & Sustainability"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    companyName: "",
    gstin: "",
    industry: "",
    region: "north",
    expectedLoad: "",
    peakLoad: "",
    offPeakLoad: "",
    shift: "24x7",
    cooling: "air",
    renewablePercent: 0,
    facilitySize: "",
    employees: "",
    contractDemand: "",
    sanctionedLoad: "",
    greenTarget: 0,
    budgetRange: "",
  });

  const update = (key: keyof FormData, val: string | number) =>
    setForm((p) => ({ ...p, [key]: val }));

  const industryDef = INDUSTRY_TYPES.find((i) => i.value === form.industry);

  const inputStyle: React.CSSProperties = {
    background: "rgba(6,182,212,0.04)",
    border: "1px solid rgba(6,182,212,0.2)",
    borderRadius: 8,
    padding: "11px 14px",
    color: "var(--gc-text)",
    fontSize: 14,
    width: "100%",
    fontFamily: "var(--gc-font-sans)",
    outline: "none",
  };

  // Savings estimate
  const loadMW = parseFloat(form.expectedLoad) || 0;
  const annualMWh = loadMW * 8760;
  const savingsMWh = annualMWh * 0.12;
  const co2Saved = (savingsMWh * INDIA_GRID_EMISSION_FACTOR).toFixed(1);
  const inrSaved = (savingsMWh * INR_PER_KWH * 1000).toLocaleString("en-IN");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gc-bg)",
        fontFamily: "var(--gc-font-sans)",
        color: "var(--gc-text)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid rgba(6,182,212,0.1)",
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(2,10,20,0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Link href="/landing" className="gc-logo">
          <span className="gc-logo-dot" />
          Grid<span className="gc-logo-accent">Cast</span>
        </Link>
        <span style={{ color: "var(--gc-ghost)" }}>›</span>
        <span style={{ color: "var(--gc-muted)", fontSize: 13 }}>
          Company Onboarding
        </span>
      </div>

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "44px 20px",
        }}
      >
        {/* Step progress */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 44,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "16.67%",
              right: "16.67%",
              height: 1,
              background: "var(--gc-border)",
            }}
          />
          {STEPS.map((s, i) => {
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div
                key={s}
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
                    background:
                      done || active ? "var(--gc-cyan)" : "var(--gc-bg3, #0a1929)",
                    border: `2px solid ${done || active ? "var(--gc-cyan)" : "var(--gc-border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: done || active ? "var(--gc-bg)" : "var(--gc-subtle)",
                    zIndex: 2,
                    position: "relative",
                    transition: "all 0.3s",
                  }}
                >
                  {done ? <Check size={16} /> : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: active ? "var(--gc-cyan)" : done ? "var(--gc-text-2)" : "var(--gc-subtle)",
                    fontWeight: active ? 600 : 400,
                    textAlign: "center",
                  }}
                >
                  {s}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div
          style={{
            background: "rgba(6,182,212,0.02)",
            border: "1px solid rgba(6,182,212,0.1)",
            borderRadius: 16,
            padding: "36px 36px",
          }}
        >
          {/* ─ STEP 1 ─ */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                Company Profile
              </h2>
              <p style={{ color: "var(--gc-muted)", fontSize: 13, marginBottom: 28 }}>
                Tell us about your organisation so we can personalise your
                GridCast experience.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">Company / Organisation Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Tata Power Data Centers Pvt Ltd"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">GSTIN</label>
                  <input
                    style={inputStyle}
                    placeholder="27AABCU9603R1ZX"
                    value={form.gstin}
                    onChange={(e) => update("gstin", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Number of Employees</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 500"
                    value={form.employees}
                    onChange={(e) => update("employees", e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">Industry / Facility Type *</label>
                  <select
                    className="gc-select"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  >
                    <option value="">Select your industry…</option>
                    {INDUSTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {industryDef && (
                  <div
                    style={{
                      gridColumn: "span 2",
                      background: "rgba(6,182,212,0.06)",
                      border: "1px solid rgba(6,182,212,0.15)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--gc-text-2)",
                    }}
                  >
                    <Zap size={14} className="text-cyan-400" /> Typical base load for{" "}
                    <strong style={{ color: "var(--gc-text)" }}>{industryDef.label}</strong>:{" "}
                    <span
                      style={{
                        color: "var(--gc-cyan)",
                        fontFamily: "var(--gc-font-mono)",
                      }}
                    >
                      {industryDef.baseLoad} MW
                    </span>{" "}
                    · PUE:{" "}
                    <span
                      style={{
                        color: "var(--gc-amber)",
                        fontFamily: "var(--gc-font-mono)",
                      }}
                    >
                      {industryDef.pue}
                    </span>
                  </div>
                )}

                <div>
                  <label className="gc-label">Grid Region</label>
                  <select
                    className="gc-select"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.region}
                    onChange={(e) => update("region", e.target.value)}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="gc-label">Facility Size (sq. ft.)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 50000"
                    value={form.facilitySize}
                    onChange={(e) => update("facilitySize", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* ─ STEP 2 ─ */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                Electricity Setup
              </h2>
              <p style={{ color: "var(--gc-muted)", fontSize: 13, marginBottom: 28 }}>
                This allows GridCast to model your load curve and calculate
                savings potential accurately.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 20,
                }}
              >
                <div>
                  <label className="gc-label">Expected Avg Load (MW) *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.1"
                    placeholder={
                      industryDef ? String(industryDef.baseLoad) : "e.g. 8.5"
                    }
                    value={form.expectedLoad}
                    onChange={(e) => update("expectedLoad", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Peak Load (MW)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.1"
                    placeholder="e.g. 12.5"
                    value={form.peakLoad}
                    onChange={(e) => update("peakLoad", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Off-Peak Load (MW)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.5"
                    value={form.offPeakLoad}
                    onChange={(e) => update("offPeakLoad", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Contract Demand (kVA)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 10000"
                    value={form.contractDemand}
                    onChange={(e) => update("contractDemand", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Sanctioned Load (kW)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="e.g. 8500"
                    value={form.sanctionedLoad}
                    onChange={(e) => update("sanctionedLoad", e.target.value)}
                  />
                </div>

                <div>
                  <label className="gc-label">Operational Shift Pattern</label>
                  <select
                    className="gc-select"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.shift}
                    onChange={(e) => update("shift", e.target.value)}
                  >
                    {SHIFT_PATTERNS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cooling type */}
                <div style={{ gridColumn: "span 3" }}>
                  <label className="gc-label">Primary Cooling System</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 12,
                    }}
                  >
                    {COOLING_TYPES.map((c) => (
                      <div
                        key={c.value}
                        onClick={() => update("cooling", c.value)}
                        style={{
                          border: `1.5px solid ${
                            form.cooling === c.value
                              ? "var(--gc-cyan)"
                              : "rgba(6,182,212,0.15)"
                          }`,
                          borderRadius: 8,
                          padding: "12px 8px",
                          textAlign: "center",
                          cursor: "pointer",
                          background:
                            form.cooling === c.value
                              ? "rgba(6,182,212,0.1)"
                              : "transparent",
                          fontSize: 12,
                          color:
                            form.cooling === c.value
                              ? "var(--gc-cyan)"
                              : "var(--gc-muted)",
                          transition: "all 0.2s",
                        }}
                      >
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Renewable slider */}
                <div style={{ gridColumn: "span 3" }}>
                  <label className="gc-label">
                    Current Renewable / Solar %:{" "}
                    <span
                      style={{
                        color: "var(--gc-green)",
                        fontFamily: "var(--gc-font-mono)",
                      }}
                    >
                      {form.renewablePercent}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.renewablePercent}
                    onChange={(e) => update("renewablePercent", +e.target.value)}
                    style={{ width: "100%", accentColor: "var(--gc-green)" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--gc-subtle)",
                      marginTop: 4,
                    }}
                  >
                    <span>0% (100% grid)</span>
                    <span>50% hybrid</span>
                    <span>100% renewable</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─ STEP 3 ─ */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                Goals &amp; Sustainability
              </h2>
              <p style={{ color: "var(--gc-muted)", fontSize: 13, marginBottom: 28 }}>
                Set your targets and let GridCast build a personalised
                optimisation plan.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">
                    Green Energy Target by 2030:{" "}
                    <span
                      style={{
                        color: "var(--gc-green)",
                        fontFamily: "var(--gc-font-mono)",
                      }}
                    >
                      {form.greenTarget}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.greenTarget}
                    onChange={(e) => update("greenTarget", +e.target.value)}
                    style={{ width: "100%", accentColor: "var(--gc-green)" }}
                  />
                </div>

                <div>
                  <label className="gc-label">Annual Electricity Budget</label>
                  <select
                    className="gc-select"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.budgetRange}
                    onChange={(e) => update("budgetRange", e.target.value)}
                  >
                    <option value="">Select range…</option>
                    <option>₹1–5 Cr / year</option>
                    <option>₹5–25 Cr / year</option>
                    <option>₹25–100 Cr / year</option>
                    <option>₹100 Cr+ / year</option>
                  </select>
                </div>

                <div>
                  <label className="gc-label">Primary Optimisation Priority</label>
                  <select className="gc-select" style={{ ...inputStyle, cursor: "pointer" }}>
                    <option>Cost Reduction (₹ savings)</option>
                    <option>Carbon Footprint (tCO₂)</option>
                    <option>Grid Reliability / Uptime</option>
                    <option>Regulatory Compliance</option>
                  </select>
                </div>

                {/* Savings estimate */}
                {loadMW > 0 && (
                  <div
                    style={{
                      gridColumn: "span 2",
                      background: "rgba(16,185,129,0.05)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--gc-green)",
                        fontWeight: 600,
                        marginBottom: 14,
                        fontFamily: "var(--gc-font-mono)",
                        letterSpacing: "0.15em",
                      }}
                    >
                      ESTIMATED ANNUAL SAVINGS POTENTIAL
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 16,
                      }}
                    >
                      {[
                        [
                          `${savingsMWh.toFixed(0)} MWh`,
                          "Energy Optimised / yr",
                          "var(--gc-cyan)",
                        ],
                        [
                          `${co2Saved} tCO₂`,
                          "Carbon Avoided / yr",
                          "var(--gc-green)",
                        ],
                        [
                          `₹${inrSaved}`,
                          "Cost Saved / yr",
                          "var(--gc-amber)",
                        ],
                      ].map(([val, label, color]) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 18,
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
                              color: "var(--gc-muted)",
                              marginTop: 4,
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--gc-subtle)",
                        marginTop: 12,
                      }}
                    >
                      *Estimate based on 12% optimisation potential · India grid
                      emission factor 0.716 tCO₂/MWh (CEA FY2022-23)
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 32,
            }}
          >
            <button
              onClick={() =>
                step > 1 ? setStep(step - 1) : router.push("/login")
              }
              className="gc-btn gc-btn-dim"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() =>
                step < 3 ? setStep(step + 1) : router.push("/company")
              }
              className="gc-btn gc-btn-primary"
              style={step === 3 ? { background: "var(--gc-green)" } : {}}
            >
              {step === 3 ? "Launch My Dashboard" : "Continue"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
