import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Coffee, Download, History, Hourglass, LifeBuoy,
  Megaphone, MessageCircle, Moon, Compass, RefreshCw, Search, SearchX, Share2, Sparkles, Sun, Sunrise, Utensils, X, Maximize2,
} from "lucide-react";
import { addDays, karbalaNow, parseClock, parseRange } from "../shared/time";
import { PLACES, majlisDefault, type Assembly, type PlaceId } from "../shared/ziyarat";
import { DrawCheck, Reveal, fmtWait, haptic, toast, useInstall } from "./fx";
import { tr, tr2, type Key, type Lang } from "./i18n";
import { back, go } from "./router";
import { byId, inGroup, loc, refresh, type Item, type Payload } from "./store";
import { Blocks, Fact, Icon, Lightbox, MenuCard, Office, PageLink, Pic, T, Tab, fallbackProps, fmt, type Ctx } from "./ui";

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

/** The arch's inner line as an open path: from the left foot, over the point, to the right foot. */
function dialPath(w: number, h: number, inset: number): string {
  const x0 = inset, x1 = w - inset, yb = h - inset - 16, top = inset * 1.25, sh = CAP * 0.79 + inset * 0.3;
  const c1 = top + (sh - top) * 0.5, c2 = top + (sh - top) * 0.36;
  return `M${x0} ${yb}V${sh}C${x0} ${c1} ${w * 0.31} ${c2} ${w / 2} ${top}C${w * 0.69} ${c2} ${x1} ${c1} ${x1} ${sh}V${yb}`;
}
const DIAL_FROM = 4 * 60, DIAL_TO = 22 * 60;
const dialAt = (m: number) => Math.min(1, Math.max(0, (m - DIAL_FROM) / (DIAL_TO - DIAL_FROM)));

/**
 * The arch of the day. The four-centred arch of a shrine gateway holds the one thing that matters most
 * right now, and its gold line is a dial: it runs from 4 am at the left foot, over the point at midday,
 * to 10 pm at the right foot. The line is lit up to the present, the sun sits at "now", and each namaz,
 * meal and majlis of the day is a mark on it. It is redrawn when the minute changes; nothing loops.
 */
