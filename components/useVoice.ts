"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getRecognitionCtor, mapVoiceError, synthesisSupported, type RecognitionLike, type VoiceError } from "@/lib/speech";

const noopSubscribe = () => () => {};

/** Support flags are read on the client only; the server snapshot says "not ready" so markup matches. */
export function useSupport() {
  const bits = useSyncExternalStore(
    noopSubscribe,
    () => (getRecognitionCtor() ? 1 : 0) | (synthesisSupported() ? 2 : 0),
    () => -1,
  );
  return { ready: bits >= 0, recognition: bits >= 0 && (bits & 1) === 1, synthesis: bits >= 0 && (bits & 2) === 2 };
}

type ListenOptions = {
  /** keep listening across pauses (dictating a whole message) */
  continuous: boolean;
  /** stop automatically this long after the last words */
  silenceMs: number;
  /** called once with the final text when listening ends with something said */
  onDone: (text: string) => void;
  /** called when recognition fails (denied, no mic, network...) */
  onError?: (error: VoiceError) => void;
};

export function useRecognizer() {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);

  const recRef = useRef<RecognitionLike | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptingRef = useRef(true);
  const doneRef = useRef<ListenOptions["onDone"] | null>(null);
  const errorRef = useRef<VoiceError | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const start = useCallback((opts: ListenOptions, { gated = false } = {}) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    clearTimer();

    const rec = new Ctor();
    rec.continuous = opts.continuous;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

    finalRef.current = "";
    interimRef.current = "";
    errorRef.current = null;
    acceptingRef.current = !gated;
    doneRef.current = opts.onDone;
    setError(null);
    setHeard("");

    rec.onresult = (e) => {
      if (!acceptingRef.current) return; // ignore the assistant's own voice while it is still speaking
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += (finalRef.current ? " " : "") + r[0].transcript.trim();
        else interimText += r[0].transcript;
      }
      interimRef.current = interimText;
      setHeard(`${finalRef.current} ${interimText}`.trim());
      clearTimer();
      timerRef.current = setTimeout(() => rec.stop(), opts.silenceMs);
    };
    rec.onerror = (e) => {
      errorRef.current = mapVoiceError(e.error);
      if (e.error !== "aborted") {
        setError(errorRef.current);
        opts.onError?.(errorRef.current);
      }
    };
    rec.onend = () => {
      clearTimer();
      setListening(false);
      const text = `${finalRef.current} ${interimRef.current}`.trim();
      const cb = doneRef.current;
      doneRef.current = null;
      setHeard("");
      if (cb && text && !errorRef.current) cb(text);
      else if (cb && !text && !errorRef.current) setError("no-speech");
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("other");
    }
  }, []);

  /** Start accepting speech after a gated start (the assistant has finished its prompt). */
  const open = useCallback(() => {
    acceptingRef.current = true;
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);
  const cancel = useCallback(() => {
    doneRef.current = null;
    clearTimer();
    recRef.current?.abort();
    setListening(false);
    setHeard("");
  }, []);

  useEffect(() => () => {
    doneRef.current = null;
    recRef.current?.abort();
    clearTimer();
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { listening, heard, error, start, open, stop, cancel, clearError };
}

export function useSpeaker(supported: boolean) {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const tokenRef = useRef(0);

  const cancel = useCallback(() => {
    tokenRef.current++;
    if (synthesisSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void, force = false) => {
      cancel();
      if (!supported || (muted && !force)) {
        onEnd?.();
        return;
      }
      const token = tokenRef.current;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
      u.rate = 1;
      const finish = () => {
        if (tokenRef.current !== token) return;
        setSpeaking(false);
        onEnd?.();
      };
      u.onend = finish;
      u.onerror = finish;
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [cancel, muted, supported],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) cancel();
      return !m;
    });
  }, [cancel]);

  useEffect(() => () => {
    if (synthesisSupported()) window.speechSynthesis.cancel();
  }, []);

  return { muted, speaking, speak, cancel, toggleMute };
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
