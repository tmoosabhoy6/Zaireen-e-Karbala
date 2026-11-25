import { useMemo, useRef, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import {
  Accessibility, BedDouble, Building2, Bus, CalendarDays, ChevronLeft, ChevronRight, Clock, CloudOff, DoorOpen, ExternalLink, Eye, EyeOff,
  IdCard, KeyRound, Loader2, LogIn, MapPin, Shirt, Ticket,
} from "lucide-react";
import { nextUp, isOver, type Day } from "../shared/nextup";
import { addDays, dayDiff, parseClock, type KarbalaNow } from "../shared/time";
import { assemblyFor, parseTourId, toAsciiDigits } from "../shared/ziyarat";
import { DrawCheck, Reveal, Ticker, fmtWait, haptic, toast } from "./fx";
import { tr, tr2, type Key2, type Lang } from "./i18n";
import { go } from "./router";
import { Community, assemblyTime, longDate, placeName } from "./screens";
import { signIn, signOut, type Me, type RoomInfo } from "./session";
import { byId, inGroup, isFallback, loc } from "./store";
import { Body, CopyButton, Fold, Soon, T, Tab, type Ctx } from "./ui";

const link = (path: string) => ({ href: path, onClick: (e: React.MouseEvent) => { e.preventDefault(); go(path); } });

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/** [F38] Sign-in problems are worded in the reader's language, from the server's code. */
const ERRORS: Record<string, Key2> = { bad_tour: "errTour", bad_its: "errIts", no_tour: "errNoTour", too_many: "errMany", no_schedule: "errSchedule", offline: "errOffline" };

export function SignInForm({ lang }: { lang: Lang }) {
  const [tour, setTour] = useState("");
  const [its, setIts] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const tourRef = useRef<HTMLInputElement>(null);
  const itsRef = useRef<HTMLInputElement>(null);
  const tourOk = !!parseTourId(tour);
  const itsOk = its.length === 8;
  return (
    <form className="signin pane" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (busy || done) return;
      setBusy(true); setError("");
      const code = await signIn(tour, its);
      setBusy(false);
      if (code) {
        setError(code);
        haptic(30);
        (code === "bad_its" ? itsRef : code === "bad_tour" || code === "no_tour" ? tourRef : null)?.current?.focus(); // [I69]
      } else {
        setDone(true); // [I65]
        haptic(12);
        setTimeout(() => go("/"), 700);
      }
    }}>
      <span className="signin-arch" aria-hidden="true" /> {/* [I70] */}
      <h1 className="page-title"><span className="page-ic"><LogIn size={24} aria-hidden="true" /></span>{tr2(lang, "signInTitle")}</h1>
      {/* [I61] Two steps, shown as they are completed. */}
      <ol className="stepper" aria-hidden="true">
        <li className={tourOk ? "ok" : "on"}><b>{tourOk ? <DrawCheck size={15} /> : 1}</b>{tr(lang, "tourId")}</li>
        <li className={itsOk ? "ok" : tourOk ? "on" : ""}><b>{itsOk ? <DrawCheck size={15} /> : 2}</b>{tr(lang, "its")}</li>
      </ol>
      <label className="field">
        <span>{tr(lang, "tourId")}</span>
        <span className="field-box">
          <Ticket size={20} aria-hidden="true" /> {/* [I68] */}
          <input ref={tourRef} dir="ltr" inputMode="numeric" autoComplete="username" name="tour" enterKeyHint="next" value={tour} required aria-describedby="tour-hint"
            onChange={(e) => setTour(toAsciiDigits(e.target.value).replace(/[^\d/\-]/g, "").slice(0, 8))} /* [I66] */
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); itsRef.current?.focus(); } }} /* [I64] */ />
          {tourOk && <span className="field-ok"><DrawCheck /></span>} {/* [I62] */}
        </span>
        <small id="tour-hint">{tr2(lang, "tourIdHint")}</small>
      </label>
      <label className="field">
        <span>{tr(lang, "its")}</span>
        <span className="field-box">
          <IdCard size={20} aria-hidden="true" />
          <input ref={itsRef} dir="ltr" type={show ? "text" : "password"} inputMode="numeric" autoComplete="current-password" name="its" enterKeyHint="go" value={its} required aria-describedby="its-hint"
            onChange={(e) => setIts(toAsciiDigits(e.target.value).replace(/\D/g, "").slice(0, 8))} />
          {itsOk ? <span className="field-ok"><DrawCheck /></span> : its.length > 0 && <bdi className="field-count" dir="ltr">{its.length}/8</bdi>} {/* [I63] */}
          {/* [F37] The ITS can be checked before sending. */}
          <button type="button" className="field-eye" onClick={() => setShow(!show)} aria-pressed={show}>{show ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}<span>{tr2(lang, show ? "hide" : "show")}</span></button>
        </span>
        <small id="its-hint">{tr2(lang, "itsHint")}</small>
      </label>
      {error && <p className="form-error" role="alert">{tr2(lang, ERRORS[error] ?? "errOther")}</p>}
      <button className={`btn-main${done ? " done" : ""}`} disabled={busy || !tour.trim() || !its.trim()}>
        {/* [F36] A spinner while checking, then a check. */}
        {done ? <DrawCheck size={24} /> : busy ? <><Loader2 size={20} className="spin" aria-hidden="true" />{tr2(lang, "signingIn")}</> : tr(lang, "signIn")}
      </button>
      <p className="help-line"><span className="eg" dir="ltr">26/5253</span><span className="eg" dir="ltr">5253</span>{tr2(lang, "signInHelp")}</p> {/* [I67] */}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Room and stay
