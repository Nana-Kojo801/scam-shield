"use client";

import { useEffect, useState } from "react";
import { CheckIcon, MicIcon, XIcon } from "./Icons";

const BARS = 41;
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const centre = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2);
  return Math.round(14 + 86 * Math.abs(Math.sin(i * 0.9)) * (0.25 + 0.75 * centre));
});

/** Decorative: it shows that the mic is open, it does not measure the voice. */
function Waveform({ on }: { on: boolean }) {
  return (
    <div className={`flex h-36 items-center justify-center gap-[5px] ${on ? "wave-on" : ""}`} aria-hidden="true">
      {HEIGHTS.map((h, i) => (
        <span key={i} className="wave-bar" style={{ "--h": `${h}%`, "--d": `${(i * 83) % 900}ms` } as React.CSSProperties} />
      ))}
    </div>
  );
}

function Timer({ running }: { running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-lg font-medium tabular-nums" aria-label={`${seconds} seconds`}>
      {p(Math.floor(seconds / 3600))}:{p(Math.floor(seconds / 60) % 60)}:{p(seconds % 60)}
    </span>
  );
}

type Props = {
  prompting: boolean;
  prompt: string;
  heard: string;
  onDone: () => void;
  onCancel: () => void;
};

export function ListenPane({ prompting, prompt, heard, onDone, onCancel }: Props) {
  const listening = !prompting;
  return (
    <section aria-label="Listening" className="rise flex min-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-[28px] bg-bg lg:min-h-[640px] lg:bg-card">
      <div className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm lg:bg-bg">
        <span className="font-semibold text-blue-ink">Scam Shield</span>
        <span>{prompt}</span>
      </div>

      <div className="fade-top flex min-h-40 flex-1 flex-col justify-end px-6 pb-4 pt-6 text-center">
        <p className="whitespace-pre-wrap break-words text-[1.375rem] leading-snug text-ink" aria-live="off">
          {heard || <span className="text-muted">{listening ? "Go ahead, I’m listening…" : ""}</span>}
        </p>
      </div>

      <Waveform on={listening} />

      <div className="mt-6 rounded-t-[50%_36px] bg-card px-6 pb-8 pt-10 lg:rounded-none lg:bg-transparent">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onDone} disabled={!heard} aria-label="Done, check the message" className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-tint text-blue-strong transition-opacity disabled:opacity-40">
            <CheckIcon />
          </button>
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {listening && <span className="pulse-ring absolute inset-0 rounded-full bg-blue/40" aria-hidden="true" />}
              <span className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full bg-blue text-white ring-[10px] ring-blue-tint" aria-hidden="true">
                <MicIcon className="h-8 w-8" />
              </span>
            </div>
            <Timer running={listening} />
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel listening" className="flex h-14 w-14 items-center justify-center rounded-full bg-scam-tint text-scam">
            <XIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
