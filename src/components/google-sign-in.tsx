"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignIn({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
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
        className="w-full rounded-xl bg-teal-800 px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "연결 중…" : "Google로 시작하기"}
        <span lang="en" className="block text-sm">{pending ? "Connecting…" : "Sign in with Google"}</span>
      </button>
      {!configured && <p className="text-sm text-stone-600">로그인을 준비 중이에요.<span lang="en" className="block">Sign-in will be available soon.</span></p>}
      {failed && <p role="alert" className="text-sm text-red-800">로그인에 실패했어요. 다시 시도해 주세요.<span lang="en" className="block">Sign-in failed. Please try again.</span></p>}
    </div>
  );
}
