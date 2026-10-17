import type { Verdict } from "@/lib/types";

export const VERDICT_META: Record<Verdict, { label: string; color: string; short: string }> = {
  likely_scam: { label: "Likely scam", color: "var(--scam)", short: "Scam" },
  suspicious: { label: "Suspicious", color: "var(--suspicious)", short: "Suspicious" },
  likely_legit: { label: "Likely legit", color: "var(--legit)", short: "Legit" },
  cannot_tell: { label: "Cannot tell", color: "var(--unknown)", short: "Unclear" },
};

/** A short, stable "file number" derived from the message so each report looks filed. */
export function caseNumber(message: string): string {
  let h = 0;
  for (let i = 0; i < message.length; i++) h = (h * 31 + message.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}
