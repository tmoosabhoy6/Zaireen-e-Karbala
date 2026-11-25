import { useSyncExternalStore } from "react";
import type { ZiyaratKind } from "../shared/ziyarat";
import { refresh } from "./store";

export interface RoomInfo { building: string; room: string; floor: string; nights: string[] }
export interface Me {
  tour: string;
  its: string;
  verified: boolean;
  reason: "unavailable" | "not_listed" | null;
  stay: { arrival: string | null; arrivalTime: string | null; departure: string | null; departureTime: string | null; entryPort: string | null; exitPort: string | null };
  schedule: { days: { date: string; kind: ZiyaratKind; name: string }[]; lateKnown: boolean } | null;
  room: { state: "assigned" | "awaiting" | "none"; rooms: RoomInfo[] } | null;
}

const KEY = "zk.me.v1";
const read = (): Me | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
let me: Me | null = read();
const listeners = new Set<() => void>();
const set = (next: Me | null) => {
  me = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked: keep it in memory */ }
  listeners.forEach((fn) => fn());
};

export const useMe = () => useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => me);

/** Checks the saved sign-in with the server. Offline, the copy on the phone keeps working. */
export async function loadMe(): Promise<void> {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    set(data.signedIn ? (data as Me) : null);
  } catch { /* offline */ }
}

/** Signs in. Returns null on success, else a code the form words in the reader's language. */
export async function signIn(tour: string, its: string): Promise<string | null> {
  try {
    const res = await fetch("/api/signin", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tour, its }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.code || "other";
    set(data as Me);
    void refresh(); // content for signed-in zaereen (Wi-Fi) arrives now
    return null;
  } catch {
    return "offline";
  }
}

/** Signs out and clears everything saved on this phone for that person. */
export async function signOut(): Promise<void> {
  set(null);
  try {
    localStorage.removeItem("zk.content.v1");
    await fetch("/api/signout", { method: "POST", credentials: "same-origin" });
  } catch { /* the phone copy is already cleared */ }
  void refresh();
}
