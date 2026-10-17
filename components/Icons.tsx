type P = { className?: string };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square", strokeLinejoin: "miter", "aria-hidden": true } as const;

export const MicIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="9" y="3" width="6" height="11" />
    <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" />
  </svg>
);
export const SpeakerIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
  </svg>
);
export const SpeakerOffIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </svg>
);
export const ReplayIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />
  </svg>
);
export const StopIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);
