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
