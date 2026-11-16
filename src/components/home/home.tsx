"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useLanguage } from "@/components/locale";
import { copy } from "./copy";
import styles from "./home.module.css";
import logo from "./assets/loop-mark.png";
import notebooks from "./assets/notebook-loop.png";
import google from "./assets/google.svg";
import clock from "./assets/icons/clock.svg";
import people from "./assets/icons/people.svg";
import home from "./assets/icons/home.svg";
import wallet from "./assets/icons/wallet.svg";
import profile from "./assets/icons/profile.svg";
import chevron from "./assets/icons/chevron.svg";
import plus from "./assets/icons/plus.svg";
import close from "./assets/icons/close.svg";
import book from "./assets/icons/book.svg";

type Panel = "request" | "ask" | "wallet" | "profile" | null;

export function HomeScreen({ configured, authError = false, onboarding = false }: {
  configured: boolean; authError?: boolean; onboarding?: boolean;
}) {
  const [language, setLanguage] = useLanguage();
  const t = copy[language];
  const [tab, setTab] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [request, setRequest] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!panel) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; };
  }, [panel]);
  useEffect(() => {
    document.title = language === "ko" ? "HelpLoop | 공부품앗이" : "HelpLoop | Study together";
  }, [language]);

  function openRequest(index: number) { setRequest(index); setPanel("request"); }
  const auth = (label = t.signIn as string, variant = styles.googleButton) => <GoogleSignIn configured={configured} language={language} label={label} className={variant} />;
  const icon = (src: string, size = 22) => <Image src={src} alt="" width={size} height={size} className={styles.icon} />;
  const panelTitle = panel === "request" ? t.topics[request] : panel === "ask" ? t.askTitle : panel === "wallet" ? t.walletTitle : t.profileTitle;
  const languageControl = <div className={styles.language} role="group" aria-label={t.language}>
    <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
    <button type="button" lang="ko" aria-label="한국어" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
  </div>;

  return (
    <main className={styles.app} lang={language}>
      <a href="#help-feed" className={styles.skip}>{t.skip}</a>
      <header className={styles.masthead}>
        <Link className={styles.brand} href="/" aria-label="HelpLoop">
          <Image src={logo} alt="" width={44} height={44} priority />
          <span><strong>HelpLoop</strong><span>{t.brand}</span></span>
        </Link>
        {!onboarding && <nav aria-label={t.navigation} className={styles.navigation}>
          {t.nav.map((label, i) => <button key={i} type="button" aria-current={i === 0 && !panel ? "page" : undefined}
            onClick={() => i === 0 ? (setTab(0), window.scrollTo({ top: 0, behavior: "smooth" })) : setPanel(i === 1 ? "wallet" : "profile")}>
            {icon([home, wallet, profile][i], 25)}<span>{label}</span>
          </button>)}
        </nav>}
        {languageControl}
        {!onboarding && <button type="button" className={styles.account} aria-label={t.account} onClick={() => setPanel("profile")}>{icon(profile)}</button>}
      </header>

      {onboarding ? <section className={styles.onboarding}>
        <Image src={notebooks} alt="" width={260} height={174} priority />
        <h1>{t.onboardingTitle}</h1><p>{t.onboardingBody}</p>
      </section> : <div className={styles.layout}>
        <section className={styles.hero} aria-labelledby="home-heading">
          <h1 id="home-heading">{t.hero[0]}<br />{t.hero[1]}</h1>
          <p>{t.subtitle}</p>
          <Image className={styles.heroArt} src={notebooks} alt="" width={300} height={200} priority sizes="(min-width: 800px) 300px, 160px" />
        </section>
        <button type="button" className={styles.credits} onClick={() => setPanel("wallet")} aria-label={t.creditLabel}>
          {icon(clock, 28)}<span className={styles.balance}><strong>{language === "ko" ? "60분" : "60 min"}</strong><span>{t.credits}</span></span>
          <span className={styles.creditRule}>{t.creditRule[0]}<br />{t.creditRule[1]}</span>
          <span className={styles.demo}>{t.demo}</span>
        </button>
        <section className={styles.workbench} id="help-feed" tabIndex={-1}>
          <div className={styles.tabs} role="tablist" aria-label={language === "en" ? "Study exchange" : "공부품앗이"}>
            {t.tabs.map((label, i) => <button type="button" key={i} ref={el => { tabs.current[i] = el; }}
              role="tab" id={`tab-${i}`} aria-controls="home-panel" aria-selected={tab === i} tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)} onKeyDown={e => {
                const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : null;
                if (next !== null) { e.preventDefault(); setTab(next); tabs.current[next]?.focus(); }
              }}>{label}</button>)}
          </div>
          {authError && <p className={styles.error} role="alert">{t.authError}</p>}
          <div id="home-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.tabPanel}>
            {tab === 0 ? <>
              <div className={styles.feedHeading}><h2>{t.feed}</h2><button type="button" className={styles.ask} onClick={() => setPanel("ask")}>{t.ask}{icon(plus, 17)}</button></div>
              <article className={styles.request}>
                <span className={styles.course}>{t.courses[0]}</span><h3>{t.topics[0]}</h3><p className={styles.meta}>{t.places[0]}</p>
                <div className={styles.person}><span className={styles.avatar} aria-hidden="true">M</span><span>{t.person}</span></div>
                <div className={styles.reasons}><span>{icon(clock, 17)}{t.due}</span><span>{icon(people, 18)}{t.newPerson}</span></div>
                <button type="button" className={styles.help} onClick={() => openRequest(0)}>{t.help}</button>
              </article>
              <article className={styles.secondaryRequest}>
                <span className={styles.course}>{t.courses[1]}</span>
                <h3><button type="button" onClick={() => openRequest(1)} aria-label={`${t.openRequest}: ${t.topics[1]}`}>{t.topics[1]}{icon(chevron, 25)}</button></h3>
                <p className={styles.meta}>{t.places[1]}</p>
              </article><p className={styles.sample}>{t.sample}</p>
            </> : <div className={styles.empty}>
              {icon(book, 38)}<h2>{tab === 1 ? t.requestEmpty : t.sessionEmpty}</h2><p>{tab === 1 ? t.requestEmptyBody : t.sessionEmptyBody}</p>
              <button type="button" className={styles.help} onClick={() => tab === 1 ? setPanel("ask") : setTab(0)}>{tab === 1 ? t.ask : t.browse}</button>
            </div>}
          </div>
        </section>
        <aside className={styles.join}>
          <h2>{t.welcome}</h2><p>{t.welcomeBody}</p>
          <div className={styles.googleEntry}><Image src={google} alt="" width={20} height={20} />{auth()}</div>
          <p className={styles.houseRule}>{t.houseRule}</p><p className={styles.safety}>{t.safety}</p>
        </aside>
      </div>}

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="dialog-heading" onClose={() => setPanel(null)}
        onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogBody}>
          <div className={styles.dialogLanguage}>{languageControl}</div>
          <button type="button" className={styles.close} aria-label={t.close} onClick={() => dialog.current?.close()}>{icon(close)}</button>
          {panel === "request" && <span className={styles.course}>{t.courses[request]}</span>}
          <h2 id="dialog-heading">{panelTitle}</h2>
          <p>{panel === "request" ? t.detail : panel === "ask" ? t.askBody : panel === "wallet" ? t.walletBody : t.profileBody}</p>
          {panel === "request" && <><p className={styles.dialogPlace}>{icon(clock)}{t.places[request]}</p><p className={styles.sample}>{t.requestNote}</p></>}
          <p className={styles.houseRule}>{t.houseRule}</p>
          {auth(panel === "request" ? t.signInToHelp : panel === "ask" ? t.signInToAsk : t.signIn, styles.help)}
        </div>
      </dialog>
    </main>
  );
}
