/**
 * Small, dependency-free pieces of motion and feedback. Each is this app's own version of a pattern
 * found in public component libraries (see UX-CHANGELOG.md); the bracketed codes match that list.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check as CheckIcon, LogOut, Wifi, WifiOff } from "lucide-react";

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** [I54] A short tick on phones that support it. */
export const haptic = (ms = 8) => {
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
};

/** [I122] Number ticker: a plain number counts up to its value when it appears. */
export function Ticker({ value }: { value: string }) {
  const n = /^\d{1,4}$/.test(value) ? Number(value) : null;
  const [shown, setShown] = useState(n === null || calm() ? value : "0");
  useEffect(() => {
    if (n === null || calm()) return setShown(value);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 750);
      setShown(String(Math.round(n * (1 - Math.pow(1 - k, 3)))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="ticker">{shown}</span>;
}

/** [I123] A check mark that draws itself. */
export const DrawCheck = ({ size = 20 }: { size?: number }) => (
  <svg className="draw-check" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.8l4.4 4.4L19 7.6" pathLength={1} />
  </svg>
);

// ---- [I39] Toasts: short confirmations above the dock, read out by screen readers ----
type ToastIcon = "check" | "online" | "offline" | "out";
interface ToastItem { id: number; text: string; icon: ToastIcon }
let toasts: ToastItem[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());
export function toast(text: string, icon: ToastIcon = "check") {
  const item = { id: Date.now() + Math.random(), text, icon };
  toasts = [...toasts.slice(-1), item];
  emit();
  setTimeout(() => { toasts = toasts.filter((t) => t !== item); emit(); }, 2800);
}
const ICONS = { check: <DrawCheck />, online: <Wifi size={20} aria-hidden="true" />, offline: <WifiOff size={20} aria-hidden="true" />, out: <LogOut size={20} aria-hidden="true" /> };
export function Toaster() {
  const list = useSyncExternalStore((fn) => (subs.add(fn), () => subs.delete(fn)), () => toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => <div key={t.id} className="toast frost">{ICONS[t.icon]}<span>{t.text}</span><i className="toast-bar" aria-hidden="true" /></div>)}
    </div>
  );
}

/** A plain section. (It used to fade cards in on scroll; that washed sections out and cost speed, so it is gone.) */
export function Reveal({ as: Tag = "div", className = "", children, ...rest }: { as?: any; className?: string; children: ReactNode; [k: string]: unknown }) {
  return <Tag className={className} {...rest}>{children}</Tag>;
}

/** True once the page has been scrolled past `px` (for the back-to-top button). */
export function useScrolled(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > px);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [px]);
  return past;
}

// ---- [I46] "Add to home screen": kept until the zair is shown a labelled button for it ----
let installEvent: (Event & { prompt: () => Promise<void> }) | null = null;
const installSubs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as typeof installEvent;
    installSubs.forEach((fn) => fn());
  });
}
export function useInstall() {
  const ev = useSyncExternalStore((fn) => (installSubs.add(fn), () => installSubs.delete(fn)), () => installEvent);
  return ev ? async () => { await ev.prompt(); installEvent = null; installSubs.forEach((fn) => fn()); } : null;
}

/** [I37] A ripple spreads from the finger on buttons and tiles. Nothing else moves unless touched. */
export function useGlassFx() {
  useEffect(() => {
    if (calm()) return;
    const RIPPLE = ".btn-main, .btn-quiet, .btn-whatsapp, .btn-cream, .btn-line, .qtile, .ptile, .row-link, .chip, .lost";
    const onDown = (e: PointerEvent) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>(RIPPLE);
      if (!host) return;
      const r = host.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "ripple";
      const size = Math.max(r.width, r.height) * 2;
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 500);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
}

/** "1d 4h", "2h 14m", "14m": the same in both languages. */
export function fmtWait(mins: number): string {
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.max(1, mins)}m`;
}

export { CheckIcon };
