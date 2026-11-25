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

window.addEventListener("popstate", () => transition(notify));

export function go(path: string) {
  if (path === location.pathname) return;
  transition(() => {
    history.pushState(null, "", path);
    notify();
    window.scrollTo(0, 0);
  });
}

export function back(fallback: string) {
  if (history.length > 1) history.back();
  else go(fallback);
}

export const usePath = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => location.pathname);
