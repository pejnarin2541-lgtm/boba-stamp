PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'Trial',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','banned')),
  member_prefix TEXT NOT NULL DEFAULT 'BOBA-',
  theme_primary TEXT NOT NULL DEFAULT '#bc5638',
  card_title TEXT NOT NULL DEFAULT 'สะสม 10 แลก 1',
  card_note TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  reward_text TEXT NOT NULL DEFAULT 'เครื่องดื่มฟรี 1 แก้ว',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  stamps INTEGER NOT NULL DEFAULT 0 CHECK (stamps >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (shop_id, phone)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('stamp','redeem')),
  points INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('member','merchant','admin')),
  subject_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','login')),
  shop_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', reward_text TEXT NOT NULL DEFAULT '',
  starts_at INTEGER, ends_at INTEGER, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promotions_shop_status ON promotions(shop_id,status,ends_at);
CREATE INDEX IF NOT EXISTS idx_members_shop_status ON members(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_events_shop_created ON events(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_member_created ON events(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
