import { useMemo, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { BedDouble, MapPin } from "lucide-react";
import { nextUp, isOver, type Day } from "../shared/nextup";
import { addDays, type KarbalaNow } from "../shared/time";
import { assemblyFor } from "../shared/ziyarat";
import { tr, tr2, type Lang } from "./i18n";
import { go } from "./router";
import { Community, assemblyTime, longDate, placeName } from "./screens";
import { signIn, signOut, type Me, type RoomInfo } from "./session";
import { byId, inGroup, isFallback, loc } from "./store";
import { Body, CopyButton, Sheet, Soon, T, Tab, type Ctx } from "./ui";

const link = (path: string) => ({ href: path, onClick: (e: React.MouseEvent) => { e.preventDefault(); go(path); } });

export function SignInForm({ lang }: { lang: Lang }) {
  const [tour, setTour] = useState("");
  const [its, setIts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form className="signin pane" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true); setError("");
      const problem = await signIn(tour, its);
      setBusy(false);
      if (problem) setError(problem);
      else go("/");
    }}>
      <h1 className="page-title">{tr2(lang, "signInTitle")}</h1>
      <label className="field">
        <span>{tr(lang, "tourId")}</span>
        <input dir="ltr" inputMode="numeric" autoComplete="username" name="tour" value={tour} onChange={(e) => setTour(e.target.value)} required aria-describedby="tour-hint" />
        <small id="tour-hint">{tr2(lang, "tourIdHint")}</small>
      </label>
      <label className="field">
        <span>{tr(lang, "its")}</span>
        <input dir="ltr" type="password" inputMode="numeric" autoComplete="current-password" name="its" value={its} onChange={(e) => setIts(e.target.value)} required maxLength={8} aria-describedby="its-hint" />
        <small id="its-hint">{tr2(lang, "itsHint")}</small>
      </label>
      {error && <p className="form-error" role="alert" dir="ltr">{error}</p>}
      <button className="btn-main" disabled={busy || !tour.trim() || !its.trim()}>{busy ? tr2(lang, "signingIn") : tr(lang, "signIn")}</button>
      <p className="soon">{tr2(lang, "signInHelp")}</p>
    </form>
  );
}

const tourNumber = (tour: string) => tour.split("/").pop() ?? tour;

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
  return special ?? facts.find((f) => !f.data.match);
}

export function RoomCard({ me, ctx, onArch }: { me: Me; ctx: Ctx; onArch?: boolean }) {
  const { lang, payload } = ctx;
  const room = me.room?.state === "assigned" ? currentRoom(me.room.rooms, payload.today) : null;
  if (room) {
    const enter = enterText(ctx, room.building);
    return (
      <div className={onArch ? "" : "room"}>
        <p className={onArch ? "arch-big" : "room-big"} dir="ltr">{tr2(lang, "room")} {room.room}</p>
        <p className={onArch ? "arch-detail" : "room-detail"} dir="ltr">{room.building}{room.floor ? `, ${tr2(lang, "floor").toLowerCase()} ${room.floor}` : ""}</p>
        {enter && <p className={onArch ? "arch-detail" : "room-detail"}><T item={enter} field="value" lang={lang} /></p>}
      </div>
    );
  }
  const notFaiz = byId(payload, "fact.stay.notfaiz");
  const line = !me.verified
    ? me.reason === "not_listed" ? <>{tr2(lang, "roomNotListed")} <T item={notFaiz} field="value" lang={lang} /></> : tr2(lang, "roomUnavailable")
    : tr2(lang, "roomAwaiting");
  return <p className={onArch ? "arch-detail" : "room-detail"}>{line}</p>;
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
      <>
        <p className="arch-kicker">{tr2(lang, "nextZiyarat")} · {dayWord(up.day.date, now, lang)}</p>
        <h1 className="arch-title" dir="ltr">{up.day.name}</h1>
        {a ? <p className={a.time ? "arch-big" : "arch-big worded"} dir="auto">{assemblyTime(payload, a, lang)}</p> : <p className="arch-detail">{tr(lang, "soon")}</p>}
        {place && <p className="arch-detail"><MapPin size={17} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> {a!.bus ? tr(lang, "bus") : tr(lang, "assembly")}: {place.name}</p>}
        <div className="arch-actions">
          {place?.mapUrl && <a className="btn-cream" href={place.mapUrl} target="_blank" rel="noopener noreferrer">{tr(lang, "map")}</a>}
          <a className="btn-line" {...link("/ziyarat")}>{tr2(lang, "whatToBring")}</a>
        </div>
      </>
    );
  }
  if (up.type === "departure") {
    const checkout = byId(payload, "fact.stay.checkout");
    return (
      <>
        <p className="arch-kicker">{tr2(lang, "departure")}</p>
        <h1 className="arch-title">{me.stay.departure ? dayWord(me.stay.departure, now, lang) : ""}</h1>
        {checkout && <p className="arch-detail"><T item={checkout} field="label" lang={lang} />: <bdi dir="ltr">{loc(checkout, "value", lang)}</bdi></p>}
        <div className="arch-actions"><a className="btn-cream" {...link("/p/departure")}>{tr2(lang, "departureSteps")}</a></div>
      </>
    );
  }
  return (
    <>
      <p className="arch-kicker">{up.type === "arrival" ? tr2(lang, "arrivalDay") : tr2(lang, "yourRoom")}</p>
      <h1 className="arch-title">{tr2(lang, "yourRoom")}</h1>
      <RoomCard me={me} ctx={ctx} onArch />
      {up.type === "arrival" && up.ziyaratToday && <p className="arch-detail" dir="ltr">{up.ziyaratToday.name}: {tr2(lang, "today").toLowerCase()}</p>}
      <div className="arch-actions"><a className="btn-line" {...link("/p/room")}>{tr2(lang, "howToGetIn")}</a></div>
    </>
  );
}

