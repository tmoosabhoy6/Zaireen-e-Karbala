import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
window.addEventListener("popstate", notify);

export function go(path: string) {
  if (path === location.pathname) return;
  history.pushState(null, "", path);
  notify();
  window.scrollTo(0, 0);
}

export function back(fallback: string) {
  if (history.length > 1) history.back();
  else go(fallback);
}

export const usePath = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => location.pathname);
