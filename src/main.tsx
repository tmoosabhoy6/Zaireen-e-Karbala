import { StrictMode, Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, Info, LifeBuoy, Sun } from "lucide-react";
import "./styles.css";
import { tr, type Key, type Lang } from "./i18n";
import { go, usePath } from "./router";
import { Aaj, Community, LostPerson, MadadContacts, Maloomat, PageView, SignInTile, useKarbalaClock } from "./screens";
import { loadMe, useMe } from "./session";
import { inGroup, refresh, setLang, useLiveContent, useStore } from "./store";
import { PageLink, Tab, type Ctx } from "./ui";
import { ArchForMe, RoomTile, Schedule, SignInForm, SignedInBar, WifiSteps } from "./zair";

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

function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <div className="seg" dir="ltr" style={{ ["--i" as string]: lang === "lud" ? 1 : 0 }} role="group" aria-label="Language">
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
      <button type="button" lang="ar" aria-pressed={lang === "lud"} onClick={() => setLang("lud")}>لسان الدعوة</button>
    </div>
  );
}

function App() {
  const path = usePath();
  const { lang, payload, stale, failed } = useStore();
  const now = useKarbalaClock();
  useLiveContent();
  const me = useMe();
  useEffect(() => {
    void loadMe();
    const again = () => document.visibilityState === "visible" && void loadMe();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, []);

  if (path.startsWith(ADMIN_PATH)) return <Suspense fallback={null}><Admin /></Suspense>;

  const tab = path.startsWith("/p/") ? "/maloomat" : TABS.some((t) => t.path === path) ? path : path === "/signin" ? "" : "/";
  const ctx: Ctx | null = payload ? { lang, payload, minutes: now.minutes } : null;

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
            <div className="stack">
              <div className="block">
                <p className="lead" style={{ marginTop: 0 }}>{tr(lang, "ziyaratLead")}</p>
                <a className="btn-main" style={{ marginTop: 14 }} {...link("/signin")}>{tr(lang, "signIn")}</a>
              </div>
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
        <Aaj ctx={ctx} roomTile={me ? <RoomTile me={me} ctx={ctx} /> : <SignInTile lang={lang} />} arch={me ? <ArchForMe me={me} ctx={ctx} now={now} /> : (
          <>
            <p className="arch-kicker">Faiz-e-Husaini</p>
            <h1 className="arch-title">{tr(lang, "appName")}</h1>
            <p className="arch-detail">{tr(lang, "signInLead")}</p>
            <div className="arch-actions"><a className="btn-cream" {...link("/signin")}>{tr(lang, "signIn")}</a></div>
          </>
        )} />
      );
    }
  }

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
      <header className="top frost">
        <div className="top-row">
          <a className="brand" {...link("/")} aria-label={tr(lang, "appName")}><img src="/brand/karbala-mualla.svg" alt="كربلاء المعلى" width="79" height="40" /></a>
          <LangSwitch lang={lang} />
        </div>
        {me && <SignedInBar me={me} lang={lang} />}
      </header>
      {stale && <p className="notice">{tr(lang, "offline")}</p>}
      <main>
        {screen}
        {!ctx && !failed && <div className="grid"><div className="skeleton wide" style={{ minHeight: 190 }} /><div className="skeleton" /><div className="skeleton" /><div className="skeleton wide" /></div>}
        {failed && (
          <div className="stack"><div className="block">
            <p className="lead" style={{ marginTop: 0 }}>{tr(lang, "loadFail")}</p>
            <button type="button" className="btn-main" style={{ marginTop: 14 }} onClick={() => void refresh()}>{tr(lang, "retry")}</button>
          </div></div>
        )}
      </main>
      <nav className="dock frost" aria-label="Main">
        {TABS.map(({ path: p, key, icon: I }) => (
          <a key={p} {...link(p)} aria-current={tab === p ? "page" : undefined}>
            {tab === p && <span className="dock-lens" aria-hidden="true" />}
            <I size={23} strokeWidth={1.8} aria-hidden="true" />
            <span>{tr(lang, key)}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
