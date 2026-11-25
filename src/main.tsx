import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, Info, LifeBuoy, Sun } from "lucide-react";
import "./styles.css";
import { tr, type Key, type Lang } from "./i18n";
import { go, usePath } from "./router";
import { Aaj, LostPerson, MadadContacts, Maloomat, PageView, Community, useKarbalaClock } from "./screens";
import { inGroup, refresh, setLang, useLiveContent, useStore } from "./store";
import { PageLink, Tab, type Ctx } from "./ui";

/** Not linked from anywhere in the app. */
export const ADMIN_PATH = "/daftar";
const Admin = lazy(() => import("./admin"));

const TABS: { path: string; key: Key; icon: typeof Sun }[] = [
  { path: "/", key: "tabAaj", icon: Sun },
  { path: "/ziyarat", key: "tabZiyarat", icon: CalendarDays },
  { path: "/madad", key: "tabMadad", icon: LifeBuoy },
  { path: "/maloomat", key: "tabMaloomat", icon: Info },
];

function LangToggle({ lang }: { lang: Lang }) {
  return (
    <button type="button" className="lang" lang={lang === "lud" ? "en" : "ar"} onClick={() => setLang(lang === "lud" ? "en" : "lud")}>
      {tr(lang, "otherLang")}
    </button>
  );
}

function App() {
  const path = usePath();
  const { lang, payload, stale, failed } = useStore();
  const now = useKarbalaClock();
  useLiveContent();

  if (path.startsWith(ADMIN_PATH)) return <Suspense fallback={null}><Admin /></Suspense>;

  const tab = path.startsWith("/p/") ? "/maloomat" : TABS.some((t) => t.path === path) ? path : "/";
  const home = path === "/";
  const ctx: Ctx | null = payload ? { lang, payload, minutes: now.minutes } : null;

  let screen = null;
  if (ctx) {
    if (path.startsWith("/p/")) {
      screen = <PageView id={path.slice(3)} ctx={ctx} wifi={<p className="lead">{tr(lang, "wifiSignIn")}</p>} />;
    } else if (tab === "/ziyarat") {
      screen = (
        <>
          <p className="lead">{tr(lang, "ziyaratLead")}</p>
          <Tab>{tr(lang, "secZiyarat")}</Tab>
          <div className="rows">{inGroup(ctx.payload, "page", "ziyarat").map((p) => <PageLink key={p.id} item={p} lang={lang} />)}</div>
          <Tab>{tr(lang, "announcements")}</Tab>
          <Community ctx={ctx} />
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
        <Aaj ctx={ctx} arch={
          <>
            <h1 className="arch-title">{tr(lang, "appName")}</h1>
            <p className="arch-detail">{tr(lang, "signInSoon")}</p>
          </>
        } />
      );
    }
  }

  return (
    <div className="app">
      <header className={`top${home ? "" : " small"}`}>
        <div className="top-bar">
          <span className="top-name">{home ? "Faiz-e-Husaini" : tr(lang, "appName")}</span>
          <LangToggle lang={lang} />
        </div>
        <img className="calligraphy" src="/brand/karbala-mualla.svg" alt="كربلاء المعلى" width="600" height="304" />
      </header>
      {stale && <p className="notice">{tr(lang, "offline")}</p>}
      <main>
        {screen}
        {failed && (
          <div className="block">
            <p className="lead">{tr(lang, "loadFail")}</p>
            <button type="button" className="btn-main" style={{ marginTop: 14 }} onClick={() => void refresh()}>{tr(lang, "retry")}</button>
          </div>
        )}
      </main>
      <nav className="nav" aria-label="Main">
        <div className="nav-in">
          {TABS.map(({ path: p, key, icon: I }) => (
            <a key={p} href={p} aria-current={tab === p ? "page" : undefined} onClick={(e) => { e.preventDefault(); go(p); }}>
              <I size={24} strokeWidth={1.75} aria-hidden="true" />
              <span>{tr(lang, key)}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
