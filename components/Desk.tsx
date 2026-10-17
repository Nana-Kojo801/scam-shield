"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { answerFor, matchIntent } from "@/lib/followups";
import { runRules } from "@/lib/rules";
import { VOICE_ERROR_TEXT } from "@/lib/speech";
import { MAX_MESSAGE_CHARS, type CheckResponse } from "@/lib/types";
import { MicIcon, ReplayIcon, SpeakerIcon, SpeakerOffIcon, StopIcon } from "./Icons";
import { Report } from "./Report";
import { ScanList } from "./ScanList";
import { usePrefersReducedMotion, useRecognizer, useSpeaker, useSupport } from "./useVoice";

type Phase = "idle" | "prompting" | "listening" | "checking" | "result";

const INVOCATION = "Alexa, ask Scam Shield to check a message.";
const PROMPT = "Okay, read me the message.";

const SAMPLES = [
  { label: "Parcel fee", text: "Delivery notice: your parcel could not be delivered. Pay a small fee at https://parcel-redelivery.top/pay within 24 hours or it will be returned to sender." },
  { label: "Wrong number", text: "Hi, is this Sarah? Oh sorry, wrong number! You seem really nice though. A friend of mine makes steady profits on a trading platform, happy to show you how it works." },
  { label: "Login code", text: "Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone." },
];

const CHANNELS = [
  { value: "", label: "Not sure" },
  { value: "came by SMS", label: "Text message" },
  { value: "came by email", label: "Email" },
  { value: "phone call transcript", label: "Phone call" },
  { value: "came through a social media or chat app", label: "Social or chat app" },
];

const FOLLOWUPS = ["Why?", "What should I do?", "Read me the red flags", "Check another"];

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 border-2 border-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btnPlain = `${btn} bg-transparent text-ink hover:bg-ink hover:text-paper`;
const btnPrimary = `${btn} bg-ink text-paper hover:bg-transparent hover:text-ink`;

