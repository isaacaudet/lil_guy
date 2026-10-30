import { AURAS, AURA_ODDS, BADGE_INKS, BUDDY_ROOM, CAPSULE_ONLY, DEAL_2, DEAL_3, DEAL_PREFIX, DEEP_BLUE_PRINTS, EFFECTS, FINISHES, FOOT_STYLES, FOUNDER_COPIES, FOUNDER_LOOK, FOUNDER_SEED, FX_BADGES, FX_IDS, GAMES, GOLD_RIM_DAYS, GRADES, GRAPHIC_FINISHES, GRID_SIZE, LAYER, LIMITED_PAINT_COST, LOOP_MS, LUCKY_ODDS, MAX_PINS, ONE_OF_ONE_AURAS, PAINTABLE, PAINTS, PAINT_IDS, PINS, RETIRED_EYES, SHADE_COUNT, SHOWPIECE_WEIGHT, SMALL_SIZE, SPARKLE_REACH, T, UNUSUAL_ONE_IN, WEAR, accessories, accessoryWeights, applyFx, armWeights, auraById, auraCells, auraColor, auraColors, auraHue, bodies, bodyWeights, boxOf, buddyAlone, cheekWeights, cheeks, compose, composeBase, contrast, cycle, dealOf, decode, dress, encode, eyeWeights, eyes, faceOf, fit, fitLoop, footWeights, freeItem, fxColor, gameItems, getPalette, gradeOf, hair, hairWeights, hash, hashNth, headWeights, heads, inSeason, isFounder, isFounderCopy, itemById, itemWeight, items, layered, luckyPalette, luckyRim, machineName, mix, mouthWeights, mouths, mysteryMachine, nameOf, nebulaPhase, paint, paintCost, paintMonth, paintOnSale, painted, paintsOnSale, paletteOf, paletteWeights, palettes, pinById, resolve, resolveColor, roll, rollFx, rollSeason, shadePalette, shadeWeights, shownPalette, shows, slotOf, sparkleAt, special, starAt, starter, steps, tallyMarks, temperTint, tick, underEyes, unlockWeight, unusual, wave, wearOf, withItems, withoutRetired, wrap } from "./paint-CTPy-AeX.js";
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
* room to jump into. A guy with a buddy gets wider frames: his sixteen
* columns, then the buddy's own room to his right (`buddyBeside`), where it
* stands on the floor with a little life of its own, never on him.
*
* Rarity shows in the frames too, so it reads in any game without a shader:
* from Special up a shine sweeps across the item, from Prized up a ring in the
* grade's colour pulses around the guy, and Mythic and Grail copies throw off
* sparkles.
*
* Each guy keeps his own time. His idle is dealt from his name like his parts
* are: how many breaths he takes in a loop, where in it he starts, and his
* habits (a blink or a double blink, a glance, a smile, an "ooh", a little
* hop). The same guy always moves the same way, and two guys side by side are
* never in step. A squash never cuts his face: rows are only lost or repeated
* below his mouth or above his eyes, and a guy with no room there bobs instead.
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
	"sleep",
	"shy",
	"huff",
	"oops"
];
/** Rows of room above the guy for jumps. */
const HEADROOM = 4;
/** A frame's width: his own sixteen columns. A guy with a buddy is wider (`Animation.width`, at most `WIDE_FRAME_WIDTH`). */
const FRAME_WIDTH = GRID_SIZE;
/** The widest a frame is: his sixteen columns and a buddy's room beside him. */
const WIDE_FRAME_WIDTH = GRID_SIZE + BUDDY_ROOM;
const FRAME_HEIGHT = GRID_SIZE + HEADROOM;
/** How many columns past each side of the frame a rare aura may reach (`outside`). */
const AURA_PAD = 3;
/**
* Emotes a player can show after a game, and how each is unlocked. The
* moves use some on their own; `emote` in the options shows one over any move
* (mind blown and galaxy brain by opening the head, `openHead`).
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
	},
	{
		id: "hearts",
		name: "Smitten",
		how: "Everyone has it"
	},
	{
		id: "sweat",
		name: "Sweat drop",
		how: "Everyone has it"
	},
	{
		id: "anger",
		name: "Hmph",
		how: "Everyone has it"
	},
	{
		id: "bulb",
		name: "Idea",
		how: "Everyone has it"
	},
	{
		id: "burst",
		name: "Mind blown",
		how: "Everyone has it"
	},
	{
		id: "cloud",
		name: "Daydream",
		how: "Everyone has it"
	},
	{
		id: "galaxy",
		name: "Galaxy brain",
		how: "A Mythic or Grail copy, an aura, or eclipse, void, idea, thought or op art"
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
/** A well-mixed number in [0, 1) from integers. */
function noise(...n) {
	let h = 2654435769;
	for (const v of n) {
		h = Math.imul(h ^ v, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		h ^= h >>> 16;
	}
	return (h >>> 0) / 4294967296;
}
const rollsOf = (input) => {
	const h = hash(`${input}|rhythm`);
	return (k) => noise(h, k);
};
/** Little things a guy does between breaths. Each guy has a few of them as his habits. */
const ACTS = {
	blink: [b("shut", 130)],
	double: [
		b("shut", 100),
		b("base", 110),
		b("shut", 110)
	],
	glanceLeft: [b("left", 520)],
	glanceRight: [b("right", 520)],
	around: [
		b("left", 320),
		b("base", 90),
		b("right", 320)
	],
	smile: [b("smile", 580)],
	content: [b("content", 640)],
	ooh: [b("ooh", 380)],
	blep: [b("blep", 460)],
	hop: [
		b("base", 80, { squash: 1 }),
		b("base", 90, { dy: -1 }),
		b("base", 130, { dy: -2 }),
		b("base", 90, { dy: -1 }),
		b("base", 80, { squash: 1 })
	]
};
const pick = (r, list) => list[Math.min(list.length - 1, Math.floor(r * list.length))];
const actMs = (act) => ACTS[act].reduce((n, x) => n + x.ms, 0);
/**
* His idle, one LOOP_MS long, dealt from his name: three to five breaths (his
* tempo), each a rest and a dip or, for a floater, a lift; his habits in some
* of the rests; and the loop turned to start partway through a rest, so guys
* dealt the same tempo still breathe at different moments. It always starts
* on his still pose.
*/
function idleBeats(g) {
	const r = g.roll;
	const breaths = pick(r(1), [
		3,
		4,
		4,
		5
	]), floater = r(2) < .3;
	const habits = [r(3) < .35 ? "double" : "blink"];
	if (r(4) < .7) habits.push(pick(r(5), [
		"glanceLeft",
		"glanceRight",
		"around"
	]));
	if (g.mouthy && r(6) < .75) habits.push(pick(r(7), [
		"smile",
		"smile",
		"content",
		"content",
		"ooh",
		"blep"
	]));
	if (r(8) < .25) habits.push("hop");
	const count$1 = Math.min(breaths, habits.length, 2 + (r(9) < .45 ? 1 : 0));
	const salt = Math.floor(r(10) * 1e9);
	const order = Array.from({ length: breaths }, (_, i) => i).sort((a, c) => noise(a, salt) - noise(c, salt));
	const doing = new Map(habits.slice(0, count$1).map((act, i) => [order[i], act]));
	const lap = [];
	for (let i = 0; i < breaths; i++) {
		const ms = Math.round((i + 1) * LOOP_MS / breaths) - Math.round(i * LOOP_MS / breaths);
		const dip = Math.round(ms * (.3 + .1 * r(11 + i))), rest$1 = ms - dip, act = doing.get(i);
		if (act && actMs(act) + 160 <= rest$1) {
			const lead = Math.round((rest$1 - actMs(act)) * (.3 + .4 * r(20 + i)));
			lap.push(b("base", lead), ...ACTS[act], b("base", rest$1 - lead - actMs(act)));
		} else lap.push(b("base", rest$1));
		lap.push(b("base", dip, floater ? { dy: -1 } : { squash: 1 }));
	}
	const rests = lap.map((x, i) => [x, i]).filter(([x]) => x.pose === "base" && !x.squash && !x.dy && x.ms >= 200);
	const [rest, at] = pick(r(30), rests);
	const cut = Math.round(rest.ms * (.2 + .6 * r(31)));
	return [
		b("base", rest.ms - cut),
		...lap.slice(at + 1),
		...lap.slice(0, at),
		b("base", cut)
	];
}
const BEATS = {
	idle: idleBeats,
	blink: ({ roll: roll$1 }) => {
		const wait = 1800 + Math.round(roll$1(40) * 1600);
		return roll$1(41) < .3 ? [
			b("base", wait),
			b("shut", 100),
			b("base", 110),
			b("shut", 120)
		] : [b("base", wait), b("shut", 140)];
	},
	hop: () => [...HOP, b("base", 700)],
	wave: ({ canWave }) => canWave ? [
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
	look: ({ roll: roll$1 }) => {
		const [first, second] = roll$1(42) < .5 ? ["left", "right"] : ["right", "left"];
		return [
			b("base", 500),
			b(first, 700, {
				emote: "question",
				left: first === "left"
			}),
			b("base", 250),
			b(second, 700, {
				emote: "question",
				left: second === "left"
			}),
			b("base", 250),
			b("shut", 120),
			b("base", 400)
		];
	},
	cheer: ({ canWave }) => {
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
			drop: true,
			slide: 1
		}),
		b("frown", 900, {
			squash: 1,
			drop: true,
			slide: 2
		}),
		b("base", 500, { squash: 1 })
	],
	dance: ({ roll: roll$1 }) => {
		const ms = 150 + 10 * Math.floor(roll$1(43) * 7);
		return [
			b("laugh", ms, {
				dx: -1,
				squash: 1,
				emote: "note",
				left: true
			}),
			b("base", ms, {
				emote: "note",
				left: true
			}),
			b("laugh", ms, {
				dx: 1,
				squash: 1,
				turn: true,
				emote: "note"
			}),
			b("base", ms, {
				turn: true,
				emote: "note"
			})
		];
	},
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
		b("base", 350, { drop: true }),
		b("base", 350, {
			drop: true,
			slide: 1
		})
	],
	sleep: ({ roll: roll$1 }) => {
		const ms = 1e3 + 50 * Math.floor(roll$1(44) * 6);
		return [
			b("shut", ms, {
				squash: 1,
				emote: "zzz"
			}),
			b("shut", ms, {
				emote: "zzz",
				rise: true
			}),
			b("shut", ms, {
				squash: 1,
				emote: "zzz"
			}),
			b("shut", ms, {
				emote: "zzz",
				rise: true
			})
		];
	},
	shy: ({ roll: roll$1 }) => {
		const away = roll$1(45) < .5 ? "blushLeft" : "blushRight", left = away === "blushLeft";
		return [
			b("blush", 300),
			b(away, 600, {
				emote: "hearts",
				left
			}),
			b(away, 600, {
				emote: "hearts",
				left,
				rise: true
			}),
			b("blush", 120, {
				squash: 1,
				emote: "hearts",
				left
			}),
			b("blush", 500, {
				emote: "hearts",
				left,
				rise: true
			}),
			b(away, 600, {
				emote: "hearts",
				left
			}),
			b(away, 600, {
				emote: "hearts",
				left,
				rise: true
			}),
			b("base", 500)
		];
	},
	huff: () => [
		b("base", 300),
		b("huff", 110, {
			squash: 1,
			emote: "anger"
		}),
		b("huff", 450, {
			turn: true,
			emote: "anger"
		}),
		b("huff", 450, {
			turn: true,
			emote: "anger",
			rise: true
		}),
		b("huff", 90, {
			turn: true,
			dy: -1,
			emote: "anger"
		}),
		b("huff", 110, {
			turn: true,
			squash: 1,
			emote: "anger",
			rise: true
		}),
		b("huff", 450, {
			turn: true,
			emote: "anger"
		}),
		b("huff", 450, {
			turn: true,
			emote: "anger",
			rise: true
		}),
		b("base", 500)
	],
	oops: () => [
		b("base", 300),
		b("oops", 110, {
			squash: 1,
			drop: true
		}),
		b("oops", 600, { drop: true }),
		b("oops", 600, {
			drop: true,
			slide: 1
		}),
		b("oops", 600, {
			drop: true,
			slide: 2,
			dx: 1
		}),
		b("oops", 400, {
			drop: true,
			slide: 2
		}),
		b("base", 500)
	]
};
const EYE_TOKENS = new Set([T.EYE, T.WHITE]);
/** The bare body, mirrored the same way as the finished guy. */
function bareOf(config) {
	const bare = composeBase(config);
	if (config.flip) for (const row of bare) row.reverse();
	return bare;
}
/** The colour low in an eye (shiny, sparkle, beans): part of the eye, so it shuts with it. */
const IRIS_TOKENS = new Set([T.ACCENT, T.ACCENT_SHADE]);
/**
* Eye pixels: eye ink and eye shine in the rows the eyes are drawn on, and
* the colour in them within the eyes' own columns (a frame round them stays).
*/
function eyeCells(grid, config) {
	const face = faceOf(config);
	const cols = new Set();
	for (const e of face.eyes) for (let x = e.left; x <= e.right; x++) cols.add(config.flip ? GRID_SIZE - 1 - x : x);
	const out = [];
	for (let y = Math.max(0, face.line - 3); y <= face.line; y++) for (let x = 0; x < GRID_SIZE; x++) {
		const t = grid[y][x];
		if (EYE_TOKENS.has(t) || y >= face.top && cols.has(x) && IRIS_TOKENS.has(t)) out.push([x, y]);
	}
	return out;
}
/**
* The same guy with his eyes shut: each eye drops to a line on its bottom row
* and the cells it leaves show what the guy wears there (a mask, a monocle's
* glass: `underEyes`), else the body. Derived, not drawn, so it works for
* every eye part.
*/
function closeEyes(grid, config) {
	const shut = grid.map((row) => [...row]);
	const bare = bareOf(config), under = underEyes(config);
	const cells = eyeCells(grid, config);
	const lowest = new Map();
	for (const [x, y] of cells) lowest.set(x, Math.max(lowest.get(x) ?? -1, y));
	for (const [x, y] of cells) shut[y][x] = y === lowest.get(x) ? T.EYE : under?.[y][x] || (bare[y][x] ?? 0);
	return shut;
}
/**
* The same guy glancing sideways: the eye pixels move one column, staying on
* the face. The cells they leave show what the guy wears there (a mask, a
* monocle's glass: `underEyes`), else the body.
*/
function glance(grid, config, dx) {
	const out = grid.map((row) => [...row]);
	const bare = bareOf(config), under = underEyes(config);
	const cells = eyeCells(grid, config);
	for (const [x, y] of cells) out[y][x] = under?.[y][x] || (bare[y][x] ?? 0);
	for (const [x, y] of cells) {
		const nx = x + dx;
		if (nx >= 0 && nx < GRID_SIZE && bare[y][nx]) out[y][nx] = grid[y][x];
	}
	return out;
}
/** Each glance pose: the pose it looks from, and which way. */
const GLANCES = {
	left: ["base", -1],
	right: ["base", 1],
	blushLeft: ["blush", -1],
	blushRight: ["blush", 1]
};
/**
* A glance's shines keep the colour they have in the pose it looks from. ./paint
* tints a shine by what is beside it, and a glance puts other things there (a
* monocle's ring it uncovers), so painted afresh a white shine went grey for the
* glance alone. `from` is that pose painted the same way, `grid` its tokens.
*/
function keepShine(layer, from, grid, config, dx) {
	const bare = bareOf(config), source = new Map();
	for (const [x, y] of eyeCells(grid, config)) {
		const nx = x + dx;
		if (nx >= 0 && nx < GRID_SIZE && bare[y][nx]) source.set(y * GRID_SIZE + nx, [x, y]);
	}
	for (const [at, [x, y]] of source) {
		const to = layer[y + HEADROOM]?.[at % GRID_SIZE], was = from[y + HEADROOM]?.[x];
		if (to && was && grid[y][x] === T.WHITE) to.c = was.c;
	}
}
const rgb$3 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$4 = (a, b$1, t) => {
	const x = rgb$3(a), y = rgb$3(b$1);
	return hex$1([
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
const empty = (width = FRAME_WIDTH) => Array.from({ length: FRAME_HEIGHT }, () => new Array(width).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted$1(grid, config, palette$1, small = false, face = null, width = FRAME_WIDTH) {
	const colors = paint(grid, config, palette$1, small, false);
	const out = empty(width);
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
		if (FEATURE_TOKENS.has(t)) cell.feature = true;
		if (eyeBox && y >= eyeBox.top && y <= eyeBox.bottom && x >= eyeBox.left && x <= eyeBox.right && LIVE_EYE_TOKENS.includes(t)) cell.eye = t;
		if (config.lucky && t === T.OUTLINE && c.toUpperCase() === luckyRim(x, y, 0).toUpperCase()) cell.rim = [x, y];
		out[y + HEADROOM][x] = cell;
	}));
	return out;
}
/** An eye, its shine, the mouth or the tongue: what a sweat drop keeps off. */
const FEATURE_TOKENS = new Set([
	T.EYE,
	T.WHITE,
	T.MOUTH,
	T.TONGUE
]);
const LIVE_EYE_TOKENS = [
	T.EYE,
	T.WHITE,
	T.ACCENT,
	T.ACCENT_SHADE,
	T.GOLD,
	T.GOLD_SHADE
];
/** Eyes that move: the chase eyes, one guy in hundreds, so they should look it; and starry eyes, which glisten. */
const LIVE_EYES = new Map([
	"galaxy",
	"diamond",
	"dragon",
	"starry"
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
/** A colour's HSL hue (degrees), saturation and lightness (0 to 1): what `hue` takes back. */
const hsl = (c) => {
	const [r, g, b$1] = rgb$3(c).map((v) => v / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1), l = (max + min) / 2, d = max - min;
	if (d === 0) return [
		0,
		0,
		l
	];
	const h = max === r ? ((g - b$1) / d + 6) % 6 : max === g ? (b$1 - r) / d + 2 : (r - g) / d + 4;
	return [
		h * 60,
		d / (1 - Math.abs(2 * l - 1)),
		l
	];
};
/**
* The hues a galaxy eye's ring swirls through: blue round violet to magenta,
* kept 50° clear of a body near them, so on Ocean or Cobalt the ring runs
* violet to magenta and never takes the body's own blue.
*/
function galaxyBand(body) {
	const chroma$1 = body ? Math.max(...rgb$3(body)) / 255 - Math.min(...rgb$3(body)) / 255 : 0, h = body ? hsl(body)[0] : 0;
	if (chroma$1 < .3 || h < 170 || h > 340) return [210, 300];
	if (h < 255) return [h + 50, Math.max(300, h + 80)];
	return h < 300 ? [h + 50, h + 80] : [210, h - 50];
}
/** How long a Lucky guy's rim holds each step of its hues: thirty steps a LOOP_MS, so five or six hues come round. */
const LUCKY_BEAT = 200;
/**
* A Lucky guy's rim: the outline in Lucky's hues (./paint's `luckyRim`), moved on a hue every
* beat. Whole colours, never blended, and only ever the outline, so it never crosses the face.
*/
function luckyShimmer(layer, beat) {
	for (const row of layer) for (const cell of row) if (cell?.rim) cell.c = luckyRim(cell.rim[0], cell.rim[1], beat);
}
/** How far through its life a Lucky star is at its fullest: `starAt`'s long four points. */
const STAR_OPEN = .57;
const LUCKY_STAR = {
	period: 2300,
	life: .55
};
/** A Lucky guy's gold star at `spot`, twinkling every couple of seconds and wide open at the start of the loop, so a still shows it whole. */
function luckyStar$1(layer, [x, y], t) {
	const f = cycle(t + STAR_OPEN * LUCKY_STAR.life * fit(LUCKY_STAR.period), LUCKY_STAR.period) / LUCKY_STAR.life;
	if (f < 1) sparkle(layer, x, y, f, GOLD_SPARKLE, starAt);
}
/** Where a Lucky star sits: the top-right-most spot over the head, where its whole four points fit if any does. */
function starSpot$1(layer, spots) {
	const whole = spots.filter(([x, y]) => starAt(STAR_OPEN).every(([dx, dy]) => x + dx >= 0 && x + dx < GRID_SIZE && y + dy >= 0 && y + dy < FRAME_HEIGHT && !layer[y + dy][x + dx]));
	return (whole.length ? whole : spots).reduce((a, s) => !a || s[0] - s[1] > a[0] - a[1] ? s : a, void 0);
}
/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder, starry eyes glisten. `body` is the body's colour. */
function liveEyes(layer, kind, t, seed, body) {
	const [lo, hi] = kind === "galaxy" ? galaxyBand(body) : [0, 0];
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.eye) return;
		const k = cell.eye;
		if (kind === "galaxy") {
			if (k === T.WHITE) cell.c = wrap(t / steps(160, 5) + x * 3 + y * 2, 5) < 1.2 ? "#FFFFFF" : "#CBB8FF";
			else if (k !== T.EYE) {
				const [, s, l] = hsl(cell.c);
				cell.c = hue((lo + hi) / 2 + (hi - lo) / 2 * Math.sin(t / wave(380) + x * .9 + y * .7), s, l);
			}
		} else if (kind === "diamond") {
			const at = cycle(t + seed, 1400) * 24 - 4, d = Math.abs(x - y * .5 - at);
			if (k !== T.EYE) cell.c = mix$4(cell.c, "#E6FCFF", .25 + .2 * Math.sin(t / wave(250) + x));
			if (d < 1.5) cell.c = mix$4(cell.c, "#FFFFFF", d < .6 ? .9 : .5);
		} else if (kind === "dragon") {
			const flash = cycle(t + seed, 2e3) * fit(2e3) < 160;
			if (k === T.GOLD || k === T.GOLD_SHADE) cell.c = flash ? "#FFF6B0" : mix$4(cell.c, "#FF4A1C", .25 + .3 * (.5 + .5 * Math.sin(t / wave(260))));
		} else if (kind === "starry") {
			const ms = cycle(t + seed, 2400) * fit(2400);
			if ((k === T.ACCENT || k === T.ACCENT_SHADE) && ms < 360) cell.c = mix$4(cell.c, "#FFFFFF", .55 * Math.sin(Math.PI * ms / 360));
		}
	}));
}
/**
* Loses `n` rows ending at row `r` (or, for a negative `n`, repeats row `r`);
* everything above follows. `r` comes from `squashPlan`, so it is never a row
* of his face.
*/
function squash(layer, s) {
	if (!s) return layer;
	const { n, row: r } = s, rows = layer.map((row) => [...row]);
	if (n > 0) {
		const blank = Array.from({ length: n }, () => new Array(rows[0].length).fill(null));
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
* His buddy, beside him on the floor (`buddyBeside`), `lift` rows up: its whole
* art and outline, in front of anything else there.
*/
function standBuddy(layer, buddy, lift) {
	for (const [x, y, cell] of buddy) if (y - lift >= 0) layer[y - lift][x] = { ...cell };
}
/** The moves a buddy hops through on its own: all but the calm ones. */
const BUDDY_HOPS = (move) => move !== "sleep" && move !== "sad";
/**
* How many rows his buddy is up off the floor at a moment of a move: when he
* jumps it hops too, about half as high (a floater's breath, a row, it sits
* out); otherwise, now and then,
* a little hop of its own (a double hop for some), dealt from his name and on
* its own clock, so it comes round in LOOP_MS, never while he squashes. It
* stays put through the calm moves (sleep, sad), and keeps time with his steps
* in a dance.
*/
function buddyLift$1(move, beat, t, roll$1) {
	const up = -(beat.dy ?? 0);
	if (up >= 2) return Math.min(2, Math.ceil(up / 2));
	if (!BUDDY_HOPS(move)) return 0;
	if (move === "dance") return beat.squash ? 1 : 0;
	if ((beat.squash ?? 0) > 0) return 0;
	return hopLift(hopOf(roll$1), t);
}
const hopOf = (roll$1) => [
	2e3 + 1e3 * roll$1(61),
	roll$1(60) * LOOP_MS,
	roll$1(62) < .4 ? 1 : 0
];
/** The buddy's own hops for the guy `input` would render as, the same ones his moving pictures play. */
const buddyHop = (input) => hopOf(rollsOf(input));
/** How many rows a buddy is up on its own hops `t` ms into the loop: 1 for a moment now and then, else 0. */
function hopLift([period, phase, double], t) {
	const f = cycle(t + phase, period) * fit(period);
	return f < 160 || double && f >= 260 && f < 400 ? 1 : 0;
}
function shift(layer, dx, dy) {
	const W$1 = layer[0].length, out = empty(W$1);
	layer.forEach((row, y) => row.forEach((cell, x) => {
		const nx = x + dx, ny = y + dy;
		if (cell && nx >= 0 && ny >= 0 && nx < W$1 && ny < FRAME_HEIGHT) out[ny][nx] = cell;
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
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < layer[0].length; x++) {
		if (layer[y][x]) continue;
		if (NEIGHBOURS.some(([dx, dy]) => layer[y + dy]?.[x + dx])) out.push([x, y]);
	}
	return out;
}
/** The sparkle `f` of the way through its life at (x, y), only where there is nothing. */
function sparkle(layer, x, y, f, colors, shape = sparkleAt) {
	for (const [dx, dy, k] of shape(f)) {
		const cx = x + dx, cy = y + dy;
		if (cx >= 0 && cy >= 0 && cx < layer[0].length && cy < FRAME_HEIGHT && !layer[cy][cx]) layer[cy][cx] = {
			c: colors[k],
			item: false
		};
	}
}
/**
* Where sparkles may open: empty cells near the guy, with room all round for
* the sparkle at its biggest, two or three cells off him and no lower than his
* middle (`above` rows from his top at most, when given). None in the edge
* cells of his sixteen columns, so nothing sits stuck in a corner.
*/
function sparkleSpots(layer, above = Infinity) {
	let top = FRAME_HEIGHT, bottom = -1;
	layer.forEach((row, y) => {
		if (row.some(Boolean)) {
			top = Math.min(top, y);
			bottom = y;
		}
	});
	const out = [];
	const near = (x, y, d) => {
		for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (layer[y + dy]?.[x + dx]) return true;
		return false;
	};
	for (let y = 1; y < FRAME_HEIGHT - 1; y++) for (let x = 1; x < GRID_SIZE - 1; x++) {
		if (y > Math.min((top + bottom) / 2, top + above)) continue;
		if (SPARKLE_REACH.some(([dx, dy]) => layer[y + dy][x + dx])) continue;
		if (!near(x, y, 1) && near(x, y, 3)) out.push([x, y]);
	}
	return out;
}
/**
* One sparkle at a time from a run of them: every `period` ms (fitted to
* LOOP_MS) one opens at a spot dealt from `salt`, lives `life` of the period
* and is gone for the rest. `at` is the clock with this run's own phase.
*/
function sparkleRun(layer, spots, at, period, life, salt, colors, shape = sparkleAt) {
	if (!spots.length) return;
	const f = cycle(at, period) / life;
	if (f >= 1) return;
	const [x, y] = spots[Math.floor(noise(tick(at, period), salt) * spots.length)];
	sparkle(layer, x, y, f, colors, shape);
}
/** A sparkle in a colour: white at its heart, the colour lightened on its arms, the colour at its edges. */
const sparkleIn = (color) => [
	"#FFFFFF",
	mix$4(color, "#FFFFFF", .45),
	color
];
/** A Gold finish's sparkle. Kept off the Grail ring's two golds, so the ring alone says the grade. */
const GOLD_SPARKLE = [
	"#FFFFFF",
	"#FFF0B8",
	"#F5C342"
];
const mouthIndex = (name) => Math.max(0, mouths.findIndex((m) => m.name === name));
/**
* `#` is the emote's colour, `+` its second colour, any other letter one of `more`. `open`: outlined
* round its outside only, its gaps left clear.
*/
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
	},
	sweat: {
		rows: [
			".#.",
			".#.",
			"#+#",
			"###",
			".#."
		],
		color: "#9ED9FF",
		accent: "#FFFFFF"
	},
	anger: {
		rows: [
			".#.#.",
			"##.##",
			".....",
			"##.##",
			".#.#."
		],
		color: "#FF4D5E",
		open: true
	},
	hearts: {
		rows: [
			"#.#",
			"###",
			".#."
		],
		color: "#FF7AAE"
	},
	bulb: {
		rows: [
			".###.",
			"#+###",
			"#####",
			".###.",
			".===.",
			".===."
		],
		color: "#FFE27A",
		accent: "#FFFFFF",
		more: { "=": "#9AA3B5" }
	},
	burst: {
		rows: [
			"#.#.#",
			".###.",
			"##+##",
			".###.",
			"#.#.#"
		],
		color: "#FF8A2B",
		accent: "#FFF3B8",
		open: true
	},
	cloud: {
		rows: [
			"..##.##.",
			".#######",
			".###+###",
			"..#####.",
			"........",
			"##......",
			"##......"
		],
		color: "#F4F2FF",
		accent: "#FFC93D"
	},
	galaxy: {
		rows: [
			".####.",
			"#+#==#",
			"#==#+#",
			".####."
		],
		color: "#4B2BA8",
		accent: "#FFFFFF",
		more: { "=": "#8F6BFF" }
	}
};
/** An emote picture's colour for a character of its rows, or null for a clear cell. */
function emoteInk(kind, ch) {
	if (ch === void 0 || ch === ".") return null;
	const { color, accent, more } = EMOTES[kind];
	return ch === "#" ? color : ch === "+" ? accent ?? color : more?.[ch] ?? color;
}
/**
* A manga sweat drop on his temple, `slide` rows down from the top of his
* head: on the right of his head, over its edge where there is no room
* beside it, as manga draws one. It never covers his eyes or mouth.
*/
function sweatDrop(layer, slide) {
	const { rows, color, accent } = EMOTES.sweat, ink = "#2B6CA8";
	let top = -1;
	layer.forEach((row, y) => {
		if (top < 0 && row.some(Boolean)) top = y;
	});
	if (top < 0) return;
	const edge = (layer[top + 2] ?? []).reduce((r, cell, x) => cell ? x : r, -1);
	const w = rows[0].length + 2, h = rows.length + 2;
	const x0 = Math.min(edge, FRAME_WIDTH - w), y0 = Math.max(0, top - 1 + slide);
	const nearFace = (x, y) => {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (layer[y + dy]?.[x + dx]?.feature) return true;
		return false;
	};
	const ink_ = (ch) => ch === "#" || ch === "+";
	const cells = [];
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const ch = rows[y - 1]?.[x - 1], on = ink_(ch);
		if (on || NEIGHBOURS.some(([dx, dy]) => ink_(rows[y - 1 + dy]?.[x - 1 + dx]))) cells.push([
			x0 + x,
			y0 + y,
			on ? ch === "+" ? accent : color : ink
		]);
	}
	for (const [x, y, c] of cells) if (x >= 0 && y < FRAME_HEIGHT && !nearFace(x, y)) layer[y][x] = {
		c,
		item: false
	};
}
/**
* `poseStill`, with which cells are the guy's own skin (`body`) and the frame row the eyes start on
* (`eyes`): what an emote that opens the head needs to know.
*/
function poseCells(input, pose, options = {}) {
	const { config, grid } = poser(input, options);
	const palette$1 = withItems(options.palette ?? paletteOf(config), config);
	const layer = painted$1(grid(pose), config, palette$1, false, null, FRAME_WIDTH);
	const looks = GLANCES[pose];
	if (looks) keepShine(layer, painted$1(grid(looks[0]), config, palette$1, false, null, FRAME_WIDTH), grid(looks[0]), config, looks[1]);
	const body = layer.map((row) => row.map((cell) => !!cell?.body)), eyes$1 = faceOf(config).top + HEADROOM;
	if (!options.rare) return {
		colors: layer.map((row) => row.map((cell) => cell?.c ?? null)),
		body,
		eyes: eyes$1
	};
	const { step: step$1, of } = options.rare;
	luckyShimmer(layer, step$1);
	const ring = ringOf(config, options.rarity !== false);
	if (ring) for (const [x, y] of rim(layer)) layer[y][x] = {
		c: ringCell(ring, x, y, step$1),
		item: false
	};
	const colors = layer.map((row) => row.map((cell) => cell?.c ?? null)), slots = layer.map((row) => row.map((cell) => cell?.slot ?? 0));
	return {
		colors: applyFx(colors, slots, FRAME_SLOTS.map((slot) => config.owned?.[slot]), step$1 * LOOP_MS / Math.max(1, of)),
		body,
		eyes: eyes$1
	};
}
/** How long each of a ring's colours shows in turn: three a second, so two or three colours come round in LOOP_MS. */
const RING_STEP = 1e3 / 3;
/** How much colour there is in a colour, 0 for a grey or white to 1 for a pure hue. */
const chroma = (h) => {
	const c = rgb$3(h);
	return (Math.max(...c) - Math.min(...c)) / 255;
};
/** A colour's relative luminance, as contrast ratios read it. */
const luminance = (h) => {
	const [r, g, b$1] = rgb$3(h).map((v) => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
	return .2126 * r + .7152 * g + .0722 * b$1;
};
/** The luminance an aura's ring keeps between: 2 to 1 or more against a dark page (#18181B) and against white. */
const RING_DARKEST = .07, RING_LIGHTEST = .47;
/** `c` taken darker or lighter, as little as it needs, into the luminance a ring reads at on any page. */
function legible(c) {
	const l = luminance(c), toward = l > RING_LIGHTEST ? "#000000" : l < RING_DARKEST ? "#FFFFFF" : null;
	if (!toward) return c;
	for (let i = 1; i <= 20; i++) {
		const m = mix$4(c, toward, i / 20), lm = luminance(m);
		if (lm >= RING_DARKEST && lm <= RING_LIGHTEST) return m;
	}
	return c;
}
/** A colour's hue, 0 to 360. */
const hueOf = (h) => {
	const [r, g, b$1] = rgb$3(h), max = Math.max(r, g, b$1), d = max - Math.min(r, g, b$1);
	if (!d) return 0;
	const k = max === r ? (g - b$1) / d + 6 : max === g ? (b$1 - r) / d + 2 : (r - g) / d + 4;
	return k * 60 % 360;
};
/** How far apart two hues are round the wheel. */
const hueGap = (a, b$1) => {
	const d = Math.abs(hueOf(a) - hueOf(b$1)) % 360;
	return Math.min(d, 360 - d);
};
/** Whether two colours are near enough to read as one at a glance. */
const alike = (a, b$1) => {
	const x = rgb$3(a), y = rgb$3(b$1);
	return Math.max(...x.map((v, i) => Math.abs(v - y[i]))) < 28;
};
/**
* The ring round a guy. A copy's grade's colour and a darker one (a Grail's two golds), the whole
* ring a colour at a time. An aura's own colours, its most vivid first, two or three, none grey,
* each taken into the luminance that reads on a dark page and on white, in bands round the guy,
* so an aura never rings like a grade; one whose colours are all one hue (a gold aura beside a
* Grail) takes the aura grade's teal among them.
*/
function ringColours(grade, aura, copy) {
	if (aura) {
		const all = copy ? auraColors(aura.id, copy.finish, copy.print) : aura.colors;
		const lead = copy ? auraHue(aura.id, copy.finish, copy.print) : all.reduce((a, c) => chroma(c) > chroma(a) ? c : a, all[0]);
		const vivid = [lead, ...all.filter((c) => c.toUpperCase() !== lead.toUpperCase()).sort((a, c) => chroma(c) - chroma(a))].filter((c) => chroma(c) >= .25);
		const colors = [];
		for (const c of (vivid.length ? vivid : [lead]).map(legible)) if (colors.length < 3 && !colors.some((k) => alike(k, c))) colors.push(c);
		if (colors.every((c) => hueGap(c, colors[0]) < 45)) colors.splice(Math.min(colors.length, 2), 1, legible(GRADES[5].color));
		return {
			colors,
			bands: true
		};
	}
	if (grade < 2) return null;
	const color = GRADES[grade].color;
	return {
		colors: grade === 4 ? ["#FFE27A", "#E4AE39"] : [color, mix$4(color, "#000000", .35)],
		bands: false
	};
}
/** The best grade among the copies a guy wears, an aura aside (-1 for none). */
const bestGrade = (config) => Math.max(-1, ...Object.entries(config.owned ?? {}).filter(([slot, o]) => o && slot !== "aura").map(([, o]) => GRADES.findIndex((g) => g.id === gradeOf(o).id)));
/** The aura a dressed guy wears, if any. */
const auraOf = (config) => auraById(itemById(config.aura)?.slot === "aura" ? config.aura : void 0);
/** `ringColours` for a dressed guy: the aura's, else the best copy's when `rarity` shows. */
function ringOf(config, rarity) {
	const aura = auraOf(config);
	return aura ? ringColours(-1, aura, config.owned?.aura) : rarity ? ringColours(bestGrade(config)) : null;
}
/** Which turn a ring is on `at` ms in: a turn every RING_STEP, round its colours. */
function ringTurn(ring, at) {
	const s = steps(RING_STEP, ring.colors.length);
	return Math.floor(wrap(at, s * ring.colors.length) / s);
}
/** A ring cell's colour at (x, y) on turn `turn`: a grade's ring all one colour; an aura's in diagonal bands two cells wide, moved on a band a turn. */
function ringCell(ring, x, y, turn$1) {
	const n = ring.colors.length, band$1 = ring.bands ? Math.floor((x - y) / 2) : 0;
	return ring.colors[((band$1 + turn$1) % n + n) % n];
}
/** A little picture's cells with its dark outline, from its top-left: [x, y, colour]. */
function emoteCells(kind) {
	const { rows, open } = EMOTES[kind];
	const w = rows[0].length + 2, h = rows.length + 2;
	const inside$1 = (x, y) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
	const ink = (ch) => emoteInk(kind, ch) !== null;
	const cells = [];
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const ch = rows[y - 1]?.[x - 1], on = emoteInk(kind, ch);
		const near = !on && !(open && inside$1(x, y)) && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
		if (on || near) cells.push([
			x,
			y,
			on ?? EMOTE_INK
		]);
	}
	return cells;
}
/** The dark outline round every emote picture. */
const EMOTE_INK = "#1B1428";
/** Puts an emote, outlined, in a top corner that is clear of him. */
function emote(layer, kind, left, lift = 0) {
	const { rows } = EMOTES[kind];
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
	const cells = emoteCells(kind);
	const at = ([x0, y0]) => cells.map(([x, y, c]) => [
		x0 + x,
		y0 + y,
		c
	]);
	const clear = spots.map(at).find((cells$1) => cells$1.every(([x, y]) => y < FRAME_HEIGHT && !layer[y][x]));
	for (const [x, y, c] of clear ?? at([spots[0][0], 0])) if (y < FRAME_HEIGHT) layer[y][x] = {
		c,
		item: false
	};
}
/** Whether a little picture is one that opens the head (`openHead`). */
const opensHead = (kind) => kind === "burst" || kind === "galaxy";
/** How many rows the lid of the head is up at each of six steps, and in a still. */
const LID_LIFT = {
	burst: [
		2,
		3,
		4,
		4,
		4,
		3
	],
	galaxy: [
		2,
		3,
		4,
		4,
		4,
		4
	]
};
const LID_STILL = 4;
/** How long each of the lid's six steps is in a moving guy. */
const LID_STEP_MS = 200;
/** A burst's flame and the spark in its middle. */
const FLAME = "#FF8A2B", SPARK = "#FFE27A";
/** A starfield's deep violet, its dust and its stars. */
const VOID = "#4B2BA8", DUST = "#8F6BFF", STARS = ["#FFFFFF", "#E3D6FF"];
/**
* The top of the head lifted off as a lid, `lift` rows, at step `step` of six: every row over the
* cut, a hat with it, its underside closed in ink. The cut is two rows into the skin (into the head,
* for a costume, which covers all of it) and never as far as the eyes (row `eyes`). Under the lid,
* mind blown has a jagged column of flame round a spark, throwing sparks out to the sides; galaxy
* brain a dome of violet starfield bulging up out of the head, edged in ink, stars twinkling beside
* it. Flat colours, whole cells. `cols` is how many of the grid's columns are the guy (a buddy beside
* him stays put); `skin` says which cells are his own skin and `cell` makes a cell of a colour.
*/
function openHead(grid, skin, cell, eyes$1, kind, lift, step$1, cols = grid[0]?.length ?? 0) {
	const height = grid.length, width = grid[0]?.length ?? 0;
	const lit = (row) => row.slice(0, cols).some(Boolean);
	const head = grid.findIndex(lit);
	if (head < 0) return;
	let skinTop = -1;
	for (let y = 0; y < height && skinTop < 0; y++) for (let x = 0; x < cols; x++) if (skin(x, y)) {
		skinTop = y;
		break;
	}
	const cut = Math.max(head + 1, Math.min((skinTop < 0 ? head : skinTop) + 2, eyes$1 - 1));
	const span = (row) => {
		const xs = (row ?? []).slice(0, cols).flatMap((c, x) => c ? [x] : []);
		return xs.length ? [xs[0], xs[xs.length - 1]] : null;
	};
	const at = cut < height ? span(grid[cut]) : null;
	if (!at || lift < 1) return;
	const [left, right] = at, mid = (left + right) / 2;
	const put$1 = (x, y, c) => {
		if (x >= 0 && y >= 0 && x < width && y < height && !grid[y][x]) grid[y][x] = cell(c);
	};
	const lid = grid.slice(0, cut).map((row) => row.slice(0, cols));
	for (let y = 0; y < cut; y++) for (let x = 0; x < cols; x++) grid[y][x] = null;
	lid.forEach((row, y) => row.forEach((c, x) => {
		if (c && y - lift >= 0) grid[y - lift][x] = c;
	}));
	const [ul, ur] = span(lid[cut - 1]) ?? at;
	for (let x = ul; x <= ur; x++) put$1(x, cut - lift, EMOTE_INK);
	const top = cut - lift + 1;
	if (kind === "burst") {
		const half = Math.max(2, Math.round((right - left + 1) / 4));
		for (let y = top; y < cut; y++) {
			const w = half + (y + step$1) % 2, a = Math.ceil(mid - w), b$1 = Math.floor(mid + w);
			for (let x = a; x <= b$1; x++) put$1(x, y, x === a || x === b$1 ? EMOTE_INK : Math.abs(x - mid) < 1 ? SPARK : FLAME);
		}
		const y0 = Math.max(top, cut - 2);
		for (let i = 0; i < 2; i++) {
			const s = (step$1 + i * 2) % 4, reach = Math.ceil(half + 1 + s);
			put$1(Math.floor(mid - reach), y0 - Math.floor(s / 2), SPARK);
			put$1(Math.ceil(mid + reach), y0 - Math.floor((s + 1) / 2), SPARK);
		}
	} else {
		const room = right - left + 1, inset$1 = room >= 9 ? 2 : room >= 6 ? 1 : 0;
		for (let y = top; y < cut; y++) {
			const j = cut - 1 - y, d = Math.min(inset$1 + Math.max(0, j - 1), Math.floor((room - 3) / 2)), a = left + d, b$1 = right - d;
			for (let x = a; x <= b$1; x++) {
				const star = (x * 5 + y * 3 + step$1) % 7 === 0, dust = (x * 3 + y * 7) % 5 === 0;
				put$1(x, y, x === a || x === b$1 ? EMOTE_INK : star ? STARS[(x + y) % 2] : dust ? DUST : VOID);
			}
		}
		for (let i = 0; i < 2; i++) {
			const s = (step$1 + i * 3) % 6, side = i ? 1 : -1;
			put$1(Math.round(mid + side * ((right - left) / 2 - 1 + (s >> 1))), top + 1 - (s >> 1), STARS[i]);
		}
	}
}
/** The lid's step `at` ms into a move: six steps of LID_STEP_MS, round and round. */
const lidStep = (at) => Math.floor(wrap(at, fit(LID_STEP_MS * 6)) / (fit(LID_STEP_MS * 6) / 6)) % 6;
/** Mouths a guy keeps whatever he is doing, because they are who he is. */
const SIGNATURE_MOUTHS = new Set([
	"beak",
	"fang",
	"gritted",
	"bubblegum",
	"vampire",
	"gold tooth",
	"grillz",
	"mustache"
]);
/** The mouth a pose wears, when it isn't his own. */
function poseMouth(pose, own) {
	if (pose === "laugh" || pose === "laughWave") return mouthIndex("laugh");
	if (pose === "frown") return mouthIndex("wobble");
	if (pose === "ooh") return mouthIndex("ooh");
	if (pose === "blep") return mouthIndex("blep");
	if (pose === "smile" || pose === "content") return own === mouthIndex("smile") ? mouthIndex("grin") : mouthIndex("smile");
	if (pose === "huff") return mouthIndex("kissy");
	if (pose === "oops") return mouthIndex("tehe");
	return void 0;
}
const POSES = [
	"base",
	"shut",
	"left",
	"right",
	"wave",
	"sides",
	"laugh",
	"laughWave",
	"frown",
	"ooh",
	"smile",
	"content",
	"blep",
	"blush",
	"blushLeft",
	"blushRight",
	"huff",
	"oops"
];
const MANGA_BLUSH = cheeks.findIndex((c) => c.name === "big blush");
/**
* The guy as he is drawn into his poses: dressed, without the frame and aura
* (drawn round him per frame) or a Gold finish's mark (a sparkle, drawn per
* frame too). `grid` builds each pose once.
*/
/**
* The frame item a guy wears, painted over any stretch of frame cells `w` by `h` from (`x0`, `y0`),
* which may run past his frame on every side: the pattern carries on, so a card's window or a
* picture with room round him is backdrop edge to edge, never a box smaller than what is drawn
* over it. Null when he wears no frame.
*/
function backdropColors(config, palette$1, x0, y0, w, h) {
	const item = itemById(config.frame);
	if (item?.slot !== "frame" || !item.fill) return null;
	const col = (x) => x < 0 ? (x % GRID_SIZE + GRID_SIZE) % GRID_SIZE : x;
	const grid = Array.from({ length: h }, (_, j) => Array.from({ length: w }, (_$1, i) => LAYER.frame + item.fill(col(x0 + i), y0 + j - HEADROOM + 48) - 1));
	return paint(grid, config, palette$1, false, false);
}
/** `backdropColors` for a guy as `animate` dresses him from `input` and `options`. */
function backdropOf(input, options, x0, y0, w, h) {
	const config = dress(resolve(input, options.parts), options, input);
	return backdropColors(config, withItems(options.palette ?? paletteOf(config), config), x0, y0, w, h);
}
function poser(input, options) {
	const config = dress(resolve(input, options.parts), options, input);
	const owned = config.owned && Object.fromEntries(Object.entries(config.owned).map(([slot, o]) => [slot, o?.finish === "gold" ? {
		...o,
		finish: "plain"
	} : o]));
	const figure = {
		...config,
		frame: void 0,
		aura: void 0,
		buddy: void 0,
		owned
	};
	const grids = new Map();
	const grid = (pose) => {
		if (!grids.has(pose)) {
			const base = compose(figure), mouth = poseMouth(pose, config.mouth), looks = GLANCES[pose];
			const worn = mouth === void 0 ? base : compose({
				...figure,
				mouth,
				arms: pose === "laughWave" ? 2 : figure.arms
			});
			grids.set(pose, pose === "shut" ? closeEyes(base, config) : looks ? glance(grid(looks[0]), config, looks[1]) : pose === "frown" || pose === "content" || pose === "huff" || pose === "oops" ? closeEyes(worn, config) : pose === "blush" ? compose({
				...figure,
				cheeks: MANGA_BLUSH
			}) : pose === "wave" || pose === "sides" ? compose({
				...figure,
				arms: pose === "wave" ? 2 : 1
			}) : worn);
		}
		return grids.get(pose);
	};
	return {
		config,
		figure,
		grid
	};
}
/** Tokens that make a face: eye ink and shine, the mouth and its tongue. */
const FACE_TOKENS = new Set([
	T.EYE,
	T.WHITE,
	T.MOUTH,
	T.TONGUE
]);
/**
* Where a guy squashes: for `n` rows lost (or, negative, repeated), the frame
* row the squash ends on, or null when he has no room for it. His face (from
* the top of his eyes to the foot of any mouth he pulls, and any row with eye
* or mouth pixels) is never touched. Rows go from his body between the mouth
* and the feet, nearest four rows up from his foot; failing that from his head
* above the eyes; failing that one row fewer, or none.
*/
function squashPlan(config, figure, grid) {
	const base = grid("base");
	let first = -1, last = -1;
	base.forEach((row, y) => {
		if (row.some(Boolean)) {
			if (first < 0) first = y;
			last = y;
		}
	});
	const face = new Set();
	let top = GRID_SIZE, bottom = -1;
	for (const pose of POSES) {
		const f = faceOf({
			...figure,
			mouth: poseMouth(pose, config.mouth) ?? figure.mouth
		});
		top = Math.min(top, f.top);
		bottom = Math.max(bottom, f.line, f.mouthBottom);
		for (const [y, row] of grid(pose).entries()) if (row.some((t) => FACE_TOKENS.has(t))) face.add(y);
	}
	for (let y = top; y <= bottom; y++) face.add(y);
	const free = (y) => y > first && y < last && !face.has(y);
	const plans = new Map();
	const at = (n) => {
		if (!n) return null;
		if (plans.has(n)) return plans.get(n);
		const k = Math.abs(n), fits = (r$1) => (n > 0 ? Array.from({ length: k }, (_, i) => r$1 - i) : [r$1]).every(free);
		const below = Array.from({ length: Math.max(0, last - bottom) }, (_, i) => bottom + 1 + i).filter(fits).sort((p, q) => Math.abs(p - (last - 3)) - Math.abs(q - (last - 3)));
		const above = Array.from({ length: Math.max(0, top - first) }, (_, i) => top - 1 - i).filter(fits);
		const r = below[0] ?? above[0];
		const plan$1 = r !== void 0 ? {
			n,
			row: r + HEADROOM
		} : at(n - Math.sign(n));
		plans.set(n, plan$1);
		return plan$1;
	};
	return {
		at,
		face: [...face].sort((p, q) => p - q).map((y) => y + HEADROOM)
	};
}
/**
* What each squash in his moves does to the guy `input` would render as: the
* frame rows it takes out (or, for a negative one, repeats), or null where he
* has no room and bobs instead; and the rows of his face, which it never touches.
*/
function squashRows(input, options = {}) {
	const { config, figure, grid } = poser(input, options);
	const plan$1 = squashPlan(config, figure, grid), rows = {};
	for (const n of [
		-2,
		-1,
		1,
		2
	]) {
		const s = plan$1.at(n);
		rows[n] = !s ? null : s.n > 0 ? Array.from({ length: s.n }, (_, i) => s.row - i) : [s.row];
	}
	return {
		face: plan$1.face,
		rows
	};
}
/**
* Builds the frames of a move for the guy `input` would render as. Takes the
* same options as `toSvgString` (game, equip, parts, palette).
*/
function animate(input, move, options = {}) {
	const { config, figure, grid } = poser(input, options);
	const palette$1 = withItems(options.palette ?? paletteOf(config), config);
	const alone = buddyAlone(config), W$1 = alone?.[0].length ?? FRAME_WIDTH;
	const wornAura = auraOf(config);
	const fxCopies = FRAME_SLOTS.map((slot) => config.owned?.[slot]);
	const withFx = fxCopies.some((o) => o?.fx);
	const lucky = !!config.lucky && !options.small;
	const liveEye = options.small ? void 0 : LIVE_EYES.get(config.eyes);
	const canWave = JSON.stringify(grid("wave")) !== JSON.stringify(grid("sides"));
	const plan$1 = squashPlan(config, figure, grid);
	const layers = new Map();
	const layerOf = (pose) => {
		if (!layers.has(pose)) {
			const layer = painted$1(grid(pose), config, palette$1, !!options.small, liveEye ? faceOf(figure) : null, W$1), looks = GLANCES[pose];
			if (looks) keepShine(layer, layerOf(looks[0]), grid(looks[0]), config, looks[1]);
			layers.set(pose, layer);
		}
		return layers.get(pose);
	};
	const buddyCells = [];
	if (alone) painted$1(alone, config, palette$1, !!options.small, null, W$1).forEach((row, y) => row.forEach((cell, x) => {
		if (cell) buddyCells.push([
			x,
			y,
			cell
		]);
	}));
	const backdrop = backdropColors(config, palette$1, 0, 0, W$1, FRAME_HEIGHT);
	const copies = Object.entries(config.owned ?? {}).filter(([slot, o]) => o && slot !== "aura").map(([, o]) => o);
	const grade = options.rarity === false || !copies.length ? -1 : Math.max(...copies.map((o) => GRADES.findIndex((g) => g.id === gradeOf(o).id)));
	const gradeColor = grade >= 0 ? GRADES[grade].color : "#FFFFFF";
	const seed = hash(input) % 997;
	const best = copies.reduce((a, o) => !a || GRADES.findIndex((g) => g.id === gradeOf(o).id) > GRADES.findIndex((g) => g.id === gradeOf(a).id) ? o : a, void 0);
	const phase = best ? best.print * 37 : seed;
	const goldCopy = options.small ? void 0 : Object.values(config.owned ?? {}).find((o) => o?.finish === "gold");
	const goldMark = !!goldCopy && !wornAura && grade < 3;
	const roll$1 = rollsOf(input);
	const mouthy = !SIGNATURE_MOUTHS.has(mouths[config.mouth]?.name ?? "") && JSON.stringify(grid("smile")) !== JSON.stringify(grid("base"));
	const beats = BEATS[move]({
		roll: roll$1,
		canWave,
		mouthy
	});
	const buddyLife = !!alone && BUDDY_HOPS(move) && move !== "dance";
	const timed = !!(wornAura || withFx || lucky || liveEye || grade >= 1 || goldMark || options.emote || buddyLife);
	const spots = sparkleSpots(layerOf("base")), headSpots = sparkleSpots(layerOf("base"), 3);
	const luckySpot = lucky ? starSpot$1(layerOf("base"), headSpots) : void 0;
	const opens = opensHead(options.emote) ? options.emote : void 0;
	const headTop = (layer) => layer.findIndex((row) => row.slice(0, GRID_SIZE).some(Boolean));
	const baseHead = opens ? headTop(layerOf("base")) : 0, baseEyes = faceOf(config).top + HEADROOM;
	const ring = wornAura ? options.glance ? ringColours(-1, wornAura, config.owned?.aura) : null : ringColours(grade);
	const ringPhase = wornAura ? (config.owned?.aura?.print ?? 0) * 37 : seed;
	const lapMs = beats.reduce((n, b$1) => n + b$1.ms, 0);
	const loop = options.loop && "fit" in options.loop ? {
		...fitLoop(lapMs),
		fine: options.loop.fine
	} : options.loop;
	const laps = loop ? loop.repeats + 1 : 1, span = loop ? lapMs * loop.repeats : 0;
	const clock = (ms) => loop ? ms * loop.turns * LOOP_MS % (LOOP_MS * span) / span : ms;
	const slices = [];
	let t = 0;
	for (let lap = 0; lap < laps; lap++) for (const beat of beats) {
		let n = wornAura || withFx || lucky || liveEye || goldMark || buddyLife ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
		if (loop?.fine) n = Math.max(n, Math.ceil(beat.ms / 80));
		if (opens) n = Math.max(n, Math.ceil(beat.ms / LID_STEP_MS));
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
	const trailFrom = grade >= 3 && !wornAura ? [mix$4(gradeColor, "#000000", .2), mix$4(gradeColor, "#000000", .55)] : [];
	const behind = [];
	const all = slices.map(({ beat, ms, t: t$1 }) => {
		let layer = layerOf(beat.pose);
		if (beat.turn) layer = layer.map((row) => [...row.slice(0, GRID_SIZE).reverse(), ...row.slice(GRID_SIZE)]);
		const squashed = plan$1.at(beat.squash ?? 0);
		layer = squash(layer, squashed);
		const bob = (beat.squash ?? 0) > 0 && !squashed && !beat.dy ? -1 : 0;
		layer = shift(layer, beat.dx ?? 0, (beat.dy ?? 0) + bob);
		if (buddyCells.length) {
			layer = layer.map((row) => [...row]);
			standBuddy(layer, buddyCells, buddyLift$1(move, beat, t$1, roll$1));
		}
		if (opens) {
			const open = layer.map((row) => [...row]), k = lidStep(t$1);
			openHead(open, (x, y) => !!open[y][x]?.body, (c) => ({
				c,
				item: false
			}), baseEyes + headTop(open) - baseHead, opens, LID_LIFT[opens][k], k, GRID_SIZE);
			layer = open;
		}
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
			const at = cycle(t$1 + phase, 1600) * (W$1 + FRAME_HEIGHT + 8) - 4;
			layer.forEach((row, y) => row.forEach((cell, x) => {
				if (!cell?.item) return;
				const d = Math.abs(x + y - at);
				if (d < 1) cell.c = mix$4(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix$4(cell.c, "#FFFFFF", .25);
			}));
		}
		if (lucky) luckyShimmer(layer, tick(t$1, LUCKY_BEAT));
		if (liveEye) liveEyes(layer, liveEye, t$1, seed, palette$1.colors[T.BODY]);
		if (luckySpot && !wornAura && grade < 3 && !goldMark) luckyStar$1(layer, luckySpot, t$1);
		if (goldMark) sparkleRun(layer, headSpots, t$1 + goldCopy.print * 37, 2600, .55, goldCopy.print, GOLD_SPARKLE, starAt);
		const around = ring ? rim(layer) : [];
		if (beat.stars) {
			const gold = sparkleIn(palette$1.colors[T.GOLD] ?? "#F2C230");
			for (let i = 0; i < 2; i++) sparkleRun(layer, headSpots, t$1 + i * fit(360) / 2 + seed, 360, 1, seed + i, gold);
		}
		if (beat.drop) sweatDrop(layer, beat.slide ?? 0);
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote && !opens) emote(layer, options.emote, false, Math.floor(wrap(t$1, fit(800)) / (fit(800) / 2)) % 2);
		const outside = [];
		if (wornAura && !options.glance) {
			const copy = config.owned?.aura, mask = layer.map((row) => row.map(Boolean));
			for (const [x, y, k] of auraCells(wornAura.id, mask, t$1, copy, AURA_PAD)) {
				const c = copy ? auraColor(wornAura.id, k, copy.finish, x, y, t$1 + copy.print * 37, copy.print) : wornAura.colors[k];
				if (x < 0 || x >= W$1) outside.push([
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
		} else if (ring) {
			const turn$1 = ringTurn(ring, t$1 + ringPhase);
			for (const [x, y] of around) if (!layer[y][x]) layer[y][x] = {
				c: ringCell(ring, x, y, turn$1),
				item: false
			};
		}
		if (grade >= 3 && !wornAura) {
			const colors$1 = grade === 4 ? GOLD_SPARKLE : sparkleIn(gradeColor), count$1 = grade === 4 ? 2 : 1;
			for (let i = 0; i < count$1; i++) sparkleRun(layer, spots, t$1 + phase + i * fit(1700) / count$1, 1700, .5, phase + i, colors$1);
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
		width: W$1,
		height: FRAME_HEIGHT,
		frames,
		duration: frames.reduce((n, f) => n + f.ms, 0),
		timed,
		...loop ? { turns: loop.turns } : {}
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
		`<svg xmlns="http://www.w3.org/2000/svg" class="${id}" width="${size * anim.width / FRAME_WIDTH}" height="${size * FRAME_HEIGHT / FRAME_WIDTH}" viewBox="0 0 ${anim.width} ${FRAME_HEIGHT}" shape-rendering="crispEdges"${labelled ? " role=\"img\"" : " role=\"presentation\" aria-hidden=\"true\""}>`,
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
/**
* A part's chance. A part no deal gives (the capsule-only set) counts
* as if it were dealt at its capsule weight, so a look wearing one stays a
* number; every dealt part's chance is as it was.
*/
const share = (weights, i, slot = "") => (weights[i] || unlockWeight(slot, weights, i)) / weights.reduce((a, b$1) => a + b$1, 0);
const dealt = (key, weights, i, slot = "") => {
	if (weights[i] > 0) return share(weights, i);
	for (const deal of [DEAL_3, DEAL_2]) if (deal[key][i] > 0) return share(deal[key], i);
	return share(weights, i, slot);
};
/** Each of a guy's twelve traits and how likely it was, always in `TRAIT_SLOTS` order. */
function traitOdds(config) {
	const body = shows(config, "body") ? config.body : 0, cheek = shows(config, "cheeks") ? config.cheeks : 0;
	return [
		{
			slot: "shape",
			name: heads[config.head].name,
			chance: dealt("head", headWeights, config.head, "head")
		},
		{
			slot: "eyes",
			name: eyes[config.eyes].name,
			chance: share(withoutRetired(eyeWeights, RETIRED_EYES), config.eyes, "eyes")
		},
		{
			slot: "mouth",
			name: mouths[config.mouth].name,
			chance: dealt("mouth", mouthWeights, config.mouth, "mouth")
		},
		{
			slot: "cheeks",
			name: cheeks[cheek].name,
			chance: dealt("cheeks", cheekWeights, cheek, "cheeks")
		},
		{
			slot: "topper",
			name: hair[config.hair].name,
			chance: dealt("hair", hairWeights, config.hair, "hair")
		},
		{
			slot: "markings",
			name: bodies[body].name,
			chance: dealt("body", bodyWeights, body, "body")
		},
		{
			slot: "accessory",
			name: accessories[config.accessory].name,
			chance: dealt("accessory", accessoryWeights, config.accessory, "accessory")
		},
		{
			slot: "colour",
			name: palettes[shownPalette(config)].name,
			chance: dealt("palette", paletteWeights, config.palette, "palette")
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
	return oneIn(o, true);
}
/**
* One in how many capsules give a copy that looks like this one: its item, its
* finish, a famous print if it has one, its effect and, for an aura, which
* aura. What the eye can see, so it is what a card leads with; the float and a
* tally, which you can't see, are left out (`copyOneIn` has them).
*/
function visibleOneIn(o) {
	return oneIn(o, false);
}
function oneIn(o, unseen) {
	const item = itemById(o.item);
	if (!item) return Infinity;
	const f = FINISHES[o.finish];
	let p = f.aura ? AURA_ODDS * (1 / AURAS.length) * (f.aura / 100) : itemWeight(item) / gameItems(item.game).filter((i) => !i.free && i.slot !== "aura").reduce((a, i) => a + itemWeight(i), 0) * (f.odds / 100) * (item.game === "club" ? 1 : 1 - AURA_ODDS);
	if (special(o) === "Deep Blue") p *= DEEP_BLUE_PRINTS.length / 1e3;
	else if (special(o)) p *= 1 / 20;
	if (unseen) {
		const [lo, hi] = f.scuffs;
		p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
		if (o.tally !== void 0) p *= .1;
	}
	if (o.fx && o.fx !== item.signature) p *= 1 / EFFECTS[o.fx][f.aura ? "aura" : "item"];
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
* The founder's rank (./founder). He was picked by hand, not dealt, so his
* traits' odds don't place him: he is the one of one, at the top tier.
*/
const FOUNDER_RANK = {
	top: 0,
	tier: GUY_TIERS.length - 1,
	name: "Founder",
	label: "One of one"
};
/**
* Where a guy stands among every guy dealt: "one in 56 billion" says every
* combination is unique, which they all are, so a card shows this instead.
* The founder (`founder: true`, as `resolve` gives him) is `FOUNDER_RANK`.
*/
function guyRank(config) {
	if (config.founder) return { ...FOUNDER_RANK };
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
*
* A rare part can also be earned: every capsule unlocks one the player hasn't
* got (`rollPart`), and metal crafts the exact one they want (`partCost`).
* Then it's theirs to pick (`Unlocks`). Capsules are how a player builds the
* guy they want; earned parts change how a guy looks, never how rare the guy
* is: that stays the deal's.
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
/** Which options a player may pick in a slot: every common one, their own, and any they've earned. */
function pickable(own, slot, unlocks) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	const total = weights.reduce((a, b$1) => a + b$1, 0);
	const earned = unlocks?.[slot] ?? [];
	return weights.map((w, i) => i).filter((i) => (weights[i] / total >= RARE || i === own[slot] || earned.includes(i)) && !(slot === "eyes" && RETIRED_EYES.includes(i)));
}
/** Whether a look only uses parts this player may pick. */
function allowed(own, look, unlocks) {
	return SLOTS.every(([, slot]) => look[slot] === void 0 || pickable(own, slot, unlocks).includes(look[slot]));
}
/** The slots a capsule can unlock a part in: every one, the shape and the colour too. */
const PART_SLOTS = [
	"head",
	"eyes",
	"mouth",
	"cheeks",
	"hair",
	"body",
	"accessory",
	"palette"
];
/** One capsule in this many also unlocks a part: every one, until there's none left to unlock. */
const PART_ODDS = 1;
const NAMES = {
	head: heads,
	eyes,
	mouth: mouths,
	cheeks,
	hair,
	body: bodies,
	accessory: accessories,
	palette: palettes
};
const SLOT_WORD = {
	head: "shape",
	eyes: "eyes",
	mouth: "mouth",
	cheeks: "cheeks",
	hair: "topper",
	body: "markings",
	accessory: "accessory",
	palette: "colours"
};
/**
* The rare parts in a slot, the ones a picker locks: what a capsule can
* unlock. The parts no deal gives (`CAPSULE_ONLY`, the capsule-only set) are among them.
*/
function rareParts(slot) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	const total = weights.reduce((a, b$1) => a + b$1, 0);
	return weights.map((_, i) => i).filter((i) => (weights[i] > 0 ? weights[i] / total < RARE : unlockWeight(slot, weights, i) > 0) && !(slot === "eyes" && RETIRED_EYES.includes(i)));
}
/**
* The part a capsule unlocks. Only rare parts, since common ones can already
* be picked, and the rarer a part is to be dealt the rarer it is to unlock.
* Given what the player `has`, it's one they don't have, from a slot that
* still has some, so a capsule never wastes its part; null once there's none
* left. Like `roll`, the seed must come from the server.
*/
function rollPart(seed, has) {
	const u = (k) => hash(`${seed}|part|${k}`) / 4294967296;
	if (u("odds") * PART_ODDS >= 1) return null;
	const start = Math.floor(u("slot") * PART_SLOTS.length);
	for (let k = 0; k < PART_SLOTS.length; k++) {
		const slot = PART_SLOTS[(start + k) % PART_SLOTS.length];
		const weights = SLOTS.find((s) => s[1] === slot)[2], pool = rareParts(slot).filter((index$1) => !has?.({
			slot,
			index: index$1
		}));
		if (!pool.length) continue;
		const w = (i) => unlockWeight(slot, weights, i);
		let r = u("which") * pool.reduce((a, i) => a + w(i), 0);
		const index = pool.find((i) => (r -= w(i)) < 0) ?? pool[pool.length - 1];
		return {
			slot,
			index
		};
	}
	return null;
}
/**
* Scrap to craft a part (./craft's metal): a reclaimed for one dealt about
* one guy in 200 or more, a refined for rarer, two for the rarest (rarer than
* one in 2,000).
*/
function partCost(p) {
	const weights = SLOTS.find((s) => s[1] === p.slot)[2], total = weights.reduce((a, b$1) => a + b$1, 0), share$1 = unlockWeight(p.slot, weights, p.index) / total;
	return share$1 >= 1 / 200 ? 3 : share$1 >= 1 / 2e3 ? 9 : 18;
}
/** A part's name, as a player reads it: "Galaxy eyes", "Crown topper". */
function partName(p) {
	const n = NAMES[p.slot]?.[p.index]?.name ?? "?", word = SLOT_WORD[p.slot];
	return `${n[0].toUpperCase()}${n.slice(1)}${/mark$/.test(n) || n.endsWith(word) ? "" : ` ${word}`}`;
}
/** A part as a short code, like a look's (`e12`), and back. */
const partCode = (p) => SLOTS.find((s) => s[1] === p.slot)[0] + p.index;
function readPart(code) {
	const slot = SLOTS.find((s) => s[0] === code?.[0]);
	const index = Number(code?.slice(1));
	if (!slot || !PART_SLOTS.includes(slot[1]) || !/^\d{1,3}$/.test(code.slice(1)) || !rareParts(slot[1]).includes(index)) return null;
	return {
		slot: slot[1],
		index
	};
}
/** Earned part codes as `Unlocks`. */
function unlocksOf(codes) {
	const out = {};
	for (const c of codes) {
		const p = readPart(c);
		if (p) (out[p.slot] ??= []).push(p.index);
	}
	return out;
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
function decodeLook(code, own, unlocks) {
	if (typeof code !== "string" || !code.startsWith("2:")) return null;
	const look = {};
	for (const part of code.slice(2).split(".").filter(Boolean)) {
		const slot = SLOTS.find((s) => s[0] === part[0]);
		const n = Number(part.slice(1));
		if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
		if (slot[1] === "eyes" && RETIRED_EYES.includes(n)) continue;
		look[slot[1]] = n;
	}
	if (own && !allowed(own, look, unlocks)) return null;
	return look;
}
/** A player's guy: from their seed, with their picked look laid over it. */
function lookOf(seed, code = "", unlocks) {
	const own = resolve(seed);
	const look = code ? decodeLook(code, own, unlocks) : null;
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
float soft(float d, float time, float print) { return 1.0 - clamp(abs(mod(d - time * 10.0 + print, 60.0) - 30.0) / 3.0, 0.0, 1.0); }
vec3 finishColor(vec3 c, float finish, float scuff, float h, float d, float row, float print, float time, float scan) {
  float b = band(d, time, print);
  float w = soft(d, time, print);
  float coat = clamp(1.0 - scuff * 1.4, 0.0, 1.0) * step(scuff * 0.55, h);
  if (finish < 0.5) c += b * 0.45 * step(scuff, 0.07);
  else if (finish < 1.5) { float s = 0.5 + 0.5 * sin(d * 0.8 - time * TAU / 2.0 + print); c = mix(c, c * vec3(0.86, 0.96, 1.18) + 0.08, 0.4 * s * coat) + b * 0.5 * coat; }
  else if (finish < 2.5) c = mix(c, c * vec3(0.9, 0.98, 1.1) + vec3(0.2, 0.2, 0.16), w * 0.5 * coat) + b * 0.2 * coat;
  else if (finish < 3.5) {
    c = hueShift(c, 0.32 * sin(time * TAU / 6.0 + d * 0.12 + fract(print * 0.618) * TAU) * coat);
    float s = max(0.0, sin(time * TAU / 3.0 + h * 97.0));
    c = mix(c, vec3(1.0, 0.94, 1.0), step(0.972, h) * s * s * s * coat);
  }
  else if (finish < 4.5) c = hueShift(c, time * TAU / 6.0 * coat) + w * 0.14 * coat;
  else if (finish < 5.5) c += vec3(0.28, 0.12, 0.45) * b * coat + 0.07 * sin(time * TAU / 3.0 + d * 0.5 + fract(print * 0.618) * TAU) * coat;
  else c = mix(c, vec3(1.0, 0.94, 0.66), w * 0.45 * coat) + vec3(0.36, 0.3, 0.16) * b * coat;
  return c;
}
`;
const TAU$2 = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
const mod = (x, y) => x - y * Math.floor(x / y);
const clamp = (x, a, b$1) => Math.min(Math.max(x, a), b$1);
const step = (edge, x) => x < edge ? 0 : 1;
const smoothstep = (a, b$1, x) => {
	const t = clamp((x - a) / (b$1 - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const distance = (a, b$1) => Math.hypot(a[0] - b$1[0], a[1] - b$1[1]);
const mix$3 = (a, b$1, t) => [
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
/** `soft` from GLSL_COMMON: a wide, soft band of light, three cells either side of its middle. */
const soft = (d, time, print) => 1 - clamp(Math.abs(mod(d - time * 10 + print, 60) - 30) / 3, 0, 1);
/**
* `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES.
* Each finish moves in smooth light across the whole item, never pixel by
* pixel: Tempered and Gold a soft sheen and a fine glint, Nebula a slow drift
* of its colours and a few fixed stars pulsing, Prism its rainbow sweeping
* round, Negative a slow pulse.
*/
function finishColor(c, finish, scuff, h, d, row, print, time, scan) {
	const b$1 = band(d, time, print), w = soft(d, time, print);
	const coat = clamp(1 - scuff * 1.4, 0, 1) * step(scuff * .55, h);
	if (finish < .5) return add(c, b$1 * .45 * step(scuff, .07));
	if (finish < 1.5) {
		const s = .5 + .5 * Math.sin(d * .8 - time * TAU$2 / 2 + print);
		return add(mix$3(c, add(scale(c, [
			.86,
			.96,
			1.18
		]), .08), .4 * s * coat), b$1 * .5 * coat);
	}
	if (finish < 2.5) return add(mix$3(c, add(scale(c, [
		.9,
		.98,
		1.1
	]), [
		.2,
		.2,
		.16
	]), w * .5 * coat), b$1 * .2 * coat);
	if (finish < 3.5) {
		const shifted = hueShift(c, .32 * Math.sin(time * TAU$2 / 6 + d * .12 + fract(print * .618) * TAU$2) * coat);
		const s = Math.max(0, Math.sin(time * TAU$2 / 3 + h * 97));
		return mix$3(shifted, [
			1,
			.94,
			1
		], step(.972, h) * s * s * s * coat);
	}
	if (finish < 4.5) return add(hueShift(c, time * TAU$2 / 6 * coat), w * .14 * coat);
	if (finish < 5.5) return add(add(c, scale([
		.28,
		.12,
		.45
	], b$1 * coat)), .07 * Math.sin(time * TAU$2 / 3 + d * .5 + fract(print * .618) * TAU$2) * coat);
	return add(mix$3(c, [
		1,
		.94,
		.66
	], w * .45 * coat), scale([
		.36,
		.3,
		.16
	], b$1 * coat));
}
/** A colour channel as the GPU stores it. */
const toByte = (v) => Math.round(clamp(v, 0, 1) * 255);
/** Loop time in seconds: what the shaders are given. */
const loopSeconds = (ms) => mod(ms, LOOP_MS) / 1e3;
/**
* The graphic finishes (`GRAPHIC_FINISHES` in ./owned): a printed pattern, not
* a shimmer, so they have no number here and their card's window is the
* pattern itself.
*/
const GRAPHIC = [
	"op",
	"impossible",
	"grid"
];
/**
* The edition a finish puts on its card: Sunset is foil, Tempered and Nebula
* holographic, an aura's finishes spectral. A graphic finish (Op, Impossible,
* Grid) keeps the plain stock: its pattern is the card's window, and a sheen
* over it would muddy the ink and ivory.
*/
function editionOf(finish) {
	if (!finish || GRAPHIC.includes(finish)) return 0;
	const i = SHADER_FINISHES.indexOf(finish);
	return i < 0 ? 6 : [
		0,
		1,
		2,
		2,
		3,
		4,
		5
	][i];
}
/**
* `editionColor` in GLSL: `p` is the cell in face cells, `px` one drawn pixel
* in face cells (1 on the face, a fifth on the big card), `o` the window's
* middle, `region` 1 for the card's face and 2 for its window, `h` the cell's
* noise. Every motion comes round in LOOP_MS.
*/
const GLSL_EDITIONS = `
float sweep(float s, float time, float width) { return 1.0 - clamp(abs(mod(s - time * 10.0, 60.0) - 30.0) / width, 0.0, 1.0); }
vec3 editionColor(vec3 c, float ed, float v, vec2 p, vec2 o, float region, float h, float px, float time) {
  if (ed < 0.5) return c;
  float wide = sweep(p.x + p.y * 0.6 + v * 13.0, time, 5.0);
  float glint = step(0.965, h) * pow(max(0.0, sin(time * TAU / 2.0 + h * 91.0)), 6.0);
  if (ed < 1.5) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float fine = pow(0.5 + 0.5 * sin((p.x * 0.7 + p.y * 0.45 + v * 3.0) * 1.3 - time * TAU / 2.0), 6.0);
    return mix(c, l * vec3(0.8, 0.92, 1.1) + vec3(0.05, 0.08, 0.16), 0.6) + vec3(0.6, 0.75, 1.0) * (fine * 0.22 + wide * 0.4);
  }
  if (ed < 2.5) {
    vec3 tint = mix(vec3(1.0, 0.3, 0.42), vec3(0.28, 0.62, 1.0), 0.5 + 0.5 * sin(p.x * 0.35 - p.y * 0.55 + v * 2.0 - time * TAU / 3.0));
    float k = region > 1.5 ? 0.6 : 1.0;
    return mix(c, c * 0.5 + tint * 0.55, 0.55 * k) + step(0.5, fract(p.y / (px * 2.0))) * 0.05 * (2.0 - region) + wide * 0.25;
  }
  if (ed < 3.5) {
    vec3 rb = hsv(vec3(fract((p.x + p.y) * 0.03 + v * 0.25 - time / 6.0), 0.6, 1.0));
    return mix(hueShift(c, (p.x - p.y) * 0.05 - time * TAU / 6.0), c * 0.45 + rb * 0.6, 0.5) + wide * 0.18;
  }
  if (ed < 4.5) {
    vec3 n = vec3(1.0) - c;
    return mix(n, n * vec3(0.75, 0.68, 1.1) + vec3(0.02, 0.0, 0.06), 0.55) + vec3(0.3, 0.16, 0.5) * wide * 0.6;
  }
  if (ed < 5.5) {
    if (region > 1.5) return mix(c, vec3(1.0, 0.94, 0.78), sweep(p.x + p.y * 0.6 + v * 13.0, time, 9.0) * 0.16);
    return mix(c, vec3(1.0, 0.97, 0.84), wide * 0.6);
  }
  vec2 q = (p - o) / (region > 1.5 ? 7.0 : 12.0);
  float r = length(q), a = atan(q.y, q.x) + r * 1.8 - time * TAU / 6.0;
  vec2 w = vec2(cos(a), sin(a)) * r;
  float f = floor((0.5 + 0.5 * sin(w.x * 3.2 + sin(w.y * 2.6 + time * TAU / 3.0) * 1.5)) * 3.99);
  if (region > 1.5) return c * (0.7 + 0.25 * f) + wide * 0.12 + glint * 0.6;
  return hueShift(c * (0.86 + 0.1 * f), 0.4 * sin((p.x - p.y) * 0.16 + time * TAU / 6.0 + v)) + wide * 0.35 + glint * 0.6;
}
`;
/** A sine from a table, to a few millionths: the spectral swirl takes two a pixel every frame. */
const SINES$1 = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU$2));
const sine = (x) => {
	const u = x * (4096 / TAU$2), i = Math.floor(u), j = i & 4095;
	return SINES$1[j] + (SINES$1[j + 1] - SINES$1[j]) * (u - i);
};
/**
* `editionColor` over a fixed set of pixels, for drawing the same card again
* and again: what doesn't move is worked out once, so each moment costs a few
* multiplies a pixel. The returned function writes each pixel's colour at
* `time` into `out` (0 to 1, unclamped, three a pixel), as `editionColor` gives it.
*/
function editionField(ed, v, o, px, pixels) {
	const { x, y, region, h, rgb: rgb$4 } = pixels, n = region.length;
	if (ed < .5) return (_, out) => out.set(rgb$4);
	const at = new Float32Array(n);
	for (let k = 0; k < n; k++) at[k] = mod(x[k] + y[k] * .6 + v * 13, 60);
	/** `sweep(at, time, width)`, with T = time * 10 brought into 0 to 60. */
	const band$1 = (k, T$1, width) => {
		let u = at[k] - T$1;
		if (u < 0) u += 60;
		const d = Math.abs(u - 30) / width;
		return d > 1 ? 0 : 1 - d;
	};
	const a = new Float32Array(n * 3), s = new Float32Array(n), c2 = new Float32Array(n);
	if (ed < 1.5) {
		for (let k = 0; k < n; k++) {
			const r = rgb$4[k * 3], g = rgb$4[k * 3 + 1], b$1 = rgb$4[k * 3 + 2], l = .299 * r + .587 * g + .114 * b$1;
			a[k * 3] = r + (l * .8 + .05 - r) * .6;
			a[k * 3 + 1] = g + (l * .92 + .08 - g) * .6;
			a[k * 3 + 2] = b$1 + (l * 1.1 + .16 - b$1) * .6;
			const phase = (x[k] * .7 + y[k] * .45 + v * 3) * 1.3;
			s[k] = Math.sin(phase);
			c2[k] = Math.cos(phase);
		}
		return (time, out) => {
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU$2 / 2), sa = Math.sin(time * TAU$2 / 2);
			for (let k = 0; k < n; k++) {
				const w = .5 + .5 * (s[k] * ca - c2[k] * sa), w2 = w * w, m = w2 * w2 * w2 * .22 + band$1(k, T$1, 5) * .4;
				out[k * 3] = a[k * 3] + .6 * m;
				out[k * 3 + 1] = a[k * 3 + 1] + .75 * m;
				out[k * 3 + 2] = a[k * 3 + 2] + m;
			}
		};
	}
	if (ed < 2.5) {
		const lift = new Float32Array(n);
		for (let k = 0; k < n; k++) {
			const phase = x[k] * .35 - y[k] * .55 + v * 2;
			s[k] = Math.sin(phase);
			c2[k] = Math.cos(phase);
			lift[k] = step(.5, fract(y[k] / (px * 2))) * .05 * (2 - region[k]);
		}
		return (time, out) => {
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU$2 / 3), sa = Math.sin(time * TAU$2 / 3);
			for (let k = 0; k < n; k++) {
				const t = .5 + .5 * (s[k] * ca - c2[k] * sa), m = .55 * (region[k] > 1.5 ? .6 : 1), add$1 = lift[k] + band$1(k, T$1, 5) * .25;
				const tr = 1 + -.72 * t, tg = .3 + .32 * t, tb = .42 + .5800000000000001 * t;
				const r = rgb$4[k * 3], g = rgb$4[k * 3 + 1], b$1 = rgb$4[k * 3 + 2];
				out[k * 3] = r + (r * .5 + tr * .55 - r) * m + add$1;
				out[k * 3 + 1] = g + (g * .5 + tg * .55 - g) * m + add$1;
				out[k * 3 + 2] = b$1 + (b$1 * .5 + tb * .55 - b$1) * m + add$1;
			}
		};
	}
	if (ed < 3.5) {
		const lum$2 = new Float32Array(n);
		for (let k = 0; k < n; k++) {
			const r = rgb$4[k * 3], g = rgb$4[k * 3 + 1], b$1 = rgb$4[k * 3 + 2];
			const i = .596 * r - .274 * g - .322 * b$1, q = .211 * r - .523 * g + .312 * b$1;
			const hue$2 = Math.atan2(q, i) + (x[k] - y[k]) * .05, ch = Math.hypot(i, q);
			lum$2[k] = .299 * r + .587 * g + .114 * b$1;
			s[k] = ch * Math.cos(hue$2);
			c2[k] = ch * Math.sin(hue$2);
			a[k] = (x[k] + y[k]) * .03 + v * .25;
		}
		const hsv1 = (hh, o$1) => {
			const p = Math.abs(fract(hh + o$1) * 6 - 3) - 1;
			return 1 + ((p < 0 ? 0 : p > 1 ? 1 : p) - 1) * .6;
		};
		return (time, out) => {
			const T$1 = mod(time * 10, 60), ct = Math.cos(time * TAU$2 / 6), st = Math.sin(time * TAU$2 / 6);
			for (let k = 0; k < n; k++) {
				const I = s[k] * ct + c2[k] * st, Q = c2[k] * ct - s[k] * st, Y = lum$2[k];
				const hh = fract(a[k] - time / 6), add$1 = band$1(k, T$1, 5) * .18;
				const hr = Y + .956 * I + .621 * Q, hg = Y - .272 * I - .647 * Q, hb = Y - 1.106 * I + 1.703 * Q;
				out[k * 3] = hr + (rgb$4[k * 3] * .45 + hsv1(hh, 1) * .6 - hr) * .5 + add$1;
				out[k * 3 + 1] = hg + (rgb$4[k * 3 + 1] * .45 + hsv1(hh, 2 / 3) * .6 - hg) * .5 + add$1;
				out[k * 3 + 2] = hb + (rgb$4[k * 3 + 2] * .45 + hsv1(hh, 1 / 3) * .6 - hb) * .5 + add$1;
			}
		};
	}
	if (ed < 4.5) {
		for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) {
			const m = 1 - rgb$4[k * 3 + j];
			a[k * 3 + j] = m + (m * [
				.75,
				.68,
				1.1
			][j] + [
				.02,
				0,
				.06
			][j] - m) * .55;
		}
		return (time, out) => {
			const T$1 = mod(time * 10, 60);
			for (let k = 0; k < n; k++) {
				const w = band$1(k, T$1, 5) * .6;
				out[k * 3] = a[k * 3] + .3 * w;
				out[k * 3 + 1] = a[k * 3 + 1] + .16 * w;
				out[k * 3 + 2] = a[k * 3 + 2] + .5 * w;
			}
		};
	}
	if (ed < 5.5) return (time, out) => {
		const T$1 = mod(time * 10, 60);
		for (let k = 0; k < n; k++) {
			const win = region[k] > 1.5, m = win ? band$1(k, T$1, 9) * .16 : band$1(k, T$1, 5) * .6;
			const lr = 1, lg = win ? .94 : .97, lb = win ? .78 : .84;
			out[k * 3] = rgb$4[k * 3] + (lr - rgb$4[k * 3]) * m;
			out[k * 3 + 1] = rgb$4[k * 3 + 1] + (lg - rgb$4[k * 3 + 1]) * m;
			out[k * 3 + 2] = rgb$4[k * 3 + 2] + (lb - rgb$4[k * 3 + 2]) * m;
		}
	};
	const lum$1 = new Float32Array(n), hue$1 = new Float32Array(n), chroma$1 = new Float32Array(n);
	for (let k = 0; k < n; k++) {
		const z = region[k] > 1.5 ? 7 : 12, qx = (x[k] - o[0]) / z, qy = (y[k] - o[1]) / z;
		const r = Math.hypot(qx, qy), turn$1 = Math.atan2(qy, qx) + r * 1.8;
		s[k] = Math.cos(turn$1) * r;
		c2[k] = Math.sin(turn$1) * r;
		const cr = rgb$4[k * 3], cg = rgb$4[k * 3 + 1], cb = rgb$4[k * 3 + 2];
		const i = .596 * cr - .274 * cg - .322 * cb, q = .211 * cr - .523 * cg + .312 * cb;
		lum$1[k] = .299 * cr + .587 * cg + .114 * cb;
		hue$1[k] = Math.atan2(q, i);
		chroma$1[k] = Math.hypot(i, q);
		a[k] = (x[k] - y[k]) * .16;
	}
	/** A glint opening on a pixel whose noise is high enough. */
	const glint = (k, time) => {
		if (h[k] < .965) return 0;
		const g = Math.max(0, Math.sin(time * TAU$2 / 2 + h[k] * 91)), g2 = g * g;
		return g2 * g2 * g2 * .6;
	};
	return (time, out) => {
		const T$1 = mod(time * 10, 60), th = time * TAU$2 / 6, ct = Math.cos(th), st = Math.sin(th), B = time * TAU$2 / 3;
		for (let k = 0; k < n; k++) {
			const wx = s[k] * ct + c2[k] * st, wy = c2[k] * ct - s[k] * st;
			const f = Math.floor((.5 + .5 * sine(wx * 3.2 + sine(wy * 2.6 + B) * 1.5)) * 3.99);
			const r = rgb$4[k * 3], g = rgb$4[k * 3 + 1], b$1 = rgb$4[k * 3 + 2], gl = glint(k, time);
			if (region[k] > 1.5) {
				const m$1 = .7 + .25 * f, add$2 = band$1(k, T$1, 5) * .12 + gl;
				out[k * 3] = r * m$1 + add$2;
				out[k * 3 + 1] = g * m$1 + add$2;
				out[k * 3 + 2] = b$1 * m$1 + add$2;
				continue;
			}
			const m = .86 + .1 * f, turn$1 = hue$1[k] + .4 * Math.sin(a[k] + th + v), ch = chroma$1[k] * m, Y = lum$1[k] * m;
			const I = ch * Math.cos(turn$1), Q = ch * Math.sin(turn$1), add$1 = band$1(k, T$1, 5) * .35 + gl;
			out[k * 3] = Y + .956 * I + .621 * Q + add$1;
			out[k * 3 + 1] = Y - .272 * I - .647 * Q + add$1;
			out[k * 3 + 2] = Y - 1.106 * I + 1.703 * Q + add$1;
		}
	};
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
/**
* A frame as the shader reads it: its colours; for each pixel the finish,
* scuff and print of the copy it belongs to; and each pixel's noise. Three
* RGBA byte arrays, the frame's size (16×20, wider with a buddy).
*/
function shineData(frame, owned = {}) {
	const W$1 = frame.colors[0].length;
	const colors = new Uint8Array(W$1 * FRAME_HEIGHT * 4);
	const info = new Uint8Array(W$1 * FRAME_HEIGHT * 4);
	const noise$1 = new Uint8Array(W$1 * FRAME_HEIGHT * 4);
	frame.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c) return;
		const i = (y * W$1 + x) * 4;
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
			noise$1[i] = noiseOf(x, y, print * 4);
		}
	}));
	return {
		colors,
		info,
		noise: noise$1
	};
}
/** Whether any pixel of the frame belongs to a copy with a finish that shimmers. */
const shines = (frame, owned = {}) => frame.slots.some((row) => row.some((slot) => slot > 0 && SHADER_FINISHES.includes(owned?.[FRAME_SLOTS[slot - 1]]?.finish)));
/**
* The shader's picture, in plain code: the frame with each copy's finish
* running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
*/
function shineFrame(frame, owned, ms) {
	const { colors, info, noise: noise$1 } = shineData(frame, owned);
	const out = new Uint8ClampedArray(colors);
	const time = loopSeconds(ms), W$1 = frame.colors[0].length;
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < W$1; x++) {
		const i = (y * W$1 + x) * 4;
		if (colors[i + 3] < 128 || info[i + 3] < 128) continue;
		const finish = Math.floor(info[i] / 32 + .5) - 1;
		const c = finishColor([
			colors[i] / 255,
			colors[i + 1] / 255,
			colors[i + 2] / 255
		], finish, info[i + 1] / 255, noise$1[i] / 255, x + y, y, info[i + 2] * 4, time, 0);
		out[i] = toByte(c[0]);
		out[i + 1] = toByte(c[1]);
		out[i + 2] = toByte(c[2]);
	}
	return out;
}
const VERTEX$1 = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }";
/** The shader, for a game that runs its own WebGL: textures \`base\`, \`info\`, \`noise\` from shineData, \`time\` in loop seconds, \`res\` the frame's size. */
const SHINE_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, info, noise;
uniform float time;
uniform vec2 res;
${GLSL_COMMON}
void main() {
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
	const time = gl.getUniformLocation(program, "time"), res = gl.getUniformLocation(program, "res");
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
			const { colors, info, noise: noise$1 } = shineData(frame, owned), W$1 = frame.colors[0].length;
			if (target.width !== W$1) target.width = W$1;
			gl.viewport(0, 0, W$1, FRAME_HEIGHT);
			[
				colors,
				info,
				noise$1
			].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W$1, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(time, loopSeconds(ms));
			gl.uniform2f(res, W$1, FRAME_HEIGHT);
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
	},
	op: {
		roughness: .5,
		metalness: 0,
		clearcoat: .3,
		clearcoatRoughness: .4,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	impossible: {
		roughness: .5,
		metalness: 0,
		clearcoat: .3,
		clearcoatRoughness: .4,
		iridescence: 0,
		sheen: 0,
		glow: 0
	},
	grid: {
		roughness: .5,
		metalness: 0,
		clearcoat: .3,
		clearcoatRoughness: .4,
		iridescence: 0,
		sheen: 0,
		glow: 0
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
const lum = (hex$2) => {
	const n = parseInt(hex$2.slice(1, 7), 16);
	return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex$2, k) => {
	const n = parseInt(hex$2.slice(1, 7), 16), f = (v) => Math.round(v * k).toString(16).padStart(2, "0");
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
	const C = frame.colors, S = frame.slots, H$1 = C.length, W$1 = C[0]?.length ?? 0, small = !!options.item;
	const slotName = (s) => [
		"skin",
		"hat",
		"frame",
		"buddy"
	][s - 1];
	const figure = inset(W$1, H$1, (x, y) => !!C[y][x] && S[y][x] !== 3 && S[y][x] !== 4);
	const buddy = inset(W$1, H$1, (x, y) => !!C[y][x] && S[y][x] === 4);
	const feature = (x, y) => {
		const c = C[y][x];
		if (!c || S[y][x] !== 0 || figure[y][x] < 2) return 0;
		const l = lum(c);
		return l < .22 ? .45 : l > .86 ? .3 : 0;
	};
	const front = Array.from({ length: H$1 }, () => new Array(W$1).fill(-Infinity));
	const span = Array.from({ length: H$1 }, () => new Array(W$1).fill(null));
	let deepest = 0;
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
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
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		const c = C[y][x], s = S[y][x];
		if (!c) continue;
		const copy = s ? owned[slotName(s)] : void 0;
		const surface = surfaceOf(copy ? copy.finish : "body", copy ? copy.scuff : 0);
		const px = x - W$1 / 2 + .5, py = H$1 / 2 - y - .5;
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
		let shade$1 = 0;
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (front[y + dy]?.[x + dx] ?? -Infinity) > z1 + .4) shade$1++;
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
		const color = shade$1 ? darken(c, 1 - shade$1 * .045) : c;
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
		const grid = slot === "buddy" && buddyAlone(cfg) || compose(cfg);
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
const linear = (hex$2) => {
	const n = parseInt(hex$2.slice(1, 7), 16);
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
	const soft$1 = (ix, iy) => {
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
		const dx = (soft$1(gx, gy - 1) + soft$1(gx, gy) - soft$1(gx - 1, gy - 1) - soft$1(gx - 1, gy)) / 2;
		const dy = (soft$1(gx - 1, gy) + soft$1(gx, gy) - soft$1(gx - 1, gy - 1) - soft$1(gx, gy - 1)) / 2;
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
	const shade$1 = (p, n) => {
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
		].map((p) => shade$1(p, n));
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
	const own = itemById(o.item)?.signature;
	if (o.fx && o.fx === own) notes.push({
		id: "signature",
		name: `${EFFECTS[o.fx].name} · showpiece`,
		why: `${EFFECTS[o.fx].what} Every copy of this showpiece has it.`,
		oneIn: 1
	});
	else if (o.fx) {
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
	if (o.craft !== void 0) notes.push({
		id: "craft",
		name: `Craft #${o.craft.toLocaleString("en-US")}`,
		why: o.craft <= 100 ? "Crafted from metal, one of the first hundred ever crafted." : "Crafted from metal: the item its maker chose.",
		oneIn: o.craft <= 100 ? 100 : 1
	});
	if (o.paint) notes.push({
		id: "paint",
		name: PAINTS[o.paint].name,
		why: "Painted by its owner. It scrapes off.",
		oneIn: 1
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
	const W$1 = width * scale$1, out = new Uint8ClampedArray(W$1 * height * scale$1 * 4);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const i = (y * width + x) * 4;
		for (let dy = 0; dy < scale$1; dy++) for (let dx = 0; dx < scale$1; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale$1 + dy) * W$1 + x * scale$1 + dx) * 4);
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
	return medianCut([...counts.entries()]);
}
/** Up to 255 colours standing for these colours and how often each is used, by median cut. */
function medianCut(all) {
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
	const weigh = (box) => {
		const used = Math.log2(1 + box.reduce((a, [, n]) => a + n, 0));
		return [
			0,
			1,
			2
		].map((k) => range(box, k) * used);
	};
	let boxes = [all];
	let weights = [weigh(all)];
	while (boxes.length < 255) {
		let best = -1, bk = 0, bw = -1;
		boxes.forEach((box$1, i) => {
			if (box$1.length < 2) return;
			for (let k = 0; k < 3; k++) {
				const w = weights[i][k];
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
		const lo = box.slice(0, cut), hi = box.slice(cut);
		boxes.splice(best, 1, lo, hi);
		weights.splice(best, 1, weigh(lo), weigh(hi));
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
/** The nearest of `table`'s colours (from index 1; 0 is transparent) to each colour asked for, remembered. */
function nearestIn(table) {
	const nearest = new Map();
	return (c) => {
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
}
/**
* The frames in at most 255 colours and transparent, each pixel the nearest colour of one palette made
* for all of them, as a GIF has them. A picture with thousands of colours (a big card's foil) then
* packs as an indexed PNG, several times smaller, and its GIF shows exactly the same pixels. It loses
* colours, so a picture that has been served exact stays exact.
*/
function fewerColours(input) {
	const counts = new Uint32Array(32768), sums = new Float64Array(32768 * 3), seen = new Set();
	for (const f of input.frames) for (let i = 0; i < f.length; i += 4) {
		if (f[i + 3] < 128) continue;
		if (seen.size <= 255) seen.add(f[i] << 16 | f[i + 1] << 8 | f[i + 2]);
		const b$1 = f[i] >> 3 << 10 | f[i + 1] >> 3 << 5 | f[i + 2] >> 3;
		counts[b$1]++;
		sums[b$1 * 3] += f[i];
		sums[b$1 * 3 + 1] += f[i + 1];
		sums[b$1 * 3 + 2] += f[i + 2];
	}
	if (seen.size <= 255) return input;
	const mean = (b$1) => Math.round(sums[b$1 * 3] / counts[b$1]) << 16 | Math.round(sums[b$1 * 3 + 1] / counts[b$1]) << 8 | Math.round(sums[b$1 * 3 + 2] / counts[b$1]);
	const all = [];
	for (let b$1 = 0; b$1 < 32768; b$1++) if (counts[b$1]) all.push([mean(b$1), counts[b$1]]);
	const table = [0, ...medianCut(all)], indexOf = nearestIn(table), ofBin = new Int32Array(32768).fill(-1);
	const frames = input.frames.map((f) => {
		const out = new Uint8ClampedArray(f.length);
		for (let i = 0; i < f.length; i += 4) {
			if (f[i + 3] < 128) continue;
			const b$1 = f[i] >> 3 << 10 | f[i + 1] >> 3 << 5 | f[i + 2] >> 3;
			let c = ofBin[b$1];
			if (c < 0) c = ofBin[b$1] = table[indexOf(mean(b$1))];
			out[i] = c >> 16;
			out[i + 1] = c >> 8 & 255;
			out[i + 2] = c & 255;
			out[i + 3] = 255;
		}
		return out;
	});
	return {
		...input,
		frames
	};
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
* The box of pixels that differ between two frames `W` wide, as `[x, y, w, h]`, or null when none do.
* Two pixels both under half alpha count as the same (both transparent).
*/
function changed(a, b$1, W$1, H$1) {
	let x0 = W$1, y0 = H$1, x1 = -1, y1 = -1;
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		const i = (y * W$1 + x) * 4;
		if (a[i + 3] < 128 && b$1[i + 3] < 128) continue;
		if (a[i] === b$1[i] && a[i + 1] === b$1[i + 1] && a[i + 2] === b$1[i + 2] && a[i + 3] === b$1[i + 3]) continue;
		if (x < x0) x0 = x;
		if (x > x1) x1 = x;
		if (y < y0) y0 = y;
		if (y > y1) y1 = y;
	}
	return x1 < 0 ? null : [
		x0,
		y0,
		x1 - x0 + 1,
		y1 - y0 + 1
	];
}
/** Whether a pixel shown in `before` is transparent in `after`: something a GIF can only clear by disposing. */
function clears(before, after) {
	for (let i = 3; i < after.length; i += 4) if (after[i] < 128 && before[i] >= 128) return true;
	return false;
}
/**
* An animated GIF that loops forever. Transparent pixels stay transparent, so
* a guy can be saved without a background. After the first frame only the box
* that changed is written, its unchanged pixels left to show through, so a
* shimmer on a hat costs the hat, not the whole picture; a frame that has to
* clear a pixel is written whole after a frame that clears itself away.
*/
function encodeGif(input, scale$1 = 1) {
	const W$1 = input.width * scale$1, H$1 = input.height * scale$1, n = input.frames.length;
	const frames = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const colours = palette(frames);
	const table = [0, ...colours];
	let bitsPer = 1;
	while (1 << bitsPer < table.length) bitsPer++;
	const out = [];
	const word = (n$1) => out.push(n$1 & 255, n$1 >> 8 & 255);
	out.push(...[..."GIF89a"].map((c) => c.charCodeAt(0)));
	word(W$1);
	word(H$1);
	out.push(128 | bitsPer - 1 << 4 | bitsPer - 1, 0, 0);
	for (let i = 0; i < 1 << bitsPer; i++) {
		const c = table[i] ?? 0;
		out.push(c >> 16 & 255, c >> 8 & 255, c & 255);
	}
	out.push(33, 255, 11, ...[..."NETSCAPE2.0"].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
	const indexOf = nearestIn(table);
	const src = input.frames, w0 = input.width, h0 = input.height;
	const clearing = src.map((f, k) => n > 1 && clears(src[(k + n - 1) % n], f));
	const whole = src.map((_, k) => k === 0 || clearing[k] || clearing[(k + 1) % n]);
	frames.forEach((f, k) => {
		const delay = Math.max(2, Math.round((input.delays[k] ?? 80) / 10));
		const dispose = n > 1 && clearing[(k + 1) % n] ? 2 : 1;
		const box = whole[k] ? [
			0,
			0,
			w0,
			h0
		] : changed(src[k - 1], src[k], w0, h0) ?? [
			0,
			0,
			1,
			1
		];
		const [bx, by, bw, bh] = box.map((v) => v * scale$1);
		out.push(33, 249, 4, dispose << 2 | 1);
		word(delay);
		out.push(0, 0);
		out.push(44);
		word(bx);
		word(by);
		word(bw);
		word(bh);
		out.push(0);
		const before = whole[k] ? null : frames[k - 1];
		const idx = new Uint8Array(bw * bh);
		for (let y = 0, p = 0; y < bh; y++) for (let x = 0; x < bw; x++, p++) {
			const i = ((by + y) * W$1 + bx + x) * 4;
			if (f[i + 3] < 128) {
				idx[p] = 0;
				continue;
			}
			if (before && before[i] === f[i] && before[i + 1] === f[i + 1] && before[i + 2] === f[i + 2] && before[i + 3] >= 128) {
				idx[p] = 0;
				continue;
			}
			idx[p] = indexOf(f[i] << 16 | f[i + 1] << 8 | f[i + 2]);
		}
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
		rows: (px, W$1, H$1) => {
			const raw = new Uint8Array((W$1 * 4 + 1) * H$1);
			for (let y = 0; y < H$1; y++) raw.set(px.subarray(y * W$1 * 4, (y + 1) * W$1 * 4), y * (W$1 * 4 + 1) + 1);
			return raw;
		}
	};
	return {
		indexed: true,
		colours: [...index.keys()],
		rows: (px, W$1, H$1) => {
			const raw = new Uint8Array((W$1 + 1) * H$1);
			for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) raw[y * (W$1 + 1) + 1 + x] = index.get(key(px, (y * W$1 + x) * 4));
			return raw;
		}
	};
}
/** The `w` by `h` box at `x`, `y` of a picture `W` wide. */
function crop(rgba, W$1, x, y, w, h) {
	if (x === 0 && w === W$1) return rgba.subarray(y * W$1 * 4, (y + h) * W$1 * 4);
	const out = new Uint8ClampedArray(w * h * 4);
	for (let r = 0; r < h; r++) out.set(rgba.subarray(((y + r) * W$1 + x) * 4, ((y + r) * W$1 + x + w) * 4), r * w * 4);
	return out;
}
async function png(input, scale$1, animated) {
	const W$1 = input.width * scale$1, H$1 = input.height * scale$1;
	const frames = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const { indexed, colours, rows } = layout(frames);
	const head = new Uint8Array([
		...u32(W$1),
		...u32(H$1),
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
		const box = i === 0 ? null : changed(input.frames[i - 1], input.frames[i], input.width, input.height);
		const [bx, by, bw, bh] = i === 0 ? [
			0,
			0,
			W$1,
			H$1
		] : (box ?? [
			0,
			0,
			1,
			1
		]).map((v) => v * scale$1);
		if (animated) parts.push(chunk("fcTL", concat([
			u32(seq++),
			u32(bw),
			u32(bh),
			u32(bx),
			u32(by),
			u16(Math.max(1, Math.round(input.delays[i] ?? 100))),
			u16(1e3),
			new Uint8Array([0, 0])
		])));
		const data = await zlib(rows(i === 0 ? frames[i] : crop(frames[i], W$1, bx, by, bw, bh), bw, bh));
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
//#region src/card-looks.ts
/**
* How a card's edition is painted, after the way Balatro paints its cards.
* Each edition has its look, chosen by `lookFor`:
*
* - `paint` (an aura card): its ground as banded paint in the aura's own
*   colours, cut in hard bands: each aura its own pattern (a spiral, waves,
*   rings, rising tongues, streaks or a nebula; `paintForm`), its copy's
*   print nudging the middle and the timing.
* - `sheen` (a Grail): once a loop a band of light crosses the card corner to
*   corner, as light catches metal: brighter on what stands proud, a glint on
*   the bevel as it passes, and still the rest of the time.
* - `liquid` (a Tempered card): its window flowing chrome, hard bands of dark,
*   sky and silver round a white highlight, slowly swirling, and its frame
*   chrome that catches the same highlights.
* - `opal` (a Polychrome card): a pale pearl with soft patches of colour
*   shifting over it.
* - `bands` (a Holographic card): a cool drifting tint and a few slow broad
*   bands of light, their edges in rainbow.
* - `classic`: the edition as `editionColor` draws it (./finish-shader), the
*   only look for Foil and Negative cards, and any card's if asked for.
*
* Each is written twice, as GLSL (`GLSL_LOOKS`) and as plain code
* (`lookField`), with the same result, and every motion comes round in
* LOOP_MS: time enters only as whole turns of the loop's angle.
*/
const CARD_LOOKS = [
	"classic",
	"paint",
	"sheen",
	"liquid",
	"opal",
	"bands"
];
/** Whether a look (as the shaders number it) can paint a card of edition `ed` (an index in EDITIONS). */
function lookApplies(look, ed) {
	if (look === 1) return ed === 6;
	if (look === 2) return ed === 5;
	if (look === 3 || look === 5) return ed === 2;
	if (look === 4) return ed === 3;
	return look === 0;
}
/**
* The look a card of edition `ed` is painted in, as the shaders number it: its
* edition's own (a Holographic card's by its finish: Tempered is liquid metal,
* Nebula bands), or `look` where that fits.
*/
function lookFor(ed, finish, look) {
	const asked = look ? CARD_LOOKS.indexOf(look) : -1;
	if (asked >= 0 && lookApplies(asked, ed)) return asked;
	return ed === 6 ? 1 : ed === 5 ? 2 : ed === 3 ? 4 : ed === 2 ? finish === "tempered" ? 3 : 5 : 0;
}
/** The default hardness of `paint`'s bands. */
const PAINT_CONTRAST = 7;
const INK$3 = [
	24 / 255,
	20 / 255,
	31 / 255
];
const lerp = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const unhex = (h) => [
	parseInt(h.slice(1, 3), 16) / 255,
	parseInt(h.slice(3, 5), 16) / 255,
	parseInt(h.slice(5, 7), 16) / 255
];
/**
* The three paints an aura card is banded in, from its aura's colours and the
* one it's known by (`auraHue`): a deep ground most of the card, a middle
* band, and a narrow top band in a second colour of the aura where it has one.
* All kept dark enough that the guy's own aura still reads over them.
*/
function paintColors(colors, hue$1) {
	const main = unhex(hue$1), h = toHsl(main)[0];
	const other = colors.map(unhex).filter((c) => {
		const s = toHsl(c);
		const d = Math.abs(s[0] - h);
		return s[1] > .3 && Math.min(d, 1 - d) > .08;
	})[0];
	return [
		lerp(main, INK$3, .7),
		lerp(main, INK$3, .42),
		other ? lerp(other, INK$3, .3) : lerp(main, INK$3, .12)
	];
}
/** A colour as hue, saturation and lightness, each 0 to 1 (`toHsl` in GLSL). */
function toHsl(c) {
	const hi = Math.max(c[0], c[1], c[2]), lo = Math.min(c[0], c[1], c[2]), d = hi - lo, l = (hi + lo) * .5;
	if (d < 1e-5) return [
		0,
		0,
		l
	];
	const s = d / (1 - Math.abs(2 * l - 1));
	const h = hi === c[0] ? (c[1] - c[2]) / d : hi === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
	return [
		fract(h / 6),
		s,
		l
	];
}
/**
* `lookColor` falls back to `editionColor` (GLSL_EDITIONS) for `classic`, so
* it goes after it. `p` is the cell in face cells, `o` the window's middle,
* `region` 1 face and 2 window, `th` the loop's angle.
*/
const GLSL_LOOKS = `
vec3 fromHsl(vec3 c) {
  vec3 k = clamp(abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (1.0 - abs(2.0 * c.z - 1.0)) * (k - 0.5);
}
float polyField(vec2 p, vec2 o, float th) {
  vec2 a = p - o - vec2(7.0 * cos(th), 9.0 * sin(th));
  vec2 b = p - o - vec2(-8.0 * sin(th), 6.0 * cos(2.0 * th));
  vec2 e = p - o - vec2(6.0 * cos(2.0 * th + 1.3), -7.0 * sin(th + 0.4));
  return cos(length(a) * 0.38) + sin(length(b) * 0.27 + th) * cos(b.y * 0.21) + cos(length(e) * 0.33 - th) * sin(e.x * 0.19);
}
float paintField(vec2 p, vec2 o, float th, vec4 form, float phase) {
  vec2 q = (p - o - form.zw) / 9.0;
  float r = length(q), k = form.y;
  if (form.x < 0.5) return 0.5 + 0.5 * sin(abs(k) * atan(q.y, q.x + 1e-4) + sign(k) * 5.0 * r - th + phase + 0.7 * sin(2.3 * r - th) + 0.5 * sin(q.x * 2.0 - q.y * 1.6 + th));
  if (form.x < 1.5) { vec2 u = q * 2.0; return 0.5 + 0.5 * sin(u.y * 2.2 * k + 1.3 * sin(u.x * 1.4 + th + phase) + 0.7 * sin(u.x * 3.1 - u.y * 0.8 - th) + 0.6 * sin(u.y * 1.1 + u.x * 0.6 - 2.0 * th)); }
  if (form.x < 2.5) return 0.5 + 0.5 * sin(r * 6.5 - th + phase + 0.7 * sin(q.x * 3.0 + q.y * 2.0 + th) + 0.5 * sin(q.y * 2.4 - q.x * 1.3 - th));
  if (form.x < 3.5) return 0.5 + 0.5 * sin(q.x * 6.0 + 1.6 * sin(q.y * 2.4 + k * th + phase) + 0.8 * sin(q.x * 2.1 - th)) + 0.15 * q.y * k;
  if (form.x < 4.5) return 0.5 + 0.5 * sin((q.x + q.y * 1.7 * k) * 5.0 + 0.8 * sin((q.x - q.y) * 2.6 + th + phase) + 0.5 * sin(q.y * 3.1 + 2.0 * th) - th);
  float tw = 0.6 * r + 0.35 * sin(th);
  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 1.9;
  float ct = 0.8 * cos(th + phase), st = 0.8 * sin(th + phase);
  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));
  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));
  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));
  return 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5);
}
vec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {
  float t = paintField(p, o, th, form, phase), w = 0.5 / contrast;
  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);
  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(length(p - o) / 9.0 * 0.5 - 0.35, 0.0, 1.0));
}
float sheenPos(float time) { return -6.0 + 84.0 * clamp(time / 1.4, 0.0, 1.0); }
float glint(vec2 p, vec2 g, float pos) {
  vec2 q = abs(p - g) * 5.0;
  float a = min(q.x, q.y), b = max(q.x, q.y);
  float star = b < 0.5 ? 1.0 : (a < 0.5 && b < 3.5 ? 0.8 - 0.2 * b : 0.0);
  return star * clamp(1.0 - abs(g.x + g.y - pos) / 1.2, 0.0, 1.0);
}
vec3 sheenColor(vec3 c, vec2 p, float region, float raised, float px, float time) {
  float pos = sheenPos(time), d = abs(p.x + p.y - pos);
  float halo = clamp(1.0 - d / 4.5, 0.0, 1.0), glow = clamp(1.0 - d / 2.2, 0.0, 1.0), core = clamp(1.0 - d / 0.7, 0.0, 1.0);
  float k = (0.65 + 0.35 * raised) * (region > 1.5 ? 0.6 : 1.0);
  c = mix(c, vec3(1.0, 0.88, 0.52), halo * halo * 0.35 * k);
  c = mix(c, vec3(1.0, 0.93, 0.7), glow * 0.55 * k);
  c = mix(c, vec3(1.0, 0.99, 0.93), core * 0.85 * k);
  if (px < 0.5) c += vec3(1.0, 0.97, 0.88) * (glint(p, vec2(4.8, 0.8), pos) + glint(p, vec2(23.0, 38.8), pos));
  return c;
}
float liquidField(vec2 p, vec2 o, float th) {
  vec2 u = (p - o) / 10.0 * 1.6;
  u += 0.6 * vec2(sin(1.4 * u.y + th), sin(1.2 * u.x - th + 0.8));
  u += 0.5 * vec2(sin(2.1 * u.y - th + 1.7), sin(1.8 * u.x + 2.0 * th));
  return 0.5 + 0.5 * sin(u.x * 1.3 + u.y * 2.1 + 0.6 * sin(u.x * 0.7 - th));
}
vec3 liquidColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float t = liquidField(p, o, th);
  float a = clamp((t - 0.28) / 0.06 + 0.5, 0.0, 1.0), b = clamp((t - 0.5) / 0.06 + 0.5, 0.0, 1.0), d = clamp((t - 0.82) / 0.05 + 0.5, 0.0, 1.0);
  vec3 metal = mix(mix(mix(vec3(0.1, 0.12, 0.18), vec3(0.55, 0.75, 0.95), a), vec3(0.78, 0.82, 0.88), b), vec3(1.0), d);
  if (region > 1.5) return metal;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(0.42 + 0.5 * l) * vec3(0.93, 0.96, 1.04), vec3(1.0), 0.4 * d);
}
vec3 opalColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float f = polyField(p, o, th);
  vec3 base = mix(c, vec3(0.94, 0.95, 0.98), 0.5);
  vec3 fire = fromHsl(vec3(fract(0.5 + 0.35 * f), 0.55, 0.78));
  return mix(base, fire, (region > 1.5 ? 0.45 : 0.3) * clamp(0.5 + f / 3.0, 0.0, 1.0));
}
vec3 bandsColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float k = region > 1.5 ? 0.6 : 1.0, b = sin((p.x * 0.3 + p.y * 0.5) * 0.45 - th);
  float band = clamp((b - 0.6) / 0.3, 0.0, 1.0), edge = band * (1.0 - band) * 4.0;
  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * polyField(p, o, th)), 0.75, 0.66));
  vec3 rim = fromHsl(vec3(fract(0.55 + 0.3 * b + p.y * 0.01), 0.8, 0.7));
  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.9, 0.95, 1.0) * band * 0.16 * k + rim * edge * 0.3 * k;
}
vec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float raised, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast, vec4 form, float phase) {
  float th = time * TAU / 6.0;
  if (look > 0.5 && look < 1.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast, form, phase) : c;
  if (look > 1.5 && look < 2.5) return sheenColor(c, p, region, raised, px, time);
  if (look > 2.5 && look < 3.5) return liquidColor(c, p, o, region, th);
  if (look > 3.5 && look < 4.5) return opalColor(c, p, o, region, th);
  if (look > 4.5) return bandsColor(c, p, o, region, th);
  return editionColor(c, ed, v, p, o, region, h, px, time);
}
`;
const TAU$1 = Math.PI * 2;
/** A sine from a table, to well under a millionth of a colour step: the looks take several a block every frame. */
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU$1));
const sin = (x) => {
	const u = x * (4096 / TAU$1), i = Math.floor(u), j = i & 4095;
	return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i);
};
const cos = (x) => sin(x + Math.PI / 2);
/** Liquid metal's dark, sky and silver, and its chrome frame's tint. */
const METAL = [
	[
		.1,
		.12,
		.18
	],
	[
		.55,
		.75,
		.95
	],
	[
		.78,
		.82,
		.88
	]
], CHROME = [
	.93,
	.96,
	1.04
];
/** Opal's pale pearl and the bands' light. */
const OPAL = [
	.94,
	.95,
	.98
], BAND_LIGHT = [
	.9,
	.95,
	1
];
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
/** The rings' middles at angle `th`, relative to the window's middle: three pairs. */
function polyCentres(th, into) {
	into[0] = 7 * Math.cos(th);
	into[1] = 9 * Math.sin(th);
	into[2] = -8 * Math.sin(th);
	into[3] = 6 * Math.cos(2 * th);
	into[4] = 6 * Math.cos(2 * th + 1.3);
	into[5] = -7 * Math.sin(th + .4);
}
/** `polyField` from GLSL_LOOKS, at `dx`, `dy` from the window's middle, with the middles from `polyCentres`. */
function polyAt(dx, dy, m, th) {
	const ax = dx - m[0], ay = dy - m[1], bx = dx - m[2], by = dy - m[3], ex = dx - m[4], ey = dy - m[5];
	return cos(Math.sqrt(ax * ax + ay * ay) * .38) + sin(Math.sqrt(bx * bx + by * by) * .27 + th) * cos(by * .21) + cos(Math.sqrt(ex * ex + ey * ey) * .33 - th) * sin(ex * .19);
}
/** `fromHsl`, written into `into` at `j`. */
function hslInto(into, j, h, sat, l) {
	const ch = sat * (1 - Math.abs(2 * l - 1));
	for (let i = 0; i < 3; i++) {
		const q = Math.abs(fract(h + (i === 0 ? 0 : i === 1 ? 2 / 3 : 1 / 3)) * 6 - 3) - 1;
		into[j + i] = l + ch * ((q < 0 ? 0 : q > 1 ? 1 : q) - .5);
	}
}
/** Each aura's pattern, picked for it: family, its number, and its middle's offset in face cells. */
const AURA_PAINT = {
	"aura.flames": [
		3,
		1,
		0,
		2
	],
	"aura.orbit": [
		0,
		2,
		0,
		0
	],
	"aura.halo": [
		2,
		1,
		0,
		-9
	],
	"aura.sparkles": [
		5,
		1,
		3,
		-3
	],
	"aura.hearts": [
		2,
		1,
		7,
		8
	],
	"aura.bubbles": [
		2,
		1,
		-6,
		11
	],
	"aura.storm": [
		1,
		1.4,
		0,
		0
	],
	"aura.lightning": [
		4,
		-1,
		0,
		0
	],
	"aura.notes": [
		1,
		1,
		0,
		0
	],
	"aura.snow": [
		4,
		1,
		0,
		0
	],
	"aura.petals": [
		0,
		-3,
		5,
		-4
	],
	"aura.galaxy": [
		5,
		1,
		0,
		0
	],
	"aura.rainbow": [
		1,
		.7,
		0,
		0
	],
	"aura.glitch": [
		4,
		-1,
		3,
		0
	],
	"aura.fireflies": [
		5,
		1,
		-4,
		5
	],
	"aura.neon": [
		2,
		1,
		0,
		0
	],
	"aura.echo": [
		2,
		1,
		0,
		3
	],
	"aura.comet": [
		4,
		1,
		-3,
		-3
	],
	"aura.butterflies": [
		0,
		4,
		0,
		0
	],
	"aura.aurora": [
		1,
		.8,
		0,
		-4
	],
	"aura.datarain": [
		3,
		-1,
		0,
		0
	],
	"aura.vortex": [
		0,
		-5,
		0,
		0
	],
	"aura.fireworks": [
		2,
		1,
		4,
		-7
	],
	"aura.ripple": [
		2,
		1,
		-3,
		5
	],
	"aura.origin": [
		0,
		1,
		0,
		0
	]
};
/** An aura copy's pattern: its own from AURA_PAINT (or one dealt from its id), the print nudging its middle and timing. */
function paintForm(id, print) {
	let h = 0;
	for (const ch of id) h = h * 31 + ch.charCodeAt(0) >>> 0;
	const [family, k, cx, cy] = AURA_PAINT[id] ?? [
		h % 6,
		[
			1,
			2,
			3
		][(h >> 4) % 3] * ((h >> 6) % 2 ? 1 : -1),
		0,
		0
	];
	return {
		form: [
			family,
			k,
			cx + (print % 7 - 3) * .5,
			cy + (Math.floor(print / 7) % 7 - 3) * .5
		],
		phase: print % 13 * .48
	};
}
/**
* `lookColor` over a fixed set of pixels, as `editionField` is for the
* editions; `classic` is `editionField` itself. Pixels on the same cell (the
* big card quantizes its cells to blocks) share one working-out of the field,
* so a frame costs a field a block and a few multiplies a pixel; nothing is
* allocated per frame.
*/
function cardField(look, ed, v, o, px, pixels, paint$1) {
	if (look === 0) return editionField(ed, v, o, px, pixels);
	if (look === 2) return sheenField(px, pixels);
	const { x, y, region, rgb: rgb$4 } = pixels, n = region.length;
	const blockOf = new Int32Array(n), keys = new Map(), bx = [], by = [];
	for (let k = 0; k < n; k++) {
		const key = Math.round(x[k] * 10) * 100003 + Math.round(y[k] * 10);
		let b$1 = keys.get(key);
		if (b$1 === void 0) {
			keys.set(key, b$1 = bx.length);
			bx.push(x[k] - o[0]);
			by.push(y[k] - o[1]);
		}
		blockOf[k] = b$1;
	}
	const nb = bx.length, val = new Float32Array(nb), m = new Float64Array(6);
	if (look === 1) {
		const { colors: [c1, c2, c3], contrast: contrast$1, form: [family, k, ox, oy], phase } = paint$1 ?? {
			colors: [
				[
					0,
					0,
					0
				],
				[
					.5,
					.5,
					.5
				],
				[
					1,
					1,
					1
				]
			],
			contrast: PAINT_CONTRAST,
			form: [
				5,
				1,
				0,
				0
			],
			phase: 0
		};
		const qx = new Float32Array(nb), qy = new Float32Array(nb), rr = new Float32Array(nb), aa = new Float32Array(nb), shade$1 = new Float32Array(nb);
		for (let b$1 = 0; b$1 < nb; b$1++) {
			const px$1 = (bx[b$1] - ox) / 9, py = (by[b$1] - oy) / 9, r = Math.sqrt(px$1 * px$1 + py * py), a = .6 * r;
			qx[b$1] = px$1;
			qy[b$1] = py;
			rr[b$1] = r;
			aa[b$1] = Math.atan2(py, px$1 + 1e-4);
			if (family === 5) {
				qx[b$1] = px$1 * Math.cos(a) - py * Math.sin(a);
				qy[b$1] = px$1 * Math.sin(a) + py * Math.cos(a);
			}
			shade$1[b$1] = 1 - .22 * clamp01(Math.sqrt(bx[b$1] * bx[b$1] + by[b$1] * by[b$1]) / 9 * .5 - .35);
		}
		const w = .5 / contrast$1, k1v = new Float32Array(nb), k2v = new Float32Array(nb), arms = Math.abs(k), turn$1 = Math.sign(k);
		return (time, out) => {
			const th = time * TAU$1 / 6;
			if (family === 0) for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = .5 + .5 * sin(arms * aa[b$1] + turn$1 * 5 * rr[b$1] - th + phase + .7 * sin(2.3 * rr[b$1] - th) + .5 * sin(qx[b$1] * 2 - qy[b$1] * 1.6 + th));
			else if (family === 1) for (let b$1 = 0; b$1 < nb; b$1++) {
				const ux = qx[b$1] * 2, uy = qy[b$1] * 2;
				val[b$1] = .5 + .5 * sin(uy * 2.2 * k + 1.3 * sin(ux * 1.4 + th + phase) + .7 * sin(ux * 3.1 - uy * .8 - th) + .6 * sin(uy * 1.1 + ux * .6 - 2 * th));
			}
			else if (family === 2) for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = .5 + .5 * sin(rr[b$1] * 6.5 - th + phase + .7 * sin(qx[b$1] * 3 + qy[b$1] * 2 + th) + .5 * sin(qy[b$1] * 2.4 - qx[b$1] * 1.3 - th));
			else if (family === 3) for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = .5 + .5 * sin(qx[b$1] * 6 + 1.6 * sin(qy[b$1] * 2.4 + k * th + phase) + .8 * sin(qx[b$1] * 2.1 - th)) + .15 * qy[b$1] * k;
			else if (family === 4) for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = .5 + .5 * sin((qx[b$1] + qy[b$1] * 1.7 * k) * 5 + .8 * sin((qx[b$1] - qy[b$1]) * 2.6 + th + phase) + .5 * sin(qy[b$1] * 3.1 + 2 * th) - th);
			else {
				const tw = .35 * Math.sin(th), ca = Math.cos(tw), sa = Math.sin(tw), ct = .8 * Math.cos(th + phase), st = .8 * Math.sin(th + phase);
				for (let b$1 = 0; b$1 < nb; b$1++) {
					let ux = (qx[b$1] * ca - qy[b$1] * sa) * 1.9, uy = (qx[b$1] * sa + qy[b$1] * ca) * 1.9, dx;
					dx = .8 * sin(1.3 * uy + ct);
					uy += .8 * sin(1.1 * ux + st);
					ux += dx;
					dx = .8 * sin(1.7 * uy - st + .9);
					uy += .8 * sin(1.5 * ux + ct - .7);
					ux += dx;
					dx = .8 * sin(2.1 * uy + ct + 1.8);
					uy += .8 * sin(1.9 * ux - st + 2.6);
					ux += dx;
					val[b$1] = .5 + .5 * sin(ux * .9 + uy * 1.2 + rr[b$1] * 1.5);
				}
			}
			for (let b$1 = 0; b$1 < nb; b$1++) {
				const t = val[b$1];
				k1v[b$1] = clamp01((t - .38) / w + .5);
				k2v[b$1] = clamp01((t - .74) / w + .5);
			}
			for (let k$1 = 0; k$1 < n; k$1++) {
				const j = k$1 * 3;
				if (region[k$1] < 1.5) {
					out[j] = rgb$4[j];
					out[j + 1] = rgb$4[j + 1];
					out[j + 2] = rgb$4[j + 2];
					continue;
				}
				const b$1 = blockOf[k$1], k1 = k1v[b$1], k2 = k2v[b$1], s = shade$1[b$1];
				for (let i = 0; i < 3; i++) {
					const lo = c1[i] + (c2[i] - c1[i]) * k1;
					out[j + i] = (lo + (c3[i] - lo) * k2) * s;
				}
			}
		};
	}
	if (look === 3) {
		const ux0 = Float32Array.from(bx, (d) => d / 10 * 1.6), uy0 = Float32Array.from(by, (d) => d / 10 * 1.6), lum$1 = new Float32Array(n);
		for (let k = 0; k < n; k++) lum$1[k] = .42 + .5 * (.299 * rgb$4[k * 3] + .587 * rgb$4[k * 3 + 1] + .114 * rgb$4[k * 3 + 2]);
		const ea = new Float32Array(nb), eb = new Float32Array(nb), ed2 = new Float32Array(nb);
		return (time, out) => {
			const th = time * TAU$1 / 6;
			for (let b$1 = 0; b$1 < nb; b$1++) {
				let ux = ux0[b$1], uy = uy0[b$1], dx;
				dx = .6 * sin(1.4 * uy + th);
				uy += .6 * sin(1.2 * ux - th + .8);
				ux += dx;
				dx = .5 * sin(2.1 * uy - th + 1.7);
				uy += .5 * sin(1.8 * ux + 2 * th);
				ux += dx;
				const t = .5 + .5 * sin(ux * 1.3 + uy * 2.1 + .6 * sin(ux * .7 - th));
				ea[b$1] = clamp01((t - .28) / .06 + .5);
				eb[b$1] = clamp01((t - .5) / .06 + .5);
				ed2[b$1] = clamp01((t - .82) / .05 + .5);
			}
			for (let k = 0; k < n; k++) {
				const j = k * 3, b$1 = blockOf[k], d = ed2[b$1];
				if (region[k] > 1.5) {
					for (let i = 0; i < 3; i++) {
						const lo = METAL[0][i] + (METAL[1][i] - METAL[0][i]) * ea[b$1], mid = lo + (METAL[2][i] - lo) * eb[b$1];
						out[j + i] = mid + (1 - mid) * d;
					}
					continue;
				}
				for (let i = 0; i < 3; i++) {
					const ch = lum$1[k] * CHROME[i];
					out[j + i] = ch + (1 - ch) * .4 * d;
				}
			}
		};
	}
	const ax = Float32Array.from(bx, (d) => d + o[0]), ay = Float32Array.from(by, (d) => d + o[1]);
	const col = new Float32Array(nb * 3), w1 = new Float32Array(nb), w2 = new Float32Array(nb), rim$1 = new Float32Array(nb * 3);
	return (time, out) => {
		const th = time * TAU$1 / 6;
		polyCentres(th, m);
		for (let b$1 = 0; b$1 < nb; b$1++) {
			const f = polyAt(bx[b$1], by[b$1], m, th);
			if (look === 4) {
				hslInto(col, b$1 * 3, fract(.5 + .35 * f), .55, .78);
				w1[b$1] = clamp01(.5 + f / 3);
				continue;
			}
			hslInto(col, b$1 * 3, fract(.58 + .12 * f), .75, .66);
			const v$1 = sin((ax[b$1] * .3 + ay[b$1] * .5) * .45 - th), band$1 = clamp01((v$1 - .6) / .3);
			w1[b$1] = band$1 * .16;
			w2[b$1] = band$1 * (1 - band$1) * 4 * .3;
			hslInto(rim$1, b$1 * 3, fract(.55 + .3 * v$1 + ay[b$1] * .01), .8, .7);
		}
		for (let k = 0; k < n; k++) {
			const j = k * 3, b$1 = blockOf[k], win = region[k] > 1.5;
			for (let i = 0; i < 3; i++) {
				const c = rgb$4[j + i];
				if (look === 4) {
					const base = c + (OPAL[i] - c) * .5;
					out[j + i] = base + (col[b$1 * 3 + i] - base) * (win ? .45 : .3) * w1[b$1];
					continue;
				}
				const kk = win ? .6 : 1;
				out[j + i] = c + (c * .5 + col[b$1 * 3 + i] * .55 - c) * .5 * kk + BAND_LIGHT[i] * w1[b$1] * kk + rim$1[b$1 * 3 + i] * w2[b$1] * kk;
			}
		}
	};
}
/** Where the sheen stands across the card at `time`: the sum of a cell's two coordinates under its middle. */
const sheenPos = (time) => -6 + 84 * clamp01(time / 1.4);
/** Where the big card's two glints open, on its bevel, in face cells. */
const GLINTS = [[4.8, .8], [23, 38.8]];
/**
* `sheenColor` over a fixed set of pixels: each pixel's place along the
* diagonal and its glint are worked out once, and a pixel the band is
* nowhere near is copied as it is.
*/
function sheenField(px, { x, y, region, rgb: rgb$4, raised }) {
	const n = region.length, s = new Float32Array(n), k = new Float32Array(n), star = new Float32Array(px < .5 ? n * 2 : 0), lit = new Float32Array(2);
	for (let i = 0; i < n; i++) {
		s[i] = x[i] + y[i];
		k[i] = (.65 + .35 * (raised?.[i] ?? 0)) * (region[i] > 1.5 ? .6 : 1);
		if (px < .5) GLINTS.forEach(([gx, gy], g) => {
			const qx = Math.abs(x[i] - gx) * 5, qy = Math.abs(y[i] - gy) * 5, a = Math.min(qx, qy), b$1 = Math.max(qx, qy);
			star[i * 2 + g] = b$1 < .5 ? 1 : a < .5 && b$1 < 3.5 ? .8 - .2 * b$1 : 0;
		});
	}
	return (time, out) => {
		const pos = sheenPos(time);
		for (let g = 0; g < 2; g++) lit[g] = clamp01(1 - Math.abs(GLINTS[g][0] + GLINTS[g][1] - pos) / 1.2);
		for (let i = 0; i < n; i++) {
			const j = i * 3, d = Math.abs(s[i] - pos), g = star.length ? star[i * 2] * lit[0] + star[i * 2 + 1] * lit[1] : 0;
			if (d >= 4.5 && !g) {
				out[j] = rgb$4[j];
				out[j + 1] = rgb$4[j + 1];
				out[j + 2] = rgb$4[j + 2];
				continue;
			}
			const halo = clamp01(1 - d / 4.5), glow = clamp01(1 - d / 2.2), core = clamp01(1 - d / .7), kk = k[i];
			const a = halo * halo * .35 * kk, b$1 = glow * .55 * kk, c = core * .85 * kk;
			for (let ch = 0; ch < 3; ch++) {
				let v = rgb$4[j + ch];
				v += (SHEEN_HALO[ch] - v) * a;
				v += (SHEEN_GLOW[ch] - v) * b$1;
				v += (SHEEN_CORE[ch] - v) * c;
				out[j + ch] = v + SHEEN_GLINT[ch] * g;
			}
		}
	};
}
const SHEEN_HALO = [
	1,
	.88,
	.52
], SHEEN_GLOW = [
	1,
	.93,
	.7
], SHEEN_CORE = [
	1,
	.99,
	.93
], SHEEN_GLINT = [
	1,
	.97,
	.88
];

//#endregion
//#region src/card.ts
/**
* Trading cards, drawn by the library so every game, the site and an export
* show the same card: a guy wearing his copies, moving, each copy's finish
* shining on its own pixels, its effect playing, the card's face dressed for
* the grade, and the words written in the club's pixel type.
*
* A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, several to each of
* the guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
* up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
*/
const CARD_WIDTH = 140;
const CARD_HEIGHT = 204;
const hexes = new Map();
const rgb$2 = (h) => {
	let c = hexes.get(h);
	if (!c) hexes.set(h, c = [
		parseInt(h.slice(1, 3), 16),
		parseInt(h.slice(3, 5), 16),
		parseInt(h.slice(5, 7), 16)
	]);
	return c;
};
const mix$2 = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const hash$1 = (x, y, p) => {
	const s = Math.sin(x * 127.1 + y * 311.7 + p * .731) * 43758.5453;
	return s - Math.floor(s);
};
const EXTRA$1 = {
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
	]],
	"…": [9, [
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
		219,
		219,
		0,
		0,
		0
	]],
	"’": [3, [
		0,
		0,
		3,
		3,
		2,
		1,
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
	"‘": [3, [
		0,
		0,
		2,
		1,
		3,
		3,
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
	"“": [6, [
		0,
		0,
		18,
		9,
		27,
		27,
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
	"”": [6, [
		0,
		0,
		27,
		27,
		18,
		9,
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
	]]
};
const glyph$1 = (ch) => EXTRA$1[ch] ?? GLYPHS[ch] ?? GLYPHS["?"];
/** Whether the card's pixel type has a glyph for `ch` (anything else is written "?"). */
const hasGlyph = (ch) => ch in EXTRA$1 || ch in GLYPHS;
/** How wide a line of text is, in pixels. */
const textWidth = (s) => [...s].reduce((w, ch) => w + glyph$1(ch)[0], 0);
/** A line of text made to fit `width` on one line: as it is, a pixel tighter between letters, or cut short with "…". */
function fitLine(text, width) {
	const wide$1 = (t, spacing) => textWidth(t) + spacing * ([...t].length - 1);
	if (wide$1(text, 0) <= width) return {
		text,
		spacing: 0
	};
	if (wide$1(text, -1) <= width) return {
		text,
		spacing: -1
	};
	const chars = [...text];
	while (chars.length > 1 && wide$1(chars.join("").trimEnd() + "…", -1) > width) chars.pop();
	return {
		text: chars.join("").trimEnd() + "…",
		spacing: -1
	};
}
/** The grade badge's room either side of its word, and the gap after it: tight, so a rank beside it fits whole. */
const PILL_PAD = 6, PILL_GAP = 4;
/** The line beside the badge, fitted to `width`; a rank ("Top 0.055%") drops its "Top" rather than be cut. */
function rankFit(text, width) {
	const fit$2 = fitLine(text, width);
	return fit$2.text === text ? fit$2 : fitLine(text.replace(/^Top (?=\d)/, ""), width);
}
/** How wide the line beside a badge reading `pill` may be. */
const rankRoom = (pill$1) => CARD_WIDTH - M * 2 - 10 - textWidth(pill$1) - PILL_PAD * 2 - PILL_GAP;
/** Card words without the ★ glyph. */
const unstarred = (t) => t.replace(/★\s*/g, "").trim();
/** A drawing surface of RGBA card pixels, with what each pixel is for the card's edition: 0 nothing, 1 the face, 2 the window. */
var Surface = class {
	px;
	region;
	constructor(w = CARD_WIDTH, h = CARD_HEIGHT) {
		this.w = w;
		this.h = h;
		this.px = new Uint8ClampedArray(w * h * 4);
		this.region = new Uint8Array(w * h);
	}
	set(x, y, c, region = 0) {
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
		const i = (y * this.w + x) * 4;
		this.px[i] = c[0];
		this.px[i + 1] = c[1];
		this.px[i + 2] = c[2];
		this.px[i + 3] = 255;
		this.region[y * this.w + x] = region;
	}
	/** Text with a hard drop shadow, its colour picked per pixel so foil can run along it; `spacing` added to each letter's advance. */
	text(s, x, top, colour, shadow, spacing = 0) {
		const draw = (ox, oy, col) => {
			let cx = ox;
			for (const ch of s) {
				const [adv, rows] = glyph$1(ch);
				rows.forEach((bits, dy) => {
					for (let dx = 0; bits >> dx; dx++) if (bits & 1 << dx) this.set(cx + dx, oy + dy, col(cx + dx, oy + dy));
				});
				cx += adv + spacing;
			}
		};
		if (shadow) draw(x, top + 1, () => shadow);
		draw(x, top, colour);
	}
};
const INK$2 = [
	24,
	20,
	31
], IVORY$2 = [
	246,
	240,
	227
], WHITE$1 = [
	255,
	255,
	255
], PLATE$2 = [
	38,
	34,
	52
];
/** A Grail's gold foil, its light and its deep. */
const GOLD_HI = [
	255,
	226,
	128
], GOLD_LO = [
	196,
	130,
	30
];
/** A Grail's amber window, its deep and the glow behind him. */
const AMBER = [
	92,
	54,
	12
], AMBER_GLOW = [
	214,
	150,
	44
];
/** A Grail's words, struck into the gold: dark brown, the light catching the cut's lower edge. */
const GOLD_INK = [
	96,
	54,
	6
], GOLD_CUT = [
	255,
	240,
	186
];
/**
* A Grail: `framed` (the default) a dark card round a window of gold in a few large soft bands, a thin
* bright gold line along its bevel and inside the window's rim, on the dark plate every card has;
* `brushed` the earlier brushed gold card, its words struck into the gold.
*/
const CARD_GOLDS = ["framed", "brushed"];
/** The framed Grail's clean gold, its light top edge and its deep lower edge; its dark stock and its badge's words. */
const BRIGHT_GOLD = [
	247,
	201,
	72
], GOLD_LIGHT = [
	255,
	233,
	160
], GOLD_DEEP = [
	201,
	146,
	30
];
const DARK_HI = [
	46,
	42,
	64
], DARK_LO = [
	28,
	24,
	40
], PILL_INK = [
	74,
	46,
	6
];
/** The framed Grail's window's three golds, deep to light. */
const FIELD_GOLDS = [
	[
		176,
		112,
		24
	],
	[
		226,
		164,
		52
	],
	[
		250,
		206,
		110
	]
];
/** The brushed Grail's bevel deep, window rim, quiet words and studs, and badge. */
const BRUSHED = {
	bevelLo: [
		150,
		92,
		18
	],
	rim: [
		72,
		40,
		6
	],
	quiet: [
		110,
		66,
		10
	],
	pill: [
		96,
		56,
		10
	]
};
/** How tall the card itself is: the rows under it hold its shadow. */
const BODY_HEIGHT = CARD_HEIGHT - 5;
/** Whether a pixel is inside a rounded box. */
function inBox(x, y, w, h, r) {
	if (x < 0 || y < 0 || x >= w || y >= h) return false;
	const cx = x < r ? r - x : x > w - 1 - r ? x - (w - 1 - r) : 0;
	const cy = y < r ? r - y : y > h - 1 - r ? y - (h - 1 - r) : 0;
	return cx * cx + cy * cy <= r * r;
}
const inside = (x, y) => inBox(x, y, CARD_WIDTH, BODY_HEIGHT, 8);
/**
* The card's shape, worked out the first time a card is drawn. Each pixel's
* `depth`: 0 outside the card, else the shortest step across or down (up to
* 9) that leaves it. Its `bevel`: 1 lit (near the top or left), 2 deep (near
* the bottom or right), 0 neither. Each pair of pixels' noise (`glint`), where
* an edition's glints open. And the card's hard `shadow` on the table, five
* rows down, with nothing on it.
*/
let theShape = null;
function cardShape() {
	if (theShape) return theShape;
	const W$1 = CARD_WIDTH, H$1 = BODY_HEIGHT, depth = new Uint8Array(W$1 * H$1), bevel = new Uint8Array(W$1 * H$1);
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		if (!inside(x, y)) continue;
		let d = 1;
		while (d < 9 && inside(x - d, y) && inside(x + d, y) && inside(x, y - d) && inside(x, y + d)) d++;
		const lit = !inside(x - 3, y) || !inside(x, y - 3), deep = !inside(x + 3, y) || !inside(x, y + 3);
		depth[y * W$1 + x] = d;
		bevel[y * W$1 + x] = deep ? 2 : lit ? 1 : 0;
	}
	const glint = Float64Array.from({ length: W$1 * H$1 }, (_, i) => hash$1(i % W$1, Math.floor(i / W$1), 11));
	const runs$1 = Array.from({ length: H$1 }, (_, y) => {
		let a = -1, b$1 = -1;
		for (let x = 0; x < W$1; x++) if (depth[y * W$1 + x]) {
			if (a < 0) a = x;
			b$1 = x;
		}
		return [a, b$1];
	});
	const shadow = new Uint8ClampedArray(W$1 * CARD_HEIGHT * 4);
	runs$1.forEach(([a, b$1], y) => {
		for (let x = a; a >= 0 && x <= b$1; x++) shadow.set([
			20,
			16,
			28,
			150
		], ((y + 5) * W$1 + x) * 4);
	});
	return theShape = {
		depth,
		bevel,
		glint,
		runs: runs$1,
		shadow
	};
}
/** The window's and plate's margin at the card's sides: out to the bevel, so a guy and his buddy fit. */
const M = 4;
/**
* Card pixels to each of the guy's, the same on every card, buddy or not. A
* guy with his buddy a column closer fills the window, losing at most a card
* pixel under its rim at their widest reach.
*/
const ZOOM = 5;
/** Whether a copy's finish moves on the card (a heavily scuffed plain copy's sweep is worn away). */
const shines$1 = (o) => {
	const f = SHADER_FINISHES.indexOf(o.finish);
	return f > 0 || f === 0 && o.scuff <= .07;
};
/**
* Centred on his sixteen columns, or with a buddy beside him on everything
* either of them covers in any frame of the move; and in the window's height
* as he stands at rest. His feet stand on the same row in every frame, so a
* hop leaves the floor. A frame item's backdrop doesn't count: it fills the
* whole window behind them.
*/
function cardFit(frames, width, cellX) {
	let left = Infinity, right = -Infinity, top = FRAME_HEIGHT, foot = 0, topAll = FRAME_HEIGHT, footAll = 0;
	for (const f of frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
		const slot = f.slots[y][x];
		if (!c || slot === 3) return;
		topAll = Math.min(topAll, y);
		footAll = Math.max(footAll, y);
		if (slot === 5) return;
		left = Math.min(left, cellX(x, slot));
		right = Math.max(right, cellX(x, slot) + ZOOM);
		top = Math.min(top, y);
		foot = Math.max(foot, y);
	}));
	const mid = width <= FRAME_WIDTH || right < left ? FRAME_WIDTH * ZOOM / 2 : (left + right) / 2;
	const rest = frames[0]?.colors.findIndex((row, y) => row.some((c, x) => c && frames[0].slots[y][x] !== 5 && frames[0].slots[y][x] !== 3)) ?? top;
	return {
		mid,
		top,
		foot,
		topAll,
		footAll,
		rest: rest < 0 ? top : rest
	};
}
/**
* How many card pixels his buddy stands in towards him: all of the empty
* columns between them in every frame of the move but two card pixels, room
* for a sticker edge between them, so the two stand a size bigger.
*/
function buddyNudge(anim, grid = false) {
	if (anim.width <= FRAME_WIDTH) return 0;
	let guy = -1, buddy = anim.width;
	for (const f of anim.frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c || f.slots[y][x] === 3 || f.slots[y][x] === 5) return;
		if (x < FRAME_WIDTH) guy = Math.max(guy, x);
		else buddy = Math.min(buddy, x);
	}));
	return grid ? Math.max(0, (buddy - guy - 2) * ZOOM) : Math.max(0, (buddy - guy - 1) * ZOOM - 2);
}
/**
* How he stands out from the window: `none` (the default) on his own dark outline, everything in the
* window on his own grid and his whole move kept inside it; `sticker` the earlier white sticker edge a
* card pixel or two round him, a tall hat poking out over the window.
*/
const CARD_EDGES = ["none", "sticker"];
/**
* Everything about a card that holds still, worked out once: the laid-out
* face, plate and words, the edition's field, and the guy's placement. Its
* `draw` puts the card at `t` seconds, with his frame `frame`, into `out`.
*
* Laid out from the foot up so the words always fit, and the window takes the
* rest, so the card is mostly him. The card stands on its own hard shadow and
* lifts off it now and then. Its edition, after Balatro's, comes from the
* finish that sets its grade: Foil, Holographic, Polychrome, Negative, Gold,
* and the aura card's Spectral.
*/
function cardArt(input, anim, owned, g, ed, looks = {}) {
	const edge = looks.edge ?? "none", grid = edge === "none";
	const zoom = ZOOM, nudge = buddyNudge(anim, grid);
	const cellX = (gx, slot) => gx * zoom - (gx >= FRAME_WIDTH && slot !== 5 ? nudge : 0);
	const fit$2 = cardFit(anim.frames, anim.width, cellX), shape = cardShape();
	const lastCopy = input.copies?.[input.copies.length - 1];
	const shift$1 = lastCopy ? lastCopy.print * 37 : [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6e3, 0);
	const v = lastCopy ? lastCopy.print % 4 : 0;
	const W$1 = CARD_WIDTH, H$1 = BODY_HEIGHT, side = M;
	const s = new Surface(W$1, H$1);
	const gold = ed === 5, aura = ed === 6, neg = ed === 4;
	const framed = gold && looks.gold !== "brushed", struck = gold && !framed;
	const gc = g >= 0 ? rgb$2(GRADES[g].color) : [
		104,
		118,
		146
	];
	const auraCopy = owned.aura;
	const ah = aura && auraCopy ? rgb$2(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
	const tone = aura ? ah : gc;
	const textW = W$1 - M * 2 - 10, left = side + 5;
	const copies = input.copies ?? [];
	const topCopy = copies.filter((o) => GRADES.findIndex((x) => x.id === gradeOf(o).id) === g).pop();
	const unusualCopy = [...copies].reverse().find((o) => unusual(o) && o.fx);
	const pill$1 = input.lines?.[0] ? unstarred(input.lines[0]) : void 0;
	let titleText = unstarred(input.title.split(" | ")[0]);
	const unusualItem = unusualCopy ? itemById(unusualCopy.item) : void 0;
	const fxName = unusualCopy?.fx && unusualCopy.fx !== unusualItem?.signature && unusualItem && titleText.includes(unusualItem.name) ? EFFECTS[unusualCopy.fx].name : "";
	if (fxName && !titleText.includes(fxName)) titleText = `${fxName} ${titleText}`;
	const tooLong = (text) => textWidth(text) - [...text].length + 1 > textW;
	for (const word of [
		"Strange ",
		"Souvenir ",
		...fxName ? [`${fxName} `] : []
	]) if (tooLong(titleText) && titleText.includes(word)) titleText = titleText.replace(word, "");
	const titleFit = fitLine(titleText, textW);
	const footLine = (input.footer ?? "").split(" · ").filter((part) => part && !part.startsWith("#")).join(" · ");
	const sealed = /\b1st edition\b/i.test(input.footer ?? "");
	const footFit = footLine ? fitLine(footLine, textW - (sealed ? 18 : 0)) : void 0;
	const footH = footFit || sealed ? 11 : 0;
	const plateText = unstarred(input.plate?.text ?? ""), plateBare = plateText.replace(/^[^·]*·\s*/, "");
	const plateRow = plateText ? fitLine(textWidth(plateText) - [...plateText].length + 1 > textW - 10 && plateBare ? plateBare : plateText, textW - 10) : void 0;
	const plateGrade = Math.max(0, Math.min(GRADES.length - 1, input.plate?.grade ?? 0));
	const pillW = pill$1 ? textWidth(pill$1) + PILL_PAD * 2 : 0;
	const subW = pill$1 ? rankRoom(pill$1) : textW;
	const sub = input.lines?.[1] ? rankFit(unstarred(input.lines[1]), subW) : void 0;
	const plateBottom = H$1 - 1 - 6;
	let y = plateBottom - 3 - footH;
	const footTop = y;
	if (footH) y -= 2;
	const plateRowTop = plateRow ? y -= 14 : y;
	if (plateRow) y -= 2;
	const pillTop = pill$1 || sub ? y -= 15 : y;
	if (pill$1 || sub) y -= 3;
	y -= 12;
	const titleTop = y;
	const plateTop = y - 3;
	const WIN = {
		left: side,
		right: W$1 - 1 - side,
		top: 6,
		bottom: plateTop - 4
	};
	const wcx = (WIN.left + WIN.right) / 2, wcy = WIN.top + (WIN.bottom - WIN.top) * .45;
	const inW = WIN.right - WIN.left - 3, inH = WIN.bottom - WIN.top - 3, side2 = Math.min(inW, inH);
	const square = {
		x: WIN.left + 2 + Math.floor((inW - side2) / 2),
		y: WIN.top + 2 + Math.floor((inH - side2) / 2),
		size: side2
	};
	const stock = (x, yy) => {
		if (framed) return mix$2(DARK_HI, DARK_LO, yy / H$1);
		if (gold) {
			const base = mix$2(GOLD_HI, GOLD_LO, yy / H$1 * .9 + .08 * Math.sin(x * .05 + yy * .02));
			return yy % 3 === 0 ? mix$2(base, GOLD_LO, .12) : base;
		}
		if (neg) return mix$2(mix$2(IVORY$2, tone, .35), mix$2(IVORY$2, tone, .6), yy / H$1);
		return mix$2(mix$2(tone, WHITE$1, .08), mix$2(tone, INK$2, .25), yy / H$1);
	};
	const rows = Array.from({ length: H$1 }, (_, yy) => gold ? null : stock(0, yy));
	const auraDeep = mix$2(ah, INK$2, .62), auraLight = mix$2(ah, INK$2, .3), inlay = mix$2(ah, WHITE$1, .7);
	const trim = new Uint8Array(W$1 * H$1);
	for (let yy = 0; yy < H$1; yy++) for (let x = 0; x < W$1; x++) {
		const d = shape.depth[yy * W$1 + x], bevel = shape.bevel[yy * W$1 + x];
		if (!d) continue;
		if (d <= 2) {
			s.set(x, yy, INK$2);
			continue;
		}
		let c = rows[yy] ?? stock(x, yy);
		if (framed && bevel && d === 3) {
			c = bevel === 1 ? GOLD_LIGHT : GOLD_DEEP;
			trim[yy * W$1 + x] = 1;
		} else if (struck && bevel) c = mix$2(mix$2([
			255,
			238,
			168
		], BRUSHED.bevelLo, (x + yy * 1.4) / (W$1 + H$1 * 1.4)), bevel === 1 ? WHITE$1 : INK$2, .2);
		else if (bevel === 1) c = mix$2(c, WHITE$1, .35);
		else if (bevel) c = mix$2(c, INK$2, .3);
		else if (aura && d <= 5) c = inlay;
		if (aura && d > 6) {
			const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
			s.set(x, yy, mix$2(auraDeep, auraLight, Math.max(0, 1 - r) ** 1.2), 2);
			continue;
		}
		s.set(x, yy, c, 1);
	}
	const light = g >= 0 ? mix$2(IVORY$2, gc, .22) : mix$2(IVORY$2, gc, .12);
	/** A framed Grail's window: a few large soft bands of three golds, on blocks of two card pixels, holding still. */
	const fieldGold = (x, yy) => {
		const qx = ((x >> 1) * 2 - wcx) / 40, qy = ((yy >> 1) * 2 - wcy) / 40;
		const t = .5 + .5 * Math.sin(qy * 3.2 + 1.3 * Math.sin(qx * 2.4 + .6) + .6 * Math.sin(qx * 4.1 - qy * 1.7));
		const k1 = Math.min(1, Math.max(0, (t - .35) / .12 + .5)), k2 = Math.min(1, Math.max(0, (t - .72) / .12 + .5));
		return mix$2(mix$2(FIELD_GOLDS[0], FIELD_GOLDS[1], k1), FIELD_GOLDS[2], k2);
	};
	const own = !aura && !gold && topCopy ? windowArt(topCopy, WIN, wcx, wcy) : null;
	if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$1 = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
		if (rim$1) {
			const inner = x - WIN.left === 1 || WIN.right - x === 1 || yy - WIN.top === 1 || WIN.bottom - yy === 1;
			if (framed && inner) trim[yy * W$1 + x] = 1;
			s.set(x, yy, framed && inner ? BRIGHT_GOLD : struck && inner ? [
				255,
				226,
				140
			] : struck ? BRUSHED.rim : INK$2);
			continue;
		}
		const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 64, (yy - wcy) / 72);
		let c = framed ? fieldGold(x, yy) : !gold ? mix$2(light, mix$2(light, gc, .35), depth * .6) : mix$2(mix$2(AMBER, AMBER_GLOW, Math.max(0, 1 - r) ** 1.3), mix$2(AMBER, INK$2, .3), depth * .3);
		if (own) c = own(x, yy, 0);
		if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix$2(c, INK$2, .35);
		s.set(x, yy, c, own ? 3 : 2);
	}
	if (struck) for (const [sx, sy] of [
		[WIN.left + 1, WIN.top + 1],
		[WIN.right - 1, WIN.top + 1],
		[WIN.left + 1, WIN.bottom - 1],
		[WIN.right - 1, WIN.bottom - 1]
	]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
		const d = dx * dx + dy * dy, x = sx + dx, yy = sy + dy;
		if (d > 10 || shape.depth[yy * W$1 + x] <= 2) continue;
		s.set(x, yy, d > 6 ? BRUSHED.quiet : mix$2([
			255,
			244,
			196
		], [
			196,
			128,
			26
		], (dx + dy + 4) / 8));
	}
	const onPlate = new Uint8Array(W$1 * H$1);
	if (!struck) for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W$1 - 1 - side; x++) {
		const pw = W$1 - side * 2, ph = plateBottom - plateTop + 1;
		if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
		const edge$1 = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
		const base = aura ? mix$2(mix$2(ah, INK$2, .6), INK$2, .45) : PLATE$2;
		onPlate[yy * W$1 + x] = 1;
		s.set(x, yy, edge$1 ? INK$2 : yy === plateTop + 1 ? mix$2(base, WHITE$1, .16) : yy >= plateBottom - 2 ? mix$2(base, INK$2, .45) : base);
	}
	const quiet = struck ? BRUSHED.quiet : aura ? mix$2(ah, WHITE$1, .6) : [
		184,
		176,
		206
	];
	const titleInk = (x, yy, tm) => mix$2(mix$2(ah, WHITE$1, .5), WHITE$1, .5 + .5 * Math.sin(x * .12 - tm / wave(1e3 / 2) + yy * .1));
	const titlePixels = [];
	s.text(titleFit.text, left, titleTop - 2, (x, yy) => {
		if (struck) return GOLD_INK;
		if (!aura) return WHITE$1;
		titlePixels.push(x, yy);
		return titleInk(x, yy, 0);
	}, struck ? GOLD_CUT : INK$2, titleFit.spacing);
	if (pill$1) {
		const w = pillW, x0 = left;
		const fill = struck ? BRUSHED.pill : framed ? BRIGHT_GOLD : tone;
		for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
			const edge$1 = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
			s.set(x, yy, edge$1 ? INK$2 : yy >= pillTop + 12 ? mix$2(fill, INK$2, .45) : yy === pillTop + 1 ? mix$2(fill, WHITE$1, .4) : fill);
		}
		s.text(pill$1, x0 + PILL_PAD, pillTop - 1, () => struck ? [
			255,
			222,
			130
		] : framed ? PILL_INK : WHITE$1, framed ? GOLD_LIGHT : mix$2(fill, INK$2, .6));
	}
	if (sub) s.text(sub.text, pill$1 ? left + pillW + PILL_GAP : left, pillTop - 1, () => quiet, void 0, sub.spacing);
	if (footFit) s.text(footFit.text, left, footTop - 2, () => quiet, void 0, footFit.spacing);
	if (plateRow) {
		const w = Math.min(textW, textWidth(plateRow.text) + plateRow.spacing * ([...plateRow.text].length - 1) + 10), x0 = left, fill = rgb$2(GRADES[plateGrade].color);
		const ink = plateGrade === 4 ? PILL_INK : WHITE$1;
		for (let yy = plateRowTop; yy < plateRowTop + 14; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - plateRowTop, w, 14, 3)) continue;
			const edge$1 = !inBox(x - x0 - 1, yy - plateRowTop, w, 14, 3) || !inBox(x - x0 + 1, yy - plateRowTop, w, 14, 3) || yy === plateRowTop || yy === plateRowTop + 13;
			s.set(x, yy, edge$1 ? INK$2 : yy >= plateRowTop + 11 ? mix$2(fill, INK$2, .45) : yy === plateRowTop + 1 ? mix$2(fill, WHITE$1, .4) : fill);
		}
		s.text(plateRow.text, x0 + 5, plateRowTop - 2, () => ink, plateGrade === 4 ? GOLD_LIGHT : mix$2(fill, INK$2, .6), plateRow.spacing);
	}
	if (sealed) {
		const cx = W$1 - 1 - side - 10, cy = footTop + 3;
		for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
			const d = dx * dx + dy * dy;
			if (d > 52) continue;
			const rim$1 = d > 38, notch = rim$1 && Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) % 2 === 0;
			s.set(cx + dx, cy + dy, notch && d > 46 ? struck ? BRUSHED.pill : PLATE$2 : rim$1 ? INK$2 : d < 14 && dx + dy < 0 ? [
				246,
				138,
				112
			] : [
				232,
				100,
				78
			]);
		}
		s.text("1", cx - 2, cy - 7, () => IVORY$2, INK$2);
	}
	const strange = topCopy?.tally !== void 0 ? topCopy : copies.find((o) => o.tally !== void 0);
	const badge = unusualCopy?.fx ? FX_BADGES[unusualCopy.fx] : void 0;
	const tagged = !!(input.corner || strange || badge);
	const tag = new Surface(tagged ? W$1 : 0, tagged ? H$1 : 0);
	let tagX = WIN.left + 4;
	if (strange) {
		const digits = String(Math.min(99999, strange.tally ?? 0)).padStart(4, "0"), w = digits.length * 7 - 2 + 6, y0 = WIN.top + 4;
		plateAt(tag, tagX, y0, w, 15);
		[...digits].forEach((d, i) => segments(tag, tagX + 3 + i * 7, y0 + 3, Number(d)));
		tagX += w + 2;
	}
	if (badge) {
		const y0 = WIN.top + 4;
		plateAt(tag, tagX, y0, 15, 15);
		badge.forEach((row, by) => [...row].forEach((ch, bx) => {
			const ink = BADGE_INKS[ch];
			if (ink) for (let k = 0; k < 4; k++) tag.set(tagX + 3 + bx * 2 + (k & 1), y0 + 3 + by * 2 + (k >> 1), rgb$2(ink));
		}));
	}
	if (input.corner) {
		const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
		for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) tag.set(x, yy, yy >= y0 + 12 ? [
			0,
			0,
			0
		] : INK$2);
		tag.text(input.corner, x0 + 3, y0 - 2, () => WHITE$1);
	}
	const tagIdx = [];
	if (tagged) {
		for (let i = 0; i < W$1 * H$1; i++) if (tag.px[i * 4 + 3]) tagIdx.push(i);
	}
	const soul = aura;
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit$2.mid);
	const stand = soul ? Math.max(5 - fit$2.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - (fit$2.topAll + fit$2.footAll + 1) * zoom / 2) - 10) : Math.round((WIN.top + WIN.bottom + 1) / 2 - (fit$2.rest + fit$2.foot + 1) * zoom / 2) + 4;
	const roomTop = soul ? 3 : WIN.top + 2, roomFoot = WIN.bottom - 2;
	const highest = roomTop - fit$2.topAll * zoom, lowest = roomFoot + 1 - (fit$2.footAll + 1) * zoom;
	const oy0 = !grid ? stand : highest > lowest ? highest : Math.min(lowest, Math.max(highest, stand));
	const floor = Uint8Array.from(s.region, (r) => r === 2 || r === 3 ? 1 : 0);
	const ground = input.copies?.some((o) => itemById(o.item)?.slot === "frame") ? (() => {
		let x0 = W$1, y0 = H$1, x1 = -1, y1 = -1;
		for (let i = 0; i < W$1 * H$1; i++) if (floor[i]) {
			const x = i % W$1, yy = (i - x) / W$1;
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
			y0 = Math.min(y0, yy);
			y1 = Math.max(y1, yy);
		}
		if (x1 < 0) return null;
		const gx0 = Math.floor((x0 - ox) / zoom), gy0 = Math.floor((y0 - oy0) / zoom), gw = Math.floor((x1 - ox) / zoom) - gx0 + 1, gh = Math.floor((y1 - oy0) / zoom) - gy0 + 1;
		const colors = backdropOf(input.seed, {
			parts: input.parts,
			palette: input.palette,
			equip: (input.copies ?? []).map(encode)
		}, gx0, gy0, gw, gh);
		if (!colors) return null;
		const cells = new Float32Array(gw * gh * 3), pix = [], cellOf = [], diag = [];
		colors.forEach((row, j) => row.forEach((hex$2, i) => {
			const c = hex$2 ? rgb$2(hex$2) : INK$2;
			for (let k = 0; k < 3; k++) cells[(j * gw + i) * 3 + k] = c[k] / 255;
		}));
		for (let i = 0; i < W$1 * H$1; i++) {
			if (!floor[i]) continue;
			const x = i % W$1, yy = (i - x) / W$1, cx = Math.floor((x - ox) / zoom), cy = Math.floor((yy - oy0) / zoom), cell = (cy - gy0) * gw + cx - gx0;
			pix.push(i);
			cellOf.push(cell);
			diag.push(x - ox - cx * zoom + yy - oy0 - cy * zoom);
			s.set(x, yy, [
				cells[cell * 3] * 255,
				cells[cell * 3 + 1] * 255,
				cells[cell * 3 + 2] * 255
			]);
		}
		return {
			pix: Int32Array.from(pix),
			cell: Int32Array.from(cellOf),
			diag: Int32Array.from(diag),
			cells,
			gx0,
			gy0,
			gw,
			count: gw * gh
		};
	})() : null;
	const look = struck ? 0 : lookFor(ed, topCopy?.finish, looks.look);
	const plays = (i) => framed ? s.region[i] === 2 || trim[i] === 1 : s.region[i] > 0 && s.region[i] < 3;
	const ownIdx = [];
	if (own?.moves) {
		for (let i = 0; i < W$1 * H$1; i++) if (s.region[i] === 3) {
			const x = i % W$1, yy = (i - x) / W$1;
			if (yy - WIN.top !== 2 && x - WIN.left !== 2) ownIdx.push(i);
		}
	}
	const edIdx = [];
	for (let i = 0; i < W$1 * H$1; i++) if (plays(i)) edIdx.push(i);
	const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
	const raised = new Float32Array(n);
	edIdx.forEach((i, k) => {
		const x = i % W$1, yy = (i - x) / W$1;
		ex[k] = x / 5;
		ey[k] = yy / 5;
		er[k] = s.region[i] || 1;
		eh[k] = shape.glint[(yy >> 1) * W$1 + (x >> 1)];
		raised[k] = trim[i];
		for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
	});
	const paint$1 = look === 1 ? {
		colors: paintColors(auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, g)].color], auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : GRADES[Math.max(0, g)].color),
		contrast: looks.contrast ?? PAINT_CONTRAST,
		...paintForm(auraCopy?.item ?? "", auraCopy?.print ?? 0)
	} : void 0;
	const block = (k) => Math.floor(k * 2.5) * 2 / 5, perPixel = look === 0 || look === 2;
	const field = cardField(look, ed, v, [wcx / 5, wcy / 5], .2, {
		x: perPixel ? ex : ex.map(block),
		y: perPixel ? ey : ey.map(block),
		region: er,
		h: eh,
		rgb: ergb,
		raised
	}, paint$1);
	const edOut = new Float32Array(n * 3), edAt = Int32Array.from(edIdx);
	const pop = soul || !grid && oy0 + fit$2.top * zoom < WIN.top + 3;
	const clip = (cx, cy) => pop ? inside(cx, cy) && cx > 2 && cx < W$1 - 3 && cy > 2 && cy < WIN.bottom - 1 : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left && cx < WIN.right;
	const edgeC = aura ? mix$2(ah, WHITE$1, .55) : struck ? [
		255,
		236,
		170
	] : WHITE$1;
	const room = new Uint8Array(W$1 * H$1);
	for (let yy = 0; yy < H$1; yy++) for (let x = 0; x < W$1; x++) if (clip(x, yy)) room[yy * W$1 + x] = pop && (yy <= WIN.top + 1 || x <= WIN.left + 1 || x >= WIN.right - 1) ? 2 : 1;
	const mask = new Uint8Array((anim.width * zoom + 4) * (FRAME_HEIGHT * zoom + 4));
	const lit = new Float32Array((zoom * 2 - 1) * 3), litDone = new Uint8Array(zoom * 2 - 1);
	/**
	* His frame drawn into `body` with its top-left at `oy`: the sticker edge
	* round him, his pixels, each worn copy's finish on its own pixels (on the
	* card's raw clock `shineTime`, as the guy keeps it), and the soft shadows
	* on the window's floor under him and his buddy.
	*/
	const floors = new Map();
	const floorsOf = (frame, oy) => {
		let got = floors.get(frame);
		if (got) return got;
		const { colors, slots } = frame;
		got = [];
		for (const buddy of [false, true]) {
			let lo = -1, l = Infinity, r = -Infinity;
			const own$1 = (gx, gy) => !!colors[gy][gx] && slots[gy][gx] !== 5 && slots[gy][gx] !== 3 && slots[gy][gx] === 4 === buddy;
			colors.forEach((row, gy) => row.forEach((_, gx) => {
				if (own$1(gx, gy)) lo = gy;
			}));
			if (lo < 0) continue;
			for (let gy = Math.max(0, lo - 1); gy <= lo; gy++) colors[gy].forEach((_, gx) => {
				if (own$1(gx, gy)) {
					l = Math.min(l, cellX(gx, slots[gy][gx]));
					r = Math.max(r, cellX(gx, slots[gy][gx]) + zoom);
				}
			});
			got.push(ox + (l + r) / 2, Math.min(WIN.bottom - 7, oy + (lo + 1) * zoom - 3), Math.max(6, (r - l) * .38 + 2));
		}
		floors.set(frame, got);
		return got;
	};
	/**
	* The sticker edge round him for a frame of his move standing at `oy`, so his dark outline never sinks
	* into the window: each empty pixel two across or down from him, or one diagonally. Card pixel indices,
	* doubled, plus one where it turns white against the window's rim; kept by frame.
	*/
	const edges = new Map();
	const edgesOf = (frame, oy) => {
		let byY = edges.get(frame);
		if (!byY) edges.set(frame, byY = new Map());
		let got = byY.get(oy);
		if (got) return got;
		if (grid) {
			byY.set(oy, got = new Int32Array(0));
			return got;
		}
		const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
		const bx = ox - 2, by = oy - 2, bw = fw * zoom + 4, bh = fh * zoom + 4, out = [];
		mask.fill(0, 0, bw * bh);
		for (let gy = 0; gy < fh; gy++) {
			const row = colors[gy], srow = slots[gy];
			for (let gx = 0; gx < fw; gx++) if (row[gx] && srow[gx] !== 5 && srow[gx] !== 3) for (let dy = 0; dy < zoom; dy++) mask.fill(1, (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]), (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]) + zoom);
		}
		for (let j = 0; j < bh; j++) {
			const yy = by + j;
			if (yy < 0 || yy >= H$1) continue;
			for (let k = 0; k < bw; k++) {
				const m = j * bw + k, x = bx + k;
				if (mask[m] || x < 0 || x >= W$1) continue;
				const r = room[yy * W$1 + x];
				if (r && (mask[m + 2] || mask[m - 2] || mask[m + bw * 2] || mask[m - bw * 2] || mask[m + bw + 1] || mask[m + bw - 1] || mask[m - bw + 1] || mask[m - bw - 1])) out.push((yy * W$1 + x) * 2 + (r === 2 ? 1 : 0));
			}
		}
		byY.set(oy, got = Int32Array.from(out));
		return got;
	};
	const frameCopy = owned.frame, DIAGS = zoom * 2 - 1;
	const groundShine = ground && frameCopy && shines$1(frameCopy) ? SHADER_FINISHES.indexOf(frameCopy.finish) : -1;
	const groundDone = new Uint8Array(ground && groundShine >= 0 ? ground.count * DIAGS : 0), groundLit = new Float32Array(groundDone.length * 3);
	const drawGuy = (frame, oy, body$1, shineTime) => {
		const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
		const put$1 = (i, r, g$1, b$1) => {
			body$1[i * 4] = r;
			body$1[i * 4 + 1] = g$1;
			body$1[i * 4 + 2] = b$1;
		};
		if (ground && frameCopy && groundShine >= 0) {
			groundDone.fill(0);
			for (let k = 0; k < ground.pix.length; k++) {
				const cell = ground.cell[k], j = cell * DIAGS + ground.diag[k];
				if (!groundDone[j]) {
					groundDone[j] = 1;
					const gx = ground.gx0 + cell % ground.gw, gy = ground.gy0 + Math.floor(cell / ground.gw), c = ground.cells;
					const out = finishColor([
						c[cell * 3],
						c[cell * 3 + 1],
						c[cell * 3 + 2]
					], groundShine, frameCopy.scuff, hash$1(gx, gy, frameCopy.print), gx + gy + ground.diag[k] / zoom, gy, frameCopy.print, shineTime, 1);
					groundLit[j * 3] = out[0] * 255;
					groundLit[j * 3 + 1] = out[1] * 255;
					groundLit[j * 3 + 2] = out[2] * 255;
				}
				put$1(ground.pix[k], groundLit[j * 3], groundLit[j * 3 + 1], groundLit[j * 3 + 2]);
			}
		}
		const fl = aura ? [] : floorsOf(frame, oy);
		for (let f = 0; f < fl.length; f += 3) {
			const sx = fl[f], sy = fl[f + 1], rx = fl[f + 2];
			const gy = grid ? sy + zoom : sy, reach = grid ? zoom : 0;
			for (let yy = Math.ceil(gy - 4 - reach); yy <= gy + 4 + reach; yy++) for (let x = Math.ceil(sx - rx - reach); x <= sx + rx + reach; x++) {
				if (x < 0 || yy < 0 || x >= W$1 || yy >= H$1 || !floor[yy * W$1 + x]) continue;
				const px = grid ? ox + Math.floor((x - ox) / zoom) * zoom + zoom / 2 : x, py = grid ? oy + Math.floor((yy - oy) / zoom) * zoom + zoom / 2 : yy;
				const fx = (px - sx) / rx, fy = (py - gy) / 4, d = fx * fx + fy * fy;
				if (d >= 1) continue;
				const i = (yy * W$1 + x) * 4, k = 1 - .16 * (1 - d);
				body$1[i] *= k;
				body$1[i + 1] *= k;
				body$1[i + 2] *= k;
			}
		}
		for (const e of edgesOf(frame, oy)) {
			const c = e & 1 ? WHITE$1 : edgeC;
			put$1(e >> 1, c[0], c[1], c[2]);
		}
		for (let gy = 0; gy < fh; gy++) for (let gx = 0; gx < fw; gx++) {
			const hex$2 = colors[gy][gx];
			if (!hex$2 || slots[gy][gx] === 3) continue;
			const slot = slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0, x0 = ox + cellX(gx, slot);
			const f = copy ? SHADER_FINISHES.indexOf(copy.finish) : -1, c = rgb$2(hex$2);
			if (copy && f >= 0) litDone.fill(0);
			for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
				const cx = x0 + dx, cy = oy + gy * zoom + dy;
				if (cx < 0 || cy < 0 || cx >= W$1 || cy >= H$1 || !room[cy * W$1 + cx]) continue;
				if (!copy || f < 0) {
					put$1(cy * W$1 + cx, c[0], c[1], c[2]);
					continue;
				}
				const k = dx + dy;
				if (!litDone[k]) {
					litDone[k] = 1;
					const out = finishColor([
						c[0] / 255,
						c[1] / 255,
						c[2] / 255
					], f, copy.scuff, hash$1(gx, gy, copy.print), (cx + cy) / zoom, gy, copy.print, shineTime, 1);
					lit[k * 3] = out[0] * 255;
					lit[k * 3 + 1] = out[1] * 255;
					lit[k * 3 + 2] = out[2] * 255;
				}
				put$1(cy * W$1 + cx, lit[k * 3], lit[k * 3 + 1], lit[k * 3 + 2]);
			}
		}
		for (const [gx, gy, hex$2] of frame.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
			const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy, c = rgb$2(hex$2);
			if (cx >= 0 && cy >= 0 && cx < W$1 && cy < H$1 && room[cy * W$1 + cx]) put$1(cy * W$1 + cx, c[0], c[1], c[2]);
		}
	};
	const body = s.px.slice();
	let whole = null;
	return {
		square,
		moves: ed > 0 || !!own?.moves || Object.values(owned).some((o) => o && shines$1(o)),
		pose(t) {
			const tm = t * 1e3 + shift$1;
			return {
				lift: Math.round(1 + Math.sin(TAU_MS(tm, 3e3))),
				bob: soul && !grid ? Math.round(Math.sin(tm / wave(1e3 / 2.6)) * 2) : 0
			};
		},
		draw(frame, t, out) {
			const tm = t * 1e3 + shift$1, time = loopSeconds(tm), { lift, bob } = this.pose(t);
			body.set(s.px);
			field(time, edOut);
			for (let k = 0; k < n; k++) {
				const i = edAt[k] * 4;
				body[i] = edOut[k * 3] * 255;
				body[i + 1] = edOut[k * 3 + 1] * 255;
				body[i + 2] = edOut[k * 3 + 2] * 255;
			}
			for (const i of ownIdx) {
				const x = i % W$1, c = own(x, (i - x) / W$1, tm);
				body[i * 4] = c[0];
				body[i * 4 + 1] = c[1];
				body[i * 4 + 2] = c[2];
			}
			drawGuy(frame, oy0 + bob, body, loopSeconds(t * 1e3));
			for (const i of tagIdx) body.set(tag.px.subarray(i * 4, i * 4 + 3), i * 4);
			for (let k = 0; k < titlePixels.length; k += 2) {
				const c = titleInk(titlePixels[k], titlePixels[k + 1], tm), i = (titlePixels[k + 1] * W$1 + titlePixels[k]) * 4;
				body[i] = c[0];
				body[i + 1] = c[1];
				body[i + 2] = c[2];
			}
			out.set(shape.shadow);
			for (let yy = 0; yy < H$1; yy++) {
				const [a, b$1] = shape.runs[yy];
				if (a >= 0) out.set(body.subarray((yy * W$1 + a) * 4, (yy * W$1 + b$1 + 1) * 4), ((yy + 2 - lift) * W$1 + a) * 4);
			}
			return out;
		},
		drawSquare(frame, t, out) {
			this.draw(frame, t, whole ??= new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
			for (let yy = 0; yy < square.size; yy++) out.set(body.subarray(((square.y + yy) * W$1 + square.x) * 4, ((square.y + yy) * W$1 + square.x + square.size) * 4), yy * square.size * 4);
			return out;
		}
	};
}
/** The angle of a wave about `period` ms long at `tm`, coming round in LOOP_MS. */
const TAU_MS = (tm, period) => cycle(tm, period) * Math.PI * 2;
/** The grade a card shows: the one given, or the rarest copy's. */
const cardGrade = (input) => input.grade ?? (input.copies?.length ? Math.max(...input.copies.map((o) => GRADES.findIndex((x) => x.id === gradeOf(o).id))) : -1);
/**
* The card's edition: its rarest copy's finish's (the last such copy's), or,
* for a card given a grade with nothing that sets it, the grade's own.
*/
function cardEdition(input, g) {
	const top = (input.copies ?? []).filter((o) => GRADES.findIndex((x) => x.id === gradeOf(o).id) === g).pop();
	if (top && GRAPHIC_FINISHES.includes(top.finish)) return 0;
	return top ? editionOf(top.finish) : g < 0 ? 0 : [
		0,
		1,
		2,
		3,
		5,
		6
	][g];
}
const TAU = Math.PI * 2;
/** Steps a value into `n` flat bands, so a glow reads as pixel art, not a blur. */
const banded = (v, n) => Math.round(Math.max(0, Math.min(1, v)) * n) / n;
/**
* The window a famous print or a graphic finish brings to its card, in place
* of its grade's: Deep Blue a deep sea with caustic light moving over it,
* Black Hole a void with an accretion ring, Red Giant a swollen star behind
* the guy, Blue Moon a night with a pale moon, and Op, Impossible and Grid their
* own patterns at the card's size. Worked out on blocks of two card pixels,
* so it stays crisp. Null for any other copy.
*/
function windowArt(o, win, cx, cy) {
	const look = special(o) ?? (GRAPHIC_FINISHES.includes(o.finish) ? o.finish : void 0);
	const depth = (y) => (y - win.top) / (win.bottom - win.top), p = o.print;
	const star = (x, y) => hash$1(x >> 1, y >> 1, p) > .985;
	let art;
	switch (look) {
		case "Deep Blue": {
			art = (x, y, tm) => {
				const bx = (x >> 1) * 2, by = (y >> 1) * 2, d = depth(by), a = TAU_MS(tm, 4e3);
				const q = Math.sin(bx * .19 + Math.sin(by * .15 + a) * 1.7) + Math.sin(by * .21 - bx * .09 - a * 2 + p);
				const sea = mix$2([
					46,
					92,
					214
				], [
					6,
					16,
					58
				], banded(d, 5));
				return Math.abs(q) < .11 ? mix$2(sea, [
					150,
					196,
					255
				], .75 * (1 - d) + .1) : sea;
			};
			art.moves = true;
			return art;
		}
		case "Black Hole": {
			art = (x, y, tm) => {
				const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, dx = bx - cx, dy = by - cy;
				const disc = Math.hypot(dx / 58, dy / 15), ring = Math.hypot(dx, dy * 1.05) / 34;
				if (Math.abs(disc - 1) < .09) {
					const knot = Math.abs(((Math.atan2(dy * 3.9, dx) / TAU - cycle(tm, 3e3)) % 1 + 1) % 1 - .5) < .07;
					return knot ? [
						255,
						248,
						224
					] : mix$2([
						255,
						226,
						160
					], [
						226,
						92,
						32
					], banded((dy / 15 + 1) / 2, 3));
				}
				if (Math.abs(ring - 1) < .07 && dy < 0) return mix$2([
					255,
					210,
					140
				], [
					200,
					80,
					30
				], banded(-dy / 34, 2));
				if (disc < 1.35 && disc > .8) return mix$2([
					5,
					4,
					9
				], [
					96,
					34,
					14
				], banded(1 - Math.abs(disc - 1) / .35, 3) * .6);
				return star(x, y) ? [
					210,
					200,
					230
				] : [
					5,
					4,
					9
				];
			};
			art.moves = true;
			return art;
		}
		case "Red Giant": return (x, y) => {
			const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, r = Math.hypot(bx - cx, by - cy + 6) / 58;
			if (r < 1) return mix$2([
				255,
				196,
				92
			], [
				196,
				32,
				40
			], banded(r, 4));
			return mix$2([
				92,
				14,
				26
			], [
				30,
				4,
				12
			], banded(depth(by), 4));
		};
		case "Blue Moon": return (x, y) => {
			const bx = (x >> 1) * 2 + 1, by = (y >> 1) * 2 + 1, mx = win.right - 34, my = win.top + 32, r = Math.hypot(bx - mx, by - my) / 26;
			if (r < 1) return hash$1(bx >> 3, by >> 3, p + 5) > .72 && r < .85 ? [
				168,
				188,
				236
			] : mix$2([
				236,
				242,
				255
			], [
				176,
				198,
				246
			], banded(r, 3));
			return star(x, y) ? [
				220,
				230,
				255
			] : mix$2([
				30,
				48,
				108
			], [
				10,
				18,
				48
			], banded(depth(by), 4));
		};
		case "op": {
			art = (x, y, tm) => {
				const r = Math.hypot((x >> 1) * 2 + 1 - cx, (y >> 1) * 2 + 1 - cy) / 7 - cycle(tm, 2400) * 2;
				return Math.floor(r) % 2 ? [
					118,
					108,
					130
				] : [
					241,
					235,
					221
				];
			};
			art.moves = true;
			return art;
		}
		case "impossible": {
			art = (x, y, tm) => {
				const left = x < cx, s = y + (left ? x - cx : cx - x) * .9 + (left ? 0 : 5) - cycle(tm, 3e3) * 30;
				return [
					[
						96,
						86,
						110
					],
					[
						241,
						235,
						221
					],
					[
						238,
						106,
						80
					]
				][(Math.floor(s / 10) % 3 + 3) % 3];
			};
			art.moves = true;
			return art;
		}
		case "grid": {
			const v1 = Math.round(win.left + (win.right - win.left) * (.24 + p % 3 * .04)), v2 = Math.round(win.left + (win.right - win.left) * (.74 + (p >> 2) % 3 * .04));
			const h1 = Math.round(win.top + (win.bottom - win.top) * (.26 + (p >> 4) % 3 * .05)), h2 = Math.round(win.top + (win.bottom - win.top) * .8);
			return (x, y) => {
				if (Math.abs(x - v1) < 2 || Math.abs(x - v2) < 2 || Math.abs(y - h1) < 2 || Math.abs(y - h2) < 2 && x > v2) return [
					28,
					24,
					36
				];
				const pane = (x > v1 ? 1 : 0) + (x > v2 ? 1 : 0) + (y > h1 ? 3 : 0) + (y > h2 && x > v2 ? 3 : 0), at = (pane - p % 6 + 9) % 9;
				return at === 0 ? [
					217,
					64,
					46
				] : at === 4 ? [
					44,
					85,
					200
				] : at === 8 ? [
					242,
					194,
					48
				] : [
					241,
					235,
					221
				];
			};
		}
	}
	return null;
}
/** A dark plate for a tag over the window, `w` by `h` with its corners cut. */
function plateAt(s, x0, y0, w, h) {
	for (let yy = y0; yy < y0 + h; yy++) for (let x = x0; x < x0 + w; x++) {
		if ((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + h - 1)) continue;
		s.set(x, yy, yy >= y0 + h - 2 ? [
			0,
			0,
			0
		] : INK$2);
	}
}
/** Which of a seven-segment digit's segments are lit, a to g. */
const SEGMENTS = [
	63,
	6,
	91,
	79,
	102,
	109,
	125,
	7,
	127,
	111
];
/** A counter's digit, five card pixels wide and nine tall, its lit segments amber and the rest a dim ghost, as a real one's. */
function segments(s, x0, y0, digit) {
	const on = SEGMENTS[digit] ?? 0, lit = [
		255,
		178,
		62
	], dim = [
		74,
		48,
		26
	];
	const seg = [
		[
			1,
			0,
			3,
			1
		],
		[
			4,
			1,
			1,
			3
		],
		[
			4,
			5,
			1,
			3
		],
		[
			1,
			8,
			3,
			1
		],
		[
			0,
			5,
			1,
			3
		],
		[
			0,
			1,
			1,
			3
		],
		[
			1,
			4,
			3,
			1
		]
	];
	seg.forEach(([x, y, w, h], k) => {
		for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) s.set(x0 + x + dx, y0 + y + dy, on & 1 << k ? lit : dim);
	});
}
/**
* The card as frames, `ms` apart, covering one loop of his move (at least two
* seconds, so a shine gets across). Every frame is the whole card in RGBA;
* the corners are transparent.
*/
function cardFrames(input, ms = 80) {
	const card$1 = cardPlayer(input, ms), frames = [];
	for (let i = 0; i < card$1.count; i++) frames.push(card$1.frame(i));
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		frames,
		delays: card$1.delays
	};
}
/**
* A card to play on screen: each frame is drawn the first time it is asked
* for and kept, so a page can show a card at once and spread the work out.
* It loops perfectly: his move played the whole number of times that fits
* whole turns of LOOP_MS, with every sheen on the card on the same clock. A
* card with nothing shining draws each pose of his once and shows it again.
*/
function cardPlayer(input, ms = 80, options = {}) {
	return playCard(input, ms, options, false);
}
/**
* The card's window alone, as a square, played as `cardPlayer` plays the whole card: the art behind
* him (its edition, look, frame item or aura ground) and him moving. Its side is the window's
* height or width, whichever is less; give it `edge: 'none'` (or another grid edge) so his whole move
* stays in the square.
*/
function cardArtPlayer(input, ms = 80, options = {}) {
	return playCard(input, ms, options, true);
}
/** `cardPlayer`, or `cardArtPlayer` when `square`. */
function playCard(input, ms, { keep = true,...style }, square) {
	const options = {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	};
	const anim = animate(input.seed, input.move ?? "idle", {
		...options,
		loop: { fit: true }
	}), turns = anim.turns ?? 1;
	const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), art = cardArt(input, anim, owned, g, cardEdition(input, g), style);
	const total = anim.duration, count$1 = Math.max(1, Math.round(total / ms)), cache = [];
	const delays = Array.from({ length: count$1 }, (_, k) => Math.round((k + 1) * total / count$1) - Math.round(k * total / count$1));
	const frameOf = new Map(anim.frames.map((f, k) => [f, k]));
	const poses = new Map();
	const width = square ? art.square.size : CARD_WIDTH, height = square ? art.square.size : CARD_HEIGHT;
	const draw = (frame, t, out) => square ? art.drawSquare(frame, t, out) : art.draw(frame, t, out);
	const one = keep ? null : new Uint8ClampedArray(width * height * 4);
	let shown = -1;
	return {
		width,
		height,
		count: count$1,
		delay: total / count$1,
		delays,
		frame(i) {
			const k = (i % count$1 + count$1) % count$1;
			if (cache[k]) return cache[k];
			const frame = frameAt(anim, k * total / count$1), t = k * turns * LOOP_MS / count$1 % LOOP_MS / 1e3;
			const { lift } = art.pose(t), pose = art.moves ? -1 : frameOf.get(frame) * 4 + lift;
			if (!keep) {
				if (pose < 0 || pose !== shown) draw(frame, t, one);
				shown = pose;
				return one;
			}
			let px = pose >= 0 ? poses.get(pose) : void 0;
			if (!px) {
				px = draw(frame, t, new Uint8ClampedArray(width * height * 4));
				if (pose >= 0) poses.set(pose, px);
			}
			return cache[k] = px;
		}
	};
}
/** The card standing still, for a picture. */
function cardStill(input, t = .6, looks = {}) {
	const anim = animateLoop(input.seed, input.move ?? "idle", {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	});
	const g = cardGrade(input);
	return cardArt(input, anim, ownedBySlot(input.copies ?? []), g, cardEdition(input, g), looks).draw(frameAt(anim, 0), t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
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
/** The card's window art alone as frames, as `cardFrames` gives the whole card. */
function cardArtFrames(input, ms = 80, options = {}) {
	const art = cardArtPlayer(input, ms, options), frames = [];
	for (let i = 0; i < art.count; i++) frames.push(art.frame(i));
	return {
		width: art.width,
		height: art.height,
		frames,
		delays: art.delays
	};
}
/** The card's window art alone as a looping GIF, each pixel `scale` by `scale`. */
function toCardArtGif(input, scale$1 = 3, options = {}) {
	return encodeGif(cardArtFrames(input, 80, options), scale$1);
}
/** The card's window art alone as a PNG, its first frame. */
function toCardArtPng(input, scale$1 = 4, options = {}) {
	const art = cardArtPlayer(input, 80, options);
	return encodePng(art.frame(0), art.width, art.height, scale$1);
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
	const W$1 = anim.width, frames = anim.frames.map((f) => {
		const px = new Uint8ClampedArray(W$1 * FRAME_HEIGHT * 4);
		f.colors.forEach((row, y) => row.forEach((c, x) => {
			const v = c ? rgb$2(c) : bg;
			if (v) px.set([...v, 255], (y * W$1 + x) * 4);
		}));
		return px;
	});
	return encodeGif({
		width: W$1,
		height: FRAME_HEIGHT,
		frames,
		delays: anim.frames.map((f) => f.ms)
	}, scale$1);
}

//#endregion
//#region src/card-face.ts
/**
* The trading card a guy or an item is shown on: a 26×42 face printed in its
* grade's colour, a dark plate across the top for the name, the guy standing
* in a window, and a plain dark plate at the foot. Its words (name, print,
* odds) are the page's to write over it. A buddy he wears stands at his full
* size too, in front of the window's bottom-right corner and half over the
* plate under it (`FaceSpec.buddy`), hopping now and then as it does beside him.
*
* Like Balatro's cards, each has an edition, from the finish that sets its
* grade: Foil (Sunset), Holographic (Tempered, Nebula), Polychrome (Prism),
* Negative, Gold for a Grail, and Spectral for an aura card, which is
* full-art: its aura's own colours swirl edge to edge. Each worn copy's pixels
* shine in their own finish, and everything comes round in `LOOP_MS`.
*
* The face is built once (`cardFace`), then drawn at a time either by the GPU
* (`CARD_FRAGMENT`, `createCardShader`) or in plain code (`cardFaceAt`), with
* the same result.
*/
const FACE_WIDTH = 26;
const FACE_HEIGHT = 42;
/**
* Where a buddy he wears stands on the face, the guy and the face the same size
* either way: `peek`, in front of the window's bottom-right corner, its feet on
* the plate under it, as if peeking out; `floor`, wholly on the plate under the
* window, to the right, where the page's words would otherwise run.
*/
const FACE_BUDDY_SPOTS = ["peek", "floor"];
/** A buddy's right edge (its outline), and its lowest row for each spot: above the page's words for `peek`, the plate's foot for `floor`. */
const BUDDY_RIGHT = FACE_WIDTH - 3, BUDDY_FOOT = {
	peek: 33,
	floor: FACE_HEIGHT - 3
};
const rgb$1 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const gradeIndex = (o) => GRADES.findIndex((g) => g.id === gradeOf(o).id);
const INK$1 = [
	24,
	20,
	31
], WHITE = [
	255,
	255,
	255
], IVORY$1 = [
	246,
	240,
	227
], PLATE$1 = [
	38,
	34,
	52
];
/** Kinds of pixel, as the shader reads them. */
const CARD = 1, WINDOW = 2, GUY = 3, ITEM = 4, FIXED = 5;
/** Which worn slot a grid token belongs to, as ./paint reads it. */
const slotOfToken = (t) => t >= LAYER.aura ? "aura" : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
/** A grid's still colours, each copy's effect as it stands at the start, laid over its finish (./effects `fxColor`). */
function still(grid, config, palette$1) {
	const colors = paint(grid, config, palette$1, false, false);
	return colors.map((row, y) => row.map((c, x) => {
		const slot = slotOfToken(grid[y][x]), o = slot ? config.owned?.[slot] : void 0;
		return c && o?.fx ? fxColor(c, o.fx, x, y, 0, o.print, o.finish) : c;
	}));
}
/** The card's face, ready to draw at any time. */
function cardFace(spec) {
	const W$1 = FACE_WIDTH, H$1 = FACE_HEIGHT;
	const copies = spec.copies ?? [];
	const r = resolve(spec.name, spec.parts);
	if (spec.palette !== void 0) r.palette = spec.palette;
	const config = dress(r, { equip: copies.map(encode) });
	const grid = compose(config);
	const palette$1 = withItems(paletteOf(config), config), colors = still(grid, config, palette$1);
	const owned = config.owned ?? {};
	const g = spec.grade ?? (copies.length ? Math.max(...copies.map(gradeIndex)) : -1);
	const last = copies[copies.length - 1];
	const holo = last ? Math.max(0, SHADER_FINISHES.indexOf(last.finish)) : 0;
	const top = copies.filter((o) => gradeIndex(o) === g).pop();
	const edition = top ? GRAPHIC_FINISHES.includes(top.finish) ? 3 : editionOf(top.finish) : g < 0 ? 0 : [
		0,
		1,
		2,
		3,
		5,
		6
	][Math.min(g, 5)];
	const base = new Uint8Array(W$1 * H$1 * 4), kind = new Uint8Array(W$1 * H$1 * 4), noise$1 = new Uint8Array(W$1 * H$1 * 4);
	const put$1 = (x, y, c, k, fi = -1, sc = 0, pr = 0) => {
		const i = (y * W$1 + x) * 4, print = Math.floor(pr / 4);
		base.set([
			c[0],
			c[1],
			c[2],
			255
		], i);
		kind.set([
			k * 32,
			(fi + 1) * 32,
			Math.round(sc * 255),
			print
		], i);
		noise$1[i] = noiseOf(x, y, print * 4);
	};
	const gc = g >= 0 ? rgb$1(GRADES[Math.min(g, GRADES.length - 1)].color) : spec.tint ? rgb$1(spec.tint) : [
		104,
		118,
		146
	];
	const aura = edition === 6, gold = edition === 5, neg = edition === 4;
	const auraCopy = copies.find((o) => itemById(o.item)?.slot === "aura");
	const tone = aura && auraCopy ? rgb$1(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
	const gx0 = Math.floor((W$1 - FRAME_WIDTH) / 2), left = Math.max(2, gx0 - 2), right = Math.min(W$1 - 3, gx0 + FRAME_WIDTH + 1), wTop = 9, wBottom = 28;
	const origin = [(left + right) / 2, (wTop + wBottom) / 2];
	const stock = (x, y) => gold ? blend([
		46,
		42,
		64
	], [
		28,
		24,
		40
	], y / H$1) : neg ? blend(blend(IVORY$1, tone, .35), blend(IVORY$1, tone, .6), y / H$1) : blend(blend(tone, WHITE, .08), blend(tone, INK$1, .25), y / H$1);
	const plate = aura ? blend(blend(tone, INK$1, .6), INK$1, .45) : PLATE$1;
	const light = blend(IVORY$1, gc, g >= 0 ? .22 : spec.tint ? .3 : .12), glow = blend(light, gc, .2);
	/** A Grail's window: a few large soft bands of three golds, as the big card's. */
	const fieldGold = (x, y) => {
		const qx = (x - origin[0]) / 8, qy = (y - origin[1]) / 8;
		const t = .5 + .5 * Math.sin(qy * 3.2 + 1.3 * Math.sin(qx * 2.4 + .6) + .6 * Math.sin(qx * 4.1 - qy * 1.7));
		const k1 = Math.min(1, Math.max(0, (t - .35) / .12 + .5)), k2 = Math.min(1, Math.max(0, (t - .72) / .12 + .5));
		return blend(blend([
			176,
			112,
			24
		], [
			226,
			164,
			52
		], k1), [
			250,
			206,
			110
		], k2);
	};
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		const cx = Math.min(x, W$1 - 1 - x), cy = Math.min(y, H$1 - 1 - y);
		if (cx + cy < 2) continue;
		if (cx === 0 || cy === 0 || cx + cy === 2) {
			put$1(x, y, INK$1, FIXED);
			continue;
		}
		const bevel = cx === 1 || cy === 1 || cx + cy === 3;
		const deep = x > W$1 / 2 && cx === 1 || y > H$1 / 2 && cy === 1;
		if (gold) {
			put$1(x, y, bevel ? deep ? [
				201,
				146,
				30
			] : [
				255,
				233,
				160
			] : stock(x, y), bevel ? CARD : FIXED);
			continue;
		}
		let c = stock(x, y);
		if (bevel) c = deep ? blend(c, INK$1, .3) : blend(c, WHITE, .35);
		if (aura && !bevel) {
			const d = Math.hypot((x - origin[0]) / 15, (y - origin[1]) / 19);
			put$1(x, y, blend(blend(tone, INK$1, .62), blend(tone, INK$1, .3), Math.max(0, 1 - d) ** 1.2), WINDOW);
			continue;
		}
		put$1(x, y, c, CARD);
	}
	for (let y = 2; y <= 7; y++) for (let x = 2; x <= W$1 - 3; x++) {
		if ((x === 2 || x === W$1 - 3) && (y === 2 || y === 7)) continue;
		put$1(x, y, y === 2 ? blend(plate, WHITE, .16) : y === 7 ? INK$1 : plate, FIXED);
	}
	if (!aura) for (let y = wTop; y <= wBottom; y++) for (let x = left; x <= right; x++) {
		const d = Math.hypot((x - origin[0]) / 10, (y - origin[1]) / 11);
		if (x === left || y === wTop || x === right || y === wBottom) put$1(x, y, INK$1, FIXED);
		else put$1(x, y, gold ? fieldGold(x, y) : blend(light, glow, Math.max(0, 1 - d) ** 1.4), WINDOW);
	}
	const frameCopy = owned.frame, fx0 = aura ? 2 : left + 1, fx1 = aura ? W$1 - 3 : right - 1, fy0 = aura ? 8 : wTop + 1, fy1 = aura ? 29 : wBottom - 1;
	const ground = backdropColors(config, palette$1, fx0 - gx0, fy0 - 11 + HEADROOM, fx1 - fx0 + 1, fy1 - fy0 + 1);
	if (ground) {
		const fi = frameCopy ? SHADER_FINISHES.indexOf(frameCopy.finish) : -1;
		ground.forEach((row, j) => row.forEach((hex$2, i) => {
			if (hex$2) put$1(fx0 + i, fy0 + j, rgb$1(hex$2), ITEM, fi, frameCopy?.scuff ?? 0, frameCopy?.print ?? 0);
		}));
	}
	grid.forEach((row, y) => row.forEach((t, x) => {
		const hex$2 = colors[y][x];
		if (!hex$2 || ground && t >= LAYER.frame && t < LAYER.buddy) return;
		const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
		const o = slot ? owned[slot] : void 0;
		const fi = o ? SHADER_FINISHES.indexOf(o.finish) : -1;
		if (x + gx0 > 1 && x + gx0 < W$1 - 2) put$1(x + gx0, y + 11, rgb$1(hex$2), o ? ITEM : GUY, fi, o ? o.scuff : 0, o ? o.print : 0);
	}));
	for (let y = 30; y <= H$1 - 3; y++) for (let x = 2; x <= W$1 - 3; x++) {
		if ((x === 2 || x === W$1 - 3) && (y === 30 || y === H$1 - 3)) continue;
		put$1(x, y, y === 30 ? INK$1 : plate, FIXED);
	}
	const buddy = new Uint8Array(W$1 * H$1 * 4), alone = buddyAlone(config), buddyOwned = owned.buddy;
	const buddyCopy = [
		buddyOwned ? SHADER_FINISHES.indexOf(buddyOwned.finish) : -1,
		buddyOwned?.scuff ?? 0,
		Math.floor((buddyOwned?.print ?? 0) / 4) * 4
	];
	if (alone) {
		const tint = still(alone, config, palette$1), cells = [];
		alone.forEach((row, y) => row.forEach((t, x) => {
			if (tint[y][x]) cells.push([
				x,
				y,
				tint[y][x],
				t >= LAYER.buddy
			]);
		}));
		const ox = BUDDY_RIGHT - Math.max(...cells.map(([x]) => x)), oy = BUDDY_FOOT[spec.buddy ?? "peek"] - Math.max(...cells.map(([, y]) => y));
		for (const [x, y, hex$2, art] of cells) {
			const i = ((y + oy) * W$1 + x + ox) * 4;
			buddy.set([...rgb$1(hex$2), art ? 255 : 128], i);
			noise$1[i + 1] = noiseOf(x + ox, y + oy, buddyCopy[2]);
		}
	}
	const look = lookFor(edition, top?.finish, spec.look);
	const face = {
		base,
		kind,
		noise: noise$1,
		buddy,
		buddyCopy,
		hop: alone ? buddyHop(spec.name) : null,
		grade: g,
		negative: copies.some((o) => o.finish === "negative"),
		seed: last ? last.print : 0,
		holo,
		variant: last ? last.print % 4 : 0,
		edition,
		origin,
		look
	};
	if (look === 1) {
		const hues = auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, Math.min(g, GRADES.length - 1))].color];
		face.paint = {
			colors: paintColors(hues, auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : hues[0]),
			contrast: spec.contrast ?? PAINT_CONTRAST,
			...paintForm(auraCopy?.item ?? "", auraCopy?.print ?? 0)
		};
	}
	return face;
}
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
const faceMoves = (f) => f.edition > 0 || !!f.hop || f.kind.some((v, i) => i % 4 === 1 && v > 0);
/** How many rows the face's buddy is up `ms` into its loop: 1 now and then, as it hops; 0 without one. */
const buddyLift = (f, ms) => f.hop ? hopLift(f.hop, ms) : 0;
/** Whether a face cell is on the card's bevel (`raised` in CARD_FRAGMENT). */
function faceRaised(x, y) {
	const ex = Math.min(x, FACE_WIDTH - 1 - x), ey = Math.min(y, FACE_HEIGHT - 1 - y);
	return ex === 1 || ey === 1 || ex + ey === 3 ? 1 : 0;
}
/** A face's edition worked out per pixel once (`editionField`), kept with the face. */
const fields = new WeakMap();
function faceField(f) {
	let got = fields.get(f);
	if (got) return got;
	const W$1 = FACE_WIDTH, H$1 = FACE_HEIGHT, at = new Int32Array(W$1 * H$1).fill(-1), cells = [];
	for (let i = 0; i < W$1 * H$1; i++) {
		if (f.base[i * 4 + 3] < 128 || Math.floor(f.kind[i * 4] / 32 + .5) > WINDOW) continue;
		at[i] = cells.length;
		cells.push(i);
	}
	const n = cells.length, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb$4 = new Float32Array(n * 3);
	cells.forEach((i, k) => {
		x[k] = i % W$1;
		y[k] = Math.floor(i / W$1);
		region[k] = Math.floor(f.kind[i * 4] / 32 + .5);
		h[k] = f.noise[i * 4] / 255;
		for (let j = 0; j < 3; j++) rgb$4[k * 3 + j] = f.base[i * 4 + j] / 255;
	});
	const raised = Float32Array.from(x, (cx, k) => faceRaised(cx, y[k]));
	const pixels = {
		x,
		y,
		region,
		h,
		rgb: rgb$4,
		raised
	};
	got = {
		at,
		field: cardField(f.look, f.edition, f.variant, f.origin, 1, pixels, f.paint),
		out: new Float32Array(n * 3)
	};
	fields.set(f, got);
	return got;
}
/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
function cardFaceAt(f, ms, hover) {
	const W$1 = FACE_WIDTH, H$1 = FACE_HEIGHT, out = new Uint8ClampedArray(W$1 * H$1 * 4);
	const time = loopSeconds(ms), { at, field, out: ed } = faceField(f), lift = buddyLift(f, ms);
	field(time, ed);
	for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		const i = (y * W$1 + x) * 4;
		if (f.base[i + 3] < 128) continue;
		let c;
		const e = at[i >> 2], s = ((y + lift) * W$1 + x) * 4, b$1 = y + lift < H$1 ? f.buddy[s + 3] : 0;
		if (b$1 >= 64) {
			c = [
				f.buddy[s] / 255,
				f.buddy[s + 1] / 255,
				f.buddy[s + 2] / 255
			];
			if (b$1 >= 192 && f.buddyCopy[0] >= 0) c = finishColor(c, f.buddyCopy[0], f.buddyCopy[1], f.noise[s + 1] / 255, x + y + lift, y + lift, f.buddyCopy[2], time, 1);
		} else if (e >= 0) c = [
			ed[e * 3],
			ed[e * 3 + 1],
			ed[e * 3 + 2]
		];
		else {
			c = [
				f.base[i] / 255,
				f.base[i + 1] / 255,
				f.base[i + 2] / 255
			];
			const k = Math.floor(f.kind[i] / 32 + .5), finish = Math.floor(f.kind[i + 1] / 32 + .5) - 1;
			if (k === ITEM && finish >= 0) c = finishColor(c, finish, f.kind[i + 2] / 255, f.noise[i] / 255, x + y, y, f.kind[i + 3] * 4, time, 1);
		}
		if (hover && hover.strength > 0) {
			const light = (1 - smoothstep(0, .34, distance([(x + .5) / W$1, (y + .5) / H$1], [hover.x, hover.y]))) * .35 * hover.strength;
			c = [
				c[0] + light,
				c[1] + light,
				c[2] + light
			];
		}
		out[i] = toByte(c[0]);
		out[i + 1] = toByte(c[1]);
		out[i + 2] = toByte(c[2]);
		out[i + 3] = 255;
	}
	return out;
}
/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise`, `buddy` from `cardFace`. */
const CARD_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, kind, noise, buddy;
uniform float time, hover, edition, variant, look, contrast, buddyLift, buddyFinish, buddyScuff, buddyPrint;
uniform vec2 light, origin;
uniform vec3 paint1, paint2, paint3;
uniform vec4 paintForm;
uniform float paintPhase;
${GLSL_COMMON}
${GLSL_EDITIONS}
${GLSL_LOOKS}
void main() {
  vec2 res = vec2(${FACE_WIDTH}.0, ${FACE_HEIGHT}.0);
  vec2 cell = floor(uv * res);
  vec2 at = (cell + 0.5) / res;
  vec4 b = texture2D(base, at);
  if (b.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 c = b.rgb;
  vec4 kd = texture2D(kind, at);
  float k = floor(kd.r * 255.0 / 32.0 + 0.5);
  float finish = floor(kd.g * 255.0 / 32.0 + 0.5) - 1.0;
  float print = floor(kd.a * 255.0 + 0.5) * 4.0;
  float h = texture2D(noise, at).r;
  vec2 src = cell + vec2(0.0, buddyLift);
  vec2 sat = (src + 0.5) / res;
  vec4 bd = src.y < res.y ? texture2D(buddy, sat) : vec4(0.0);
  if (bd.a > 0.25) {
    c = bd.rgb;
    if (bd.a > 0.75 && buddyFinish >= 0.0) c = finishColor(c, buddyFinish, buddyScuff, texture2D(noise, sat).g, src.x + src.y, src.y, buddyPrint, time, 1.0);
  }
  else if (k > 3.5 && k < 4.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, cell.x + cell.y, cell.y, print, time, 1.0);
  else if (k < 2.5) {
    vec2 e = min(cell, res - 1.0 - cell);
    float raised = e.x == 1.0 || e.y == 1.0 || e.x + e.y == 3.0 ? 1.0 : 0.0;
    c = lookColor(c, look, edition, variant, cell, origin, k, raised, h, 1.0, time, paint1, paint2, paint3, contrast, paintForm, paintPhase);
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
		"edition",
		"variant",
		"light",
		"origin",
		"look",
		"contrast",
		"paint1",
		"paint2",
		"paint3",
		"paintForm",
		"paintPhase",
		"buddy",
		"buddyLift",
		"buddyFinish",
		"buddyScuff",
		"buddyPrint"
	].map((n) => [n, gl.getUniformLocation(program, n)]));
	gl.uniform1i(u.base, 0);
	gl.uniform1i(u.kind, 1);
	gl.uniform1i(u.noise, 2);
	gl.uniform1i(u.buddy, 3);
	gl.viewport(0, 0, FACE_WIDTH, FACE_HEIGHT);
	const textures = [
		0,
		1,
		2,
		3
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
				face.noise,
				face.buddy
			].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FACE_WIDTH, FACE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(u.time, loopSeconds(ms));
			gl.uniform1f(u.edition, face.edition);
			gl.uniform1f(u.variant, face.variant);
			gl.uniform2f(u.origin, face.origin[0], face.origin[1]);
			gl.uniform1f(u.hover, hover?.strength ?? 0);
			gl.uniform2f(u.light, hover?.x ?? .5, hover?.y ?? .3);
			gl.uniform1f(u.look, face.look);
			gl.uniform1f(u.contrast, face.paint?.contrast ?? PAINT_CONTRAST);
			const paint$1 = face.paint?.colors;
			[
				u.paint1,
				u.paint2,
				u.paint3
			].forEach((at, k) => gl.uniform3f(at, paint$1?.[k][0] ?? 0, paint$1?.[k][1] ?? 0, paint$1?.[k][2] ?? 0));
			const form = face.paint?.form ?? [
				5,
				1,
				0,
				0
			];
			gl.uniform4f(u.paintForm, form[0], form[1], form[2], form[3]);
			gl.uniform1f(u.paintPhase, face.paint?.phase ?? 0);
			gl.uniform1f(u.buddyLift, buddyLift(face, ms));
			gl.uniform1f(u.buddyFinish, face.buddyCopy[0]);
			gl.uniform1f(u.buddyScuff, face.buddyCopy[1]);
			gl.uniform1f(u.buddyPrint, face.buddyCopy[2]);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	};
}

//#endregion
//#region src/emotes.ts
/** An emote's side, in pixels. */
const EMOTE_SIZE = 14;
/** The set, in the order a channel would upload them. `name` is the suffix a channel puts after its prefix. */
const EMOTE_SET = [
	{
		id: "hi",
		name: "Hi",
		poses: ["smile", "base"],
		symbol: "hearts",
		motion: "bounce"
	},
	{
		id: "lol",
		name: "Lol",
		poses: ["laugh", "smile"],
		symbol: "note",
		motion: "bounce"
	},
	{
		id: "pog",
		name: "Pog",
		poses: ["ooh"],
		symbol: "bang",
		motion: "bounce"
	},
	{
		id: "love",
		name: "Love",
		poses: ["blush"],
		symbol: "heart",
		motion: "rise"
	},
	{
		id: "mad",
		name: "Mad",
		poses: ["huff"],
		symbol: "anger",
		motion: "shake"
	},
	{
		id: "sad",
		name: "Sad",
		poses: ["frown"],
		symbol: "sweat",
		motion: "rise"
	},
	{
		id: "sleep",
		name: "Sleep",
		poses: ["shut"],
		symbol: "zzz",
		motion: "rise"
	},
	{
		id: "hmm",
		name: "Hmm",
		poses: ["left", "right"],
		symbol: "question",
		motion: "sway"
	},
	{
		id: "hype",
		name: "Hype",
		poses: ["laugh"],
		symbol: "fire",
		motion: "bounce"
	},
	{
		id: "gg",
		name: "Gg",
		poses: ["content"],
		symbol: "crown",
		motion: "bounce"
	},
	{
		id: "blep",
		name: "Blep",
		poses: ["blep"],
		motion: "sway"
	},
	{
		id: "oops",
		name: "Oops",
		poses: ["oops"],
		symbol: "sweat",
		motion: "shake"
	},
	{
		id: "idea",
		name: "Idea",
		poses: ["ooh"],
		symbol: "bulb",
		motion: "flick",
		room: 1
	},
	{
		id: "mindblown",
		name: "Mindblown",
		poses: ["ooh"],
		motion: "open",
		room: 3,
		unlock: "burst"
	},
	{
		id: "daydream",
		name: "Daydream",
		poses: ["content"],
		symbol: "cloud",
		motion: "dream",
		room: 2
	},
	{
		id: "galaxybrain",
		name: "Galaxybrain",
		poses: ["smile"],
		motion: "open",
		room: 3,
		unlock: "galaxy"
	}
];
/** Whether `id` names an emote in the set. */
const isEmote = (id) => EMOTE_SET.some((e) => e.id === id);
const STEP_MS$1 = 180;
const STEPS = 6;
/**
* Emote `id` for a guy: one frame still, or a loop of six. His head and shoulders fill it, top-aligned
* to his head (or hat), the picture in the top right corner over him.
*/
function emoteFrames(spec, id, moving = true) {
	const def = EMOTE_SET.find((e) => e.id === id);
	if (!def) return null;
	const options = animateOptions(spec), lucky = !!resolve(spec.seed, spec.parts).lucky;
	const steps$1 = moving ? STEPS : 1;
	const posed = new Map();
	const cellsOf = (pose, k) => {
		const key = `${pose} ${k}`;
		if (!posed.has(key)) posed.set(key, poseCells(spec.seed, pose, {
			...options,
			rare: {
				step: k,
				of: steps$1
			}
		}));
		return posed.get(key);
	};
	const first = cellsOf(def.poses[0], 0);
	const head = first.colors.findIndex((row) => row.some(Boolean));
	const top = Math.max(0, head - 1 - (def.room ?? 0));
	const frames = [];
	let star;
	for (let k = 0; k < steps$1; k++) {
		const pose = def.poses[k % def.poses.length], { colors: rows, body, eyes: eyes$1 } = cellsOf(pose, k);
		const beat = moving ? k % 2 : 0;
		const dy = def.motion === "bounce" ? -beat : 0, dx = def.motion === "shake" ? (k % 2 ? 1 : -1) * (moving ? 1 : 0) : 0;
		const lift = !moving ? 0 : def.motion === "rise" ? k % 3 : def.motion === "dream" ? k % 2 : 0;
		const grid = Array.from({ length: EMOTE_SIZE }, () => new Array(EMOTE_SIZE).fill(null));
		const skin = grid.map((row) => row.map(() => false));
		for (let y = 0; y < EMOTE_SIZE; y++) {
			const from = top + y - dy;
			if (from < 0 || from >= FRAME_HEIGHT) continue;
			for (let x = 0; x < EMOTE_SIZE; x++) {
				grid[y][x] = rows[from]?.[x + 1 + dx] ?? null;
				skin[y][x] = !!body[from]?.[x + 1 + dx];
			}
		}
		const at = moving ? k : -1;
		if (def.unlock) openHead(grid, (x, y) => skin[y][x], (c) => c, eyes$1 - top + dy, def.unlock, at < 0 ? LID_STILL : LID_LIFT[def.unlock][at], Math.max(0, at));
		if (lucky && star === void 0) star = starSpot(grid);
		if (star) luckyStar(grid, star, at);
		if (def.symbol) {
			const symbol = symbolAt(def, at), sw = symbol.reduce((w, [x]) => Math.max(w, x + 1), 0);
			for (const [x, y, c] of symbol) put(grid, EMOTE_SIZE - sw + x, y - lift, c);
		}
		const px = new Uint8ClampedArray(EMOTE_SIZE * EMOTE_SIZE * 4);
		grid.forEach((row, y) => row.forEach((c, x) => {
			if (c) px.set([
				parseInt(c.slice(1, 3), 16),
				parseInt(c.slice(3, 5), 16),
				parseInt(c.slice(5, 7), 16),
				255
			], (y * EMOTE_SIZE + x) * 4);
		}));
		frames.push(px);
	}
	return {
		width: EMOTE_SIZE,
		height: EMOTE_SIZE,
		frames,
		delays: frames.map(() => STEP_MS$1)
	};
}
const put = (grid, x, y, c) => {
	if (x >= 0 && y >= 0 && x < EMOTE_SIZE && y < EMOTE_SIZE) grid[y][x] = c;
};
/** The bulb dark, then switched on: its glass grey, its glint dim. */
const BULB_OFF = {
	"#FFE27A": "#C9CED8",
	"#FFFFFF": "#E9ECF2"
};
/** The steps an idea's bulb is lit in, of the six. */
const BULB_ON = [
	false,
	false,
	true,
	true,
	true,
	true
];
/** A daydream's star, turning through three colours a step at a time. */
const DREAM_STAR = [
	"#FFC93D",
	"#FF8FC8",
	"#7FE0FF"
];
/** The emote's picture at step `k` (-1 for the still): an idea's bulb lights, a daydream's star turns colour. */
function symbolAt(def, k) {
	const cells = emoteCells(def.symbol);
	if (def.motion === "flick" && k >= 0 && !BULB_ON[k]) return cells.map(([x, y, c]) => [
		x,
		y,
		BULB_OFF[c] ?? c
	]);
	if (def.motion === "dream" && k >= 0) return cells.map(([x, y, c]) => [
		x,
		y,
		c === DREAM_STAR[0] ? DREAM_STAR[Math.floor(k / 2) % 3] : c
	]);
	return cells;
}
/** How a Lucky guy's star twinkles over the six steps (`starAt`'s life): wide open first, so the still shows it whole. */
const STAR_STEPS = [
	.57,
	.78,
	.9,
	1,
	.2,
	.35
];
const clearAt = (grid, x, y) => x >= 0 && y >= 0 && x < EMOTE_SIZE && y < EMOTE_SIZE && !grid[y][x];
/** Where a Lucky guy's star goes in an emote: the top-left corner, where the most of it is clear of the guy; null if there's no room. */
function starSpot(grid) {
	const open = starAt(STAR_STEPS[0]);
	let best = null, most = 0;
	for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) {
		const n = open.filter(([dx, dy]) => clearAt(grid, x + dx, y + dy)).length;
		if (clearAt(grid, x, y) && n > most) {
			most = n;
			best = [x, y];
		}
	}
	return most >= 3 ? best : null;
}
/** A Lucky guy's gold star at `spot`, at step `k` of its twinkle (-1 for the still), as the moving picture throws it off over the head: never over the guy. */
function luckyStar(grid, [x, y], k) {
	for (const [dx, dy, c] of starAt(STAR_STEPS[Math.max(0, k)])) if (clearAt(grid, x + dx, y + dy)) put(grid, x + dx, y + dy, GOLD_SPARKLE[c]);
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
const ART_VERSION = 15;
/** The longest name a big card's code carries. */
const TITLE_MAX = 24;
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
		t: spec.tint,
		n: spec.title || void 0
	};
	const json = JSON.stringify(short);
	const bytes = new TextEncoder().encode(json);
	let bin = "";
	for (const b$1 of bytes) bin += String.fromCharCode(b$1);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/**
* Every baked picture's size at 1×: a guy playing a move (`GUY_WIDTH` by `GUY_HEIGHT` in ./bake), a
* guy with a buddy beside him (`BUDDY_GUY_WIDTH`), an icon, a face, the small card, the big card's
* art and the big card. Nothing tells a page from an address alone whether a guy has a buddy, so size
* a move's box by its height and let the picture set its width (the batch read says, as `wide`). A
* profile picture (`pfp`) is square but its side depends on the guy, 20 to 34: show it in a square
* box.
*/
const BAKED_SIZE = {
	guy: {
		width: 22,
		height: 20
	},
	buddy: {
		width: 34,
		height: 20
	},
	card: {
		width: 26,
		height: 42
	},
	icon: {
		width: 16,
		height: 16
	},
	face: {
		width: 14,
		height: 14
	},
	art: {
		width: 128,
		height: 128
	},
	cardFull: {
		width: 140,
		height: 204
	}
};
/** The views that aren't moves, each with its `-still`. */
const PICTURE_VIEWS = [
	"icon",
	"face",
	"still",
	"pfp",
	"card",
	"art",
	"card-full"
];
/** A view's size at 1× (`BAKED_SIZE`), or null for one that depends on the guy (a move, `pfp`). */
function viewSize(view) {
	const base = view.replace(/-still$/, "");
	return base === "icon" ? BAKED_SIZE.icon : base === "face" || base.startsWith("emote-") ? BAKED_SIZE.face : base === "card" ? BAKED_SIZE.card : base === "art" ? BAKED_SIZE.art : base === "card-full" ? BAKED_SIZE.cardFull : null;
}

//#endregion
//#region src/kit.ts
/**
* The lil guys kit for a game: a player's guy anywhere from one address or one line, with nothing of
* the library on the page. Every picture comes from the lil guys Worker (`/g/`), finished and cached
* for good, and plays in a plain `<img>`, so a board of a hundred animates with no script per frame.
* GAMES.md has where each view goes.
*
*   lilGuyUrl('Sneaky Gumdrop', 'face')                → https://lilguys.dleclub.com/g/14/~Sneaky%20Gumdrop/face.png
*   row.prepend(lilGuyImg('mia', 'row'))               → an <img> sized for a board's row
*   const guys = await lilGuysFor(['mia', 'theo'])     → each name's code, claimed or not, in one read
*
* The served copy (`/lilguys.js` as a classic script, `/lilguys.mjs` as a module) knows its own host;
* a copy bundled from the library talks to `LILGUYS_HOST` unless told otherwise (`setLilGuysHost`).
*/
/** The lil guys Worker. */
const LILGUYS_HOST = "https://lilguys.dleclub.com";
let defaultHost = LILGUYS_HOST;
/** Where the helpers send for pictures when a call doesn't say: a local Worker while developing, say. */
function setLilGuysHost(host) {
	defaultHost = host.replace(/\/+$/, "");
}
/** The host the helpers use. */
const lilGuysHost = () => defaultHost;
/** Where games put a guy, each with its view and size (GAMES.md, Where it goes). */
const LIL_GUY_PRESETS = {
	menu: {
		view: "icon",
		scale: 2
	},
	chat: {
		view: "face",
		scale: 2
	},
	row: {
		view: "face",
		scale: 3
	},
	results: {
		view: "idle",
		scale: 4
	},
	profile: {
		view: "pfp",
		scale: 3
	},
	card: {
		view: "card",
		scale: 3
	},
	"card-full": {
		view: "card-full",
		scale: 2
	}
};
const isInfo = (who) => typeof who === "object" && "urls" in who;
/** The guy part of an address. A big card shows a name, so an info's card goes by the card's own address. */
function guyPart(who) {
	if (typeof who === "string") return who[0] === "@" ? "@" + encodeURIComponent(who.slice(1).toLowerCase()) : "~" + encodeURIComponent(who.replace(/^~/, ""));
	return who.code;
}
/** A preset's view, or the view itself. */
const viewOf = (view) => view in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[view].view : view;
/**
* A guy's picture's address: `lilGuyUrl('mia', 'face', { scale: 2, format: 'gif' })`. `view` is a view
* or a preset's name.
*/
function lilGuyUrl(who, view = "idle", { scale: scale$1 = 1, format = "png", host = defaultHost, version = ART_VERSION } = {}) {
	const v = viewOf(view), s = Math.max(1, Math.min(16, Math.round(scale$1)));
	const at = s > 1 ? `@${s}` : "";
	const file = format === "gif" ? `${v}${at}.gif` : format === "sheet" ? `${v}.sheet${at}.png` : format === "json" ? `${v}.sheet${at}.json` : `${v}${at}.png`;
	if (isInfo(who) && (v === "card-full" || v === "card-full-still")) {
		const card$1 = who.urls.cardFull.split("/").slice(-2)[0];
		return `${host.replace(/\/+$/, "")}/g/${version}/${card$1}/${file}`;
	}
	return `${host.replace(/\/+$/, "")}/g/${version}/${guyPart(who)}/${file}`;
}
/** A view's box at `scale`, in CSS pixels: null for the width of a move, which a buddy widens, when nothing says. */
function lilGuySize(view, scale$1 = 1, wide$1) {
	const v = viewOf(view), size = viewSize(v);
	if (size) return {
		width: size.width * scale$1,
		height: size.height * scale$1
	};
	if (v === "pfp" || v === "pfp-still") return {
		width: PFP_BOX * scale$1,
		height: PFP_BOX * scale$1
	};
	return {
		width: wide$1 === void 0 ? null : (wide$1 ? BAKED_SIZE.buddy.width : BAKED_SIZE.guy.width) * scale$1,
		height: BAKED_SIZE.guy.height * scale$1
	};
}
/** The square a profile picture is fitted into, per screen pixel of scale: its own side is 20 to 34, depending on the guy. */
const PFP_BOX = 32;
/** A 16 × 16 stand-in for when a picture can't be had: a plain lil guy's shape in grey. */
const LIL_GUY_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" shape-rendering=\"crispEdges\"><path fill=\"#9aa1ab\" d=\"M5 3h6v1h2v1h1v2h1v5h-1v2h-2v1H4v-1H2v-2H1V7h1V5h1V4h2z\"/><path fill=\"#5b616b\" d=\"M5 8h1v2H5zm5 0h1v2h-1zM7 11h2v1H7z\"/></svg>");
/**
* A ready `<img>` of a guy: `lilGuyImg('mia', 'row')` or `lilGuyImg(info, 'face', { size: 2 })`. Sized
* with `width` and `height` (no layout shift), pixelated, lazy, decoded off the main thread, with alt
* text, and a grey stand-in if the picture can't be had. Animated views play in the `<img>` itself.
*/
function lilGuyImg(who, view = "row", options = {}) {
	const preset = view in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[view] : null;
	const v = viewOf(view);
	const scale$1 = typeof options.size === "string" ? LIL_GUY_PRESETS[options.size].scale : options.size ?? preset?.scale ?? 3;
	const wide$1 = options.wide ?? (isInfo(who) ? who.wide : void 0);
	const box = lilGuySize(v, scale$1, wide$1);
	const host = options.host ?? defaultHost;
	const img = document.createElement("img");
	img.src = lilGuyUrl(who, v, { host });
	if (options.srcset) img.srcset = [
		1,
		2,
		4
	].map((d) => `${lilGuyUrl(who, v, {
		host,
		scale: d
	})} ${d}x`).join(", ");
	if (box.width !== null) img.width = box.width;
	img.height = box.height;
	img.alt = options.alt ?? (typeof who === "string" ? who.replace(/^[@~]/, "") : isInfo(who) ? who.name : "");
	img.loading = "lazy";
	img.decoding = "async";
	img.draggable = false;
	if (options.className) img.className = options.className;
	img.style.cssText = `image-rendering:pixelated;object-fit:contain;${box.width === null ? `width:auto;min-width:${BAKED_SIZE.guy.width * scale$1}px;` : ""}`;
	img.addEventListener("error", () => {
		img.removeAttribute("srcset");
		img.src = LIL_GUY_PLACEHOLDER;
	}, { once: true });
	return img;
}
/** The most names one batch read takes. */
const BATCH_MAX = 100;
const known = new Map();
const KNOWN_MAX = 5e3;
/**
* Every player on a board in one read (`GET /api/club/batch`), up to a hundred names to a request and
* as many requests as it takes: each name (lowercased) to its guy, claimed or not, or null when the
* Worker couldn't be reached. Answers are kept for the page's life, so asking again costs nothing.
*/
async function lilGuysFor(names, { host = defaultHost } = {}) {
	const asked = [...new Set(names.map((n) => String(n).toLowerCase()).filter((n) => n && !/[,/]/.test(n)))];
	let missing = asked.filter((n) => !known.has(`${host}|${n}`));
	if (known.size + missing.length > KNOWN_MAX) {
		known.clear();
		missing = asked;
	}
	for (let i = 0; i < missing.length; i += BATCH_MAX) {
		const part = missing.slice(i, i + BATCH_MAX);
		const read = fetch(`${host.replace(/\/+$/, "")}/api/club/batch?names=${part.map(encodeURIComponent).join(",")}`).then((r) => r.ok ? r.json() : null).catch(() => null);
		for (const n of part) {
			const one = read.then((body) => body?.guys?.[n] ?? null);
			known.set(`${host}|${n}`, one);
			one.then((info) => {
				if (!info) known.delete(`${host}|${n}`);
			});
		}
	}
	const out = {};
	await Promise.all(asked.map(async (n) => {
		out[n] = await known.get(`${host}|${n}`) ?? null;
	}));
	return out;
}

//#endregion
//#region src/element.ts
/** The fastest a guy on the page is redrawn: about 15 frames a second, near enough to his own frames. */
const FRAME_MS = 66;
/** How many guys not seen before are baked in one frame, so a long board fills in instead of holding the page. */
const BAKES_PER_FRAME = 2;
/** Defines `<lil-guy>` (once per tag). */
function defineLilGuy(options = {}) {
	const tag = options.tag ?? "lil-guy";
	if (typeof customElements === "undefined" || customElements.get(tag)) return;
	const host = options.host?.replace(/\/+$/, "");
	const playing = new Set(), waiting = new Set();
	let ticking = false, last = 0;
	const tick$1 = (now) => {
		ticking = playing.size > 0 || waiting.size > 0;
		if (!ticking) return;
		requestAnimationFrame(tick$1);
		let bakes = BAKES_PER_FRAME;
		for (const el of waiting) {
			waiting.delete(el);
			if (el.isConnected) el.render(true);
			if (--bakes <= 0) break;
		}
		if (now - last < FRAME_MS) return;
		last = now;
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
	};
	const wake = () => {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(tick$1);
		}
	};
	const play = (p) => {
		playing.add(p);
		wake();
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
			"label",
			"preset"
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
			waiting.delete(this);
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
			c.getContext("2d").putImageData(p.images[k] ??= new ImageData(new Uint8ClampedArray(p.frames.frames[k]), p.frames.width, p.frames.height), 0, 0);
		}
		render(bakeNow = false) {
			const who = this.who(), named = this.getAttribute("preset");
			const preset = named && named in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[named] : null;
			const view = this.getAttribute("view") || preset?.view || "idle";
			const size = Math.max(1, Math.min(32, Math.round(Number(this.getAttribute("size")) || preset?.scale || 4)));
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
			const pixels = "image-rendering:pixelated;image-rendering:crisp-edges";
			const style = (width, height) => `width:${width * size}px;height:${height * size}px;${pixels}`;
			if (host) {
				const name = !this._spec && !this.getAttribute("code") && this.getAttribute("name");
				this.replaceChildren(lilGuyImg(name || { code: who }, view, {
					size,
					host,
					alt: ""
				}));
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
			if (!baked.has(key)) {
				if (!bakeNow) {
					waiting.add(this);
					wake();
					return;
				}
				baked.set(key, options.bake(this._spec ?? who, view));
			}
			const frames = baked.get(key);
			if (!frames) {
				this.replaceChildren();
				return;
			}
			const canvas = document.createElement("canvas");
			canvas.width = frames.width;
			canvas.height = frames.height;
			canvas.style.cssText = style(frames.width, frames.height);
			this.canvas = canvas;
			this.replaceChildren(canvas);
			this.player = {
				el: this,
				frames,
				images: [],
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
/**
* A baked guy is his frame with room for a rare aura's rings either side: the
* same size for every guy without a buddy. A guy with a buddy is
* `BUDDY_GUY_WIDTH` across, the buddy on the floor beside him and the two of
* them centred, so every buddy picture is one size too.
*/
const GUY_WIDTH = FRAME_WIDTH + AURA_PAD * 2;
const BUDDY_GUY_WIDTH = WIDE_FRAME_WIDTH + AURA_PAD * 2;
const GUY_HEIGHT = FRAME_HEIGHT;
/** Where a frame `width` wide starts on a baked picture `W` wide: centred, room for an aura's rings either side. */
const leftOf = (width, W$1) => AURA_PAD + Math.floor((W$1 - AURA_PAD * 2 - width) / 2);
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
/** A frame on the padded canvas `W` wide, from column `left`: the guy's pixels (shone, if given) and the aura cells past his sides. */
function place(frame, W$1, left, shone) {
	const out = new Uint8ClampedArray(W$1 * GUY_HEIGHT * 4), fw = frame.colors[0].length;
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const o = (y * W$1 + x + left) * 4;
		if (shone) {
			const i = (y * fw + x) * 4;
			if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o);
			continue;
		}
		const c = frame.colors[y][x];
		if (c) out.set([...rgb(c), 255], o);
	}
	for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W$1) out.set([...rgb(c), 255], (y * W$1 + x + left) * 4);
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
	return bakeAt(spec, move).frames;
}
/** `bakeGuy`, and the column his frame starts at on the picture. */
function bakeAt(spec, move) {
	const raw = rawFrames(spec, move);
	return {
		frames: merged(raw.width, GUY_HEIGHT, raw.frames, raw.delays),
		left: raw.left
	};
}
/** Every frame `bakeGuy` bakes, before identical ones are merged, and the column the guy's frame starts at. `more` goes to `animate` too. */
function rawFrames(spec, move, more = {}) {
	const options = {
		...animateOptions(spec),
		...more
	}, owned = ownedOf$1(spec);
	const plain = animate(spec.seed, move, options);
	const W$1 = plain.width > FRAME_WIDTH ? BUDDY_GUY_WIDTH : GUY_WIDTH, left = leftOf(plain.width, W$1);
	const ground = backdropOf(spec.seed, options, -left, 0, W$1, FRAME_HEIGHT);
	const lay = (f) => ground ? {
		frame: grounded(f, ground, left),
		left: 0
	} : {
		frame: f,
		left
	};
	const shining = plain.frames.some((f) => shines(f, owned));
	if (!plain.timed && !shining) return {
		width: W$1,
		left,
		frames: plain.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W$1, l.left);
		}),
		delays: plain.frames.map((f) => f.ms)
	};
	const { repeats, turns } = shineFit(plain.duration);
	const anim = animate(spec.seed, move, {
		...options,
		loop: {
			repeats,
			turns,
			fine: shining
		}
	});
	return {
		width: W$1,
		left,
		frames: anim.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W$1, l.left, shining ? shineFrame(l.frame, owned, f.at ?? 0) : void 0);
		}),
		delays: anim.frames.map((f) => f.ms)
	};
}
/** An icon's side: his own sixteen by sixteen, nothing round him. */
const ICON_SIZE = BAKED_SIZE.icon.width;
/** A face's side: his head and shoulders, hat and all. */
const FACE_SIZE = BAKED_SIZE.face.width;
/** The spec without what he wears in the given slots (a backdrop, a buddy, an aura). */
function without(spec, slots) {
	const equip = spec.equip?.filter((code) => !slots.includes(itemById(decode(code)?.item)?.slot ?? ""));
	return {
		...spec,
		equip: equip?.length ? equip : void 0
	};
}
/** The highest and lowest rows of his own sixteen columns with a pixel lit, in a frame of `animate`'s. */
function rowsLit(f) {
	let top = FRAME_HEIGHT, bottom = -1;
	f.colors.forEach((row, y) => {
		for (let x = 0; x < FRAME_WIDTH; x++) if (row[x]) {
			if (y < top) top = y;
			bottom = y;
		}
	});
	return [top, bottom];
}
/**
* A small square of the guy, for a menu, a chat line or a board's row: `icon` the whole sixteen by
* sixteen, `face` a square of the head and shoulders, hat and all. Played as `bakeGuy` plays the
* guy, blinking, breathing and copies shining, but always on the ground: a move's hops are taken
* out, so nothing the guy does leaves the square. What marks a guy rare shows at a glance: the ring a
* copy of Prized or better puts round them, and an aura as a ring in its own colours by turns
* (`glanceRing`), as the chat emotes show them. No buddy and no backdrop: the square is the guy's
* alone, on nothing.
*/
function bakeSquare(spec, view, move = "idle") {
	const bare = without(spec, ["frame", "buddy"]);
	const raw = rawFrames(bare, move, { glance: true });
	const unworn = without(bare, ["aura"]), plainOptions = animateOptions({
		...unworn,
		equip: unworn.equip?.map((code) => decode(code)?.item ?? code)
	});
	const plain = animate(bare.seed, move, {
		...plainOptions,
		parts: {
			...plainOptions.parts,
			lucky: false
		},
		rarity: false
	});
	const lit = plain.frames.map(rowsLit), ends = [];
	const ground = Math.max(...lit.map(([, bottom]) => bottom));
	plain.frames.reduce((t$1, f) => {
		ends.push(t$1 + f.ms);
		return t$1 + f.ms;
	}, 0);
	const liftAt = (t$1) => {
		const pos = t$1 % plain.duration, k = ends.findIndex((e) => pos < e);
		return Math.max(0, ground - lit[k < 0 ? 0 : k][1]);
	};
	const side = view === "icon" ? ICON_SIZE : FACE_SIZE;
	const rest = lit[0][0] + Math.max(0, ground - lit[0][1]);
	const top = view === "icon" ? HEADROOM : Math.min(FRAME_HEIGHT - side, Math.max(0, rest));
	const left = raw.left + (FRAME_WIDTH - side) / 2, W$1 = raw.width;
	let t = 0;
	const frames = raw.frames.map((px, k) => {
		const lift = liftAt(t);
		t += raw.delays[k];
		const out = new Uint8ClampedArray(side * side * 4);
		for (let y = 0; y < side; y++) {
			const from = top + y - lift;
			if (from >= 0 && from < FRAME_HEIGHT) out.set(px.subarray((from * W$1 + left) * 4, (from * W$1 + left + side) * 4), y * side * 4);
		}
		return out;
	});
	return fewerColours(merged(side, side, frames, raw.delays));
}
/**
* How long each frame of a served big card shows: his move and the card's sheen at about six frames a
* second, half the frames the lil guys site draws, and the picture in 255 colours (`fewerColours`), so
* a big card is a few hundred kilobytes, not a megabyte, and bakes in a fraction of the time.
*/
const CARD_FULL_MS = 160;
/**
* A guy's big card with the words the lil guys site puts on it: his name (a code's `title`, `@name`
* for a claimed one), how rare he was dealt and his rarest trait, at his rank's grade unless the code
* gives one.
*/
function cardInputOf(spec, move = "idle") {
	const base = resolve(spec.seed), rank = guyRank(base), copies = faceSpec(spec).copies ?? [];
	const rarest = traitOdds(base).sort((a, b$1) => a.chance - b$1.chance)[0]?.name ?? "";
	const plate = plateOf(copies);
	return {
		seed: spec.seed,
		parts: spec.parts,
		palette: animateOptions(spec).palette,
		copies,
		title: spec.title ?? "",
		lines: [rank.name, rank.label === rank.name ? rarest : rank.label],
		grade: spec.grade ?? rank.tier,
		move,
		...plate ? { plate } : {}
	};
}
/**
* The second plate on a big card: the best copy the guy wears, Prized or better, by its grade and
* what it is (`★ Grail · Gold Goldfish`, `★ Aura · Shadow Galaxy`, `Mythic · Electric Prism Top hat`),
* so what a player wears shows on the card they share. The guy's rank stays the card's own line.
*/
function plateOf(copies) {
	const gradeIn = (o) => GRADES.findIndex((g) => g.id === gradeOf(o).id);
	const best = copies.reduce((a, o) => !a || gradeIn(o) > gradeIn(a) ? o : a, void 0);
	if (!best || gradeIn(best) < 2) return void 0;
	const item = itemById(best.item), finish = FINISHES[best.finish];
	const look = finish.aura ? best.finish === "classic" ? "" : finish.name.split(" · ").pop() : best.finish === "nebula" ? nebulaPhase(best.print) : best.finish === "tempered" ? special(best) ?? `${temperTint(best.print)} Tempered` : finish.name;
	const fx = best.fx && best.fx !== item?.signature ? EFFECTS[best.fx].name : "";
	return {
		text: `${GRADES[gradeIn(best)].name} · ${[
			fx,
			look,
			item?.name ?? best.item
		].filter(Boolean).join(" ")}`,
		grade: gradeIn(best)
	};
}
/** A frame laid on the whole picture `ground` is painted for, from column `left`: his pixels, an aura's cells past his sides, and the backdrop everywhere else. */
function grounded(frame, ground, left) {
	const W$1 = ground[0].length, fw = frame.colors[0].length;
	const colors = ground.map((row) => row.slice()), slots = ground.map((row) => row.map((c) => c ? 3 : 0));
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const c = frame.colors[y][x];
		if (c && frame.slots[y][x] !== 3) {
			colors[y][x + left] = c;
			slots[y][x + left] = frame.slots[y][x];
		}
	}
	for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W$1) {
		colors[y][x + left] = c;
		slots[y][x + left] = 0;
	}
	return {
		...frame,
		colors,
		slots,
		outside: void 0
	};
}
/** The size Discord shows a profile picture at, and asks for at least 128 of. */
const PROFILE_SIZE = 512;
/**
* A guy as a profile picture (Discord and the like): square, with room all round so the round crop
* never cuts him, his buddy or his aura, centred on all of them, on a solid ground in a light tint
* of his own colour, or on the backdrop he wears, run out to every edge. Every frame of the move.
*/
function profileFrames(spec, move = "idle") {
	const backdrop = spec.equip?.find((code) => itemById(decode(code)?.item)?.slot === "frame");
	const baked = bakeAt(backdrop ? {
		...spec,
		equip: spec.equip.filter((code) => code !== backdrop)
	} : spec, move), g = baked.frames, W$1 = g.width, H$1 = g.height;
	const lit = (px, x, y) => px[(y * W$1 + x) * 4 + 3] >= 128;
	let left = W$1, right = -1, top = H$1, bottom = -1;
	for (const px of g.frames) for (let y = 0; y < H$1; y++) for (let x = 0; x < W$1; x++) {
		if (!lit(px, x, y)) continue;
		left = Math.min(left, x);
		right = Math.max(right, x);
		top = Math.min(top, y);
		bottom = Math.max(bottom, y);
	}
	const cx = (left + right + 1) / 2, cy = (top + bottom + 1) / 2;
	let reach = 0;
	for (const px of g.frames) for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit(px, x, y)) reach = Math.max(reach, Math.hypot(Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx)), Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy))));
	const side = Math.ceil(reach * 2) + 2, ox = Math.round(side / 2 - cx), oy = Math.round(side / 2 - cy);
	const colors = paletteOf({
		...resolve(spec.seed, spec.parts),
		...spec.palette !== void 0 ? { palette: spec.palette } : {}
	}).colors;
	const ground = backdrop ? backdropGround(spec, side, ox + baked.left, oy) : null, solid = groundOf(g.frames[0], W$1, H$1, colors[T.BODY], colors[T.ACCENT]);
	const frames = g.frames.map((px) => {
		const out = ground ? new Uint8ClampedArray(ground) : new Uint8ClampedArray(side * side * 4);
		if (!ground) for (let i = 0; i < side * side; i++) out.set(solid, i * 4);
		for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit(px, x, y)) out.set(px.subarray((y * W$1 + x) * 4, (y * W$1 + x) * 4 + 4), ((y + oy) * side + x + ox) * 4);
		return out;
	});
	return {
		width: side,
		height: side,
		frames,
		delays: g.delays
	};
}
/** The backdrop he wears, in its finish, over the whole picture and lined up with where it sits behind him. */
function backdropGround(spec, side, ox, oy) {
	const config = dress({
		...resolve(spec.seed, spec.parts),
		...spec.palette !== void 0 ? { palette: spec.palette } : {}
	}, { equip: spec.equip }, spec.seed);
	const frame = itemById(config.frame);
	const grid = Array.from({ length: side }, (_, y) => Array.from({ length: side }, (_$1, x) => LAYER.frame + frame.fill(x - ox + 48, y - oy - HEADROOM + 48) - 1));
	const colors = paint(grid, config, withItems(paletteOf(config), config), false, false);
	const out = new Uint8ClampedArray(side * side * 4);
	colors.forEach((row, y) => row.forEach((c, x) => {
		if (c) out.set([...rgb(c).map((v, k) => Math.round(v * .55 + [
			20,
			24,
			36
		][k] * .45)), 255], (y * side + x) * 4);
	}));
	return out;
}
/** Under this contrast a guy melts into a ground taken from their own colour; on their accent's they stand off it at `STAND_OFF` or more. */
const PALE = 1.3, STAND_OFF = 1.6;
/**
* A profile picture's ground: the guy's commonest colour that isn't an outline, most of the way to
* white. A pale guy (Snow, Opal, Ice, Cream, Lemon) would melt into that and read as a blank, so
* theirs is a tint of their `accent` instead, deepened toward night until their `body` stands off it.
*/
function groundOf(px, W$1, H$1, body, accent) {
	const counts = new Map();
	for (let i = 0; i < W$1 * H$1; i++) {
		const [r, g, b$1, a] = px.subarray(i * 4, i * 4 + 4);
		if (a < 128 || .2126 * r + .7152 * g + .0722 * b$1 < 60) continue;
		const key = r << 16 | g << 8 | b$1;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const top = [...counts].sort((a, b$1) => b$1[1] - a[1])[0]?.[0] ?? 14540253;
	let ground = mix("#" + top.toString(16).padStart(6, "0"), "#FFFFFF", .72);
	if (contrast(ground, body) < PALE) {
		ground = mix(accent, "#FFFFFF", .25);
		for (let i = 0; i < 12 && contrast(ground, body) < STAND_OFF; i++) ground = mix(ground, "#11151B", .12);
	}
	return [...rgb(ground), 255];
}
/** The scale that brings a profile picture nearest `size` without going over. */
const profileScale = (f, size) => Math.max(1, Math.floor(size / f.width));
/** A still profile picture as a PNG, about `size` across. */
function toProfilePng(spec, size = PROFILE_SIZE) {
	const f = profileFrames(spec);
	return encodePng(f.frames[0], f.width, f.height, profileScale(f, size));
}
/** A moving profile picture as a GIF, about `size` across: Discord takes animated pictures only as GIFs. */
function toProfileGif(spec, size = PROFILE_SIZE, move = "idle") {
	const f = profileFrames(spec, move);
	return encodeGif(f, profileScale(f, size));
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
/**
* The frames in a sprite sheet, with how long each shows: for a game. Left to right, `columns` to a
* row (all of them in one strip by default), then the next row down.
*/
function sheetOf(f, columns = f.frames.length) {
	const cols = Math.max(1, Math.min(columns, f.frames.length)), rows = Math.ceil(f.frames.length / cols);
	const W$1 = f.width * cols, rgba = new Uint8ClampedArray(W$1 * f.height * rows * 4);
	f.frames.forEach((px, k) => {
		const ox = k % cols * f.width, oy = Math.floor(k / cols) * f.height;
		for (let y = 0; y < f.height; y++) rgba.set(px.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((oy + y) * W$1 + ox) * 4);
	});
	return {
		width: W$1,
		height: f.height * rows,
		rgba,
		delays: f.delays,
		columns: cols,
		rows
	};
}
/** How wide a sheet may be at 1×, in pixels, before it wraps onto another row. */
const SHEET_MAX = 2048;
/**
* How many frames to a row on a view's sheet: a move's frames all in one strip, as they always were;
* any other view's as many as fit in `SHEET_MAX` pixels at 1×, then the next row.
*/
function sheetColumns(view, f) {
	return isMove(view) ? f.frames.length : Math.max(1, Math.min(f.frames.length, Math.floor(SHEET_MAX / f.width)));
}
/**
* Bakes and encodes: an animated PNG (`loop`), its first frame (`still`), a sprite sheet (`sheet`,
* `columns` frames to a row, all in one strip by default) or a looping GIF (`gif`).
*/
async function bakedImage(frames, kind, scale$1 = 1, columns) {
	if (kind === "still") return encodePng(frames.frames[0], frames.width, frames.height, scale$1);
	if (kind === "sheet") {
		const s = sheetOf(frames, columns);
		return encodePng(s.rgba, s.width, s.height, scale$1);
	}
	if (kind === "gif") return encodeGif(frames, scale$1);
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
		if (o.n !== void 0) {
			if (typeof o.n !== "string" || !o.n || [...o.n].length > TITLE_MAX || /[\u0000-\u001f\u007f]/.test(o.n)) return null;
			spec.title = o.n;
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
* A view as the Worker serves it and `<lil-guy>` plays it: a move looping (`idle`, `hop`…),
* `still` (his first idle frame), `icon` (his sixteen by sixteen alone, `bakeSquare`), `face` (a
* square of his head and shoulders), `card` (the small card face), `pfp` (a profile picture,
* `profileFrames`), `art` (his big card's window alone, a square: `cardArtPlayer`) and `card-full`
* (the whole big card, `cardInputOf`). Every view but a move has a `-still`: its first frame.
* Null for a view there isn't.
*/
function bakeView(spec, view) {
	if (view === "icon" || view === "face") return bakeSquare(spec, view);
	if (view === "icon-still" || view === "face-still") {
		const f = bakeSquare(spec, view === "icon-still" ? "icon" : "face");
		return {
			...f,
			frames: f.frames.slice(0, 1),
			delays: [LOOP_MS]
		};
	}
	if (view === "card-full") {
		const f = cardFrames(cardInputOf(spec), CARD_FULL_MS);
		return fewerColours(merged(f.width, f.height, f.frames, f.delays));
	}
	if (view === "card-full-still") {
		const card$1 = cardPlayer(cardInputOf(spec));
		return {
			width: card$1.width,
			height: card$1.height,
			frames: [card$1.frame(0)],
			delays: [LOOP_MS]
		};
	}
	if (view === "art" || view === "art-still") {
		const art = cardArtFrames({
			seed: spec.seed,
			parts: spec.parts,
			palette: animateOptions(spec).palette,
			copies: faceSpec(spec).copies,
			grade: spec.grade,
			title: ""
		});
		return view === "art" ? art : {
			...art,
			frames: art.frames.slice(0, 1),
			delays: [LOOP_MS]
		};
	}
	if (view === "card" || view === "card-still") {
		const card$1 = bakeCard(faceSpec(spec));
		return view === "card" ? card$1 : {
			...card$1,
			frames: card$1.frames.slice(0, 1),
			delays: [LOOP_MS]
		};
	}
	if (view === "og") return ogFrames(spec);
	if (view === "pfp" || view === "pfp-still") {
		const p = profileFrames(spec);
		return view === "pfp" ? p : {
			...p,
			frames: p.frames.slice(0, 1),
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
	const emote$1 = /^emote-([a-z]+?)(-still)?$/.exec(view);
	if (emote$1) return emoteFrames(spec, emote$1[1], !emote$1[2]);
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
//#region src/og.ts
/**
* Link previews: what Discord, iMessage, X and the rest show for a shared link, 1200 × 630 and still.
* Each is drawn on a 400 × 210 grid of pixels and scaled up three times, so the guy, the frame and the
* words are one pixel size and stay sharp. The words are m6x11plus, the site's and the card's pixel type.
*
* A guy's preview is his big card turned on its side: a wide window on his own backdrop with him big in
* it, aura and all, and under it a tall panel with his name, his rank in its colour and his rarest trait.
* The site's preview is the same card with a few guys in the window and what lil guys is under them.
*/
/** A link preview's width. */
const OG_WIDTH = 1200;
/** A link preview's height. */
const OG_HEIGHT = 630;
const SCALE = 3, W = OG_WIDTH / SCALE, H = OG_HEIGHT / SCALE;
const hex = (h) => [
	parseInt(h.slice(1, 3), 16),
	parseInt(h.slice(3, 5), 16),
	parseInt(h.slice(5, 7), 16)
];
const mix$1 = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const TABLE = [
	19,
	23,
	38
], PLATE = [
	38,
	34,
	52
], INK = [
	24,
	20,
	31
], IVORY = [
	246,
	240,
	227
];
const QUIET = [
	170,
	166,
	190
], GOLD = [
	245,
	177,
	67
], PLAIN = [
	104,
	118,
	146
];
const SITE = "lilguys.dleclub.com";
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
	"’": [3, [
		0,
		0,
		3,
		3,
		2,
		1,
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
	]]
};
const glyph = (ch) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS["?"];
const wide = (s, size = 1) => ([...s].reduce((w, ch) => w + glyph(ch)[0], 0) - 1) * size;
/** The 400 × 210 grid a preview is drawn on. */
var Grid = class {
	px = new Uint8ClampedArray(W * H * 4);
	set(x, y, c) {
		if (x < 0 || y < 0 || x >= W || y >= H) return;
		const i = (y * W + x) * 4;
		this.px[i] = c[0];
		this.px[i + 1] = c[1];
		this.px[i + 2] = c[2];
		this.px[i + 3] = 255;
	}
	rect(x, y, w, h, c) {
		for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
	}
	/** A box with its corners cut `r` pixels in, the way the card's pixel corners go. */
	box(x, y, w, h, r, c) {
		for (let j = 0; j < h; j++) {
			const k = j < r ? r - j : j >= h - r ? j - (h - r) + 1 : 0;
			for (let i = k; i < w - k; i++) this.set(x + i, y + j, c);
		}
	}
	/** Pixels from a frame (RGBA, w × h), each `s` across; see-through ones left as they are. */
	blit(src, w, h, x, y, s = 1) {
		for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
			const i = (sy * w + sx) * 4;
			if (src[i + 3] < 128) continue;
			for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) this.set(x + sx * s + dx, y + sy * s + dy, [
				src[i],
				src[i + 1],
				src[i + 2]
			]);
		}
	}
	/** Words in the pixel type, each font pixel `size` across, over a hard shadow a pixel down. */
	text(s, x, top, c, size = 1, shadow = INK) {
		const draw = (ox, oy, col) => {
			let cx = ox;
			for (const ch of s) {
				const [adv, rows] = glyph(ch);
				rows.forEach((bits, dy) => {
					for (let dx = 0; bits >> dx; dx++) if (bits & 1 << dx) for (let a = 0; a < size; a++) for (let b$1 = 0; b$1 < size; b$1++) this.set(cx + dx * size + a, oy + dy * size + b$1, col);
				});
				cx += adv * size;
			}
		};
		if (shadow) draw(x, top + size, shadow);
		draw(x, top, c);
	}
	frames() {
		const out = new Uint8ClampedArray(OG_WIDTH * OG_HEIGHT * 4);
		for (let y = 0; y < OG_HEIGHT; y++) {
			const row = (y / SCALE | 0) * W;
			for (let x = 0; x < OG_WIDTH; x++) {
				const i = (row + (x / SCALE | 0)) * 4, o = (y * OG_WIDTH + x) * 4;
				out[o] = this.px[i];
				out[o + 1] = this.px[i + 1];
				out[o + 2] = this.px[i + 2];
				out[o + 3] = 255;
			}
		}
		return {
			width: OG_WIDTH,
			height: OG_HEIGHT,
			frames: [out],
			delays: [1e3]
		};
	}
};
const RIM = 4, WIN_TOP = 8, WIN_H = 128, PANEL_TOP = WIN_TOP + WIN_H + 3;
/** The frame round everything: the table, the card's rim in `rim`, its dark plate, and the window's dark edge. */
function card(g, rim$1) {
	g.rect(0, 0, W, H, TABLE);
	g.box(RIM - 2, RIM - 2, W - (RIM - 2) * 2, H - (RIM - 2) * 2, 4, INK);
	g.box(RIM - 1, RIM - 1, W - (RIM - 1) * 2, H - (RIM - 1) * 2, 3, rim$1);
	g.box(RIM + 1, RIM + 1, W - (RIM + 1) * 2, H - (RIM + 1) * 2, 2, PLATE);
	g.rect(RIM + 2, RIM - 1, W - (RIM + 2) * 2, 1, mix$1(rim$1, IVORY, .45));
	g.rect(7, WIN_TOP - 1, W - 14, WIN_H + 2, INK);
}
/**
* A window `WIN_H` tall across the card, on his backdrop: each row the colour the card's window `art` has
* just inside its edges, so the window reads as his card's. Him five times his size in the middle,
* standing on a soft shadow.
*/
function window$1(g, art, guy) {
	const f = art.frames[0];
	const band$1 = (from, to) => {
		const sum = [
			0,
			0,
			0
		];
		let n = 0;
		for (let y$1 = from; y$1 < to; y$1++) for (const x$1 of [
			4,
			5,
			6,
			art.width - 7,
			art.width - 6,
			art.width - 5
		]) {
			const i = (y$1 * art.width + x$1) * 4;
			sum[0] += f[i];
			sum[1] += f[i + 1];
			sum[2] += f[i + 2];
			n++;
		}
		return [
			sum[0] / n,
			sum[1] / n,
			sum[2] / n
		];
	};
	const top = band$1(3, 14), bottom = band$1(art.height - 14, art.height - 3);
	for (let y$1 = 0; y$1 < WIN_H; y$1++) g.rect(8, WIN_TOP + y$1, W - 16, 1, mix$1(top, bottom, y$1 / (WIN_H - 1)));
	const s = 5, x = Math.round((W - guy.width * s) / 2), y = WIN_TOP + WIN_H - 10 - guy.height * s;
	const feet = y + guy.height * s - 2;
	for (let dy = -2; dy <= 2; dy++) for (let dx = -42; dx <= 42; dx++) {
		if ((dx / 42) ** 2 + (dy / 2.5) ** 2 > 1) continue;
		const px = W / 2 + dx, py = feet + dy, i = (py * W + px) * 4;
		g.set(px, py, [
			g.px[i] * .8,
			g.px[i + 1] * .8,
			g.px[i + 2] * .84
		]);
	}
	g.blit(guy.frames[0], guy.width, guy.height, x, y, s);
}
/** A pill in `c` with dark words, as the card's rank pill is; returns where it ends. */
function pill(g, s, x, top, c) {
	const w = wide(s) + 10;
	g.box(x, top + 1, w, 15, 3, INK);
	g.box(x, top, w, 15, 3, c);
	g.text(s, x + 5, top - 1, INK, 1, null);
	return x + w;
}
/** A guy's link preview: his big card on its side, his name, rank and rarest trait under him. */
function ogFrames(spec) {
	const input = cardInputOf(spec), grade = input.grade ?? -1;
	const rim$1 = grade >= 0 ? hex(GRADES[grade].color) : PLAIN;
	const g = new Grid();
	card(g, rim$1);
	window$1(g, cardArtFrames({
		seed: spec.seed,
		parts: spec.parts,
		palette: animateOptions(spec).palette,
		copies: faceSpec(spec).copies,
		grade,
		title: ""
	}), bakeGuy(spec, "idle"));
	const [rank = "", trait = ""] = input.lines ?? [];
	const name = (input.title || spec.seed).replace(/^~/, "");
	const size = wide(name, 2) <= W - 48 - wide(SITE) ? 2 : 1;
	g.text(name, 16, PANEL_TOP + 2, IVORY, size);
	g.text(SITE, W - 16 - wide(SITE), PANEL_TOP + (size === 2 ? 14 : 2), GOLD);
	const below = PANEL_TOP + (size === 2 ? 37 : 22);
	const end = rank ? pill(g, rank.replace(/★\s*/, ""), 16, below, rim$1) : 16;
	if (trait) g.text(trait, end + 8, below - 1, QUIET);
	return g.frames();
}
/** The site's link preview: the card with `guys` in its window, small guys in their best, and what lil guys is under them. */
function siteOgFrames(guys, line) {
	const g = new Grid();
	card(g, GOLD);
	for (let y = 0; y < WIN_H; y++) g.rect(8, WIN_TOP + y, W - 16, 1, mix$1([
		30,
		36,
		66
	], [
		70,
		62,
		96
	], y / WIN_H));
	const floor = WIN_TOP + WIN_H - 14;
	g.rect(8, floor, W - 16, WIN_TOP + WIN_H - floor, [
		46,
		40,
		66
	]);
	g.rect(8, floor, W - 16, 1, [
		96,
		86,
		128
	]);
	const baked = guys.map((s) => bakeGuy(s, "idle"));
	const sizes = baked.map((_, i) => i === baked.length >> 1 ? 4 : 3);
	const total = baked.reduce((w, b$1, i) => w + b$1.width * sizes[i], 0), gap = Math.floor((W - 40 - total) / Math.max(1, baked.length - 1));
	let x = 20;
	baked.forEach((b$1, i) => {
		const s = sizes[i];
		for (let dx = -b$1.width * s * .35; dx <= b$1.width * s * .35; dx++) g.set(Math.round(x + b$1.width * s / 2 + dx), floor + 2, [
			32,
			28,
			46
		]);
		g.blit(b$1.frames[0], b$1.width, b$1.height, x, floor + 2 - b$1.height * s, s);
		x += b$1.width * s + gap;
	});
	g.text("Lil Guys", 16, PANEL_TOP + 2, IVORY, 2);
	g.text(SITE, W - 16 - wide(SITE), PANEL_TOP + 14, GOLD);
	if (wide(line) > W - 32) throw new Error(`The site's line is too long for its preview: ${line}`);
	g.text(line, 16, PANEL_TOP + 36, QUIET);
	return g.frames();
}

//#endregion
//#region src/crowd.ts
/** The sizes a crowd sprite comes in, in pixels square. Appended to, never reordered. */
const CROWD_SIZES = [
	16,
	10,
	8,
	6,
	4,
	2,
	14,
	12,
	5,
	3
];
/** How each shrunk size is made: the inside's longer side, and whether the outline, eyes and mouth go back. */
const MAKE = {
	14: {
		inner: 12,
		ring: true,
		eyes: true,
		mouth: true
	},
	12: {
		inner: 10,
		ring: true,
		eyes: true,
		mouth: true
	},
	10: {
		inner: 8,
		ring: true,
		eyes: true,
		mouth: true
	},
	8: {
		inner: 6,
		ring: true,
		eyes: true,
		mouth: true
	},
	6: {
		inner: 4,
		ring: true,
		eyes: true,
		mouth: false
	},
	4: {
		inner: 3,
		ring: false,
		eyes: false,
		mouth: false
	},
	2: {
		inner: 2,
		ring: false,
		eyes: false,
		mouth: false
	}
};
/** Tokens that make a face; they never decide a cell's colour, the eyes and mouth go back on their own. */
const FACE = new Set([
	T.EYE,
	T.WHITE,
	T.MOUTH,
	T.TONGUE,
	T.BLUSH
]);
/** The face's features, which 14 and 12 keep cell for cell. */
const FEATURE = new Set([
	T.EYE,
	T.WHITE,
	T.MOUTH,
	T.TONGUE
]);
const SIDES = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
const ROUND = [
	...SIDES,
	[1, 1],
	[-1, 1],
	[1, -1],
	[-1, -1]
];
function shineOf(config) {
	const grades = Object.values(config.owned ?? {}).filter(Boolean).map((o) => GRADES.findIndex((g) => g.id === gradeOf(o).id));
	const grade = Math.max(-1, ...grades, config.founder ? 4 : -1);
	return grade >= 2 ? {
		grade,
		color: GRADES[grade].color
	} : null;
}
/**
* Whether a guy stands out in a crowd, and in what colour: the grade of the best copy they wear, from
* Prized up, or Grail gold for the founder. Everyday and Special copies, and nothing worn, don't.
*/
function crowdShine(spec) {
	return shineOf(dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed));
}
/**
* A guy's crowd colours without composing them (cheap): body, eyes and outline from their palette,
* and whether they stand out. A crowd draws a stand-in from these until the real sprite is made.
*/
function crowdBase(spec) {
	const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
	const base = spec.palette !== void 0 ? paletteOf({
		...config,
		palette: spec.palette
	}) : paletteOf(config);
	const colors = base.colors;
	return {
		body: colors[T.BODY],
		eye: colors[T.EYE],
		ink: colors[T.OUTLINE],
		shine: shineOf(config)
	};
}
/** A guy's crowd look: composed and painted once, for any number of sprites after. */
function crowdLook(spec) {
	const config = dress(resolve(spec.seed, spec.parts), { equip: spec.equip }, spec.seed);
	const grid = compose({
		...config,
		frame: void 0,
		aura: void 0,
		buddy: void 0
	});
	const base = spec.palette !== void 0 ? paletteOf({
		...config,
		palette: spec.palette
	}) : paletteOf(config);
	const palette$1 = withItems(base, config), colors = palette$1.colors;
	const painted$2 = paint(grid, {
		...config,
		aura: void 0
	}, palette$1, false, true);
	const side = grid.length, n = side * side, ink = colors[T.OUTLINE];
	const inks = [""], index = new Map();
	const at = (c) => {
		if (!c) return 0;
		let i = index.get(c);
		if (i === void 0) {
			i = inks.length;
			inks.push(c);
			index.set(c, i);
		}
		return i;
	};
	const look = {
		side,
		tokens: new Uint8Array(n),
		outline: new Uint8Array(n),
		painted: new Uint8Array(n),
		shrunk: new Uint8Array(n),
		face: new Uint8Array(n),
		inks,
		ink,
		eye: colors[T.EYE],
		mouth: colors[T.MOUTH],
		body: colors[T.BODY],
		shine: shineOf(config),
		aura: auraById(config.aura)?.colors ?? null
	};
	for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
		const t = grid[y][x], i = y * side + x;
		look.tokens[i] = t;
		look.outline[i] = t && (t === T.OUTLINE || colors[t] !== void 0 && colors[t] === ink) ? 1 : 0;
		look.painted[i] = at(painted$2[y][x]);
		look.shrunk[i] = at(painted$2[y][x] ?? colors[t]);
		if (FEATURE.has(t)) look.face[i] = t === T.MOUTH || t === T.TONGUE ? 2 : 1;
	}
	const f = faceOf(config), mark = (x, y, v) => {
		if (x >= 0 && y >= 0 && x < side && y < side && grid[y][x] && !look.face[y * side + x]) look.face[y * side + x] = v;
	};
	for (const e of f.eyes) for (let y = f.top; y <= f.line; y++) for (let x = e.left; x <= e.right; x++) mark(x, y, 1);
	if (f.eyes.length) {
		const centre = (f.eyes[0].left + f.eyes[f.eyes.length - 1].right + 1) / 2, w = f.mouth.reduce((m, r) => Math.max(m, r.length), 0), mx = Math.floor(centre - w / 2);
		f.mouth.forEach((row, dy) => row.forEach((t, dx) => {
			if (t) mark(mx + dx, f.mouthTop + dy, 2);
		}));
	}
	return look;
}
/**
* The guy as they stand in a crowd, `size` pixels square, bottom-centred. A guy who stands out
* (`crowdShine`) is outlined in their grade's colour where they have an outline, and further back,
* where they are only colours, their top cell takes it. `shine: false` leaves that off.
*/
function crowdSprite(spec, size, options = {}) {
	return crowdSpriteOf(crowdLook(spec), size, options);
}
/** `crowdSprite` from a look already worked out (`crowdLook`), for many sizes of one guy. */
function crowdSpriteOf(look, size, options = {}) {
	const S = look.side;
	const full = () => Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_$1, x) => look.inks[look.painted[y * S + x]] || null));
	const drawn = size === 16 ? full() : size === 5 || size === 3 ? far(look, size) : (size === 14 || size === 12 ? carve(look, full(), size) : null) ?? shrink(look, MAKE[size]);
	const lit = drawn.map((row) => row.some(Boolean)), first = lit.indexOf(true), last = lit.lastIndexOf(true);
	const cells = first < 0 ? [] : drawn.slice(first, last + 1);
	const shine = options.shine === false ? null : look.shine;
	if (shine && cells.length) {
		const aura = look.aura;
		const edge = (i, j) => aura ? aura[(i + j) % aura.length] : shine.color;
		if (size >= 6) cells.forEach((row, j) => {
			for (let i = 0; i < row.length; i++) if (row[i] === look.ink && isEdge(cells, j, i)) row[i] = edge(i, j);
		});
		else {
			const top = cells[0], mid = top.findIndex(Boolean) + Math.floor(top.filter(Boolean).length / 2);
			top[Math.max(0, mid)] = aura ? aura[0] : shine.color;
		}
	}
	const rgba = new Uint8ClampedArray(size * size * 4);
	const h = cells.length, w = cells[0]?.length ?? 0;
	const ox = Math.floor((size - w) / 2), oy = size - h;
	cells.forEach((row, j) => row.forEach((c, i) => {
		const x = ox + i, y = oy + j;
		if (!c || x < 0 || y < 0 || x >= size || y >= size) return;
		rgba.set([
			parseInt(c.slice(1, 3), 16),
			parseInt(c.slice(3, 5), 16),
			parseInt(c.slice(5, 7), 16),
			255
		], (y * size + x) * 4);
	}));
	return {
		size,
		rgba
	};
}
/**
* Many guys at one size on one sheet, `columns` to a row, in the order given: guy `n` is the cell at
* column `n % columns`, row `floor(n / columns)`. A crowd draws each from it with one copy.
*/
function crowdSheet(specs, size, columns = 64, options = {}) {
	const cols = Math.max(1, Math.min(columns, specs.length)), rows = Math.ceil(specs.length / cols);
	const width = cols * size, height = rows * size, rgba = new Uint8ClampedArray(width * height * 4);
	specs.forEach((spec, n) => {
		const s = crowdSprite(spec, size, options), ox = n % cols * size, oy = Math.floor(n / cols) * size;
		for (let y = 0; y < size; y++) rgba.set(s.rgba.subarray(y * size * 4, (y + 1) * size * 4), ((oy + y) * width + ox) * 4);
	});
	return {
		width,
		height,
		columns: cols,
		rgba
	};
}
/** Whether an outline cell is on the outside edge (beside nothing), so lines inside keep their ink. */
function isEdge(cells, j, i) {
	return SIDES.some(([dx, dy]) => !cells[j + dy]?.[i + dx]);
}
/** A colour `amount` of the way to black. */
function darker(c, amount) {
	const n = parseInt(c.slice(1, 7), 16), f = 1 - amount;
	return "#" + [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	].map((v) => Math.round(v * f).toString(16).padStart(2, "0")).join("");
}
/** The inside's bounds (everything but outline), or null for an empty guy. */
function insideOf(look) {
	const S = look.side;
	let x0 = S, x1 = -1, y0 = S, y1 = -1;
	for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
		const i = y * S + x;
		if (look.tokens[i] && !look.outline[i]) {
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
			y0 = Math.min(y0, y);
			y1 = Math.max(y1, y);
		}
	}
	return x1 < 0 ? null : {
		x0,
		x1,
		y0,
		y1
	};
}
/** The commonest non-face colour of the inside between rows `from` and `to` (fractions of its height). */
function commonest(look, box, from, to) {
	const S = look.side, h = box.y1 - box.y0 + 1, count$1 = new Map();
	for (let y = box.y0 + Math.floor(h * from); y <= Math.min(box.y1, box.y0 + Math.ceil(h * to) - 1); y++) for (let x = box.x0; x <= box.x1; x++) {
		const i = y * S + x, t = look.tokens[i];
		if (!t || look.outline[i] || FACE.has(t) || !look.shrunk[i]) continue;
		count$1.set(look.shrunk[i], (count$1.get(look.shrunk[i]) ?? 0) + 1);
	}
	let best = 0, most = 0;
	for (const [c, v] of count$1) if (v > most) {
		best = c;
		most = v;
	}
	return best ? look.inks[best] : void 0;
}
/**
* A far guy, for the back of a big crowd: a small shape in the guy's own colours, so a packed row
* reads as a line of heads. At 5: their top in the colour of their top (a hat when it covers most of
* it), their body below with two eyes a cell apart, and a band in a darker shade of the body
* underneath. At 3: their top over a row of body and a row of the darker shade. The top row follows
* their outline (ears at the corners, a hat's point in the middle, a flat head across), so no two
* rows of them are the same.
*/
function far(look, size) {
	const box = insideOf(look);
	if (!box) return [[]];
	const body = commonest(look, box, .35, .85) ?? look.body;
	const top = commonest(look, box, 0, .3) ?? body, shade$1 = darker(body, .35);
	const crown = crownOf(look, size), head = crown.some(Boolean) ? crown.map((on) => on ? top : null) : size === 3 ? [
		null,
		top,
		null
	] : [
		null,
		top,
		top,
		top,
		null
	];
	if (size === 3) return [
		head,
		[
			body,
			body,
			body
		],
		[
			shade$1,
			shade$1,
			shade$1
		]
	];
	return [
		head,
		[
			top,
			top,
			top,
			top,
			top
		],
		[
			body,
			look.eye,
			body,
			look.eye,
			body
		],
		[
			body,
			body,
			body,
			body,
			body
		],
		[
			null,
			shade$1,
			shade$1,
			shade$1,
			null
		]
	];
}
/** Which of `n` columns across the guy their top fills: the drawn cells in their top fifth, by column band. */
function crownOf(look, n) {
	const S = look.side;
	let x0 = S, x1 = -1, y0 = S;
	for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (look.painted[y * S + x]) {
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		y0 = Math.min(y0, y);
	}
	if (x1 < 0) return Array(n).fill(false);
	const w = x1 - x0 + 1, rows = 3;
	return Array.from({ length: n }, (_, i) => {
		const a = x0 + Math.floor(w * i / n), b$1 = x0 + Math.floor(w * (i + 1) / n);
		let on = 0;
		for (let y = y0; y < y0 + rows; y++) for (let x = a; x < Math.max(b$1, a + 1); x++) if (look.painted[y * S + x]) on++;
		return on >= Math.max(b$1 - a, 1) * rows * .5;
	});
}
/**
* A guy at 14 or 12 with their face as drawn at 16: rows and columns of the rest of them that most
* repeat a neighbour are taken out until they fit (columns in mirrored pairs, so a guy drawn
* symmetric stays so), never one through the eyes or mouth, nor one that would close the gap between
* two features. Null when the face leaves too little to take out.
*/
function carve(look, cells, size) {
	const S = look.side;
	let feature = Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_$1, x) => look.face[y * S + x] > 0));
	const lit = cells.map((r) => r.some(Boolean)), y0 = lit.indexOf(true), y1 = lit.lastIndexOf(true);
	if (y0 < 0) return null;
	let x0 = S, x1 = -1;
	for (const row of cells) row.forEach((c, x) => {
		if (c) {
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
		}
	});
	cells = cells.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
	feature = feature.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
	const faceRows = feature.map((r) => r.some(Boolean)), f0 = faceRows.indexOf(true);
	const tall = narrow(turn(cells), turn(feature), size, (x) => f0 >= 0 && x < f0 ? .6 : 0, false);
	if (!tall) return null;
	return narrow(turn(tall[0]), turn(tall[1]), size, () => 0, true)?.[0] ?? null;
}
const turn = (grid) => (grid[0] ?? []).map((_, x) => grid.map((r) => r[x]));
/**
* Takes seams down `cells` (one cell a row, moving at most one across from row to row) until it is
* `size` wide, the cheapest first: a cell costs nothing where it repeats a neighbour, and a seam that
* steps sideways costs what it puts out of line. Never through a feature, nor the last cell between
* two. `pairs` takes them a seam each side of the middle where it can, so a symmetric guy stays so;
* `extra(x)` adds to a column's cost.
*/
function narrow(cells, feature, size, extra, pairs) {
	const h = cells.length;
	while (cells[0].length > size) {
		const w = cells[0].length, at = (y, x) => x < 0 || x >= w ? null : cells[y][x];
		const rowsWith = feature.map((r) => r.some(Boolean)), r0 = rowsWith.indexOf(true), r1 = rowsWith.lastIndexOf(true);
		const clear = Array.from({ length: w }, (_, x) => {
			for (let y = r0; y <= r1; y++) if (feature[y][x]) return false;
			return true;
		});
		const c0 = clear.indexOf(false), c1 = clear.lastIndexOf(false);
		const open = clear.map((c, x) => c && (x < c0 || x > c1 || clear[x - 1] || clear[x + 1]));
		const blocked = (y, x) => r0 >= 0 && y >= r0 && y <= r1 && !open[x];
		const seam = (lo, hi) => {
			const n = hi - lo + 1, M$1 = new Float64Array(h * n).fill(Infinity), from = new Int8Array(h * n);
			for (let y = 0; y < h; y++) for (let x$1 = lo; x$1 <= hi; x$1++) {
				if (blocked(y, x$1)) continue;
				const c = cells[y][x$1], e = (c === at(y, x$1 - 1) || c === at(y, x$1 + 1) ? 0 : 1) + extra(x$1);
				if (!y) {
					M$1[x$1 - lo] = e;
					continue;
				}
				let best$1 = M$1[(y - 1) * n + x$1 - lo], step$1 = 0;
				if (x$1 + 1 <= hi) {
					const v = M$1[(y - 1) * n + x$1 + 1 - lo] + (cells[y - 1][x$1] !== at(y, x$1 + 1) ? 1 : .25);
					if (v < best$1) {
						best$1 = v;
						step$1 = 1;
					}
				}
				if (x$1 - 1 >= lo) {
					const v = M$1[(y - 1) * n + x$1 - 1 - lo] + (cells[y - 1][x$1] !== at(y, x$1 - 1) ? 1 : .25);
					if (v < best$1) {
						best$1 = v;
						step$1 = -1;
					}
				}
				M$1[y * n + x$1 - lo] = best$1 + e;
				from[y * n + x$1 - lo] = step$1;
			}
			let x = -1, best = Infinity;
			for (let i = 0; i < n; i++) if (M$1[(h - 1) * n + i] < best) {
				best = M$1[(h - 1) * n + i];
				x = i;
			}
			if (x < 0) return null;
			const path = Array(h);
			for (let y = h - 1; y >= 0; y--) {
				path[y] = x + lo;
				x += from[y * n + x];
			}
			return path;
		};
		const half = Math.floor(w / 2), cut = [];
		if (pairs && w - size >= 2) {
			const right = seam(w - half, w - 1), left = seam(0, half - 1);
			if (left && right) cut.push(right, left);
		}
		if (!cut.length) {
			const one = seam(0, w - 1);
			if (!one) return null;
			cut.push(one);
		}
		for (const path of cut) for (let y = 0; y < h; y++) {
			cells[y].splice(path[y], 1);
			feature[y].splice(path[y], 1);
		}
	}
	return [cells, feature];
}
function shrink(look, make) {
	const S = look.side, ink = look.ink, tok = (x, y) => x >= 0 && y >= 0 && x < S && y < S ? look.tokens[y * S + x] : 0;
	const box = insideOf(look);
	if (!box) return [[]];
	const { x0, y0 } = box, bw = box.x1 - x0 + 1, bh = box.y1 - y0 + 1, k = Math.max(bw, bh) / make.inner;
	const w = Math.max(1, Math.round(bw / k)), h = Math.max(1, Math.round(bh / k));
	const P = make.ring ? 1 : 0, W$1 = w + 2 * P, H$1 = h + 2 * P;
	const out = Array.from({ length: H$1 }, () => Array(W$1).fill(null));
	const ox = x0 + (bw - w * k) / 2, oy = y0 + (bh - h * k) / 2;
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
		const sx0 = ox + i * k, sx1 = sx0 + k, sy0 = oy + j * k, sy1 = sy0 + k;
		const weight = new Map();
		let cover = 0;
		for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
			const a = (Math.min(x + 1, sx1) - Math.max(x, sx0)) * (Math.min(y + 1, sy1) - Math.max(y, sy0));
			const t = tok(x, y);
			if (a <= 0 || !t || look.outline[y * S + x]) continue;
			cover += a;
			const c = look.inks[look.shrunk[y * S + x]];
			if (!FACE.has(t) && c) weight.set(c, (weight.get(c) ?? 0) + a);
		}
		if (cover < k * k * .45) continue;
		let best = look.body, most = -1;
		for (const [c, v] of weight) if (v > most) {
			best = c;
			most = v;
		}
		out[j + P][i + P] = best;
	}
	const inside$1 = out.map((row) => row.map(Boolean));
	const spot = (cells) => {
		const mx = cells.reduce((s, c) => s + c[0], 0) / cells.length + .5, my = cells.reduce((s, c) => s + c[1], 0) / cells.length + .5;
		return [Math.min(w - 1, Math.max(0, Math.floor((mx - ox) / k))) + P, Math.min(h - 1, Math.max(0, Math.floor((my - oy) / k))) + P];
	};
	const parts = (want) => {
		const seen = new Set(), found = [];
		for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
			if (!want(tok(x, y), y * S + x) || seen.has(y * S + x)) continue;
			const stack = [[x, y]], cells = [];
			seen.add(y * S + x);
			while (stack.length) {
				const [cx, cy] = stack.pop();
				cells.push([cx, cy]);
				for (const [dx, dy] of ROUND) {
					const nx = cx + dx, ny = cy + dy;
					if (nx >= 0 && ny >= 0 && nx < S && ny < S && want(tok(nx, ny), ny * S + nx) && !seen.has(ny * S + nx)) {
						seen.add(ny * S + nx);
						stack.push([nx, ny]);
					}
				}
			}
			found.push(cells);
		}
		return found;
	};
	const taken = new Set();
	if (make.eyes) {
		let eye = look.eye, found = parts((t) => t === T.EYE);
		if (!found.length) {
			const drawn = (i) => look.face[i] === 1 && !!look.painted[i] && look.inks[look.painted[i]] !== look.body;
			found = parts((_, i) => drawn(i));
			const count$1 = new Map();
			for (const cells of found) for (const [x, y] of cells) count$1.set(look.painted[y * S + x], (count$1.get(look.painted[y * S + x]) ?? 0) + 1);
			let most = 0;
			for (const [c, n] of count$1) if (n > most) {
				most = n;
				eye = look.inks[c];
			}
		}
		const spots = found.sort((a, b$1) => b$1.length - a.length).slice(0, 2).map(spot).sort((a, b$1) => a[0] - b$1[0]);
		if (spots.length === 2 && Math.abs(spots[0][1] - spots[1][1]) <= 1 && spots[1][0] - spots[0][0] < 2) {
			const width = (j) => inside$1[j] ? inside$1[j].lastIndexOf(true) - inside$1[j].indexOf(true) + 1 : 0;
			let row = Math.max(spots[0][1], spots[1][1]);
			if (width(row) < 3) row = [row + 1, row - 1].find((j) => width(j) >= 3) ?? row;
			spots[0][1] = spots[1][1] = row;
			const lo = inside$1[row].indexOf(true), hi = inside$1[row].lastIndexOf(true);
			while (spots[1][0] - spots[0][0] < 2) if (spots[0][0] - 1 >= lo && spots[0][0] - lo >= hi - spots[1][0]) spots[0][0]--;
			else if (spots[1][0] + 1 <= hi) spots[1][0]++;
			else if (spots[0][0] - 1 >= lo) spots[0][0]--;
			else break;
		}
		for (const [i, j] of spots) if (inside$1[j]?.[i]) {
			out[j][i] = eye;
			taken.add(`${i},${j}`);
		}
	}
	if (make.mouth) {
		const mouth = parts((t) => t === T.MOUTH || t === T.TONGUE).sort((a, b$1) => b$1.length - a.length)[0];
		const near = (i, j) => [...taken].some((t) => {
			const [a, b$1] = t.split(",").map(Number);
			return Math.abs(a - i) <= 1 && Math.abs(b$1 - j) <= 1;
		});
		if (mouth) {
			let [i, j] = spot(mouth);
			if (near(i, j)) j++;
			if (inside$1[j]?.[i] && !near(i, j)) out[j][i] = look.mouth;
		}
	}
	if (make.ring) {
		for (let j = 0; j < H$1; j++) for (let i = 0; i < W$1; i++) if (!inside$1[j][i] && SIDES.some(([dx, dy]) => inside$1[j + dy]?.[i + dx])) out[j][i] = ink;
	}
	return out;
}

//#endregion
//#region src/crowd-render.ts
/** Every crowd sprite sheet, so a test can tell them from other canvases. */
const sheetCanvases = new WeakSet();
const COLS = 64, MAX_ROWS = 64, CELLS = COLS * MAX_ROWS;
const TILE = 96, WAVE_MS = 5600, HOP_MS = 400, ARRIVE_MS = 500, SLIDE_MS = 420, FADE_MS = 600;
/** Hops at once, past which a big crowd's chatter waits its turn (a spotlight's and arrivals still go). */
const HOP_CAP = 24;
const BAYER$1 = [
	0,
	8,
	2,
	10,
	12,
	4,
	14,
	6,
	3,
	11,
	1,
	9,
	15,
	7,
	13,
	5
];
const rgbOf = (c) => {
	const n = parseInt(c.slice(1, 7), 16);
	return [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	];
};
const hexOf = (r, g, b$1) => "#" + [
	r,
	g,
	b$1
].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/** How light a colour is, 0 to 1. */
const lightness = (c) => {
	const [r, g, b$1] = rgbOf(c);
	return (.299 * r + .587 * g + .114 * b$1) / 255;
};
/** A colour through a tint. */
function tinted(c, t) {
	if (!t || !t.amount && !t.shade) return c;
	const [r, g, b$1] = rgbOf(c), [hr, hg, hb] = rgbOf(t.toward), a = t.amount, f = 1 - t.shade;
	return hexOf((r + (hr - r) * a) * f, (g + (hg - g) * a) * f, (b$1 + (hb - b$1) * a) * f);
}
const meets = (a, b$1) => a[0] < b$1[0] + b$1[2] && b$1[0] < a[0] + a[2] && a[1] < b$1[1] + b$1[3] && b$1[1] < a[1] + a[3];
/**
* A stand-in for a guy whose sprite isn't made yet: a round shape in their body colour, outlined from
* 6 up, two eyes a cell apart, and the far shapes' darker band underneath.
*/
function standIn(size, base) {
	const shade$1 = tinted(base.body, {
		toward: "#000000",
		amount: 0,
		shade: .35
	}), b$1 = base.body, e = base.eye;
	if (size <= 2) return [[b$1, b$1], [shade$1, shade$1]];
	if (size === 3) return [
		[
			null,
			b$1,
			null
		],
		[
			b$1,
			b$1,
			b$1
		],
		[
			shade$1,
			shade$1,
			shade$1
		]
	];
	if (size <= 5) return [
		[
			null,
			b$1,
			b$1,
			b$1,
			null
		],
		[
			b$1,
			b$1,
			b$1,
			b$1,
			b$1
		],
		[
			b$1,
			e,
			b$1,
			e,
			b$1
		],
		[
			b$1,
			b$1,
			b$1,
			b$1,
			b$1
		],
		[
			null,
			shade$1,
			shade$1,
			shade$1,
			null
		]
	];
	const w = Math.max(4, Math.round(size * .8)), h = Math.max(4, Math.round(size * .78));
	const out = Array.from({ length: h }, () => Array(w).fill(null));
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
		const u = (i + .5) / w * 2 - 1, v = (j + .5) / h * 2 - 1;
		if (u * u + v * v * .8 <= 1.05) out[j][i] = b$1;
	}
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (out[j][i] && [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	].some(([dx, dy]) => !out[j + dy]?.[i + dx])) out[j][i] = base.ink;
	const ey = Math.round(h * .42), gap = Math.max(1, Math.round(w * .2)), mid = Math.floor(w / 2);
	if (out[ey]) {
		out[ey][mid - 1 - Math.floor(gap / 2)] = e;
		out[ey][mid + Math.ceil(gap / 2)] = e;
	}
	return out;
}
/** The renderer: guys, their sprites, the baked picture and the frame loop. */
function createRender(canvas, options) {
	const ctx = canvas.getContext("2d");
	const guys = new Map();
	let devW = 1, devH = 1, dpr = 1;
	let scene;
	let bySeat = [];
	let biggest = 1, standTop = 0, standBottom = 0, farBig = 0, farBottom = 0, nearTop = Infinity, rowOf = new Int32Array(0), placeOf = new Int32Array(0), rowTop = [], rowBottom = [], rowXs = [], rowBig = [];
	let still$1 = document.createElement("canvas"), stillCtx = still$1.getContext("2d"), stillPainted = false;
	let stale = "all", whole = true;
	let building = null, wanted = null;
	let fade = null;
	let tintKey = "";
	let slide = null;
	let waving = !!options.wave, waveStart = 0, frame = 0, gone = false, lastFrame = 0;
	let lit = null;
	const moving = new Set(), rare = new Set();
	const sheets = new Map(), stand = new Map();
	const restless = new Set();
	let shown = [];
	let queue = [], made = 0;
	const queued = new Set();
	const code = (size, band$2) => size * 64 + band$2;
	function sheetsOf(size) {
		let l = sheets.get(size);
		if (!l) sheets.set(size, l = []);
		return l;
	}
	function newSheet(size, rows) {
		const c = document.createElement("canvas");
		c.width = COLS * size;
		c.height = rows * size;
		sheetCanvases.add(c);
		const data = new Uint8ClampedArray(c.width * c.height * 4);
		return {
			canvas: c,
			ctx: c.getContext("2d"),
			size,
			data,
			image: new ImageData(data, c.width, c.height),
			rows,
			next: 0,
			free: [],
			used: 0,
			ext: new Uint16Array(CELLS),
			arm: new Uint16Array(CELLS),
			dirty: [
				Infinity,
				Infinity,
				-1,
				-1
			]
		};
	}
	/** A sheet with room for more rows of cells (it starts small; a crowd of one size fills more). */
	function grow(s) {
		const rows = Math.min(MAX_ROWS, s.rows * 2), data = new Uint8ClampedArray(s.canvas.width * rows * s.size * 4);
		data.set(s.data);
		s.canvas.height = rows * s.size;
		s.data = data;
		s.image = new ImageData(data, s.canvas.width, s.canvas.height);
		s.rows = rows;
		s.dirty = [
			0,
			0,
			s.canvas.width,
			s.canvas.height
		];
	}
	function alloc(size) {
		const list = sheetsOf(size);
		for (let n$1 = 0; n$1 < list.length; n$1++) {
			const s$1 = list[n$1];
			if (!s$1) continue;
			if (s$1.free.length) {
				s$1.used++;
				return n$1 * CELLS + s$1.free.pop();
			}
			if (s$1.next < CELLS) {
				if (s$1.next >= s$1.rows * COLS) grow(s$1);
				s$1.used++;
				return n$1 * CELLS + s$1.next++;
			}
		}
		let n = list.indexOf(null);
		if (n < 0) n = list.length;
		const s = list[n] = newSheet(size, 2);
		s.used = 1;
		s.next = 1;
		return n * CELLS;
	}
	/** Gives a cell back; a sheet nobody draws from any more goes. */
	function release(size, id) {
		const list = sheetsOf(size), n = Math.floor(id / CELLS), s = list[n];
		if (!s) return;
		s.free.push(id % CELLS);
		if (--s.used <= 0) list[n] = null;
	}
	/** Writes a sprite into its cell, tinted, and notes its extent and where its arms go. */
	function put$1(size, id, rgba, tint) {
		const s = sheetsOf(size)[Math.floor(id / CELLS)], cell = id % CELLS, cx = cell % COLS * size, cy = Math.floor(cell / COLS) * size, W$1 = s.canvas.width;
		let left = size, right = -1, top = size;
		const [hr, hg, hb] = tint ? rgbOf(tint.toward) : [
			0,
			0,
			0
		], a = tint?.amount ?? 0, f = 1 - (tint?.shade ?? 0), d = s.data;
		const lefts = new Int8Array(size).fill(-1), rights = new Int8Array(size).fill(-1);
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const o = (y * size + x) * 4, p = ((cy + y) * W$1 + cx + x) * 4;
			if (!rgba[o + 3]) {
				d[p + 3] = 0;
				continue;
			}
			if (x < left) left = x;
			if (x > right) right = x;
			if (y < top) top = y;
			if (lefts[y] < 0) lefts[y] = x;
			rights[y] = x;
			d[p] = (rgba[o] + (hr - rgba[o]) * a) * f;
			d[p + 1] = (rgba[o + 1] + (hg - rgba[o + 1]) * a) * f;
			d[p + 2] = (rgba[o + 2] + (hb - rgba[o + 2]) * a) * f;
			d[p + 3] = 255;
		}
		s.ext[cell] = right < 0 ? 0 : left | right << 4 | top << 8 | 4096;
		if (right >= 0 && size >= 6) {
			const sy = Math.min(size - 1, top + Math.round((size - top) * .45));
			let l = size, r = -1;
			for (let y = top; y <= sy; y++) if (lefts[y] >= 0) {
				l = Math.min(l, lefts[y]);
				r = Math.max(r, rights[y]);
			}
			s.arm[cell] = l | r << 4 | sy << 8 | 4096;
		} else s.arm[cell] = 0;
		const dirty = s.dirty;
		dirty[0] = Math.min(dirty[0], cx);
		dirty[1] = Math.min(dirty[1], cy);
		dirty[2] = Math.max(dirty[2], cx + size);
		dirty[3] = Math.max(dirty[3], cy + size);
	}
	/** Sends a sheet's changed pixels to its canvas, once, before anything draws from it. */
	function upload(s) {
		const [x0, y0, x1, y1] = s.dirty;
		if (x1 <= x0) return;
		s.ctx.putImageData(s.image, 0, 0, x0, y0, x1 - x0, y1 - y0);
		s.dirty = [
			Infinity,
			Infinity,
			-1,
			-1
		];
	}
	function uploadAll() {
		for (const list of sheets.values()) for (const s of list) if (s) upload(s);
	}
	function rgbaOf(cells, size) {
		const rgba = new Uint8ClampedArray(size * size * 4), h = cells.length, w = cells[0]?.length ?? 0, ox = Math.floor((size - w) / 2), oy = size - h;
		cells.forEach((row, j) => row.forEach((c, i) => {
			if (c) rgba.set([...rgbOf(c), 255], ((oy + j) * size + ox + i) * 4);
		}));
		return rgba;
	}
	/** The sheet cell a guy is drawn from in a seat: their own sprite, else a stand-in in their colours. */
	function cellOf(g, seat) {
		const s = scene.seats[seat], band$2 = scene.bands[seat], c = code(s.size, band$2), own = g.cells.get(c);
		if (own !== void 0) return own;
		const key = `${c}${g.base.body}${g.base.eye}${g.base.ink}`;
		let at = stand.get(key);
		if (!at) {
			at = [s.size, alloc(s.size)];
			put$1(s.size, at[1], rgbaOf(standIn(s.size, g.base), s.size), scene.tints[band$2]);
			stand.set(key, at);
		}
		return at[1];
	}
	function want(g) {
		if (g.seat < 0 || g.seat >= scene.seats.length || queued.has(g)) return;
		const s = scene.seats[g.seat];
		if (!g.cells.has(code(s.size, scene.bands[g.seat]))) {
			queued.add(g);
			queue.push(g);
		}
	}
	function make(g) {
		queued.delete(g);
		if (guys.get(g.key) !== g || g.seat < 0 || g.seat >= scene.seats.length) return;
		const s = scene.seats[g.seat], band$2 = scene.bands[g.seat], c = code(s.size, band$2);
		if (g.cells.has(c)) return;
		g.look ??= crowdLook(g.spec);
		const id = alloc(s.size);
		put$1(s.size, id, crowdSpriteOf(g.look, s.size).rgba, scene.tints[band$2]);
		g.cells.set(c, id);
		if (!moving.has(g)) restIn(g.seat);
	}
	function forget(g, keep) {
		for (const [c, id] of g.cells) if (c !== keep) {
			release(Math.floor(c / 64), id);
			g.cells.delete(c);
		}
	}
	function sheetOf$1(size, id) {
		const s = sheetsOf(size)[Math.floor(id / CELLS)];
		if (s.dirty[2] > s.dirty[0]) upload(s);
		return s;
	}
	function blit(target, size, id, x, y, w = size) {
		const cell = id % CELLS;
		target.drawImage(sheetOf$1(size, id).canvas, cell % COLS * size, Math.floor(cell / COLS) * size, size, size, x, y, w, w);
	}
	const extOf = (size, id) => sheetsOf(size)[Math.floor(id / CELLS)].ext[id % CELLS];
	const armOf = (size, id) => sheetsOf(size)[Math.floor(id / CELLS)].arm[id % CELLS];
	function index() {
		const n = scene.seats.length;
		rowOf = new Int32Array(n).fill(-1);
		placeOf = new Int32Array(n);
		rowTop = [];
		rowBottom = [];
		rowXs = [];
		rowBig = [];
		scene.rows.forEach((row, r) => {
			let top = Infinity, bottom = -Infinity, big = 0;
			const xs = new Float64Array(row.length);
			row.forEach((i, p) => {
				const s = scene.seats[i];
				rowOf[i] = r;
				placeOf[i] = p;
				xs[p] = s.x;
				top = Math.min(top, s.y);
				bottom = Math.max(bottom, s.y + s.size);
				big = Math.max(big, s.size);
			});
			rowTop.push(top);
			rowBottom.push(bottom);
			rowXs.push(xs);
			rowBig.push(big);
		});
		bySeat = Array(n);
		for (const g of guys.values()) if (g.seat >= 0 && g.seat < n) bySeat[g.seat] = g;
		biggest = Math.max(1, ...rowBig);
		standTop = Math.min(scene.height, ...rowTop);
		standBottom = Math.max(0, ...rowBottom);
		farBig = 0;
		farBottom = 0;
		nearTop = Infinity;
		rowBig.forEach((b$1, r) => {
			if (!rowXs[r].length) return;
			if (b$1 <= 8) {
				farBig = Math.max(farBig, b$1);
				farBottom = Math.max(farBottom, rowBottom[r]);
			} else nearTop = Math.min(nearTop, rowTop[r]);
		});
		glintsDue = true;
	}
	/**
	* Lays the scene out again now: `slide` moves guys to their new seats, `fade` holds the old picture
	* while the new one is put together over a few frames, then cross-fades it out; `cut` swaps at once.
	*/
	function relayout(how = "cut", reseat) {
		const before = scene, now = performance.now();
		if (!stillPainted && !fade) how = "cut";
		if (how === "slide") for (const g of guys.values()) {
			if (g.seat < 0 || g.seat >= before.seats.length) {
				delete g.from;
				continue;
			}
			const s = before.seats[g.seat];
			g.from = {
				x: before.ox + s.x * before.k,
				y: before.oy + s.y * before.k,
				side: s.size * before.k
			};
		}
		if (!(how === "fade" && building && fade)) {
			const old = how === "slide" ? before.backdrop : how === "fade" && stillPainted ? still$1 : null;
			fade = old ? {
				canvas: old,
				k: before.k,
				ox: before.ox,
				oy: before.oy,
				until: how === "fade" ? Infinity : now + SLIDE_MS,
				ms: how === "fade" ? FADE_MS : SLIDE_MS
			} : null;
		}
		reseat?.();
		scene = options.build(devW, devH, dpr);
		index();
		if (how !== "fade") ensureBackdrop();
		const key = JSON.stringify(scene.tints);
		for (const [size, id] of stand.values()) release(size, id);
		stand.clear();
		if (key !== tintKey) {
			tintKey = key;
			for (const g of guys.values()) forget(g);
		}
		still$1 = document.createElement("canvas");
		still$1.width = scene.width;
		still$1.height = scene.height;
		stillCtx = still$1.getContext("2d");
		stillPainted = false;
		stale = "all";
		layTiles();
		building = {
			next: 0,
			all: how !== "fade"
		};
		slide = how === "slide" ? { until: now + SLIDE_MS } : null;
		if (lit) {
			lit.overlay = null;
			lit.aim = "";
			lit.drawn = null;
		}
		queue = [];
		made = 0;
		queued.clear();
		restless.clear();
		shown = [];
		waveCrest = NaN;
		glintStep = -1;
		const seated = [...guys.values()].filter((g) => g.seat >= 0 && g.seat < scene.seats.length).sort((a, b$1) => a.seat - b$1.seat);
		for (const g of seated) {
			want(g);
			if (how !== "slide") delete g.from;
		}
		if (how === "cut") tidy();
		whole = true;
		options.onLayout?.();
		wake();
	}
	/** Paints the scene's backdrop if it waits to be. */
	function ensureBackdrop() {
		const paint$1 = scene.later;
		if (paint$1) {
			scene.later = void 0;
			scene.backdrop = paint$1();
		}
	}
	/** Lays the scene out again at the next frame, however many times it's asked for before then. */
	function request(how) {
		wanted = wanted === "cut" || how === "cut" ? "cut" : how;
		wake();
	}
	/** Sprites for sizes no seat calls for any more go back to their sheets. */
	function tidy() {
		for (const g of guys.values()) forget(g, g.seat >= 0 && g.seat < scene.seats.length ? code(scene.seats[g.seat].size, scene.bands[g.seat]) : -1);
	}
	let tiles = [], atlas = null, atlasCtx = null;
	const rectOf = (seat, lift = 0) => {
		const s = scene.seats[seat];
		return [
			s.x - 3,
			s.y - lift - 3,
			s.size + 6,
			s.size + lift + 4
		];
	};
	/** Whether a guy is part of the baked picture: seated, made or standing in, and not moving. */
	const atRest = (g) => lit?.guy !== g && !moving.has(g) && !slide;
	/** Seats of row `r` whose cells reach across world x `from` to `to`, as places in the row. */
	function span(r, from, to) {
		const xs = rowXs[r];
		let lo = 0, hi = xs.length;
		while (lo < hi) {
			const m = lo + hi >> 1;
			if (xs[m] + rowBig[r] <= from) lo = m + 1;
			else hi = m;
		}
		let end = lo;
		while (end < xs.length && xs[end] < to) end++;
		return [lo, end];
	}
	/** Where every row's tiles go on the atlas; their guys are drawn into them as the layout is built. */
	function layTiles() {
		tiles = [];
		const AW = 2048, n = Math.ceil(scene.width / TILE);
		let ax = 0, ay = 0, shelf = 0;
		scene.rows.forEach((row, r) => {
			const list = [];
			for (let i = 0; i < n; i++) {
				const x = i * TILE, [a, b$1] = span(r, x, x + TILE);
				let top = Infinity, bottom = -Infinity;
				for (let p = a; p < b$1; p++) {
					const s = scene.seats[row[p]];
					top = Math.min(top, s.y);
					bottom = Math.max(bottom, s.y + s.size);
				}
				if (a >= b$1) {
					list.push(null);
					continue;
				}
				if (ax + TILE > AW) {
					ax = 0;
					ay += shelf;
					shelf = 0;
				}
				list.push({
					x,
					top,
					h: bottom - top,
					ax,
					ay
				});
				ax += TILE;
				shelf = Math.max(shelf, bottom - top);
			}
			tiles.push(list);
		});
		atlas = document.createElement("canvas");
		atlas.width = AW;
		atlas.height = Math.max(1, ay + shelf);
		atlasCtx = atlas.getContext("2d");
	}
	/** Draws row `r`'s guys at rest between world x `from` and `to` into its tiles, afresh. */
	function retile(r, from, to) {
		const g = atlasCtx, row = scene.rows[r];
		for (let i = Math.max(0, Math.floor(from / TILE)); i <= Math.min(tiles[r].length - 1, Math.floor((to - 1) / TILE)); i++) {
			const t = tiles[r][i];
			if (!t) continue;
			const x0 = Math.max(from, t.x), x1 = Math.min(to, t.x + TILE), [a, b$1] = span(r, x0, x1);
			g.save();
			g.beginPath();
			g.rect(t.ax + x0 - t.x, t.ay, x1 - x0, t.h);
			g.clip();
			g.clearRect(t.ax + x0 - t.x, t.ay, x1 - x0, t.h);
			g.setTransform(1, 0, 0, 1, t.ax - t.x, t.ay - t.top);
			for (let p = a; p < b$1; p++) {
				const i2 = row[p], guy = bySeat[i2];
				if (guy && atRest(guy)) blit(g, scene.seats[i2].size, cellOf(guy, i2), scene.seats[i2].x, scene.seats[i2].y);
			}
			g.restore();
		}
	}
	/** Makes the stand-ins a set of rows will draw, so they reach their sheets in one go. */
	function standInsFor(rows) {
		for (const r of rows) for (const i of scene.rows[r]) {
			const g = bySeat[i];
			if (g && atRest(g)) cellOf(g, i);
		}
		uploadAll();
	}
	/** A seat's guy changed how they look at rest (made, gone, moving or still again): the next frame redraws them there. */
	function restIn(seat) {
		if (seat >= 0 && seat < scene.seats.length && !(building && rowOf[seat] >= building.next)) restless.add(seat);
		wake();
	}
	/** Copies row `r`'s guys at rest from `from` to `to`, `dy` up or down. */
	function blitRow(target, r, from, to, dy) {
		for (let i = Math.max(0, Math.floor(from / TILE)); i <= Math.min(tiles[r].length - 1, Math.floor((to - 1) / TILE)); i++) {
			const t = tiles[r][i];
			if (!t || !t.h) continue;
			const x0 = Math.max(from, t.x), x1 = Math.min(to, t.x + TILE);
			if (x1 > x0) target.drawImage(atlas, t.ax + x0 - t.x, t.ay, x1 - x0, t.h, x0, t.top + dy, x1 - x0, t.h);
		}
	}
	/**
	* Puts the layout's rows together, all at once or (a big crowd's re-seat) a few milliseconds a frame, and the
	* baked picture with them: the scene, then each row as it is made, back to front. True when done.
	*/
	function buildRows(until) {
		const b$1 = building, n = scene.rows.length;
		if (!b$1.next) {
			stillCtx.setTransform(1, 0, 0, 1, 0, 0);
			stillCtx.clearRect(0, 0, still$1.width, still$1.height);
			if (scene.backdrop) stillCtx.drawImage(scene.backdrop, 0, 0);
		}
		while (b$1.next < n) {
			const r = b$1.next++;
			standInsFor([r]);
			retile(r, 0, scene.width);
			blitRow(stillCtx, r, 0, scene.width, 0);
			if (!b$1.all && performance.now() > until) return b$1.next >= n;
		}
		return true;
	}
	/** The baked picture: all of it after a new layout, else the patches whose guys changed. */
	function paintStill() {
		if (stale === "all") {
			stillCtx.setTransform(1, 0, 0, 1, 0, 0);
			stillCtx.clearRect(0, 0, still$1.width, still$1.height);
			if (scene.backdrop) stillCtx.drawImage(scene.backdrop, 0, 0);
			scene.rows.forEach((_, r) => blitRow(stillCtx, r, 0, scene.width, 0));
			stale = [];
			stillPainted = true;
			whole = true;
			return [];
		}
		const out = stale;
		for (const r of out) patch(stillCtx, r, -1);
		stale = [];
		return out;
	}
	/** Seats whose guy changed: their rows' tiles, then the still, follow. Returns what changed in the still. */
	function settleRests() {
		if (!restless.size) return paintStill();
		const seats = [...restless].filter((seat) => rowOf[seat] >= 0);
		restless.clear();
		for (const seat of seats) {
			const r = rowOf[seat], s = scene.seats[seat], [a, b$1] = span(r, s.x - 1, s.x + s.size + 1), row = scene.rows[r];
			for (let p = a; p < b$1; p++) {
				const g = bySeat[row[p]];
				if (g && atRest(g)) cellOf(g, row[p]);
			}
		}
		uploadAll();
		const rects = [];
		for (const seat of seats) {
			const s = scene.seats[seat];
			retile(rowOf[seat], s.x - 1, s.x + s.size + 1);
			rects.push(rectOf(seat, 2));
		}
		if (stale !== "all") {
			stale.push(...merge(rects));
			if (stale.length > 300) stale = "all";
		}
		return paintStill();
	}
	/** Repaints world rects: the scene under them, then every row touching them, back to front, moved as at `t` (-1: at rest). */
	function patch(target, rect, t, dimmed = t >= 0) {
		const rects = typeof rect[0] === "number" ? [rect] : rect;
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		target.save();
		target.beginPath();
		for (const [x, y, w, h] of rects) {
			const a = Math.floor(x), b$1 = Math.floor(y), c = Math.ceil(x + w), d = Math.ceil(y + h);
			target.rect(a, b$1, c - a, d - b$1);
			x0 = Math.min(x0, a);
			y0 = Math.min(y0, b$1);
			x1 = Math.max(x1, c);
			y1 = Math.max(y1, d);
		}
		target.clip();
		x0 = Math.max(0, x0);
		y0 = Math.max(0, y0);
		x1 = Math.min(scene.width, x1);
		y1 = Math.min(scene.height, y1);
		if (x1 > x0 && y1 > y0) if (scene.backdrop) target.drawImage(scene.backdrop, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
		else target.clearRect(x0, y0, x1 - x0, y1 - y0);
		const reach = t >= 0 && waving ? biggest + 2 : 8;
		for (let r = 0; r < scene.rows.length; r++) {
			if (rowBottom[r] < y0 || rowTop[r] - reach > y1) continue;
			let from = Infinity, to = -Infinity;
			for (const [x, y, w, h] of rects) if (rowBottom[r] >= y && rowTop[r] - reach <= y + h) {
				from = Math.min(from, Math.floor(x));
				to = Math.max(to, Math.ceil(x + w));
			}
			if (from >= to) continue;
			if (t >= 0 && waving) waveRow(target, r, from, to);
			else blitRow(target, r, from, to, 0);
			if (t < 0) continue;
			const [a, b$1] = span(r, from, to), row = scene.rows[r];
			for (let p = a; p < b$1; p++) {
				const g = bySeat[row[p]];
				if (g && moving.has(g) && lit?.guy !== g) drawLive(target, g, row[p], t);
			}
		}
		if (t >= 0 && waving) swathe(target);
		if (dimmed && lit?.overlay) dim(target, x0, y0, x1 - x0, y1 - y0);
		target.restore();
	}
	const band$1 = () => scene.wave ?? scene.pitch * 9.5;
	const waveX = (t) => {
		const b$1 = band$1(), span$1 = scene.width + 2.5 * b$1;
		return (t - waveStart) / WAVE_MS % 1 * span$1 - 1.3 * b$1;
	};
	let crest = 0, waveCrest = NaN;
	/** How far up the wave has a seat at `x`. */
	function waveUp(x) {
		const d = (x - crest) / (band$1() / 9.5);
		return d > 0 ? Math.max(0, 1 - d / 1.5) : d > -8 ? Math.pow(1 + d / 8, 1.5) : 0;
	}
	const liftOf = (e, size) => {
		if (size <= 8) return e < .45 ? 0 : Math.round(size * (size <= 5 ? 1 : .6));
		const q = e <= .15 ? 0 : e < .45 ? 1 / 3 : e < .75 ? 2 / 3 : 1;
		return q && Math.max(1, Math.round(q * size * .4));
	};
	/**
	* Where the far rows stand, a lighter swathe over them: standing up a row's height alone looks the same in a
	* packed stand, so the wave shows as light running through it, brightest in its middle, from the back row's
	* heads to the front far row's feet there (only over guys and stand, never a see-through canvas).
	*/
	function swathe(target) {
		const far$1 = [];
		rowBig.forEach((b$1, r) => {
			if (b$1 <= 8 && rowXs[r].length) far$1.push(r);
		});
		if (!far$1.length) return;
		const u = band$1() / 9.5, at = (r) => {
			const [a] = span(r, crest, crest + 1), s = scene.seats[scene.rows[r][Math.min(a, scene.rows[r].length - 1)]];
			return s;
		};
		const back = at(far$1[0]), front = at(far$1[far$1.length - 1]), top = back.y - back.size, bottom = front.y + front.size;
		if (bottom <= top) return;
		target.globalCompositeOperation = "source-atop";
		target.fillStyle = "#ffffff";
		target.globalAlpha = .1;
		target.fillRect(Math.floor(crest - 3.3 * u), top, Math.ceil(4.1 * u), bottom - top);
		target.globalAlpha = .08;
		target.fillRect(Math.floor(crest - 2.2 * u), top, Math.ceil(2.6 * u), bottom - top);
		target.globalCompositeOperation = "source-over";
		target.globalAlpha = 1;
	}
	/** The wave's band at crest `c`, from the top row's raised heads to the front row's feet (one plain rect is quicker to clip to than a rect a row). */
	function waveRect(c = crest) {
		const u = band$1() / 9.5, top = Math.max(0, standTop - biggest - 4);
		return [
			c - 8 * u - biggest - 4,
			top,
			9.5 * u + 2 * biggest + 8,
			Math.max(1, standBottom + 2 - top)
		];
	}
	/**
	* What the wave changed as its crest went from `from` to `to`: the near rows' whole band (they rise in steps and
	* put their arms up), and for the far rows, which only stand or sit under one swathe, just where its edges passed.
	*/
	function waveMoved(from, to) {
		const u = band$1() / 9.5;
		if (Number.isNaN(from)) return [waveRect(to)];
		if (!farBig || to < from || to - from > u) return [waveRect(from), waveRect(to)];
		const out = [], [x, , w] = waveRect(from);
		if (nearTop < Infinity) {
			const top$1 = Math.max(0, nearTop - Math.ceil(biggest * .4) - 4);
			out.push([
				x,
				top$1,
				w + to - from,
				standBottom + 2 - top$1
			]);
		}
		const top = Math.max(0, standTop - biggest - 4), h = farBottom + 2 - top, pad = farBig + 3;
		for (const [a, b$1] of [[-3.31, -2.2], [.4, .83]]) out.push([
			from + a * u - pad,
			top,
			to - from + (b$1 - a) * u + 2 * pad,
			h
		]);
		return out;
	}
	/** Row `r` from `from` to `to` in the wave: runs of seats lifted alike copied in one go, arms up and lighter at the crest. */
	const runs$1 = [], up = [];
	function waveRow(target, r, from, to) {
		const row = scene.rows[r], u = band$1() / 9.5;
		const [a, b$1] = span(r, Math.max(from, crest - 8 * u - rowBig[r]), Math.min(to, crest + 1.5 * u + 1));
		let start = from, key = 0;
		runs$1.length = 0;
		up.length = 0;
		for (let p = a; p < b$1; p++) {
			const s = scene.seats[row[p]], e = waveUp(s.x + s.size / 2), l = liftOf(e, s.size), k = l * 2 + (e >= .75 && s.size >= 10 ? 1 : 0);
			if (k !== key) {
				if (s.x > start) runs$1.push(start, s.x, key);
				start = Math.max(start, s.x);
				key = k;
			}
			if (e >= .75 && s.size >= 12) up.push(row[p]);
		}
		runs$1.push(start, to, key);
		for (let n = 0; n < runs$1.length; n += 3) blitRow(target, r, runs$1[n], runs$1[n + 1], -(runs$1[n + 2] >> 1));
		target.globalCompositeOperation = "lighter";
		target.globalAlpha = .28;
		for (let n = 0; n < runs$1.length; n += 3) if (runs$1[n + 2] & 1) blitRow(target, r, runs$1[n], runs$1[n + 1], -(runs$1[n + 2] >> 1));
		target.globalCompositeOperation = "source-over";
		target.globalAlpha = 1;
		for (const i of up) {
			const g = bySeat[i];
			if (!g || !atRest(g)) continue;
			const s = scene.seats[i], id = cellOf(g, i);
			arms(target, g, i, s.x, s.y - liftOf(waveUp(s.x + s.size / 2), s.size), s.size, id);
		}
	}
	/**
	* Arms up for the wave (the front rows' guys, 12 and up), out of their sides at the shoulder: in their
	* body colour just clear of their head, bending out a pixel halfway, to a hand just over it, in their ink.
	*/
	function arms(target, g, i, x, y, size, id) {
		const info = armOf(size, id), ext = extOf(size, id);
		if (!info || !ext) return;
		const bandI = scene.bands[i], left = x + (info & 15) - 1, right = x + (info >> 4 & 15) + 1, shoulder = y + (info >> 8 & 15), top = y + (ext >> 8 & 15);
		if (g.arm?.[0] !== bandI || g.arm[1] !== scene) g.arm = [
			bandI,
			scene,
			tinted(g.base.body, scene.tints[bandI]),
			tinted(g.base.ink, scene.tints[bandI])
		];
		const hand = top - (size >= 12 ? 1 : 0), bend = Math.round((shoulder + hand) / 2), wide$1 = size >= 12, [, , body, ink] = g.arm;
		for (const [ax, out] of [[left, -1], [right, 1]]) {
			const up$1 = ax + out;
			target.fillStyle = body;
			target.fillRect(ax, bend, 1, shoulder - bend + 1);
			target.fillRect(up$1, hand, 1, bend - hand + 1);
			target.fillStyle = ink;
			target.fillRect(up$1, hand - 1, 1, 1);
			if (wide$1) {
				target.fillRect(ax + out, bend + 1, 1, shoulder - bend);
				target.fillRect(up$1 + out, hand, 1, bend - hand + 1);
			}
		}
	}
	/** How a moving guy is drawn at `t`: lifted by the wave or a hop, flashing, fading in, arms up. */
	function liveOf(g, s, t) {
		let dy = 0, bright = 0, up$1 = false;
		if (waving) {
			const e = waveUp(s.x + s.size / 2);
			dy -= liftOf(e, s.size);
			bright = e >= .75 && s.size >= 10 ? .28 : 0;
			up$1 = e >= .75;
		}
		const since = t - g.hopAt;
		if (since >= 0 && since < g.hopFor) {
			const lift = g.hopFor < HOP_MS ? 1 : Math.max(1, s.size / 4);
			dy -= Math.max(1, Math.round(Math.sin(since / g.hopFor * Math.PI) * lift));
			if (s.size <= 6 && since < 120) bright = Math.max(bright, .3);
		}
		let alpha = 1;
		if (g.arriving) {
			const a = Math.min(1, (t - g.joined) / ARRIVE_MS);
			alpha = a;
			dy -= Math.round((1 - a) * s.size * .6);
		}
		return {
			dy,
			bright,
			up: up$1,
			alpha,
			key: (dy + 64) * 4 + (bright ? 2 : 0) + (up$1 ? 1 : 0) + (alpha < 1 ? Math.round(alpha * 64) * 1024 : 0)
		};
	}
	function drawLive(target, g, i, t) {
		const s = scene.seats[i], id = cellOf(g, i), { dy, bright, up: up$1, alpha } = liveOf(g, s, t);
		if (alpha < 1) target.globalAlpha = alpha;
		if (up$1 && s.size >= 12) arms(target, g, i, s.x, s.y + dy, s.size, id);
		blit(target, s.size, id, s.x, s.y + dy);
		if (bright) {
			target.globalCompositeOperation = "lighter";
			target.globalAlpha = bright;
			blit(target, s.size, id, s.x, s.y + dy);
			target.globalCompositeOperation = "source-over";
		}
		target.globalAlpha = 1;
	}
	const SLOTS$1 = 40;
	let glintsDue = true, beats = [], glintStep = -1, glintNow = [];
	function sortGlints() {
		glintsDue = false;
		const far$1 = {
			period: 4e3,
			dur: 260,
			slots: Array.from({ length: SLOTS$1 }, () => [])
		}, near = {
			period: 5400,
			dur: 180,
			slots: Array.from({ length: SLOTS$1 }, () => [])
		};
		for (const g of rare) {
			if (g.seat < 0 || g.seat >= scene.seats.length || !g.shine) continue;
			const small = scene.seats[g.seat].size <= 5;
			if (!small && !g.glint) continue;
			const b$1 = small ? far$1 : near, at = startOf(g, small);
			b$1.slots[Math.floor(at / b$1.period * SLOTS$1) % SLOTS$1].push(g);
		}
		beats = [far$1, near];
	}
	const startOf = (g, small) => small ? (4e3 - g.hash % 4e3) % 4e3 : 90 * ((60 - g.hash % 97 % 60) % 60);
	/** The glints showing at `t`, as [guy, rect]. */
	function glintsAt(t) {
		if (glintsDue) sortGlints();
		const out = [];
		for (const b$1 of beats) {
			const now = t % b$1.period, first = Math.floor((now - b$1.dur) / b$1.period * SLOTS$1), last = Math.floor(now / b$1.period * SLOTS$1);
			for (let k = first; k <= last; k++) for (const g of b$1.slots[(k % SLOTS$1 + SLOTS$1) % SLOTS$1]) {
				if (g.seat < 0 || g.seat >= scene.seats.length || lit?.guy === g || moving.has(g) || bySeat[g.seat] !== g) continue;
				const small = b$1.period === 4e3, since = ((now - startOf(g, small)) % b$1.period + b$1.period) % b$1.period;
				if (since >= b$1.dur) continue;
				const s = scene.seats[g.seat];
				out.push([g, small ? [
					s.x + (s.size >> 1),
					s.y - 2,
					1,
					1
				] : [
					s.x + s.size - 1,
					s.y - 1,
					1,
					1
				]]);
			}
		}
		return out;
	}
	function draw(t) {
		frame = 0;
		if (gone) return;
		const dt = lastFrame ? Math.min(100, t - lastFrame) : 16;
		lastFrame = t;
		const before = scene;
		options.beforeFrame?.();
		if (wanted) {
			const how = wanted;
			wanted = null;
			relayout(how);
		}
		if (scene !== before && building && !building.all) {
			wake();
			return;
		}
		const budget = building && !building.all ? 0 : performance.now() + (moving.size || waving || lit ? 4 : 7);
		while (made < queue.length && performance.now() < budget) make(queue[made++]);
		if (made >= queue.length) {
			queue = [];
			made = 0;
		} else if (made > 4096) {
			queue = queue.slice(made);
			made = 0;
		}
		if (slide && t >= slide.until) {
			slide = null;
			for (const g of guys.values()) delete g.from;
			tidy();
			building = {
				next: 0,
				all: true
			};
		}
		if (building) {
			if (scene.later) {
				ensureBackdrop();
				if (!building.all && !slide) {
					wake();
					return;
				}
			}
			if (!slide && !buildRows(performance.now() + 6)) {
				wake();
				return;
			}
			building = null;
			if (slide) stale = "all";
			else {
				stale = [];
				stillPainted = true;
				whole = true;
			}
			if (fade && fade.until === Infinity) fade.until = t + fade.ms;
		}
		if (fade && t >= fade.until) {
			fade = null;
			tidy();
			whole = true;
		}
		if (options.idle) idleHops(dt, t);
		crest = waveX(Math.floor(t / 33.3) * 33.3);
		const live = [], held = [];
		for (const g of moving) {
			const done = t - g.hopAt >= g.hopFor && !(g.arriving && t - g.joined < ARRIVE_MS);
			if (done) {
				moving.delete(g);
				g.arriving = false;
				restIn(g.seat);
				continue;
			}
			if (slide || g.seat < 0 || g.seat >= scene.seats.length) continue;
			const key = liveOf(g, scene.seats[g.seat], t).key, r = rectOf(g.seat, Math.ceil(scene.seats[g.seat].size * .7));
			if (key !== g.shown) {
				g.shown = key;
				live.push(r);
			} else held.push(r);
		}
		const changed$1 = settleRests();
		const step$1 = Math.floor(t / 33.3);
		if (step$1 !== glintStep) {
			glintStep = step$1;
			glintNow = slide || !busy() ? [] : glintsAt(step$1 * 33.3);
		}
		const glints = glintNow, glowing = new Set(glints.map(([, r]) => `${r[0]},${r[1]}`));
		const dark = shown.filter((r) => !glowing.has(`${r[0]},${r[1]}`));
		const sweep = waving && !slide ? waveRect() : null, swept = sweep && crest !== waveCrest ? waveMoved(waveCrest, crest) : [];
		waveCrest = sweep ? crest : NaN;
		const spotNow = lit ? spotFrame(t) : null;
		const { k, ox, oy } = scene;
		ctx.imageSmoothingEnabled = false;
		let painted$2 = true, spotPaint = true;
		if (whole || fade || slide || spotNow?.whole) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			if (!scene.backdrop) ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(k, 0, 0, k, ox, oy);
			ctx.drawImage(still$1, 0, 0);
			if (fade) {
				ctx.setTransform(fade.k, 0, 0, fade.k, fade.ox, fade.oy);
				ctx.globalAlpha = Math.max(0, Math.min(1, (fade.until - t) / fade.ms));
				ctx.drawImage(fade.canvas, 0, 0);
				ctx.globalAlpha = 1;
				ctx.setTransform(k, 0, 0, k, ox, oy);
			}
			if (slide) drawSlide(t);
			else {
				for (const r of merge([
					...live,
					...held,
					...sweep ? [sweep] : []
				])) patch(ctx, r, t, false);
				if (lit?.overlay) dim(ctx, 0, 0, scene.width, scene.height);
			}
			whole = false;
		} else {
			const dirty = merge([
				...dark,
				...live,
				...changed$1
			]);
			spotPaint = !!spotNow && (!lit.drawn || spotNow.moved || [...dirty, ...swept].some((r) => meets(r, lit.drawn)));
			if (spotPaint && lit.drawn) dirty.push(lit.drawn);
			ctx.setTransform(k, 0, 0, k, ox, oy);
			painted$2 = dirty.length + swept.length > 0;
			for (const r of merge(dirty)) patch(ctx, r, t);
			if (swept.length) patch(ctx, swept, t);
		}
		const was = new Set(shown.map((r) => `${r[0]},${r[1]}`));
		for (const [g, [x, y, w, h]] of glints) {
			if (!painted$2 && was.has(`${x},${y}`) || lit?.drawn && meets([
				x,
				y,
				w,
				h
			], lit.drawn)) continue;
			ctx.fillStyle = scene.seats[g.seat].size <= 5 ? g.shine : "#ffffff";
			ctx.fillRect(x, y, w, h);
		}
		shown = glints.map(([, r]) => r);
		if (lit) spot(t, spotNow, spotPaint);
		if (busy() || whole || shown.length) wake();
	}
	const busy = () => !!(waving || lit || fade || slide || building || wanted || restless.size || made < queue.length || moving.size || options.idle);
	function drawSlide(t) {
		const e = 1 - Math.pow(1 - Math.min(1, 1 - (slide.until - t) / SLIDE_MS), 3), { k, ox, oy } = scene;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		for (const row of scene.rows) for (const i of row) {
			const g = bySeat[i];
			if (!g || lit?.guy === g) continue;
			const s = scene.seats[i], tx = ox + s.x * k, ty = oy + s.y * k, side = s.size * k, f = g.from ?? {
				x: tx,
				y: ty + side,
				side: 0
			};
			const x = Math.round(f.x + (tx - f.x) * e), y = Math.round(f.y + f.side - (f.y + f.side - ty - side) * e - side);
			if (!g.from) ctx.globalAlpha = e;
			blit(ctx, s.size, cellOf(g, i), x, y, side);
			ctx.globalAlpha = 1;
		}
		ctx.setTransform(k, 0, 0, k, ox, oy);
	}
	/** Rects that touch become one, so neighbours hopping together are drawn once. */
	function merge(rects) {
		const out = [];
		for (const r of rects) {
			let [x, y, w, h] = r;
			for (let i = 0; i < out.length; i++) {
				const [a, b$1, c, d] = out[i];
				if (x <= a + c && a <= x + w && y <= b$1 + d && b$1 <= y + h) {
					const nx = Math.min(x, a), ny = Math.min(y, b$1);
					w = Math.max(x + w, a + c) - nx;
					h = Math.max(y + h, b$1 + d) - ny;
					x = nx;
					y = ny;
					out.splice(i, 1);
					i = -1;
				}
			}
			out.push([
				x,
				y,
				w,
				h
			]);
		}
		return out;
	}
	function idleHops(dt, t) {
		const n = scene.seats.length;
		if (!n) return;
		let picks = Math.min(30, Math.round(guys.size * dt / 3e3 + Math.random() * .5));
		for (let tries = 0; picks > 0 && tries < 60; tries++) {
			const i = Math.floor(Math.random() * n), g = bySeat[i];
			if (!g || scene.seats[i].size < 6 || moving.has(g)) continue;
			hopGuy(g, t, 160);
			picks--;
		}
	}
	let spotSprite = null, spotFor = null;
	/** Where the spotlit guy is at `t`, in device pixels, and whether the canvas must be drawn whole for it. */
	function spotFrame(now) {
		const t = Math.floor(now / 33.3) * 33.3;
		const { guy, from, until } = lit, seated = guy.seat >= 0 && guy.seat < scene.seats.length;
		const s = seated ? scene.seats[guy.seat] : null, { k, ox, oy } = scene;
		const rise = Math.max(0, Math.min(1, (t - from) / 450, (until - t) / 350));
		const lineH = lit.label ? Math.round(30 * dpr) : 0, pad = Math.round(8 * dpr);
		const seatSide = s ? s.size * k : 16;
		const F = Math.max(1, Math.min(Math.floor(Math.min(devH * .6, devH - lineH - pad * 2) / 16), Math.max(Math.floor(Math.min(devH * .36, devW * .3) / 16), Math.ceil(seatSide * 2 / 16))));
		const ex = devW / 2, eb = devH - pad - lineH;
		const sx = s ? ox + (s.x + s.size / 2) * k : ex, sb = s ? oy + (s.y + s.size) * k : devH + 16 * F;
		const lift = s ? Math.max(0, Math.min(1, (t - from - 250) / 450)) : 1, e2 = 1 - Math.pow(1 - Math.min(lift, rise), 3);
		const startSide = s ? seatSide : 16 * F, side = startSide + (16 * F - startSide) * e2, cx = sx + (ex - sx) * e2, bottom = sb + (eb - sb) * e2;
		const [tx, tb, ts] = !s || e2 >= .5 ? [
			ex,
			eb,
			16 * F
		] : [
			sx,
			sb,
			seatSide
		];
		const aim = `${Math.round((tx - ox) / k)},${Math.round((tb - oy) / k)},${Math.round(ts / k)}`, swung = aim !== lit.aim;
		if (swung || !lit.overlay) {
			lit.overlay = overlayFor((tx - ox) / k, (tb - oy) / k, ts / k);
			lit.aim = aim;
		}
		const pose = `${Math.round(cx)},${Math.round(bottom)},${Math.round(side)},${Math.round(rise * 32)}`, moved = pose !== lit.pose;
		lit.pose = pose;
		const level = Math.round(4 * Math.max(0, Math.min(1, (now - from) / 250, (until - now) / 250))) / 4, stepped = level !== lit.level;
		lit.level = level;
		return {
			cx,
			bottom,
			side,
			F,
			lineH,
			pad,
			rise,
			e2,
			seatSide,
			whole: stepped || swung,
			moved
		};
	}
	/** Dims a world rect for the spotlight: its overlay, at the step it has faded to. */
	function dim(target, x, y, w, h) {
		const { level, overlay: o } = lit;
		if (!o || w <= 0 || h <= 0 || !level) return;
		target.globalCompositeOperation = "source-atop";
		target.globalAlpha = .62 * level;
		target.fillStyle = scene.shadow;
		const ix0 = Math.max(x, o.x), iy0 = Math.max(y, o.y), ix1 = Math.min(x + w, o.x + o.canvas.width), iy1 = Math.min(y + h, o.y + o.canvas.height);
		if (ix1 <= ix0 || iy1 <= iy0) target.fillRect(x, y, w, h);
		else {
			if (iy0 > y) target.fillRect(x, y, w, iy0 - y);
			if (y + h > iy1) target.fillRect(x, iy1, w, y + h - iy1);
			if (ix0 > x) target.fillRect(x, iy0, ix0 - x, iy1 - iy0);
			if (x + w > ix1) target.fillRect(ix1, iy0, x + w - ix1, iy1 - iy0);
			target.drawImage(o.canvas, ix0 - o.x, iy0 - o.y, ix1 - ix0, iy1 - iy0, ix0, iy0, ix1 - ix0, iy1 - iy0);
		}
		target.globalAlpha = 1;
		target.globalCompositeOperation = "source-over";
	}
	/**
	* The spotlight's dimming round its light, at world pixels: a box holding a beam from the light
	* nearest `cx` down onto a pool round a guy `side` wide standing at `bottom`, dithered at its edge,
	* in the shadow colour everywhere else (as everything outside the box is).
	*/
	function overlayFor(cx, bottom, side) {
		const W$1 = scene.width, H$1 = scene.height, c = lit?.overlay?.canvas ?? document.createElement("canvas");
		const lights = scene.lights ?? [], light = lights.length ? lights.reduce((best, l) => Math.abs(l.x - cx) < Math.abs(best.x - cx) ? l : best) : null;
		const wTop = Math.max(2, side * .3), wBottom = side * .85, poolW = side * 1.25, poolH = side * .55, poolY = bottom - side * .1;
		const top = Math.max(0, Math.floor(light ? Math.min(light.y, bottom - side * 1.6) : bottom - side * 1.6)), end = Math.min(H$1, Math.ceil(poolY + poolH + 2));
		const left = Math.max(0, Math.floor(Math.min(light?.x ?? cx, cx - poolW) - wTop - 3)), right = Math.min(W$1, Math.ceil(Math.max(light?.x ?? cx, cx + poolW) + wTop + 3));
		if (end <= top || right <= left) {
			c.width = c.height = 0;
			return {
				canvas: c,
				x: 0,
				y: 0
			};
		}
		const bw = right - left, bh = end - top;
		if (c.width !== bw || c.height !== bh) {
			c.width = bw;
			c.height = bh;
		}
		const g = c.getContext("2d"), img = g.createImageData(bw, bh), px = new Uint32Array(img.data.buffer);
		const [r, gg, b$1] = rgbOf(scene.shadow), dimC = (255 << 24 | b$1 << 16 | gg << 8 | r) >>> 0;
		px.fill(dimC);
		for (let y = top; y < end; y++) {
			const u = light ? Math.max(0, Math.min(1, (y - light.y) / Math.max(1, bottom - side * .5 - light.y))) : 0;
			const mid = light ? light.x + (cx - light.x) * u : cx, half = light && y >= light.y && y <= bottom ? wTop + (wBottom - wTop) * u : -1;
			const reach = (h) => {
				const v = 1 - ((y - poolY) / h) ** 2;
				return v > 0 ? poolW * Math.sqrt(v) : -1;
			};
			const pw = Math.max(reach(poolH), light ? -1 : reach(side * 1.4));
			let lo = Infinity, hi = -Infinity;
			if (half >= 0) {
				lo = mid - half;
				hi = mid + half;
			}
			if (pw >= 0) {
				lo = Math.min(lo, cx - pw);
				hi = Math.max(hi, cx + pw);
			}
			if (hi < lo) continue;
			const row = (y - top) * bw - left, a0 = half >= 0 ? Math.ceil(mid - half + 2) : 0, a1 = half >= 0 ? Math.floor(mid + half - 2) : -1;
			const vp = .5 - ((y - poolY) / poolH) ** 2, inPool = vp > 0 ? poolW * Math.sqrt(vp) : -1;
			const b0 = inPool >= 0 ? Math.ceil(cx - inPool) : 0, b1 = inPool >= 0 ? Math.floor(cx + inPool) : -1;
			for (const [p0, p1] of [[a0, a1], [b0, b1]]) if (p1 >= p0) px.fill(0, row + Math.max(left, p0), row + Math.min(right - 1, p1) + 1);
			for (let x = Math.max(left, Math.floor(lo)); x < Math.min(right, Math.ceil(hi) + 1); x++) {
				if (x >= a0 && x <= a1 || x >= b0 && x <= b1) continue;
				const beam = half < 0 ? 9 : Math.abs(x - mid) - half;
				const pool = ((x - cx) / poolW) ** 2 + ((y - poolY) / poolH) ** 2 - 1, glow = light ? 9 : ((x - cx) / poolW) ** 2 + ((y - poolY) / (side * 1.4)) ** 2 - 1;
				const edge = Math.min(beam / 2, pool * 2, glow * 3);
				px[(y - top) * bw + x - left] = edge <= -1 ? 0 : edge >= 0 ? dimC : -edge * 16 > BAYER$1[(y & 3) * 4 + (x & 3)] ? 0 : dimC;
			}
		}
		g.putImageData(img, 0, 0);
		return {
			canvas: c,
			x: left,
			y: top
		};
	}
	/** The spotlight's turn of a frame: it ends, the neighbours hop, and (when `paint`) the guy and their line are drawn. */
	function spot(t, f, paint$1) {
		const { guy, label, from, until } = lit;
		if (t >= until || guys.get(guy.key) !== guy) {
			lit = null;
			restIn(guy.seat);
			whole = true;
			return;
		}
		const seated = guy.seat >= 0 && guy.seat < scene.seats.length, { k, ox, oy } = scene;
		if (!lit.landed && t - from > 300) {
			lit.landed = true;
			if (seated) {
				const r = rowOf[guy.seat], p = placeOf[guy.seat], row = scene.rows[r] ?? [];
				[
					-1,
					1,
					-2,
					2,
					-3,
					3
				].forEach((d, n) => {
					const g = bySeat[row[p + d]];
					if (g) hopGuy(g, t + 40 * n, HOP_MS, true);
				});
			}
		}
		if (!paint$1) return;
		if (spotFor !== guy) {
			guy.look ??= crowdLook(guy.spec);
			spotSprite ??= document.createElement("canvas");
			spotSprite.width = spotSprite.height = 16;
			spotSprite.getContext("2d").putImageData(new ImageData(crowdSpriteOf(guy.look, 16).rgba, 16, 16), 0, 0);
			spotFor = guy;
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		const { cx, bottom, side, rise } = f, ease = 1 - Math.pow(1 - rise, 3);
		let gx, gy, gs;
		if (seated && (side < 16 || f.e2 <= 0)) {
			const s = scene.seats[guy.seat];
			gs = s.size * k;
			gx = Math.round(cx - gs / 2);
			gy = Math.round(bottom - gs);
			blit(ctx, s.size, cellOf(guy, guy.seat), gx, gy, gs);
		} else {
			const sc = Math.max(1, Math.round(side / 16));
			gs = 16 * sc;
			gx = Math.round(cx - 8 * sc);
			gy = Math.round(bottom - 16 * sc);
			ctx.drawImage(spotSprite, 0, 0, 16, 16, gx, gy, gs, gs);
		}
		let lx0 = gx, lx1 = gx + gs, ly1 = gy + gs;
		if (label && ease > .05) {
			const [x, y, w, h] = drawLabel(label, cx, Math.min(devH - f.lineH / 2 - 2 * dpr, bottom + f.lineH / 2 + 2 * dpr), ease);
			lx0 = Math.min(lx0, x);
			lx1 = Math.max(lx1, x + w);
			ly1 = Math.max(ly1, y + h);
		}
		const wx = Math.floor((lx0 - ox) / k) - 1, wy = Math.floor((gy - oy) / k) - 1;
		lit.drawn = [
			wx,
			wy,
			Math.ceil((lx1 - ox) / k) + 1 - wx,
			Math.ceil((ly1 - oy) / k) + 1 - wy
		];
		ctx.setTransform(k, 0, 0, k, ox, oy);
	}
	/** The spotlit guy's line, in a pill that fits the canvas: smaller type first, then a shorter name, the score kept. Returns its box in device pixels. */
	function drawLabel(text, dcx, dcy, alpha) {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const W$1 = devW / dpr, cy = dcy / dpr, maxW = W$1 - 16;
		let px = 15, line = text;
		const font = (size) => options.font ?? `700 ${size}px system-ui, sans-serif`;
		ctx.font = font(px);
		while (!options.font && px > 11 && ctx.measureText(line).width + 20 > maxW) ctx.font = font(--px);
		const cut = line.lastIndexOf(" · "), tail = cut > 0 ? line.slice(cut) : "";
		let head = cut > 0 ? line.slice(0, cut) : line;
		while (head.length > 1 && ctx.measureText(line).width + 20 > maxW) {
			head = head.slice(0, -1);
			line = head.trimEnd() + "…" + tail;
		}
		const tw = Math.min(maxW, Math.ceil(ctx.measureText(line).width) + 20);
		const x = Math.max(8 + tw / 2, Math.min(W$1 - 8 - tw / 2, dcx / dpr));
		ctx.globalAlpha = alpha;
		ctx.fillStyle = scene.shadow;
		ctx.beginPath();
		ctx.roundRect(x - tw / 2, cy - 13, tw, 26, 13);
		ctx.fill();
		ctx.fillStyle = lightness(scene.shadow) > .5 ? "#141414" : "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(line, x, cy + 1);
		ctx.globalAlpha = 1;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		return [
			(x - tw / 2) * dpr - 2,
			(cy - 13) * dpr - 2,
			tw * dpr + 4,
			26 * dpr + 4
		];
	}
	let cssBefore = [0, 0], justSet = false;
	function measure(entry) {
		dpr = globalThis.devicePixelRatio || 1;
		let cssW = entry?.contentRect.width || canvas.clientWidth || 300, cssH = entry?.contentRect.height || canvas.clientHeight || 150;
		if (justSet && dpr !== 1 && cssBefore[0] && Math.abs(cssW - canvas.width) < 1 && Math.abs(cssH - canvas.height) < 1 && (Math.abs(cssW - cssBefore[0]) >= 1 || Math.abs(cssH - cssBefore[1]) >= 1)) {
			[cssW, cssH] = cssBefore;
			if (canvas.style) {
				canvas.style.width = `${cssW}px`;
				canvas.style.height = `${cssH}px`;
			}
			entry = void 0;
		}
		justSet = false;
		const box = entry?.devicePixelContentBoxSize?.[0];
		const exact = box && Math.abs(box.inlineSize - cssW * dpr) <= 2 && Math.abs(box.blockSize - cssH * dpr) <= 2;
		const w = Math.max(1, exact ? box.inlineSize : Math.round(cssW * dpr)), h = Math.max(1, exact ? box.blockSize : Math.round(cssH * dpr));
		const changed$1 = w !== devW || h !== devH;
		devW = w;
		devH = h;
		if (canvas.width !== devW) {
			canvas.width = devW;
			justSet = true;
		}
		if (canvas.height !== devH) {
			canvas.height = devH;
			justSet = true;
		}
		cssBefore = [cssW, cssH];
		if (changed$1) whole = true;
		return changed$1;
	}
	let watch = null, media = null;
	const onMedia = () => {
		listenDpr();
		measure();
		request("cut");
	};
	function listenDpr() {
		media?.removeEventListener?.("change", onMedia);
		media = typeof matchMedia === "function" ? matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`) : null;
		media?.addEventListener?.("change", onMedia);
	}
	function wake() {
		if (!frame && !gone) frame = requestAnimationFrame(draw);
	}
	function hopGuy(g, at, ms = HOP_MS, force = false) {
		if (moving.has(g) && at - g.hopAt < g.hopFor) return;
		if (!force && !moving.has(g) && moving.size >= HOP_CAP && guys.size > 2e3) return;
		g.hopAt = at;
		g.hopFor = ms;
		if (!moving.has(g)) {
			moving.add(g);
			restIn(g.seat);
		}
	}
	measure();
	scene = options.build(devW, devH, dpr);
	ensureBackdrop();
	tintKey = JSON.stringify(scene.tints);
	index();
	still$1.width = scene.width;
	still$1.height = scene.height;
	layTiles();
	building = {
		next: 0,
		all: true
	};
	if (typeof ResizeObserver === "function") {
		watch = new ResizeObserver((entries) => {
			if (measure(entries[entries.length - 1])) request("cut");
		});
		try {
			watch.observe(canvas, { box: "device-pixel-content-box" });
		} catch {
			watch.observe(canvas);
		}
	}
	listenDpr();
	wake();
	return {
		guys,
		get scene() {
			return scene;
		},
		get dpr() {
			return dpr;
		},
		get size() {
			return [devW, devH];
		},
		relayout,
		request,
		join(key, spec, seat, arrive = true) {
			const b$1 = crowdBase(spec), now = performance.now();
			const g = {
				key,
				spec,
				seat,
				joined: now,
				hopAt: -1e9,
				hopFor: HOP_MS,
				look: null,
				base: {
					body: b$1.body,
					eye: b$1.eye,
					ink: b$1.ink
				},
				shine: b$1.shine?.color ?? null,
				glint: (b$1.shine?.grade ?? 0) >= 3,
				cells: new Map(),
				arriving: false,
				hash: hash(key)
			};
			guys.set(key, g);
			if (b$1.shine) {
				rare.add(g);
				glintsDue = true;
			}
			if (seat >= 0 && seat < scene.seats.length) {
				bySeat[seat] = g;
				if (arrive && scene.seats[seat].size >= 6 && moving.size < 160) {
					g.arriving = true;
					moving.add(g);
				}
				restIn(seat);
				want(g);
			}
			wake();
			return g;
		},
		leave(g) {
			guys.delete(g.key);
			moving.delete(g);
			queued.delete(g);
			if (rare.delete(g)) glintsDue = true;
			if (lit?.guy === g) {
				lit = null;
				whole = true;
			}
			if (g.seat >= 0 && bySeat[g.seat] === g) {
				bySeat[g.seat] = void 0;
				restIn(g.seat);
			}
			forget(g);
			wake();
		},
		move(g, seat) {
			if (g.seat >= 0 && bySeat[g.seat] === g) {
				bySeat[g.seat] = void 0;
				restIn(g.seat);
			}
			g.seat = seat;
			if (rare.has(g)) glintsDue = true;
			if (seat >= 0 && seat < scene.seats.length) {
				bySeat[seat] = g;
				restIn(seat);
				want(g);
			}
			wake();
		},
		hop(g) {
			const now = performance.now();
			hopGuy(g, now, g.seat >= 0 && g.seat < scene.seats.length && scene.seats[g.seat].size <= 5 ? 300 : HOP_MS);
			if (moving.has(g) && g.seat >= 0 && g.seat < scene.seats.length && scene.seats[g.seat].size <= 6) {
				const row = scene.rows[rowOf[g.seat]] ?? [], p = placeOf[g.seat];
				[[1, 80], [-1, 110]].forEach(([d, ms]) => {
					const n = bySeat[row[p + d]];
					if (n) hopGuy(n, now + ms, 300);
				});
			}
			wake();
		},
		wave(on) {
			if (on && !waving) waveStart = performance.now();
			if (!on && waving) whole = true;
			waving = on;
			wake();
		},
		spotlight(g, label, ms) {
			const now = performance.now();
			const was = lit?.guy;
			lit = {
				guy: g,
				label,
				from: now,
				until: now + ms,
				overlay: lit?.overlay ?? null,
				aim: "",
				level: -1,
				landed: false,
				drawn: null
			};
			if (was) restIn(was.seat);
			restIn(g.seat);
			whole = true;
			wake();
		},
		resize() {
			measure();
			request("cut");
		},
		wake,
		destroy() {
			gone = true;
			if (frame) cancelAnimationFrame(frame);
			watch?.disconnect();
			media?.removeEventListener?.("change", onMedia);
			sheets.clear();
			stand.clear();
			guys.clear();
			moving.clear();
			rare.clear();
		}
	};
}

//#endregion
//#region src/crowd-stage.ts
/** Sizes rows step through, nearest first; neighbouring rows differ by one at most. */
const LADDER$1 = [
	16,
	14,
	12,
	10,
	8,
	6,
	5,
	3,
	2
];
/** How far toward the backdrop each size is tinted: the further back, the more. */
const HAZE = {
	16: 0,
	14: .03,
	12: .06,
	10: .1,
	8: .16,
	6: .24,
	5: .3,
	4: .34,
	3: .4,
	2: .48
};
/**
* The seats of a crowd filling `width` × `height` world pixels: rows from the front (the bottom edge,
* where the front row's feet are) back to the top, each row's size shrinking with distance, jittered a
* cell so far rows never line up. In the order a crowd fills them: the front row first, from the middle
* out, then the row behind. Seats less than three quarters on the canvas are left out. `density` above
* 1 packs more in (smaller guys sooner); the same arguments give the same seats.
*/
function crowdSeats(width, height, density = 1, seed = "crowd") {
	const rows = [];
	let at = -1;
	for (let feet = height;;) {
		const d = Math.max(0, feet / height), want = 2 + 15 * Math.pow(d, 2.1) / Math.sqrt(density);
		let best = LADDER$1.reduce((b$1, s, i) => Math.abs(Math.log(s / want)) < Math.abs(Math.log(LADDER$1[b$1] / want)) ? i : b$1, 0);
		if (at >= 0) best = Math.min(at + 1, Math.max(at, best));
		at = best;
		const size = LADDER$1[at];
		if (feet - size < -size / 4) break;
		rows.push({
			y: feet - size,
			size
		});
		feet -= Math.max(2, Math.round(size * (size <= 3 ? .67 : .6)));
	}
	rows.reverse();
	const seats = [];
	rows.forEach(({ y, size }, row) => {
		const step$1 = size <= 2 ? 3 : size <= 5 ? size : Math.round(size * .92);
		const r = (k$1) => hash(`${seed}:${row}:${k$1}`) % 1e3 / 1e3;
		let x = -size + Math.floor(r(-1) * step$1) - (row % 2 * step$1 >> 1), k = 0;
		while (x < width + size) {
			const sy = y - (size <= 6 ? Math.floor(r(k * 2) * 2) : 0);
			if (x >= -size / 4 && x + size <= width + size / 4 && sy >= -size / 4) seats.push({
				x,
				y: sy,
				size,
				row
			});
			x += step$1 + Math.floor(r(k * 2 + 1) * 2);
			k++;
		}
	});
	const mid = width / 2;
	return seats.sort((a, b$1) => b$1.row - a.row || Math.abs(a.x + a.size / 2 - mid) - Math.abs(b$1.x + b$1.size / 2 - mid));
}
/** The page's background under an element, as #rrggbb, or undefined where none shows. */
function pageBehind(el) {
	for (let e = el; e && typeof getComputedStyle === "function"; e = e.parentElement) {
		const m = getComputedStyle(e).backgroundColor.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/);
		if (m && (m[4] === void 0 || +m[4] > .5)) return "#" + [
			m[1],
			m[2],
			m[3]
		].map((v) => Math.round(+v).toString(16).padStart(2, "0")).join("");
	}
	return void 0;
}
/**
* A crowd on `canvas`, which the page sizes with CSS. It draws at the screen's own pixels, each world
* pixel a whole number of them with smoothing off, so guys stay sharp at any size, zoom or density; it
* follows the canvas's size and the screen's pixel density by itself (`resize()` still works). The canvas
* stays see-through where nobody stands. Draws only while something moves.
*/
function createCrowd(canvas, options = {}) {
	const behind = () => options.backdrop ?? pageBehind(canvas.parentElement) ?? "#1d2030";
	const free = [], arrived = new Map();
	let next = 0, arrivals = 0, zoom = 0, seatCount = 0, laidCss = "";
	const counted = new Map();
	let render;
	/** CSS pixels to a world pixel for `count` guys: as big as leaves a third more seats than guys. */
	function zoomFor(cssW, cssH, count$1, now) {
		if (options.scale) return options.scale;
		const least = cssW >= 900 ? 3 : 2, most = Math.max(least, Math.floor(cssH * .45 / 16));
		const seatsAt$1 = (z$1) => {
			const key = `${Math.ceil(cssW / z$1)}x${Math.ceil(cssH / z$1)}`;
			let n = counted.get(key);
			if (n === void 0) counted.set(key, n = crowdSeats(Math.ceil(cssW / z$1), Math.ceil(cssH / z$1), options.density ?? 1).length);
			return n;
		};
		let z = least;
		while (z < most && seatsAt$1(z + 1) >= count$1 * 1.3) z++;
		if (now > z && now <= most && seatsAt$1(now) >= count$1 * 1.1) return now;
		if (now && z > now && seatsAt$1(z) < count$1 * 1.6) return Math.max(now, least);
		return z;
	}
	function build(devW, devH, dpr) {
		const css$1 = `${devW / dpr}x${devH / dpr}`;
		if (laidCss && css$1 !== laidCss) zoom = zoomFor(devW / dpr, devH / dpr, render?.guys.size ?? 0, zoom);
		laidCss = css$1;
		const backdrop = behind(), tints = LADDER$1.map((s) => ({
			toward: backdrop,
			amount: HAZE[s],
			shade: 0
		}));
		const k = Math.max(1, Math.round(zoom * dpr)), W$1 = Math.ceil(devW / k), H$1 = Math.ceil(devH / k);
		const seats = crowdSeats(W$1, H$1, options.density ?? 1);
		seatCount = seats.length;
		const rows = [];
		seats.forEach((s, i) => {
			(rows[s.row] ??= []).push(i);
		});
		return {
			width: W$1,
			height: H$1,
			k,
			ox: 0,
			oy: devH - H$1 * k,
			seats,
			rows: Array.from(rows, (r) => (r ?? []).sort((a, b$1) => seats[a].x - seats[b$1].x)),
			bands: Uint8Array.from(seats, (s) => LADDER$1.indexOf(s.size)),
			tints,
			backdrop: null,
			pitch: Math.max(4, seats[0]?.size ?? 8),
			shadow: lightness(backdrop) > .5 ? "#141820" : backdrop
		};
	}
	const css = () => [canvas.clientWidth || 300, canvas.clientHeight || 150];
	zoom = zoomFor(css()[0], css()[1], 0, 0);
	render = createRender(canvas, {
		build,
		font: options.font,
		wave: options.wave,
		idle: options.idle,
		onLayout: () => settle()
	});
	const rendered = render;
	const scheme = !options.backdrop && typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
	const onScheme = () => rendered.request("cut");
	scheme?.addEventListener?.("change", onScheme);
	function settle() {
		if (!render) return;
		while (free.length && free[0] < seatCount) {
			let waiting;
			for (const g$1 of render.guys.values()) if (g$1.seat >= seatCount && (!waiting || arrived.get(g$1.key) < arrived.get(waiting))) waiting = g$1.key;
			if (!waiting) return;
			const g = render.guys.get(waiting), seat = free.shift();
			release(g.seat);
			render.move(g, seat);
		}
	}
	function release(seat) {
		let i = 0;
		while (i < free.length && free[i] < seat) i++;
		free.splice(i, 0, seat);
	}
	/** Picks the scale again for the crowd now, laying it out again when it changes. */
	function rescale() {
		const [w, h] = css(), z = zoomFor(w, h, rendered.guys.size, zoom);
		if (z === zoom) return;
		zoom = z;
		rendered.relayout(rendered.guys.size > 300 ? "fade" : "slide");
	}
	return {
		add(name, guy = {}) {
			const key = name.toLowerCase();
			if (rendered.guys.has(key)) return;
			const seat = free.length && free[0] < seatCount ? free.shift() : next++;
			arrived.set(key, arrivals++);
			rendered.join(key, {
				...guy,
				seed: guy.seed ?? key
			}, seat);
			rescale();
		},
		remove(name) {
			const g = rendered.guys.get(name.toLowerCase());
			if (!g) return;
			rendered.leave(g);
			arrived.delete(g.key);
			release(g.seat);
			settle();
			rescale();
		},
		has: (name) => rendered.guys.has(name.toLowerCase()),
		hop(name) {
			const g = rendered.guys.get(name.toLowerCase());
			if (g) rendered.hop(g);
		},
		wave(on) {
			rendered.wave(on);
		},
		spotlight(name, label, ms = 2600) {
			const g = rendered.guys.get(name.toLowerCase());
			if (g) rendered.spotlight(g, label ?? name, ms);
		},
		resize() {
			const [w, h] = css();
			zoom = zoomFor(w, h, rendered.guys.size, zoom);
			laidCss = "";
			rendered.resize();
		},
		destroy() {
			rendered.destroy();
			scheme?.removeEventListener?.("change", onScheme);
			free.length = 0;
			arrived.clear();
		},
		get count() {
			return rendered.guys.size;
		},
		get seats() {
			return seatCount;
		}
	};
}
/**
* A still crowd as one picture, with no canvas: `guys` take the seats from the front middle back, and
* `fill` more fill the rest with made-up guys, dealt from `seed` with nothing on (no pet shop items, no
* buddies), so a short board still stands in a full stand. Opaque on `backdrop`, far rows tinted toward
* it as `createCrowd` draws them. `width` × `height` world pixels, RGBA.
*/
function crowdPicture(guys, width, height, options = {}) {
	const seats = crowdSeats(width, height, options.density ?? 1);
	const seed = options.seed ?? "crowd";
	const count$1 = Math.min(seats.length, guys.length + Math.max(0, options.fill ?? 0));
	const n = parseInt((options.backdrop ?? "#1d2030").slice(1, 7), 16), bg = [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	];
	const rgba = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < rgba.length; i += 4) {
		rgba[i] = bg[0];
		rgba[i + 1] = bg[1];
		rgba[i + 2] = bg[2];
		rgba[i + 3] = 255;
	}
	const sat = Array.from({ length: count$1 }, (_, k) => k).sort((a, b$1) => seats[a].row - seats[b$1].row || seats[a].x - seats[b$1].x);
	for (const k of sat) {
		const seat = seats[k], a = HAZE[seat.size];
		const spec = k < guys.length ? {
			...guys[k],
			seed: guys[k].seed ?? `${seed}:${k}`
		} : { seed: `${seed}:${k}` };
		const sprite = crowdSprite(spec, seat.size);
		for (let y = 0; y < seat.size; y++) for (let x = 0; x < seat.size; x++) {
			const px = seat.x + x, py = seat.y + y, o = (y * seat.size + x) * 4;
			if (!sprite.rgba[o + 3] || px < 0 || py < 0 || px >= width || py >= height) continue;
			const at = (py * width + px) * 4;
			for (let c = 0; c < 3; c++) rgba[at + c] = Math.round(sprite.rgba[o + c] * (1 - a) + bg[c] * a);
		}
	}
	return rgba;
}

//#endregion
//#region src/stadium.ts
/** The venues, smallest first: who fits. */
const VENUES = [
	{
		id: "porch",
		name: "The porch",
		upTo: 20
	},
	{
		id: "bleachers",
		name: "The bleachers",
		upTo: 50
	},
	{
		id: "gym",
		name: "The gym",
		upTo: 100
	},
	{
		id: "hall",
		name: "The hall",
		upTo: 200
	},
	{
		id: "arena",
		name: "The arena",
		upTo: 1e3
	},
	{
		id: "stadium",
		name: "The stadium",
		upTo: 5e3
	},
	{
		id: "bowl",
		name: "The bowl",
		upTo: 12e3
	}
];
/** The venue for `count` people: the smallest that seats them all (the bowl past its size). */
const venueFor = (count$1) => (VENUES.find((v) => count$1 <= v.upTo) ?? VENUES[VENUES.length - 1]).id;
/** Sizes a stand's rows step through, nearest first; neighbouring rows differ by one at most. */
const LADDER = [
	16,
	14,
	12,
	10,
	8,
	6,
	5,
	3,
	2
];
if (LADDER.some((s) => !CROWD_SIZES.includes(s))) throw new Error("crowd size missing");
const STYLES = {
	porch: {
		floor: .14,
		stand: .6,
		bow: 0,
		cap: .22,
		fronts: [16],
		depth: 0,
		rise: .66,
		pitch: 1.16,
		section: 0,
		tiers: [],
		arches: 0,
		centred: 3,
		boards: false,
		haze: "#1c2238",
		hazeMax: 0,
		seats: ["#a0714a"]
	},
	bleachers: {
		floor: .15,
		stand: .6,
		bow: 0,
		cap: .14,
		fronts: [
			16,
			14,
			12,
			10
		],
		depth: 4,
		rise: .8,
		pitch: 1.05,
		section: 0,
		tiers: [],
		arches: 0,
		boards: false,
		haze: "#3b3358",
		hazeMax: .12,
		seats: ["#9aa6b8"]
	},
	gym: {
		floor: .22,
		stand: .52,
		bow: 0,
		cap: .115,
		fronts: [
			16,
			14,
			12,
			10,
			8
		],
		depth: 2.5,
		rise: .78,
		pitch: 1,
		section: 0,
		tiers: [],
		arches: 0,
		boards: false,
		haze: "#3d3548",
		hazeMax: .15,
		seats: ["#c58b4f"]
	},
	hall: {
		floor: .12,
		stand: .74,
		bow: 0,
		cap: .095,
		fronts: [
			16,
			14,
			12,
			10,
			8,
			6
		],
		depth: 1.6,
		rise: .75,
		pitch: 1,
		section: 13,
		tiers: [.48],
		arches: 0,
		boards: false,
		haze: "#1d1222",
		hazeMax: .25,
		seats: ["#7a1f35", "#6a1a30"]
	},
	arena: {
		floor: .13,
		stand: .6,
		bow: .035,
		cap: .07,
		fronts: [
			16,
			14,
			12,
			10,
			8,
			6,
			5
		],
		depth: 1,
		rise: .8,
		pitch: 1,
		section: 14,
		tiers: [.56],
		arches: 3,
		boards: true,
		haze: "#141826",
		hazeMax: .3,
		seats: ["#2a3a5e", "#30345a"]
	},
	stadium: {
		floor: .13,
		stand: .66,
		bow: .05,
		cap: .045,
		fronts: [
			16,
			14,
			12,
			10,
			8,
			6,
			5,
			3
		],
		depth: .7,
		rise: .82,
		pitch: 1,
		section: 26,
		tiers: [.5],
		arches: 4,
		boards: true,
		haze: "#141a2a",
		hazeMax: .36,
		seats: ["#2b3e66", "#34305a"]
	},
	bowl: {
		floor: .12,
		stand: .7,
		bow: .06,
		cap: .035,
		fronts: [
			12,
			10,
			8,
			6,
			5,
			3,
			2
		],
		depth: .5,
		rise: .85,
		pitch: 1,
		section: 28,
		tiers: [.34, .68],
		arches: 5,
		boards: true,
		haze: "#121726",
		hazeMax: .44,
		seats: [
			"#2b3e66",
			"#34305a",
			"#2a4552"
		]
	}
};
/** The club's colours, for boards, banners and fascias. */
const CLUB = [
	"#e8792f",
	"#2e8c8a",
	"#4e7fb3",
	"#c2403f",
	"#3fa35b",
	"#7d4fa6",
	"#e36a8e",
	"#e7b53b",
	"#8a93a0"
];
/** The roof or ceiling, as a fraction of height, over the venues that have one. */
const ROOF = {
	arena: .2,
	stadium: .13,
	bowl: .17
};
const riseOf = (st, s) => s <= 5 ? s : Math.max(s - 3, Math.round(s * st.rise));
const pitchOf = (st, s) => Math.max(s, Math.round(s * st.pitch));
function plan(id, W$1, H$1, front, count$1, countOnly = false, spill = 0, depth = STYLES[id].depth) {
	const st = spill >= 3 ? {
		...STYLES[id],
		tiers: [],
		section: 0,
		bow: 0,
		arches: 0
	} : STYLES[id], cx = W$1 / 2;
	const floorTop = spill >= 2 ? H$1 : H$1 - Math.round(H$1 * st.floor), board = st.boards ? Math.max(2, Math.round(front * .35)) : 0;
	const standMax = H$1 * st.stand, bowH = st.bow * Math.min(H$1, W$1 * 9 / 16);
	const bowAt = (x) => {
		const u = (x - cx) / (W$1 / 2);
		return bowH * Math.max(0, 1 - u * u);
	};
	const rows = [], breaks = [];
	let lift = 0, at = LADDER.indexOf(front), tier = 0;
	const roof = spill ? 0 : (ROOF[id] ?? 0) * H$1, room = floorTop - board - bowH - roof - 2;
	for (let r = 0; r < (st.centred || 400); r++) {
		const want = depth ? front / (1 + lift / (depth * H$1)) : front;
		if (r > 0 && at < LADDER.length - 1 && Math.abs(Math.log(LADDER[at + 1] / want)) < Math.abs(Math.log(LADDER[at] / want))) at++;
		const size = LADDER[at];
		if (lift + size > Math.max(standMax, 0) && lift + size > room) break;
		if (lift + size > standMax && countOnly) break;
		const pitch = pitchOf(st, size), rise = riseOf(st, size);
		rows.push({
			size,
			pitch,
			rise,
			lift,
			tier,
			shadow: false,
			aisle: Math.min(2, Math.max(1, Math.round(size * .25))),
			section: st.section
		});
		lift += rise;
		if (tier < st.tiers.length && lift >= st.tiers[tier] * standMax) {
			const h = Math.max(3, Math.round(size * .6));
			breaks.push({
				lift,
				h
			});
			rows.slice(-2).forEach((row) => {
				row.shadow = true;
			});
			lift += h;
			tier++;
		}
	}
	const feet = (r, x) => floorTop - board - bowAt(x) - rows[r].lift;
	const arches = [];
	const lower = rows.filter((r) => r.tier === 0).length;
	if (st.arches && lower >= 6 && !countOnly && rows[Math.max(1, Math.round(lower * .35))].size >= 6) {
		const row = Math.max(1, Math.round(lower * .35)), r0 = rows[row], secW = st.section * r0.pitch + r0.aisle;
		for (let v = 0; v < st.arches; v++) {
			const j = Math.round((W$1 * (v + .5) / st.arches - cx) / secW);
			if (arches.some((a) => a.x === j)) continue;
			arches.push({
				x: j,
				w: 3,
				row
			});
		}
	}
	const seats = [];
	let n = 0;
	rows.forEach((row, r) => {
		if (n >= count$1 && !countOnly) return;
		const s = row.size, p = row.pitch, odd = r % 2 === 1;
		const xs = [];
		if (st.centred) {
			const per = Math.max(1, Math.floor((W$1 - 4) / p)), left = Math.max(0, count$1 - n), rowsLeft = Math.max(1, Math.ceil(left / per));
			const here = Math.min(per, Math.ceil(left / rowsLeft));
			const prev = seats.filter((q) => q.row === r - 1).length;
			const shift$1 = r > 0 && (prev - here) % 2 === 0 ? r % 2 ? p / 2 : -p / 2 : 0;
			for (let i = 0; i < here; i++) xs.push(Math.round(cx + (i - (here - 1) / 2) * p - s / 2 + shift$1));
		} else if (row.section) {
			const secW = row.section * p + row.aisle, inSec = odd ? row.section - 1 : row.section;
			const j0 = Math.floor(-cx / secW) - 1, j1 = Math.ceil((W$1 - cx) / secW) + 1;
			for (let j = j0; j <= j1; j++) {
				const left = cx + (j - .5) * secW + row.aisle / 2 + (odd ? p / 2 : 0);
				const arch = arches.find((a) => a.x === j && r >= a.row && r < a.row + 2);
				for (let i = 0; i < inSec; i++) {
					if (arch && Math.abs(i - (inSec - 1) / 2) < arch.w / 2) continue;
					xs.push(Math.round(left + i * p + (p - s) / 2));
				}
			}
		} else {
			const start = cx - s / 2 + (odd ? p / 2 : 0), i0 = Math.ceil(-start / p), i1 = Math.floor((W$1 - s - start) / p);
			for (let i = i0; i <= i1; i++) xs.push(Math.round(start + i * p));
		}
		for (const x0 of xs) {
			const j = s <= 5 ? (r * 73856093 ^ x0 * 19349663) >>> 0 : 0, x = x0 + (j % 7 === 0 ? 1 : j % 7 === 1 ? -1 : 0);
			if (x < 0 || x + s > W$1) continue;
			const y = Math.round(feet(r, x0 + s / 2)) - s + (j % 5 === 2 ? 1 : j % 5 === 3 ? -1 : 0);
			if (y < 0) continue;
			n++;
			if (!countOnly) seats.push({
				x,
				y,
				size: s,
				row: r
			});
		}
	});
	if (countOnly) return n;
	if (seats.length < count$1 && spill < 3) return plan(id, W$1, H$1, front, count$1, false, !spill && (ROOF[id] ?? 0) > 0 ? 1 : Math.max(2, spill + 1), depth);
	seats.sort((p, q) => p.row - q.row || Math.abs(p.x + p.size / 2 - cx) - Math.abs(q.x + q.size / 2 - cx) || p.x - q.x);
	const used = seats.length ? Math.min(rows.length, seats[Math.min(seats.length, count$1) - 1].row + 1) : 0;
	return {
		id,
		W: W$1,
		H: H$1,
		cx,
		floorTop,
		board,
		standMax,
		rows,
		seats,
		used,
		breaks,
		arches,
		bowAt,
		feet
	};
}
/** How many seats a venue has on a world at a front size: the same whatever the head count (but on the porch, whose rows centre on who's there), so a growing crowd works each out once. */
const seatCounts = new Map();
function seatsAt(id, W$1, H$1, front, count$1, depth = STYLES[id].depth) {
	if (STYLES[id].centred) return plan(id, W$1, H$1, front, count$1, true, 0, depth);
	const key = `${id} ${W$1} ${H$1} ${front} ${depth}`;
	let n = seatCounts.get(key);
	if (n === void 0) {
		if (seatCounts.size > 4e3) seatCounts.clear();
		seatCounts.set(key, n = plan(id, W$1, H$1, front, count$1, true, 0, depth));
	}
	return n;
}
/**
* How a venue sits on a canvas `devW` × `devH` device pixels for `count` people: whole device pixels to a
* world pixel (never under one CSS pixel to one world pixel), and the front-row size, as big as the
* venue allows while everyone still fits.
*/
function fit$1(id, devW, devH, dpr, count$1) {
	const st = STYLES[id], cap = st.cap * devH / dpr, kCss = Math.max(1, Math.ceil(dpr - 1e-6));
	const fronts = [...st.fronts, ...LADDER.filter((s) => s < st.fronts[st.fronts.length - 1])];
	const found = [];
	for (let k = 1; k < kCss + 80; k++) {
		const W$2 = Math.ceil(devW / k), H$2 = Math.ceil(devH / k);
		if (H$2 < 20 || fronts[fronts.length - 1] * k / dpr > cap) break;
		for (const front of fronts) {
			const css$1 = front * k / dpr;
			if (css$1 > cap) continue;
			if (seatsAt(id, W$2, H$2, front, count$1) >= count$1) {
				found.push({
					k,
					front,
					css: css$1
				});
				break;
			}
		}
	}
	const css = found.filter((f) => f.k >= kCss), faces = found.filter((f) => f.front >= 5);
	const pool = css.some((f) => f.front >= 5) ? css : faces.length ? faces : found;
	if (!pool.length) return {
		k: 1,
		front: fronts[fronts.length - 1],
		css: 0,
		depth: st.depth
	};
	const score = (f) => f.css * Math.pow(f.front / 16, 1.5);
	const best = pool.reduce((b$1, f) => score(f) > score(b$1) ? f : b$1);
	const W$1 = Math.ceil(devW / best.k), H$1 = Math.ceil(devH / best.k);
	let lo = st.depth, hi = st.depth * 24;
	if (st.depth) for (let i = 0; i < 7; i++) {
		const mid = (lo + hi) / 2;
		if (seatsAt(id, W$1, H$1, best.front, count$1, mid) >= count$1) lo = mid;
		else hi = mid;
	}
	return {
		...best,
		depth: lo
	};
}
/** How many people a venue is laid out for while `count` are in: in steps of about 15%, so a growing crowd re-seats now and then. */
function stepFor(count$1) {
	const i = VENUES.findIndex((v$1) => count$1 <= v$1.upTo), v = VENUES[i < 0 ? VENUES.length - 1 : i];
	if (i >= 0 && i <= 1) return Math.max(1, count$1);
	const lo = i < 0 ? VENUES[VENUES.length - 1].upTo : VENUES[i - 1].upTo + 1;
	let s = lo;
	while (s < count$1) s = Math.ceil(s * 1.15);
	return i < 0 ? s : Math.min(s, v.upTo);
}
/**
* The seats of venue `id`, in the order they fill: the front row first, from the middle out, then the row
* behind, so a part-full venue is full at the front. Laid out for a canvas (`width` × `height` CSS pixels
* at `dpr`, 1280 × 720 at 1 unless given) and `count` people (the venue's size unless given), as a
* stadium on that canvas lays it out.
*/
function stadiumSeats(id, options = {}) {
	const dpr = options.dpr ?? 1, w = Math.round((options.width ?? 1280) * dpr), h = Math.round((options.height ?? 720) * dpr);
	const people = options.count ?? VENUES.find((v) => v.id === id).upTo, count$1 = venueFor(people) === id ? stepFor(people) : people;
	const f = fit$1(id, w, h, dpr, count$1);
	return plan(id, Math.ceil(w / f.k), Math.ceil(h / f.k), f.front, count$1, false, 0, f.depth).seats;
}
const BAYER = [
	0,
	8,
	2,
	10,
	12,
	4,
	14,
	6,
	3,
	11,
	1,
	9,
	15,
	7,
	13,
	5
];
/** A picture at world pixels, painted by hand: rects, dithered washes and blends, all on whole pixels. */
var Pic = class Pic {
	px;
	constructor(W$1, H$1) {
		this.W = W$1;
		this.H = H$1;
		this.px = new Uint32Array(W$1 * H$1);
	}
	static seen = new Map();
	static c(hex$2) {
		let c = Pic.seen.get(hex$2);
		if (c === void 0) {
			const n = parseInt(hex$2.slice(1, 7), 16);
			Pic.seen.set(hex$2, c = (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0);
		}
		return c;
	}
	rect(x, y, w, h, hex$2, level = 16) {
		const c = Pic.c(hex$2), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
		if (x1 <= x0) return;
		for (let j = y0; j < y1; j++) {
			if (level >= 16) {
				this.px.fill(c, j * this.W + x0, j * this.W + x1);
				continue;
			}
			for (let r = 0; r < 4; r++) if (BAYER[(j & 3) * 4 + r] < level) for (let i = x0 + (r - x0 & 3); i < x1; i += 4) this.px[j * this.W + i] = c;
		}
	}
	dot(x, y, hex$2) {
		this.rect(x, y, 1, 1, hex$2);
	}
	/** Blends a rect toward a colour by `a`, for lines painted on a floor. */
	mix(x, y, w, h, hex$2, a) {
		const c = Pic.c(hex$2), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
		for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
			const o = this.px[j * this.W + i];
			let out = 255 << 24;
			for (let s = 0; s < 24; s += 8) out |= Math.round((o >> s & 255) * (1 - a) + (c >> s & 255) * a) << s;
			this.px[j * this.W + i] = out >>> 0;
		}
	}
	/** Bands from `top` to `bottom` of colours, each dithered into the next. */
	bands(top, bottom, colours) {
		const h = bottom - top, n = colours.length;
		for (let j = Math.max(0, Math.floor(top)); j < Math.min(this.H, bottom); j++) {
			const u = (j - top) / h * (n - 1), i = Math.min(n - 2, Math.floor(u)), f = u - i;
			this.rect(0, j, this.W, 1, colours[i]);
			this.rect(0, j, this.W, 1, colours[i + 1], Math.round(f * 16));
		}
	}
	canvas() {
		const c = document.createElement("canvas");
		c.width = this.W;
		c.height = this.H;
		const g = c.getContext("2d"), img = g.createImageData(this.W, this.H);
		img.data.set(new Uint8ClampedArray(this.px.buffer));
		g.putImageData(img, 0, 0);
		return c;
	}
};
const shades = new Map();
/** A colour `f` of the way to white (or, below 0, to black), worked out once. */
const shade = (hex$2, f) => {
	const key = hex$2 + f;
	let out = shades.get(key);
	if (out === void 0) {
		const n = parseInt(hex$2.slice(1, 7), 16);
		shades.set(key, out = "#" + [
			n >> 16 & 255,
			n >> 8 & 255,
			n & 255
		].map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))).toString(16).padStart(2, "0")).join(""));
	}
	return out;
};
/** The stand under the seats: a tread per row in the seat colour, a riser line under it, a seat back per seat, aisles and arches. */
function paintStand(pic, p, top) {
	const st = STYLES[p.id], { W: W$1 } = p;
	const runs$1 = [];
	for (let x = 0; x < W$1;) {
		const up = Math.round(-p.bowAt(x + .5));
		let e = x + 1;
		while (e < W$1 && Math.round(-p.bowAt(e + .5)) === up) e++;
		runs$1.push(x, e, up);
		x = e;
	}
	for (let r = top - 1; r >= 0; r--) {
		const row = p.rows[r], seat = st.seats[Math.min(row.tier, st.seats.length - 1)], tread = shade(seat, -.25), edge = shade(seat, -.5), base = Math.round(p.feet(r, 0) + p.bowAt(0));
		for (let i = 0; i < runs$1.length; i += 3) {
			const x = runs$1[i], w = runs$1[i + 1] - x, feet = base + runs$1[i + 2];
			pic.rect(x, feet - row.rise, w, row.rise, tread);
			pic.rect(x, feet - 1, w, 1, edge);
		}
	}
	for (const s of p.seats) if (s.row < top) {
		const row = p.rows[s.row], seat = st.seats[Math.min(row.tier, st.seats.length - 1)], h = Math.max(1, Math.round(s.size * .45));
		pic.rect(s.x + (s.size > 4 ? 1 : 0), s.y + s.size - h - 1, Math.max(1, s.size - (s.size > 4 ? 2 : 0)), h, seat);
		if (s.size >= 6) pic.rect(s.x + 1, s.y + s.size - h - 1, s.size - 2, 1, shade(seat, .25));
	}
	for (let r = 0; r < top; r++) {
		const row = p.rows[r], secW = row.section * row.pitch + row.aisle;
		if (!row.section) continue;
		for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W$1 - p.cx) / secW) + 1; j++) {
			const x = Math.round(p.cx + (j - .5) * secW - row.aisle / 2), feet = Math.round(p.feet(r, x));
			pic.rect(x, feet - row.rise, row.aisle, row.rise, shade(st.seats[0], .12));
			pic.rect(x, feet - 1, row.aisle, 1, shade(st.seats[0], -.35));
			if (r % 3 === 1) pic.dot(x + row.aisle, feet - row.rise, "#aeb6c6");
		}
	}
	for (const a of p.arches) {
		if (a.row + 1 >= top) continue;
		const r0 = p.rows[a.row], secW = r0.section * r0.pitch + r0.aisle, mid = Math.round(p.cx + a.x * secW), w = Math.round(a.w * r0.pitch) + 1;
		const bottom = Math.round(p.feet(a.row, mid)), topY = Math.round(p.feet(a.row + 1, mid) - p.rows[a.row + 1].rise), x = mid - (w >> 1), rim$1 = shade(st.seats[0], .25);
		pic.rect(x - 1, topY - 1, w + 2, bottom - topY + 1, rim$1);
		pic.rect(x, topY, w, bottom - topY, "#0b0e18");
		pic.rect(x, topY, w, 1, "#141a28");
		pic.dot(x, topY, rim$1);
		pic.dot(x + w - 1, topY, rim$1);
	}
}
/** Tier fascias across the stand: a band in the club's colours with a light top edge, and its shadow on the rows under it. */
function paintBreaks(pic, p, top, dark) {
	p.breaks.forEach((b$1) => {
		if (!p.rows.some((r, i) => i < top && r.lift > b$1.lift)) return;
		const bw = Math.max(16, Math.round(p.W / 14));
		for (let x = 0; x < p.W; x++) {
			const y = Math.round(p.floorTop - p.board - p.bowAt(x + .5) - b$1.lift - b$1.h);
			pic.rect(x, y, 1, b$1.h, dark);
			pic.rect(x, y, 1, 1, "#c9d1de");
			if (b$1.h >= 4) pic.rect(x, y + 2, 1, b$1.h - 3, CLUB[Math.floor(x / bw) % CLUB.length], 9);
		}
	});
}
/** Boards along the front in the club's colours, a straight segment each, and the floor under them. */
function paintBoards(pic, p, floor) {
	const bw = Math.max(16, Math.round(p.W / 12));
	for (let x0 = -((p.cx - bw / 2) % bw + bw) % bw; x0 < p.W; x0 += bw) {
		const y = Math.round(p.floorTop - p.board - p.bowAt(x0 + bw / 2));
		pic.rect(x0, y, bw, 1, "#c9d1de");
		pic.rect(x0, y + 1, bw, p.board - 1, CLUB[Math.floor((x0 + 4 * bw) / bw) % CLUB.length]);
		pic.rect(x0, y + p.board - 1, bw, 1, "#0b0e18");
		floor(x0, y + p.board, bw);
	}
}
/** Light hung along the top: a bank of bright cells, a dithered wash under it. */
function lightBank(pic, x, y, cell, cols, rows, wash, washTo, sky) {
	const w = cols * (cell + 1) + 1, h = rows * (cell + 1) + 1;
	for (let b$1 = 0; b$1 < 3; b$1++) {
		const spread = (b$1 + 1) * .5, level = [
			7,
			4,
			2
		][b$1];
		for (let j = y + h; j < washTo; j++) {
			const u = (j - y) / Math.max(1, washTo - y), half = w / 2 + wash * spread * u;
			pic.rect(x - half, j, half * 2, 1, shade(sky, .18), level);
		}
	}
	pic.rect(x - w / 2 - 1, y - 1, w + 2, h + 2, "#232838");
	for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
		const cx = Math.round(x - w / 2 + 1 + i * (cell + 1)), cy = y + 1 + j * (cell + 1);
		pic.rect(cx, cy, cell, cell, "#fff3c4");
		if (cell >= 3) pic.dot(cx + (cell >> 1), cy + (cell >> 1), "#ffffff");
	}
	return {
		x,
		y: y + h
	};
}
/**
* A scoreboard centred on `cx` from `y`, at most `w` wide and `h` tall: a frame round two numbers in
* blocky segments, sized from the digit (3 wide at least), two digits where four don't fit, none where
* two don't. Returns the board's left edge and width.
*/
function scoreboard(pic, cx, y, w, h, c, frame) {
	const dh = Math.max(5, Math.min(h - 4, 11)), t = dh >= 9 ? 2 : 1;
	const fits = (n$1) => Math.min(Math.floor(dh * .6), Math.floor((w - 4 - (n$1 - 1) - (n$1 > 2 ? 1 : 0)) / n$1));
	const n = fits(4) >= 3 ? 4 : fits(2) >= 3 ? 2 : 0, dw = n ? fits(n) : 0;
	const bw = n ? n * dw + (n - 1) + (n > 2 ? 1 : 0) + 4 : Math.min(w, 8), bh = dh + 4, x = Math.round(cx - bw / 2);
	pic.rect(x - 1, y - 1, bw + 2, bh + 2, frame);
	pic.rect(x, y, bw, bh, "#151a26");
	for (let i = 0; i < n; i++) {
		const dx = x + 2 + i * (dw + 1) + (n > 2 && i > 1 ? 1 : 0), on = [
			119,
			18,
			93,
			91
		][(i * 3 + 1) % 4], half = Math.floor(dh / 2);
		const seg = [
			[
				0,
				0,
				dw,
				t
			],
			[
				0,
				0,
				t,
				half + 1
			],
			[
				dw - t,
				0,
				t,
				half + 1
			],
			[
				0,
				half,
				dw,
				t
			],
			[
				0,
				half,
				t,
				dh - half
			],
			[
				dw - t,
				half,
				t,
				dh - half
			],
			[
				0,
				dh - t,
				dw,
				t
			]
		];
		seg.forEach(([sx, sy, sw, sh], k) => pic.rect(dx + sx, y + 2 + sy, sw, sh, on >> 6 - k & 1 ? c : shade(c, -.75)));
	}
	return [x, bw];
}
/** A sagging string of bulbs from `x0` to `x1`, each with a dithered glow; where each bulb hangs. */
function bulbs(pic, x0, x1, y, sag, every) {
	const at = [];
	for (let x = Math.floor(x0); x <= x1; x++) {
		const u = (x - x0) / (x1 - x0);
		pic.dot(x, Math.round(y + 4 * sag * u * (1 - u)), "#14111a");
	}
	let n = 0;
	for (let x = x0 + every / 2; x < x1; x += every, n++) {
		const u = (x - x0) / (x1 - x0), by = Math.round(y + 4 * sag * u * (1 - u)) + 1, c = [
			"#ffd45c",
			"#ff8a8a",
			"#8fd8ff",
			"#b7f28a"
		][n % 4];
		pic.rect(x - 1, by, 3, 2, shade(c, -.5));
		pic.rect(x, by - 1, 1, 4, shade(c, -.5));
		pic.rect(x, by, 1, 2, c);
		at.push({
			x,
			y: by + 2
		});
	}
	return at;
}
/** Paints a venue's picture for its plan (everything behind the guys), and where its lights hang, for a spotlight. */
function paintVenue(p) {
	const { W: W$1, H: H$1, id } = p, pic = new Pic(W$1, H$1), st = STYLES[id], lights = [];
	if (!p.rows.length) {
		pic.rect(0, 0, W$1, H$1, "#1d2333");
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	let top = Math.max(1, Math.min(p.rows.length, p.used));
	for (let extra = id === "bleachers" ? 2 : id === "gym" ? 1 : 0; extra > 0 && top < p.rows.length && p.rows[top].lift + p.rows[top].size <= p.standMax; extra--) top++;
	const r = top - 1, standTop = (x) => Math.round(p.feet(r, x) - p.rows[r].rise - (p.rows[r].size - p.rows[r].rise));
	const fr = Math.max(1, Math.round(H$1 / 90));
	if (id === "porch") {
		pic.rect(0, 0, W$1, H$1, "#3b4a5e");
		for (let y = 0; y < H$1; y += Math.max(3, fr * 3)) {
			pic.rect(0, y, W$1, 1, "#2f3c4f");
			pic.rect(0, y + 1, W$1, 1, "#45566c");
		}
		const eave = Math.round(H$1 * .11), winW = Math.round(W$1 * .18), winH = Math.round(H$1 * .22), wx = Math.round(W$1 * .16), wy = Math.round(H$1 * .24);
		pic.rect(wx - 4, wy - 4, winW + 8, winH + 8, "#4f5560");
		pic.rect(wx - 2, wy - 2, winW + 4, winH + 4, "#6b6862");
		pic.rect(wx - 1, wy - 1, winW + 2, winH + 2, "#2a2230");
		pic.rect(wx, wy, winW, winH, "#ffd27a");
		pic.rect(wx, wy + winH - Math.round(winH * .3), winW, Math.round(winH * .3), "#f2b45a");
		pic.rect(wx + Math.round(winW / 2), wy, 1, winH, "#2a2230");
		pic.rect(wx, wy + Math.round(winH / 2), winW, 1, "#2a2230");
		const dw = Math.round(W$1 * .12), dx = Math.round(W$1 * .68), dy = Math.round(H$1 * .2);
		pic.rect(dx - 2, dy - 2, dw + 4, H$1, "#2b2433");
		pic.rect(dx, dy, dw, H$1, "#6b4a33");
		pic.rect(dx + 2, dy + 3, dw - 4, Math.round(H$1 * .18), "#5a3d2a");
		pic.rect(dx + dw - 4, Math.round(H$1 * .42), 2, 2, "#e7b53b");
		pic.rect(0, 0, W$1, eave, "#1c2238");
		pic.rect(0, eave - 2, W$1, 2, "#2a2230");
		pic.rect(0, eave, W$1, 1, "#5a4a3a");
		for (const px of [0, W$1 - Math.max(3, Math.round(W$1 * .025))]) {
			const pw = Math.max(3, Math.round(W$1 * .025));
			pic.rect(px, eave, pw, H$1, "#8a5f3e");
			pic.rect(px + 1, eave, 1, H$1, "#a8794f");
		}
		lights.push(...bulbs(pic, W$1 * .03, W$1 * .97, eave + 1, H$1 * .05, Math.max(8, Math.round(W$1 / 14))));
	} else if (id === "bleachers") {
		const horizon = Math.round(standTop(p.cx) + H$1 * .03);
		pic.bands(0, horizon, [
			"#26284a",
			"#4a3a68",
			"#8a4f6e",
			"#e0876a"
		]);
		for (let x = 0; x < W$1; x++) {
			const t = Math.round(H$1 * .07 + hash("tree" + Math.floor(x / 5)) % 7 + 3 * Math.sin(x / 9));
			pic.rect(x, horizon - t, 1, H$1, "#1d2a2a");
		}
		const sbx = Math.round(W$1 * .87), sby = Math.round(H$1 * .12);
		pic.rect(sbx - 1, sby, 2, horizon, "#2a2f3d");
		scoreboard(pic, sbx, sby, Math.round(W$1 * .14), Math.round(H$1 * .09), "#ff7a3c", "#2a2f3d");
	} else if (id === "gym") {
		pic.rect(0, 0, W$1, H$1, "#b3a891");
		for (let y = 0; y < H$1; y += 3 * fr) {
			pic.rect(0, y, W$1, 1, "#a39883");
			for (let x = y / (3 * fr) % 2 * 4 * fr; x < W$1; x += 8 * fr) pic.rect(x, y, 1, 3 * fr, "#a39883");
		}
		const wallTop = Math.round(H$1 * .04);
		pic.rect(0, 0, W$1, wallTop, "#2a2630");
		const winY = Math.round(H$1 * .07), winH = Math.round(H$1 * .1), n = Math.max(3, Math.round(W$1 / 80)), ww = Math.round(W$1 / n * .55);
		for (let i = 0; i < n; i++) {
			const x = Math.round((i + .5) * W$1 / n - ww / 2);
			pic.rect(x - 1, winY - 1, ww + 2, winH + 2, "#4a4f5c");
			pic.rect(x, winY, ww, winH, "#9ec3e6");
			pic.rect(x, winY, ww, Math.round(winH / 3), "#b9d6f0");
			for (let m = 1; m < 3; m++) pic.rect(x + Math.round(ww * m / 3), winY, 1, winH, "#4a4f5c");
		}
		pic.rect(0, Math.round(H$1 * .24), W$1, Math.max(2, fr * 2), "#2c3a5e");
		for (const u of [.35, .65]) {
			const x = Math.round(W$1 * u), lw = Math.max(5, Math.round(W$1 * .03)) | 1, ly = wallTop + Math.max(3, Math.round(H$1 * .06)), lh = Math.max(2, lw >> 1);
			pic.rect(x, 0, 1, ly, "#3a3640");
			for (let j = 0; j < lh; j++) {
				const half = (lw >> 1) - (lh - 1 - j);
				pic.rect(x - Math.max(1, half), ly + j, Math.max(1, half) * 2 + 1, 1, j ? "#3d4452" : "#5a6272");
			}
			pic.rect(x - 1, ly + lh, 3, 1, "#fff3c4");
			for (let j = 1; j < 6; j++) pic.rect(x - j * 2, ly + lh + j, j * 4 + 1, 1, "#e7d9a8", 2);
			lights.push({
				x,
				y: ly + lh + 1
			});
		}
		[
			.2,
			.5,
			.8
		].forEach((u, i) => {
			if (i === 1) {
				scoreboard(pic, Math.round(W$1 * u), Math.round(H$1 * .06), Math.round(W$1 * .2), Math.round(H$1 * .1), "#ff5a4a", "#0d0f16");
				return;
			}
			const bw = Math.round(W$1 * .07), bh = Math.round(H$1 * .17), bx = Math.round(W$1 * u - bw / 2), c = CLUB[i * 2];
			pic.rect(bx, wallTop, bw, bh, c);
			pic.rect(bx, wallTop + Math.round(bh * .25), bw, Math.max(1, fr), shade(c, .45));
			for (let k = 0; k < bw / 2; k++) pic.rect(bx + k, wallTop + bh + k * 0, 1, Math.round(bw / 2 - k) * .6 + 1, c), pic.rect(bx + bw - 1 - k, wallTop + bh, 1, Math.round(bw / 2 - k) * .6 + 1, c);
			pic.rect(bx + bw / 2 - 1, wallTop + bh, 2, Math.round(bw * .3), "#b3a891");
		});
	} else if (id === "hall") {
		pic.rect(0, 0, W$1, H$1, "#2e1c33");
		const ceil = Math.round(H$1 * .08), cw = Math.max(6, Math.round(W$1 / 18)), ch = Math.max(2, Math.round(ceil / 3));
		pic.rect(0, 0, W$1, ceil, "#1d1222");
		for (let x = Math.round(cw / 4); x < W$1; x += cw) for (let y = 2; y + ch <= ceil - 2; y += ch + 2) {
			pic.rect(x, y, cw - 3, ch, "#281830");
			pic.rect(x, y + ch - 1, cw - 3, 1, "#35223c");
		}
		pic.rect(0, ceil, W$1, Math.max(1, fr), "#b58a3a");
		pic.rect(0, ceil + Math.max(1, fr), W$1, 1, "#6e5022");
		const n = Math.max(4, Math.round(W$1 / 60)), wall = standTop(p.cx);
		for (let i = 0; i <= n; i++) {
			const x = Math.round(i * W$1 / n), pw = Math.max(3, Math.round(W$1 * .025));
			pic.rect(x - pw / 2, ceil + 2, pw, H$1, "#3a2440");
			pic.rect(x - pw / 2, ceil + 2, 1, H$1, "#4a2f50");
			const sy = Math.round(ceil + (wall - ceil) * .62);
			if (sy + 4 < wall) {
				pic.rect(x - 3, sy - 2, 7, 6, "#4d3040");
				pic.rect(x - 2, sy - 1, 5, 4, "#6a4045");
				pic.rect(x - 1, sy, 3, 2, "#ffcf6b");
				pic.dot(x, sy, "#fff6d8");
			}
		}
		const room = wall - ceil - 4, cn = W$1 > 260 ? 3 : 1;
		for (let i = 0; i < cn && room >= 6; i++) {
			const x = Math.round(W$1 * (i + .5) / cn), cwid = Math.max(7, Math.min(Math.round(W$1 * .07), room * 2)) | 1, drop = Math.max(2, Math.round(room * .3));
			const y = ceil + 2 + drop, half = cwid >> 1, th = Math.max(3, Math.round(cwid * .35));
			for (let j = -th * 2; j <= th * 2; j++) {
				const span = Math.round(cwid * Math.sqrt(Math.max(0, 1 - (j / (th * 2)) ** 2)));
				pic.rect(x - span, y + j, span * 2 + 1, 1, "#5a3a40", 3);
			}
			pic.rect(x, ceil + 2, 1, drop, "#8a6a2a");
			pic.rect(x - half, y, cwid, 1, "#d9a441");
			pic.rect(x - half + 1, y + 1, cwid - 2, 1, "#8a6a2a");
			for (let c = -half; c <= half; c += 2) {
				pic.rect(x + c, y - 2, 1, 2, "#f2e6c8");
				pic.dot(x + c, y - 3, "#ffd27a");
			}
			for (let r$1 = 0; r$1 < th; r$1++) {
				const w2 = Math.max(1, half - r$1 * 2);
				pic.rect(x - w2, y + 2 + r$1, w2 * 2 + 1, 1, r$1 % 2 ? "#b58a3a" : "#e8d8b0");
			}
			lights.push({
				x,
				y: y + 2 + th
			});
		}
	} else {
		const roof = Math.round((ROOF[id] ?? .15) * H$1), sky = id === "arena" ? "#0f121c" : "#0d1019";
		pic.bands(0, H$1, id === "arena" ? [
			"#0c0f18",
			"#141826",
			"#161b2a"
		] : [
			"#0a0d16",
			"#111727",
			"#1a2033"
		]);
		if (id === "arena") {
			pic.rect(0, 0, W$1, roof, "#0c0f18");
			for (let x = 0; x < W$1; x++) {
				const u = x % 12;
				pic.dot(x, Math.round(roof * .3) + Math.abs(u - 6), "#1e2434");
				pic.dot(x, Math.round(roof * .3), "#232a3b");
				pic.dot(x, Math.round(roof * .3) + 6, "#232a3b");
			}
			const sw = Math.round(W$1 * .2), sh = Math.round(roof * .62), sx = Math.round(p.cx - sw / 2), sy = Math.round(roof * .18);
			pic.rect(sx + 3, 0, 1, sy, "#2a3042");
			pic.rect(sx + sw - 4, 0, 1, sy, "#2a3042");
			pic.rect(sx, sy, sw, sh, "#232838");
			for (let i = 0; i < 2; i++) {
				const qx = sx + 2 + i * Math.floor((sw - 2) / 2), qw = Math.floor((sw - 2) / 2) - 2;
				pic.rect(qx, sy + 2, qw, sh - 4, "#0f2a4a");
				pic.rect(qx, sy + 2, qw, 1, "#5fb4ff");
				pic.rect(qx + 2, sy + 4, qw * .4, Math.max(2, sh * .25), "#ff7a5c", 10);
				pic.rect(qx + qw * .55, sy + 4, qw * .35, Math.max(2, sh * .25), "#ffd45c", 10);
			}
			pic.rect(sx, sy + sh, sw, 1, "#5fb4ff");
			[.18, .82].forEach((u) => lights.push(lightBank(pic, Math.round(W$1 * u), Math.round(roof * .45), Math.max(1, Math.round(Math.min(H$1, W$1 * 9 / 16) * .008)), 3, 1, W$1 * .05, standTop(W$1 * u), sky)));
		} else {
			const banks = id === "bowl" ? 6 : 4, cell = Math.max(1, Math.round(Math.min(H$1, W$1 * 9 / 16) * .009)), bh = 2 * (cell + 1) + 1;
			const from = id === "stadium" ? Math.round(roof * .45) : 0;
			const bankY = (x) => Math.max(from + 1, Math.min(roof + 1, standTop(x) - Math.max(2, fr * 2) - bh - 2));
			const bankAt = Array.from({ length: banks }, (_, i) => {
				const x = Math.round(W$1 * (i + .5) / banks);
				return {
					x,
					y: bankY(x)
				};
			});
			for (const b$1 of bankAt) lights.push(lightBank(pic, b$1.x, b$1.y, cell, 4, 2, W$1 * .06, standTop(b$1.x), sky));
			if (from) for (let i = 0; i < W$1 * from / 40; i++) {
				const h = hash("star" + i);
				pic.dot(h % W$1, (h >> 12) % from, i % 5 ? "#3a4466" : "#c9d1de");
			}
			pic.rect(0, from, W$1, roof - from, "#151a28");
			for (let y = from + 3; y < roof - 4; y += 5) pic.rect(0, y, W$1, 1, "#1a2030");
			for (let x = Math.round(W$1 / 48); x < W$1; x += Math.max(4, Math.round(W$1 / 24))) pic.rect(x, from, 1, roof - 3 - from, "#1e2536");
			if (id === "bowl") for (const u of [.035, .785]) {
				const sw = Math.round(W$1 * .18), sh = Math.round(Math.min(roof * .5, W$1 * .06)), sx = Math.round(W$1 * u), sy = Math.round(roof * .18);
				pic.rect(sx - 1, sy - 1, sw + 2, sh + 2, "#2a3042");
				pic.rect(sx, sy, sw, sh, "#0f2a4a");
				pic.rect(sx, sy, sw, 1, "#5fb4ff");
				for (let i = 0; i < 6; i++) pic.rect(sx + 2 + i * Math.floor((sw - 4) / 6), sy + 3, Math.floor((sw - 4) / 6) - 1, sh - 6, CLUB[(i + (u > .5 ? 3 : 0)) % CLUB.length], 10);
			}
			for (let x = 0; x < W$1; x++) {
				const u = x % 8;
				pic.dot(x, roof - 3 + (u < 4 ? 0 : 0), "#2d3448");
				pic.dot(x, roof - 1, "#3a4258");
				pic.dot(x, roof - 3 + Math.round(Math.abs(u - 4) / 2), "#3d4560");
			}
			for (const { x, y } of bankAt) {
				const w = 4 * (cell + 1) + 1;
				pic.rect(x - w / 2 - 1, y - 2, w + 2, bh + 2, "#232838");
				for (let j = 0; j < 2; j++) for (let q = 0; q < 4; q++) {
					const bx = Math.round(x - w / 2 + 1 + q * (cell + 1)), by = y - 1 + j * (cell + 1);
					pic.rect(bx, by, cell, cell, "#fff3c4");
					if (cell >= 3) pic.dot(bx + (cell >> 1), by + (cell >> 1), "#ffffff");
				}
			}
		}
	}
	const wallC = id === "porch" ? "#4a3a32" : id === "bleachers" ? "#3a4152" : id === "gym" ? "#7a5634" : id === "hall" ? "#3a1c2a" : "#1d2333";
	const wallTopC = shade(wallC, .3);
	if (!st.centred && id !== "bleachers") for (let x = 0; x < W$1; x++) {
		const y = standTop(x) - Math.max(2, fr * 2), y1 = Math.round(p.feet(r, x + .5)) - p.rows[r].rise;
		pic.rect(x, y, 1, y1 - y, wallC);
		pic.dot(x, y, wallTopC);
	}
	if (id === "porch") {
		const steps$1 = Math.max(2, p.used);
		for (let s = steps$1 - 1; s >= 0; s--) {
			const row = p.rows[Math.min(s, p.rows.length - 1)], feet = Math.round(p.feet(Math.min(s, p.rows.length - 1), p.cx)), tread = Math.max(2, Math.round(row.size * .18));
			pic.rect(0, feet - tread, W$1, H$1, "#7a5234");
			pic.rect(0, feet - tread, W$1, tread, "#a0714a");
			pic.rect(0, feet - tread, W$1, 1, "#c08a5c");
			pic.rect(0, feet, W$1, H$1, "#6b4a33");
		}
		const ground = p.floorTop;
		pic.rect(0, ground, W$1, H$1 - ground, "#24301f");
		for (let x = 0; x < W$1; x++) if (hash("g" + x) % 3 === 0) pic.dot(x, ground, "#2f3d28");
		pic.rect(p.cx - W$1 * .12, ground, W$1 * .24, H$1 - ground, "#5a5550");
		pic.rect(p.cx - W$1 * .12, ground, W$1 * .24, 1, "#6e6862");
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	if (id === "bleachers") {
		for (let r$1 = top - 1; r$1 >= 0; r$1--) {
			const row = p.rows[r$1], feet = Math.round(p.feet(r$1, p.cx)), plank = Math.max(2, Math.round(row.size * .2));
			pic.rect(0, feet - row.rise, W$1, row.rise, "#262b38");
			pic.rect(0, feet - plank, W$1, plank, "#9aa6b8");
			pic.rect(0, feet - plank, W$1, 1, "#d7dde6");
			pic.rect(0, feet - 1, W$1, 1, "#5d6778");
		}
		const front = Math.round(p.feet(0, p.cx)), leg = Math.max(8, Math.round(W$1 / 10));
		for (let x = Math.round(leg / 2); x < W$1; x += leg) {
			pic.rect(x, front, 2, p.floorTop - front, "#5d6778");
			for (let j = 0; j < p.floorTop - front; j++) pic.dot(x + 2 + Math.round(j * .8), front + j, "#4c566b");
		}
		pic.rect(0, p.floorTop, W$1, H$1 - p.floorTop, "#2f7a43");
		for (let x = 0; x < W$1; x++) if (Math.floor(x / Math.max(10, W$1 / 16)) % 2) pic.rect(x, p.floorTop, 1, H$1, "#2a7040");
		pic.mix(0, p.floorTop + Math.round((H$1 - p.floorTop) * .4), W$1, 1, "#ffffff", .7);
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	if (id === "gym") {
		for (let r$1 = top - 1; r$1 >= 0; r$1--) {
			const row = p.rows[r$1], feet = Math.round(p.feet(r$1, p.cx)), plank = Math.max(2, Math.round(row.size * .22));
			pic.rect(0, feet - row.rise, W$1, row.rise, "#8f5f33");
			pic.rect(0, feet - plank, W$1, plank, "#c58b4f");
			pic.rect(0, feet - plank, W$1, 1, "#e0b07a");
		}
		const front = Math.round(p.feet(0, p.cx));
		pic.rect(0, front, W$1, p.floorTop - front, "#5a3b22");
		for (let y = p.floorTop; y < H$1; y++) pic.rect(0, y, W$1, 1, Math.floor((y - p.floorTop) / Math.max(2, fr * 2)) % 2 ? "#c08950" : "#c9925a");
		for (let y = p.floorTop; y < H$1; y += Math.max(2, fr * 2)) for (let x = hash("s" + y) % 40; x < W$1; x += 40) pic.dot(x, y, "#a8743f");
		const line = (x, y, w, h) => pic.mix(x, y, w, h, "#ffffff", .6);
		const sy = p.floorTop + Math.max(2, fr * 2);
		line(0, sy, W$1, 1);
		line(p.cx, sy, 1, H$1 - sy);
		const rx$1 = Math.round(W$1 * .1), ry$1 = Math.max(4, Math.round((H$1 - sy) * .45));
		for (let a = 0; a <= 180; a += .5) {
			const t = a * Math.PI / 180;
			line(Math.round(p.cx + Math.cos(t) * rx$1), Math.round(sy + Math.sin(t) * ry$1), 1, 1);
		}
		for (const kx of [Math.round(W$1 * .06), Math.round(W$1 * .82)]) {
			line(kx, sy, Math.round(W$1 * .12), 1);
			line(kx, sy, 1, H$1 - sy);
			line(kx + Math.round(W$1 * .12), sy, 1, H$1 - sy);
		}
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	paintStand(pic, p, top);
	if (id === "hall") {
		for (let r$1 = 0; r$1 < top; r$1++) {
			const row = p.rows[r$1], feet = Math.round(p.feet(r$1, p.cx));
			pic.rect(0, feet - row.rise, W$1, 1, "#e0675a");
			pic.rect(0, feet - row.rise + 1, W$1, Math.max(1, Math.round(row.size * .15)), "#8c2a3c");
		}
		p.breaks.forEach((b$1) => {
			if (!p.rows.some((r$1, i) => i < top && r$1.lift > b$1.lift)) return;
			const y = Math.round(p.floorTop - p.board - b$1.lift - b$1.h);
			pic.rect(0, y, W$1, b$1.h, "#4a1f2e");
			pic.rect(0, y, W$1, 1, "#d9a441");
			pic.rect(0, y + b$1.h - 1, W$1, 1, "#8a6a2a");
			for (let x = 2; x < W$1; x += 6) pic.dot(x, y + (b$1.h >> 1), "#d9a441");
			pic.rect(0, y + b$1.h, W$1, Math.max(1, Math.round(b$1.h * .5)), "#2a1220");
		});
		for (let r$1 = 0; r$1 < top; r$1++) {
			const row = p.rows[r$1], secW = row.section * row.pitch + row.aisle;
			if (row.section) for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W$1 - p.cx) / secW) + 1; j++) {
				const x = Math.round(p.cx + (j - .5) * secW - row.aisle / 2), feet = Math.round(p.feet(r$1, x));
				pic.rect(x, feet - row.rise, row.aisle, row.rise, "#3a2a30");
				pic.dot(x, feet - 1, "#ffd27a");
			}
		}
		const lip = p.floorTop;
		pic.rect(0, lip, W$1, H$1 - lip, "#3a2a22");
		for (let y = lip + 2; y < H$1; y += Math.max(2, fr * 2)) pic.rect(0, y, W$1, 1, "#33241d");
		pic.rect(0, lip, W$1, 1, "#f2d6a0");
		for (let x = Math.round(W$1 / 32); x < W$1; x += Math.max(4, Math.round(W$1 / 16))) {
			pic.rect(x - 3, lip - 2, 7, 4, "#ffd27a", 4);
			pic.rect(x - 1, lip, 3, 1, "#ffd27a");
			pic.dot(x, lip, "#fff6d8");
		}
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	paintBreaks(pic, p, top, "#161b29");
	const pitch = id === "arena" ? "#1d4f8a" : "#1f6b3e", stripe = id === "arena" ? "#1b4a82" : "#237646";
	paintBoards(pic, p, (x, y, w) => {
		const sw = Math.max(12, W$1 / 24);
		for (let i = x; i < x + w;) {
			const band$1 = Math.floor(i / sw), e = Math.min(x + w, Math.ceil((band$1 + 1) * sw));
			pic.rect(i, y, e - i, H$1 - y, band$1 % 2 ? stripe : pitch);
			i = e;
		}
	});
	const touch = Math.round(p.floorTop + (H$1 - p.floorTop) * .3);
	pic.mix(0, touch, W$1, 1, "#ffffff", .7);
	pic.mix(p.cx, touch, 1, H$1 - touch, "#ffffff", .7);
	const rx = Math.round(W$1 * .09), ry = Math.max(3, Math.round((H$1 - touch) * .6));
	for (let a = 0; a <= 180; a += .4) {
		const t = a * Math.PI / 180;
		pic.mix(Math.round(p.cx + Math.cos(t) * rx), Math.round(touch + Math.sin(t) * ry), 1, 1, "#ffffff", .7);
	}
	if (id !== "arena") {
		const banks = id === "bowl" ? 6 : 4, cy = (p.floorTop + H$1) / 2, ry$1 = (H$1 - p.floorTop) / 2;
		for (let i = 0; i < banks; i++) for (let y = Math.ceil(p.floorTop); y < H$1; y++) {
			const half = W$1 * .06 * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry$1) ** 2));
			pic.rect(W$1 * (i + .5) / banks - half, y, half * 2, 1, "#3a9a58", 4);
		}
	}
	return {
		canvas: pic.canvas(),
		lights
	};
}
/**
* A stadium on `canvas` (sized with CSS). Guys are seated best seats first in the order they arrive; as
* the crowd grows the venue is laid out again for it (and changes when it outgrows one), guys sliding to
* their new seats, or in a big crowd the old picture fading out under the new.
*/
function createStadium(canvas, options = {}) {
	let venue = "porch", laidFor = 1;
	const free = [];
	let next = 0;
	function build(devW, devH, dpr) {
		const id = venueFor(laidFor), f = fit$1(id, devW, devH, dpr, laidFor), W$1 = Math.ceil(devW / f.k), H$1 = Math.ceil(devH / f.k);
		const p = plan(id, W$1, H$1, f.front, laidFor, false, 0, f.depth), st = STYLES[id];
		const rows = [];
		p.seats.forEach((s, i) => {
			(rows[s.row] ??= []).push(i);
		});
		const order = Array.from(rows, (r) => (r ?? []).sort((a, b$1) => p.seats[a].x - p.seats[b$1].x)).reverse();
		const tints = [];
		for (let b$1 = 0; b$1 < 8; b$1++) tints.push({
			toward: st.haze,
			amount: st.hazeMax * (b$1 % 4) / 3,
			shade: b$1 >= 4 ? .2 : 0
		});
		const bands = new Uint8Array(p.seats.length);
		p.seats.forEach((s, i) => {
			const row = p.rows[s.row];
			bands[i] = Math.min(3, Math.floor(row.lift / Math.max(1, p.standMax) * 4)) + (row.shadow ? 4 : 0);
		});
		const scene = {
			width: W$1,
			height: H$1,
			k: f.k,
			ox: Math.floor((devW - W$1 * f.k) / 2),
			oy: devH - H$1 * f.k,
			seats: p.seats,
			rows: order,
			bands,
			tints,
			backdrop: null,
			lights: [],
			later: () => {
				const venue$1 = paintVenue(p);
				scene.lights = venue$1.lights;
				return venue$1.canvas;
			},
			pitch: p.rows[0]?.pitch ?? 8,
			shadow: "#0b0e18",
			wave: id === "arena" || id === "stadium" || id === "bowl" ? W$1 * .1 : void 0
		};
		return scene;
	}
	const render = createRender(canvas, {
		build,
		font: options.font,
		wave: options.wave,
		beforeFrame: () => {
			if (due) regrow();
		}
	});
	/** Lays the venue out again when the crowd has grown or shrunk past a step, everyone re-seated in the order they sit. */
	let due = false;
	function regrow() {
		due = false;
		const n = render.guys.size, want = stepFor(n);
		if (want === laidFor) return;
		render.relayout(n > 300 ? "fade" : "slide", () => {
			laidFor = want;
			const seated = [...render.guys.values()].sort((a, b$1) => (a.seat < 0 ? 1e9 : a.seat) - (b$1.seat < 0 ? 1e9 : b$1.seat) || a.joined - b$1.joined);
			seated.forEach((g, i) => {
				g.seat = i;
			});
			free.length = 0;
			next = seated.length;
		});
	}
	/** The crowd passed a step: the venue is laid out again at the next frame, once however many come before it; the venue's name changes now. */
	function grown() {
		due = true;
		render.wake();
		const now = venueFor(Math.max(1, render.guys.size));
		if (now !== venue) {
			venue = now;
			options.onVenue?.(venue);
		}
	}
	return {
		add(name, guy = {}) {
			const key = name.toLowerCase();
			if (render.guys.has(key)) return;
			const spec = {
				...guy,
				seed: guy.seed ?? key
			};
			const before = stepFor(render.guys.size + 1) !== laidFor;
			render.join(key, spec, before ? next : free.length ? free.shift() : next++, !before);
			if (before) {
				next++;
				grown();
			}
		},
		remove(name) {
			const g = render.guys.get(name.toLowerCase());
			if (!g) return;
			render.leave(g);
			if (g.seat >= 0) {
				let i = 0;
				while (i < free.length && free[i] < g.seat) i++;
				free.splice(i, 0, g.seat);
			}
			if (stepFor(render.guys.size) !== laidFor) grown();
		},
		has: (name) => render.guys.has(name.toLowerCase()),
		hop(name) {
			const g = render.guys.get(name.toLowerCase());
			if (g) render.hop(g);
		},
		wave(on) {
			render.wave(on);
		},
		spotlight(name, label, ms = 2600) {
			const g = render.guys.get(name.toLowerCase());
			if (g) render.spotlight(g, label ?? name, ms);
		},
		resize() {
			render.resize();
		},
		destroy() {
			render.destroy();
		},
		get count() {
			return render.guys.size;
		},
		get venue() {
			return venue;
		}
	};
}

//#endregion
//#region src/craft.ts
/**
* Crafting, as in TF2. A copy you don't want smelts into metal, and metal
* crafts the exact item you want.
*
* Metal comes in scrap: three scrap are a reclaimed, three reclaimed a
* refined. A crafted copy is Plain, with a craft number: the count of every
* copy ever crafted, so the first ones are worth having for that alone.
*/
const SCRAP = 1;
const RECLAIMED = 3;
const REFINED = 9;
/** Metal to craft one item of your choice. */
const CRAFT_COST = REFINED;
/** Metal to paint a hat or a buddy. Scraping the paint off is free. */
const PAINT_COST = RECLAIMED;
/** Scrap a copy smelts into, by grade: Everyday a scrap, up to a refined for a Mythic. */
const SMELT = [
	1,
	2,
	4,
	9
];
/**
* What a copy smelts into, or 0 when it can't be: a starter (it's free), a
* Grail or an aura (too rare to melt down by accident), or a showpiece.
*/
function smeltValue(o) {
	const it = itemById(o.item);
	if (!it || it.free || it.showpiece || it.slot === "aura") return 0;
	const g = GRADES.findIndex((x) => x.id === gradeOf(o).id);
	return SMELT[g] ?? 0;
}
/** Whether an item can be crafted: anything a machine holds but its showpiece and the free hat. */
const craftable = (it) => !!it && !it.free && !it.showpiece && it.slot !== "aura" && it.game !== "club";
/** Metal as TF2 writes it: refined with a hundredth per scrap, `2.44 ref`. */
function metalText(scrap) {
	const ref = Math.floor(scrap / REFINED), rest = scrap % REFINED;
	return `${ref}.${String(rest * 11).padStart(2, "0")} ref`;
}
/** Metal as coins: `{ refined, reclaimed, scrap }`. */
function metalCoins(scrap) {
	return {
		refined: Math.floor(scrap / REFINED),
		reclaimed: Math.floor(scrap % REFINED / RECLAIMED),
		scrap: scrap % RECLAIMED
	};
}
/** A crafted copy: Plain, a float and print from the seed, and its craft number. */
function craftCopy(itemId, seed, number) {
	const [lo, hi] = FINISHES.plain.scuffs;
	const u = hash(`${seed}|craft|float`) / 4294967296;
	return {
		item: itemId,
		finish: "plain",
		scuff: Math.round((lo + u * (hi - lo)) * 1e7) / 1e7,
		print: hash(`${seed}|craft|pattern`) % 1e3,
		craft: number
	};
}

//#endregion
//#region src/name-key.ts
/**
* A claimed name as it is kept: lowercase letters and digits, with underscores only between them
* (`cool_guy`, never `_cool`, `cool_` or `cool__guy`), 2 to 16 long.
*/
const NAME_KEY = /^(?=[a-z0-9_]{2,16}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;
/** Whatever a player typed, as a name key: other characters dropped, runs of underscores made one, none at the ends. */
function nameKey(typed) {
	const k = String(typed).toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_+/, "");
	return k.slice(0, 16).replace(/_+$/, "");
}
/**
* The name with its underscores taken out. Names claimed before underscores were allowed lost theirs
* (`cool_guy` was claimed as `coolguy`), so two names with the same skeleton are one name: a new claim
* can't take `cool_guy` while `coolguy` is held, and `cool_guy` finds `coolguy`'s guy.
*/
const nameSkeleton = (key) => key.replace(/_/g, "");

//#endregion
export { ARM_NAMES, ART_VERSION, AURAS, AURA_ODDS, Avatar, AvatarFallback, AvatarImage, BADGE_INKS, BAKED_SIZE, BATCH_MAX, BUDDY_GUY_WIDTH, CAPSULE_ONLY, CARD_EDGES, CARD_FRAGMENT, CARD_FULL_MS, CARD_GOLDS, CARD_HEIGHT, CARD_LOOKS, CARD_WIDTH, CRAFT_COST, CROWD_SIZES, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_SET, EMOTE_SIZE, EMOTE_UNLOCKS, FACE_BUDDY_SPOTS, FACE_HEIGHT, FACE_SIZE, FACE_WIDTH, FINISHES, FOOT_NAMES, FOOT_STYLES, FOUNDER_COPIES, FOUNDER_LOOK, FOUNDER_RANK, FOUNDER_SEED, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_BADGES, FX_IDS, GAMES, GLSL_COMMON, GLSL_LOOKS, GOLD_RIM_DAYS, GRADES, GRAPHIC_FINISHES, GRID_SIZE, GUY_HEIGHT, GUY_TIERS, GUY_WIDTH, HEADROOM, ICON_SIZE, LILGUYS_HOST, LIL_GUY_PLACEHOLDER, LIL_GUY_PRESETS, LIMITED_PAINT_COST, LOOP_MS, LUCKY_ODDS, LilGuy, LilGuyAnimated, MAX_PINS, MOVES, NAME_KEY, OG_HEIGHT, OG_WIDTH, ONE_OF_ONE_AURAS, PAINTABLE, PAINTS, PAINT_COST, PAINT_IDS, PART_ODDS, PART_SLOTS, PICTURE_VIEWS, PINS, PROFILE_SIZE, RECLAIMED, REFINED, RETIRED_EYES, SCRAP, SHADER_FINISHES, SHADE_COUNT, SHEET_MAX, SHINE_FRAGMENT, SHOWPIECE_WEIGHT, SMALL_SIZE, TAG_MAX, TIER_ICONS, TITLE_MAX, TONE_NAMES, TRAIT_ICONS, TRAIT_SLOTS, UNUSUAL_ONE_IN, VENUES, WEAR, WIDE_FRAME_WIDTH, accessories, allowed, animate, animateLoop, animateOptions, applyFx, auraById, auraCells, auraColor, auraColors, bakeCard, bakeGuy, bakeSquare, bakeView, bakedImage, bodies, boxOf, buddyAlone, buddyLift, cardArtFrames, cardArtPlayer, cardFace, cardFaceAt, cardFrames, cardInputOf, cardPlayer, cardStill, cheeks, cleanTag, closeEyes, collectorNotes, compose, composeBase, copyOneIn, craftCopy, craftable, createCardShader, createCrowd, createShine, createStadium, crowdPicture, crowdSeats, crowdSheet, crowdShine, crowdSprite, dealOf, decode, decodeGuy, decodeLook, defineLilGuyHere as defineLilGuy, drawFrame, dress, emoteFrames, encode, encodeApng, encodeGif, encodeGuy, encodeLook, encodePng, eyes, faceMoves, faceSpec, fewerColours, finishColor, floatShare, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyCode, guyOneIn, guyRank, guyScore, hair, hasGlyph, hash, hashNth, heads, inSeason, isEmote, isFounder, isFounderCopy, isMove, itemById, itemFrame, itemWeight, items, layered, lilGuyImg, lilGuySize, lilGuyUrl, lilGuysFor, lilGuysHost, lookFor, lookOf, luckyPalette, machineName, machineSet, makeSeed, mergeRefs, metalCoins, metalText, mouths, mysteryMachine, nameKey, nameOf, nameSkeleton, nebulaPhase, noiseOf, ogFrames, ownedOf, paint, paintCost, paintMonth, paintOnSale, painted, paintsOnSale, paletteOf, palettes, partCode, partCost, partName, pickable, pinById, profileFrames, rareParts, readGuyCode, readPart, resolve, resolveColor, roll, rollFx, rollPart, rollSeason, setLilGuysHost, setProgress, shadePalette, sheetColumns, sheetOf, shineData, shineFit, shineFrame, shines, shows, siteOgFrames, slotOf, smeltValue, special, squashRows, stadiumSeats, starter, surfaceOf, tallyMarks, temperTint, textWidth, toAnimatedSvg, toCardArtGif, toCardArtPng, toCardGif, toCardPng, toGuyGif, toPng, toProfileGif, toProfilePng, toShareSvg, toSvgString, tradeFloat, tradeGames, traitOdds, unlocksOf, unusual, upscale, useAvatarContext, useMergeRefs, venueFor, viewSize, visibleOneIn, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };
//# sourceMappingURL=index.js.map