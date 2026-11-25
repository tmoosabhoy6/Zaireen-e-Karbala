import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, karbalaNow, weekdayOf } from "../shared/time";
import { majlisDefault, PLACES } from "../shared/ziyarat";
import { ICON_NAMES } from "./ui";

interface Row {
  id: string; kind: string; grp: string; sort: number; icon: string;
  en: Record<string, string>; lud: Record<string, string>; data: Record<string, any>;
  lud_ok: boolean; missing: boolean; audience: string; enabled: boolean; updated_at?: string;
}
interface MenuRow { date: string; hijri: string; lunch: string[]; dinner: string[]; image_id: string | null }
interface MajlisRow { date: string; active: number; venue_en: string; venue_lud: string; time_en: string; time_lud: string; booklet_id: string | null }
interface NewsRow { id: string; created_at: string; en: string; lud: string; lud_ok: number; media_id: string | null; enabled: number }
interface State { content: Row[]; menus: MenuRow[]; majlis: MajlisRow[]; announcements: NewsRow[] }

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method, credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "That did not work. Try again."), { status: res.status, code: data.code });
  return data as T;
}

/** Photos are shrunk on the phone before upload so pages stay quick on weak connections. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 600_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? file), "image/jpeg", 0.86));
}

async function upload(file: File): Promise<string> {
  const blob = await shrink(file);
  const res = await fetch("/api/admin/file", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": blob.type || file.type, "X-File-Name": encodeURIComponent(file.name) },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "The upload did not work.");
  return data.id as string;
}

const SECTIONS: [string, string][] = [["stay", "Your stay"], ["ziyarat", "Ziyarat"], ["places", "Offices and places"], ["travel", "Travel"], ["more", "More"], ["", "Hidden (not listed)"]];
const BLOCK_TYPES: [string, string][] = [
  ["text", "Text"], ["steps", "Numbered steps"], ["warn", "Warning box"], ["image", "Picture"], ["office", "An office"], ["offices", "All offices"],
  ["facts", "Facts (timings, contacts)"], ["menu", "Today's menu"], ["link", "Link to another page"], ["wifi", "Wi-Fi steps"], ["faq", "FAQ list"],
];
/** The fields each kind of content has in both languages. */
const FIELDS: Record<string, [string, string, boolean][]> = {
  page: [["title", "Title", false]],
  block: [["title", "Heading (optional)", false], ["body", "Text", true], ["caption", "Picture caption", false]],
  office: [["name", "Name", false], ["where", "Where", false], ["hours", "Hours, one range per line", true], ["note", "Note", true]],
  fact: [["label", "Label", false], ["value", "Value", true]],
  faq: [["q", "Question", false], ["a", "Answer", true]],
  request_type: [["title", "Title", false], ["hint", "Short description", false]],
  feedback_q: [["q", "Question", false]],
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="adm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function FilePick({ value, onChange, accept, label }: { value: string | null | undefined; onChange: (id: string | null) => void; accept: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="adm-file">
      <span>{label}</span>
      {value && <a href={`/api/file/${value}`} target="_blank" rel="noopener">Open current file</a>}
      <input type="file" accept={accept} disabled={busy} onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true); setErr("");
        try { onChange(await upload(f)); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
      }} />
      {busy && <small>Uploading…</small>}
      {err && <small className="adm-err">{err}</small>}
      {value && <button type="button" className="adm-link" onClick={() => onChange(null)}>Remove file</button>}
    </div>
  );
}

