"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { postRequest } from "@/app/(app)/ask/actions";
import { GoogleSignIn } from "@/components/google-sign-in";
import { copy as homeCopy } from "@/components/home/copy";
import home from "@/components/home/home.module.css";
import { useLanguage, type Language } from "@/components/locale";
import { durations, offeringKinds, type AskState, type Offering, type TopicTag } from "@/lib/ask";
import { canAsk, CREDIT_RULES } from "@/lib/model/ledger";
import { askCopy } from "./copy";
import styles from "./ask.module.css";

type AskData = { courses: Offering[]; tags: TopicTag[]; balance: number; reserved: number };

export function AskScreen({ configured, data, unavailable }: { configured: boolean; data?: AskData; unavailable?: boolean }) {
  const [language, setLanguage] = useLanguage();
  const router = useRouter();
  const [state, action, pending] = useActionState(postRequest, {});
  const t = askCopy[language];

  useEffect(() => {
    if (state.error || state.postedId) {
      document.getElementById(state.field ? `ask-${state.field}` : "ask-feedback")?.focus();
    }
  }, [state]);

  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={`${home.masthead} ${styles.header}`}>
      <Link className={home.brand} href="/" aria-label={t.back}><strong>HelpLoop</strong></Link>
      <div className={home.language} role="group" aria-label={t.language}>
        <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
        <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </header></div>
    <div className={styles.layout}>
      <h1>{t.title}</h1>
      {data ? <>
        <p>{t.intro}</p>
        <div id="ask-feedback" tabIndex={-1} className={styles.feedback}>
          {state.error ? <p role="alert">{state.error === "invalid"
            ? state.field === "deadline" ? t.futureDeadline : `${t.invalid} · ${state.field ? t.fields[state.field] : t.title}`
            : state.error === "credit" ? t.stale : t[state.error]}</p>
            : state.postedId && <p role="status">{t.posted}</p>}
        </div>
        <section className={styles.credit} aria-label={t.available}>
          <dl>
            <div><dt>{t.balance}</dt><dd>{data.balance} {t.minute}</dd></div>
            <div><dt>{t.reserved}</dt><dd>{data.reserved} {t.minute}</dd></div>
            <div><dt>{t.available}</dt><dd>{Math.max(0, data.balance - data.reserved + CREDIT_RULES.overdraftLimit)} {t.minute}</dd></div>
          </dl>
          <small>{t.limit}</small>
        </section>
        <RequestForm key={state.postedId ?? "first"} {...{ data, language, pending, action, state }} />
      </> : <div className={styles.gate}>
        <p>{unavailable ? t.unavailable : t.signIn}</p>
        {unavailable ? <button type="button" className={home.primary} onClick={() => router.refresh()}>{t.retry}</button>
          : <GoogleSignIn configured={configured} language={language} className={home.primary} />}
      </div>}
    </div>
  </main>;
}

function RequestForm({ data, language, pending, action, state }: {
  data: AskData; language: Language; pending: boolean; action: (form: FormData) => void; state: AskState;
}) {
  const [course, setCourse] = useState("");
  const [minutes, setMinutes] = useState<(typeof durations)[number]>("30");
  const [place, setPlace] = useState("");
  const t = askCopy[language];
  const tags = data.tags.filter(tag => tag.course_code === course);
  const allowed = canAsk(data.balance, data.reserved, Number(minutes));
  const label = language === "ko" ? "name_ko" : "name_en";

  return <form className={styles.form} action={action} onReset={event => event.preventDefault()}>
    <fieldset className={styles.controls} disabled={pending} aria-busy={pending}>
      <label htmlFor="ask-course_code">{t.fields.course_code}</label>
      <select id="ask-course_code" name="course_code" required value={course}
        onChange={e => setCourse(e.target.value)} aria-invalid={state.field === "course_code" || undefined}>
        <option value="">{t.choose}</option>
        {offeringKinds.map(kind => <optgroup key={kind} label={t.groups[kind]}>
          {data.courses.filter(item => item.kind === kind).map(item => <option key={item.code} value={item.code}>{item[label]}</option>)}
        </optgroup>)}
      </select>

      <label htmlFor="ask-topic_tag">{t.fields.topic_tag}</label>
      <select key={course} id="ask-topic_tag" name="topic_tag" aria-invalid={state.field === "topic_tag" || undefined}>
        <option value="">{t.other}</option>
        {tags.map(tag => <option key={tag.tag} value={tag.tag}>{language === "ko" ? tag.label_ko : tag.label_en}</option>)}
      </select>

      <label htmlFor="ask-topic">{t.fields.topic}</label>
      <input id="ask-topic" name="topic" required maxLength={80} aria-invalid={state.field === "topic" || undefined} />

      <label htmlFor="ask-details">{t.fields.details}</label>
      <textarea id="ask-details" name="details" rows={3} maxLength={500} aria-invalid={state.field === "details" || undefined} />

      <label htmlFor="ask-minutes">{t.fields.minutes}</label>
      <select id="ask-minutes" name="minutes" value={minutes}
        onChange={e => setMinutes(e.target.value as typeof minutes)} aria-describedby={allowed ? undefined : "ask-overdraft"}>
        {durations.map(value => <option key={value} value={value}>{value} {t.minute}</option>)}
      </select>
      {!allowed && <p id="ask-overdraft" role="status" className={styles.warning}>{t.credit}</p>}

      <label htmlFor="ask-deadline">{t.fields.deadline}</label>
      <input id="ask-deadline" name="deadline" type="datetime-local" required aria-invalid={state.field === "deadline" || undefined} />

      <label htmlFor="ask-place">{t.fields.place}</label>
      <input id="ask-place" name="place" required maxLength={60} value={place}
        placeholder={t.placeHint} onChange={e => setPlace(e.target.value)} aria-invalid={state.field === "place" || undefined} />
      <div className={styles.spots}>
        {t.spots.map(spot => <button type="button" key={spot} onClick={() => setPlace(spot)}>{spot}</button>)}
      </div>

      <label className={styles.anonymous}>
        <input id="ask-is_anonymous" name="is_anonymous" type="checkbox" aria-describedby="ask-privacy" />
        <span>{t.fields.is_anonymous}<small id="ask-privacy">{t.anonymous}</small></span>
      </label>
      <p className={styles.rule}>{homeCopy[language].houseRule}</p>
      <button className={home.primary} type="submit" disabled={!allowed || pending}>{pending ? t.saving : t.submit}</button>
    </fieldset>
  </form>;
}
