-- Everything a zair reads is a row here, so new sections never need a schema change.
-- kind: page | block | office | fact | faq | request_type | feedback_q
-- grp:  where it belongs (a block's page id, a page's section, a fact's group).
CREATE TABLE content (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  grp TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '',
  en TEXT NOT NULL DEFAULT '{}',
  lud TEXT NOT NULL DEFAULT '{}',
  data TEXT NOT NULL DEFAULT '{}',
  lud_ok INTEGER NOT NULL DEFAULT 0,
  missing INTEGER NOT NULL DEFAULT 0,
  audience TEXT NOT NULL DEFAULT 'public',
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX content_kind ON content(kind, grp, sort);

CREATE TABLE menus (
  date TEXT PRIMARY KEY, hijri TEXT NOT NULL DEFAULT '',
  lunch TEXT NOT NULL DEFAULT '[]', dinner TEXT NOT NULL DEFAULT '[]',
  image_id TEXT, updated_at TEXT NOT NULL
);

-- A majlis shows only for dates switched on here. Empty venue/time mean "use the standing rule".
CREATE TABLE majlis (
  date TEXT PRIMARY KEY, active INTEGER NOT NULL DEFAULT 1,
  venue_en TEXT NOT NULL DEFAULT '', venue_lud TEXT NOT NULL DEFAULT '',
  time_en TEXT NOT NULL DEFAULT '', time_lud TEXT NOT NULL DEFAULT '',
  booklet_id TEXT, updated_at TEXT NOT NULL
);

CREATE TABLE announcements (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
  en TEXT NOT NULL DEFAULT '', lud TEXT NOT NULL DEFAULT '', lud_ok INTEGER NOT NULL DEFAULT 0,
  media_id TEXT, enabled INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX announcements_new ON announcements(enabled, created_at DESC);

-- Uploaded images and the majlis booklet PDF, stored in chunks (D1 values are capped at 2 MB).
CREATE TABLE files (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE file_chunks (file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE, seq INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (file_id, seq));

-- Sessions hold only a hash of the cookie. role: admin | zair. data: JSON (zair: tour, ITS, stay dates).
CREATE TABLE sessions (hash TEXT PRIMARY KEY, role TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', expires INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires);

-- Counters for sign-in and PIN attempts. key is a hash, never an IP or ITS in the clear.
CREATE TABLE attempts (key TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX attempts_expiry ON attempts(expires);

CREATE TABLE admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '');

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
