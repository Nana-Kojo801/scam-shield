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
- **Steps:** Ran the five manual messages and then further checks against the dev server in quick succession.
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
- **Steps:** Designed the flow in which the assistant speaks a prompt and then starts listening.
- **Expected:** to be able to start recognition after the prompt finished.
- **Actual:** browsers generally only allow `SpeechRecognition.start()` from a user gesture or after permission, so starting it after the utterance ends can fail on first use. Starting it on the tap instead lets the mic hear the prompt.
- **Severity:** medium.
- **Workaround:** start recognition on the tap but gate it: results are discarded until the prompt finishes (with a 4 second timeout in case the end event never fires, which some browsers do).
- **Suggestion:** an echo-cancelled recognition mode, or a reliable utterance-end signal across browsers. Needs a real-phone check in Phase 3.

## 8. React lint rule rejects the usual "detect browser support" pattern

- **Task:** read `SpeechRecognition` support and `prefers-reduced-motion` on the client.
- **Steps:** Wrote hooks that read SpeechRecognition support and `prefers-reduced-motion` with `useEffect(() => setX(...), [])`, then ran `eslint`.
- **Expected:** The lint rule to pass, since this is the common way to detect browser support.
- **Actual:** the starter's `react-hooks/set-state-in-effect` rule flags `useEffect(() => setX(...), [])`. The accepted pattern is `useSyncExternalStore` with a server snapshot, which is less discoverable.
- **Severity:** low.
- **Workaround:** `useSyncExternalStore` for both.
- **Suggestion:** the rule's message could point at `useSyncExternalStore` for capability detection.

## 9. Next dev indicator overlaps bottom-left UI in screenshots

- **Task:** review mobile screenshots.
- **Steps:** Took phone-width screenshots of the app running under `next dev`.
- **Expected:** Clean screenshots of the app.
- **Actual:** the development-only "N" button sits over the bottom-left corner and covers text. It does not appear in production builds.
- **Severity:** low.
- **Workaround:** take final screenshots against `next start`.
- **Suggestion:** Make the development indicator easy to move or hide when taking screenshots.

## 10. Design reference link could not be read by the usual fetch tools

- **Task:** redesign the UI from a Dribbble shot.
- **Steps:** fetched the shot URL, then tried `curl` with a browser user agent.
- **Expected:** the page content or its image.
- **Actual:** the fetch tool returned an empty page, and `curl` got an HTTP 202 with an empty body (a bot challenge, the content is rendered client-side).
- **Severity:** medium. Without the image the redesign would have been guesswork.
- **Workaround:** opened the page in the pre-installed Chromium through Playwright, read the `og:image` meta tag, and downloaded that image.
- **Suggestion:** design-sharing sites could expose a plain-HTML preview or an oEmbed endpoint for tools.

## 11. Same heading rendered twice after the redesign

- **Task:** make the report work as both a phone screen and a desktop panel.
- **Steps:** Built the result screen as both a phone screen (with its own header) and a desktop panel, then ran scripted browser checks that look up headings by role.
- **Expected:** One visible "Report" heading per screen.
- **Actual:** the phone screen header and the report both said "Report", which a scripted accessibility-tree query flagged as two headings.
- **Severity:** low.
- **Workaround:** keep the report's own heading for screen readers and focus, and show it visually only on desktop, where there is no screen header.
- **Suggestion:** A check for duplicate headings within one landmark would flag this earlier.

## 12. Automated contrast audit flagged text that was only mid-fade

- **Task:** accessibility pass with axe-core on every screen.
- **Steps:** Ran axe-core on each screen straight after it appeared.
- **Expected:** Only real contrast failures to be reported.
- **Actual:** the first run reported contrast failures on text that was still fading in (colours sampled at partial opacity), mixed in with real failures (faint placeholder, dimmed pending rows, blue chip text at 4.28:1).
- **Severity:** low.
- **Workaround:** wait for animations to finish before sampling, and replace opacity-based dimming with solid colours.
- **Suggestion:** axe could offer an option to wait for animations or ignore elements mid-transition.

## 13. Fake-clock tests need small steps for React timers

- **Task:** test the 35 second client timeout without waiting 35 seconds.
- **Steps:** Used Playwright's fake clock and advanced it in one large step to reach the waiting state, then past the 35 second timeout.
- **Expected:** The UI to reach the waiting state after the clock advanced.
- **Actual:** one large `clock.runFor` jump fires chained timers (each scheduled after a render) before React can schedule the next one, so the UI never reached the state under test.
- **Severity:** low.
- **Workaround:** advance the clock in small steps with a short real wait between them.
- **Suggestion:** document this for chained, render-scheduled timers in Playwright's clock guide.