export function Arch({ children, minutes, marks = [], lang }: { children: ReactNode; minutes: number; marks?: number[]; lang: Lang }) {
  const ref = useRef<HTMLElement>(null);
  const dial = useRef<SVGPathElement>(null);
  const [box, setBox] = useState({ w: 358, h: 236 });
  const [pts, setPts] = useState<{ sun: [number, number]; ticks: [number, number, boolean][] } | null>(null);
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
  const night = minutes < DIAL_FROM || minutes >= DIAL_TO;
  const at = minutes < DIAL_FROM ? 0 : dialAt(minutes);
  useLayoutEffect(() => {
    const p = dial.current;
    if (!p) return;
    const len = p.getTotalLength();
    const xy = (k: number): [number, number] => { const q = p.getPointAtLength(len * k); return [q.x, q.y]; };
    setPts({ sun: xy(at), ticks: marks.filter((m) => m >= DIAL_FROM && m <= DIAL_TO).map((m) => [...xy(dialAt(m)), m <= minutes] as [number, number, boolean]) });
  }, [w, h, at, minutes, marks.join()]);
  const outer = archPath(w, h, 0, 26);
  const line = dialPath(w, h, 8);
  return (
    <section className="arch" ref={ref}>
      <svg className="arch-svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <defs>
          <linearGradient id="arch-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#96321f" /><stop offset="0.45" stopColor="#74200f" /><stop offset="1" stopColor="#56130a" /></linearGradient>
        </defs>
        <path d={outer} fill="url(#arch-grad)" />
        <path ref={dial} className="dial-track" d={line} />
        <path className="dial-done" d={line} pathLength={100} strokeDasharray={`${(at * 100).toFixed(2)} 100`} />
        {pts?.ticks.map(([x, y, past], i) => <circle key={i} className={past ? "dial-tick past" : "dial-tick"} cx={x} cy={y} r={3.4} />)}
        {pts && (night
          ? <g className="dial-moon"><circle cx={pts.sun[0]} cy={pts.sun[1]} r={8} /><circle className="cut" cx={pts.sun[0] + 3.5} cy={pts.sun[1] - 2.5} r={6.5} /></g>
          : <g className="dial-sun"><circle className="halo" cx={pts.sun[0]} cy={pts.sun[1]} r={13} /><circle cx={pts.sun[0]} cy={pts.sun[1]} r={7} /></g>)}
      </svg>
      <div className="arch-in">
        <p className="arch-clock">{night ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}<bdi dir="ltr">{fmt(minutes)}</bdi><span>{tr2(lang, "karbala")}</span></p>
        {children}
      </div>
    </section>
  );
}

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS_EN[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}`;
};

// ---------------------------------------------------------------------------
// Today: namaz, Faiz Mawaid and tonight's majlis in the order the day runs. [F1]
// ---------------------------------------------------------------------------

interface Row { key: string; at: number | null; end?: number; label: string; value: string; fallback: boolean; icon: typeof Sun; majlis?: boolean }

const ROW_ICON: Record<string, typeof Sun> = { "fact.namaz.fajr": Sunrise, "fact.namaz.zohr": Sun, "fact.namaz.maghrib": Moon, "fact.mawaid.nashta": Coffee };

function dayRows(ctx: Ctx): Row[] {
  const { lang, payload } = ctx;
  const rows: Row[] = [];
  for (const f of [...inGroup(payload, "fact", "namaz"), ...inGroup(payload, "fact", "mawaid")]) {
    const en = f.t.value ?? "";
    const range = parseRange(en);
    const after = f.data.after ? Number(String(f.data.after).slice(0, 2)) * 60 + Number(String(f.data.after).slice(3, 5)) : null;
    rows.push({
      key: f.id, at: range ? range[0] : parseClock(en) ?? after, end: range?.[1], label: loc(f, "label", lang), value: loc(f, "value", lang),
      fallback: lang === "lud" && !f.l?.label, icon: ROW_ICON[f.id] ?? (f.grp === "mawaid" ? Utensils : Sun), // [I3]
    });
  }
  // [F44] Tonight's majlis appears once, as a row of the day (it used to be repeated in a second block).
  if (payload.majlis) {
    const d = majlisDefault(payload.majlis.date);
    const venue = (lang === "lud" && payload.majlis.venue_lud) || payload.majlis.venue_en || placeName(payload, d.place, lang).name;
    const time = (lang === "lud" && payload.majlis.time_lud) || payload.majlis.time_en || assemblyTime(payload, d, lang);
    rows.push({ key: "majlis", at: parseClock(payload.majlis.time_en || d.time || "") ?? 19 * 60 + 30, label: tr(lang, "majlisTonight"), value: `${time}\n${venue}`, fallback: false, icon: BookOpen, majlis: true });
  }
  return rows.sort((a, b) => (a.at ?? 9999) - (b.at ?? 9999));
}

function Today({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const rows = dayRows(ctx);
  const current = rows.find((r) => r.at !== null && r.end !== undefined && minutes >= r.at && minutes < r.end) ?? null;
  const upcoming = rows.filter((r) => r.at !== null && r.at > minutes);
  const next = upcoming[0] ?? null;
  const done = rows.filter((r) => r.at !== null && (r.end ?? r.at) <= minutes).length;
  return (
    <section className="block today" id="today">
      <h2 className="card-title"><Clock size={20} aria-hidden="true" />{tr(lang, "todayTimes")}</h2>
      <p className="date-line" dir="ltr"><CalendarDays size={16} aria-hidden="true" />{longDate(payload.today)}{payload.menu?.hijri ? ` / ${payload.menu.hijri}` : ""}</p> {/* [I11] */}
      {/* [I1] The line fills with colour as the day goes on. */}
      <ol className="dayline" style={{ ["--fill" as string]: `${Math.round(((done + (current ? 0.5 : 0)) / Math.max(1, rows.length)) * 100)}%` }}>
        {rows.map((r, i) => {
          const state = r === current ? "now" : r === next ? "next" : r.at !== null && (r.end ?? r.at) <= minutes ? "past" : "";
          const RowIcon = r.icon;
          return (
            <li key={r.key} className={`${state}${r.majlis ? " majlis" : ""}`} style={{ ["--i" as string]: i }}> {/* [I4] [I12] */}
              <span className="dayline-mark" aria-hidden="true">{state === "past" && <DrawCheck size={11} />}</span> {/* [I8] [I2] */}
              <span className="dayline-ic" aria-hidden="true"><RowIcon size={19} /></span>
              <div className="dayline-main" {...fallbackProps(r.fallback)}>
                <span className="dayline-label">{r.label}
                  {state === "now" && <span className="pill open"><i className="live" aria-hidden="true" />{tr(lang, "now")}</span>}
                  {state === "next" && <span className="pill next">{tr(lang, "next")}</span>}
                </span>
                <span className="dayline-value pre">{r.value}</span> {/* [I10] */}
                {state === "now" && r.end !== undefined && r.at !== null && (
                  <span className="dayline-live">
                    <span className="bar" aria-hidden="true"><i style={{ ["--p" as string]: `${Math.round(((minutes - r.at) / (r.end - r.at)) * 100)}%` }} /></span> {/* [I5] */}
                    <bdi className="count" dir="ltr"><Hourglass size={14} aria-hidden="true" />{fmtWait(r.end - minutes)}</bdi> {/* [I6] */}
                  </span>
                )}
                {state === "next" && r.at !== null && <bdi className="count" dir="ltr"><Clock size={14} aria-hidden="true" />{fmtWait(r.at - minutes)}</bdi>} {/* [I7] */}
                {r.majlis && payload.majlis?.booklet && <a className="btn-quiet" href={`/api/file/${payload.majlis.booklet}`} target="_blank" rel="noopener"><BookOpen size={18} aria-hidden="true" /><span>{tr(lang, "booklet")}</span></a>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The one line the dock carries on every screen: what is happening now, or what comes next. */
export function liveNow(ctx: Ctx): { now: boolean; label: string; value: string; wait: number; fallback: boolean } | null {
  const rows = dayRows(ctx);
  const { minutes } = ctx;
  const current = rows.find((r) => r.at !== null && r.end !== undefined && minutes >= r.at && minutes < r.end);
  if (current) return { now: true, label: current.label, value: current.value.split("\n")[0], wait: current.end! - minutes, fallback: current.fallback };
  const next = rows.find((r) => r.at !== null && r.at > minutes) ?? rows.find((r) => r.at !== null);
  if (!next || next.at === null) return null;
  return { now: false, label: next.label, value: next.value.split("\n")[0], wait: next.at > minutes ? next.at - minutes : next.at + 1440 - minutes, fallback: next.fallback };
}

/** Where the zair is in their stay. Pages and sections are put in the order that suits that day. */
export type Stage = "arrive" | "stay" | "leave";
export function stageOf(stay: { arrival: string | null; departure: string | null } | null | undefined, today: string): Stage | null {
  if (!stay) return null;
  if (stay.departure && today >= addDays(stay.departure, -1)) return "leave";
  if (stay.arrival && today <= stay.arrival) return "arrive";
  return "stay";
}
const FOR_STAGE: Record<Stage, string[]> = {
  arrive: ["page.room", "page.izan", "page.wifi"],
  stay: ["page.libas", "page.bring", "page.offices"],
  leave: ["page.departure", "page.lost", "page.private"],
};
const FIRST_SECTION: Record<Stage, string> = { arrive: "stay", stay: "ziyarat", leave: "travel" };

/** Three pages chosen for today: arriving, during the stay, or leaving. */
function ForToday({ ctx, stage }: { ctx: Ctx; stage: Stage }) {
  const pages = FOR_STAGE[stage].map((id) => byId(ctx.payload, id)).filter((p): p is Item => !!p);
  if (!pages.length) return null;
  return (
    <section>
      <Tab icon={<Compass size={18} aria-hidden="true" />}>{tr2(ctx.lang, "forToday")}</Tab>
      <div className="rows">{pages.map((p) => <PageLink key={p.id} item={p} lang={ctx.lang} />)}</div>
    </section>
  );
}

export function Community({ ctx }: { ctx: Ctx }) {
  const f = byId(ctx.payload, "fact.community.url");
  if (!f || !f.data.v) return null;
  return (
    <a className="btn-whatsapp" href={f.data.v} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={22} aria-hidden="true" /><span>{tr(ctx.lang, "joinCommunity")}</span> 
    </a>
  );
}

// ---- Announcements, in full, newest first. [F4] ----

const SEEN_KEY = "zk.seen";
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } };
/** [I24] True when there is an announcement this phone has not shown yet. */
export const hasUnread = (payload: Payload | null) => !!payload?.announcements.length && !readSeen().includes(payload.announcements[0].id);

function News({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  const news = payload.announcements;
  const [seen] = useState(readSeen);
  const [older, setOlder] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => {
    // Once they have been on screen for a moment, they are no longer new.
    const t = setTimeout(() => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(news.map((a) => a.id).slice(0, 60))); } catch { /* fine */ } }, 2500);
    return () => clearTimeout(t);
  }, [news.map((a) => a.id).join()]);
  const dayLabel = (iso: string) => {
    const k = karbalaNow(new Date(iso));
    const day = k.date === payload.today ? tr2(lang, "today") : k.date === addDays(payload.today, -1) ? tr2(lang, "yesterday") : longDate(k.date); // [I28]
    return `${day}, ${fmt(k.minutes)}`;
  };
  const item = (a: (typeof news)[number], first: boolean) => (
    <li key={a.id} className={first ? "first" : ""}> {/* [I25] */}
      <time>{dayLabel(a.at)}{!seen.includes(a.id) && <span className="pill new">{tr2(lang, "isNew")}</span>}</time> {/* [I23] */}
      <p className="pre" {...fallbackProps(lang === "lud" && !a.lud)}>{(lang === "lud" && a.lud) || a.en}</p>
      {a.media && (
        <button type="button" className="news-pic" onClick={() => setZoom(`/api/file/${a.media}`)}> {/* [I27] */}
          <Pic src={`/api/file/${a.media}`} alt="" /><span><Maximize2 size={17} aria-hidden="true" />{tr2(lang, "fullScreen")}</span>
        </button>
      )}
    </li>
  );
  return (
    <Reveal as="section" className="block">
      <h2 className="card-title"><Megaphone size={20} aria-hidden="true" />{tr(lang, "announcements")}</h2>
      <Community ctx={ctx} />
      {news.length === 0 ? <div className="empty"><Megaphone size={26} aria-hidden="true" /><p>{tr(lang, "noAnnouncements")}</p></div> : (
        <>
          <ul className="news">{news.slice(0, 3).map((a, i) => item(a, i === 0))}</ul>
          {news.length > 3 && (
            <>
              {older && <ul className="news older">{news.slice(3).map((a) => item(a, false))}</ul>}
              {/* [I26] Older ones open in place with a labelled button. */}
              <button type="button" className="btn-quiet more" aria-expanded={older} onClick={() => { haptic(); setOlder(!older); }}>
                {tr2(lang, older ? "hideOlder" : "showOlder")}{!older && ` (${news.length - 3})`}<ChevronDown size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </>
      )}
      {zoom && <Lightbox src={zoom} alt="" onClose={() => setZoom(null)} lang={lang} />}
    </Reveal>
  );
}

/** [I44] When the page was last updated, with a labelled Refresh button. [F41] */
function Updated({ lang, at, loading }: { lang: Lang; at: number | null; loading: boolean }) {
  const k = at ? karbalaNow(new Date(at)) : null;
  return (
    <p className="updated">
      <span>{k ? <>{tr2(lang, "updated")} <bdi dir="ltr">{fmt(k.minutes)}</bdi></> : ""}</span>
      <button type="button" className="btn-quiet" onClick={() => { haptic(); void refresh(); }}><RefreshCw size={17} className={loading ? "spin" : ""} aria-hidden="true" />{/* [I135] */}{tr2(lang, "refresh")}</button>
    </p>
  );
}

/** [I46] Offers to put the app on the home screen, where the phone allows it. */
function Install({ lang }: { lang: Lang }) {
  const install = useInstall();
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem("zk.install.no"); } catch { return false; } });
  if (!install || hidden) return null;
  return (
    <div className="block install"> {/* [I137] */}
      <Download size={24} aria-hidden="true" />
      <p>{tr2(lang, "install")}</p>
      <button type="button" className="btn-main slim" onClick={() => void install()}>{tr2(lang, "installDo")}</button>
      <button type="button" className="btn-quiet" onClick={() => { setHidden(true); try { localStorage.setItem("zk.install.no", "1"); } catch { /* fine */ } }}>{tr2(lang, "installNo")}</button>
    </div>
  );
}

/** Aaj: everything in plain view, top to bottom. Nothing is behind an unmarked tap or a drag-only sheet. [F6] [F10] */
export function Aaj({ ctx, arch, room, at, loading, stage }: { ctx: Ctx; arch: ReactNode; room: ReactNode; at: number | null; loading: boolean; stage: Stage | null }) {
  const { lang, payload } = ctx;
  const tiles = payload.items.filter((i) => i.kind === "page" && i.data.tile).sort((a, b) => Number(a.data.tile) - Number(b.data.tile));
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  return (
    <div className="aaj">
      <Arch minutes={ctx.minutes} lang={lang} marks={dayRows(ctx).map((r) => r.at).filter((n): n is number => n !== null)}>{arch}</Arch>
      <div className="cols">
        <div className="col">
          {room}
          {stage && <ForToday ctx={ctx} stage={stage} />}
          <Today ctx={ctx} />
        </div>
        <div className="col">
          <Reveal as="section" className="block">
            <h2 className="card-title"><Utensils size={20} aria-hidden="true" />{tr(lang, "menuToday")}</h2>
            <MenuCard ctx={ctx} />
          </Reveal>
          {tiles.length > 0 && (
            <Reveal as="section" className="quick-wrap">
              <Tab icon={<Sparkles size={18} aria-hidden="true" />}>{tr(lang, "quick")}</Tab> {/* [F46] */}
              <div className="quick">
                {tiles.slice(0, 4).map((p, i) => (
                  // [I36] Each tile carries a chevron, so it reads as something to tap.
                  <a key={p.id} className="qtile pane" style={{ ["--i" as string]: i }} {...link(`/p/${p.id.slice(5)}`)}>
                    <span className="qtile-ic"><Icon name={p.icon} size={24} /></span> 
                    <T item={p} field="title" lang={lang} />
                    <Chevron size={18} aria-hidden="true" className="qtile-go" />
                  </a>
                ))}
              </div>
            </Reveal>
          )}
          <News ctx={ctx} />
          <Install lang={lang} />
          <Updated lang={lang} at={at} loading={loading} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Madad (before requests open)
// ---------------------------------------------------------------------------

export function LostPerson({ lang }: { lang: Lang }) {
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  return (
    // [F49] It reads as a button: an alert mark, a chevron, and a press state.
    <a className="lost" {...link("/p/lost")}>
      <span className="lost-ic"><AlertTriangle size={26} aria-hidden="true" /></span> {/* [I83] */}
      <span><strong>{tr(lang, "lostPerson")}</strong><span>{tr(lang, "lostPersonDo")}</span></span>
      <Chevron size={22} aria-hidden="true" />
    </a>
  );
}

export function MadadContacts({ ctx }: { ctx: Ctx }) {
  const { payload, lang } = ctx;
  return (
    <div className="stack">
      <Tab icon={<LifeBuoy size={18} aria-hidden="true" />}>{loc(byId(payload, "page.contacts"), "title", lang)}</Tab> {/* [I88] */}
      <div className="block facts">{inGroup(payload, "fact", "contact").map((f) => <Fact key={f.id} item={f} ctx={ctx} />)}</div>
      <div className="block"><Office item={byId(payload, "office.reception")} ctx={ctx} /></div> {/* [I87] */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maloomat: search, then every page as a tile under what a zair wants to do
// ---------------------------------------------------------------------------

const SECTIONS: [string, Key][] = [["stay", "secStay"], ["ziyarat", "secZiyarat"], ["places", "secPlaces"], ["travel", "secTravel"], ["more", "secMore"]];
const RECENT_KEY = "zk.recent";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };

/** [I91] The letters that matched the search are marked. */
function Marked({ text, needle }: { text: string; needle: string }) {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length)}</>;
}

function PageTile({ item, lang, i, needle = "" }: { item: Item; lang: Lang; i: number; needle?: string }) {
  const path = `/p/${item.id.replace(/^page\./, "")}`;
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  const title = loc(item, "title", lang);
  return (
    <a className="ptile pane" data-sec={item.grp} style={{ ["--i" as string]: i }} href={path}
      onClick={(e) => {
        e.preventDefault();
        go(path);
      }}>
      <span className="ptile-ic"><Icon name={item.icon} /></span> {/* [I94] */}
      <span {...fallbackProps(lang === "lud" && !item.l?.title)}><Marked text={title} needle={needle} /></span>
      <Chevron size={18} aria-hidden="true" className="ptile-go" /> {/* [F50] */}
    </a>
  );
}

export function Maloomat({ ctx, stage }: { ctx: Ctx; stage: Stage | null }) {
  const { lang, payload } = ctx;
  // [F14] The search text survives a visit to a page and back.
  const [q, setQ] = useState(() => { try { return sessionStorage.getItem("zk.q") || ""; } catch { return ""; } });
  useEffect(() => { try { sessionStorage.setItem("zk.q", q); } catch { /* fine */ } }, [q]);
  const input = useRef<HTMLInputElement>(null);
  const needle = q.trim().toLowerCase();
  const all = payload.items.filter((i) => i.kind === "page" && i.grp);
  const hits = needle ? all.filter((p) => `${p.t.title ?? ""} ${p.l?.title ?? ""}`.toLowerCase().includes(needle)) : [];
  const recent = readRecent().map((id) => all.find((p) => p.id === id)).filter((p): p is Item => !!p).slice(0, 4);
  let n = 0;
  return (
    <>
      <form className="search pane" role="search" onSubmit={(e) => { e.preventDefault(); input.current?.blur(); /* [I97] */ }}>
        <Search size={20} aria-hidden="true" /> 
        <input ref={input} type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr2(lang, "searchInfo")} aria-label={tr2(lang, "searchInfo")} />
        {q && <button type="button" className="search-x" onClick={() => { setQ(""); input.current?.focus(); }} aria-label={tr2(lang, "clear")}><X size={18} aria-hidden="true" /></button>} {/* [I89] */}
      </form>
      {needle ? (
        <>
          <p className="note-line" role="status"><bdi dir="ltr">{hits.length}</bdi> {tr2(lang, "results")}</p> {/* [I90] */}
          {hits.length ? <div className="ptiles">{hits.map((p, i) => <PageTile key={p.id} item={p} lang={lang} i={i} needle={needle} />)}</div>
            : <div className="block empty"><SearchX size={28} aria-hidden="true" /><p>{tr2(lang, "noResults")}</p></div> /* [I95] */}
        </>
      ) : (
        <>
          {recent.length > 0 && (
            // [I92] The pages opened most recently, one tap away.
            <section>
              <Tab icon={<History size={18} aria-hidden="true" />}>{tr2(lang, "recent")}</Tab>
              <div className="chips">{recent.map((p) => <a key={p.id} className="chip" {...link(`/p/${p.id.slice(5)}`)}><Icon name={p.icon} size={17} /><T item={p} field="title" lang={lang} /></a>)}</div>
            </section>
          )}
          {/* The section that suits today's stage of the stay comes first. */}
          {[...SECTIONS].sort((a, b) => Number(b[0] === (stage && FIRST_SECTION[stage])) - Number(a[0] === (stage && FIRST_SECTION[stage]))).map(([id, key]) => {
            const pages = inGroup(payload, "page", id);
            return pages.length ? (
              <section key={id}>
                <Tab>{tr(lang, key)}{stage && FIRST_SECTION[stage] === id && <span className="pill next">{tr2(lang, "forToday")}</span>}</Tab>
                <div className="ptiles">{pages.map((p) => <PageTile key={p.id} item={p} lang={lang} i={n++} />)}</div>
              </section>
            ) : null;
          })}
        </>
      )}
    </>
  );
}

export function PageView({ id, ctx, wifi }: { id: string; ctx: Ctx; wifi?: ReactNode }) {
  const { lang, payload } = ctx;
  const page: Item | undefined = byId(payload, `page.${id}`);
  const Back = lang === "lud" ? ChevronRight : ChevronLeft;
  const Fwd = lang === "lud" ? ChevronLeft : ChevronRight;
  useEffect(() => {
    if (!page) return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([page.id, ...readRecent().filter((x) => x !== page.id)].slice(0, 6))); } catch { /* fine */ }
  }, [page?.id]);
  const section = SECTIONS.find(([s]) => s === page?.grp);
  const siblings = page ? inGroup(payload, "page", page.grp) : [];
  const at = siblings.findIndex((p) => p.id === page?.id);
  const prev = at > 0 ? siblings[at - 1] : null, next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : null;
  const share = async () => {
    const data = { title: page ? loc(page, "title", lang) : "", url: location.href };
    haptic();
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast(tr2(lang, "linkCopied")); }
    } catch { /* closed without sharing */ }
  };
  return (
    <article className="page">
      <i className="read-bar" aria-hidden="true" /> {/* [I49] */}
      <div className="page-top">
        <button type="button" className="back pane" onClick={() => back("/maloomat")}><Back size={20} aria-hidden="true" /><span>{tr(lang, "back")}</span></button>
        {page && <button type="button" className="back pane" onClick={share}><Share2 size={18} aria-hidden="true" /><span>{tr2(lang, "share")}</span></button>} {/* [I99] */}
      </div>
      {page ? (
        <>
          {section && <p className="crumb">{tr(lang, section[1])}</p>} {/* [I98] */}
          <h1 className="page-title"><span className="page-ic"><Icon name={page.icon} size={26} /></span><T item={page} field="title" lang={lang} /></h1>
          <div className="page-body"><Blocks pageId={page.id} ctx={ctx} wifi={wifi} /></div>
          {(prev || next) && (
            // [I100] On to the next page of the same section without going back to the list.
            <nav className="pager">
              {prev ? <a className="pane" {...link(`/p/${prev.id.slice(5)}`)}><Back size={18} aria-hidden="true" /><span><small>{tr2(lang, "prevPage")}</small><T item={prev} field="title" lang={lang} /></span></a> : <span />}
              {next ? <a className="pane end" {...link(`/p/${next.id.slice(5)}`)}><span><small>{tr2(lang, "nextPage")}</small><T item={next} field="title" lang={lang} /></span><Fwd size={18} aria-hidden="true" /></a> : <span />}
            </nav>
          )}
          <a className="help-foot" {...link("/madad")}><LifeBuoy size={19} aria-hidden="true" />{tr2(lang, "needHelp")}<Fwd size={18} aria-hidden="true" /></a> {/* [I119] */}
        </>
      ) : <div className="block empty"><SearchX size={28} aria-hidden="true" /><p>{tr(lang, "soon")}</p></div>}
    </article>
  );
}
