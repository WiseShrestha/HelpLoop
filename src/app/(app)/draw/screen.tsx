"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/locale";
import home from "@/components/home/home.module.css";
import styles from "../wallet/wallet.module.css";

export type DrawView = {
  week: string; hash: string; prizes: string[]; seed: string | null;
  winners: { name: string; prize: string }[]; tickets: { name: string; tickets: number }[];
};

const words = {
  en: {
    title: "Weekly draw", intro: "Every week, tickets from helping go into a prize draw. The draw is commit–reveal, so nobody, including us, can choose the winners.",
    week: "Week of", prizes: "Prizes", hash: "Published draw code (sha256 of the secret seed)", pending: "The seed is revealed and winners are drawn after the week ends (Monday 00:00 KST).",
    seed: "Revealed seed", winners: "Winners", table: "Ticket table used for the draw", tickets: "tickets", none: "No draws yet.", unavailable: "Couldn’t load the draws. Please try again.",
    how: "How to check it", steps: ["Before the week, we publish only the draw code: a fingerprint of a secret seed.", "After the week, we reveal the seed. Anyone can hash it and compare it with the code below.", "Winners are drawn from the ticket table with that seed, weighted by tickets. The code that does it is drawWinners in src/lib/model/lottery.ts, so you can rerun it yourself."],
    verify: "Check the seed", match: "✓ The seed matches the published code.", mismatch: "✗ The seed does not match the published code.", back: "← HelpLoop",
  },
  ko: {
    title: "주간 추첨", intro: "매주 도움으로 받은 티켓이 경품 추첨에 들어가요. 추첨은 사전 공개(commit–reveal) 방식이라 운영진을 포함해 누구도 당첨자를 고를 수 없어요.",
    week: "주간", prizes: "경품", hash: "공개된 추첨 코드 (비밀 시드의 sha256)", pending: "한 주가 끝난 뒤(월요일 00:00 KST) 시드를 공개하고 당첨자를 뽑아요.",
    seed: "공개된 시드", winners: "당첨자", table: "추첨에 사용된 티켓 표", tickets: "장", none: "아직 추첨이 없어요.", unavailable: "추첨 정보를 불러오지 못했어요. 다시 시도해 주세요.",
    how: "확인하는 방법", steps: ["한 주가 시작되기 전에 비밀 시드의 지문인 추첨 코드만 공개해요.", "한 주가 끝나면 시드를 공개해요. 누구나 시드를 해시해서 아래 코드와 비교할 수 있어요.", "그 시드로 티켓 표에서 티켓 수에 비례해 당첨자를 뽑아요. src/lib/model/lottery.ts 의 drawWinners 코드로 직접 다시 계산할 수 있어요."],
    verify: "시드 확인하기", match: "✓ 시드가 공개된 코드와 일치해요.", mismatch: "✗ 시드가 공개된 코드와 일치하지 않아요.", back: "← HelpLoop",
  },
};

function Verify({ seed, hash, t }: { seed: string; hash: string; t: (typeof words)["en"] }) {
  const [result, setResult] = useState<boolean | null>(null);
  async function check() {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
    setResult([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("") === hash.toLowerCase());
  }
  return <div><button type="button" className={styles.claim} onClick={check}>{t.verify}</button>
    {result !== null && <p role="status">{result ? t.match : t.mismatch}</p>}</div>;
}

export function DrawScreen({ draws, unavailable = false }: { draws: DrawView[]; unavailable?: boolean }) {
  const [language, setLanguage] = useLanguage();
  const t = words[language];
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>{t.back}</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}>
      <h1>{t.title}</h1><p>{t.intro}</p>
      {unavailable && <p role="alert">{t.unavailable}</p>}
      {!unavailable && draws.length === 0 && <p>{t.none}</p>}
      {draws.map((d) => <section key={d.week}>
        <h2>{t.week} {d.week}</h2>
        <p><strong>{t.prizes}:</strong> {d.prizes.join(" · ")}</p>
        <small>{t.hash}</small><code>{d.hash}</code>
        {!d.seed ? <p>{t.pending}</p> : <>
          <small>{t.seed}</small><code>{d.seed}</code>
          <Verify seed={d.seed} hash={d.hash} t={t} />
          <h3>{t.winners}</h3>
          {d.winners.map((w, i) => <article key={i} className={styles.row}><span>{w.prize}</span><strong>{w.name}</strong></article>)}
          <h3>{t.table}</h3>
          {d.tickets.map((p, i) => <article key={i} className={styles.row}><span>{p.name}</span><span>{p.tickets} {t.tickets}</span></article>)}
        </>}
      </section>)}
      <section><h2>{t.how}</h2><ol>{t.steps.map((s) => <li key={s}>{s}</li>)}</ol></section>
    </div>
  </main>;
}
