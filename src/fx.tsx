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

// ---- [I121] Blur-fade reveal: cards below the fold settle in as they are scrolled to ----
let io: IntersectionObserver | null = null;
const observer = () => (io ??= new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io!.unobserve(e.target); }
}, { rootMargin: "0px 0px -6% 0px" }));
export function Reveal({ as: Tag = "div", className = "", children, ...rest }: { as?: any; className?: string; children: ReactNode; [k: string]: unknown }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (calm() || typeof IntersectionObserver === "undefined") return el.classList.add("in");
    observer().observe(el);
    return () => io?.unobserve(el);
  }, []);
  return <Tag ref={ref} className={`reveal ${className}`} {...rest}>{children}</Tag>;
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

/**
 * Makes the glass react to touch and tilt:
 * - [I37] a ripple spreads from the finger on buttons and tiles
 * - the sheen on a pane follows the finger, and [I125] quick tiles lean toward it
 * - on phones that report tilt without a permission prompt, the rim light shifts with the phone
 */
export function useGlassFx() {
  useEffect(() => {
    if (calm()) return;
    const RIPPLE = ".btn-main, .btn-quiet, .btn-whatsapp, .btn-cream, .btn-line, .qtile, .ptile, .row-link, .chip, .lost";
    const onDown = (e: PointerEvent) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>(RIPPLE);
      if (host) {
        const r = host.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "ripple";
        const size = Math.max(r.width, r.height) * 2;
        dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
        host.appendChild(dot);
        setTimeout(() => dot.remove(), 650);
      }
      onMove(e);
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".pane");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
      if (el.classList.contains("qtile")) {
        el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1)}deg`);
        el.style.setProperty("--rx", `${((0.5 - (e.clientY - r.top) / r.height) * 14).toFixed(1)}deg`);
      }
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    let frame = 0;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (frame || e.gamma === null || e.beta === null) return;
      const tx = Math.max(-1, Math.min(1, e.gamma / 35)), ty = Math.max(-1, Math.min(1, (e.beta - 40) / 35));
      frame = requestAnimationFrame(() => {
        frame = 0;
        document.documentElement.style.setProperty("--tx", tx.toFixed(3));
        document.documentElement.style.setProperty("--ty", ty.toFixed(3));
      });
    };
    // iOS asks the person for permission first; the app does not interrupt them for a visual touch.
    const free = typeof DeviceOrientationEvent !== "undefined" && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission !== "function";
    if (free) window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      if (free) window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);
}

/** "1d 4h", "2h 14m", "14m": the same in both languages. */
export function fmtWait(mins: number): string {
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.max(1, mins)}m`;
}

export { CheckIcon };
