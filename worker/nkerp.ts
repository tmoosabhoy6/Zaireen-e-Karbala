/**
 * Read-only NKERP client. Hard rule: this app never writes to NKERP.
 * Some NKERP GETs change data, so every path, GET or POST, must be on READS below; anything else throws
 * before a request is made. The three reads are the ones the accommodation and ziyarat workflows validated:
 *   - getRoomDetailsforDeallocation: "who is where" search (despite its name it only lists)
 *   - getRoomallocationSearchResult:  people who still have nights without a room
 *   - the four VisitingPoint lists:   each tour's Karbala arrival and departure
 * Names never leave this file: callers get rooms, dates and yes/no answers only.
 */
import type { Env } from "./lib";

const BASE = "https://to.najafkarbala.com/NKERPApi/";
const ORIGIN = "https://to.najafkarbala.com";
const ROLE_ROOMS = 74; // Tour and Accomodation Admin
const ROLE_ZIYARAT = 13; // Ziyarat Incharge of KARBALA
const VENUE = 2; // IRAQ
const KARBALA = 4;

const LOGIN = "api/accounts/Login";
const ROLE_SELECT = /^api\/user\/GetSectionIdByGroupId\/(13|74)$/;
const ROOMS = "api/Property/getRoomDetailsforDeallocation";
const UNALLOCATED = "api/property/getRoomallocationSearchResult";
const VISIT_LISTS = [
  "api/VisitingPoint/getReleasedTours", "api/VisitingPoint/getScheduledTours",
  "api/VisitingPoint/getPartialScheduledTours", "api/VisitingPoint/MuwafiqaApprovedTours",
];
const READS = new Set([LOGIN, ROOMS, UNALLOCATED, ...VISIT_LISTS]);
export const isAllowedRead = (path: string) => READS.has(path) || ROLE_SELECT.test(path);

export const nkerpConfigured = (env: Env) => !!(env.NKERP_LOGIN_ID && env.NKERP_PASSWORD);
export const tourRef = (tour: string) => `NKERP/TOUR/20${tour.slice(0, 2)}/${tour.slice(3)}`;

interface Session { cookies: [string, string][]; userId: number }
type Fetcher = typeof fetch;

function keepCookies(jar: Map<string, string>, res: Response) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const pair = line.split(";")[0];
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
}

export class Nkerp {
  private jar = new Map<string, string>();
  private userId: number | null = null;
  constructor(private env: Env, private fetcher: Fetcher = (input, init) => fetch(input, init)) {}

