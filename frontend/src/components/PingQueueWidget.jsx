import React, { useEffect, useState } from "react";

const CANDIDATES = [
  { name: "Ishara P.", tag: "Verified · NIBM", outcome: "timeout" },
  { name: "Dinuka W.", tag: "Verified · Wayamba", outcome: "timeout" },
  { name: "Amaya S.", tag: "Standard worker", outcome: "accept" },
];

const RING_SECONDS = 5; // compressed from the real 60s for a legible demo loop
const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

export default function PingQueueWidget() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 -> 1
  const [phase, setPhase] = useState("pinging"); // pinging | resolved

  useEffect(() => {
    setProgress(0);
    setPhase("pinging");

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const p = Math.min(elapsed / RING_SECONDS, 1);
      setProgress(p);
      if (p >= 1) clearInterval(tick);
    }, 40);

    const resolveAt = CANDIDATES[index].outcome === "accept" ? RING_SECONDS * 0.55 : RING_SECONDS;
    const resolveTimer = setTimeout(() => setPhase("resolved"), resolveAt * 1000);

    const advanceTimer = setTimeout(() => {
      setIndex((i) => (i + 1) % CANDIDATES.length);
    }, resolveAt * 1000 + 900);

    return () => {
      clearInterval(tick);
      clearTimeout(resolveTimer);
      clearTimeout(advanceTimer);
    };
  }, [index]);

  const current = CANDIDATES[index];
  const dashoffset = CIRC * (1 - progress);
  const secondsLeft = Math.max(0, Math.ceil(RING_SECONDS * (1 - progress)));
  const accepted = phase === "resolved" && current.outcome === "accept";
  const timedOut = phase === "resolved" && current.outcome === "timeout";

  return (
    <div className="card w-full max-w-sm">
      <div className="mb-5 flex items-center justify-between">
        <span className="eyebrow">Live matching queue</span>
        <span className="font-mono text-xs text-ink/40">Task #4471</span>
      </div>

      <div className="mb-6 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#EEF0F4" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={accepted ? "#2454FF" : "#E8384F"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dashoffset 40ms linear, stroke 300ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {phase === "pinging" ? (
              <span className="font-mono text-xl font-semibold text-ink">{secondsLeft}s</span>
            ) : accepted ? (
              <span className="text-xl">✓</span>
            ) : (
              <span className="text-xl text-ink/30">↷</span>
            )}
          </div>
        </div>

        <div>
          <p className="font-display text-base font-semibold text-ink">{current.name}</p>
          <p className="text-sm text-ink/50">{current.tag}</p>
          <p className="mt-2 font-mono text-xs">
            {phase === "pinging" && <span className="text-alert">Awaiting response…</span>}
            {timedOut && <span className="text-ink/40">Timed out · routing to next choice</span>}
            {accepted && <span className="text-signal">Accepted · task assigned</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {CANDIDATES.map((c, i) => (
          <div
            key={c.name}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < index || (i === index && accepted)
                ? "bg-signal"
                : i === index
                ? "bg-alert"
                : "bg-ink/10"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-ink/40">
        Client's top 3 picks are pinged one at a time — 60 seconds to accept before it auto-advances.
      </p>
    </div>
  );
}
