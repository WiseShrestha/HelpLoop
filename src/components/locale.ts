"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Language = "en" | "ko";
const storageKey = "helploop.language";
const changeEvent = "helploop:language";
let fallback: Language = "en";
let storageBlocked = false;

function snapshot(): Language {
  if (storageBlocked) return fallback;
  try {
    return window.localStorage.getItem(storageKey) === "ko" ? "ko" : "en";
  } catch {
    storageBlocked = true;
    return fallback;
  }
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}

export function setLanguage(language: Language) {
  fallback = language;
  try { window.localStorage.setItem(storageKey, language); }
  catch { storageBlocked = true; }
  window.dispatchEvent(new Event(changeEvent));
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, snapshot, () => "en" as const);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return [language, setLanguage] as const;
}
