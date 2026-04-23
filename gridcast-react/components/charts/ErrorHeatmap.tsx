"use client";

export default function ErrorHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Seeded random data (stable across renders)
  const data = days.map(() =>
    hours.map((_, h) => {
      const base = h >= 8 && h <= 20 ? 3.5 : 1.2;
      return base + ((h * 17 + days.indexOf(days[0]) * 7) % 10) * 0.3;
    })
  );

  const colorOf = (v: number) => {
    if (v < 1.5) return "#064e3b";
    if (v < 2.5) return "#065f46";
    if (v < 3.5) return "#ca8a04";
    if (v < 5)   return "#b45309";
    return "#991b1b";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `32px repeat(24, 1fr)`,
          gap: 2,
          minWidth: 500,
        }}
      >
        {/* Hour header */}
        <div />
        {hours.map((h) => (
          <div
            key={h}
            style={{ fontSize: 9, color: "#64748b", textAlign: "center" }}
          >
            {h}
          </div>
        ))}

        {/* Rows */}
        {days.map((day, di) => (
          <>
            <div
              key={`day-${day}`}
              style={{
                fontSize: 10,
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
              }}
            >
              {day}
            </div>
            {hours.map((_, hi) => (
              <div
                key={`cell-${di}-${hi}`}
                title={`${data[di][hi].toFixed(1)}% MAPE`}
                style={{
                  height: 12,
                  borderRadius: 2,
                  background: colorOf(data[di][hi]),
                  cursor: "default",
                }}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