// ---------------------------------------------------------------------------

const tourNumber = (tour: string) => tour.split("/").pop() ?? tour;
const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
};

function dayWord(date: string, now: KarbalaNow, lang: Lang): string {
  if (date === now.date) return tr2(lang, "today");
  if (date === addDays(now.date, 1)) return tr2(lang, "tomorrow");
  return longDate(date);
}

/** The room NKERP has for tonight, else the first one still to come. */
function currentRoom(rooms: RoomInfo[], today: string): RoomInfo | null {
  return rooms.find((r) => r.nights.includes(today)) ?? rooms.find((r) => r.nights.some((n) => n >= today)) ?? rooms[rooms.length - 1] ?? null;
}

function enterText(ctx: Ctx, building: string) {
  const facts = inGroup(ctx.payload, "fact", "stay").filter((f) => f.id.startsWith("fact.stay.enter."));
  const special = facts.find((f) => f.data.match && building.toLowerCase().includes(String(f.data.match).toLowerCase()));
  return { fact: special ?? facts.find((f) => !f.data.match), key: !!special };
}

function roomState(me: Me, ctx: Ctx): { room: RoomInfo | null; text: ReactNode; kind: "ok" | "wait" | "off" | "out" } {
  const { lang, payload } = ctx;
  const room = me.room?.state === "assigned" ? currentRoom(me.room.rooms, payload.today) : null;
  if (room) return { room, text: null, kind: "ok" };
  if (me.verified) return { room: null, text: tr2(lang, "roomAwaiting"), kind: "wait" };
  if (me.reason === "not_listed") return { room: null, text: <T item={byId(payload, "fact.stay.notfaiz")} field="value" lang={lang} />, kind: "out" };
  return { room: null, text: tr2(lang, "roomUnavailable"), kind: "off" };
}

/** [F5] The zair's room, how to get in, and the stay dates: all in plain view on Aaj. */
export function RoomCard({ me, ctx }: { me: Me; ctx: Ctx }) {
  const { lang, payload } = ctx;
  const { room, text, kind } = roomState(me, ctx);
  const enter = room ? enterText(ctx, room.building) : null;
  const { arrival, departure } = me.stay;
  const span = arrival && departure ? Math.max(1, dayDiff(departure, arrival)) : 0;
  const at = arrival && span ? Math.min(1, Math.max(0, dayDiff(payload.today, arrival) / span)) : 0;
  const StateIcon = kind === "wait" ? Clock : kind === "out" ? Building2 : CloudOff; // [I17]
  const Chevron = lang === "lud" ? ChevronLeft : ChevronRight;
  return (
    <section className="keycard" data-kind={kind}>
      <div className="kc-top">
      <i className="kc-hole" aria-hidden="true" />
      <h2 className="card-title"><BedDouble size={20} aria-hidden="true" />{tr2(lang, "yourRoom")}</h2>
      {room ? (
        <>
          <p className="room-big" dir="ltr">{tr2(lang, "room")} <Ticker value={room.room} /></p> {/* [I13] */}
          <p className="room-detail" dir="ltr">{room.building}{room.floor ? `, ${tr2(lang, "floor").toLowerCase()} ${room.floor}` : ""}</p>
          {enter?.fact && <p className="room-enter">{enter.key ? <KeyRound size={19} aria-hidden="true" /> : <DoorOpen size={19} aria-hidden="true" />}<T item={enter.fact} field="value" lang={lang} /></p>} {/* [I14] */}
        </>
      ) : <p className="room-state"><StateIcon size={22} aria-hidden="true" /><span>{text}</span></p>}
      </div>
      <div className="kc-tear" aria-hidden="true" />
      <div className="kc-stub">
      {arrival && departure && (
        // [I15] The stay as a bar from arrival to departure, with today marked.
        <div className="stay" dir="ltr">
          <span className="stay-end"><small>{tr2(lang, "arrival")}</small>{shortDate(arrival)}</span>
          <span className="stay-bar" aria-hidden="true"><i style={{ ["--p" as string]: `${Math.round(at * 100)}%` }} /></span>
          <span className="stay-end end"><small>{tr2(lang, "departure")}</small>{shortDate(departure)}</span>
        </div>
      )}
      <a className="btn-quiet" {...link("/p/room")}>{tr2(lang, "notReady")}<Chevron size={18} aria-hidden="true" /></a> {/* [I16] */}
      </div>
    </section>
  );
}

