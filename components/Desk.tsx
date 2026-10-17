"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { answerFor, matchIntent } from "@/lib/followups";
import { runRules } from "@/lib/rules";
import { VOICE_ERROR_TEXT } from "@/lib/speech";
import type { CheckResponse } from "@/lib/types";
import { Composer } from "./Composer";
import { EmptyPane } from "./EmptyPane";
import { HomePane } from "./HomePane";
import { BackIcon, MicIcon, ReplayIcon, SendIcon, ShieldIcon } from "./Icons";
import { ListenPane } from "./ListenPane";
import { Nav } from "./Nav";
import { Report } from "./Report";
import { ScanList } from "./ScanList";
import { usePrefersReducedMotion, useRecognizer, useSpeaker, useSupport } from "./useVoice";

type Phase = "home" | "compose" | "prompting" | "listening" | "checking" | "result";

const PROMPT = "Okay, read me the message.";
const CLIENT_TIMEOUT_MS = 35_000;
const FOLLOWUPS = ["Why?", "What should I do?", "Read me the red flags", "Check another"];
const TITLES: Record<Phase, string> = {
  home: "Scam Shield",
  compose: "Check a message",
  prompting: "Listening",
  listening: "Listening",
  checking: "Checking",
  result: "Report",
};

const circleBtn = "flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink transition-colors hover:bg-blue-tint";

