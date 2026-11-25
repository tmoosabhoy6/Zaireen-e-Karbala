/**
 * Karbala ziyarat rules, carried over from the zt app (src/lib/timings.ts, karbalaTimings).
 * The Karbala Ziyarat Google Sheet says WHICH ziyarat a tour has on WHICH day; these standing
 * rules give the time and assembly point. Change them here and in zt together.
 */
import { isThuOrFri } from "./time";

export type ZiyaratKind = "pehli" | "pehli-late" | "atraaf" | "baghdad" | "wada";
export type PlaceId = "najmi" | "haram6" | "emarah" | "kawthar";

/** Names fixed by the brief. Never "Baghdad Atraf". */
export const ZIYARAT_NAMES: Record<ZiyaratKind, string> = {
  pehli: "Pehli Ziyarat",
  "pehli-late": "Pehli Ziyarat",
  atraaf: "Karbala Mualla Atraaf - Atabaat Aaliyah",
  baghdad: "Baghdad Atabaat Aaliyah",
  wada: "Wada Ziyarat",
};

/** Built-in place names and map links (from zt). Admin can override them through the place.* facts. */
export const PLACES: Record<PlaceId, { name: string; mapUrl?: string }> = {
  najmi: { name: "Najmi Masjid" },
  haram6: { name: "Imam Husain AS Haram Mubarak, gate number 6" },
  emarah: { name: "Al Imara hotel", mapUrl: "https://maps.app.goo.gl/fxuykj1jTrt75DKo8?g_st=aw" },
  kawthar: { name: "Mujamma Kauthar", mapUrl: "https://maps.app.goo.gl/JuPPTTcWk14caH6HA?g_st=iw" },
};

/** The sheet's own wording ("Karbala Atraf", "Baghdad Atraf", "Wadaa Ziyarat", late Pehli slot) -> kind. */
export function kindOf(sheetType: string, slot?: string): ZiyaratKind | null {
  const t = sheetType.toLowerCase();
  if (/pe?hli/.test(t)) return slot === "late" || /\blate\b|night/.test(t) ? "pehli-late" : "pehli";
  if (t.includes("baghdad")) return "baghdad";
  if (t.includes("atra")) return "atraaf";
  if (t.includes("wada")) return "wada";
  return null;
}

export interface Assembly {
  /** "2:00 PM", or null when the time is wording (see timeKey). */
  time: string | null;
  /** Wording used instead of a clock time: after Maghrib Isha namaz. */
  timeKey?: "after-maghrib-isha";
  place: PlaceId;
  /** The time is a bus departure. */
  bus?: boolean;
}

/**
 * - Pehli Ziyarat: 2:00 PM. Najmi Masjid on Thursday and Friday, otherwise Haram Mubarak gate 6.
 * - Late Pehli Ziyarat (the 8:30 pm slot): Najmi Masjid, any day.
 * - Karbala Mualla Atraaf: 8:15 AM from Mujamma Kauthar.
 * - Baghdad Atabaat Aaliyah: bus at 8:00 AM from the Al Imara hotel.
 * - Wada Ziyarat: Thursday and Friday at Najmi Masjid straight after Maghrib Isha namaz,
 *   otherwise 9:30 PM at Haram Mubarak gate 6.
 * `lateKnown` is false when the sheet data cannot tell the late Pehli slot apart; Pehli then
 * shows no time rather than a wrong one.
 */
export function assemblyFor(kind: ZiyaratKind, date: string, lateKnown = true): Assembly | null {
  switch (kind) {
    case "pehli-late":
      return { time: "8:30 PM", place: "najmi" };
    case "pehli":
      return lateKnown ? { time: "2:00 PM", place: isThuOrFri(date) ? "najmi" : "haram6" } : null;
    case "baghdad":
      return { time: "8:00 AM", place: "emarah", bus: true };
    case "atraaf":
      return { time: "8:15 AM", place: "kawthar" };
    case "wada":
      return isThuOrFri(date) ? { time: null, timeKey: "after-maghrib-isha", place: "najmi" } : { time: "9:30 PM", place: "haram6" };
  }
}

/** The majlis follows the same weekday rule as Wada Ziyarat. */
export const majlisDefault = (date: string): Assembly =>
  isThuOrFri(date) ? { time: null, timeKey: "after-maghrib-isha", place: "najmi" } : { time: "9:30 PM", place: "haram6" };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "Monday, August 18, 2025" (the sheet's date text) -> "2025-08-18". */
export function parseSheetDate(text: string): string | null {
  const m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(text);
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

/** Arabic-Indic and Persian digits -> 0-9, for phones set to those keyboards. */
export const toAsciiDigits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

export interface TourRef {
  /** Two-digit season when typed ("26"), otherwise null. */
  season: string | null;
  /** Tour number without leading zeros ("5253"). */
  number: string;
}

/** Accepts 26/5253, 26-5253, 265253 and 5253. Null when it is not a tour ID. */
export function parseTourId(input: string): TourRef | null {
  const s = toAsciiDigits(input).trim().replace(/\s+/g, "");
  let m = /^(\d{2})[/\-.](\d{1,6})$/.exec(s);
  if (m) return { season: m[1], number: m[2].replace(/^0+(?=\d)/, "") };
  m = /^(2\d)(\d{4})$/.exec(s);
  if (m) return { season: m[1], number: m[2].replace(/^0+(?=\d)/, "") };
  m = /^(\d{1,5})$/.exec(s);
  if (m) return { season: null, number: m[1].replace(/^0+(?=\d)/, "") };
  return null;
}

export const isIts = (input: string) => /^\d{8}$/.test(toAsciiDigits(input).trim());
