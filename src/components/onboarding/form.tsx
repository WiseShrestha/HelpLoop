"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useLanguage } from "@/components/locale";
import { GoogleSignIn } from "@/components/google-sign-in";
import { saveOnboarding } from "@/server/onboarding";
import type { Offering } from "@/lib/onboarding";
import { onboardingCopy } from "./copy";
import home from "@/components/home/home.module.css";
import styles from "./onboarding.module.css";
import logo from "@/components/home/assets/loop-mark.png";
import notebooks from "@/components/home/assets/notebook-loop.png";

type Initial = { display_name: string; entry_year: number; department: string; bio: string | null; help_courses: string[] };
const publicFields = ["display_name", "entry_year", "department", "bio"] as const;
const privateFields = ["real_name", "student_no", "kaist_email"] as const;

export function OnboardingScreen({ configured, unavailable = false, offerings, initial, email = "" }: {
  configured: boolean; unavailable?: boolean; offerings?: Offering[]; initial?: Initial; email?: string;
}) {
  const [language, setLanguage] = useLanguage();
  const t = onboardingCopy[language];
  const [state, action, pending] = useActionState(saveOnboarding, {});
  const [values, setValues] = useState({ display_name: initial?.display_name ?? "", entry_year: String(initial?.entry_year ?? ""),
    department: initial?.department === "undeclared" ? "" : initial?.department ?? "", bio: initial?.bio ?? "",
    real_name: "", student_no: "", kaist_email: email });
  const [selected, setSelected] = useState(initial?.help_courses ?? []);
  const [agreements, setAgreements] = useState({ integrity: false, consent: false });
  useEffect(() => {
    if (state.error) document.getElementById(state.field ?? "onboarding-message")?.focus();
  }, [state]);
  const fieldLabel = state.field && state.field in t ? t[state.field as keyof typeof t] : "";
  return <main className={`${home.app} ${styles.page}`} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}>
      <Link className={home.brand} href="/"><Image src={logo} alt="" width={42} height={28} /><span><strong>HelpLoop</strong><span>{t.subtitle}</span></span></Link>
      <div className={home.language} role="group" aria-label={t.language}>
        <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </header></div>
    <div className={styles.layout}>
      <section className={styles.intro}><span className={styles.badge}>{t.badge}</span><h1>{t.title}</h1><p>{t.intro}</p>
        <Image src={notebooks} alt="" width={300} height={200} priority /><p className={styles.grant}>{t.grant}</p>
      </section>
      {offerings ? <form action={action} className={styles.form} noValidate aria-busy={pending} onReset={event => event.preventDefault()}>
        <fieldset disabled={pending} className={styles.controls}>
          {[publicFields, privateFields].map((fields, section) => <section className={styles.section} key={section}>
            <h2><span>0{section + 1}</span>{section === 0 ? t.publicTitle : t.privateTitle}</h2>
            <p>{section === 0 ? t.publicNote : t.privateNote}</p>
            <div className={styles.grid}>{fields.map(name => <label className={name === "bio" ? styles.full : undefined} key={name} htmlFor={name}>
              <span>{t[name]}{["department", "bio"].includes(name) && <small> · {t.optional}</small>}</span>
              <input id={name} name={name} value={values[name]} onChange={e => setValues(v => ({ ...v, [name]: e.target.value }))}
                type={name === "entry_year" ? "number" : name === "kaist_email" ? "email" : "text"}
                inputMode={name === "student_no" || name === "entry_year" ? "numeric" : undefined}
                min={name === "entry_year" ? 2000 : undefined} max={name === "entry_year" ? 2030 : undefined}
                maxLength={name === "display_name" ? 20 : name === "real_name" ? 40 : name === "student_no" ? 8 : name === "department" ? 80 : name === "bio" ? 200 : undefined}
                autoComplete={name === "real_name" ? "name" : name === "kaist_email" ? "email" : "off"}
                placeholder={name === "department" ? t.undeclared : name === "bio" ? t.bioHint : name === "kaist_email" ? "you@kaist.ac.kr" : undefined}
                required={!["department", "bio"].includes(name)} aria-invalid={state.field === name || undefined}
                aria-describedby={state.field === name ? "onboarding-message" : undefined} />
            </label>)}</div>
          </section>)}
          <section className={styles.section} id="help_courses" tabIndex={-1}><h2><span>03</span>{t.offeringsTitle}</h2><p>{t.offeringsNote}</p>
            {["course", "language", "skill"].map((kind, index) => <fieldset className={styles.topics} key={kind}>
              <legend>{t.groups[index]}</legend><div className={styles.chips}>
                {offerings.filter(item => item.kind === kind).map(item => <label key={item.code}>
                  <input type="checkbox" name="help_courses" value={item.code} checked={selected.includes(item.code)}
                    onChange={e => setSelected(list => e.target.checked ? [...list, item.code] : list.filter(code => code !== item.code))} />
                  <span>{language === "ko" ? item.name_ko : item.name_en}</span>
                </label>)}
                {!offerings.some(item => item.kind === kind) && <p>{t.empty}</p>}
              </div>
            </fieldset>)}
            <small>{selected.length} {t.selected}</small>
          </section>
          <section className={styles.agreements}><p>{t.houseRule}</p>
            {(["integrity", "consent"] as const).map(name => <label key={name}>
              <input id={name} type="checkbox" name={name} required checked={agreements[name]}
                onChange={e => setAgreements(v => ({ ...v, [name]: e.target.checked }))} aria-invalid={state.field === name || undefined} />
              <span>{t[name === "integrity" ? "integrityLabel" : "consentLabel"]}</span>
            </label>)}
          </section>
        </fieldset>
        <div id="onboarding-message" tabIndex={-1} aria-live="polite" className={styles.message}>
          {state.error && <p role="alert">{state.error === "invalid" ? `${t.invalid} ${fieldLabel}` : t[state.error]}</p>}
        </div>
        <button className={`${home.primary} ${styles.submit}`} type="submit" disabled={pending}>{pending ? t.saving : t.submit}<span aria-hidden="true">→</span></button>
      </form> : <section className={styles.gate}>
        <h2>{unavailable ? t.loadError : t.signIn}</h2>
        {unavailable ? <Link href="/onboarding">{t.retry}</Link> : <GoogleSignIn configured={configured} language={language} className={home.primary} />}
      </section>}
    </div>
  </main>;
}
