/**
 * The ziyarat schedule, from the Karbala Ziyarat Google Sheet (the source of truth).
 * It is read through the same public, read-only Apps Script feed the zt app uses: one snapshot of
 * every current tour. The snapshot is kept in D1 and refreshed when it is more than five minutes old.
 */
import { addDays, dayDiff } from "../shared/time";
import { ZIYARAT_NAMES, kindOf, parseSheetDate, type TourRef, type ZiyaratKind } from "../shared/ziyarat";
import type { Env } from "./lib";

const FEED = "https://script.google.com/macros/s/AKfycbwdsdsEyxCl3zt8eaVJIqQ_oogLtvwhTniSQYJyb2BnNqjQqJcxqQpwttOyeY51uwhKeg/exec";
const FRESH_MS = 5 * 60_000;

/** [full_tour_id, date, ziyarat_type, group_name, leader_name, pax, slot?] */
type SnapRow = [string, string, string, string, string, string, string?];
interface Snapshot { fetchedAt: number; v: number; rows: SnapRow[] }

let memory: Snapshot | null = null;

async function download(): Promise<Snapshot> {
  const res = await fetch(`${FEED}?snapshot=1`, { redirect: "follow" });
  if (!res.ok) throw new Error(`schedule feed answered ${res.status}`);
  const data = (await res.json()) as { v?: number; rows?: SnapRow[] };
  if (!Array.isArray(data.rows)) throw new Error("schedule feed had no rows");
  return { fetchedAt: Date.now(), v: data.v ?? 1, rows: data.rows };
}

/** The newest snapshot available. Falls back to the stored one if the Sheet cannot be reached. */
export async function snapshot(env: Env, ctx?: ExecutionContext): Promise<Snapshot | null> {
  if (!memory) {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key='schedule_snapshot'").first<{ value: string }>();
    if (row) memory = JSON.parse(row.value) as Snapshot;
  }
  if (memory && Date.now() - memory.fetchedAt < FRESH_MS) return memory;
  const refresh = (async () => {
    const fresh = await download();
    memory = fresh;
    // Group and leader names are not needed by this app, so they are not stored.
    const slim: Snapshot = { ...fresh, rows: fresh.rows.map((r) => [r[0], r[1], r[2], "", "", "", r[6] ?? ""] as SnapRow) };
    await env.DB.prepare("INSERT INTO meta(key,value) VALUES('schedule_snapshot',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(slim)).run();
    return fresh;
  })();
  if (memory) {
    // Answer now from what is stored and refresh behind the scenes.
    if (ctx) ctx.waitUntil(refresh.catch(() => undefined));
    else void refresh.catch(() => undefined);
    return memory;
  }
  try {
    return await refresh;
  } catch {
    return null;
  }
}

export interface ScheduleDay { date: string; kind: ZiyaratKind; name: string }
export interface TourSchedule { tour: string; days: ScheduleDay[]; first: string; last: string; lateKnown: boolean }

const numberOf = (full: string) => (full.split("/").pop() ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/**
 * Finds the tour a zair typed. With only the four digits (5253), several seasons can share the number:
 * the tour whose Karbala days cover today wins, otherwise the one nearest to today.
 */
export function findTour(snap: Snapshot, ref: TourRef, today: string): TourSchedule | null {
  const byTour = new Map<string, ScheduleDay[]>();
  for (const r of snap.rows) {
    if (numberOf(r[0]) !== ref.number) continue;
    if (ref.season && !r[0].startsWith(`${ref.season}/`)) continue;
    const date = parseSheetDate(r[1]);
    const kind = kindOf(r[2], r[6]);
    if (!date || !kind) continue;
    const list = byTour.get(r[0]) ?? [];
    if (!list.some((d) => d.date === date && d.kind === kind)) list.push({ date, kind, name: ZIYARAT_NAMES[kind] });
    byTour.set(r[0], list);
  }
  let best: TourSchedule | null = null;
  let bestGap = Infinity;
  for (const [tour, list] of byTour) {
    if (!/^\d{2}\/\d{1,6}$/.test(tour)) continue;
    const days = list.sort((a, b) => a.date.localeCompare(b.date));
    const first = days[0].date, last = days[days.length - 1].date;
    const gap = first <= today && today <= addDays(last, 1) ? 0 : Math.min(Math.abs(dayDiff(first, today)), Math.abs(dayDiff(last, today)));
    if (gap < bestGap) {
      bestGap = gap;
      best = { tour, days, first, last, lateKnown: snap.v >= 2 };
    }
  }
  return best;
}
