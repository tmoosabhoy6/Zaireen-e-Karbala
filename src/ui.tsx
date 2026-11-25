import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Accessibility, Banknote, BedDouble, BookOpen, Building2, Bus, Car, Check, ChevronLeft, ChevronRight, Clock, Copy, HandHeart,
  HeartPulse, IdCard, Info, Luggage, MapPin, MessageCircle, Phone, Plane, Search, Shirt, Sparkles, Utensils, Wifi, Wrench, X,
} from "lucide-react";
import { parseRange } from "../shared/time";
import { tr, type Lang } from "./i18n";
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

/** Text in the reader's language. English shown to a Lisan reader is set left-to-right in the Latin face. */
export function T({ item, field, lang, as: Tag = "span", className }: { item?: Item; field: string; lang: Lang; as?: any; className?: string }) {
  const text = loc(item, field, lang);
  if (!text) return null;
  const fallback = isFallback(item, field, lang);
  return <Tag className={className} {...(fallback ? { dir: "ltr", lang: "en", "data-fallback": "" } : {})}>{text}</Tag>;
}

/**
 * Body text: one line per paragraph. "- " starts a bullet, "!! " a line that must not be missed.
 * With `steps`, every line is a numbered step.
 */
export function Body({ text, steps, fallback }: { text: string; steps?: boolean; fallback?: boolean }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const dir = fallback ? { dir: "ltr" as const, lang: "en", "data-fallback": "" } : {};
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
      out.push(l.startsWith("!! ") ? <p key={out.length} className="must">{l.slice(3)}</p> : <p key={out.length}>{l}</p>);
    }
  }
  flush();
  return <div className="body" {...dir}>{out}</div>;
}

/** The slides' header tab: a rose block with one notched corner. */
export function Tab({ children }: { children: ReactNode }) {
  return <h2 className="tab"><span>{children}</span></h2>;
}

export const Soon = ({ lang }: { lang: Lang }) => <span className="soon">{tr(lang, "soon")}</span>;

