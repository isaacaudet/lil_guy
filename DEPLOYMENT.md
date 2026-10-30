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
npx wrangler d1 migrations apply lilguys-names --remote   # through 0014_names_seed
npx wrangler deploy
```

`site/` is ignored. The root page uses `/lil-guy.js`; the showcase pages
keep their relative `../lil-guy.js` reference. Static requests go directly to
Cloudflare assets. The Worker script runs for `/api/*` to provide shared claims,
for `/g/*` and the kit, and for the share links `/u/*` and `/p/*` (`run_worker_first`).

The D1 database is dedicated to this promo. Two Worker secrets must be set:
`CLAIM_SALT` (a random private salt) and `FOUNDER_SECRET` (the private founder
reservation key). Neither belongs in this repository. Local testing uses an
ignored `.dev.vars` file. Production secrets were uploaded with Wrangler.

## Going live with stamps (Isaac's steps, in this order)

Automatic deploys (AUTOMATIC-DEPLOYS.md) ship the Worker but never run migrations
or set secrets. Until these are done, paid and mystery capsules answer 503 and the
free capsule is open to every name.

1. Apply 0010: `npx wrangler d1 migrations apply lilguys-names --remote`.
   Check: `npx wrangler d1 migrations list lilguys-names --remote` shows nothing
   pending, and a signed-in player's `GET /api/me/<key>/state` has `stamps.ready: true`.
2. Then the shared secret (below, DLE Club sign-in): one random value of at least 32
   characters, as `CLUB_SSO_SECRET` here (`npx wrangler secret put CLUB_SSO_SECRET`)
   and as `LILGUYS_SSO_SECRET` in dle-club's Vercel project (Production).
   Check: `GET /api/auth/session` returns `club: true`.
3. Add `https://lilguys.dleclub.com` to the Google OAuth client's Authorized
   JavaScript origins. Check: Google sign-in works on lilguys.dleclub.com.
4. Optional: turn on Workers Logs with invocation logs off (request URLs carry names).
   The Worker logs only a failure's route (names as `:key`) and message, and the
   club's HTTP status when it isn't 200, so a wrong secret shows as a 401 there.

## Going live with the Top 100, copy histories and shelves (Isaac's steps, in this order)

Automatic deploys ship the Worker but never run migrations. Every new read works before its
migration (below), so the deploy can come first; the migrations are best applied before it.

1. Note the time in UTC (`date -u +%FT%H:%M`), then apply 0011, 0012 and 0013:
   `npx wrangler d1 migrations apply lilguys-names --remote`.
   Check: `npx wrangler d1 migrations list lilguys-names --remote` shows nothing pending, and
   `npx wrangler d1 execute lilguys-names --remote --command "SELECT COUNT(*) AS missing FROM copies c WHERE c.at < '<that time>' AND NOT EXISTS (SELECT 1 FROM copy_owners o WHERE o.copy_id = c.id)"`
   says 0 (0011 gives every copy made before it its first owner). Don't compare the totals: a
   starter or the founder's own copy never gets a row (they never change hands, so their holder is
   their history), nor does a copy the old Worker makes before the deploy, until it first moves.
2. Deploy (or let the merge deploy). Check, with any claimed name:
   - `curl -s https://lilguys.dleclub.com/u/isaac | grep og:image` prints a
     `/g/<version>/…/card-full-still@4.png` address, and that address is a 560 × 816 PNG.
     Pasting `https://lilguys.dleclub.com/u/isaac` in Discord shows the founder's card.
   - `GET /api/top?kind=guys` and `GET /api/top?kind=copies` answer 100 places (or every claimed
     guy and listed copy, if fewer). Each read while the boards are new also writes back a few
     hundred ranks; after a few minutes of reads,
     `SELECT COUNT(*) FROM players p JOIN names n ON n.key = p.key WHERE p.top_seed <> n.seed`
     is 0, or only the names claimed or picked since the last read.
   - `GET /api/guys/<name>` carries `pins: []`.
3. Nothing else: no secret, no variable.

## Going live with earned emotes (Isaac's step)

1. Apply 0014 (one index, `names_seed`): `npx wrangler d1 migrations apply lilguys-names --remote`.
   It can come before or after the deploy: without it the Worker gives the same answers, reading
   all of `names` to find a code's guy. Check: `npx wrangler d1 migrations list lilguys-names --remote`
   shows nothing pending, and `curl -sI https://lilguys.dleclub.com/g/latest/@isaac/emote-galaxybrain.png`
   is a 302 while `…/@<a name with no Mythic, aura or night part>/emote-galaxybrain.png` is a 404.

## The Top 100, copy histories and shelves (migrations 0011 to 0013)

Public reads, cached a minute at the edge (the query is cut down to the parameters each reads,
so made-up parameters always hit the cache):

- `GET /api/top?kind=guys`: `{ guys: [{ place, key, seed, look, top, since }] }`, the 100 rarest
  claimed guys by `guyRank` (the deal's rank, never a picked look's; `top` its share, 0 to 1).
  The founder's guy is first, as on every list (its `top` is 0); a tie goes to the earlier claim.
  `since` is when a guy took its place: the latest claim among it and everyone above it. A name
  let go above it isn't seen, so after one a guy has really held its place a little less long.
- `GET /api/top?kind=copies`: `{ copies: [{ place, id, key, code, no, at }] }`, the 100 rarest
  copies anyone holds, by what the eye can see (`visibleOneIn`: item, finish, famous print,
  effect and aura, not float), the cleaner float then the earlier pull on a tie. `no` is its
  number in its item's run (`copies.pull`), null for one with none. Never a starter, never a copy
  the founder still holds (as on the Pulls page); one he gave away is listed.
- `GET /api/top?kind=place&key=<name>`: `{ place, of }`, one claimed guy's place in the guys
  board's order over every claimed guy (the founder first, then by rank, the earlier claim on a
  tie), out of how many are claimed; 404 for a name nobody holds. Counted in D1 from the kept
  ranks (`players_top`); only guys claimed since the board last kept them are worked out on the
  read, and only the board writes ranks back. Before 0013 every guy is worked out on each read.
- `GET /api/pulls/rarest?days=7&limit=12`: `{ pulls: [{ id, key, code, no, at, seed, look }] }`,
  the rarest copies capsules gave in the last `days` (1 to 30), rarest first as above: capsules,
  mystery capsules, today's free one and seasonals, never a crafted copy, a starter or one the
  founder holds. `key` is who holds it now, `seed` and `look` their guy. `limit` is 1 to 100.
- `GET /api/copies/<id>`: `{ copy, owners: [{ key, at, how }] }`, the copy as the profile lists it
  and its owners in turn, first first. `how` is `pulled`, `daily`, `mystery`, `season`, `swapped`,
  `gift` or `crafted`. Names and moments only.
- `GET /u/<name>` and `GET /p/<copy id>`: the site's page, unchanged but for og: and twitter: tags
  in its head (`worker/share.js`), so a shared link shows the guy's big card
  (`card-full-still@4.png`, the name on it), its rank and its standout trait, or the copy on its
  holder's card in its slot, its grade and number, and who pulled it. A name nobody holds or a
  copy that's gone is the plain page with a 404; if D1 fails, the plain page. Cached a minute.

A guy's rank and a copy's visible odds are worked out by the library (a rank takes about a third
of a millisecond), so 0013 keeps each in a column once worked out (`players.guy_top`,
`copies.seen_in`), for the database to sort by. Each board read works out what isn't kept yet (new
claims and pulls) and writes back up to 200 ranks and 500 copies' odds. A place or a Pulls page
that finds some not kept asks for that board after answering, at most once a minute per Worker
instance, so a backlog clears without anyone opening the boards; neither writes anything itself. `top_rule` and
`seen_rule` say which rules worked a figure out: a hash of the library's figures for a set of
probes that between them take in every part, item, finish, aura, effect and famous print, every
step of the rank table, the chase parts and past the table's end (`guyProbes`, `copyProbes`;
about 40 ms once per Worker instance). So when an update changes the ranks or the odds anywhere,
the kept figures are worked out again over the next reads, and the boards are right meanwhile.
`top_seed` is the seed a rank was worked out for, so a pick in a new name's first hour is ranked
again. Before 0013, every read works the boards out in full and writes nothing.

Copy histories (0011, `copy_owners`): a capsule, today's free capsule, a mystery or seasonal
capsule and a craft keep the copy's first owner as it's made; an accepted swap or gift keeps who
each copy went to, in the same transaction as the move (a copy with nothing kept yet gets its
first owner as it stood). 0011 gives every copy there is its first owner (whoever gave it in its
first finished swap, else its holder, from when it was made) and each finished swap and gift (as
of when it was offered). Starters, the founder's flag and Origin never move, so they keep one owner.
Letting a name go or smelting a copy takes its owners with it. Before 0011, a copy's owners are
its holder since it was made, and swaps go on as ever.

Shelves (0012, `players.pins`): `POST /api/me/:key/pin {ids}` pins up to three of your own copies
in that order (`[]` takes them down; 400 for more than three, 404 for one that isn't yours). The
profile (`GET /api/guys/:key`) and `GET …/state` carry `pins`, the ids still yours. Changes are
capped at 200 a day from one address (`claim_limits`, as renders are). Before 0012, pinning
answers 503 (`Pins aren’t open yet`) and `pins` is `[]`.

The founder's capsules all say `luck: 'founder'` (`open` and `season`) unless he rolls at fair
odds (`fair: true`).

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

To turn it on, steps 2 and 3 of Going live with stamps, above. The secret is never committed.

## Finished guys: `/g/`

The Worker serves baked guys and cards at `/g/<art version>/<guy>/<view>`
(GAMES.md has every view; `worker/baked.js`), the standalone element at
`/lil-guy-element.js`, and the games' kit at `/lilguys.js`, `/lilguys.mjs`,
`/lilguys-stadium.js` and `/lilguys-stadium.mjs` (through the Worker,
`run_worker_first`, for CORS and a five-minute cache). A
code's pictures are immutable and kept in Cloudflare's cache; `@name` and
`~name` redirect to the current code for a minute at a time (each Worker
remembers a name for that minute, so a board's redirects ask D1 once), and
`/g/latest/` redirects to the current version for five minutes.
`GET /api/club/batch?names=` answers up to 100 names, cached a minute.

A cache miss renders in plain code. CPU on a miss, measured warm in Bun on a
plain guy, a shining one and one with an aura (the Worker's V8 is about the
same; a cold isolate adds to the first): `icon`/`face` 8 to 55 ms, a move 8 to
55 ms, `still` and `pfp` 7 to 45 ms, `card` 2 to 30 ms, `art` 25 to 60 ms
(plus 15 to 60 ms to encode), and `card-full` 100 to 190 ms with its encoding,
the one view over 50 ms; `card-full-still` is 20 to 40 ms. On Workers' free
plan, with 10 ms of CPU a request, larger renders can fail, so the paid plan is
assumed. Renders on a miss count against the address, 3,000 a day, and batch
reads that miss the cache 2,000 a day, in `claim_limits` (with `CLAIM_SALT`),
so made-up codes can't run up the bill. No migration is needed. Before
deploying a change to the art, bump `ART_VERSION` in `src/guy-code.ts`.

Galaxybrain (`emote-galaxybrain`, `-still`, its sheets) is drawn only for a claimed guy whose
player has earned it (`worker/emotes.js`): by name, or by any code whose seed is that guy's
(found with 0014's `names_seed`). Anyone else's, a chatter's dealt from their name or a code
nobody claimed, is a 404 (`Not earned`, never cached); the answer is kept a minute per Worker.
It's asked before the cache, so one let go stops being served there.

Checks: `bun test` (worker/baked.test.ts serves exactly the library's bytes;
`bun test worker` is the Worker's own tests),
`bun run verify:shaders` and `node scripts/verify-site.mjs` (both need a
`bun run showcase` and, for the site check, `bash scripts/build-site.sh`).

## Name claims

- `POST /api/names/:key`: atomically claims a handle of 2–16 lowercase letters
  and digits, with single underscores between them (`NAME_KEY`; a name whose
  skeleton, its underscores taken out, is already held is taken). Returns its
  generated seed and a random owner token. Conflicts return 409. No
  client-supplied seed or owner is accepted.
- Names show on public pages: one holding a word from the tags' blocked list
  whole, or at the start of a word, is refused (403), so `grape` passes
  (`nameRefused` in `worker/name-lookup.js`).
- `GET /api/names/:key` and `GET /api/names?recent=12`: return public
  handle, seed and timestamp only.
- `DELETE /api/names/:key`: the owner's session, or `Authorization: Bearer <owner
  token>` for an unlinked name. With `X-Founder-Secret` it takes any name down,
  in the same release.
- `isaac` requires `X-Founder-Secret` matching the server secret. It stays
  reserved even before being claimed; the regular public form cannot claim it.
  Every other name starting with `isaac`, and `dleclub`, `lilguys` and `founder`,
  are reserved, read with digits as letters (`1saac`, `l1lguys`).
- Claims permit ten attempts per IP per UTC day, including conflicts. Only a
  secret-salted daily digest is retained in D1. Old digest rows are removed on
  the next accepted claim attempt. Owner tokens are hashed before storage.

## Collections and Pulls (migration 0002)

Every copy is rolled and stored by the Worker, so what the Pulls page shows is what
capsules really gave. Apply `migrations/0002_collections.sql` (the deploy commands
above apply every pending migration) before deploying a Worker that reads it.

- A claim deals three guys (`choices` in the answer, a keyed hash of the name and the moment, so
  nothing new is stored) and holds the first; `POST /api/me/<key>/pick {seed}` keeps another of the
  three, within the hour and before any capsule. The founder's is picked by hand.
- A claim (`POST /api/names/<key> {game?}`) creates the player record and one starter,
  worn: the free item of the game they came from, else today's machine. Each machine
  gives its own free item with the first capsule opened from it (`starter` in the open
  answer). Players from before keep the starters they were given. The founder also gets
  the one-of-one Gold flag and Origin. Capsules are paid in stamps (migration 0010, below).
- Owner-only (the owner's session, or `Authorization: Bearer <owner token>` for an unlinked name; same-origin writes):
  - `GET /api/me/:key/state`: stamps, today's free day, the look and every copy, and
    `pick: { choices, until }` while the pick is open (else null), so any device can offer it.
  - `POST /api/me/:key/open {game, free}` or `{mystery: true}`: one capsule, rolled on the
    server from a random seed. Today's machine is free once a UTC day for a player who has
    finished a DLE Club game that day (below); otherwise 8 stamps for a picked machine, or 5 for
    a mystery capsule from a machine the server draws. 402 when short.
  - `POST /api/me/:key/season`: the seasonal hat, 8 stamps, only while one is in season.
  - `POST /api/me/:key/wear {slot, id|null}`: only your own copy, for its own slot.
  - `POST /api/me/:key/look {look}`: only parts `decodeLook` allows for your dealt guy.
- Public, never with owner tokens:
  - `GET /api/guys?sort=rarest|recent&q=`: every guy with what it wears and its best copy.
  - `GET /api/guys/:key`: one player's guy and collection, the copies pinned on their shelf (`pins`),
    and the chat emotes it may use (`emotes`, ids from `EMOTE_SET`): all but Galaxybrain until the
    player holds a Mythic or better copy, an aura, or a night set part (eclipse or void eyes, the
    idea or thought topper, op art; `worker/emotes.js`). Hype and Gg (fire, crown) are everyone's.
  - `POST /api/club/guys {a, t}`: for dleclub.com only, signed with `CLUB_SSO_SECRET` (`X-Club-Signature`, HMAC-SHA256 of `guys.<t>.<a joined by commas>`, at most five minutes old): each linked Google sign-in's name, his parts as drawn and the codes of the copies he has on, so the club draws him as he is here.
  - `GET /api/club/named?n=<names>`: public, any origin, cached a minute: up to 100 claimed names' parts as drawn and the codes of the copies each has on, so Twitch chat in the club's gauntlet, parties, Amountle and Weighsies draws a chatter with a name here as he is here.
  - `GET /api/market?grade=&game=&slot=&finish=&key=&sort=rarest|float|newest`: every
    copy from a capsule (starters aside). Rarest is what the eye can see (`visibleOneIn`, as the
    copies board ranks them: the cleaner float, then the earlier pull, on a tie), sorted in D1 by
    the odds 0013 keeps, with up to 1,000 not kept yet worked out on the read. Past that (after
    the rules change, or before 0013 on a bigger collection) it lists by the odds each copy was
    pulled with (`one_in`) until the copies board catches up. The founder's one-of-ones lead his
    own page. `grade` is 0 to 5 (5, auras).
  - `GET /api/stats`: claims, copies and counts by grade.
- Releasing a name (`DELETE /api/names/:key`) deletes, in one transaction, its player
  record, copies, face parts and those copies' card stats, and lapses its open offers
  both ways, so whoever claims it next starts fresh. A Google account keeps its stamps
  (below); a name with no sign-in loses its own.
- Nothing is bought or sold. Dev drops (the `rarest` easter egg) only work in the demo.

## Luck, name tags, swaps and sets (migrations 0005 and 0006)

Apply both before deploying a Worker that reads them, or capsule opens, tags and
swaps fail. `0005_luck.sql` adds the beginner's-luck and pity counters to
`players`; `0006_tags_swaps.sql` adds `copies.tag` and the `swaps` table.

- `POST /api/me/:key/tag {id, tag}`: a name tag on one of your copies (up to 20
  letters, numbers and simple punctuation; a short word list is refused; `''`
  takes it off). It stays on the copy when it changes hands.
- `POST /api/me/:key/trade`: answers 410, "Trade-ups are gone. Smelt copies into metal and craft
  what you want." (29 October 2026). Copies a trade-up made (`source = 'trade'`) stay, and wear,
  swap and smelt like any other.
- `POST /api/me/:key/swap {to, give, want|null}`: offer one of your copies for one
  of theirs, or as a gift (`want: null`). Starters, the founder's copies and worn
  copies can't be offered. At most 10 open offers each. Only a name with a Google
  sign-in can offer, or accept an offer that asks for one of its copies (403
  otherwise), and not while its stamps are below zero (a name linked after spending
  its own starter brings those spends with it); before 0010, a name with no sign-in
  must be a week old.
- Painting a copy a new paint, or giving it a new tag, lapses its open offers both ways.
- `POST /api/me/:key/swap-accept {id}`: only the player it was made to. Both copies
  move in one transaction, and only if both are still where the offer found them, the
  one offered still unworn; otherwise the offer lapses (409). The copy asked for may be
  one the accepter has on (an offer is often for what a player shows on their guy): it
  comes off them as it moves, its days worn banked. Other offers for either copy lapse.
- `POST /api/me/:key/swap-cancel {id}`: the maker takes it back, the other side
  turns it down.
- `GET /api/me/:key/state` lists open offers both ways; every copy carries its tag.
- Sets (every item a machine gives, in any finish) are worked out from a
  collection on the page (`setProgress`); nothing is stored.

## Google sign-in (migration 0003)

The live promo supports Google sign-in using Google Identity Services, as the club does.
A Google account here is the same one as on DLE Club (DLE Club sign-in, above); the
collection stays here and club scores stay on the club.
The default OAuth client is DLE Club Web's public client ID. `https://lilguys.isaac-audet.workers.dev` was added to that client's **Authorized JavaScript origins**
in Google Cloud Console on October 24, 2026 (Pacific), then read back after saving. No redirect URI or client secret is needed for this popup flow.
A separate web client can be selected with the Worker variable `GOOGLE_CLIENT_ID`.
For local Google acceptance, authorize the exact localhost origin too.

Apply `0003_google_accounts.sql` before deploying this Worker. It adds a nullable,
unique account hash to existing names and creates session and sign-in nonce tables.
Existing claims, seeds, copies and looks are preserved.

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

The account tests (`worker/auth.test.ts`) cover locally signed JWTs, existing-owner
linking (underscore names too), second-device restoration, nonce replay and expiry,
account conflicts, session expiry and logout, founder reservation, public-response
privacy and origin rejection. Run them with the rest (Checks, under Finished guys).

## Face parts from capsules (migration 0007)

One capsule in four (`PART_ODDS`) also unlocks a rare face part (eyes, mouth,
cheeks, topper, markings or accessory: the parts the look picker locks), kept in
`parts` as a code like `e12`. A capsule only unlocks parts the player hasn't got.
`POST /api/me/:key/open` returns it as `part: { code, new }`, `GET …/state` lists `parts`, and
`…/look` accepts earned parts. A guy's rarity (`guy_one_in`) is the deal's: a
look, earned parts and all, never changes it.

Until 0007 is applied the Worker gives no parts and everything else works, so
the migration can go before or after the deploy.

## Crafting, as in TF2 (migration 0008)

`players.metal` (in scrap) and a `counters` table. `POST /api/me/:key/smelt
{ ids }` melts spare copies into metal (`smeltValue`: Everyday 1, Special 2,
Prized 4, Mythic 9; never a starter, showpiece, Grail, aura, worn copy or one in
an open swap), `…/craft { item }` spends `CRAFT_COST` (a refined) on that item,
numbered by the `craft` counter, and `…/paint { id, paint }` paints a hat or a
buddy for `PAINT_COST` (a reclaimed); `paint: null` scrapes it off for free. Paints of
the month (`paintMonth` in `src/paints.ts`, two a month) are on sale only in their month,
for `LIMITED_PAINT_COST` (two refined), the metal sink; a copy painted then keeps it.
`GET …/state` includes `metal`. Until 0008 is applied these answer 503 and
nothing else changes.

## Card stats (migration 0009)

Each copy counts the days it's worn (`worn_since`, `worn_days`, `worn_last` on
`copies`; a stint is banked when it comes off) and, while worn, its owner's DLE
Club days (`copy_days`: games finished and the day's club score). On a state read
or a wear, at most every ten minutes (`players.club_read`), the Worker asks
`https://dleclub.com/api/club/lilguys-stats` for the name's Google sign-in's days,
signed with `CLUB_SSO_SECRET` (dle-club's `LILGUYS_SSO_SECRET`, the same value).
`CLUB_STATS` overrides that URL. The club side ships in dle-club's lil guys
sign-in PR. Copies carry `stats: { worn, games, best }` in `GET …/state` and
`GET /api/guys/:key`, and a Strange copy's tally becomes the days its owner
finished club games in it. Names without a Google sign-in count days worn only.
0009 also numbers each copy in its item's run (`copies.pull`, counted by
`counters` row `pull:<item>`; copies made before it are numbered in the order
they were made): the first 100 of an item are its 1st edition, and copies carry
`pull` in the same reads. Starters and the founder's copies have none.
Before 0009 is applied, there are no stats and nothing else changes.

## Stamps (migration 0010)

Stamps are the only currency; tickets are gone (the old `players.tickets` and
`checkin_day` columns stay but are no longer read). A player gets a stamp for each DLE Club game
they finish in a day (the gauntlet's five and its extras, eight at most), two gold
stamps on a day all five are finished, and ten to start (`STARTER_STAMPS` in
`worker/stamps.js`). Days count from `STAMPS_FROM` (2026-10-29). A mystery capsule
costs 5 and comes from a machine drawn by `mysteryMachine` (each as likely as its
share of every capsule pool), then rolls as that machine's capsule, luck and pity
included; a picked machine costs 8, a seasonal 8. The founder's stamps never run out.

The card stats' read of `lilguys-stats` (above) keeps each day in `club_days`
(`played`, `n`, `cleared`), from `STAMPS_FROM` and then two days back from the last
answered read (`players.stamps_read`). A day only ever gains stamps. The ten to start
(`+10`, `starter`) and every spend (negative) are rows in `stamp_ledger`; a spend is one
guarded insert that only goes in while the balance covers it, so two at once never take
the same stamps.

Stamps belong to a holder: a name's Google sign-in (its account hash) when it has one,
else the name. Letting a name go and claiming another with the same Google account keeps
the balance, spends and the one starter, and the account's capsule luck (beginner's
luck, pity) and today's free capsule carry over (`account_luck`, written as it lets a
name go; its capsule count adds to the new name's own in the roll, so the new name's
keep-one pick stays open until its own first capsule): nothing is paid out twice. A name with no sign-in keeps its stamps to itself
and loses them when let go. Linking a name to Google moves its spends to the account,
and its starter only if the account has none.
`GET …/state` carries `stamps: { ready, balance, unlimited, linked, carried, games,
gold, other, earned, spent, starter, from, cost }`: `games` counts each game's stamps
(the club's `slicies` is Cutsies), `other` those from a club that only sent a count.

The club sends `played` and `cleared` for each day (dle-club's `lilguys-stats`, on its
`main`). A day from a club that only sends `games` gives a stamp for each game counted,
eight at most, and no gold. A name without a Google sign-in only has its ten; the page
says to sign in to DLE Club and play.

Players who claimed before stamps (`carried`) keep every copy, part, bit of metal and
luck counter; their tickets are gone and they get the same ten as a new player, once,
on their first load after 0010 (`giveStarter`, guarded in the insert and by the unique
index `stamp_ledger_starter`). Club games before `STAMPS_FROM` are not backdated. The
page tells them once: “Tickets are now stamps. Play DLE Club games to earn more.”
(dismissed in `localStorage` as `lil-guys-stamps-note`).

Before 0010 is applied: `stamps.ready` is false, the page shows no balance, paid
and mystery capsules answer 503 (`Stamps aren’t open yet`), the free capsule stays
open to everyone (no club days are kept, so the rule can't be checked), and crafting,
swaps and card stats carry on.

## Today's free capsule

Today's machine gives one free capsule a UTC day, to a player who has finished at
least one DLE Club game that day: a `club_days` row for today with `n > 0`, from the
same read of the club as stamps and card stats (`readClub`). Before deciding, a player
who hasn't played yet is read again, at most a minute apart (`TODAY_EVERY`, against
the usual ten minutes), so a game just finished counts. A name without a DLE Club
(Google) sign-in can't be read, so it can't qualify; the founder's is always open.
`GET …/state` carries `freeCapsule: { open, why }`; `open {free: true}` answers 403
with the same `why` while it's shut ("Finish a DLE Club game today to open it.", or
"Sign in to DLE Club and finish a game today to open it.") and takes nothing. The page
shows the button locked with that line and asks again when it's tapped.

The rule only shuts the capsule when it can be checked. Before 0010, without
`CLUB_SSO_SECRET` (DLE Club sign-in, above), or when the club didn't answer the last
time it was asked (dle-club's `lilguys-stats` not deployed yet, or down), the free
capsule stays open to every name, signed in or not, as it was before the rule.
