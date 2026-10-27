import { AURAS, AURA_ODDS, DEAL_PREFIX, DEEP_BLUE_PRINTS, EFFECTS, FINISHES, FOOT_STYLES, FX_IDS, GAMES, GOLD_RIM_DAYS, GRADES, GRID_SIZE, LAYER, LOOP_MS, LUCKY_ODDS, MAX_PINS, ONE_OF_ONE_AURAS, PINS, RETIRED_EYES, SHADE_COUNT, SMALL_SIZE, T, WEAR, accessories, accessoryWeights, applyFx, armWeights, auraById, auraCells, auraColor, bodies, bodyWeights, cheekWeights, cheeks, compose, composeBase, cycle, dealOf, decode, dress, encode, eyeWeights, eyes, faceOf, fit, fitLoop, footWeights, freeItem, fxColor, gameItems, getPalette, gradeOf, hair, hairWeights, hash, hashNth, headWeights, heads, inSeason, itemById, items, luckyPalette, mouthWeights, mouths, nameOf, nebulaPhase, paint, paletteOf, paletteWeights, palettes, pinById, resolve, resolveColor, roll, rollFx, rollSeason, shadePalette, shadeWeights, shows, slotOf, special, starter, steps, tallyMarks, temperTint, wave, wearOf, withItems, withoutRetired, wrap } from "./paint-D9fE5DYw.js";
import * as React$5 from "react";
import * as React$4 from "react";
import * as React$3 from "react";
import * as React$2 from "react";
import * as React$1 from "react";
import * as React from "react";
import { jsx, jsxs } from "react/jsx-runtime";

