-- Stamps, the only currency (worker/stamps.js): one for each DLE Club game a player finishes in a day,
-- two gold ones for a day the five-game gauntlet is cleared, and ten given once to every player. Earned
-- stamps are read from the club (its lilguys-stats days, with the card stats' read) and kept here a day at
-- a time; the ten to start and every spend are rows in a ledger, so a balance is always what was earned
-- plus the ledger. Additive: nothing is dropped or rewritten. Players who claimed before stamps keep every
-- copy, part, bit of metal and luck counter; their old tickets column is simply no longer read, and their
-- ten come on their next visit. Until this is applied the page shows no stamps and paid capsules answer
-- that stamps aren't open yet.
--
-- Stamps belong to a `holder`: a name's Google sign-in (its sha256 account hash) when it has one, else the
-- name itself (a key, never 64 characters, so the two can't meet). Letting a name go and claiming another
-- with the same Google account keeps the account's stamps, spends and starter, so nothing is paid twice.
-- One row per holder and club day: the games finished that counted that day (comma separated, NULL
-- when the club only sent how many), how many stamps that makes (at most eight) and whether the
-- gauntlet was cleared.
CREATE TABLE IF NOT EXISTS club_days (
  holder TEXT NOT NULL,
  day TEXT NOT NULL,
  played TEXT,
  n INTEGER NOT NULL,
  cleared INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (holder, day)
);
-- The starter given (positive) and every spend (negative): how many stamps, on what, and when.
CREATE TABLE IF NOT EXISTS stamp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holder TEXT NOT NULL,
  stamps INTEGER NOT NULL,
  what TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS stamp_ledger_holder ON stamp_ledger(holder);
-- The starter is given once per holder, however many loads race for it.
CREATE UNIQUE INDEX IF NOT EXISTS stamp_ledger_starter ON stamp_ledger(holder) WHERE what = 'starter';
-- A Google account's capsule luck and free day, kept when it lets a name go, so the next name it claims
-- carries on from there: no second beginner's luck, and no second free capsule the same day. `opened` is
-- every capsule opened on names it let go; the roll adds the current name's own.
CREATE TABLE IF NOT EXISTS account_luck (
  account TEXT PRIMARY KEY,
  opened INTEGER NOT NULL DEFAULT 0,
  dry INTEGER NOT NULL DEFAULT 0,
  free_day TEXT NOT NULL DEFAULT ''
);
-- When the player's club days were last read for stamps, in ms (the card stats keep their own, club_read).
ALTER TABLE players ADD COLUMN stamps_read INTEGER NOT NULL DEFAULT 0;
