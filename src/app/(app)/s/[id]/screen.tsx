"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/locale";
import { updateSession } from "./actions";
import home from "@/components/home/home.module.css";
import styles from "../../r/[id]/request.module.css";
import ask from "@/components/ask/ask.module.css";

const copy = {
  en: { title: "Study session", scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", disputed: "Disputed", helper: "Helper", asker: "Asker",
    balance: "Your help credits", confirmed: "Confirmed", waiting: "Awaiting confirmation", covered: "What did you cover?", rating: "Session rating (1–5)", confirm: "Confirm session",
    cancel: "Cancel session", report: "Report a problem", reason: "What happened?", send: "Send report", retry: "Update tickets", available: "Confirmations open",
    saved: "Saved.", early: "You can confirm after the session ends.", invalid: "Please check your entry.", closed: "This action is no longer available.", error: "Couldn’t save. Please try again.",
    reported: "Your report was sent for review.", tickets: "The session is complete. Retry the ticket update.", earned: "Session tickets", loop: (names: string) => `You closed a loop with ${names}! +1 ticket` },
  ko: { title: "공부 세션", scheduled: "예약됨", completed: "완료", cancelled: "취소됨", disputed: "검토 중", helper: "도우미", asker: "요청자",
    balance: "내 도움 크레딧", confirmed: "확인 완료", waiting: "확인 대기", covered: "무엇을 공부했나요?", rating: "세션 평점 (1–5)", confirm: "세션 확인",
    cancel: "세션 취소", report: "문제 신고", reason: "어떤 일이 있었나요?", send: "신고 보내기", retry: "티켓 갱신", available: "확인 가능 시간",
    saved: "저장했어요.", early: "세션이 끝난 후 확인할 수 있어요.", invalid: "입력 내용을 확인해 주세요.", closed: "더 이상 사용할 수 없어요.", error: "저장하지 못했어요. 다시 시도해 주세요.",
    reported: "신고가 접수됐어요.", tickets: "세션이 완료됐어요. 티켓 갱신을 다시 시도해 주세요.", earned: "세션 티켓", loop: (names: string) => `${names}와(과) 도움의 고리를 완성했어요! 티켓 +1` },
};

type Session = { id: string; status: "scheduled" | "completed" | "cancelled" | "disputed"; helper: string; asker: string;
  isHelper: boolean; helperConfirmed: boolean; askerConfirmed: boolean; time: string; ends: number; place: string;
  minutes: number; covered: string | null; rating: number | null; balance: number; tickets: number | null;
  loops?: string[][] }; // other members of loops this session closed for me

export function SessionScreen({ session: s }: { session: Session }) {
  const [language, setLanguage] = useLanguage();
  const [feedback, action, pending] = useActionState(updateSession.bind(null, s.id), null);
  const router = useRouter();
  const t = copy[language];
  const date = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
  useEffect(() => {
    const db = createClient();
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const channel = db.channel("session-" + s.id).on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "sessions", filter: "id=eq." + s.id,
    }, refresh).subscribe();
    // Refresh on return and recover from missed events or an award written just after completion.
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); void db.removeChannel(channel); };
  }, [router, s.id]);
  const done = s.isHelper ? s.helperConfirmed : s.askerConfirmed;
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link className={home.brand} href="/">← HelpLoop</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <section className={styles.layout}><h1>{t.title}</h1>
      <article className={styles.card}><span className={home.eyebrow}>{t[s.status]}</span>
        <h2>{date.format(new Date(s.time))} KST</h2><p>{s.place} · {s.minutes}{language === "ko" ? "분" : " min"}</p>
        <p>{t.helper} · {s.helper} · {s.helperConfirmed ? t.confirmed : t.waiting}</p>
        <p>{t.asker} · {s.asker} · {s.askerConfirmed ? t.confirmed : t.waiting}</p>
        {s.covered && <p>{s.covered}</p>}{s.rating !== null && <p>{t.rating} · {s.rating}</p>}
        <p>{t.balance} · {s.balance}</p>{s.tickets !== null && <p>{t.earned} · {s.tickets}</p>}
      </article>
      {s.loops?.map((names, i) => <p key={i} role="status" className="rounded-xl bg-[#c8efdc] p-4 font-bold">🔁 {t.loop(names.join(language === "ko" ? ", " : " and "))}</p>)}
      {s.status === "scheduled" && <>
        {!done && <form action={action}><fieldset className={ask.controls} disabled={pending}>
          <p>{t.available} · {date.format(s.ends)} KST</p>
          {s.isHelper ? <label>{t.covered}<textarea name="covered" required maxLength={1000} className="block w-full border rounded p-2" /></label>
            : <label>{t.rating}<select name="rating" required defaultValue="" className="block border rounded p-2"><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>}
          <button name="intent" value="confirm" className={home.primary}>{t.confirm}</button>
        </fieldset></form>}
        <form action={action}><button disabled={pending} className={styles.secondary} name="intent" value="cancel">{t.cancel}</button></form>
      </>}
      {s.status === "completed" && ((s.isHelper && s.tickets === null) || feedback === "tickets") && <form action={action}>
        <button disabled={pending} className={styles.secondary} name="intent" value="retry">{t.retry}</button></form>}
      <details className={styles.card}><summary>{t.report}</summary><form action={action}><label>{t.reason}
        <textarea className="block w-full border rounded p-2" required maxLength={1000} name="reason" /></label>
        <button disabled={pending} name="intent" value="report" className={styles.secondary}>{t.send}</button></form></details>
      {feedback && <p role="status">{t[feedback]}</p>}
    </section></main>;
}
