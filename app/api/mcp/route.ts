import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp";
import { checkMcpAuth } from "@/lib/mcp-auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const maxDuration = 30;

// Streamable HTTP, stateless: every POST is answered with a single JSON response. There is no
// server-to-client stream and no session, so GET and DELETE are not offered.
const MAX_BODY_BYTES = 64 * 1024;

function rpcError(status: number, code: number, message: string, headers?: Record<string, string>) {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers });
}

/**
 * The spec requires servers to validate Origin to prevent DNS rebinding. Calls from agents and
 * assistants carry no Origin header and are allowed. A browser page may call only from this
 * site's own origin, or from one listed in MCP_ALLOWED_ORIGINS (comma separated).
 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = (process.env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  try {
    return new URL(origin).host === (request.headers.get("host") ?? new URL(request.url).host);
  } catch {
    return false;
  }
}

const isToolCall = (m: unknown) => !!m && typeof m === "object" && (m as { method?: unknown }).method === "tools/call";

export async function POST(request: Request) {
  if (!originAllowed(request)) return rpcError(403, -32000, "Origin not allowed.");

  const denied = checkMcpAuth(request);
  if (denied) return denied;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return rpcError(413, -32000, "Request too large.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rpcError(400, -32700, "Parse error: the body must be JSON.");
  }

  // Only tool calls cost anything, so only they are limited; the handshake is free.
  const calls = Array.isArray(body) ? body : [body];
  if (calls.some(isToolCall)) {
    const limit = rateLimit(`mcp:${clientIp(request.headers)}`);
    if (!limit.ok) {
      return rpcError(429, -32000, "Too many checks. Please wait a moment and try again.", { "Retry-After": String(limit.retryAfter) });
    }
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true, maxRequestBodySize: MAX_BODY_BYTES });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody: body });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    await transport.close().catch(() => {});
  }
}

const notOffered = () => rpcError(405, -32000, "This server answers POST requests only.", { Allow: "POST" });
export const GET = notOffered;
export const DELETE = notOffered;
