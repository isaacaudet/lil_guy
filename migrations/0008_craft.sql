-- Crafting, as in TF2 (src/craft.ts): a player's metal, counted in scrap, and the count of every copy
-- ever crafted, which numbers each crafted copy. Additive: every player starts with no metal. Until
-- it is applied, smelting and crafting answer that they aren't ready and nothing else changes.
ALTER TABLE players ADD COLUMN metal INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  n INTEGER NOT NULL
);
