"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/locale";
import type { HelpRecord } from "@/server/helpRecord";
import home from "@/components/home/home.module.css";
import styles from "../u.module.css";

const words = {
  en: {
    title: "Verified help record", private: "This help record is private.", people: "People helped", sessions: "Sessions", minutes: "Minutes",
    rating: "Average rating", course: "Course", first: "First session", last: "Latest session", none: "No completed sessions yet.",
    verified: "Every session was confirmed by both people and rated by the person who was helped.", copy: "Copy link", copied: "Link copied",
    print: "Print", hidden: "Only you and admins can see this page. Turn the record on from your profile to share it.", undeclared: "Undeclared", back: "← HelpLoop",
  },
  ko: {
    title: "검증된 도움 기록", private: "비공개 도움 기록이에요.", people: "도와준 친구", sessions: "세션", minutes: "분",
    rating: "평균 평점", course: "과목", first: "첫 세션", last: "최근 세션", none: "아직 완료한 세션이 없어요.",
    verified: "모든 세션은 두 사람이 함께 확인했고, 도움을 받은 사람이 평가했어요.", copy: "링크 복사", copied: "복사했어요",
    print: "인쇄", hidden: "지금은 나와 관리자만 볼 수 있어요. 공유하려면 프로필에서 기록 공개를 켜 주세요.", undeclared: "학과 미정", back: "← HelpLoop",
  },
};

export function RecordScreen({ record: r }: { record: HelpRecord }) {
  const [language, setLanguage] = useLanguage();
  const [copied, setCopied] = useState(false);
  const t = words[language];
  const day = (iso: string) => new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(iso));
  return <main className={home.app} lang={language}>
    <div className={`${home.darkSurface} ${styles.noPrint}`}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      {r.status !== "visible" ? <section><h1>{t.title}</h1><p>{t.private}</p></section> : <>
        <section className={styles.card}>
          <h1>{r.name}</h1>
          <p>{r.year} · {r.department.trim().toLowerCase() === "undeclared" ? t.undeclared : r.department}</p>
          <h2>{t.title}</h2>
          <div className={styles.stats}>
            <div><strong>{r.totals.people}</strong><span>{t.people}</span></div>
            <div><strong>{r.totals.sessions}</strong><span>{t.sessions}</span></div>
            <div><strong>{r.totals.minutes}</strong><span>{t.minutes}</span></div>
            <div><strong>{r.totals.rating ?? "—"}</strong><span>{t.rating}</span></div>
          </div>
          {r.first && r.last && <p>{t.first}: {day(r.first)} · {t.last}: {day(r.last)}</p>}
          <p><strong>{t.verified}</strong></p>
        </section>
        <section>
          {r.courses.length === 0 ? <p>{t.none}</p> : <table className={styles.table}>
            <thead><tr><th>{t.course}</th><th>{t.sessions}</th><th>{t.people}</th><th>{t.minutes}</th><th>{t.rating}</th></tr></thead>
            <tbody>{r.courses.map((c) => <tr key={c.code}><td>{c[language]}</td><td>{c.sessions}</td><td>{c.people}</td><td>{c.minutes}</td><td>{c.rating ?? "—"}</td></tr>)}</tbody>
          </table>}
        </section>
        {r.own && !r.public && <p className={styles.muted}>{t.hidden}</p>}
        <div className={styles.noPrint} style={{ display: "flex", gap: 8 }}>
          <button type="button" className={home.primary} onClick={async () => {
            try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { setCopied(false); }
          }}>{copied ? t.copied : t.copy}</button>
          <button type="button" className={home.primary} onClick={() => window.print()}>{t.print}</button>
        </div>
      </>}
    </div>
  </main>;
}
