import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Screen changes cross-fade and the dock's lens glides, where the browser supports view transitions. */
function transition(change: () => void) {
  const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
  if (!start || matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  start.call(document, () => flushSync(change));
}

const isPage = (path: string) => path.startsWith("/p/");
let last = location.pathname;
const scrolls = new Map<string, number>();
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

window.addEventListener("popstate", () => {
  const morph = isPage(last) || isPage(location.pathname);
  scrolls.set(last, window.scrollY);
  last = location.pathname;
  document.documentElement.dataset.nav = "back";
  const land = () => {
    notify();
    // [F15] Coming back lands where the reader left off, not at the top.
    requestAnimationFrame(() => window.scrollTo(0, scrolls.get(location.pathname) ?? 0));
  };
  if (morph) transition(land);
  else land();
});

/**
 * Moves to another screen. Switching tabs is instant (a whole-page snapshot made the dock feel late);
 * the cross-fade and icon morph are kept for opening and leaving an info page.
 */
export function go(path: string) {
  if (path === location.pathname) return;
  scrolls.set(location.pathname, window.scrollY);
  document.documentElement.dataset.nav = "forward";
  const change = () => {
    history.pushState(null, "", path);
    last = path;
    notify();
    window.scrollTo(0, 0);
  };
  if (isPage(path) || isPage(location.pathname)) transition(change);
  else change();
}

export function back(fallback: string) {
  if (history.length > 1) history.back();
  else go(fallback);
}

export const usePath = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => location.pathname);
