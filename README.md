# Scam Shield

A voice-first scam checker. Say or paste a suspicious message and Scam Shield returns a verdict,
the red flags it found highlighted in your own text, and what to do next. It works for any scam,
any brand and any region, and it is not tied to one company.

**Live:** https://scam-shield-murex.vercel.app

Built for the Build, Ship, Shape: Amazon Developer Hackathon, Alexa+ track, using the **simulated
Alexa+ experience** path (see [The simulated Alexa+ approach](#the-simulated-alexa-approach)).

Scam Shield helps people judge. It never claims to know who sent a message, and it never opens
links.

## How it works

Every check runs two steps and shows both:

1. **Rules layer** (`lib/rules.ts`). Eleven deterministic pattern checks, no AI: urgency, threats,
   unusual payment methods, requests for codes or details, link red flags, impersonation cues,
   too-good-to-be-true offers, secrecy, generic greetings, wrong-number or rapport openers, and
   text aimed at an AI checker. Each returns *signals* with a weight (1 to 5) and the exact
   substrings it matched. Link checks look at the URL **string** only (shorteners, raw IPs, `@`,
   odd endings, lookalike domains, brand-versus-domain mismatch).
2. **LLM judgment** (`lib/llm.ts`). The message, optional context and the rule signals go to an
   OpenAI model, which must answer in a strict JSON schema: verdict, confidence, scam type, red
   flags with quotes, reassuring signs, steps, how to verify, a spoken summary and a teaching tip.
   The server then validates the output and **drops any red-flag quote that is not an exact
   substring of your message**, so highlights are always real.

If the model call fails or no key is set, the app returns a rules-only result with a clear
"AI check unavailable, showing pattern checks only" notice. It stays usable.

```
 mic / paste ──► POST /api/check ──► rules layer ──► signals ─┐
                    │  input cap, per-IP rate limit            ├─► merge ──► verdict + highlights
                    └─► OpenAI (JSON schema) ─► validate ──────┘     │
                              │ fails                                 ▼
                              └────► rules-only result ──► report, spoken summary, follow-ups
```

### Safety and privacy

- Links in messages are never fetched, opened or followed.
- No accounts, no database, no stored history. Message text is never logged (errors log a status
  code only).
- The message is treated as untrusted data, not instructions. Injection attempts inside a message
  are flagged and ignored.
- The OpenAI key stays on the server.
- Advice always points to an official channel the user already trusts, never to links or numbers
  in the message.

## The simulated Alexa+ approach

The UI is labelled "Simulated Alexa+ experience" and mimics a voice-assistant exchange in the
browser. It uses no Amazon or Alexa logos or imagery.

- The invocation line, "Alexa, ask Scam Shield to check a message.", starts the flow.
- The assistant says "Okay, read me the message." (spoken and on screen), then listens and shows a
  live transcript.
- It speaks a short verdict, with replay and mute.
- Follow-ups such as "Why?", "What should I do?", "Read me the red flags" and "Check another" work
  by voice or text. They are matched on the device against the report already returned, so they
  make no extra model call.

Speech uses the browser's Web Speech API (`SpeechRecognition` and `speechSynthesis`). Where speech
recognition is missing or blocked, the mic is hidden or explained and typed input always works.

**Where the simulation lives**

| Concern | File |
| --- | --- |
| Voice flow and screens | `components/Desk.tsx` |
| Mic, transcript, spoken replies | `components/useVoice.ts`, `lib/speech.ts` |
| Listening screen | `components/ListenPane.tsx` |
| Follow-up intent matching | `lib/followups.ts` |
| Check pipeline shared by any front door | `lib/check.ts` |

## Project layout

```
app/api/check/route.ts   POST /api/check
lib/rules.ts             the deterministic rules
lib/llm.ts               prompt, JSON schema, call, output validation
lib/fallback.ts          rules-only result
lib/check.ts             pipeline
lib/ratelimit.ts         in-memory per-IP limiter
lib/annotate.ts          splits a message into highlighted segments
components/              screens, report and voice hooks
```

## Setup

Requires Node 20.19 or newer (22 recommended).

```bash
npm install
cp .env.example .env.local   # then add your key
npm run dev                  # http://localhost:3000
npm test                     # unit tests
npm run lint && npx tsc --noEmit
```

### Environment variables

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-side only. Without it the app runs in rules-only mode. |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini` for low cost. |

### Deploying to Vercel

Import the repository, set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in the project's
Environment Variables, and deploy. No other configuration is needed. `next.config.ts` sets a few
security headers, including a Permissions-Policy that allows the microphone for this site only.

## Testing

`npm test` runs 87 unit tests: every rule (including guards against flagging legitimate text),
quote validation, the rules-only fallback, the rate limiter, the route's input handling, the model
call with a stubbed `fetch`, annotation segments, and follow-up intents.

## Known limits

- The keyword rules are English-only (link checks are not). The model still caught non-English
  scams in testing, but rules-only mode will miss them.
- The rate limiter is per server instance, so on serverless hosting it is a speed bump, not a hard
  guarantee.
- Speech recognition support varies by browser. The assistant's own voice can reach the mic on some
  devices, so results are ignored until its prompt finishes.
- The listening waveform is decorative; it shows that the mic is open, not your voice level.
- A verdict is a judgment, not a guarantee.

## Not included

The optional MCP endpoint (`/api/mcp`) and a "scam of the week" mode are not built. The check
pipeline in `lib/check.ts` is written so another front door can reuse it.

## License

MIT. See [LICENSE](LICENSE).
