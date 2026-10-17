import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/mcp/route";
import { resetRateLimit } from "./ratelimit";

const BASE = "https://scam-shield.test/api/mcp";
const baseHeaders = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  "x-forwarded-for": "7.7.7.7",
};

const rpc = (method: string, params?: unknown, id: number | null = 1) => ({ jsonrpc: "2.0", ...(id === null ? {} : { id }), method, ...(params ? { params } : {}) });

async function post(body: unknown, headers: Record<string, string> = {}, raw = false) {
  return POST(new Request(BASE, { method: "POST", headers: { ...baseHeaders, ...headers }, body: raw ? (body as string) : JSON.stringify(body) }));
}

const initParams = { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } };
const callTool = (message: unknown) => rpc("tools/call", { name: "check_message", arguments: { message } }, 9);

describe("POST /api/mcp (Streamable HTTP, stateless)", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("MCP_ALLOWED_ORIGINS", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("completes the initialize handshake on protocol version 2025-11-25", async () => {
    const res = await post(rpc("initialize", initParams));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.result.protocolVersion).toBe("2025-11-25");
    expect(json.result.serverInfo.name).toBe("scam-shield");
    expect(json.result.capabilities.tools).toBeDefined();
    expect(json.result.instructions).toMatch(/never opens links/);
    expect(res.headers.get("mcp-session-id")).toBeNull(); // stateless
  });

  it("negotiates down for an older client version", async () => {
    const res = await post(rpc("initialize", { ...initParams, protocolVersion: "2025-03-26" }));
    expect((await res.json()).result.protocolVersion).toBe("2025-03-26");
  });

  it("accepts the initialized notification with 202 and no body", async () => {
    const res = await post(rpc("notifications/initialized", undefined, null), { "mcp-protocol-version": "2025-11-25" });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("lists the tool", async () => {
    const res = await post(rpc("tools/list"), { "mcp-protocol-version": "2025-11-25" });
    const json = await res.json();
    expect(json.result.tools).toHaveLength(1);
    expect(json.result.tools[0]).toMatchObject({ name: "check_message", annotations: { readOnlyHint: true } });
  });

  it("runs a check and returns structured content", async () => {
    const msg = "Act now! Pay a small fee in gift cards within 24 hours or face legal action.";
    const res = await post(callTool(msg), { "mcp-protocol-version": "2025-11-25" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(9);
    expect(json.result.isError).toBeFalsy();
    expect(json.result.structuredContent.verdict).toBe("likely_scam");
    for (const f of json.result.structuredContent.red_flags) expect(msg).toContain(f.quote);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("reports bad tool input as a tool error and an unknown tool as a protocol error", async () => {
    const bad = await (await post(callTool(""), { "mcp-protocol-version": "2025-11-25" })).json();
    expect(bad.result.isError).toBe(true);
    const unknown = await (await post(rpc("tools/call", { name: "nope", arguments: {} }), { "mcp-protocol-version": "2025-11-25" })).json();
    expect(unknown.error ?? unknown.result?.isError).toBeTruthy();
  });

  it("offers no GET stream and no DELETE", async () => {
    for (const handler of [GET, DELETE]) {
      const res = await handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    }
  });

  it("rejects a foreign Origin (DNS rebinding) but allows same-origin, no Origin, and listed origins", async () => {
    const init = rpc("initialize", initParams);
    expect((await post(init, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post(init, { origin: "https://scam-shield.test", host: "scam-shield.test" })).status).toBe(200);
    expect((await post(init)).status).toBe(200);
    vi.stubEnv("MCP_ALLOWED_ORIGINS", "https://partner.example, https://other.example");
    expect((await post(init, { origin: "https://partner.example" })).status).toBe(200);
    expect((await post(init, { origin: "not a url" })).status).toBe(403);
  });

  it("rejects malformed JSON, wrong Accept, unsupported protocol version and oversized bodies", async () => {
    const bad = await post("{nope", {}, true);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe(-32700);
    expect((await post(rpc("tools/list"), { accept: "text/plain", "mcp-protocol-version": "2025-11-25" })).status).toBe(406);
    expect((await post(rpc("tools/list"), { "mcp-protocol-version": "1999-01-01" })).status).toBe(400);
    expect((await post(rpc("initialize", initParams), { "content-length": "999999" })).status).toBe(413);
  });

  it("limits tool calls per client but never the handshake", async () => {
    const h = { "mcp-protocol-version": "2025-11-25" };
    for (let i = 0; i < 10; i++) expect((await post(callTool("hello there my friend"), h)).status).toBe(200);
    const limited = await post(callTool("hello there my friend"), h);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await limited.json()).error.message).toMatch(/Too many checks/);
    expect((await post(rpc("initialize", initParams))).status).toBe(200);
    expect((await post(rpc("tools/list"), h)).status).toBe(200);
  });
});
