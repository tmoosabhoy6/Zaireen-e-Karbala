import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { karbalaNow, parseClock, parseRange } from "../shared/time";
import { PLACES, ZIYARAT_NAMES, assemblyFor, majlisDefault, type Assembly, type PlaceId, type ZiyaratKind } from "../shared/ziyarat";
import { tr, type Key, type Lang } from "./i18n";
import { back, go } from "./router";
import { byId, inGroup, loc, type Item, type Payload } from "./store";
import { Blocks, Fact, Icon, MenuCard, Office, PageLink, T, Tab, fmt, type Ctx } from "./ui";

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

// ---------------------------------------------------------------------------
// Aaj
// ---------------------------------------------------------------------------

/** The four-centred arch of a shrine gateway: holds the one thing that matters most right now. */
export function Arch({ children }: { children: ReactNode }) {
  return (
    <section className="arch">
      <svg className="arch-cap" viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden="true">
        <path className="arch-fill" d="M0 56 V44 C0 22 62 16 100 0 C138 16 200 22 200 44 V56 Z" />
        <path className="arch-line" d="M7 56 V46 C7 28 64 23 100 8 C136 23 193 28 193 46 V56" />
      </svg>
      <div className="arch-body">{children}</div>
    </section>
  );
}

interface Row { at: number | null; end?: number; label: ReactNode; value: ReactNode; key: string; extra?: ReactNode }

