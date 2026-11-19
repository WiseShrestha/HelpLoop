"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/locale";
import { ECONOMY_DEFAULTS, OVERDRAFT_OPTIONS, STARTER_OPTIONS, sweep } from "@/lib/model/economy";
import { TICKET_RULES } from "@/lib/model/tickets";
import { ShareChart, type Series } from "./chart";
import home from "@/components/home/home.module.css";
import styles from "./model.module.css";

// Categorical slots 1–3 of the reference palette (validated all-pairs; slot 3 needs labels, which it has).
const SERIES_STYLE = [
  { color: "#2a78d6", shape: "circle" as const }, { color: "#eb6834", shape: "square" as const }, { color: "#1baf7a", shape: "triangle" as const },
];
const PILOT = { starter: 60, overdraft: 30 };

const words = {
  en: {
    title: "How the HelpLoop economy works", back: "← HelpLoop",
    intro: "Before the pilot we simulated 60 students for two weeks to choose how many credits everyone starts with and how far they may go below zero. Move the sliders to try it yourself; the same seed always gives the same result.",
    students: "Students", ask: "Chance a student asks each day", help: "Chance a helper takes a request", seed: "Seed",
    met: "Help needs met", blocked: "Students blocked from asking at least once", starter: "Starter credits (min)",
    overdraft: (o: number) => (o ? `−${o} overdraft` : "No overdraft"), pilot: "Ringed: our pilot setting (60 starter credits, −30 overdraft).",
    insight: "Starting credit is what lets students ask before they've helped anyone: with none, nobody can ask at all. A small overdraft does the same job as extra free credit without printing it.",
    table: "Show the numbers", pairs: "Distinct pairs", gini: "Inequality (Gini)", needs: "Needs met",
    tickets: "How tickets work", t1: (m: number) => `1 ticket for every ${m} minutes you help.`,
    t2: (x: number) => `×${x} the first time you ever study with someone: meeting new people pays.`,
    t3: "With the same person in the same week: 1st and 2nd session ×1, 3rd ×0.5, after that ×0.",
    t4: "× the rating you receive: 5 or 4 → ×1, 3 → ×0.75, 2 → ×0.25, 1 → ×0.",
    t5: (c: number) => `At most ${c} tickets a week from sessions, plus up to 2 from closing loops (A helps B, B helps C, C helps A).`,
    credits: "Credits never come from nowhere: a session moves minutes from the person helped to the helper.",
  },
  ko: {
    title: "HelpLoop 경제는 이렇게 움직여요", back: "← HelpLoop",
    intro: "파일럿 전에 학생 60명의 2주를 시뮬레이션해서 시작 크레딧과 마이너스 한도를 정했어요. 슬라이더를 움직여 직접 확인해 보세요. 같은 시드는 언제나 같은 결과를 내요.",
    students: "학생 수", ask: "하루에 도움을 요청할 확률", help: "도우미가 요청을 받을 확률", seed: "시드",
    met: "충족된 도움 요청", blocked: "한 번이라도 요청을 못 한 학생", starter: "시작 크레딧 (분)",
    overdraft: (o: number) => (o ? `마이너스 ${o}분` : "마이너스 없음"), pilot: "동그라미: 파일럿 설정 (시작 60분, 마이너스 30분).",
    insight: "시작 크레딧이 있어야 아직 아무도 돕지 않은 학생도 질문할 수 있어요. 크레딧이 없으면 아무도 요청할 수 없어요. 작은 마이너스 한도는 크레딧을 새로 만들지 않고도 같은 효과를 내요.",
    table: "숫자로 보기", pairs: "새로 만난 쌍", gini: "불평등 (지니)", needs: "충족률",
    tickets: "티켓은 이렇게 받아요", t1: (m: number) => `${m}분 도울 때마다 티켓 1장.`,
    t2: (x: number) => `처음 함께 공부하는 친구라면 ×${x}: 새로운 만남이 이득이에요.`,
    t3: "같은 주에 같은 친구와: 1·2번째 세션 ×1, 3번째 ×0.5, 그 이후 ×0.",
    t4: "받은 평점에 따라: 5·4점 ×1, 3점 ×0.75, 2점 ×0.25, 1점 ×0.",
    t5: (c: number) => `세션 티켓은 주당 최대 ${c}장, 도움의 고리(A→B→C→A)를 완성하면 최대 2장 더.`,
    credits: "크레딧은 새로 생기지 않아요. 세션은 도움받은 사람의 시간을 도와준 사람에게 옮길 뿐이에요.",
  },
};

