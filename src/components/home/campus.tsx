"use client";

import { useState } from "react";
import styles from "./home.module.css";

type Language = "en" | "ko";
export type CampusPanel = "practice" | "books" | "trust";
export const campusCopy = {
  en: {
    heading: "Find your study loop.", intro: "KAIST peers, shared languages, familiar places.",
    languageTitle: "Understand it in your language.", languageBody: "Ask a senior to explain a concept in the language that helps it click.",
    languages: "Kazakh · Uzbek · Hindi · Bengali · and more", languageAction: "Choose a language & place",
    practiceTitle: "A little English, out loud.", practiceBody: "Practice speaking with a KAIST peer for class discussions, presentations, or everyday conversation.", practiceAction: "Explore speaking practice",
    trustAction: "How do I choose a helper?", booksAction: "Book exchange · planned",
    preferences: "Explore a request", preferredLanguage: "Teaching language", spot: "Study spot", otherLanguage: "Your preferred language", otherSpot: "Another public place",
    spotNames: ["Library, 2F", "E11 Lounge", "Student Center common area", "Online", "Another public place"],
    previewNote: "Preview only. These choices are not saved and no request is posted yet.",
    practiceHeading: "English speaking practice", practiceDetail: "Find a senior or classmate to rehearse a presentation, join a course discussion, or build speaking confidence. Peer practice does not award course credit.",
    trustHeading: "Know who you’re learning with.", trustDetail: "Helpers will choose the specific topics they can explain and the languages they teach in. Look at topic knowledge, supporting evidence, and feedback together.",
    evidenceTitle: "Evidence, with a clear status", evidenceBody: "Planned evidence includes KAIST quiz results and eligible international or national Olympiad results. A submitted claim stays self-reported until reviewed. A score or award alone does not guarantee teaching quality.",
    eligible: "Olympiad evidence will be limited to IMO, IChO, IPhO, IOI, IBO, IMChO, IOAA, EuPhO, APhO, APMO, and their national-level counterparts.",
    feedback: "After each session: rate the explanation, record what you covered, and flag an incorrect explanation for review. Evidence review and reporting are planned; they are not available in this preview.",
    booksHeading: "Give a textbook its next chapter.", booksBody: "A KAIST book resale space is planned: find books by course or ISBN, compare condition and price, and arrange a handoff at a public campus spot.", booksNote: "No listings or payments are available yet. Book sales will be separate from study-help credits.",
  },
  ko: {
    heading: "나에게 맞는 배움의 연결.", intro: "KAIST 친구들과, 편한 언어로, 익숙한 장소에서.",
    languageTitle: "익숙한 언어로 이해해요.", languageBody: "이해가 잘 되는 언어로 선배에게 개념 설명을 부탁해 보세요.",
    languages: "카자흐어 · 우즈베크어 · 힌디어 · 벵골어 등", languageAction: "언어와 장소 선택하기",
    practiceTitle: "영어, 함께 말해 봐요.", practiceBody: "KAIST 친구와 수업 토론, 발표, 일상 대화를 연습해요.", practiceAction: "영어 말하기 연습 살펴보기",
    trustAction: "어떤 도우미를 선택할까요?", booksAction: "중고 교재 거래 · 준비 중",
    preferences: "요청 미리 보기", preferredLanguage: "설명받고 싶은 언어", spot: "공부 장소", otherLanguage: "원하는 언어", otherSpot: "다른 공개 장소",
    spotNames: ["도서관 2층", "E11 라운지", "학생회관 공용 공간", "온라인", "다른 공개 장소"],
    previewNote: "미리 보기예요. 선택한 내용은 저장되지 않으며 요청도 아직 등록되지 않아요.",
    practiceHeading: "영어 말하기 연습", practiceDetail: "선배나 친구와 발표, 수업 토론, 일상 대화를 연습해요. 친구와의 연습으로 수업 학점이 부여되지는 않아요.",
    trustHeading: "누구와 배우는지 알아봐요.", trustDetail: "도우미가 설명할 수 있는 세부 주제와 언어를 선택하게 할 예정이에요. 주제별 이해도, 증빙 자료, 세션 후기를 함께 살펴보세요.",
    evidenceTitle: "증빙 자료와 확인 상태", evidenceBody: "KAIST 퀴즈 성적과 해당 국제·국가 수준 올림피아드 실적을 증빙으로 받는 기능을 계획하고 있어요. 검토 전에는 본인 제출 정보로 표시해요. 성적이나 수상만으로 설명의 정확성을 보장할 수는 없어요.",
    eligible: "올림피아드 증빙 대상: IMO, IChO, IPhO, IOI, IBO, IMChO, IOAA, EuPhO, APhO, APMO 및 해당 국가 수준 대회.",
    feedback: "세션 후 설명을 평가하고 배운 내용을 기록하며, 잘못된 설명은 검토를 요청할 수 있도록 할 예정이에요. 증빙 검토와 신고 기능은 아직 제공되지 않아요.",
    booksHeading: "교재의 다음 주인을 만나요.", booksBody: "과목이나 ISBN으로 교재를 찾고, 상태와 가격을 비교해 공개된 교내 장소에서 거래하는 KAIST 중고 교재 공간을 준비하고 있어요.", booksNote: "아직 판매글이나 결제 기능은 없어요. 교재 거래는 공부 도움 크레딧과 별개로 운영할 예정이에요.",
  },
} as const;

