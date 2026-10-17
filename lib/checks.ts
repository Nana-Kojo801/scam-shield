import type { Signal } from "./types";

/** The pattern checks shown in the "checking" step, in the order the rules layer runs them. */
export const PATTERN_CHECKS = [
  { key: "urgency", label: "Urgency and pressure", ids: ["urgency"] },
  { key: "threats", label: "Threats and penalties", ids: ["threats"] },
  { key: "payment", label: "Unusual payment methods", ids: ["unusual_payment"] },
  { key: "credentials", label: "Requests for codes or details", ids: ["credential_request"] },
  {
    key: "links",
    label: "Link red flags",
    ids: ["link_shortener", "link_raw_ip", "link_at_sign", "link_odd_tld", "link_lookalike", "link_brand_mismatch"],
  },
  { key: "impersonation", label: "Impersonation cues", ids: ["impersonation"] },
  { key: "too_good", label: "Too good to be true", ids: ["too_good_to_be_true"] },
  { key: "secrecy", label: "Secrecy and isolation", ids: ["secrecy"] },
  { key: "greeting", label: "Generic greeting", ids: ["generic_greeting"] },
  { key: "rapport", label: "Wrong-number or rapport opener", ids: ["wrong_number_rapport"] },
  { key: "injection", label: "Instructions aimed at an AI", ids: ["prompt_injection"] },
] as const;

export type CheckStatus = { key: string; label: string; found: Signal[] };

export function checkStatuses(signals: Signal[]): CheckStatus[] {
  return PATTERN_CHECKS.map((c) => ({
    key: c.key,
    label: c.label,
    found: signals.filter((s) => (c.ids as readonly string[]).includes(s.id)),
  }));
}
