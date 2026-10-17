import { MicIcon, PencilIcon } from "./Icons";
import { SAMPLES } from "./samples";

type Props = {
  voiceAvailable: boolean;
  voiceChecked: boolean;
  onSpeak: () => void;
  onPaste: () => void;
  onExample: (text: string) => void;
};

/** Phone home screen: a pill that starts voice, two big tiles, and examples to try. */
export function HomePane({ voiceAvailable, voiceChecked, onSpeak, onPaste, onExample }: Props) {
  return (
    <div className="rise space-y-6">
      <button
        type="button"
        onClick={voiceAvailable ? onSpeak : onPaste}
        className="flex w-full items-center gap-3 rounded-full bg-card py-2 pl-5 pr-2 text-left"
        aria-label={voiceAvailable ? "Speak the message" : "Type the message"}
      >
        <span className="flex-1 text-[0.9375rem] text-muted">“Alexa, ask Scam Shield to check a message.”</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-tint text-blue-strong">
          <MicIcon className="h-5 w-5" />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onPaste} className="dots relative flex min-h-44 flex-col justify-between overflow-hidden rounded-[24px] bg-card p-4 text-left">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg text-ink"><PencilIcon /></span>
          <span>
            <span className="block text-lg font-semibold">Paste it</span>
            <span className="block text-sm text-muted">Type or paste the message</span>
          </span>
        </button>
        {voiceAvailable ? (
          <button type="button" onClick={onSpeak} className="tilt dots relative flex min-h-44 flex-col justify-between overflow-hidden rounded-[24px] bg-blue p-4 text-left text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/90 text-blue-strong"><MicIcon /></span>
            <span>
              <span className="block text-lg font-semibold">Speak it</span>
              <span className="block text-sm text-white/90">Read it out loud</span>
            </span>
          </button>
        ) : (
          <div className="flex min-h-44 flex-col justify-between rounded-[24px] bg-card/60 p-4 text-muted">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg"><MicIcon /></span>
            <span>
              <span className="block text-lg font-semibold">Voice</span>
              <span className="block text-sm">{voiceChecked ? "Not available in this browser" : "Checking…"}</span>
            </span>
          </div>
        )}
      </div>

      <section aria-label="Examples">
        <h2 className="mb-3 text-xl font-semibold">Try an example</h2>
        <ul className="space-y-3">
          {SAMPLES.map((s) => (
            <li key={s.key}>
              <button type="button" onClick={() => onExample(s.text)} className="w-full rounded-[22px] p-4 text-left" style={{ background: s.tint }}>
                <span className="block text-lg font-semibold">{s.label}</span>
                <span className="mt-1 line-clamp-2 block text-[0.9375rem] text-ink/75">{s.text}</span>
                <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
