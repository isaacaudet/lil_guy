-- How each player felt about the new lil guy that replaced his old club one (the retire moment on the
-- site): one row per name, his last answer. Additive; until it is applied the happy and sad buttons
-- answer an error the page ignores.
CREATE TABLE IF NOT EXISTS retire_feels (
  key TEXT PRIMARY KEY,
  feel TEXT NOT NULL CHECK (feel IN ('happy', 'sad')),
  at TEXT NOT NULL
);