//#region src/animate.ts
/**
* Animations for games: a guy that hops, waves, cheers, sulks.
*
* Every move is a short list of frames drawn on the same pixels as the still
* avatar — the body squashes by losing a row and stretches by repeating one,
* eyes close and glance by moving their own pixels — so nothing is ever
* resampled or blurred. Frames are 16 wide and 20 tall: the guy stands in the
* bottom 16 rows exactly as he does in the still, and the 4 rows above are
* room to jump into.
*
* Rarity shows in the frames too, so it reads in any game without a shader:
* from Special up a shine sweeps across the item, from Prized up a ring in the
* grade's colour pulses around the guy, and Mythic and Grail copies throw off
* sparkles.
*/
const MOVES = [
	"idle",
	"blink",
	"hop",
	"wave",
	"look",
	"cheer",
	"sad",
	"dance",
	"squish",
	"sleep"
];
/** Rows of room above the guy for jumps. */
const HEADROOM = 4;
const FRAME_WIDTH = GRID_SIZE;
const FRAME_HEIGHT = GRID_SIZE + HEADROOM;
/** How many columns past each side of the frame a rare aura may reach (`outside`). */
const AURA_PAD = 3;
/**
* Emotes a player can show after a game, and how each is unlocked. The
* moves use some on their own; `emote` in the options shows one over any move.
*/
const EMOTE_UNLOCKS = [
	{
		id: "heart",
		name: "Heart",
		how: "Everyone has it"
	},
	{
		id: "note",
		name: "Music",
		how: "Everyone has it"
	},
	{
		id: "zzz",
		name: "Snooze",
		how: "Everyone has it"
	},
	{
		id: "question",
		name: "Huh?",
		how: "Everyone has it"
	},
	{
		id: "bang",
		name: "Whoa!",
		how: "Everyone has it"
	},
	{
		id: "fire",
		name: "On fire",
		how: "A 7-day streak"
	},
	{
		id: "crown",
		name: "Crown",
		how: "A perfect day"
	}
];
const b = (pose, ms, more = {}) => ({
	pose,
	ms,
	...more
});
const HOP = [
	b("base", 90, { squash: 1 }),
	b("base", 70, {
		squash: -1,
		dy: -2
	}),
	b("base", 130, { dy: -4 }),
	b("base", 70, { dy: -3 }),
	b("base", 60, {
		squash: -1,
		dy: -1
	}),
	b("base", 100, { squash: 2 }),
	b("base", 80, { squash: 1 })
];
const BEATS = {
	idle: () => [
		b("base", 700),
		b("base", 500, { squash: 1 }),
		b("base", 700),
		b("shut", 120),
		b("base", 480),
		b("base", 500, { squash: 1 })
	],
	blink: () => [b("base", 2400), b("shut", 140)],
	hop: () => [...HOP, b("base", 700)],
	wave: (canWave) => canWave ? [
		b("wave", 220),
		b("sides", 200),
		b("wave", 220),
		b("sides", 200),
		b("wave", 220, { emote: "heart" }),
		b("base", 700, { emote: "heart" })
	] : [
		b("base", 200, { dx: -1 }),
		b("base", 200),
		b("base", 200, { dx: 1 }),
		b("base", 200),
		b("base", 700)
	],
	look: () => [
		b("base", 500),
		b("left", 700, {
			emote: "question",
			left: true
		}),
		b("base", 250),
		b("right", 700, { emote: "question" }),
		b("base", 250),
		b("shut", 120),
		b("base", 400)
	],
	cheer: (canWave) => {
		const arm = canWave ? "laughWave" : "laugh";
		const up = [
			b("laugh", 80, { squash: 1 }),
			b(arm, 60, {
				squash: -1,
				dy: -2,
				stars: true
			}),
			b(arm, 150, {
				dy: -4,
				stars: true
			}),
			b(arm, 70, {
				dy: -3,
				stars: true
			}),
			b("laugh", 90, { squash: 2 })
		];
		return [
			...up,
			...up,
			b(arm, 220, { stars: true }),
			b("laugh", 220),
			b("base", 400)
		];
	},
	sad: () => [
		b("frown", 900, {
			squash: 1,
			drop: true
		}),
		b("frown", 700, {
			squash: 2,
			drop: true
		}),
		b("frown", 900, {
			squash: 1,
			drop: true
		}),
		b("base", 500, { squash: 1 })
	],
	dance: () => [
		b("laugh", 180, {
			dx: -1,
			squash: 1,
			emote: "note",
			left: true
		}),
		b("base", 180, {
			emote: "note",
			left: true
		}),
		b("laugh", 180, {
			dx: 1,
			squash: 1,
			turn: true,
			emote: "note"
		}),
		b("base", 180, {
			turn: true,
			emote: "note"
		})
	],
	squish: () => [
		b("ooh", 90, {
			squash: 2,
			emote: "bang"
		}),
		b("ooh", 80, {
			squash: -2,
			emote: "bang"
		}),
		b("ooh", 80, {
			squash: 1,
			emote: "bang"
		}),
		b("base", 70, { squash: -1 }),
		b("base", 700)
	],
	sleep: () => [
		b("shut", 1100, {
			squash: 1,
			emote: "zzz"
		}),
		b("shut", 1100, {
			emote: "zzz",
			rise: true
		}),
		b("shut", 1100, {
			squash: 1,
			emote: "zzz"
		}),
		b("shut", 1100, {
			emote: "zzz",
			rise: true
		})
	]
};
const EYE_TOKENS = new Set([T.EYE, T.WHITE]);
/** The row the bottom of the eyes sits on, for this guy's shape or skin. */
function eyeLineOf(config) {
	const skin = itemById(config.skin);
	return skin?.slot === "skin" ? skin.eyes : heads[config.head].eyes;
}
/** The bare body, mirrored the same way as the finished guy. */
function bareOf(config) {
	const bare = composeBase(config);
	if (config.flip) for (const row of bare) row.reverse();
	return bare;
}
/** Eye pixels: eye ink and eye shine in the rows the eyes are drawn on. */
function eyeCells(grid, config) {
	const line = eyeLineOf(config);
	const out = [];
	for (let y = Math.max(0, line - 3); y <= line; y++) for (let x = 0; x < GRID_SIZE; x++) if (EYE_TOKENS.has(grid[y][x])) out.push([x, y]);
	return out;
}
/**
* The same guy with his eyes shut: each eye drops to a line on its bottom row
* and the cells it leaves show whatever the body has there. Derived, not
* drawn, so it works for every eye part.
*/
function closeEyes(grid, config) {
	const shut = grid.map((row) => [...row]);
	const bare = bareOf(config);
	const lowest = new Map();
	for (const [x, y] of eyeCells(grid, config)) lowest.set(x, Math.max(lowest.get(x) ?? -1, y));
	for (const [x, y] of eyeCells(grid, config)) shut[y][x] = y === lowest.get(x) ? T.EYE : bare[y][x] ?? 0;
	return shut;
}
/** The same guy glancing sideways: his eye pixels move one column, staying on his face. */
function glance(grid, config, dx) {
	const out = grid.map((row) => [...row]);
	const bare = bareOf(config);
	const cells = eyeCells(grid, config);
	for (const [x, y] of cells) out[y][x] = bare[y][x] ?? 0;
	for (const [x, y] of cells) {
		const nx = x + dx;
		if (nx >= 0 && nx < GRID_SIZE && bare[y][nx]) out[y][nx] = grid[y][x];
	}
	return out;
}
const rgb$3 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$2 = (a, b$1, t) => {
	const x = rgb$3(a), y = rgb$3(b$1);
	return hex([
		0,
		1,
		2
	].map((i) => x[i] + (y[i] - x[i]) * t));
};
/** The order of `AnimationFrame.slots`, from 1. */
const FRAME_SLOTS = [
	"skin",
	"hat",
	"frame",
	"buddy",
	"aura"
];
const slotIndex = (t) => t >= LAYER.aura ? 5 : t >= LAYER.buddy ? 4 : t >= LAYER.frame ? 3 : t >= LAYER.hat ? 2 : t >= LAYER.skin ? 1 : 0;
const empty = () => Array.from({ length: FRAME_HEIGHT }, () => new Array(FRAME_WIDTH).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted(grid, config, palette$1, small = false, face = null) {
	const colors = paint(grid, config, palette$1, small, false);
	const out = empty();
	const eyeBox = face && {
		top: face.top - 1,
		bottom: face.line,
		left: face.eyes[0].left - 1,
		right: face.eyes[face.eyes.length - 1].right + 1
	};
	grid.forEach((row, y) => row.forEach((t, x) => {
		const c = colors[y][x];
		if (!c) return;
		const cell = {
			c,
			item: t >= LAYER.skin && t < LAYER.frame || t >= LAYER.buddy,
			slot: slotIndex(t)
		};
		if (t === T.BODY || t === T.SHADE || t === T.LIGHT) cell.body = true;
		if (eyeBox && y >= eyeBox.top && y <= eyeBox.bottom && x >= eyeBox.left && x <= eyeBox.right && LIVE_EYE_TOKENS.includes(t)) cell.eye = t;
		out[y + HEADROOM][x] = cell;
	}));
	return out;
}
const LIVE_EYE_TOKENS = [
	T.EYE,
	T.WHITE,
	T.ACCENT,
	T.ACCENT_SHADE,
	T.GOLD,
	T.GOLD_SHADE
];
/** Chase eyes that move: one guy in hundreds has them, so they should look it. */
const LIVE_EYES = new Map([
	"galaxy",
	"diamond",
	"dragon"
].map((n) => [eyes.findIndex((e) => e.name === n), n]));
const hue = (h, s, l) => {
	const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
	const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
	return "#" + [
		f(0),
		f(8),
		f(4)
	].map((v) => v.toString(16).padStart(2, "0")).join("");
};
/** A Lucky guy: a rainbow sheen sweeping across his skin every couple of seconds. */
function luckyShimmer(layer, t, seed) {
	const at = cycle(t + seed, 2200) * (FRAME_WIDTH + FRAME_HEIGHT + 14) - 7;
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.body) return;
		const d = Math.abs(x + y * .8 - at);
		if (d < 3) cell.c = mix$2(cell.c, hue(((t * 360 / fit(1800) + (x - y) * 22) % 360 + 360) % 360, .95, .68), d < 1.2 ? .6 : .3);
	}));
}
/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder. */
function liveEyes(layer, kind, t, seed) {
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.eye) return;
		const k = cell.eye;
		if (kind === "galaxy") {
			if (k === T.WHITE) cell.c = wrap(t / steps(160, 5) + x * 3 + y * 2, 5) < 1.2 ? "#FFFFFF" : "#CBB8FF";
			else if (k !== T.EYE) cell.c = hue(255 + 45 * Math.sin(t / wave(380) + x * .9 + y * .7), .8, .55);
		} else if (kind === "diamond") {
			const at = cycle(t + seed, 1400) * 24 - 4, d = Math.abs(x - y * .5 - at);
			if (k !== T.EYE) cell.c = mix$2(cell.c, "#E6FCFF", .25 + .2 * Math.sin(t / wave(250) + x));
			if (d < 1.5) cell.c = mix$2(cell.c, "#FFFFFF", d < .6 ? .9 : .5);
		} else if (kind === "dragon") {
			const flash = cycle(t + seed, 2e3) * fit(2e3) < 160;
			if (k === T.GOLD || k === T.GOLD_SHADE) cell.c = flash ? "#FFF6B0" : mix$2(cell.c, "#FF4A1C", .25 + .3 * (.5 + .5 * Math.sin(t / wave(260))));
		}
	}));
}
/** Loses rows from (or repeats a row of) the body just above the feet; everything above follows. */
function squash(layer, n) {
	if (!n) return layer;
	let last = -1, first = -1;
	layer.forEach((row, y) => {
		if (row.some(Boolean)) {
			if (first < 0) first = y;
			last = y;
		}
	});
	if (last < 0) return layer;
	const r = Math.max(first + 2, last - 3);
	const rows = layer.map((row) => [...row]);
	if (n > 0) {
		const blank = Array.from({ length: n }, () => new Array(FRAME_WIDTH).fill(null));
		return [
			...blank,
			...rows.slice(0, r - n + 1),
			...rows.slice(r + 1)
		];
	}
	const k = -n;
	return [
		...rows.slice(k, r + 1),
		...Array.from({ length: k }, () => [...rows[r]]),
		...rows.slice(r + 1)
	];
}
function shift(layer, dx, dy) {
	const out = empty();
	layer.forEach((row, y) => row.forEach((cell, x) => {
		const nx = x + dx, ny = y + dy;
		if (cell && nx >= 0 && ny >= 0 && nx < FRAME_WIDTH && ny < FRAME_HEIGHT) out[ny][nx] = cell;
	}));
	return out;
}
const NEIGHBOURS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/** Empty cells touching the guy. */
function rim(layer) {
	const out = [];
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
		if (layer[y][x]) continue;
		if (NEIGHBOURS.some(([dx, dy]) => layer[y + dy]?.[x + dx])) out.push([x, y]);
	}
	return out;
}
/** A four-point twinkle, only where there is nothing. */
function twinkle(layer, x, y, centre, arms) {
	const cells = [
		[
			x,
			y,
			centre
		],
		[
			x - 1,
			y,
			arms
		],
		[
			x + 1,
			y,
			arms
		],
		[
			x,
			y - 1,
			arms
		],
		[
			x,
			y + 1,
			arms
		]
	];
	if (!cells.every(([cx, cy]) => cx >= 0 && cy >= 0 && cx < FRAME_WIDTH && cy < FRAME_HEIGHT && !layer[cy][cx])) return;
	for (const [cx, cy, c] of cells) layer[cy][cx] = {
		c,
		item: false
	};
}
const mouthIndex = (name) => Math.max(0, mouths.findIndex((m) => m.name === name));
/** `#` is the emote's colour, `+` its second colour. */
const EMOTES = {
	note: {
		rows: [
			".##",
			".#.",
			"##.",
			"##."
		],
		color: "#FFE27A"
	},
	question: {
		rows: [
			"###",
			"..#",
			".#.",
			"...",
			".#."
		],
		color: "#FFFFFF"
	},
	bang: {
		rows: [
			"#",
			"#",
			"#",
			".",
			"#"
		],
		color: "#FF6B6B"
	},
	heart: {
		rows: [
			"##.##",
			"#####",
			".###.",
			"..#.."
		],
		color: "#FF6FA0"
	},
	zzz: {
		rows: [
			"###",
			"..#",
			".#.",
			"###"
		],
		color: "#BFD8FF"
	},
	crown: {
		rows: [
			"#.#.#",
			"#####",
			"#+#+#"
		],
		color: "#FFD447",
		accent: "#FF6B6B"
	},
	fire: {
		rows: [
			".#.",
			"##.",
			"#+#",
			"#++",
			".#."
		],
		color: "#FF7A3D",
		accent: "#FFE27A"
	}
};
/** Puts an emote, outlined, in a top corner that is clear of him. */
function emote(layer, kind, left, lift = 0) {
	const { rows, color, accent } = EMOTES[kind];
	const w = rows[0].length + 2, h = rows.length + 2;
	const spots = [
		[FRAME_WIDTH - w, 0],
		[0, 0],
		[FRAME_WIDTH - w, 1],
		[0, 1],
		[FRAME_WIDTH - w, 2],
		[0, 2]
	].map(([x, y]) => [x, Math.max(0, y + 1 - lift)]);
	if (left) spots.sort((a, b$1) => a[0] - b$1[0]);
	const ink = (ch) => ch === "#" || ch === "+";
	const at = ([x0, y0]) => {
		const cells = [];
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			const ch = rows[y - 1]?.[x - 1];
			const on = ink(ch);
			const near = !on && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
			if (on || near) cells.push([
				x0 + x,
				y0 + y,
				on ? ch === "+" ? accent ?? color : color : "#1B1428"
			]);
		}
		return cells;
	};
	const clear = spots.map(at).find((cells) => cells.every(([x, y]) => y < FRAME_HEIGHT && !layer[y][x]));
	for (const [x, y, c] of clear ?? at([spots[0][0], 0])) if (y < FRAME_HEIGHT) layer[y][x] = {
		c,
		item: false
	};
}
/** Where a Lucky guy's gold twinkles go. */
const LUCKY_SPOTS = [
	[2, 5],
	[13, 4],
	[14, 14],
	[1, 15]
];
/** Where sparkles may go: around the guy, clear of him. */
const SPARKLE_SPOTS = [
	[2, 6],
	[13, 8],
	[1, 13],
	[14, 15],
	[7, 1],
	[2, 18],
	[13, 2],
	[12, 18]
];
/**
* Builds the frames of a move for the guy `input` would render as. Takes the
* same options as `toSvgString` (game, equip, parts, palette).
*/
function animate(input, move, options = {}) {
	const config = dress(resolve(input, options.parts), options, input);
	const palette$1 = withItems(options.palette ?? paletteOf(config), config);
	const figure = {
		...config,
		frame: void 0,
		aura: void 0
	};
	const wornAura = auraById(itemById(config.aura)?.slot === "aura" ? config.aura : void 0);
	const fxCopies = FRAME_SLOTS.map((slot) => config.owned?.[slot]);
	const withFx = fxCopies.some((o) => o?.fx);
	const lucky = !!config.lucky && options.rarity !== false && !options.small;
	const liveEye = options.small ? void 0 : LIVE_EYES.get(config.eyes);
	const grids = new Map();
	const grid = (pose) => {
		if (!grids.has(pose)) {
			const base = compose(figure);
			grids.set(pose, pose === "base" ? base : pose === "shut" ? closeEyes(base, config) : pose === "left" ? glance(base, config, -1) : pose === "right" ? glance(base, config, 1) : pose === "laugh" ? compose({
				...figure,
				mouth: mouthIndex("laugh")
			}) : pose === "laughWave" ? compose({
				...figure,
				mouth: mouthIndex("laugh"),
				arms: 2
			}) : pose === "frown" ? closeEyes(compose({
				...figure,
				mouth: mouthIndex("wobble")
			}), config) : pose === "ooh" ? compose({
				...figure,
				mouth: mouthIndex("ooh")
			}) : compose({
				...figure,
				arms: pose === "wave" ? 2 : 1
			}));
		}
		return grids.get(pose);
	};
	const canWave = JSON.stringify(grid("wave")) !== JSON.stringify(grid("sides"));
	const layers = new Map();
	const layerOf = (pose) => {
		if (!layers.has(pose)) layers.set(pose, painted(grid(pose), config, palette$1, !!options.small, liveEye ? faceOf(figure) : null));
		return layers.get(pose);
	};
	let backdrop = null;
	const frameItem = itemById(config.frame);
	if (frameItem?.slot === "frame") {
		const tall = Array.from({ length: GRID_SIZE + HEADROOM * 2 }, (_, y) => Array.from({ length: GRID_SIZE }, (_$1, x) => LAYER.frame + frameItem.fill(x, y + 48) - 1));
		const colors = paint(tall, config, palette$1, false, false);
		backdrop = Array.from({ length: FRAME_HEIGHT }, (_, y) => colors[y < HEADROOM ? GRID_SIZE - HEADROOM + y : y - HEADROOM]);
	}
	const copies = Object.entries(config.owned ?? {}).filter(([slot, o]) => o && slot !== "aura").map(([, o]) => o);
	const grade = options.rarity === false || !copies.length ? -1 : Math.max(...copies.map((o) => GRADES.findIndex((g) => g.id === gradeOf(o).id)));
	const gradeColor = grade >= 0 ? GRADES[grade].color : "#FFFFFF";
	const seed = hash(input) % 997;
	const beats = BEATS[move](canWave);
	const timed = !!(wornAura || withFx || lucky || liveEye || grade >= 1 || options.emote);
	const loop = options.loop, laps = loop ? loop.repeats + 1 : 1;
	const lapMs = beats.reduce((n, b$1) => n + b$1.ms, 0), span = loop ? lapMs * loop.repeats : 0;
	const clock = (ms) => loop ? ms * loop.turns * LOOP_MS % (LOOP_MS * span) / span : ms;
	const slices = [];
	let t = 0;
	for (let lap = 0; lap < laps; lap++) for (const beat of beats) {
		let n = wornAura || withFx || lucky || liveEye ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
		if (loop?.fine) n = Math.max(n, Math.ceil(beat.ms / 80));
		for (let i = 0; i < n; i++) {
			const ms = Math.round(beat.ms * (i + 1) / n) - Math.round(beat.ms * i / n);
			slices.push({
				beat,
				ms,
				t: clock(t),
				lap
			});
			t += ms;
		}
	}
	const trailFrom = grade >= 3 && !wornAura ? [mix$2(gradeColor, "#000000", .2), mix$2(gradeColor, "#000000", .55)] : [];
	const behind = [];
	const all = slices.map(({ beat, ms, t: t$1 }) => {
		let layer = layerOf(beat.pose);
		if (beat.turn) layer = layer.map((row) => [...row].reverse());
		layer = squash(layer, beat.squash ?? 0);
		layer = shift(layer, beat.dx ?? 0, beat.dy ?? 0);
		const figure$1 = layer;
		layer = layer.map((row) => row.map((cell) => cell ? { ...cell } : null));
		if (trailFrom.length && (beat.dy ?? 0) < 0) behind.forEach((past, k) => past.forEach((row, y) => row.forEach((cell, x) => {
			if (cell && !layer[y][x] && (x + y + k) % 2 === 0) layer[y][x] = {
				c: trailFrom[k],
				item: false
			};
		})));
		behind.unshift(figure$1);
		behind.length = Math.min(behind.length, 2);
		if (grade >= 1) {
			const at = cycle(t$1 + seed, 1600) * (FRAME_WIDTH + FRAME_HEIGHT + 8) - 4;
			layer.forEach((row, y) => row.forEach((cell, x) => {
				if (!cell?.item) return;
				const d = Math.abs(x + y - at);
				if (d < 1) cell.c = mix$2(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix$2(cell.c, "#FFFFFF", .25);
			}));
		}
		if (lucky) luckyShimmer(layer, t$1, seed);
		if (liveEye) liveEyes(layer, liveEye, t$1, seed);
		if (lucky && !wornAura && grade < 3) LUCKY_SPOTS.forEach(([x, y], k) => {
			if (wrap(t$1 / steps(260, 3) + k * 1.3 + seed, 3) < 1) twinkle(layer, x, y, "#FFFFFF", "#FFD45C");
		});
		const aura = grade >= 2 ? rim(layer) : [];
		if (beat.stars) {
			const gold = palette$1.colors[T.GOLD] ?? "#F2C230";
			twinkle(layer, 2, 3, "#FFFFFF", gold);
			twinkle(layer, 13, 2, "#FFFFFF", gold);
			if (Math.floor(wrap(t$1, fit(240)) / (fit(240) / 2)) % 2) twinkle(layer, 8, 1, "#FFFFFF", gold);
		}
		if (beat.drop) {
			let top = -1;
			layer.forEach((row$1, y) => {
				if (top < 0 && row$1.some(Boolean)) top = y;
			});
			const row = layer[top + 2];
			const right = row ? row.reduce((r, cell, x) => cell ? x : r, -1) : -1;
			for (const [x, y, c] of [[
				right + 1,
				top + 1,
				"#CFEFFF"
			], [
				right + 1,
				top + 2,
				"#7CC4F2"
			]]) if (right >= 0 && x < FRAME_WIDTH && y >= 0 && !layer[y][x]) layer[y][x] = {
				c,
				item: false
			};
		}
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(wrap(t$1, fit(800)) / (fit(800) / 2)) % 2);
		const outside = [];
		if (wornAura) {
			const copy = config.owned?.aura, mask = layer.map((row) => row.map(Boolean));
			for (const [x, y, k] of auraCells(wornAura.id, mask, t$1, copy, AURA_PAD)) {
				const c = copy ? auraColor(wornAura.id, k, copy.finish, x, y, t$1) : wornAura.colors[k];
				if (x < 0 || x >= FRAME_WIDTH) outside.push([
					x,
					y,
					c
				]);
				else layer[y][x] = {
					c,
					item: false,
					slot: 5
				};
			}
		} else if (grade >= 2) {
			const on = Math.floor(wrap(t$1 + seed, fit(640)) / (fit(640) / 2)) % 2 === 0;
			const ring = grade === 4 ? on ? "#FFE27A" : "#E4AE39" : on ? gradeColor : mix$2(gradeColor, "#000000", .35);
			for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = {
				c: ring,
				item: false
			};
		}
		if (grade >= 3 && !wornAura) {
			const count$1 = grade === 4 ? 4 : 3;
			SPARKLE_SPOTS.slice(0, count$1 + 2).forEach(([x, y], k) => {
				if (wrap(t$1 / steps(240, 4) + k * 1.7 + seed, 4) < 1) twinkle(layer, x, y, "#FFFFFF", grade === 4 ? "#FFE27A" : gradeColor);
			});
		}
		const flat = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop?.[y][x] ?? null));
		const slots = layer.map((row, y) => row.map((cell, x) => cell ? cell.slot ?? 0 : backdrop?.[y][x] ? 3 : 0));
		const colors = withFx ? applyFx(flat, slots, fxCopies, t$1) : flat;
		return outside.length ? {
			colors,
			ms,
			slots,
			outside,
			at: t$1
		} : {
			colors,
			ms,
			slots,
			at: t$1
		};
	});
	const frames = loop ? all.filter((_, i) => slices[i].lap > 0) : all;
	return {
		move,
		width: FRAME_WIDTH,
		height: FRAME_HEIGHT,
		frames,
		duration: frames.reduce((n, f) => n + f.ms, 0),
		timed
	};
}
/**
* The move as a loop that closes perfectly: as it is when nothing moves on its
* own clock, else played the whole number of times that fits whole turns of
* LOOP_MS (`fitLoop`). What to hand `frameAt`, a player or an animated SVG.
*/
function animateLoop(input, move, options = {}) {
	const plain = animate(input, move, options);
	if (!plain.timed) return plain;
	const { repeats, turns } = fitLoop(plain.duration);
	return animate(input, move, {
		...options,
		loop: {
			repeats,
			turns
		}
	});
}
/** The frame showing `ms` into the animation, looping unless `once`. */
function frameAt(animation, ms, once = false) {
	const { frames, duration } = animation;
	let t = once ? Math.min(ms, duration - 1) : (ms % duration + duration) % duration;
	for (const frame of frames) {
		if (t < frame.ms) return frame;
		t -= frame.ms;
	}
	return frames[frames.length - 1];
}
/** Draws a frame at (x, y), each pixel `scale` units square. */
function drawFrame(ctx, frame, x = 0, y = 0, scale$1 = 1) {
	frame.colors.forEach((row, py) => row.forEach((c, px) => {
		if (!c) return;
		ctx.fillStyle = c;
		ctx.fillRect(x + px * scale$1, y + py * scale$1, scale$1, scale$1);
	}));
}
function runs(row) {
	const out = [];
	let start = 0, current = null;
	for (let x = 0; x <= row.length; x++) {
		const c = x < row.length ? row[x] : null;
		if (c === current) continue;
		if (current !== null) out.push({
			x: start,
			width: x - start,
			color: current
		});
		current = c;
		start = x;
	}
	return out;
}
/**
* The animation as one self-contained SVG: every frame is a group, and a CSS
* animation shows them in turn. Works as an <img>, inline, or as a file.
*/
function toAnimatedSvg(input, move, options = {}) {
	const anim = animateLoop(input, move, options);
	const size = options.size ?? 128;
	const id = `lg${hash(`${input}|${move}|${JSON.stringify({
		...options,
		size: 0
	})}`).toString(36)}`;
	const pct = (ms) => +(ms / anim.duration * 100).toFixed(3);
	let at = 0;
	const css = [`.${id} g{visibility:hidden;animation-duration:${anim.duration}ms;animation-timing-function:step-end;animation-iteration-count:${options.once ? 1 : "infinite"};animation-fill-mode:${options.once ? "forwards" : "none"}}`];
	const groups = anim.frames.map((frame, i) => {
		const start = pct(at), end = pct(at + frame.ms);
		at += frame.ms;
		const last = i === anim.frames.length - 1;
		const keys = i === 0 ? `0%{visibility:visible}${end}%{visibility:hidden}${last ? "" : "100%{visibility:hidden}"}` : `0%{visibility:hidden}${start}%{visibility:visible}${last ? "100%{visibility:visible}" : `${end}%{visibility:hidden}100%{visibility:hidden}`}`;
		css.push(`.${id} .f${i}{animation-name:${id}-${i}}@keyframes ${id}-${i}{${keys}}`);
		const rects = frame.colors.flatMap((row, y) => runs(row).map((r) => `<rect x="${r.x}" y="${y}" width="${r.width}" height="1" fill="${r.color}"/>`));
		return `<g class="f${i}">${rects.join("")}</g>`;
	});
	if (options.stillWhenReduced) css.push(`@media (prefers-reduced-motion: reduce){.${id} g{animation:none}.${id} .f0{visibility:visible}}`);
	const labelled = typeof options.title === "string" && options.title.length > 0;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" class="${id}" width="${size}" height="${size * FRAME_HEIGHT / FRAME_WIDTH}" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}" shape-rendering="crispEdges"${labelled ? " role=\"img\"" : " role=\"presentation\" aria-hidden=\"true\""}>`,
		labelled ? `<title>${options.title.replace(/[&<>]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;")}</title>` : "",
		`<style>${css.join("")}</style>`,
		...groups,
		"</svg>"
	].join("");
}

//#endregion
//#region src/lil-guy.tsx
const INTENSITY_PRESETS = {
	none: {
		rotateRange: 0,
		translateZ: 0,
		perspective: "none"
	},
	subtle: {
		rotateRange: 5,
		translateZ: 4,
		perspective: "800px"
	},
	medium: {
		rotateRange: 10,
		translateZ: 8,
		perspective: "500px"
	},
	dramatic: {
		rotateRange: 15,
		translateZ: 12,
		perspective: "300px"
	}
};
const SPHERE_POSITIONS = [
	{
		x: -1,
		y: 1
	},
	{
		x: 1,
		y: 1
	},
	{
		x: 1,
		y: 0
	},
	{
		x: 0,
		y: 1
	},
	{
		x: -1,
		y: 0
	},
	{
		x: 0,
		y: 0
	},
	{
		x: 0,
		y: -1
	},
	{
		x: -1,
		y: -1
	},
	{
		x: 1,
		y: -1
	}
];
/**
* Both the blink and the hover tilt stop under `prefers-reduced-motion`. The
* avatar still renders and still reacts to hover, it just doesn't move —
* animation a viewer can't switch off is an accessibility problem, and this is
* the standard way for them to ask.
*/
const BLINK_KEYFRAMES = `
@media (prefers-reduced-motion: reduce) {
  [data-lil-guy] * { animation: none !important; transition: none !important; }
}
@keyframes lilguy-eyes-open {
  0%, 93%, 100% { opacity: 1; }
  95%, 98% { opacity: 0; }
}
@keyframes lilguy-eyes-shut {
  0%, 93%, 100% { opacity: 0; }
  95%, 98% { opacity: 1; }
}`;
let blinkInjected = false;
function injectBlinkKeyframes() {
	if (blinkInjected || typeof document === "undefined") return;
	const style = document.createElement("style");
	style.textContent = BLINK_KEYFRAMES;
	document.head.appendChild(style);
	blinkInjected = true;
}
/**
* LilGuy - Deterministic pixel art avatars from any string.
*
* @example
* ```tsx
* // Simple
* <LilGuy name="alice@example.com" />
*
* // Customized
* <LilGuy name="alice" size={64} shape="square" />
*
* // Pin specific parts
* <LilGuy name="alice" parts={{ hair: 2, eyes: 0 }} />
* ```
*/
const LilGuy = React$5.forwardRef(({ name, size = 40, shape = "circle", variant = "transparent", interactive = true, palette: customPalette, parts: partOverrides, game, equip, intensity3d = "dramatic", enableBlink = false, colors, colorClasses, gradientOverlayClass, showInitial = false, onRenderMouth, className, style, onMouseEnter, onMouseLeave,...props }, ref) => {
	const [isHovered, setIsHovered] = React$5.useState(false);
	React$5.useEffect(() => {
		if (enableBlink || interactive) injectBlinkKeyframes();
	}, [enableBlink, interactive]);
	const { rects, shutRects, bgColor, config, hashValue } = React$5.useMemo(() => {
		const cfg = dress(resolve(name, partOverrides), {
			game,
			equip
		}, name);
		const palette$1 = withItems(customPalette ?? paletteOf(cfg), cfg);
		const grid = compose(cfg);
		const hv = hash(name);
		const toRects = (source, keyPrefix) => {
			const out = [];
			const colors$1 = paint(source, cfg, palette$1, typeof size === "number" && size <= SMALL_SIZE);
			for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
				const color = colors$1[y][x];
				if (color) out.push(/* @__PURE__ */ jsx(
					"rect",
					// the body highlight: a soft tint of the body colour
					{
						x,
						y,
						width: 1,
						height: 1,
						fill: color
					},
					`${keyPrefix}${x}-${y}`
));
			}
			return out;
		};
		const shut = closeEyes(grid, cfg);
		return {
			rects: toRects(grid, ""),
			shutRects: toRects(shut, "s"),
			bgColor: palette$1.colors[3],
			config: cfg,
			hashValue: hv
		};
	}, [
		name,
		customPalette,
		partOverrides,
		game,
		equip?.join(","),
		size
	]);
	const preset = INTENSITY_PRESETS[intensity3d];
	const position = SPHERE_POSITIONS[config.rotation] ?? SPHERE_POSITIONS[5];
	const rotateX = isHovered && interactive ? 0 : position.y * preset.rotateRange;
	const rotateY = isHovered && interactive ? 0 : position.x * preset.rotateRange;
	const blinkSeed = hashValue * 31;
	const blinkDelay = blinkSeed % 40 / 10;
	const blinkDuration = 2 + blinkSeed % 40 / 10;
	const sizeValue = typeof size === "number" ? `${size}px` : size;
	const resolvedBgColor = colors?.[0] ?? bgColor;
	const handleMouseEnter = React$5.useCallback((e) => {
		if (interactive) setIsHovered(true);
		onMouseEnter?.(e);
	}, [interactive, onMouseEnter]);
	const handleMouseLeave = React$5.useCallback((e) => {
		if (interactive) setIsHovered(false);
		onMouseLeave?.(e);
	}, [interactive, onMouseLeave]);
	return /* @__PURE__ */ jsxs("div", {
		className,
		"data-lil-guy": "",
		"data-interactive": interactive || void 0,
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		ref,
		style: {
			width: sizeValue,
			height: sizeValue,
			position: "relative",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
			borderRadius: shape === "circle" ? "50%" : void 0,
			containerType: "size",
			perspective: preset.perspective,
			...variant === "solid" && { backgroundColor: resolvedBgColor },
			...style
		},
		...props,
		children: [
			variant === "gradient" && /* @__PURE__ */ jsx("div", {
				className: gradientOverlayClass ?? colorClasses?.[0],
				"data-lil-guy-gradient": "",
				style: {
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					zIndex: 1,
					background: gradientOverlayClass || colorClasses?.[0] ? resolvedBgColor : `radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%), ${resolvedBgColor}`
				}
			}),
			/* @__PURE__ */ jsxs("div", {
				"data-lil-guy-face": "",
				style: {
					width: "100%",
					height: "100%",
					position: "relative",
					zIndex: 2,
					transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${preset.translateZ}px)`,
					transformStyle: "preserve-3d",
					transition: interactive ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : void 0
				},
				children: [/* @__PURE__ */ jsx("div", {
					style: {
						width: "100%",
						height: "100%"
					},
					children: /* @__PURE__ */ jsxs("svg", {
						"aria-hidden": "true",
						xmlns: "http://www.w3.org/2000/svg",
						viewBox: `0 0 ${GRID_SIZE} ${GRID_SIZE}`,
						shapeRendering: "crispEdges",
						style: {
							width: "100%",
							height: "100%",
							transform: isHovered && interactive ? "scale(1.08)" : void 0,
							transition: interactive ? "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)" : void 0,
							imageRendering: "pixelated"
						},
						children: [/* @__PURE__ */ jsx("g", {
							style: { animation: enableBlink ? `lilguy-eyes-open ${blinkDuration}s ease-in-out ${blinkDelay}s infinite` : void 0 },
							children: rects
						}), enableBlink ? /* @__PURE__ */ jsx("g", {
							style: { animation: `lilguy-eyes-shut ${blinkDuration}s ease-in-out ${blinkDelay}s infinite` },
							children: shutRects
						}) : null]
					})
				}), onRenderMouth?.()]
			}),
			showInitial && name.length > 0 && /* @__PURE__ */ jsx("div", {
				"data-lil-guy-initial": "",
				style: {
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 3,
					fontSize: "50cqw",
					lineHeight: 1,
					fontWeight: 700,
					color: "rgba(255,255,255,0.7)",
					pointerEvents: "none",
					textTransform: "uppercase"
				},
				children: name[0]
			})
		]
	});
});
LilGuy.displayName = "LilGuy";

//#endregion
//#region src/avatar.tsx
const AvatarContext = React$4.createContext(null);
/**
* Hook to access the Avatar context.
* Throws an error if used outside of Avatar.
*/
const useAvatarContext = () => {
	const context = React$4.useContext(AvatarContext);
	if (!context) throw new Error("Avatar compound components must be rendered within an Avatar component");
	return context;
};
/**
* Root avatar component that provides context for image loading state.
*
* @example
* ```tsx
* <Avatar className="w-10 h-10 rounded-full overflow-hidden">
*   <AvatarImage src="/photo.jpg" alt="John" />
*   <AvatarFallback name="John Doe" />
* </Avatar>
* ```
*/
const Avatar = React$4.forwardRef(({ children, className, style, asChild: _asChild,...props }, ref) => {
	const [imageLoadingStatus, setImageLoadingStatus] = React$4.useState("idle");
	const contextValue = React$4.useMemo(() => ({
		imageLoadingStatus,
		onImageLoadingStatusChange: setImageLoadingStatus
	}), [imageLoadingStatus]);
	return /* @__PURE__ */ jsx(AvatarContext.Provider, {
		value: contextValue,
		children: /* @__PURE__ */ jsx("span", {
			ref,
			className,
			style: {
				position: "relative",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				overflow: "hidden",
				...style
			},
			"data-avatar": "",
			"data-state": imageLoadingStatus,
			...props,
			children
		})
	});
});
Avatar.displayName = "Avatar";

//#endregion
//#region src/avatar-fallback.tsx
const WHITESPACE_REGEX = /\s+/;
/**
* Extracts initials from a name string.
*/
function getInitials(name) {
	const parts = name.trim().split(WHITESPACE_REGEX);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || "";
	const firstInitial = parts[0]?.charAt(0) || "";
	const lastInitial = parts.at(-1)?.charAt(0) || "";
	return (firstInitial + lastInitial).toUpperCase();
}
/**
* Fallback component that displays when the image fails to load.
* Uses LilGuy pixel avatar by default, can show initials or custom content.
*
* @example
* ```tsx
* // With LilGuy pixel avatar (default)
* <AvatarFallback name="John Doe" />
*
* // With initials
* <AvatarFallback name="John Doe" lilGuy={false} />
*
* // With custom content
* <AvatarFallback>
*   <UserIcon />
* </AvatarFallback>
* ```
*/
const AvatarFallback = React$3.forwardRef(({ name = "", delayMs = 0, children, lilGuy = true, lilGuyProps, className, style,...props }, ref) => {
	const { imageLoadingStatus } = useAvatarContext();
	const [canRender, setCanRender] = React$3.useState(delayMs === 0);
	React$3.useEffect(() => {
		if (delayMs > 0) {
			const timerId = window.setTimeout(() => setCanRender(true), delayMs);
			return () => window.clearTimeout(timerId);
		}
	}, [delayMs]);
	const initials = React$3.useMemo(() => getInitials(name), [name]);
	const shouldRender = canRender && imageLoadingStatus !== "loaded" && imageLoadingStatus !== "loading";
	if (!shouldRender) return null;
	if (children) return /* @__PURE__ */ jsx("span", {
		className,
		"data-avatar-fallback": "",
		ref,
		style: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			width: "100%",
			height: "100%",
			...style
		},
		...props,
		children
	});
	if (lilGuy) return /* @__PURE__ */ jsx(LilGuy, {
		className,
		"data-avatar-fallback": "",
		name,
		ref,
		size: "100%",
		...lilGuyProps,
		style: { ...style },
		...props
	});
	return /* @__PURE__ */ jsx("span", {
		className,
		"data-avatar-fallback": "",
		ref,
		style: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			width: "100%",
			height: "100%",
			...style
		},
		...props,
		children: initials
	});
});
AvatarFallback.displayName = "AvatarFallback";

//#endregion
//#region src/avatar-image.tsx
/**
* Image component that syncs its loading state with the Avatar context.
* Automatically hides when loading fails, allowing fallback to show.
*
* @example
* ```tsx
* <Avatar>
*   <AvatarImage src="/photo.jpg" alt="User" />
*   <AvatarFallback name="John Doe" />
* </Avatar>
* ```
*/
const AvatarImage = React$2.forwardRef(({ src, alt = "", className, style, onLoadingStatusChange,...props }, ref) => {
	const { imageLoadingStatus, onImageLoadingStatusChange } = useAvatarContext();
	const imageRef = React$2.useRef(null);
	React$2.useImperativeHandle(ref, () => imageRef.current);
	const updateStatus = React$2.useCallback((status) => {
		onImageLoadingStatusChange(status);
		onLoadingStatusChange?.(status);
	}, [onImageLoadingStatusChange, onLoadingStatusChange]);
	React$2.useLayoutEffect(() => {
		if (!src) {
			updateStatus("error");
			return;
		}
		let isMounted = true;
		const image = new Image();
		const setStatus = (status) => {
			if (!isMounted) return;
			updateStatus(status);
		};
		setStatus("loading");
		image.onload = () => setStatus("loaded");
		image.onerror = () => setStatus("error");
		image.src = src;
		return () => {
			isMounted = false;
		};
	}, [src, updateStatus]);
	if (imageLoadingStatus !== "loaded") return null;
	return /* @__PURE__ */ jsx("img", {
		alt,
		className,
		"data-avatar-image": "",
		ref: imageRef,
		src: src ?? void 0,
		style: {
			aspectRatio: "1 / 1",
			width: "100%",
			height: "100%",
			objectFit: "cover",
			...style
		},
		...props
	});
});
AvatarImage.displayName = "AvatarImage";

//#endregion
//#region src/render-string.ts
/**
* Collapses each row into horizontal runs of one colour.
*
* A pixel-per-rect SVG spends most of its bytes repeating coordinates for
* neighbours that share a colour — these avatars are large flat areas, so
* merging runs cuts the rect count by well over half.
*/
function rowRuns(colors, y) {
	const runs$1 = [];
	let start = -1;
	let current = null;
	for (let x = 0; x <= GRID_SIZE; x++) {
		const color = x < GRID_SIZE ? colors[y][x] : null;
		if (color === current) continue;
		if (current !== null) runs$1.push({
			x: start,
			width: x - start,
			color: current
		});
		current = color;
		start = x;
	}
	return runs$1;
}
function escapeText(value) {
	return value.replace(/[&<>]/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;");
}
/**
* Generates a complete SVG string for a lil_guy avatar.
* Works anywhere — no React or DOM required.
*
* Without `title` the SVG is marked decorative, which is right when the avatar
* sits next to the name it stands for. Pass `title` when it is the only thing
* identifying that person.
*/
/** The smallest square round the drawn pixels, centred on them, kept inside the grid. */
function bounds(colors, margin) {
	let left = GRID_SIZE, right = -1, top = GRID_SIZE, bottom = -1;
	colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c) return;
		left = Math.min(left, x);
		right = Math.max(right, x);
		top = Math.min(top, y);
		bottom = Math.max(bottom, y);
	}));
	if (right < 0) return {
		x: 0,
		y: 0,
		side: GRID_SIZE
	};
	const side = Math.min(GRID_SIZE, Math.max(right - left, bottom - top) + 1 + margin);
	const at = (lo, hi) => Math.max(0, Math.min(GRID_SIZE - side, Math.floor((lo + hi + 1 - side) / 2)));
	return {
		x: at(left, right),
		y: at(top, bottom),
		side
	};
}
function toSvgString(input, options = {}) {
	const config = dress(resolve(input, options.parts), options, input);
	const palette$1 = withItems(options.palette ?? paletteOf(config), config);
	const size = options.size ?? 128;
	const small = options.small ?? size <= SMALL_SIZE;
	const colors = paint(compose(config), config, palette$1, small);
	const box = small ? bounds(colors, options.square ? 0 : 3) : {
		x: 0,
		y: 0,
		side: GRID_SIZE
	};
	const pixelSize = size / box.side;
	const rects = [];
	for (let y = 0; y < GRID_SIZE; y++) for (const run of rowRuns(colors, y)) rects.push(`<rect x="${(run.x - box.x) * pixelSize}" y="${(y - box.y) * pixelSize}" width="${run.width * pixelSize}" height="${pixelSize}" fill="${run.color}"/>`);
	const round = options.square ? "" : `<clipPath id="clip"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath>`;
	const groupOpen = options.square ? "<g>" : "<g clip-path=\"url(#clip)\">";
	const labelled = typeof options.title === "string" && options.title.length > 0;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"${labelled ? " role=\"img\"" : " role=\"presentation\" aria-hidden=\"true\""}>`,
		labelled ? `<title>${escapeText(options.title)}</title>` : "",
		round ? `<defs>${round}</defs>` : "",
		groupOpen,
		...rects,
		"</g>",
		"</svg>"
	].join("");
}

//#endregion
//#region src/export-png.ts
/**
* Renders a lil_guy avatar to a PNG data URL.
* Browser-only — requires canvas and Image APIs.
*/
async function toPng(input, options = {}) {
	const size = options.size ?? 128;
	const svg = toSvgString(input, {
		...options,
		size
	});
	const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	try {
		const img = new Image();
		img.width = size;
		img.height = size;
		await new Promise((resolve$1, reject) => {
			img.onload = () => resolve$1();
			img.onerror = reject;
			img.src = url;
		});
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context not available");
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, size, size);
		return canvas.toDataURL("image/png");
	} finally {
		URL.revokeObjectURL(url);
	}
}

//#endregion
//#region src/utils/merge-refs.ts
/**
* Merges multiple refs into a single callback ref.
* Useful for forwarding refs to a component while also using a local ref.
*/
function mergeRefs(refs) {
	const filteredRefs = refs.filter((ref) => ref != null);
	if (filteredRefs.length === 0) return null;
	if (filteredRefs.length === 1) {
		const ref = filteredRefs[0];
		if (typeof ref === "function") return ref;
		return (instance) => {
			ref.current = instance;
		};
	}
	return (instance) => {
		for (const ref of filteredRefs) if (typeof ref === "function") ref(instance);
		else if (ref != null) ref.current = instance;
	};
}
/**
* Hook version of mergeRefs that memoizes the result.
*/
function useMergeRefs(refs) {
	return React$1.useMemo(() => mergeRefs(refs), refs);
}

//#endregion
//#region src/utils/colors.ts
/** Default background colors for avatar containers (Tailwind 500 equivalents) */
const DEFAULT_COLORS = [
	"#ec4899",
	"#f59e0b",
	"#3b82f6",
	"#f97316",
	"#10b981"
];
/** Light mode variants (Tailwind 100 equivalents) */
const DEFAULT_COLORS_LIGHT = [
	"#fce7f3",
	"#fef3c7",
	"#dbeafe",
	"#ffedd5",
	"#d1fae5"
];
/** Dark mode variants (Tailwind 600 equivalents) */
const DEFAULT_COLORS_DARK = [
	"#db2777",
	"#d97706",
	"#2563eb",
	"#ea580c",
	"#059669"
];
const FALLBACK_COLOR = "#ec4899";
/** Get a color from an array by index (wraps around) */
function getColor(colors, index) {
	const palette$1 = colors.length > 0 ? colors : DEFAULT_COLORS;
	return palette$1[index % palette$1.length] ?? FALLBACK_COLOR;
}

//#endregion
//#region src/guy-rank.ts
/** [a guy's `guyScore`, the share of guys scoring at least that], commonest first. */
const GUY_RANK = [
	[7.9742, 1],
	[10.5628, .9],
	[11.235, .75],
	[11.7071, .6],
	[11.996, .5],
	[12.291, .4],
	[12.6129, .3],
	[12.7975, .25],
	[13.0081, .2],
	[13.2647, .15],
	[13.6031, .1],
	[13.8347, .075],
	[14.1544, .05],
	[14.5476, .03],
	[14.851, .02],
	[15.345, .01],
	[15.5431, .0075],
	[15.8206, .005],
	[16.1397, .003],
	[16.3825, .002],
	[16.7359, .001],
	[17.1098, 5e-4],
	[17.5923, 2e-4],
	[17.9111, 1e-4],
	[18.162, 5e-5],
	[18.6492, 2e-5],
	[19.0382, 1e-5]
];

//#endregion
//#region src/rarity.ts
/**
* How rare things are, as "one in N".
*
* A guy's rarity is the chance of rolling his exact combination of visible
* traits — shape, eyes, mouth, cheeks, topper, markings, accessory, colourway,
* tone, arms, feet and whether he is Lucky — so a laser-eyed guy in a crown is rarer than one with bean eyes
* and no hat. A copy's rarity is the chance a capsule gives exactly that: its
* item, its finish, a print as special as its print, a scuff at least as low
* as its scuff, and a tally if it has one.
*/
/** The twelve traits, in the order `traitOdds` lists them. */
const TRAIT_SLOTS = [
	"shape",
	"eyes",
	"mouth",
	"cheeks",
	"topper",
	"markings",
	"accessory",
	"colour",
	"tone",
	"arms",
	"feet",
	"lucky"
];
/** Names for the traits that are only an index: tone (`shade`), arms and feet. */
const TONE_NAMES = [
	"pastel",
	"as picked",
	"vivid"
];
const ARM_NAMES = [
	"none",
	"by the sides",
	"waving"
];
const FOOT_NAMES = [
	"nubs",
	"tiptoes",
	"wide",
	"socks",
	"tucked"
];
const share = (weights, i) => weights[i] / weights.reduce((a, b$1) => a + b$1, 0);
/** Each of a guy's twelve traits and how likely it was, always in `TRAIT_SLOTS` order. */
function traitOdds(config) {
	const body = shows(config, "body") ? config.body : 0, cheek = shows(config, "cheeks") ? config.cheeks : 0;
	return [
		{
			slot: "shape",
			name: heads[config.head].name,
			chance: share(headWeights, config.head)
		},
		{
			slot: "eyes",
			name: eyes[config.eyes].name,
			chance: share(withoutRetired(eyeWeights, RETIRED_EYES), config.eyes)
		},
		{
			slot: "mouth",
			name: mouths[config.mouth].name,
			chance: share(mouthWeights, config.mouth)
		},
		{
			slot: "cheeks",
			name: cheeks[cheek].name,
			chance: share(cheekWeights, cheek)
		},
		{
			slot: "topper",
			name: hair[config.hair].name,
			chance: share(hairWeights, config.hair)
		},
		{
			slot: "markings",
			name: bodies[body].name,
			chance: share(bodyWeights, body)
		},
		{
			slot: "accessory",
			name: accessories[config.accessory].name,
			chance: share(accessoryWeights, config.accessory)
		},
		{
			slot: "colour",
			name: palettes[config.palette].name,
			chance: share(paletteWeights, config.palette)
		},
		{
			slot: "tone",
			name: TONE_NAMES[config.shade],
			chance: share(shadeWeights, config.shade)
		},
		{
			slot: "arms",
			name: ARM_NAMES[config.arms],
			chance: share(armWeights, config.arms)
		},
		{
			slot: "feet",
			name: FOOT_NAMES[config.feet],
			chance: share(footWeights, config.feet)
		},
		{
			slot: "lucky",
			name: config.lucky ? "Lucky" : "regular",
			chance: config.lucky ? 1 / LUCKY_ODDS : 1 - 1 / LUCKY_ODDS
		}
	];
}
/** One in how many guys has exactly this combination. */
function guyOneIn(config) {
	return 1 / traitOdds(config).reduce((p, t) => p * t.chance, 1);
}
/** One in how many capsules for its game give a copy at least this good. */
function copyOneIn(o) {
	const item = itemById(o.item);
	if (!item) return Infinity;
	const f = FINISHES[o.finish];
	let p = f.aura ? AURA_ODDS * (1 / AURAS.length) * (f.aura / 100) : 1 / gameItems(item.game).filter((i) => !i.free && i.slot !== "aura").length * (f.odds / 100) * (item.game === "club" ? 1 : 1 - AURA_ODDS);
	if (special(o) === "Deep Blue") p *= DEEP_BLUE_PRINTS.length / 1e3;
	else if (special(o)) p *= 1 / 20;
	const [lo, hi] = f.scuffs;
	p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
	if (o.tally !== void 0) p *= .1;
	if (o.fx) p *= 1 / EFFECTS[o.fx][f.aura ? "aura" : "item"];
	return 1 / p;
}
/** A guy's tiers, commonest first: each is the share of guys at least that rare. */
const GUY_TIERS = [
	{
		id: "common",
		name: "Common",
		top: 1
	},
	{
		id: "uncommon",
		name: "Uncommon",
		top: .5
	},
	{
		id: "rare",
		name: "Rare",
		top: .1
	},
	{
		id: "epic",
		name: "Epic",
		top: .01
	},
	{
		id: "legendary",
		name: "Legendary",
		top: .001
	},
	{
		id: "mythic",
		name: "Mythic",
		top: 1e-4
	}
];
/**
* What a guy's rank is measured on: the odds of his whole combination, with his
* single rarest trait counted twice. One standout (galaxy eyes, Lucky) is what
* people see as rare, more than a handful of slightly unusual picks.
*/
function guyScore(config) {
	const logs = traitOdds(config).map((t) => -Math.log10(t.chance));
	return logs.reduce((a, b$1) => a + b$1, 0) + Math.max(...logs);
}
/**
* Where a guy stands among every guy dealt: "one in 56 billion" says every
* combination is unique, which they all are, so a card shows this instead.
*/
function guyRank(config) {
	const v = guyScore(config), last = GUY_RANK[GUY_RANK.length - 1];
	let top = 1;
	if (v > last[0]) top = last[1] * 10 ** (last[0] - v);
	else {
		const i = GUY_RANK.findIndex(([a]) => v <= a);
		if (i > 0) {
			const [a, pa] = GUY_RANK[i - 1], [b$1, pb] = GUY_RANK[i];
			top = 10 ** (Math.log10(pa) + (Math.log10(pb) - Math.log10(pa)) * (v - a) / (b$1 - a));
		}
	}
	const rarest = Math.min(...traitOdds(config).map((t) => t.chance));
	if (rarest < .005) top = Math.min(top, rarest * 3);
	const pct = top * 100;
	const shown = pct >= 10 ? Math.round(pct) : pct >= 1 ? +pct.toFixed(1) : +pct.toPrecision(2);
	const tier = GUY_TIERS.reduce((k, t, i) => shown / 100 <= t.top ? i : k, 0);
	return {
		top,
		tier,
		name: GUY_TIERS[tier].name,
		label: top > .5 ? "Common" : `Top ${shown}%`
	};
}

//#endregion
//#region src/icons.ts
/**
* Pixel icons for the traits and the rarity tiers, as SVG strings.
*
* Each is drawn on a 12x12 grid in `currentColor`, so the page colours it
* (a tier icon takes its tier's colour), with at most two fixed accents
* where the colour is the point (blush pink, a sprout's green). They carry a
* `viewBox` and no size: CSS sizes them, crisp at any multiple of 12px and
* readable from 24px.
*/
/** A grid's letters: `#` is `currentColor`, the rest its accents, `.` empty. */
function icon(rows, accents = {}) {
	const fills = {
		"#": "currentColor",
		...accents
	};
	const rects = [];
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length;) {
			const ch = row[x];
			let end = x + 1;
			while (end < row.length && row[end] === ch) end++;
			if (fills[ch]) rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fills[ch]}"/>`);
			x = end;
		}
	});
	const w = Math.max(...rows.map((r) => r.length));
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
}
const PINK = "#FF6F9F";
const GREEN = "#4CC25A";
const TRAIT_ICONS = {
	shape: icon([
		"............",
		"....####....",
		"..########..",
		".##########.",
		".##########.",
		"############",
		"############",
		"############",
		".##########.",
		"..########..",
		"..##....##..",
		"............"
	]),
	eyes: icon([
		"............",
		"............",
		"..##....##..",
		".####..####.",
		".#.##..#.##.",
		".####..####.",
		".####..####.",
		".####..####.",
		"..##....##..",
		"............",
		"............",
		"............"
	]),
	mouth: icon([
		"............",
		"............",
		"............",
		"##........##",
		"##........##",
		".##########.",
		".##########.",
		"..###aa###..",
		"...##aa##...",
		"....####....",
		"............",
		"............"
	], { a: PINK }),
	cheeks: icon([
		"............",
		"............",
		"...##..##...",
		"...##..##...",
		"............",
		"............",
		".aaa....aaa.",
		"aaaaa..aaaaa",
		"aaaaa..aaaaa",
		".aaa....aaa.",
		"............",
		"............"
	], { a: PINK }),
	topper: icon([
		"..aa....aa..",
		".aaaa..aaaa.",
		".aaaaa#aaaa.",
		"..aaa##aaa..",
		".....##.....",
		".....##.....",
		"............",
		"...######...",
		".##########.",
		"############",
		"############",
		"############"
	], { a: GREEN }),
	markings: icon([
		"....####....",
		"..########..",
		".##..######.",
		".##..###..#.",
		"#########..#",
		"####..######",
		"####..######",
		"#######..###",
		".#.####..##.",
		".#..######..",
		"..########..",
		"....####...."
	]),
	accessory: icon([
		"............",
		"............",
		"##........##",
		"####....####",
		"#####..#####",
		"############",
		"############",
		"#####..#####",
		"####....####",
		"##........##",
		"............",
		"............"
	]),
	colour: icon([
		"............",
		"...#####....",
		"..########..",
		".##aa##bb##.",
		".##aa##bb##.",
		"##########..",
		"#########...",
		"##cc####....",
		"##cc#####...",
		".#########..",
		"..#######...",
		"............"
	], {
		a: PINK,
		b: GREEN,
		c: PINK
	}),
	tone: icon([
		"............",
		"....####....",
		"..#####.##..",
		".######...#.",
		".######...#.",
		"#######....#",
		"#######....#",
		".######...#.",
		".######...#.",
		"..#####.##..",
		"....####....",
		"............"
	]),
	arms: icon([
		"##........##",
		"##........##",
		".##......##.",
		"..##.##.##..",
		"...######...",
		"..########..",
		"..########..",
		"..########..",
		"..########..",
		"...######...",
		"...##..##...",
		"............"
	]),
	feet: icon([
		"............",
		".#.#....#.#.",
		"............",
		".###....###.",
		"####....####",
		"####....####",
		"####....####",
		".###....###.",
		".###....###.",
		"..#......#..",
		"............",
		"............"
	]),
	lucky: icon([
		"............",
		"..aaa..aaa..",
		".aaaaa.aaaa.",
		".aaaaaaaaaa.",
		"..aaaaaaaa..",
		"....aaaa....",
		"..aaaaaaaa..",
		".aaaaaaaaaa.",
		".aaaaa#aaaa.",
		"..aaa.#aaa..",
		".......#....",
		"........#..."
	], { a: GREEN })
};
const TIER_ICONS = {
	Common: icon([
		"............",
		"............",
		"............",
		"............",
		"....####....",
		"...######...",
		"...######...",
		"....####....",
		"............",
		"............",
		"............",
		"............"
	]),
	Uncommon: icon([
		"............",
		".....##.....",
		"....####....",
		"...######...",
		"..########..",
		".##########.",
		".##########.",
		"..########..",
		"...######...",
		"....####....",
		".....##.....",
		"............"
	]),
	Rare: icon([
		"............",
		"............",
		"..########..",
		".##.####.##.",
		"############",
		"............",
		"############",
		".##########.",
		"..########..",
		"....####....",
		".....##.....",
		"............"
	]),
	Legendary: icon([
		".....##.....",
		".....##.....",
		"....####....",
		"....####....",
		"############",
		".##########.",
		"..########..",
		"...######...",
		"..########..",
		"..###..###..",
		".###....###.",
		".##......##."
	]),
	Chase: icon([
		"............",
		"#....##....#",
		"##..####..##",
		"###.####.###",
		"############",
		"############",
		"############",
		"############",
		"............",
		"############",
		"############",
		"............"
	])
};

