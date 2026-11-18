"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useLanguage } from "@/components/locale";
import { GoogleSignIn } from "@/components/google-sign-in";
import { changeRequest, type Result } from "./actions";
import home from "@/components/home/home.module.css";
import ask from "@/components/ask/ask.module.css";
import styles from "./request.module.css";

type Data = {
  owner: boolean; status: "open" | "matched" | "cancelled" | "expired" | "completed";
  name: string | null; topic: string; details: string | null; minutes: number | null; place: string; deadline: string;
  course: { name_en: string; name_ko: string } | null; helpers: string[] | null; session: { id: string; scheduled_at: string; place: string } | null;
};
const messages = {
  en: { open: "Open", matched: "Matched", completed: "Completed", cancelled: "Cancelled", expired: "Deadline passed",
    accepted: "Your session is scheduled.", taken: "This request is already taken or closed.", closed: "This request is no longer available.",
    invalid: "Choose a future start time in Korea and enter a meeting place.", error: "Couldn’t load or save this request. Please try again.", login: "Sign in to view this request." },
  ko: { open: "모집 중", matched: "매칭 완료", completed: "완료", cancelled: "취소됨", expired: "마감됨",
    accepted: "세션이 예약됐어요.", taken: "이미 매칭되었거나 마감된 요청이에요.", closed: "더 이상 볼 수 없는 요청이에요.",
    invalid: "한국 시간 기준으로 미래의 시작 시간과 만날 장소를 입력해 주세요.", error: "요청을 불러오거나 저장하지 못했어요. 다시 시도해 주세요.", login: "요청을 보려면 로그인해 주세요." },
};
export function RequestScreen({ id, data, gate }: { id: string; data?: Data; gate?: "closed" | "login" | "error" }) {
  const [language, setLanguage] = useLanguage();
  const [result, action, pending] = useActionState<Result, FormData>(changeRequest.bind(null, id), null);
  const [copied, setCopied] = useState<"yes" | "manual" | null>(null);
  const [scheduled, setScheduled] = useState("");
  const [place, setPlace] = useState(data?.place ?? "");
  const ko = language === "ko";
  const t = messages[language];
  const time = (date: string) => new Intl.DateTimeFormat(ko ? "ko-KR" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
  }).format(new Date(date));
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied("yes"); }
    catch { setCopied("manual"); }
  }
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}>
      <Link className={home.brand} href="/">← HelpLoop</Link>
      <div className={home.language} role="group" aria-label={ko ? "언어" : "Language"}>
        <button lang="en" aria-label="English" aria-pressed={!ko} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={ko} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </header></div>
    <section className={styles.layout}>
      <h1>{data?.topic ?? (ko ? "도움 요청" : "Study request")}</h1>
      {gate && <p role="status">{t[gate]}</p>}
      {gate === "login" && <GoogleSignIn configured language={language} className={home.primary} />}
      {data && <>
        <article className={styles.card}>
          <span className={home.eyebrow}>{t[data.status]}</span>
          <h2>{ko ? data.course?.name_ko : data.course?.name_en}</h2>
          <p>{data.owner ? ko ? "내 요청" : "Your request" : data.name ?? (ko ? "익명의 친구" : "A classmate")}</p>
          {data.details && <p>{data.details}</p>}
          <p>{data.minutes}{ko ? "분" : " min"} · {data.place}</p>
          <p>{ko ? "마감" : "Deadline"} · {time(data.deadline)} KST</p>
        </article>
        {data.session && <section className={styles.card}><h2>{ko ? "세션 일정" : "Session details"}</h2>
          <p>{time(data.session.scheduled_at)} KST · {data.session.place}</p><Link className={home.primary} href={`/s/${data.session.id}`}>{ko ? "세션 보기" : "View session"}</Link></section>}
        {data.status === "open" && data.owner && <section className={styles.card}>
          <h2>{ko ? "추천 도우미" : "Suggested helpers"}</h2>
          {data.helpers?.length ? <ul>{data.helpers.map((name, i) => <li key={i}>{name}</li>)}</ul>
            : <p>{data.helpers === null ? ko ? "추천 목록을 불러오지 못했어요." : "Couldn’t load suggestions." : ko ? "아직 이 주제의 도우미가 없어요." : "No helpers offer this topic yet."}</p>}
          <button className={styles.secondary} onClick={copyLink}>{ko ? "요청 링크 복사" : "Copy request link"}</button>
          {copied === "yes" && <p role="status">{ko ? "복사했어요." : "Link copied."}</p>}
          {copied === "manual" && <input aria-label={ko ? "요청 링크" : "Request link"} readOnly value={window.location.href} onFocus={e => e.target.select()} />}
        </section>}
        {data.status === "open" && result !== "taken" && result !== "expired" && <form action={action}>
          <input type="hidden" name="intent" value={data.owner ? "cancel" : "accept"} />
          {data.owner ? <button disabled={pending} className={styles.secondary}>{ko ? "요청 취소" : "Cancel request"}</button>
            : <fieldset disabled={pending} className={ask.controls}>
              <label htmlFor="scheduled">{ko ? "시작 시간 (한국 시간)" : "Start time (KST)"}</label>
              <input id="scheduled" type="datetime-local" name="scheduled" value={scheduled} onChange={e => setScheduled(e.target.value)} required />
              <label htmlFor="place">{ko ? "만날 장소" : "Meeting place"}</label>
              <input id="place" name="place" maxLength={60} required value={place} onChange={e => setPlace(e.target.value)} />
              <button className={home.primary}>{ko ? "도와줄게요" : "I’ll help"}</button>
            </fieldset>}
        </form>}
      </>}
      {result && <p role="status">{t[result]}</p>}
    </section>
  </main>;
}
