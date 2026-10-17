import { ShieldIcon } from "./Icons";

const STEPS = [
  ["Say or paste it", "Read the message aloud or paste the text. Add how it reached you if you know."],
  ["Pattern checks, then a second opinion", "Eleven fixed checks run first. An AI model then reads the whole message with those findings."],
  ["A report you can act on", "A verdict, the red flags marked in your own text, and safe next steps."],
];

/** Desktop right-hand panel before there is a report. */
export function EmptyPane() {
  return (
    <section aria-label="How it works" className="dots rounded-[28px] bg-card p-8">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-tint text-blue-strong"><ShieldIcon className="h-7 w-7" /></span>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight">Your report will appear here</h2>
      <p className="mt-2 max-w-md text-muted">Check a message on the left and the verdict, red flags and next steps show up beside it.</p>
      <ol className="mt-8 space-y-5">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg font-semibold">{i + 1}</span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-2xl bg-bg px-4 py-3 text-sm text-muted">
        Messages are not stored. Links inside a message are never opened. Scam Shield can’t know who sent a message; it helps you spot patterns.
      </p>
    </section>
  );
}
