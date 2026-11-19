"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/locale";
import home from "@/components/home/home.module.css";
import styles from "./stuck.module.css";

type Bilingual = { ko: string; en: string };
export type StuckCourse = { code: string; name: Bilingual; topics: { tag: string; label: Bilingual; thisWeek: number; lastWeek: number }[] };

const words = {
  en: {
    title: "Stuck Map", intro: "Which topics students are asking for help with this week, by course. Professors and TAs: this is where your class is stuck.",
    course: "Course", thisWeek: "this week", lastWeek: "last week", empty: "No topic in this course has enough requests to show yet.",
    note: "Only topics with at least 3 requests from at least 3 different students are shown. Small groups are hidden to lower the chance of identifying anyone; this reduces the risk but cannot rule it out.",
    unavailable: "Couldn’t load the Stuck Map. Please try again.", back: "← HelpLoop", ask: "Stuck too? Ask for help",
  },
  ko: {
    title: "막힌 곳 지도", intro: "이번 주 과목별로 학생들이 도움을 요청한 주제예요. 교수님과 조교님: 수업에서 학생들이 막힌 지점이에요.",
    course: "과목", thisWeek: "이번 주", lastWeek: "지난주", empty: "아직 표시할 만큼 요청이 모인 주제가 없어요.",
    note: "서로 다른 학생 3명 이상이 3건 이상 요청한 주제만 보여요. 개인을 알아볼 가능성을 줄이려고 작은 그룹은 숨기지만, 그 가능성을 완전히 없앨 수는 없어요.",
    unavailable: "막힌 곳 지도를 불러오지 못했어요. 다시 시도해 주세요.", back: "← HelpLoop", ask: "도움 요청하기",
  },
};

export function StuckScreen({ courses, unavailable = false }: { courses: StuckCourse[]; unavailable?: boolean }) {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  const firstWithData = courses.find((c) => c.topics.length)?.code ?? courses[0]?.code ?? "";
  const [code, setCode] = useState(firstWithData);
  const course = courses.find((c) => c.code === code);
  const max = Math.max(1, ...(course?.topics.flatMap((x) => [x.thisWeek, x.lastWeek]) ?? []));
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p>{t.intro}</p>
      {unavailable ? <p role="alert">{t.unavailable}</p> : <>
        <label className={styles.picker}>{t.course}
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            {courses.map((c) => <option key={c.code} value={c.code}>{c.name[language]}</option>)}
          </select>
        </label>
        <section aria-live="polite">
          {!course?.topics.length ? <p>{t.empty}</p> : <ul className={styles.bars}>
            {course.topics.map((x) => <li key={x.tag}>
              <div className={styles.label}><span>{x.label[language]}</span>
                <span><strong>{x.thisWeek}</strong> {t.thisWeek} · {x.lastWeek} {t.lastWeek}</span></div>
              <div className={styles.track} aria-hidden="true">
                {x.thisWeek > 0 && <div className={styles.bar} style={{ width: `${(100 * x.thisWeek) / max}%` }} />}
                {x.lastWeek > 0 && <div className={styles.marker} style={{ left: `calc(${(100 * x.lastWeek) / max}% - 1px)` }} />}
              </div>
            </li>)}
          </ul>}
        </section>
        <p className={styles.note}>{t.note}</p>
        <Link className={home.primary} href="/ask">{t.ask}</Link>
      </>}
    </div>
  </main>;
}
