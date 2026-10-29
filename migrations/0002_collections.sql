-- Collections on the server: each claimed name's player record and every copy it owns, rolled by the
-- Worker so a copy on the market is one a capsule really gave. Additive; names and claim_limits are unchanged.
CREATE TABLE IF NOT EXISTS players (
  key TEXT PRIMARY KEY,
  tickets INTEGER NOT NULL DEFAULT 1200,
  free_day TEXT NOT NULL DEFAULT '',
  checkin_day TEXT NOT NULL DEFAULT '',
  look TEXT NOT NULL DEFAULT '',
  guy_one_in REAL NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS players_rarest ON players(guy_one_in DESC);
CREATE TABLE IF NOT EXISTS copies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  code TEXT NOT NULL,
  item TEXT NOT NULL,
  game TEXT NOT NULL,
  slot TEXT NOT NULL,
  finish TEXT NOT NULL,
  grade INTEGER NOT NULL,
  one_in REAL NOT NULL,
  scuff REAL NOT NULL,
  source TEXT NOT NULL,
  worn INTEGER NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS copies_owner ON copies(key);
CREATE INDEX IF NOT EXISTS copies_rarest ON copies(one_in DESC);
CREATE INDEX IF NOT EXISTS copies_newest ON copies(id DESC);
