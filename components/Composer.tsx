"use client";

import type { RefObject } from "react";
import { MAX_MESSAGE_CHARS } from "@/lib/types";
import { BoxIcon, ChatIcon, ClipboardIcon, LockIcon, MicIcon, SendIcon } from "./Icons";
import { CHANNELS, SAMPLES } from "./samples";

const sampleIcon = { parcel: BoxIcon, "wrong-number": ChatIcon, code: LockIcon } as const;

type Props = {
  draft: string;
  setDraft: (v: string) => void;
  channel: string;
  setChannel: (v: string) => void;
  onSubmit: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** desktop shows the voice tile above the composer */
  onSpeak?: () => void;
  voiceNote?: string | null;
  error?: string | null;
};

export function Composer({ draft, setDraft, channel, setChannel, onSubmit, textareaRef, onSpeak, voiceNote, error }: Props) {
  const overLimit = draft.length > MAX_MESSAGE_CHARS;

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDraft(text);
    } catch {
      textareaRef.current?.focus(); // clipboard blocked: let them paste by hand
    }
  };

  return (
    <div className="rise space-y-5">
      {onSpeak && (
        <button
          type="button"
          onClick={onSpeak}
          className="dots relative hidden w-full items-center gap-4 overflow-hidden rounded-[24px] bg-blue p-5 text-left text-white lg:flex"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-blue-strong">
            <MicIcon className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-xl font-semibold">Speak it</span>
            <span className="block text-white/90">“Alexa, ask Scam Shield to check a message.”</span>
          </span>
        </button>
      )}

      {voiceNote && (
        <div role="alert" className="rounded-2xl bg-scam-tint px-4 py-3 text-scam">{voiceNote}</div>
      )}
      {error && <div role="alert" className="rounded-2xl bg-scam-tint px-4 py-3 text-scam">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!overLimit && draft.trim()) onSubmit();
        }}
      >
        <label htmlFor="message" className="sr-only">Message to check</label>
        <div className="rounded-[24px] bg-card p-4">
          <textarea
            id="message"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            className="w-full resize-none bg-transparent text-[1.0625rem] leading-relaxed placeholder:text-muted/80 focus:outline-none"
            placeholder="Paste the text, email or call transcript…"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Treated as data, never as instructions.</span>
            <span style={{ color: overLimit ? "var(--scam)" : undefined }}>{draft.length}/{MAX_MESSAGE_CHARS}</span>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-muted">How did it reach you? (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={channel === c.value}
                onClick={() => setChannel(channel === c.value ? "" : c.value)}
                className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${channel === c.value ? "bg-blue-strong text-white" : "bg-card text-ink hover:bg-blue-tint"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!draft.trim() || overLimit}
          className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-blue-strong px-6 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check message <SendIcon className="h-5 w-5" />
        </button>
      </form>

      <section aria-label="Examples">
        <h2 className="mb-3 text-lg font-semibold">Try an example</h2>
        <div className="grid grid-cols-2 gap-3">
          {SAMPLES.map((s) => {
            const Icon = sampleIcon[s.key];
            return (
              <button key={s.key} type="button" onClick={() => setDraft(s.text)} className="rounded-[20px] p-4 text-left transition-transform hover:-translate-y-0.5" style={{ background: s.tint }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-strong"><Icon className="h-5 w-5" /></span>
                <span className="mt-6 block font-semibold">{s.label}</span>
                <span className="block text-sm text-ink/70">{s.hint}</span>
              </button>
            );
          })}
          <button type="button" onClick={pasteFromClipboard} className="rounded-[20px] bg-card p-4 text-left transition-transform hover:-translate-y-0.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-tint text-blue-strong"><ClipboardIcon className="h-5 w-5" /></span>
            <span className="mt-6 block font-semibold">Paste</span>
            <span className="block text-sm text-ink/70">From your clipboard</span>
          </button>
        </div>
      </section>
    </div>
  );
}
