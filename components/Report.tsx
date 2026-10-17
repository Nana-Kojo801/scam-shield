"use client";

import { useState, type Ref } from "react";
import type { CheckResponse, Signal } from "@/lib/types";
import { AnnotatedMessage } from "./AnnotatedMessage";
import { BulbIcon, CheckIcon, ShieldIcon } from "./Icons";
import { VerdictHero } from "./VerdictHero";
import { caseNumber, VERDICT_META } from "./verdict";

function Card({ title, children, tint, className = "" }: { title: string; children: React.ReactNode; tint?: string; className?: string }) {
  return (
    <section className={`rounded-[24px] p-5 ${className}`} style={{ background: tint ?? "var(--card)" }}>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Weight({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`Weight ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="block h-2 w-3.5 rounded-full" style={{ background: i <= n ? "var(--blue-strong)" : "var(--line)" }} />
      ))}
    </span>
  );
}

function SignalRow({ s }: { s: Signal }) {
  return (
    <li className="border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{s.label}</span>
        <Weight n={s.weight} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {s.evidence.map((e) => (
          <span key={e} className="break-all rounded-full bg-bg px-2.5 py-0.5 font-mono text-xs">“{e}”</span>
        ))}
      </div>
    </li>
  );
}

export function Report({ message, response, headingRef }: { message: string; response: CheckResponse; headingRef: Ref<HTMLHeadingElement> }) {
  const { result, signals, ai_unavailable } = response;
  const meta = VERDICT_META[result.verdict];
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <article className="space-y-4" aria-label="Inspection report">
      <header className="flex items-end justify-between gap-4 px-1">
        <h2 ref={headingRef} tabIndex={-1} className="sr-only text-2xl font-semibold tracking-tight outline-offset-4 lg:not-sr-only">
          Report
        </h2>
        <span className="ml-auto text-sm text-muted">File No. {caseNumber(message)}</span>
      </header>

      {ai_unavailable && (
        <div role="status" className="rounded-2xl bg-card px-4 py-3 text-sm ring-2 ring-dashed ring-line">
          <strong className="font-semibold">AI check unavailable, showing pattern checks only.</strong> This is a rougher read
          than usual.
        </div>
      )}

      <VerdictHero verdict={result.verdict} confidence={result.confidence} scamType={result.scam_type} summary={result.spoken_summary} />

      <AnnotatedMessage key={message + result.verdict} message={message} flags={result.red_flags} color={meta.color} tint={meta.tint} />

      <Card title="What to do now" tint="var(--blue-tint)">
        <ul className="space-y-3">
          {result.what_to_do.map((step, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="peer sr-only" checked={done.has(i)} onChange={() => toggle(i)} />
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-ink/70 bg-white text-white peer-checked:border-blue-strong peer-checked:bg-blue-strong peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-strong">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className={done.has(i) ? "text-muted line-through" : ""}>{step}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
          <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-strong" />
          <p>
            <span className="block text-sm font-semibold text-muted">Verify it yourself</span>
            {result.verify_via}
          </p>
        </div>
      </Card>

      <Card title={`Signals found (${signals.length})`}>
        {signals.length ? (
          <ul>{signals.map((s) => <SignalRow key={s.id} s={s} />)}</ul>
        ) : (
          <p className="text-muted">The pattern checks found nothing. That does not make a message safe.</p>
        )}
      </Card>

      <Card title="In its favour" tint="var(--green-tint)">
        {result.reassuring_signs.length ? (
          <ul className="space-y-2">
            {result.reassuring_signs.map((r, i) => (
              <li key={i} className="flex gap-2">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-legit" />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink/70">Nothing in this message looked reassuring.</p>
        )}
      </Card>

      <section className="flex gap-3 rounded-[24px] bg-card p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-tint text-blue-strong">
          <BulbIcon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">Good to know</h3>
          <p className="mt-1 text-ink/80">{result.teach_tip}</p>
        </div>
      </section>

      <p className="px-1 text-sm text-muted">Scam Shield can’t know who sent this. It helps you spot patterns.</p>
    </article>
  );
}
