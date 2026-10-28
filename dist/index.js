import { AURAS, AURA_ODDS, BUDDY_ROOM, CAPSULE_ONLY, DEAL_2, DEAL_3, DEAL_PREFIX, DEEP_BLUE_PRINTS, EFFECTS, FINISHES, FOOT_STYLES, FX_IDS, GAMES, GOLD_RIM_DAYS, GRADES, GRID_SIZE, LAYER, LOOP_MS, LUCKY_ODDS, MAX_PINS, ONE_OF_ONE_AURAS, PAINTABLE, PAINTS, PAINT_IDS, PINS, RETIRED_EYES, SET_COLORS, SHADE_COUNT, SHOWPIECE_WEIGHT, SMALL_SIZE, SPARKLE_REACH, T, WEAR, accessories, accessoryWeights, applyFx, armWeights, auraById, auraCells, auraColor, auraColors, auraHue, bodies, bodyWeights, buddyAlone, cheekWeights, cheeks, compose, composeBase, cycle, dealOf, decode, dress, encode, eyeWeights, eyes, faceOf, fit, fitLoop, footWeights, freeItem, fxColor, gameItems, getPalette, gradeOf, hair, hairWeights, hash, hashNth, headWeights, heads, inSeason, itemById, itemWeight, items, luckyPalette, machineName, mouthWeights, mouths, mysteryMachine, nameOf, nebulaPhase, paint, painted, paletteOf, paletteWeights, palettes, pinById, resolve, resolveColor, roll, rollFx, rollSeason, shadePalette, shadeWeights, shownPalette, shows, slotOf, sparkleAt, special, starter, steps, tallyMarks, temperTint, tick, unlockWeight, wave, wearOf, withItems, withoutRetired, wrap } from "./paint-Bak3X17Z.js";
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
/** Eyes that move: the chase eyes, one guy in hundreds, so they should look it; and shoujo eyes, which glisten. */
const LIVE_EYES = new Map([
	"galaxy",
	"diamond",
	"dragon",
	"shoujo"
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
/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder, shoujo eyes glisten. */
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
		} else if (kind === "shoujo") {
			const ms = cycle(t + seed, 2400) * fit(2400);
			if ((k === T.ACCENT || k === T.ACCENT_SHADE) && ms < 360) cell.c = mix$2(cell.c, "#FFFFFF", .55 * Math.sin(Math.PI * ms / 360));
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
function buddyLift(move, beat, t, roll$1) {
	const up = -(beat.dy ?? 0);
	if (up >= 2) return Math.min(2, Math.ceil(up / 2));
	if (!BUDDY_HOPS(move)) return 0;
	if (move === "dance") return beat.squash ? 1 : 0;
	if ((beat.squash ?? 0) > 0) return 0;
	const period = 2e3 + 1e3 * roll$1(61), f = cycle(t + roll$1(60) * LOOP_MS, period) * fit(period);
	const double = roll$1(62) < .4;
	return f < 160 || double && f >= 260 && f < 400 ? 1 : 0;
}
function shift(layer, dx, dy) {
	const W = layer[0].length, out = empty(W);
	layer.forEach((row, y) => row.forEach((cell, x) => {
		const nx = x + dx, ny = y + dy;
		if (cell && nx >= 0 && ny >= 0 && nx < W && ny < FRAME_HEIGHT) out[ny][nx] = cell;
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
function sparkle(layer, x, y, f, colors) {
	for (const [dx, dy, k] of sparkleAt(f)) {
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
function sparkleRun(layer, spots, at, period, life, salt, colors) {
	if (!spots.length) return;
	const f = cycle(at, period) / life;
	if (f >= 1) return;
	const [x, y] = spots[Math.floor(noise(tick(at, period), salt) * spots.length)];
	sparkle(layer, x, y, f, colors);
}
/** A sparkle in a colour: white at its heart, the colour lightened on its arms, the colour at its edges. */
const sparkleIn = (color) => [
	"#FFFFFF",
	mix$2(color, "#FFFFFF", .45),
	color
];
/** A Gold finish's sparkle. Kept off the Grail ring's two golds, so the ring alone says the grade. */
const GOLD_SPARKLE = [
	"#FFFFFF",
	"#FFF0B8",
	"#F5C342"
];
const mouthIndex = (name) => Math.max(0, mouths.findIndex((m) => m.name === name));
/** `#` is the emote's colour, `+` its second colour. `open`: outlined round its outside only, its gaps left clear. */
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
	}
};
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
/** Puts an emote, outlined, in a top corner that is clear of him. */
function emote(layer, kind, left, lift = 0) {
	const { rows, color, accent, open } = EMOTES[kind];
	const w = rows[0].length + 2, h = rows.length + 2;
	const inside$1 = (x, y) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
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
			const near = !on && !(open && inside$1(x, y)) && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
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
const MANGA_BLUSH = cheeks.findIndex((c) => c.name === "manga blush");
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
			const base = compose(figure), mouth = poseMouth(pose, config.mouth);
			const worn = mouth === void 0 ? base : compose({
				...figure,
				mouth,
				arms: pose === "laughWave" ? 2 : figure.arms
			});
			grids.set(pose, pose === "shut" ? closeEyes(base, config) : pose === "left" ? glance(base, config, -1) : pose === "right" ? glance(base, config, 1) : pose === "frown" || pose === "content" || pose === "huff" || pose === "oops" ? closeEyes(worn, config) : pose === "blush" ? compose({
				...figure,
				cheeks: MANGA_BLUSH
			}) : pose === "blushLeft" || pose === "blushRight" ? glance(grid("blush"), config, pose === "blushLeft" ? -1 : 1) : pose === "wave" || pose === "sides" ? compose({
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
		const plan = r !== void 0 ? {
			n,
			row: r + HEADROOM
		} : at(n - Math.sign(n));
		plans.set(n, plan);
		return plan;
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
	const plan = squashPlan(config, figure, grid), rows = {};
	for (const n of [
		-2,
		-1,
		1,
		2
	]) {
		const s = plan.at(n);
		rows[n] = !s ? null : s.n > 0 ? Array.from({ length: s.n }, (_, i) => s.row - i) : [s.row];
	}
	return {
		face: plan.face,
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
	const alone = buddyAlone(config), W = alone?.[0].length ?? FRAME_WIDTH;
	const wornAura = auraById(itemById(config.aura)?.slot === "aura" ? config.aura : void 0);
	const fxCopies = FRAME_SLOTS.map((slot) => config.owned?.[slot]);
	const withFx = fxCopies.some((o) => o?.fx);
	const lucky = !!config.lucky && options.rarity !== false && !options.small;
	const liveEye = options.small ? void 0 : LIVE_EYES.get(config.eyes);
	const canWave = JSON.stringify(grid("wave")) !== JSON.stringify(grid("sides"));
	const plan = squashPlan(config, figure, grid);
	const layers = new Map();
	const layerOf = (pose) => {
		if (!layers.has(pose)) layers.set(pose, painted$1(grid(pose), config, palette$1, !!options.small, liveEye ? faceOf(figure) : null, W));
		return layers.get(pose);
	};
	const buddyCells = [];
	if (alone) painted$1(alone, config, palette$1, !!options.small, null, W).forEach((row, y) => row.forEach((cell, x) => {
		if (cell) buddyCells.push([
			x,
			y,
			cell
		]);
	}));
	const backdrop = backdropColors(config, palette$1, 0, 0, W, FRAME_HEIGHT);
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
		if (beat.turn) layer = layer.map((row) => [...row.slice(0, GRID_SIZE).reverse(), ...row.slice(GRID_SIZE)]);
		const squashed = plan.at(beat.squash ?? 0);
		layer = squash(layer, squashed);
		const bob = (beat.squash ?? 0) > 0 && !squashed && !beat.dy ? -1 : 0;
		layer = shift(layer, beat.dx ?? 0, (beat.dy ?? 0) + bob);
		if (buddyCells.length) {
			layer = layer.map((row) => [...row]);
			standBuddy(layer, buddyCells, buddyLift(move, beat, t$1, roll$1));
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
			const at = cycle(t$1 + phase, 1600) * (W + FRAME_HEIGHT + 8) - 4;
			layer.forEach((row, y) => row.forEach((cell, x) => {
				if (!cell?.item) return;
				const d = Math.abs(x + y - at);
				if (d < 1) cell.c = mix$2(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix$2(cell.c, "#FFFFFF", .25);
			}));
		}
		if (lucky) luckyShimmer(layer, t$1, seed);
		if (liveEye) liveEyes(layer, liveEye, t$1, seed);
		if (lucky && !wornAura && grade < 3 && !goldMark) sparkleRun(layer, spots, t$1 + seed * 7, 2300, .4, seed, GOLD_SPARKLE);
		if (goldMark) sparkleRun(layer, spots, t$1 + goldCopy.print * 37, 2600, .4, goldCopy.print, GOLD_SPARKLE);
		const aura = grade >= 2 ? rim(layer) : [];
		if (beat.stars) {
			const gold = sparkleIn(palette$1.colors[T.GOLD] ?? "#F2C230");
			for (let i = 0; i < 2; i++) sparkleRun(layer, headSpots, t$1 + i * fit(360) / 2 + seed, 360, 1, seed + i, gold);
		}
		if (beat.drop) sweatDrop(layer, beat.slide ?? 0);
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(wrap(t$1, fit(800)) / (fit(800) / 2)) % 2);
		const outside = [];
		if (wornAura) {
			const copy = config.owned?.aura, mask = layer.map((row) => row.map(Boolean));
			for (const [x, y, k] of auraCells(wornAura.id, mask, t$1, copy, AURA_PAD)) {
				const c = copy ? auraColor(wornAura.id, k, copy.finish, x, y, t$1 + copy.print * 37, copy.print) : wornAura.colors[k];
				if (x < 0 || x >= W) outside.push([
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
		width: W,
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
* A part's chance. A part no deal gives (the capsule-only anime set) counts
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
			chance: dealt("head", headWeights, config.head)
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
			chance: dealt("hair", hairWeights, config.hair)
		},
		{
			slot: "markings",
			name: bodies[body].name,
			chance: dealt("body", bodyWeights, body)
		},
		{
			slot: "accessory",
			name: accessories[config.accessory].name,
			chance: dealt("accessory", accessoryWeights, config.accessory)
		},
		{
			slot: "colour",
			name: palettes[shownPalette(config)].name,
			chance: dealt("palette", paletteWeights, config.palette)
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
	let p = f.aura ? AURA_ODDS * (1 / AURAS.length) * (f.aura / 100) : itemWeight(item) / gameItems(item.game).filter((i) => !i.free && i.slot !== "aura").reduce((a, i) => a + itemWeight(i), 0) * (f.odds / 100) * (item.game === "club" ? 1 : 1 - AURA_ODDS);
	if (special(o) === "Deep Blue") p *= DEEP_BLUE_PRINTS.length / 1e3;
	else if (special(o)) p *= 1 / 20;
	const [lo, hi] = f.scuffs;
	p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
	if (o.tally !== void 0) p *= .1;
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
* unlock. The parts no deal gives (`CAPSULE_ONLY`, the anime set) are among them.
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
const TAU$1 = Math.PI * 2;
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
		const s = .5 + .5 * Math.sin(d * .8 - time * TAU$1 / 2 + print);
		return add(mix$1(c, add(scale(c, [
			.86,
			.96,
			1.18
		]), .08), .4 * s * coat), b$1 * .5 * coat);
	}
	if (finish < 2.5) return add(mix$1(c, add(scale(c, [
		.9,
		.98,
		1.1
	]), [
		.2,
		.2,
		.16
	]), w * .5 * coat), b$1 * .2 * coat);
	if (finish < 3.5) {
		const shifted = hueShift(c, .32 * Math.sin(time * TAU$1 / 6 + d * .12 + fract(print * .618) * TAU$1) * coat);
		const s = Math.max(0, Math.sin(time * TAU$1 / 3 + h * 97));
		return mix$1(shifted, [
			1,
			.94,
			1
		], step(.972, h) * s * s * s * coat);
	}
	if (finish < 4.5) return add(hueShift(c, time * TAU$1 / 6 * coat), w * .14 * coat);
	if (finish < 5.5) return add(add(c, scale([
		.28,
		.12,
		.45
	], b$1 * coat)), .07 * Math.sin(time * TAU$1 / 3 + d * .5 + fract(print * .618) * TAU$1) * coat);
	return add(mix$1(c, [
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
/** The edition a finish puts on its card: Sunset is foil, Tempered and Nebula holographic, an aura's finishes spectral. */
function editionOf(finish) {
	const i = SHADER_FINISHES.indexOf(finish);
	return i < 0 ? finish ? 6 : 0 : [
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
const SINES$1 = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU$1));
const sine = (x) => {
	const u = x * (4096 / TAU$1), i = Math.floor(u), j = i & 4095;
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
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU$1 / 2), sa = Math.sin(time * TAU$1 / 2);
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
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU$1 / 3), sa = Math.sin(time * TAU$1 / 3);
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
			const T$1 = mod(time * 10, 60), ct = Math.cos(time * TAU$1 / 6), st = Math.sin(time * TAU$1 / 6);
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
	const lum$1 = new Float32Array(n), hue$1 = new Float32Array(n), chroma = new Float32Array(n);
	for (let k = 0; k < n; k++) {
		const z = region[k] > 1.5 ? 7 : 12, qx = (x[k] - o[0]) / z, qy = (y[k] - o[1]) / z;
		const r = Math.hypot(qx, qy), turn = Math.atan2(qy, qx) + r * 1.8;
		s[k] = Math.cos(turn) * r;
		c2[k] = Math.sin(turn) * r;
		const cr = rgb$4[k * 3], cg = rgb$4[k * 3 + 1], cb = rgb$4[k * 3 + 2];
		const i = .596 * cr - .274 * cg - .322 * cb, q = .211 * cr - .523 * cg + .312 * cb;
		lum$1[k] = .299 * cr + .587 * cg + .114 * cb;
		hue$1[k] = Math.atan2(q, i);
		chroma[k] = Math.hypot(i, q);
		a[k] = (x[k] - y[k]) * .16;
	}
	/** A glint opening on a pixel whose noise is high enough. */
	const glint = (k, time) => {
		if (h[k] < .965) return 0;
		const g = Math.max(0, Math.sin(time * TAU$1 / 2 + h[k] * 91)), g2 = g * g;
		return g2 * g2 * g2 * .6;
	};
	return (time, out) => {
		const T$1 = mod(time * 10, 60), th = time * TAU$1 / 6, ct = Math.cos(th), st = Math.sin(th), B = time * TAU$1 / 3;
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
			const m = .86 + .1 * f, turn = hue$1[k] + .4 * Math.sin(a[k] + th + v), ch = chroma[k] * m, Y = lum$1[k] * m;
			const I = ch * Math.cos(turn), Q = ch * Math.sin(turn), add$1 = band$1(k, T$1, 5) * .35 + gl;
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
	const W = frame.colors[0].length;
	const colors = new Uint8Array(W * FRAME_HEIGHT * 4);
	const info = new Uint8Array(W * FRAME_HEIGHT * 4);
	const noise$1 = new Uint8Array(W * FRAME_HEIGHT * 4);
	frame.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c) return;
		const i = (y * W + x) * 4;
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
	const time = loopSeconds(ms), W = frame.colors[0].length;
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
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
			const { colors, info, noise: noise$1 } = shineData(frame, owned), W = frame.colors[0].length;
			if (target.width !== W) target.width = W;
			gl.viewport(0, 0, W, FRAME_HEIGHT);
			[
				colors,
				info,
				noise$1
			].forEach((bytes, unit) => {
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, FRAME_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(time, loopSeconds(ms));
			gl.uniform2f(res, W, FRAME_HEIGHT);
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
			const RIM = .4, rim$1 = z1 - RIM;
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
//#region src/card-looks.ts
/**
* Prototype looks for a card's edition, after the way Balatro paints its
* cards, to set beside today's. Nothing draws them unless asked
* (`cardPlayer(input, ms, { look })`, `cardFace({ ..., look })`), so every
* card, finish and saved guy keeps the picture it has.
*
* - `paint`: an aura card's ground as banded paint, a twisted swirl warped a
*   few times over and cut into the aura's own colours in hard bands.
* - `polychrome`: a Polychrome card, and every Prism copy on it, turned
*   through the spectrum by a slow field of a few drifting rings, its colours
*   lifted.
* - `foil`: a Foil card's face, and a Grail's gold, run with interference
*   bands that catch a cool highlight where they cross.
* - `holo`: a Holographic card tinted by the same drifting field, with a fine
*   diagonal grid lighting up where it runs bright.
*
* Each is written twice, as GLSL (`GLSL_LOOKS`) and as plain code
* (`lookField`, `polyColor`), with the same result, and every motion comes
* round in LOOP_MS: time enters only as whole turns of the loop's angle.
*/
const CARD_LOOKS = [
	"none",
	"paint",
	"polychrome",
	"foil",
	"holo"
];
/** The look as the shaders number it, 0 for none. */
const lookIndex = (look) => look ? CARD_LOOKS.indexOf(look) : 0;
/** Whether a look changes a card of edition `ed` (an index in EDITIONS). */
function lookApplies(look, ed) {
	if (look === 1) return ed === 6;
	if (look === 2) return ed === 3;
	if (look === 3) return ed === 1 || ed === 5;
	if (look === 4) return ed === 2;
	return false;
}
/** The default hardness of `paint`'s bands. */
const PAINT_CONTRAST = 5;
const INK$2 = [
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
const hueOf = (c) => toHsl(c)[0];
/**
* The three paints an aura card is banded in, from its aura's colours and the
* one it's known by (`auraHue`): a deep ground most of the card, a middle
* band, and a narrow top band in a second colour of the aura where it has one.
* All kept dark enough that the guy's own aura still reads over them.
*/
function paintColors(colors, hue$1) {
	const main = unhex(hue$1), h = hueOf(main);
	const other = colors.map(unhex).filter((c) => {
		const s = toHsl(c);
		const d = Math.abs(s[0] - h);
		return s[1] > .3 && Math.min(d, 1 - d) > .08;
	})[0];
	return [
		lerp(main, INK$2, .7),
		lerp(main, INK$2, .42),
		other ? lerp(other, INK$2, .3) : lerp(main, INK$2, .12)
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
/** Back from hue, saturation and lightness (`fromHsl` in GLSL). */
function fromHsl(h, s, l) {
	const chroma = s * (1 - Math.abs(2 * l - 1));
	const ramp = (o) => {
		const k = Math.abs(fract(h + o) * 6 - 3) - 1;
		return l + chroma * ((k < 0 ? 0 : k > 1 ? 1 : k) - .5);
	};
	return [
		ramp(0),
		ramp(2 / 3),
		ramp(1 / 3)
	];
}
/**
* `lookColor` falls back to `editionColor` (GLSL_EDITIONS) where the look
* doesn't apply, so it goes after it. `p` is the cell in face cells, `o` the
* window's middle, `region` 1 face and 2 window, `th` the loop's angle.
*/
const GLSL_LOOKS = `
vec3 toHsl(vec3 c) {
  float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b)), d = hi - lo, l = (hi + lo) * 0.5;
  if (d < 1e-5) return vec3(0.0, 0.0, l);
  float s = d / (1.0 - abs(2.0 * l - 1.0));
  float h = hi == c.r ? (c.g - c.b) / d : hi == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0;
  return vec3(fract(h / 6.0), s, l);
}
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
vec3 polyColor(vec3 c, vec2 p, vec2 o, float th, float k) {
  vec3 s = toHsl(c);
  float f = polyField(p, o, th);
  return mix(c, fromHsl(vec3(fract(s.x + 0.22 * f + 0.1), min(0.78, s.y + 0.45), s.z * 0.84 + 0.08)), k);
}
vec3 paintColor(vec2 p, vec2 o, float th, vec3 c1, vec3 c2, vec3 c3, float contrast) {
  vec2 q = (p - o) / 9.0;
  float r = length(q), tw = 1.5 * r + 0.35 * sin(th);
  vec2 u = vec2(q.x * cos(tw) - q.y * sin(tw), q.x * sin(tw) + q.y * cos(tw)) * 2.6;
  float ct = 0.8 * cos(th), st = 0.8 * sin(th);
  u += 0.8 * vec2(sin(1.3 * u.y + ct), sin(1.1 * u.x + st));
  u += 0.8 * vec2(sin(1.7 * u.y - st + 0.9), sin(1.5 * u.x + ct - 0.7));
  u += 0.8 * vec2(sin(2.1 * u.y + ct + 1.8), sin(1.9 * u.x - st + 2.6));
  float t = 0.5 + 0.5 * sin(u.x * 0.9 + u.y * 1.2 + r * 1.5), w = 0.5 / contrast;
  float k1 = clamp((t - 0.38) / w + 0.5, 0.0, 1.0), k2 = clamp((t - 0.74) / w + 0.5, 0.0, 1.0);
  return mix(mix(c1, c2, k1), c3, k2) * (1.0 - 0.22 * clamp(r * 0.5 - 0.35, 0.0, 1.0));
}
float foilWave(vec2 p, vec2 o, float th) {
  vec2 a = p - o - vec2(5.0 * cos(th) - 9.0, 6.0 * sin(th) - 14.0);
  vec2 b = p - o - vec2(10.0 - 6.0 * sin(th), 16.0 + 5.0 * cos(th));
  return sin((length(a) - length(b)) * 0.6 + (p.x * 0.3 + p.y * 0.5) - th);
}
vec3 foilColor(vec3 c, vec2 p, vec2 o, float region, float th, float gold) {
  float w = foilWave(p, o, th);
  float lift = clamp((w - 0.35) / 0.45, 0.0, 1.0), peak = clamp((w - 0.86) / 0.14, 0.0, 1.0), dip = clamp((-w - 0.5) / 0.5, 0.0, 1.0);
  if (gold > 0.5) {
    float k = region > 1.5 ? 0.35 : 1.0;
    return c * (1.0 - 0.14 * dip * k) + vec3(0.2, 0.16, 0.05) * lift * k + vec3(0.5, 0.66, 0.92) * peak * 0.6 * k;
  }
  float k = region > 1.5 ? 0.6 : 1.0, l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 base = mix(c, l * vec3(0.8, 0.9, 1.06) + vec3(0.07, 0.09, 0.15), 0.6 * k);
  return base * (1.0 - 0.16 * dip * k) + vec3(0.42, 0.6, 0.95) * lift * 0.45 * k + vec3(0.7, 0.8, 0.95) * peak * 0.45 * k;
}
vec3 holoColor(vec3 c, vec2 p, vec2 o, float region, float th) {
  float f = polyField(p, o, th);
  vec3 tint = fromHsl(vec3(fract(0.58 + 0.12 * f), 0.75, 0.66));
  float ga = abs(cos((p.x + p.y) * 1.1)), gb = abs(cos((p.x - p.y) * 1.1));
  float grid = max(max(0.0, 10.0 * ga - 9.0), max(0.0, 10.0 * gb - 9.0)) * clamp(f * 0.6, 0.0, 1.0);
  float k = region > 1.5 ? 0.6 : 1.0;
  return mix(c, c * 0.5 + tint * 0.55, 0.5 * k) + vec3(0.65, 0.78, 1.0) * grid * 0.4 * k;
}
vec3 lookColor(vec3 c, float look, float ed, float v, vec2 p, vec2 o, float region, float h, float px, float time, vec3 c1, vec3 c2, vec3 c3, float contrast) {
  float th = time * TAU / 6.0;
  if (look > 0.5 && look < 1.5 && ed > 5.5) return region > 1.5 ? paintColor(p, o, th, c1, c2, c3, contrast) : c;
  if (look > 1.5 && look < 2.5 && ed > 2.5 && ed < 3.5) return polyColor(c, p, o, th, region > 1.5 ? 0.85 : 1.0);
  if (look > 2.5 && look < 3.5 && ((ed > 0.5 && ed < 1.5) || (ed > 4.5 && ed < 5.5))) return foilColor(c, p, o, region, th, step(4.5, ed));
  if (look > 3.5 && ed > 1.5 && ed < 2.5) return holoColor(c, p, o, region, th);
  return editionColor(c, ed, v, p, o, region, h, px, time);
}
`;
const TAU = Math.PI * 2;
/** A sine from a table, to well under a millionth of a colour step: the looks take several a block every frame. */
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU));
const sin = (x) => {
	const u = x * (4096 / TAU), i = Math.floor(u), j = i & 4095;
	return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i);
};
const cos = (x) => sin(x + Math.PI / 2);
/** The holo grid's cool light. */
const HOLO_LIT = [
	.65,
	.78,
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
const scratch = new Float64Array(6);
/** `polyColor` from GLSL_LOOKS: a Prism copy's pixel, or any pixel, turned by the field at `p`. */
function polyColor(c, p, o, time, k) {
	const th = time * TAU / 6, s = toHsl(c);
	polyCentres(th, scratch);
	const f = polyAt(p[0] - o[0], p[1] - o[1], scratch, th);
	const t = fromHsl(fract(s[0] + .22 * f + .1), Math.min(.78, s[1] + .45), s[2] * .84 + .08);
	return [
		c[0] + (t[0] - c[0]) * k,
		c[1] + (t[1] - c[1]) * k,
		c[2] + (t[2] - c[2]) * k
	];
}
/**
* `lookColor` over a fixed set of pixels, as `editionField` is for the
* editions, or null where the look doesn't change this edition. Pixels on
* the same cell (the big card quantizes its cells to blocks) share one
* working-out of the field, so a frame costs a field a block and a few
* multiplies a pixel; nothing is allocated per frame.
*/
function lookField(look, ed, v, o, pixels, paint$1) {
	if (!lookApplies(look, ed)) return null;
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
		const { colors: [c1, c2, c3], contrast } = paint$1 ?? {
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
			contrast: PAINT_CONTRAST
		};
		const qx = new Float32Array(nb), qy = new Float32Array(nb), rr = new Float32Array(nb), shade = new Float32Array(nb);
		for (let b$1 = 0; b$1 < nb; b$1++) {
			const px = bx[b$1] / 9, py = by[b$1] / 9, r = Math.sqrt(px * px + py * py), a = 1.5 * r;
			qx[b$1] = px * Math.cos(a) - py * Math.sin(a);
			qy[b$1] = px * Math.sin(a) + py * Math.cos(a);
			rr[b$1] = r;
			shade[b$1] = 1 - .22 * clamp01(r * .5 - .35);
		}
		const w = .5 / contrast, k1v = new Float32Array(nb), k2v = new Float32Array(nb);
		return (time, out) => {
			const th = time * TAU / 6, tw = .35 * Math.sin(th), ca = Math.cos(tw), sa = Math.sin(tw), ct = .8 * Math.cos(th), st = .8 * Math.sin(th);
			for (let b$1 = 0; b$1 < nb; b$1++) {
				let ux = (qx[b$1] * ca - qy[b$1] * sa) * 2.6, uy = (qx[b$1] * sa + qy[b$1] * ca) * 2.6, dx;
				dx = .8 * sin(1.3 * uy + ct);
				uy += .8 * sin(1.1 * ux + st);
				ux += dx;
				dx = .8 * sin(1.7 * uy - st + .9);
				uy += .8 * sin(1.5 * ux + ct - .7);
				ux += dx;
				dx = .8 * sin(2.1 * uy + ct + 1.8);
				uy += .8 * sin(1.9 * ux - st + 2.6);
				ux += dx;
				const t = .5 + .5 * sin(ux * .9 + uy * 1.2 + rr[b$1] * 1.5);
				k1v[b$1] = clamp01((t - .38) / w + .5);
				k2v[b$1] = clamp01((t - .74) / w + .5);
			}
			for (let k = 0; k < n; k++) {
				const j = k * 3;
				if (region[k] < 1.5) {
					out[j] = rgb$4[j];
					out[j + 1] = rgb$4[j + 1];
					out[j + 2] = rgb$4[j + 2];
					continue;
				}
				const b$1 = blockOf[k], k1 = k1v[b$1], k2 = k2v[b$1], s = shade[b$1];
				for (let i = 0; i < 3; i++) {
					const lo = c1[i] + (c2[i] - c1[i]) * k1;
					out[j + i] = (lo + (c3[i] - lo) * k2) * s;
				}
			}
		};
	}
	if (look === 2 || look === 4) {
		const hsl = new Float32Array(n * 3);
		for (let k = 0; k < n; k++) {
			const s = toHsl([
				rgb$4[k * 3],
				rgb$4[k * 3 + 1],
				rgb$4[k * 3 + 2]
			]);
			hsl[k * 3] = s[0];
			hsl[k * 3 + 1] = s[1];
			hsl[k * 3 + 2] = s[2];
		}
		const grid = new Float32Array(look === 4 ? nb : 0);
		for (let b$1 = 0; b$1 < grid.length; b$1++) {
			const px = bx[b$1] + o[0], py = by[b$1] + o[1];
			grid[b$1] = Math.max(0, 10 * Math.abs(Math.cos((px + py) * 1.1)) - 9, 10 * Math.abs(Math.cos((px - py) * 1.1)) - 9);
		}
		/** `fromHsl`, written into `out` at `j`. */
		const put = (out, j, h, s, l) => {
			const ch = s * (1 - Math.abs(2 * l - 1));
			for (let i = 0; i < 3; i++) {
				const q = Math.abs(fract(h + (i === 0 ? 0 : i === 1 ? 2 / 3 : 1 / 3)) * 6 - 3) - 1;
				out[j + i] = l + ch * ((q < 0 ? 0 : q > 1 ? 1 : q) - .5);
			}
		};
		const tint = new Float32Array(look === 4 ? nb * 3 : 0), glow = new Float32Array(look === 4 ? nb : 0);
		return (time, out) => {
			const th = time * TAU / 6;
			polyCentres(th, m);
			for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = polyAt(bx[b$1], by[b$1], m, th);
			if (look === 4) for (let b$1 = 0; b$1 < nb; b$1++) {
				put(tint, b$1 * 3, fract(.58 + .12 * val[b$1]), .75, .66);
				glow[b$1] = grid[b$1] * clamp01(val[b$1] * .6) * .4;
			}
			for (let k = 0; k < n; k++) {
				const j = k * 3, f = val[blockOf[k]], win = region[k] > 1.5;
				if (look === 2) {
					put(out, j, fract(hsl[j] + .22 * f + .1), Math.min(.78, hsl[j + 1] + .45), hsl[j + 2] * .84 + .08);
					const kk$1 = win ? .85 : 1;
					for (let i = 0; i < 3; i++) out[j + i] = rgb$4[j + i] + (out[j + i] - rgb$4[j + i]) * kk$1;
					continue;
				}
				const b$1 = blockOf[k], kk = win ? .6 : 1, g = glow[b$1] * kk;
				for (let i = 0; i < 3; i++) {
					const c = rgb$4[j + i];
					out[j + i] = c + (c * .5 + tint[b$1 * 3 + i] * .55 - c) * .5 * kk + HOLO_LIT[i] * g;
				}
			}
		};
	}
	const gold = ed === 5, lum$1 = new Float32Array(n);
	for (let k = 0; k < n; k++) lum$1[k] = .299 * rgb$4[k * 3] + .587 * rgb$4[k * 3 + 1] + .114 * rgb$4[k * 3 + 2];
	const lift = new Float32Array(nb), peak = new Float32Array(nb), dip = new Float32Array(nb);
	const diag = Float32Array.from(bx, (dx, b$1) => (dx + o[0]) * .3 + (by[b$1] + o[1]) * .5);
	return (time, out) => {
		const th = time * TAU / 6;
		const ax = 5 * Math.cos(th) - 9, ay = 6 * Math.sin(th) - 14, cx = 10 - 6 * Math.sin(th), cy = 16 + 5 * Math.cos(th);
		for (let b$1 = 0; b$1 < nb; b$1++) {
			const a1 = bx[b$1] - ax, a2 = by[b$1] - ay, b1 = bx[b$1] - cx, b2 = by[b$1] - cy;
			const w = sin((Math.sqrt(a1 * a1 + a2 * a2) - Math.sqrt(b1 * b1 + b2 * b2)) * .6 + diag[b$1] - th);
			lift[b$1] = clamp01((w - .35) / .45);
			peak[b$1] = clamp01((w - .86) / .14);
			dip[b$1] = clamp01((-w - .5) / .5);
		}
		for (let k = 0; k < n; k++) {
			const j = k * 3, b$1 = blockOf[k], win = region[k] > 1.5;
			if (gold) {
				const kk$1 = win ? .35 : 1, d$1 = 1 - .14 * dip[b$1] * kk$1, l$1 = lift[b$1] * kk$1, p$1 = peak[b$1] * .6 * kk$1;
				out[j] = rgb$4[j] * d$1 + .2 * l$1 + .5 * p$1;
				out[j + 1] = rgb$4[j + 1] * d$1 + .16 * l$1 + .66 * p$1;
				out[j + 2] = rgb$4[j + 2] * d$1 + .05 * l$1 + .92 * p$1;
				continue;
			}
			const kk = win ? .6 : 1, mm = .6 * kk, d = 1 - .16 * dip[b$1] * kk, l = lift[b$1] * .45 * kk, p = peak[b$1] * .45 * kk, L = lum$1[k];
			out[j] = (rgb$4[j] + (L * .8 + .07 - rgb$4[j]) * mm) * d + .42 * l + .7 * p;
			out[j + 1] = (rgb$4[j + 1] + (L * .9 + .09 - rgb$4[j + 1]) * mm) * d + .6 * l + .8 * p;
			out[j + 2] = (rgb$4[j + 2] + (L * 1.06 + .15 - rgb$4[j + 2]) * mm) * d + .95 * l + .95 * p;
		}
	};
}
/** `lookColor`'s choice over a set of pixels: the look's field where it applies, else the edition's own. */
function cardField(look, ed, v, o, px, pixels, paint$1) {
	return lookField(look, ed, v, o, pixels, paint$1) ?? editionField(ed, v, o, px, pixels);
}

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
const mix = (a, b$1, t) => [
	a[0] + (b$1[0] - a[0]) * t,
	a[1] + (b$1[1] - a[1]) * t,
	a[2] + (b$1[2] - a[2]) * t
];
const hash$1 = (x, y, p) => {
	const s = Math.sin(x * 127.1 + y * 311.7 + p * .731) * 43758.5453;
	return s - Math.floor(s);
};
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
const INK$1 = [
	24,
	20,
	31
], IVORY$1 = [
	246,
	240,
	227
], WHITE$1 = [
	255,
	255,
	255
], PLATE$1 = [
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
	const W = CARD_WIDTH, H = BODY_HEIGHT, depth = new Uint8Array(W * H), bevel = new Uint8Array(W * H);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (!inside(x, y)) continue;
		let d = 1;
		while (d < 9 && inside(x - d, y) && inside(x + d, y) && inside(x, y - d) && inside(x, y + d)) d++;
		const lit = !inside(x - 3, y) || !inside(x, y - 3), deep = !inside(x + 3, y) || !inside(x, y + 3);
		depth[y * W + x] = d;
		bevel[y * W + x] = deep ? 2 : lit ? 1 : 0;
	}
	const glint = Float64Array.from({ length: W * H }, (_, i) => hash$1(i % W, Math.floor(i / W), 11));
	const runs$1 = Array.from({ length: H }, (_, y) => {
		let a = -1, b$1 = -1;
		for (let x = 0; x < W; x++) if (depth[y * W + x]) {
			if (a < 0) a = x;
			b$1 = x;
		}
		return [a, b$1];
	});
	const shadow = new Uint8ClampedArray(W * CARD_HEIGHT * 4);
	runs$1.forEach(([a, b$1], y) => {
		for (let x = a; a >= 0 && x <= b$1; x++) shadow.set([
			20,
			16,
			28,
			150
		], ((y + 5) * W + x) * 4);
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
const PRISM$1 = SHADER_FINISHES.indexOf("prism");
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
function buddyNudge(anim) {
	if (anim.width <= FRAME_WIDTH) return 0;
	let guy = -1, buddy = anim.width;
	for (const f of anim.frames) f.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c || f.slots[y][x] === 3 || f.slots[y][x] === 5) return;
		if (x < FRAME_WIDTH) guy = Math.max(guy, x);
		else buddy = Math.min(buddy, x);
	}));
	return Math.max(0, (buddy - guy - 1) * ZOOM - 2);
}
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
	const zoom = ZOOM, nudge = buddyNudge(anim);
	const cellX = (gx, slot) => gx * zoom - (gx >= FRAME_WIDTH && slot !== 5 ? nudge : 0);
	const fit$1 = cardFit(anim.frames, anim.width, cellX), shape = cardShape();
	const lastCopy = input.copies?.[input.copies.length - 1];
	const shift$1 = lastCopy ? lastCopy.print * 37 : [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6e3, 0);
	const v = lastCopy ? lastCopy.print % 4 : 0;
	const W = CARD_WIDTH, H = BODY_HEIGHT, side = M;
	const s = new Surface(W, H);
	const gold = ed === 5, aura = ed === 6, neg = ed === 4;
	const gc = g >= 0 ? rgb$2(GRADES[g].color) : [
		104,
		118,
		146
	];
	const auraCopy = owned.aura;
	const ah = aura && auraCopy ? rgb$2(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
	const tone = aura ? ah : gc;
	const textW = W - M * 2 - 10;
	const pill = input.lines?.[0], subs = (input.lines ?? []).slice(1).flatMap((l) => wrapText(l, textW));
	const titles = wrapText(input.title, textW);
	const titleH = titles.length * 12;
	const lastItem = input.copies?.length ? itemById(input.copies[input.copies.length - 1].item) : void 0;
	const markHex = lastItem ? SET_COLORS[lastItem.game] : void 0;
	const foots = [];
	for (const part of (input.footer ?? "").split(" · ").filter(Boolean)) {
		const k = foots.length - 1, w = k <= 0 ? textW - 14 : textW;
		if (k >= 0 && textWidth(`${foots[k]} · ${part}`) <= w) foots[k] += ` · ${part}`;
		else if (foots.length < 2 && textWidth(part) <= textW) foots.push(part);
		else break;
	}
	const footH = foots.length ? foots.length * 11 : markHex ? 11 : 0;
	const pillW = pill ? textWidth(pill) + 14 : 0;
	const paired = !!pill && subs.length === 1 && pillW + 6 + textWidth(subs[0]) <= W - M * 2 - 6;
	const rest = paired ? [] : subs;
	const plateBottom = H - 1 - 6;
	let y = plateBottom - 3 - footH;
	const footTop = y;
	if (footH) y -= 2;
	const pillTop = pill ? y -= 15 : y;
	if (pill) y -= 3;
	y -= rest.length * 11;
	const subTop = y;
	y -= titleH;
	const titleTop = y;
	const plateTop = y - 3;
	const WIN = {
		left: side,
		right: W - 1 - side,
		top: 6,
		bottom: plateTop - 4
	};
	const wcx = (WIN.left + WIN.right) / 2, wcy = WIN.top + (WIN.bottom - WIN.top) * .45;
	const stock = (x, yy) => {
		if (gold) {
			const base = mix(GOLD_HI, GOLD_LO, yy / H * .9 + .08 * Math.sin(x * .05 + yy * .02));
			return yy % 3 === 0 ? mix(base, GOLD_LO, .12) : base;
		}
		if (neg) return mix(mix(IVORY$1, tone, .35), mix(IVORY$1, tone, .6), yy / H);
		return mix(mix(tone, WHITE$1, .08), mix(tone, INK$1, .25), yy / H);
	};
	const rows = Array.from({ length: H }, (_, yy) => gold ? null : stock(0, yy));
	const auraDeep = mix(ah, INK$1, .62), auraLight = mix(ah, INK$1, .3), inlay = mix(ah, WHITE$1, .7);
	for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
		const d = shape.depth[yy * W + x], bevel = shape.bevel[yy * W + x];
		if (!d) continue;
		if (d <= 2) {
			s.set(x, yy, INK$1);
			continue;
		}
		let c = rows[yy] ?? stock(x, yy);
		if (gold && bevel) c = mix(mix([
			255,
			238,
			168
		], [
			150,
			92,
			18
		], (x + yy * 1.4) / (W + H * 1.4)), bevel === 1 ? WHITE$1 : INK$1, .2);
		else if (bevel === 1) c = mix(c, WHITE$1, .35);
		else if (bevel) c = mix(c, INK$1, .3);
		else if (aura && d <= 5) c = inlay;
		if (aura && d > 6) {
			const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
			s.set(x, yy, mix(auraDeep, auraLight, Math.max(0, 1 - r) ** 1.2), 2);
			continue;
		}
		s.set(x, yy, c, 1);
	}
	const light = g >= 0 ? mix(IVORY$1, gc, .22) : mix(IVORY$1, gc, .12);
	if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$1 = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
		if (rim$1) {
			s.set(x, yy, gold && (x - WIN.left === 1 || WIN.right - x === 1 || yy - WIN.top === 1 || WIN.bottom - yy === 1) ? [
				255,
				226,
				140
			] : gold ? [
				72,
				40,
				6
			] : INK$1);
			continue;
		}
		const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 64, (yy - wcy) / 72);
		let c = gold ? mix(mix(AMBER, AMBER_GLOW, Math.max(0, 1 - r) ** 1.3), mix(AMBER, INK$1, .3), depth * .3) : mix(light, mix(light, gc, .35), depth * .6);
		if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK$1, .35);
		s.set(x, yy, c, 2);
	}
	if (gold) for (const [sx, sy] of [
		[WIN.left + 1, WIN.top + 1],
		[WIN.right - 1, WIN.top + 1],
		[WIN.left + 1, WIN.bottom - 1],
		[WIN.right - 1, WIN.bottom - 1]
	]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
		const d = dx * dx + dy * dy, x = sx + dx, yy = sy + dy;
		if (d > 10 || shape.depth[yy * W + x] <= 2) continue;
		s.set(x, yy, d > 6 ? [
			110,
			66,
			10
		] : mix([
			255,
			244,
			196
		], [
			196,
			128,
			26
		], (dx + dy + 4) / 8));
	}
	if (!gold) for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
		const pw = W - side * 2, ph = plateBottom - plateTop + 1;
		if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
		const edge = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
		const base = aura ? mix(mix(ah, INK$1, .6), INK$1, .45) : PLATE$1;
		s.set(x, yy, edge ? INK$1 : yy === plateTop + 1 ? mix(base, WHITE$1, .16) : yy >= plateBottom - 2 ? mix(base, INK$1, .45) : base);
	}
	const quiet = gold ? [
		110,
		66,
		10
	] : aura ? mix(ah, WHITE$1, .6) : [
		184,
		176,
		206
	];
	const titleInk = (x, yy, tm) => mix(mix(ah, WHITE$1, .5), WHITE$1, .5 + .5 * Math.sin(x * .12 - tm / wave(1e3 / 2) + yy * .1));
	const titlePixels = [];
	titles.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), titleTop + k * 12 - 2, (x, yy) => {
		if (gold) return GOLD_INK;
		if (!aura) return WHITE$1;
		titlePixels.push(x, yy);
		return titleInk(x, yy, 0);
	}, gold ? GOLD_CUT : INK$1));
	rest.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), subTop + k * 11 - 2, () => quiet));
	if (pill) {
		const w = pillW, x0 = paired ? Math.floor((W - w - 6 - textWidth(subs[0])) / 2) : Math.floor((W - w) / 2);
		const fill = gold ? [
			96,
			56,
			10
		] : tone;
		for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
			const edge = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
			s.set(x, yy, edge ? INK$1 : yy >= pillTop + 12 ? mix(fill, INK$1, .45) : yy === pillTop + 1 ? mix(fill, WHITE$1, .4) : fill);
		}
		s.text(pill, x0 + 7, pillTop - 1, () => gold ? [
			255,
			222,
			130
		] : WHITE$1, mix(fill, INK$1, .6));
		if (paired) s.text(subs[0], x0 + w + 6, pillTop - 1, () => quiet);
	}
	foots.forEach((l, k) => s.text(l, side + 5, footTop + k * 11 - 2, () => quiet));
	if (markHex) {
		const m = rgb$2(markHex), x0 = W - side - 14, y0 = footTop;
		for (let yy = 0; yy < 9; yy++) for (let x = 0; x < 9; x++) {
			const rim$1 = x === 0 || yy === 0 || x === 8 || yy === 8;
			s.set(x0 + x, y0 + yy, rim$1 ? INK$1 : x === 1 || yy === 1 ? mix(m, WHITE$1, .45) : x === 7 || yy === 7 ? mix(m, [
				0,
				0,
				0
			], .3) : m);
		}
	}
	const tag = new Surface(input.corner ? W : 0, input.corner ? H : 0);
	if (input.corner) {
		const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
		for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) tag.set(x, yy, yy >= y0 + 12 ? [
			0,
			0,
			0
		] : INK$1);
		tag.text(input.corner, x0 + 3, y0 - 2, () => WHITE$1);
	}
	const tagIdx = [];
	if (input.corner) {
		for (let i = 0; i < W * H; i++) if (tag.px[i * 4 + 3]) tagIdx.push(i);
	}
	const soul = aura;
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit$1.mid);
	const oy0 = soul ? Math.max(5 - fit$1.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - (fit$1.topAll + fit$1.footAll + 1) * zoom / 2) - 10) : Math.round((WIN.top + WIN.bottom + 1) / 2 - (fit$1.rest + fit$1.foot + 1) * zoom / 2) + 4;
	const floor = Uint8Array.from(s.region, (r) => r === 2 ? 1 : 0);
	const ground = input.copies?.some((o) => itemById(o.item)?.slot === "frame") ? (() => {
		let x0 = W, y0 = H, x1 = -1, y1 = -1;
		for (let i = 0; i < W * H; i++) if (floor[i]) {
			const x = i % W, yy = (i - x) / W;
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
		colors.forEach((row, j) => row.forEach((hex$1, i) => {
			const c = hex$1 ? rgb$2(hex$1) : INK$1;
			for (let k = 0; k < 3; k++) cells[(j * gw + i) * 3 + k] = c[k] / 255;
		}));
		for (let i = 0; i < W * H; i++) {
			if (!floor[i]) continue;
			const x = i % W, yy = (i - x) / W, cx = Math.floor((x - ox) / zoom), cy = Math.floor((yy - oy0) / zoom), cell = (cy - gy0) * gw + cx - gx0;
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
	const edIdx = [];
	for (let i = 0; i < W * H; i++) if (s.region[i]) edIdx.push(i);
	const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
	edIdx.forEach((i, k) => {
		const x = i % W, yy = (i - x) / W;
		ex[k] = x / 5;
		ey[k] = yy / 5;
		er[k] = s.region[i];
		eh[k] = shape.glint[(yy >> 1) * W + (x >> 1)];
		for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
	});
	const look = lookIndex(looks.look), looked = lookApplies(look, ed);
	const paint$1 = look === 1 ? {
		colors: paintColors(auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, g)].color], auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : GRADES[Math.max(0, g)].color),
		contrast: looks.contrast ?? PAINT_CONTRAST
	} : void 0;
	const block = (k) => Math.floor(k * 2.5) * 2 / 5;
	const field = looked ? lookField(look, ed, v, [wcx / 5, wcy / 5], {
		x: ex.map(block),
		y: ey.map(block),
		region: er,
		h: eh,
		rgb: ergb
	}, paint$1) : editionField(ed, v, [wcx / 5, wcy / 5], .2, {
		x: ex,
		y: ey,
		region: er,
		h: eh,
		rgb: ergb
	});
	const edOut = new Float32Array(n * 3), edAt = Int32Array.from(edIdx);
	const pop = soul || oy0 + fit$1.top * zoom < WIN.top + 3;
	const clip = (cx, cy) => pop ? inside(cx, cy) && cx > 2 && cx < W - 3 && cy > 2 && cy < WIN.bottom - 1 : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left && cx < WIN.right;
	const edgeC = aura ? mix(ah, WHITE$1, .55) : gold ? [
		255,
		236,
		170
	] : WHITE$1;
	const room = new Uint8Array(W * H);
	for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (clip(x, yy)) room[yy * W + x] = pop && (yy <= WIN.top + 1 || x <= WIN.left + 1 || x >= WIN.right - 1) ? 2 : 1;
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
			const own = (gx, gy) => !!colors[gy][gx] && slots[gy][gx] !== 5 && slots[gy][gx] !== 3 && slots[gy][gx] === 4 === buddy;
			colors.forEach((row, gy) => row.forEach((_, gx) => {
				if (own(gx, gy)) lo = gy;
			}));
			if (lo < 0) continue;
			for (let gy = Math.max(0, lo - 1); gy <= lo; gy++) colors[gy].forEach((_, gx) => {
				if (own(gx, gy)) {
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
		const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
		const bx = ox - 2, by = oy - 2, bw = fw * zoom + 4, bh = fh * zoom + 4, out = [];
		mask.fill(0, 0, bw * bh);
		for (let gy = 0; gy < fh; gy++) {
			const row = colors[gy], srow = slots[gy];
			for (let gx = 0; gx < fw; gx++) if (row[gx] && srow[gx] !== 5 && srow[gx] !== 3) for (let dy = 0; dy < zoom; dy++) mask.fill(1, (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]), (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]) + zoom);
		}
		for (let j = 0; j < bh; j++) {
			const yy = by + j;
			if (yy < 0 || yy >= H) continue;
			for (let k = 0; k < bw; k++) {
				const m = j * bw + k, x = bx + k;
				if (mask[m] || x < 0 || x >= W) continue;
				const r = room[yy * W + x];
				if (r && (mask[m + 2] || mask[m - 2] || mask[m + bw * 2] || mask[m - bw * 2] || mask[m + bw + 1] || mask[m + bw - 1] || mask[m - bw + 1] || mask[m - bw - 1])) out.push((yy * W + x) * 2 + (r === 2 ? 1 : 0));
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
		const put = (i, r, g$1, b$1) => {
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
				put(ground.pix[k], groundLit[j * 3], groundLit[j * 3 + 1], groundLit[j * 3 + 2]);
			}
		}
		const fl = aura ? [] : floorsOf(frame, oy);
		for (let f = 0; f < fl.length; f += 3) {
			const sx = fl[f], sy = fl[f + 1], rx = fl[f + 2];
			for (let yy = Math.ceil(sy - 4); yy <= sy + 4; yy++) for (let x = Math.ceil(sx - rx); x <= sx + rx; x++) {
				if (x < 0 || yy < 0 || x >= W || yy >= H || !floor[yy * W + x]) continue;
				const fx = (x - sx) / rx, fy = (yy - sy) / 4, d = fx * fx + fy * fy;
				if (d >= 1) continue;
				const i = (yy * W + x) * 4, k = 1 - .16 * (1 - d);
				body$1[i] *= k;
				body$1[i + 1] *= k;
				body$1[i + 2] *= k;
			}
		}
		for (const e of edgesOf(frame, oy)) {
			const c = e & 1 ? WHITE$1 : edgeC;
			put(e >> 1, c[0], c[1], c[2]);
		}
		for (let gy = 0; gy < fh; gy++) for (let gx = 0; gx < fw; gx++) {
			const hex$1 = colors[gy][gx];
			if (!hex$1 || slots[gy][gx] === 3) continue;
			const slot = slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0, x0 = ox + cellX(gx, slot);
			const f = copy ? SHADER_FINISHES.indexOf(copy.finish) : -1, c = rgb$2(hex$1);
			if (copy && f >= 0) litDone.fill(0);
			for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
				const cx = x0 + dx, cy = oy + gy * zoom + dy;
				if (cx < 0 || cy < 0 || cx >= W || cy >= H || !room[cy * W + cx]) continue;
				if (!copy || f < 0) {
					put(cy * W + cx, c[0], c[1], c[2]);
					continue;
				}
				if (look === 2 && f === PRISM$1) {
					if (!litDone[0]) {
						litDone.fill(1);
						const out = polyColor([
							c[0] / 255,
							c[1] / 255,
							c[2] / 255
						], [x0 / 5, (oy + gy * zoom) / 5], [wcx / 5, wcy / 5], shineTime, Math.min(1, Math.max(0, 1 - copy.scuff * 1.4)));
						lit[0] = out[0] * 255;
						lit[1] = out[1] * 255;
						lit[2] = out[2] * 255;
					}
					put(cy * W + cx, lit[0], lit[1], lit[2]);
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
				put(cy * W + cx, lit[k * 3], lit[k * 3 + 1], lit[k * 3 + 2]);
			}
		}
		for (const [gx, gy, hex$1] of frame.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
			const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy, c = rgb$2(hex$1);
			if (cx >= 0 && cy >= 0 && cx < W && cy < H && room[cy * W + cx]) put(cy * W + cx, c[0], c[1], c[2]);
		}
	};
	const body = s.px.slice();
	return {
		moves: ed > 0 || Object.values(owned).some((o) => o && shines$1(o)),
		pose(t) {
			const tm = t * 1e3 + shift$1;
			return {
				lift: Math.round(1 + Math.sin(TAU_MS(tm, 3e3))),
				bob: soul ? Math.round(Math.sin(tm / wave(1e3 / 2.6)) * 2) : 0
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
			drawGuy(frame, oy0 + bob, body, loopSeconds(t * 1e3));
			for (const i of tagIdx) body.set(tag.px.subarray(i * 4, i * 4 + 3), i * 4);
			for (let k = 0; k < titlePixels.length; k += 2) {
				const c = titleInk(titlePixels[k], titlePixels[k + 1], tm), i = (titlePixels[k + 1] * W + titlePixels[k]) * 4;
				body[i] = c[0];
				body[i + 1] = c[1];
				body[i + 2] = c[2];
			}
			out.set(shape.shadow);
			for (let yy = 0; yy < H; yy++) {
				const [a, b$1] = shape.runs[yy];
				if (a >= 0) out.set(body.subarray((yy * W + a) * 4, (yy * W + b$1 + 1) * 4), ((yy + 2 - lift) * W + a) * 4);
			}
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
	return top ? editionOf(top.finish) : g < 0 ? 0 : [
		0,
		1,
		2,
		3,
		5,
		6
	][g];
}
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
* whole turns of LOOP_MS, with every sheen on the card on the same clock. A
* card with nothing shining draws each pose of his once and shows it again.
*/
function cardPlayer(input, ms = 80, { keep = true, look, contrast } = {}) {
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
	const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), art = cardArt(input, anim, owned, g, cardEdition(input, g), {
		look,
		contrast
	});
	const total = anim.duration, count$1 = Math.max(1, Math.round(total / ms)), cache = [];
	const delays = Array.from({ length: count$1 }, (_, k) => Math.round((k + 1) * total / count$1) - Math.round(k * total / count$1));
	const frameOf = new Map(anim.frames.map((f, k) => [f, k]));
	const poses = new Map();
	const one = keep ? null : new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4);
	let shown = -1;
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		count: count$1,
		delay: total / count$1,
		delays,
		frame(i) {
			const k = (i % count$1 + count$1) % count$1;
			if (cache[k]) return cache[k];
			const frame = frameAt(anim, k * total / count$1), t = k * turns * LOOP_MS / count$1 % LOOP_MS / 1e3;
			const { lift } = art.pose(t), pose = art.moves ? -1 : frameOf.get(frame) * 4 + lift;
			if (!keep) {
				if (pose < 0 || pose !== shown) art.draw(frame, t, one);
				shown = pose;
				return one;
			}
			let px = pose >= 0 ? poses.get(pose) : void 0;
			if (!px) {
				px = art.draw(frame, t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
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
	const W = anim.width, frames = anim.frames.map((f) => {
		const px = new Uint8ClampedArray(W * FRAME_HEIGHT * 4);
		f.colors.forEach((row, y) => row.forEach((c, x) => {
			const v = c ? rgb$2(c) : bg;
			if (v) px.set([...v, 255], (y * W + x) * 4);
		}));
		return px;
	});
	return encodeGif({
		width: W,
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
* in a window, and a dark plate at the foot with the grade pips and the set's
* symbol. Its words (name, print, odds) are the page's to write over it.
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
const rgb$1 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const gradeIndex = (o) => GRADES.findIndex((g) => g.id === gradeOf(o).id);
const INK = [
	24,
	20,
	31
], WHITE = [
	255,
	255,
	255
], IVORY = [
	246,
	240,
	227
], PLATE = [
	38,
	34,
	52
];
/** Kinds of pixel, as the shader reads them. */
const CARD = 1, WINDOW = 2, GUY = 3, ITEM = 4, FIXED = 5;
/** The card's face, ready to draw at any time. */
function cardFace(spec) {
	const W = FACE_WIDTH, H = FACE_HEIGHT;
	const copies = spec.copies ?? [];
	const r = resolve(spec.name, spec.parts);
	if (spec.palette !== void 0) r.palette = spec.palette;
	const config = dress(r, { equip: copies.map(encode) });
	const grid = compose(config);
	const palette$1 = withItems(paletteOf(config), config), colors = paint(grid, config, palette$1);
	const owned = config.owned ?? {};
	const g = spec.grade ?? (copies.length ? Math.max(...copies.map(gradeIndex)) : -1);
	const last = copies[copies.length - 1], lastItem = last ? itemById(last.item) : void 0;
	const set = spec.set ?? (lastItem && lastItem.game !== "club" ? lastItem.game : void 0);
	const holo = last ? Math.max(0, SHADER_FINISHES.indexOf(last.finish)) : 0;
	const top = copies.filter((o) => gradeIndex(o) === g).pop();
	const edition = top ? editionOf(top.finish) : g < 0 ? 0 : [
		0,
		1,
		2,
		3,
		5,
		6
	][Math.min(g, 5)];
	const base = new Uint8Array(W * H * 4), kind = new Uint8Array(W * H * 4), noise$1 = new Uint8Array(W * H * 4);
	const put = (x, y, c, k, fi = -1, sc = 0, pr = 0) => {
		const i = (y * W + x) * 4, print = Math.floor(pr / 4);
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
	const gx0 = Math.floor((W - FRAME_WIDTH) / 2), left = Math.max(2, gx0 - 2), right = Math.min(W - 3, gx0 + FRAME_WIDTH + 1), wTop = 9, wBottom = 28;
	const origin = [(left + right) / 2, (wTop + wBottom) / 2];
	const stock = (x, y) => gold ? blend([
		255,
		222,
		110
	], [
		204,
		124,
		22
	], y / H * .85) : neg ? blend(blend(IVORY, tone, .35), blend(IVORY, tone, .6), y / H) : blend(blend(tone, WHITE, .08), blend(tone, INK, .25), y / H);
	const plate = gold ? [
		92,
		52,
		8
	] : aura ? blend(blend(tone, INK, .6), INK, .45) : PLATE;
	const light = gold ? [
		112,
		62,
		10
	] : blend(IVORY, gc, g >= 0 ? .22 : spec.tint ? .3 : .12);
	const glow = gold ? [
		232,
		160,
		48
	] : blend(light, gc, .2);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const cx = Math.min(x, W - 1 - x), cy = Math.min(y, H - 1 - y);
		if (cx + cy < 2) continue;
		if (cx === 0 || cy === 0 || cx + cy === 2) {
			put(x, y, INK, FIXED);
			continue;
		}
		const bevel = cx === 1 || cy === 1 || cx + cy === 3;
		let c = stock(x, y);
		if (bevel) c = x > W / 2 && cx === 1 || y > H / 2 && cy === 1 ? blend(c, INK, .3) : blend(c, WHITE, .35);
		if (aura && !bevel) {
			const d = Math.hypot((x - origin[0]) / 15, (y - origin[1]) / 19);
			put(x, y, blend(blend(tone, INK, .62), blend(tone, INK, .3), Math.max(0, 1 - d) ** 1.2), WINDOW);
			continue;
		}
		put(x, y, c, CARD);
	}
	for (let y = 2; y <= 7; y++) for (let x = 2; x <= W - 3; x++) {
		if ((x === 2 || x === W - 3) && (y === 2 || y === 7)) continue;
		put(x, y, y === 2 ? blend(plate, WHITE, .16) : y === 7 ? INK : plate, FIXED);
	}
	if (!aura) for (let y = wTop; y <= wBottom; y++) for (let x = left; x <= right; x++) {
		const d = Math.hypot((x - origin[0]) / 10, (y - origin[1]) / 11);
		if (x === left || y === wTop || x === right || y === wBottom) put(x, y, INK, FIXED);
		else put(x, y, blend(light, glow, Math.max(0, 1 - d) ** 1.4), WINDOW);
	}
	const frameCopy = owned.frame, fx0 = aura ? 2 : left + 1, fx1 = aura ? W - 3 : right - 1, fy0 = aura ? 8 : wTop + 1, fy1 = aura ? 29 : wBottom - 1;
	const ground = backdropColors(config, palette$1, fx0 - gx0, fy0 - 11 + HEADROOM, fx1 - fx0 + 1, fy1 - fy0 + 1);
	if (ground) {
		const fi = frameCopy ? SHADER_FINISHES.indexOf(frameCopy.finish) : -1;
		ground.forEach((row, j) => row.forEach((hex$1, i) => {
			if (hex$1) put(fx0 + i, fy0 + j, rgb$1(hex$1), ITEM, fi, frameCopy?.scuff ?? 0, frameCopy?.print ?? 0);
		}));
	}
	grid.forEach((row, y) => row.forEach((t, x) => {
		const hex$1 = colors[y][x];
		if (!hex$1 || ground && t >= LAYER.frame && t < LAYER.buddy) return;
		const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
		const o = slot ? owned[slot] : void 0;
		const fi = o ? SHADER_FINISHES.indexOf(o.finish) : -1;
		if (x + gx0 > 1 && x + gx0 < W - 2) put(x + gx0, y + 11, rgb$1(hex$1), o ? ITEM : GUY, fi, o ? o.scuff : 0, o ? o.print : 0);
	}));
	for (let y = 30; y <= H - 3; y++) for (let x = 2; x <= W - 3; x++) {
		if ((x === 2 || x === W - 3) && (y === 30 || y === H - 3)) continue;
		put(x, y, y === 30 ? INK : plate, FIXED);
	}
	const empty$1 = blend(plate, WHITE, .22);
	if (g >= 0) for (let p = 0; p < 5; p++) {
		const x0 = 6 + p * 3;
		for (let y = 31; y <= 32; y++) for (let x = x0; x <= x0 + 1; x++) put(x, y, p <= g ? y === 31 ? blend(tone, WHITE, .3) : tone : empty$1, FIXED);
	}
	else for (let x = 8; x <= 17; x++) put(x, 31, empty$1, FIXED);
	const mark = set ? SET_COLORS[set] : void 0;
	if (mark) for (let y = 36; y <= 38; y++) for (let x = 20; x <= 22; x++) put(x, y, x === 20 && y === 36 ? blend(rgb$1(mark), WHITE, .5) : x === 22 || y === 38 ? blend(rgb$1(mark), [
		0,
		0,
		0
	], .35) : rgb$1(mark), FIXED);
	const face = {
		base,
		kind,
		noise: noise$1,
		grade: g,
		negative: copies.some((o) => o.finish === "negative"),
		seed: last ? last.print : 0,
		holo,
		variant: last ? last.print % 4 : 0,
		edition,
		origin
	};
	if (spec.look) {
		face.look = lookIndex(spec.look);
		const hues = auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, Math.min(g, GRADES.length - 1))].color];
		face.paint = {
			colors: paintColors(hues, auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : hues[0]),
			contrast: spec.contrast ?? PAINT_CONTRAST
		};
	}
	return face;
}
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
const faceMoves = (f) => f.edition > 0 || f.kind.some((v, i) => i % 4 === 1 && v > 0);
const PRISM = SHADER_FINISHES.indexOf("prism");
/** A face's edition worked out per pixel once (`editionField`), kept with the face. */
const fields = new WeakMap();
function faceField(f) {
	let got = fields.get(f);
	if (got) return got;
	const W = FACE_WIDTH, H = FACE_HEIGHT, at = new Int32Array(W * H).fill(-1), cells = [];
	for (let i = 0; i < W * H; i++) {
		if (f.base[i * 4 + 3] < 128 || Math.floor(f.kind[i * 4] / 32 + .5) > WINDOW) continue;
		at[i] = cells.length;
		cells.push(i);
	}
	const n = cells.length, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb$4 = new Float32Array(n * 3);
	cells.forEach((i, k) => {
		x[k] = i % W;
		y[k] = Math.floor(i / W);
		region[k] = Math.floor(f.kind[i * 4] / 32 + .5);
		h[k] = f.noise[i * 4] / 255;
		for (let j = 0; j < 3; j++) rgb$4[k * 3 + j] = f.base[i * 4 + j] / 255;
	});
	const pixels = {
		x,
		y,
		region,
		h,
		rgb: rgb$4
	};
	got = {
		at,
		field: f.look ? cardField(f.look, f.edition, f.variant, f.origin, 1, pixels, f.paint) : editionField(f.edition, f.variant, f.origin, 1, pixels),
		out: new Float32Array(n * 3)
	};
	fields.set(f, got);
	return got;
}
/** The face `ms` into its loop, in plain code: RGBA bytes, the same the GPU draws. */
function cardFaceAt(f, ms, hover) {
	const W = FACE_WIDTH, H = FACE_HEIGHT, out = new Uint8ClampedArray(W * H * 4);
	const time = loopSeconds(ms), { at, field, out: ed } = faceField(f);
	field(time, ed);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
		if (f.base[i + 3] < 128) continue;
		let c;
		const e = at[i >> 2];
		if (e >= 0) c = [
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
			if (k === ITEM && finish === PRISM && f.look === 2) c = polyColor(c, [x, y], f.origin, time, Math.min(1, Math.max(0, 1 - f.kind[i + 2] / 255 * 1.4)));
			else if (k === ITEM && finish >= 0) c = finishColor(c, finish, f.kind[i + 2] / 255, f.noise[i] / 255, x + y, y, f.kind[i + 3] * 4, time, 1);
		}
		if (hover && hover.strength > 0) {
			const light = (1 - smoothstep(0, .34, distance([(x + .5) / W, (y + .5) / H], [hover.x, hover.y]))) * .35 * hover.strength;
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
/** The face's shader, for a page or a game with WebGL: textures `base`, `kind`, `noise` from `cardFace`. */
const CARD_FRAGMENT = `${GLSL_PRECISION}
varying vec2 uv;
uniform sampler2D base, kind, noise;
uniform float time, hover, edition, variant, look, contrast;
uniform vec2 light, origin;
uniform vec3 paint1, paint2, paint3;
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
  if (k > 3.5 && k < 4.5 && finish > 3.5 && finish < 4.5 && look > 1.5 && look < 2.5) c = polyColor(c, cell, origin, time * TAU / 6.0, clamp(1.0 - kd.b * 1.4, 0.0, 1.0));
  else if (k > 3.5 && k < 4.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, cell.x + cell.y, cell.y, print, time, 1.0);
  else if (k < 2.5 && look > 0.5) c = lookColor(c, look, edition, variant, cell, origin, k, h, 1.0, time, paint1, paint2, paint3, contrast);
  else if (k < 2.5) c = editionColor(c, edition, variant, cell, origin, k, h, 1.0, time);
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
		"paint3"
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
			gl.uniform1f(u.edition, face.edition);
			gl.uniform1f(u.variant, face.variant);
			gl.uniform2f(u.origin, face.origin[0], face.origin[1]);
			gl.uniform1f(u.hover, hover?.strength ?? 0);
			gl.uniform2f(u.light, hover?.x ?? .5, hover?.y ?? .3);
			gl.uniform1f(u.look, face.look ?? 0);
			gl.uniform1f(u.contrast, face.paint?.contrast ?? PAINT_CONTRAST);
			const paint$1 = face.paint?.colors;
			[
				u.paint1,
				u.paint2,
				u.paint3
			].forEach((at, k) => gl.uniform3f(at, paint$1?.[k][0] ?? 0, paint$1?.[k][1] ?? 0, paint$1?.[k][2] ?? 0));
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
const ART_VERSION = 11;
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
/**
* A baked guy's size (`GUY_WIDTH` by `GUY_HEIGHT` in ./bake), a guy with a
* buddy beside him (`BUDDY_GUY_WIDTH`), and a card's. Nothing tells a page
* from an address alone which of the first two a guy is, so size a box by its
* height and let the picture set its width.
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
	}
};

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
			const pixels = "image-rendering:pixelated;image-rendering:crisp-edges";
			const style = (width, height) => `width:${width * size}px;height:${height * size}px;${pixels}`;
			if (host) {
				const img = document.createElement("img");
				img.src = `${host}/g/${ART_VERSION}/${who}/${view}.png`;
				img.alt = "";
				img.decoding = "async";
				img.loading = "lazy";
				img.style.cssText = box === BAKED_SIZE.card ? style(box.width, box.height) : `width:auto;min-width:${box.width * size}px;height:${box.height * size}px;${pixels}`;
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
const leftOf = (width, W) => AURA_PAD + Math.floor((W - AURA_PAD * 2 - width) / 2);
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
function place(frame, W, left, shone) {
	const out = new Uint8ClampedArray(W * GUY_HEIGHT * 4), fw = frame.colors[0].length;
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const o = (y * W + x + left) * 4;
		if (shone) {
			const i = (y * fw + x) * 4;
			if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o);
			continue;
		}
		const c = frame.colors[y][x];
		if (c) out.set([...rgb(c), 255], o);
	}
	for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W) out.set([...rgb(c), 255], (y * W + x + left) * 4);
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
	const options = animateOptions(spec), owned = ownedOf$1(spec);
	const plain = animate(spec.seed, move, options);
	const W = plain.width > FRAME_WIDTH ? BUDDY_GUY_WIDTH : GUY_WIDTH, left = leftOf(plain.width, W);
	const ground = backdropOf(spec.seed, options, -left, 0, W, FRAME_HEIGHT);
	const lay = (f) => ground ? {
		frame: grounded(f, ground, left),
		left: 0
	} : {
		frame: f,
		left
	};
	const shining = plain.frames.some((f) => shines(f, owned));
	if (!plain.timed && !shining) return {
		frames: merged(W, GUY_HEIGHT, plain.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W, l.left);
		}), plain.frames.map((f) => f.ms)),
		left
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
		frames: merged(W, GUY_HEIGHT, anim.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W, l.left, shining ? shineFrame(l.frame, owned, f.at ?? 0) : void 0);
		}), anim.frames.map((f) => f.ms)),
		left
	};
}
/** A frame laid on the whole picture `ground` is painted for, from column `left`: his pixels, an aura's cells past his sides, and the backdrop everywhere else. */
function grounded(frame, ground, left) {
	const W = ground[0].length, fw = frame.colors[0].length;
	const colors = ground.map((row) => row.slice()), slots = ground.map((row) => row.map((c) => c ? 3 : 0));
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const c = frame.colors[y][x];
		if (c && frame.slots[y][x] !== 3) {
			colors[y][x + left] = c;
			slots[y][x + left] = frame.slots[y][x];
		}
	}
	for (const [x, y, c] of frame.outside ?? []) if (x + left >= 0 && x + left < W) {
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
	} : spec, move), g = baked.frames, W = g.width, H = g.height;
	const lit = (px, x, y) => px[(y * W + x) * 4 + 3] >= 128;
	let left = W, right = -1, top = H, bottom = -1;
	for (const px of g.frames) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
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
	const ground = backdrop ? backdropGround(spec, side, ox + baked.left, oy) : null, solid = groundOf(g.frames[0], W, H);
	const frames = g.frames.map((px) => {
		const out = ground ? new Uint8ClampedArray(ground) : new Uint8ClampedArray(side * side * 4);
		if (!ground) for (let i = 0; i < side * side; i++) out.set(solid, i * 4);
		for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit(px, x, y)) out.set(px.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), ((y + oy) * side + x + ox) * 4);
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
/** His commonest colour that isn't an outline, most of the way to white. */
function groundOf(px, W, H) {
	const counts = new Map();
	for (let i = 0; i < W * H; i++) {
		const [r, g, b$1, a] = px.subarray(i * 4, i * 4 + 4);
		if (a < 128 || .2126 * r + .7152 * g + .0722 * b$1 < 60) continue;
		const key = r << 16 | g << 8 | b$1;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const top = [...counts].sort((a, b$1) => b$1[1] - a[1])[0]?.[0] ?? 14540253;
	const c = [
		top >> 16,
		top >> 8 & 255,
		top & 255
	];
	return [...c.map((v) => Math.round(v + (255 - v) * .72)), 255];
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
* (`idle`, `hop`…), `still` (his first idle frame), `card` or `card-still`, `pfp` or `pfp-still`
* (a profile picture, `profileFrames`).
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
export { ARM_NAMES, ART_VERSION, AURAS, AURA_ODDS, Avatar, AvatarFallback, AvatarImage, BAKED_SIZE, BUDDY_GUY_WIDTH, CAPSULE_ONLY, CARD_FRAGMENT, CARD_HEIGHT, CARD_LOOKS, CARD_WIDTH, CRAFT_COST, DEAL_PREFIX, DEEP_BLUE_PRINTS, DEFAULT_COLORS, DEFAULT_COLORS_DARK, DEFAULT_COLORS_LIGHT, EFFECTS, EMOTE_UNLOCKS, FACE_HEIGHT, FACE_WIDTH, FINISHES, FOOT_NAMES, FOOT_STYLES, FRAME_HEIGHT, FRAME_SLOTS, FRAME_WIDTH, FX_IDS, GAMES, GLSL_COMMON, GLSL_LOOKS, GOLD_RIM_DAYS, GRADES, GRID_SIZE, GUY_HEIGHT, GUY_TIERS, GUY_WIDTH, HEADROOM, LOOP_MS, LUCKY_ODDS, LilGuy, LilGuyAnimated, MAX_PINS, MOVES, NAME_KEY, ONE_OF_ONE_AURAS, PAINTABLE, PAINTS, PAINT_COST, PAINT_IDS, PART_ODDS, PART_SLOTS, PINS, PROFILE_SIZE, RECLAIMED, REFINED, RETIRED_EYES, SCRAP, SHADER_FINISHES, SHADE_COUNT, SHINE_FRAGMENT, SHOWPIECE_WEIGHT, SMALL_SIZE, TAG_MAX, TIER_ICONS, TONE_NAMES, TRAIT_ICONS, TRAIT_SLOTS, WEAR, WIDE_FRAME_WIDTH, accessories, allowed, animate, animateLoop, animateOptions, applyFx, auraById, auraCells, auraColor, auraColors, bakeCard, bakeGuy, bakeView, bakedImage, bodies, buddyAlone, cardFace, cardFaceAt, cardFrames, cardPlayer, cardStill, cheeks, cleanTag, closeEyes, collectorNotes, compose, composeBase, copyOneIn, craftCopy, craftable, createCardShader, createShine, dealOf, decode, decodeLook, defineLilGuyHere as defineLilGuy, drawFrame, dress, encode, encodeApng, encodeGif, encodeLook, encodePng, eyes, faceMoves, faceSpec, finishColor, floatShare, frameAt, freeItem, fxColor, gameItems, getColor, getPalette, gradeOf, guyCode, guyOneIn, guyRank, guyScore, hair, hash, hashNth, heads, inSeason, isMove, itemById, itemFrame, itemWeight, items, lookApplies, lookOf, luckyPalette, machineName, machineSet, makeSeed, mergeRefs, metalCoins, metalText, mouths, mysteryMachine, nameKey, nameOf, nameSkeleton, nebulaPhase, noiseOf, ownedOf, paint, painted, paletteOf, palettes, partCode, partCost, partName, pickable, pinById, profileFrames, rareParts, readGuyCode, readPart, resolve, resolveColor, roll, rollFx, rollPart, rollSeason, setProgress, shadePalette, sheetOf, shineData, shineFit, shineFrame, shines, shows, slotOf, smeltValue, special, squashRows, starter, surfaceOf, tallyMarks, temperTint, textWidth, toAnimatedSvg, toCardGif, toCardPng, toGuyGif, toPng, toProfileGif, toProfilePng, toShareSvg, toSvgString, tradeFloat, tradeGames, traitOdds, unlocksOf, upscale, useAvatarContext, useMergeRefs, voxelColumns, voxelItem, voxelMesh, wearOf, withItems };
//# sourceMappingURL=index.js.map