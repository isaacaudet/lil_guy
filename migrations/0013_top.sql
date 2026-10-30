-- The Top 100 (worker/top.js). A guy's rank (`guyRank`) and a copy's visible odds (`visibleOneIn`) are worked
-- out by the library, so each is kept here once worked out, for the database to sort by. `top_rule` and
-- `seen_rule` say which rules worked it out, and `top_seed` which seed a rank is for (a pick changes a new
-- name's seed); a row worked out under other rules, for another seed, or not yet (0), is worked out again
-- on the next read of the boards, a few hundred at a time. Additive: every row starts at 0.
ALTER TABLE players ADD COLUMN guy_top REAL NOT NULL DEFAULT 1;
ALTER TABLE players ADD COLUMN top_rule INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN top_seed TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS players_top ON players(top_rule, guy_top);
ALTER TABLE copies ADD COLUMN seen_in REAL NOT NULL DEFAULT 0;
ALTER TABLE copies ADD COLUMN seen_rule INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS copies_seen ON copies(seen_rule, seen_in DESC);
-- The week's rarest pulls read the copies made since a moment.
CREATE INDEX IF NOT EXISTS copies_made ON copies(at);
