"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { usePredictiveEngine } from "@/lib/predictiveEngine";
import { ForecastData, ResidualData, ModelType, Horizon, MODEL_CONFIGS } from '@/types';
import { fetchForecastData, fetchResidualData } from '@/lib/api';

// New Chart Components
import { ForecastChart } from '@/components/charts/ForecastChart';
import { ModelComparison } from '@/components/charts/ModelComparison';
import { ResidualHeatmap } from '@/components/charts/ResidualHeatmap';
import { KPICard } from '@/components/dashboard/KPICard';
import { 
  Zap, 
  TrendingUp, 
  Target, 
  Activity, 
  RefreshCw, 
  Clock, 
  LogOut, 
  FileText, 
  LayoutDashboard, 
  Leaf, 
  DollarSign, 
  Sun, 
  BarChart, 
  Layers, 
  Home, 
  Car, 
  Factory,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building2,
  Mail,
  Terminal,
  ChevronRight,
  Info
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── TYPES ────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    THREE: any;
  }
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INDIA_GRID_EMISSION_FACTOR = 0.716;
const INR_PER_KWH = 7.5;

const inputSt = { 
  background: "rgba(6,182,212,0.05)", 
  border: "1px solid rgba(6,182,212,0.2)", 
  borderRadius: 8, 
  padding: "11px 14px", 
  color: "#e2e8f0", 
  fontSize: 14, 
  width: "100%", 
  fontFamily: "inherit", 
  outline: "none" 
};

const REGIONS = [
  { id: "north", label: "North (NRLDC)", nodes: ["DEL-N", "HR-01", "UP-02", "PB-01", "RJ-03"], color: "#06b6d4" },
  { id: "west", label: "West (WRLDC)", nodes: ["MH-01", "GJ-02", "MP-03", "CG-01", "GJ-03"], color: "#f59e0b" },
  { id: "south", label: "South (SRLDC)", nodes: ["KA-01", "TN-02", "AP-03", "TS-01", "KL-02"], color: "#10b981" },
  { id: "east", label: "East (ERLDC)", nodes: ["WB-01", "OR-02", "JH-01", "BR-02", "AS-01"], color: "#a78bfa" },
];

const INDUSTRY_TYPES = [
  { value: "data_center", label: "Data Center / Cloud Infrastructure", baseLoad: 8.5, pue: 1.6 },
  { value: "manufacturing", label: "Heavy Manufacturing / Steel Plant", baseLoad: 45, pue: 1.0 },
  { value: "pharma", label: "Pharmaceutical / Cold Chain", baseLoad: 12, pue: 1.2 },
  { value: "it_campus", label: "IT Campus / Tech Park", baseLoad: 5.5, pue: 1.3 },
  { value: "textile", label: "Textile / Garment Factory", baseLoad: 22, pue: 1.0 },
  { value: "hospital", label: "Hospital / Healthcare Complex", baseLoad: 3.5, pue: 1.1 },
  { value: "cement", label: "Cement / Mining Operations", baseLoad: 60, pue: 1.0 },
  { value: "retail", label: "Retail Chain / Mall Operations", baseLoad: 4.5, pue: 1.2 },
];

const SHIFT_PATTERNS = [
  { value: "24x7", label: "24×7 Continuous Operations" },
  { value: "double", label: "Double Shift (16 hrs/day)" },
  { value: "single", label: "Single Shift (8 hrs/day)" },
  { value: "peak_avoid", label: "Flexible / Peak-Hour Avoidance" },
];

const COOLING_TYPES = [
  { value: "air", label: "Air Cooling (HVAC)" },
  { value: "liquid", label: "Liquid / Immersion Cooling" },
  { value: "evap", label: "Evaporative Cooling Tower" },
  { value: "district", label: "District Cooling" },
];

const SCHEDULED_TASKS = [
  { id: 1, name: "Batch Processing Jobs", currentTime: "14:00", optimalTime: "02:30", savingsPercent: 18, region: "north" },
  { id: 2, name: "HVAC Pre-cooling Cycle", currentTime: "08:00", optimalTime: "06:00", savingsPercent: 12, region: "north" },
  { id: 3, name: "EV Fleet Charging", currentTime: "09:00", optimalTime: "01:00", savingsPercent: 25, region: "west" },
  { id: 4, name: "Database Backup & Sync", currentTime: "22:00", optimalTime: "03:00", savingsPercent: 8, region: "north" },
  { id: 5, name: "Manufacturing Line Startup", currentTime: "07:00", optimalTime: "05:30", savingsPercent: 15, region: "south" },
];

// ─── SEEDED RNG (deterministic, SSR-safe) ──────────────────────────────────
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function genLoadDataSeeded(count = 96, seed = 42) {
  const rng = seededRng(seed);
  const base = 4200;
  return Array.from({ length: count }, (_, i) => {
    const hour = (i * 15) / 60;
    const daily = -Math.cos((hour / 24) * Math.PI * 2) * 600;
    const noise = (rng() - 0.5) * 200;
    return Math.round(base + daily + noise);
  });
}

// ─── LOAD THREE.JS ────────────────────────────────────────────────────────────
function useThreeJs() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.THREE) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── THREE.JS HERO CANVAS ─────────────────────────────────────────────────────
function useThreeHero(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !canvasRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 12, 28);
    camera.lookAt(0, 0, 0);

    const gridHelper = new THREE.GridHelper(60, 30, 0x06b6d4, 0x0e7490);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const rng = seededRng(7);
    const nodeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const nodes: any[] = [];
    const nodePositions: any[] = [];
    for (let i = 0; i < 25; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const x = (rng() - 0.5) * 40, z = (rng() - 0.5) * 40;
      mesh.position.set(x, -1.8, z);
      nodePositions.push({ x, z, phase: rng() * Math.PI * 2 });
      nodes.push(mesh);
      scene.add(mesh);
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0x0891b2, transparent: true, opacity: 0.4 });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodePositions[i].x - nodePositions[j].x;
        const dz = nodePositions[i].z - nodePositions[j].z;
        if (Math.sqrt(dx * dx + dz * dz) < 12) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
          scene.add(new THREE.Line(geo, lineMat));
        }
      }
    }

    const rings: any[] = [];
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set((rng() - 0.5) * 30, -1.75, (rng() - 0.5) * 30);
      ring.userData = { phase: rng() * Math.PI * 2, speed: 0.8 + rng() };
      rings.push(ring);
      scene.add(ring);
    }

    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (rng() - 0.5) * 50;
      positions[i * 3 + 1] = (rng() - 0.5) * 20;
      positions[i * 3 + 2] = (rng() - 0.5) * 50;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.15, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(pGeo, pMat));

    let frame: number, t = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.01;
      nodes.forEach((n, i) => {
        const scale = 1 + 0.3 * Math.sin(t + nodePositions[i].phase);
        n.scale.setScalar(scale);
        const intensity = 0.5 + 0.5 * Math.sin(t + nodePositions[i].phase);
        n.material.color.setHSL(0.53, 1, 0.3 + 0.3 * intensity);
      });
      rings.forEach((r) => {
        const s = 1 + 1.5 * ((Math.sin(t * r.userData.speed + r.userData.phase) + 1) / 2);
        r.scale.setScalar(s);
        r.material.opacity = 0.8 * (1 - (s - 1) / 1.5);
      });
      const pos = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += 0.03;
        if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -2;
      }
      pGeo.attributes.position.needsUpdate = true;
      camera.position.x = 28 * Math.sin(t * 0.05);
      camera.position.z = 28 * Math.cos(t * 0.05);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!canvas.clientWidth) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); renderer.dispose(); };
  }, [canvasRef, active]);
}

// ─── THREE.JS DASHBOARD CANVAS ────────────────────────────────────────────────
function useThreeDashGrid(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !canvasRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
    camera.position.set(0, 20, 35);
    camera.lookAt(0, 0, 0);

    const rng = seededRng(13);
    const regionColors = [0x06b6d4, 0xf59e0b, 0x10b981, 0xa78bfa];
    const allNodes: any[] = [];

    REGIONS.forEach((reg, ri) => {
      const cx = (ri % 2) * 20 - 10, cz = Math.floor(ri / 2) * 20 - 10;
      const color = regionColors[ri];
      reg.nodes.forEach((_, ni) => {
        const angle = (ni / reg.nodes.length) * Math.PI * 2;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(cx + 6 * Math.cos(angle), 0, cz + 6 * Math.sin(angle));
        mesh.userData = { phase: rng() * Math.PI * 2 };
        scene.add(mesh); allNodes.push(mesh);
      });
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), new THREE.MeshBasicMaterial({ color }));
      hub.position.set(cx, 0, cz);
      hub.userData = { phase: rng() * Math.PI * 2 };
      scene.add(hub); allNodes.push(hub);
    });

    const lMat = new THREE.LineBasicMaterial({ color: 0x164e63, transparent: true, opacity: 0.5 });
    const hubs = [[-10, -10], [10, -10], [-10, 10], [10, 10]];
    hubs.forEach(([ax, az], i) => hubs.forEach(([bx, bz], j) => {
      if (j <= i) return;
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, 0, az), new THREE.Vector3(bx, 0, bz)]), lMat));
    }));

    const sparkCount = 80;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkData: any[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const ri = Math.floor(rng() * 4);
      const cx = (ri % 2) * 20 - 10, cz = Math.floor(ri / 2) * 20 - 10;
      sparkData.push({ cx, cz, t: rng() });
      const angle = sparkData[i].t * Math.PI * 2;
      sparkPos[i * 3] = cx + 6 * Math.cos(angle); sparkPos[i * 3 + 1] = 0; sparkPos[i * 3 + 2] = cz + 6 * Math.sin(angle);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.3, transparent: true, opacity: 0.9 })));
    scene.add(new THREE.GridHelper(80, 40, 0x164e63, 0x0c4a6e));

    let frame: number, t = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate); t += 0.008;
      allNodes.forEach(n => n.scale.setScalar(1 + 0.25 * Math.sin(t + n.userData.phase)));
      const sp = sGeo.attributes.position.array as Float32Array;
      sparkData.forEach((s, i) => {
        s.t = (s.t + 0.01) % 1;
        const a = s.t * Math.PI * 2;
        sp[i * 3] = s.cx + 6 * Math.cos(a); sp[i * 3 + 1] = 0.2 * Math.sin(s.t * Math.PI * 4); sp[i * 3 + 2] = s.cz + 6 * Math.sin(a);
      });
      sGeo.attributes.position.needsUpdate = true;
      camera.position.x = 35 * Math.sin(t * 0.03); camera.position.z = 35 * Math.cos(t * 0.03);
      camera.lookAt(0, 0, 0); renderer.render(scene, camera);
    };
    animate();
    const onResize = () => { if (!canvas.clientWidth) return; camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); renderer.dispose(); };
  }, [canvasRef, active]);
}

