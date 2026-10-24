<p align="center">
  <img src=".github/alice.svg" width="64" alt="" />
  <img src=".github/bob.svg" width="64" alt="" />
  <img src=".github/charlie.svg" width="64" alt="" />
  <img src=".github/dana.svg" width="64" alt="" />
  <img src=".github/elena.svg" width="64" alt="" />
  <img src=".github/frank.svg" width="64" alt="" />
  <img src=".github/grace.svg" width="64" alt="" />
  <img src=".github/hank.svg" width="64" alt="" />
  <img src=".github/iris.svg" width="64" alt="" />
  <img src=".github/jupiter.svg" width="64" alt="" />
  <img src=".github/kai.svg" width="64" alt="" />
  <img src=".github/luna.svg" width="64" alt="" />
</p>

<h1 align="center">lil_guy</h1>

<p align="center">
  Deterministic pixel art avatars from any string.<br />
  ~22 billion lil guys. Zero dependencies. ~21 KB gzipped.
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#react-component">React</a> ·
  <a href="#nextjs">Next.js</a> ·
  <a href="#headless">Headless</a> ·
  <a href="#api">API</a> ·
  <a href="demo.html">Demo</a> ·
  <a href="https://isaacaudet.github.io/lil_guy/">Explore</a>
</p>

---

Pass any string — an email, username, wallet address — and get back a cute, deterministic blob character. Same input always produces the same lil guy, and every one of them is pleased to see you.

Works everywhere: React component with 3D hover + blink animation, headless SVG/PNG generation, Next.js image API route, or plain `<script>` tag.