export function Desk() {
  const support = useSupport();
  const reduced = usePrefersReducedMotion();
  const recognizer = useRecognizer();
  const speaker = useSpeaker(support.synthesis);

  const [phase, setPhase] = useState<Phase>("home");
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [response, setResponse] = useState<CheckResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<{ q: string; a: string }[]>([]);
  const [followText, setFollowText] = useState("");
  const [announce, setAnnounce] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      setPhase("compose");
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

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, CLIENT_TIMEOUT_MS);

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
      if ((err as Error).name === "AbortError" && !timedOut) return; // the user moved on
      gateRef.current.error = timedOut
        ? "That took too long. Please try again, or try a shorter message."
        : "I couldn't reach the checker. Check your connection and try again.";
    } finally {
      clearTimeout(timer);
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
          setPhase("compose");
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
    setPhase("home");
  };

  const goPaste = () => {
    if (phase === "prompting" || phase === "listening") cancelVoice();
    setPhase("compose");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const reset = () => {
    abortRef.current?.abort();
    recognizer.cancel();
    speaker.cancel();
    setPhase("home");
    setDraft("");
    setSubmitted("");
    setResponse(null);
    setApiError(null);
    setDialogue([]);
    setFollowText("");
    setAnnounce("Ready for another message.");
  };

  const back = () => {
    if (phase === "prompting" || phase === "listening") return cancelVoice();
    if (phase === "compose") return setPhase("home");
    reset();
  };

  const useExample = (text: string) => {
    setDraft(text);
    setPhase("compose");
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
  const leftOnPhone = phase === "home" || phase === "compose" || voiceBusy;
  const voiceNote = recognizer.error && !voiceBusy && phase !== "result" ? VOICE_ERROR_TEXT[recognizer.error] : null;
  const navActive = voiceBusy ? "speak" : phase === "compose" ? "paste" : phase === "home" ? "home" : "none";

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to the message checker
      </a>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      <Nav
        active={navActive}
        onHome={reset}
        onSpeak={support.recognition ? startVoice : undefined}
        onPaste={goPaste}
        sound={support.synthesis ? { muted: speaker.muted, toggle: speaker.toggleMute } : undefined}
      />

      <div className="mx-auto w-full max-w-[480px] px-4 pb-32 pt-5 lg:max-w-[1200px] lg:pb-12 lg:pl-28 lg:pr-8 lg:pt-8">
        {/* brand header: phone home screen, and always on desktop */}
        <header className={`${phase === "home" ? "flex" : "hidden"} items-center gap-3 lg:flex`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue text-white"><ShieldIcon className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-tight tracking-tight">Scam Shield</h1>
            <p className="text-sm text-muted">Simulated Alexa+ experience</p>
          </div>
        </header>

        {/* screen header: phone only, every screen but home */}
        {phase !== "home" && (
          <header className="flex items-center justify-between lg:hidden">
            <button type="button" onClick={back} aria-label="Back" className={circleBtn}><BackIcon /></button>
            <h1 className="text-2xl font-medium tracking-tight">{TITLES[phase]}</h1>
            <span className="h-11 w-11" aria-hidden="true" />
          </header>
        )}

        <main id="main" tabIndex={-1} className="mt-6 outline-none lg:mt-8 lg:grid lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className={`${leftOnPhone ? "" : "hidden"} lg:block`}>
            {voiceBusy ? (
              <ListenPane prompting={phase === "prompting"} prompt={PROMPT} heard={recognizer.heard} onDone={recognizer.stop} onCancel={cancelVoice} />
            ) : (
              <>
                <div className={phase === "home" ? "lg:hidden" : "hidden"}>
                  <HomePane voiceAvailable={support.recognition} voiceChecked={support.ready} onSpeak={startVoice} onPaste={goPaste} onExample={useExample} />
                </div>
                <div className={phase === "compose" ? "" : "hidden lg:block"}>
                  <Composer
                    draft={draft}
                    setDraft={setDraft}
                    channel={channel}
                    setChannel={setChannel}
                    onSubmit={() => void submit(draft)}
                    textareaRef={textareaRef}
                    onSpeak={support.recognition ? startVoice : undefined}
                    voiceNote={voiceNote}
                    error={apiError}
                  />
                </div>
              </>
            )}
          </div>

          <div className={`${phase === "checking" || phase === "result" ? "" : "hidden"} lg:block`}>
            {phase === "checking" ? (
              <ScanList key={submitted} signals={localSignals} reduced={reduced} onRevealed={() => { gateRef.current.revealed = true; tryFinish(); }} />
            ) : phase === "result" && response ? (
              <div className="rise space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {support.synthesis ? (
                    <button type="button" onClick={() => speaker.speak(response.result.spoken_summary, undefined, true)} aria-label="Replay the spoken verdict" className="flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold hover:bg-blue-tint">
                      <ReplayIcon className="h-4 w-4" /> Replay
                    </button>
                  ) : (
                    support.ready && <span className="text-sm text-muted">Spoken replies aren’t available in this browser; the report is below.</span>
                  )}
                  <button type="button" onClick={reset} className="ml-auto min-h-11 rounded-full bg-blue-strong px-5 text-sm font-semibold text-white">Check another</button>
                </div>

                <Report message={submitted} response={response} headingRef={headingRef} />

                <section className="rounded-[24px] bg-card p-5" aria-label="Follow-up questions">
                  <h2 className="text-lg font-semibold">Ask a follow-up</h2>
                  <p className="text-sm text-muted">Answers come from the report above. Nothing new is sent anywhere.</p>

                  {dialogue.length > 0 && (
                    <ol className="mt-4 space-y-3" aria-live="polite">
                      {dialogue.map((d, i) => (
                        <li key={i} className="space-y-2">
                          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-blue-strong px-4 py-2 text-white">{d.q}</p>
                          <p className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-bg px-4 py-2">{d.a}</p>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {FOLLOWUPS.map((q) => (
                      <button key={q} type="button" onClick={() => ask(q)} className="min-h-10 rounded-full bg-blue-tint px-4 text-sm font-medium text-blue-ink hover:bg-blue-tint/70">{q}</button>
                    ))}
                  </div>

                  <form className="mt-4 flex items-center gap-2 rounded-full bg-bg py-1.5 pl-4 pr-1.5" onSubmit={(e) => { e.preventDefault(); ask(followText); }}>
                    <label htmlFor="follow" className="sr-only">Type a follow-up question</label>
                    <input
                      id="follow"
                      value={followText}
                      onChange={(e) => setFollowText(e.target.value)}
                      placeholder={recognizer.listening ? (recognizer.heard || "Listening…") : "Why? What should I do?"}
                      className="min-w-0 flex-1 bg-transparent text-[0.9375rem] placeholder:text-muted focus:outline-none"
                    />
                    {support.recognition && (
                      <button type="button" onClick={askByVoice} aria-label={recognizer.listening ? "Stop listening" : "Ask by voice"} aria-pressed={recognizer.listening} className={`flex h-10 w-10 items-center justify-center rounded-full ${recognizer.listening ? "bg-scam text-white" : "bg-card"}`}>
                        <MicIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button type="submit" disabled={!followText.trim()} aria-label="Ask" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-strong text-white disabled:opacity-40">
                      <SendIcon className="h-5 w-5" />
                    </button>
                  </form>
                  {recognizer.error && <p role="alert" className="mt-2 text-sm text-scam">{VOICE_ERROR_TEXT[recognizer.error]}</p>}
                </section>
              </div>
            ) : (
              <EmptyPane />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
