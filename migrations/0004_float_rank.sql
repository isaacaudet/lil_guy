-- Float rank: how a copy's float stands among every copy of the same item in the same finish. Additive.
CREATE INDEX IF NOT EXISTS copies_float ON copies(item, finish, scuff);
