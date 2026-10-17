import { HomeIcon, MicIcon, PencilIcon, SpeakerIcon, SpeakerOffIcon } from "./Icons";

type Props = {
  active: "home" | "speak" | "paste" | "none";
  onHome: () => void;
  onSpeak?: () => void;
  onPaste: () => void;
  sound?: { muted: boolean; toggle: () => void };
};

const base = "flex h-12 w-12 items-center justify-center rounded-full transition-colors";
const idle = "bg-white text-ink hover:bg-blue-tint";
const on = "bg-blue text-white";

/** Floating dark pill: along the bottom on a phone, down the left edge on a desktop. */
export function Nav({ active, onHome, onSpeak, onPaste, sound }: Props) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-auto lg:left-8 lg:top-1/2 lg:-translate-y-1/2 lg:pb-0"
    >
      <ul className="flex gap-2 rounded-full bg-nav p-2 shadow-[0_12px_32px_rgb(14_22_37/0.3)] lg:flex-col">
        <li>
          <button type="button" onClick={onHome} aria-label="Home, start a new check" aria-current={active === "home" ? "page" : undefined} className={`${base} ${active === "home" ? on : idle}`}>
            <HomeIcon />
          </button>
        </li>
        {onSpeak && (
          <li>
            <button type="button" onClick={onSpeak} aria-label="Speak the message" className={`${base} ${active === "speak" ? on : idle}`}>
              <MicIcon />
            </button>
          </li>
        )}
        <li>
          <button type="button" onClick={onPaste} aria-label="Paste or type a message" className={`${base} ${active === "paste" ? on : idle}`}>
            <PencilIcon />
          </button>
        </li>
        {sound && (
          <li>
            <button type="button" onClick={sound.toggle} aria-label={sound.muted ? "Unmute spoken replies" : "Mute spoken replies"} aria-pressed={sound.muted} className={`${base} ${idle}`}>
              {sound.muted ? <SpeakerOffIcon /> : <SpeakerIcon />}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