/** What the arch holds for a signed-in zair: the room, the next ziyarat, or the departure. */
export function ArchForMe({ me, ctx, now }: { me: Me; ctx: Ctx; now: KarbalaNow }) {
  const { lang, payload } = ctx;
  const days = me.schedule?.days ?? [];
  const lateKnown = me.schedule?.lateKnown ?? true;
  const up = nextUp(me.stay, days, now, lateKnown);

  if (up.type === "ziyarat") {
    const a = assemblyFor(up.day.kind, up.day.date, lateKnown);
    const place = a ? placeName(payload, a.place, lang) : null;
    return (
      // [I33] The arch's contents change with a soft cross-fade when the next thing changes.
      <div className="arch-swap" key={`z${up.day.date}${up.day.kind}`}>
        <p className="arch-kicker">{tr2(lang, "nextZiyarat")}<span className="arch-chip">{dayWord(up.day.date, now, lang)}</span></p> {/* [I31] */}
        <h1 className="arch-title" dir="ltr">{up.day.name}</h1>
        {a ? <p className={a.time ? "arch-big" : "arch-big worded"} dir="auto">{assemblyTime(payload, a, lang)}</p> : <p className="arch-detail">{tr(lang, "soon")}</p>}
        {/* [I78] A bus departure shows a bus, an assembly point a pin. */}
        {place && <p className="arch-detail">{a!.bus ? <Bus size={17} aria-hidden="true" /> : <MapPin size={17} aria-hidden="true" />} {a!.bus ? tr(lang, "bus") : tr(lang, "assembly")}: {place.name}</p>}
        <div className="arch-actions">
          {place?.mapUrl && <a className="btn-cream" href={place.mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={18} aria-hidden="true" />{tr(lang, "map")}<ExternalLink size={15} aria-hidden="true" /></a>} {/* [I32] [F48] the mark shows it opens outside the app */}
          <a className="btn-line" {...link("/ziyarat")}><Shirt size={18} aria-hidden="true" />{tr2(lang, "whatToBring")}</a>
        </div>
      </div>
    );
  }
  if (up.type === "departure") {
    const checkout = byId(payload, "fact.stay.checkout");
    return (
      <div className="arch-swap" key="dep">
        <p className="arch-kicker">{tr2(lang, "departure")}</p>
        <h1 className="arch-title">{me.stay.departure ? dayWord(me.stay.departure, now, lang) : ""}</h1>
        {checkout && <p className="arch-detail"><T item={checkout} field="label" lang={lang} />: <bdi dir="ltr">{loc(checkout, "value", lang)}</bdi></p>}
        <div className="arch-actions"><a className="btn-cream" {...link("/p/departure")}>{tr2(lang, "departureSteps")}</a></div>
      </div>
    );
  }
  const { room, text } = roomState(me, ctx);
  return (
    <div className="arch-swap" key={up.type}>
      <p className="arch-kicker">{up.type === "arrival" ? tr2(lang, "arrivalDay") : tr2(lang, "yourRoom")}</p>
      <h1 className="arch-title">{tr2(lang, "yourRoom")}</h1>
      {room ? <p className="arch-big" dir="ltr">{tr2(lang, "room")} {room.room}</p> : <p className="arch-detail">{text}</p>}
      {room && <p className="arch-detail" dir="ltr">{room.building}{room.floor ? `, ${tr2(lang, "floor").toLowerCase()} ${room.floor}` : ""}</p>}
      {up.type === "arrival" && up.ziyaratToday && <p className="arch-detail" dir="ltr">{up.ziyaratToday.name}: {tr2(lang, "today").toLowerCase()}</p>}
      <div className="arch-actions"><a className="btn-line" {...link("/p/room")}><DoorOpen size={18} aria-hidden="true" />{tr2(lang, "howToGetIn")}</a></div>
    </div>
  );
}

export function SignedInBar({ me, lang }: { me: Me; lang: Lang }) {
  return (
    <p className="who">
      <span dir="ltr"><Ticket size={16} aria-hidden="true" /> {tr2(lang, "tour")} {me.tour}</span>
      <button type="button" className="who-out" onClick={() => { haptic(); void signOut(); toast(tr2(lang, "signedOut"), "out"); /* [I41] */ }}>{tr(lang, "notYou")}</button>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Ziyarat schedule
// ---------------------------------------------------------------------------

function BringFor({ day, ctx }: { day: Day; ctx: Ctx }) {
  const { lang, payload } = ctx;
  const kind = day.kind === "pehli-late" ? "pehli" : day.kind;
  const about = byId(payload, `fact.about.${kind}`);
  let bring: ReactNode;
  if (kind === "pehli") {
    const b = inGroup(payload, "block", "page.bring").find((x) => x.data.type === "text");
    bring = b ? <Body text={loc(b, "body", lang)} fallback={isFallback(b, "body", lang)} /> : <Soon lang={lang} />;
  } else {
    const f = byId(payload, `fact.bring.${kind}`);
    bring = f && !f.missing ? <Body text={loc(f, "value", lang)} fallback={isFallback(f, "value", lang)} /> : <Soon lang={lang} />;
  }
  return (
    <div className="zday-more">
      {about && !about.missing && <Body text={loc(about, "value", lang)} fallback={isFallback(about, "value", lang)} />}
      {bring}
      <div className="zday-links">
        <a className="btn-quiet" {...link("/p/libas")}><Shirt size={18} aria-hidden="true" /><T item={byId(payload, "page.libas")} field="title" lang={lang} /></a>
        <a className="btn-quiet" {...link("/madad")}><Accessibility size={18} aria-hidden="true" />{tr2(lang, "wheelchairFor")}</a> {/* [I79] */}
      </div>
    </div>
  );
}

const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MO = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** The tour's schedule: one card per day with date, ziyarat, time and assembly point, as zt lays it out. */
export function Schedule({ me, ctx, now }: { me: Me; ctx: Ctx; now: KarbalaNow }) {
  const { lang, payload } = ctx;
  const days = me.schedule?.days ?? [];
  const lateKnown = me.schedule?.lateKnown ?? true;
  const next = days.find((d) => !isOver(d, now, lateKnown));
  const idOf = (d: Day) => `d-${d.date}-${d.kind}`;
  return (
    <>
      <Tab icon={<CalendarDays size={18} aria-hidden="true" />}>{tr2(lang, "schedule")}</Tab>
      {days.length === 0 && <div className="block empty"><CalendarDays size={26} aria-hidden="true" /><p>{tr2(lang, "noSchedule")}</p></div>} {/* [I81] */}
      {days.length > 1 && (
        // [I71] A strip of dates: each chip scrolls to that day's card.
        <nav className="strip" aria-label={tr2(lang, "schedule")} dir="ltr">
          {days.map((d) => {
            const date = new Date(`${d.date}T00:00:00Z`);
            return (
              <a key={idOf(d)} href={`#${idOf(d)}`} className={`chip day${d === next ? " on" : ""}${isOver(d, now, lateKnown) ? " past" : ""}`}
                onClick={(e) => { e.preventDefault(); haptic(); document.getElementById(idOf(d))?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                <small>{WD[date.getUTCDay()]}</small><b>{date.getUTCDate()}</b>
              </a>
            );
          })}
        </nav>
      )}
      <ol className="zdays">
        {days.map((d, i) => {
          const date = new Date(`${d.date}T00:00:00Z`);
          const a = assemblyFor(d.kind, d.date, lateKnown);
          const place = a ? placeName(payload, a.place, lang) : null;
          const over = isOver(d, now, lateKnown);
          const clock = a?.time ? parseClock(a.time) : null;
          const wait = d === next && clock !== null ? dayDiff(d.date, now.date) * 1440 + clock - now.minutes : 0;
          return (
            <li key={idOf(d)} id={idOf(d)} style={{ ["--i" as string]: i }} className={`zday pane${over ? " over" : ""}${d === next ? " next" : ""}`}>
              <div className="zday-date" dir="ltr" aria-label={longDate(d.date)}>
                <span>{WD[date.getUTCDay()]}</span><strong>{date.getUTCDate()}</strong><span>{MO[date.getUTCMonth()]}</span>
              </div>
              <div className="zday-main">
                <p className="zday-name" dir="ltr">{d.name}
                  {over && <span className="pill shut"><DrawCheck size={14} />{tr2(lang, "done")}</span>} {/* [I74] */}
                  {d === next && <span className="pill next">{dayWord(d.date, now, lang)}</span>}
                  {!over && d !== next && d.date === now.date && <span className="pill next">{tr2(lang, "today")}</span>} {/* [I80] */}
                </p>
                {/* [F11] Time and place are always shown, also for days that are done. */}
                <p className="zday-when">
                  {a ? <span className="zday-time" dir="auto">{assemblyTime(payload, a, lang)}</span> : <Soon lang={lang} />}
                  {wait > 0 && <bdi className="count" dir="ltr"><Clock size={14} aria-hidden="true" />{fmtWait(wait)}</bdi>} {/* [I72] */}
                </p>
                {place && <p className="zday-place">{a!.bus ? <Bus size={17} aria-hidden="true" /> : <MapPin size={17} aria-hidden="true" />} {a!.bus ? tr(lang, "bus") : tr(lang, "assembly")}: {place.name}</p>} {/* [I75] */}
                {place?.mapUrl && !over && <a className="btn-quiet" href={place.mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={17} aria-hidden="true" />{tr(lang, "map")}<ExternalLink size={15} aria-hidden="true" /></a>} {/* [I76] */}
                {!over && <Fold open={d === next} label={<><Shirt size={18} aria-hidden="true" />{tr2(lang, "bringToggle")}</>}><BringFor day={d} ctx={ctx} /></Fold>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="note-line">{tr2(lang, "scheduleChanges")}</p>
      <Community ctx={ctx} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 12, scalable: true });
  }, [text]);
  return <div className="qr"><div dangerouslySetInnerHTML={{ __html: svg }} /><i aria-hidden="true" /></div>; // [I116]
}

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

/** Wi-Fi as clear numbered steps, with the zair's own ITS and tour ID written out. */
export function WifiSteps({ me, ctx }: { me: Me | null; ctx: Ctx }) {
  const { lang, payload } = ctx;
  if (!me) return <><p className="lead" style={{ marginTop: 0 }}>{tr(lang, "wifiSignIn")}</p><a className="btn-main" style={{ marginTop: 14 }} {...link("/signin")}><LogIn size={20} aria-hidden="true" />{tr(lang, "signIn")}</a></>;
  const ssid = byId(payload, "fact.wifi.ssid");
  const pass = byId(payload, "fact.wifi.password");
  if (!ssid) return <Soon lang={lang} />;
  const name = ssid.t.value ?? "";
  const password = pass && !pass.missing ? pass.t.value ?? "" : "";
  const second = `${tourNumber(me.tour)}000`;
  const Value = ({ label, value }: { label: string; value: string }) => (
    // [F22] Value and Copy button share one row that never wraps under a long password.
    <div className="wifi-value"><span className="fact-label">{label}</span><span className="wifi-row"><bdi dir="ltr" className="wifi-code">{value}</bdi><CopyButton value={value} lang={lang} label={`${tr(lang, "copy")}: ${label}`} /></span></div>
  );
  return (
    <>
      <ol className="wifi">
        <li>
          <span className="step-n">1</span>
          <div>
            <T item={byId(payload, "fact.wifi.step1")} field="value" lang={lang} as="p" />
            <Value label={tr2(lang, "wifiNetwork")} value={name} />
            {password ? <Value label={tr2(lang, "wifiPassword")} value={password} /> : <Soon lang={lang} />}
            {password && <><Qr text={`WIFI:T:WPA;S:${wifiEscape(name)};P:${wifiEscape(password)};;`} /><p className="note-line">{tr2(lang, "wifiQr")}</p></>}
          </div>
        </li>
        <li>
          <span className="step-n">2</span>
          <div>
            <T item={byId(payload, "fact.wifi.step2")} field="value" lang={lang} as="p" />
            <Value label={tr2(lang, "wifiFirst")} value={me.its} />
            <Value label={tr2(lang, "wifiSecond")} value={second} />
            <T item={byId(payload, "fact.wifi.note")} field="value" lang={lang} as="p" className="note-line" />
          </div>
        </li>
      </ol>
      <p className="saved"><DrawCheck size={17} />{tr2(lang, "savedOffline")}</p> {/* [I118] */}
    </>
  );
}
