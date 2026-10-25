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
  ~3.8 trillion lil guys. Zero dependencies. ~32 KB gzipped.
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

At 36px and under it draws for a small size (`small`): each eye solid, dark ink
darker, the soft highlight back to the body colour, and a square avatar cropped
to the guy so he fills it. Pass `small: false` to keep the full drawing.

### `toPng(input, options?)`

Returns a PNG data URL. Browser only.

### `toLilGuyHandler(options?)`

Creates a Next.js route handler. Returns `{ GET }`.

## Animations

Ten moves for games: `idle`, `blink`, `hop`, `wave`, `look`, `cheer`, `sad`,
`dance`, `squish` and `sleep`. They take the same options as `toSvgString`, so a guy
hops in the hat he is wearing.

```ts
import { toAnimatedSvg, animate, frameAt, drawFrame } from "lil_guy";

// One self-contained SVG that plays by itself: inline it or use it as an <img>.
el.innerHTML = toAnimatedSvg("alice", "cheer", { game: "puttsies", size: 96 });

// Or draw the frames yourself, in a canvas game loop.
const hop = animate("alice", "hop", { equip: [savedCopy] });
drawFrame(ctx, frameAt(hop, elapsedMs), x, y, 4);
```

He changes his face for some of them: a laugh to cheer and dance, a wobbly
mouth when sad, an "ooh" when squished. His own eyes always stay. Little
emotes pop up beside him (music notes, a question mark, a heart, a "!"), and
dust puffs out when he lands.

Players can show an emote over any move with `emote`. `EMOTE_UNLOCKS` lists
them and how each is earned: a heart, music, a snooze, "huh?" and "whoa!"
for everyone, a flame for a 7-day streak and a crown for a perfect day.

Frames are 16 wide and 20 tall: the guy stands in the bottom 16 rows exactly
as in the still, and the top 4 are room to jump into. Every frame is made from
his own pixels. A squash loses a row from the middle of the body and a stretch
repeats one; a blink or a glance moves the eye pixels. Nothing is scaled.

Rarity shows in the frames, so it reads without a shader. The best copy he is
wearing sets how much:

| Grade | In the frames |
|---|---|
| Everyday | nothing extra |
| Special | a shine sweeps across the item |
| Prized | and a ring in the grade's colour pulses round him |
| Mythic | and sparkles, and a trail when he jumps |
| ★ Grail | a gold ring, more sparkles and a gold trail |
| ★ Aura | the aura itself, moving, in place of the ring |

**In React**, `<LilGuyAnimated name={seed} move="cheer" equip={[copy]} />` plays a
move with the same SVG, so no timer runs in React.

**With the finishes moving.** The frames carry a per-pixel mask of which item
each pixel belongs to (`frame.slots`), so a shader can run each copy's finish
on its own pixels. `createShine()` is that shader: one WebGL context to share
across a page or a game. Draw a guy's frame into it, then copy the 16×20
result into his canvas with `drawImage`. It returns null without WebGL; draw
the frame's colours as they are.

**Size.** The package is free of side effects, so a bundler keeps only what's
used: still faces alone are about 17 KB gzipped, with animation about 20 KB,
and everything (items, copies, share cards, the shader) about 27 KB.

`rarity: false` turns it off. `once: true` plays the SVG once and holds the
last frame. The SVG plays whatever the reduced-motion setting is, as the DLE
Club games do; pass `stillWhenReduced: true` to hold the first frame instead.

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

- **Charm first, with some edge.** Most guys have shiny eyes set wide apart and a small pleased mouth; some are chill, side-eyed or squinting, smirk, grit their teeth or chew gum, wear a scar or war paint, a mohawk or headphones, or come in a night colourway. Shades, star eyes and laser eyes are the rare finds
- **Every solid eye has a catchlight.** A flat dark square with no shine is what reads as dead-eyed
- **Clean colours, with depth.** No greys or murky browns; every guy gets the same outline, gleam and shading, and the vivid tone is common
- **Nothing is clipped.** Tests check every shape against every hat, accessory, arm pose and foot style: each guy is fully outlined inside the frame, in one piece, and no hat or scarf ever covers an eye or the mouth

25 shapes × 17 eyes × 16 mouths × 14 cheeks × 30 toppers × 14 markings × 14 accessories × 3 arm poses × 5 foot styles × 38 colourways × 3 tones × 2 (mirrored) × 2 (Lucky or not) = **3,828,867,840,000** characters. Weighting makes the simple parts common and the loud ones rare, so the set behaves like about 294 billion equally-likely guys.

