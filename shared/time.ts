/** Karbala runs on Baghdad time: UTC+3 all year, no daylight saving. */
export const KARBALA_OFFSET_MIN = 180;

export interface KarbalaNow {
  /** YYYY-MM-DD */
  date: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** Minutes after midnight. */
  minutes: number;
}

export function karbalaNow(at: Date = new Date()): KarbalaNow {
  const t = new Date(at.getTime() + KARBALA_OFFSET_MIN * 60_000);
  return { date: t.toISOString().slice(0, 10), weekday: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** Thursday and Friday carry their own venues for Pehli Ziyarat, Wada Ziyarat and the majlis. */
export const isThuOrFri = (iso: string) => {
  const w = weekdayOf(iso);
  return w === 4 || w === 5;
};

const CLOCK = /(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*m\b/i;
const RANGE = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:([ap])\.?\s*m\b)?\s*(?:to|-|\u2013)\s*(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*m\b/i;

const mins = (h: string, m: string | undefined, ap: string) => ((Number(h) % 12) + (ap.toLowerCase() === "p" ? 12 : 0)) * 60 + Number(m ?? 0);

/**
 * "8:00 am to 2:30 pm" -> [480, 870]; "7:15 to 8:30 pm" -> [1155, 1230]; "11:00 to 1:00 pm" -> [660, 780].
 * Null when the line is not two clock times (e.g. "After Maghrib namaz to 8:30 pm").
 */
export function parseRange(line: string): [number, number] | null {
  const m = RANGE.exec(line);
  if (!m) return null;
  const end = mins(m[4], m[5], m[6]);
  let start = mins(m[1], m[2], m[3] ?? m[6]);
  // "11:00 to 1:00 pm": the start has no am/pm of its own and belongs to the morning.
  if (!m[3] && start >= end) start = mins(m[1], m[2], "a");
  return end > start ? [start, end] : null;
}

/** First clock time in a line, in minutes, or null ("as per ITS"). */
export function parseClock(line: string): number | null {
  const m = CLOCK.exec(line);
  return m ? mins(m[1], m[2], m[3]) : null;
}
