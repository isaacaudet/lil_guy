-- Stamps, the only currency (worker/stamps.js): one for each DLE Club game a player finishes in a day,
-- two gold ones for a day the five-game gauntlet is cleared, and ten given once to every player. Earned
-- stamps are read from the club (its lilguys-stats days, with the card stats' read) and kept here a day at
-- a time; the ten to start and every spend are rows in a ledger, so a balance is always what was earned
-- plus the ledger. Additive: nothing is dropped or rewritten. Players who claimed before stamps keep every
-- copy, part, bit of metal and luck counter; their old tickets column is simply no longer read, and their
-- ten come on their next visit. Until this is applied the page shows no stamps and paid capsules answer
-- that stamps aren't open yet.
-- One row per player and club day: the games finished that counted that day (comma separated, NULL
-- when the club only sent how many), how many stamps that makes (at most eight) and whether the
-- gauntlet was cleared.
CREATE TABLE IF NOT EXISTS club_days (
  key TEXT NOT NULL,
  day TEXT NOT NULL,
  played TEXT,
  n INTEGER NOT NULL,
  cleared INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
-- The starter given (positive) and every spend (negative): how many stamps, on what, and when.
CREATE TABLE IF NOT EXISTS stamp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  stamps INTEGER NOT NULL,
  what TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS stamp_ledger_key ON stamp_ledger(key);
-- The starter is given once per player, however many loads race for it.
CREATE UNIQUE INDEX IF NOT EXISTS stamp_ledger_starter ON stamp_ledger(key) WHERE what = 'starter';
-- When the player's club days were last read for stamps, in ms (the card stats keep their own, club_read).
ALTER TABLE players ADD COLUMN stamps_read INTEGER NOT NULL DEFAULT 0;