// ─── SVG LOAD CHART (deterministic props) ─────────────────────────────────────
interface LoadChartProps { actual?: number[]; forecast?: number[]; height?: number; }

function LoadChart({ actual, forecast, height = 200 }: LoadChartProps) {
  // Generate stable data client-side via useMemo
  const { act, fct } = useMemo(() => {
    const act = actual ?? genLoadDataSeeded(96, 42);
    const fct = forecast ?? act.map((v, i) => v + Math.round((seededRng(i + 100)() - 0.5) * 120));
    return { act, fct };
  }, [actual, forecast]);

  const w = 700, h = height;
  const pad = { t: 16, r: 20, b: 32, l: 52 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const allVals = [...act, ...fct];
  const min = Math.min(...allVals) - 100, max = Math.max(...allVals) + 100;
  const xOf = (i: number) => pad.l + (i / (act.length - 1)) * cw;
  const yOf = (v: number) => pad.t + ch - ((v - min) / (max - min)) * ch;

  const apts = act.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
  const fpts = fct.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
  const upper = fct.map(v => v + 150), lower = fct.map(v => v - 150);
  const bandPts = [...upper.map((v, i) => `${xOf(i)},${yOf(v)}`), ...[...lower].reverse().map((v, i) => `${xOf(fct.length - 1 - i)},${yOf(v)}`)].join(" ");
  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => ({ t, v: Math.round(min + (1 - t) * (max - min)) }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }} role="img" aria-label="Load forecast chart">
      <polygon points={bandPts} fill="#06b6d4" fillOpacity="0.07" />
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + cw} y1={pad.t + t * ch} y2={pad.t + t * ch} stroke="#1e3a4a" strokeWidth="0.5" />
      ))}
      <polyline points={apts} fill="none" stroke="#0e7490" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
      <polyline points={fpts} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" />
      {yLabels.map(({ t, v }) => (
        <text key={t} x={pad.l - 6} y={pad.t + t * ch + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="JetBrains Mono, monospace">{v}</text>
      ))}
      {hours.map((label, i) => (
        <text key={label} x={pad.l + (i / 6) * cw} y={pad.t + ch + 20} textAnchor="middle" fontSize="10" fill="#64748b">{label}</text>
      ))}
    </svg>
  );
}

interface PremiumCompanyForecastChartProps {
  timestamps?: string[] | null;
  actual?: number[] | null;
  forecast?: number[] | null;
  optimized?: number[] | null;
  modelLabel: string;
  horizon: "24h" | "48h" | "72h";
  height?: number;
}

function formatHourLabel(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function PremiumCompanyForecastChart({
  timestamps,
  actual,
  forecast,
  optimized,
  modelLabel,
  horizon,
  height = 280,
}: PremiumCompanyForecastChartProps) {
  const hasData =
    !!timestamps &&
    !!actual &&
    !!forecast &&
    timestamps.length > 0 &&
    actual.length === timestamps.length &&
    forecast.length === timestamps.length;

  if (!hasData) {
    return (
      <div
        style={{
          border: "1px solid rgba(6,182,212,0.18)",
          borderRadius: 12,
          padding: "18px 16px",
          color: "#94a3b8",
          fontSize: 13,
          background: "rgba(2,15,26,0.45)",
        }}
      >
        No forecast data available for this view.
      </div>
    );
  }

  const safeTimestamps = timestamps as string[];
  const safeActual = actual as number[];
  const safeForecast = forecast as number[];
  const safeOptimized = optimized && optimized.length === safeForecast.length ? optimized : null;

  const peakIndex = safeForecast.reduce(
    (bestIndex, value, index) => (value > safeForecast[bestIndex] ? index : bestIndex),
    0
  );
  const peakValue = safeForecast[peakIndex] ?? 0;
  const avgForecast = safeForecast.reduce((sum, value) => sum + value, 0) / safeForecast.length;
  const optimizedMWhPerDay = safeOptimized
    ? (safeForecast.reduce((sum, value) => sum + value, 0) - safeOptimized.reduce((sum, value) => sum + value, 0)) / 4
    : 0;

  const categories = safeTimestamps.map(formatHourLabel);
  const peakCategory = categories[peakIndex] ?? categories[0];

  const options = {
    chart: {
      type: "line",
      height,
      toolbar: { show: false },
      animations: { enabled: true, speed: 650 },
      zoom: { enabled: false },
      fontFamily: "Space Grotesk, sans-serif",
      background: "transparent",
    },
    colors: ["#0ea5e9", "#22d3ee", "#34d399"],
    stroke: { width: [2.2, 2.8, 1.8], curve: "smooth" },
    dataLabels: { enabled: false },
    markers: { size: [0, 0, 0], hover: { size: 5 } },
    fill: {
      type: ["solid", "gradient", "gradient"],
      gradient: {
        shadeIntensity: 0.35,
        inverseColors: false,
        opacityFrom: 0.36,
        opacityTo: 0.03,
        stops: [0, 95, 100],
      },
    },
    grid: {
      borderColor: "rgba(148,163,184,0.2)",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      labels: { colors: "#94a3b8" },
      fontSize: "12px",
    },
    xaxis: {
      categories,
      labels: {
        style: { colors: "#64748b", fontSize: "11px" },
        rotate: -35,
        hideOverlappingLabels: true,
      },
      axisTicks: { show: false },
      axisBorder: { color: "rgba(148,163,184,0.2)" },
      tickAmount: 8,
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px" },
        formatter: (value: number) => `${Math.round(value).toLocaleString("en-IN")}`,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ series, dataPointIndex, w }: any) => {
        const t = w.globals.categoryLabels?.[dataPointIndex] ?? "";
        const rows = w.globals.seriesNames
          .map((name: string, idx: number) => {
            const value = series[idx]?.[dataPointIndex];
            if (typeof value !== "number") return "";
            const color = w.globals.colors?.[idx] ?? "#22d3ee";
            return `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:6px;"><span style="color:${color};font-weight:600;">${name}</span><span style="color:#e2e8f0;font-family:'JetBrains Mono',monospace;">${Math.round(value).toLocaleString('en-IN')} MW</span></div>`;
          })
          .join("");

        return `<div style="background:#020f1a;border:1px solid rgba(34,211,238,.35);border-radius:10px;padding:10px 12px;min-width:220px;"><div style="color:#67e8f9;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">${t}</div>${rows}</div>`;
      },
    },
    annotations: {
      points: [
        {
          x: peakCategory,
          y: Number(peakValue.toFixed(2)),
          marker: { size: 6, fillColor: "#ffffff", strokeColor: "#22d3ee", strokeWidth: 2 },
          label: {
            borderColor: "#22d3ee",
            offsetY: -12,
            style: { fontSize: "11px", color: "#083344", background: "#67e8f9" },
            text: `Pointer Tag: Peak ${Math.round(peakValue).toLocaleString("en-IN")} MW`,
          },
        },
      ],
      yaxis: [
        {
          y: Number(avgForecast.toFixed(2)),
          borderColor: "rgba(148,163,184,0.55)",
          strokeDashArray: 4,
          label: {
            text: `Avg ${Math.round(avgForecast).toLocaleString("en-IN")} MW`,
            style: { fontSize: "10px", background: "#cbd5e1", color: "#0f172a" },
          },
        },
      ],
    },
  };

  const series = [
    { name: "Actual", type: "line", data: safeActual.map((value) => Number(value.toFixed(2))) },
    { name: `Forecast (${modelLabel})`, type: "area", data: safeForecast.map((value) => Number(value.toFixed(2))) },
    ...(safeOptimized
      ? [{ name: "Optimized Target", type: "line", data: safeOptimized.map((value) => Number(value.toFixed(2))) }]
      : []),
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#67e8f9", border: "1px solid rgba(103,232,249,0.35)", background: "rgba(6,182,212,0.14)", borderRadius: 999, padding: "4px 10px", letterSpacing: 0.4 }}>
          Peak Pointer {peakCategory}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 999, padding: "4px 10px" }}>
          Horizon {horizon.toUpperCase()} · {safeForecast.length} intervals
        </span>
        {safeOptimized && (
          <span style={{ fontSize: 11, color: "#86efac", border: "1px solid rgba(134,239,172,0.35)", borderRadius: 999, padding: "4px 10px" }}>
            Optimizable {optimizedMWhPerDay.toFixed(1)} MWh/day
          </span>
        )}
      </div>
      <ReactApexChart type="line" height={height} options={options as any} series={series as any} />
    </>
  );
}

