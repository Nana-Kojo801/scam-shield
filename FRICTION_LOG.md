# Friction Log

Entry template: task attempted, steps taken, expected vs. actual, severity (low/medium/high), workaround, suggestion.

## 1. Installing Vitest into a fresh create-next-app project

- **Task:** add a unit test runner to the scaffold.
- **Steps:** `npm i -D vitest`.
- **Expected:** clean install.
- **Actual:** `ERESOLVE`. Vitest 5 needs `@types/node` ^22 or newer, while the scaffold pins `@types/node@^20`.
- **Severity:** low.
- **Workaround:** `npm i -D @types/node@22 vitest`.
- **Suggestion:** the Next.js starter could track a current `@types/node`.

## 2. Scaffold's AGENTS.md says Next.js has breaking changes

- **Task:** write the first route handler.
- **Steps:** `create-next-app` generated an `AGENTS.md` telling tools to read `node_modules/next/dist/docs/` before writing code.
- **Expected:** to rely on prior knowledge of the App Router.
- **Actual:** the bundled docs are useful and local, but it is an extra step and it is unclear which APIs actually changed.
- **Severity:** low.
- **Workaround:** read `route.md` before writing the handler.
- **Suggestion:** a short "what changed since the last major version" page would be faster than a full docs tree.

## 3. `export const runtime` rejected at request time, not at build or test time

- **Task:** write `POST /api/check` as a Node.js route handler.
- **Steps:** added `export const runtime = "nodejs"` and `export const maxDuration = 30`, wrote unit tests that import and call `POST` directly, then hit the route through `next dev`.
- **Expected:** `runtime = "nodejs"` is harmless (it is the default).
- **Actual:** every request returned an HTML 500: `Route segment config "runtime" is not compatible with nextConfig.cacheComponents`. The starter enables `cacheComponents` by default. `tsc`, `eslint` and all unit tests passed because none of them go through Next's compiler.
- **Severity:** medium. The failure only appears when the route is served, and the response is an HTML error page, not JSON.
- **Workaround:** delete the `runtime` export. `maxDuration` is still allowed.
- **Suggestion:** surface this error in `next build` and in the type-checker or lint rules, and make `create-next-app` mention that `cacheComponents` is on and which segment options it disables.

## 4. No way to exercise the OpenAI step in this build environment

- **Task:** run the manual message set against the LLM step.
- **Steps:** checked for `OPENAI_API_KEY` in the cloud session's environment.
- **Expected:** a way to provide the key to the session.
- **Actual:** the variable is not set, so only rules-only mode and the fallback path could be exercised end to end. The model call is covered by a test with a stubbed `fetch` that checks request shape and response handling, not by a live call.
- **Severity:** medium.
- **Workaround:** stubbed-`fetch` tests; verify live once the key is added.
- **Suggestion:** a prompt at session start to supply the secrets named in `.env.example`.

## 5. Per-IP rate limit gets in the way of manual testing

- **Task:** run repeated manual checks against the dev server.
- **Expected:** to be able to iterate freely.
- **Actual:** after 10 requests in a minute from one address the route returns 429, which looked like a failure in the middle of a test run.
- **Severity:** low.
- **Workaround:** send a different `x-forwarded-for` header per request in the test script.
- **Suggestion:** none for the app; this is the limiter working as specified.
