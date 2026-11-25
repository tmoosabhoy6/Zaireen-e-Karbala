import { karbalaNow } from "../shared/time";
import { SEED, SEED_REV, type SeedItem } from "./seed";
import type { Env } from "./lib";
import { nowIso } from "./lib";

export interface ContentRow {
  id: string; kind: string; grp: string; sort: number; icon: string;
  en: string; lud: string; data: string; lud_ok: number; missing: number;
  audience: string; enabled: number; updated_at: string;
}

let seeded = false;

/**
 * Adds content from worker/seed.ts that is not in the database yet. It never overwrites a row,
 * so anything edited in admin stays as edited when a new version of the app ships.
 */
export async function ensureSeed(env: Env): Promise<void> {
  if (seeded) return;
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key='seed_rev'").first<{ value: string }>();
  if (Number(row?.value ?? 0) < SEED_REV) {
    const at = nowIso();
    const stmt = env.DB.prepare(
      "INSERT OR IGNORE INTO content(id,kind,grp,sort,icon,en,lud,data,lud_ok,missing,audience,enabled,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    const rows = SEED.map((s: SeedItem, i) =>
      stmt.bind(s.id, s.kind, s.grp ?? "", s.sort ?? (i + 1) * 10, s.icon ?? "", JSON.stringify(s.en ?? {}), JSON.stringify(s.lud ?? {}),
        JSON.stringify(s.data ?? {}), 0, s.missing ? 1 : 0, s.audience ?? "public", s.enabled === false ? 0 : 1, at),
    );
    for (let i = 0; i < rows.length; i += 50) await env.DB.batch(rows.slice(i, i + 50));
    await env.DB.prepare("INSERT INTO meta(key,value) VALUES('seed_rev',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(SEED_REV)).run();
  }
  seeded = true;
}

const parse = (text: string) => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
};

/** Fields that stay visible on an unfilled item, so the zair sees what is coming. */
const KEEP_WHEN_MISSING = ["title", "label", "name", "q"];

export interface PublicItem {
  id: string; kind: string; grp: string; sort: number; icon: string;
  t: Record<string, unknown>; l: Record<string, unknown> | null; data: Record<string, unknown>;
  missing: boolean; audience: string;
}

/** What a zair's phone receives: no unapproved Lisan, and no values for unfilled placeholders. */
export function toPublic(row: ContentRow): PublicItem {
  let t = parse(row.en);
  let l: Record<string, unknown> | null = row.lud_ok ? parse(row.lud) : null;
  let data = parse(row.data);
  if (row.missing) {
    const keep = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => KEEP_WHEN_MISSING.includes(k)));
    t = keep(t);
    l = l ? keep(l) : null;
    data = Object.fromEntries(Object.entries(data).filter(([k]) => k === "type" || k === "ref"));
  }
  if (l && !Object.values(l).some((v) => typeof v === "string" && v.trim())) l = null;
  return { id: row.id, kind: row.kind, grp: row.grp, sort: row.sort, icon: row.icon, t, l, data, missing: !!row.missing, audience: row.audience };
}

export async function publicPayload(env: Env, signedIn: boolean) {
  await ensureSeed(env);
  const today = karbalaNow().date;
  const [content, menu, majlis, news] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM content WHERE enabled=1 ${signedIn ? "" : "AND audience='public'"} ORDER BY kind, grp, sort, id`),
    env.DB.prepare("SELECT * FROM menus WHERE date=?").bind(today),
    env.DB.prepare("SELECT * FROM majlis WHERE date=? AND active=1").bind(today),
    env.DB.prepare("SELECT * FROM announcements WHERE enabled=1 ORDER BY created_at DESC LIMIT 30"),
  ]);
  const m = menu.results[0] as Record<string, string> | undefined;
  const j = majlis.results[0] as Record<string, string> | undefined;
  return {
    today,
    items: (content.results as unknown as ContentRow[]).map(toPublic),
    menu: m ? { date: m.date, hijri: m.hijri, lunch: JSON.parse(m.lunch), dinner: JSON.parse(m.dinner), image: m.image_id || null } : null,
    majlis: j ? { date: j.date, venue_en: j.venue_en, venue_lud: j.venue_lud, time_en: j.time_en, time_lud: j.time_lud, booklet: j.booklet_id || null } : null,
    announcements: (news.results as Record<string, unknown>[]).map((a) => ({
      id: a.id, at: a.created_at, en: a.en, lud: a.lud_ok ? a.lud : "", media: a.media_id || null,
    })),
  };
}