export function SignedInBar({ me, lang }: { me: Me; lang: Lang }) {
  return (
    <p className="who">
      <span dir="ltr">{tr2(lang, "tour")} {me.tour}</span>
      <button type="button" className="who-out" onClick={() => void signOut()}>{tr(lang, "notYou")}</button>
    </p>
  );
}

export function StayCard({ me, ctx }: { me: Me; ctx: Ctx }) {
  const { lang } = ctx;
  return (
    <>
      <RoomCard me={me} ctx={ctx} />
      <div className="facts">
        {me.stay.arrival && <div className="fact"><span className="fact-label">{tr2(lang, "arrival")}</span><span className="fact-value" dir="ltr">{longDate(me.stay.arrival)}</span></div>}
        {me.stay.departure && <div className="fact"><span className="fact-label">{tr2(lang, "departure")}</span><span className="fact-value" dir="ltr">{longDate(me.stay.departure)}</span></div>}
      </div>
    </>
  );
}

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
      <h4>{tr2(lang, "whatToBring")}</h4>
      {bring}
      <div className="zday-links">
        <a className="btn-quiet" {...link("/p/libas")}><T item={byId(payload, "page.libas")} field="title" lang={lang} /></a>
        <a className="btn-quiet" {...link("/madad")}>{tr2(lang, "wheelchairFor")}</a>
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
  return (
    <>
      <Tab>{tr2(lang, "schedule")}</Tab>
      {days.length === 0 && <p className="soon">{tr2(lang, "noSchedule")}</p>}
      <ol className="zdays">
        {days.map((d) => {
          const date = new Date(`${d.date}T00:00:00Z`);
          const a = assemblyFor(d.kind, d.date, lateKnown);
          const place = a ? placeName(payload, a.place, lang) : null;
          const over = isOver(d, now, lateKnown);
          return (
            <li key={`${d.date}${d.kind}`} style={{ ["--i" as string]: days.indexOf(d) }} className={`zday pane${over ? " over" : ""}${d === next ? " next" : ""}`}>
              <div className="zday-date" dir="ltr" aria-label={longDate(d.date)}>
                <span>{WD[date.getUTCDay()]}</span><strong>{date.getUTCDate()}</strong><span>{MO[date.getUTCMonth()]}</span>
              </div>
              <details className="zday-main" open={d === next}>
                <summary>
                  <span className="zday-name" dir="ltr">{d.name}{over && <span className="pill shut">{tr2(lang, "done")}</span>}{d === next && <span className="pill next">{dayWord(d.date, now, lang)}</span>}</span>
                  {a ? <span className="zday-time" dir="auto">{assemblyTime(payload, a, lang)}</span> : <Soon lang={lang} />}
                  {place && <span className="zday-place"><MapPin size={16} aria-hidden="true" /> {a!.bus ? tr(lang, "bus") : tr(lang, "assembly")}: {place.name}</span>}
                </summary>
                {place?.mapUrl && <a className="btn-quiet" href={place.mapUrl} target="_blank" rel="noopener noreferrer">{tr(lang, "map")}</a>}
                <BringFor day={d} ctx={ctx} />
              </details>
            </li>
          );
        })}
      </ol>
      <p className="soon" style={{ margin: "14px 0" }}>{tr2(lang, "scheduleChanges")}</p>
      <Community ctx={ctx} />
    </>
  );
}

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 12, scalable: true });
  }, [text]);
  return <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

