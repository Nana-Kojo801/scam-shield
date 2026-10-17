export type Signal = {
  id: string;
  label: string;
  weight: number; // 1-5
  evidence: string[]; // exact substrings of the message, used for highlighting
};

export type Verdict = "likely_scam" | "suspicious" | "likely_legit" | "cannot_tell";
export type Confidence = "low" | "medium" | "high";

export type RedFlag = { quote: string; why: string };

export type CheckResult = {
  verdict: Verdict;
  confidence: Confidence;
  scam_type: string | null;
  red_flags: RedFlag[];
  reassuring_signs: string[];
  what_to_do: string[];
  verify_via: string;
  spoken_summary: string;
  teach_tip: string;
};

export type CheckResponse = {
  result: CheckResult;
  signals: Signal[];
  /** true when the model call failed or is not configured and only pattern checks ran */
  ai_unavailable: boolean;
};

export const MAX_MESSAGE_CHARS = 4000;
