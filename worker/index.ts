import { ensureSeed, publicPayload, type ContentRow } from "./content";
import { me, signIn, signOut } from "./zair";
import {
  HttpError, attemptsLeft, clearAttempts, countAttempt, createSession, dropSession, fail, ipOf, json, logAdmin, newId, nowIso,
  readJson, readSession, sameSecret, setCookie, type Env,
} from "./lib";

const ADMIN_TTL = 30 * 86_400; // "keep me signed in on my device for 30 days"
const PIN_TRIES = 5;
const PIN_LOCK_MS = 15 * 60_000;
const CHUNK = 900_000;
const MAX_FILE = 40_000_000;
const KINDS = ["page", "block", "office", "fact", "faq", "request_type", "feedback_q"];
const FILE_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf|video\/mp4)$/;

type Handler = (ctx: { request: Request; env: Env; url: URL; params: string[]; ctx: ExecutionContext }) => Promise<Response>;
const routes: { method: string; pattern: RegExp; admin?: boolean; run: Handler }[] = [];
const route = (method: string, path: string, run: Handler, admin = false) =>
  routes.push({ method, pattern: new RegExp(`^${path.replace(/:[a-z]+/g, "([^/]+)")}$`), admin, run });

const text = (v: unknown, max = 20_000) => (typeof v === "string" ? v.slice(0, max) : "");
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const lines = (v: unknown) => (Array.isArray(v) ? v.map((x) => text(x, 200).trim()).filter(Boolean).slice(0, 40) : []);

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

route("GET", "/api/content", async ({ env, request }) => {
  const zair = await readSession(env, request, "zair");
  const body = await publicPayload(env, !!(zair && (zair as { verified?: boolean }).verified));
  return json(body);
});

route("POST", "/api/signin", ({ request, env, ctx }) => signIn(request, env, ctx));
route("POST", "/api/signout", ({ request, env }) => signOut(request, env));
route("GET", "/api/me", ({ request, env, ctx }) => me(request, env, ctx));

