-- A player's shelf: up to three of their copies pinned in front on their page (POST /api/me/<key>/pin), as
-- copy ids in order, comma separated. Additive: every player starts with none.
ALTER TABLE players ADD COLUMN pins TEXT NOT NULL DEFAULT '';