// ─── ERROR HEATMAP (deterministic) ────────────────────────────────────────────
function ErrorHeatmap({ matrix }: { matrix?: number[][] | null }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const data = useMemo(() => {
    if (matrix && matrix.length > 0) {
      return days.map((_, di) => hours.map(hi => {
        const row = matrix[di] ?? [];
        const value = Number(row[hi]);
        return Number.isFinite(value) ? value : 0;
      }));
    }
    const rng = seededRng(99);
    return days.map(() => hours.map(() => rng() * 8));
  }, [matrix, days, hours]);
  const colorOf = (v: number) => v < 1.5 ? "#064e3b" : v < 3 ? "#065f46" : v < 4.5 ? "#ca8a04" : v < 6 ? "#b45309" : "#991b1b";

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `32px repeat(24, 1fr)`, gap: 2, minWidth: 500 }}>
        <div />
        {hours.map(h => <div key={`hour-${h}`} style={{ fontSize: 9, color: "#64748b", textAlign: "center" }}>{h}</div>)}
        {days.map((day, di) => (
          <Fragment key={day}>
            <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center" }}>{day}</div>
            {hours.map((_, hi) => (
              <div key={`d${di}-h${hi}`} title={`${data[di][hi].toFixed(1)}% MAPE`}
                style={{ height: 12, borderRadius: 2, background: colorOf(data[di][hi]) }} />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── REGIONAL GRID MAP ────────────────────────────────────────────────────────
function RegionGridMap() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const regionPositions = [
    { id: "north", cx: 200, cy: 120 },
    { id: "west", cx: 120, cy: 230 },
    { id: "south", cx: 200, cy: 320 },
    { id: "east", cx: 320, cy: 220 },
  ];
  const edges: [string, string][] = [["north", "west"], ["north", "east"], ["west", "south"], ["east", "south"], ["north", "south"]];
  const posMap = Object.fromEntries(regionPositions.map(r => [r.id, r]));

  return (
    <svg viewBox="0 0 440 420" width="100%" style={{ display: "block" }}>
      {edges.map(([a, b], i) => {
        const pa = posMap[a], pb = posMap[b];
        const reg = REGIONS.find(r => r.id === a)!;
        return <line key={i} x1={pa.cx} y1={pa.cy} x2={pb.cx} y2={pb.cy} stroke={reg.color} strokeWidth="1.5" strokeOpacity="0.35" strokeDasharray="5 4" />;
      })}
      {regionPositions.map(rp => {
        const reg = REGIONS.find(r => r.id === rp.id)!;
        const isActive = activeNode === rp.id;
        return (
          <g key={rp.id} style={{ cursor: "pointer" }} onClick={() => setActiveNode(isActive ? null : rp.id)}>
            <circle cx={rp.cx} cy={rp.cy} r={isActive ? 30 : 22} fill={reg.color} fillOpacity="0.12" stroke={reg.color} strokeWidth={isActive ? 2 : 1.5} style={{ transition: "all 0.3s" }} />
            <circle cx={rp.cx} cy={rp.cy} r={8} fill={reg.color} />
            <text x={rp.cx} y={rp.cy + 42} textAnchor="middle" fontSize="10" fill={reg.color} fontWeight="500">{reg.label.split(" ")[0]}</text>
            {reg.nodes.map((nid, ni) => {
              const angle = (ni / reg.nodes.length) * Math.PI * 2 - Math.PI / 2;
              const nx = rp.cx + 52 * Math.cos(angle), ny = rp.cy + 52 * Math.sin(angle);
              return (
                <g key={nid}>
                  <line x1={rp.cx} y1={rp.cy} x2={nx} y2={ny} stroke={reg.color} strokeWidth="0.75" strokeOpacity="0.4" />
                  <circle cx={nx} cy={ny} r={4} fill={reg.color} fillOpacity="0.65" />
                  <text x={nx} y={ny + 13} textAnchor="middle" fontSize="7.5" fill="#64748b">{nid}</text>
                </g>
              );
            })}
          </g>
        );
      })}
      <text x={220} y={405} textAnchor="middle" fontSize="10" fill="#475569">Click a region to inspect nodes</text>
    </svg>
  );
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimCounter({ target, decimals = 0, duration = 1800, suffix = "" }: { target: number; decimals?: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, decimals, duration]);
  return <span>{val.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// ─── DEMO CREDENTIALS BANNER ──────────────────────────────────────────────────
function DemoBanner({ mode }: { mode: "admin" | "company" }) {
  const creds = mode === "admin"
    ? { email: "admin@gridcast.in", password: "demo1234" }
    : { email: "company@gridcast.in", password: "demo1234" };
  return (
    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
      <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>🔑 Demo Credentials</div>
      <div style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>
        {creds.email} · {creds.password}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: LANDING
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeReady = useThreeJs();
  const [scrollY, setScrollY] = useState(0);
  useThreeHero(canvasRef, threeReady);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Deterministic grid nodes — seeded
  const gridNodes = useMemo(() => {
    const rng = seededRng(55);
    return Array.from({ length: 20 }, (_, i) => {
      const r = rng();
      const status = r > 0.7 ? "warn" : r > 0.9 ? "critical" : "active";
      const labels = ["DEL", "HR", "UP", "PB", "RJ", "MH", "GJ", "MP", "KA", "TN"];
      return { id: i, status, label: `${labels[i % 10]}-${String(i + 1).padStart(2, "0")}` };
    });
  }, []);

  const statColor = (s: string) => s === "active" ? "#06b6d4" : s === "warn" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: "#020f1a", color: "#e2e8f0", fontFamily: "Space Grotesk, sans-serif", overflowX: "hidden" }}>
      {/* ── NAV ── */}
      <nav style={{ position: "fixed", inset: "0 0 auto 0", zIndex: 100, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: scrollY > 40 ? "rgba(2,15,26,0.95)" : "transparent", borderBottom: scrollY > 40 ? "1px solid rgba(6,182,212,0.1)" : "none", backdropFilter: scrollY > 40 ? "blur(12px)" : "none", transition: "all 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "gc-pulse-ring 2s infinite" }} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Grid<span style={{ color: "#06b6d4" }}>Cast</span></span>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#94a3b8" }}>
          {["Grid", "Problem", "Pipeline", "Impact", "Tech"].map(l => (
            <span key={l} style={{ cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = "#e2e8f0")}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = "#94a3b8")}>{l}</span>
          ))}
        </div>
        <button className="gc-btn gc-btn-ghost" style={{ padding: "8px 20px", fontSize: 13 }} onClick={() => onNavigate("login")}>Request Demo</button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", height: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(2,15,26,.85) 0%,rgba(2,15,26,.45) 60%,rgba(2,15,26,.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "0 80px", maxWidth: 720, animation: "gc-slide-in 1s var(--gc-ease) both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 100, padding: "5px 16px", marginBottom: 24 }}>
            <span className="gc-led gc-led-cyan" style={{ animation: "gc-pulse-ring 2s infinite" }} />
            <span style={{ fontSize: 11, letterSpacing: 2, color: "#06b6d4", fontWeight: 600, textTransform: "uppercase" }}>Smart Grid Forecasting · NRLDC / CEA</span>
          </div>
          <h1 style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-2px", marginBottom: 20 }}>
            Predict the Grid.<br /><span style={{ color: "#06b6d4" }}>Before It Breaks.</span>
          </h1>
          <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.75, marginBottom: 36, maxWidth: 540 }}>
            AI-powered electricity load forecasting at 15-minute resolution, 24 hours ahead. Purpose-built for India's smart grid operators with sub-millisecond inference.
          </p>
          <div style={{ display: "flex", gap: 16, marginBottom: 52 }}>
            <button className="gc-btn gc-btn-primary" style={{ fontSize: 15, padding: "13px 32px", boxShadow: "0 0 24px rgba(6,182,212,0.3)" }} onClick={() => onNavigate("login")}>See Live Demo →</button>
            <button className="gc-btn gc-btn-ghost" style={{ fontSize: 15, padding: "13px 32px" }}>How it works ↓</button>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {[["96", "Forecast Steps"], ["15 min", "Resolution"], ["<3%", "MAPE Target"]].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#06b6d4", fontFamily: "JetBrains Mono, monospace" }}>{val}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SMART GRID ── */}
      <section style={{ padding: "100px 80px", background: "#020f1a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
          <div>
            <p className="gc-section-label" style={{ marginBottom: 14 }}>What is a Smart Grid</p>
            <h2 style={{ fontSize: 38, fontWeight: 700, marginBottom: 20, letterSpacing: "-1px", lineHeight: 1.15 }}>The grid is overloaded.<br />AI makes it smart.</h2>
            <p style={{ color: "#94a3b8", lineHeight: 1.8, marginBottom: 18, fontSize: 15 }}>Traditional grids operate reactively — they respond to demand spikes after they happen, causing cascading failures, brownouts, and costly reserve dispatch.</p>
            <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>Smart grids use real-time forecasting to anticipate load, balance renewable intermittency, and dispatch reserves precisely — slashing waste and carbon emissions by up to 30%.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 36 }}>
              {[["4.7B+", "People on global grids"], ["₹2T+", "India grid investment"], ["30%", "Reserve waste reducible"], ["0.716", "tCO₂/MWh India grid"]].map(([v, l]) => (
                <div key={l} className="gc-card" style={{ padding: "18px 20px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#06b6d4", fontFamily: "JetBrains Mono, monospace" }}>{v}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="gc-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 11, color: "#0e7490", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Live Grid Nodes — North Region</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
              {gridNodes.map(n => (
                <div key={n.id} style={{ border: `1px solid ${statColor(n.status)}`, borderRadius: 8, padding: "8px 4px", textAlign: "center", background: `${statColor(n.status)}10`, animation: n.status === "critical" ? "gc-blink 1.2s infinite" : "none" }}>
                  <div style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: statColor(n.status) }}>{n.label}</div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: statColor(n.status), margin: "5px auto 0" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Current System Load</span><span style={{ color: "#06b6d4", fontFamily: "JetBrains Mono, monospace" }}>42,180 MW</span>
            </div>
            <div style={{ background: "#0f1e2e", borderRadius: 4, height: 6 }}>
              <div style={{ width: "72%", height: 6, borderRadius: 4, background: "linear-gradient(90deg,#0e7490,#06b6d4)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section style={{ padding: "100px 80px", background: "#030d17" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gc-section-label" style={{ marginBottom: 14 }}>The Challenge</p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-1px" }}>Six problems killing grid efficiency</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            ["⚡", "Demand Volatility", "Load swings 15–40% within minutes during peak events, outpacing manual dispatch by 3–5×."],
            ["☁", "Renewable Intermittency", "Solar and wind generation can drop 80% in minutes. Without forecasting, operators over-provision expensive reserves."],
            ["📊", "Dispatch Inefficiency", "Without accurate 15-min forecasts, operators carry 20–30% excess reserve capacity at ₹8–12/unit hidden cost."],
            ["🗄", "Data Quality Gaps", "SCADA telemetry drops, sensor drift, and holiday anomalies create gaps conventional models cannot bridge."],
            ["🏗", "Infrastructure Stress", "Legacy transmission infrastructure carries 110–125% rated load during heatwaves, risking catastrophic failure."],
            ["✅", "GridCast Solves This", "96-step autoregressive XGBoost + LSTM pipeline with automated anomaly detection and sub-3% MAPE on NRLDC data.", true],
          ].map(([icon, title, desc, highlight]) => (
            <div key={String(title)} className="gc-card" style={{ padding: 28, ...(highlight ? { borderColor: "#06b6d4", background: "rgba(6,182,212,0.07)" } : {}) }}>
              <div style={{ fontSize: 26, marginBottom: 14 }}>{icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: highlight ? "#06b6d4" : "#e2e8f0" }}>{title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section style={{ padding: "100px 80px", background: "#020f1a" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gc-section-label" style={{ marginBottom: 14 }}>How It Works</p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-1px" }}>Six-stage ML pipeline</h2>
        </div>
        <div style={{ display: "flex", gap: 0, position: "relative", alignItems: "flex-start" }}>
          <div style={{ position: "absolute", top: 20, left: "calc(8.33% + 20px)", right: "calc(8.33% + 20px)", height: 1, background: "linear-gradient(90deg,#06b6d4,#0e7490,#06b6d4)", opacity: 0.4 }} />
          {[["SC", "Scrape", "Selenium ETL from NLDC portal every 15 min"], ["EX", "Extract", "Parquet feature store with lag & calendar vars"], ["CL", "Clean", "Z-score anomaly detect + gap interpolation"], ["ML", "Train", "XGBoost + LSTM on 2-yr NRLDC data"], ["API", "Serve", "Flask REST · P95 latency <1ms"], ["UI", "Visualise", "Operator dashboard + company portal"]].map(([code, title, desc]) => (
            <div key={code} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 8px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(6,182,212,0.15)", border: "1.5px solid #06b6d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#06b6d4", fontFamily: "JetBrains Mono, monospace", position: "relative", zIndex: 2 }}>{code}</div>
              <div style={{ fontWeight: 600, fontSize: 13, textAlign: "center" }}>{title}</div>
              <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section style={{ padding: "100px 80px", background: "#030d17" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gc-section-label" style={{ marginBottom: 14 }}>Real-Time Operations</p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-1px" }}>Live operator dashboard preview</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["Current Load", "42,180 MW", "#06b6d4"], ["Peak Forecast", "45,320 MW", "#f59e0b"], ["Model MAPE", "2.4%", "#10b981"], ["Last Updated", "14:30 IST", "#94a3b8"], ["API Status", "● LIVE", "#10b981"]].map(([label, val, color]) => (
              <div key={String(label)} className="gc-card" style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color, fontFamily: "JetBrains Mono, monospace" }}>{val}</div>
              </div>
            ))}
          </div>
          <div className="gc-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>24-Hour Load Forecast — North Region (MW)</div>
            <LoadChart />
            <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 11, color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 2, background: "#0e7490", display: "inline-block", opacity: 0.7 }} />Actual</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 2, background: "#06b6d4", display: "inline-block" }} />Forecast</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 8, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", display: "inline-block", borderRadius: 2 }} />±5% CI</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT ── */}
      <section id="impact" style={{ padding: "100px 80px", background: "#020f1a" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gc-section-label" style={{ marginBottom: 14 }}>Measurable Impact</p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-1px" }}>Results that matter</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 56 }}>
          {[["-30%", "Reserve capacity waste"], ["<3%", "24hr MAPE target"], ["96×", "Decisions per day"], ["<1ms", "API inference latency"]].map(([val, label]) => (
            <div key={String(label)} className="gc-card gc-card-glow" style={{ padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#06b6d4", fontFamily: "JetBrains Mono, monospace" }}>{val}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH ── */}
      <section style={{ padding: "100px 80px", background: "#030d17" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gc-section-label" style={{ marginBottom: 14 }}>Tech Stack</p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-1px" }}>Production-grade infrastructure</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[["XGBoost", "Gradient-boosted forecasting with SHAP explainability. 96-step autoregressive rollout.", "#f59e0b"], ["Pandas / Parquet", "Feature store with lag, rolling stats, and calendar features. Sub-100ms load time.", "#06b6d4"], ["Flask REST API", "P95 latency <1ms. Joblib model serialization. Docker-ready deployment.", "#10b981"], ["Selenium ETL", "Automated NLDC data scraping every 15 minutes. Retry logic and gap filling.", "#a78bfa"], ["SVG Dashboard", "Pure SVG visualisations. Zero-dependency, works offline on operator terminals.", "#06b6d4"], ["LSTM (Planned)", "PyTorch sequence model for long-range patterns. Captures weekly seasonality across 96+ steps.", "#f59e0b"]].map(([title, desc, color]) => (
            <div key={String(title)} className="gc-card" style={{ padding: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginBottom: 14 }} />
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 80px", textAlign: "center", borderTop: "1px solid rgba(6,182,212,0.1)" }}>
        <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-2px", marginBottom: 16 }}>Ready to forecast the grid?</h2>
        <p style={{ color: "#64748b", marginBottom: 36, fontSize: 16 }}>Join grid operators using AI to prevent blackouts, reduce waste, and cut carbon.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="gc-btn gc-btn-primary" style={{ fontSize: 15, padding: "14px 40px", boxShadow: "0 0 30px rgba(6,182,212,0.25)" }} onClick={() => onNavigate("login")}>Request a Demo →</button>
          <button className="gc-btn gc-btn-ghost" style={{ fontSize: 15, padding: "14px 40px" }}>View on GitHub ↗</button>
        </div>
        <div style={{ marginTop: 52, color: "#334155", fontSize: 12, display: "flex", justifyContent: "center", gap: 28 }}>
          {["GridCast v2.1", "MIT License", "© 2026 GridCast", "Built on NRLDC Open Data"].map(t => <span key={t}>{t}</span>)}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: LOGIN
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_CREDS = {
  admin: { email: "admin@gridcast.in", password: "demo1234" },
  company: { email: "company@gridcast.in", password: "demo1234" },
};

function LoginPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [mode, setMode] = useState<null | "admin" | "company">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = () => {
    if (!mode) return;
    const creds = DEMO_CREDS[mode];
    if (form.email.trim() === creds.email && form.password === creds.password) {
      setLoading(true);
      setError("");
      setTimeout(() => {
        setLoading(false);
        onNavigate(mode === "admin" ? "admin-dashboard" : "company-form");
      }, 900);
    } else {
      setError(`Invalid credentials. Use: ${creds.email} / ${creds.password}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk, sans-serif", position: "relative", overflow: "hidden" }}>
      <nav style={{ position: "absolute", top: 0, left: 0, right: 0, height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: "1px solid rgba(6,182,212,0.15)", background: "rgba(2,15,26,0.84)", backdropFilter: "blur(8px)", zIndex: 4 }}>
        <button onClick={() => onNavigate("landing")} style={{ background: "transparent", border: "none", color: "#e2e8f0", fontFamily: "inherit", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
          Grid<span style={{ color: "#06b6d4" }}>Cast</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Secure Access Portal</span>
          <button style={{ background: "transparent", border: "1px solid rgba(100,116,139,0.35)", borderRadius: 999, color: "#94a3b8", padding: "6px 12px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>Need Help</button>
          <button onClick={() => onNavigate("landing")} className="gc-btn gc-btn-ghost" style={{ padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={14} /> Back to Landing
          </button>
        </div>
      </nav>

      {/* Background SVG */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="lgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#06b6d4" strokeWidth="0.5" /></pattern></defs>
        <rect width="1200" height="800" fill="url(#lgrid)" />
        {[200, 600, 1000].map(x => (
          <polyline key={x} points={`${x},0 ${x - 20},200 ${x + 15},220 ${x - 10},400`} fill="none" stroke="#06b6d4" strokeWidth="1.5" style={{ animation: `gc-lightning ${3 + x / 400}s ${x / 600}s infinite` }} />
        ))}
      </svg>

      {/* Glass card */}
      <div style={{ position: "relative", zIndex: 2, background: "rgba(2,15,26,0.88)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 20, padding: "44px 44px", width: 460, backdropFilter: "blur(20px)", boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(6,182,212,0.04)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "gc-pulse-ring 2s infinite" }} />
            <span style={{ fontWeight: 800, fontSize: 22, color: "#e2e8f0", letterSpacing: "-1px" }}>Grid<span style={{ color: "#06b6d4" }}>Cast</span></span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>AI-powered grid forecasting platform</p>
        </div>

        {!mode ? (
          <>
            <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", marginBottom: 20 }}>Select your access type to continue</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <button onClick={() => { setMode("admin"); setError(""); setForm({ email: DEMO_CREDS.admin.email, password: DEMO_CREDS.admin.password }); }}
                style={{ flex: 1, border: "1.5px solid rgba(6, 182, 212, 0.2)", borderRadius: 14, padding: "28px 20px", cursor: "pointer", textAlign: "center", background: "transparent", color: "#e2e8f0", fontFamily: "inherit", transition: "all 0.25s" }}>
                <ShieldCheck size={32} color="#06b6d4" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Admin</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Operators & Engineers</div>
              </button>
              <button onClick={() => { setMode("company"); setError(""); setForm({ email: DEMO_CREDS.company.email, password: DEMO_CREDS.company.password }); }}
                style={{ flex: 1, border: "1.5px solid rgba(6, 182, 212, 0.2)", borderRadius: 14, padding: "28px 20px", cursor: "pointer", textAlign: "center", background: "transparent", color: "#e2e8f0", fontFamily: "inherit", transition: "all 0.25s" }}>
                <Building2 size={32} color="#f59e0b" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Company</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Large Enterprises</div>
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setMode(null); setError(""); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <DemoBanner mode={mode} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              {mode === "admin" ? <ShieldCheck size={24} color="#06b6d4" /> : <Building2 size={24} color="#f59e0b" />}
              <div>
                <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{mode === "admin" ? "Admin Login" : "Company Login"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{mode === "admin" ? "Grid operator access · NRLDC" : "Industrial consumer access"}</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
                <input style={{ ...inputSt, paddingLeft: 40 }} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ position: "relative" }}>
                <Terminal size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
                <input type="password" style={{ ...inputSt, paddingLeft: 40 }} placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 12px", color: "#ef4444", fontSize: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={14} /> {error}
            </div>}

            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", background: loading ? "#0e7490" : "#06b6d4", color: "#020f1a", border: "none", padding: "14px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", fontFamily: "inherit", boxShadow: "0 8px 24px rgba(6,182,212,0.2)" }}>
              {loading ? "Authenticating…" : "Sign In Access"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ONBOARDING FORM
// ─────────────────────────────────────────────────────────────────────────────
function CompanyFormPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ companyName: "", gstin: "", industry: "", region: "north", expectedLoad: "", peakLoad: "", offPeakLoad: "", shift: "24x7", cooling: "air", renewablePercent: 0, facilitySize: "", employees: "", contractDemand: "", sanctionedLoad: "", greenTarget: 0, budgetRange: "" });
  const update = (k: string, v: string | number) => setFormData(p => ({ ...p, [k]: v }));
  const industryDef = INDUSTRY_TYPES.find(i => i.value === formData.industry);
  const STEPS = ["Company Profile", "Electricity Setup", "Goals & Sustainability"];


  return (
    <div style={{ minHeight: "100vh", background: "#020f1a", fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>
      <div style={{ borderBottom: "1px solid rgba(6,182,212,0.1)", padding: "16px 44px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="gc-logo-dot" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Grid<span style={{ color: "#06b6d4" }}>Cast</span></span>
        </div>
        <span style={{ color: "#334155" }}>›</span>
        <span style={{ color: "#64748b", fontSize: 13 }}>Company Onboarding</span>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "44px 20px" }}>
        {/* Step bar */}
        <div style={{ display: "flex", position: "relative", marginBottom: 44 }}>
          <div style={{ position: "absolute", top: 16, left: "16.67%", right: "16.67%", height: 1, background: "#1e3a4a" }} />
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: i + 1 <= step ? "#06b6d4" : "#0f1e2e", border: `2px solid ${i + 1 <= step ? "#06b6d4" : "#1e3a4a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: i + 1 <= step ? "#020f1a" : "#475569", zIndex: 2, position: "relative" }}>{i + 1 < step ? "✓" : i + 1}</div>
              <div style={{ fontSize: 11, color: i + 1 <= step ? "#06b6d4" : "#475569", fontWeight: i + 1 === step ? 600 : 400, textAlign: "center" }}>{s}</div>
            </div>
          ))}
        </div>

        <div className="gc-card" style={{ padding: "40px 40px" }}>
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Company Profile</h2>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 30 }}>Tell us about your organisation so we can personalise your GridCast experience.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">Company / Organisation Name *</label>
                  <input style={inputSt} placeholder="e.g. Tata Power Data Centers Pvt Ltd" value={formData.companyName} onChange={e => update("companyName", e.target.value)} />
                </div>
                <div><label className="gc-label">GSTIN</label><input style={inputSt} placeholder="27AABCU9603R1ZX" value={formData.gstin} onChange={e => update("gstin", e.target.value)} /></div>
                <div><label className="gc-label">Employees</label><input style={inputSt} type="number" placeholder="500" value={formData.employees} onChange={e => update("employees", e.target.value)} /></div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">Industry / Facility Type *</label>
                  <select className="gc-select" style={{ ...inputSt, cursor: "pointer" }} value={formData.industry} onChange={e => update("industry", e.target.value)}>
                    <option value="">Select your industry…</option>
                    {INDUSTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {industryDef && <div style={{ marginTop: 10, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}><Zap size={14} color="#06b6d4" /> Typical base load: <span style={{ color: "#06b6d4", fontFamily: "JetBrains Mono" }}>{industryDef.baseLoad} MW</span> · PUE: <span style={{ color: "#f59e0b", fontFamily: "JetBrains Mono" }}>{industryDef.pue}</span></div>}
                </div>
                <div>
                  <label className="gc-label">Grid Region</label>
                  <select className="gc-select" style={{ ...inputSt, cursor: "pointer" }} value={formData.region} onChange={e => update("region", e.target.value)}>
                    {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div><label className="gc-label">Facility Size (sq. ft.)</label><input style={inputSt} type="number" placeholder="50000" value={formData.facilitySize} onChange={e => update("facilitySize", e.target.value)} /></div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Electricity Setup</h2>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 30 }}>This data models your load curve and calculates savings potential accurately.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <div><label className="gc-label">Avg Load (MW) *</label><input style={inputSt} type="number" step="0.1" placeholder={String(industryDef?.baseLoad ?? "8.5")} value={formData.expectedLoad} onChange={e => update("expectedLoad", e.target.value)} /></div>
                <div><label className="gc-label">Peak Load (MW)</label><input style={inputSt} type="number" step="0.1" placeholder="12.5" value={formData.peakLoad} onChange={e => update("peakLoad", e.target.value)} /></div>
                <div><label className="gc-label">Off-Peak Load (MW)</label><input style={inputSt} type="number" step="0.1" placeholder="5.5" value={formData.offPeakLoad} onChange={e => update("offPeakLoad", e.target.value)} /></div>
                <div><label className="gc-label">Contract Demand (kVA)</label><input style={inputSt} type="number" placeholder="10000" value={formData.contractDemand} onChange={e => update("contractDemand", e.target.value)} /></div>
                <div><label className="gc-label">Sanctioned Load (kW)</label><input style={inputSt} type="number" placeholder="8500" value={formData.sanctionedLoad} onChange={e => update("sanctionedLoad", e.target.value)} /></div>
                <div>
                  <label className="gc-label">Shift Pattern</label>
                  <select className="gc-select" style={{ ...inputSt, cursor: "pointer" }} value={formData.shift} onChange={e => update("shift", e.target.value)}>
                    {SHIFT_PATTERNS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <label className="gc-label">Primary Cooling System</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {COOLING_TYPES.map(c => (
                      <button key={c.value} onClick={() => update("cooling", c.value)} style={{ border: `1.5px solid ${formData.cooling === c.value ? "#06b6d4" : "rgba(6,182,212,0.15)"}`, borderRadius: 8, padding: "12px 8px", textAlign: "center", cursor: "pointer", background: formData.cooling === c.value ? "rgba(6,182,212,0.1)" : "transparent", fontSize: 12, color: formData.cooling === c.value ? "#06b6d4" : "#64748b", fontFamily: "inherit", transition: "all 0.2s" }}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <label className="gc-label">Renewable / Solar %: <span style={{ color: "#10b981", fontFamily: "JetBrains Mono" }}>{formData.renewablePercent}%</span></label>
                  <input type="range" min="0" max="100" step="5" value={formData.renewablePercent} onChange={e => update("renewablePercent", +e.target.value)} style={{ width: "100%", accentColor: "#10b981" }} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Goals & Sustainability</h2>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 30 }}>Set your targets and let GridCast build a personalised optimisation plan.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="gc-label">Green Energy Target by 2030: <span style={{ color: "#10b981", fontFamily: "JetBrains Mono" }}>{formData.greenTarget}%</span></label>
                  <input type="range" min="0" max="100" step="5" value={formData.greenTarget} onChange={e => update("greenTarget", +e.target.value)} style={{ width: "100%", accentColor: "#10b981" }} />
                </div>
                <div>
                  <label className="gc-label">Annual Electricity Budget</label>
                  <select className="gc-select" style={{ ...inputSt, cursor: "pointer" }} value={formData.budgetRange} onChange={e => update("budgetRange", e.target.value)}>
                    <option value="">Select range…</option>
                    <option>INR 1-5 Cr / year</option><option>INR 5-25 Cr / year</option><option>INR 25-100 Cr / year</option><option>INR 100 Cr+ / year</option>
                  </select>
                </div>
                <div>
                  <label className="gc-label">Primary Optimisation Priority</label>
                  <select className="gc-select" style={{ ...inputSt, cursor: "pointer" }}>
                    <option>Cost Reduction (₹ savings)</option><option>Carbon Footprint (tCO₂)</option><option>Grid Reliability / Uptime</option><option>Regulatory Compliance</option>
                  </select>
                </div>
                {formData.expectedLoad && (() => {
                  const loadMW = parseFloat(formData.expectedLoad) || 0;
                  const annualMWh = loadMW * 8760;
                  const savingsMWh = annualMWh * 0.12;
                  const co2Saved = (savingsMWh * INDIA_GRID_EMISSION_FACTOR).toFixed(1);
                  const inrSaved = (savingsMWh * INR_PER_KWH * 1000).toLocaleString("en-IN");
                  return (
                    <div style={{ gridColumn: "span 2", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 22 }}>
                      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Estimated Annual Savings Potential</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {[[`${savingsMWh.toFixed(0)} MWh`, "Energy Optimised / yr", "#06b6d4"], [`${co2Saved} tCO₂`, "Carbon Avoided / yr", "#10b981"], [`₹${inrSaved}`, "Cost Saved / yr", "#f59e0b"]].map(([val, label, color]) => (
                          <div key={String(label)} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "JetBrains Mono" }}>{val}</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 14 }}>*Estimate based on 12% optimisation potential · India grid emission factor 0.716 tCO₂/MWh (CEA FY2022-23)</div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
            <button className="gc-btn gc-btn-dim" onClick={() => step > 1 ? setStep(step - 1) : onNavigate("login")}>← Back</button>
            <button className="gc-btn" style={{ background: step === 3 ? "#10b981" : "#06b6d4", color: "#020f1a" }} onClick={() => step < 3 ? setStep(step + 1) : onNavigate("company-dashboard")}>
              {step === 3 ? "Launch My Dashboard →" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: COMPANY DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function CompanyDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeReady = useThreeJs();
  const [activeTab, setActiveTab] = useState("overview");
  const [model, setModel] = useState<"xgboost" | "lstm">("xgboost");
  const [horizon, setHorizon] = useState<"24h" | "48h" | "72h">("24h");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [newTaskTime, setNewTaskTime] = useState("02:00");
  const [newTaskRegion, setNewTaskRegion] = useState("north");
  const [now, setNow] = useState("");

  const { chartData, residualMatrix, savings, metrics, loading, error } = usePredictiveEngine(8.5, model, horizon);

  useThreeDashGrid(canvasRef, threeReady);

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false, day: "numeric", month: "short", year: "numeric" }));
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const baseMW = 8.5, annualMWh = baseMW * 8760, savingsMWh = annualMWh * 0.127;
  const co2Saved = savingsMWh * INDIA_GRID_EMISSION_FACTOR;
  const inrSaved = savingsMWh * INR_PER_KWH * 1000;
  const treesEquiv = Math.round(co2Saved * 45), homeEquiv = Math.round(co2Saved / 1.8);
  const modelColor = model === "xgboost" ? "#22d3ee" : "#a78bfa";
  const modelLabel = model === "xgboost" ? "XGBoost" : "LSTM";

  const kpiCards = [
    { label: "CO₂ Avoided (MTD)", value: (co2Saved / 12).toFixed(1), unit: "tCO₂", color: "#10b981", icon: <Leaf size={18} />, trend: "+8.2% vs last month" },
    { label: "Energy Optimised (MTD)", value: (savingsMWh / 12).toFixed(0), unit: "MWh", color: "#06b6d4", icon: <Zap size={18} />, trend: "+12.1% vs last month" },
    { label: "Cost Saved (MTD)", value: `₹${((inrSaved / 12) / 100000).toFixed(1)}L`, unit: "", color: "#f59e0b", icon: <DollarSign size={18} />, trend: "+9.5% vs last month" },
    { label: "Grid Carbon Intensity", value: "0.716", unit: "tCO₂/MWh", color: "#a78bfa", icon: <Activity size={18} />, trend: "CEA FY2022-23 baseline" },
    { label: "Renewable Share", value: "22", unit: "%", color: "#10b981", icon: <Sun size={18} />, trend: "Target: 40% by 2027" },
    {
      label: "Forecast Accuracy",
      value: metrics.mape !== null ? (100 - metrics.mape).toFixed(1) : "N/A",
      unit: metrics.mape !== null ? "%" : "",
      color: modelColor,
      icon: <Target size={18} />,
      trend:
        metrics.mape !== null
          ? `MAPE ${metrics.mape.toFixed(2)}% · ${horizon} · ${modelLabel}`
          : `Awaiting ${modelLabel} ${horizon} metrics`,
    },
  ];

  const NAV_ITEMS = [
    { icon: <LayoutDashboard size={16} />, label: "Overview", id: "overview" },
    { icon: <TrendingUp size={16} />, label: "Load Forecast", id: "forecast" },
    { icon: <Leaf size={16} />, label: "Carbon Tracker", id: "carbon" },
    { icon: <Clock size={16} />, label: "Schedule Optimizer", id: "schedule" },
    { icon: <FileText size={16} />, label: "Reports", id: "reports" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020f1a", fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: 224, background: "rgba(2,10,20,0.97)", borderRight: "1px solid rgba(6,182,212,0.1)", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 6, position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 18px", borderBottom: "1px solid #0f1e2e", marginBottom: 6 }}>
          <div className="gc-logo-dot" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Grid<span style={{ color: "#06b6d4" }}>Cast</span></span>
        </div>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2, paddingLeft: 12 }}>Navigation</div>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`gc-sidebar-item${activeTab === item.id ? " is-active" : ""}`}>
            {item.icon} {item.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.1)", borderRadius: 8, padding: "14px 12px", fontSize: 11, marginBottom: 10 }}>
          <div style={{ color: "#0e7490", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Active Region</div>
          <div style={{ color: "#e2e8f0", marginBottom: 2 }}>North (NRLDC)</div>
          <div style={{ color: "#64748b" }}>15-min resolution</div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gc-led gc-led-green" />
            <span style={{ color: "#10b981", fontSize: 11 }}>API Live</span>
          </div>
        </div>
        <button className="gc-btn gc-btn-dim" style={{ padding: "8px", fontSize: 12, justifyContent: "center" }} onClick={() => onNavigate("login")}>← Sign Out</button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 224, right: 0, width: "calc(100vw - 224px)", height: "100vh", zIndex: 0, opacity: 0.22, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Topbar */}
          <div style={{ borderBottom: "1px solid rgba(6,182,212,0.1)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,10,20,0.82)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {NAV_ITEMS.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: activeTab === item.id ? "rgba(6, 182, 212, 0.12)" : "transparent", color: activeTab === item.id ? "#06b6d4" : "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>{item.icon} {item.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {(["24h", "48h", "72h"] as ("24h" | "48h" | "72h")[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    style={{
                      padding: "4px 9px",
                      borderRadius: 6,
                      border: `1px solid ${horizon === h ? modelColor : "rgba(148,163,184,0.35)"}`,
                      background: horizon === h ? `${modelColor}26` : "transparent",
                      color: horizon === h ? modelColor : "#94a3b8",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "inherit",
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setModel((m) => (m === "xgboost" ? "lstm" : "xgboost"))}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${modelColor}`,
                  background: `${modelColor}20`,
                  color: modelColor,
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                {modelLabel} ↕
              </button>
              {loading && <span style={{ fontSize: 11, color: "#f59e0b" }}>Refreshing model…</span>}
              {error && <span style={{ fontSize: 11, color: "#fca5a5", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{error}</span>}
              {now && <span style={{ fontSize: 12, color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>{now} IST</span>}
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(6,182,212,0.2)", border: "1.5px solid #0e7490", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#06b6d4" }}>TC</div>
            </div>
          </div>

          <div style={{ padding: "28px 28px" }}>
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.5px" }}>Company Energy Dashboard</h1>
                  <p style={{ color: "#64748b", fontSize: 13 }}>Your real-time electricity intelligence — powered by GridCast AI</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                  {kpiCards.map(k => (
                    <div key={k.label} className="gc-kpi">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</span>
                        <div style={{ color: k.color }}>{k.icon}</div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono, monospace", letterSpacing: "-1px" }}>
                        {k.value}<span style={{ fontSize: 13, marginLeft: 4 }}>{k.unit}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{k.trend}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 24 }}>
                  <div className="gc-card" style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>Today's Load Curve</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Actual vs Forecast (MW) · 15-min intervals</div>
                      </div>
                      <div style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "4px 10px" }}>
                        {metrics.mape !== null ? `MAPE ${metrics.mape.toFixed(2)}%` : "MAPE pending"}
                      </div>
                    </div>
                    <PremiumCompanyForecastChart
                      height={220}
                      timestamps={chartData?.timestamps}
                      actual={chartData?.actual}
                      forecast={chartData?.forecast}
                      optimized={chartData?.optimized}
                      modelLabel={modelLabel}
                      horizon={horizon}
                    />
                  </div>
                  <div className="gc-card" style={{ padding: 22 }}>
                    <div style={{ fontWeight: 600, marginBottom: 18 }}>CO₂ Equivalents Avoided</div>
                    {[
                      [`${treesEquiv.toLocaleString("en-IN")}`, "Trees grown for 10 yrs", <Leaf size={18} />, "#10b981"],
                      [`${homeEquiv.toLocaleString("en-IN")}`, "Indian homes powered / yr", <Home size={18} />, "#06b6d4"],
                      [`${(co2Saved / 2.31).toFixed(0)}`, "Cars off road for 1 yr", <Car size={18} />, "#f59e0b"],
                      [`${(co2Saved * 0.1).toFixed(1)} t`, "Coal not burned", <Factory size={18} />, "#a78bfa"]
                    ].map(([val, label, icon, color]) => (
                      <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #0f1e2e" }}>
                        <div style={{ color: color as string }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: color as string, fontFamily: "JetBrains Mono, monospace" }}>{val}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{label as string}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="gc-card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>National Grid — Regional Status</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Live node connectivity map</div>
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                      {REGIONS.map(r => <span key={r.id} style={{ display: "flex", alignItems: "center", gap: 5, color: "#64748b" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, display: "inline-block" }} />{r.label.split(" ")[0]}</span>)}
                    </div>
                  </div>
                  <RegionGridMap />
                </div>
              </>
            )}

            {/* FORECAST */}
            {activeTab === "forecast" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Load Forecast — {horizon.toUpperCase()} Ahead</h1>
                  <p style={{ color: "#64748b", fontSize: 13 }}>
                    {modelLabel} model · {chartData?.forecast?.length ?? 0} steps · {metrics.mape !== null ? `MAPE ${metrics.mape.toFixed(2)}%` : "MAPE pending"} · North NRLDC grid
                  </p>
                </div>
                <div className="gc-card" style={{ padding: 24, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontWeight: 600 }}>Company Load vs Grid Forecast</div><button className="gc-btn gc-btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>↓ Export CSV</button></div>
                  <PremiumCompanyForecastChart
                    height={320}
                    timestamps={chartData?.timestamps}
                    actual={chartData?.actual}
                    forecast={chartData?.forecast}
                    optimized={chartData?.optimized}
                    modelLabel={modelLabel}
                    horizon={horizon}
                  />
                </div>
                <div className="gc-card" style={{ padding: 24 }}><div style={{ fontWeight: 600, marginBottom: 18 }}>Residual Error Heatmap (APE %)</div><ErrorHeatmap matrix={residualMatrix} /></div>
              </>
            )}

            {/* CARBON */}
            {activeTab === "carbon" && (
              <>
                <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Carbon Footprint Tracker</h1><p style={{ color: "#64748b", fontSize: 13 }}>Scope 2 emissions · India CEA emission factor 0.716 tCO₂/MWh</p></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 24 }}>
                  {[["Annual CO₂ Footprint", `${(baseMW * 8760 * INDIA_GRID_EMISSION_FACTOR).toFixed(0)} tCO₂`, "Scope 2 grid electricity", "#ef4444"], ["CO₂ Avoided (YTD)", `${co2Saved.toFixed(0)} tCO₂`, "Through demand optimisation", "#10b981"], ["Carbon Intensity Now", "0.716 tCO₂/MWh", "India national grid avg · CEA", "#f59e0b"], ["Net Zero Target Gap", `${(baseMW * 8760 * INDIA_GRID_EMISSION_FACTOR - co2Saved).toFixed(0)} tCO₂`, "Remaining to neutralise", "#a78bfa"]].map(([label, val, sub, color]) => (
                    <div key={String(label)} className="gc-kpi"><div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{val}</div><div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{sub}</div></div>
                  ))}
                </div>
                <div className="gc-card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 18 }}>Monthly Carbon Trend (tCO₂)</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => {
                      const target = baseMW * (i < 4 ? 730 : 720) * INDIA_GRID_EMISSION_FACTOR * (1 - i * 0.004);
                      const maxV = baseMW * 730 * INDIA_GRID_EMISSION_FACTOR;
                      return (
                        <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: `${(target / maxV) * 100}%`, borderRadius: "3px 3px 0 0", background: i <= 3 ? "linear-gradient(180deg,#06b6d4,#0e7490)" : "#1e3a4a" }} />
                          <div style={{ fontSize: 9, color: "#475569" }}>{month}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* SCHEDULE */}
            {activeTab === "schedule" && (
              <>
                <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Schedule Optimizer</h1><p style={{ color: "#64748b", fontSize: 13 }}>Shift energy-intensive tasks to low-tariff, low-carbon grid windows.</p></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
                  <div>
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600 }}>Scheduled Tasks</div>
                      <button className="gc-btn gc-btn-primary" style={{ padding: "8px 16px", fontSize: 12 }} onClick={() => setSchedulerOpen(true)}>+ Add Task</button>
                    </div>
                    {SCHEDULED_TASKS.map(task => {
                      const region = REGIONS.find(r => r.id === task.region)!;
                      const mwSaved = (baseMW * task.savingsPercent / 100) * 2;
                      const co2TaskSaved = mwSaved * INDIA_GRID_EMISSION_FACTOR;
                      const costSaved = mwSaved * INR_PER_KWH * 1000;
                      const isOpen = selectedTask === task.id;
                      return (
                        <div key={task.id} className={`gc-schedule-row${isOpen ? " is-open" : ""}`} onClick={() => setSelectedTask(isOpen ? null : task.id)}>
                          <div style={{ width: 3, height: 40, borderRadius: 2, background: region.color, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{task.name}</div>
                            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b" }}>
                              <span>Current: <span style={{ color: "#e2e8f0", fontFamily: "JetBrains Mono" }}>{task.currentTime}</span></span>
                              <span>→ Optimal: <span style={{ color: "#10b981", fontFamily: "JetBrains Mono" }}>{task.optimalTime}</span></span>
                              <span style={{ color: region.color }}>{region.label.split(" ")[0]}</span>
                            </div>
                            {isOpen && (
                              <div style={{ marginTop: 14, padding: 16, background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Impact Analysis</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                  {[[`${co2TaskSaved.toFixed(2)} tCO₂`, "Carbon saved / shift"], [`₹${costSaved.toFixed(0)}`, "Cost saved / shift"], [`${mwSaved.toFixed(1)} MWh`, "Energy shifted"]].map(([v, l]) => (
                                    <div key={String(l)} style={{ textAlign: "center", background: "rgba(6,182,212,0.06)", borderRadius: 8, padding: "10px 8px" }}>
                                      <div style={{ fontWeight: 700, color: "#06b6d4", fontFamily: "JetBrains Mono", fontSize: 14 }}>{v}</div>
                                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{l}</div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ marginTop: 12, fontSize: 11, color: "#64748b", lineHeight: 1.65 }}>
                                  Shifting from <span style={{ color: "#f59e0b" }}>{task.currentTime}</span> → <span style={{ color: "#10b981" }}>{task.optimalTime}</span> avoids peak tariff on {region.label}. Carbon intensity drops ~{task.savingsPercent - 5}% at night as peakers back off.
                                </div>
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", fontFamily: "JetBrains Mono" }}>-{task.savingsPercent}%</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>cost saving</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="gc-card" style={{ padding: 20 }}>
                      <div style={{ fontWeight: 600, marginBottom: 16 }}>Total Optimizer Impact</div>
                      {[["Annual CO₂ Saved", `${(co2Saved * 0.15).toFixed(1)} tCO₂`, "#10b981"], ["Annual Cost Saved", `₹${((inrSaved * 0.15) / 100000).toFixed(1)}L`, "#f59e0b"], ["Energy Shifted", `${(savingsMWh * 0.15).toFixed(0)} MWh`, "#06b6d4"], ["Peak Load Reduction", "14.2%", "#a78bfa"]].map(([label, val, color]) => (
                        <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0f1e2e" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "JetBrains Mono" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="gc-card" style={{ padding: 20 }}>
                      <div style={{ fontWeight: 600, marginBottom: 12 }}>Grid Carbon Window (Hourly)</div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, marginBottom: 12 }}>Night hours (01:00–05:00) see 8–15% lower carbon intensity as high-emission peakers back off.</div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {Array.from({ length: 24 }, (_, h) => {
                          const isLow = h >= 1 && h <= 5;
                          const isMed = h >= 22 || h <= 0 || (h >= 6 && h <= 8);
                          return <div key={h} title={`${h}:00`} style={{ flex: 1, height: 32, borderRadius: 3, background: isLow ? "#10b981" : isMed ? "#f59e0b" : "#ef4444", opacity: 0.7 }} />;
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981" }}><div style={{ width: 8, height: 8, background: "#10b981" }} /> Low (01–05h)</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b" }}><div style={{ width: 8, height: 8, background: "#f59e0b" }} /> Medium</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#ef4444" }}><div style={{ width: 8, height: 8, background: "#ef4444" }} /> Peak</span>
                      </div>
                    </div>
                  </div>
                </div>

                {schedulerOpen && (
                  <div className="gc-modal-overlay" onClick={() => setSchedulerOpen(false)}>
                    <div className="gc-modal" onClick={e => e.stopPropagation()}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Schedule New Task</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div><label className="gc-label">Task Name</label><input className="gc-input" placeholder="e.g. Cold storage defrost cycle" /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div><label className="gc-label">Preferred Time</label><input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} className="gc-input" /></div>
                          <div>
                            <label className="gc-label">Grid Region</label>
                            <select value={newTaskRegion} onChange={e => setNewTaskRegion(e.target.value)} className="gc-input gc-select" style={{ cursor: "pointer" }}>
                              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: 14, fontSize: 12, color: "#94a3b8" }}>
                          🟢 Scheduling at {newTaskTime} in {REGIONS.find(r => r.id === newTaskRegion)?.label} saves approximately <span style={{ color: "#10b981", fontWeight: 600 }}>12–18%</span> on peak charges based on current forecasts.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                        <button className="gc-btn gc-btn-dim" style={{ flex: 1, justifyContent: "center" }} onClick={() => setSchedulerOpen(false)}>Cancel</button>
                        <button className="gc-btn gc-btn-primary" style={{ flex: 2, justifyContent: "center" }} onClick={() => setSchedulerOpen(false)}>Schedule Task →</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* REPORTS */}
            {activeTab === "reports" && (
              <>
                <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Reports & Compliance</h1><p style={{ color: "#64748b", fontSize: 13 }}>Download GHG inventory reports, BEE compliance summaries, and grid interaction logs.</p></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  {[["📊", "Monthly Energy Report", "April 2026 · PDF", "GHG inventory, load curve, savings summary"], ["🌿", "Scope 2 Carbon Report", "Q1 2026 · PDF", "CEA-compliant carbon accounting"], ["📋", "BEE PAT Compliance", "FY2025-26 · XLSX", "Bureau of Energy Efficiency PAT data"], ["⚡", "Grid Interaction Log", "April 23 · CSV", "15-min demand & export data"]].map(([icon, title, meta, desc]) => (
                    <div key={String(title)} className="gc-card" style={{ padding: 22, display: "flex", gap: 16, alignItems: "flex-start", cursor: "pointer" }}>
                      <span style={{ fontSize: 26 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
                        <div style={{ fontSize: 11, color: "#06b6d4", marginBottom: 4, fontFamily: "JetBrains Mono" }}>{meta}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{desc}</div>
                      </div>
                      <span style={{ color: "#06b6d4", fontSize: 20 }}>↓</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: ADMIN DASHBOARD (light theme — original HTML reference)
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [activeTab, setActiveTab] = useState<string>('forecast');
  const [activeModel, setActiveModel] = useState<ModelType>('xgboost');
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('24h');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [xgboostData, setXgboostData] = useState<ForecastData | null>(null);
  const [lstmData, setLstmData] = useState<ForecastData | null>(null);
  const [residualData, setResidualData] = useState<ResidualData | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
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
        console.error('Failed to load admin data:', err);
        if (mounted) setError('Failed to sync with predictive engines.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [activeHorizon, activeModel]);

  const currentData = activeModel === 'xgboost' ? xgboostData : lstmData;
  const config = MODEL_CONFIGS[activeModel];
  const modelColor = config.color;

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#dc2626' }}>
        <div style={{ textAlign: 'center', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Connection Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Retry Sync</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-admin-root gc-theme-light" style={{ background: 'var(--gc-bg)', minHeight: '100vh', color: 'var(--gc-text)', fontFamily: 'var(--gc-font-sans)' }}>
      {/* Navbar */}
      <nav style={{ background: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid #e2e8f0', backdropFilter: 'blur(10px)', height: 52, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
          <div className="gc-logo-dot" />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--gc-text)', letterSpacing: '-0.02em' }}>Grid<span style={{ color: '#06b6d4' }}>Cast</span> Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Forecast', 'Analysis', 'Models', 'Reports'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t.toLowerCase())}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', background: activeTab === t.toLowerCase() ? 'rgba(6, 182, 212, 0.12)' : 'transparent', color: activeTab === t.toLowerCase() ? '#06b6d4' : '#64748b', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit'
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => onNavigate('login')} style={{ background: 'transparent', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        {/* Sidebar */}
        <aside style={{ width: 220, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>Predictive Engine</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {(['xgboost', 'lstm'] as ModelType[]).map(m => (
              <div
                key={m}
                onClick={() => setActiveModel(m)}
                style={{
                  height: 40, borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: activeModel === m ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: activeModel === m ? '#06b6d4' : '#64748b',
                  border: activeModel === m ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: MODEL_CONFIGS[m].color }} />
                <span>{MODEL_CONFIGS[m].name}</span>
                {activeModel === m && <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '2px 6px', borderRadius: '4px' }}>Active</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>Forecast Horizon</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {(['24h', '48h', '72h'] as Horizon[]).map(h => (
              <div
                key={h}
                onClick={() => setActiveHorizon(h)}
                style={{
                  height: 36, borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: activeHorizon === h ? 'rgba(148, 163, 184, 0.05)' : 'transparent',
                  color: activeHorizon === h ? 'var(--gc-text)' : '#64748b',
                  border: activeHorizon === h ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid transparent'
                }}
              >
                <Clock size={14} style={{ opacity: activeHorizon === h ? 1 : 0.5 }} />
                <span>{h} Window</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>Regions</div>
          {REGIONS.map(r => (
            <div
              key={r.id}
              style={{
                height: 32, borderRadius: '7px', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, fontSize: '13px', fontWeight: 500, color: r.id === 'north' ? '#06b6d4' : '#64748b', background: r.id === 'north' ? 'rgba(6, 182, 212, 0.08)' : 'transparent', cursor: 'pointer'
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.id === 'north' ? '#06b6d4' : '#1e3a4a' }} />
              <span>{r.label.split(' ')[0]}</span>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--gc-bg)' }}>
          {activeTab === 'forecast' && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Accuracy MAPE', value: loading ? '...' : `${currentData?.horizon_metrics[activeHorizon]?.mape?.toFixed(2) ?? '--'}%`, icon: <Target size={18} />, color: (currentData?.horizon_metrics[activeHorizon]?.mape ?? 10) < 3 ? '#10b981' : '#f59e0b' },
                  { label: 'Predicted Peak', value: loading ? '...' : `${Math.max(...(currentData?.forecast.map(p => p.load_mw) ?? [0])).toLocaleString()} MW`, icon: <TrendingUp size={18} />, color: '#06b6d4' },
                  { label: 'Engine Latency', value: '1.2s', icon: <Zap size={18} />, color: '#94a3b8' },
                  { label: 'Last Sync', value: loading ? '...' : currentData ? new Date(currentData.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--', icon: <RefreshCw size={18} />, color: '#06b6d4' }
                ].map(k => (
                  <div key={k.label} className="gc-card" style={{ padding: '18px', background: '#ffffff', borderColor: '#e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
                      <div style={{ color: k.color }}>{k.icon}</div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: k.color, fontFamily: 'var(--gc-font-mono)', letterSpacing: '-0.5px' }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <ForecastChart data={currentData} model={activeModel} loading={loading} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <ModelComparison xgboostData={xgboostData} lstmData={lstmData} horizon={activeHorizon} loading={loading} />
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <ResidualHeatmap data={residualData} loading={loading} />
              </div>
            </>
          )}

          {activeTab === 'analysis' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#003d99', letterSpacing: '-0.5px' }}>Load Analysis — North Region</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Operational analysis summary for current forecast cycle</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#003d99', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} /> Error Pattern Insights</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#003d99', marginTop: 6, flexShrink: 0 }} />
                      <span>Morning transition slots show higher variance than mid-day due to solar ramp-up.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#003d99', marginTop: 6, flexShrink: 0 }} />
                      <span>Weekday peaks remain more stable than weekend peaks for industrial nodes.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#003d99', marginTop: 6, flexShrink: 0 }} />
                      <span>Backtest heatmap remains primary source for slot-level reliability analysis.</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#003d99', display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={16} /> Operational Notes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginTop: 6, flexShrink: 0 }} />
                      <span>Monitor high-demand windows around peak ramp-up hours (06:00–09:00).</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginTop: 6, flexShrink: 0 }} />
                      <span>Cross-check abnormal spikes with regional weather and holiday signals.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginTop: 6, flexShrink: 0 }} />
                      <span>Re-run training pipeline after material demand pattern shifts in industrial clusters.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#003d99', letterSpacing: '-0.5px' }}>Model Stack</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Status and readiness of forecasting pipelines</p>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#003d99' }}>Model Readiness Matrix</h3>
                </div>
                <div>
                  {[
                    { name: 'XGBoost', type: 'Production model · Season-aware features', color: '#4c79b8', status: 'Active', statusColor: 'rgba(16, 185, 129, 0.1)', textColor: '#10b981' },
                    { name: 'LSTM', type: 'Sequence model · Direct multi-step output · Bidirectional', color: '#7C3AED', status: 'Active', statusColor: 'rgba(167, 139, 250, 0.1)', textColor: '#a78bfa' },
                    { name: 'Linear Regression', type: 'Baseline benchmark for drift checks', color: '#94a3b8', status: 'Baseline', statusColor: 'rgba(148, 163, 184, 0.1)', textColor: '#94a3b8' }
                  ].map((m, i) => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: i === 2 ? 'none' : '1px solid #f1f5f9' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: m.color, marginRight: '16px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{m.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{m.type}</div>
                      </div>
                      <div style={{ padding: '4px 10px', background: m.statusColor, borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: m.textColor, border: `1px solid ${m.textColor}20` }}>
                        {m.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#003d99', letterSpacing: '-0.5px' }}>Reports</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Generated artifacts and export-ready summaries</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#003d99', display: 'flex', alignItems: 'center', gap: 8 }}><BarChart size={16} /> Forecast Reporting</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>Daily forecast snapshot with peak/trough summary.</span></div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>Weekly accuracy digest for stakeholder review.</span></div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>CSV export available from Forecast tab.</span></div>
                  </div>
                  <button style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'rgba(0, 61, 153, 0.05)', border: '1px solid rgba(0, 61, 153, 0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#003d99', cursor: 'pointer', transition: '0.2s' }}>Generate Full Digest</button>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#003d99', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} /> Model Governance</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>Log model performance against rolling benchmarks.</span></div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>Maintain retraining notes and data coverage updates.</span></div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: 10 }}><span>•</span> <span>Use residual heatmap trends for exception reporting.</span></div>
                  </div>
                  <button style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'rgba(0, 61, 153, 0.05)', border: '1px solid rgba(0, 61, 153, 0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#003d99', cursor: 'pointer', transition: '0.2s' }}>View Compliance Log</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP (internal state router)
// ─────────────────────────────────────────────────────────────────────────────
type Page = "landing" | "login" | "company-form" | "company-dashboard" | "admin-dashboard";

export default function GridCastApp() {
  const [page, setPage] = useState<Page>("landing");
  const navigate = useCallback((p: string) => setPage(p as Page), []);

  // Simple session detection for demo purposes
  useEffect(() => {
    // Check if we have a session cookie or redirected from login
    const hasSession = document.cookie.includes('gridcast-session=admin');
    if (hasSession && page === 'landing') {
      setPage('admin-dashboard');
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      {page === "landing" && <LandingPage onNavigate={navigate} />}
      {page === "login" && <LoginPage onNavigate={navigate} />}
      {page === "company-form" && <CompanyFormPage onNavigate={navigate} />}
      {page === "company-dashboard" && <CompanyDashboard onNavigate={navigate} />}
      {page === "admin-dashboard" && <AdminDashboard onNavigate={navigate} />}
    </div>
  );
}
