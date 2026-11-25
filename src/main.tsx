import { StrictMode, Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUp, CalendarDays, Info, LifeBuoy, Lock, LogIn, Sun, WifiOff } from "lucide-react";
import "./styles.css";
import { karbalaNow } from "../shared/time";
import { Toaster, haptic, toast, useGlassFx, useScrolled } from "./fx";
import { tr, tr2, type Key, type Lang } from "./i18n";
import { go, usePath } from "./router";
import { Aaj, Community, LostPerson, MadadContacts, Maloomat, PageView, hasUnread, useKarbalaClock } from "./screens";
import { loadMe, useMe } from "./session";
import { byId, inGroup, loc, refresh, setLang, useLiveContent, useStore } from "./store";
import { PageLink, Tab, fmt, type Ctx } from "./ui";
import { ArchForMe, RoomCard, Schedule, SignInForm, SignedInBar, WifiSteps } from "./zair";

/** Not linked from anywhere in the app. */
export const ADMIN_PATH = "/daftar";
const Admin = lazy(() => import("./admin"));

const TABS: { path: string; key: Key; icon: typeof Sun }[] = [
  { path: "/", key: "tabAaj", icon: Sun },
  { path: "/ziyarat", key: "tabZiyarat", icon: CalendarDays },
  { path: "/madad", key: "tabMadad", icon: LifeBuoy },
  { path: "/maloomat", key: "tabMaloomat", icon: Info },
];

const link = (path: string) => ({ href: path, onClick: (e: React.MouseEvent) => { e.preventDefault(); go(path); } });

/**
 * The floating dock. Its lens is one piece of glass that slides to a tab the moment the tab is touched,
 * without waiting for the screen underneath to change.
 */
function Dock({ tab, lang, unread }: { tab: string; lang: Lang; unread: boolean }) {
  const current = TABS.findIndex((t) => t.path === tab);
  const [touched, setTouched] = useState<number | null>(null);
  useEffect(() => setTouched(null), [tab]);
  const at = touched ?? current;
  return (
    <nav className="dock frost" aria-label="Main" style={{ ["--i" as string]: Math.max(at, 0) }}>
      <span className={`dock-lens${at < 0 ? " off" : ""}`} aria-hidden="true"><i key={at} /></span>
      {TABS.map(({ path: p, key, icon: I }, i) => (
        <a key={p} href={p} aria-current={tab === p ? "page" : undefined} data-on={at === i ? "" : undefined}
          onPointerDown={() => setTouched(i)} onPointerLeave={() => setTouched(null)} onPointerCancel={() => setTouched(null)}
          onClick={(e) => { e.preventDefault(); if (tab !== p) haptic(6); go(p); }}>
          <span className="dock-ic"><I size={23} strokeWidth={1.8} aria-hidden="true" />{i === 0 && unread && tab !== "/" && <i className="dot" aria-hidden="true" />}</span> {/* [I24] */}
          <span>{tr(lang, key)}</span>
        </a>
      ))}
    </nav>
  );
}

function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <div className="seg" dir="ltr" style={{ ["--i" as string]: lang === "lud" ? 1 : 0 }} role="group" aria-label="Language">
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => { haptic(); setLang("en"); }}>English</button> {/* [I54] */}
      <button type="button" lang="ar" aria-pressed={lang === "lud"} onClick={() => { haptic(); setLang("lud"); }}>لسان الدعوة</button>
    </div>
  );
}

