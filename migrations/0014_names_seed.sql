-- A baked emote kept for what a player holds (worker/emotes.js, Galaxybrain) is drawn by code only for a
-- claimed guy who has earned it, found by the code's seed. Additive: an index; before it the same read scans names.
CREATE INDEX IF NOT EXISTS names_seed ON names(seed);