**Lucky.** About one name in 400 (`LUCKY_ODDS`) comes out Lucky: the same colourway turned round the colour wheel, with gold trim. It counts in `guyOneIn` like any trait.

### Pinning parts

Every slot can be pinned through `parts`, and the rest stays deterministic:

| Slot | Values |
|---|---|
| `head` | `0-31` body shape: round, mochi, egg, gumdrop, onigiri, ghost, slime, loaf, cloud, pill, chonk, block, tower, gourd, flame, jellyfish, octopus, robot, cactus, saucer, shard, toadstool, bat, crab, heart, dumpling, tooth, star, acorn, gem, clover, disco; chase: gem, clover, disco |
| `eyes` | `0-22` beans, shiny, happy, sparkle, wink, glossy, excited, hearts, lashes, chill, side-eye, shades, star, squint, fired up, laser, cyclops, sleepy, dizzy, anime, galaxy, diamond, dragon; chase: galaxy, diamond, dragon |
| `mouth` | `0-21` smile, cat, laugh, beak, blep, grin, fang, smirk, ooh, tiny, wobble, toothy, tongue out, flat, gritted, bubblegum, bunny, vampire, wide, gold tooth, grillz, mustache; chase: gold tooth, grillz, mustache |
| `cheeks` | `0-18` bare, blush, dot, rosy, freckles, scar, band-aid, war paint, whiskers, hearts, shine, stripes, stars, gold leaf, flushed, shy, mole, jewels, rainbow; chase: jewels, rainbow |
| `hair` | `0-36` toppers: none, cat ears, bear ears, bunny ears, bug antennae, horns, space buns, sprout, apple stem, flower, bow, crown, party hat, antenna, unicorn horn, star clip, tuft, chick tuft, beanie, cap, bob, mushroom, eggshell, frosting, leafy top, beret, witch hat, propeller, mohawk, headphones, cherries, flower crown, antlers, chef hat, laurel, star crown, on fire; chase: laurel, star crown, on fire |
| `body` | `0-18` markings: plain, belly, two tone, tabby, spots, star mark, heart mark, gleam, stripes, zigzag, split, moon mark, bolt mark, starry, polka dots, blaze, sprinkles, kintsugi, gold dipped; chase: kintsugi, gold dipped |
| `accessory` | `0-19` none, glasses, scarf, bell collar, bowtie, bandana, star sticker, heart badge, monocle, eye patch, necklace, medal, flower pin, headband, necktie, lei, goggles, gold chain, heart shades, masquerade; chase: gold chain, heart shades, masquerade |
| `arms` | `0-2` none, by the sides, waving |
| `feet` | `0-4` nubs, tiptoes, wide, socks, tucked |
| `shade` | `0-2` pastel, as picked, vivid |
| `flip` | `boolean` mirrors the finished guy |
| `lucky` | `boolean` the Lucky colour variant |

```tsx
<LilGuy name="alice" parts={{ hair: 1, arms: 2, flip: true }} />
```

The parts are exported (`heads`, `eyes`, `mouths`, `cheeks`, `hair`, `bodies`, `accessories`), each with a `name`, so you can list or label them.

**The deal.** A seed from `makeSeed()` starts `3-` and is dealt from today's
weights: a few simple, good-looking parts carry most guys, busier ones are
uncommon, and the chase parts above turn up one guy in 300 to 1,000. Anything
else (an older seed, a plain name) is dealt from `DEAL_2`, a frozen copy of the
weights before deal 3, so adding parts never redraws a guy already dealt.
`traitOdds(config)` gives each part's odds.

## Game items

Every DLE Club game has things a player can wear, here and in every other game.
The guy underneath — face, shape, colours — never changes, so a player is
recognisable everywhere.

