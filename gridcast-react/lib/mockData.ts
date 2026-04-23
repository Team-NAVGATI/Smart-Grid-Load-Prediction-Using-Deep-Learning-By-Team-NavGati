// ─── MOCK DATA GENERATORS ─────────────────────────────────────────────────────
import { INDIA_GRID_EMISSION_FACTOR, INR_PER_KWH } from "./constants";

export function genLoadData(count = 96): number[] {
  const base = 4200;
  return Array.from({ length: count }, (_, i) => {
    const hour = (i * 15) / 60;
    const daily = -Math.cos((hour / 24) * Math.PI * 2) * 600;
    const noise = (Math.random() - 0.5) * 200;
    return Math.round(base + daily + noise);
  });
}

export const LOAD_DATA = genLoadData();
export const FORECAST_DATA = LOAD_DATA.map((v) =>
  v + Math.round((Math.random() - 0.5) * 120)
);

// ─── SAVINGS COMPUTATION ──────────────────────────────────────────────────────
export function computeSavings(baseMW: number, optimisationFactor = 0.12) {
  const annualMWh = baseMW * 8760;
  const savingsMWh = annualMWh * optimisationFactor;
  const co2Saved = savingsMWh * INDIA_GRID_EMISSION_FACTOR;
  const inrSaved = savingsMWh * INR_PER_KWH * 1000;
  const treesEquiv = Math.round(co2Saved * 45);
  const homeEquiv = Math.round(co2Saved / 1.8);
  const carsEquiv = Math.round(co2Saved / 2.31);
  const coalEquiv = co2Saved * 0.1;
  return { annualMWh, savingsMWh, co2Saved, inrSaved, treesEquiv, homeEquiv, carsEquiv, coalEquiv };
}

export const DEFAULT_SAVINGS = computeSavings(8.5);

// ─── GRID NODE STATES ────────────────────────────────────────────────────────
export type NodeState = "active" | "warn" | "critical";

export interface GridNode {
  id: number;
  label: string;
  state: NodeState;
}

const NODE_LABELS = [
  "DEL-N", "DEL-S", "HP-01", "PB-01", "PB-02",
  "HR-01", "HR-02", "UK-01", "UK-02", "RJ-01",
  "RJ-02", "UP-N", "UP-S", "UP-E", "UP-W",
  "BR-01", "JK-01", "HP-02", "CG-01", "MP-01",
];

export const GRID_NODES: GridNode[] = NODE_LABELS.map((label, i) => ({
  id: i,
  label,
  state: i === 2 || i === 6 || i === 9 ? "warn" : i === 13 ? "critical" : "active",
}));