//#endregion
//#region src/look.ts
/**
* Keeping rarity real.
*
* A guy's rare traits only mean something if nobody can choose them. Two
* rules make that so:
*
* 1. **Draw the guy from a seed, not the name on the board.** A name can be
*    typed and changed, so anyone could try names until a rare guy came out,
*    and a rename would change him. The club makes a random seed once
*    (`makeSeed`), keeps it with the player, and draws from that:
*    `toSvgString(seed, …)`, `starter(seed, game)`. The name stays a label.
* 2. **A picker offers only common parts, plus the player's own.** A part
*    someone rolled stays theirs to keep; a rare part they didn't roll can't be
*    picked.
*
* Picked looks are saved as versioned codes (`2:h3.e5…`), so a later change to
* the parts can't silently turn a saved look into someone else.
*/
/** A slot in a look code: its letter, its config key and its weights. */
const SLOTS = [
	[
		"h",
		"head",
		headWeights
	],
	[
		"e",
		"eyes",
		eyeWeights
	],
	[
		"m",
		"mouth",
		mouthWeights
	],
	[
		"c",
		"cheeks",
		cheekWeights
	],
	[
		"t",
		"hair",
		hairWeights
	],
	[
		"b",
		"body",
		bodyWeights
	],
	[
		"a",
		"accessory",
		accessoryWeights
	],
	[
		"p",
		"palette",
		paletteWeights
	]
];
/** A part rarer than this (1 in 45) counts as rare and can't be picked. */
const RARE = 1 / 45;
/**
* A random seed to draw a new player's guy from, made once and kept: the deal
* prefix (`3-`), then 12 characters of base 36, about 62 bits.
*/
function makeSeed() {
	const bytes = new Uint8Array(8);
	globalThis.crypto.getRandomValues(bytes);
	let n = 0n;
	for (const b$1 of bytes) n = n << 8n | BigInt(b$1);
	return DEAL_PREFIX + n.toString(36).padStart(12, "0").slice(-12);
}
/** Which options a player may pick in a slot: every common one, and their own. */
function pickable(own, slot) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	const total = weights.reduce((a, b$1) => a + b$1, 0);
	return weights.map((w, i) => i).filter((i) => (weights[i] / total >= RARE || i === own[slot]) && !(slot === "eyes" && RETIRED_EYES.includes(i)));
}
/** Whether a look only uses parts this player may pick. */
function allowed(own, look) {
	return SLOTS.every(([, slot]) => look[slot] === void 0 || pickable(own, slot).includes(look[slot]));
}
/** A picked look as a versioned code: `2:h3.e5.p17`, only the slots picked. */
function encodeLook(look) {
	return "2:" + SLOTS.filter(([, slot]) => look[slot] !== void 0).map(([letter, slot]) => letter + look[slot]).join(".");
}
/**
* A code back into a look, or null for anything that isn't a version-2 code
* this library can draw: an old seven-number code from before 0.2, a part out
* of range, or (given the player's own guy) a rare part they didn't roll.
*/
function decodeLook(code, own) {
	if (typeof code !== "string" || !code.startsWith("2:")) return null;
	const look = {};
	for (const part of code.slice(2).split(".").filter(Boolean)) {
		const slot = SLOTS.find((s) => s[0] === part[0]);
		const n = Number(part.slice(1));
		if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
		if (slot[1] === "eyes" && RETIRED_EYES.includes(n)) continue;
		look[slot[1]] = n;
	}
	if (own && !allowed(own, look)) return null;
	return look;
}
/** A player's guy: from their seed, with their picked look laid over it. */
function lookOf(seed, code = "") {
	const own = resolve(seed);
	const look = code ? decodeLook(code, own) : null;
	return look ? {
		...own,
		...look
	} : own;
}

