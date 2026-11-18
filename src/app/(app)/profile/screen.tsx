"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/locale";
import { onboardingCopy } from "@/components/onboarding/copy";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SignOut } from "@/components/sign-out";
import home from "@/components/home/home.module.css";
import styles from "./profile.module.css";

type Profile = { display_name: string; department: string; entry_year: number; bio: string | null; help_courses: string[] };
type Topic = { code: string; name_en: string; name_ko: string };

export function ProfileScreen({ configured, profile, topics = [], unavailable }: {
  configured: boolean; profile?: Profile; topics?: Topic[]; unavailable?: boolean;
}) {
  const [language, setLanguage] = useLanguage();
  const router = useRouter();
  const ko = language === "ko";
  const t = onboardingCopy[language];
  return <main className={home.app} lang={language}>
    <div className={home.darkSurface}><header className={home.masthead}>
      <Link href="/" className={home.brand}>← HelpLoop</Link>
      <div className={home.language} role="group" aria-label={t.language}>
        <button lang="en" aria-label="English" aria-pressed={!ko} onClick={() => setLanguage("en")}>EN</button>
        <button lang="ko" aria-pressed={ko} onClick={() => setLanguage("ko")}>한국어</button>
      </div>
    </header></div>
    <section className={styles.layout}>
      <h1>{ko ? "내 프로필" : "My profile"}</h1>
      {profile ? <>
        <article className={styles.card}>
          <h2>{profile.display_name}</h2>
          {profile.bio && <p>{profile.bio}</p>}
          <dl>
            <dt>{t.department}</dt><dd>{profile.department}</dd>
            <dt>{t.entry_year}</dt><dd>{profile.entry_year}</dd>
            <dt>{t.help_courses}</dt>
            <dd>{profile.help_courses.length ? <ul>{profile.help_courses.map(code => {
              const topic = topics.find(item => item.code === code);
              return <li key={code}>{topic ? topic[ko ? "name_ko" : "name_en"] : code}</li>;
            })}</ul> : ko ? "아직 선택한 주제가 없어요." : "No help topics selected yet."}</dd>
          </dl>
        </article>
        <SignOut language={language} className={home.primary} />
      </> : unavailable ? <><p role="alert">{t.loadError}</p><button className={home.primary} onClick={() => router.refresh()}>{t.retry}</button></>
        : <><p>{ko ? "내 프로필을 보려면 로그인해 주세요." : "Sign in to see your profile."}</p><GoogleSignIn configured={configured} language={language} className={home.primary} /></>}
    </section>
  </main>;
}
