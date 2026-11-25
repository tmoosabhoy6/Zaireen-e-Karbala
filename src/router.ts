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

window.addEventListener("popstate", () => {
  const morph = isPage(last) || isPage(location.pathname);
  last = location.pathname;
  if (morph) transition(notify);
  else notify();
});

/**
 * Moves to another screen. Switching tabs is instant (a whole-page snapshot made the dock feel late);
 * the cross-fade and icon morph are kept for opening and leaving an info page.
 */
export function go(path: string) {
  if (path === location.pathname) return;
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