//#endregion
//#region src/share.ts
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;"
})[c]);
function count(n) {
	return n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : Math.round(n).toLocaleString("en-US");
}
function toShareSvg(input, copy, options = {}) {
	const config = dress(options.config ?? resolve(input), { equip: [encode(copy)] });
	const colors = paint(compose(config), config, withItems(paletteOf(config), config));
	const grade = gradeOf(copy);
	const item = itemById(copy.item);
	const [title, finish] = nameOf(copy).split(" | ");
	const px = 26, gx = 96, gy = (630 - GRID_SIZE * px) / 2;
	const rects = [];
	colors.forEach((row, y) => {
		let x = 0;
		while (x < GRID_SIZE) {
			const c = row[x];
			let w = 1;
			while (x + w < GRID_SIZE && row[x + w] === c) w++;
			if (c) rects.push(`<rect x="${gx + x * px}" y="${gy + y * px}" width="${w * px}" height="${px}" fill="${c}"/>`);
			x += w;
		}
	});
	const odds = copyOneIn(copy);
	const lines = [
		`${wearOf(copy.scuff).name} · scuff ${copy.scuff.toFixed(4)} · print #${copy.print}`,
		copy.tally !== void 0 ? `${copy.tally} days on its tally` : "",
		item?.free ? "Everyone has one; no two are alike" : `1 in ${count(odds)} capsules`
	].filter(Boolean);
	const font = "font-family=\"system-ui, -apple-system, Segoe UI, sans-serif\"";
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">`,
		`<title>${esc(nameOf(copy))}</title>`,
		`<defs><radialGradient id="glow" cx="0.27" cy="0.5" r="0.5"><stop offset="0" stop-color="${grade.color}" stop-opacity="0.55"/><stop offset="1" stop-color="${grade.color}" stop-opacity="0"/></radialGradient></defs>`,
		`<rect width="1200" height="630" fill="#14182a"/>`,
		`<rect width="1200" height="630" fill="url(#glow)"/>`,
		`<g shape-rendering="crispEdges">${rects.join("")}</g>`,
		`<text x="600" y="150" ${font} font-size="24" font-weight="700" letter-spacing="4" fill="#a8b0cf">${esc(options.name ? `${options.name.toUpperCase()}'S COPY` : "A ONE-OF-A-KIND COPY")}</text>`,
		`<text x="600" y="232" ${font} font-size="60" font-weight="800" fill="#ffffff">${esc(title)}</text>`,
		finish ? `<text x="600" y="296" ${font} font-size="40" font-weight="700" fill="${grade.color}">${esc(finish)}</text>` : "",
		`<rect x="600" y="${finish ? 324 : 264}" width="${grade.name.length * 18 + 40}" height="48" rx="10" fill="${grade.color}"/>`,
		`<text x="620" y="${finish ? 357 : 297}" ${font} font-size="26" font-weight="800" fill="#ffffff">${esc(grade.name)}</text>`,
		...lines.map((l, i) => `<text x="600" y="${(finish ? 420 : 360) + i * 44} " ${font} font-size="28" fill="#dfe3f2">${esc(l)}</text>`),
		`<text x="600" y="570" ${font} font-size="24" font-weight="700" fill="#ffcf5c">${esc(options.footer ?? "dleclub.com")}</text>`,
		`</svg>`
	].join("");
}

//#endregion
//#region src/lil-guy-animated.tsx
/**
* A lil guy playing a move: the library's animated SVG, which plays itself
* with CSS, so there is no timer running in React.
*
* @example
* ```tsx
* <LilGuyAnimated name={player.seed} move="cheer" equip={[player.hat]} size={96} />
* ```
*/
function LilGuyAnimated({ name, move, size = 64, game, equip, parts, emote: emote$1, once, rarity, title, style,...props }) {
	const svg = React.useMemo(() => {
		const options = {
			size,
			game,
			equip,
			parts,
			emote: emote$1,
			once,
			rarity,
			title
		};
		return toAnimatedSvg(name, move, options);
	}, [
		name,
		move,
		size,
		game,
		equip?.join(","),
		JSON.stringify(parts),
		emote$1,
		once,
		rarity,
		title
	]);
	return /* @__PURE__ */ jsx("span", {
		"data-lil-guy-animated": "",
		style: {
			display: "inline-block",
			lineHeight: 0,
			...style
		},
		...props,
		dangerouslySetInnerHTML: { __html: svg }
	});
}

//#endregion
//#region src/finish-shader.ts
/**
* The finishes' shimmer, written twice: as GLSL for a page or a game that has
* WebGL, and as plain code that gives the same colours anywhere (a server, a
* test, a browser without WebGL). Both read the same inputs: a pixel's colour,
* its copy's finish, scuff and print, a fixed noise value for the pixel, and
* the time. Two things keep them the same:
*
* - Nothing random is computed on the GPU. A sine hash comes out differently
*   on every graphics card, so each pixel's noise is made here (`noiseOf`) and
*   handed to the shader in a texture.
* - Every movement repeats in `LOOP_MS`, so a baked loop closes without a jump
*   and the GPU never sees a large time.
*
* `scripts/verify-shaders.mjs` runs the GLSL in a browser and checks it
* against the plain code, pixel by pixel.
*/
/** The finishes in the order the shaders number them. */
const SHADER_FINISHES = [
	"plain",
	"sunset",
	"tempered",
	"nebula",
	"prism",
	"negative",
	"gold"
];
/** A pixel's noise, 0 to 255: the same for a cell and print everywhere. */
const noiseOf = (x, y, print) => hash(`noise|${x}|${y}|${print}`) & 255;
/** Highest precision the device has: mediump is 16-bit on phones, too coarse for the bands. */
const GLSL_PRECISION = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
const GLSL_COMMON = `
const float TAU = 6.28318530718;
vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 hueShift(vec3 c, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));
}
float band(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) - 0.5, 0.0, 1.0); }
vec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {
  float b = band(d, time, print);
  float twinkle = step(0.965, fract(h * 13.0 + time / 3.0));
  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);
  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }
  else if (finish < 2.5) c += twinkle * 0.55 * coat + b * 0.25 * coat;
  else if (finish < 3.5) { c = hueShift(c, (time * TAU / 6.0 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }
  else if (finish < 4.5) {
    vec3 rain = hsv(vec3(fract(d * 0.07 - time / 3.0 + print * 0.013), 0.65, 1.0));
    c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat);
    c *= 1.0 + 0.12 * scan * step(mod(row + floor(time * 10.0), 3.0), 0.5);
  }
  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5) * coat;
  else c += b * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;
  return c;
}
`;
const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
const mod = (x, y) => x - y * Math.floor(x / y);
const clamp = (x, a, b$1) => Math.min(Math.max(x, a), b$1);
const step = (edge, x) => x < edge ? 0 : 1;
const smoothstep = (a, b$1, x) => {
	const t = clamp((x - a) / (b$1 - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const distance = (a, b$1) => Math.hypot(a[0] - b$1[0], a[1] - b$1[1]);
const mix$1 = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const add = (a, k) => typeof k === "number" ? [
	a[0] + k,
	a[1] + k,
	a[2] + k
] : [
	a[0] + k[0],
	a[1] + k[1],
	a[2] + k[2]
];
const scale = (a, k) => typeof k === "number" ? [
	a[0] * k,
	a[1] * k,
	a[2] * k
] : [
	a[0] * k[0],
	a[1] * k[1],
	a[2] * k[2]
];
function hsv$1(c) {
	const p = [
		1,
		2 / 3,
		1 / 3
	].map((o) => Math.abs(fract(c[0] + o) * 6 - 3));
	return p.map((v) => c[2] * (1 + (clamp(v - 1, 0, 1) - 1) * c[1]));
}
function hueShift(c, a) {
	const y = .299 * c[0] + .587 * c[1] + .114 * c[2];
	const i = .596 * c[0] - .274 * c[1] - .322 * c[2];
	const q = .211 * c[0] - .523 * c[1] + .312 * c[2];
	const h = Math.atan2(q, i) + a, ch = Math.hypot(i, q);
	const I = ch * Math.cos(h), Q = ch * Math.sin(h);
	return [
		y + .956 * I + .621 * Q,
		y - .272 * I - .647 * Q,
		y - 1.106 * I + 1.703 * Q
	];
}
const band = (d, time, print) => 1 - clamp(Math.abs(mod(d - time * 10 + print, 60) - 30) - .5, 0, 1);
/** `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES. */
function finishColor(c, finish, scuff, h, d, row, print, time, scan) {
	const b$1 = band(d, time, print);
	const twinkle$1 = step(.965, fract(h * 13 + time / 3));
	const coat = clamp(1 - scuff * 1.4, 0, 1) * step(scuff * .55, h);
	if (finish < .5) return add(c, b$1 * .45 * step(scuff, .07));
	if (finish < 1.5) {
		const s = .5 + .5 * Math.sin(d * .8 - time * TAU / 2 + print);
		return add(mix$1(c, add(scale(c, [
			.86,
			.96,
			1.18
		]), .08), .4 * s * coat), b$1 * .5 * coat);
	}
	if (finish < 2.5) return add(c, twinkle$1 * .55 * coat + b$1 * .25 * coat);
	if (finish < 3.5) return mix$1(hueShift(c, (time * TAU / 6 + d * .22) * coat), [
		1,
		1,
		1
	], twinkle$1 * coat);
	if (finish < 4.5) {
		const rain = hsv$1([
			fract(d * .07 - time / 3 + print * .013),
			.65,
			1
		]);
		const out = mix$1(c, add(scale(c, .45), scale(rain, .75)), .6 * coat);
		return scale(out, 1 + .12 * scan * step(mod(row + Math.floor(time * 10), 3), .5));
	}
	if (finish < 5.5) return add(add(c, scale([
		.28,
		.12,
		.45
	], b$1 * coat)), .07 * Math.sin(time * TAU / 3 + d * .5) * coat);
	return add(add(c, b$1 * .7 * coat), scale([
		1,
		.9,
		.5
	], twinkle$1 * .6 * coat));
}
/** A colour channel as the GPU stores it. */
const toByte = (v) => Math.round(clamp(v, 0, 1) * 255);
/** Loop time in seconds: what the shaders are given. */
const loopSeconds = (ms) => mod(ms, LOOP_MS) / 1e3;

//#endregion
//#region src/shine.ts
/**
* The finishes, moving: a WebGL shader that runs each worn copy's finish on
* that copy's own pixels — Sunset's sheen, Tempered's glint, Nebula's drift,
* Prism's rainbow, Negative's pulse, Gold's sparkle — while the guy plays a
* move. Scuffed pixels shine less, the way they're painted.
*
* Browsers allow only a handful of WebGL contexts per page, so make one shine
* and share it: draw each guy into it in turn and copy the result out with
* `drawImage` into that guy's own 2D canvas. Without WebGL `createShine`
* returns null; draw the frame's colours as they are.
*/
/**
* A frame as the shader reads it: its colours; for each pixel the finish,
* scuff and print of the copy it belongs to; and each pixel's noise. Three
* RGBA byte arrays, 16×20.
*/
function shineData(frame, owned = {}) {
	const colors = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
	const info = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
	const noise = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
	frame.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c) return;
		const i = (y * FRAME_WIDTH + x) * 4;
		colors.set([
			parseInt(c.slice(1, 3), 16),
			parseInt(c.slice(3, 5), 16),
			parseInt(c.slice(5, 7), 16),
			255
		], i);
		const slot = frame.slots[y][x];
		const copy = slot ? owned?.[FRAME_SLOTS[slot - 1]] : void 0;
		const finish = copy ? SHADER_FINISHES.indexOf(copy.finish) : -1;
		if (copy && finish >= 0) {
			const print = Math.floor(copy.print / 4);
			info.set([
				(finish + 1) * 32,
				Math.round(copy.scuff * 255),
				print,
				255
			], i);
			noise[i] = noiseOf(x, y, print * 4);
		}
	}));
	return {
		colors,
		info,
		noise
	};
}
/** Whether any pixel of the frame belongs to a copy with a finish that shimmers. */
const shines = (frame, owned = {}) => frame.slots.some((row) => row.some((slot) => slot > 0 && SHADER_FINISHES.includes(owned?.[FRAME_SLOTS[slot - 1]]?.finish)));
/**
* The shader's picture, in plain code: the frame with each copy's finish
* running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
*/
function shineFrame(frame, owned, ms) {
	const { colors, info, noise } = shineData(frame, owned);
	const out = new Uint8ClampedArray(colors);
	const time = loopSeconds(ms);
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
		const i = (y * FRAME_WIDTH + x) * 4;
		if (colors[i + 3] < 128 || info[i + 3] < 128) continue;
		const finish = Math.floor(info[i] / 32 + .5) - 1;
		const c = finishColor([
			colors[i] / 255,
			colors[i + 1] / 255,
			colors[i + 2] / 255
		], finish, info[i + 1] / 255, noise[i] / 255, x + y, y, info[i + 2] * 4, time, 0);
		out[i] = toByte(c[0]);
		out[i + 1] = toByte(c[1]);
		out[i + 2] = toByte(c[2]);
	}
	return out;
}
const VERTEX$1 = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }";
/** The shader, for a game that runs its own WebGL: textures \`base\`, \`info\`, \`noise\` from shineData, \`time\` in loop seconds. */
const SHINE_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, info, noise;
uniform float time;
${GLSL_COMMON}
void main() {
  vec2 res = vec2(${FRAME_WIDTH}.0, ${FRAME_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 k = texture2D(info, at);
  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;
  if (k.a > 0.5 && finish >= 0.0) c = finishColor(c, finish, k.g, texture2D(noise, at).r, cell.x + cell.y, cell.y, floor(k.b * 255.0 + 0.5) * 4.0, time, 0.0);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
/** One shader to share across a page or a game, or null without WebGL. */
function createShine(canvas) {
	const target = canvas ?? (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(FRAME_WIDTH, FRAME_HEIGHT) : typeof document !== "undefined" ? document.createElement("canvas") : null);
	if (!target) return null;
	target.width = FRAME_WIDTH;
	target.height = FRAME_HEIGHT;
	const gl = target.getContext("webgl", {
		premultipliedAlpha: false,
		preserveDrawingBuffer: true
	});
	if (!gl) return null;
	const shader = (type, source) => {
		const s = gl.createShader(type);
		gl.shaderSource(s, source);
		gl.compileShader(s);
		return s;
	};
	const program = gl.createProgram();
	gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX$1));
	gl.attachShader(program, shader(gl.FRAGMENT_SHADER, SHINE_FRAGMENT));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1,
		-1,
		1,
		-1,
		-1,
		1,
		1,
		1
	]), gl.STATIC_DRAW);
	const p = gl.getAttribLocation(program, "p");
	gl.enableVertexAttribArray(p);
	gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
	gl.uniform1i(gl.getUniformLocation(program, "base"), 0);
	gl.uniform1i(gl.getUniformLocation(program, "info"), 1);
	gl.uniform1i(gl.getUniformLocation(program, "noise"), 2);
	const time = gl.getUniformLocation(program, "time");
	gl.viewport(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
	const texture = (unit) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
		for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
		return t;
	};
	const textures = [
		texture(0),
		texture(1),
		texture(2)
	];
	return {
		canvas: target,
		draw(frame, owned, ms) {
			const { colors, info, noise } = shineData(frame, owned);
			[
				colors,
				info,
				noise
			].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FRAME_WIDTH, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(time, loopSeconds(ms));
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	};
}

