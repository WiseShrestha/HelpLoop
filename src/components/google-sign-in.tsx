"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Language } from "@/components/locale";

export function GoogleSignIn({ configured, language = "en", label, className }: {
  configured: boolean; language?: Language; label?: string; className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
    } catch {
      setFailed(true);
      setPending(false);
    }
  }
  return (
    <div className="space-y-3">
      <button type="button" onClick={signIn} disabled={!configured || pending}
        className={className ?? "w-full rounded-xl bg-teal-800 px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-60"}>
        {pending ? (language === "ko" ? "연결 중…" : "Connecting…") : label ?? (language === "ko" ? "Google로 시작하기" : "Continue with Google")}
      </button>
      {!configured && <p className="text-sm text-stone-600">{language === "ko" ? "로그인을 준비 중이에요." : "Sign-in will be available soon."}</p>}
      {failed && <p role="alert" className="text-sm text-red-800">{language === "ko" ? "로그인에 실패했어요. 다시 시도해 주세요." : "Sign-in failed. Please try again."}</p>}
    </div>
  );
}
