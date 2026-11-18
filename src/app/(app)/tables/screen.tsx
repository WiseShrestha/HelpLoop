"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useLanguage } from "@/components/locale";
import { createClient } from "@/lib/supabase/client";
import { openTable, tableAction, type TableFeedback } from "./actions";
import home from "@/components/home/home.module.css";
import styles from "./tables.module.css";

type Bilingual = { en: string; ko: string };
export type LiveTable = {
  id: string; place: string; note: string | null; startsAt: string; endsAt: string; max: number; course: Bilingual | null;
  host: string; people: string[]; isHost: boolean; joined: boolean; full: boolean;
};
type Offering = Bilingual & { code: string; kind: string };

const PLACES = ["Library 2F", "Library 1F lounge", "E11 lounge", "N4 study room", "Online"];
const words = {
  en: {
    title: "Study together", intro: "No question needed: open a table where you're studying and let classmates join you. Tables earn no credits or tickets; they're for meeting people.",
    live: "Open now", soon: "Starting soon", none: "No open tables right now. Start one!", until: "until", startsAt: "starts", left: (m: number) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${m} min left`,
    host: "Host", join: "Join", leave: "Leave", end: "End table", full: "Full", open: "Open a table", place: "Where (a public place)", course: "Course or skill (optional)",
    none_: "Anything", note: "Note (optional)", notePh: "e.g. Working on problem set 5, happy to compare answers", start: "Start", finish: "End", max: "Seats, including you",
    submit: "Open table", feedback: { opened: "Your table is open.", joined: "You joined the table.", left: "You left the table.", ended: "Table ended.",
      full: "That table just filled up.", closed: "That table has ended.", login: "Please sign in again.", error: "Couldn't save. Please try again.",
      place: "Add a place (up to 60 characters).", note: "Keep the note under 120 characters.", time: "Check the start and end times.", length: "Tables last at most 6 hours.",
      past: "The end time has already passed.", max: "Seats must be 2–12.", "": "" } as Record<TableFeedback, string>,
    unavailable: "Couldn't load tables. Please try again.", back: "← HelpLoop", kinds: { course: "Courses", language: "Languages", skill: "Skills" } as Record<string, string>,
  },
  ko: {
    title: "함께 공부", intro: "질문이 없어도 괜찮아요. 공부하는 자리를 열고 친구들이 합류하게 하세요. 크레딧이나 티켓은 없어요. 사람을 만나기 위한 공간이에요.",
    live: "지금 열린 자리", soon: "곧 시작", none: "지금 열린 자리가 없어요. 먼저 열어 보세요!", until: "까지", startsAt: "시작", left: (m: number) => m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분 남음` : `${m}분 남음`,
    host: "호스트", join: "합류하기", leave: "나가기", end: "자리 닫기", full: "정원 마감", open: "자리 열기", place: "장소 (공개된 장소)", course: "과목 또는 기술 (선택)",
    none_: "무엇이든", note: "메모 (선택)", notePh: "예: 과제 5 푸는 중, 답 비교해요", start: "시작", finish: "끝", max: "나를 포함한 자리 수",
    submit: "자리 열기", feedback: { opened: "자리를 열었어요.", joined: "합류했어요.", left: "자리에서 나왔어요.", ended: "자리를 닫았어요.",
      full: "방금 정원이 찼어요.", closed: "이미 끝난 자리예요.", login: "다시 로그인해 주세요.", error: "저장하지 못했어요. 다시 시도해 주세요.",
      place: "장소를 입력해 주세요 (60자 이내).", note: "메모는 120자 이내로 써 주세요.", time: "시작과 끝 시간을 확인해 주세요.", length: "최대 6시간까지 열 수 있어요.",
      past: "끝나는 시간이 이미 지났어요.", max: "자리 수는 2–12명이에요.", "": "" } as Record<TableFeedback, string>,
    unavailable: "자리를 불러오지 못했어요. 다시 시도해 주세요.", back: "← HelpLoop", kinds: { course: "교과목", language: "언어", skill: "기술" } as Record<string, string>,
  },
};

