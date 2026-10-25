# Lil Guys promo

The promo runs at https://lilguys.isaac-audet.workers.dev. Only the
`claude/compassionate-mayer-oigii3` branch is used for this deployment.
No custom domain or DLE Club routes are configured.

## Build and deploy

```sh
bun install
bun run showcase
bash scripts/build-site.sh
npx wrangler d1 migrations apply lilguys-names --remote
npx wrangler deploy
```

`site/` is ignored. The root page uses `/lil-guy.js`; the showcase pages
keep their relative `../lil-guy.js` reference. Static requests go directly to
Cloudflare assets. The Worker script runs for `/api/*` to provide shared claims.

The D1 database is dedicated to this promo. Two Worker secrets must be set:
`CLAIM_SALT` (a random private salt) and `FOUNDER_SECRET` (the private founder
reservation key). Neither belongs in this repository. Local testing uses an
ignored `.dev.vars` file. Production secrets were uploaded with Wrangler.

## Name claims

- `POST /api/names/:key`: atomically claims a 2–16 character lowercase
  alphanumeric handle; returns its generated seed and a random owner token.
  Conflicts return 409. No client-supplied seed or owner is accepted.
- `GET /api/names/:key` and `GET /api/names?recent=12`: return public
  handle, seed and timestamp only.
- `DELETE /api/names/:key`: requires `Authorization: Bearer <owner token>`.
- `isaac` requires `X-Founder-Secret` matching the server secret. It stays
  reserved even before being claimed; the regular public form cannot claim it.
- Claims permit ten attempts per IP per UTC day, including conflicts. Only a
  secret-salted daily digest is retained in D1. Old digest rows are removed on
  the next accepted claim attempt. Owner tokens are hashed before storage.

## Collections and the market (migration 0002)

Every copy is rolled and stored by the Worker, so what the market shows is what
capsules really gave. Apply `migrations/0002_collections.sql` (the deploy commands
above apply every pending migration) before deploying a Worker that reads it.

- A claim creates the player record: 1,200 tickets and the nine starter copies
  (the founder also gets the one-of-one Gold flag). Names claimed before 0002 get
  theirs on first use.
- Owner-only (`Authorization: Bearer <owner token>`, same-origin writes):
  - `GET /api/me/:key/state`: tickets, today's free and ticket days, the look and every copy.
  - `POST /api/me/:key/open {game, free}`: one capsule, rolled on the server from a random
    seed. Today's machine is free once a UTC day; otherwise 120 tickets. 402 when short.
  - `POST /api/me/:key/season`: the seasonal hat, 150 tickets, only while one is in season.
  - `POST /api/me/:key/checkin`: 360 tickets, once a UTC day.
  - `POST /api/me/:key/wear {slot, id|null}`: only your own copy, for its own slot.
  - `POST /api/me/:key/look {look}`: only parts `decodeLook` allows for your dealt guy.
- Public, never with owner tokens:
  - `GET /api/guys?sort=rarest|recent&q=`: every guy with what he wears and his best copy.
  - `GET /api/guys/:key`: one player's guy and collection.
  - `GET /api/market?grade=&game=&slot=&finish=&key=&sort=rarest|float|newest`: every
    copy from a capsule (starters aside).
  - `GET /api/stats`: claims, copies and counts by grade.
- Releasing a name (`DELETE /api/names/:key`) deletes its player record and copies.
- Nothing is for sale. Dev drops (the `rarest` easter egg) only work in the demo.

Validated locally with `wrangler dev --local` and both migrations applied:
- two players claimed, opened free and paid capsules, and collected tickets;
- the Guys, profile and Market pages listed both, and a reload restored state from D1;
- `bun test`: 142 pass, including the Worker's ten API tests.

The browser keeps only its owner token (and a cached copy of the state) in localStorage. Losing
browser storage loses the owner token, and with it access to the name; the
collection stays on the server, but there is no account recovery or second
device sign-in yet. A legacy browser-only claim without
an owner token does not grant server ownership. Claude artifact sessions keep
using their existing artifact database path.

## Validation (October 24, 2026, Pacific)

`bun test`: 134 pass / 1 fail (131 library tests plus four API tests).
The existing golden-art composition snapshot fails identically in a pristine
archive of the starting branch. No library source or snapshots were changed.
`bun run showcase` and deploy-folder build pass.

After merging the promo's sound, open and scoring pass (ff64ad1): `bun test` 136 pass,
0 fail (the snapshot passes here). The deploy needs a fresh `scripts/build-site.sh` and
`npx wrangler deploy` to pick it up.

Browser acceptance at 390×844 checks light/dark layout, claiming, the free
capsule, `rarest` dev drops, mute and owner-only deletion. API tests cover
conflicts, public response privacy, founder reservation and claim throttling.
Autoreview was attempted once at low effort on the API boundary, but could not
start because the installed Codex CLI binary is missing. Direct inspection and
focused tests were used instead.
