# Lil Guys promo

The promo runs at https://lilguys.dleclub.com (a Worker Custom Domain in
`wrangler.jsonc`; dleclub.com's zone is on the same Cloudflare account, and the
deploy makes its DNS record and certificate) and still at
https://lilguys.isaac-audet.workers.dev. Only the
`claude/compassionate-mayer-oigii3` branch is used for this deployment.

## Build and deploy

```sh
bun install
bun run showcase
bash scripts/build-site.sh
npx wrangler d1 migrations apply lilguys-names --remote   # through 0007_parts
npx wrangler deploy
```

`site/` is ignored. The root page uses `/lil-guy.js`; the showcase pages
keep their relative `../lil-guy.js` reference. Static requests go directly to
Cloudflare assets. The Worker script runs for `/api/*` to provide shared claims.

The D1 database is dedicated to this promo. Two Worker secrets must be set:
`CLAIM_SALT` (a random private salt) and `FOUNDER_SECRET` (the private founder
reservation key). Neither belongs in this repository. Local testing uses an
ignored `.dev.vars` file. Production secrets were uploaded with Wrangler.

## DLE Club sign-in

Lil guys and DLE Club share one sign-in. Both use the same Google client, and both
keep a Google sign-in as `sha256("google:<sub>")`, so a Google account is the
same account on either site. On lilguys.dleclub.com a browser already signed in
to dleclub.com is signed in here by itself (dle-club `docs/accounts.md`, Lil guys):

1. Signed out, the page frames `https://dleclub.com/api/club/lilguys-frame`, hidden.
   The frame reads the club's own storage and says whether the browser is signed in.
2. If it is, the page starts a sign-in (`POST /api/auth/start`, the nonce cookie as
   for Google) and sends the nonce to the frame, which asks the club for a note:
   the player's Google sign-in hash, the nonce and a two-minute expiry, HMAC-signed.
3. `POST /api/auth/club {note}` checks the signature with `CLUB_SSO_SECRET`, the
   expiry, the audience and that the nonce is this browser's and unspent, then
   makes the usual session. An unlinked name claimed in this browser is linked as
   with Google.

Signing out here stops it until the next sign-in in this browser. A club player
with no Google sign-in (a guest, or Apple only) stays signed out here. Without the
secret, `GET /api/auth/session` says `club: false` and nothing is framed.

To turn it on:

- One random secret of at least 32 characters, set twice and never committed:
  `npx wrangler secret put CLUB_SSO_SECRET` here, and `LILGUYS_SSO_SECRET` in the
  dle-club Vercel project (Production). The club's half is a dle-club pull request.
- Add `https://lilguys.dleclub.com` to the Google OAuth client's Authorized
  JavaScript origins, so the Google button keeps working on the new host.

## Finished guys: `/g/`

The Worker serves baked guys and cards at `/g/<art version>/<guy>/<view>`
(README, Finished guys anywhere; `worker/baked.js`), and the standalone element
at `/lil-guy-element.js`. A code's pictures are immutable and kept in
Cloudflare's cache; `@name` redirects to the current code for a minute at a
time. A cache miss renders in plain code (a plain guy in a few milliseconds, a
shimmering card in about 30 to 60): on Workers' free plan, with 10 ms of CPU a
request, larger renders can fail, so the paid plan is assumed. Renders on a
miss count against the address, 3,000 a day, in `claim_limits` (with
`CLAIM_SALT`), so made-up codes can't run up the bill. Before deploying a
change to the art, bump `ART_VERSION` in `src/guy-code.ts`.

