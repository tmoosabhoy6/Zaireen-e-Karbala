import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

export interface Item {
  id: string; kind: string; grp: string; sort: number; icon: string;
  t: Record<string, string>; l: Record<string, string> | null; data: Record<string, any>;
  missing: boolean; audience: string;
}
export interface Menu { date: string; hijri: string; lunch: string[]; dinner: string[]; image: string | null }
export interface Majlis { date: string; venue_en: string; venue_lud: string; time_en: string; time_lud: string; booklet: string | null }
export interface News { id: string; at: string; en: string; lud: string; media: string | null }
export interface Payload { today: string; items: Item[]; menu: Menu | null; majlis: Majlis | null; announcements: News[] }

interface State {
  lang: Lang;
  payload: Payload | null;
  /** True when the last fetch failed and saved content is being shown. */
  stale: boolean;
  failed: boolean;
  /** When content last arrived from the server (ms). */
  at: number | null;
  loading: boolean;
}

const LANG_KEY = "zk.lang";
const CACHE_KEY = "zk.content.v1";

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the page still works from memory */
  }
};

let state: State = { lang: read<Lang>(LANG_KEY) === "lud" ? "lud" : "en", payload: read<Payload>(CACHE_KEY), stale: false, failed: false, at: read<number>("zk.content.at"), loading: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

function applyLang(lang: Lang) {
  document.documentElement.lang = lang === "lud" ? "ar" : "en";
  document.documentElement.dir = lang === "lud" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = lang;
}
applyLang(state.lang);

export function setLang(lang: Lang) {
  write(LANG_KEY, lang);
  applyLang(lang);
  set({ lang });
}

let inflight: Promise<void> | null = null;
export function refresh(): Promise<void> {
  inflight ??= (async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/content", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as Payload;
      write(CACHE_KEY, payload);
      write("zk.content.at", Date.now());
      set({ payload, stale: false, failed: false, at: Date.now() });
    } catch {
      set({ stale: !!state.payload, failed: !state.payload });
    } finally {
      inflight = null;
      set({ loading: false });
    }
  })();
  return inflight;
}

export function useStore(): State {
  return useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => state);
}

/** Loads content on open and whenever the app comes back to the foreground. */
export function useLiveContent() {
  useEffect(() => {
    void refresh();
    const again = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", again);
    window.addEventListener("online", again);
    const timer = setInterval(again, 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("online", again);
      clearInterval(timer);
    };
  }, []);
}

/** A field in the reader's language; approved Lisan only, English otherwise. */
export function loc(item: Item | undefined, field: string, lang: Lang): string {
  if (!item) return "";
  const l = lang === "lud" ? item.l?.[field] : "";
  return (l && l.trim()) || item.t[field] || "";
}
/** True when the Lisan reader is shown English for this field (so it is set left-to-right). */
export const isFallback = (item: Item | undefined, field: string, lang: Lang) => lang === "lud" && !!item && !item.l?.[field]?.trim();

export const byId = (payload: Payload | null, id: string) => payload?.items.find((i) => i.id === id);
export const inGroup = (payload: Payload | null, kind: string, grp: string) =>
  (payload?.items ?? []).filter((i) => i.kind === kind && i.grp === grp).sort((a, b) => a.sort - b.sort);
