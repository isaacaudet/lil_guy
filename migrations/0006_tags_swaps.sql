-- Name tags on copies, and swaps between players. Additive: existing copies get no tag.
ALTER TABLE copies ADD COLUMN tag TEXT NOT NULL DEFAULT '';
-- A swap offer: `give` is a copy of from_key's, `want` one of to_key's, or NULL for a gift. `nonce` marks the
-- request that completed it, so the copies only move with the accept that won.
CREATE TABLE IF NOT EXISTS swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_key TEXT NOT NULL,
  to_key TEXT NOT NULL,
  give INTEGER NOT NULL,
  want INTEGER,
  state TEXT NOT NULL DEFAULT 'open',
  nonce TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS swaps_to ON swaps(to_key, state);
CREATE INDEX IF NOT EXISTS swaps_from ON swaps(from_key, state);