| Game | Skins | Hats (first is free) | Frames | Buddies |
|---|---|---|---|---|
| Amountle | Jar of gems, Crystal, Piggy bank, Gumball machine | Gem, Gem crown, Big gem, Coin stack | Gem field, Coin pile, Jelly beans | Gemling, Jelly bean, Piglet bank |
| Halfsies | Clay pot, Kitchen scale, Avocado half, Lemon half | Half pot, Scale dish, Pot helmet, Half sandwich | Kitchen teal, Gingham, Half and half | Pea pod, Sunny egg, Berry half |
| Stackdle | Toy block, Triangle, Building brick, Block stack | Little block, Tower, Ring, Arch | Toy box, Bricks, Blueprint | Cubelet, Pyramid, Brickling |
| Flipsies | Water bottle, Bullseye, Pancake stack, Soda can | Bottle cap, Landed bottle, Bullseye beret, Flipped cup | Bullseye, Waves, Pool tiles | Droplet, Short stack, Rubber duck |
| Puttsies | Golf ball, Quilt pillow, Golf bag, Windmill | Golf visor, Pin flag, Golf tam, Argyle bucket | Patchwork, Fairway, Putting green | Tee buddy, Gopher, Hazard frog |
| Weighsies | Cheese wheel, Kettlebell, Anvil, Flour sack | Cheese wedge, Balance, Dumbbell, Feather | Lavender, Ruler, Scale dial | Mouse, Cheddar, Chick |
| Cutsies | Kiwi, Melon slice, Toast, Strawberry | Kiwi slice, Chef hat, Orange half, Banana | Kiwi slices, Melon seeds, Cutting board | Seedling, Cherries, Pineapple |
| Tiltsies | Hamster ball, Hamster, Marble, Acorn | Hamster ears, Hamster buddy, Sunflower seed, Hamster wheel | Toy maze, Spiral, Wood shavings | Hamlet, Rolly, Sunflower |
| Trackdle | Racer, Traffic cone, Stopwatch, Tyre | Pit cap, Race helmet, Trophy, Race goggles | Checkered flag, Tarmac, Kerb | Turbo snail, Conelet, Go-kart |

A **skin** turns the guy into the game's object and keeps his face.

**Buddies.** Each game has three buddies, tiny pets that sit at the guy's
feet, bottom right, in front of everything, with their own outline. Equip one
like any item.

**Seasonal hats.** Club birthday (12 October – 16 October), Pumpkin (20 October – 2 November), Snow cap (15 December – 6 January), Sweetheart (10 February – 16 February), New Year top hat (29 December – 2 January), Red lantern (20 January – 12 February), Shamrock (10 March – 18 March), Cherry blossom (19 March – 14 April), Painted egg (22 March – 25 April), Daisy chain (1 May – 31 May), Sun hat (14 June – 20 July), Fireworks (1 July – 7 July), Ice cream (1 August – 25 August), Maple leaf (20 September – 30 November), Turkey feathers (18 November – 30 November), Reindeer antlers (1 December – 24 December)
only drop in their days: `inSeason(day)` lists what's dropping and
`rollSeason(seed, day)` rolls one. A seasonal copy keeps its day (`~d2026-10-31`
in its code) and its year in its name, so a 2026 Pumpkin is its own thing.

**Share cards.** `toShareSvg(seed, copy, { name })` draws a 1200×630 card of the
guy wearing a copy, with its grade, condition, tally and odds: one SVG with
nothing to fetch, ready to turn into a link preview.

### Owned copies: finish, scuff, print, tally

An item is a design. A copy someone owns is the item plus:

| | |
|---|---|
| **Finish** | Plain (79.87%), Sunset (15.98%), Tempered (1.6%), Nebula (1.6%), Prism (0.5%), Gold (0.25%), Negative (0.2%). Everything but Plain and Tempered only comes Mint in Box or Like New |
| **Scuff** | 0–1, how worn it is. Mint in Box < 0.07 < Like New < 0.15 < Played With < 0.38 < Well Loved < 0.45 < Battered. The wear really shows: paint chips off as it rises, and a Mint in Box copy keeps a glint |
| **Print** | 0–999, where the finish lands, and where the chips go. A few are famous: Tempered comes in five tints the print picks (Steel, Rose, Emerald, Copper, Violet), and prints 661, 670, 321, 387 and 955 come out all blue (Deep Blue); a Nebula's print picks its look, and Red Giant, Blue Moon and Black Hole are the rare ones |
| **Tally** | on 1 drop in 10: a counter of the days its owner finished the game while wearing it. It only goes up, and stays with the copy. It shows: two marks scratched into the item at 30 days, four at 100, and at 365 its outline turns gold |
| **Souvenir** | the day's free capsule for finishing every game is a souvenir of that day (`~s2026-10-25` in its code). No other capsule is one |
| **Pins** | up to three, earned and stuck on: a gold star (a perfect day), a flame (a 7-day streak), a heart (100 days played), a bolt (fastest of the day), a crown (top of a board) and a leaf (a first week). The club grants them; they are drawn on the item's own pixels |

