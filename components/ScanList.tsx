"use client";

import { useEffect, useRef, useState } from "react";
import { checkStatuses } from "@/lib/checks";
import type { Signal } from "@/lib/types";

const STEP_MS = 130;

/**
 * Ticks through each pattern check. The results shown are the real output of the same
 * rules function the server runs, so what ticks here is what the report will list.
 */
export function ScanList({ signals, reduced, onRevealed }: { signals: Signal[]; reduced: boolean; onRevealed: () => void }) {
  const statuses = checkStatuses(signals);
  const [revealed, setRevealed] = useState(reduced ? statuses.length : 0);
  const latest = useRef(onRevealed);
  useEffect(() => {
    latest.current = onRevealed;
  });

  useEffect(() => {
    if (revealed >= statuses.length) {
      latest.current();
      return;
    }
    const t = setTimeout(() => setRevealed((n) => n + 1), reduced ? 0 : STEP_MS);
    return () => clearTimeout(t);
  }, [revealed, statuses.length, reduced]);

  const foundCount = statuses.slice(0, revealed).filter((s) => s.found.length).length;

  return (
    <section aria-label="Pattern checks" className="rise">
      <h2 className="font-display text-2xl font-semibold">Running the checks</h2>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft" role="status">
        {revealed < statuses.length ? `Check ${revealed + 1} of ${statuses.length}` : `Waiting on the second opinion`} · {foundCount} found
      </p>
      <ol className="mt-4 border-t-2 border-ink">
        {statuses.map((c, i) => {
          const done = i < revealed;
          const hit = done && c.found.length > 0;
          return (
            <li key={c.key} className="flex items-center gap-3 border-b border-rule py-2" style={{ opacity: done || i === revealed ? 1 : 0.4 }}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${done ? "tick-in" : ""}`}
                style={{ borderColor: hit ? "var(--scam)" : "var(--ink)", background: hit ? "var(--scam)" : "transparent" }}
                aria-hidden="true"
              >
                {done && !hit && <span className="block h-0.5 w-2.5 bg-ink" />}
                {hit && <span className="block h-2 w-2 bg-paper" />}
              </span>
              <span className="flex-1">{c.label}</span>
              <span className="font-mono text-xs uppercase tracking-wider" style={{ color: hit ? "var(--scam)" : "var(--ink-soft)" }}>
                {!done ? (i === revealed ? "checking" : "") : hit ? `found ${c.found.length}` : "clear"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
