"use client";
import { LOAD_DATA, FORECAST_DATA } from "@/lib/mockData";

interface LoadChartProps {
  actual?: number[];
  forecast?: number[];
  height?: number;
  showAxis?: boolean;
}

export default function LoadChart({
  actual = LOAD_DATA,
  forecast = FORECAST_DATA,
  height = 200,
  showAxis = true,
}: LoadChartProps) {
  const w = 700,
    h = height;
  const pad = { t: 16, r: 20, b: showAxis ? 32 : 8, l: showAxis ? 52 : 8 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const allVals = [...actual, ...forecast];
  const min = Math.min(...allVals) - 100;
  const max = Math.max(...allVals) + 100;

  const xOf = (i: number) => pad.l + (i / (actual.length - 1)) * cw;
  const yOf = (v: number) => pad.t + ch - ((v - min) / (max - min)) * ch;

  const apts = actual.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
  const fpts = forecast.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");

  const upper = forecast.map((v) => v + 150);
  const lower = forecast.map((v) => v - 150);
  const bandPts = [
    ...upper.map((v, i) => `${xOf(i)},${yOf(v)}`),
    ...[...lower].reverse().map((v, i) => `${xOf(forecast.length - 1 - i)},${yOf(v)}`),
  ].join(" ");

  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      style={{ display: "block" }}
      role="img"
      aria-label="24-hour electricity load forecast chart"
    >
      {/* Confidence band */}
      <polygon points={bandPts} fill="#06b6d4" fillOpacity="0.07" />

      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={pad.l}
          x2={pad.l + cw}
          y1={pad.t + t * ch}
          y2={pad.t + t * ch}
          stroke="#1e3a4a"
          strokeWidth="0.5"
        />
      ))}

      {/* Actual load */}
      <polyline
        points={apts}
        fill="none"
        stroke="#0e7490"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Forecast */}
      <polyline
        points={fpts}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {showAxis && (
        <>
          {/* Y-axis labels */}
          {yTicks.map((t) => {
            const v = Math.round(min + (1 - t) * (max - min));
            return (
              <text
                key={t}
                x={pad.l - 6}
                y={pad.t + t * ch + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {v}
              </text>
            );
          })}

          {/* X-axis labels */}
          {hours.map((label, i) => (
            <text
              key={label}
              x={pad.l + (i / 6) * cw}
              y={pad.t + ch + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {label}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
