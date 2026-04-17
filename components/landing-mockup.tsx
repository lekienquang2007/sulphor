"use client";

import { useEffect, useRef, useState } from "react";

const buckets = [
  { label: "Tax Holdback", end: 2847.0 },
  { label: "Operating Buffer", end: 615.8 },
  { label: "Owner Pay", end: 3000.0 },
  { label: "Savings", end: 1695.2 },
  { label: "Ad Spend", end: 307.3 },
];

const UNRESERVED = 1247.5;

function useCountUp(end: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      const animate = (ts: number) => {
        if (cancelled) return;
        if (!startRef.current) startRef.current = ts;
        const progress = Math.min((ts - startRef.current) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * end);
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, delay]);

  return value;
}

function BucketRow({ label, end, delay }: { label: string; end: number; delay: number }) {
  const value = useCountUp(end, 1200, delay);
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/10 last:border-0">
      <span className="text-white/60 text-xs">{label}</span>
      <span className="text-white tabular-nums text-xs font-medium">
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

export function DashboardMockup() {
  const unreserved = useCountUp(UNRESERVED, 1400, 100);
  const reserveTotal = useCountUp(
    buckets.reduce((s, b) => s + b.end, 0),
    1400,
    300
  );

  return (
    <div className="bg-[#1C2030] rounded-2xl p-6 shadow-2xl w-full max-w-[340px] mx-auto animate-float select-none">
      <div className="mb-5">
        <p className="text-white/40 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2">
          Unreserved from tracked payouts
        </p>
        <p className="text-white text-[42px] font-bold leading-none money-hero">
          ${unreserved.toFixed(2)}
        </p>
      </div>

      <div className="bg-white/[0.06] rounded-xl px-4 pt-3 pb-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
            Reserves
          </span>
          <span className="text-white/40 text-[10px] tabular-nums">
            ${reserveTotal.toFixed(2)} total
          </span>
        </div>
        {buckets.map((b, i) => (
          <BucketRow
            key={b.label}
            label={b.label}
            end={b.end}
            delay={400 + i * 100}
          />
        ))}
      </div>
    </div>
  );
}
