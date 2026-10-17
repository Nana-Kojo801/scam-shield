import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkMessage, type Judge } from "./check";
import { validateResult } from "./llm";
import { clientIp, rateLimit, resetRateLimit } from "./ratelimit";
import { runRules } from "./rules";
import type { CheckResult } from "./types";

const good: CheckResult = {
  verdict: "likely_scam",
  confidence: "high",
  scam_type: "package delivery phishing",
  red_flags: [{ quote: "pay a small fee", why: "Unexpected fee" }],
  reassuring_signs: [],
  what_to_do: ["Do not click the link.", "Check the courier's official app."],
  verify_via: "Type the courier's website in yourself.",
  spoken_summary: "This looks like a delivery scam. Do not click the link.",
  teach_tip: "Couriers do not ask for fees by text.",
};

describe("validateResult", () => {
  const message = "Please pay a small fee to release your parcel.";

  it("accepts a well-formed result", () => {
    expect(validateResult(good, message, [])?.verdict).toBe("likely_scam");
  });
  it("drops quotes that are not exact substrings of the message", () => {
    const raw = {
      ...good,
      red_flags: [
        { quote: "pay a small fee", why: "fee" },
        { quote: "Pay A Small Fee", why: "wrong case" },
        { quote: "invented text", why: "hallucinated" },
      ],
    };
    expect(validateResult(raw, message, [])?.red_flags.map((f) => f.quote)).toEqual(["pay a small fee"]);
  });
  it("backfills highlights from rule evidence when a scam verdict has no valid quotes", () => {
    const raw = { ...good, red_flags: [{ quote: "invented", why: "x" }] };
    const result = validateResult(raw, message, runRules(message));
    expect(result?.red_flags.length).toBeGreaterThan(0);
    for (const f of result!.red_flags) expect(message).toContain(f.quote);
  });
  it("does not backfill for a legit verdict", () => {
    const raw = { ...good, verdict: "likely_legit", red_flags: [] };
    expect(validateResult(raw, message, runRules(message))?.red_flags).toEqual([]);
  });
  it("rejects bad enums and missing fields", () => {
    expect(validateResult({ ...good, verdict: "definitely_scam" }, message, [])).toBeNull();
    expect(validateResult({ ...good, spoken_summary: "" }, message, [])).toBeNull();
    expect(validateResult({ ...good, what_to_do: [] }, message, [])).toBeNull();
    expect(validateResult(null, message, [])).toBeNull();
    expect(validateResult("text", message, [])).toBeNull();
  });
  it("caps what_to_do at four steps", () => {
    const raw = { ...good, what_to_do: ["a", "b", "c", "d", "e", "f"] };
    expect(validateResult(raw, message, [])?.what_to_do).toHaveLength(4);
  });
});

describe("checkMessage", () => {
  const scam = "Pay a small fee at https://usps-redelivery.top/pay within 24 hours or your package will be returned.";

  it("returns the model result and the rule signals", async () => {
    const judge: Judge = vi.fn(async () => good);
    const out = await checkMessage({ message: scam }, judge);
    expect(out.ai_unavailable).toBe(false);
    expect(out.result).toBe(good);
    expect(out.signals.length).toBeGreaterThan(0);
  });
  it("passes message, context and signals to the model", async () => {
    const judge = vi.fn<Judge>(async () => good);
    await checkMessage({ message: scam, context: "came by SMS" }, judge);
    expect(judge.mock.calls[0][0]).toMatchObject({ message: scam, context: "came by SMS" });
    expect(judge.mock.calls[0][0].signals.length).toBeGreaterThan(0);
  });
  it("falls back to rules only when the model fails", async () => {
    const out = await checkMessage({ message: scam }, async () => null);
    expect(out.ai_unavailable).toBe(true);
    expect(out.result.verdict).toBe("likely_scam");
    for (const f of out.result.red_flags) expect(scam).toContain(f.quote);
  });
  it("rules-only mode never calls the model for a very short message", async () => {
    const judge = vi.fn<Judge>(async () => good);
    const out = await checkMessage({ message: "Hi" }, judge);
    expect(judge).not.toHaveBeenCalled();
    expect(out.result.verdict).toBe("cannot_tell");
  });
  it("rules-only fallback treats a rapport-then-invest opener as suspicious", async () => {
    const msg = "Hi, is this Sarah? Sorry, wrong number! A friend makes steady profits on a trading platform.";
    expect((await checkMessage({ message: msg }, async () => null)).result.verdict).toBe("suspicious");
  });
  it("rules-only fallback does not call a calm message a scam", async () => {
    const out = await checkMessage({ message: "Are we still meeting for lunch tomorrow at noon?" }, async () => null);
    expect(out.result.verdict).toBe("cannot_tell");
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimit());
  it("allows 10 per window then blocks, then resets", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(rateLimit("1.1.1.1", t).ok).toBe(true);
    const blocked = rateLimit("1.1.1.1", t);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(rateLimit("2.2.2.2", t).ok).toBe(true);
    expect(rateLimit("1.1.1.1", t + 61_000).ok).toBe(true);
  });
  it("reads the client IP from forwarding headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
