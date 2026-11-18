"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useLanguage } from "@/components/locale";
import { LiveFeed } from "./live-feed";
import { copy } from "./copy";
import { CampusExplore, CampusDetails, StudyPreferences, campusCopy, type CampusPanel } from "./campus";
import styles from "./home.module.css";
import logo from "./assets/loop-mark.png";
import notebooks from "./assets/notebook-loop.png";
import google from "./assets/google.svg";
import clock from "./assets/icons/clock.svg";
import home from "./assets/icons/home.svg";
import wallet from "./assets/icons/wallet.svg";
import profile from "./assets/icons/profile.svg";
import chevron from "./assets/icons/chevron.svg";
import plus from "./assets/icons/plus.svg";
import close from "./assets/icons/close.svg";
import calendar from "./assets/icons/calendar.svg";
import location from "./assets/icons/location.svg";
import connection from "./assets/icons/connection.svg";
import arrow from "./assets/icons/arrow.svg";

type Panel = "request" | "session" | "ask" | "wallet" | CampusPanel | null;

export function HomeScreen({ configured, balance, signedIn = false, ownRequests = null, sessions = null, authError = false, onboarding = false, exampleSessionAt = "2026-11-18T05:00:00Z" }: {
  balance?: number | null; sessions?: { id: string; scheduled_at: string; place: string }[] | null; ownRequests?: { id: string; topic: string }[] | null; configured: boolean; signedIn?: boolean; authError?: boolean; onboarding?: boolean; exampleSessionAt?: string;
}) {
  const [language, setLanguage] = useLanguage();
  const t = copy[language];
  const [tab, setTab] = useState(2);
  const [panel, setPanel] = useState<Panel>(null);
  const creditMinutes = signedIn ? balance ?? "—" : 60;
  const [request, setRequest] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sampleDate = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", {
    timeZone: "Asia/Seoul", weekday: "short", month: "short", day: "numeric",
  }).format(new Date(exampleSessionAt));

  useEffect(() => {
    if (!panel) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; };
  }, [panel]);
  useEffect(() => { document.title = language === "ko" ? "HelpLoop | 공부품앗이" : "HelpLoop | Study together"; }, [language]);

  function openRequest(index: number) { setRequest(index); setPanel("request"); }
  const auth = (label = t.signIn as string, variant = styles.googleButton) => signedIn ? null : <GoogleSignIn configured={configured} language={language} label={label} className={variant} />;
  const icon = (src: string, size = 22) => <Image src={src} alt="" width={size} height={size} className={styles.icon} />;
  const c = campusCopy[language];
  const panelTitle = panel === "practice" ? c.practiceHeading : panel === "books" ? c.booksHeading : panel === "trust" ? c.trustHeading : panel === "session" ? t.sessionTopic : panel === "request" ? t.topics[request] : panel === "ask" ? t.askTitle : t.walletTitle;
  const languageControl = <div className={styles.language} role="group" aria-label={t.language}>
    <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
    <button type="button" lang="ko" aria-label="한국어" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
  </div>;

  return (
    <main className={styles.app} lang={language}>
      <a href="#help-feed" className={styles.skip}>{t.skip}</a>
      <div className={styles.darkSurface}>
        <header className={styles.masthead}>
          <Link className={styles.brand} href="/" aria-label="HelpLoop">
            <Image src={logo} alt="" width={42} height={28} priority />
            <span><strong>HelpLoop</strong><span>{t.brand}</span></span>
          </Link>
          {!onboarding && <nav aria-label={t.navigation} className={styles.navigation}>
            {t.nav.map((label, i) => i === 1 && signedIn ? <Link key={label} href="/wallet">{icon(wallet, 24)}<span>{label}</span></Link> : i === 2 ? <Link key={label} href="/profile">{icon(profile, 24)}<span>{label}</span></Link> : <button key={i} type="button" aria-current={i === 0 && !panel ? "page" : undefined}
              onClick={() => i === 0 ? (setTab(2), window.scrollTo({ top: 0, behavior: "smooth" })) : setPanel("wallet")}>
              {icon([home, wallet, profile][i], 24)}<span>{label}</span>
            </button>)}
          </nav>}
          {languageControl}
          {!onboarding && <Link className={styles.account} aria-label={t.account} href="/profile">{icon(profile)}</Link>}
        </header>

        {onboarding ? <section className={styles.onboarding}>
          <Image src={notebooks} alt="" width={260} height={174} priority />
          <h1>{t.onboardingTitle}</h1><p>{t.onboardingBody}</p>
          <p className={styles.houseRule}>{t.houseRule}</p>
        </section> : <div className={styles.darkLayout}>
          <section className={styles.hero} aria-labelledby="home-heading">
            <h1 id="home-heading">{t.hero.map((line, i) => <span key={i}>{line}</span>)}</h1>
            <p>{t.subtitle}</p>
            {signedIn ? <Link className={styles.credits} href="/wallet"><strong>{creditMinutes}{language === "ko" ? "분" : " min"}</strong><span>{t.credits}</span></Link> : <button type="button" className={styles.credits} onClick={() => setPanel("wallet")} aria-label={signedIn ? t.walletTitle : t.creditLabel}>
              <strong>{creditMinutes}{language === "ko" ? "분" : " min"}</strong><span>{t.credits}</span>
            </button>}
            <Image className={styles.heroArt} src={notebooks} alt="" width={300} height={200} priority sizes="(min-width: 900px) 280px, 170px" />
          </section>
          <section className={styles.workbench}>
            {signedIn && <div className={styles.signedIn}>
              <span>{t.signedIn}</span><Link href="/ask">{t.ask}{icon(arrow, 18)}</Link>
            </div>}
            <div className={styles.tabs} role="tablist" aria-label={language === "en" ? "Study exchange" : "공부품앗이"}>
              {t.tabs.map((label, i) => <button type="button" key={i} ref={el => { tabs.current[i] = el; }}
                role="tab" id={"tab-" + i} aria-controls="home-panel" aria-selected={tab === i} tabIndex={tab === i ? 0 : -1}
                onClick={() => setTab(i)} onKeyDown={e => {
                  const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : null;
                  if (next !== null) { e.preventDefault(); setTab(next); tabs.current[next]?.focus(); }
                }}>{label}</button>)}
            </div>
            {authError && <p className={styles.error} role="alert">{t.authError}</p>}
            <div id="home-panel" role="tabpanel" aria-labelledby={"tab-" + tab} className={styles.tabPanel}>
              {tab === 2 && signedIn ? <section className={styles.session}><h2>{t.tabs[2]}</h2>
                {sessions?.length ? <ul>{sessions.map(s => <li key={s.id}><Link className="underline" href={`/s/${s.id}`}>
                  {new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(s.scheduled_at))} KST · {s.place}</Link></li>)}</ul>
                  : <p>{sessions ? t.sessionEmptyBody : language === "ko" ? "세션을 불러오지 못했어요." : "Couldn’t load sessions."}</p>}</section>
                : tab === 2 ? <section className={styles.session} aria-labelledby="session-title">
                <span className={styles.eyebrow}>{signedIn ? t.exampleSession : t.nextSession}</span>
                <h2 id="session-title">{t.courses[0]}</h2><p className={styles.sessionTopic}>{t.sessionTopic}</p>
                <div className={styles.partner}>
                  <div className={styles.pair} aria-hidden="true"><span>K</span>{icon(connection, 26)}<span>M</span></div>
                  <p>{t.withPartner}</p>
                </div>
                <div className={styles.sessionMeta}>
                  <div>{icon(calendar, 24)}<p><strong>{t.sessionTime}</strong><small><time dateTime={exampleSessionAt}>{sampleDate}</time> · {t.duration}</small></p></div>
                  <div>{icon(location, 24)}<p><strong>{t.sessionPlace}</strong><small>{t.publicPlace}</small></p></div>
                </div>
                <button type="button" className={styles.primary} onClick={() => setPanel("session")}>{t.viewSession}{icon(arrow, 24)}</button>
              </section> : tab === 0 && signedIn ? <section className={styles.empty}><h2>{t.feed}</h2><a href="#help-feed" className={styles.primary}>{t.browse}{icon(arrow, 24)}</a></section> : tab === 0 ? <section className={styles.highlightRequest}>
                <span className={styles.eyebrow}>{t.courses[0]}</span><h2>{t.topics[0]}</h2><p>{t.places[0]}</p>
                <p className={styles.matchedPerson}>{t.person}</p>
                <button type="button" className={styles.primary} onClick={() => openRequest(0)}>{t.help}{icon(arrow, 24)}</button>
              </section> : <section className={styles.empty}>
                {signedIn && ownRequests === null ? <p>{language === "ko" ? "내 요청을 불러오지 못했어요." : "Couldn’t load your requests."}</p>
                  : ownRequests?.length ? <><h2>{t.tabs[1]}</h2><ul>{ownRequests.map(row => <li key={row.id}><Link className="underline" href={`/r/${row.id}`}>{row.topic}</Link></li>)}</ul></>
                  : <><h2>{t.requestEmpty}</h2><p>{t.requestEmptyBody}</p></>}
                <Link className={styles.primary} href="/ask">{t.ask}{icon(arrow, 24)}</Link>
              </section>}
            </div>
          </section>
        </div>}
      </div>

      {!onboarding && <div className={styles.lightSurface}>
        <section className={styles.support} id="help-feed" tabIndex={-1}>
          {!signedIn && <p className={styles.sample}>{t.sample}</p>}
          <div className={styles.feedHeading}><h2>{t.feed}</h2><Link className={styles.ask} href="/ask">{t.ask}{icon(plus, 16)}</Link></div>
          {signedIn ? <LiveFeed language={language} /> : <div className={styles.requestList}>
            {[1, 2].map((index) => <article className={styles.requestRow} key={index}>
              <span className={styles.avatar} aria-hidden="true">{index === 1 ? "J" : "S"}</span>
              <div className={styles.requestCopy}><h3>{t.courses[index]}</h3><p>{t.topics[index]}</p><small>{t.places[index]}</small></div>
              <span className={styles.newPerson}>{t.newPerson}</span>
              <button type="button" className={styles.requestOpen} aria-label={t.openRequest + ": " + t.topics[index]} onClick={() => openRequest(index)}>{icon(chevron, 22)}</button>
            </article>)}
          </div>}
        </section>
        <CampusExplore language={language} onAsk={() => setPanel("ask")} onOpen={setPanel} />
        <aside className={styles.join}>
          {!signedIn && <div className={styles.googleEntry}><Image src={google} alt="" width={20} height={20} />{auth()}</div>}
          <p className={styles.houseRule}>{t.houseRule}</p><p className={styles.safety}>{t.safety}</p>
        </aside>
      </div>}

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="dialog-heading" onClose={() => setPanel(null)}
        onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogBody}>
          <div className={styles.dialogLanguage}>{languageControl}</div>
          <button type="button" className={styles.close} aria-label={t.close} onClick={() => dialog.current?.close()}>{icon(close)}</button>
          {(panel === "request" || panel === "session") && <span className={styles.course}>{t.courses[panel === "session" ? 0 : request]}</span>}
          <h2 id="dialog-heading">{panelTitle}</h2>
          {panel === "practice" || panel === "books" || panel === "trust" ? <CampusDetails language={language} panel={panel} /> : <p>{panel === "session" ? t.withPartner : panel === "request" ? t.detail : panel === "ask" ? t.askBody : t.walletBody}</p>}
          {panel === "ask" && <StudyPreferences language={language} />}
          {(panel === "request" || panel === "session") && <><p className={styles.dialogPlace}>{icon(clock)}{t.places[panel === "session" ? 0 : request]}</p>
            {panel === "session" && <p><time dateTime={exampleSessionAt}>{t.sessionTime} · {sampleDate}</time></p>}
            <p className={styles.sample}>{panel === "session" ? t.sessionNote : t.requestNote}</p></>}
          {panel !== "books" && <p className={styles.houseRule}>{t.houseRule}</p>}
          {panel === "ask" ? <Link className={styles.primary} href="/ask">{t.ask}</Link>
            : panel !== "books" && panel !== "trust" && auth(panel === "request" ? t.signInToHelp : t.signIn, styles.primary)}
        </div>
      </dialog>
    </main>
  );
}
