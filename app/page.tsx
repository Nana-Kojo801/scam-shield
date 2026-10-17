"use client";

import { useState } from "react";

// Phase 1 harness: proves the pipeline end to end. Replaced by the real UI in Phase 2.
export default function Home() {
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setOutput("");
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      setOutput(JSON.stringify(await res.json(), null, 2));
    } catch {
      setOutput("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 font-mono text-sm">
      <h1 className="mb-4 text-xl font-bold">Scam Shield: pipeline check</h1>
      <textarea
        aria-label="Message to check"
        className="h-40 w-full border border-black p-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        onClick={run}
        disabled={busy || !message.trim()}
        className="mt-2 border border-black px-4 py-2 disabled:opacity-40"
      >
        {busy ? "Checking..." : "Check"}
      </button>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap">{output}</pre>
    </main>
  );
}