export function CampusExplore({ language, onAsk, onOpen }: {
  language: Language; onAsk: () => void; onOpen: (panel: CampusPanel) => void;
}) {
  const t = campusCopy[language];
  return <section className={styles.campus} aria-labelledby="campus-heading">
    <h2 id="campus-heading">{t.heading}</h2><p>{t.intro}</p>
    <div className={styles.campusGrid}>
      <article><h3>{t.languageTitle}</h3><p>{t.languageBody}</p><p className={styles.languageExamples}>{t.languages}</p>
        <button type="button" onClick={onAsk}>{t.languageAction}</button></article>
      <article><h3>{t.practiceTitle}</h3><p>{t.practiceBody}</p><button type="button" onClick={() => onOpen("practice")}>{t.practiceAction}</button></article>
    </div>
    <div className={styles.campusLinks}><button type="button" onClick={() => onOpen("trust")}>{t.trustAction}</button><button type="button" onClick={() => onOpen("books")}>{t.booksAction}</button></div>
  </section>;
}

export function StudyPreferences({ language, practice = false }: { language: Language; practice?: boolean }) {
  const t = campusCopy[language];
  const [teachingLanguage, setTeachingLanguage] = useState(practice ? "en" : "hi");
  const [spot, setSpot] = useState("library");
  return <fieldset className={styles.preferences}>
    <legend>{t.preferences}</legend>
    <label>{t.preferredLanguage}<select value={teachingLanguage} onChange={e => setTeachingLanguage(e.target.value)} disabled={practice}>
      <option value="kk">{language === "en" ? "Kazakh" : "카자흐어"} · Қазақша</option>
      <option value="uz">{language === "en" ? "Uzbek" : "우즈베크어"} · O‘zbekcha</option>
      <option value="hi">{language === "en" ? "Hindi" : "힌디어"} · हिन्दी</option>
      <option value="bn">{language === "en" ? "Bengali" : "벵골어"} · বাংলা</option>
      <option value="en">English</option><option value="ko">한국어</option>
      <option value="other">{language === "en" ? "Another language" : "다른 언어"}</option>
    </select></label>
    {teachingLanguage === "other" && <label>{t.otherLanguage}<input type="text" maxLength={80} autoComplete="off" /></label>}
    <label>{t.spot}<select value={spot} onChange={e => setSpot(e.target.value)}>
      {["library", "e11", "center", "online", "other"].map((id, i) => <option key={id} value={id}>{t.spotNames[i]}</option>)}
    </select></label>
    {spot === "other" && <label>{t.otherSpot}<input type="text" maxLength={160} autoComplete="off" /></label>}
    <p className={styles.previewNote}>{t.previewNote}</p>
  </fieldset>;
}

export function CampusDetails({ language, panel }: { language: Language; panel: CampusPanel }) {
  const t = campusCopy[language];
  if (panel === "practice") return <><p>{t.practiceDetail}</p><StudyPreferences language={language} practice /></>;
  if (panel === "books") return <><p>{t.booksBody}</p><p className={styles.previewNote}>{t.booksNote}</p></>;
  return <div className={styles.evidence}><p>{t.trustDetail}</p><h3>{t.evidenceTitle}</h3><p>{t.evidenceBody}</p><p>{t.eligible}</p><p>{t.feedback}</p></div>;
}