/** Edits one content row: both languages side by side, the Lisan approval switch, and its settings. */
function ItemForm({ row, onSaved, onDelete, compact }: { row: Row; onSaved: () => void; onDelete?: () => void; compact?: boolean }) {
  const [r, setR] = useState<Row>(row);
  const [status, setStatus] = useState("");
  useEffect(() => setR(row), [row]);
  const dirty = JSON.stringify(r) !== JSON.stringify(row);
  const set = (patch: Partial<Row>) => setR((x) => ({ ...x, ...patch }));
  const setData = (patch: Record<string, unknown>) => set({ data: { ...r.data, ...patch } });
  const type = r.data.type as string | undefined;
  const fields = (FIELDS[r.kind] ?? []).filter(([f]) => {
    if (r.kind !== "block") return true;
    if (f === "caption") return type === "image";
    if (f === "body") return !["image", "office", "offices", "facts", "menu", "link", "wifi", "faq"].includes(type ?? "");
    return true;
  });
  const save = async () => {
    setStatus("Saving…");
    try {
      await api("PUT", `content/${encodeURIComponent(r.id)}`, r);
      setStatus("Saved");
      onSaved();
    } catch (e) { setStatus((e as Error).message); }
  };
  return (
    <div className={`adm-item${r.missing ? " is-missing" : ""}`}>
      {!compact && <p className="adm-id">{r.id}{r.data.source ? ` · from ${r.data.source}` : ""}</p>}
      {r.kind === "block" && (
        <Field label="Kind of block">
          <select value={type ?? "text"} onChange={(e) => setData({ type: e.target.value })}>{BLOCK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
      )}
      <div className="adm-langs">
        {fields.map(([f, label, multi]) => (
          <div key={f} className="adm-pair">
            <Field label={`${label} · English`}>
              {multi ? <textarea rows={4} value={r.en[f] ?? ""} onChange={(e) => set({ en: { ...r.en, [f]: e.target.value } })} />
                : <input value={r.en[f] ?? ""} onChange={(e) => set({ en: { ...r.en, [f]: e.target.value } })} />}
            </Field>
            <Field label={`${label} · Lisan ud-Dawat`}>
              {multi ? <textarea rows={4} dir="rtl" className="lud" value={r.lud[f] ?? ""} onChange={(e) => set({ lud: { ...r.lud, [f]: e.target.value } })} />
                : <input dir="rtl" className="lud" value={r.lud[f] ?? ""} onChange={(e) => set({ lud: { ...r.lud, [f]: e.target.value } })} />}
            </Field>
          </div>
        ))}
      </div>
      {r.kind === "block" && ["text", "warn"].includes(type ?? "text") && <small>Start a line with “- ” for a bullet, or “!! ” for a line in red that must not be missed.</small>}

      {r.kind === "fact" && (
        <div className="adm-row">
          <Field label="This is a">
            <select value={r.data.type ?? ""} onChange={(e) => setData({ type: e.target.value })}>
              <option value="">Plain text</option><option value="phone">Phone number</option><option value="whatsapp">WhatsApp number</option><option value="url">Link</option>
            </select>
          </Field>
          {(r.data.type || r.grp === "place") && <Field label={r.grp === "place" ? "Map link" : r.data.type === "url" ? "Link" : "Number with country code"}><input dir="ltr" value={r.data.v ?? ""} onChange={(e) => setData({ v: e.target.value })} /></Field>}
        </div>
      )}
      {r.kind === "office" && <label className="adm-check"><input type="checkbox" checked={!!r.data.useDefault} onChange={(e) => setData({ useDefault: e.target.checked })} /> Use the default office hours when no hours are typed above</label>}
      {r.kind === "block" && type === "image" && (
        <>
          <FilePick label="Picture" accept="image/*" value={r.data.file} onChange={(id) => setData({ file: id, src: id ? "" : r.data.src })} />
          <label className="adm-check"><input type="checkbox" checked={!!r.data.zoom} onChange={(e) => setData({ zoom: e.target.checked })} /> Tap to open full screen and zoom</label>
        </>
      )}
      {r.kind === "block" && type === "office" && <Field label="Office ID" hint="For example office.clinic"><input dir="ltr" value={r.data.ref ?? ""} onChange={(e) => setData({ ref: e.target.value })} /></Field>}
      {r.kind === "block" && type === "link" && <Field label="Page ID" hint="For example page.ohbat"><input dir="ltr" value={r.data.to ?? ""} onChange={(e) => setData({ to: e.target.value })} /></Field>}
      {r.kind === "block" && type === "facts" && <Field label="Fact IDs, separated by commas"><input dir="ltr" value={(r.data.refs ?? []).join(", ")} onChange={(e) => setData({ refs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>}
      {r.kind === "page" && (
        <div className="adm-row">
          <Field label="Where it appears"><select value={r.grp} onChange={(e) => set({ grp: e.target.value })}>{SECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Icon"><select value={r.icon} onChange={(e) => set({ icon: e.target.value })}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Quick tile on Aaj" hint="Blank for none, or its position (1, 2, 3…)"><input inputMode="numeric" value={r.data.tile ?? ""} onChange={(e) => setData({ tile: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        </div>
      )}
      <div className="adm-row adm-switches">
        <label className="adm-check"><input type="checkbox" checked={r.lud_ok} onChange={(e) => set({ lud_ok: e.target.checked })} /> Lisan approved (zaereen see it)</label>
        <label className="adm-check"><input type="checkbox" checked={r.missing} onChange={(e) => set({ missing: e.target.checked })} /> Still missing (zaereen see “details coming soon”)</label>
        <label className="adm-check"><input type="checkbox" checked={r.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Shown</label>
        <label className="adm-check"><input type="checkbox" checked={r.audience === "zair"} onChange={(e) => set({ audience: e.target.checked ? "zair" : "public" })} /> Signed-in zaereen only</label>
        <Field label="Order"><input className="adm-num" inputMode="numeric" value={r.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} /></Field>
      </div>
      <div className="adm-actions">
        <button type="button" className="adm-btn" disabled={!dirty} onClick={save}>Save changes</button>
        {onDelete && <button type="button" className="adm-link adm-danger" onClick={onDelete}>Delete</button>}
        <span className="adm-status" role="status">{status}</span>
      </div>
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const blank = (id: string, kind: string, grp: string, extra: Partial<Row> = {}): Row =>
  ({ id, kind, grp, sort: 500, icon: "info", en: {}, lud: {}, data: {}, lud_ok: false, missing: false, audience: "public", enabled: true, ...extra });

function Pages({ state, reload }: { state: State; reload: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const pages = state.content.filter((r) => r.kind === "page");
  const remove = async (id: string, what: string) => {
    if (!confirm(`Delete ${what}? This cannot be undone.`)) return;
    await api("DELETE", `content/${encodeURIComponent(id)}`);
    reload();
  };
  return (
    <>
      <h2>Info pages</h2>
      <p className="adm-help">Every page a zair can open. A page is a list of blocks; add, edit or reorder them here.</p>
      <div className="adm-new">
        <Field label="Add a new page: its title in English"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <button type="button" className="adm-btn" disabled={!slug(title)} onClick={async () => {
          const id = `page.${slug(title)}`;
          await api("PUT", `content/${id}`, blank(id, "page", "more", { en: { title } }));
          setTitle(""); setOpen(id); reload();
        }}>Add page</button>
      </div>
      {SECTIONS.map(([sec, label]) => {
        const list = pages.filter((p) => p.grp === sec).sort((a, b) => a.sort - b.sort);
        return list.length ? (
          <section key={sec}>
            <h3>{label}</h3>
            {list.map((p) => {
              const blocks = state.content.filter((r) => r.kind === "block" && r.grp === p.id).sort((a, b) => a.sort - b.sort);
              const owed = state.content.filter((r) => r.kind === "fact" && r.grp === p.id);
              return (
                <details key={p.id} className="adm-page" open={open === p.id} onToggle={(e) => (e.currentTarget.open ? setOpen(p.id) : open === p.id && setOpen(null))}>
                  <summary>{p.en.title || p.id}{!p.enabled && " (hidden)"} <small>{blocks.length} blocks{owed.some((o) => o.missing) ? ", has missing details" : ""}</small></summary>
                  {open === p.id && (
                    <>
                      <ItemForm row={p} onSaved={reload} onDelete={() => remove(p.id, "this page and all its blocks")} />
                      <h4>Blocks on this page</h4>
                      {blocks.map((b) => <ItemForm key={b.id} row={b} onSaved={reload} onDelete={() => remove(b.id, "this block")} />)}
                      {owed.map((b) => <ItemForm key={b.id} row={b} onSaved={reload} onDelete={() => remove(b.id, "this item")} />)}
                      <button type="button" className="adm-btn adm-btn-2" onClick={async () => {
                        const id = `b.${p.id.slice(5)}.${Date.now().toString(36)}`;
                        await api("PUT", `content/${id}`, blank(id, "block", p.id, { data: { type: "text" }, sort: (blocks.at(-1)?.sort ?? 0) + 10 }));
                        reload();
                      }}>Add a block</button>
                      <a className="adm-link" href={`/p/${p.id.slice(5)}`} target="_blank" rel="noopener">Open this page in the app</a>
                    </>
                  )}
                </details>
              );
            })}
          </section>
        ) : null;
      })}
    </>
  );
}

function Group({ state, reload, kind, title, help, groups, addLabel }: { state: State; reload: () => void; kind: string; title: string; help: string; groups?: [string, string][]; addLabel?: string }) {
  const rows = state.content.filter((r) => r.kind === kind && !r.grp.startsWith("page."));
  const [name, setName] = useState("");
  const sets: [string, string][] = groups ?? [["", ""]];
  return (
    <>
      <h2>{title}</h2>
      <p className="adm-help">{help}</p>
      {addLabel && (
        <div className="adm-new">
          <Field label={addLabel}><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <button type="button" className="adm-btn" disabled={!slug(name)} onClick={async () => {
            const prefix = kind === "office" ? "office" : kind === "faq" ? "faq" : kind;
            const id = `${prefix}.${slug(name)}`;
            const en: Record<string, string> = kind === "office" ? { name } : kind === "faq" ? { q: name } : { label: name };
            await api("PUT", `content/${id}`, blank(id, kind, kind === "office" ? "offices" : kind === "faq" ? "faq" : "more", { en, icon: kind === "office" ? "building" : "info" }));
            setName(""); reload();
          }}>Add</button>
        </div>
      )}
      {sets.map(([g, label]) => {
        const list = rows.filter((r) => !groups || r.grp === g).sort((a, b) => a.sort - b.sort);
        return list.length ? (
          <section key={g}>
            {label && <h3>{label}</h3>}
            {list.map((r) => (
              <details key={r.id} className="adm-page">
                <summary>{r.en.name || r.en.label || r.en.q || r.en.title || r.id}{r.missing && <small> missing</small>}{!r.enabled && <small> off</small>}</summary>
                <ItemForm row={r} onSaved={reload} onDelete={async () => { if (confirm("Delete this? This cannot be undone.")) { await api("DELETE", `content/${encodeURIComponent(r.id)}`); reload(); } }} />
              </details>
            ))}
          </section>
        ) : null;
      })}
    </>
  );
}

function Missing({ state, reload }: { state: State; reload: () => void }) {
  const rows = state.content.filter((r) => r.missing);
  return (
    <>
      <h2>Still missing</h2>
      <p className="adm-help">What departments still owe. Fill one in, untick “Still missing”, and save: zaereen see it at once. Until then they see “details coming soon”.</p>
      {rows.length === 0 && <p>Nothing is missing.</p>}
      {rows.map((r) => (
        <div key={r.id} className="adm-missing">
          <h3>{r.en.label || r.en.title || r.en.name || r.id}</h3>
          <ItemForm row={r} onSaved={reload} compact />
        </div>
      ))}
    </>
  );
}

function LisanReview({ state, reload }: { state: State; reload: () => void }) {
  const rows = state.content.filter((r) => !r.lud_ok && Object.values(r.lud).some((v) => v?.trim()));
  const news = state.announcements.filter((a) => !a.lud_ok && a.lud.trim());
  return (
    <>
      <h2>Lisan ud-Dawat awaiting proofread</h2>
      <p className="adm-help">Zaereen who choose Lisan ud-Dawat see English for these until you approve them. Correct the text if needed, then approve. {rows.length + news.length} to go.</p>
      {rows.map((r) => (
        <div key={r.id} className="adm-review">
          <p className="adm-id">{r.id}{r.data.source ? ` · transcribed from ${r.data.source}` : ""}</p>
          {Object.entries(r.lud).filter(([, v]) => v?.trim()).map(([f, v]) => (
            <div key={f} className="adm-pair">
              <p className="adm-en pre">{r.en[f]}</p>
              <p className="lud pre" dir="rtl">{v}</p>
            </div>
          ))}
          <div className="adm-actions">
            <button type="button" className="adm-btn" onClick={async () => { await api("PUT", `content/${encodeURIComponent(r.id)}`, { ...r, lud_ok: true }); reload(); }}>Approve</button>
            <details><summary className="adm-link">Correct it first</summary><ItemForm row={r} onSaved={reload} compact /></details>
          </div>
        </div>
      ))}
    </>
  );
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Today({ state, reload }: { state: State; reload: () => void }) {
  const today = karbalaNow().date;
  const [date, setDate] = useState(today);
  const existing = state.menus.find((m) => m.date === date);
  const [menu, setMenu] = useState({ hijri: "", lunch: "", dinner: "", image_id: null as string | null });
  useEffect(() => setMenu({ hijri: existing?.hijri ?? "", lunch: (existing?.lunch ?? []).join("\n"), dinner: (existing?.dinner ?? []).join("\n"), image_id: existing?.image_id ?? null }), [date, existing?.date]);
  const [status, setStatus] = useState("");

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [picked, setPicked] = useState<string[]>([]);
  const [mj, setMj] = useState({ venue_en: "", venue_lud: "", time_en: "", time_lud: "", booklet_id: null as string | null });
  const on = new Map(state.majlis.map((m) => [m.date, m]));
  const [mjStatus, setMjStatus] = useState("");
  const saveMajlis = async (active: boolean) => {
    setMjStatus("Saving…");
    try { await api("PUT", "majlis", { dates: picked, active, ...mj }); setMjStatus(active ? "Majlis switched on" : "Majlis switched off"); setPicked([]); reload(); } catch (e) { setMjStatus((e as Error).message); }
  };

  return (
    <>
      <h2>Menu</h2>
      <p className="adm-help">Type the items one per line. Zaereen see them in the app’s own design and can open the menu card picture.</p>
      <div className="adm-item">
        <div className="adm-row">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Hijri date, as on the card"><input value={menu.hijri} onChange={(e) => setMenu({ ...menu, hijri: e.target.value })} /></Field>
        </div>
        <div className="adm-pair">
          <Field label="Lunch, one item per line"><textarea rows={7} value={menu.lunch} onChange={(e) => setMenu({ ...menu, lunch: e.target.value })} /></Field>
          <Field label="Dinner, one item per line"><textarea rows={7} value={menu.dinner} onChange={(e) => setMenu({ ...menu, dinner: e.target.value })} /></Field>
        </div>
        <FilePick label="Menu card picture" accept="image/*" value={menu.image_id} onChange={(id) => setMenu({ ...menu, image_id: id })} />
        <div className="adm-actions">
          <button type="button" className="adm-btn" onClick={async () => {
            setStatus("Saving…");
            try { await api("PUT", `menu/${date}`, { hijri: menu.hijri, lunch: menu.lunch.split("\n"), dinner: menu.dinner.split("\n"), image_id: menu.image_id }); setStatus("Menu saved"); reload(); } catch (e) { setStatus((e as Error).message); }
          }}>Save menu</button>
          <span className="adm-status" role="status">{status}</span>
        </div>
      </div>

      <h2>Majlis</h2>
      <p className="adm-help">Nothing shows to zaereen unless a date is switched on here. Venue and time fill in from the standing rule; type below only to override them.</p>
      <div className="adm-item">
        <div className="adm-days">
          {days.map((d) => {
            const rule = majlisDefault(d);
            const m = on.get(d);
            return (
              <label key={d} className={`adm-day${m?.active ? " on" : ""}`}>
                <input type="checkbox" checked={picked.includes(d)} onChange={(e) => setPicked(e.target.checked ? [...picked, d] : picked.filter((x) => x !== d))} />
                <strong>{WEEK[weekdayOf(d)]} {Number(d.slice(8))}/{Number(d.slice(5, 7))}</strong>
                <small>{m?.active ? "ON · " : ""}{m?.venue_en || PLACES[rule.place].name}, {m?.time_en || rule.time || "after Maghrib Isha namaz"}{m?.booklet_id ? " · booklet" : ""}</small>
              </label>
            );
          })}
        </div>
        <div className="adm-pair">
          <Field label="Venue override · English"><input value={mj.venue_en} onChange={(e) => setMj({ ...mj, venue_en: e.target.value })} /></Field>
          <Field label="Venue override · Lisan ud-Dawat"><input dir="rtl" className="lud" value={mj.venue_lud} onChange={(e) => setMj({ ...mj, venue_lud: e.target.value })} /></Field>
        </div>
        <div className="adm-pair">
          <Field label="Time override · English"><input value={mj.time_en} onChange={(e) => setMj({ ...mj, time_en: e.target.value })} /></Field>
          <Field label="Time override · Lisan ud-Dawat"><input dir="rtl" className="lud" value={mj.time_lud} onChange={(e) => setMj({ ...mj, time_lud: e.target.value })} /></Field>
        </div>
        <FilePick label="Booklet PDF for the picked dates" accept="application/pdf" value={mj.booklet_id} onChange={(id) => setMj({ ...mj, booklet_id: id })} />
        <div className="adm-actions">
          <button type="button" className="adm-btn" disabled={!picked.length} onClick={() => saveMajlis(true)}>Switch majlis on for {picked.length || "the picked"} date{picked.length === 1 ? "" : "s"}</button>
          <button type="button" className="adm-btn adm-btn-2" disabled={!picked.length} onClick={() => saveMajlis(false)}>Switch off</button>
          <span className="adm-status" role="status">{mjStatus}</span>
        </div>
      </div>
    </>
  );
}

function Announcements({ state, reload }: { state: State; reload: () => void }) {
  const [n, setN] = useState({ en: "", lud: "", lud_ok: false, media_id: null as string | null });
  const [status, setStatus] = useState("");
  return (
    <>
      <h2>Announcements</h2>
      <p className="adm-help">Shown on Aaj, newest first.</p>
      <div className="adm-item">
        <div className="adm-pair">
          <Field label="Announcement · English"><textarea rows={4} value={n.en} onChange={(e) => setN({ ...n, en: e.target.value })} /></Field>
          <Field label="Announcement · Lisan ud-Dawat"><textarea rows={4} dir="rtl" className="lud" value={n.lud} onChange={(e) => setN({ ...n, lud: e.target.value })} /></Field>
        </div>
        <label className="adm-check"><input type="checkbox" checked={n.lud_ok} onChange={(e) => setN({ ...n, lud_ok: e.target.checked })} /> Lisan approved</label>
        <FilePick label="Picture (optional)" accept="image/*" value={n.media_id} onChange={(id) => setN({ ...n, media_id: id })} />
        <div className="adm-actions">
          <button type="button" className="adm-btn" disabled={!n.en.trim()} onClick={async () => {
            try { await api("PUT", "announcement/new", n); setN({ en: "", lud: "", lud_ok: false, media_id: null }); setStatus("Posted"); reload(); } catch (e) { setStatus((e as Error).message); }
          }}>Post announcement</button>
          <span className="adm-status" role="status">{status}</span>
        </div>
      </div>
      {state.announcements.map((a) => (
        <div key={a.id} className="adm-review">
          <p className="adm-id">{new Date(a.created_at).toLocaleString()}{a.enabled ? "" : " · hidden"}</p>
          <p className="pre">{a.en}</p>
          {a.lud && <p className="lud pre" dir="rtl">{a.lud}</p>}
          <div className="adm-actions">
            <button type="button" className="adm-link" onClick={async () => { await api("PUT", `announcement/${a.id}`, { ...a, lud_ok: !!a.lud_ok, enabled: !a.enabled }); reload(); }}>{a.enabled ? "Hide" : "Show again"}</button>
            {!a.lud_ok && a.lud && <button type="button" className="adm-link" onClick={async () => { await api("PUT", `announcement/${a.id}`, { ...a, lud_ok: true, enabled: !!a.enabled }); reload(); }}>Approve Lisan</button>}
            <button type="button" className="adm-link adm-danger" onClick={async () => { if (confirm("Delete this announcement?")) { await api("DELETE", `announcement/${a.id}`); reload(); } }}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

function Log() {
  const [rows, setRows] = useState<{ at: string; action: string; target: string; detail: string }[]>([]);
  useEffect(() => void api("GET", "log").then((d) => setRows(d.log)), []);
  return (
    <>
      <h2>Change log</h2>
      <table className="adm-log"><tbody>{rows.map((r, i) => <tr key={i}><td>{new Date(r.at).toLocaleString()}</td><td>{r.action}</td><td>{r.target}</td><td>{r.detail}</td></tr>)}</tbody></table>
    </>
  );
}

const TABS = ["Today", "Announcements", "Still missing", "Lisan review", "Pages", "Offices", "Timings and facts", "FAQ", "Requests", "Log"] as const;
const FACT_GROUPS: [string, string][] = [
  ["namaz", "Namaz"], ["mawaid", "Faiz Mawaid"], ["hours", "Default office hours"], ["stay", "Rooms"], ["wifi", "Wi-Fi"], ["contact", "Contacts"],
  ["links", "Links and help button"], ["place", "Ziyarat assembly points"], ["offices", "Offices: other details"], ["internal", "Internal (not shown to zaereen)"], ["more", "Other"],
];

export default function Admin() {
  const [state, setState] = useState<State | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");
  const reload = useCallback(() => {
    api<State>("GET", "state").then((s) => { setState(s); setSignedOut(false); }).catch((e) => (e.status === 401 ? setSignedOut(true) : setErr(e.message)));
  }, []);
  useEffect(() => { document.documentElement.dir = "ltr"; document.title = "Admin · Zaireen-e-Karbala"; reload(); }, [reload]);

  if (signedOut) {
    return (
      <main className="adm adm-login">
        <h1>Zaireen-e-Karbala admin</h1>
        <form onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          try { await api("POST", "login", { pin }); setPin(""); reload(); } catch (x) { setErr((x as Error).message); }
        }}>
          <Field label="PIN"><input type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
          <button className="adm-btn" disabled={!pin}>Open admin</button>
          {err && <p className="adm-err" role="alert">{err}</p>}
        </form>
      </main>
    );
  }
  if (!state) return <main className="adm"><p>{err || "Loading…"}</p></main>;
  const missing = state.content.filter((r) => r.missing).length;
  const review = state.content.filter((r) => !r.lud_ok && Object.values(r.lud).some((v) => v?.trim())).length;
  return (
    <main className="adm">
      <header className="adm-top">
        <h1>Zaireen-e-Karbala admin</h1>
        <button type="button" className="adm-link" onClick={async () => { await api("POST", "logout"); setState(null); setSignedOut(true); }}>Sign out</button>
      </header>
      <nav className="adm-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
            {t}{t === "Still missing" && missing > 0 && <b>{missing}</b>}{t === "Lisan review" && review > 0 && <b>{review}</b>}
          </button>
        ))}
      </nav>
      {tab === "Today" && <Today state={state} reload={reload} />}
      {tab === "Announcements" && <Announcements state={state} reload={reload} />}
      {tab === "Still missing" && <Missing state={state} reload={reload} />}
      {tab === "Lisan review" && <LisanReview state={state} reload={reload} />}
      {tab === "Pages" && <Pages state={state} reload={reload} />}
      {tab === "Offices" && <Group state={state} reload={reload} kind="office" title="Offices" help="Name, place and hours of every office. Offices with no hours of their own follow the default hours (under Timings and facts)." addLabel="Add an office: its name in English" />}
      {tab === "Timings and facts" && <Group state={state} reload={reload} kind="fact" title="Timings and facts" help="Single values used across the app: namaz and Mawaid times, Wi-Fi details, contacts, links." groups={FACT_GROUPS} addLabel="Add a fact: its label in English" />}
      {tab === "FAQ" && <Group state={state} reload={reload} kind="faq" title="FAQ" help="Questions and answers shown on the “Questions people ask” page." addLabel="Add a question in English" />}
      {tab === "Requests" && <Group state={state} reload={reload} kind="request_type" title="Request types" help="Untick “Shown” to switch a request type off. The requests inbox arrives with the Madad milestone." />}
      {tab === "Log" && <Log />}
    </main>
  );
}