Checks: `bun test` (worker/baked.test.ts serves exactly the library's bytes),
`bun run verify:shaders` and `node scripts/verify-site.mjs` (both need a
`bun run showcase` and, for the site check, `bash scripts/build-site.sh`).

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

## Collections and Pulls (migration 0002)

Every copy is rolled and stored by the Worker, so what the Pulls page shows is what
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
  - `GET /api/guys?sort=rarest|recent&q=`: every guy with what it wears and its best copy.
  - `GET /api/guys/:key`: one player's guy and collection.
  - `GET /api/market?grade=&game=&slot=&finish=&key=&sort=rarest|float|newest`: every
    copy from a capsule (starters aside).
  - `GET /api/stats`: claims, copies and counts by grade.
- Releasing a name (`DELETE /api/names/:key`) deletes its player record and copies.
- Nothing is bought or sold. Dev drops (the `rarest` easter egg) only work in the demo.

Validated locally with `wrangler dev --local` and both migrations applied:
- two players claimed, opened free and paid capsules, and collected tickets;
- the Guys, profile and Pulls pages listed both, and a reload restored state from D1;
- `bun test`: 142 pass, including the Worker's ten API tests.

## Luck, name tags, swaps and sets (migrations 0005 and 0006)

Apply both before deploying a Worker that reads them, or capsule opens, tags and
swaps fail. `0005_luck.sql` adds the beginner's-luck and pity counters to
`players`; `0006_tags_swaps.sql` adds `copies.tag` and the `swaps` table.

- `POST /api/me/:key/tag {id, tag}`: a name tag on one of your copies (up to 20
  letters, numbers and simple punctuation; a short word list is refused; `''`
  takes it off). It stays on the copy when it changes hands.
- `POST /api/me/:key/trade {ids}`: the result comes from one of the five inputs'
  machines, each as likely as its share of the five, and its float is the
  inputs' average place in their finishes placed in the result's finish
  (`tradeFloat`). Usually the next grade, one in five a dud, one in twenty two up.
- `POST /api/me/:key/swap {to, give, want|null}`: offer one of your copies for one
  of theirs, or as a gift (`want: null`). Starters, the founder's copies and worn
  copies can't be offered. At most 10 open offers each.
- `POST /api/me/:key/swap-accept {id}`: only the player it was made to. Both copies
  move in one transaction, and only if both are still where the offer found them
  and unworn; otherwise the offer lapses (409). Other offers for either copy lapse.
- `POST /api/me/:key/swap-cancel {id}`: the maker takes it back, the other side
  turns it down.
- `GET /api/me/:key/state` lists open offers both ways; every copy carries its tag.
- Sets (every item a machine gives, in any finish) are worked out from a
  collection on the page (`setProgress`); nothing is stored.

## Google sign-in (migration 0003)

The live promo supports Google sign-in using Google Identity Services, as the club does.
These are separate Lil Guys accounts: this does not merge Club scores or collections.
The default OAuth client is DLE Club Web's public client ID. `https://lilguys.isaac-audet.workers.dev` was added to that client's **Authorized JavaScript origins**
in Google Cloud Console on October 24, 2026 (Pacific), then read back after saving. No redirect URI or client secret is needed for this popup flow.
A separate web client can be selected with the Worker variable `GOOGLE_CLIENT_ID`.
For local Google acceptance, authorize the exact localhost origin too.

Apply `0003_google_accounts.sql` before deploying this Worker. It adds a nullable,
unique account hash to existing names and creates session and sign-in nonce tables.
Existing claims, seeds, tickets, copies and looks are preserved.

- Existing owners: use the browser that holds the claim token, then choose **Continue
  with Google**. The server verifies both Google and the existing claim token before
  linking. Once linked, the old claim token no longer grants access.
- New owners: sign in before claiming, or claim first and link afterward.
- Another device: use the same Google account to restore the same name and collection
  from D1. One Google account keeps one name. Conflicting names are never merged or
  transferred automatically; the page offers an explicit switch to the saved name and
  keeps the unlinked claim on the original device until sign-out restores it.
- Sign out revokes this device's session. Other signed-in devices keep theirs. Sessions
  last 30 days, with at most twelve active sessions per account.
- Unlinked claims still depend on their browser token. Clearing that browser before
  linking loses control of the name. The collection remains on the server.
- The founder reservation is unchanged: Google sign-in alone cannot claim `isaac`.

The Worker verifies Google's RS256 signature, issuer, audience, expiration, issue time
and a browser-bound, ten-minute, single-use nonce. Session tokens are random, kept in
Secure/HttpOnly/SameSite cookies and stored only as hashes. Only `sha256("google:<sub>")`
is persisted for the Google account; no email, name, picture or Google token is stored.
Auth writes require the exact same origin and have a salted daily IP limit separate
from claims. Public reads never include account hashes or authentication credentials.

Endpoints: `GET /api/auth/session`, `POST /api/auth/start`, `POST /api/auth/google`
(`credential`, optional existing `key` and `ownerToken`), `POST /api/auth/logout`.
Owner endpoints accept the session cookie; browser tokens work only for unlinked names.
Releasing a name removes its collection and account link in one D1 transaction. The
account can then claim a new name. Claude artifact sessions keep their existing
artifact database path and never load Google sign-in.

Local validation: 19 Worker tests pass (including nine account/security tests). They
verify real locally signed JWTs, existing-owner linking, second-device restoration,
nonce replay/expiry, account conflicts, session expiry/logout, founder reservation,
public-response privacy, origin rejection and preserved collections. The local browser fixture also passed claim/link/reload/sign-out/sign-in with the same
name and nine copies restored. The full library suite has 150 passes and one pre-existing
golden-art snapshot failure. A single low-effort Codex autoreview was attempted with
web search off; its installed CLI binary is missing, so direct inspection and focused
validation were used. Wrangler deploy dry-run passes. Real Google browser acceptance
is recorded separately after deployment.

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

## Face parts from capsules (migration 0007)

One capsule in four (`PART_ODDS`) also unlocks a rare face part (eyes, mouth,
cheeks, topper, markings or accessory: the parts the look picker locks), kept in
`parts` as a code like `e12`. A part the player already has (dealt or earned)
pays `PART_REFUND` tickets back while tickets are on. `POST /api/me/:key/open`
returns it as `part: { code, new, refund }`, `GET …/state` lists `parts`, and
`…/look` accepts earned parts. A guy's rarity (`guy_one_in`) is the deal's: a
look, earned parts and all, never changes it.

Until 0007 is applied the Worker gives no parts and everything else works, so
the migration can go before or after the deploy.
