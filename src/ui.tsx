import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Accessibility, AlertTriangle, Banknote, BedDouble, BookOpen, Building2, Bus, Car, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy,
  ExternalLink, HandHeart, HeartPulse, IdCard, Info, Link2, Luggage, MapPin, Maximize2, MessageCircle, Moon, Phone, Plane, Search, Shirt,
  Sparkles, Sun, Utensils, Wifi, Wrench, X,
} from "lucide-react";
import { parseRange } from "../shared/time";
import { DrawCheck, fmtWait, haptic, toast } from "./fx";
import { tr, tr2, type Lang } from "./i18n";
import { go } from "./router";
import { byId, inGroup, isFallback, loc, type Item, type Payload } from "./store";

const ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi, bed: BedDouble, utensils: Utensils, clock: Clock, "map-pin": MapPin, shirt: Shirt, "heart-pulse": HeartPulse,
  accessibility: Accessibility, bus: Bus, plane: Plane, banknote: Banknote, "book-open": BookOpen, search: Search, phone: Phone,
  info: Info, "id-card": IdCard, "hand-heart": HandHeart, luggage: Luggage, car: Car, building: Building2, sparkles: Sparkles,
  wrench: Wrench, message: MessageCircle,
};
export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const C = ICONS[name] ?? Info;
  return <C size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export interface Ctx {
  lang: Lang;
  payload: Payload;
  /** Minutes after midnight in Karbala, for "open now". */
  minutes: number;
}

/** English shown to a Lisan reader is set left-to-right in the Latin face and marked as English. [F53] */
export const fallbackProps = (on: boolean) => (on ? { dir: "ltr" as const, lang: "en", "data-fallback": "" } : {});

/** Text in the reader's language. */
export function T({ item, field, lang, as: Tag = "span", className }: { item?: Item; field: string; lang: Lang; as?: any; className?: string }) {
  const text = loc(item, field, lang);
  if (!text) return null;
  return <Tag className={className} {...fallbackProps(isFallback(item, field, lang))}>{text}</Tag>;
}

/**
 * Body text: one line per paragraph. "- " starts a bullet, "!! " a line that must not be missed.
 * With `steps`, every line is a numbered step.
 */
export function Body({ text, steps, fallback }: { text: string; steps?: boolean; fallback?: boolean }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const dir = fallbackProps(!!fallback);
  if (steps) {
    return (
      <ol className="steps" {...dir}>
        {lines.map((l, i) => <li key={i}><span className="step-n">{i + 1}</span><span>{l}</span></li>)}
      </ol>
    );
  }
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={out.length} className="bullets">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
    bullets = [];
  };
  for (const l of lines) {
    if (l.startsWith("- ")) bullets.push(l.slice(2));
    else {
      flush();
      // [I103] A line that must not be missed carries a warning mark as well as colour.
      out.push(l.startsWith("!! ")
        ? <p key={out.length} className="must"><AlertTriangle size={19} aria-hidden="true" /><span>{l.slice(3)}</span></p>
        : <p key={out.length}>{l}</p>);
    }
  }
  flush();
  return <div className="body" {...dir}>{out}</div>;
}

/** Section heading. */
export function Tab({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <h2 className="tab">{icon && <span className="tab-ic">{icon}</span>}<span>{children}</span></h2>;
}

/** [I113] What a department still owes: a dashed chip with a clock, never a made-up value. */
export const Soon = ({ lang }: { lang: Lang }) => <span className="soon-chip"><Clock size={15} aria-hidden="true" />{tr(lang, "soon")}</span>;

/** Copies a value; a toast names what was copied and the button draws a check. [F39] [I40] [I117] */
export function CopyButton({ value, lang, label }: { value: string; lang: Lang; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`btn-quiet${done ? " did" : ""}`} aria-label={label ?? tr(lang, "copy")}
      onClick={async (e) => {
        const tile = e.currentTarget.closest(".wifi-value");
        try {
          await navigator.clipboard.writeText(value);
          haptic(10);
          setDone(true);
          toast(`${tr(lang, "copied")}: ${value}`);
          tile?.classList.add("flash"); // [I115]
          setTimeout(() => { setDone(false); tile?.classList.remove("flash"); }, 2000);
        } catch { /* clipboard blocked: the value is on screen to type */ }
      }}>
      {done ? <DrawCheck size={18} /> : <Copy size={18} aria-hidden="true" />}
      <span>{tr(lang, done ? "copied" : "copy")}</span>
    </button>
  );
}

const digits = (v: string) => v.replace(/[^\d+]/g, "");

