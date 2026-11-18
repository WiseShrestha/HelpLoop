"use client";

import { useEffect, useState } from "react";
import type { HelpFeedCard } from "@/server/helpFeed";
import type { Language } from "@/components/locale";
import { askCopy } from "@/components/ask/copy";
import { offeringKinds } from "@/lib/ask";
import styles from "./live-feed.module.css";

export function LiveFeed({ language }: { language: Language }) {
  const ko = language === "ko";
  const [cards, setCards] = useState<HelpFeedCard[] | null>(null);
  const [now, setNow] = useState(0);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState("all");

  useEffect(() => {
    let pending: AbortController | null = null;
    async function load() {
      if (document.hidden || pending) return;
      const controller = new AbortController();
      pending = controller;
      try {
        const res = await fetch("/api/help-feed", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Feed unavailable");
        const data: HelpFeedCard[] = await res.json();
        if (!controller.signal.aborted) { setNow(Date.now()); setCards(data); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) { setCards(null); setFailed(true); }
      } finally { pending = null; }
    }
    void load();
    const timer = window.setInterval(load, 15000);
    document.addEventListener("visibilitychange", load);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", load); pending?.abort(); };
  }, []);

  const filtered = cards?.filter(card => (kind === "all" || kind === card.course.kind) && Date.parse(card.deadline) > now);
  return <div className={styles.feed}>
    <div className={styles.filters} role="group" aria-label={ko ? "요청 종류" : "Request type"}>
      {(["all", ...offeringKinds] as const).map(key => <button type="button" key={key} aria-pressed={kind === key} onClick={() => setKind(key)}>
        {key === "all" ? ko ? "전체" : "All" : askCopy[language].groups[key]}
      </button>)}
    </div>
    {failed ? <p role="status">{ko ? "요청을 불러오지 못했어요. 잠시 후 자동으로 다시 시도해요." : "Couldn’t load requests. We’ll retry shortly."}</p>
      : !filtered ? <p role="status">{ko ? "요청을 불러오는 중…" : "Loading requests…"}</p>
      : !filtered.length ? <p role="status">{ko ? "내 도움 주제에 맞는 열린 요청이 아직 없어요." : "No open requests match your help topics here yet."}</p>
      : filtered.map(card => {
        const due = Math.ceil((Date.parse(card.deadline) - now) / 3600000);
        const waiting = Math.max(0, Math.floor((now - Date.parse(card.createdAt)) / 3600000));
        return <article className={styles.card} key={card.id}>
          <span>{ko ? card.course.name_ko : card.course.name_en}</span><h3>{card.topic}</h3>
          <p>{card.name ?? (ko ? "익명의 친구" : "A classmate")} · {card.minutes}{ko ? "분" : " min"} · {card.place}</p>
          <ul><li>{ko ? `마감까지 ${due}시간 이내` : `Due within ${due}h`}</li>
            {waiting > 0 && <li>{ko ? `${waiting}시간 대기` : `Waiting ${waiting}h`}</li>}
            {card.newConnection && <li>{ko ? "새 친구" : "New connection"}</li>}
            {card.exchange && <li>{ko ? "언어 교환" : "Language exchange"}</li>}
          </ul>
          {card.details && <details><summary>{ko ? "요청 내용" : "Request details"}</summary><p>{card.details}</p></details>}
        </article>;
      })}
  </div>;
}
