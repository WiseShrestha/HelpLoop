"use client";

import Link from "next/link";
import { useLanguage } from "@/components/locale";
import type { Major } from "@/lib/majors";
import { majorsCopy } from "./copy";
import home from "@/components/home/home.module.css";
import styles from "./majors.module.css";

export type CourseName = { code: string; en: string; ko: string };

export function MajorsScreen({ majors, courses, unavailable = false }: { majors: Major[]; courses: CourseName[]; unavailable?: boolean }) {
  const [language, setLanguage] = useLanguage();
  const t = majorsCopy[language];
  const course = (code: string) => courses.find((c) => c.code === code)?.[language] ?? code;
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p className={styles.muted}>{t.intro}</p>
      {unavailable ? <p role="alert">{t.unavailable}</p> : majors.length === 0 ? <p>{t.none}</p> :
        <div className={styles.grid}>{majors.map((m) => <Link key={m.slug} href={`/majors/${encodeURIComponent(m.slug)}`} className={styles.card}>
          <h2>{m.name}</h2>
          <p>{t.helpers(m.helpers)} · {t.helped(m.peopleHelped)}{m.perks > 0 && <> · {t.perks(m.perks)}</>}</p>
          {m.topCourses.length > 0 && <p className={styles.muted}>{t.top}: {m.topCourses.map((c) => course(c.code)).join(", ")}</p>}
          <span className={styles.open}>{t.open} →</span>
        </Link>)}</div>}
    </div>
  </main>;
}
