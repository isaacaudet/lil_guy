-- Where a copy has been (worker/owners.js): each owner in turn, how it came to them (pulled, daily, mystery,
-- season, swapped, gift or crafted) and when, so a copy keeps who pulled it after it changes hands. Only
-- names, never an account. Additive: a new table; copies and swaps are unchanged.
CREATE TABLE IF NOT EXISTS copy_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  copy_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  at TEXT NOT NULL,
  how TEXT NOT NULL,
  UNIQUE (copy_id, key, at)
);
-- Every copy there already is starts with its first owner: whoever gave it away in its first finished swap,
-- else whoever holds it now, from when it was made.
INSERT OR IGNORE INTO copy_owners(copy_id, key, at, how)
  SELECT c.id,
    COALESCE((SELECT CASE WHEN s.give = c.id THEN s.from_key ELSE s.to_key END FROM swaps s
      WHERE s.state = 'done' AND (s.give = c.id OR s.want = c.id) ORDER BY s.id LIMIT 1), c.key),
    c.at,
    CASE c.source WHEN 'daily' THEN 'daily' WHEN 'seasonal' THEN 'season' WHEN 'craft' THEN 'crafted' WHEN 'trade' THEN 'crafted' ELSE 'pulled' END
  FROM copies c;
-- Then each finished swap and gift, as of when it was offered (when it was taken wasn't kept).
INSERT OR IGNORE INTO copy_owners(copy_id, key, at, how)
  SELECT c.id, CASE WHEN s.give = c.id THEN s.to_key ELSE s.from_key END, s.at, CASE WHEN s.want IS NULL THEN 'gift' ELSE 'swapped' END
  FROM swaps s JOIN copies c ON c.id = s.give OR c.id = s.want
  WHERE s.state = 'done';