//#endregion
//#region src/voxel.ts
const SURFACES = {
	body: {
		roughness: .46,
		metalness: 0,
		clearcoat: .35,
		clearcoatRoughness: .35,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	plain: {
		roughness: .5,
		metalness: 0,
		clearcoat: .3,
		clearcoatRoughness: .4,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	sunset: {
		roughness: .3,
		metalness: .05,
		clearcoat: .9,
		clearcoatRoughness: .12,
		iridescence: 0,
		sheen: 1,
		glow: 0
	},
	tempered: {
		roughness: .28,
		metalness: .85,
		clearcoat: .4,
		clearcoatRoughness: .2,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	nebula: {
		roughness: .22,
		metalness: .1,
		clearcoat: 1,
		clearcoatRoughness: .08,
		iridescence: 0,
		sheen: 0,
		glow: .9
	},
	prism: {
		roughness: .12,
		metalness: .35,
		clearcoat: 1,
		clearcoatRoughness: .04,
		iridescence: 1,
		sheen: 0,
		glow: 0
	},
	negative: {
		roughness: .1,
		metalness: .2,
		clearcoat: 1,
		clearcoatRoughness: .03,
		iridescence: 0,
		sheen: 0,
		glow: .2
	},
	gold: {
		roughness: .16,
		metalness: 1,
		clearcoat: .5,
		clearcoatRoughness: .08,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	classic: {
		roughness: .3,
		metalness: 0,
		clearcoat: .6,
		clearcoatRoughness: .2,
		iridescence: 0,
		sheen: 0,
		glow: .7
	},
	fade: {
		roughness: .2,
		metalness: .1,
		clearcoat: .9,
		clearcoatRoughness: .1,
		iridescence: .5,
		sheen: 0,
		glow: .6
	},
	frost: {
		roughness: .1,
		metalness: .2,
		clearcoat: 1,
		clearcoatRoughness: .04,
		iridescence: .3,
		sheen: 0,
		glow: .5
	},
	toxic: {
		roughness: .25,
		metalness: 0,
		clearcoat: .8,
		clearcoatRoughness: .12,
		iridescence: 0,
		sheen: 0,
		glow: .9
	},
	shadow: {
		roughness: .4,
		metalness: .3,
		clearcoat: .5,
		clearcoatRoughness: .2,
		iridescence: 0,
		sheen: 0,
		glow: .3
	},
	sapphire: {
		roughness: .1,
		metalness: .4,
		clearcoat: 1,
		clearcoatRoughness: .03,
		iridescence: .2,
		sheen: 0,
		glow: .6
	},
	ruby: {
		roughness: .1,
		metalness: .4,
		clearcoat: 1,
		clearcoatRoughness: .03,
		iridescence: .2,
		sheen: 0,
		glow: .6
	},
	pearl: {
		roughness: .08,
		metalness: .5,
		clearcoat: 1,
		clearcoatRoughness: .02,
		iridescence: .6,
		sheen: 0,
		glow: .3
	}
};
/** A finish's surface, worn: scuff roughens it and dulls its coat, in tenths so copies share materials. */
function surfaceOf(kind, scuff = 0) {
	const s = SURFACES[kind], wear = Math.round(Math.min(1, Math.max(0, scuff)) * 10) / 10;
	return {
		kind,
		...s,
		roughness: Math.min(1, +(s.roughness + wear * .55).toFixed(3)),
		clearcoat: +(s.clearcoat * (1 - wear)).toFixed(3)
	};
}
const lum = (hex$1) => {
	const n = parseInt(hex$1.slice(1, 7), 16);
	return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex$1, k) => {
	const n = parseInt(hex$1.slice(1, 7), 16), f = (v) => Math.round(v * k).toString(16).padStart(2, "0");
	return `#${f(n >> 16 & 255)}${f(n >> 8 & 255)}${f(n & 255)}`;
};
/** Steps to the nearest pixel outside, 4-way; the border counts as outside. */
function inset(w, h, inside$1) {
	const d = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_$1, x) => inside$1(x, y) ? 99 : 0));
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[y][x]) d[y][x] = Math.min(d[y][x], (d[y - 1]?.[x] ?? 0) + 1, (d[y][x - 1] ?? 0) + 1);
	for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) if (d[y][x]) d[y][x] = Math.min(d[y][x], (d[y + 1]?.[x] ?? 0) + 1, (d[y][x + 1] ?? 0) + 1);
	return d;
}
/** A frame (an animation frame, or `itemFrame`) as columns, each worn copy's pixels on its finish's surface. */
function voxelColumns(frame, owned = {}, options = {}) {
	const C = frame.colors, S = frame.slots, H = C.length, W = C[0]?.length ?? 0, small = !!options.item;
	const slotName = (s) => [
		"skin",
		"hat",
		"frame",
		"buddy"
	][s - 1];
	const figure = inset(W, H, (x, y) => !!C[y][x] && S[y][x] !== 3 && S[y][x] !== 4);
	const buddy = inset(W, H, (x, y) => !!C[y][x] && S[y][x] === 4);
	const feature = (x, y) => {
		const c = C[y][x];
		if (!c || S[y][x] !== 0 || figure[y][x] < 2) return 0;
		const l = lum(c);
		return l < .22 ? .45 : l > .86 ? .3 : 0;
	};
	const front = Array.from({ length: H }, () => new Array(W).fill(-Infinity));
	const span = Array.from({ length: H }, () => new Array(W).fill(null));
	let deepest = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const c = C[y][x], s = S[y][x];
		if (!c || s === 3) continue;
		const d = s === 4 ? buddy[y][x] : figure[y][x];
		let t = small ? 1 + .45 * Math.min(d, 3) : 1.3 + 1.05 * Math.min(d, 4);
		if (s === 4 && !small) t *= .82;
		if (s === 2 && !small) t += .5;
		const lift = feature(x, y);
		span[y][x] = {
			z0: -t / 2,
			z1: t / 2 + lift
		};
		front[y][x] = t / 2 + lift;
		deepest = Math.max(deepest, t);
	}
	let squeeze = 1;
	if (options.deepest) {
		let lo = Infinity, hi = -Infinity;
		for (const row of span) for (const s of row) if (s) {
			lo = Math.min(lo, s.z0);
			hi = Math.max(hi, s.z1);
		}
		if (hi - lo > options.deepest) squeeze = options.deepest / (hi - lo);
	}
	if (squeeze < 1) {
		for (const row of span) for (const s of row) if (s) {
			s.z0 *= squeeze;
			s.z1 *= squeeze;
		}
		for (const row of front) row.forEach((v, x) => {
			row[x] = v * squeeze;
		});
		deepest *= squeeze;
	}
	const out = [];
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const c = C[y][x], s = S[y][x];
		if (!c) continue;
		const copy = s ? owned[slotName(s)] : void 0;
		const surface = surfaceOf(copy ? copy.finish : "body", copy ? copy.scuff : 0);
		const px = x - W / 2 + .5, py = H / 2 - y - .5;
		if (s === 3) {
			out.push({
				x: px,
				y: py,
				z: -(deepest / 2 + .5),
				depth: .7,
				color: c,
				back: c,
				side: c,
				slot: s,
				surface,
				lift: 0
			});
			continue;
		}
		const { z0, z1 } = span[y][x];
		let shade = 0;
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (front[y + dy]?.[x + dx] ?? -Infinity) > z1 + .4) shade++;
		let back = c;
		if (feature(x, y)) {
			const around = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].find(([dx, dy]) => {
				const n = C[y + dy]?.[x + dx];
				return !!n && !feature(x + dx, y + dy) && lum(n) >= .22 && lum(n) <= .86;
			});
			if (around) back = C[y + around[1]][x + around[0]];
		}
		const color = shade ? darken(c, 1 - shade * .045) : c;
		let side = color;
		if (lum(c) < .3 && (s === 4 ? buddy[y][x] : figure[y][x]) === 1) {
			const inside$1 = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].map(([dx, dy]) => C[y + dy]?.[x + dx]).filter((n) => !!n && lum(n) >= .3);
			if (inside$1.length) side = darken(inside$1[0], .92);
		}
		out.push({
			x: px,
			y: py,
			z: (z0 + z1) / 2,
			depth: z1 - z0,
			color,
			back,
			side,
			slot: s,
			surface,
			lift: feature(x, y) * squeeze
		});
	}
	return out;
}
const SLOT_TOKENS = {
	skin: [LAYER.skin, LAYER.hat],
	hat: [LAYER.hat, LAYER.frame],
	frame: [LAYER.frame, LAYER.buddy],
	buddy: [LAYER.buddy, LAYER.aura],
	aura: [LAYER.aura, LAYER.aura + 10]
};
/** One copy on its own, cut out of a guy wearing it: a 16×16 frame with only the item's pixels. */
function itemFrame(o, seed = "display stand") {
	const slot = slotOf(o);
	if (!slot) throw new Error(`Unknown item "${o.item}"`);
	const [lo, hi] = SLOT_TOKENS[slot], want = [
		"skin",
		"hat",
		"frame",
		"buddy"
	].indexOf(slot) + 1;
	const base = resolve(seed);
	const draw = (equip) => {
		const cfg = dress(base, { equip });
		const grid = compose(cfg);
		return {
			grid,
			colors: paint(grid, cfg, withItems(paletteOf(cfg), cfg))
		};
	};
	const worn = draw([encode(o)]);
	let mask = worn.grid.map((row) => row.map((t) => t >= lo && t < hi));
	if (!mask.some((r) => r.some(Boolean))) {
		const bare = draw([]);
		mask = worn.colors.map((row, y) => row.map((c, x) => !!c && c !== bare.colors[y][x]));
	}
	const colors = worn.colors.map((row, y) => row.map((c, x) => mask[y][x] ? c : null));
	return {
		colors,
		slots: colors.map((row) => row.map((c) => c ? want : 0))
	};
}
/** One copy on its own as columns. */
function voxelItem(o) {
	return voxelColumns(itemFrame(o), { [slotOf(o)]: o }, { item: true });
}
/** Worn copies by slot, from their codes, for `voxelColumns` on a guy's animation frames. */
function ownedOf(codes) {
	const out = {};
	for (const code of codes) {
		const o = decode(code);
		const slot = o && slotOf(o);
		if (o && slot) out[slot] = o;
	}
	return out;
}
const linear = (hex$1) => {
	const n = parseInt(hex$1.slice(1, 7), 16);
	return [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	].map((v) => {
		const c = v / 255;
		return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
	});
};
/**
* Columns as one mesh, `cell` units a pixel, with faces between touching
* columns left out. Normals come from a softened height map of the columns
* (eyes and mouth left out of it), so a figure shades as one domed, moulded
* toy with its edges rolling off round, while every pixel keeps its flat
* colour; `smooth: false` gives each face its own flat normal instead.
*/
function voxelMesh(columns, cell = 1, options = {}) {
	const smooth = options.smooth ?? true;
	const at = new Map();
	for (const c of columns) at.set(`${c.x},${c.y}`, c);
	const OUTSIDE = -.6;
	const body = new Map();
	for (const c of columns) if (c.slot !== 3) body.set(`${Math.floor(c.x)},${Math.floor(c.y)}`, (c.depth - c.lift) / 2);
	const softened = new Map();
	const soft = (ix, iy) => {
		const k = `${ix},${iy}`;
		let v = softened.get(k);
		if (v === void 0) {
			v = 0;
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += body.get(`${ix + dx},${iy + dy}`) ?? OUTSIDE;
			softened.set(k, v /= 9);
		}
		return v;
	};
	const surfaceNormal = (gx, gy, side) => {
		const dx = (soft(gx, gy - 1) + soft(gx, gy) - soft(gx - 1, gy - 1) - soft(gx - 1, gy)) / 2;
		const dy = (soft(gx - 1, gy) + soft(gx, gy) - soft(gx - 1, gy - 1) - soft(gx, gy - 1)) / 2;
		const l = Math.hypot(dx, dy, 1);
		return [
			-dx / l,
			-dy / l,
			side / l
		];
	};
	const key = (s) => `${s.kind}|${s.roughness}|${s.clearcoat}`;
	const bySurface = new Map();
	for (const c of columns) {
		const k = key(c.surface);
		if (!bySurface.has(k)) bySurface.set(k, []);
		bySurface.get(k).push(c);
	}
	const pos = [], nor = [], col = [], groups = [];
	let flat = false, wall = 0;
	const shade = (p, n) => {
		if (!smooth || flat) return n;
		const s = surfaceNormal(Math.round(p[0]), Math.round(p[1]), p[2] >= 0 ? 1 : -1);
		if (!wall) return s;
		const v = [
			s[0] + n[0] * wall,
			s[1] + n[1] * wall,
			s[2] + n[2] * wall
		], l = Math.hypot(v[0], v[1], v[2]);
		return [
			v[0] / l,
			v[1] / l,
			v[2] / l
		];
	};
	const quad = (a, b$1, c, d, n, rgb$4) => {
		const shaded = [
			a,
			b$1,
			c,
			d
		].map((p) => shade(p, n));
		for (const i of [
			0,
			1,
			2,
			0,
			2,
			3
		]) {
			const p = [
				a,
				b$1,
				c,
				d
			][i];
			pos.push(p[0] * cell, p[1] * cell, p[2] * cell);
			nor.push(...shaded[i]);
			col.push(...rgb$4);
		}
	};
	const open = (z0, z1, n) => {
		if (!n) return [[z0, z1]];
		const n0 = n.z - n.depth / 2, n1 = n.z + n.depth / 2, out = [];
		if (n0 > z0) out.push([z0, Math.min(z1, n0)]);
		if (n1 < z1) out.push([Math.max(z0, n1), z1]);
		return out.filter(([a, b$1]) => b$1 - a > 1e-6);
	};
	for (const list of bySurface.values()) {
		const start = pos.length / 3;
		for (const c of list) {
			const x0 = c.x - .5, x1 = c.x + .5, y0 = c.y - .5, y1 = c.y + .5, z0 = c.z - c.depth / 2, z1 = c.z + c.depth / 2;
			const face = linear(c.color), back = linear(c.back), side = linear(c.side ?? c.color);
			flat = c.slot === 3;
			wall = 0;
			const RIM$1 = .4, rim$1 = z1 - RIM$1;
			const wallQuads = (spans, corners, n) => {
				for (const [a, b$1] of spans) {
					if (c.side === void 0 || c.side === c.color || b$1 <= rim$1) {
						const q$1 = corners(a, b$1);
						quad(q$1[0], q$1[1], q$1[2], q$1[3], n, b$1 <= rim$1 ? side : face);
						continue;
					}
					if (a < rim$1) {
						const q$1 = corners(a, rim$1);
						quad(q$1[0], q$1[1], q$1[2], q$1[3], n, side);
					}
					const q = corners(Math.max(a, rim$1), b$1);
					quad(q[0], q[1], q[2], q[3], n, face);
				}
			};
			quad([
				x0,
				y0,
				z1
			], [
				x1,
				y0,
				z1
			], [
				x1,
				y1,
				z1
			], [
				x0,
				y1,
				z1
			], [
				0,
				0,
				1
			], face);
			quad([
				x1,
				y0,
				z0
			], [
				x0,
				y0,
				z0
			], [
				x0,
				y1,
				z0
			], [
				x1,
				y1,
				z0
			], [
				0,
				0,
				-1
			], back);
			const left = at.get(`${c.x - 1},${c.y}`), right = at.get(`${c.x + 1},${c.y}`), up = at.get(`${c.x},${c.y + 1}`), down = at.get(`${c.x},${c.y - 1}`);
			wall = left ? 0 : .9;
			wallQuads(open(z0, z1, left), (a, b$1) => [
				[
					x0,
					y0,
					a
				],
				[
					x0,
					y0,
					b$1
				],
				[
					x0,
					y1,
					b$1
				],
				[
					x0,
					y1,
					a
				]
			], [
				-1,
				0,
				0
			]);
			wall = right ? 0 : .9;
			wallQuads(open(z0, z1, right), (a, b$1) => [
				[
					x1,
					y0,
					b$1
				],
				[
					x1,
					y0,
					a
				],
				[
					x1,
					y1,
					a
				],
				[
					x1,
					y1,
					b$1
				]
			], [
				1,
				0,
				0
			]);
			wall = up ? 0 : .9;
			wallQuads(open(z0, z1, up), (a, b$1) => [
				[
					x0,
					y1,
					b$1
				],
				[
					x1,
					y1,
					b$1
				],
				[
					x1,
					y1,
					a
				],
				[
					x0,
					y1,
					a
				]
			], [
				0,
				1,
				0
			]);
			wall = down ? 0 : .9;
			wallQuads(open(z0, z1, down), (a, b$1) => [
				[
					x0,
					y0,
					a
				],
				[
					x1,
					y0,
					a
				],
				[
					x1,
					y0,
					b$1
				],
				[
					x0,
					y0,
					b$1
				]
			], [
				0,
				-1,
				0
			]);
		}
		groups.push({
			start,
			count: pos.length / 3 - start,
			surface: list[0].surface
		});
	}
	const seen = new Set(), hull = [];
	const min = [
		Infinity,
		Infinity,
		Infinity
	], max = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const c of columns) {
		const edge = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		].some(([dx, dy]) => !at.has(`${c.x + dx},${c.y + dy}`));
		for (const px of [c.x - .5, c.x + .5]) for (const py of [c.y - .5, c.y + .5]) for (const pz of [c.z - c.depth / 2, c.z + c.depth / 2]) {
			const p = [
				px * cell,
				py * cell,
				pz * cell
			];
			p.forEach((v, i) => {
				min[i] = Math.min(min[i], v);
				max[i] = Math.max(max[i], v);
			});
			if (!edge) continue;
			const k = p.join(",");
			if (!seen.has(k)) {
				seen.add(k);
				hull.push(...p);
			}
		}
		if (!edge) for (const pz of [c.z - c.depth / 2, c.z + c.depth / 2]) hull.push(c.x * cell, c.y * cell, pz * cell);
	}
	return {
		positions: new Float32Array(pos),
		normals: new Float32Array(nor),
		colors: new Float32Array(col),
		groups,
		hull: new Float32Array(hull),
		min,
		max
	};
}

//#endregion
//#region src/collector.ts
/** Prints people chase for the number alone. */
const LUCKY_PRINTS = {
	7: "Lucky 7",
	100: "Century",
	404: "Not found",
	777: "Jackpot",
	999: "Last print"
};
/** Every note that applies to a copy, most wanted first. */
function collectorNotes(o) {
	const notes = [];
	const [lo, hi] = FINISHES[o.finish].scuffs, span = hi - lo;
	const share$1 = (a, b$1) => Math.max(1e-9, (Math.min(b$1, hi) - Math.max(a, lo)) / span);
	if (o.scuff < .001) notes.push({
		id: "triple-zero",
		name: "0.000 float",
		why: "Cleaner than a 0.001. Almost no copy of its finish is this clean.",
		oneIn: 1 / share$1(0, .001)
	});
	else if (o.scuff < .01) notes.push({
		id: "double-zero",
		name: "0.00 float",
		why: "A float under 0.01: near spotless.",
		oneIn: 1 / share$1(0, .01)
	});
	if (o.scuff > .99 && hi >= 1) notes.push({
		id: "max-float",
		name: "Max float",
		why: "As worn as a copy gets. Some collect the most battered.",
		oneIn: 1 / share$1(.99, 1)
	});
	for (const w of WEAR.slice(0, -1)) if (o.scuff >= w.max && o.scuff < w.max + .003) {
		const next = WEAR[WEAR.indexOf(w) + 1];
		notes.push({
			id: "top-of-tier",
			name: `Best ${next.name}`,
			why: `Within 0.003 of ${w.name}: about as clean as ${next.name} gets.`,
			oneIn: 1 / share$1(w.max, w.max + .003)
		});
	}
	const famous = special(o);
	if (famous) notes.push({
		id: "famous-print",
		name: famous,
		why: "A famous print: the pattern itself is rare, and lifts the copy a grade.",
		oneIn: famous === "Deep Blue" ? 200 : 20
	});
	if (o.print === 1) notes.push({
		id: "print-1",
		name: "Print #1",
		why: "The first print of any run.",
		oneIn: 1e3
	});
	else if (o.print === 0) notes.push({
		id: "print-0",
		name: "Print #0",
		why: "Print zero: the one before the first.",
		oneIn: 1e3
	});
	else if (LUCKY_PRINTS[o.print]) notes.push({
		id: "lucky-print",
		name: `#${o.print} · ${LUCKY_PRINTS[o.print]}`,
		why: "A print number people collect for itself.",
		oneIn: 1e3
	});
	else if (o.print >= 111 && o.print % 111 === 0) notes.push({
		id: "triple-print",
		name: `#${o.print} · Triples`,
		why: "Three of a kind in the print number.",
		oneIn: 1e3 / 9
	});
	else if ([
		123,
		234,
		345,
		456,
		567,
		678,
		789,
		321,
		432,
		543,
		654,
		765,
		876,
		987
	].includes(o.print)) notes.push({
		id: "straight-print",
		name: `#${o.print} · Straight`,
		why: "A run in the print number.",
		oneIn: 1e3 / 14
	});
	if (o.fx) {
		const e = EFFECTS[o.fx];
		notes.push({
			id: "effect",
			name: e.name,
			why: `${e.what} An effect on top of its finish.`,
			oneIn: FINISHES[o.finish].aura ? e.aura : e.item
		});
	}
	if (o.souvenir) notes.push({
		id: "souvenir",
		name: "Souvenir",
		why: `From the free capsule for finishing every game on ${o.souvenir}. It can never be opened again.`,
		oneIn: 1
	});
	if (o.tally !== void 0) notes.push({
		id: "tally",
		name: `Tally ${o.tally.toLocaleString("en-US")}`,
		why: "Counts the days its owner finished their games wearing it. One copy in ten has one.",
		oneIn: 10
	});
	if (o.pins?.length) notes.push({
		id: "pins",
		name: `${o.pins.length} pin${o.pins.length === 1 ? "" : "s"}`,
		why: "Earned in the games and stuck on for good.",
		oneIn: 1
	});
	return notes.sort((a, b$1) => b$1.oneIn - a.oneIn);
}