/** One fact: a label and its value, or "details coming soon" while a department still owes it. */
export function Fact({ item, ctx }: { item?: Item; ctx: Ctx }) {
  if (!item) return null;
  const { lang } = ctx;
  const type = item.data.type as string | undefined;
  const v = (item.data.v as string | undefined) ?? "";
  const value = loc(item, "value", lang);
  // [I110] A leading icon says what kind of fact this is.
  const Lead = type === "phone" ? Phone : type === "whatsapp" ? MessageCircle : type === "url" ? Link2 : null;
  return (
    <div className="fact">
      {Lead && <span className={`fact-ic ${type}`}><Lead size={18} aria-hidden="true" /></span>}
      <div className="fact-main">
        <T item={item} field="label" lang={lang} className="fact-label" />
        {item.missing ? <Soon lang={lang} /> : (
          <span className="fact-value">
            {value && <T item={item} field="value" lang={lang} as="span" className="pre" />}
            {(type === "phone" || type === "whatsapp") && v && (
              <span className="fact-actions">
                <bdi dir="ltr" className="num">{v}</bdi>
                {type === "phone" && <a className="btn-quiet call" href={`tel:${digits(v)}`}><Phone size={18} aria-hidden="true" /><span>{tr(lang, "call")}</span></a>}
                <a className="btn-quiet wa" href={`https://wa.me/${digits(v).replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} aria-hidden="true" /><span>{tr(lang, "whatsapp")}</span>
                </a>
                <CopyButton value={v} lang={lang} /> {/* [I111] */}
              </span>
            )}
            {type === "url" && v && <a className="btn-quiet" href={v} target="_blank" rel="noopener noreferrer"><span>{v.replace(/^https?:\/\//, "")}</span><ExternalLink size={16} aria-hidden="true" /></a>}
          </span>
        )}
      </div>
    </div>
  );
}

export const fmt = (min: number) => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, "0")} ${min < 720 ? "am" : "pm"}`;

interface OpenState { open: boolean; wait: number | null; current: number }
/** "Open now" from the hours text; null when a line is not two clock times. */
function openState(hours: string, minutes: number): OpenState | null {
  const ranges = hours.split("\n").map((line) => parseRange(line));
  if (!ranges.length || ranges.some((r) => !r)) return null;
  const current = ranges.findIndex((r) => minutes >= r![0] && minutes < r![1]);
  if (current >= 0) return { open: true, wait: ranges[current]![1] - minutes, current };
  const next = ranges.filter((r) => r![0] > minutes).sort((a, b) => a![0] - b![0])[0];
  return { open: false, wait: next ? next[0] - minutes : null, current: -1 };
}
export const officeHours = (item: Item, payload: Payload) => item.t.hours || (item.data.useDefault ? byId(payload, "fact.hours.default")?.t.value ?? "" : "");
export const isOpenNow = (item: Item, payload: Payload, minutes: number) => !!openState(officeHours(item, payload), minutes)?.open;

export function Office({ item, ctx }: { item?: Item; ctx: Ctx }) {
  if (!item) return null;
  const { lang, payload, minutes } = ctx;
  const own = loc(item, "hours", lang);
  const hours = own || (item.data.useDefault ? loc(byId(payload, "fact.hours.default"), "value", lang) : "");
  // Clock times read the same in both languages, so "open now" is worked out from the English lines.
  const state = officeHours(item, payload) ? openState(officeHours(item, payload), minutes) : null;
  const note = loc(item, "note", lang);
  return (
    <section className="office" data-open={state ? String(state.open) : undefined}>
      <div className="office-head">
        <T item={item} field="name" lang={lang} as="h3" />
        {state && <span className={`pill ${state.open ? "open" : "shut"}`}>{state.open && <i className="live" aria-hidden="true" />}{tr(lang, state.open ? "openNow" : "closedNow")}</span>}
      </div>
      <p className="office-where"><MapPin size={16} aria-hidden="true" /><T item={item} field="where" lang={lang} /></p>
      {hours ? (
        <ul className="hours" dir="ltr">{hours.split("\n").map((h, i) => <li key={i} className={state?.current === i ? "on" : ""}><bdi>{h}</bdi></li>)}</ul>
      ) : <Soon lang={lang} />}
      {state && state.wait !== null && <p className="opens"><Clock size={15} aria-hidden="true" />{tr2(lang, state.open ? "closesIn" : "opensIn")} <bdi dir="ltr" className="num">{fmtWait(state.wait)}</bdi></p>}
      {note && <T item={item} field="note" lang={lang} as="p" className="office-note" />}
      {((item.data.facts as string[] | undefined) ?? []).map((id) => <Fact key={id} item={byId(payload, id)} ctx={ctx} />)}
    </section>
  );
}

/** [I108] Every office, with a plain switch between all of them and those open now. */
function Offices({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const [only, setOnly] = useState(false);
  const all = inGroup(payload, "office", "offices");
  const open = all.filter((o) => isOpenNow(o, payload, minutes));
  const shown = only ? open : all;
  return (
    <>
      <div className="chips" role="group">
        <button type="button" className="chip" aria-pressed={!only} onClick={() => { haptic(); setOnly(false); }}>{tr2(lang, "all")} <b>{all.length}</b></button>
        <button type="button" className="chip" aria-pressed={only} onClick={() => { haptic(); setOnly(true); }}><i className="live" aria-hidden="true" />{tr(lang, "openNow")} <b>{open.length}</b></button>
      </div>
      {shown.map((o) => <div key={o.id} className="block"><Office item={o} ctx={ctx} /></div>)}
      {shown.length === 0 && <div className="block empty"><Clock size={26} aria-hidden="true" /><p>{tr(lang, "closedNow")}</p></div>}
    </>
  );
}

/** A picture that fades in once loaded. [I104] */
export function Pic({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [ready, setReady] = useState(false);
  return <img src={src} alt={alt} className={`pic${ready ? " ready" : ""} ${className ?? ""}`} loading="lazy" onLoad={() => setReady(true)} />;
}

/** Today's menu in full: both meals, every item, each meal's time, and the card as a labelled button. [F2] [F3] */
export function MenuCard({ ctx }: { ctx: Ctx }) {
  const { lang, payload, minutes } = ctx;
  const menu = payload.menu;
  const [zoom, setZoom] = useState(false);
  if (!menu || (!menu.lunch.length && !menu.dinner.length && !menu.image)) {
    return <div className="empty"><Utensils size={26} aria-hidden="true" /><p>{tr(lang, "menuNone")}</p></div>;
  }
  return (
    <div className="menu">
      <div className="menu-cols">
        {(["lunch", "dinner"] as const).map((meal) => {
          const fact = byId(payload, `fact.mawaid.${meal}`);
          const range = parseRange(fact?.t.value ?? "");
          const serving = !!range && minutes >= range[0] && minutes < range[1];
          const MealIcon = meal === "lunch" ? Sun : Moon;
          return menu[meal].length > 0 && (
            <div key={meal} className={serving ? "serving" : ""}>
              {/* [F45] The same meal names as the day list. [I20] [I18] [I22] */}
              <h4><MealIcon size={17} aria-hidden="true" /><span {...fallbackProps(isFallback(fact, "label", lang))}>{loc(fact, "label", lang) || tr(lang, meal)}</span>{serving && <span className="pill open">{tr(lang, "now")}</span>}</h4>
              {fact && <p className="menu-time" dir="ltr">{fact.t.value}</p>}
              <ul dir="ltr">{menu[meal].map((x, i) => <li key={i} style={{ ["--i" as string]: i }}>{x}</li>)}</ul>
            </div>
          );
        })}
      </div>
      {menu.image && (
        <button type="button" className="menu-card-btn" onClick={() => setZoom(true)}>
          <Pic src={`/api/file/${menu.image}`} alt="" />
          <span><Maximize2 size={18} aria-hidden="true" />{tr(lang, "menuImage")}</span>
        </button>
      )}
      {zoom && menu.image && <Lightbox src={`/api/file/${menu.image}`} alt={tr(lang, "menuToday")} onClose={() => setZoom(false)} lang={lang} />}
    </div>
  );
}

/** Full-screen picture with a labelled close button. Pinch to zoom; tapping the picture also enlarges it. [I105] */
export function Lightbox({ src, alt, onClose, lang }: { src: string; alt: string; onClose: () => void; lang: Lang }) {
  const [big, setBig] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt || tr2(lang, "fullScreen")}>
      <button type="button" className="lightbox-close frost" onClick={onClose}><X size={22} aria-hidden="true" /><span>{tr(lang, "close")}</span></button>
      <div className="lightbox-scroll" onClick={() => setBig((b) => !b)}>
        <img src={src} alt={alt} className={big ? "big" : ""} />
      </div>
    </div>,
    document.body,
  );
}

export function PageLink({ item, lang }: { item: Item; lang: Lang }) {
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  const path = `/p/${item.id.replace(/^page\./, "")}`;
  return (
    <a className="row-link" href={path} onClick={(e) => { e.preventDefault(); go(path); }}>
      <span className="row-icon"><Icon name={item.icon} /></span>
      <T item={item} field="title" lang={lang} className="row-title" />
      <Chevron size={20} aria-hidden="true" className="row-chevron" />
    </a>
  );
}

/** A section that opens and closes with a labelled button, never an unmarked tap. [F12] [I77] [I112] */
export function Fold({ label, open: start = false, children }: { label: ReactNode; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(start);
  return (
    <div className="fold" data-open={open}>
      <button type="button" className="fold-btn" aria-expanded={open} onClick={() => { haptic(); setOpen(!open); }}>
        <span>{label}</span><ChevronDown size={20} aria-hidden="true" />
      </button>
      <div className="fold-body"><div>{children}</div></div>
    </div>
  );
}

export function Blocks({ pageId, ctx, wifi }: { pageId: string; ctx: Ctx; wifi?: ReactNode }) {
  const { lang, payload } = ctx;
  const [zoom, setZoom] = useState<string | null>(null);
  const blocks = inGroup(payload, "block", pageId);
  const owed = inGroup(payload, "fact", pageId);
  return (
    <>
      {blocks.map((b) => {
        const type = b.data.type as string;
        const title = loc(b, "title", lang);
        const head = title ? <T item={b} field="title" lang={lang} as="h3" className="block-title" /> : null;
        const body = loc(b, "body", lang);
        const fb = isFallback(b, "body", lang);
        if (b.missing) return <div key={b.id} className="block">{head}<Soon lang={lang} /></div>;
        switch (type) {
          case "warn":
            return <div key={b.id} className="block warn"><span className="warn-ic"><AlertTriangle size={24} aria-hidden="true" /></span>{head}<Body text={body} fallback={fb} /></div>;
          case "steps":
            return <div key={b.id} className="block">{head}<Body text={body} steps fallback={fb} /></div>;
          case "image": {
            const src = (b.data.src as string) || (b.data.file ? `/api/file/${b.data.file}` : "");
            const caption = loc(b, "caption", lang);
            return (
              <figure key={b.id} className={`block figure${b.data.narrow ? " narrow" : ""}`}>
                {b.data.zoom ? <button type="button" className="figure-zoom" onClick={() => setZoom(src)} aria-label={tr2(lang, "fullScreen")}><Pic src={src} alt={title || caption} /></button> : <Pic src={src} alt={title || caption} />}
                {/* [F13] Zooming has its own labelled button; tapping the picture is a bonus, not the only way. */}
                {b.data.zoom && <button type="button" className="btn-main slim" onClick={() => setZoom(src)}><Maximize2 size={19} aria-hidden="true" />{tr2(lang, "fullScreen")}</button>}
                {caption && !b.data.zoom && <T item={b} field="caption" lang={lang} as="figcaption" />}
              </figure>
            );
          }
          case "office":
            return <div key={b.id} className="block">{head}<Office item={byId(payload, b.data.ref)} ctx={ctx} /></div>;
          case "offices":
            return <Offices key={b.id} ctx={ctx} />;
          case "facts":
            return <div key={b.id} className="block">{head}<div className="facts">{((b.data.refs as string[]) ?? []).map((id) => <Fact key={id} item={byId(payload, id)} ctx={ctx} />)}</div></div>;
          case "menu":
            return <div key={b.id} className="block">{head}<MenuCard ctx={ctx} /></div>;
          case "link": {
            const target = byId(payload, b.data.to);
            return target ? <PageLink key={b.id} item={target} lang={lang} /> : null;
          }
          case "wifi":
            return <div key={b.id} className="block">{wifi}</div>;
          case "faq": {
            const faqs = inGroup(payload, "faq", "faq");
            return faqs.length ? (
              <div key={b.id} className="block">
                {faqs.map((f) => <Fold key={f.id} label={<T item={f} field="q" lang={lang} />}><Body text={loc(f, "a", lang)} fallback={isFallback(f, "a", lang)} /></Fold>)}
              </div>
            ) : null;
          }
          default:
            return <div key={b.id} className="block">{head}{body && <Body text={body} fallback={fb} />}</div>;
        }
      })}
      {owed.length > 0 && (
        <div className="block facts">
          {owed.map((f) => f.missing
            ? <Fact key={f.id} item={f} ctx={ctx} />
            : <div key={f.id}><T item={f} field="label" lang={lang} as="h3" className="block-title" /><Body text={loc(f, "value", lang)} fallback={isFallback(f, "value", lang)} /></div>)}
        </div>
      )}
      {zoom && <Lightbox src={zoom} alt="" onClose={() => setZoom(null)} lang={lang} />}
    </>
  );
}
