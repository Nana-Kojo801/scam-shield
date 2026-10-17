# Scam Shield

A voice-first scam checker. Say or paste a suspicious message and get a verdict,
the red flags found (highlighted in the original text), and what to do next.

Status: Phase 1 (rules layer, `/api/check`, tests) done. Voice UI and full README to follow.

## Setup

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY
npm run dev
npm test
```

Without `OPENAI_API_KEY` the app runs in rules-only mode.
