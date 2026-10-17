import { createHash, timingSafeEqual } from "node:crypto";
import { clientIp, rateLimit } from "./ratelimit";

/** Shorter secrets are guessable, so they are treated as a misconfiguration rather than accepted. */
export const MIN_TOKEN_LENGTH = 16;

function rpcError(status: number, code: number, message: string, headers?: Record<string, string>) {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers });
}

/** Compares digests, so the check takes the same time wherever the first difference is. */
function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Shared-secret gate for /api/mcp. Returns a Response to send back when the request must not
 * proceed, or null when it may.
 *
 * - MCP_AUTH_TOKEN set (16+ characters): every request needs `Authorization: Bearer <token>`.
 * - Not set, and running in production: the endpoint refuses everything (fail closed), so a
 *   forgotten variable cannot leave it open. MCP_ALLOW_UNAUTHENTICATED=true opts out explicitly.
 * - Not set, outside production: open, so local development and tests work.
 */
export function checkMcpAuth(request: Request): Response | null {
  const token = process.env.MCP_AUTH_TOKEN ?? "";

  if (!token) {
    if (process.env.NODE_ENV !== "production" || process.env.MCP_ALLOW_UNAUTHENTICATED === "true") return null;
    return rpcError(503, -32000, "This server is not configured: set MCP_AUTH_TOKEN.");
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    return rpcError(503, -32000, `This server is misconfigured: MCP_AUTH_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters.`);
  }

  const given = bearerToken(request);
  if (given !== null && sameSecret(given, token)) return null;

  // Wrong or missing credentials: slow down guessing from one client.
  const limit = rateLimit(`mcp-auth:${clientIp(request.headers)}`);
  if (!limit.ok) {
    return rpcError(429, -32000, "Too many failed attempts. Please wait and try again.", { "Retry-After": String(limit.retryAfter) });
  }
  return rpcError(401, -32001, "Unauthorized: send the shared secret as 'Authorization: Bearer <token>'.", {
    "WWW-Authenticate": 'Bearer realm="scam-shield"',
  });
}