export function CopyButton({ value, lang, label }: { value: string; lang: Lang; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-quiet" aria-label={label ?? tr(lang, "copy")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch { /* clipboard blocked: the value is on screen to type */ }
      }}>
      {done ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
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
  return (
    <div className="fact">
      <T item={item} field="label" lang={lang} className="fact-label" />
      {item.missing ? <Soon lang={lang} /> : (
        <span className="fact-value">
          {value && <T item={item} field="value" lang={lang} as="span" className="pre" />}
          {(type === "phone" || type === "whatsapp") && v && (
            <span className="fact-actions">
              <bdi dir="ltr">{v}</bdi>
              {type === "phone" && <a className="btn-quiet" href={`tel:${digits(v)}`}><Phone size={18} aria-hidden="true" /><span>{tr(lang, "call")}</span></a>}
              <a className="btn-quiet" href={`https://wa.me/${digits(v).replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" /><span>{tr(lang, "whatsapp")}</span>
              </a>
            </span>
          )}
          {type === "url" && v && <a className="btn-quiet" href={v} target="_blank" rel="noopener noreferrer"><span>{v.replace(/^https?:\/\//, "")}</span></a>}
        </span>
      )}
    </div>
  );
}

/** "Open now" from the hours text; nothing when a line is not two clock times. */
function openState(hours: string, minutes: number): { open: boolean; opensAt?: string } | null {
  const ranges = hours.split("\n").map((line) => ({ line, r: parseRange(line) }));
  if (!ranges.length || ranges.some((x) => !x.r)) return null;
  if (ranges.some((x) => minutes >= x.r![0] && minutes < x.r![1])) return { open: true };
  const next = ranges.filter((x) => x.r![0] > minutes).sort((a, b) => a.r![0] - b.r![0])[0];
  const m = next ? /(\d{1,2}(?:[:.]\d{2})?)\s*(?:[ap]\.?m)?\s*(?:to|-|–)/i.exec(next.line) : null;
  return { open: false, opensAt: next ? fmt(next.r![0]) : undefined, ...(m ? {} : {}) };
}
export const fmt = (min: number) => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, "0")} ${min < 720 ? "am" : "pm"}`;

export function Office({ item, ctx, compact }: { item?: Item; ctx: Ctx; compact?: boolean }) {
  if (!item) return null;
  const { lang, payload, minutes } = ctx;
  const own = loc(item, "hours", lang);
  const hours = own || (item.data.useDefault ? loc(byId(payload, "fact.hours.default"), "value", lang) : "");
  // Clock times read the same in both languages, so "open now" is worked out from the English lines.
  const enHours = item.t.hours || (item.data.useDefault ? byId(payload, "fact.hours.default")?.t.value ?? "" : "");
  const state = enHours ? openState(enHours, minutes) : null;
  const note = loc(item, "note", lang);
  return (
    <section className={`office${compact ? " compact" : ""}`}>
      <div className="office-head">
        <T item={item} field="name" lang={lang} as="h3" />
        {state && <span className={`pill ${state.open ? "open" : "shut"}`}>{tr(lang, state.open ? "openNow" : "closedNow")}</span>}
      </div>
      <p className="office-where"><MapPin size={16} aria-hidden="true" /><T item={item} field="where" lang={lang} /></p>
      {hours ? (
        <ul className="hours" dir="ltr">{hours.split("\n").map((h, i) => <li key={i}><bdi>{h}</bdi></li>)}</ul>
      ) : <Soon lang={lang} />}
      {state && !state.open && state.opensAt && <p className="opens">{tr(lang, "opensAt")} <bdi dir="ltr">{state.opensAt}</bdi></p>}
      {note && <T item={item} field="note" lang={lang} as="p" className="office-note" />}
      {((item.data.facts as string[] | undefined) ?? []).map((id) => <Fact key={id} item={byId(payload, id)} ctx={ctx} />)}
    </section>
  );
}

export function MenuCard({ ctx }: { ctx: Ctx }) {
  const { lang, payload } = ctx;
  const menu = payload.menu;
  const [zoom, setZoom] = useState(false);
  if (!menu || (!menu.lunch.length && !menu.dinner.length && !menu.image)) return <p className="soon">{tr(lang, "menuNone")}</p>;
  return (
    <div className="menu">
      {menu.hijri && <p className="menu-date" dir="ltr">{menu.hijri}</p>}
      <div className="menu-cols" dir="ltr">
        {(["lunch", "dinner"] as const).map((meal) => menu[meal].length > 0 && (
          <div key={meal}>
            <h4 dir="auto">{loc(byId(payload, `fact.mawaid.${meal}`), "label", lang) || tr(lang, meal)}</h4>
            <ul>{menu[meal].map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
      {menu.image && <button type="button" className="btn-quiet" onClick={() => setZoom(true)}>{tr(lang, "menuImage")}</button>}
      {zoom && menu.image && <Lightbox src={`/api/file/${menu.image}`} alt={tr(lang, "menuToday")} onClose={() => setZoom(false)} lang={lang} />}
    </div>
  );
}

/** A pane that rises over the dashboard with the details behind a tile. */
export function Sheet({ title, onClose, lang, children }: { title: string; onClose: () => void; lang: Lang; children: ReactNode }) {
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
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet frost">
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={tr(lang, "close")}><X size={22} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Full-screen picture. The page's own pinch-zoom is used, so nothing is cropped or re-drawn. */
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
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt}>
      <button type="button" className="lightbox-close frost" onClick={onClose} aria-label={tr(lang, "close")}><X size={26} aria-hidden="true" /></button>
      <div className="lightbox-scroll" onClick={() => setBig((b) => !b)}>
        <img src={src} alt={alt} className={big ? "big" : ""} />
      </div>
    </div>,
    document.body,
  );
}

export function PageLink({ item, lang }: { item: Item; lang: Lang }) {
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  return (
    <a className="row-link" href={`/p/${item.id.replace(/^page\./, "")}`}
      onClick={(e) => { e.preventDefault(); go(`/p/${item.id.replace(/^page\./, "")}`); }}>
      <span className="row-icon"><Icon name={item.icon} /></span>
      <T item={item} field="title" lang={lang} className="row-title" />
      <Chevron size={20} aria-hidden="true" className="row-chevron" />
    </a>
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
            return <div key={b.id} className="block warn">{head}<Body text={body} fallback={fb} /></div>;
          case "steps":
            return <div key={b.id} className="block">{head}<Body text={body} steps fallback={fb} /></div>;
          case "image": {
            const src = (b.data.src as string) || (b.data.file ? `/api/file/${b.data.file}` : "");
            const caption = loc(b, "caption", lang);
            return (
              <figure key={b.id} className={`block figure${b.data.narrow ? " narrow" : ""}`}>
                {b.data.zoom
                  ? <button type="button" className="figure-zoom" onClick={() => setZoom(src)}><img src={src} alt={title || caption} /></button>
                  : <img src={src} alt={title || caption} />}
                {caption && <T item={b} field="caption" lang={lang} as="figcaption" />}
              </figure>
            );
          }
          case "office":
            return <div key={b.id} className="block">{head}<Office item={byId(payload, b.data.ref)} ctx={ctx} /></div>;
          case "offices":
            return <div key={b.id} className="block">{inGroup(payload, "office", "offices").map((o) => <Office key={o.id} item={o} ctx={ctx} />)}</div>;
          case "facts":
            return <div key={b.id} className="block">{head}<div className="facts">{((b.data.refs as string[]) ?? []).map((id) => <Fact key={id} item={byId(payload, id)} ctx={ctx} />)}</div></div>;
          case "menu":
            return <div key={b.id} className="block">{head}<MenuCard ctx={ctx} /></div>;
          case "link": {
            const target = byId(payload, b.data.to);
            return target ? <div key={b.id} className="block"><PageLink item={target} lang={lang} /></div> : null;
          }
          case "wifi":
            return <div key={b.id} className="block">{wifi}</div>;
          case "faq": {
            const faqs = inGroup(payload, "faq", "faq");
            return faqs.length ? (
              <div key={b.id} className="block">
                {faqs.map((f) => <details key={f.id} className="faq"><summary><T item={f} field="q" lang={lang} /></summary><Body text={loc(f, "a", lang)} fallback={isFallback(f, "a", lang)} /></details>)}
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
            : <div key={f.id} className="block"><T item={f} field="label" lang={lang} as="h3" className="block-title" /><Body text={loc(f, "value", lang)} fallback={isFallback(f, "value", lang)} /></div>)}
        </div>
      )}
      {zoom && <Lightbox src={zoom} alt="" onClose={() => setZoom(null)} lang={lang} />}
    </>
  );
}