/** Wi-Fi as clear numbered steps, with the zair's own ITS and tour ID written out. */
export function WifiSteps({ me, ctx }: { me: Me | null; ctx: Ctx }) {
  const { lang, payload } = ctx;
  if (!me) return <><p className="lead">{tr(lang, "wifiSignIn")}</p><a className="btn-main" style={{ marginTop: 14 }} {...link("/signin")}>{tr(lang, "signIn")}</a></>;
  const ssid = byId(payload, "fact.wifi.ssid");
  const pass = byId(payload, "fact.wifi.password");
  if (!me.verified || !ssid) return <p className="lead">{tr2(lang, "wifiNeedsIts")}</p>;
  const name = ssid.t.value ?? "";
  const password = pass && !pass.missing ? pass.t.value ?? "" : "";
  const second = `${tourNumber(me.tour)}000`;
  const Value = ({ label, value }: { label: string; value: string }) => (
    <div className="wifi-value"><span className="fact-label">{label}</span><span className="wifi-row"><bdi dir="ltr" className="wifi-code">{value}</bdi><CopyButton value={value} lang={lang} label={`${tr(lang, "copy")}: ${label}`} /></span></div>
  );
  return (
    <ol className="wifi">
      <li>
        <span className="step-n">1</span>
        <div>
          <T item={byId(payload, "fact.wifi.step1")} field="value" lang={lang} as="p" />
          <Value label={tr2(lang, "wifiNetwork")} value={name} />
          {password ? <Value label={tr2(lang, "wifiPassword")} value={password} /> : <Soon lang={lang} />}
          {password && <><Qr text={`WIFI:T:WPA;S:${wifiEscape(name)};P:${wifiEscape(password)};;`} /><p className="soon">{tr2(lang, "wifiQr")}</p></>}
        </div>
      </li>
      <li>
        <span className="step-n">2</span>
        <div>
          <T item={byId(payload, "fact.wifi.step2")} field="value" lang={lang} as="p" />
          <Value label={tr2(lang, "wifiFirst")} value={me.its} />
          <Value label={tr2(lang, "wifiSecond")} value={second} />
          <T item={byId(payload, "fact.wifi.note")} field="value" lang={lang} as="p" className="soon" />
        </div>
      </li>
    </ol>
  );
}

/** Dashboard tile for the zair's own room; opens the stay details. */
export function RoomTile({ me, ctx }: { me: Me; ctx: Ctx }) {
  const { lang, payload } = ctx;
  const [open, setOpen] = useState(false);
  const room = me.room?.state === "assigned" ? currentRoom(me.room.rooms, payload.today) : null;
  const state = room ? null : !me.verified ? (me.reason === "not_listed" ? loc(byId(payload, "fact.stay.notfaiz"), "value", lang) : tr2(lang, "roomUnavailable")) : tr2(lang, "roomAwaiting");
  return (
    <>
      <button type="button" className="tile pane" onClick={() => setOpen(true)}>
        <span className="tile-label"><BedDouble size={16} aria-hidden="true" />{tr2(lang, "yourRoom")}</span>
        {room ? (
          <>
            <span className="tile-big" dir="ltr">{room.room}</span>
            <span className="tile-sub" dir="ltr">{room.building}{room.floor ? `, ${tr2(lang, "floor").toLowerCase()} ${room.floor}` : ""}</span>
          </>
        ) : <span className="tile-sub" style={{ color: "var(--ink)" }}>{state}</span>}
      </button>
      {open && (
        <Sheet title={tr2(lang, "stay")} onClose={() => setOpen(false)} lang={lang}>
          <StayCard me={me} ctx={ctx} />
          <a className="btn-main" style={{ marginTop: 14 }} {...link("/p/room")} onClick={(e) => { e.preventDefault(); setOpen(false); go("/p/room"); }}>{tr2(lang, "howToGetIn")}</a>
        </Sheet>
      )}
    </>
  );
}
