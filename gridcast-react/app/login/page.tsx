"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LoginMode = null | "admin" | "company";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = (target: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push(target);
    }, 900);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gc-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--gc-font-sans)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated cyberpunk background */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.14,
        }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="login-grid-bg"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#login-grid-bg)" />
        {[200, 600, 1000].map((x) => (
          <polyline
            key={x}
            points={`${x},0 ${x - 20},200 ${x + 15},220 ${x - 10},450`}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.5"
            style={{
              animation: `gc-lightning ${3 + x / 400}s ${x / 700}s infinite`,
            }}
          />
        ))}
        {[160, 520, 880].map((x) => (
          <g key={x} opacity="0.35">
            <line x1={x} y1={620} x2={x} y2={510} stroke="#0e7490" strokeWidth="2" />
            <line x1={x - 30} y1={530} x2={x + 30} y2={530} stroke="#0e7490" strokeWidth="1.5" />
            <line x1={x - 15} y1={550} x2={x + 15} y2={550} stroke="#0e7490" strokeWidth="1" />
          </g>
        ))}
      </svg>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "rgba(2,15,26,0.92)",
          border: "1px solid rgba(6,182,212,0.22)",
          borderRadius: 20,
          padding: "40px 40px",
          width: 440,
          maxWidth: "calc(100vw - 32px)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/landing" className="gc-logo" style={{ justifyContent: "center" }}>
            <span className="gc-logo-dot" />
            Grid<span className="gc-logo-accent">Cast</span>
          </Link>
          <p style={{ fontSize: 13, color: "var(--gc-muted)", marginTop: 6 }}>
            AI-powered grid forecasting platform
          </p>
        </div>

        {!mode && (
          <>
            <p style={{ fontSize: 14, color: "var(--gc-text-2)", textAlign: "center", marginBottom: 20 }}>
              Select your access type
            </p>
            <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
              {[
                { id: "admin", emoji: "🔧", title: "Admin", sub: "Grid operators, NLDC engineers, system administrators" },
                { id: "company", emoji: "🏢", title: "Company", sub: "Industrial consumers, data centers, large enterprises" },
              ].map(({ id, emoji, title, sub }) => (
                <button
                  key={id}
                  id={`mode-${id}`}
                  onClick={() => setMode(id as LoginMode)}
                  style={{
                    flex: 1,
                    border: "1.5px solid rgba(6,182,212,0.2)",
                    borderRadius: 14,
                    padding: "24px 16px",
                    cursor: "pointer",
                    textAlign: "center",
                    background: "transparent",
                    transition: "all 0.22s",
                    fontFamily: "var(--gc-font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.6)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.2)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>
                  <div style={{ fontWeight: 600, color: "var(--gc-text)", marginBottom: 6, fontSize: 15 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--gc-muted)", lineHeight: 1.5 }}>{sub}</div>
                </button>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--gc-subtle)" }}>
              New to GridCast?{" "}
              <span onClick={() => setMode("company")} style={{ color: "var(--gc-cyan)", cursor: "pointer" }}>
                Request access
              </span>
            </p>
          </>
        )}

        {mode && (
          <>
            <button
              onClick={() => setMode(null)}
              style={{
                background: "none", border: "none", color: "var(--gc-muted)", cursor: "pointer",
                fontSize: 13, marginBottom: 20, fontFamily: "var(--gc-font-sans)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              ← Back
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 20 }}>{mode === "admin" ? "🔧" : "🏢"}</span>
              <div>
                <div style={{ fontWeight: 600, color: "var(--gc-text)", fontSize: 15 }}>
                  {mode === "admin" ? "Admin Login" : "Company Login"}
                </div>
                <div style={{ fontSize: 12, color: "var(--gc-muted)" }}>
                  {mode === "admin" ? "Grid operator · NRLDC system access" : "Industrial consumer · Energy optimisation"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <input
                id="login-email"
                className="gc-input"
                type="email"
                placeholder={mode === "admin" ? "operator@nldc.in" : "company@example.com"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                id="login-password"
                className="gc-input"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gc-muted)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--gc-cyan)" }} /> Remember me
                </label>
                <span style={{ color: "var(--gc-cyan)", cursor: "pointer" }}>Forgot password?</span>
              </div>
            </div>

            <button
              id="login-submit"
              onClick={() => handleLogin(mode === "admin" ? "/admin" : "/onboarding")}
              className="gc-btn gc-btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "13px", opacity: loading ? 0.75 : 1 }}
              disabled={loading}
            >
              {loading ? "Authenticating…" : mode === "admin" ? "Sign In as Admin →" : "Sign In as Company →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--gc-ghost)", fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: "var(--gc-border)" }} />
              <span>Or continue with</span>
              <div style={{ flex: 1, height: 1, background: "var(--gc-border)" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {[{ icon: "G", label: "Google" }, { icon: "GH", label: "GitHub" }].map(({ icon, label }) => (
                <button
                  key={label}
                  style={{
                    flex: 1, background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)",
                    borderRadius: 8, padding: "10px", color: "var(--gc-text-2)", fontSize: 12, cursor: "pointer",
                    fontFamily: "var(--gc-font-sans)", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6, transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.4)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.15)")}
                >
                  <span style={{ fontWeight: 700 }}>{icon}</span> {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
