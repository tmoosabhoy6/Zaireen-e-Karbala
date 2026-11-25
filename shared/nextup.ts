import { addDays, parseClock, type KarbalaNow } from "./time";
import { assemblyFor, type ZiyaratKind } from "./ziyarat";

export interface Day { date: string; kind: ZiyaratKind; name: string }
export type NextUp =
  | { type: "arrival"; ziyaratToday: Day | null }
  | { type: "ziyarat"; day: Day }
  | { type: "departure" }
  | { type: "stay" };

/** A ziyarat stays "next" until two hours after it gathers (10 pm when its time is "after namaz"). */
export function isOver(day: Day, now: KarbalaNow, lateKnown: boolean): boolean {
  if (day.date !== now.date) return day.date < now.date;
  const a = assemblyFor(day.kind, day.date, lateKnown);
  const start = a?.time ? parseClock(a.time) : null;
  return now.minutes > (start === null ? 22 * 60 : start + 120);
}

export const nextZiyarat = (days: Day[], now: KarbalaNow, lateKnown: boolean): Day | null => days.find((d) => !isOver(d, now, lateKnown)) ?? null;

/**
 * The one thing that matters most right now:
 * - up to and on arrival day: the room and how to get in
 * - the day before departure and departure day: the departure
 * - otherwise: the next ziyarat, or the stay itself when none is left
 */
export function nextUp(stay: { arrival: string | null; departure: string | null }, days: Day[], now: KarbalaNow, lateKnown: boolean): NextUp {
  const upcoming = nextZiyarat(days, now, lateKnown);
  if (stay.departure && now.date >= addDays(stay.departure, -1) && now.date <= stay.departure) return { type: "departure" };
  if (stay.arrival && now.date <= stay.arrival) return { type: "arrival", ziyaratToday: upcoming && upcoming.date === now.date ? upcoming : null };
  if (upcoming) return { type: "ziyarat", day: upcoming };
  return { type: "stay" };
}
