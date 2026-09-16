CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reward_text TEXT NOT NULL DEFAULT '',
  starts_at INTEGER,
  ends_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promotions_shop_status ON promotions(shop_id,status,ends_at);
