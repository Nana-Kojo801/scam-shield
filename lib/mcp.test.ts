import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpServer, MCP_TOOL_NAME } from "./mcp";

async function connect() {
  const server = createMcpServer();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, server };
}

describe("MCP server (SDK client over an in-memory transport)", () => {
  beforeEach(() => vi.stubEnv("OPENAI_API_KEY", "")); // rules-only: no network
  afterEach(() => vi.unstubAllEnvs());

  it("advertises the check_message tool with schemas and safe annotations", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([MCP_TOOL_NAME]);
    const tool = tools[0];
    expect(tool.inputSchema.required).toEqual(["message"]);
    expect(Object.keys(tool.inputSchema.properties ?? {})).toEqual(["message", "context"]);
    expect(tool.outputSchema?.required).toContain("verdict");
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(tool.description).toMatch(/never opens links/i);
  });

  it("explains itself to the model in the server instructions", async () => {
    const { client } = await connect();
    expect(client.getInstructions()).toMatch(/official channel/);
    expect(client.getServerVersion()?.name).toBe("scam-shield");
  });

  it("returns a verdict, quoted red flags and voice-friendly text for a scam", async () => {
    const { client } = await connect();
    const message = "Act now! Pay a small fee in gift cards within 24 hours or face legal action.";
    const res = await client.callTool({ name: MCP_TOOL_NAME, arguments: { message, context: "came by SMS" } });
    expect(res.isError).toBeFalsy();
    const out = res.structuredContent as Record<string, unknown> & { red_flags: { quote: string }[] };
    expect(out.verdict).toBe("likely_scam");
    expect(out.ai_unavailable).toBe(true);
    for (const f of out.red_flags) expect(message).toContain(f.quote);
    const text = (res.content as { type: string; text: string }[])[0].text;
    expect(text).toContain(out.spoken_summary as string);
    expect(text).toMatch(/To verify:/);
    expect(text).toMatch(/pattern checks only/);
  });

  it("does not call a calm message a scam", async () => {
    const { client } = await connect();
    const res = await client.callTool({ name: MCP_TOOL_NAME, arguments: { message: "Are we still meeting for lunch tomorrow at noon?" } });
    expect((res.structuredContent as { verdict: string }).verdict).toBe("cannot_tell");
  });

  it("rejects an empty or oversized message as a tool error", async () => {
    const { client } = await connect();
    const empty = await client.callTool({ name: MCP_TOOL_NAME, arguments: { message: "   " } });
    expect(empty.isError).toBe(true);
    const huge = await client.callTool({ name: MCP_TOOL_NAME, arguments: { message: "a".repeat(4001) } });
    expect(huge.isError).toBe(true);
    const missing = await client.callTool({ name: MCP_TOOL_NAME, arguments: {} });
    expect(missing.isError).toBe(true);
  });
});
