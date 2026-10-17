import { checkMessage } from "@/lib/check";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { MAX_MESSAGE_CHARS } from "@/lib/types";

export const maxDuration = 30;

const MAX_CONTEXT_CHARS = 200;

function error(status: number, message: string, headers?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  const limit = rateLimit(clientIp(request.headers));
  if (!limit.ok) {
    return error(429, "Too many checks. Please wait a moment and try again.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Request body must be JSON.");
  }

  const { message, context } = (body ?? {}) as { message?: unknown; context?: unknown };
  if (typeof message !== "string" || message.trim().length === 0) {
    return error(400, "Provide the message to check as a non-empty string.");
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return error(413, `Message is too long. The limit is ${MAX_MESSAGE_CHARS} characters.`);
  }
  if (context !== undefined && typeof context !== "string") {
    return error(400, "context must be a string.");
  }

  const response = await checkMessage({
    message,
    context: context ? context.slice(0, MAX_CONTEXT_CHARS) : undefined,
  });
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
