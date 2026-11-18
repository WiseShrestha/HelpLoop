"use client";

import Link from "next/link";
import { useLanguage } from "@/components/locale";
import { loopLayout } from "@/lib/profile";
import type { PublicProfile } from "@/server/profiles";
import { setPublicRecord } from "./actions";
import home from "@/components/home/home.module.css";
import styles from "./u.module.css";

const words = {
  en: {
    people: "People helped", sessions: "Sessions", minutes: "Minutes", rating: "Rating", topics: "Can help with", noTopics: "No help topics yet.",
    partners: "Study partners by year and department", noPartners: "No completed sessions yet.", people_: (n: number) => `×${n}`,
    tables: (n: number) => `Studied with ${n} ${n === 1 ? "person" : "people"} at Open Tables`, record: "Verified help record →",
    loops: "My loops", loopNote: "Each arrow is help given in a session rated 4–5. Every member earned a bonus ticket.", noLoops: "No loops yet. When help goes around a circle of 3–5 people, everyone gets a bonus ticket.",
    publicLabel: "Make my help record public", publicNote: "Anyone with the link can see your confirmed sessions per course, even without signing in. Turn it off at any time.",
    save: "Save", edit: "Edit my profile", undeclared: "Undeclared", back: "← HelpLoop", year: (y: number) => `Entered ${y}`,
  },
  ko: {
    people: "도와준 친구", sessions: "세션", minutes: "분", rating: "평점", topics: "도울 수 있는 주제", noTopics: "아직 주제가 없어요.",
    partners: "입학 연도·학과별 공부 친구", noPartners: "아직 완료한 세션이 없어요.", people_: (n: number) => `${n}명`,
    tables: (n: number) => `함께 공부하기에서 ${n}명과 공부했어요`, record: "검증된 도움 기록 →",
    loops: "나의 도움의 고리", loopNote: "화살표는 평점 4–5인 세션에서 준 도움이에요. 고리의 모든 친구가 보너스 티켓을 받았어요.", noLoops: "아직 고리가 없어요. 3–5명이 돌아가며 도우면 모두 보너스 티켓을 받아요.",
    publicLabel: "도움 기록 공개하기", publicNote: "링크가 있는 누구나 로그인 없이 과목별 확인된 세션을 볼 수 있어요. 언제든 끌 수 있어요.",
    save: "저장", edit: "내 프로필 수정", undeclared: "학과 미정", back: "← HelpLoop", year: (y: number) => `${y}학번`,
  },
};

function LoopDiagram({ members }: { members: string[] }) {
  const size = 200;
  const points = loopLayout(members.length, size, 70);
  const r = 26;
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={members.join(" → ") + " → " + members[0]}>
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#242b43" /></marker></defs>
    {points.map((p, i) => {
      const q = points[(i + 1) % points.length];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      return <line key={`l${i}`} x1={p.x + (dx / d) * r} y1={p.y + (dy / d) * r} x2={q.x - (dx / d) * (r + 2)} y2={q.y - (dy / d) * (r + 2)}
        stroke="#242b43" strokeWidth="2" markerEnd="url(#arrow)" />;
    })}
    {points.map((p, i) => <g key={`n${i}`}><circle cx={p.x} cy={p.y} r={r} fill="#c8efdc" stroke="#242b43" />
      <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700">{members[i].slice(0, 8)}</text></g>)}
  </svg>;
}

export function PublicProfileScreen({ profile: p }: { profile: PublicProfile }) {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  const dept = (d: string) => (d.trim().toLowerCase() === "undeclared" ? t.undeclared : d);
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <section className={styles.card}>
        <h1>{p.name}</h1>
        <p>{t.year(p.year)} · {dept(p.department)}</p>
        {p.bio && <p>{p.bio}</p>}
        <div className={styles.stats}>
          <div><strong>{p.stats.people}</strong><span>{t.people}</span></div>
          <div><strong>{p.stats.sessions}</strong><span>{t.sessions}</span></div>
          <div><strong>{p.stats.minutes}</strong><span>{t.minutes}</span></div>
          <div><strong>{p.stats.rating ?? "—"}</strong><span>{t.rating}</span></div>
        </div>
        {(p.publicRecord || p.own) && <Link href={`/u/${p.id}/record`}>{t.record}</Link>}
      </section>
      <section><h2>{t.topics}</h2>
        {p.courses.length ? <ul className={styles.chips}>{p.courses.map((c) => <li key={c.code}>{c[language]}</li>)}</ul> : <p>{t.noTopics}</p>}</section>
      <section><h2>{t.partners}</h2>
        {p.partners.length ? <ul className={styles.chips}>{p.partners.map((g) => <li key={`${g.year}${g.department}`}>
          {g.year} · {dept(g.department)} <strong>{t.people_(g.people)}</strong></li>)}</ul> : <p>{t.noPartners}</p>}
        {p.tablePeople > 0 && <p>🪑 {t.tables(p.tablePeople)}</p>}</section>
      {p.own && <>
        <section><h2>{t.loops}</h2>
          {p.loops.length ? <><p className={styles.muted}>{t.loopNote}</p><div className={styles.loops}>
            {p.loops.map((l) => <figure key={l.key}><LoopDiagram members={l.members} /><figcaption>{l.week}</figcaption></figure>)}</div></>
            : <p>{t.noLoops}</p>}</section>
        <section><form action={setPublicRecord} className={styles.toggle}>
          <label><input type="checkbox" name="public" defaultChecked={p.publicRecord} /> {t.publicLabel}</label>
          <p className={styles.muted}>{t.publicNote}</p>
          <button type="submit">{t.save}</button></form>
          <Link href="/profile">{t.edit}</Link></section>
      </>}
    </div>
  </main>;
}
