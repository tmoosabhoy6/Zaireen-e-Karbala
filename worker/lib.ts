export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_PIN?: string;
  SESSION_KEY?: string;
  NKERP_LOGIN_ID?: string;
  NKERP_PASSWORD?: string;
  MAWAID_LOOKUP_TOKEN?: string;
  MAWAID_URL?: string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "") {
    super(message);
  }
}
export const fail = (status: number, message: string, code = ""): never => {
  throw new HttpError(status, message, code);
};

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SECURITY, ...headers },
  });
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function sha256(text: string): Promise<string> {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

/** Keyed hash, so stored keys (IP, ITS, cookie) cannot be reversed or guessed without the secret. */
export async function keyed(env: Env, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_KEY || "unset"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

/** Compares two secrets without leaking where they differ. */
export async function sameSecret(env: Env, a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([keyed(env, `cmp:${a}`), keyed(env, `cmp:${b}`)]);
  return x === y;
}

export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)).buffer as ArrayBuffer);
export const newId = () => randomToken(9);
export const nowIso = () => new Date().toISOString();

export function cookieOf(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return null;
}

export function setCookie(name: string, value: string, maxAgeSec: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=Lax`;
}

export const ipOf = (request: Request) => request.headers.get("CF-Connecting-IP") || "local";

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 200_000): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) fail(413, "That is too large to save.");
  try {
    return JSON.parse(text || "{}") as T;
  } catch {
    return fail(400, "The request was not understood.");
  }
}

// ---------------------------------------------------------------------------
// Attempt counters (sign-in, PIN). The key is a keyed hash, never an IP or ITS.
// ---------------------------------------------------------------------------

export async function attemptsLeft(env: Env, key: string, limit: number): Promise<number> {
  const row = await env.DB.prepare("SELECT n FROM attempts WHERE key=? AND expires>?").bind(await keyed(env, key), Date.now()).first<{ n: number }>();
  return limit - (row?.n ?? 0);
}

/** Counts one attempt; the window restarts from the first attempt after it expires. */
export async function countAttempt(env: Env, key: string, windowMs: number): Promise<number> {
  const k = await keyed(env, key);
  const now = Date.now();
  const row = await env.DB.prepare(
    "INSERT INTO attempts(key,n,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN expires<=? THEN 1 ELSE n+1 END, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING n",
  )
    .bind(k, now + windowMs, now, now)
    .first<{ n: number }>();
  return row?.n ?? 1;
}

export async function clearAttempts(env: Env, key: string): Promise<void> {
  await env.DB.prepare("DELETE FROM attempts WHERE key=? OR expires<=?").bind(await keyed(env, key), Date.now()).run();
}

// ---------------------------------------------------------------------------
// Sessions: the cookie holds a random token; the database holds only its hash.
// ---------------------------------------------------------------------------

export type Role = "admin" | "zair";

export async function createSession(env: Env, role: Role, data: unknown, ttlSec: number): Promise<string> {
  const token = randomToken();
  await env.DB.prepare("INSERT INTO sessions(hash,role,data,expires,created_at) VALUES(?,?,?,?,?)")
    .bind(await sha256(token), role, JSON.stringify(data ?? {}), Date.now() + ttlSec * 1000, nowIso())
    .run();
  return token;
}

export async function readSession<T = Record<string, unknown>>(env: Env, request: Request, role: Role): Promise<T | null> {
  const token = cookieOf(request, role === "admin" ? "zk_admin" : "zk_zair");
  if (!token) return null;
  const row = await env.DB.prepare("SELECT data FROM sessions WHERE hash=? AND role=? AND expires>?")
    .bind(await sha256(token), role, Date.now())
    .first<{ data: string }>();
  return row ? (JSON.parse(row.data) as T) : null;
}

export async function dropSession(env: Env, request: Request, role: Role): Promise<void> {
  const token = cookieOf(request, role === "admin" ? "zk_admin" : "zk_zair");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE hash=? OR expires<=?").bind(await sha256(token), Date.now()).run();
}

export async function logAdmin(env: Env, action: string, target = "", detail = ""): Promise<void> {
  await env.DB.prepare("INSERT INTO admin_log(at,action,target,detail) VALUES(?,?,?,?)").bind(nowIso(), action, target, detail.slice(0, 500)).run();
}
