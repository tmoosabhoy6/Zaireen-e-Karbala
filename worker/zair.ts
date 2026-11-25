/**
 * Sign-in and the zair's own page.
 *
 * Privacy: a room is returned only when NKERP lists this ITS on this tour. A tour ID alone (which can be
 * guessed) opens only tour-level information: the ziyarat schedule and the stay dates.
 */
import { addDays, dayDiff, karbalaNow } from "../shared/time";
import { isIts, parseTourId, toAsciiDigits } from "../shared/ziyarat";
import { attemptsLeft, cookieOf, countAttempt, createSession, dropSession, fail, ipOf, json, randomToken, readJson, readSession, setCookie, sha256, type Env } from "./lib";
import { Nkerp, nkerpConfigured, type Room, type Visit } from "./nkerp";
import { findTour, snapshot } from "./schedule";

const TRIES = 10;
const WINDOW_MS = 15 * 60_000;
const ROOM_FRESH_MS = 10 * 60_000;

export interface ZairSession {
  tour: string;
  its: string;
  /** NKERP confirmed this ITS on this tour. */
  verified: boolean;
  /** Why not verified: NKERP could not be asked ("unavailable") or does not list the ITS ("not_listed"). */
  reason?: "unavailable" | "not_listed";
  room?: { state: "assigned" | "awaiting" | "none"; rooms: Room[]; at: number };
  visit?: Visit | null;
}

async function lookUp(env: Env, tour: string, its: string, today: string): Promise<Pick<ZairSession, "verified" | "reason" | "room" | "visit">> {
  if (!nkerpConfigured(env)) return { verified: false, reason: "unavailable" };
  try {
    const nk = new Nkerp(env);
    const { found, rooms } = await nk.roomFor(tour, its);
    const awaiting = found ? false : await nk.awaitingRoom(tour, its);
    if (!found && !awaiting) return { verified: false, reason: "not_listed" };
    const visit = await nk.visit(tour, today).catch(() => null);
    return { verified: true, room: { state: found ? "assigned" : "awaiting", rooms, at: Date.now() }, visit };
  } catch (err) {
    console.error("nkerp lookup failed:", err instanceof Error ? err.message : "unknown");
    return { verified: false, reason: "unavailable" };
  }
}

export async function signIn(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.SESSION_KEY) fail(503, "Sign-in is not set up yet.");
  // Limits: per IP and per device (a cookie that stays on the phone).
  let device = cookieOf(request, "zk_dev");
  const headers = new Headers();
  if (!device) {
    device = randomToken(12);
    headers.append("Set-Cookie", setCookie("zk_dev", device, 180 * 86_400));
  }
  const keys = [`signin:ip:${ipOf(request)}`, `signin:dev:${device}`];
  for (const k of keys) if ((await attemptsLeft(env, k, TRIES)) <= 0) fail(429, "Too many tries. Please wait 15 minutes and try again.", "too_many");
  for (const k of keys) await countAttempt(env, k, WINDOW_MS);

  const body = await readJson<{ tour?: string; its?: string }>(request, 2000);
  const ref = parseTourId(String(body.tour ?? ""));
  const its = toAsciiDigits(String(body.its ?? "")).trim();
  if (!ref) fail(400, "Enter your tour ID like 26/5253, or just its last four digits.", "bad_tour");
  if (!isIts(its)) fail(400, "Enter your 8-digit ITS number.", "bad_its");

  const today = karbalaNow().date;
  const snap = await snapshot(env, ctx);
  if (!snap) fail(503, "The ziyarat schedule could not be reached. Please try again in a minute.", "no_schedule");
  const found = findTour(snap!, ref!, today);
  if (!found) fail(404, "We could not find that tour in the Karbala ziyarat schedule. Check the tour ID with your group leader.", "no_tour");

  const session: ZairSession = { tour: found!.tour, its, ...(await lookUp(env, found!.tour, its, today)) };
  // Remembered on this phone until the day after departure.
  const departure = session.visit?.departure ?? addDays(found!.last, 1);
  const days = Math.min(60, Math.max(1, dayDiff(departure, today) + 2));
  const token = await createSession(env, "zair", session, days * 86_400);
  headers.append("Set-Cookie", setCookie("zk_zair", token, days * 86_400));
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(await mePayload(env, ctx, session)), { status: 200, headers });
}

export async function signOut(request: Request, env: Env): Promise<Response> {
  await dropSession(env, request, "zair");
  return json({ ok: true }, 200, { "Set-Cookie": setCookie("zk_zair", "", 0) });
}

async function mePayload(env: Env, ctx: ExecutionContext, s: ZairSession) {
  const today = karbalaNow().date;
  const snap = await snapshot(env, ctx);
  const [season, number] = s.tour.split("/");
  const sched = snap ? findTour(snap, { season, number: number.replace(/^0+(?=\d)/, "") }, today) : null;
  const arrival = s.visit?.arrival ?? sched?.first ?? null;
  const departure = s.visit?.departure ?? (sched ? addDays(sched.last, 1) : null);
  return {
    tour: s.tour,
    its: s.its,
    verified: s.verified,
    reason: s.reason ?? null,
    stay: { arrival, arrivalTime: s.visit?.arrivalTime ?? null, departure, departureTime: s.visit?.departureTime ?? null, exitPort: s.visit?.exitPort ?? null, entryPort: s.visit?.entryPort ?? null },
    schedule: sched ? { days: sched.days, lateKnown: sched.lateKnown } : null,
    // Only this person's own room, and only when NKERP confirmed the ITS on the tour.
    room: s.verified && s.room ? { state: s.room.state, rooms: s.room.rooms } : null,
  };
}

export async function me(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const s = await readSession<ZairSession>(env, request, "zair");
  if (!s) return json({ signedIn: false });
  // Rooms change; ask NKERP again when the saved answer is older than ten minutes (or was never possible).
  const stale = !s.room || Date.now() - s.room.at > ROOM_FRESH_MS;
  if (stale && nkerpConfigured(env) && (s.verified || s.reason === "unavailable")) {
    const fresh = await lookUp(env, s.tour, s.its, karbalaNow().date);
    if (fresh.verified || fresh.reason === "not_listed") {
      Object.assign(s, { reason: undefined }, fresh);
      const token = cookieOf(request, "zk_zair")!;
      await env.DB.prepare("UPDATE sessions SET data=? WHERE hash=?").bind(JSON.stringify(s), await sha256(token)).run();
    }
  }
  return json({ signedIn: true, ...(await mePayload(env, ctx, s)) });
}
