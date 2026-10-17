import type { CheckResult } from "./types";

export type Intent = "why" | "what_to_do" | "red_flags" | "repeat" | "check_another" | "unknown";

const PATTERNS: [Intent, RegExp][] = [
  ["check_another", /\b(check|try|do) (another|a new|a different|one more|the next)\b|\banother (one|message|text)\b|\bstart over\b|\bnew message\b|\bnext (one|message)\b/],
  ["red_flags", /\bred flags?\b|\bwarning signs?\b|\bwhat did you (find|spot|see|notice)\b|\bshow (me )?the flags\b/],
  ["what_to_do", /\bwhat (should|do|can|shall) i do\b|\bwhat now\b|\bnext steps?\b|\bwhat to do\b|\bhow (do|should) i (handle|respond|deal)\b|\badvice\b|\bhelp me\b/],
  ["repeat", /\brepeat\b|\bsay (that |it )?again\b|\bread (that |it )?again\b|\bsummary\b|\bwhat did you say\b|\bis (it|this) (safe|real|legit|a scam)\b/],
  ["why", /\bwhy\b|\bhow (do|did) you know\b|\bexplain\b|\breason\b|\bhow come\b/],
];

export function matchIntent(input: string): Intent {
  const text = input.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, " ");
  for (const [intent, re] of PATTERNS) if (re.test(text)) return intent;
  return "unknown";
}

const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Text to show and speak for a follow-up, built only from the result already returned. */
export function answerFor(intent: Exclude<Intent, "check_another">, r: CheckResult): string {
  switch (intent) {
    case "repeat":
      return r.spoken_summary;
    case "why": {
      if (r.red_flags.length) {
        const reasons = r.red_flags.slice(0, 3).map((f) => sentence(f.why));
        return `Here is why. ${reasons.join(" ")}`;
      }
      if (r.reassuring_signs.length) {
        return `Here is why. ${r.reassuring_signs.slice(0, 3).map(sentence).join(" ")}`;
      }
      return `${sentence(r.teach_tip)}`;
    }
    case "what_to_do": {
      const ordinals = ["First", "Next", "Then", "Finally"];
      const steps = r.what_to_do.map((s, i) => `${ordinals[i] ?? "Also"}, ${s.charAt(0).toLowerCase()}${s.slice(1)}`).map(sentence);
      return `${steps.join(" ")} To check it, ${r.verify_via.charAt(0).toLowerCase()}${r.verify_via.slice(1)}`.replace(/\.?$/, ".");
    }
    case "red_flags": {
      if (!r.red_flags.length) return "I did not find any specific red flags in the text.";
      const items = r.red_flags.slice(0, 4).map((f) => `"${f.quote}". ${sentence(f.why)}`);
      return `I found ${r.red_flags.length} red ${r.red_flags.length === 1 ? "flag" : "flags"}. ${items.join(" ")}`;
    }
    default:
      return "I can explain why, tell you what to do, read the red flags, or check another message.";
  }
}
