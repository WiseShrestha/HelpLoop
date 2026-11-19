"use client";

import Link from "next/link";
import { useLanguage } from "@/components/locale";
import home from "@/components/home/home.module.css";
import styles from "../u/[id]/u.module.css";

type Row = { id: string; name: string; year: number; department: string; people: number; sessions: number; rating: number | null };

const words = {
  en: { title: "Top helpers", intro: "Ranked by how many different people each student has helped, not by hours. Ties go to the higher rating.",
    people: (n: number) => `${n} ${n === 1 ? "person" : "people"}`, sessions: "sessions", none: "No completed sessions yet. Be the first to help!",
    unavailable: "Couldn’t load the leaderboard. Please try again.", you: "you", undeclared: "Undeclared", back: "← HelpLoop" },
  ko: { title: "도움 리더보드", intro: "시간이 아니라 서로 다른 몇 명을 도왔는지로 순위를 매겨요. 같으면 평점이 높은 순이에요.",
    people: (n: number) => `${n}명`, sessions: "세션", none: "아직 완료한 세션이 없어요. 첫 도움을 시작해 보세요!",
    unavailable: "리더보드를 불러오지 못했어요. 다시 시도해 주세요.", you: "나", undeclared: "학과 미정", back: "← HelpLoop" },
};

export function LeaderboardScreen({ rows, me, unavailable = false }: { rows: Row[]; me?: string; unavailable?: boolean }) {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p className={styles.muted}>{t.intro}</p>
      <section>
        {unavailable ? <p role="alert">{t.unavailable}</p> : rows.length === 0 ? <p>{t.none}</p> : <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((r, i) => <li key={r.id} className={styles.rank}>
            <b>{i + 1}</b>
            <span><Link href={`/u/${r.id}`}>{r.name}</Link>{r.id === me && <> ({t.you})</>}<br />
              <small className={styles.muted}>{r.year} · {r.department.trim().toLowerCase() === "undeclared" ? t.undeclared : r.department}</small></span>
            <span style={{ textAlign: "right" }}><strong>{t.people(r.people)}</strong><br />
              <small className={styles.muted}>{r.sessions} {t.sessions} · ★ {r.rating ?? "—"}</small></span>
          </li>)}
        </ol>}
      </section>
    </div>
  </main>;
}