/** Namaz, Faiz Mawaid and tonight's majlis in the order the day runs, with the current one marked. */
function DayLine({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const rows: Row[] = [];
  for (const f of [...inGroup(payload, "fact", "namaz"), ...inGroup(payload, "fact", "mawaid")]) {
    const en = f.t.value ?? "";
    const range = parseRange(en);
    const after = f.data.after ? Number(String(f.data.after).slice(0, 2)) * 60 + Number(String(f.data.after).slice(3, 5)) : null;
    rows.push({
      key: f.id, at: range ? range[0] : parseClock(en) ?? after, end: range?.[1],
      label: <T item={f} field="label" lang={lang} />, value: <T item={f} field="value" lang={lang} />,
    });
  }
  if (payload.majlis) {
    const d = majlisDefault(payload.majlis.date);
    const venue = (lang === "lud" && payload.majlis.venue_lud) || payload.majlis.venue_en || placeName(payload, d.place, lang).name;
    const time = (lang === "lud" && payload.majlis.time_lud) || payload.majlis.time_en || assemblyTime(payload, d, lang);
    rows.push({
      key: "majlis", at: parseClock(payload.majlis.time_en || d.time || "") ?? 19 * 60 + 30,
      label: <strong>{tr(lang, "majlisTonight")}</strong>,
      value: <>{time}<br />{venue}</>,
      extra: payload.majlis.booklet ? (
        <a className="btn-quiet" href={`/api/file/${payload.majlis.booklet}`} target="_blank" rel="noopener"><BookOpen size={18} aria-hidden="true" /><span>{tr(lang, "booklet")}</span></a>
      ) : null,
    });
  }
  rows.sort((a, b) => (a.at ?? 9999) - (b.at ?? 9999));
  const current = rows.find((r) => r.at !== null && r.end !== undefined && minutes >= r.at && minutes < r.end);
  const next = current ? null : rows.find((r) => r.at !== null && r.at > minutes);
  return (
    <ol className="dayline">
      {rows.map((r) => {
        const state = r === current ? "now" : r === next ? "next" : r.at !== null && (r.end ?? r.at) <= minutes ? "past" : "";
        return (
          <li key={r.key} className={state}>
            <span className="dayline-mark" aria-hidden="true" />
            <div className="dayline-main">
              <span className="dayline-label">{r.label}{state === "now" && <span className="pill open">{tr(lang, "now")}</span>}{state === "next" && <span className="pill next">{tr(lang, "next")}</span>}</span>
              <span className="dayline-value">{r.value}</span>
              {r.extra}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS_EN[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}`;
};

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  const k = karbalaNow(d);
  return `${longDate(k.date)}, ${fmt(k.minutes)}`;
};

export function Community({ ctx }: { ctx: Ctx }) {
  const f = byId(ctx.payload, "fact.community.url");
  if (!f || !f.data.v) return null;
  return (
    <a className="btn-whatsapp" href={f.data.v} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={22} aria-hidden="true" /><span>{tr(ctx.lang, "joinCommunity")}</span>
    </a>
  );
}

export function Aaj({ ctx, arch }: { ctx: Ctx; arch: ReactNode }) {
  const { lang, payload } = ctx;
  const tiles = payload.items.filter((i) => i.kind === "page" && i.data.tile).sort((a, b) => Number(a.data.tile) - Number(b.data.tile));
  return (
    <>
      <Arch>{arch}</Arch>

      <Tab>{tr(lang, "todayTimes")}</Tab>
      <p className="date-line" dir="ltr">{longDate(payload.today)}{payload.menu?.hijri ? ` / ${payload.menu.hijri}` : ""}</p>
      <DayLine ctx={ctx} />

      <Tab>{tr(lang, "menuToday")}</Tab>
      <MenuCard ctx={ctx} />

      <Tab>{tr(lang, "announcements")}</Tab>
      <Community ctx={ctx} />
      {payload.announcements.length === 0 ? <p className="soon">{tr(lang, "noAnnouncements")}</p> : (
        <ul className="news">
          {payload.announcements.map((a) => {
            const text = (lang === "lud" && a.lud) || a.en;
            return (
              <li key={a.id}>
                <time dir="ltr">{timeAgo(a.at)}</time>
                <p className="pre" {...(lang === "lud" && !a.lud ? { dir: "ltr", lang: "en", "data-fallback": "" } : {})}>{text}</p>
                {a.media && <img src={`/api/file/${a.media}`} alt="" loading="lazy" />}
              </li>
            );
          })}
        </ul>
      )}

      {tiles.length > 0 && (
        <>
          <Tab>{tr(lang, "quick")}</Tab>
          <div className="tiles">
            {tiles.map((p) => (
              <a key={p.id} className="tile" href={`/p/${p.id.slice(5)}`} onClick={(e) => { e.preventDefault(); go(`/p/${p.id.slice(5)}`); }}>
                <Icon name={p.icon} size={26} />
                <T item={p} field="title" lang={lang} />
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ziyarat (signed out): what the four ziyarat are, with their standing times
// ---------------------------------------------------------------------------

export function AssemblyLine({ ctx, kind, date }: { ctx: Ctx; kind: ZiyaratKind; date: string }) {
  const { lang, payload } = ctx;
  const a = assemblyFor(kind, date);
  if (!a) return null;
  const place = placeName(payload, a.place, lang);
  return (
    <p className="assembly">
      <span className="assembly-time" dir="auto">{assemblyTime(payload, a, lang)}</span>
      <span>{a.bus ? tr(lang, "bus") : tr(lang, "assembly")}: {place.name}</span>
      {place.mapUrl && <a className="btn-quiet" href={place.mapUrl} target="_blank" rel="noopener noreferrer">{tr(lang, "map")}</a>}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Madad (before requests open)
// ---------------------------------------------------------------------------

export function LostPerson({ lang }: { lang: Lang }) {
  return (
    <a className="lost" href="/p/lost" onClick={(e) => { e.preventDefault(); go("/p/lost"); }}>
      <strong>{tr(lang, "lostPerson")}</strong>
      <span>{tr(lang, "lostPersonDo")}</span>
    </a>
  );
}

export function MadadContacts({ ctx }: { ctx: Ctx }) {
  const { payload } = ctx;
  return (
    <>
      <div className="facts">{inGroup(payload, "fact", "contact").map((f) => <Fact key={f.id} item={f} ctx={ctx} />)}</div>
      <Office item={byId(payload, "office.reception")} ctx={ctx} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Maloomat
// ---------------------------------------------------------------------------

const SECTIONS: [string, Key][] = [["stay", "secStay"], ["ziyarat", "secZiyarat"], ["places", "secPlaces"], ["travel", "secTravel"], ["more", "secMore"]];

export function Maloomat({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  return (
    <>
      {SECTIONS.map(([id, key]) => {
        const pages = inGroup(payload, "page", id);
        return pages.length ? (
          <section key={id}>
            <Tab>{tr(lang, key)}</Tab>
            <div className="rows">{pages.map((p) => <PageLink key={p.id} item={p} lang={lang} />)}</div>
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
      <button type="button" className="back" onClick={() => back("/maloomat")}><Chevron size={20} aria-hidden="true" /><span>{tr(lang, "back")}</span></button>
      {page ? (
        <>
          <h1 className="page-title"><Icon name={page.icon} size={28} /><T item={page} field="title" lang={lang} /></h1>
          <Blocks pageId={page.id} ctx={ctx} wifi={wifi} />
        </>
      ) : <p className="soon">{tr(lang, "soon")}</p>}
    </article>
  );
}

export { ZIYARAT_NAMES };
