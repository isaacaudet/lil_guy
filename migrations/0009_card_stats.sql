-- A card's stats, as on a sports card: the days a copy has been worn, and while worn, the DLE Club games
-- its owner finished and their best club score (worker/card-stats.js). Additive; every copy starts at
-- none. Until it is applied the cards show no stats and nothing else changes.
ALTER TABLE copies ADD COLUMN worn_since TEXT NOT NULL DEFAULT '';
ALTER TABLE copies ADD COLUMN worn_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE copies ADD COLUMN worn_last TEXT NOT NULL DEFAULT '';
-- One row per day a copy was worn on which its owner finished club games: how many, and the day's club score.
CREATE TABLE IF NOT EXISTS copy_days (
  copy_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  games INTEGER NOT NULL,
  score INTEGER NOT NULL,
  PRIMARY KEY (copy_id, day)
);
-- When the owner's club days were last read, in ms.
ALTER TABLE players ADD COLUMN club_read INTEGER NOT NULL DEFAULT 0;
-- Each copy's place in its item's run, counted when it's made, so the first 100 of an item are its
-- 1st edition and a copy can say "#37 of this item". Starters and the founder's copies have none.
-- Copies made before this are numbered in the order they were made; the count carries on from there.
ALTER TABLE copies ADD COLUMN pull INTEGER NOT NULL DEFAULT 0;
UPDATE copies SET pull = (SELECT COUNT(*) FROM copies c2 WHERE c2.item = copies.item AND c2.id <= copies.id
  AND c2.source NOT IN ('starter', 'founder') AND c2.one_in > 0)
  WHERE source NOT IN ('starter', 'founder') AND one_in > 0;
INSERT INTO counters(name, n) SELECT 'pull:' || item, MAX(pull) FROM copies WHERE pull > 0 GROUP BY item
  ON CONFLICT(name) DO UPDATE SET n = MAX(n, excluded.n);
