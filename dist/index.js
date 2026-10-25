import { DEEP_BLUE_PRINTS, FINISHES, FOOT_STYLES, GAMES, GOLD_RIM_DAYS, GRADES, GRID_SIZE, LAYER, LUCKY_ODDS, MAX_PINS, PINS, SHADE_COUNT, T, WEAR, accessories, accessoryWeights, armWeights, bodies, bodyWeights, cheekWeights, cheeks, compose, composeBase, decode, dress, encode, eyeWeights, eyes, footWeights, freeItem, gameItems, getPalette, gradeOf, hair, hairWeights, hash, hashNth, headWeights, heads, inSeason, itemById, items, luckyPalette, mouthWeights, mouths, nameOf, nebulaPhase, paint, paletteOf, paletteWeights, palettes, pinById, resolve, resolveColor, roll, rollSeason, shadePalette, shadeWeights, slotOf, special, starter, tallyMarks, temperTint, wearOf, withItems } from "./paint-518pcjWU.js";
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
	b("base", 100, {
		squash: 2,
		dust: true
	}),
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
			b("laugh", 90, {
				squash: 2,
				dust: true
			})
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
const rgb = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a, b$1, t) => {
	const x = rgb(a), y = rgb(b$1);
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
	"buddy"
];
const slotIndex = (t) => t >= LAYER.buddy ? 4 : t >= LAYER.frame ? 3 : t >= LAYER.hat ? 2 : t >= LAYER.skin ? 1 : 0;
const empty = () => Array.from({ length: FRAME_HEIGHT }, () => new Array(FRAME_WIDTH).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted(grid, config, palette) {
	const colors = paint(grid, config, palette);
	const out = empty();
	grid.forEach((row, y) => row.forEach((t, x) => {
		const c = colors[y][x];
		if (c) out[y + HEADROOM][x] = {
			c,
			item: t >= LAYER.skin && t < LAYER.frame || t >= LAYER.buddy,
			slot: slotIndex(t)
		};
	}));
	return out;
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
/**
* Moves the guy by (dx, dy). A sideways step that would push him past the
* frame's edge is dropped: a guy as wide as the frame sways in place rather
* than losing a column.
*/
function shift(layer, dx, dy) {
	if (dx && layer.some((row) => row[dx < 0 ? 0 : FRAME_WIDTH - 1])) dx = 0;
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
	const palette = withItems(options.palette ?? paletteOf(config), config);
	const figure = {
		...config,
		frame: void 0
	};
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
		if (!layers.has(pose)) layers.set(pose, painted(grid(pose), config, palette));
		return layers.get(pose);
	};
	let backdrop = null;
	const frameItem = itemById(config.frame);
	if (frameItem?.slot === "frame") {
		const tall = Array.from({ length: GRID_SIZE + HEADROOM * 2 }, (_, y) => Array.from({ length: GRID_SIZE }, (_$1, x) => LAYER.frame + frameItem.fill(x, y + 48) - 1));
		const colors = paint(tall, config, palette);
		backdrop = Array.from({ length: FRAME_HEIGHT }, (_, y) => colors[y < HEADROOM ? GRID_SIZE - HEADROOM + y : y - HEADROOM]);
	}
	const copies = Object.values(config.owned ?? {}).filter(Boolean);
	const grade = options.rarity === false || !copies.length ? -1 : Math.max(...copies.map((o) => GRADES.findIndex((g) => g.id === gradeOf(o).id)));
	const gradeColor = grade >= 0 ? GRADES[grade].color : "#FFFFFF";
	const seed = hash(input) % 997;
	const beats = BEATS[move](canWave);
	const slices = [];
	let t = 0;
	for (const beat of beats) {
		const n = grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
		for (let i = 0; i < n; i++) {
			const ms = Math.round(beat.ms / n);
			slices.push({
				beat,
				ms,
				t
			});
			t += ms;
		}
	}
	const trailFrom = grade >= 3 ? [mix(gradeColor, "#000000", .2), mix(gradeColor, "#000000", .55)] : [];
	const behind = [];
	const frames = slices.map(({ beat, ms, t: t$1 }) => {
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
			const at = (t$1 + seed) % 1600 / 1600 * (FRAME_WIDTH + FRAME_HEIGHT + 8) - 4;
			layer.forEach((row, y) => row.forEach((cell, x) => {
				if (!cell?.item) return;
				const d = Math.abs(x + y - at);
				if (d < 1) cell.c = mix(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix(cell.c, "#FFFFFF", .25);
			}));
		}
		const aura = grade >= 2 ? rim(layer) : [];
		if (beat.stars) {
			const gold = palette.colors[T.GOLD] ?? "#F2C230";
			twinkle(layer, 2, 3, "#FFFFFF", gold);
			twinkle(layer, 13, 2, "#FFFFFF", gold);
			if (Math.floor(t$1 / 120) % 2) twinkle(layer, 8, 1, "#FFFFFF", gold);
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
		if (beat.dust) {
			let low = -1;
			layer.forEach((row$1, y) => {
				if (row$1.some(Boolean)) low = y;
			});
			const row = layer[low] ?? [];
			const l = row.findIndex(Boolean), r = row.reduce((m, cell, x) => cell ? x : m, -1);
			if (l >= 0) {
				for (const [x, y, c] of [
					[
						l - 1,
						low,
						"#E8E0D2"
					],
					[
						l - 2,
						low,
						"#E8E0D2"
					],
					[
						l - 2,
						low - 1,
						"#F6F1E8"
					],
					[
						r + 1,
						low,
						"#E8E0D2"
					],
					[
						r + 2,
						low,
						"#E8E0D2"
					],
					[
						r + 2,
						low - 1,
						"#F6F1E8"
					]
				]) if (x >= 0 && x < FRAME_WIDTH && y >= 0 && !layer[y][x]) layer[y][x] = {
					c,
					item: false
				};
			}
		}
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(t$1 / 400) % 2);
		if (grade >= 2) {
			const on = Math.floor((t$1 + seed) / 320) % 2 === 0;
			const ring = grade === 4 ? on ? "#FFE27A" : "#E4AE39" : on ? gradeColor : mix(gradeColor, "#000000", .35);
			for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = {
				c: ring,
				item: false
			};
		}
		if (grade >= 3) {
			const count$1 = grade === 4 ? 4 : 3;
			SPARKLE_SPOTS.slice(0, count$1 + 2).forEach(([x, y], k) => {
				if ((t$1 / 240 + k * 1.7 + seed) % 4 < 1) twinkle(layer, x, y, "#FFFFFF", grade === 4 ? "#FFE27A" : gradeColor);
			});
		}
		const colors = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop?.[y][x] ?? null));
		const slots = layer.map((row, y) => row.map((cell, x) => cell ? cell.slot ?? 0 : backdrop?.[y][x] ? 3 : 0));
		return {
			colors,
			ms,
			slots
		};
	});
	return {
		move,
		width: FRAME_WIDTH,
		height: FRAME_HEIGHT,
		frames,
		duration: t
	};
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
function drawFrame(ctx, frame, x = 0, y = 0, scale = 1) {
	frame.colors.forEach((row, py) => row.forEach((c, px) => {
		if (!c) return;
		ctx.fillStyle = c;
		ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
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
	const anim = animate(input, move, options);
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
		const palette = withItems(customPalette ?? paletteOf(cfg), cfg);
		const grid = compose(cfg);
		const hv = hash(name);
		const toRects = (source, keyPrefix) => {
			const out = [];
			const colors$1 = paint(source, cfg, palette);
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
			bgColor: palette.colors[3],
			config: cfg,
			hashValue: hv
		};
	}, [
		name,
		customPalette,
		partOverrides,
		game,
		equip?.join(",")
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
function toSvgString(input, options = {}) {
	const config = dress(resolve(input, options.parts), options, input);
	const palette = withItems(options.palette ?? paletteOf(config), config);
	const colors = paint(compose(config), config, palette);
	const size = options.size ?? 128;
	const pixelSize = size / GRID_SIZE;
	const rects = [];
	for (let y = 0; y < GRID_SIZE; y++) for (const run of rowRuns(colors, y)) rects.push(`<rect x="${run.x * pixelSize}" y="${y * pixelSize}" width="${run.width * pixelSize}" height="${pixelSize}" fill="${run.color}"/>`);
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
	const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
	return palette[index % palette.length] ?? FALLBACK_COLOR;
}

//#endregion
//#region src/rarity.ts
const share = (weights, i) => weights[i] / weights.reduce((a, b$1) => a + b$1, 0);
/** Each visible trait of a guy and how likely it was. */
function traitOdds(config) {
	return [
		{
			slot: "shape",
			name: heads[config.head].name,
			chance: share(headWeights, config.head)
		},
		{
			slot: "eyes",
			name: eyes[config.eyes].name,
			chance: share(eyeWeights, config.eyes)
		},
		{
			slot: "mouth",
			name: mouths[config.mouth].name,
			chance: share(mouthWeights, config.mouth)
		},
		{
			slot: "cheeks",
			name: cheeks[config.cheeks].name,
			chance: share(cheekWeights, config.cheeks)
		},
		{
			slot: "topper",
			name: hair[config.hair].name,
			chance: share(hairWeights, config.hair)
		},
		{
			slot: "markings",
			name: bodies[config.body].name,
			chance: share(bodyWeights, config.body)
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
			slot: "variant",
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
	const pool = gameItems(item.game).filter((i) => !i.free).length;
	const f = FINISHES[o.finish];
	let p = 1 / pool * (f.odds / 100);
	if (special(o) === "Deep Blue") p *= DEEP_BLUE_PRINTS.length / 1e3;
	else if (special(o)) p *= 1 / 20;
	const [lo, hi] = f.scuffs;
	p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
	if (o.tally !== void 0) p *= .1;
	return 1 / p;
}

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
/** The weight below which a part counts as rare and can't be picked. */
const RARE = 2;
/**
* A random seed to draw a new player's guy from, made once and kept. 12
* characters of base 36, about 62 bits.
*/
function makeSeed() {
	const bytes = new Uint8Array(8);
	globalThis.crypto.getRandomValues(bytes);
	let n = 0n;
	for (const b$1 of bytes) n = n << 8n | BigInt(b$1);
	return n.toString(36).padStart(12, "0").slice(-12);
}
/** Which options a player may pick in a slot: every common one, and their own. */
function pickable(own, slot) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	return weights.map((w, i) => i).filter((i) => weights[i] >= RARE || i === own[slot]);
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
//#region src/guy.ts
/**
* A whole guy as a short code, for showing him where his seed must not go.
*
* A seed is private and kept for good: anyone holding it could draw every
* guy the player will ever be dealt. A board shows other people's guys, so it
* sends this instead: every visible field of the guy as he is, picked look
* and all, and nothing that leads back to the seed. Codes are versioned
* (`g1:`), so a later change to the fields can't misread an old one.
*/
/** The fields in a version-1 code, in order, with how many values each can take. */
const FIELDS = [
	["head", headWeights.length],
	["eyes", eyeWeights.length],
	["mouth", mouthWeights.length],
	["cheeks", cheekWeights.length],
	["hair", hairWeights.length],
	["body", bodyWeights.length],
	["accessory", accessoryWeights.length],
	["palette", paletteWeights.length],
	["shade", shadeWeights.length],
	["feet", footWeights.length],
	["arms", armWeights.length],
	["rotation", 9],
	["flip", 2],
	["lucky", 2]
];
/** A guy as a version-1 code: `g1:` and his fields in base 36, dot-separated. */
function encodeGuy(config) {
	return "g1:" + FIELDS.map(([key]) => Number(config[key] ?? 0).toString(36)).join(".");
}
/**
* A code back into a guy, or null for anything that isn't a version-1 code
* this library can draw: another version, a field missing, or one out of range.
* He comes back bare: items are worn on top with `dress`.
*/
function decodeGuy(code) {
	if (typeof code !== "string" || !code.startsWith("g1:")) return null;
	const values = code.slice(3).split(".");
	if (values.length !== FIELDS.length) return null;
	const config = {};
	for (let i = 0; i < FIELDS.length; i++) {
		const [key, count$1] = FIELDS[i];
		if (!/^[0-9a-z]{1,2}$/.test(values[i])) return null;
		const n = parseInt(values[i], 36);
		if (n >= count$1) return null;
		config[key] = key === "flip" || key === "lucky" ? n === 1 : n;
	}
	return config;
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
const FINISH_ORDER = [
	"plain",
	"sunset",
	"tempered",
	"nebula",
	"prism",
	"negative",
	"gold"
];
/**
* A frame as the shader reads it: its colours, and for each pixel the finish,
* scuff and print of the copy it belongs to. Two RGBA byte arrays, 16×20.
*/
function shineData(frame, owned = {}) {
	const colors = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
	const info = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 4);
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
		if (copy) info.set([
			(FINISH_ORDER.indexOf(copy.finish) + 1) * 32,
			Math.round(copy.scuff * 255),
			Math.floor(copy.print / 4),
			255
		], i);
	}));
	return {
		colors,
		info
	};
}
const VERTEX = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }";
const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D base, info;
uniform float time;
float hash(vec2 c, float p) { return fract(sin(dot(c, vec2(127.1, 311.7)) + p * 0.731) * 43758.5453); }
vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 hueShift(vec3 c, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a, ch = length(yiq.yz);
  return toRGB * vec3(yiq.x, ch * cos(h), ch * sin(h));
}
void main() {
  vec2 res = vec2(${FRAME_WIDTH}.0, ${FRAME_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 k = texture2D(info, at);
  float finish = floor(k.r * 255.0 / 32.0 + 0.5) - 1.0;
  if (k.a > 0.5 && finish >= 0.0) {
    float scuff = k.g, print = floor(k.b * 255.0 + 0.5) * 4.0;
    float d = cell.x + cell.y, h = hash(cell, print);
    float band = 1.0 - clamp(abs(mod(d - time * 10.0 + print, 58.0) - 29.0) - 0.5, 0.0, 1.0);
    float twinkle = step(0.965, fract(h * 13.0 + time * 0.37));
    float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
    if (finish < 0.5) c += band * 0.45 * step(scuff, 0.07);
    else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * 3.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + band * 0.5 * coat; }
    else if (finish < 2.5) c += twinkle * 0.55 * coat + band * 0.25 * coat;
    else if (finish < 3.5) { c = hueShift(c, (time * 0.9 + d * 0.22) * coat); c = mix(c, vec3(1.0), twinkle * coat); }
    else if (finish < 4.5) { vec3 rain = hsv(vec3(fract(d * 0.07 - time * 0.3 + print * 0.013), 0.65, 1.0)); c = mix(c, c * 0.45 + rain * 0.75, 0.6 * coat); }
    else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * band * coat + 0.07 * sin(time * 2.0 + d * 0.5) * coat;
    else c += band * 0.7 * coat + vec3(1.0, 0.9, 0.5) * twinkle * 0.6 * coat;
  }
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
	gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
	gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
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
	const textures = [texture(0), texture(1)];
	return {
		canvas: target,
		draw(frame, owned, ms) {
			const { colors, info } = shineData(frame, owned);
			[colors, info].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FRAME_WIDTH, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(time, ms / 1e3);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	};
}

//#endregion
export { Avatar, AvatarFallback, AvatarImage, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EMOTE_UNLOCKS, FINISHES, FOOT_STYLES, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, GAMES, GOLD_RIM_DAYS, GRADES, GRID_SIZE, HEADROOM, LUCKY_ODDS, LilGuy, LilGuyAnimated, MAX_PINS, MOVES, PINS, SHADE_COUNT, WEAR, accessories, allowed, animate, bodies, cheeks, closeEyes, compose, composeBase, copyOneIn, createShine, decode, decodeGuy, decodeLook, drawFrame, dress, encode, encodeGuy, encodeLook, eyes, frameAt, freeItem, gameItems, getColor, getPalette, gradeOf, guyOneIn, hair, hash, hashNth, heads, inSeason, itemById, items, lookOf, luckyPalette, makeSeed, mergeRefs, mouths, nameOf, nebulaPhase, paint, paletteOf, palettes, pickable, pinById, resolve, resolveColor, roll, rollSeason, shadePalette, shineData, slotOf, special, starter, tallyMarks, temperTint, toAnimatedSvg, toPng, toShareSvg, toSvgString, traitOdds, useAvatarContext, useMergeRefs, wearOf, withItems };
//# sourceMappingURL=index.js.map