**[Make yours →](https://isaacaudet.github.io/lil_guy/)** — type anything, get your guy, save him as a PNG with or without his name, and claim him to your wall: the word stays in your browser and is never shown, only the character it makes. Tap one drifting past, or any one you find out in the gallery, and you can take that one instead. Behind it is the gallery: an endless plane where each cell's coordinates *are* the seed, so there is no list and no edge. Order it by colour to walk the spectrum, or leave it scattered. The lattice is a spring mesh, so it stretches behind your hand and rings down when you let go.

## Install

```bash
npm install lil_guy
```

## Quick Start

### React

```tsx
import { LilGuy } from "lil_guy";

function UserAvatar({ email }: { email: string }) {
  return <LilGuy name={email} size={48} />;
}
```

### Headless (no React)

```ts
import { toSvgString } from "lil_guy";

const svg = toSvgString("alice@example.com");
// → complete SVG string, use anywhere
```

### Script tag

```html
<script src="https://unpkg.com/lil_guy/dist/lil-guy.js"></script>
<script>
  const svg = LilGuy.toSvgString("alice@example.com");
  document.getElementById("avatar").textContent = svg;
</script>
```

## React Component

The `<LilGuy>` component renders an interactive pixel art avatar with 3D tilt and blink animation.

```tsx
<LilGuy
  name="alice@example.com"
  size={64}
  shape="circle"       // "circle" | "square"
  variant="gradient"   // "gradient" | "solid" | "transparent"
  interactive          // 3D hover effect (default: true)
  enableBlink          // blink animation
  intensity3d="dramatic" // "none" | "subtle" | "medium" | "dramatic"
/>
```

### Pin specific parts

Override individual features while keeping the rest deterministic:

```tsx
<LilGuy name="alice" parts={{ hair: 2, eyes: 0 }} />
```

### Compound avatar (image with fallback)

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "lil_guy";

<Avatar>
  <AvatarImage src="/photos/alice.jpg" alt="Alice" />
  <AvatarFallback name="alice@example.com" size={48} />
</Avatar>
```

## Next.js

Two-line API route that serves avatar PNGs. Caches forever since the output is deterministic.

```ts
// app/api/avatar/route.ts
import { toLilGuyHandler } from "lil_guy/next";

export const { GET } = toLilGuyHandler();
```

Then use it anywhere:

```html
<img src="/api/avatar?name=alice@example.com&size=128" />
```

## Headless

Generate SVG strings or PNG data URLs without React or a DOM.

```ts
import { toSvgString, toPng } from "lil_guy";

// SVG string — works in Node, Deno, Bun, browsers
const svg = toSvgString("alice", { size: 256 });

// PNG data URL — browser only (needs canvas)
const png = await toPng("alice", { size: 256 });
```

### Pipeline access

For full control, use the pipeline directly:

```ts
import { hash, resolve, compose, getPalette, resolveColor } from "lil_guy";

const config = resolve("alice");     // → { head: 5, eyes: 7, mouth: 1, ... }
const grid = compose(config);        // → 16×16 number[][] of color tokens
const palette = getPalette(config.palette);
const color = resolveColor(palette, grid[8][8]); // → "#A8F0D8"
```

## API

### `<LilGuy>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Input string to generate avatar from |
| `size` | `number \| string` | `40` | Size in px or CSS units |
| `shape` | `"circle" \| "square"` | `"circle"` | Avatar shape |
| `variant` | `"gradient" \| "solid" \| "transparent"` | `"transparent"` | Background style |
| `interactive` | `boolean` | `true` | Enable 3D hover effect |
| `enableBlink` | `boolean` | `false` | Enable blink animation |
| `intensity3d` | `"none" \| "subtle" \| "medium" \| "dramatic"` | `"dramatic"` | 3D rotation intensity |
| `parts` | `object` | — | Pin specific features by index |
| `palette` | `Palette` | — | Override color palette |
| `showInitial` | `boolean` | `false` | Show first letter overlay |
| `title` | `string` | — | Accessible name. Omit when the avatar sits beside the name it represents — it is then marked decorative |

The blink and the hover tilt both stop under `prefers-reduced-motion`.

### `toSvgString(input, options?)`

Returns a complete SVG string. No DOM or React needed. Horizontal runs of one
colour are merged into a single `<rect>`, which is roughly a third the size of
one rect per pixel.

Pass `title` to give the SVG an accessible name; without it the SVG is marked
decorative (`aria-hidden`), which is what you want beside a visible username.

### `toPng(input, options?)`

Returns a PNG data URL. Browser only.

### `toLilGuyHandler(options?)`

Creates a Next.js route handler. Returns `{ GET }`.

## How It Works

1. **Hash** — FNV-1a hash of the input string, with an independent hash for each slot, so adding a part to one slot never reshuffles the others
2. **Resolve** — Each hash picks a body shape, eyes, mouth, cheeks, topper, marking, accessory, arms, feet, colourway and tone. Picks are weighted (`src/parts/weights.ts`) so the simplest, sweetest looks are the common ones and the busy ones are a treat to find
3. **Compose** — The parts are layered onto a 16×16 grid of colour *roles* (body, shade, blush, accent, …). Every shape is lit the same way — a gleam on the upper left, a soft shade along the bottom — and then the whole guy, hat and arms included, gets an outline. Parts measure the head they land on: hats hug its top rows, ears sit on its shoulders, the face follows its eye line
4. **Render** — Each colourway is three hand-picked colours (body, accent, trim). The outline, shade, gleam, eyes and blush are worked out from the body, so they always belong to it — the outline is a deep version of the body colour rather than black, and the blush is always a pink that shows

### The art

Every part is drawn by hand, as text, one character per pixel, so the
library can be read and edited like a picture:

```ts
pair('cat ears', [
  '#..',
  '#c.',   // # body, c blush
  '###',
]),
```

A few rules keep every combination good-looking:

- **Attitude, not baby faces.** Eyes are chill, side-eyed, squinting or fired up, with shades, star eyes and laser eyes as the rare ones; mouths smirk, grin with teeth, stick a tongue out or chew gum. No blush, hearts or lashes
- **Bold colours.** Punchy, saturated bodies with near-black outlines. On the darkest bodies the eyes and mouth glow cream instead of dark, so they always read
- **Nothing is clipped.** Tests check every shape against every hat, accessory, arm pose and foot style: each guy is fully outlined inside the frame, in one piece, and no hat or scarf ever covers an eye or the mouth

13 shapes × 10 eyes × 9 mouths × 5 cheeks × 28 toppers × 8 markings × 8 accessories × 3 arm poses × 5 foot styles × 24 colourways × 3 tones × 2 (mirrored) = **22,643,712,000** characters. Weighting makes the simple parts common and the loud ones rare, so the set behaves like about 3.1 billion equally-likely guys.

### Pinning parts

Every slot can be pinned through `parts`, and the rest stays deterministic:

| Slot | Values |
|---|---|
| `head` | `0-12` body shape: round, mochi, egg, gumdrop, onigiri, ghost, slime, loaf, cloud, pill, chonk, block, peanut |
| `eyes` | `0-9` chill, beady, stare, side-eye, squint, wink, fired up, shades, star, laser |
| `mouth` | `0-8` smirk, flat, toothy, tongue, fang, grin, ooh, gritted, gum |
| `cheeks` | `0-4` bare, freckles, scar, band-aid, war paint |
| `hair` | `0-27` whatever sits on top: ears, a sprout, a hat |
| `body` | `0-7` markings |
| `accessory` | `0-7` glasses, scarf, collar, bow tie, … |
| `arms` | `0-2` none, by the sides, waving |
| `feet` | `0-4` nubs, tiptoes, wide, socks, tucked |
| `shade` | `0-2` soft, as picked, vivid |
| `flip` | `boolean` mirrors the finished guy |

```tsx
<LilGuy name="alice" parts={{ hair: 1, arms: 2, flip: true }} />
```

The parts are exported (`heads`, `eyes`, `mouths`, `cheeks`, `hair`, `bodies`, `accessories`), each with a `name`, so you can list or label them.

## Game items

Every DLE Club game has things a player can wear, here and in every other game.
The guy underneath — face, shape, colours — never changes, so a player is
recognisable everywhere.

| Game | Skins | Hats (first is free) | Frame |
|---|---|---|---|
| Amountle | Jar of gems, Crystal | Gem, Gem crown, Big gem | Gem field |
| Halfsies | Clay pot, Kitchen scale | Half pot, Scale dish, Pot helmet | Kitchen teal |
| Stackdle | Toy block, Triangle | Little block, Tower, Ring | Toy box |
| Flipsies | Water bottle, Bullseye | Bottle cap, Landed bottle, Bullseye beret | Bullseye |
| Puttsies | Golf ball, Quilt pillow | Golf visor, Pin flag, Golf tam | Patchwork |
| Weighsies | Cheese wheel, Kettlebell | Cheese wedge, Balance, Dumbbell | Lavender |
| Cutsies | Kiwi, Melon slice | Kiwi slice, Chef hat, Orange half | Kiwi slices |
| Tiltsies | Hamster ball, Hamster | Hamster ears, Hamster buddy, Sunflower seed | Toy maze |
| Trackdle | Racer, Traffic cone | Pit cap, Race helmet, Trophy | Checkered flag |

A **skin** turns the guy into the game's object and keeps his face.

### Owned copies: finish, float, pattern

An item is a design. A copy someone owns is the item plus:

| | |
|---|---|
| **Finish** | Stock (79.92%), Fade (15.98%), Case Hardened (1.6%), Doppler (1.6%), Gold (0.9%). Fade, Doppler and Gold only exist in Factory New or Minimal Wear |
| **Float** | 0–1, how worn it is. Factory New < 0.07 < Minimal Wear < 0.15 < Field-Tested < 0.38 < Well-Worn < 0.45 < Battle-Scarred. The wear really shows: paint chips off as it rises, and a Factory New copy keeps a glint |
| **Pattern** | 0–999, where the finish lands, and where the chips go. A few are famous: Case Hardened 661, 670, 321, 387 and 955 come out almost all blue (Blue Gem); a Doppler's pattern picks its phase, and Ruby, Sapphire and Black Pearl are rare |
| **StatTrak™** | an optional counter, on 10% of drops |

Grades follow from the finish: Mil-Spec, Restricted, Classified, Covert (a
famous pattern lifts a copy one grade), ★ Exceedingly Rare (Gold, with a
sparkle).

**Everyone gets one.** `starter(name, game)` is the copy of a game's free hat
every player has from the start: stock, with a float and pattern taken from
their name, so everyone's is a little different and a lucky name gets a
Factory New. `roll(seed, game)` opens a case. The seed decides everything, so
in production it must be made on the server at drop time and stored with the
copy.

A copy is one short string, to store or put in a URL:

```ts
import { roll, encode, decode, nameOf, wearOf, gradeOf } from "lil_guy";

const copy = roll(serverSeed, "puttsies");
const saved = encode(copy);          // "puttsies.ball~doppler~0.0123456~20"
nameOf(copy);                        // "Golf ball | Doppler (Ruby)"
wearOf(copy.float).name;             // "Factory New"
gradeOf(copy).name;                  // "Covert"

toSvgString("alice", { game: "puttsies" });         // wears her own free visor
toSvgString("alice", { equip: [saved] });           // wears this exact copy
```

`equip` takes item ids or encoded copies. This library only draws them and
rolls them; who owns which, and what it costs, belongs to the game or the club.

### Upgrading from 0.1

0.2 is a redraw: every name maps to a new character. The API is the same
apart from the config shape — `AvatarConfig` gained `cheeks` and `arms`,
dropped `patternTone`, and colour tokens now run 0–18 instead of 0–8. If you
store pinned `parts`, re-pick them against the new library.

## License

MIT
