"use client";

import { useMemo, useState } from "react";
import { buildSegments } from "@/lib/annotate";
import type { RedFlag } from "@/lib/types";

export function AnnotatedMessage({ message, flags, color }: { message: string; flags: RedFlag[]; color: string }) {
  const { segments, unplaced } = useMemo(() => buildSegments(message, flags), [message, flags]);
  const firstPlaced = segments.find((s) => s.flag !== null)?.flag ?? null;
  const [active, setActive] = useState<number | null>(firstPlaced);

  // Number marks in reading order so the margin numbers climb down the page.
  const order = segments.filter((s) => s.flag !== null).map((s) => s.flag as number);
  const number = (flag: number) => order.indexOf(flag) + 1;
  const activeFlag = active !== null ? flags[active] : null;

  return (
    <figure>
      <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
        Specimen: the message as received
      </figcaption>

      <p className="ruled whitespace-pre-wrap break-words border-y-2 border-ink px-1 py-0 text-[1.0625rem]">
        {segments.map((seg, k) =>
          seg.flag === null ? (
            <span key={k}>{seg.text}</span>
          ) : (
            <button
              key={k}
              type="button"
              className="mark inline px-0.5 text-left font-[inherit] text-inherit"
              style={{ "--c": color, "--i": number(seg.flag) - 1 } as React.CSSProperties}
              aria-pressed={active === seg.flag}
              aria-label={`Red flag ${number(seg.flag)}: ${seg.text}. ${flags[seg.flag].why}`}
              onClick={() => setActive(seg.flag)}
              onMouseEnter={() => setActive(seg.flag)}
              onFocus={() => setActive(seg.flag)}
            >
              {seg.text}
              <sup className="ml-0.5 font-mono text-[0.65rem] font-semibold" style={{ color }}>
                {number(seg.flag)}
              </sup>
            </button>
          ),
        )}
      </p>

      {flags.length > 0 && (
        <div className="mt-3 border-l-4 bg-paper-deep/60 px-3 py-2" style={{ borderColor: color }} aria-live="polite">
          {activeFlag ? (
            <>
              <div className="font-mono text-sm font-medium break-words">
                {number(active as number) > 0 ? `${number(active as number)}. ` : ""}“{activeFlag.quote}”
              </div>
              <div className="mt-1">{activeFlag.why}</div>
            </>
          ) : (
            <div className="text-ink-soft">Tap a marked phrase to see why it was flagged.</div>
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
