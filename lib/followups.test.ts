import { describe, expect, it } from "vitest";
import { answerFor, matchIntent } from "./followups";
import type { CheckResult } from "./types";

const r: CheckResult = {
  verdict: "likely_scam",
  confidence: "high",
  scam_type: "phishing",
  red_flags: [
    { quote: "Pay a small fee", why: "Unexpected fee" },
    { quote: "within 24 hours", why: "Artificial deadline." },
  ],
  reassuring_signs: ["Mentions a real service"],
  what_to_do: ["Do not click the link.", "Open the courier's official app."],
  verify_via: "Type the courier's website yourself.",
  spoken_summary: "This looks like a delivery scam.",
  teach_tip: "Couriers do not charge fees by text.",
};

describe("matchIntent", () => {
  it.each([
    ["Why?", "why"],
    ["why do you think that", "why"],
    ["How did you know?", "why"],
    ["What should I do?", "what_to_do"],
    ["what do I do now", "what_to_do"],
    ["Read me the red flags", "red_flags"],
    ["what warning signs did you find", "red_flags"],
    ["Check another", "check_another"],
    ["let's check another message", "check_another"],
    ["start over", "check_another"],
    ["say that again", "repeat"],
    ["Is this a scam?", "repeat"],
    ["purple monkey dishwasher", "unknown"],
    ["", "unknown"],
  ])("%s -> %s", (input, intent) => {
    expect(matchIntent(input)).toBe(intent);
  });
});

describe("answerFor", () => {
  it("repeat returns the spoken summary", () => {
    expect(answerFor("repeat", r)).toBe(r.spoken_summary);
  });
  it("why uses the red-flag reasons, and falls back to reassuring signs, then the tip", () => {
    expect(answerFor("why", r)).toBe("Here is why. Unexpected fee. Artificial deadline.");
    expect(answerFor("why", { ...r, red_flags: [] })).toContain("Mentions a real service");
    expect(answerFor("why", { ...r, red_flags: [], reassuring_signs: [] })).toBe("Couriers do not charge fees by text.");
  });
  it("what_to_do reads the steps in order and ends with how to verify", () => {
    const text = answerFor("what_to_do", r);
    expect(text).toMatch(/^First, do not click the link\. Next, open the courier's official app\./);
    expect(text).toMatch(/To check it, type the courier's website yourself\.$/);
  });
  it("red_flags reads quotes and handles none", () => {
    expect(answerFor("red_flags", r)).toContain('I found 2 red flags. "Pay a small fee". Unexpected fee.');
    expect(answerFor("red_flags", { ...r, red_flags: [] })).toMatch(/did not find any specific red flags/);
  });
  it("unknown lists what can be asked", () => {
    expect(answerFor("unknown", r)).toMatch(/explain why/);
  });
});