const SIZES = [0.9, 1, 1.12, 1.26];
/** [I38] Two plain buttons make all the text smaller or larger; the choice is remembered. */
function TextSize({ lang }: { lang: Lang }) {
  // [I141] Icon-only controls (text size, clear search, close, copy) all carry a spoken label.
  const [i, setI] = useState(() => { try { return Math.min(3, Math.max(0, Number(localStorage.getItem("zk.size") ?? 1))); } catch { return 1; } });
  useEffect(() => {
    document.documentElement.style.setProperty("--zoom", String(SIZES[i]));
    try { localStorage.setItem("zk.size", String(i)); } catch { /* fine */ }
  }, [i]);
  return (
    <div className="tsize" role="group">
      <button type="button" disabled={i === 0} onClick={() => { haptic(); setI(i - 1); }} aria-label={tr2(lang, "smaller")}>A<small>−</small></button>
      <button type="button" disabled={i === 3} onClick={() => { haptic(); setI(i + 1); }} aria-label={tr2(lang, "larger")}>A<small>+</small></button>
    </div>
  );
}

function App() {
  const path = usePath();
  const { lang, payload, stale, failed, at, loading } = useStore();
  const now = useKarbalaClock();
  useLiveContent();
  const me = useMe();
  const scrolled = useScrolled(700);
  useGlassFx();
  useEffect(() => {
    void loadMe();
    const again = () => document.visibilityState === "visible" && void loadMe();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, []);
  // [I42] [I43] Say so when the connection drops or returns.
  useEffect(() => {
    const on = () => toast(tr2(lang, "online"), "online");
    const off = () => toast(tr(lang, "offline"), "offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [lang]);
  // [I53] The light behind the glass follows the time of day in Karbala.
  useEffect(() => {
    const m = now.minutes;
    document.documentElement.dataset.phase = m >= 270 && m < 420 ? "dawn" : m >= 420 && m < 1020 ? "day" : m >= 1020 && m < 1170 ? "dusk" : "night";
  }, [now.minutes]);
  // [F23] The tiles' entrance plays once, not every time Aaj is opened again.
  useEffect(() => {
    const t = setTimeout(() => { document.documentElement.dataset.seen = "1"; }, 1600);
    return () => clearTimeout(t);
  }, []);

  // Sticky section headings sit just under the top bar, whatever its height.
  useEffect(() => {
    const top = document.querySelector<HTMLElement>(".top");
    if (top) document.documentElement.style.setProperty("--top-h", `${top.offsetHeight + 6}px`);
  }, [me, lang, payload]);

  const tab = path.startsWith("/p/") ? "/maloomat" : TABS.some((t) => t.path === path) ? path : path === "/signin" ? "" : "/";
  const ctx: Ctx | null = payload ? { lang, payload, minutes: now.minutes } : null;
  const pageTitle = path.startsWith("/p/") ? loc(byId(payload, `page.${path.slice(3)}`), "title", lang) : path === "/signin" ? tr2(lang, "signInTitle") : tr(lang, TABS.find((t) => t.path === tab)?.key ?? "tabAaj");
  // [F16] Each screen names itself in the browser and the app switcher.
  useEffect(() => { if (!path.startsWith(ADMIN_PATH)) document.title = `${pageTitle} · ${tr(lang, "appName")}`; }, [pageTitle, lang, path]);

  if (path.startsWith(ADMIN_PATH)) return <Suspense fallback={null}><Admin /></Suspense>;

  let screen = null;
  if (ctx) {
    if (path.startsWith("/p/")) {
      screen = <PageView id={path.slice(3)} ctx={ctx} wifi={<WifiSteps me={me} ctx={ctx} />} />;
    } else if (path === "/signin") {
      screen = <SignInForm lang={lang} />;
    } else if (tab === "/ziyarat") {
      screen = (
        <>
          {me ? <Schedule me={me} ctx={ctx} now={now} /> : (
            // [I82] Signed out: a clear reason and one button.
            <div className="block prompt">
              <span className="prompt-ic"><Lock size={26} aria-hidden="true" /></span>
              <p className="lead">{tr(lang, "ziyaratLead")}</p>
              <a className="btn-main" {...link("/signin")}><LogIn size={20} aria-hidden="true" />{tr(lang, "signIn")}</a>
            </div>
          )}
          <Tab>{tr(lang, "secZiyarat")}</Tab>
          <div className="rows">{inGroup(ctx.payload, "page", "ziyarat").map((p) => <PageLink key={p.id} item={p} lang={lang} />)}</div>
          {!me && <div className="stack"><Community ctx={ctx} /></div>}
        </>
      );
    } else if (tab === "/madad") {
      screen = (
        <>
          <LostPerson lang={lang} />
          <p className="lead">{tr(lang, "madadLead")}</p>
          <MadadContacts ctx={ctx} />
        </>
      );
    } else if (tab === "/maloomat") {
      screen = <Maloomat ctx={ctx} />;
    } else {
      screen = (
        <Aaj ctx={ctx} at={at} loading={loading} room={me ? <RoomCard me={me} ctx={ctx} /> : null} arch={me ? <ArchForMe me={me} ctx={ctx} now={now} /> : (
          // [F8] Signed out there is one sign-in prompt, in the arch. [F47] The extra tile and its cryptic "Tour ID + ITS number" line are gone.
          <div className="arch-swap">
            <p className="arch-kicker">Faiz-e-Husaini</p> {/* [I30] */}
            <h1 className="arch-title shiny">{tr(lang, "appName")}</h1> {/* [I29] [I124] */}
            <p className="arch-detail">{tr(lang, "signInLead")}</p>
            <div className="arch-actions"><a className="btn-cream" {...link("/signin")}><LogIn size={18} aria-hidden="true" />{tr(lang, "signIn")}</a></div>
          </div>
        )} />
      );
    }
  }
  const lastUpdate = at ? fmt(karbalaNow(new Date(at)).minutes) : "";

  return (
    <div className="app">
      <a className="skip" href="#content">{tr2(lang, "skip")}</a> {/* [I47] */}
      <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
      {loading && <i className="loadbar" aria-hidden="true" />} {/* [I134] */}
      <header className="top frost">
        <div className="top-row">
          <a className="brand" {...link("/")} aria-label={tr(lang, "appName")}><img src="/brand/karbala-mualla.svg" alt="كربلاء المعلى" width="79" height="40" /></a>
          <TextSize lang={lang} />
          <LangSwitch lang={lang} />
        </div>
        {me && <SignedInBar me={me} lang={lang} />}
      </header>
      {/* [F40] The offline notice says when the page was last updated. */}
      {stale && <p className="notice"><WifiOff size={18} aria-hidden="true" /><span>{tr(lang, "offline")}{lastUpdate && <> <bdi dir="ltr">({lastUpdate})</bdi></>}</span></p>} {/* [I140] */}
      <main id="content">
        {/* [I142] Every screen has one heading for screen readers; [I139] the screen cross-fades when the language changes. */}
        {!path.startsWith("/p/") && path !== "/signin" && tab !== "/" && <h1 className="sr">{pageTitle}</h1>}
        <div className="view" key={path + lang}>{screen}</div>
        {!ctx && !failed && (
          // [F43] The loading shape matches the page that is coming.
          <div className="aaj" aria-hidden="true"><div className="skeleton arch-sk" /><div className="skeleton" style={{ minHeight: 300 }} /><div className="skeleton" style={{ minHeight: 150 }} /></div>
        )}
        {failed && (
          <div className="block prompt">
            <span className="prompt-ic"><WifiOff size={26} aria-hidden="true" /></span>
            <p className="lead">{tr(lang, "loadFail")}</p>
            <button type="button" className="btn-main" onClick={() => void refresh()}>{tr(lang, "retry")}</button>
          </div>
        )}
      </main>
      {/* [I45] A labelled way back to the top of a long page. */}
      {scrolled && <button type="button" className="totop frost" onClick={() => { haptic(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowUp size={18} aria-hidden="true" />{tr2(lang, "toTop")}</button>}
      <Toaster />
      <Dock tab={tab} lang={lang} unread={hasUnread(payload)} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
