import { GoogleSignIn } from "@/components/google-sign-in";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { auth_error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-7 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-teal-800">KAIST · STUDY TOGETHER</p>
        <h1 className="text-4xl font-bold tracking-tight">공부품앗이<span lang="en" className="mt-2 block text-lg font-normal text-stone-600">Gongbu Pumasi</span></h1>
        <p>서로 돕고, 함께 배우고, 새로운 친구를 만나요.<span lang="en" className="mt-2 block text-sm text-stone-600">Help one, get helped by one, and meet someone new each time.</span></p>
      </header>
      <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm">답을 대신 쓰지 않고, 이해를 도와요.<span lang="en" className="mt-1 block text-stone-600">Explain, don’t do graded work for someone else.</span></p>
      {auth_error && <p role="alert" className="text-sm text-red-800">로그인을 완료하지 못했어요. 다시 시도해 주세요.<span lang="en" className="block">We couldn’t complete sign-in. Please try again.</span></p>}
      <GoogleSignIn configured={Boolean(getSupabaseEnv())} />
    </main>
  );
}
