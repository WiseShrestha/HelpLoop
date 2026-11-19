"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useLanguage } from "@/components/locale";
import type { Major, MajorHelper, MajorPerk } from "@/lib/majors";
import { claimDepartmentPerk } from "../actions";
import { majorsCopy } from "../copy";
import type { CourseName } from "../screen";
import home from "@/components/home/home.module.css";
import styles from "../majors.module.css";

export function DepartmentScreen({ major, helpers, perks, courses }: {
  major: Major; helpers: MajorHelper[]; perks: (MajorPerk & { claimed: boolean })[]; courses: CourseName[];
}) {
  const [language, setLanguage] = useLanguage();
  const t = majorsCopy[language];
  const [feedback, action, pending] = useActionState(claimDepartmentPerk, "");
  const course = (code: string) => courses.find((c) => c.code === code)?.[language] ?? code;
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/majors" className={home.brand}>{t.all}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{major.name}</h1>
      <p>{t.helpers(major.helpers)} · {t.helped(major.peopleHelped)}</p>
      <Link className={home.primary} href="/ask?course=major-advice">{t.ask}</Link>
      <small className={styles.muted}>{t.askNote}</small>
      <section><h2>{t.deptHelpers}</h2>
        {helpers.length === 0 ? <p>{t.noHelpers}</p> : helpers.map((h) => <article key={h.id} className={styles.person}>
          <div className={styles.row}><Link href={`/u/${h.id}`}><strong>{h.name}</strong></Link>
            <span className={styles.muted}>{t.entered(h.year)} · {t.helped(h.peopleHelped)}{h.rating !== null && <> · ★ {h.rating}</>}</span></div>
          {h.courses.length > 0 && <ul className={styles.chips}>{h.courses.map((c) => <li key={c}>{course(c)}</li>)}</ul>}
        </article>)}
      </section>
      <section><h2>{t.deptPerks}</h2>
        {perks.length === 0 ? <p>{t.noPerks}</p> : perks.map((p) => <article key={p.id} className={styles.person}>
          <strong>{p.title}</strong>
          <span className={styles.muted}>{p.host_label} · {p.cost_minutes} min</span>
          {p.description && <p>{p.description}</p>}
          <form action={action}><button name="perk" value={p.id} className={styles.claim} disabled={pending || p.claimed}>{p.claimed ? t.claimed : t.claim}</button></form>
        </article>)}
        {feedback && <p role="status">{t.feedback[feedback]}</p>}
      </section>
    </div>
  </main>;
}
