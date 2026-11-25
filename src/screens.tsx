import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BedDouble, BookOpen, ChevronLeft, ChevronRight, Clock, Megaphone, MessageCircle, Search, Utensils } from "lucide-react";
import { karbalaNow, parseClock, parseRange } from "../shared/time";
import { PLACES, majlisDefault, type Assembly, type PlaceId } from "../shared/ziyarat";
import { tr, tr2, type Key, type Lang } from "./i18n";
import { back, go } from "./router";
import { byId, inGroup, loc, type Item, type Payload } from "./store";
import { Blocks, Fact, Icon, MenuCard, Office, Sheet, T, Tab, fmt, type Ctx } from "./ui";

const link = (path: string) => ({ href: path, onClick: (e: React.MouseEvent) => { e.preventDefault(); go(path); } });

/** Re-reads the Karbala clock every half minute so "now" stays true while the page is open. */
export function useKarbalaClock() {
  const [now, setNow] = useState(() => karbalaNow());
  useEffect(() => {
    const t = setInterval(() => setNow(karbalaNow()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function placeName(payload: Payload, place: PlaceId, lang: Lang): { name: string; mapUrl?: string } {
  const f = byId(payload, `fact.place.${place}`);
  return { name: loc(f, "label", lang) || PLACES[place].name, mapUrl: (f?.data.v as string) || PLACES[place].mapUrl };
}

export function assemblyTime(payload: Payload, a: Assembly, lang: Lang): string {
  return a.time ?? (loc(byId(payload, "fact.time.aftermaghrib"), "value", lang) || "Straight after Maghrib Isha ni namaz");
}

const CAP = 44;
/** One outline for the whole arch: straight sides, the four-centred shrine arch on top, soft corners below. */
function archPath(w: number, h: number, inset: number, r: number): string {
  const x0 = inset, x1 = w - inset, yb = h - inset, top = inset * 1.25, sh = CAP * 0.79 + inset * 0.3;
  const c1 = top + (sh - top) * 0.5, c2 = top + (sh - top) * 0.36;
  return `M${x0} ${yb - r}V${sh}C${x0} ${c1} ${w * 0.31} ${c2} ${w / 2} ${top}C${w * 0.69} ${c2} ${x1} ${c1} ${x1} ${sh}V${yb - r}Q${x1} ${yb} ${x1 - r} ${yb}H${x0 + r}Q${x0} ${yb} ${x0} ${yb - r}Z`;
}

/**
 * The four-centred arch of a shrine gateway: holds the one thing that matters most right now.
 * A thread of gold light travels round its inner line.
 */
export function Arch({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ w: 358, h: 210 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = box;
  const outer = archPath(w, h, 0, 26);
  const inner = archPath(w, h, 7, 20);
  return (
    <section className="arch" ref={ref}>
      <svg className="arch-svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <defs>
          <linearGradient id="arch-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#96321f" /><stop offset="0.45" stopColor="#74200f" /><stop offset="1" stopColor="#56130a" /></linearGradient>
          <radialGradient id="arch-glow" cx="0.5" cy="0" r="0.9"><stop offset="0" stopColor="#ffd9a8" stopOpacity="0.28" /><stop offset="0.6" stopColor="#ffd9a8" stopOpacity="0" /></radialGradient>
          <clipPath id="arch-clip"><path d={outer} /></clipPath>
        </defs>
        <path d={outer} fill="url(#arch-grad)" />
        <path d={outer} fill="url(#arch-glow)" />
        <g clipPath="url(#arch-clip)"><rect className="arch-shine" x={-w * 0.5} y={-h * 0.2} width={w * 0.45} height={h * 1.4} /></g>
        <path className="arch-line" d={inner} />
        <path className="arch-beam" d={inner} pathLength={100} />
      </svg>
      <div className="arch-in">{children}</div>
    </section>
  );
}

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS_EN[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}`;
};
const stamp = (iso: string) => {
  const k = karbalaNow(new Date(iso));
  return `${longDate(k.date)}, ${fmt(k.minutes)}`;
};

// ---------------------------------------------------------------------------
// The day: namaz, Faiz Mawaid and tonight's majlis in the order the day runs
// ---------------------------------------------------------------------------

interface Row { key: string; at: number | null; end?: number; label: string; value: string; fallback: boolean; extra?: ReactNode; strong?: boolean }

function dayRows(ctx: Ctx): Row[] {
  const { lang, payload } = ctx;
  const rows: Row[] = [];
  for (const f of [...inGroup(payload, "fact", "namaz"), ...inGroup(payload, "fact", "mawaid")]) {
    const en = f.t.value ?? "";
    const range = parseRange(en);
    const after = f.data.after ? Number(String(f.data.after).slice(0, 2)) * 60 + Number(String(f.data.after).slice(3, 5)) : null;
    rows.push({ key: f.id, at: range ? range[0] : parseClock(en) ?? after, end: range?.[1], label: loc(f, "label", lang), value: loc(f, "value", lang), fallback: lang === "lud" && !f.l?.label });
  }
  if (payload.majlis) {
    const d = majlisDefault(payload.majlis.date);
    const venue = (lang === "lud" && payload.majlis.venue_lud) || payload.majlis.venue_en || placeName(payload, d.place, lang).name;
    const time = (lang === "lud" && payload.majlis.time_lud) || payload.majlis.time_en || assemblyTime(payload, d, lang);
    rows.push({ key: "majlis", at: parseClock(payload.majlis.time_en || d.time || "") ?? 19 * 60 + 30, label: tr(lang, "majlisTonight"), value: `${time}\n${venue}`, fallback: false, strong: true });
  }
  return rows.sort((a, b) => (a.at ?? 9999) - (b.at ?? 9999));
}

function pick(rows: Row[], minutes: number) {
  const current = rows.find((r) => r.at !== null && r.end !== undefined && minutes >= r.at && minutes < r.end) ?? null;
  const upcoming = rows.filter((r) => r.at !== null && r.at > minutes);
  // After the last event of the day, tomorrow's first one is next.
  const next = upcoming[0] ?? rows.find((r) => r.at !== null) ?? null;
  return { current, next: current ? upcoming[0] ?? null : next, then: current ? null : upcoming[1] ?? null };
}

function DayLine({ ctx }: { ctx: Ctx }) {
  const { lang, minutes } = ctx;
  const rows = dayRows(ctx);
  const { current, next } = pick(rows, minutes);
  return (
    <ol className="dayline">
      {rows.map((r) => {
        const state = r === current ? "now" : r === next && r.at !== null && r.at > minutes ? "next" : r.at !== null && (r.end ?? r.at) <= minutes ? "past" : "";
        return (
          <li key={r.key} className={state}>
            <span className="dayline-mark" aria-hidden="true" />
            <div className="dayline-main" {...(r.fallback ? { dir: "ltr", "data-fallback": "" } : {})}>
              <span className="dayline-label">{r.strong ? <strong>{r.label}</strong> : r.label}{state === "now" && <span className="pill open">{tr(lang, "now")}</span>}{state === "next" && <span className="pill next">{tr(lang, "next")}</span>}</span>
              <span className="dayline-value pre">{r.value}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function NowTile({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const [open, setOpen] = useState(false);
  const { current, next, then } = pick(dayRows(ctx), minutes);
  const main = current ?? next;
  const after = current ? next : then;
  const worded = !!main && !/\d/.test(main.value);
  // Time until the next event; tomorrow's first event counts across midnight.
  const wait = !current && main && main.at !== null ? (main.at > minutes ? main.at - minutes : main.at + 1440 - minutes) : null;
  const waitText = wait === null ? "" : wait >= 60 ? `${Math.floor(wait / 60)}h ${wait % 60}m` : `${wait}m`;
  return (
    <>
      <button type="button" className="tile pane" onClick={() => setOpen(true)}>
        <span className="tile-label">{current ? <i className="live" aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}{tr(lang, current ? "now" : "next")}{waitText && <bdi className="count" dir="ltr">{waitText}</bdi>}</span>
        {main ? (
          <span {...(main.fallback ? { dir: "ltr", "data-fallback": "" } : {})} style={{ display: "grid", gap: 2 }}>
            <span className="tile-title">{main.label}</span>
            <span className={`tile-big${worded ? " worded" : ""}`}>{main.value.split("\n")[0]}</span>
          </span>
        ) : <span className="tile-sub">{tr(lang, "soon")}</span>}
        {current && current.end !== undefined && current.at !== null && <span className="bar" aria-hidden="true"><i style={{ ["--p" as string]: `${Math.round(((minutes - current.at) / (current.end - current.at)) * 100)}%` }} /></span>}
        {after && <span className="tile-sub one-line" {...(after.fallback ? { dir: "ltr", "data-fallback": "" } : {})}>{tr2(lang, "then")}: {after.label}</span>}
      </button>
      {open && (
        <Sheet title={tr2(lang, "allDay")} onClose={() => setOpen(false)} lang={lang}>
          <p className="date-line" dir="ltr">{longDate(payload.today)}{payload.menu?.hijri ? ` / ${payload.menu.hijri}` : ""}</p>
          <DayLine ctx={ctx} />
        </Sheet>
      )}
    </>
  );
}

function MenuTile({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const [open, setOpen] = useState(false);
  const [meal, setMeal] = useState<"lunch" | "dinner">(minutes < 15 * 60 ? "lunch" : "dinner");
  const menu = payload.menu;
  const items = menu?.[meal] ?? [];
  const label = (m: "lunch" | "dinner") => tr(lang, m);
  return (
    <>
      <div className="tile pane wide" style={{ minHeight: 0 }}>
        <div className="tile-head">
          <span className="tile-label"><Utensils size={16} aria-hidden="true" />{tr(lang, "menuToday")}</span>
          <div className="seg" style={{ ["--i" as string]: meal === "lunch" ? 0 : 1 }}>
            {(["lunch", "dinner"] as const).map((m) => <button key={m} type="button" aria-pressed={meal === m} onClick={() => setMeal(m)}>{label(m)}</button>)}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} style={{ display: "grid", gap: 2, marginTop: 4 }}>
          {items.length ? (
            <ul className="menu-lines" dir="ltr">
              {items.slice(0, 2).map((x, i) => <li key={i}>{x}{i === 1 && items.length > 2 && <span className="tile-sub"> +{items.length - 2} {tr2(lang, "moreItems")}</span>}</li>)}
            </ul>
          ) : <span className="tile-sub">{tr(lang, "menuNone")}</span>}
        </button>
      </div>
      {open && <Sheet title={tr(lang, "menuToday")} onClose={() => setOpen(false)} lang={lang}><MenuCard ctx={ctx} /></Sheet>}
    </>
  );
}

function MajlisTile({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  const m = payload.majlis;
  if (!m) return null;
  const d = majlisDefault(m.date);
  const venue = (lang === "lud" && m.venue_lud) || m.venue_en || placeName(payload, d.place, lang).name;
  const time = (lang === "lud" && m.time_lud) || m.time_en || assemblyTime(payload, d, lang);
  return (
    <div className="tile pane wide t-majlis">
      <span style={{ display: "grid", gap: 1 }}>
        <span className="tile-label"><BookOpen size={16} aria-hidden="true" />{tr(lang, "majlisTonight")}</span>
        <span className="tile-title">{time}</span>
        <span className="tile-sub">{venue}</span>
      </span>
      {m.booklet && <a className="btn-quiet" href={`/api/file/${m.booklet}`} target="_blank" rel="noopener"><BookOpen size={18} aria-hidden="true" /><span>{tr(lang, "booklet")}</span></a>}
    </div>
  );
}

export function Community({ ctx, tile }: { ctx: Ctx; tile?: boolean }) {
  const f = byId(ctx.payload, "fact.community.url");
  if (!f || !f.data.v) return null;
  if (tile) {
    return (
      <a className="tile pane t-wa" href={f.data.v} target="_blank" rel="noopener noreferrer">
        <span className="tile-label"><MessageCircle size={16} aria-hidden="true" />WhatsApp</span>
        <span className="tile-title">{tr(ctx.lang, "joinCommunity")}</span>
      </a>
    );
  }
  return (
    <a className="btn-whatsapp wide" href={f.data.v} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={22} aria-hidden="true" /><span>{tr(ctx.lang, "joinCommunity")}</span>
    </a>
  );
}

function NewsTile({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  const [open, setOpen] = useState(false);
  const news = payload.announcements;
  const text = (a: (typeof news)[number]) => (lang === "lud" && a.lud) || a.en;
  const fb = (a: (typeof news)[number]) => (lang === "lud" && !a.lud ? { dir: "ltr" as const, lang: "en", "data-fallback": "" } : {});
  return (
    <>
      <button type="button" className="tile pane" onClick={() => news.length && setOpen(true)}>
        <span className="tile-label"><Megaphone size={16} aria-hidden="true" />{tr(lang, "announcements")}{news.length > 1 && <span className="pill shut">{news.length}</span>}</span>
        {news.length ? <span className="clamp3" {...fb(news[0])}>{text(news[0])}</span> : <span className="tile-sub">{tr(lang, "noAnnouncements")}</span>}
      </button>
      {open && (
        <Sheet title={tr(lang, "announcements")} onClose={() => setOpen(false)} lang={lang}>
          <ul className="news">
            {news.map((a) => (
              <li key={a.id}>
                <time dir="ltr">{stamp(a.at)}</time>
                <p className="pre" {...fb(a)}>{text(a)}</p>
                {a.media && <img src={`/api/file/${a.media}`} alt="" loading="lazy" />}
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}

/** Aaj: one screen. The arch, then tiles for now, the room, the menu, the majlis, what people ask most, and news. */
export function Aaj({ ctx, arch, roomTile }: { ctx: Ctx; arch: ReactNode; roomTile: ReactNode }) {
  const { lang, payload } = ctx;
  const tiles = payload.items.filter((i) => i.kind === "page" && i.data.tile).sort((a, b) => Number(a.data.tile) - Number(b.data.tile));
  return (
    <>
      <Arch>{arch}</Arch>
      <div className="grid">
        <NowTile ctx={ctx} />
        {roomTile}
        <MajlisTile ctx={ctx} />
        <MenuTile ctx={ctx} />
        {tiles.length > 0 && (
          <div className="quick wide" aria-label={tr(lang, "quick")}>
            {tiles.slice(0, 4).map((p) => (
              <a key={p.id} {...link(`/p/${p.id.slice(5)}`)}>
                <span className="quick-ic pane"><Icon name={p.icon} size={24} /></span>
                <T item={p} field="title" lang={lang} />
              </a>
            ))}
          </div>
        )}
        <NewsTile ctx={ctx} />
        <Community ctx={ctx} tile />
      </div>
    </>
  );
}

export function SignInTile({ lang }: { lang: Lang }) {
  return (
    <a className="tile pane t-signin" {...link("/signin")}>
      <span className="tile-label"><BedDouble size={16} aria-hidden="true" />{tr2(lang, "signInTile")}</span>
      <span className="tile-title">{tr(lang, "signIn")}</span>
      <span className="tile-sub">{tr(lang, "tourId")} + {tr(lang, "its")}</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Madad (before requests open)
// ---------------------------------------------------------------------------

export function LostPerson({ lang }: { lang: Lang }) {
  return (
    <a className="lost" {...link("/p/lost")}>
      <strong>{tr(lang, "lostPerson")}</strong>
      <span>{tr(lang, "lostPersonDo")}</span>
    </a>
  );
}

export function MadadContacts({ ctx }: { ctx: Ctx }) {
  const { payload } = ctx;
  return (
    <div className="stack">
      <div className="block facts">{inGroup(payload, "fact", "contact").map((f) => <Fact key={f.id} item={f} ctx={ctx} />)}</div>
      <div className="block"><Office item={byId(payload, "office.reception")} ctx={ctx} /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maloomat: search, then every page as a tile under what a zair wants to do
// ---------------------------------------------------------------------------

const SECTIONS: [string, Key][] = [["stay", "secStay"], ["ziyarat", "secZiyarat"], ["places", "secPlaces"], ["travel", "secTravel"], ["more", "secMore"]];

function PageTile({ item, lang, i }: { item: Item; lang: Lang; i: number }) {
  return (
    <a className="ptile pane" style={{ ["--i" as string]: i }} href={`/p/${item.id.replace(/^page\./, "")}`}
      onClick={(e) => {
        e.preventDefault();
        const ic = e.currentTarget.querySelector<HTMLElement>(".ptile-ic");
        if (ic) ic.style.viewTransitionName = "page-ic";
        go(`/p/${item.id.replace(/^page\./, "")}`);
      }}>
      <span className="ptile-ic"><Icon name={item.icon} /></span>
      <T item={item} field="title" lang={lang} />
    </a>
  );
}

export function Maloomat({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const all = payload.items.filter((i) => i.kind === "page" && i.grp);
  const hits = needle ? all.filter((p) => `${p.t.title ?? ""} ${p.l?.title ?? ""}`.toLowerCase().includes(needle)) : [];
  let n = 0;
  return (
    <>
      <label className="search pane">
        <Search size={20} aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr2(lang, "searchInfo")} aria-label={tr2(lang, "searchInfo")} />
      </label>
      {needle ? (
        hits.length ? <div className="ptiles" style={{ marginTop: 14 }}>{hits.map((p, i) => <PageTile key={p.id} item={p} lang={lang} i={i} />)}</div> : <p className="lead">{tr2(lang, "noResults")}</p>
      ) : SECTIONS.map(([id, key]) => {
        const pages = inGroup(payload, "page", id);
        return pages.length ? (
          <section key={id}>
            <Tab>{tr(lang, key)}</Tab>
            <div className="ptiles">{pages.map((p) => <PageTile key={p.id} item={p} lang={lang} i={n++} />)}</div>
          </section>
        ) : null;
      })}
    </>
  );
}

export function PageView({ id, ctx, wifi }: { id: string; ctx: Ctx; wifi?: ReactNode }) {
  const { lang, payload } = ctx;
  const page: Item | undefined = byId(payload, `page.${id}`);
  const Chevron = lang === "lud" ? ChevronRight : ChevronLeft;
  return (
    <article className="page">
      <button type="button" className="back pane" onClick={() => back("/maloomat")}><Chevron size={20} aria-hidden="true" /><span>{tr(lang, "back")}</span></button>
      {page ? (
        <>
          <h1 className="page-title"><span className="page-ic"><Icon name={page.icon} size={26} /></span><T item={page} field="title" lang={lang} /></h1>
          <div className="page-body"><Blocks pageId={page.id} ctx={ctx} wifi={wifi} /></div>
        </>
      ) : <p className="soon">{tr(lang, "soon")}</p>}
    </article>
  );
}