export function Desk() {
  const support = useSupport();
  const reduced = usePrefersReducedMotion();
  const recognizer = useRecognizer();
  const speaker = useSpeaker(support.synthesis);

  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [response, setResponse] = useState<CheckResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<{ q: string; a: string }[]>([]);
  const [followText, setFollowText] = useState("");
  const [announce, setAnnounce] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // The report appears only when the checks have ticked through AND the answer is in.
  const gateRef = useRef<{ revealed: boolean; response: CheckResponse | null; error: string | null }>({
    revealed: false,
    response: null,
    error: null,
  });

  // The same pure rules function the server runs, so the checking list shows real findings.
  const localSignals = useMemo(() => (submitted ? runRules(submitted) : []), [submitted]);

  const tryFinish = () => {
    const gate = gateRef.current;
    if (!gate.revealed) return;
    if (gate.error) {
      setApiError(gate.error);
      setPhase("idle");
      setAnnounce(gate.error);
    } else if (gate.response) {
      setResponse(gate.response);
      setPhase("result");
      setAnnounce(gate.response.result.spoken_summary);
      speaker.speak(gate.response.result.spoken_summary);
    }
  };

  const submit = async (text: string) => {
      const message = text.trim();
      if (!message) return;
      speaker.cancel();
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setSubmitted(message);
      setResponse(null);
      setApiError(null);
      gateRef.current = { revealed: false, response: null, error: null };
      setDialogue([]);
      setPhase("checking");
      setAnnounce("Checking the message.");

      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, context: channel || undefined }),
          signal: ctrl.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.result) {
          gateRef.current.error = json?.error ?? "Something went wrong while checking. Please try again.";
        } else {
          gateRef.current.response = json as CheckResponse;
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        gateRef.current.error = "I couldn't reach the checker. Check your connection and try again.";
      }
      tryFinish();
  };

  useEffect(() => {
    if (phase === "result") headingRef.current?.focus();
  }, [phase]);

  const startVoice = () => {
    if (!support.recognition) return;
    speaker.cancel();
    setApiError(null);
    setPhase("prompting");
    setAnnounce(PROMPT);

    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      recognizer.open();
      setPhase("listening");
      setAnnounce("Listening.");
    };
    recognizer.start(
      {
        continuous: true,
        silenceMs: 2600,
        onDone: (text) => {
          setDraft(text);
          void submit(text);
        },
        // A voice failure drops the user back to the typed fallback with a plain explanation.
        onError: () => {
          speaker.cancel();
          setPhase("idle");
        },
      },
      { gated: true },
    );
    speaker.speak(PROMPT, open);
    setTimeout(open, 4000); // some browsers never fire the utterance end event
  };

  const cancelVoice = () => {
    recognizer.cancel();
    speaker.cancel();
    setPhase("idle");
  };

  const reset = () => {
    abortRef.current?.abort();
    recognizer.cancel();
    speaker.cancel();
    setPhase("idle");
    setDraft("");
    setSubmitted("");
    setResponse(null);
    setApiError(null);
    setDialogue([]);
    setFollowText("");
    setAnnounce("Ready for another message.");
    setTimeout(() => micRef.current?.focus(), 0);
  };

  const ask = (q: string) => {
    if (!response || !q.trim()) return;
    const intent = matchIntent(q);
    if (intent === "check_another") return reset();
    const a = answerFor(intent, response.result);
    setDialogue((d) => [...d, { q: q.trim(), a }]);
    setFollowText("");
    speaker.speak(a);
  };

  const askByVoice = () => {
    if (recognizer.listening) return recognizer.stop();
    speaker.cancel();
    recognizer.start({ continuous: false, silenceMs: 1400, onDone: ask });
  };

  const voiceBusy = phase === "prompting" || phase === "listening";
  const showVoiceError = recognizer.error && phase === "idle";
  const overLimit = draft.length > MAX_MESSAGE_CHARS;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-5">
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      <header className="border-t-[6px] border-ink pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">Scam Shield</h1>
          <span className="border-2 border-ink px-2 py-0.5 text-right font-mono text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.16em]">
            Simulated Alexa+<br />experience
          </span>
        </div>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Field guide to suspicious messages</p>
        <div className="mt-3 h-px bg-ink" />
        <div className="mt-0.5 h-px bg-ink" />
      </header>

      <main className="mt-8">
        {(phase === "idle" || voiceBusy) && (
          <div className="rise">
            <p className="font-display text-2xl italic leading-snug sm:text-3xl">“{INVOCATION}”</p>

            <div className="mt-8 flex flex-col items-center">
              {support.ready && support.recognition ? (
                <>
                  <div className="relative">
                    {recognizer.listening && phase === "listening" && (
                      <span className="pulse-ring absolute inset-0 rounded-full border-2 border-scam" aria-hidden="true" />
                    )}
                    <button
                      ref={micRef}
                      type="button"
                      onClick={voiceBusy ? cancelVoice : startVoice}
                      aria-label={voiceBusy ? "Stop listening" : "Start speaking the message"}
                      aria-pressed={voiceBusy}
                      className={`relative flex h-28 w-28 items-center justify-center rounded-full border-[3px] transition-colors ${
                        voiceBusy
                          ? "border-scam bg-scam text-paper"
                          : "border-ink bg-ink text-paper hover:bg-paper hover:text-ink"
                      }`}
                    >
                      {voiceBusy ? <StopIcon className="h-10 w-10" /> : <MicIcon className="h-12 w-12" />}
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
                    {phase === "prompting" ? "One moment" : phase === "listening" ? "Listening" : "Tap to speak"}
                  </p>
                </>
              ) : support.ready ? (
                <p className="max-w-sm border-2 border-dashed border-ink px-3 py-2 text-center text-sm">
                  Voice input isn’t available in this browser. Paste the message below instead.
                </p>
              ) : (
                <div className="h-28" aria-hidden="true" />
              )}
            </div>

            {voiceBusy && (
              <div className="mt-6 border-2 border-ink bg-paper-deep/50 p-4">
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Scam Shield</div>
                <p className="mt-1 font-display text-xl">{PROMPT}</p>
                <div className="mt-4 min-h-14 border-t border-rule pt-3">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">You</div>
                  <p className="mt-1 whitespace-pre-wrap break-words font-mono text-sm" aria-live="off">
                    {recognizer.heard || (phase === "listening" ? "…" : "")}
                  </p>
                </div>
                {phase === "listening" && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={btnPrimary} onClick={recognizer.stop} disabled={!recognizer.heard}>
                      Done, check it
                    </button>
                    <button type="button" className={btnPlain} onClick={cancelVoice}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {showVoiceError && (
              <div role="alert" className="mt-6 border-l-4 border-scam bg-paper-deep/60 px-3 py-2">
                {VOICE_ERROR_TEXT[recognizer.error!]}
              </div>
            )}
            {apiError && phase === "idle" && (
              <div role="alert" className="mt-6 border-l-4 border-scam bg-paper-deep/60 px-3 py-2">{apiError}</div>
            )}

            {!voiceBusy && (
              <form
                className="mt-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!overLimit) void submit(draft);
                }}
              >
                <label htmlFor="message" className="font-display text-xl font-semibold">
                  or paste the message here
                </label>
                <textarea
                  id="message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  className="ruled mt-2 w-full resize-y border-2 border-ink bg-transparent px-3 py-0 text-[1.0625rem] placeholder:text-ink-soft/70"
                  placeholder="Paste the text, email or call transcript…"
                />
                <div className="mt-1 flex justify-between font-mono text-xs text-ink-soft">
                  <span>Anything inside the message is treated as data, never as instructions.</span>
                  <span style={{ color: overLimit ? "var(--scam)" : undefined }}>{draft.length}/{MAX_MESSAGE_CHARS}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <div>
                    <label htmlFor="channel" className="block font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
                      How did it reach you?
                    </label>
                    <select
                      id="channel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="mt-1 min-h-11 border-2 border-ink bg-paper px-2 font-mono text-sm"
                    >
                      {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <button type="submit" className={`${btnPrimary} ml-auto`} disabled={!draft.trim() || overLimit}>
                    Check message
                  </button>
                </div>

                <div className="mt-6 border-t border-rule pt-3">
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Try an example: </span>
                  <span className="inline-flex flex-wrap gap-2 align-middle">
                    {SAMPLES.map((s) => (
                      <button key={s.label} type="button" className="min-h-9 border border-ink px-2 font-mono text-xs hover:bg-ink hover:text-paper" onClick={() => setDraft(s.text)}>
                        {s.label}
                      </button>
                    ))}
                  </span>
                </div>
              </form>
            )}
          </div>
        )}

        {phase === "checking" && <ScanList key={submitted} signals={localSignals} reduced={reduced} onRevealed={() => { gateRef.current.revealed = true; tryFinish(); }} />}

        {phase === "result" && response && (
          <div className="rise">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {support.synthesis && (
                <>
                  <button type="button" className={btnPlain} onClick={() => speaker.speak(response.result.spoken_summary, undefined, true)} aria-label="Replay the spoken verdict">
                    <ReplayIcon className="h-4 w-4" /> Replay
                  </button>
                  <button type="button" className={btnPlain} onClick={speaker.toggleMute} aria-pressed={speaker.muted} aria-label={speaker.muted ? "Unmute spoken replies" : "Mute spoken replies"}>
                    {speaker.muted ? <SpeakerOffIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
                    {speaker.muted ? "Muted" : "Sound on"}
                  </button>
                </>
              )}
              {!support.synthesis && support.ready && (
                <span className="font-mono text-xs text-ink-soft">Spoken replies aren’t available in this browser; the report is below.</span>
              )}
              <button type="button" className={`${btnPrimary} ml-auto`} onClick={reset}>Check another</button>
            </div>

            <Report message={submitted} response={response} headingRef={headingRef} />

            <section className="mt-10 border-t-[6px] border-ink pt-3" aria-label="Follow-up questions">
              <h2 className="font-display text-2xl font-semibold">Ask a follow-up</h2>
              <p className="text-sm text-ink-soft">Answers come from the report above. Nothing new is sent anywhere.</p>

              {dialogue.length > 0 && (
                <ol className="mt-4 space-y-4" aria-live="polite">
                  {dialogue.map((d, i) => (
                    <li key={i}>
                      <p className="font-mono text-sm"><span className="text-ink-soft">You: </span>{d.q}</p>
                      <p className="mt-1 border-l-4 border-ink pl-3">{d.a}</p>
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {FOLLOWUPS.map((q) => (
                  <button key={q} type="button" className={btnPlain} onClick={() => ask(q)}>{q}</button>
                ))}
              </div>

              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(followText);
                }}
              >
                <label htmlFor="follow" className="sr-only">Type a follow-up question</label>
                <input
                  id="follow"
                  value={followText}
                  onChange={(e) => setFollowText(e.target.value)}
                  placeholder={recognizer.listening ? (recognizer.heard || "Listening…") : "Why? What should I do?"}
                  className="min-h-11 min-w-0 flex-1 border-2 border-ink bg-transparent px-3 font-mono text-sm"
                />
                {support.recognition && (
                  <button type="button" className={btnPlain} onClick={askByVoice} aria-label={recognizer.listening ? "Stop listening" : "Ask by voice"} aria-pressed={recognizer.listening}>
                    <MicIcon className="h-4 w-4" />
                  </button>
                )}
                <button type="submit" className={btnPrimary} disabled={!followText.trim()}>Ask</button>
              </form>
              {recognizer.error && <p role="alert" className="mt-2 text-sm">{VOICE_ERROR_TEXT[recognizer.error]}</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