export function ModelScreen() {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  const [students, setStudents] = useState(ECONOMY_DEFAULTS.students);
  const [ask, setAsk] = useState(ECONOMY_DEFAULTS.askProbability);
  const [help, setHelp] = useState(ECONOMY_DEFAULTS.helpProbability);
  const [seed, setSeed] = useState(ECONOMY_DEFAULTS.seed);
  const rows = useMemo(() => sweep({ ...ECONOMY_DEFAULTS, students, askProbability: ask, helpProbability: help, seed: seed || "helploop" }),
    [students, ask, help, seed]);
  const series = (metric: "needsMetShare" | "blockedShare"): Series[] => OVERDRAFT_OPTIONS.map((o, i) => ({
    key: String(o), label: t.overdraft(o), short: o ? `−${o}` : "0", ...SERIES_STYLE[i],
    values: STARTER_OPTIONS.map((s) => 100 * (rows.find((r) => r.starter === s && r.overdraft === o)?.[metric] ?? 0)),
  }));
  const highlight = { series: String(PILOT.overdraft), index: STARTER_OPTIONS.indexOf(PILOT.starter as 60) };
  const xLabels = STARTER_OPTIONS.map(String);

  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p className={styles.muted}>{t.intro}</p>
      <section className={styles.controls}>
        <label>{t.students} <strong>{students}</strong><input type="range" min={20} max={120} step={10} value={students} onChange={(e) => setStudents(Number(e.target.value))} /></label>
        <label>{t.ask} <strong>{Math.round(ask * 100)}%</strong><input type="range" min={0.05} max={0.6} step={0.05} value={ask} onChange={(e) => setAsk(Number(e.target.value))} /></label>
        <label>{t.help} <strong>{Math.round(help * 100)}%</strong><input type="range" min={0.1} max={1} step={0.1} value={help} onChange={(e) => setHelp(Number(e.target.value))} /></label>
        <label>{t.seed}<input value={seed} maxLength={40} onChange={(e) => setSeed(e.target.value)} /></label>
      </section>
      <section className={styles.charts}>
        <ShareChart title={t.met} xTitle={t.starter} xLabels={xLabels} series={series("needsMetShare")} highlight={highlight} />
        <ShareChart title={t.blocked} xTitle={t.starter} xLabels={xLabels} series={series("blockedShare")} highlight={highlight} />
        <p className={styles.muted}>{t.pilot}</p>
        <p>{t.insight}</p>
        <details><summary>{t.table}</summary>
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>{t.starter}</th><th>{language === "ko" ? "마이너스" : "Overdraft"}</th><th>{t.needs}</th><th>{t.blocked}</th><th>{t.pairs}</th><th>{t.gini}</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={`${r.starter}-${r.overdraft}`} className={r.starter === PILOT.starter && r.overdraft === PILOT.overdraft ? styles.pilotRow : undefined}>
              <td>{r.starter}</td><td>−{r.overdraft}</td><td>{Math.round(r.needsMetShare * 100)}%</td><td>{Math.round(r.blockedShare * 100)}%</td>
              <td>{r.distinctPairs}</td><td>{r.gini}</td></tr>)}</tbody>
          </table></div>
        </details>
      </section>
      <section><h2>{t.tickets}</h2>
        <ul className={styles.rules}>
          <li>{t.t1(TICKET_RULES.minutesPerTicket)}</li><li>{t.t2(TICKET_RULES.newPairMultiplier)}</li>
          <li>{t.t3}</li><li>{t.t4}</li><li>{t.t5(TICKET_RULES.weeklyCapPerHelper)}</li><li>{t.credits}</li>
        </ul>
      </section>
    </div>
  </main>;
}
