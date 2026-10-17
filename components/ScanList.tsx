"use client";

import { useEffect, useRef, useState } from "react";
import { checkStatuses } from "@/lib/checks";
import type { Signal } from "@/lib/types";
import { CheckIcon } from "./Icons";

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
  const pct = Math.round((revealed / statuses.length) * 100);

  return (
    <section aria-label="Pattern checks" className="rise rounded-[24px] bg-card p-5">
      <h2 className="text-xl font-semibold">Running the checks</h2>
      <p className="mt-1 text-sm text-muted" role="status">
        {revealed < statuses.length ? `Check ${revealed + 1} of ${statuses.length}` : "Getting a second opinion"} · {foundCount} found
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-tint" aria-hidden="true">
        <div className="h-full rounded-full bg-blue transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4">
        {statuses.map((c, i) => {
          const done = i < revealed;
          const hit = done && c.found.length > 0;
          return (
            <li key={c.key} className={`flex items-center gap-3 border-b border-line py-2.5 last:border-b-0 ${done || i === revealed ? "" : "text-muted"}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "tick-in" : ""}`}
                style={{
                  background: hit ? "var(--scam)" : done ? "var(--green-tint)" : "var(--blue-tint)",
                  color: hit ? "#fff" : "var(--legit)",
                }}
                aria-hidden="true"
              >
                {hit ? <span className="block h-2 w-2 rounded-full bg-white" /> : done ? <CheckIcon className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="flex-1">{c.label}</span>
              <span className="text-sm font-medium" style={{ color: hit ? "var(--scam)" : "var(--muted)" }}>
                {!done ? (i === revealed ? "checking…" : "") : hit ? `${c.found.length} found` : "clear"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
