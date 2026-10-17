import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/check/route";
import { resetRateLimit } from "./ratelimit";

const call = (body: unknown, raw = false) =>
  POST(
    new Request("http://localhost/api/check", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "5.5.5.5" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

describe("POST /api/check (no API key: rules-only mode)", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  it("returns a rules-only result flagged as AI unavailable", async () => {
    const res = await call({ message: "Act now! Pay with gift cards within 24 hours or face legal action." });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ai_unavailable).toBe(true);
    expect(json.result.verdict).toBe("likely_scam");
    expect(json.signals.length).toBeGreaterThan(0);
  });
  it("rejects invalid JSON, empty and non-string messages", async () => {
    expect((await call("{nope", true)).status).toBe(400);
    expect((await call({ message: "   " })).status).toBe(400);
    expect((await call({ message: 42 })).status).toBe(400);
    expect((await call({ message: "hello there friend", context: 5 })).status).toBe(400);
  });
  it("rejects messages over the length cap", async () => {
    expect((await call({ message: "a".repeat(4001) })).status).toBe(413);
  });
  it("rate limits after 10 requests from one IP", async () => {
    for (let i = 0; i < 10; i++) expect((await call({ message: "hello there friend" })).status).toBe(200);
    const res = await call({ message: "hello there friend" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
