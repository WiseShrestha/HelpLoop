"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/locale";
import { GoogleSignIn } from "@/components/google-sign-in";
import type { getWallet } from "@/server/queries";
import { claimPerk } from "./actions";
import home from "@/components/home/home.module.css";
import styles from "./wallet.module.css";

const words = {
  en: { title:"My wallet", balance:"Help credits", tickets:"Tickets this week", minutes:"min", why:"How you earned tickets", history:"Credit history",
    empty:"Help a classmate and confirm the session together to earn your first tickets.", noEntries:"No credit transactions yet.", pair:"New connection", repeat:"Repeat pair", rating:"Rating factor", base:"Base tickets", session:"View session",
    perks:"Perks", noPerks:"No perks available yet.", claim:"Claim perk", claimed:"Perk claimed", already:"Already claimed", credit:"More credits needed.", full:"All places are taken.",
    unavailable:"Couldn’t load or update your wallet.", retry:"Try again", login:"Sign in to see your wallet.", draw:"This week’s draw", hash:"Published draw code", noDraw:"Draw details haven’t been published yet.",
    cap:"Session tickets are capped at 10 per week. Loop bonuses can add up to 2 more.", starter:"Starting credits", session_earned:"Study help given", session_spent:"Study help received", perk:"Perk redemption", admin:"Credit adjustment" },
  ko: { title:"내 지갑", balance:"도움 크레딧", tickets:"이번 주 티켓", minutes:"분", why:"티켓 적립 내역", history:"크레딧 내역",
    empty:"친구를 도와주고 함께 세션을 확인하면 첫 티켓을 받아요.", noEntries:"아직 크레딧 내역이 없어요.", pair:"새 친구", repeat:"반복 만남", rating:"평점 배수", base:"기본 티켓", session:"세션 보기",
    perks:"혜택", noPerks:"아직 이용할 수 있는 혜택이 없어요.", claim:"혜택 신청", claimed:"신청 완료", already:"이미 신청했어요", credit:"크레딧이 부족해요.", full:"정원이 찼어요.",
    unavailable:"지갑을 불러오거나 갱신하지 못했어요.", retry:"다시 시도", login:"지갑을 보려면 로그인해 주세요.", draw:"이번 주 추첨", hash:"공개된 추첨 코드", noDraw:"아직 추첨 정보가 없어요.",
    cap:"세션 티켓은 주당 최대 10장이고, 루프 보너스로 최대 2장을 더 받을 수 있어요.", starter:"시작 크레딧", session_earned:"도움 제공", session_spent:"도움 받음", perk:"혜택 사용", admin:"크레딧 조정" }
};
type Wallet = Awaited<ReturnType<typeof getWallet>>;
type Perk = { id:string; title:string; department:string|null; host_label:string; cost_minutes:number; claimed:boolean };

export function WalletScreen({ wallet, perks = [], gate }: { wallet?:Wallet; perks?:Perk[]; gate?:"login"|"unavailable" }) {
  const [language,setLanguage] = useLanguage();
  const t = words[language];
  const router = useRouter();
  const [feedback,action,pending] = useActionState(claimPerk,"");
  const loaded = !!wallet;
  useEffect(() => {
    if (!loaded) return;
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [loaded, router]);
  const date = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", { month:"short", day:"numeric", timeZone:"Asia/Seoul" });
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}><Link href="/" className={home.brand}>← HelpLoop</Link>
      <div className={home.language}><button aria-label="English" aria-pressed={language==="en"} onClick={()=>setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={language==="ko"} onClick={()=>setLanguage("ko")}>한국어</button></div></header></div>
    <div className={styles.body}><h1>{t.title}</h1>{gate && <p role="status">{t[gate]}</p>}
      {gate === "login" && <GoogleSignIn configured language={language} className={home.primary}/>}
      {gate === "unavailable" && <button onClick={()=>router.refresh()}>{t.retry}</button>}
      {wallet && <>
        <div className={styles.summary}><div><span>{t.balance}</span><strong>{wallet.balance} {t.minutes}</strong></div><div><span>{t.tickets}</span><strong>{wallet.weekTickets}</strong></div></div>
        <section><h2>{t.why}</h2>{wallet.breakdown.length === 0 && <p>{t.empty}</p>}
          {wallet.breakdown.map(b => <article key={b.sessionId}><div className={styles.row}><Link href={`/s/${b.sessionId}`}>{t.session}</Link><strong>{b.tickets} 🎟</strong></div>
            <p>{t.base} {b.base} · {b.newPair && <span>{t.pair} ×1.5 · </span>}{b.pairFactor !== 1 && <span>{t.repeat} ×{b.pairFactor} · </span>}{t.rating} ×{b.ratingFactor}</p></article>)}
          <small>{t.cap}</small></section>
        <section><h2>{t.history}</h2>{wallet.entries.length === 0 && <p>{t.noEntries}</p>}
          {wallet.entries.map((entry,i) => <article className={styles.row} key={i}><span>{date.format(new Date(entry.createdAt))} · {t[entry.reason]}</span>
          <strong>{entry.delta > 0 ? "+" : ""}{entry.delta} {t.minutes}</strong></article>)}</section>
        <section><h2>{t.perks}</h2>{perks.length === 0 && <p>{t.noPerks}</p>}
          {perks.map(p => <article key={p.id}><h3>{p.title}</h3><p>{[p.department,p.host_label].filter(Boolean).join(" · ")} · {p.cost_minutes} {t.minutes}</p>
            <form action={action}><button className={styles.claim} disabled={pending || p.claimed || p.cost_minutes > wallet.balance} name="perk" value={p.id}>{p.claimed ? t.already : t.claim}</button></form></article>)}
          {feedback && <p role="status">{t[feedback as keyof typeof t]}</p>}</section>
        <section><h2>{t.draw}</h2>{wallet.draw ? <><p>{wallet.draw.prizes.map(p=>p.label).join(" · ")}</p><small>{t.hash}</small><code>{wallet.draw.commitHash}</code></> : <p>{t.noDraw}</p>}</section>
      </>}
    </div></main>;
}
