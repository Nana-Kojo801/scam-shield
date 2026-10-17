"use client";

import { useMemo, useState } from "react";
import { buildSegments } from "@/lib/annotate";
import type { RedFlag } from "@/lib/types";

export function AnnotatedMessage({ message, flags, color, tint }: { message: string; flags: RedFlag[]; color: string; tint: string }) {
  const { segments, unplaced } = useMemo(() => buildSegments(message, flags), [message, flags]);
  const firstPlaced = segments.find((s) => s.flag !== null)?.flag ?? null;
  const [active, setActive] = useState<number | null>(firstPlaced);

  // Number marks in reading order so the numbers climb down the page.
  const order = segments.filter((s) => s.flag !== null).map((s) => s.flag as number);
  const number = (flag: number) => order.indexOf(flag) + 1;
  const activeFlag = active !== null ? flags[active] : null;

  return (
    <figure className="rounded-[24px] bg-card p-5">
      <figcaption className="mb-3 text-sm font-semibold text-muted">The message, with red flags marked</figcaption>

      <p className="whitespace-pre-wrap break-words text-[1.0625rem] leading-[1.9]">
        {segments.map((seg, k) =>
          seg.flag === null ? (
            <span key={k}>{seg.text}</span>
          ) : (
            <button
              key={k}
              type="button"
              className="mark inline px-1 py-0.5 text-left font-[inherit] text-inherit"
              style={{ "--c": color, "--i": number(seg.flag) - 1 } as React.CSSProperties}
              aria-pressed={active === seg.flag}
              aria-label={`Red flag ${number(seg.flag)}: ${seg.text}. ${flags[seg.flag].why}`}
              onClick={() => setActive(seg.flag)}
              onMouseEnter={() => setActive(seg.flag)}
              onFocus={() => setActive(seg.flag)}
            >
              {seg.text}
              <sup className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white" style={{ background: color }}>
                {number(seg.flag)}
              </sup>
            </button>
          ),
        )}
      </p>

      {flags.length > 0 && (
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: tint }} aria-live="polite">
          {activeFlag ? (
            <>
              <div className="break-words font-mono text-sm font-medium" style={{ color }}>
                {number(active as number) > 0 ? `${number(active as number)}. ` : ""}“{activeFlag.quote}”
              </div>
              <div className="mt-1 text-[0.9375rem]">{activeFlag.why}</div>
            </>
          ) : (
            <div className="text-muted">Tap a marked phrase to see why it was flagged.</div>
          )}
        </div>
      )}

      {unplaced.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {unplaced.map((i) => (
            <li key={i}>
              <span className="font-mono">“{flags[i].quote}”</span>: {flags[i].why}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
