"use client";

import { useEffect, useState } from "react";

export function useWallet(signedIn: boolean, open: boolean) {
  const [summary, setSummary] = useState<{ balance: number; weekTickets: number } | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    const abort = new AbortController();
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/wallet", { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error("Wallet unavailable");
        const value = await response.json();
        if (!abort.signal.aborted) setSummary(value);
      } catch { if (!abort.signal.aborted) setSummary(null); }
    }
    void refresh();
    const timer = open ? window.setInterval(refresh, 15000) : undefined;
    document.addEventListener("visibilitychange", refresh);
    return () => { abort.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [signedIn, open]);
  return signedIn ? summary : null;
}
