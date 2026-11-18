"use client";

import { useState } from "react";
import type { Language } from "@/components/locale";
import { createClient } from "@/lib/supabase/client";

const labels = {
  en: { idle: "Sign out", pending: "Signing out…", error: "Couldn’t sign out. Please try again." },
  ko: { idle: "로그아웃", pending: "로그아웃 중…", error: "로그아웃하지 못했어요. 다시 시도해 주세요." },
};

export function SignOut({ language, className }: { language: Language; className?: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = labels[language];

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return <div>
    <button type="button" className={className} disabled={pending} onClick={signOut}>{pending ? t.pending : t.idle}</button>
    {failed && <p role="alert">{t.error}</p>}
  </div>;
}
