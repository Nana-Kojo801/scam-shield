import { totalWeight } from "./rules";
import type { CheckResult, RedFlag, Signal } from "./types";

const VERIFY =
  "Use the official app, a phone number printed on your card or statement, or a website address you type in yourself. Do not use links or numbers from this message.";

const SAFE_STEPS = [
  "Do not click links, call numbers, or reply to this message.",
  "Contact the organisation through an official channel you already trust.",
  "If you already shared codes or payment details, contact your bank or provider right away.",
];

export function redFlagsFromSignals(signals: Signal[]): RedFlag[] {
  return signals
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .flatMap((s) => s.evidence.slice(0, 3).map((quote) => ({ quote, why: s.label })))
    .slice(0, 10);
}

/** Result used when the model is unavailable or the message is too short to judge. */
export function rulesOnlyResult(signals: Signal[]): CheckResult {
  const score = totalWeight(signals);

  if (score >= 10) {
    return {
      verdict: "likely_scam",
      confidence: "medium",
      scam_type: null,
      red_flags: redFlagsFromSignals(signals),
      reassuring_signs: [],
      what_to_do: SAFE_STEPS,
      verify_via: VERIFY,
      spoken_summary:
        "This matches several common scam patterns. Please don't click, call, or reply. Check through an official channel instead.",
      teach_tip: "Pressure, unusual payment methods and requests for codes often appear together in scams.",
    };
  }

  if (score >= 4) {
    return {
      verdict: "suspicious",
      confidence: "low",
      scam_type: null,
      red_flags: redFlagsFromSignals(signals),
      reassuring_signs: [],
      what_to_do: SAFE_STEPS,
      verify_via: VERIFY,
      spoken_summary:
        "This has some warning signs. I'd treat it with caution and check with the sender through an official channel.",
      teach_tip: "One warning sign is not proof, but several together are worth slowing down for.",
    };
  }

  return {
    verdict: "cannot_tell",
    confidence: "low",
    scam_type: null,
    red_flags: redFlagsFromSignals(signals),
    reassuring_signs: [],
    what_to_do: [
      "Pattern checks found little here, which does not mean the message is safe.",
      "If anything feels off, verify through an official channel you already trust.",
    ],
    verify_via: VERIFY,
    spoken_summary:
      "I couldn't find strong warning signs, but I can't be sure. If something feels off, check through an official channel.",
    teach_tip: "A message with no obvious red flags can still be a scam. Trust your instincts and verify.",
  };
}

export function tooShortResult(): CheckResult {
  return {
    verdict: "cannot_tell",
    confidence: "low",
    scam_type: null,
    red_flags: [],
    reassuring_signs: [],
    what_to_do: [
      "Paste or read the full message, including any link or phone number it contains.",
      "Tell me how it reached you (text, email, call) and who it claims to be from.",
    ],
    verify_via: VERIFY,
    spoken_summary: "That's too short for me to judge. Could you read me the whole message?",
    teach_tip: "Context matters: the sender, the channel and what it asks you to do all help show the pattern.",
  };
}
