"use client";
import { useEffect, useState } from "react";

interface AnimCounterProps {
  target: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  locale?: string;
}

export default function AnimCounter({
  target,
  decimals = 0,
  duration = 1800,
  suffix = "",
  prefix = "",
  locale = "en-IN",
}: AnimCounterProps) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, duration]);

  const formatted =
    typeof val === "number"
      ? val.toLocaleString(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : val;

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