## 14. Deploying needs credentials the build environment does not have

- **Task:** deploy to Vercel from the cloud session.
- **Steps:** Checked the session's environment for a Vercel token or connector and probed whether `api.vercel.com` was reachable.
- **Expected:** To deploy from the session with the owner's account.
- **Actual:** Vercel was reachable, but there was no token or connector, so the repository owner imported the project themselves.
- **Severity:** low.
- **Workaround:** the owner deployed from the Vercel dashboard; the live site was then verified from outside.
- **Suggestion:** a Vercel connector for sessions, or a clear place to supply a deploy token.

## 15. My own global focus style silently beat Tailwind's `focus:outline-none`

- **Task:** the follow-up text field showed a square focus border inside a rounded pill (reported from a phone).
- **Steps:** the input had `focus:outline-none`, so it looked handled.
- **Expected:** the utility removes the outline.
- **Actual:** my global `:focus-visible` rule was unlayered CSS, and unlayered rules beat every layered rule (including all Tailwind utilities) regardless of specificity, so the utility never applied. The browser drew a rectangle around the bare input. The composer textarea had the same problem in a different form.
- **Severity:** low, but easy to miss on a desktop with a mouse.
- **Workaround:** put the global rule in `@layer base`, remove the field's own outline, and draw the ring on the rounded container with `has-[input:focus-visible]`.
- **Suggestion:** a lint or dev warning when unlayered CSS overrides a Tailwind utility would have caught this.

## 16. MCP over serverless needs decisions the spec leaves open

- **Task:** expose the check as an MCP tool on Vercel.
- **Steps:** Wrote the stateless route with the SDK's web-standard transport, read its options, and wrote a test for each decision.
- **Expected:** A documented recipe for running a stateless MCP server on serverless hosting.
- **Actual:** a stateless server works well, but a few choices had to be made: GET and DELETE return 405 because a long-lived stream does not suit a serverless function; the SDK's built-in origin check is marked deprecated in favour of external middleware, so origin validation is done in the route; and a normal session is three requests (initialize, initialized, then the call), so rate limiting every request would have throttled legitimate clients. Only `tools/call` is limited.
- **Severity:** low.
- **Workaround:** the choices above, each covered by a test.
- **Suggestion:** a short serverless recipe in the SDK docs (stateless, JSON responses, origin check, limits).

## 17. Alexa+ itself cannot be tested from here

- **Task:** confirm the MCP endpoint works with Alexa+.
- **Steps:** Built the endpoint and verified it with the official MCP client over real HTTP.
- **Expected:** A way to confirm the integration with the target assistant.
- **Actual:** registering an MCP server with Alexa+ happens in Amazon's own tooling, which this build environment cannot reach, so only conformance with the standard transport and the official SDK client could be verified.
- **Severity:** medium for the hackathon track, low for the code.
- **Workaround:** test against the official SDK client over real HTTP, locally and on the deployment.
- **Suggestion:** a public conformance checker or test harness for Alexa+ MCP servers.

## 18. A secret-protected endpoint has to decide what "not configured" means

- **Task:** put a shared secret on `/api/mcp`.
- **Steps:** Implemented the bearer-token check and decided what the endpoint should do when the variable is missing.
- **Expected:** A safe default without extra decisions from the developer.
- **Actual:** the obvious version (check the token if one is set) is open by default, so a forgotten environment variable on the host silently leaves the endpoint public, and the owner would never see an error. The opposite choice (refuse until configured) is safe but means the live endpoint stops working between deploying the code and adding the variable.
- **Severity:** medium, because the failure is silent.
- **Workaround:** fail closed in production (503 with a clear message), open outside production, with an explicit `MCP_ALLOW_UNAUTHENTICATED=true` opt-out. The variable is therefore added to the host before the code is deployed.
- **Suggestion:** hosts could warn when code reads an environment variable that is not set for the target environment.

## 19. Brute-force limiting must not punish the legitimate caller

- **Task:** slow down token guessing.
- **Steps:** Added rate limiting for failed token attempts and considered reusing the per-request limiter.
- **Expected:** A limiter that stops guessing without blocking real clients.
- **Actual:** reusing the per-request limiter would have counted valid calls too, throttling real clients (a session is three requests). Only failed attempts are counted, against a separate key, so a real client sharing an address with an attacker still gets through.
- **Severity:** low.
- **Workaround:** a separate failure-only counter, covered by tests.
- **Suggestion:** Count only failures, under a separate key (as `lib/mcp-auth.ts` now does).