route("GET", "/api/file/:id", async ({ env, params }) => {
  const file = await env.DB.prepare("SELECT * FROM files WHERE id=?").bind(params[0]).first<{ id: string; name: string; mime: string; size: number }>();
  if (!file) fail(404, "That file is no longer here.");
  const count = Math.ceil(file!.size / CHUNK);
  let seq = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (seq >= count) return controller.close();
      const row = await env.DB.prepare("SELECT data FROM file_chunks WHERE file_id=? AND seq=?").bind(file!.id, seq++).first<{ data: ArrayBuffer | number[] }>();
      if (!row) return controller.close();
      controller.enqueue(row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : Uint8Array.from(row.data));
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": file!.mime,
      "Content-Length": String(file!.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${file!.name.replace(/[^\w.\- ]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

// ---------------------------------------------------------------------------
// Admin sign-in: one PIN, five wrong tries locks that IP out for fifteen minutes.
// ---------------------------------------------------------------------------

route("POST", "/api/admin/login", async ({ env, request }) => {
  if (!env.ADMIN_PIN || !env.SESSION_KEY) fail(503, "Admin is not set up yet: the ADMIN_PIN secret is missing.", "not_configured");
  const key = `pin:${ipOf(request)}`;
  if ((await attemptsLeft(env, key, PIN_TRIES)) <= 0) fail(429, "Too many wrong tries. Try again in 15 minutes.", "locked");
  const { pin } = await readJson<{ pin?: string }>(request, 2000);
  if (!(await sameSecret(env, text(pin, 200), env.ADMIN_PIN!))) {
    const used = await countAttempt(env, key, PIN_LOCK_MS);
    const left = PIN_TRIES - used;
    fail(left > 0 ? 401 : 429, left > 0 ? `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Try again in 15 minutes.", left > 0 ? "wrong_pin" : "locked");
  }
  await clearAttempts(env, key);
  const token = await createSession(env, "admin", {}, ADMIN_TTL);
  await logAdmin(env, "signed in");
  return json({ ok: true }, 200, { "Set-Cookie": setCookie("zk_admin", token, ADMIN_TTL) });
});

route("POST", "/api/admin/logout", async ({ env, request }) => {
  await dropSession(env, request, "admin");
  return json({ ok: true }, 200, { "Set-Cookie": setCookie("zk_admin", "", 0) });
});

route("GET", "/api/admin/state", async ({ env }) => {
  await ensureSeed(env);
  const [content, menus, majlis, news, files] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM content ORDER BY kind, grp, sort, id"),
    env.DB.prepare("SELECT * FROM menus ORDER BY date DESC LIMIT 30"),
    env.DB.prepare("SELECT * FROM majlis ORDER BY date DESC LIMIT 60"),
    env.DB.prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100"),
    env.DB.prepare("SELECT id,name,mime,size,created_at FROM files ORDER BY created_at DESC LIMIT 200"),
  ]);
  return json({
    content: (content.results as unknown as ContentRow[]).map((r) => ({
      ...r, en: JSON.parse(r.en), lud: JSON.parse(r.lud), data: JSON.parse(r.data), lud_ok: !!r.lud_ok, missing: !!r.missing, enabled: !!r.enabled,
    })),
    menus: (menus.results as Record<string, string>[]).map((m) => ({ ...m, lunch: JSON.parse(m.lunch), dinner: JSON.parse(m.dinner) })),
    majlis: majlis.results, announcements: news.results, files: files.results,
  });
}, true);

route("PUT", "/api/admin/content/:id", async ({ env, request, params }) => {
  const id = decodeURIComponent(params[0]);
  if (!/^[a-z0-9][a-z0-9._-]{1,80}$/.test(id)) fail(400, "Use only small letters, numbers, dots and dashes in the ID.");
  const b = await readJson<Record<string, unknown>>(request);
  if (!KINDS.includes(text(b.kind, 20))) fail(400, "Unknown kind of content.");
  const obj = (v: unknown) => JSON.stringify(v && typeof v === "object" && !Array.isArray(v) ? v : {});
  await env.DB.prepare(
    `INSERT INTO content(id,kind,grp,sort,icon,en,lud,data,lud_ok,missing,audience,enabled,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,grp=excluded.grp,sort=excluded.sort,icon=excluded.icon,en=excluded.en,lud=excluded.lud,
       data=excluded.data,lud_ok=excluded.lud_ok,missing=excluded.missing,audience=excluded.audience,enabled=excluded.enabled,updated_at=excluded.updated_at`,
  )
    .bind(id, text(b.kind, 20), text(b.grp, 80), Number(b.sort) || 0, text(b.icon, 40), obj(b.en), obj(b.lud), obj(b.data),
      b.lud_ok ? 1 : 0, b.missing ? 1 : 0, b.audience === "zair" ? "zair" : "public", b.enabled === false ? 0 : 1, nowIso())
    .run();
  await logAdmin(env, "saved content", id);
  return json({ ok: true });
}, true);

route("DELETE", "/api/admin/content/:id", async ({ env, params }) => {
  const id = decodeURIComponent(params[0]);
  await env.DB.batch([env.DB.prepare("DELETE FROM content WHERE id=?").bind(id), env.DB.prepare("DELETE FROM content WHERE kind='block' AND grp=?").bind(id)]);
  await logAdmin(env, "deleted content", id);
  return json({ ok: true });
}, true);

route("PUT", "/api/admin/menu/:date", async ({ env, request, params }) => {
  if (!isDate(params[0])) fail(400, "That date was not understood.");
  const b = await readJson<Record<string, unknown>>(request);
  await env.DB.prepare(
    "INSERT INTO menus(date,hijri,lunch,dinner,image_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET hijri=excluded.hijri,lunch=excluded.lunch,dinner=excluded.dinner,image_id=excluded.image_id,updated_at=excluded.updated_at",
  )
    .bind(params[0], text(b.hijri, 80), JSON.stringify(lines(b.lunch)), JSON.stringify(lines(b.dinner)), text(b.image_id, 40) || null, nowIso())
    .run();
  await logAdmin(env, "saved menu", params[0]);
  return json({ ok: true });
}, true);

route("DELETE", "/api/admin/menu/:date", async ({ env, params }) => {
  await env.DB.prepare("DELETE FROM menus WHERE date=?").bind(params[0]).run();
  await logAdmin(env, "deleted menu", params[0]);
  return json({ ok: true });
}, true);

// One call switches a majlis on (or off) for several dates at once.
route("PUT", "/api/admin/majlis", async ({ env, request }) => {
  const b = await readJson<Record<string, unknown>>(request);
  const dates = (Array.isArray(b.dates) ? b.dates : []).filter(isDate).slice(0, 60);
  if (!dates.length) fail(400, "Pick at least one date.");
  const stmt = env.DB.prepare(
    "INSERT INTO majlis(date,active,venue_en,venue_lud,time_en,time_lud,booklet_id,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET active=excluded.active,venue_en=excluded.venue_en,venue_lud=excluded.venue_lud,time_en=excluded.time_en,time_lud=excluded.time_lud,booklet_id=excluded.booklet_id,updated_at=excluded.updated_at",
  );
  await env.DB.batch(dates.map((d) =>
    stmt.bind(d, b.active === false ? 0 : 1, text(b.venue_en, 200), text(b.venue_lud, 200), text(b.time_en, 200), text(b.time_lud, 200), text(b.booklet_id, 40) || null, nowIso())));
  await logAdmin(env, b.active === false ? "majlis off" : "majlis on", dates.join(", "));
  return json({ ok: true });
}, true);

route("DELETE", "/api/admin/majlis/:date", async ({ env, params }) => {
  await env.DB.prepare("DELETE FROM majlis WHERE date=?").bind(params[0]).run();
  await logAdmin(env, "majlis removed", params[0]);
  return json({ ok: true });
}, true);

route("PUT", "/api/admin/announcement/:id", async ({ env, request, params }) => {
  const b = await readJson<Record<string, unknown>>(request);
  const id = params[0] === "new" ? newId() : params[0];
  await env.DB.prepare(
    "INSERT INTO announcements(id,created_at,en,lud,lud_ok,media_id,enabled) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET en=excluded.en,lud=excluded.lud,lud_ok=excluded.lud_ok,media_id=excluded.media_id,enabled=excluded.enabled",
  )
    .bind(id, nowIso(), text(b.en, 4000), text(b.lud, 4000), b.lud_ok ? 1 : 0, text(b.media_id, 40) || null, b.enabled === false ? 0 : 1)
    .run();
  await logAdmin(env, "saved announcement", id);
  return json({ ok: true, id });
}, true);

route("DELETE", "/api/admin/announcement/:id", async ({ env, params }) => {
  await env.DB.prepare("DELETE FROM announcements WHERE id=?").bind(params[0]).run();
  await logAdmin(env, "deleted announcement", params[0]);
  return json({ ok: true });
}, true);

route("POST", "/api/admin/file", async ({ env, request }) => {
  const mime = (request.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!FILE_TYPES.test(mime)) fail(415, "Upload a JPEG, PNG or WebP image, an MP4 video, or a PDF.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) fail(400, "That file is empty.");
  if (bytes.length > MAX_FILE) fail(413, "That file is larger than 40 MB.");
  const id = newId();
  const name = decodeURIComponent(request.headers.get("X-File-Name") || "file").slice(0, 120);
  await env.DB.prepare("INSERT INTO files(id,name,mime,size,created_at) VALUES(?,?,?,?,?)").bind(id, name, mime, bytes.length, nowIso()).run();
  const stmt = env.DB.prepare("INSERT INTO file_chunks(file_id,seq,data) VALUES(?,?,?)");
  for (let seq = 0, at = 0; at < bytes.length; seq++, at += CHUNK) await stmt.bind(id, seq, bytes.slice(at, at + CHUNK)).run();
  await logAdmin(env, "uploaded file", id, `${name} (${mime}, ${bytes.length} bytes)`);
  return json({ ok: true, id, mime, size: bytes.length });
}, true);

route("DELETE", "/api/admin/file/:id", async ({ env, params }) => {
  await env.DB.batch([env.DB.prepare("DELETE FROM file_chunks WHERE file_id=?").bind(params[0]), env.DB.prepare("DELETE FROM files WHERE id=?").bind(params[0])]);
  await logAdmin(env, "deleted file", params[0]);
  return json({ ok: true });
}, true);

route("GET", "/api/admin/log", async ({ env }) => {
  const rows = await env.DB.prepare("SELECT at,action,target,detail FROM admin_log ORDER BY id DESC LIMIT 300").all();
  return json({ log: rows.results });
}, true);

// ---------------------------------------------------------------------------

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (request.method !== "GET") {
    // Browsers send Origin on every cross-site write; refuse those.
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== url.host) fail(403, "This request came from another site.");
    if (request.headers.get("Sec-Fetch-Site") === "cross-site") fail(403, "This request came from another site.");
  }
  for (const r of routes) {
    if (r.method !== request.method) continue;
    const m = r.pattern.exec(url.pathname);
    if (!m) continue;
    if (r.admin && !(await readSession(env, request, "admin"))) fail(401, "Sign in to admin first.", "signed_out");
    return r.run({ request, env, url, params: m.slice(1), ctx });
  }
  return fail(404, "Not found.");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handle(request, env, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
      // Never log request bodies or URLs with personal data: only the error's own message.
      console.error("unhandled", err instanceof Error ? err.message : String(err));
      return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
