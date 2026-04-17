"use client";

import { useEffect, useRef, useState } from "react";

const PAYOUT = 1240.0;
const BUCKETS = [
  { label: "Tax Holdback",    target: 347.2  },
  { label: "Owner Pay",       target: 248.0  },
  { label: "Savings",         target: 124.0  },
  { label: "Ad Spend",        target: 186.0  },
  { label: "Operating Buffer",target: 334.8  },
];
// sum = 1240.00 → fully allocated → unreserved = $0.00

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function DashboardMockup() {
  const [toastShown,   setToastShown]   = useState(false);
  const [toastActive,  setToastActive]  = useState(false);
  const [buckets,      setBuckets]      = useState([0, 0, 0, 0, 0]);
  const [unreserved,   setUnreserved]   = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [fading,       setFading]       = useState(false);

  const alive = useRef(true);
  const tids  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rids  = useRef<number[]>([]);

  useEffect(() => {
    alive.current = true;

    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => { if (alive.current) fn(); }, ms);
      tids.current.push(id);
    }

    function animateBucket(idx: number, target: number, duration: number) {
      let start: number | null = null;
      function tick(ts: number) {
        if (!alive.current) return;
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const v = easeOut(p) * target;
        setBuckets(prev => { const n = [...prev]; n[idx] = v; return n; });
        if (p < 1) rids.current.push(requestAnimationFrame(tick));
      }
      rids.current.push(requestAnimationFrame(tick));
    }

    function loop() {
      // reset
      setToastShown(false);
      setToastActive(false);
      setBuckets([0, 0, 0, 0, 0]);
      setUnreserved(0);
      setBadgeVisible(false);
      setFading(false);

      // t=800  toast slides in
      schedule(() => {
        setToastShown(true);
        schedule(() => setToastActive(true), 30);
      }, 800);

      // t=1800 toast fades out, buckets count up with 300ms stagger
      schedule(() => {
        setToastActive(false);
        schedule(() => setToastShown(false), 400);

        BUCKETS.forEach((b, i) => {
          schedule(() => animateBucket(i, b.target, 600), i * 300);
        });
      }, 1800);

      // t=4000  "plan approved" badge — unreserved stays $0.00 (fully allocated)
      schedule(() => setBadgeVisible(true), 4000);

      // t=5500  fade everything to 0
      schedule(() => {
        setFading(true);
        schedule(() => {
          setBuckets([0, 0, 0, 0, 0]);
          setUnreserved(0);
          setBadgeVisible(false);
          setFading(false);
          schedule(loop, 1000); // 1s pause then repeat
        }, 850);
      }, 5500);
    }

    loop();

    return () => {
      alive.current = false;
      tids.current.forEach(clearTimeout);
      rids.current.forEach(cancelAnimationFrame);
      tids.current = [];
      rids.current = [];
    };
  }, []);

  const reserveTotal = buckets.reduce((s, v) => s + v, 0);

  return (
    <div className="relative bg-[#1C2030] rounded-2xl shadow-2xl w-full max-w-[340px] mx-auto animate-float select-none overflow-hidden">

      {/* ── Toast ── */}
      {toastShown && (
        <div
          className="absolute top-3 left-3 right-3 z-10 bg-[#3a4455] text-white text-[11px] font-medium px-4 py-2.5 rounded-full flex items-center gap-2"
          style={{
            transform:  toastActive ? "translateY(0)"   : "translateY(-10px)",
            opacity:    toastActive ? 1                 : 0,
            transition: "transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 280ms ease",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          Stripe payout · ${PAYOUT.toFixed(2)} arriving
        </div>
      )}

      {/* ── Main content ── */}
      <div
        className="p-6"
        style={{
          opacity:    fading ? 0 : 1,
          transition: "opacity 800ms ease",
          paddingTop: toastShown ? "64px" : "24px",
          transitionProperty: "opacity, padding-top",
          transitionDuration: "800ms, 320ms",
          transitionTimingFunction: "ease, ease",
        }}
      >
        {/* Unreserved */}
        <div className="mb-5">
          <p className="text-white/40 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2">
            Unreserved from tracked payouts
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white text-[42px] font-bold leading-none money-hero">
              ${unreserved.toFixed(2)}
            </p>
            <span
              className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/15 px-2.5 py-1 rounded-full"
              style={{
                opacity:    badgeVisible ? 1 : 0,
                transform:  badgeVisible ? "translateY(0)" : "translateY(5px)",
                transition: "opacity 400ms ease, transform 400ms ease",
              }}
            >
              plan approved
            </span>
          </div>
        </div>

        {/* Reserves */}
        <div className="bg-white/[0.06] rounded-xl px-4 pt-3 pb-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
              Reserves
            </span>
            <span className="text-white/40 text-[10px] tabular-nums">
              ${reserveTotal.toFixed(2)} total
            </span>
          </div>
          {BUCKETS.map((b, i) => (
            <div
              key={b.label}
              className="flex justify-between items-center py-2.5 border-b border-white/10 last:border-0"
            >
              <span className="text-white/60 text-xs">{b.label}</span>
              <span className="text-white tabular-nums text-xs font-medium">
                ${buckets[i].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
