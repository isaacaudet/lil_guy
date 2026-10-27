-- Rare face parts a player has unlocked from capsules (src/look.ts, rollPart), as part codes
-- like `e12`. Additive: a new table, and nobody has any yet. Until it exists the Worker just
-- gives no parts.
CREATE TABLE IF NOT EXISTS parts (
  key TEXT NOT NULL,
  code TEXT NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (key, code)
);
