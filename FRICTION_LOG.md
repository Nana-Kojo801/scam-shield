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
- **Update:** the key was later pasted into the chat, which puts a live secret in the conversation transcript. It went into the gitignored `.env.local` only. A secrets field on the session would avoid this.

## 5. Per-IP rate limit gets in the way of manual testing

- **Task:** run repeated manual checks against the dev server.
- **Expected:** to be able to iterate freely.
- **Actual:** after 10 requests in a minute from one address the route returns 429, which looked like a failure in the middle of a test run.
- **Severity:** low.
- **Workaround:** send a different `x-forwarded-for` header per request in the test script.
- **Suggestion:** none for the app; this is the limiter working as specified.

## 6. Speech recognition cannot be exercised in headless Chromium

- **Task:** test the voice flow (dictation, spoken verdict, follow-ups, permission denied) automatically.
- **Steps:** drove the app with Playwright in the pre-installed Chromium.
- **Expected:** `SpeechRecognition` and `speechSynthesis` to be testable or absent.
- **Actual:** the constructor exists but there is no microphone or speech service, and `window.speechSynthesis` is a read-only accessor, so assigning a fake silently did nothing (my first test run "passed" nothing). Deleting `SpeechRecognition` alone did not simulate an unsupported browser, because the `webkit` prefixed one remained.
- **Severity:** medium. The flow is only verifiable with an injected fake, and real-device behaviour still needs a manual check.
- **Workaround:** `addInitScript` with `Object.defineProperty` for synthesis, and delete both recognition names.
- **Suggestion:** a documented test double for the Web Speech API in Playwright.

## 7. The assistant's own voice can be picked up by the microphone

- **Task:** the two-step flow where the assistant says "Okay, read me the message" and then listens.
- **Expected:** to be able to start recognition after the prompt finished.
- **Actual:** browsers generally only allow `SpeechRecognition.start()` from a user gesture or after permission, so starting it after the utterance ends can fail on first use. Starting it on the tap instead lets the mic hear the prompt.
- **Severity:** medium.
- **Workaround:** start recognition on the tap but gate it: results are discarded until the prompt finishes (with a 4 second timeout in case the end event never fires, which some browsers do).
- **Suggestion:** an echo-cancelled recognition mode, or a reliable utterance-end signal across browsers. Needs a real-phone check in Phase 3.

## 8. React lint rule rejects the usual "detect browser support" pattern

- **Task:** read `SpeechRecognition` support and `prefers-reduced-motion` on the client.
- **Actual:** the starter's `react-hooks/set-state-in-effect` rule flags `useEffect(() => setX(...), [])`. The accepted pattern is `useSyncExternalStore` with a server snapshot, which is less discoverable.
- **Severity:** low.
- **Workaround:** `useSyncExternalStore` for both.
- **Suggestion:** the rule's message could point at `useSyncExternalStore` for capability detection.

## 9. Next dev indicator overlaps bottom-left UI in screenshots

- **Task:** review mobile screenshots.
- **Actual:** the development-only "N" button sits over the bottom-left corner and covers text. It does not appear in production builds.
- **Severity:** low.
- **Workaround:** take final screenshots against `next start`.
