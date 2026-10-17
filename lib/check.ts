import { rulesOnlyResult, tooShortResult } from "./fallback";
import { judgeWithLLM, type JudgeInput } from "./llm";
import { runRules } from "./rules";
import type { CheckResponse, CheckResult } from "./types";

export const MIN_JUDGEABLE_CHARS = 12;

export type CheckInput = { message: string; context?: string };
export type Judge = (input: JudgeInput) => Promise<CheckResult | null>;

/**
 * The full pipeline: deterministic rules, then LLM judgment, merged into one response.
 * Shared by the HTTP route and (later) any other front door.
 */
export async function checkMessage(input: CheckInput, judge: Judge = judgeWithLLM): Promise<CheckResponse> {
  const message = input.message;
  const signals = runRules(message);

  if (message.trim().length < MIN_JUDGEABLE_CHARS && signals.length === 0) {
    return { result: tooShortResult(), signals, ai_unavailable: false };
  }

  const judged = await judge({ message, context: input.context, signals });
  if (judged) return { result: judged, signals, ai_unavailable: false };

  return { result: rulesOnlyResult(signals), signals, ai_unavailable: true };
}
