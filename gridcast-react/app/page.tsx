import dynamic from "next/dynamic";

// SSR disabled: all Math.random(), Three.js canvas, and Date.now() live
// exclusively on the client — zero hydration risk.
const GridCastApp = dynamic(() => import("@/components/GridCastApp"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        background: "#020f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        color: "#06b6d4",
        fontSize: 13,
        letterSpacing: 2,
      }}
    >
      GRIDCAST · INITIALISING…
    </div>
  ),
});

export default function RootPage() {
  return <GridCastApp />;
}
