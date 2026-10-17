# Product Feedback

Notes on each tool, API and SDK used. Fields: used for, what worked, what needs work, onboarding feel, would use again.

## Next.js (App Router) + create-next-app

- **Used for:** app shell, route handlers, deployment target.
- **Worked:** one command gives TypeScript, Tailwind 4 and ESLint; bundled local docs.
- **Needs work:** the starter's `@types/node` pin conflicts with current Vitest (see FRICTION_LOG #1).
- **Onboarding:** fast.
- **Would use again:** yes.

## Vitest

- **Used for:** unit tests for the rules layer and the LLM output validation.
- **Worked:** zero-config TypeScript.
- **Needs work:** peer-dependency range clashes with the starter template.
- **Would use again:** yes.

## OpenAI API (chat completions with structured outputs)

- **Used for:** the LLM judgment step; the request uses a strict JSON schema and the response is re-validated server-side.
- **Worked:** the strict schema format maps directly onto the spec's `CheckResult` type, including the nullable `scam_type`.
- **Needs work:** strict mode requires every property to be listed as required and `additionalProperties: false`, so "optional" has to be modelled as nullable.
- **Live results (gpt-4o-mini):** 10 manual messages. Strict JSON schema output parsed every time, and every red-flag quote was an exact substring. Obvious, subtle and polite-tone scams came back as `likely_scam`. An appointment reminder, a shipping notice and a real one-time-code message came back as `likely_legit`. A Spanish scam was caught even though the rules layer is English-only. An injection attempt inside the message was flagged as a red flag and not obeyed.
- **Needs work:** the model rated a casual "call me back when you get a sec" as `likely_legit` with `high` confidence until the prompt told it to calibrate confidence for short, context-free messages; with that line it returns `cannot_tell` / `low`. Its `what_to_do` wording is generic.
- **Onboarding:** quick; one endpoint, one header, and the schema format is well documented.
- **Would use again:** yes, for a low-cost judgment step.

## Next.js 16 route handlers with Cache Components

- **Used for:** `POST /api/check`.
- **Worked:** plain Web `Request` and `Response` handlers; the bundled docs in `node_modules/next/dist/docs` were accurate.
- **Needs work:** `export const runtime` is rejected when `cacheComponents` is on, and the error only shows when a request is served (see FRICTION_LOG #3).
- **Would use again:** yes.
