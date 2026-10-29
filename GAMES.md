# Lil guys in a DLE Club game

Any player's lil guy, in any game, from one address or one line of script. The lil guys Worker at
`https://lilguys.dleclub.com` draws every guy finished (his move, the copies he wears and their
finishes, his aura, his buddy) and serves him as an image cached for good. A claimed name shows as
it's worn; any other name shows the guy it deals. Try every format live on
[the formats page](https://lilguys.dleclub.com/showcase/formats.html).

```html
<img src="https://lilguys.dleclub.com/g/latest/~mia/face.png" width="42" height="42" alt="mia"
     loading="lazy" decoding="async" style="image-rendering:pixelated">
```

## Where it goes

| Where in your game | View | Size at 1× | Shown at | Moves? | Address |
| --- | --- | --- | --- | --- | --- |
| A menu, a nav bar | `icon` | 16 × 16 | 32 px (2×) | yes | `/g/latest/~mia/icon.png` |
| A chat line, a party chip | `face` | 14 × 14 | 28 px (2×) | yes | `/g/latest/~mia/face.png` |
| A leaderboard row | `face` | 14 × 14 | 42 px (3×) | yes | `/g/latest/~mia/face.png` |
| A dense list that shouldn't move | `face-still`, `icon-still` | 14 × 14, 16 × 16 | any | no | `/g/latest/~mia/face-still.png` |
| Results, a lobby | `idle` (or any move) | 22 × 20, 34 × 20 with a buddy | 80 px tall (4×) | yes | `/g/latest/~mia/idle.png` |
| A profile, a round crop | `pfp` | square, 20 to 34 | a 96 px square | yes | `/g/latest/~mia/pfp.png` |
| Discord's profile picture | `pfp-still` | square, 20 to 34 | about 512 px | no | `/g/latest/~mia/pfp-still@16.png` |
| A card in a list, a locker | `card` | 26 × 42 | 78 × 126 (3×) | when it shimmers | `/g/latest/~mia/card.png` |
| A header, a square share picture | `art` | 128 × 128 | 1× or 2× | yes | `/g/latest/~mia/art.png` |
| A player page, a share | `card-full` | 140 × 204 | 280 × 408 (2×) | yes | `/g/latest/~mia/card-full.png` |

The kit's presets are the same places by name: `menu`, `chat`, `row`, `results`, `profile`, `card`,
`card-full` (`LIL_GUY_PRESETS`).

## Every view

`/g/<version>/<guy>/<view><@scale>.<format>`

| View | Size at 1× | Moves | What it is |
| --- | --- | --- | --- |
| `icon` | 16 × 16 | yes | His own sixteen by sixteen: no buddy, no backdrop, nothing round him but the aura cells inside it. Blinks, breathes and shines, always on the ground (a move's hops are taken out). |
| `face` | 14 × 14 | yes | His head and shoulders, hat and all, the same way. |
| `idle`, `hop`, `wave`, `look`, `cheer`, `sad`, `dance`, `squish`, `sleep`, `shy`, `huff`, `oops`, `blink` | 22 × 20, or 34 × 20 with a buddy | yes | Him playing a move with everything he wears, room for an aura either side. |
| `still` | 22 × 20, or 34 × 20 | no | His first idle frame. |
| `pfp` | square, 20 to 34 | yes | A profile picture on a ground of his own colour (or his backdrop), with room so a round crop never cuts him. |
| `card` | 26 × 42 | when it shimmers | The small card face, his buddy peeking. |
| `art` | 128 × 128 | yes | His big card's window alone. |
| `card-full` | 140 × 204 | yes | His whole big card: his name, rank and rarest trait, its edition's sheen. In 255 colours, six frames a second. |

Every view but a move also comes as `-still`: its first frame (`icon-still`, `face-still`,
`pfp-still`, `card-still`, `art-still`, `card-full-still`).

| Format | What you get |
| --- | --- |
| `.png` | An animated PNG when the view moves, a plain PNG when it doesn't. Plays in any `<img>`. |
| `.gif` | The same frames as a looping GIF, for Discord, Twitch extensions and engines without APNG. |
| `.sheet.png` | Every frame in one image, left to right, for a canvas or an engine. |
| `.sheet.json` | The sheet's layout and each frame's time: `{ image, frameWidth, frameHeight, frames, columns, rows, delays }`. |
| `@2` to `@16` | Every pixel scaled up by whole pixels, before the extension: `face@3.png`, `idle.sheet@2.json`. |

A move's sheet is one strip, all its frames in a row. Any other view's sheet wraps at 2048 pixels
at 1×, `columns` frames to a row; read `columns` rather than assuming a strip.

## Who

| `<guy>` | Who | Cached |
| --- | --- | --- |
| `~name` | Any player's name, URL-encoded, 1 to 40 characters, no comma or slash: a claimed name redirects as `@name` does; anyone else is the guy their name deals, seeded on it lowercased. | redirect, a minute |
| `@name` | A claimed name only, as it's worn now; 404 for a name nobody holds. | redirect, a minute |
| a guy code | An exact guy (`guyCode({ seed, parts, palette, equip })`), as the batch read gives it. | for good |

Use `~name` everywhere a player has a name: guests, unclaimed club names and Twitch chatters get the
guy their name deals, and the day they claim it on lilguys.dleclub.com they show as they've worn
it, with nothing to change in the game. The dealt guy is the one Amountle's chat already draws for
a chatter (`chatterFace` seeds on the name lowercased): same parts and palette. Amountle's own
chat also dresses each chatter in a rolled chat copy; to show that shining guy elsewhere, pass his
code (`guyCode({ seed, equip })`) instead of `~name`.

A big card shows a name: `~name/card-full.png` writes `@name` on a claimed guy's card and the name as
asked on anyone else's. A code's card shows the code's `title` (`guyCode({ ...spec, title })`),
blank without one.

## Versions and caching

| Address | Cache |
| --- | --- |
| `/g/14/<code>/…` | `public, max-age=31536000, immutable` at the edge and in the browser. A code's picture never changes for an art version. |
| `/g/14/~name/…`, `/g/14/@name/…` | `302` to the code's address, `max-age=60`: what he wears shows within a minute. |
| `/g/latest/…` | `302` to the current art version, `max-age=300`; a name goes straight to its code in one hop (`max-age=60`). |
| `/g/<old version>/…` | `301` to the current version, a day. |

Never hard-code an art version in a game: use `/g/latest/`, or the kit, whose `lilGuyUrl` and batch
read always name the version the Worker serves. A redraw of the art bumps the version, and every
address under `latest` shows it within five minutes.

Ask for `@1` and scale it up in CSS with `image-rendering: pixelated`. At any whole-number size it is
exactly as sharp as a pre-scaled picture, a fraction of the bytes, and a sixteenth of the pixels to
decode at 4×. Use `@2` to `@16` only where CSS doesn't reach: Discord, email, a native image view.

## One read for a whole board

`GET /api/club/batch?names=mia,theo,Sneaky%20Gumdrop` (or `n=`), 1 to 100 names, comma separated:

```json
{
  "version": 13,
  "base": "https://lilguys.dleclub.com/g/14/",
  "guys": {
    "mia": { "claimed": true, "name": "@mia", "code": "eyJzIjoi…", "founder": false, "wide": false,
             "urls": { "icon": "…/icon.png", "face": "…/face.png", "idle": "…", "still": "…", "pfp": "…", "card": "…", "cardFull": "…" } },
    "sneaky gumdrop": { "claimed": false, "name": "sneaky gumdrop", "code": "eyJzIjoic25lYWt5IGd1bWRyb3AifQ", … }
  }
}
```

Each name is answered lowercased. `code` is his guy as worn now, so `urls` point straight at the
immutable pictures (no redirect per row). `wide` says his moves are 34 wide (a buddy beside him).
`founder` marks the founder. Cached a minute at the edge and in the browser, CORS open to any page.
`/api/club/named?n=` (claimed names' parts and worn copies, for games that draw guys themselves with
the library) is unchanged.

## The kit

`https://lilguys.dleclub.com/lilguys.js` (a classic script, `window.LilGuys`) and `/lilguys.mjs` (a
module), 3.4 KB gzipped, no dependencies; the same functions are exported from the `lil_guy` library.
Loading either also defines `<lil-guy>`.

```js
LilGuys.lilGuyUrl('mia', 'face', { scale: 2, format: 'gif' })   // an address
LilGuys.lilGuyImg('Sneaky Gumdrop', 'row')                      // an <img>, sized for a board row
LilGuys.lilGuyImg(info, 'face', { size: 2, alt: '' })            // any view at any size
const guys = await LilGuys.lilGuysFor(names)                     // the batch read, a hundred at a time, remembered
LilGuys.lilGuySize('results', 4, info.wide)                      // a box's CSS size
```

`lilGuyImg` gives `width` and `height` (no layout shift), `image-rendering: pixelated`,
`loading="lazy"`, `decoding="async"`, alt text (the player's name, or `''` for a decorative one), and
a grey stand-in if the picture can't be had. `{ srcset: true }` adds 2× and 4× pictures for places
that may lose the CSS. Its `size` is screen pixels per art pixel, or a preset's name.

```html
<lil-guy name="mia" preset="row"></lil-guy>
<lil-guy name="Sneaky Gumdrop" view="face" size="4" label="Sneaky Gumdrop"></lil-guy>
<lil-guy code="eyJzIjoi…" view="card-full" size="2"></lil-guy>
```

Point the kit at a local Worker with `<script src=… data-host="http://127.0.0.1:8787">` or
`LilGuys.setLilGuysHost(…)`.

## Snippets

### Plain HTML

```html
<li class="row">
  <img src="https://lilguys.dleclub.com/g/latest/~mia/face.png" width="42" height="42" alt="mia"
       loading="lazy" decoding="async" style="image-rendering:pixelated">
  <span>mia</span><b>1,284</b>
</li>
```

### A leaderboard, one read

```html
<script src="https://lilguys.dleclub.com/lilguys.js"></script>
<script>
  const guys = await LilGuys.lilGuysFor(board.map(r => r.name));
  for (const r of board) rowOf(r).prepend(LilGuys.lilGuyImg(guys[r.name.toLowerCase()] ?? r.name, 'row'));
</script>
```

A null answer (the Worker couldn't be reached) still works: `lilGuyImg` takes the name.

### A canvas or engine game: the sprite sheet

```js
const base = 'https://lilguys.dleclub.com/g/latest/~mia/idle.sheet';
const res = await fetch(base + '.json');                        // follows the redirect; CORS is open
const sheet = await res.json();
const img = new Image();
img.crossOrigin = 'anonymous';                                   // so WebGL can upload it
img.src = new URL(sheet.image, res.url).href;
await img.decode();
let k = 0, at = performance.now();
function draw(ctx, x, y, scale = 4) {
  while (performance.now() - at > sheet.delays[k]) { at += sheet.delays[k]; k = (k + 1) % sheet.frames; }
  const sx = (k % sheet.columns) * sheet.frameWidth, sy = Math.floor(k / sheet.columns) * sheet.frameHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sheet.frameWidth, sheet.frameHeight, x, y, sheet.frameWidth * scale, sheet.frameHeight * scale);
}
```

`sheet.image` is relative to the JSON's own (redirected) address. One image per guy; frame times are
in milliseconds and loop. In Three.js set the texture's `magFilter` to `NearestFilter`; in Phaser, load
it as a spritesheet with `frameWidth`/`frameHeight` and build the animation from `delays`. Plain
guys' sheets are a few kilobytes; a shining guy's whole idle is often smaller as a sheet than as an
animated PNG.

### An iOS app (Capacitor)

The apps are web views: the `<img>` snippets above work as they are, animated (WKWebView plays APNG).
Where a picture must stay still, or a native view shows it, use a `-still` at the size it's drawn:

```html
<img src="https://lilguys.dleclub.com/g/latest/~mia/face-still@3.png" width="42" height="42" alt="mia">
```

A native `UIImageView` shows the first frame of an APNG; use `.gif` with an animated-image view if it
should move. Nothing is bundled: pictures are cached by the web view like any image.

### Twitch chat

A chatter is `~<login>`: their dealt guy until they claim the name, then theirs.

```js
const face = login => LilGuys.lilGuyImg(login, 'chat');          // 28 px, animated, lazy
```

For a whole chat, ask `lilGuysFor` for each batch of new chatters and keep the answers: the kit
remembers them for the page's life. Overlays that can't run script take
`https://lilguys.dleclub.com/g/latest/~<login>/face@2.gif`.

### A server-rendered share card

```js
// Vercel OG / satori, or any server: a still PNG, absolute, at the size it's drawn.
const guy = `https://lilguys.dleclub.com/g/latest/~${encodeURIComponent(name)}/card-full-still@2.png`;
// <img src={guy} width={280} height={408} style={{ imageRendering: 'pixelated' }} />
```

Fetch with redirects followed. Satori and most image libraries draw only the first frame, so ask for
a `-still`. For a Discord embed or an email, a `.gif` moves.

### Discord

`pfp-still@16.png` is about 512 px square, as Discord asks for a profile picture; `pfp@8.gif`
moves (Discord takes animated pictures only as GIFs).

## Light and dark

Every view but `pfp`, `card`, `art` and `card-full` is transparent (a move or `still` of a guy
wearing a backdrop fills its picture with it; `icon` and `face` never do). His outline is dark, so on a
dark page he reads by his own colours; on a very dark background (near `#0c0f1a`), a tile a step
lighter behind a face helps, as the formats page shows. `pfp` sits on a light tint of his own colour
and reads on both. Cards and the big card carry their own frame.

## Showing a hundred at once

Every picture is decoded and played by the browser, off the main thread, with no script per frame.
Measured in headless Chromium (390 × 844 at 3×, software rendering), a board of 100 rows, each with an
animated guy, five seconds standing and five scrolling:

| On the board | Main thread busy | Whole browser CPU, standing / scrolling | Frame rate scrolling | Long tasks |
| --- | --- | --- | --- | --- |
| Text only | 1.2% | 4% / 18% | 60 | 0 |
| 100 plain `face@1.png` at 42 px | 1.4% | 6% / 20% | 60 | 0 |
| 100 shining `face@1.png` at 42 px | 1.4% | 10% / 23% | 60 | 0 |
| 100 shining `face@3.png` at 42 px | 1.3% | 12% / 23% | 60 | 0 |
| 100 shining `face@1.gif` at 42 px | 1.1% | 10% / 22% | 60 | 0 |
| 100 shining `icon@1.png` at 32 px | 1.4% | 11% / 25% | 60 | 0 |
| 100 shining `idle@1.png` at 80 px | 1.2% | 11% / 22% | 60 | 0 |
| 100 shining `card@1.png` at 78 × 126 | 1.2% | 11% / 26% | 60 | 0 |

No view needs a lighter form at a hundred. What a hundred costs to download, at 1×:

| View | Plain guy | Shining guy (a finish, every third an aura) |
| --- | --- | --- |
| `face` | 1.4 KB png, 0.9 KB gif | 7.5 KB png, 5.8 KB gif |
| `icon` | 1.5 KB, 1.0 KB | 8.4 KB, 6.9 KB |
| `idle` | 1.8 KB, 1.4 KB | 25 KB, 12 KB |
| `pfp` | 1.8 KB, 1.1 KB | 18 KB, 6.7 KB |
| `card` | 1.0 KB, 1.2 KB | 60 KB, 16 KB |
| `card-full` (one) | 90 KB png, 180 KB gif | 90 to 150 KB png, 180 to 220 KB gif |
| any `-still` | 0.2 to 1 KB; `card-full-still` 11 to 15 KB | |

Every animated picture writes only what changed after its first frame, and `icon`, `face` and
`card-full` keep to 255 colours, so their PNGs are indexed. A shining guy's `idle`, `pfp` and `card`
keep their exact colours as PNGs; where a wall of a hundred of those matters, `.gif` is half the
bytes or less (in 255 colours), and a `-still` is a few hundred bytes. Ask `@1`: `@3` adds a third
to a half again for nothing CSS can't do.

## A crowd of thousands

For Twitch chat and anything bigger than a board (a stand of every chatter, the day's players),
draw guys from crowd sprites on one canvas instead of an element each. `crowdSprite(spec, size)`
gives a guy at 16, 10, 8, 6, 4 or 2 pixels square, standing on the cell's floor, made from his own
drawing: at 16 his still, at 10 and 8 his shape, colours, eyes, mouth and outline, at 6 a face in his
colours, at 4 and 2 his colours (hat or head over body). `crowdSheet(specs, size, columns)` puts many
on one sheet, guy `n` at column `n % columns`. Each takes about 0.3 ms with no canvas, so a game makes a
chatter's sprite as they first type and draws the crowd as one copy per guy, near rows at the bigger
sizes and far rows at the smaller. Seed a chatter from the lowercased name, as chat's faces already do.
They come with the headless build (below).

Most games want the whole crowd, not the sprites: `createCrowd(canvas, { backdrop, wave })` lays the
canvas out in rows (`crowdSeats`), seats each guy you `add(name, look)` from the front middle back,
makes his sprite a few milliseconds a frame, sinks the far rows into a haze of `backdrop`, and draws
only while something moves. `hop(name)` when a chatter guesses, `wave(true)` for a stadium wave,
`spotlight(name, label)` to lift the round's winner out to the front, big, with a line under him.
A guy wearing a Prized copy or better is outlined in its grade's colour (`crowdShine`), so rare guys
show from the back. Made-up guys in a crowd wear nothing: no pet shop items, no buddies.

For a page that isn't a game, the Worker draws a still crowd: `GET /api/club/crowd.png?names=a,b,c`
with `w` and `h` (world pixels, up to 480 × 240), `fill` (plain made-up guys behind, up to 4,000),
`scale` (1 to 4) and `bg` (a hex colour). Named guys stand at the front middle as they are on the
site. Cached for a minute; new pictures count against the address, 300 a day.

## Chat emotes

Every guy comes as twelve chat emotes (Hi, Lol, Pog, Love, Mad, Sad, Sleep, Hmm, Hype, Gg, Blep,
Oops), 14 pixels square so they scale by whole numbers: `emote-<id>` moves (six frames, a GIF for
Twitch's animated emotes), `emote-<id>-still` holds. Twitch takes `@2`, `@4` and `@8` (28, 56, 112),
Discord `@9` (126). `/showcase/emotes.html?name=<name>` shows a player's set and zips it for either.
In code: `emoteFrames(spec, id, moving)` and `EMOTE_SET`.

## Limits, CORS and privacy

- **Rate limits.** A picture that isn't cached yet counts against the address: 3,000 new pictures a
  day each. Batch reads that miss the cache count separately, 2,000 a day. Cached pictures and
  answers cost nothing. Over the limit is a `429`.
- **CORS.** Every picture, redirect, sheet, batch answer and the kit itself carries
  `Access-Control-Allow-Origin: *`, so a canvas can read them and a module can import the kit.
- **Privacy.** Addresses and answers carry names and guys only: never a club id, an account, a sign-in,
  an owner token or a key. A guy code holds his seed, parts and what he wears, which the lil guys site
  shows publicly anyway. Only a salted daily hash of the address is kept for the limits. A game passes
  the name it already shows on its board, nothing else.

## Drawing guys in the game itself

A game that renders guys locally (Amountle's Twitch mode, the club's own boards) vendors the headless
build instead: build it with `npx tsdown -c tsdown.headless.config.ts` and copy
`dist-headless/headless.js` and `headless.d.ts` over the game's copy (Amountle's `src/lil-guy-club.js`,
the club's `dist/club/faces.js`). Never hand-edit them. `bakeView(spec, view)` gives exactly the frames
the Worker serves for a view (`bakeSquare` for `icon` and `face`, `cardInputOf` for the big card's
words), and `encodeApng`, `encodeGif` and `sheetOf` encode them the same way. Part arrays are
append-only, so a vendored build only ever adds.

## Moving a game over

- **Amountle** (`src/lilguys.ts`): `lilguysPicture` hard-codes `/g/1/@name/idle@4.png`, which takes a
  `301` to the current version and then a `302` to the code on every load. Use
  `https://lilguys.dleclub.com/g/latest/@${name}/idle.png` scaled 4× in CSS (one hop, a quarter of
  the bytes), or `~${name}` so unclaimed chatters come from the Worker too. Chat's faces can be
  `face.png` at 28 px. `lilguysSpec` can move from `/api/club/named` to `/api/club/batch` when it only
  needs pictures.
- **dle-club** (`dist/club/look.js` draws SVGs with `toSvgString`; `api/_lib/lilguys.js` reads
  `/api/club/guys`): boards can show `~<board name>/face.png` with no library, or, for players whose
  sign-in has a lilguys name (`lilguysOf` already returns `key`), `@<key>`. A club guy drawn from its
  `g1:` code has no seed the Worker can see; keep drawing those with `faces.js`, or hand the Worker a
  guy code built from the board name as seed and the `g1:` parts (never the club id as a seed).
- **Engine games** (Puttsies, Weighsies, Cutsies, Trickshotle): party chips, scorecards and boards
  take `LilGuys.lilGuyImg(name, 'chat' | 'row')`; Weighsies' pixel crowd and Stackdle's party shelf
  can use `face.sheet.json` when they draw to a canvas.
