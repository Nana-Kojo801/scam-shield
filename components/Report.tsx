import type { Ref } from "react";
import type { CheckResponse, Signal } from "@/lib/types";
import { AnnotatedMessage } from "./AnnotatedMessage";
import { Stamp } from "./Stamp";
import { caseNumber, VERDICT_META } from "./verdict";

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-t-2 border-ink pt-3 ${className}`}>
      <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}

function Weight({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Weight ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="block h-2.5 w-2.5 border border-ink" style={{ background: i <= n ? "var(--ink)" : "transparent" }} />
      ))}
    </span>
  );
}

function SignalRow({ s }: { s: Signal }) {
  return (
    <li className="border-b border-rule py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-medium">{s.label}</span>
        <Weight n={s.weight} />
      </div>
      <div className="mt-1 break-words font-mono text-xs text-ink-soft">{s.evidence.map((e) => `“${e}”`).join("  ")}</div>
    </li>
  );
}

export function Report({ message, response, headingRef }: { message: string; response: CheckResponse; headingRef: Ref<HTMLHeadingElement> }) {
  const { result, signals, ai_unavailable } = response;
  const meta = VERDICT_META[result.verdict];

  return (
    <article className="space-y-6" aria-label="Inspection report">
      <header className="flex items-end justify-between gap-4 border-b-2 border-ink pb-2">
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold outline-offset-4">
          Inspection report
        </h2>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">File No. {caseNumber(message)}</span>
      </header>

      {ai_unavailable && (
        <div role="status" className="border-2 border-dashed border-ink px-3 py-2 text-sm">
          <strong className="font-semibold">AI check unavailable, showing pattern checks only.</strong> This is a rougher read
          than usual.
        </div>
      )}

      <div className="py-2">
        <Stamp verdict={result.verdict} confidence={result.confidence} />
        {result.scam_type && (
          <p className="mt-4 font-mono text-sm">
            <span className="uppercase tracking-[0.18em] text-ink-soft">Pattern: </span>
            {result.scam_type}
          </p>
        )}
        <p className="mt-3 max-w-prose text-lg leading-snug">{result.spoken_summary}</p>
      </div>

      <AnnotatedMessage key={message + result.verdict} message={message} flags={result.red_flags} color={meta.color} />

      <Section title={`Signals found (${signals.length})`}>
        {signals.length ? (
          <ul>{signals.map((s) => <SignalRow key={s.id} s={s} />)}</ul>
        ) : (
          <p className="text-ink-soft">The pattern checks found nothing. That does not make a message safe.</p>
        )}
      </Section>

      <Section title="In its favour">
        {result.reassuring_signs.length ? (
          <ul className="list-none space-y-1">
            {result.reassuring_signs.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2.5 block h-0.5 w-3 shrink-0 bg-legit" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">Nothing in this message looked reassuring.</p>
        )}
      </Section>

      <Section title="What to do now">
        <ol className="space-y-2">
          {result.what_to_do.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-sm font-semibold" style={{ color: meta.color }}>{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-l-4 border-ink pl-3">
          <span className="block font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Verify it yourself</span>
          {result.verify_via}
        </p>
      </Section>

      <Section title="Field note">
        <p className="font-display text-xl italic leading-snug">{result.teach_tip}</p>
      </Section>

      <p className="border-t border-rule pt-3 text-sm text-ink-soft">
        Scam Shield can’t know who sent this. It helps you spot patterns.
      </p>
    </article>
  );
}