//#endregion
//#region src/collect.ts
/**
* What a collector does with copies beyond opening them: name one, put five
* into a trade up, and fill a machine's set. The site and the Worker both use
* these, so a tag, a trade's float and a set read the same everywhere.
*/
/** The longest name tag. */
const TAG_MAX = 20;
const TAG_CHARS = /^[A-Za-z0-9 '!?.&#-]+$/;
const BLOCKED = [
	"fuck",
	"shit",
	"cunt",
	"nigg",
	"fag",
	"rape",
	"nazi",
	"hitler",
	"porn",
	"cock",
	"dick",
	"pussy",
	"whore",
	"slut",
	"retard",
	"kike",
	"spic",
	"chink",
	"tranny"
];
/**
* A name tag as it would be stored: spaces tidied, at most `TAG_MAX`
* characters. `''` takes a tag off; null means it can't be used.
*/
function cleanTag(raw) {
	const tag = String(raw ?? "").replace(/\s+/g, " ").trim();
	if (!tag) return "";
	if (tag.length > TAG_MAX || !TAG_CHARS.test(tag)) return null;
	const letters = tag.toLowerCase().replace(/[^a-z]/g, "").replace(/0/g, "o");
	if (BLOCKED.some((w) => letters.includes(w))) return null;
	return tag;
}
/** Where a float sits within what its finish can roll, 0 (cleanest) to 1. */
function floatShare(o) {
	const [lo, hi] = FINISHES[o.finish].scuffs;
	return hi > lo ? Math.min(1, Math.max(0, (o.scuff - lo) / (hi - lo))) : 0;
}
/**
* A trade up's float, the way CS works it out: how clean each input is within
* its own finish, averaged, then placed at the same point in the result's
* finish. Five clean inputs make a clean result, whatever comes out.
*/
function tradeFloat(inputs, out) {
	const avg = inputs.reduce((a, o) => a + floatShare(o), 0) / Math.max(1, inputs.length);
	const [lo, hi] = FINISHES[out].scuffs;
	return Math.round((lo + avg * (Math.min(1, hi) - lo)) * 1e7) / 1e7;
}
/** Which machine a trade up's result comes from: each game's share of the inputs. */
function tradeGames(inputs) {
	const share$1 = {};
	for (const o of inputs) {
		const g = itemById(o.item)?.game;
		if (g) share$1[g] = (share$1[g] || 0) + 1 / inputs.length;
	}
	return share$1;
}
/** A machine's set: every item its capsules give (starters and auras aside). */
function machineSet(game) {
	return gameItems(game).filter((i) => !i.free && i.slot !== "aura");
}
/** How far a collection is through a machine's set: which of its items are owned, in any finish. */
function setProgress(game, owned) {
	const items$1 = machineSet(game), have = new Set(owned.map((o) => o.item));
	const got = items$1.filter((i) => have.has(i.id));
	return {
		items: items$1,
		have: new Set(got.map((i) => i.id)),
		got: got.length,
		total: items$1.length,
		complete: got.length === items$1.length && items$1.length > 0
	};
}

//#endregion
//#region src/font.ts
const GLYPHS = {
	"0": [7, [
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"1": [7, [
		0,
		0,
		12,
		15,
		15,
		12,
		12,
		12,
		12,
		12,
		12,
		63,
		63,
		0,
		0,
		0
	]],
	"2": [7, [
		0,
		0,
		30,
		63,
		51,
		48,
		48,
		56,
		28,
		14,
		7,
		63,
		63,
		0,
		0,
		0
	]],
	"3": [7, [
		0,
		0,
		30,
		63,
		51,
		48,
		28,
		60,
		48,
		48,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"4": [7, [
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		63,
		62,
		48,
		48,
		48,
		48,
		0,
		0,
		0
	]],
	"5": [7, [
		0,
		0,
		63,
		63,
		3,
		3,
		31,
		63,
		48,
		48,
		48,
		63,
		31,
		0,
		0,
		0
	]],
	"6": [7, [
		0,
		0,
		30,
		63,
		51,
		3,
		31,
		63,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"7": [7, [
		0,
		0,
		63,
		63,
		48,
		48,
		56,
		24,
		28,
		12,
		12,
		12,
		12,
		0,
		0,
		0
	]],
	"8": [7, [
		0,
		0,
		30,
		63,
		51,
		51,
		30,
		63,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"9": [7, [
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		63,
		62,
		48,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	" ": [7, [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"!": [3, [
		0,
		0,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		0,
		3,
		3,
		0,
		0,
		0
	]],
	"\"": [6, [
		0,
		0,
		27,
		27,
		18,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"#": [8, [
		0,
		0,
		54,
		54,
		54,
		127,
		127,
		54,
		127,
		127,
		54,
		54,
		54,
		0,
		0,
		0
	]],
	"$": [7, [
		0,
		0,
		12,
		12,
		62,
		63,
		3,
		31,
		62,
		48,
		63,
		31,
		12,
		12,
		0,
		0
	]],
	"%": [7, [
		0,
		0,
		0,
		0,
		3,
		51,
		56,
		28,
		14,
		7,
		51,
		48,
		0,
		0,
		0,
		0
	]],
	"&": [10, [
		0,
		0,
		60,
		126,
		102,
		102,
		126,
		447,
		507,
		243,
		115,
		511,
		478,
		0,
		0,
		0
	]],
	"'": [3, [
		0,
		0,
		3,
		3,
		2,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"(": [5, [
		0,
		0,
		14,
		15,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		15,
		14,
		0
	]],
	")": [5, [
		0,
		0,
		7,
		15,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		15,
		7,
		0
	]],
	"*": [6, [
		0,
		0,
		27,
		31,
		14,
		31,
		27,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"+": [7, [
		0,
		0,
		0,
		0,
		0,
		12,
		12,
		63,
		63,
		12,
		12,
		0,
		0,
		0,
		0,
		0
	]],
	",": [3, [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		3,
		3,
		2,
		0,
		0
	]],
	"-": [7, [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		63,
		63,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	".": [3, [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		3,
		3,
		0,
		0,
		0
	]],
	"/": [7, [
		0,
		0,
		48,
		48,
		56,
		24,
		28,
		12,
		14,
		6,
		7,
		3,
		3,
		0,
		0,
		0
	]],
	":": [3, [
		0,
		0,
		0,
		0,
		0,
		3,
		3,
		0,
		0,
		0,
		0,
		3,
		3,
		0,
		0,
		0
	]],
	";": [3, [
		0,
		0,
		0,
		0,
		0,
		3,
		3,
		0,
		0,
		0,
		0,
		3,
		3,
		2,
		0,
		0
	]],
	"<": [6, [
		0,
		0,
		0,
		0,
		0,
		24,
		28,
		14,
		7,
		7,
		14,
		28,
		24,
		0,
		0,
		0
	]],
	"=": [7, [
		0,
		0,
		0,
		0,
		0,
		63,
		63,
		0,
		0,
		63,
		63,
		0,
		0,
		0,
		0,
		0
	]],
	">": [6, [
		0,
		0,
		0,
		0,
		0,
		3,
		7,
		14,
		28,
		28,
		14,
		7,
		3,
		0,
		0,
		0
	]],
	"?": [7, [
		0,
		0,
		30,
		63,
		51,
		48,
		56,
		28,
		12,
		12,
		0,
		12,
		12,
		0,
		0,
		0
	]],
	"@": [10, [
		0,
		0,
		124,
		254,
		455,
		499,
		507,
		475,
		507,
		243,
		7,
		510,
		508,
		0,
		0,
		0
	]],
	"A": [7, [
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		63,
		63,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"B": [7, [
		0,
		0,
		31,
		63,
		51,
		51,
		63,
		31,
		51,
		51,
		51,
		63,
		31,
		0,
		0,
		0
	]],
	"C": [7, [
		0,
		0,
		62,
		63,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		63,
		62,
		0,
		0,
		0
	]],
	"D": [7, [
		0,
		0,
		31,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		31,
		0,
		0,
		0
	]],
	"E": [7, [
		0,
		0,
		62,
		63,
		3,
		3,
		31,
		31,
		3,
		3,
		3,
		63,
		62,
		0,
		0,
		0
	]],
	"F": [7, [
		0,
		0,
		62,
		63,
		3,
		3,
		31,
		31,
		3,
		3,
		3,
		3,
		3,
		0,
		0,
		0
	]],
	"G": [7, [
		0,
		0,
		62,
		63,
		3,
		3,
		59,
		59,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"H": [7, [
		0,
		0,
		51,
		51,
		51,
		51,
		63,
		63,
		51,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"I": [7, [
		0,
		0,
		63,
		63,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		63,
		63,
		0,
		0,
		0
	]],
	"J": [7, [
		0,
		0,
		63,
		63,
		48,
		48,
		48,
		48,
		48,
		48,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"K": [7, [
		0,
		0,
		51,
		51,
		51,
		59,
		31,
		15,
		31,
		59,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"L": [7, [
		0,
		0,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		63,
		62,
		0,
		0,
		0
	]],
	"M": [9, [
		0,
		0,
		127,
		255,
		219,
		219,
		219,
		219,
		219,
		219,
		219,
		195,
		195,
		0,
		0,
		0
	]],
	"N": [7, [
		0,
		0,
		31,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"O": [7, [
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"P": [7, [
		0,
		0,
		31,
		63,
		51,
		51,
		51,
		63,
		31,
		3,
		3,
		3,
		3,
		0,
		0,
		0
	]],
	"Q": [8, [
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		59,
		127,
		110,
		0,
		0,
		0
	]],
	"R": [7, [
		0,
		0,
		31,
		63,
		51,
		51,
		63,
		31,
		59,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"S": [7, [
		0,
		0,
		62,
		63,
		3,
		3,
		31,
		62,
		48,
		48,
		48,
		63,
		31,
		0,
		0,
		0
	]],
	"T": [7, [
		0,
		0,
		63,
		63,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		0,
		0,
		0
	]],
	"U": [7, [
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"V": [7, [
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		12,
		0,
		0,
		0
	]],
	"W": [9, [
		0,
		0,
		195,
		195,
		195,
		195,
		219,
		219,
		219,
		219,
		219,
		255,
		126,
		0,
		0,
		0
	]],
	"X": [8, [
		0,
		0,
		99,
		99,
		99,
		119,
		62,
		28,
		62,
		119,
		99,
		99,
		99,
		0,
		0,
		0
	]],
	"Y": [7, [
		0,
		0,
		51,
		51,
		51,
		51,
		63,
		30,
		12,
		12,
		12,
		12,
		12,
		0,
		0,
		0
	]],
	"Z": [7, [
		0,
		0,
		63,
		63,
		56,
		24,
		28,
		12,
		14,
		6,
		7,
		63,
		63,
		0,
		0,
		0
	]],
	"[": [5, [
		0,
		0,
		15,
		15,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		15,
		15,
		0
	]],
	"\\": [7, [
		0,
		0,
		3,
		3,
		7,
		6,
		14,
		12,
		28,
		24,
		56,
		48,
		48,
		0,
		0,
		0
	]],
	"]": [5, [
		0,
		0,
		15,
		15,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		15,
		15,
		0
	]],
	"^": [7, [
		0,
		0,
		12,
		30,
		63,
		51,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"_": [7, [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		63,
		63,
		0,
		0,
		0
	]],
	"`": [5, [
		6,
		8,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"a": [7, [
		0,
		0,
		0,
		0,
		0,
		31,
		63,
		48,
		62,
		63,
		51,
		63,
		62,
		0,
		0,
		0
	]],
	"b": [7, [
		0,
		0,
		3,
		3,
		3,
		31,
		63,
		51,
		51,
		51,
		51,
		63,
		31,
		0,
		0,
		0
	]],
	"c": [7, [
		0,
		0,
		0,
		0,
		0,
		62,
		63,
		3,
		3,
		3,
		3,
		63,
		62,
		0,
		0,
		0
	]],
	"d": [7, [
		0,
		0,
		48,
		48,
		48,
		62,
		63,
		51,
		51,
		51,
		51,
		63,
		62,
		0,
		0,
		0
	]],
	"e": [7, [
		0,
		0,
		0,
		0,
		0,
		30,
		63,
		51,
		63,
		63,
		3,
		63,
		62,
		0,
		0,
		0
	]],
	"f": [7, [
		0,
		0,
		60,
		62,
		6,
		31,
		31,
		6,
		6,
		6,
		6,
		6,
		6,
		0,
		0,
		0
	]],
	"g": [7, [
		0,
		0,
		0,
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		63,
		62,
		48,
		63,
		31
	]],
	"h": [7, [
		0,
		0,
		3,
		3,
		3,
		31,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"i": [3, [
		0,
		0,
		3,
		3,
		0,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		0,
		0,
		0
	]],
	"j": [5, [
		0,
		0,
		12,
		12,
		0,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		12,
		15,
		7
	]],
	"k": [7, [
		0,
		0,
		3,
		3,
		3,
		31,
		63,
		51,
		63,
		31,
		59,
		51,
		51,
		0,
		0,
		0
	]],
	"l": [3, [
		0,
		0,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		0,
		0,
		0
	]],
	"m": [9, [
		0,
		0,
		0,
		0,
		0,
		127,
		255,
		219,
		219,
		219,
		219,
		219,
		219,
		0,
		0,
		0
	]],
	"n": [7, [
		0,
		0,
		0,
		0,
		0,
		31,
		63,
		51,
		51,
		51,
		51,
		51,
		51,
		0,
		0,
		0
	]],
	"o": [7, [
		0,
		0,
		0,
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"p": [7, [
		0,
		0,
		0,
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		63,
		31,
		3,
		3,
		3
	]],
	"q": [7, [
		0,
		0,
		0,
		0,
		0,
		30,
		63,
		51,
		51,
		51,
		51,
		63,
		62,
		48,
		48,
		48
	]],
	"r": [7, [
		0,
		0,
		0,
		0,
		0,
		59,
		63,
		7,
		3,
		3,
		3,
		3,
		3,
		0,
		0,
		0
	]],
	"s": [7, [
		0,
		0,
		0,
		0,
		0,
		62,
		63,
		3,
		31,
		62,
		48,
		63,
		31,
		0,
		0,
		0
	]],
	"t": [7, [
		0,
		0,
		6,
		6,
		6,
		63,
		63,
		6,
		6,
		6,
		6,
		62,
		60,
		0,
		0,
		0
	]],
	"u": [7, [
		0,
		0,
		0,
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		0,
		0,
		0
	]],
	"v": [7, [
		0,
		0,
		0,
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		63,
		30,
		12,
		0,
		0,
		0
	]],
	"w": [9, [
		0,
		0,
		0,
		0,
		0,
		195,
		219,
		219,
		219,
		219,
		219,
		255,
		126,
		0,
		0,
		0
	]],
	"x": [8, [
		0,
		0,
		0,
		0,
		0,
		99,
		119,
		62,
		28,
		28,
		62,
		119,
		99,
		0,
		0,
		0
	]],
	"y": [7, [
		0,
		0,
		0,
		0,
		0,
		51,
		51,
		51,
		51,
		51,
		51,
		63,
		62,
		48,
		63,
		31
	]],
	"z": [7, [
		0,
		0,
		0,
		0,
		0,
		63,
		63,
		56,
		28,
		14,
		7,
		63,
		63,
		0,
		0,
		0
	]],
	"{": [6, [
		0,
		0,
		28,
		30,
		6,
		6,
		6,
		7,
		3,
		6,
		6,
		6,
		6,
		30,
		28,
		0
	]],
	"|": [3, [
		0,
		0,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		0
	]],
	"}": [6, [
		0,
		0,
		7,
		15,
		12,
		12,
		12,
		28,
		24,
		12,
		12,
		12,
		12,
		15,
		7,
		0
	]],
	"~": [7, [
		0,
		0,
		0,
		0,
		0,
		0,
		6,
		47,
		61,
		24,
		0,
		0,
		0,
		0,
		0,
		0
	]]
};

//#endregion
//#region src/gif.ts
/** Each pixel made a `scale` by `scale` block. */
function upscale(rgba, width, height, scale$1) {
	if (scale$1 === 1) return rgba;
	const W = width * scale$1, out = new Uint8ClampedArray(W * height * scale$1 * 4);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const i = (y * width + x) * 4;
		for (let dy = 0; dy < scale$1; dy++) for (let dx = 0; dx < scale$1; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale$1 + dy) * W + x * scale$1 + dx) * 4);
	}
	return out;
}
/**
* Up to 255 colours that stand for every opaque pixel across the frames: all
* of them when there are that few, else a median cut weighted by how much
* each colour is used.
*/
function palette(frames) {
	const counts = new Map();
	for (const f of frames) for (let i = 0; i < f.length; i += 4) {
		if (f[i + 3] < 128) continue;
		const c = f[i] << 16 | f[i + 1] << 8 | f[i + 2];
		counts.set(c, (counts.get(c) || 0) + 1);
	}
	const all = [...counts.entries()];
	if (all.length <= 255) return all.map(([c]) => c);
	const ch = (c, k) => c >> 16 - 8 * k & 255;
	const range = (box, k) => {
		let lo = 255, hi = 0;
		for (const [c] of box) {
			const v = ch(c, k);
			if (v < lo) lo = v;
			if (v > hi) hi = v;
		}
		return hi - lo;
	};
	let boxes = [all];
	while (boxes.length < 255) {
		let best = -1, bk = 0, bw = -1;
		boxes.forEach((box$1, i) => {
			if (box$1.length < 2) return;
			for (let k = 0; k < 3; k++) {
				const w = range(box$1, k) * Math.log2(1 + box$1.reduce((a, [, n]) => a + n, 0));
				if (w > bw) {
					bw = w;
					best = i;
					bk = k;
				}
			}
		});
		if (best < 0) break;
		const box = boxes[best].sort((a, b$1) => ch(a[0], bk) - ch(b$1[0], bk));
		const total = box.reduce((a, [, n]) => a + n, 0);
		let run = 0, cut = 1;
		for (let i = 0; i < box.length - 1; i++) {
			run += box[i][1];
			if (run >= total / 2) {
				cut = i + 1;
				break;
			}
		}
		boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
	}
	return boxes.map((box) => {
		let r = 0, g = 0, b$1 = 0, n = 0;
		for (const [c, k] of box) {
			r += ch(c, 0) * k;
			g += ch(c, 1) * k;
			b$1 += ch(c, 2) * k;
			n += k;
		}
		return Math.round(r / n) << 16 | Math.round(g / n) << 8 | Math.round(b$1 / n);
	});
}
/** LZW-compresses colour indices into GIF data sub-blocks. */
function lzw(indices, minCode, out) {
	const clear = 1 << minCode, end = clear + 1;
	let size = minCode + 1, next = end + 1, dict = new Map();
	let bits = 0, acc = 0;
	const block = [];
	const emit = (code) => {
		acc |= code << bits;
		bits += size;
		while (bits >= 8) {
			block.push(acc & 255);
			acc >>= 8;
			bits -= 8;
			if (block.length === 255) {
				out.push(255, ...block);
				block.length = 0;
			}
		}
	};
	emit(clear);
	let prefix = indices[0];
	for (let i = 1; i < indices.length; i++) {
		const k = indices[i], key = prefix << 8 | k, hit = dict.get(key);
		if (hit !== void 0) {
			prefix = hit;
			continue;
		}
		emit(prefix);
		if (next < 4096) {
			dict.set(key, next++);
			if (next > 1 << size && size < 12) size++;
		} else {
			emit(clear);
			dict = new Map();
			size = minCode + 1;
			next = end + 1;
		}
		prefix = k;
	}
	emit(prefix);
	emit(end);
	if (bits > 0) block.push(acc & 255);
	if (block.length) out.push(block.length, ...block);
	out.push(0);
}
/**
* An animated GIF that loops forever. Transparent pixels stay transparent
* (each frame clears to them), so a guy can be saved without a background.
*/
function encodeGif(input, scale$1 = 1) {
	const W = input.width * scale$1, H = input.height * scale$1;
	const frames = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const colours = palette(frames);
	const table = [0, ...colours];
	let bitsPer = 1;
	while (1 << bitsPer < table.length) bitsPer++;
	const out = [];
	const word = (n) => out.push(n & 255, n >> 8 & 255);
	out.push(...[..."GIF89a"].map((c) => c.charCodeAt(0)));
	word(W);
	word(H);
	out.push(128 | bitsPer - 1 << 4 | bitsPer - 1, 0, 0);
	for (let i = 0; i < 1 << bitsPer; i++) {
		const c = table[i] ?? 0;
		out.push(c >> 16 & 255, c >> 8 & 255, c & 255);
	}
	out.push(33, 255, 11, ...[..."NETSCAPE2.0"].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
	const nearest = new Map();
	const indexOf = (c) => {
		let i = nearest.get(c);
		if (i !== void 0) return i;
		let best = 1, bd = Infinity;
		for (let k = 1; k < table.length; k++) {
			const p = table[k], dr = (c >> 16 & 255) - (p >> 16 & 255), dg = (c >> 8 & 255) - (p >> 8 & 255), db = (c & 255) - (p & 255);
			const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
			if (d < bd) {
				bd = d;
				best = k;
				if (!d) break;
			}
		}
		nearest.set(c, best);
		return best;
	};
	frames.forEach((f, n) => {
		const delay = Math.max(2, Math.round((input.delays[n] ?? 80) / 10));
		out.push(33, 249, 4, 9);
		word(delay);
		out.push(0, 0);
		out.push(44);
		word(0);
		word(0);
		word(W);
		word(H);
		out.push(0);
		const idx = new Uint8Array(W * H);
		for (let i = 0, p = 0; i < f.length; i += 4, p++) idx[p] = f[i + 3] < 128 ? 0 : indexOf(f[i] << 16 | f[i + 1] << 8 | f[i + 2]);
		const min = Math.max(2, bitsPer);
		out.push(min);
		lzw(idx, min, out);
	});
	out.push(59);
	return new Uint8Array(out);
}
const CRC = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
const crc32 = (bytes) => {
	let c = 4294967295;
	for (const b$1 of bytes) c = CRC[(c ^ b$1) & 255] ^ c >>> 8;
	return (c ^ 4294967295) >>> 0;
};
/** zlib-wrapped deflate: compressed where the runtime has CompressionStream, else stored. */
async function zlib(raw) {
	if (typeof CompressionStream !== "undefined") {
		const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	}
	const out = [120, 1];
	for (let i = 0; i < raw.length; i += 65535) {
		const n = Math.min(65535, raw.length - i);
		out.push(i + n >= raw.length ? 1 : 0, n & 255, n >> 8, ~n & 255, ~n >> 8 & 255);
		for (let k = 0; k < n; k++) out.push(raw[i + k]);
	}
	let a = 1, b$1 = 0;
	for (const v of raw) {
		a = (a + v) % 65521;
		b$1 = (b$1 + a) % 65521;
	}
	out.push(b$1 >> 8, b$1 & 255, a >> 8, a & 255);
	return new Uint8Array(out);
}
const concat = (parts) => {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
};
const u32 = (n) => new Uint8Array([
	n >>> 24,
	n >>> 16 & 255,
	n >>> 8 & 255,
	n & 255
]);
const u16 = (n) => new Uint8Array([n >>> 8 & 255, n & 255]);
function chunk(type, data) {
	const body = concat([new Uint8Array([...type].map((c) => c.charCodeAt(0))), data]);
	return concat([
		u32(data.length),
		body,
		u32(crc32(body))
	]);
}
/**
* The PNG layout for a set of frames: indexed (a palette and its transparency)
* when they use 256 colours or fewer, which pixel art nearly always does and
* which packs several times smaller, else full RGBA.
*/
function layout(frames) {
	const key = (px, i) => px[i + 3] < 128 ? -1 : px[i] << 16 | px[i + 1] << 8 | px[i + 2];
	const index = new Map([[-1, 0]]);
	for (const px of frames) for (let i = 0; i < px.length && index.size <= 256; i += 4) {
		const k = key(px, i);
		if (!index.has(k)) index.set(k, index.size);
	}
	if (index.size > 256) return {
		indexed: false,
		colours: [],
		rows: (px, W, H) => {
			const raw = new Uint8Array((W * 4 + 1) * H);
			for (let y = 0; y < H; y++) raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
			return raw;
		}
	};
	return {
		indexed: true,
		colours: [...index.keys()],
		rows: (px, W, H) => {
			const raw = new Uint8Array((W + 1) * H);
			for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * (W + 1) + 1 + x] = index.get(key(px, (y * W + x) * 4));
			return raw;
		}
	};
}
async function png(input, scale$1, animated) {
	const W = input.width * scale$1, H = input.height * scale$1;
	const frames = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const { indexed, colours, rows } = layout(frames);
	const head = new Uint8Array([
		...u32(W),
		...u32(H),
		8,
		indexed ? 3 : 6,
		0,
		0,
		0
	]);
	const parts = [new Uint8Array([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	]), chunk("IHDR", head)];
	if (indexed) {
		parts.push(chunk("PLTE", new Uint8Array(colours.flatMap((k) => k < 0 ? [
			0,
			0,
			0
		] : [
			k >> 16,
			k >> 8 & 255,
			k & 255
		]))));
		parts.push(chunk("tRNS", new Uint8Array([0])));
	}
	let seq = 0;
	if (animated) parts.push(chunk("acTL", concat([u32(frames.length), u32(0)])));
	for (let i = 0; i < frames.length; i++) {
		if (animated) parts.push(chunk("fcTL", concat([
			u32(seq++),
			u32(W),
			u32(H),
			u32(0),
			u32(0),
			u16(Math.max(1, Math.round(input.delays[i] ?? 100))),
			u16(1e3),
			new Uint8Array([0, 0])
		])));
		const data = await zlib(rows(frames[i], W, H));
		parts.push(i === 0 ? chunk("IDAT", data) : chunk("fdAT", concat([u32(seq++), data])));
		if (!animated) break;
	}
	parts.push(chunk("IEND", new Uint8Array()));
	return concat(parts);
}
/** A PNG of one RGBA frame, scaled up by whole pixels. */
function encodePng(rgba, width, height, scale$1 = 1) {
	return png({
		width,
		height,
		frames: [rgba],
		delays: [0]
	}, scale$1, false);
}
/**
* An animated PNG of the frames, looping for ever. Browsers play it in a plain
* `<img>` with no script, keep its transparency whole, and a still viewer
* shows its first frame. Scale it up by whole pixels here, or in CSS with
* `image-rendering: pixelated`.
*/
function encodeApng(input, scale$1 = 1) {
	return png(input, scale$1, true);
}

//#endregion
//#region src/card.ts
/**
* Trading cards, drawn by the library so every game, the site and an export
* show the same card: a guy wearing his copies, moving, each copy's finish
* shining on its own pixels, its effect playing, the card's face dressed for
* the grade, and the words written in the club's pixel type.
*
* A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, six to each of the
* guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
* up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
*/
const CARD_WIDTH = 140;
const CARD_HEIGHT = 204;
const ZOOM = 6;
const rgb$2 = (h) => [
	parseInt(h.slice(1, 3), 16),
	parseInt(h.slice(3, 5), 16),
	parseInt(h.slice(5, 7), 16)
];
const mix = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const hsv = (h, s, v) => {
	const f = (n) => {
		const k = (n + h * 6) % 6;
		return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
	};
	return [
		f(5) * 255,
		f(3) * 255,
		f(1) * 255
	];
};
const hash$1 = (x, y, p) => {
	const s = Math.sin(x * 127.1 + y * 311.7 + p * .731) * 43758.5453;
	return s - Math.floor(s);
};
/**
* One card pixel of a copy in its finish at time `t` seconds: the finishes'
* shader (./finish-shader), worked out here so the card can be saved.
* `gx, gy` is the guy pixel (what twinkles), `cx, cy` the card pixel (what a
* sweep crosses), so light runs smoothly over a single pixel of a hat.
*/
function shine(c, o, gx, gy, cx, cy, t) {
	const f = SHADER_FINISHES.indexOf(o.finish);
	if (f < 0) return c;
	const out = finishColor([
		c[0] / 255,
		c[1] / 255,
		c[2] / 255
	], f, o.scuff, hash$1(gx, gy, o.print), (cx + cy) / ZOOM, gy, o.print, loopSeconds(t * 1e3), 1);
	return [
		out[0] * 255,
		out[1] * 255,
		out[2] * 255
	];
}
const EXTRA = {
	"·": [5, [
		0,
		0,
		0,
		0,
		0,
		0,
		6,
		6,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	]],
	"★": [9, [
		0,
		0,
		0,
		8,
		8,
		28,
		127,
		62,
		28,
		54,
		34,
		0,
		0,
		0,
		0,
		0
	]],
	"#": [8, [
		0,
		0,
		0,
		0,
		18,
		18,
		63,
		18,
		18,
		63,
		18,
		18,
		0,
		0,
		0,
		0
	]]
};
const glyph = (ch) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS["?"];
/** How wide a line of text is, in pixels. */
const textWidth = (s) => [...s].reduce((w, ch) => w + glyph(ch)[0], 0);
/**
* Words broken into lines that fit `width`: at spaces, and inside a word only
* when the word alone is too wide. Nothing is ever cut off.
*/
function wrapText(text, width) {
	const parts = text.split(" · ");
	if (parts.length > 1 && parts.every((p) => textWidth(p) <= width)) {
		const out = [];
		for (const p of parts) {
			const next = out.length ? out[out.length - 1] + " · " + p : p;
			if (out.length && textWidth(next) <= width) out[out.length - 1] = next;
			else out.push(p);
		}
		return out;
	}
	const lines = [];
	let line = "";
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const next = line ? line + " " + word : word;
		if (textWidth(next) <= width) {
			line = next;
			continue;
		}
		if (line) lines.push(line);
		line = "";
		let rest = word;
		while (textWidth(rest) > width) {
			let k = rest.length - 1;
			while (k > 1 && textWidth(rest.slice(0, k)) > width) k--;
			lines.push(rest.slice(0, k));
			rest = rest.slice(k);
		}
		line = rest;
	}
	if (line) lines.push(line);
	return lines;
}
/** A drawing surface of RGBA card pixels. */
var Surface = class {
	px = new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4);
	set(x, y, c, a = 255) {
		if (x < 0 || y < 0 || x >= CARD_WIDTH || y >= CARD_HEIGHT) return;
		const i = (y * CARD_WIDTH + x) * 4;
		this.px[i] = c[0];
		this.px[i + 1] = c[1];
		this.px[i + 2] = c[2];
		this.px[i + 3] = a;
	}
	get(x, y) {
		const i = (y * CARD_WIDTH + x) * 4;
		return [
			this.px[i],
			this.px[i + 1],
			this.px[i + 2]
		];
	}
	opaque(x, y) {
		return this.px[(y * CARD_WIDTH + x) * 4 + 3] > 0;
	}
	/** Text with a hard drop shadow, its colour picked per pixel so foil can run along it. */
	text(s, x, top, colour, shadow) {
		const draw = (ox, oy, col) => {
			let cx = ox;
			for (const ch of s) {
				const [adv, rows] = glyph(ch);
				rows.forEach((bits, dy) => {
					for (let dx = 0; bits >> dx; dx++) if (bits & 1 << dx) this.set(cx + dx, oy + dy, col(cx + dx, oy + dy));
				});
				cx += adv;
			}
		};
		if (shadow) draw(x, top + 1, () => shadow);
		draw(x, top, colour);
	}
};
const EDGE = [
	30,
	34,
	56
], CREAM = [
	242,
	236,
	221
], RIM = [
	207,
	199,
	180
], INK = [
	58,
	51,
	82
], WHITE = [
	255,
	255,
	255
];
/** Whether a card pixel is inside the rounded card. */
function inside(x, y, r = 7) {
	const cx = x < r ? r - x : x > CARD_WIDTH - 1 - r ? x - (CARD_WIDTH - 1 - r) : 0;
	const cy = y < r ? r - y : y > CARD_HEIGHT - 1 - r ? y - (CARD_HEIGHT - 1 - r) : 0;
	return cx * cx + cy * cy <= r * r;
}
const SIDE = 8, LINE = 13;
/**
* The card at `t` seconds, with the guy's frame `frame` in its window.
*
* Laid out from the foot up so the words always fit: the second line (wrapped
* as long as it needs), a pill naming the grade, the title (wrapped), and the
* window takes the rest, so the card is mostly him. The rarer the card, the
* more it does, one smooth effect at a time, as Balatro's editions do: a sheen
* on the border, foil bands, a holographic face, then a gold card he rises out
* of, then the night card with stars and a colour-turning edge.
*/
function drawCard(input, frame, owned, g, t) {
	const tm = t * 1e3;
	const s = new Surface();
	const gc = g >= 0 ? rgb$2(GRADES[g].color) : [
		120,
		140,
		170
	];
	const textW = CARD_WIDTH - SIDE * 2 - 6;
	const pill = input.lines?.[0], subs = (input.lines ?? []).slice(1).flatMap((l) => wrapText(l, textW));
	const titles = wrapText(input.title, textW);
	let y = CARD_HEIGHT - SIDE - 2 - subs.length * LINE;
	const subTop = y;
	const pillTop = pill ? y -= 17 : y;
	y -= 4 + titles.length * LINE;
	const titleTop = y;
	const WIN = {
		left: SIDE,
		right: CARD_WIDTH - 1 - SIDE,
		top: SIDE,
		bottom: y - 4
	};
	const night = g === 5, gold = g === 4, soul = g >= 4;
	const face = (x, y$1) => {
		if (night) return mix([
			20,
			22,
			40
		], hsv(wrap((x + y$1) / 300 + tm / fit(25e3), 1), .4, .5), .22);
		if (gold) return mix(mix(CREAM, [
			255,
			206,
			110
		], .42), WHITE, .25 * Math.max(0, Math.sin((x + y$1) * .035 - tm / wave(625))) ** 6);
		if (g === 3) {
			const holo = hsv(wrap(x * .006 + y$1 * .004 - tm / fit(1e3 / .07), 1), .28, 1);
			return mix(mix(CREAM, holo, .42), WHITE, (x - y$1 + 400) % 5 === 0 ? .1 : 0);
		}
		return CREAM;
	};
	const sheen = (x, y$1) => Math.max(0, 1 - Math.abs(wrap((x + y$1) * .5 - tm * 170 / fit(4250), 170) - 85) / 9);
	for (let yy = 0; yy < CARD_HEIGHT; yy++) for (let x = 0; x < CARD_WIDTH; x++) {
		if (!inside(x, yy)) continue;
		const edge = !inside(x - 3, yy) || !inside(x + 3, yy) || !inside(x, yy - 3) || !inside(x, yy + 3);
		let border = g >= 0 ? mix(gc, EDGE, .3) : EDGE;
		if (g >= 1 && g <= 3) border = mix(border, WHITE, sheen(x, yy) * .6);
		if (gold) border = mix([
			178,
			120,
			28
		], [
			255,
			236,
			170
		], .5 + .5 * Math.sin((x - yy) * .06 + tm / wave(1e3 / 2.4)));
		if (night) border = hsv(wrap((x + yy) / 160 + tm / fit(1e3 / .12), 1), .55, .98);
		const rim$1 = !inside(x - 1, yy) || !inside(x + 1, yy) || !inside(x, yy - 1) || !inside(x, yy + 1);
		s.set(x, yy, rim$1 ? mix(border, [
			10,
			10,
			20
		], .55) : edge ? border : face(x, yy));
	}
	const tint = night ? [
		16,
		20,
		38
	] : mix(CREAM, gc, g >= 0 ? .28 : .14);
	const stars = night ? Array.from({ length: 14 }, (_, k) => [
		WIN.left + 3 + Math.floor(hash$1(k, 4, 2) * (WIN.right - WIN.left - 6)),
		WIN.top + 3 + Math.floor(hash$1(k, 5, 2) * (WIN.bottom - WIN.top - 6)),
		hash$1(k, 6, 2)
	]) : [];
	for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$1 = x === WIN.left || x === WIN.right || yy === WIN.top || yy === WIN.bottom;
		const depth = (yy - WIN.top) / (WIN.bottom - WIN.top);
		let c = rim$1 ? night ? [
			70,
			86,
			120
		] : mix(RIM, gc, .25) : mix(tint, mix(tint, [
			20,
			24,
			40
		], .5), depth * .3);
		if (!rim$1 && g === 2) c = mix(c, [
			226,
			238,
			255
		], .3 * Math.max(0, Math.sin((x - yy * .6) * .09 - tm / wave(1e3 / 1.3))) ** 3);
		const fx = (x - (WIN.left + WIN.right) / 2) / 34, fy = (yy - (WIN.bottom - 9)) / 4;
		if (!rim$1 && fx * fx + fy * fy < 1) c = mix(c, [
			0,
			0,
			0
		], (soul ? .12 : .18) * (1 - fx * fx - fy * fy));
		s.set(x, yy, c);
	}
	for (const [x, yy, ph] of stars) {
		const on = Math.sin(tm / wave(1e3 / 2.2) + ph * 20) > .2;
		s.set(x, yy, on ? [
			255,
			255,
			240
		] : [
			120,
			130,
			170
		]);
		if (on && ph > .6) for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) s.set(x + dx, yy + dy, [
			150,
			160,
			210
		]);
	}
	let topRow = FRAME_HEIGHT, botRow = 0;
	frame.colors.forEach((row, gy) => {
		if (row.some(Boolean)) {
			topRow = Math.min(topRow, gy);
			botRow = gy;
		}
	});
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - FRAME_WIDTH * ZOOM / 2);
	const bob = soul ? Math.round(Math.sin(tm / wave(1e3 / 2.6)) * 2) : 0;
	let oy = WIN.bottom - 5 - (botRow + 1) * ZOOM;
	if (soul) oy = Math.max(5 - topRow * ZOOM, Math.min(oy, Math.round((WIN.top + WIN.bottom) / 2 - (topRow + botRow + 1) * ZOOM / 2) - 10)) + bob;
	const clip = (cx, cy) => soul ? inside(cx, cy) && cx > 3 && cx < CARD_WIDTH - 4 && cy > 3 && cy < WIN.bottom : cy > WIN.top && cy < WIN.bottom && cx > WIN.left && cx < WIN.right;
	const solid = (gx, gy) => !!frame.colors[gy]?.[gx] && frame.slots[gy]?.[gx] !== 5;
	const edgeC = night ? mix(tint, WHITE, .42) : mix(tint, WHITE, .55);
	for (let yy = 0; yy < CARD_HEIGHT; yy++) for (let x = 0; x < CARD_WIDTH; x++) {
		if (!clip(x, yy)) continue;
		const gx = Math.floor((x - ox) / ZOOM), gy = Math.floor((yy - oy) / ZOOM);
		if (x - ox >= 0 && yy - oy >= 0 && solid(gx, gy)) continue;
		const near = [
			[2, 0],
			[-2, 0],
			[0, 2],
			[0, -2],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1]
		].some(([dx, dy]) => x + dx - ox >= 0 && yy + dy - oy >= 0 && solid(Math.floor((x + dx - ox) / ZOOM), Math.floor((yy + dy - oy) / ZOOM)));
		if (near) s.set(x, yy, soul && (yy <= WIN.top || x <= WIN.left || x >= WIN.right) ? [
			255,
			250,
			235
		] : edgeC);
	}
	frame.colors.forEach((row, gy) => row.forEach((hex$1, gx) => {
		if (!hex$1) return;
		const slot = frame.slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0;
		for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
			const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
			if (!clip(cx, cy)) continue;
			let c = rgb$2(hex$1);
			if (copy) c = shine(c, copy, gx, gy, cx, cy, t);
			s.set(cx, cy, [
				Math.min(255, Math.max(0, c[0])),
				Math.min(255, Math.max(0, c[1])),
				Math.min(255, Math.max(0, c[2]))
			]);
		}
	}));
	for (const [gx, gy, hex$1] of frame.outside ?? []) for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
		const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
		if (clip(cx, cy)) s.set(cx, cy, rgb$2(hex$1));
	}
	const glare = cycle(tm, 2200 / .45) * 2.2 * 180 - 50;
	for (let yy = WIN.top + 1; yy < WIN.bottom; yy++) for (let x = WIN.left + 1; x < WIN.right; x++) {
		const d = x + (yy - WIN.top) * .6 - glare;
		if (d > 0 && d < 12) s.set(x, yy, mix(s.get(x, yy), WHITE, d < 3 ? .18 : .08));
	}
	if (input.corner) {
		const w = textWidth(input.corner) + 5, x0 = WIN.right - 3 - w, y0 = WIN.top + 3;
		for (let yy = y0; yy < y0 + 13; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 12))) s.set(x, yy, [
			20,
			18,
			38
		]);
		s.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
	}
	const ink = night ? [
		230,
		238,
		255
	] : INK;
	const foil = (x, yy) => gold ? mix([
		150,
		92,
		12
	], [
		96,
		56,
		0
	], .5 + .5 * Math.sin(x * .15 - tm / wave(1e3 / 3) + yy * .1)) : night ? hsv(wrap(x * .01 - tm / fit(4e3), 1), .35, 1) : ink;
	titles.forEach((l, k) => s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), titleTop + k * LINE - 1, foil, night ? [
		8,
		8,
		20
	] : void 0));
	if (pill) {
		const w = textWidth(pill) + 14, x0 = Math.floor((CARD_WIDTH - w) / 2);
		const fill = night ? hsv(wrap(tm / fit(1e3 / .12), 1), .45, .85) : g >= 0 ? gc : [
			120,
			130,
			150
		];
		for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
			const r = x < x0 + 3 ? x0 + 3 - x : x > x0 + w - 4 ? x - (x0 + w - 4) : 0, ry = yy < pillTop + 3 ? pillTop + 3 - yy : yy > pillTop + 11 ? yy - (pillTop + 11) : 0;
			if (r * r + ry * ry > 10) continue;
			s.set(x, yy, yy === pillTop + 14 ? mix(fill, [
				0,
				0,
				0
			], .35) : yy <= pillTop + 1 ? mix(fill, WHITE, .3) : fill);
		}
		s.text(pill, x0 + 7, pillTop - 1, () => WHITE, mix(fill, [
			0,
			0,
			0
		], .5));
	}
	subs.forEach((l, k) => s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), subTop + k * LINE - 2, () => night ? [
		190,
		200,
		230
	] : mix(INK, CREAM, .25)));
	return s.px;
}
/** The grade a card shows: the one given, or the rarest copy's. */
const cardGrade = (input) => input.grade ?? (input.copies?.length ? Math.max(...input.copies.map((o) => GRADES.findIndex((x) => x.id === gradeOf(o).id))) : -1);
/**
* The card as frames, `ms` apart, covering one loop of his move (at least two
* seconds, so a shine gets across). Every frame is the whole card in RGBA;
* the corners are transparent.
*/
function cardFrames(input, ms = 80) {
	const card = cardPlayer(input, ms), frames = [];
	for (let i = 0; i < card.count; i++) frames.push(card.frame(i));
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		frames,
		delays: card.delays
	};
}
/**
* A card to play on screen: each frame is drawn the first time it is asked
* for and kept, so a page can show a card at once and spread the work out.
* It loops perfectly: his move played the whole number of times that fits
* whole turns of LOOP_MS, with every sheen on the card on the same clock.
*/
function cardPlayer(input, ms = 80) {
	const options = {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	};
	const move = input.move ?? "idle", plain = animate(input.seed, move, options);
	const { repeats, turns } = fitLoop(plain.duration);
	const anim = animate(input.seed, move, {
		...options,
		loop: {
			repeats,
			turns
		}
	});
	const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input);
	const total = anim.duration, count$1 = Math.max(1, Math.round(total / ms)), cache = [];
	const delays = Array.from({ length: count$1 }, (_, k) => Math.round((k + 1) * total / count$1) - Math.round(k * total / count$1));
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		count: count$1,
		delay: total / count$1,
		delays,
		frame(i) {
			const k = (i % count$1 + count$1) % count$1;
			return cache[k] ??= drawCard(input, frameAt(anim, k * total / count$1), owned, g, k * turns * LOOP_MS / count$1 % LOOP_MS / 1e3);
		}
	};
}
/** The card standing still, for a picture. */
function cardStill(input, t = .6) {
	const anim = animateLoop(input.seed, input.move ?? "idle", {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	});
	return drawCard(input, frameAt(anim, 0), ownedBySlot(input.copies ?? []), cardGrade(input), t);
}
/** The copies by the slot each is worn in (later ones win, as `dress` does). */
function ownedBySlot(copies) {
	const out = {};
	for (const o of copies) {
		const slot = itemById(o.item)?.slot;
		if (slot) out[slot] = o;
	}
	return out;
}
/** The card as a looping GIF, each card pixel `scale` by `scale`. */
function toCardGif(input, scale$1 = 3) {
	return encodeGif(cardFrames(input), scale$1);
}
/** The card as a PNG, each card pixel `scale` by `scale`. */
function toCardPng(input, scale$1 = 4) {
	return encodePng(cardStill(input), CARD_WIDTH, CARD_HEIGHT, scale$1);
}
/**
* The guy on his own as a looping GIF: his move with everything he wears,
* effects and auras moving, on a transparent background or `background`.
*/
function toGuyGif(seed, move, options = {}, scale$1 = 12) {
	const anim = animateLoop(seed, move, options), bg = options.background ? rgb$2(options.background) : null;
	const frames = anim.frames.map((f) => {
		const px = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT * 4);
		f.colors.forEach((row, y) => row.forEach((c, x) => {
			const v = c ? rgb$2(c) : bg;
			if (v) px.set([...v, 255], (y * FRAME_WIDTH + x) * 4);
		}));
		return px;
	});
	return encodeGif({
		width: FRAME_WIDTH,
		height: FRAME_HEIGHT,
		frames,
		delays: anim.frames.map((f) => f.ms)
	}, scale$1);
}

//#endregion
//#region src/card-face.ts
/**
* The trading card a guy or an item is shown on: a 26×42 face, its window
* tinted by grade, the guy standing in it, grade pips under him. The face
* shimmers by grade (a sheen, foil, holo, gold) and each worn copy's pixels by
* their finish, all in `LOOP_MS`. Its words (name, print, odds) are the page's
* to write over it.
*
* The face is built once (`cardFace`), then drawn at a time either by the GPU
* (`CARD_FRAGMENT`, `createCardShader`) or in plain code (`cardFaceAt`), with
* the same result.
*/
const FACE_WIDTH = 26;
const FACE_HEIGHT = 42;
const rgb$1 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const gradeIndex = (o) => GRADES.findIndex((g) => g.id === gradeOf(o).id);
/** The card's face, ready to draw at any time. */
function cardFace(spec) {
	const W = FACE_WIDTH, H = FACE_HEIGHT;
	const copies = spec.copies ?? [];
	const r = resolve(spec.name, spec.parts);
	if (spec.palette !== void 0) r.palette = spec.palette;
	const config = dress(r, { equip: copies.map(encode) });
	const grid = compose(config);
	const colors = paint(grid, config, withItems(paletteOf(config), config));
	const owned = config.owned ?? {};
	const g = spec.grade ?? (copies.length ? Math.max(...copies.map(gradeIndex)) : -1);
	const base = new Uint8Array(W * H * 4), kind = new Uint8Array(W * H * 4), noise = new Uint8Array(W * H * 4);
	const put = (x, y, c, k, fi = -1, sc = 0, pr = 0) => {
		const i = (y * W + x) * 4, print = Math.floor(pr / 4);
		base.set([
			c[0],
			c[1],
			c[2],
			255
		], i);
		kind.set([
			Math.round(k / 4 * 255),
			(fi + 1) * 32,
			Math.round(sc * 255),
			print
		], i);
		noise[i] = noiseOf(x, y, print * 4);
	};
	const edge = [
		34,
		38,
		58
	], cream = [
		242,
		236,
		221
	], rim$1 = [
		207,
		199,
		180
	];
	const gc = g >= 0 ? rgb$1(GRADES[Math.min(g, GRADES.length - 1)].color) : spec.tint ? rgb$1(spec.tint) : [
		120,
		140,
		170
	];
	const win = blend(cream, gc, g >= 0 ? .28 : spec.tint ? .3 : .14);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const cx = Math.min(x, W - 1 - x), cy = Math.min(y, H - 1 - y);
		if (cx + cy < 2) continue;
		put(x, y, cx === 0 || cy === 0 || cx + cy === 2 ? edge : cream, 1);
	}
	const band$1 = g >= 3 ? [
		30,
		26,
		52
	] : g >= 0 ? blend(gc, [
		24,
		22,
		44
	], .3) : [
		58,
		66,
		100
	];
	const lip = g >= 3 ? gc : blend(band$1, [
		255,
		255,
		255
	], .25);
	for (let y = 2; y <= 7; y++) for (let x = 2; x <= 23; x++) if (Math.min(x, W - 1 - x) + Math.min(y, H - 1 - y) >= 3) put(x, y, y === 7 ? g >= 3 ? gc : blend(band$1, [
		0,
		0,
		0
	], .35) : y === 2 ? lip : band$1, 1);
	for (let y = 9; y <= 28; y++) for (let x = 3; x <= 22; x++) put(x, y, x === 3 || y === 9 || x === 22 || y === 28 ? rim$1 : win, 2);
	grid.forEach((row, y) => row.forEach((t, x) => {
		const hex$1 = colors[y][x];
		if (!hex$1) return;
		const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
		const o = slot ? owned[slot] : void 0;
		const fi = o ? SHADER_FINISHES.indexOf(o.finish) : -1;
		put(x + 5, y + 11, rgb$1(hex$1), o ? 4 : 3, fi, o ? o.scuff : 0, o ? o.print : 0);
	}));
	if (g >= 0) for (let p = 0; p < 5; p++) {
		const x0 = 6 + p * 3;
		for (let y = 31; y <= 32; y++) for (let x = x0; x <= x0 + 1; x++) put(x, y, p <= g ? gc : rim$1, 1);
	}
	else for (let x = 8; x <= 17; x++) put(x, 31, rim$1, 1);
	return {
		base,
		kind,
		noise,
		grade: g,
		negative: copies.some((o) => o.finish === "negative"),
		seed: copies.length ? copies[copies.length - 1].print : 0
	};
}
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
const faceMoves = (f) => f.grade >= 0 || f.negative || f.kind.some((v, i) => i % 4 === 1 && v > 0);
/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
function cardFaceAt(f, ms, hover) {
	const W = FACE_WIDTH, H = FACE_HEIGHT, out = new Uint8ClampedArray(W * H * 4);
	const time = loopSeconds(ms), grade = f.grade;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
		if (f.base[i + 3] < 128) continue;
		let c = [
			f.base[i] / 255,
			f.base[i + 1] / 255,
			f.base[i + 2] / 255
		];
		const k = Math.floor(f.kind[i] / 255 * 4 + .5), finish = Math.floor(f.kind[i + 1] / 32 + .5) - 1;
		const scuff = f.kind[i + 2] / 255, print = f.kind[i + 3] * 4, h = f.noise[i] / 255, d = x + y;
		const wide = 1 - clamp(Math.abs(mod(d - time * 10 + f.seed, 60) - 30) / 3, 0, 1);
		if (k > 3.5 && finish >= 0) c = finishColor(c, finish, scuff, h, d, y, print, time, 1);
		else if (k < 2.5) {
			if (f.negative) c = mix$1([
				1 - c[0],
				1 - c[1],
				1 - c[2]
			], [
				.36,
				.2,
				.62
			], .25);
			if (grade > .5 && grade < 1.5) c = c.map((v) => v + wide * .08);
			else if (grade > 1.5 && grade < 2.5) {
				const s = .5 + .5 * Math.sin(d * .55 - time * Math.PI * 2 / 3);
				c = mix$1(c, [
					c[0] * .82 + .06,
					c[1] * .94 + .06,
					c[2] * 1.2 + .06
				], .45 * s).map((v) => v + wide * .12);
			} else if (grade > 2.5 && grade < 3.5) {
				if (k > 1.5) c = hueShift(c, time * Math.PI * 2 / 6 + d * .18);
				c = c.map((v) => v + wide * .12);
			} else if (grade > 3.5) {
				if (k < 1.5) c = mix$1(c, [
					1,
					.82,
					.36
				], .35 + .2 * wide);
				c = mix$1(c, [
					1,
					.95,
					.7
				], step(.965, fract(h * 13 + time / 3)) * .8);
			}
		}
		if (hover && hover.strength > 0) {
			const at = [(x + .5) / W, (y + .5) / H];
			const light = (1 - smoothstep(0, .34, distance(at, [hover.x, hover.y]))) * .35 * hover.strength;
			c = c.map((v) => v + light);
		}
		out.set([
			toByte(c[0]),
			toByte(c[1]),
			toByte(c[2]),
			255
		], i);
	}
	return out;
}
/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise` from `cardFace`. */
const CARD_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, kind, noise;
uniform float time, hover, grade, neg, seed;
uniform vec2 light;
${GLSL_COMMON}
void main() {
  vec2 res = vec2(${FACE_WIDTH}.0, ${FACE_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 kd = texture2D(kind, at);
  float k = floor(kd.r * 4.0 + 0.5);
  float finish = floor(kd.g * 255.0 / 32.0 + 0.5) - 1.0;
  float print = floor(kd.a * 255.0 + 0.5) * 4.0;
  float h = texture2D(noise, at).r;
  float d = cell.x + cell.y;
  float wide = 1.0 - clamp(abs(mod(d - time * 10.0 + seed, 60.0) - 30.0) / 3.0, 0.0, 1.0);
  if (k > 3.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, d, cell.y, print, time, 1.0);
  else if (k < 2.5) {
    if (neg > 0.5) c = mix(vec3(1.0) - c, vec3(0.36, 0.2, 0.62), 0.25);
    if (grade > 0.5 && grade < 1.5) c += wide * 0.08;
    else if (grade > 1.5 && grade < 2.5) { float s = 0.5 + 0.5 * sin(d * 0.55 - time * TAU / 3.0); c = mix(c, c * vec3(0.82, 0.94, 1.2) + 0.06, 0.45 * s) + wide * 0.12; }
    else if (grade > 2.5 && grade < 3.5) { if (k > 1.5) c = hueShift(c, time * TAU / 6.0 + d * 0.18); c += wide * 0.12; }
    else if (grade > 3.5) { if (k < 1.5) c = mix(c, vec3(1.0, 0.82, 0.36), 0.35 + 0.2 * wide); c = mix(c, vec3(1.0, 0.95, 0.7), step(0.965, fract(h * 13.0 + time / 3.0)) * 0.8); }
  }
  c += (1.0 - smoothstep(0.0, 0.34, distance(at, light))) * 0.35 * hover;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
const VERTEX = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }";
/** One card shader to share across a page or a game, or null without WebGL. */
function createCardShader(canvas) {
	const target = canvas ?? (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(FACE_WIDTH, FACE_HEIGHT) : typeof document !== "undefined" ? document.createElement("canvas") : null);
	if (!target) return null;
	target.width = FACE_WIDTH;
	target.height = FACE_HEIGHT;
	const gl = target.getContext("webgl", {
		premultipliedAlpha: false,
		preserveDrawingBuffer: true
	});
	if (!gl) return null;
	const shader = (type, source) => {
		const s = gl.createShader(type);
		gl.shaderSource(s, source);
		gl.compileShader(s);
		return s;
	};
	const program = gl.createProgram();
	gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
	gl.attachShader(program, shader(gl.FRAGMENT_SHADER, CARD_FRAGMENT));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1,
		-1,
		1,
		-1,
		-1,
		1,
		1,
		1
	]), gl.STATIC_DRAW);
	const p = gl.getAttribLocation(program, "p");
	gl.enableVertexAttribArray(p);
	gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
	const u = Object.fromEntries([
		"base",
		"kind",
		"noise",
		"time",
		"hover",
		"grade",
		"neg",
		"seed",
		"light"
	].map((n) => [n, gl.getUniformLocation(program, n)]));
	gl.uniform1i(u.base, 0);
	gl.uniform1i(u.kind, 1);
	gl.uniform1i(u.noise, 2);
	gl.viewport(0, 0, FACE_WIDTH, FACE_HEIGHT);
	const textures = [
		0,
		1,
		2
	].map((unit) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
		for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
		return t;
	});
	return {
		canvas: target,
		draw(face, ms, hover) {
			[
				face.base,
				face.kind,
				face.noise
			].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FACE_WIDTH, FACE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(u.time, loopSeconds(ms));
			gl.uniform1f(u.grade, face.grade);
			gl.uniform1f(u.neg, face.negative ? 1 : 0);
			gl.uniform1f(u.seed, face.seed);
			gl.uniform1f(u.hover, hover?.strength ?? 0);
			gl.uniform2f(u.light, hover?.x ?? .5, hover?.y ?? .3);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	};
}

//#endregion
//#region src/guy-code.ts
/**
* A guy as an address carries him, and the art version every address names.
* Kept apart from the renderer so a page that only shows guys from the lil
* guys Worker (`<lil-guy>` with a host) can build their addresses without
* shipping the library.
*/
/**
* Bumped whenever the art changes. It is part of every baked image's address,
* so a redraw reaches every board at once and an old address keeps its picture.
*/
const ART_VERSION = 1;
const PART_KEYS = [
	"head",
	"eyes",
	"mouth",
	"cheeks",
	"hair",
	"body",
	"accessory",
	"arms",
	"feet",
	"shade",
	"flip",
	"lucky",
	"rotation"
];
/** A spec as a short, address-safe code. Anything that draws the same guy gives the same code. */
function guyCode(spec) {
	const parts = spec.parts && Object.keys(spec.parts).length ? PART_KEYS.map((k) => {
		const v = spec.parts[k];
		return v === void 0 ? "" : typeof v === "boolean" ? v ? "t" : "f" : String(v);
	}).join(".") : void 0;
	const short = {
		s: spec.seed,
		p: parts,
		c: spec.palette,
		e: spec.equip?.length ? spec.equip : void 0,
		g: spec.grade,
		t: spec.tint
	};
	const json = JSON.stringify(short);
	const bytes = new TextEncoder().encode(json);
	let bin = "";
	for (const b$1 of bytes) bin += String.fromCharCode(b$1);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/** A baked guy's size, and a card's. */
const BAKED_SIZE = {
	guy: {
		width: 22,
		height: 20
	},
	card: {
		width: 26,
		height: 42
	}
};

//#endregion
//#region src/element.ts
/** Defines `<lil-guy>` (once per tag). */
function defineLilGuy(options = {}) {
	const tag = options.tag ?? "lil-guy";
	if (typeof customElements === "undefined" || customElements.get(tag)) return;
	const host = options.host?.replace(/\/+$/, "");
	const playing = new Set();
	let ticking = false;
	const tick = (now) => {
		ticking = playing.size > 0;
		if (!ticking) return;
		for (const p of playing) {
			if (!p.el.isConnected) {
				playing.delete(p);
				continue;
			}
			let t = (now - p.start) % p.total, k = 0;
			while (k < p.frames.delays.length - 1 && t >= p.frames.delays[k]) {
				t -= p.frames.delays[k];
				k++;
			}
			if (k !== p.shown) {
				p.shown = k;
				p.el.paint(k);
			}
		}
		requestAnimationFrame(tick);
	};
	const play = (p) => {
		playing.add(p);
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(tick);
		}
	};
	const seen = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => es.forEach((e) => e.target.visible(e.isIntersecting)), { rootMargin: "100px" }) : null;
	const baked = new Map();
	class LilGuyElement extends HTMLElement {
		static observedAttributes = [
			"name",
			"seed",
			"code",
			"view",
			"size",
			"label"
		];
		_spec = null;
		player = null;
		canvas = null;
		onScreen = !seen;
		/** The guy as a spec, instead of a `code` attribute. */
		get spec() {
			return this._spec;
		}
		set spec(v) {
			this._spec = v;
			this.render();
		}
		connectedCallback() {
			this.style.display ||= "inline-block";
			this.style.lineHeight = "0";
			seen?.observe(this);
			this.render();
		}
		disconnectedCallback() {
			seen?.unobserve(this);
			if (this.player) playing.delete(this.player);
		}
		attributeChangedCallback() {
			if (this.isConnected) this.render();
		}
		/** What the guy is: a code, or `@name` for a claimed one. */
		who() {
			if (this._spec) return guyCode(this._spec);
			const code = this.getAttribute("code"), name = this.getAttribute("name"), seed = this.getAttribute("seed");
			if (code) return code;
			if (name) return "@" + name.toLowerCase();
			return seed ? guyCode({ seed }) : null;
		}
		visible(on) {
			this.onScreen = on;
			if (!this.player) {
				if (on) this.render();
				return;
			}
			if (on) play(this.player);
			else playing.delete(this.player);
		}
		paint(k) {
			const p = this.player, c = this.canvas;
			if (!p || !c) return;
			c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(p.frames.frames[k]), p.frames.width, p.frames.height), 0, 0);
		}
		render() {
			const who = this.who(), view = this.getAttribute("view") || "idle";
			const size = Math.max(1, Math.min(32, Math.round(Number(this.getAttribute("size")) || 4)));
			const box = view.startsWith("card") ? BAKED_SIZE.card : BAKED_SIZE.guy;
			const label = this.getAttribute("label");
			if (label) {
				this.setAttribute("role", "img");
				this.setAttribute("aria-label", label);
			} else this.setAttribute("aria-hidden", "true");
			if (this.player) {
				playing.delete(this.player);
				this.player = null;
			}
			if (!who) {
				this.replaceChildren();
				return;
			}
			const style = `width:${box.width * size}px;height:${box.height * size}px;image-rendering:pixelated;image-rendering:crisp-edges`;
			if (host) {
				const img = document.createElement("img");
				img.src = `${host}/g/${ART_VERSION}/${who}/${view}.png`;
				img.alt = "";
				img.decoding = "async";
				img.loading = "lazy";
				img.style.cssText = style;
				this.replaceChildren(img);
				return;
			}
			if (!options.bake || who.startsWith("@")) {
				this.replaceChildren();
				return;
			}
			if (!this.onScreen) {
				this.replaceChildren();
				this.canvas = null;
				return;
			}
			const key = `${who}/${view}`;
			if (!baked.has(key)) baked.set(key, options.bake(this._spec ?? who, view));
			const frames = baked.get(key);
			if (!frames) {
				this.replaceChildren();
				return;
			}
			const canvas = document.createElement("canvas");
			canvas.width = frames.width;
			canvas.height = frames.height;
			canvas.style.cssText = style;
			this.canvas = canvas;
			this.replaceChildren(canvas);
			this.player = {
				el: this,
				frames,
				start: performance.now(),
				shown: -1,
				total: frames.delays.reduce((a, b$1) => a + b$1, 0)
			};
			this.paint(0);
			this.player.shown = 0;
			if (frames.frames.length > 1) play(this.player);
		}
	}
	customElements.define(tag, LilGuyElement);
}

//#endregion
//#region src/bake.ts
/**
* A guy or his card, finished: every frame as a page with WebGL draws it,
* auras, effects, emotes and his copies' finishes included, ready to save as
* an image or play anywhere. The lil guys Worker serves these (`/g/`), the
* `<lil-guy>` element plays them, and the lil guys site shows them, all from
* this one function, so a guy is the same wherever he turns up.
*/
/** A baked guy is his frame with room for a rare aura's rings either side: the same size for every guy. */
const GUY_WIDTH = FRAME_WIDTH + AURA_PAD * 2;
const GUY_HEIGHT = FRAME_HEIGHT;
/** How long each frame of a card's shimmer shows. */
const STEP_MS = 80;
/** A spec as `animate` takes it: what `<lil-guy>`, the Worker and the site all draw from. */
function animateOptions(spec) {
	const config = {
		...resolve(spec.seed, spec.parts),
		...spec.palette !== void 0 ? { palette: spec.palette } : {}
	};
	return {
		parts: spec.parts,
		palette: spec.palette !== void 0 ? paletteOf(config) : void 0,
		equip: spec.equip
	};
}
/** The guy as worn, for the finishes: what `animate` dresses him in. */
function ownedOf$1(spec) {
	return dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed).owned;
}
const rgb = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
/** A frame on the padded canvas: the guy's pixels (shone, if given) and the aura cells past his sides. */
function place(frame, shone) {
	const out = new Uint8ClampedArray(GUY_WIDTH * GUY_HEIGHT * 4);
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < FRAME_WIDTH; x++) {
		const o = (y * GUY_WIDTH + x + AURA_PAD) * 4;
		if (shone) {
			const i = (y * FRAME_WIDTH + x) * 4;
			if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o);
			continue;
		}
		const c = frame.colors[y][x];
		if (c) out.set([...rgb(c), 255], o);
	}
	for (const [x, y, c] of frame.outside ?? []) out.set([...rgb(c), 255], (y * GUY_WIDTH + x + AURA_PAD) * 4);
	return out;
}
const same = (a, b$1) => a.length === b$1.length && a.every((v, i) => v === b$1[i]);
/** Consecutive identical frames as one, shown for their time together. */
function merged(width, height, frames, delays) {
	const out = {
		width,
		height,
		frames: [],
		delays: []
	};
	frames.forEach((f, i) => {
		const last = out.frames.length - 1;
		if (last >= 0 && same(out.frames[last], f)) out.delays[last] += delays[i];
		else {
			out.frames.push(f);
			out.delays.push(delays[i]);
		}
	});
	return out;
}
/** How many times to play a move so everything on its own clock comes round with it (./loop's `fitLoop`). */
const shineFit = fitLoop;
/**
* A guy playing a move, every frame finished, as a loop that closes perfectly:
* a guy with nothing on its own clock is his move; one with an aura, an
* effect, sparkles or a shimmering copy plays the move the whole number of
* times that fits whole turns of LOOP_MS, everything on its own clock running
* through without a jump.
*/
function bakeGuy(spec, move = "idle") {
	const options = animateOptions(spec), owned = ownedOf$1(spec);
	const plain = animate(spec.seed, move, options);
	const shining = plain.frames.some((f) => shines(f, owned));
	if (!plain.timed && !shining) return merged(GUY_WIDTH, GUY_HEIGHT, plain.frames.map((f) => place(f)), plain.frames.map((f) => f.ms));
	const { repeats, turns } = shineFit(plain.duration);
	const anim = animate(spec.seed, move, {
		...options,
		loop: {
			repeats,
			turns,
			fine: shining
		}
	});
	return merged(GUY_WIDTH, GUY_HEIGHT, anim.frames.map((f) => place(f, shining ? shineFrame(f, owned, f.at ?? 0) : void 0)), anim.frames.map((f) => f.ms));
}
/** The guy's card face over one turn of its shimmer (a single frame if it doesn't shimmer). */
function bakeCard(spec) {
	const face = cardFace(spec);
	if (!faceMoves(face)) return {
		width: FACE_WIDTH,
		height: FACE_HEIGHT,
		frames: [cardFaceAt(face, 0)],
		delays: [LOOP_MS]
	};
	const frames = [], delays = [];
	for (let t = 0; t < LOOP_MS; t += STEP_MS) {
		frames.push(cardFaceAt(face, t));
		delays.push(STEP_MS);
	}
	return merged(FACE_WIDTH, FACE_HEIGHT, frames, delays);
}
/** The frames side by side in one strip, with how long each shows: a sprite sheet for a game. */
function sheetOf(f) {
	const W = f.width * f.frames.length, rgba = new Uint8ClampedArray(W * f.height * 4);
	f.frames.forEach((px, k) => {
		for (let y = 0; y < f.height; y++) rgba.set(px.subarray(y * f.width * 4, (y + 1) * f.width * 4), (y * W + k * f.width) * 4);
	});
	return {
		width: W,
		height: f.height,
		rgba,
		delays: f.delays
	};
}
/** Bakes and encodes: an animated PNG (`loop`), its first frame (`still`), or a sprite strip (`sheet`). */
async function bakedImage(frames, kind, scale$1 = 1) {
	if (kind === "still") return encodePng(frames.frames[0], frames.width, frames.height, scale$1);
	if (kind === "sheet") {
		const s = sheetOf(frames);
		return encodePng(s.rgba, s.width, s.height, scale$1);
	}
	return encodeApng(frames, scale$1);
}
/** A code back into a spec, or null for anything that isn't one. */
function readGuyCode(code) {
	if (typeof code !== "string" || code.length > 2e3 || !/^[\w-]+$/.test(code)) return null;
	try {
		const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
		const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
		if (!o || typeof o.s !== "string" || !o.s || o.s.length > 200) return null;
		const spec = { seed: o.s };
		if (typeof o.p === "string") {
			const values = o.p.split(".");
			if (values.length !== PART_KEYS.length) return null;
			const parts = {};
			PART_KEYS.forEach((k, i) => {
				const v = values[i];
				if (v === "") return;
				parts[k] = v === "t" ? true : v === "f" ? false : Number(v);
			});
			if (Object.values(parts).some((v) => typeof v === "number" && !(Number.isInteger(v) && v >= 0 && v < 1e3))) return null;
			spec.parts = parts;
		}
		if (o.c !== void 0) {
			if (!Number.isInteger(o.c) || o.c < 0 || o.c > 999) return null;
			spec.palette = o.c;
		}
		if (o.e !== void 0) {
			if (!Array.isArray(o.e) || o.e.length > 8 || o.e.some((e) => typeof e !== "string" || !decode(e))) return null;
			spec.equip = o.e;
		}
		if (o.g !== void 0) {
			if (!Number.isInteger(o.g) || o.g < -1 || o.g > 9) return null;
			spec.grade = o.g;
		}
		if (o.t !== void 0) {
			if (typeof o.t !== "string" || !/^#[0-9a-fA-F]{6}$/.test(o.t)) return null;
			spec.tint = o.t;
		}
		return spec;
	} catch {
		return null;
	}
}
/** A card spec as the face builder takes it. */
function faceSpec(spec) {
	return {
		name: spec.seed,
		parts: spec.parts,
		palette: spec.palette,
		copies: (spec.equip ?? []).map(decode).filter((o) => !!o),
		grade: spec.grade,
		tint: spec.tint
	};
}
/** Whether a move name is one this library plays. */
const isMove = (m) => MOVES.includes(m);
/**
* A view as the Worker serves it and `<lil-guy>` plays it: a move looping
* (`idle`, `hop`…), `still` (his first idle frame), `card` or `card-still`.
* Null for a view there isn't.
*/
function bakeView(spec, view) {
	if (view === "card" || view === "card-still") {
		const card = bakeCard(faceSpec(spec));
		return view === "card" ? card : {
			...card,
			frames: card.frames.slice(0, 1),
			delays: [LOOP_MS]
		};
	}
	if (view === "still") {
		const g = bakeGuy(spec, "idle");
		return {
			...g,
			frames: g.frames.slice(0, 1),
			delays: [LOOP_MS]
		};
	}
	return isMove(view) ? bakeGuy(spec, view) : null;
}
/** `<lil-guy>` with the library on the page: baked in the page, or from a host if given. */
function defineLilGuyHere(options = {}) {
	defineLilGuy({
		...options,
		bake: (guy, view) => {
			const spec = typeof guy === "string" ? readGuyCode(guy) : guy;
			return spec ? bakeView(spec, view) : null;
		}
	});
}

//#endregion
export { ARM_NAMES, ART_VERSION, AURAS, AURA_ODDS, Avatar, AvatarFallback, AvatarImage, BAKED_SIZE, CARD_FRAGMENT, CARD_HEIGHT, CARD_WIDTH, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_UNLOCKS, FACE_HEIGHT, FACE_WIDTH, FINISHES, FOOT_NAMES, FOOT_STYLES, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_IDS, GAMES, GLSL_COMMON, GOLD_RIM_DAYS, GRADES, GRID_SIZE, GUY_HEIGHT, GUY_TIERS, GUY_WIDTH, HEADROOM, LOOP_MS, LUCKY_ODDS, LilGuy, LilGuyAnimated, MAX_PINS, MOVES, ONE_OF_ONE_AURAS, PINS, RETIRED_EYES, SHADER_FINISHES, SHADE_COUNT, SHINE_FRAGMENT, SMALL_SIZE, TAG_MAX, TIER_ICONS, TONE_NAMES, TRAIT_ICONS, TRAIT_SLOTS, WEAR, accessories, allowed, animate, animateLoop, animateOptions, applyFx, auraById, auraCells, auraColor, bakeCard, bakeGuy, bakeView, bakedImage, bodies, cardFace, cardFaceAt, cardFrames, cardPlayer, cardStill, cheeks, cleanTag, closeEyes, collectorNotes, compose, composeBase, copyOneIn, createCardShader, createShine, dealOf, decode, decodeLook, defineLilGuyHere as defineLilGuy, drawFrame, dress, encode, encodeApng, encodeGif, encodeLook, encodePng, eyes, faceMoves, faceSpec, finishColor, floatShare, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyCode, guyOneIn, guyRank, guyScore, hair, hash, hashNth, heads, inSeason, isMove, itemById, itemFrame, items, lookOf, luckyPalette, machineSet, makeSeed, mergeRefs, mouths, nameOf, nebulaPhase, noiseOf, ownedOf, paint, paletteOf, palettes, pickable, pinById, readGuyCode, resolve, resolveColor, roll, rollFx, rollSeason, setProgress, shadePalette, sheetOf, shineData, shineFit, shineFrame, shines, shows, slotOf, special, starter, surfaceOf, tallyMarks, temperTint, textWidth, toAnimatedSvg, toCardGif, toCardPng, toGuyGif, toPng, toShareSvg, toSvgString, tradeFloat, tradeGames, traitOdds, upscale, useAvatarContext, useMergeRefs, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };
//# sourceMappingURL=index.js.map