Grades follow from the finish: Everyday, Special, Prized, Mythic (a famous
print lifts a copy one grade), ★ Grail (Gold, with a sparkle), and above them
★ Aura.

`collectorNotes(copy)` names what makes one copy the one people want: a 0.000
or 0.00 float, max float, the best of a condition just over its line, a famous
print, print #1 or #0, lucky, triple and straight print numbers, a souvenir, a
tally and pins, each with about how many copies have it.

### ★ Auras

One capsule in a thousand (`AURA_ODDS`), from any machine, is an aura instead
of the machine's item: an effect drawn in the empty pixels round the guy, never
over him, that moves with him. There are fourteen (`AURAS`): flames, orbit,
halo, sparkles, hearts, bubbles, rain cloud, lightning, music, snowfall,
petals, galaxy, rainbow and glitch, and Origin, the founder's, which no capsule
gives (`ONE_OF_ONE_AURAS`). An aura copy has its own finish: Classic (50%),
Fade (22%), Frost (12%), Toxic (8%), Shadow (5%) and Deep sea Sapphire (1.5%),
Ruby (1.2%) and Black pearl (0.3%). Its float shows (a battered aura flickers
with gaps) and its print sets its timing. Wear one like any item
(`equip: ['aura.flames~ruby~0.0123~7']`); still pictures draw it at a still
moment, `animate` moves it.

**Everyone gets one.** `starter(name, game)` is the copy of a game's free hat
every player has from the start: plain, with a scuff and print taken from
their name, so everyone's is a little different and a lucky name gets a
Mint in Box. `roll(seed, game)` opens a capsule. The seed decides everything,
so in production it must be made on the server at drop time and stored with
the copy.

A copy is one short string, to store or put in a URL:

```ts
import { roll, encode, decode, nameOf, wearOf, gradeOf } from "lil_guy";

const copy = roll(serverSeed, "puttsies");
const saved = encode(copy);          // "puttsies.ball~nebula~0.0123456~20"
encode({ ...copy, tally: 412, pins: ["star", "flame"] });
                                     // "…~20~t412~pstar+flame"
nameOf(copy);                        // "Golf ball | Red Giant"
wearOf(copy.scuff).name;             // "Mint in Box"
gradeOf(copy).name;                  // "Mythic"

toSvgString("alice", { game: "puttsies" });         // wears her own free visor
toSvgString("alice", { equip: [saved] });           // wears this exact copy
```

### How rare is it

`guyOneIn(config)` is one in how many guys has exactly that combination of
visible traits; `traitOdds(config)` lists each trait's chance. `copyOneIn(copy)`
is one in how many capsules give a copy at least that good: its item, finish,
a famous print if it has one, a scuff at least that low, and a tally.

| Copy | One in |
|---|---|
| A plain drop, Played With | ~20 |
| Sunset, Mint in Box | ~250 |
| Gold, Mint in Box | ~1,500 |
| Nebula Red Giant / Blue Moon / Black Hole | ~12,500–25,000 |
| Tempered Deep Blue | ~1 million |
| Tallied Deep Blue at 0.002 | ~300 million |

`equip` takes item ids or encoded copies. This library only draws them and
rolls them; who owns which, and what it costs, belongs to the game or the club.

### Keeping rarity real

A rare guy only means something if nobody can choose one. So:

- **Draw from a seed, not the name on the board.** Names can be typed, tried
  and changed. Make a seed once with `makeSeed()`, keep it with the player and
  draw from it (`toSvgString(seed)`, `starter(seed, game)`). The name stays a
  label, a rename changes nothing, and nobody can search for a rare guy.
- **A picker offers only common parts, plus the player's own.**
  `pickable(own, slot)` lists them and `allowed(own, look)` checks a choice.
- **Save picked looks as versioned codes.** `encodeLook({ eyes: 1 })` gives
  `2:e1`; `decodeLook` refuses old seven-number codes, out-of-range parts and
  rare parts the player didn't roll, and `lookOf(seed, code)` draws the
  result.

### Upgrading from 0.1

0.2 is a redraw: every name maps to a new character. The API is the same
apart from the config shape — `AvatarConfig` gained `cheeks` and `arms`,
dropped `patternTone`, and colour tokens now run 0–18 instead of 0–8. If you
store pinned `parts`, re-pick them against the new library.

## License

MIT
