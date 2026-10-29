-- Existing names keep their browser-token ownership until their owner links Google.
ALTER TABLE names ADD COLUMN account TEXT;
CREATE UNIQUE INDEX names_account ON names(account) WHERE account IS NOT NULL;
CREATE TABLE auth_sessions (
  hash TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  expires INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX auth_sessions_account ON auth_sessions(account, created DESC);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires);
CREATE TABLE auth_nonces (
  hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
