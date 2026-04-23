// ─── GRIDCAST DOMAIN CONSTANTS ────────────────────────────────────────────────

export const INDIA_GRID_EMISSION_FACTOR = 0.716; // tCO2/MWh — CEA FY 2022-23
export const INR_PER_KWH = 7.5; // avg industrial tariff ₹/kWh

export const REGIONS = [
  {
    id: "north",
    label: "North (NRLDC)",
    shortLabel: "North",
    nodes: ["DEL-N", "HR-01", "UP-02", "PB-01", "RJ-03"],
    color: "#06b6d4",
  },
  {
    id: "west",
    label: "West (WRLDC)",
    shortLabel: "West",
    nodes: ["MH-01", "GJ-02", "MP-03", "CG-01", "GJ-03"],
    color: "#f59e0b",
  },
  {
    id: "south",
    label: "South (SRLDC)",
    shortLabel: "South",
    nodes: ["KA-01", "TN-02", "AP-03", "TS-01", "KL-02"],
    color: "#10b981",
  },
  {
    id: "east",
    label: "East (ERLDC)",
    shortLabel: "East",
    nodes: ["WB-01", "OR-02", "JH-01", "BR-02", "AS-01"],
    color: "#a78bfa",
  },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const INDUSTRY_TYPES = [
  { value: "data_center", label: "Data Center / Cloud Infrastructure", baseLoad: 8.5, pue: 1.6 },
  { value: "manufacturing", label: "Heavy Manufacturing / Steel Plant", baseLoad: 45, pue: 1.0 },
  { value: "pharma", label: "Pharmaceutical / Cold Chain", baseLoad: 12, pue: 1.2 },
  { value: "it_campus", label: "IT Campus / Tech Park", baseLoad: 5.5, pue: 1.3 },
  { value: "textile", label: "Textile / Garment Factory", baseLoad: 22, pue: 1.0 },
  { value: "hospital", label: "Hospital / Healthcare Complex", baseLoad: 3.5, pue: 1.1 },
  { value: "cement", label: "Cement / Mining Operations", baseLoad: 60, pue: 1.0 },
  { value: "retail", label: "Retail Chain / Mall Operations", baseLoad: 4.5, pue: 1.2 },
] as const;

export const SHIFT_PATTERNS = [
  { value: "24x7", label: "24×7 Continuous Operations" },
  { value: "double", label: "Double Shift (16 hrs/day)" },
  { value: "single", label: "Single Shift (8 hrs/day)" },
  { value: "peak_avoid", label: "Flexible / Peak-Hour Avoidance" },
] as const;

export const COOLING_TYPES = [
  { value: "air", label: "Air Cooling (HVAC)" },
  { value: "liquid", label: "Liquid / Immersion Cooling" },
  { value: "evap", label: "Evaporative Cooling Tower" },
  { value: "district", label: "District Cooling / Chilled Water" },
] as const;

export const SCHEDULED_TASKS = [
  {
    id: 1,
    name: "Batch Processing Jobs",
    currentTime: "14:00",
    optimalTime: "02:30",
    savingsPercent: 18,
    region: "north",
  },
  {
    id: 2,
    name: "HVAC Pre-cooling Cycle",
    currentTime: "08:00",
    optimalTime: "06:00",
    savingsPercent: 12,
    region: "north",
  },
  {
    id: 3,
    name: "EV Fleet Charging",
    currentTime: "09:00",
    optimalTime: "01:00",
    savingsPercent: 25,
    region: "west",
  },
  {
    id: 4,
    name: "Database Backup & Sync",
    currentTime: "22:00",
    optimalTime: "03:00",
    savingsPercent: 8,
    region: "north",
  },
  {
    id: 5,
    name: "Manufacturing Line Startup",
    currentTime: "07:00",
    optimalTime: "05:30",
    savingsPercent: 15,
    region: "south",
  },
] as const;
