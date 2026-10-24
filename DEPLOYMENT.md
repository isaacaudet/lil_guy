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

The browser retains its collection and owner token in localStorage. Losing
browser storage loses the release token and collection; there is no account
recovery or cross-device collection sync. A legacy browser-only claim without
an owner token does not grant server ownership. Claude artifact sessions keep
using their existing artifact database path.

## Validation (October 24, 2026, Pacific)

`bun test`: 134 pass / 1 fail (131 library tests plus four API tests).
The existing golden-art composition snapshot fails identically in a pristine
archive of the starting branch. No library source or snapshots were changed.
`bun run showcase` and deploy-folder build pass.

Browser acceptance at 390×844 checks light/dark layout, claiming, the free
capsule, `rarest` dev drops, mute and owner-only deletion. API tests cover
conflicts, public response privacy, founder reservation and claim throttling.
Autoreview was attempted once at low effort on the API boundary, but could not
start because the installed Codex CLI binary is missing. Direct inspection and
focused tests were used instead.
