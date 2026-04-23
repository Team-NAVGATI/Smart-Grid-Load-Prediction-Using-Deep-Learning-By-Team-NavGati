"use client";
import { useState } from "react";
import { REGIONS } from "@/lib/constants";

const REGION_POSITIONS = [
  { id: "north", cx: 200, cy: 120, color: "#06b6d4" },
  { id: "west",  cx: 120, cy: 230, color: "#f59e0b" },
  { id: "south", cx: 200, cy: 330, color: "#10b981" },
  { id: "east",  cx: 320, cy: 220, color: "#a78bfa" },
] as const;

const EDGES: [string, string][] = [
  ["north", "west"],
  ["north", "east"],
  ["west", "south"],
  ["east", "south"],
  ["north", "south"],
  ["west", "east"],
];

export default function RegionGridMap() {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const posMap = Object.fromEntries(REGION_POSITIONS.map((r) => [r.id, r]));

  return (
    <svg
      viewBox="0 0 440 430"
      width="100%"
      style={{ display: "block" }}
      role="img"
      aria-label="India national grid regional map"
    >
      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const pa = posMap[a], pb = posMap[b];
        if (!pa || !pb) return null;
        return (
          <line
            key={i}
            x1={pa.cx} y1={pa.cy}
            x2={pb.cx} y2={pb.cy}
            stroke="#1e3a4a"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        );
      })}

      {/* Region nodes */}
      {REGION_POSITIONS.map((rp) => {
        const region = REGIONS.find((r) => r.id === rp.id);
        if (!region) return null;
        const isActive = activeRegion === rp.id;

        return (
          <g
            key={rp.id}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveRegion(isActive ? null : rp.id)}
            role="button"
            aria-label={`Select ${region.label}`}
          >
            {/* Outer ring */}
            <circle
              cx={rp.cx} cy={rp.cy}
              r={isActive ? 30 : 22}
              fill={rp.color}
              fillOpacity="0.12"
              stroke={rp.color}
              strokeWidth="1.5"
              style={{ transition: "all 0.3s" }}
            />
            {/* Core dot */}
            <circle cx={rp.cx} cy={rp.cy} r={8} fill={rp.color} />

            {/* Label */}
            <text
              x={rp.cx} y={rp.cy + 42}
              textAnchor="middle"
              fontSize="10"
              fill={rp.color}
              fontWeight="600"
              fontFamily="Space Grotesk, sans-serif"
            >
              {region.label.split(" ")[0]}
            </text>

            {/* Sub-nodes */}
            {region.nodes.map((nid, ni) => {
              const angle = (ni / region.nodes.length) * Math.PI * 2 - Math.PI / 2;
              const r2 = 54;
              const nx = rp.cx + r2 * Math.cos(angle);
              const ny = rp.cy + r2 * Math.sin(angle);
              return (
                <g key={nid}>
                  <line
                    x1={rp.cx} y1={rp.cy}
                    x2={nx} y2={ny}
                    stroke={rp.color}
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                  <circle cx={nx} cy={ny} r={4} fill={rp.color} fillOpacity="0.65" />
                  <text
                    x={nx} y={ny + 13}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill="#64748b"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {nid}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Hint text */}
      <text
        x={220} y={415}
        textAnchor="middle"
        fontSize="10"
        fill="#475569"
        fontFamily="Space Grotesk, sans-serif"
      >
        Click region to inspect · Live node connectivity map
      </text>
    </svg>
  );
}
