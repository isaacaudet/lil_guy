-- Capsule luck: how many capsules each player has opened (their first three get beginner's luck) and how many
-- in a row have come out below Prized (after thirty dry in a row the next is Prized or better). Additive.
ALTER TABLE players ADD COLUMN opened INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN dry INTEGER NOT NULL DEFAULT 0;
