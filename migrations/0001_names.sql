CREATE TABLE IF NOT EXISTS names (
  key TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  owner TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS names_recent ON names(at DESC);
CREATE TABLE IF NOT EXISTS claim_limits (
  hash TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS claim_limits_day ON claim_limits(day);
