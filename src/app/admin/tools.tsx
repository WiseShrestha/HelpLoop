"use client";

import { useState } from "react";

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Makes a seed and its sha256 in this browser. The seed is never sent to the server here. */
export function SeedHelper({ hashInput }: { hashInput: string }) {
  const [seed, setSeed] = useState("");
  async function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const next = `helploop-${btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "")}`;
    const hash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(next)));
    const input = document.getElementById(hashInput) as HTMLInputElement | null;
    if (input) input.value = hash;
    setSeed(next);
  }
  return <div>
    <button type="button" onClick={generate}>Generate a seed and hash</button>
    {seed && <p role="status"><strong>Save this seed offline now:</strong> <code>{seed}</code><br />
      It is not stored anywhere. You need it to run the draw; without it nobody can.</p>}
  </div>;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { setDone(false); }
  }}>{done ? "Copied" : label}</button>;
}