function TableCard({ table: x, language, now }: { table: LiveTable; language: "en" | "ko"; now: number }) {
  const t = words[language];
  const [feedback, action, pending] = useActionState(tableAction, "");
  const time = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", { timeStyle: "short", timeZone: "Asia/Seoul" });
  const started = Date.parse(x.startsAt) <= now;
  const minutesLeft = Math.max(0, Math.round((Date.parse(x.endsAt) - now) / 60000));
  return <article className={styles.card}>
    <div className={styles.row}><strong>📍 {x.place}</strong>
      <span className={styles.muted}>{started ? t.left(minutesLeft) : `${t.startsAt} ${time.format(new Date(x.startsAt))}`} · {t.until} {time.format(new Date(x.endsAt))}</span></div>
    {x.course && <span className={styles.tag}>{x.course[language]}</span>}
    {x.note && <p>{x.note}</p>}
    <p className={styles.muted}>{t.host}: {x.host} · {x.people.length}/{x.max}</p>
    <ul className={styles.people}>{x.people.map((p, i) => <li key={i} title={p}>{p.slice(0, 1).toUpperCase()}<span>{p}</span></li>)}</ul>
    <form action={action}>
      <input type="hidden" name="table" value={x.id} />
      {x.isHost ? <button name="intent" value="end" disabled={pending}>{t.end}</button>
        : x.joined ? <button name="intent" value="leave" disabled={pending}>{t.leave}</button>
        : <button name="intent" value="join" className={styles.join} disabled={pending || x.full}>{x.full ? t.full : t.join}</button>}
    </form>
    {feedback && <p role="status" className={styles.muted}>{t.feedback[feedback]}</p>}
  </article>;
}

export function TablesScreen({ tables, offerings, unavailable = false, serverNow = 0, defaults = { starts: "", ends: "" } }: {
  tables: LiveTable[]; offerings: Offering[]; unavailable?: boolean; serverNow?: number; defaults?: { starts: string; ends: string };
}) {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  const router = useRouter();
  const [feedback, action, pending] = useActionState(openTable, "");
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Tables and joins stream over Realtime; the capacity lock also emits a table update, so debounce.
    const db = createClient();
    let pendingRefresh: number | undefined;
    const refresh = () => { window.clearTimeout(pendingRefresh); pendingRefresh = window.setTimeout(() => { if (!document.hidden) router.refresh(); }, 800); };
    const channel = db.channel("open-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "open_tables" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "open_table_joins" }, refresh).subscribe();
    const timer = window.setInterval(() => { tick(); refresh(); }, 60000); // hide ended tables, recover missed events
    return () => { window.clearInterval(timer); window.clearTimeout(pendingRefresh); void db.removeChannel(channel); };
  }, [router]);

  const live = tables.filter((x) => Date.parse(x.endsAt) > now);
  const started = live.filter((x) => Date.parse(x.startsAt) <= now);
  const upcoming = live.filter((x) => !started.includes(x));
  const groups = [...new Set(offerings.map((o) => o.kind))];
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p className={styles.muted}>{t.intro}</p>
      {unavailable ? <p role="alert">{t.unavailable}</p> : <>
        {[[t.live, started], [t.soon, upcoming]].map(([label, list]) => (list as LiveTable[]).length > 0 && <section key={label as string}>
          <h2>{label as string}</h2>{(list as LiveTable[]).map((x) => <TableCard key={x.id} table={x} language={language} now={now} />)}</section>)}
        {live.length === 0 && <p>{t.none}</p>}
        <section><h2>{t.open}</h2>
          <form action={action} className={styles.form}>
            <label>{t.place}<input name="place" list="table-places" maxLength={60} required /></label>
            <datalist id="table-places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
            <label>{t.course}<select name="course" defaultValue=""><option value="">{t.none_}</option>
              {groups.map((g) => <optgroup key={g} label={t.kinds[g] ?? g}>{offerings.filter((o) => o.kind === g).map((o) => <option key={o.code} value={o.code}>{o[language]}</option>)}</optgroup>)}
            </select></label>
            <label>{t.note}<input name="note" maxLength={120} placeholder={t.notePh} /></label>
            <div className={styles.times}>
              <label>{t.start}<input type="datetime-local" name="starts" defaultValue={defaults.starts} required /></label>
              <label>{t.finish}<input type="datetime-local" name="ends" defaultValue={defaults.ends} required /></label>
            </div>
            <label>{t.max}<input type="number" name="max" min={2} max={12} defaultValue={6} required /></label>
            <button className={home.primary} disabled={pending}>{t.submit}</button>
            {feedback && <p role="status">{t.feedback[feedback]}</p>}
          </form>
        </section>
      </>}
    </div>
  </main>;
}
