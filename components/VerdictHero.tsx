import type { Confidence, Verdict } from "@/lib/types";
import { VERDICT_META } from "./verdict";

/** Each verdict has its own outline and glyph, so it never relies on colour alone. */
function Glyph({ verdict }: { verdict: Verdict }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 3.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
      {verdict === "likely_scam" && (
        <>
          <polygon points="21,5 43,5 59,21 59,43 43,59 21,59 5,43 5,21" {...common} />
          <path d="M23 23l18 18M41 23L23 41" {...common} />
        </>
      )}
      {verdict === "suspicious" && (
        <>
          <polygon points="32,6 60,56 4,56" {...common} />
          <path d="M32 25v14" {...common} />
          <circle cx="32" cy="47" r="2.6" fill="currentColor" />
        </>
      )}
      {verdict === "likely_legit" && (
        <>
          <circle cx="32" cy="32" r="27" {...common} />
          <path d="M19 33l9 9 18-20" {...common} />
        </>
      )}
      {verdict === "cannot_tell" && (
        <>
          <rect x="6" y="6" width="52" height="52" rx="14" {...common} strokeDasharray="8 7" />
          <path d="M24 26c0-6 4-9 9-9s8 3 8 8c0 7-9 7-9 14" {...common} />
          <circle cx="32" cy="48" r="2.6" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

const CONFIDENCE: Record<Confidence, string> = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" };

export function VerdictHero({ verdict, confidence, scamType, summary }: { verdict: Verdict; confidence: Confidence; scamType: string | null; summary: string }) {
  const meta = VERDICT_META[verdict];
  return (
    <section className="rounded-[24px] p-5" style={{ background: meta.tint, color: meta.color }} aria-label="Verdict">
      <div className="flex items-center gap-4">
        <div className="pop flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] bg-white">
          <Glyph verdict={verdict} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{meta.label}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.8125rem] font-medium">
            <span className="rounded-full bg-white px-3 py-1">{CONFIDENCE[confidence]}</span>
            {scamType && <span className="rounded-full bg-white px-3 py-1 capitalize">{scamType}</span>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[1.0625rem] leading-snug text-ink">{summary}</p>
    </section>
  );
}
