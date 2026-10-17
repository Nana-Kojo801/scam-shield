type P = { className?: string };

function svg(paths: React.ReactNode, className?: string, fill = false) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-6 w-6"}
    >
      {paths}
    </svg>
  );
}

export const HomeIcon = ({ className }: P) => svg(<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />, className);
export const MicIcon = ({ className }: P) =>
  svg(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>, className);
export const PencilIcon = ({ className }: P) => svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>, className);
export const SpeakerIcon = ({ className }: P) =>
  svg(<><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></>, className);
export const SpeakerOffIcon = ({ className }: P) => svg(<><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></>, className);
export const BackIcon = ({ className }: P) => svg(<path d="M15 5l-7 7 7 7" />, className);
export const CheckIcon = ({ className }: P) => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, className);
export const XIcon = ({ className }: P) => svg(<path d="M6 6l12 12M18 6L6 18" />, className);
export const ReplayIcon = ({ className }: P) => svg(<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />, className);
export const SendIcon = ({ className }: P) => svg(<path d="M12 19V5M6 11l6-6 6 6" />, className);
export const BulbIcon = ({ className }: P) =>
  svg(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />, className);
export const ShieldIcon = ({ className }: P) =>
  svg(<><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>, className);
export const BoxIcon = ({ className }: P) => svg(<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9" />, className);
export const ChatIcon = ({ className }: P) => svg(<path d="M4 5h16v11H9l-5 4z" />, className);
export const LockIcon = ({ className }: P) => svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, className);
export const ClipboardIcon = ({ className }: P) =>
  svg(<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4.5h6v3H9z" /></>, className);
export const DotIcon = ({ className }: P) => svg(<circle cx="12" cy="12" r="3" />, className, true);
