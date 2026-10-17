import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { MIN_TOKEN_LENGTH } from "./mcp-auth";
import { resetRateLimit } from "./ratelimit";

const TOKEN = "test-secret-0123456789abcdef";
const URL_ = "https://scam-shield.test/api/mcp";

const initialize = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "t", version: "1" } } };

const send = (headers: Record<string, string> = {}, ip = "9.9.9.9") =>
  POST(
    new Request(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-forwarded-for": ip, ...headers },
      body: JSON.stringify(initialize),
    }),
  );

describe("shared-secret auth on /api/mcp", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("MCP_ALLOWED_ORIGINS", "");
    vi.stubEnv("MCP_ALLOW_UNAUTHENTICATED", "");
    vi.stubEnv("MCP_AUTH_TOKEN", TOKEN);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the correct bearer token", async () => {
    const res = await send({ authorization: `Bearer ${TOKEN}` });
    expect(res.status).toBe(200);
    expect((await res.json()).result.serverInfo.name).toBe("scam-shield");
  });

  it("accepts the scheme in any case and tolerates extra spaces", async () => {
    expect((await send({ authorization: `bearer   ${TOKEN}` })).status).toBe(200);
  });

  it("rejects a missing token with 401 and a WWW-Authenticate challenge", async () => {
    const res = await send();
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
    const body = await res.json();
    expect(body.error.message).toMatch(/Authorization: Bearer/);
    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });

  it("rejects wrong tokens, near misses, other schemes and empty values", async () => {
    for (const value of [`Bearer ${TOKEN}x`, `Bearer ${TOKEN.slice(0, -1)}`, "Bearer wrong", `Basic ${TOKEN}`, TOKEN, "Bearer ", ""]) {
      resetRateLimit();
      expect((await send({ authorization: value })).status, value).toBe(401);
    }
  });

  it("does not run the handshake or any tool for an unauthorised caller", async () => {
    const res = await send({ authorization: "Bearer nope" });
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("protocolVersion");
  });

  it("slows down guessing: repeated failures from one client end in 429, others are unaffected", async () => {
    for (let i = 0; i < 10; i++) expect((await send({ authorization: "Bearer bad" }, "1.1.1.1")).status).toBe(401);
    const blocked = await send({ authorization: "Bearer bad" }, "1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    // only failures count, so the right token still gets through from the same address
    expect((await send({ authorization: `Bearer ${TOKEN}` }, "1.1.1.1")).status).toBe(200);
    expect((await send({ authorization: "Bearer bad" }, "2.2.2.2")).status).toBe(401);
  });

  it("successful requests do not use up the failure budget", async () => {
    for (let i = 0; i < 15; i++) expect((await send({ authorization: `Bearer ${TOKEN}` })).status).toBe(200);
  });

  it("checks Origin before anything else", async () => {
    expect((await send({ authorization: `Bearer ${TOKEN}`, origin: "https://evil.example" })).status).toBe(403);
  });

  it("treats a too-short token as a misconfiguration and refuses everything", async () => {
    vi.stubEnv("MCP_AUTH_TOKEN", "x".repeat(MIN_TOKEN_LENGTH - 1));
    const res = await send({ authorization: `Bearer ${"x".repeat(MIN_TOKEN_LENGTH - 1)}` });
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/at least 16/);
  });

  describe("when no token is configured", () => {
    beforeEach(() => vi.stubEnv("MCP_AUTH_TOKEN", ""));

    it("is open outside production, so local development works", async () => {
      vi.stubEnv("NODE_ENV", "development");
      expect((await send()).status).toBe(200);
    });

    it("fails closed in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const res = await send();
      expect(res.status).toBe(503);
      expect((await res.json()).error.message).toMatch(/MCP_AUTH_TOKEN/);
      expect((await send({ authorization: "Bearer anything-at-all-0123456789" })).status).toBe(503);
    });

    it("can be opened in production only by an explicit opt-out", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MCP_ALLOW_UNAUTHENTICATED", "true");
      expect((await send()).status).toBe(200);
      vi.stubEnv("MCP_ALLOW_UNAUTHENTICATED", "yes");
      expect((await send()).status).toBe(503);
    });
  });
});
