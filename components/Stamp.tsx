import type { Confidence, Verdict } from "@/lib/types";
import { VERDICT_META } from "./verdict";

/** Each verdict has its own outline and glyph, so it never relies on colour alone. */
function Glyph({ verdict }: { verdict: Verdict }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 3.5, strokeLinecap: "square" as const };
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
      {verdict === "likely_scam" && (
        <>
          <polygon points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20" {...common} />
          <path d="M22 22l20 20M42 22L22 42" {...common} />
        </>
      )}
      {verdict === "suspicious" && (
        <>
          <polygon points="32,5 61,57 3,57" {...common} strokeLinejoin="miter" />
          <path d="M32 24v16" {...common} />
          <rect x="29.5" y="46" width="5" height="5" fill="currentColor" />
        </>
      )}
      {verdict === "likely_legit" && (
        <>
          <circle cx="32" cy="32" r="28" {...common} />
          <path d="M18 33l9 9 19-20" {...common} />
        </>
      )}
      {verdict === "cannot_tell" && (
        <>
          <rect x="5" y="5" width="54" height="54" {...common} strokeDasharray="7 5" />
          <path d="M24 25c0-6 4-9 9-9s8 3 8 8c0 7-9 7-9 14" {...common} />
          <rect x="29.5" y="46" width="5" height="5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function Stamp({ verdict, confidence }: { verdict: Verdict; confidence: Confidence }) {
  const meta = VERDICT_META[verdict];
  return (
    <div
      className="stamp inline-flex items-center gap-4 border-[6px] border-double bg-paper/60 px-4 py-3"
      style={{ color: meta.color, borderColor: meta.color }}
    >
      <Glyph verdict={verdict} />
      <div>
        <div className="font-display text-3xl font-bold uppercase leading-none tracking-wide sm:text-4xl">
          {meta.label}
        </div>
        <div className="mt-2 font-mono text-xs font-semibold uppercase tracking-[0.18em]">
          Confidence: {confidence}
        </div>
      </div>
    </div>
  );
}