  private async call(path: string, body: unknown, role: number): Promise<any> {
    if (!isAllowedRead(path)) throw new Error(`NKERP path is not on the read allowlist: ${path}`);
    const cookies = new Map(this.jar);
    if (this.userId !== null && path !== LOGIN) {
      cookies.set("GroupId", String(role));
      cookies.set("UserId", String(this.userId));
    }
    const res = await this.fetcher(BASE + path, {
      method: body === undefined ? "GET" : "POST",
      redirect: "manual",
      headers: {
        Accept: "application/json", "Content-Type": "application/json", Origin: ORIGIN, Referer: `${ORIGIN}/`,
        ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    keepCookies(this.jar, res);
    if (!res.ok) throw new Error(`NKERP answered HTTP ${res.status}`);
    const data: any = await res.json().catch(() => {
      throw new Error("NKERP did not answer with data");
    });
    if (data?.IsError) throw new Error("NKERP refused the request");
    return data;
  }

  private async login(): Promise<void> {
    this.jar.clear();
    this.userId = null;
    const r = await this.call(LOGIN, { LocalUTCTime: new Date().toISOString(), LoginId: this.env.NKERP_LOGIN_ID, Password: this.env.NKERP_PASSWORD }, 0);
    if (!r?.ReturnStatus || !r?.IsAuthenicated || !r.UserId) throw new Error("NKERP sign-in failed");
    this.userId = r.UserId;
    const roles = String(r.Role || "").split(",").map((x: string) => x.trim());
    for (const role of [ROLE_ROOMS, ROLE_ZIYARAT]) if (roles.includes(String(role))) await this.call(`api/user/GetSectionIdByGroupId/${role}`, undefined, role);
    await this.env.DB.prepare("INSERT INTO meta(key,value) VALUES('nkerp_session',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .bind(JSON.stringify({ cookies: [...this.jar], userId: r.UserId as number } satisfies Session)).run();
  }

  /** Runs a read with the saved NKERP session, signing in again once if it has expired. */
  private async read(path: string, body: unknown, role: number): Promise<any> {
    if (this.userId === null) {
      const saved = await this.env.DB.prepare("SELECT value FROM meta WHERE key='nkerp_session'").first<{ value: string }>();
      if (saved) {
        const s = JSON.parse(saved.value) as Session;
        this.jar = new Map(s.cookies);
        this.userId = s.userId;
        try {
          return await this.call(path, body, role);
        } catch {
          /* expired or refused: sign in again below */
        }
      }
      await this.login();
    }
    return this.call(path, body, role);
  }

  /**
   * One person's Karbala room: the rows NKERP returns for this tour and ITS, reduced to building, room,
   * floor and nights. Rows list everyone in the room; only the asked ITS is looked at, nobody else is returned.
   */
  async roomFor(tour: string, its: string): Promise<{ found: boolean; rooms: Room[] }> {
    const ref = tourRef(tour);
    const r = await this.read(ROOMS, {
      FamilyID: "", FloorNo: "", OccupiedDateFrom: null, OccupiedDateTo: null, PropertyId: [], RoomNo: "", RoomTypeId: "", SubVenueID: String(KARBALA),
      TimeZone: 3, TourRefenceNO: [ref], ItsID: [its], VenueID: String(VENUE), currentPage: 1, itemsPerPage: 500, maxSize: 10, reverse: false, sortBy: "OccupiedDate",
    }, ROLE_ROOMS);
    const byRoom = new Map<string, Room>();
    for (const row of (r?.lstAllocationDetails ?? []) as any[]) {
      const mine = (row.RoomAllocatedDates_Current ?? []).some((p: any) => String(p.AppicantITSId ?? "").trim() === its && p.TourReferenceNo === ref);
      if (!mine || row.SubvenueId !== KARBALA) continue;
      const night = String(row.OccupiedDate ?? "").slice(0, 10);
      const key = `${row.PropertyName}|${row.RoomNo}`;
      const room = byRoom.get(key) ?? { building: String(row.PropertyName ?? "").trim(), room: String(row.RoomNo ?? "").trim(), floor: String(row.FloorNo ?? "").trim(), nights: [] };
      if (night && !room.nights.includes(night)) room.nights.push(night);
      byRoom.set(key, room);
    }
    const rooms = [...byRoom.values()].map((x) => ({ ...x, nights: x.nights.sort() })).sort((a, b) => (a.nights[0] ?? "").localeCompare(b.nights[0] ?? ""));
    return { found: rooms.length > 0, rooms };
  }

  /** True when this ITS is on the tour and still has Karbala nights with no room assigned. */
  async awaitingRoom(tour: string, its: string): Promise<boolean> {
    const ref = tourRef(tour);
    const r = await this.read(UNALLOCATED, {
      ArrivalFromDate: null, ArrivalToDate: null, Category: "", DepartureFromDate: null, DepartureToDate: null, FamilyID: "", GenderID: "", HOFID: null, RazaCode: null,
      Idara: "", IsRoomAllocationRole: false, OfficeName: "", PackageId: "", ItsID: its, PropertyId: null, SubVenueID: String(KARBALA), TimeZone: 3, TourRefenceNO: ref,
      VenueID: String(VENUE), isDST: false, currentPage: 1, itemsPerPage: 50, maxSize: 10, reverse: true, sortBy: "ModifiedOn",
    }, ROLE_ROOMS);
    return ((r?.lstAllocationApllicationDetails ?? []) as any[]).some((a) => String(a.ITSId ?? "").trim() === its && a.TourRefenceNO === ref);
  }

  /** The tour's Karbala arrival and departure (Karbala local time), and the ports it enters and leaves Iraq by. */
  async visit(tour: string, around: string): Promise<Visit | null> {
    const ref = tourRef(tour);
    const day = (n: number) => new Date(Date.parse(`${around}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
    const found: Visit[] = [];
    for (const list of VISIT_LISTS) {
      const r = await this.read(list, {
        IsZiyaratRequired: false, PackageId: null, TOId: this.userId, TOOfficeNameSearch: null, FromDateFromSearch: day(-60), FromDateToSearch: day(60),
        TourSearchRefNo: ref, ZiyaratGroupId: null, clientTimeZoneOffset: -180, currentPage: 1, ddlSubVenue: { Value: KARBALA, Text: "KARBALA" }, group: ROLE_ZIYARAT,
        itemsPerPage: 20, maxSize: 20, reverse: false, sortBy: "ModifiedOn", totalItems: 20, subVenueSearchId: KARBALA, venueSearchId: VENUE,
      }, ROLE_ZIYARAT);
      for (const row of [...(r?.lstMufiquaFinalInZSDTO ?? []), ...(r?.lstMufiquaInZSDTO ?? [])] as any[]) {
        if (String(row?.Tour?.ReferenceNo ?? "").trim() !== ref) continue;
        const a = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(row.ArrivalDate ?? ""));
        const d = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(row.DepartureDate ?? ""));
        if (!a || !d || d[1] < a[1]) continue;
        found.push({ arrival: a[1], arrivalTime: a[2], departure: d[1], departureTime: d[2], entryPort: String(row.Tour?.EntryPortName ?? "").trim(), exitPort: String(row.Tour?.ExitPortName ?? "").trim() });
      }
      if (found.length) break;
    }
    if (!found.length) return null;
    // A tour can visit Karbala twice; take the visit that covers the day, else the nearest one.
    const dist = (v: Visit) => (v.arrival <= around && around <= v.departure ? 0 : Math.min(Math.abs(Date.parse(v.arrival) - Date.parse(around)), Math.abs(Date.parse(v.departure) - Date.parse(around))));
    return found.sort((x, y) => dist(x) - dist(y))[0];
  }
}

export interface Room { building: string; room: string; floor: string; nights: string[] }
export interface Visit { arrival: string; arrivalTime: string; departure: string; departureTime: string; entryPort: string; exitPort: string }
