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
- **Status:** the call is covered by tests with a stubbed `fetch`. It has not yet been run against the live API, because no key was available in the build environment (see FRICTION_LOG #4).
- **Onboarding:** to be completed after the first live run.
- **Would use again:** to be completed after the first live run.

## Next.js 16 route handlers with Cache Components

- **Used for:** `POST /api/check`.
- **Worked:** plain Web `Request` and `Response` handlers; the bundled docs in `node_modules/next/dist/docs` were accurate.
- **Needs work:** `export const runtime` is rejected when `cacheComponents` is on, and the error only shows when a request is served (see FRICTION_LOG #3).
- **Would use again:** yes.
