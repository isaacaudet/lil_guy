"use strict";
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region src/hash.ts
/**
* FNV-1a hash — returns a positive 32-bit integer.
*/
function hash(input) {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
/**
* Returns an independent hash for each body-part slot by appending a separator and index.
*/
function hashNth(input, index) {
	return hash(input + "|" + index);
}

//#endregion
//#region src/parts/weights.ts
/**
* How often each part turns up, for guys dealt from deal 4 on (seeds made by
* `makeSeed`). Older guys read the frozen `DEAL_3` and `DEAL_2` tables at the end.
*
* Weighted by how good a part looks, not to make everything equally likely:
*
* - a handful of simple, sweet defaults carry most of the weight, so most
*   guys are clean and "rare" means something (about 1 in 6 to 1 in 15)
* - good everyday parts are common (1 in 20 to 1 in 45: a picker offers
*   anything at 1 in 45 or better)
* - busier or weaker parts are a treat to find (1 in 50 to 1 in 200)
* - chase parts, the ones meant to be shown off, are one guy in several
*   hundred: weight 1 to 3 here, about 1 in 300 to 1 in 1,000
* - a part that looks wrong and couldn't be fixed is 0: never dealt, but it
*   stays in its list, since saved looks and older guys point at it
*
* A guy with ears, a hat, glasses, a scarf and a pattern all at once is too
* much on sixteen pixels, so the "nothing" options carry the most weight.
*
* Each array must be the same length as its part array; a test enforces that.
*/
const headWeights = [
	150,
	130,
	50,
	120,
	100,
	90,
	80,
	25,
	30,
	30,
	35,
	20,
	40,
	30,
	15,
	20,
	20,
	15,
	10,
	15,
	10,
	20,
	10,
	8,
	20,
	30,
	20,
	20,
	15,
	2,
	3,
	3
];
const eyeWeights = [
	120,
	175,
	110,
	145,
	40,
	75,
	40,
	20,
	30,
	25,
	30,
	15,
	15,
	8,
	12,
	6,
	8,
	15,
	12,
	35,
	1,
	2,
	2,
	0,
	0,
	0,
	0
];
const mouthWeights = [
	150,
	130,
	90,
	50,
	40,
	50,
	40,
	20,
	25,
	70,
	15,
	30,
	30,
	15,
	8,
	15,
	35,
	20,
	60,
	2,
	1,
	2,
	0,
	0,
	0
];
const cheekWeights = [
	300,
	150,
	15,
	60,
	40,
	10,
	10,
	12,
	8,
	25,
	20,
	15,
	10,
	6,
	50,
	40,
	15,
	1,
	1,
	0
];
const hairWeights = [
	250,
	80,
	70,
	50,
	25,
	15,
	30,
	70,
	30,
	30,
	45,
	12,
	15,
	25,
	10,
	25,
	40,
	10,
	40,
	30,
	25,
	25,
	0,
	15,
	10,
	15,
	20,
	20,
	15,
	20,
	30,
	25,
	15,
	20,
	2,
	2,
	2
];
const bodyWeights = [
	500,
	60,
	50,
	30,
	40,
	25,
	30,
	15,
	20,
	12,
	35,
	15,
	15,
	15,
	35,
	30,
	30,
	1,
	2
];
const accessoryWeights = [
	450,
	50,
	50,
	40,
	30,
	40,
	15,
	15,
	12,
	10,
	35,
	30,
	30,
	20,
	35,
	25,
	20,
	2,
	2,
	1
];
/** None, by the sides, waving. */
const armWeights = [
	4,
	3,
	2
];
/** Nubs, tiptoes, wide, socks, tucked. */
const footWeights = [
	5,
	2,
	2,
	1,
	2
];
/** Pastel, as picked, vivid. */
const shadeWeights = [
	1,
	5,
	3
];
/**
* Colourways. The day colours all stay pickable, the favourites half as
* common again as the rest; the night colours are a find, and the three
* chase colourways, with their own shading, one guy in several hundred.
*/
const paletteWeights = [
	36,
	36,
	36,
	36,
	36,
	36,
	24,
	24,
	36,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	24,
	36,
	24,
	24,
	8,
	10,
	10,
	6,
	6,
	8,
	26,
	26,
	26,
	26,
	2,
	2,
	2
];
/**
* Parts no deal gives: only a capsule unlocks them (`rollPart` in ../look),
* and metal crafts them. Each weighs 0 in its table above, so every guy dealt
* from any deal stays exactly as he was, and the weight here is its share
* among a slot's rare parts when a capsule picks one, as a dealt part's
* weight is. The anime set, October 2026.
*/
const CAPSULE_ONLY = {
	eyes: {
		23: 6,
		24: 6,
		25: 8,
		26: 8
	},
	mouth: {
		22: 8,
		23: 8,
		24: 6
	},
	cheeks: { 19: 8 }
};
/** A part's weight when a capsule unlocks one: its deal weight, or its capsule-only weight. */
const unlockWeight = (slot, weights, i) => weights[i] || CAPSULE_ONLY[slot]?.[i] || 0;
/**
* Deal 3 (seeds starting `3-`), as it stood when deal 4 began: frozen like
* `DEAL_2`, so a guy dealt from it keeps his parts. Deal 4 dealt fewer shut
* and half-shut eyes.
*/
const DEAL_3 = {
	head: [
		150,
		130,
		50,
		120,
		100,
		90,
		80,
		25,
		30,
		30,
		35,
		20,
		40,
		30,
		15,
		20,
		20,
		15,
		10,
		15,
		10,
		20,
		10,
		8,
		20,
		30,
		20,
		20,
		15,
		2,
		3,
		3
	],
	eyes: [
		120,
		150,
		110,
		120,
		40,
		60,
		40,
		20,
		30,
		50,
		30,
		15,
		15,
		20,
		12,
		6,
		8,
		45,
		12,
		35,
		1,
		2,
		2
	],
	mouth: [
		150,
		130,
		90,
		50,
		40,
		50,
		40,
		20,
		25,
		70,
		15,
		30,
		30,
		15,
		8,
		15,
		35,
		20,
		60,
		2,
		1,
		2
	],
	cheeks: [
		300,
		150,
		15,
		60,
		40,
		10,
		10,
		12,
		8,
		25,
		20,
		15,
		10,
		6,
		50,
		40,
		15,
		1,
		1
	],
	hair: [
		250,
		80,
		70,
		50,
		25,
		15,
		30,
		70,
		30,
		30,
		45,
		12,
		15,
		25,
		10,
		25,
		40,
		10,
		40,
		30,
		25,
		25,
		0,
		15,
		10,
		15,
		20,
		20,
		15,
		20,
		30,
		25,
		15,
		20,
		2,
		2,
		2
	],
	body: [
		500,
		60,
		50,
		30,
		40,
		25,
		30,
		15,
		20,
		12,
		35,
		15,
		15,
		15,
		35,
		30,
		30,
		1,
		2
	],
	accessory: [
		450,
		50,
		50,
		40,
		30,
		40,
		15,
		15,
		12,
		10,
		35,
		30,
		30,
		20,
		35,
		25,
		20,
		2,
		2,
		1
	],
	palette: [
		36,
		36,
		36,
		36,
		36,
		36,
		24,
		24,
		36,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		24,
		36,
		24,
		24,
		8,
		10,
		10,
		6,
		6,
		8,
		26,
		26,
		26,
		26,
		2,
		2,
		2
	]
};
/**
* The deal before 3 (seeds without the `3-` or `4-` prefix, and plain names). Frozen:
* every guy already dealt from one of these keeps his parts, so these lists
* never change, not even to add a part. New parts and new weights go in the
* tables above, which only seeds made by `makeSeed` from deal 4 on read.
*/
const DEAL_2 = {
	head: [
		3,
		3,
		3,
		3,
		3,
		3,
		3,
		2,
		2,
		3,
		2,
		2,
		4,
		3,
		1,
		1,
		1,
		2,
		1,
		1,
		1,
		1,
		1,
		1,
		1
	],
	eyes: [
		10,
		10,
		8,
		8,
		4,
		6,
		4,
		2,
		4,
		6,
		4,
		2,
		2,
		3,
		2,
		1,
		1
	],
	mouth: [
		10,
		8,
		6,
		6,
		4,
		4,
		4,
		2,
		2,
		6,
		2,
		4,
		4,
		3,
		2,
		2
	],
	cheeks: [
		10,
		6,
		4,
		2,
		4,
		2,
		2,
		1,
		3,
		2,
		3,
		2,
		1,
		1
	],
	hair: [
		9,
		4,
		4,
		2,
		2,
		1,
		2,
		4,
		2,
		2,
		2,
		1,
		1,
		2,
		1,
		2,
		3,
		2,
		2,
		2,
		2,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		2,
		2
	],
	body: [
		9,
		2,
		2,
		2,
		2,
		1,
		1,
		2,
		2,
		2,
		2,
		1,
		1,
		1
	],
	accessory: [
		12,
		2,
		2,
		2,
		1,
		2,
		1,
		1,
		1,
		1,
		2,
		2,
		2,
		2
	],
	palette: [...new Array(32).fill(2), ...new Array(6).fill(1)]
};
/**
* Picks an index from a weight table using a hash value, so the result is
* deterministic for a given input and the distribution follows the weights.
*/
/**
* Eyes no guy has any more: never dealt, picked or drawn. They stay in their
* arrays (an index is what a saved look or game stores), so every other part
* keeps its place. 16 is the cyclops.
*/
const RETIRED_EYES = [16];
/** A slot's weights with its retired parts at zero. */
const withoutRetired = (weights, retired) => weights.map((x, i) => retired.includes(i) ? 0 : x);
function weightedPick(weights, hashValue) {
	let total = 0;
	for (const w of weights) total += w;
	let remaining = hashValue % total;
	for (let i = 0; i < weights.length; i++) {
		remaining -= weights[i];
		if (remaining < 0) return i;
	}
	return weights.length - 1;
}

//#endregion
//#region src/resolve.ts
/**
* Resolves an input string to a full AvatarConfig.
*
* Each slot is hashed independently so adding or removing variants from one
* part doesn't cascade into the others, and each pick is weighted (see
* ./parts/weights) so the simple, sweet looks are the common ones.
*/
/** One name in this many gets the Lucky colour variant. */
const LUCKY_ODDS = 400;
/**
* Seeds made now start with this. They draw from today's parts and weights;
* an older seed draws from its own deal's frozen tables (`3-` from deal 3,
* anything else, plain names included, from deal 2), so a guy already dealt
* never changes when parts are added or weights move.
*/
const DEAL_PREFIX = "4-";
/** Which deal an input draws from. */
const dealOf = (input) => input.startsWith(DEAL_PREFIX) ? 4 : input.startsWith("3-") ? 3 : 2;
const DEAL_4 = {
	head: headWeights,
	eyes: eyeWeights,
	mouth: mouthWeights,
	cheeks: cheekWeights,
	hair: hairWeights,
	body: bodyWeights,
	accessory: accessoryWeights,
	palette: paletteWeights
};
function resolve(input, overrides) {
	const pick = (slot, weights) => weightedPick(weights, hashNth(input, slot));
	const deal = dealOf(input);
	const w = deal === 4 ? DEAL_4 : deal === 3 ? DEAL_3 : DEAL_2;
	let eyes$1 = overrides?.eyes ?? pick(1, w.eyes);
	if (RETIRED_EYES.includes(eyes$1)) eyes$1 = weightedPick(withoutRetired(w.eyes, RETIRED_EYES), hashNth(input, 14));
	return {
		head: overrides?.head ?? pick(0, w.head),
		eyes: eyes$1,
		mouth: overrides?.mouth ?? pick(2, w.mouth),
		hair: overrides?.hair ?? pick(3, w.hair),
		body: overrides?.body ?? pick(4, w.body),
		accessory: overrides?.accessory ?? pick(5, w.accessory),
		palette: pick(6, w.palette),
		rotation: overrides?.rotation ?? hashNth(input, 7) % 9,
		flip: overrides?.flip ?? hashNth(input, 8) % 2 === 1,
		shade: overrides?.shade ?? pick(9, shadeWeights),
		feet: overrides?.feet ?? pick(10, footWeights),
		cheeks: overrides?.cheeks ?? pick(11, w.cheeks),
		arms: overrides?.arms ?? pick(12, armWeights),
		lucky: overrides?.lucky ?? hashNth(input, 13) % LUCKY_ODDS === 0
	};
}

//#endregion
//#region src/parts/art.ts
/**
* Every part is drawn as text, one character per pixel, so the art can be
* read and edited as a picture rather than a wall of numbers.
*
*   .  nothing          #  body            s  body shade      h  highlight
*   o  outline          e  eye             w  white           c  blush
*   m  mouth            t  tongue          a  accent          A  accent shade
*   x  trim             b  belly           g  leaf            G  leaf shade
*   y  gold             Y  gold shade      r  red             d  deep shade
*   1-9  an item's own colours (a jar's glass, a golf flag's red), listed
*        with the item rather than taken from the guy's palette
*/
const KEY = {
	".": 0,
	"#": 1,
	s: 2,
	h: 3,
	o: 4,
	e: 5,
	w: 6,
	c: 7,
	m: 8,
	t: 9,
	a: 10,
	A: 11,
	x: 12,
	b: 13,
	g: 14,
	G: 15,
	y: 16,
	Y: 17,
	r: 18,
	d: 19,
	1: 101,
	2: 102,
	3: 103,
	4: 104,
	5: 105,
	6: 106,
	7: 107,
	8: 108,
	9: 109
};
const T = {
	EMPTY: 0,
	BODY: 1,
	SHADE: 2,
	LIGHT: 3,
	OUTLINE: 4,
	EYE: 5,
	WHITE: 6,
	BLUSH: 7,
	MOUTH: 8,
	TONGUE: 9,
	ACCENT: 10,
	ACCENT_SHADE: 11,
	TRIM: 12,
	BELLY: 13,
	LEAF: 14,
	LEAF_SHADE: 15,
	GOLD: 16,
	GOLD_SHADE: 17,
	RED: 18,
	DEEP: 19
};
/**
* Item colours are drawn as 101–109 and moved into their layer's range once
* the layer is down: a skin's to 20–28, a hat's to 30–38, a frame's to 40–48,
* a buddy's to 50–58.
* Each layer keeps its own colours, so a gold hat on a glass jar works.
*/
const LOCAL = 101;
const LAYER = {
	skin: 20,
	hat: 30,
	frame: 40,
	buddy: 50,
	aura: 60
};
function stamp(rows) {
	return rows.map((row) => [...row].map((ch) => {
		const token = KEY[ch];
		if (token === void 0) throw new Error(`Unknown art character "${ch}" in "${row}"`);
		return token;
	}));
}
function width(s) {
	return s.reduce((w, row) => Math.max(w, row.length), 0);
}

//#endregion
//#region src/parts/hair.ts
/**
* Seats a drawing on the head: its bottom row lands on the highest body row
* beneath it. A tall part on a tall head is pushed down rather than allowed to
* touch the top of the grid, where it would lose its outline.
*/
function seat(c, s, x, sink = 1) {
	const last = s.length - 1;
	let top = Infinity;
	s[last].forEach((token, dx) => {
		if (!token) return;
		const t = c.topOf(x + dx);
		if (t !== null) top = Math.min(top, t);
	});
	if (top === Infinity) top = c.crown;
	let y = Math.max(1, top + sink - 1 - last);
	if (y + last > c.floor) y = Math.max(1, c.floor - last);
	c.draw(s, x, y);
}
const mirror = (s) => s.map((row) => [...row].reverse());
/** A drawing centred on the crown, nudged `dx` columns to the right. */
const centre = (name, rows, dx = 0, sink = 1) => {
	const s = stamp(rows);
	return {
		name,
		draw: (c) => seat(c, s, c.centred(s) + dx, sink)
	};
};
/**
* A pair drawn once for the left side. Each piece is placed `inset` columns in
* from the edge of the head's shoulder row, so ears stay on narrow and wide
* heads alike.
*/
const pair = (name, rows, inset = 0, sink = 1) => {
	const left = stamp(rows);
	const right = mirror(left);
	return {
		name,
		draw: (c) => {
			const r = c.rows[c.shoulder()];
			seat(c, left, r.left + inset, sink);
			seat(c, right, r.right - inset - width(right) + 1, sink);
		}
	};
};
/**
* Paints the top `n` rows of the head, shading the right-hand edge. A point
* above them is painted too, so on a pointed head a beanie is pointed.
*/
function capRows(c, n, fill, shade) {
	for (let y = Math.min(c.tip, c.crown); y < Math.min(c.crown + n, c.floor + 1); y++) {
		c.paintRow(y, fill);
		const r = c.rows[y];
		if (r) c.set(r.right, y, shade);
	}
}
/** The first row from the crown down at least `min` wide: where a hat's band goes. Never past the floor. */
function brow(c, min = 6) {
	for (let y = c.crown; y <= c.floor; y++) {
		const r = c.rows[y];
		if (r && r.right - r.left + 1 >= min) return y;
	}
	return Math.min(c.crown, c.floor);
}
/** How wide the head is on a row. */
const across = (c, y) => {
	const r = c.rows[y];
	return r ? r.right - r.left + 1 : 0;
};
/**
* Draws a hat centred with its bottom row on row `y`: pushed down where it
* would leave the grid, and never past the floor, where it would reach the eyes.
*/
function wear$2(c, s, y, dx = 0) {
	let top = Math.max(1, y - s.length + 1);
	if (top + s.length - 1 > c.floor) top = Math.max(1, c.floor - s.length + 1);
	c.draw(s, c.centred(s) + dx, top);
}
/** Picks the widest drawing that fits on a row the given width across, so a hat suits a narrow head and a wide one. */
const fitted = (sizes, room) => sizes.find((s) => width(s) <= room) ?? sizes[sizes.length - 1];
/** A hat drawn in a few widths, worn with its bottom row a row into the head. */
const hat = (name, sizes, sink = 1, dx = 0) => {
	const stamps = sizes.map(stamp);
	return {
		name,
		draw: (c) => {
			const y = Math.min(brow(c) + sink - 1, c.floor);
			wear$2(c, fitted(stamps, across(c, y) + 2), y, dx);
		}
	};
};
const hair = [
	{
		name: "none",
		draw: () => {}
	},
	pair("cat ears", [
		"#..",
		"#c.",
		"###"
	]),
	pair("bear ears", [
		"##",
		"#c",
		"##"
	]),
	pair("bunny ears", [
		"##",
		"#c",
		"#c",
		"##"
	], 1),
	pair("bug antennae", [
		"wa...",
		"aA...",
		".oo..",
		"..o..",
		"..o.."
	]),
	pair("horns", [
		"w..",
		"r..",
		"rr.",
		".rr"
	]),
	pair("space buns", [
		"aa",
		"aA",
		"aa"
	]),
	centre("sprout", [
		"gg.gg",
		".GgG.",
		"..g.."
	]),
	centre("apple stem", [
		"..gg",
		".oG.",
		".o.."
	]),
	centre("flower", [
		".a.",
		"aya",
		".a."
	], 3),
	centre("bow", [
		"aa.aa",
		"aaAaa",
		"a...a"
	], 3),
	hat("crown", [[
		"y..yy..y",
		"yyyyyyyy",
		"YYYrrYYY"
	], [
		"y.yy.y",
		"yyyyyy",
		"YYrrYY"
	]]),
	hat("party hat", [[
		"..xx..",
		"..aA..",
		".axaA.",
		".aaaA.",
		"axaxaA"
	]], 1),
	centre("antenna", [
		"wa",
		"aA",
		".o",
		".o"
	], 0),
	centre("unicorn horn", [
		".y",
		"yY",
		"Yy",
		"yY",
		"Yy"
	], 0, 2),
	centre("star clip", [
		"..y..",
		"yyyyy",
		".ywY.",
		".Y.Y."
	], -3),
	centre("tuft", [
		"#.",
		".#",
		".#"
	], 1),
	centre("chick tuft", [
		"#.#",
		".#.",
		".#."
	]),
	{
		name: "beanie",
		draw: (c) => {
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			c.paintRow(c.crown + 2, T.TRIM);
			const x = Math.floor(c.centre) - 1;
			const top = Math.min(c.topOf(x) ?? c.crown, c.topOf(x + 1) ?? c.crown);
			c.set(x, top - 1, T.TRIM);
			c.set(x + 1, top - 1, T.TRIM);
		}
	},
	{
		name: "cap",
		draw: (c) => {
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			const r = c.rows[c.crown + 1];
			for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, c.crown + 1, T.ACCENT_SHADE);
			c.set(Math.floor(c.centre) - 1, c.crown, T.TRIM);
		}
	},
	{
		name: "bob",
		draw: (c) => {
			const fringe = Math.min(c.crown + 2, c.floor);
			for (let y = Math.min(c.tip, c.crown); y <= fringe; y++) {
				c.paintRow(y, T.ACCENT);
				const r$1 = c.rows[y];
				if (r$1) {
					c.set(r$1.left - 1, y, T.ACCENT);
					c.set(r$1.right + 1, y, T.ACCENT_SHADE);
					c.set(r$1.right, y, T.ACCENT_SHADE);
				}
			}
			const r = c.rows[c.crown + 1];
			if (r) {
				c.set(r.left + 2, c.crown, T.LIGHT);
				c.set(r.left + 3, c.crown, T.LIGHT);
			}
			for (let y = fringe + 1; y <= c.eyeLine; y++) {
				const row = c.rows[y];
				if (!row) continue;
				c.set(row.left - 1, y, T.ACCENT);
				c.set(row.right + 1, y, T.ACCENT_SHADE);
			}
		}
	},
	hat("mushroom", [[
		"...rrrr...",
		".rrwwrrrr.",
		"rwwrrrrwwr",
		"rrrrrrrrrr"
	], [
		"..rrrr..",
		".rwwrrr.",
		"rrrrrwwr",
		"rrrrrrrr"
	]], 2),
	hat("eggshell", [[
		"....ww....",
		"..wwwwww..",
		".wwwwwwwh.",
		"wwwwwwwwhh",
		"w.ww.ww.wh"
	], [
		"...ww...",
		".wwwwww.",
		"wwwwwwhh",
		"w.ww.w.h"
	]], 2),
	hat("frosting", [[
		".....r...",
		"....r....",
		".xxxrxx..",
		"xxaxxxgxx",
		"xxxxyxxxx",
		"x.xx.xx.x",
		"x..x..x.."
	], [
		"....r..",
		"...r...",
		".xxrxx.",
		"xaxxxgx",
		"xxxyxxx",
		"x.xx.xx",
		"x..x..."
	]], 4),
	hat("leafy top", [[
		"..g..g..",
		"g.gG.G.g",
		".gGgGgG.",
		"..gGgG..",
		"...gG..."
	]], 1),
	hat("beret", [[
		"....A.....",
		"..aaaaaa..",
		".aaaaaaaaa",
		"aAAAAAAAaa",
		"........aA"
	], [
		"...A....",
		".aaaaaa.",
		"aaaaaaaa",
		"AAAAAAaa",
		"......aA"
	]], 2),
	hat("witch hat", [
		[
			"........AA..",
			"......aAA...",
			".....aAAA...",
			"....xxyxx...",
			"aAAAAAAAAAAA"
		],
		[
			".......AA.",
			".....aAA..",
			"....aAAA..",
			"...xxyxx..",
			"aAAAAAAAAA"
		],
		[
			"......A.",
			"....aAA.",
			"...aAA..",
			"..xxyxx.",
			"aAAAAAAA"
		]
	], 1),
	{
		name: "propeller",
		draw: (c) => {
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			c.paintRow(c.crown + 1, T.TRIM);
			const prop = stamp(["xxyaa", "..y.."]);
			const x = c.centred(prop) + 1, top = c.topOf(x + 2) ?? c.crown;
			c.draw(prop, x, Math.max(1, top - 2));
		}
	},
	{
		name: "mohawk",
		draw: (c) => {
			const mid = Math.floor(c.centre);
			for (let y = c.crown; y <= c.floor; y++) for (let x = mid - 2; x <= mid + 1; x++) if (c.isBody(x, y)) c.set(x, y, x === mid + 1 ? T.ACCENT_SHADE : T.ACCENT);
			const top = c.topOf(mid) ?? c.crown;
			c.draw(stamp([
				".a.a.",
				"aa.aA",
				"aaaAA"
			]), mid - 3, Math.max(1, top - 3));
		}
	},
	{
		name: "headphones",
		draw: (c) => {
			const y = brow(c), r = c.rows[y];
			const top = Math.max(1, y - 2);
			for (let x = r.left + 1; x <= r.right - 1; x++) c.set(x, top, T.ACCENT_SHADE);
			for (const [x, dir] of [[r.left - 1, 1], [r.right + 1, -1]]) {
				for (let dy = 0; dy < 3; dy++) {
					const cy = top + 1 + dy;
					c.set(x, cy, T.ACCENT);
					c.set(x + dir, cy, dy === 1 ? T.TRIM : T.ACCENT);
				}
				c.set(x, top, T.ACCENT_SHADE);
			}
		}
	},
	centre("cherries", [
		"..gG..",
		".g..g.",
		"rr..rr",
		"rr..rr"
	], 0, 0),
	{
		name: "flower crown",
		draw: (c) => {
			const y = brow(c), r = c.rows[y];
			for (let x = r.left - 1; x <= r.right + 1; x++) {
				const top = c.topOf(x);
				c.set(x, top === null || top > y ? y : top, (x + y) % 2 ? T.LEAF : T.LEAF_SHADE);
			}
			const mid = Math.floor(c.centre);
			for (const fx of [mid - 3, mid + 2]) {
				const fy = Math.min(c.topOf(fx) ?? y, y) - 1;
				for (const [dx, dy] of [
					[-1, 0],
					[1, 0],
					[0, -1]
				]) c.set(fx + dx, fy + dy, T.ACCENT);
				c.set(fx, fy, T.GOLD);
			}
			for (const bx of [mid - 1, mid]) c.set(bx, Math.min(c.topOf(bx) ?? y, y) - 1, T.BLUSH);
		}
	},
	{
		name: "antlers",
		draw: (c) => {
			const y = brow(c), r = c.rows[y];
			const left = stamp([
				"Y..y",
				"Y..Y",
				".YYY",
				"...Y"
			]);
			seat(c, left, r.left - 2);
			seat(c, mirror(left), r.right - 1);
		}
	},
	hat("chef hat", [[
		".ww.ww..",
		"wwwwwwww",
		"wwwwwwwh",
		".wwwwwh.",
		".xhxhxh."
	]], 1),
	hat("laurel", [[
		".gy....yg.",
		"gGyg..gyGg",
		"G.gGyyGg.G"
	], [
		".g....g.",
		"gGy..yGg",
		"GgGyyGgG"
	]], 1),
	hat("star crown", [[
		".....yy.....",
		"....yyyy....",
		".y.yywyyy.y.",
		"yyy.yyyy.yyy",
		".y..y..y..y.",
		"xxxxxxxxxxxx"
	], [
		"...yy...",
		"..ywyy..",
		".yyyyyy.",
		"..yyyy..",
		".xyxxyx."
	]], 1),
	hat("on fire", [[
		".....r....",
		"....rr..r.",
		".r..ryr.rr",
		".rr.ryyrry",
		"rryrryyyyr",
		"ryyyywwyyr"
	], [
		"....r...",
		"...rr.r.",
		".r.ryrrr",
		"rrrryyyr",
		"ryyywwyr"
	]], 2)
];

//#endregion
//#region src/types.ts
const GRID_SIZE = 16;

//#endregion
//#region src/item-art.ts
const grid16 = (name, rows) => {
	if (rows.length !== GRID_SIZE || rows.some((r) => r.length !== GRID_SIZE)) throw new Error(`Skin "${name}" must be drawn on a 16x16 grid`);
	return stamp(rows);
};
/** How many cells a row spans, first filled to last. */
const span = (row) => {
	const xs = row.map((t, i) => t ? i : -1).filter((i) => i >= 0);
	return xs.length ? xs[xs.length - 1] - xs[0] + 1 : 0;
};
/**
* A hat made `d` columns wider (or narrower), the way a cap stretches: the
* plainest columns, each the same as the one beside it, are repeated or taken
* out, a side at a time from the middle outwards, so a buckle, a jewel or a
* crown's points stay as drawn.
*/
function elastic(s, d) {
	let out = s.map((r) => [...r]);
	for (let k = 0; k < Math.abs(d); k++) {
		const w = width(out), mid = (w - 1) / 2, left = k % 2 === 0;
		const cost = (x) => out.reduce((a, r) => a + ((r[x] ?? 0) !== (r[x - 1] ?? 0) ? 1 : 0), 0);
		let best = -1, bestCost = Infinity, bestDist = Infinity;
		for (let x = 2; x <= w - 3; x++) {
			if (left ? x > mid : x < mid) continue;
			const c = cost(x), dist = Math.abs(x - mid);
			if (c < bestCost || c === bestCost && dist < bestDist) {
				best = x;
				bestCost = c;
				bestDist = dist;
			}
		}
		if (best < 0) break;
		out = out.map((r) => {
			const row = [...r];
			if (d < 0) row.splice(best, 1);
			else row.splice(best, 0, row[best]);
			return row;
		});
	}
	return out;
}
/**
* A hat made `d` rows shorter, the way `elastic` makes one narrower: the
* plainest row, the one most like the row under it, comes out, again and
* again. The bottom row (the brim, the band, what it stands on) always stays,
* so a top hat loses a row of its crown and a gem a row of its facets, and
* neither is ever chopped off at the brim.
*/
function squeeze(s, d) {
	let out = s.map((r) => [...r]);
	for (let k = 0; k < d && out.length > 1; k++) {
		const w = width(out), mid = (out.length - 2) / 2;
		const cost = (y) => {
			let n = 0;
			for (let x = 0; x < w; x++) if ((out[y][x] ?? 0) !== (out[y + 1][x] ?? 0)) n++;
			return n;
		};
		let best = 0, bestCost = Infinity;
		for (let y = 0; y < out.length - 1; y++) {
			const c = cost(y);
			if (c < bestCost || c === bestCost && Math.abs(y - mid) < Math.abs(best - mid)) {
				best = y;
				bestCost = c;
			}
		}
		out.splice(best, 1);
	}
	return out;
}
/**
* A hat fitted to the room above the face: rows 1 to the floor (row 0 is the
* grid's border, where nothing gets an outline), and 14 columns. Most heads
* leave four rows, and a hat drawn taller is squeezed to them rather than
* having the rows that don't fit cut off.
*/
const fitRoom = (c, s) => {
	const room = Math.max(1, c.floor);
	const tall = s.length > room ? squeeze(s, s.length - room) : s;
	const over = width(tall) - (GRID_SIZE - 2);
	return over > 0 ? elastic(tall, -over) : tall;
};
/** Seats a small hat on the crown, as `seat` does, once it fits the room (`fitRoom`). */
const sit = (c, s, dx = 0, sink = 1) => {
	const fitted$1 = fitRoom(c, s);
	const x = Math.max(1, Math.min(GRID_SIZE - 1 - width(fitted$1), c.centred(fitted$1) + dx));
	seat(c, fitted$1, x, sink);
};
/**
* Puts a hat on, fitted to the head the way a cap fits. A hat that rests
* across the head (a crown, a cap, a helmet: its bottom row 8 or more across)
* comes down to the forehead line and is stretched to the head's width there,
* a cell of brim either side, so it sits on a narrow head and a wide one
* alike. A small thing that stands on top (a gem, a flag) sits on the crown.
* Either is first fitted to the room above the face (`fitRoom`).
*/
function wear$1(c, s, dx, sink) {
	if (span(s[s.length - 1]) < 8) {
		sit(c, s, dx, sink);
		return;
	}
	const tall = fitRoom(c, s), last = tall.length - 1, bottom = span(tall[last]);
	const r = c.rows[c.floor] ?? c.rows[c.crown + 2] ?? c.rows[c.crown];
	const head$1 = r ? r.right - r.left + 1 : 10;
	const want = Math.max(6, Math.min(GRID_SIZE - 2, head$1 + 2));
	const fitted$1 = elastic(tall, Math.max(-4, Math.min(4, want - bottom, GRID_SIZE - 2 - width(tall))));
	const y = Math.max(1, c.floor - last);
	c.draw(fitted$1, Math.max(1, Math.min(GRID_SIZE - 1 - width(fitted$1), c.centred(fitted$1) + dx)), y);
	for (let yy = 0; yy < y; yy++) for (let x = 0; x < GRID_SIZE; x++) if (c.grid[yy][x] && c.grid[yy][x] < LAYER.skin) c.grid[yy][x] = 0;
}
const on = (rows, dx = 0, sink = 1) => {
	const s = stamp(rows);
	return (c) => wear$1(c, s, dx, sink);
};
const onPair = (rows, inset = 0) => {
	const left = stamp(rows);
	const right = mirror(left);
	return (c) => {
		const r = c.rows[c.shoulder()], l = fitRoom(c, left), rr = fitRoom(c, right);
		seat(c, l, r.left + inset);
		seat(c, rr, r.right - inset - width(rr) + 1);
	};
};
/**
* The biggest a buddy is drawn: its art, inside the outline compose gives it.
* It stands in front of the guy in his bottom-right corner (no head leaves
* room beside him; see `buddySpot` in ./compose), and this is as big as it
* gets there without coming up to his face.
*/
const BUDDY_BOX = {
	width: 6,
	height: 5
};
/**
* A buddy's drawing: at most `BUDDY_BOX`, with a pixel round it for its
* outline. `o` is an eye, in the guy's outline colour, so it stays dark
* whatever finish the buddy has.
*/
const pet = (name, rows) => {
	if (rows.length > BUDDY_BOX.height || rows.some((r) => r.length > BUDDY_BOX.width)) throw new Error(`Buddy "${name}" must fit in ${BUDDY_BOX.width} across and ${BUDDY_BOX.height} tall`);
	return stamp(rows);
};

//#endregion
//#region src/sets/amountle.ts
/**
* Amountle's machine: the jars, the jellybeans in today's jar and the
* winners club's crown. Every item is something in the game.
*/
const set$9 = {
	add: [
		{
			id: "amountle.bean",
			game: "amountle",
			slot: "skin",
			name: "Jellybean",
			eyes: 8,
			limb: 2,
			colors: [
				"#FF6F9C",
				"#D9466F",
				"#FFB3CB",
				"#FFFFFF",
				"#B02E55"
			],
			outline: "#6E1634",
			art: grid16("jellybean", [
				"................",
				"................",
				".....3331112....",
				"....344111112...",
				"...34411111112..",
				"...34111111112..",
				"...31111111112..",
				"...31111111112..",
				"...11111111112..",
				"...11111111112..",
				"....1111111112..",
				"....2111111112..",
				"...22111111152..",
				"....222222255...",
				"................",
				"................"
			])
		},
		{
			id: "amountle.todays-jar",
			game: "amountle",
			slot: "skin",
			name: "Today’s jar",
			eyes: 7,
			showpiece: true,
			signature: "holo",
			about: "One guess a day.",
			colors: [
				"#EAF7F8",
				"#BFE1E7",
				"#FFFFFF",
				"#FF5C8A",
				"#FFD447",
				"#3FD1C1",
				"#8C7CF0",
				"#FF8A3D",
				"#7DD87A"
			],
			outline: "#2F6870",
			art: grid16("todays jar", [
				"................",
				"................",
				"....22222222....",
				"....31111112....",
				"...3111111112...",
				"..311111111112..",
				".34411111111882.",
				".31511111111192.",
				".36511111111792.",
				".36177188155712.",
				".39914416619982.",
				".31551771441662.",
				"..881991551772..",
				"...2441661882...",
				"....22222222....",
				"................"
			])
		},
		{
			id: "amountle.lid",
			game: "amountle",
			slot: "hat",
			name: "Jar lid",
			colors: [
				"#FFD25A",
				"#C98A1A",
				"#FFF1B0",
				"#8A5A10"
			],
			draw: on([
				"..33333333..",
				".3111111112.",
				"141414141412",
				"242424242424"
			], 0, 2)
		},
		{
			id: "amountle.gem-pile",
			game: "amountle",
			slot: "hat",
			name: "Gumball globe",
			colors: [
				"#E8F7FB",
				"#B8DCE6",
				"#FF5C6A",
				"#FFD447",
				"#5FB4FF",
				"#7DD87A",
				"#FFFFFF",
				"#E5363D",
				"#A8202A"
			],
			draw: on([
				"..7111..",
				".735461.",
				"13645362",
				".988889."
			], 0, 2)
		},
		{
			id: "amountle.coin",
			game: "amountle",
			slot: "hat",
			name: "Wrapped sweet",
			colors: [
				"#FFC2DA",
				"#F07AA8",
				"#FFE3EE",
				"#E5363D",
				"#FFFFFF",
				"#B8202A"
			],
			draw: on([
				"1..454..1",
				"12.545.21",
				"1224542 21".replace(" ", ""),
				"...646..."
			], 0, 2)
		},
		{
			id: "amountle.play-coin",
			game: "amountle",
			slot: "buddy",
			name: "Lil jar",
			colors: [
				"#DDF2F6",
				"#A8D8E0",
				"#FF6F9C",
				"#FFD25A",
				"#FFD447",
				"#3FD1C1",
				"#8C7CF0",
				"#C98A1A"
			],
			art: pet("lil jar", [
				".4448.",
				"311112",
				"1o11o2",
				"357632",
				".7536."
			])
		},
		{
			id: "amountle.candy-corn",
			game: "amountle",
			slot: "buddy",
			name: "Candy corn",
			colors: [
				"#FFF6E0",
				"#E6D6B8",
				"#FF7A2E",
				"#D9561A",
				"#FFC23A",
				"#E09A12"
			],
			art: pet("candy corn", [
				"..12..",
				".1112.",
				"3o33o4",
				"333344",
				"555566"
			])
		},
		{
			id: "amountle.jar-glass",
			game: "amountle",
			slot: "frame",
			name: "Jar glass",
			colors: [
				"#D9F1EF",
				"#F4FCFB",
				"#C8E8E5"
			],
			fill: (x, y) => {
				const d = (x + y) % 16;
				return d === 4 || d === 5 ? 2 : d === 7 ? 3 : 1;
			}
		},
		{
			id: "amountle.shelf",
			game: "amountle",
			slot: "frame",
			name: "Shelf",
			colors: [
				"#FFF6E6",
				"#D9A877",
				"#B98552",
				"#FFD25A",
				"#3FD1C1"
			],
			fill: (x, y) => {
				const r = y % 8;
				if (r === 7) return 3;
				if (r === 6) return x % 4 === 1 ? (x + y) % 8 === 1 || (x + y) % 8 === 7 ? 4 : 5 : 2;
				return 1;
			}
		}
	],
	retire: [
		"amountle.piggy",
		"amountle.dragon",
		"amountle.cluster",
		"amountle.coin-stack",
		"amountle.gumball-dome",
		"amountle.sparkle",
		"amountle.coins",
		"amountle.piglet",
		"amountle.mimic"
	],
	redraw: {
		"amountle.crystal": {
			eyes: 9,
			limb: 2,
			art: grid16("crystal", [
				"................",
				"................",
				"....33333111....",
				"...3443311112...",
				"..344333111122..",
				".34333331111122.",
				".31111111111122.",
				".11111111111122.",
				".11111111111122.",
				".11111111111122.",
				".11111111111122.",
				".21111111111222.",
				"..211111111222..",
				"...2222222222...",
				"................",
				"................"
			])
		},
		"amountle.gemling": { art: pet("gemling", [
			".5311.",
			"331112",
			"1o11o2",
			".1124.",
			"..24.."
		]) },
		"amountle.gem": { draw: on([
			"....wwaA....",
			"...waaaaA...",
			"....aaAA....",
			".....aA.....",
			"312121212123"
		], 0, 2) },
		"amountle.jar": { art: grid16("jar", [
			"................",
			"................",
			"....44444444....",
			"....45454545....",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...6111111117...",
			"...7111111118...",
			"...6861186168...",
			"...7686768676...",
			"...6878687868...",
			"...5767576757...",
			"....55555555....",
			"................",
			"................"
		]) },
		"amountle.crown": {
			name: "Winners crown",
			colors: [
				"#FFD25A",
				"#D99A1E",
				"#FFF1B0",
				"#A8700E",
				"#E5484D",
				"#3FD1C1",
				"#FFFFFF",
				"#B8203A"
			],
			draw: on([
				"7....7....7",
				"18883138812",
				"13161516132",
				"22222222224"
			])
		},
		"amountle.beans": {
			colors: [
				"#FFF6E6",
				"#FF5C8A",
				"#FFD447",
				"#3FD1C1",
				"#8C7CF0",
				"#FF8A3D",
				"#7DD87A",
				"#FFFFFF"
			],
			fill: (x, y) => {
				const row = Math.floor(y / 5), ty = y % 5;
				const shift = row % 2 ? 4 : 0, col = Math.floor((x + shift) / 8), tx = (x + shift) % 8;
				const flavour = 2 + ((col * 3 + row * 5) % 6 + 6) % 6;
				if (ty === 1 && tx >= 2 && tx <= 4) return tx === 2 ? 8 : flavour;
				if (ty === 2 && tx >= 1 && tx <= 3) return flavour;
				return 1;
			}
		}
	}
};

//#endregion
//#region src/sets/halfsies.ts
/**
* Halfsies's machine: the knife, things cut down the middle, the stamp a
* perfect cut gets, the weekend's thirds and the Sunday kebab.
*/
const set$8 = {
	add: [
		{
			id: "halfsies.burger",
			game: "halfsies",
			slot: "skin",
			name: "Burger half",
			eyes: 7,
			colors: [
				"#EFA352",
				"#C47A30",
				"#FFC98A",
				"#FFF6DC",
				"#7DC24A",
				"#FFC93A",
				"#8A4A26",
				"#5A2E16",
				"#FBE3B8"
			],
			outline: "#4A2410",
			art: grid16("burger half", [
				"................",
				"................",
				"......33333339..",
				"...33411411119..",
				"..311114111119..",
				".3111111111119..",
				".1111111111119..",
				".2111111111119..",
				".2222222222229..",
				".5555555555555..",
				".6666666666666..",
				".7777777777777..",
				".8888888888888..",
				"..111111111119..",
				"...22222222222..",
				"................"
			])
		},
		{
			id: "halfsies.trophy",
			game: "halfsies",
			slot: "skin",
			name: "Trophy half",
			eyes: 7,
			colors: [
				"#F5C33B",
				"#C8901E",
				"#FFE58A",
				"#8A5A10",
				"#F4F4F2",
				"#C9CFDA",
				"#FFFFFF",
				"#E3E7EE",
				"#FFF0B8"
			],
			outline: "#6A4208",
			art: grid16("trophy half", [
				"................",
				"................",
				"...33339........",
				".111311993333...",
				".14131199111111.",
				".14131199111141.",
				".22131199111141.",
				"...231199111222.",
				"...2211991112...",
				"....221991122...",
				".....2299122....",
				"......29922.....",
				"....555892......",
				"...666688555....",
				"........86666...",
				"................"
			])
		},
		{
			id: "halfsies.perfect-split",
			game: "halfsies",
			slot: "skin",
			name: "Banana split",
			eyes: 9,
			limb: 6,
			showpiece: true,
			signature: "shimmer",
			about: "A banana cut in half, to the gram.",
			colors: [
				"#FFA3C0",
				"#E07098",
				"#FFD2E0",
				"#6A321A",
				"#E5363D",
				"#FFE066",
				"#E0B030",
				"#DDEBF5",
				"#9FB6CC"
			],
			outline: "#5A2030",
			art: grid16("banana split", [
				"................",
				"........4.......",
				".......55.......",
				".....445544.....",
				"....44444444....",
				"...4444444444...",
				"..344134411442..",
				"..341111111112..",
				"..311111111112..",
				"..311111111112..",
				".66311111111266.",
				".67631111112676.",
				"..7768888886677.",
				"...8888888889...",
				"....99999999....",
				"................"
			])
		},
		{
			id: "halfsies.knife",
			game: "halfsies",
			slot: "hat",
			name: "Chef’s hat",
			free: true,
			colors: [
				"#FFFFFF",
				"#D6DDE8",
				"#F4F7FB",
				"#E9EEF5",
				"#B9C3D3"
			],
			draw: on([
				".112.1112.12",
				"111111111112",
				".1111111112.",
				".4545454545."
			])
		},
		{
			id: "halfsies.star",
			game: "halfsies",
			slot: "hat",
			name: "Gold star",
			colors: [
				"#FFD25A",
				"#D99A1E",
				"#FFF1B0"
			],
			draw: on([
				"...3...",
				"..331..",
				"3331112",
				".33112.",
				".31.12.",
				".1...2."
			], 0, 2)
		},
		{
			id: "halfsies.stamp",
			game: "halfsies",
			slot: "hat",
			name: "Split beanie",
			colors: [
				"#F0574E",
				"#B83232",
				"#FF8E80",
				"#3FBFAE",
				"#22867A",
				"#8EE6DA",
				"#FFFFFF",
				"#D6DDE8"
			],
			draw: on([
				".....78.....",
				"...331445...",
				".3311144445.",
				"121212454545"
			])
		},
		{
			id: "halfsies.thirds",
			game: "halfsies",
			slot: "hat",
			name: "Thirds cake",
			colors: [
				"#F2B95A",
				"#C98A34",
				"#FFF4DC",
				"#F0DDB8",
				"#E5484D",
				"#5FB4FF",
				"#FFD447",
				"#FF8A3D",
				"#FF8FB1"
			],
			draw: on([
				"..7...7...7..",
				"..6...9...6..",
				".33533353335.",
				".11411141114."
			])
		},
		{
			id: "halfsies.kebab",
			game: "halfsies",
			slot: "hat",
			name: "Pancake stack",
			colors: [
				"#E8A04E",
				"#B87028",
				"#FBD08A",
				"#FFF1A0",
				"#F2D25A",
				"#8A3E10",
				"#C8702A"
			],
			draw: on([
				"....4455....",
				".3667666763.",
				".2262222622.",
				".1111111111."
			])
		},
		{
			id: "halfsies.balance",
			game: "halfsies",
			slot: "buddy",
			name: "Lil acorn",
			colors: [
				"#E0A060",
				"#A86A30",
				"#F4C890",
				"#7A4A26",
				"#9A6A3A",
				"#5A3418"
			],
			art: pet("lil acorn", [
				"...4..",
				".5555.",
				"555556",
				"3o11o2",
				".1122."
			])
		},
		{
			id: "halfsies.cake",
			game: "halfsies",
			slot: "buddy",
			name: "Cake slice",
			colors: [
				"#F5C86A",
				"#C9953A",
				"#FFFFFF",
				"#E8D6C4",
				"#E5484D",
				"#D9283A",
				"#5CB85C"
			],
			art: pet("cake slice", [
				"....76",
				"..3334",
				".1o1o2",
				"555556",
				"111122"
			])
		},
		{
			id: "halfsies.cut-line",
			game: "halfsies",
			slot: "frame",
			name: "Dashed cut line",
			colors: ["#F5D76E", "#E2BE4E"],
			fill: (x, y) => (x - y + 32) % 8 === 0 && x % 4 < 2 ? 2 : 1
		}
	],
	retire: [
		"halfsies.pot",
		"halfsies.kitchen-scale",
		"halfsies.cyborg",
		"halfsies.bowl",
		"halfsies.scale",
		"halfsies.helmet",
		"halfsies.sandwich",
		"halfsies.half-moon",
		"halfsies.gingham",
		"halfsies.pea",
		"halfsies.berry"
	],
	redraw: {
		"halfsies.split": {
			colors: [
				"#FFC9B0",
				"#A9E3DC",
				"#FFFFFF",
				"#FFE2D4",
				"#C9F0EB"
			],
			fill: (x, y) => {
				const tx = x % 16, ty = y % 16;
				if (tx === 8) return ty % 4 < 2 ? 3 : 2;
				if (tx < 8) return tx % 4 === 1 && ty % 4 === 1 || tx % 4 === 3 && ty % 4 === 3 ? 4 : 1;
				return ty % 4 === 0 ? 5 : 2;
			}
		},
		"halfsies.lemon": {
			name: "Peach",
			eyes: 9,
			limb: 2,
			colors: [
				"#FFB07A",
				"#F07A5A",
				"#FFD6B0",
				"#FF8A8A",
				"#6CC24A",
				"#3E8E2E",
				"#7A4A26",
				"#E8906A"
			],
			outline: "#7A2E1C",
			art: grid16("peach", [
				"................",
				"........755.....",
				".......75566....",
				"...3331.11112...",
				"..3333381111112.",
				".33333811111112.",
				".33331111111112.",
				".31111111111112.",
				".11111111111112.",
				".11111111111122.",
				".11111111111122.",
				"..111111111122..",
				"..211111111222..",
				"...2211111222...",
				".....222222.....",
				"................"
			])
		},
		"halfsies.yolk": {
			name: "Half-shell chick",
			colors: [
				"#FFD84A",
				"#E0A820",
				"#FFF0A0",
				"#FF8A2E",
				"#FFFFFF",
				"#C9D1DC"
			],
			art: pet("half-shell chick", [
				".3311.",
				"1o4o12",
				"565656",
				"555556",
				".5566."
			])
		}
	}
};

//#endregion
//#region src/sets/stackdle.ts
/**
* Stackdle's machine: its real pieces in their own colours, and the climb
* from the valley up past the clouds into space.
*/
const set$7 = {
	add: [
		{
			id: "stackdle.wedge",
			game: "stackdle",
			slot: "skin",
			name: "Wedge",
			eyes: 11,
			colors: [
				"#5FE0B4",
				"#34A985",
				"#A8F7DC",
				"#24785E"
			],
			outline: "#17533F",
			art: grid16("wedge", [
				"................",
				"................",
				"...3............",
				"..331...........",
				".33111..........",
				".311111.........",
				".3111111........",
				".31111111.......",
				".311111111......",
				".31111111112....",
				".311111111112...",
				".3111111111112..",
				".31111111111124.",
				".11111111111124.",
				".22222222222244.",
				"................"
			])
		},
		{
			id: "stackdle.keystone",
			game: "stackdle",
			slot: "skin",
			name: "Keystone",
			eyes: 8,
			colors: [
				"#F88F7B",
				"#D9705C",
				"#FFBFAF",
				"#B85D4A"
			],
			outline: "#6E2A1C",
			art: grid16("keystone", [
				"................",
				"................",
				"................",
				"....33333333....",
				"....31111114....",
				"...3111111114...",
				"...3111111114...",
				"...3111111114...",
				"..311111111114..",
				"..311111111114..",
				"..311111111114..",
				".31111111111114.",
				".11111111111114.",
				".22222222222224.",
				"................",
				"................"
			])
		},
		{
			id: "stackdle.arch-piece",
			game: "stackdle",
			slot: "skin",
			name: "Arch",
			eyes: 7,
			colors: [
				"#F6C768",
				"#DBAD4A",
				"#FFE3A0",
				"#9E7E2D"
			],
			outline: "#5E4A12",
			art: grid16("arch", [
				"................",
				"................",
				".....333333.....",
				"...3311111122...",
				"..311111111112..",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".31111#..#11112.",
				".3111.#..#.1112.",
				".2224.s..s.4224.",
				"................",
				"................"
			])
		},
		{
			id: "stackdle.big-l",
			game: "stackdle",
			slot: "skin",
			name: "Big L",
			eyes: 10,
			colors: [
				"#3A82FF",
				"#1F5FD6",
				"#8DB8FF",
				"#123F9C"
			],
			outline: "#0B2A6E",
			art: grid16("big l", [
				"................",
				"................",
				".3333332........",
				".3111112........",
				".3111112........",
				".3111112........",
				".3111112........",
				".3111112........",
				".31111113333332.",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".31111111111112.",
				".22222222222224.",
				"................",
				"................"
			])
		},
		{
			id: "stackdle.sky-tower",
			game: "stackdle",
			slot: "skin",
			name: "Astronaut",
			eyes: 7,
			limb: 1,
			showpiece: true,
			signature: "starlight",
			about: "Stacked past the clouds.",
			colors: [
				"#F4F6FA",
				"#B9C3D6",
				"#FFFFFF",
				"#7E8AA3",
				"#FF8A3D",
				"#2F7BFF",
				"#E5484D",
				"#DDF2FF",
				"#F5C33B"
			],
			outline: "#27304A",
			art: grid16("astronaut", [
				"................",
				"....33111122....",
				"...318#####12...",
				"..318#######12..",
				".318#########12.",
				".31###########2.",
				".31###########2.",
				".31###########2.",
				".31s#########s2.",
				"..31ss#####ss2..",
				"..444444444444..",
				"..315116711122..",
				"..311111111122..",
				"..311111111122..",
				"...2222..2222...",
				"................"
			])
		},
		{
			id: "stackdle.little-block",
			game: "stackdle",
			slot: "hat",
			name: "Little block",
			free: true,
			colors: [
				"#5E83EF",
				"#3F5FC0",
				"#9DB6FF",
				"#FFD447",
				"#D9A21E",
				"#2E4796"
			],
			draw: on([
				".333332",
				"1114126",
				"1444526",
				"1154126",
				"2222226"
			], 0, 2)
		},
		{
			id: "stackdle.crescent",
			game: "stackdle",
			slot: "hat",
			name: "Battlement",
			colors: [
				"#E8B448",
				"#B07A1E",
				"#FFDB8A",
				"#7A5212"
			],
			draw: on([
				"33.33.33.33",
				"13.13.13.12",
				"11311111312",
				"22222222222"
			])
		},
		{
			id: "stackdle.bolt",
			game: "stackdle",
			slot: "hat",
			name: "Hard hat",
			colors: [
				"#FFC93A",
				"#D9961A",
				"#FFE58A",
				"#E8AE20",
				"#A86A0A"
			],
			draw: on([
				"....3443....",
				"..33114111..",
				".3111141111.",
				"222222222222"
			])
		},
		{
			id: "stackdle.clouds",
			game: "stackdle",
			slot: "hat",
			name: "Cloud nine",
			colors: [
				"#FFFFFF",
				"#C9DAF0",
				"#F2F7FD",
				"#FFD447",
				"#FFB03B",
				"#9DB6DA"
			],
			draw: on([
				"..33..454.",
				".311331454",
				"3111111112",
				"..622226.."
			])
		},
		{
			id: "stackdle.stairs",
			game: "stackdle",
			slot: "buddy",
			name: "Lil yeti",
			colors: [
				"#F4F8FD",
				"#B9C9DE",
				"#FFFFFF",
				"#8EC5F0",
				"#5C93C8",
				"#F2D9A8"
			],
			art: pet("lil yeti", [
				"6.33.6",
				"311112",
				"1o44o2",
				"144552",
				".1..2."
			])
		},
		{
			id: "stackdle.penguin",
			game: "stackdle",
			slot: "buddy",
			name: "Lil star",
			colors: [
				"#FFD447",
				"#D9A21E",
				"#FFF1A8",
				"#FF9AAA",
				"#B07A10"
			],
			art: pet("lil star", [
				"..31..",
				"331112",
				".o11o.",
				".1112.",
				"12..12"
			])
		},
		{
			id: "stackdle.valley",
			game: "stackdle",
			slot: "frame",
			name: "Valley sky",
			colors: [
				"#DBE8F8",
				"#CDE1F7",
				"#BCD7F6",
				"#A9CDF5",
				"#FFFFFF",
				"#EEF4FC"
			],
			fill: (x, y) => {
				const tx = x % 16, ty = y % 16;
				if (ty === 2 && tx >= 2 && tx <= 3) return 5;
				if (ty === 3 && tx >= 1 && tx <= 5) return tx === 5 ? 6 : 5;
				return Math.floor(ty / 4) + 1;
			}
		},
		{
			id: "stackdle.ruler",
			game: "stackdle",
			slot: "frame",
			name: "Height ruler",
			colors: [
				"#EEF3FA",
				"#FFD447",
				"#E0A81E",
				"#2B2F3A",
				"#DDE6F2"
			],
			fill: (x, y) => {
				const tx = x % 16, ty = y % 16;
				if (tx <= 2) {
					if (ty % 8 === 0 && tx <= 2) return 4;
					if (ty % 2 === 0 && tx === 0) return 4;
					return tx === 2 ? 3 : 2;
				}
				return ty % 8 === 0 ? 5 : 1;
			}
		},
		{
			id: "stackdle.space",
			game: "stackdle",
			slot: "frame",
			name: "Space",
			colors: [
				"#0A1531",
				"#FFF6C8",
				"#8FA3D9"
			],
			fill: (x, y) => {
				const tx = x % 16, ty = y % 16;
				if (tx === 2 && ty === 2) return 2;
				if (tx === 14 && ty === 13) return 3;
				return 1;
			}
		}
	],
	retire: [
		"stackdle.block",
		"stackdle.triangle",
		"stackdle.brick",
		"stackdle.stack",
		"stackdle.robot",
		"stackdle.cube",
		"stackdle.ring",
		"stackdle.arch",
		"stackdle.hardhat",
		"stackdle.toybox",
		"stackdle.bricks",
		"stackdle.blueprint",
		"stackdle.pyramid",
		"stackdle.brickling"
	],
	redraw: {
		"stackdle.tower": { draw: on([
			".9556.",
			".5566.",
			"711834",
			"122344"
		], 0, 2) },
		"stackdle.cubelet": {
			name: "Cubelet",
			colors: [
				"#FFB03B",
				"#D97A12",
				"#FFE0A0",
				"#A85A0A",
				"#FFF4D6"
			],
			art: pet("cubelet", [
				".33334",
				"311124",
				"1o1o24",
				"111124",
				".4..4."
			])
		},
		"stackdle.wobble": {
			name: "Wobble",
			colors: [
				"#FFE7A8",
				"#E8C070",
				"#FFF6D6",
				"#B8652A",
				"#E8954A",
				"#E6ECF2",
				"#B8C2CE"
			],
			art: pet("wobble", [
				".5445.",
				"354442",
				"1o11o2",
				"311112",
				"676676"
			])
		}
	}
};

//#endregion
//#region src/sets/flipsies.ts
/** A hat stood on the crown as drawn, however wide, rather than pulled down round the head like a cap. */
const perch$3 = (rows, sink = 1) => {
	const s = stamp(rows);
	return (c) => sit(c, s, 0, sink);
};
/**
* Flipsies's machine: the things you flip (a water bottle, a pencil, buttered
* toast, a rubber duck, the moai) and the kitchen and living room they land in.
*/
const set$6 = {
	add: [
		{
			id: "flipsies.rubber-duck",
			game: "flipsies",
			slot: "skin",
			name: "Duck onesie",
			eyes: 9,
			limb: 4,
			colors: [
				"#FFD84A",
				"#E0A820",
				"#FFF1A8",
				"#FF8A1A",
				"#C9520C",
				"#2B2F38"
			],
			outline: "#7A4A06",
			art: grid16("duck onesie", [
				"................",
				".......31.......",
				".....331112.....",
				"....31111112....",
				"...3161111612...",
				"..311144441112..",
				"..311455554112..",
				"..31h#######12..",
				"..31########12..",
				"..31########12..",
				"..31#######s12..",
				"..311ssssss112..",
				"...3111111112...",
				"....22222222....",
				"................",
				"................"
			])
		},
		{
			id: "flipsies.die",
			game: "flipsies",
			slot: "skin",
			name: "Buttered toast",
			eyes: 9,
			limb: 4,
			colors: [
				"#F6D9A0",
				"#E3B97A",
				"#FFF0CC",
				"#B9732F",
				"#8E5420",
				"#D99A4A",
				"#FFE36A",
				"#F2C430"
			],
			outline: "#5A3210",
			art: grid16("buttered toast", [
				"................",
				"....66444444....",
				"...6433311114...",
				"..643777111145..",
				"..641788111145..",
				"..641h#####145..",
				"..64h#######45..",
				"..64########45..",
				"..64########45..",
				"..64########45..",
				"..64#######s45..",
				"..641ssssss245..",
				"..642222222245..",
				"...5555555555...",
				"................",
				"................"
			])
		},
		{
			id: "flipsies.moai",
			game: "flipsies",
			slot: "skin",
			name: "Moai",
			eyes: 9,
			limb: 2,
			showpiece: true,
			signature: "lava",
			colors: [
				"#ADA195",
				"#857A6E",
				"#CDC3B6",
				"#5E544B",
				"#C0503A",
				"#8E3424",
				"#E07A5A",
				"#7FA35A"
			],
			outline: "#3A322B",
			art: grid16("moai", [
				"................",
				".....775556.....",
				".....755556.....",
				"....31111112....",
				"...3111111112...",
				"...3444444442...",
				"..231111111122..",
				"..231111111122..",
				"..231111111122..",
				"..231111111122..",
				"...3111111112...",
				"...3111111112...",
				"...8111111128...",
				"....88222288....",
				"................",
				"................"
			])
		},
		{
			id: "flipsies.pancake-hat",
			game: "flipsies",
			slot: "hat",
			name: "Short stack",
			colors: [
				"#F7C873",
				"#C98236",
				"#FDE3A7",
				"#9A4416",
				"#FFF27A"
			],
			draw: perch$3([
				"...5555...",
				".33444333.",
				"1114111412",
				".22242222.",
				"1111111112"
			])
		},
		{
			id: "flipsies.toast",
			game: "flipsies",
			slot: "hat",
			name: "Fried egg",
			colors: [
				"#FFFFFF",
				"#E3E3EA",
				"#FFD23A",
				"#F2A20E",
				"#FFF3A0",
				"#E0B070"
			],
			draw: on([
				".....533.....",
				"..1115334111.",
				"1111114441112",
				"6222222222226"
			], 0, 1)
		},
		{
			id: "flipsies.popcorn",
			game: "flipsies",
			slot: "hat",
			name: "Popcorn bucket",
			colors: [
				"#E5484D",
				"#B83236",
				"#FFF8EE",
				"#E3D9C8",
				"#FFFFFF",
				"#F3DE96",
				"#EADFC0"
			],
			draw: on([
				"...5565565...",
				".55655655655.",
				"3131313131312",
				".13131313132."
			])
		},
		{
			id: "flipsies.lampshade",
			game: "flipsies",
			slot: "hat",
			name: "Lampshade",
			colors: [
				"#F2703F",
				"#C24E26",
				"#FFA27A",
				"#6E6E78",
				"#FFF3B0"
			],
			draw: on([
				"....4....",
				"..33112..",
				".3311112.",
				"311111122",
				"...555..."
			], 0, 1)
		},
		{
			id: "flipsies.ring-mat",
			game: "flipsies",
			slot: "frame",
			name: "Ring mat",
			colors: ["#E6F1FA", "#D3E5F4"],
			fill: (x, y) => Math.round(Math.hypot(x - 7.5, y - 9)) % 4 === 0 ? 2 : 1
		},
		{
			id: "flipsies.cork",
			game: "flipsies",
			slot: "frame",
			name: "Cork coaster",
			colors: [
				"#DDB98E",
				"#C79C6C",
				"#ECD2AE"
			],
			fill: (x, y) => (x * 7 + y * 13) % 11 === 0 ? 2 : (x * 5 + y * 3) % 13 === 0 ? 3 : 1
		},
		{
			id: "flipsies.books",
			game: "flipsies",
			slot: "frame",
			name: "Book spines",
			colors: [
				"#B6C6DF",
				"#E0B8B1",
				"#BCD4B4",
				"#ECDFB4",
				"#A1B4D2",
				"#D3A49C",
				"#A6C59E",
				"#DECE9B"
			],
			fill: (x, y) => {
				const spines = [
					3,
					2,
					3,
					3,
					2,
					3
				];
				let left = 0, i = 0;
				while (left + spines[i % spines.length] <= x) left += spines[i++ % spines.length];
				const book = i % 4;
				return y === 2 || y === 13 ? book + 5 : book + 1;
			}
		},
		{
			id: "flipsies.goldfish",
			game: "flipsies",
			slot: "buddy",
			name: "Goldfish",
			colors: [
				"#FF8A2B",
				"#D45F10",
				"#FFC27A",
				"#FFFFFF"
			],
			art: pet("goldfish", [
				".33..3",
				"3111.3",
				"1o1123",
				"311123",
				"..2..."
			])
		},
		{
			id: "flipsies.ketchup",
			game: "flipsies",
			slot: "buddy",
			name: "Ketchup",
			colors: [
				"#E5383D",
				"#A8202A",
				"#FF8A8A",
				"#FFFFFF",
				"#C9D1DC",
				"#FFE36A"
			],
			art: pet("ketchup", [
				"..45..",
				".3112.",
				"3o11o2",
				"315512",
				".2222."
			])
		},
		{
			id: "flipsies.mug",
			game: "flipsies",
			slot: "buddy",
			name: "Rubber duckling",
			colors: [
				"#FFD84A",
				"#E0A820",
				"#FFF1A8",
				"#FF8A1A"
			],
			art: pet("rubber duckling", [
				".13...",
				"4o1..1",
				".11111",
				"311112",
				".2222."
			])
		},
		{
			id: "flipsies.toaster",
			game: "flipsies",
			slot: "buddy",
			name: "Toaster",
			colors: [
				"#D3DAE4",
				"#8A95A6",
				"#F4F7FA",
				"#F5C77E",
				"#2B2F38",
				"#C98A40"
			],
			art: pet("toaster", [
				".44.44",
				".46.46",
				"311112",
				"3o11o2",
				"222222"
			])
		}
	],
	retire: [
		"flipsies.bullseye",
		"flipsies.pancakes",
		"flipsies.shark",
		"flipsies.landed",
		"flipsies.beret",
		"flipsies.cup",
		"flipsies.fin",
		"flipsies.target",
		"flipsies.waves",
		"flipsies.tiles",
		"flipsies.droplet",
		"flipsies.shortstack",
		"flipsies.duck",
		"flipsies.whale"
	],
	redraw: {
		"flipsies.cap": {
			name: "Bucket hat",
			draw: on([
				"...xaaaaaA...",
				"..xaaaaaaaA..",
				"..AAAAAAAAA..",
				"xaaaaaaaaaaaA"
			], 0, 2)
		},
		"flipsies.bottle": {
			limb: 4,
			colors: [
				"#D6EEFB",
				"#A3D0EC",
				"#FFFFFF",
				"#2F6FD6",
				"#1D4E9E",
				"#5FB2EA",
				"#3C8DD0",
				"#8FD0F5",
				"#6FA0E8"
			],
			outline: "#2A5A8C",
			art: grid16("water bottle", [
				"................",
				".......45.......",
				".....944445.....",
				".....454545.....",
				".....311112.....",
				"...3311111122...",
				"..331111111122..",
				"..311111111112..",
				"..311111111112..",
				"..311111111112..",
				"..311111111112..",
				"..888888888887..",
				"...6666666677...",
				"....66666677....",
				"................",
				"................"
			])
		},
		"flipsies.can": {
			name: "Pencil",
			eyes: 8,
			limb: 1,
			colors: [
				"#FFD23F",
				"#E0A620",
				"#FFEC8A",
				"#F2C99A",
				"#C99A66",
				"#3A3A44",
				"#E6EAF0",
				"#B9C2CF",
				"#FF8FA8"
			],
			outline: "#5A3A10",
			art: grid16("pencil", [
				"................",
				".......66.......",
				"......4665......",
				".....444455.....",
				"....44444455....",
				"..314141414112..",
				"..33h#######22..",
				"..33########22..",
				"..33########22..",
				"..33#######s22..",
				"..331ssssss122..",
				"..787878787878..",
				"...9999999999...",
				"....99999999....",
				"................",
				"................"
			])
		}
	}
};

//#endregion
//#region src/sets/puttsies.ts
/** A hat that lies on top of the head as drawn, rather than pulled down round it like a cap. */
const perch$2 = (rows, sink = 1) => {
	const s = stamp(rows);
	return (c) => sit(c, s, 0, sink);
};
/**
* Puttsies's machine: the golfer and the balls you earn (the golf ball, the
* eight ball), and the household holes you putt through (the quilt, the toy
* train, the magic trick, the sleeping cat, the snail shell, the sprinkles).
*/
const set$5 = {
	add: [
		{
			id: "puttsies.eight-ball",
			game: "puttsies",
			slot: "skin",
			name: "Eight ball hoodie",
			eyes: 9,
			limb: 3,
			colors: [
				"#F7F4EA",
				"#D9D3C4",
				"#2A2D36",
				"#15171C",
				"#4C5262"
			],
			outline: "#0E0F13",
			art: grid16("eight ball hoodie", [
				"................",
				".....533333.....",
				"....53311333....",
				"...5331441333...",
				"..533314413334..",
				"..533331133334..",
				"..533h#####334..",
				"..53h#######34..",
				"..53########34..",
				"..53########34..",
				"..53#######s34..",
				"..533ssssss334..",
				"...5333333334...",
				"....44444444....",
				"................",
				"................"
			])
		},
		{
			id: "puttsies.train",
			game: "puttsies",
			slot: "skin",
			name: "Engine driver",
			eyes: 8,
			limb: 5,
			showpiece: true,
			signature: "embers",
			about: "Drives the Sunday boss.",
			colors: [
				"#E8EEF8",
				"#3C5FA8",
				"#28407A",
				"#E5484D",
				"#4C7BD0",
				"#2F5AA6"
			],
			outline: "#2A1A30",
			art: grid16("engine driver", [
				"................",
				".....212121.....",
				"....21212121....",
				"...2121212121...",
				"..333333333333..",
				"..h##########s..",
				"..h##########s..",
				"..###########s..",
				"..###########s..",
				"..###########s..",
				"..##########ss..",
				"..554444444455..",
				"...5515555155...",
				"....66666666....",
				"................",
				"................"
			])
		},
		{
			id: "puttsies.top-hat",
			game: "puttsies",
			slot: "hat",
			name: "Magic top hat",
			colors: [
				"#2B2F38",
				"#1A1D24",
				"#4A5060",
				"#C9364A",
				"#FFFFFF",
				"#FFB3C7"
			],
			draw: perch$2([
				"..56..56..",
				"..311112..",
				"..311112..",
				"..444444..",
				"3111111112"
			], 2)
		},
		{
			id: "puttsies.cat",
			game: "puttsies",
			slot: "hat",
			name: "Sleeping cat",
			colors: [
				"#E08A3C",
				"#B5612A",
				"#F2B07A",
				"#9C4318",
				"#FFF0DC",
				"#3A2A22",
				"#E9838A"
			],
			draw: perch$2([
				".1..1..3331.",
				"11111.314412",
				"161611331412",
				"557511111112"
			], 1)
		},
		{
			id: "puttsies.snail",
			game: "puttsies",
			slot: "hat",
			name: "Snail",
			colors: [
				"#FF8A6E",
				"#D9604A",
				"#FFC2B0",
				"#A8402F",
				"#E8D2B0",
				"#C2A882",
				"#2B2F38"
			],
			draw: perch$2([
				"..3311...7.7",
				".314412..5.5",
				".143142.555.",
				"655555555556"
			], 1)
		},
		{
			id: "puttsies.picnic",
			game: "puttsies",
			slot: "frame",
			name: "Picnic check",
			colors: [
				"#FFF7F2",
				"#F5BDB7",
				"#E58E86"
			],
			fill: (x, y) => Math.floor(x / 2) % 2 + Math.floor(y / 2) % 2 + 1
		},
		{
			id: "puttsies.dimples",
			game: "puttsies",
			slot: "frame",
			name: "Dimples",
			colors: [
				"#F6F1E6",
				"#D8CFBD",
				"#FFFFFF"
			],
			fill: (x, y) => {
				const dimple = (dx, dy) => (y - dy) % 4 === 1 && (x - dx + ((y - dy) % 8 === 1 ? 0 : 2)) % 4 === 1;
				return dimple(0, 0) ? 2 : dimple(1, 1) ? 3 : 1;
			}
		},
		{
			id: "puttsies.cup-flag",
			game: "puttsies",
			slot: "buddy",
			name: "Gopher",
			colors: [
				"#B07A4A",
				"#7A4E2A",
				"#F2D4A8",
				"#FFFFFF",
				"#2A2420",
				"#7ED957",
				"#4CAF50",
				"#E9838A"
			],
			art: pet("gopher", [
				".1111.",
				"1o11o1",
				"138831",
				"614416",
				"755557"
			])
		},
		{
			id: "puttsies.donut",
			game: "puttsies",
			slot: "buddy",
			name: "Sprinkles",
			colors: [
				"#FF9EC4",
				"#E06A98",
				"#FFE066",
				"#6FC3FF",
				"#FFFFFF",
				"#E3A35E",
				"#B87634"
			],
			art: pet("sprinkles", [
				".1341.",
				"151131",
				"1o11o2",
				"666667",
				".6777."
			])
		},
		{
			id: "puttsies.windup",
			game: "puttsies",
			slot: "buddy",
			name: "Wind-up mouse",
			colors: [
				"#B9C0CE",
				"#7E879A",
				"#E3E7EE",
				"#FF9EBB",
				"#E0B040",
				"#9A7420"
			],
			art: pet("wind-up mouse", [
				".33.55",
				"3443.6",
				"41o116",
				".11112",
				"2.2..2"
			])
		},
		{
			id: "puttsies.blocks",
			game: "puttsies",
			slot: "buddy",
			name: "Toy blocks",
			colors: [
				"#E5484D",
				"#B83236",
				"#4C8DF6",
				"#2F64C8",
				"#FFD447",
				"#D9A21E"
			],
			art: pet("toy blocks", [
				"..556.",
				"..556.",
				"112334",
				"112334",
				"222444"
			])
		}
	],
	retire: [
		"puttsies.bag",
		"puttsies.ufo",
		"puttsies.flag",
		"puttsies.tam",
		"puttsies.argyle",
		"puttsies.fairway",
		"puttsies.green",
		"puttsies.tee",
		"puttsies.gopher",
		"puttsies.frog",
		"puttsies.turtle"
	],
	redraw: {
		"puttsies.ball": {
			eyes: 9,
			limb: 2,
			colors: [
				"#FAFAF6",
				"#D3D6DE",
				"#FFFFFF",
				"#D6DAE2",
				"#B8BDC9"
			],
			outline: "#4A4E5A",
			art: grid16("golf ball", [
				"................",
				"................",
				".....331112.....",
				"....33141412....",
				"...3314114142...",
				"..314141414142..",
				"..341111111142..",
				"..311111111112..",
				"..341111111142..",
				"..311111111112..",
				"..341111111142..",
				"..314111111422..",
				"...2414141422...",
				"....22222222....",
				"................",
				"................"
			])
		},
		"puttsies.windmill": {
			name: "Golfer",
			eyes: 8,
			limb: 5,
			colors: [
				"#F2E6C8",
				"#9C8A6E",
				"#6E5E48",
				"#C2B092",
				"#3F8F5A"
			],
			outline: "#2E2438",
			art: grid16("golfer", [
				"................",
				"................",
				"....44222223....",
				"...4242424233...",
				"..3333333333333.",
				"..h##########s..",
				"..h##########s..",
				"..###########s..",
				"..###########s..",
				"..###########s..",
				"..##########ss..",
				"..515151515151..",
				"...5151515151...",
				"....51515151....",
				"................",
				"................"
			])
		},
		"puttsies.visor": { draw: on([
			"....xaaA......",
			"..xaaawaaA....",
			".xaaaaaaaaA...",
			"xaaaaaaaaaAAAA"
		], 0, 2) },
		"puttsies.crown": {
			colors: [
				"#FFD25A",
				"#D99A1E",
				"#FFF1A8",
				"#FFFFFF",
				"#C9CFDA",
				"#E5484D",
				"#3FB56A"
			],
			draw: on([
				".3...44...3.",
				".13.3455.12.",
				"311111111112",
				"216161716162"
			], 0, 2)
		},
		"puttsies.pillow": {
			colors: [
				"#F7B7B0",
				"#B9E3A8",
				"#B3D4F5",
				"#FBE3A1",
				"#E59A92",
				"#94C985",
				"#8DB8E6",
				"#E9C979"
			],
			outline: "#6E3E3A",
			art: grid16("quilt pillow", [
				"................",
				"................",
				"..5.11112222.6..",
				"...1111122226...",
				"..111111222226..",
				"..111111222226..",
				"..111111222226..",
				"..111111222226..",
				"..333333444448..",
				"..333333444448..",
				"..333333444448..",
				"..333333444448..",
				"...7333344448...",
				"..7.77778888.8..",
				"................",
				"................"
			])
		}
	}
};

//#endregion
//#region src/sets/weighsies.ts
/** A hat stood on the crown as drawn, rather than pulled down round the head like a cap. */
const perch$1 = (rows, sink = 1) => {
	const s = stamp(rows);
	return (c) => sit(c, s, 0, sink);
};
/**
* Weighsies's machine: the animals and the heavy things the scale weighs (a
* panda, a penguin, a capybara, a T. rex, the pharaohs' pyramid, the Statue of
* Liberty), and a kettlebell.
*/
const set$4 = {
	add: [
		{
			id: "weighsies.gold-bar",
			game: "weighsies",
			slot: "skin",
			name: "Panda onesie",
			eyes: 9,
			limb: 4,
			colors: [
				"#F7F6F2",
				"#C8CAD2",
				"#FFFFFF",
				"#2B2D35",
				"#4B4F5C"
			],
			outline: "#1A1B22",
			art: grid16("panda onesie", [
				"................",
				"................",
				"..545......545..",
				"..444311112444..",
				"..311111111112..",
				"..311111111112..",
				"..311h#####112..",
				"..31h#######12..",
				"..31########12..",
				"..31########12..",
				"..31#######s12..",
				"..311ssssss112..",
				"...4111111114...",
				"....44222244....",
				"................",
				"................"
			])
		},
		{
			id: "weighsies.basketball",
			game: "weighsies",
			slot: "skin",
			name: "Penguin onesie",
			eyes: 9,
			limb: 3,
			colors: [
				"#F4F6FA",
				"#C9D0DE",
				"#2B3040",
				"#1A1E2A",
				"#4C556E",
				"#FF9A2E",
				"#FFD25A"
			],
			outline: "#141824",
			art: grid16("penguin onesie", [
				"................",
				"................",
				".....553333.....",
				"....53133134....",
				"...3333663334...",
				"..333333333334..",
				"..333h#####334..",
				"..33h#######34..",
				"..33########34..",
				"..37########74..",
				"..37#######s74..",
				"..331ssssss134..",
				"...3111111124...",
				"....31222214....",
				"................",
				"................"
			])
		},
		{
			id: "weighsies.piano",
			game: "weighsies",
			slot: "skin",
			name: "Capybara",
			eyes: 9,
			limb: 2,
			colors: [
				"#C48A57",
				"#94603A",
				"#DDAA78",
				"#6E4426",
				"#FFA62E",
				"#E07A12",
				"#5BAE4A",
				"#FFD08A"
			],
			outline: "#4A2C16",
			art: grid16("capybara", [
				"................",
				"......85577.....",
				".....855556.....",
				"...44.5566.44...",
				"...3311111112...",
				"..331111111112..",
				"..311111111112..",
				"..311111111122..",
				"..311111111112..",
				"..311111111112..",
				"..211111111122..",
				"..311111111122..",
				"...2111111122...",
				"....22222222....",
				"................",
				"................"
			])
		},
		{
			id: "weighsies.kitchen-scale",
			game: "weighsies",
			slot: "skin",
			name: "T. rex onesie",
			eyes: 8,
			limb: 1,
			showpiece: true,
			signature: "pulse",
			about: "Seven tonnes of costume.",
			colors: [
				"#6CC86A",
				"#3F9A4E",
				"#A6E890",
				"#FFFFFF",
				"#FFC93A",
				"#2B2F38",
				"#D7F5C2"
			],
			outline: "#1C3A22",
			art: grid16("t. rex onesie", [
				"................",
				".......52.......",
				"....33152112....",
				"...3461111642...",
				"..311111111112..",
				"..341414141412..",
				"..31h#######12..",
				"..31########12..",
				"..31########12..",
				"..31#######s12..",
				"..31ssssssss12..",
				"..314141414142..",
				"...3777777772...",
				"....22222222....",
				"................",
				"................"
			])
		},
		{
			id: "weighsies.scale-pan",
			game: "weighsies",
			slot: "hat",
			name: "Bear ears",
			free: true,
			colors: [
				"#9A6440",
				"#6E4426",
				"#C48A5E",
				"#F2A6B4"
			],
			draw: on([
				".31......31.",
				"3412....3412",
				"1122....1122",
				"222222222222"
			], 0, 1)
		},
		{
			id: "weighsies.apple",
			game: "weighsies",
			slot: "hat",
			name: "Apple shot",
			colors: [
				"#E5383D",
				"#A8202A",
				"#FF8A8A",
				"#4FAE5C",
				"#C89A5E",
				"#6A3A18",
				"#B9C2CF",
				"#FFFFFF",
				"#E5484D"
			],
			draw: perch$1([
				"......64.....",
				".....3112..7.",
				"8955531125577",
				"98...1122..7."
			], 1)
		},
		{
			id: "weighsies.topknot",
			game: "weighsies",
			slot: "hat",
			name: "Sumo topknot",
			colors: [
				"#22242C",
				"#14151A",
				"#4A4E5E",
				"#F2E6D0"
			],
			draw: on([
				".3312.",
				"311112",
				".2112.",
				"..44..",
				"..12.."
			], 0, 2)
		},
		{
			id: "weighsies.pyramid",
			game: "weighsies",
			slot: "hat",
			name: "Pharaoh",
			colors: [
				"#2F5FD0",
				"#1E3E96",
				"#5C8BF0",
				"#F2C230",
				"#C8901E",
				"#FFE07A",
				"#E5484D"
			],
			draw: on([
				"......6......",
				"..141454141..",
				".41414641414.",
				"4444447444444"
			], 0, 1)
		},
		{
			id: "weighsies.eiffel",
			game: "weighsies",
			slot: "hat",
			name: "Liberty crown",
			colors: [
				"#7FCDB4",
				"#4E9C86",
				"#B8F0DC",
				"#2F6E5E"
			],
			draw: on([
				"3..3..3..3..3",
				".1.1..1..1.1.",
				"..311111112..",
				".31414141412."
			], 0, 1)
		},
		{
			id: "weighsies.pennies",
			game: "weighsies",
			slot: "frame",
			name: "Pennies",
			colors: [
				"#FBF3E4",
				"#D9946A",
				"#EDB892",
				"#B87450"
			],
			fill: (x, y) => {
				const row = Math.floor(y / 6), cx = x - row % 2 * 3, dx = (cx % 6 + 6) % 6, dy = y % 6;
				if (dx === 2 && dy === 2) return 3;
				if (dx === 2 && dy === 1 || dx === 1 && dy === 2) return 3;
				if (dx === 3 && dy === 2 || dx === 2 && dy === 3) return 2;
				if (dx === 3 && dy === 3) return 4;
				if (dx === 3 && dy === 1 || dx === 1 && dy === 3) return 2;
				return 1;
			}
		},
		{
			id: "weighsies.blocks",
			game: "weighsies",
			slot: "frame",
			name: "Gold bars",
			colors: [
				"#FBF5E4",
				"#F6DD94",
				"#FCEFC2",
				"#E9C76B"
			],
			fill: (x, y) => {
				const band = Math.floor(y / 3), col = (x + band % 2 * 3) % 6, ry = y % 3;
				if (col === 5) return 1;
				return ry === 0 ? 3 : ry === 1 ? 2 : 4;
			}
		},
		{
			id: "weighsies.cat",
			game: "weighsies",
			slot: "buddy",
			name: "House cat",
			colors: [
				"#F29A4A",
				"#C46A24",
				"#FFE0B8",
				"#FFC98A",
				"#E9838A"
			],
			art: pet("house cat", [
				"1...1.",
				"11211.",
				"1o1o1.",
				"13531.",
				"22222."
			])
		},
		{
			id: "weighsies.whale",
			game: "weighsies",
			slot: "buddy",
			name: "Lil whale",
			colors: [
				"#5DBEFC",
				"#2F8FD0",
				"#A8DEFF",
				"#E6F6FF",
				"#BFEAFF"
			],
			art: pet("lil whale", [
				".5.5..",
				"..5..1",
				".31112",
				"31o112",
				"444422"
			])
		},
		{
			id: "weighsies.trex",
			game: "weighsies",
			slot: "buddy",
			name: "Hamster",
			colors: [
				"#F2B06A",
				"#C9813E",
				"#FFF1DC",
				"#F59AB0",
				"#FFFFFF"
			],
			art: pet("hamster", [
				".4..4.",
				".1111.",
				"1o11o1",
				"334433",
				".3333."
			])
		},
		{
			id: "weighsies.pigeon",
			game: "weighsies",
			slot: "buddy",
			name: "Pigeon",
			colors: [
				"#A9B0BC",
				"#7A8292",
				"#D0D5DD",
				"#7A6EA8",
				"#4FB59A",
				"#E86A6A",
				"#FF9A3A",
				"#2F3440",
				"#E8D8C8"
			],
			art: pet("pigeon", [
				"..33..",
				".9o11.",
				".34512",
				"311122",
				"..6.62"
			])
		}
	],
	retire: [
		"weighsies.cheese",
		"weighsies.anvil",
		"weighsies.flour",
		"weighsies.knight",
		"weighsies.wedge",
		"weighsies.scale",
		"weighsies.dumbbell",
		"weighsies.feather",
		"weighsies.laurel",
		"weighsies.ruler",
		"weighsies.dial",
		"weighsies.mouse",
		"weighsies.cheddar",
		"weighsies.chick",
		"weighsies.elephant"
	],
	redraw: { "weighsies.kettlebell": {
		colors: [
			"#3D74E0",
			"#2752B0",
			"#7FA3F0",
			"#2B2F38",
			"#5A6070",
			"#343844",
			"#8A93A3"
		],
		outline: "#101A38",
		art: grid16("kettlebell", [
			"................",
			".....775555.....",
			"....75....66....",
			"....55....66....",
			"....55....66....",
			"....55111166....",
			"....11111111....",
			"...3111111112...",
			"..331111111122..",
			"..311111111112..",
			"..111111111112..",
			"..111111111112..",
			"...1111111112...",
			"...1211111122...",
			"....22222222....",
			"................"
		]),
		eyes: 9
	} }
};

//#endregion
//#region src/sets/cutsies.ts
/**
* Cutsies' machine: the food it slices, the chef's knife hand and the
* chopping board. Colours follow the game's own objects (public/objects).
*/
const set$3 = {
	add: [
		{
			id: "cutsies.donut",
			game: "cutsies",
			slot: "skin",
			name: "Donut floatie",
			eyes: 8,
			colors: [
				"#FF8FB8",
				"#E0679A",
				"#FFC2DA",
				"#E3A866",
				"#B97A3E",
				"#F2C98E",
				"#8A5428",
				"#5CC8F0",
				"#FFE066"
			],
			outline: "#7A3A2A",
			art: grid16("donut floatie", [
				"................",
				"................",
				".....hh###......",
				"....h######s....",
				"...h########s...",
				"..h##########s..",
				"..h##########s..",
				"..############..",
				"..###########s..",
				"..###########s..",
				".###########sss.",
				".31181191181192.",
				".21141144141142.",
				"..554555545554..",
				"................",
				"................"
			])
		},
		{
			id: "cutsies.nigiri",
			game: "cutsies",
			slot: "skin",
			name: "Salmon nigiri",
			eyes: 10,
			limb: 1,
			colors: [
				"#FFFDF6",
				"#E6E0D2",
				"#F7F3EA",
				"#FF8A5B",
				"#E0663A",
				"#FFD6BF",
				"#FFAB82"
			],
			outline: "#7A3A24",
			art: grid16("nigiri", [
				"................",
				"................",
				"................",
				"....764446444...",
				"..776444644465..",
				".74644464446445.",
				".46444644464445.",
				".55555555555555.",
				".52222222222225.",
				"..311111111112..",
				"..311111111112..",
				"..311111111112..",
				"..311111111112..",
				"..322222222222..",
				"................",
				"................"
			])
		},
		{
			id: "cutsies.watermelon",
			game: "cutsies",
			slot: "skin",
			name: "Watermelon suit",
			eyes: 9,
			limb: 5,
			showpiece: true,
			signature: "pulse",
			colors: [
				"#8ED45C",
				"#2F6E2E",
				"#C9F08F",
				"#F4FBE8",
				"#F2454E",
				"#C42A36",
				"#2A1B10",
				"#FF7A80"
			],
			outline: "#1F4A22",
			art: grid16("watermelon suit", [
				"................",
				"................",
				".....312211.....",
				"...3211221122...",
				"..322112211221..",
				"..322112211221..",
				"..444444444444..",
				"..58h######s65..",
				"..5##########5..",
				"..5##########6..",
				"..5#########s6..",
				"..65s######s56..",
				"...6758575856...",
				"....66555566....",
				"................",
				"................"
			])
		},
		{
			id: "cutsies.flag",
			game: "cutsies",
			slot: "hat",
			name: "Chef’s headband",
			free: true,
			about: "Tied on before the first cut.",
			colors: ["#FFFFFF", "#D5DCE6"],
			draw: on([
				"..........1.1",
				"..........11.",
				"11111aa11111.",
				"22222AA22222."
			])
		},
		{
			id: "cutsies.toadstool",
			game: "cutsies",
			slot: "hat",
			name: "Toadstool",
			colors: [
				"#E8483B",
				"#B8302A",
				"#FFFFFF",
				"#FFF1DC",
				"#FF7A6E"
			],
			draw: on([
				"...511331...",
				".5133111112.",
				"511111133112",
				"444444444444"
			])
		},
		{
			id: "cutsies.peel",
			game: "cutsies",
			slot: "hat",
			name: "Banana peel",
			about: "What’s left once the banana’s been cut.",
			colors: [
				"#FFE04A",
				"#D9A11E",
				"#FFF6D2",
				"#5C3A1E",
				"#FFF19A"
			],
			draw: on([
				".....44.....",
				"....5112....",
				".5513333122.",
				"51..1332..12"
			])
		},
		{
			id: "cutsies.cupcake",
			game: "cutsies",
			slot: "hat",
			name: "Cupcake",
			colors: [
				"#FF9EC4",
				"#E0679A",
				"#FFD0E2",
				"#E5243B",
				"#FF8A96",
				"#7AC8F0",
				"#4A9ACC"
			],
			draw: on([
				".....54.....",
				"...311112...",
				".3112211222.",
				"..67676767.."
			])
		},
		{
			id: "cutsies.lineup",
			game: "cutsies",
			slot: "frame",
			name: "Slice line-up",
			colors: [
				"#FFE4DC",
				"#FFC7B5",
				"#FFB39C"
			],
			fill: (x, y) => {
				const slices = [
					[
						3,
						2.5,
						2.1
					],
					[
						8,
						2.5,
						1.6
					],
					[
						12,
						2.5,
						1.1
					],
					[
						3,
						13,
						2.1
					],
					[
						8,
						13,
						1.6
					],
					[
						12,
						13,
						1.1
					]
				];
				for (const [cx, cy, r] of slices) {
					const d = Math.hypot(x - cx, y - cy);
					if (d <= r - .6) return 2;
					if (d <= r + .4) return 3;
				}
				return 1;
			}
		},
		{
			id: "cutsies.pear",
			game: "cutsies",
			slot: "buddy",
			name: "Pear",
			colors: [
				"#C6E05A",
				"#93B33A",
				"#E8F59A",
				"#7A5230",
				"#5CA83A"
			],
			art: pet("pear", [
				"..45..",
				".3112.",
				"311112",
				"3o11o2",
				".1122."
			])
		},
		{
			id: "cutsies.tomato",
			game: "cutsies",
			slot: "buddy",
			name: "Tomato",
			colors: [
				"#EE3B33",
				"#B8241F",
				"#FF8A80",
				"#4FA93A"
			],
			art: pet("tomato", [
				"..44..",
				".34441",
				"3o11o2",
				"311112",
				".1122."
			])
		},
		{
			id: "cutsies.corn",
			game: "cutsies",
			slot: "buddy",
			name: "Corn cob",
			colors: [
				"#FFD23F",
				"#E0A620",
				"#FFEC99",
				"#7CC24A",
				"#4E8A2E"
			],
			art: pet("corn cob", [
				"..32..",
				".3132.",
				"4o11o5",
				"441255",
				".4455."
			])
		},
		{
			id: "cutsies.eggplant",
			game: "cutsies",
			slot: "buddy",
			name: "Eggplant",
			colors: [
				"#8A55C8",
				"#5A2E8C",
				"#C49BEF",
				"#5CA83A",
				"#3E7A26"
			],
			art: pet("eggplant", [
				"..44..",
				".4554.",
				".3112.",
				"3o11o2",
				".1122."
			])
		}
	],
	retire: [
		"cutsies.melon",
		"cutsies.toast",
		"cutsies.ninja",
		"cutsies.slice",
		"cutsies.orange",
		"cutsies.banana",
		"cutsies.kabuto",
		"cutsies.slices",
		"cutsies.seedling",
		"cutsies.cherries",
		"cutsies.pineapple",
		"cutsies.shadow"
	],
	redraw: {
		"cutsies.kiwi": {
			name: "Kiwi hoodie",
			eyes: 9,
			limb: 1,
			about: "Fuzzy outside, cut open round the face.",
			colors: [
				"#B88A5A",
				"#8E6438",
				"#D9AE7E",
				"#86CF55",
				"#C9F08F",
				"#2A1B10"
			],
			outline: "#4E3420",
			art: grid16("kiwi hoodie", [
				"................",
				"................",
				"................",
				"....33111112....",
				"...3311111112...",
				"..314464646412..",
				"..14h######s41..",
				"..14h######s41..",
				"..14########41..",
				"..14########41..",
				"..14#######s41..",
				"..214s####s412..",
				"...2144444412...",
				"....22111122....",
				"................",
				"................"
			])
		},
		"cutsies.strawberry": {
			name: "Strawberry hoodie",
			eyes: 9,
			limb: 1,
			colors: [
				"#E8343F",
				"#B01E2A",
				"#FF6E78",
				"#FFE07A",
				"#5CB83A",
				"#3E8A26",
				"#9AE070"
			],
			outline: "#5A0E16",
			art: grid16("strawberry hoodie", [
				"................",
				".......56.......",
				"...57.7557.75...",
				"..556555555655..",
				"..314111411412..",
				"..311141111112..",
				"..31h######s12..",
				"..4h########s2..",
				"..1##########2..",
				"..1##########4..",
				"..2#########s2..",
				"..21s######s12..",
				"...2141141412...",
				".....222222.....",
				"................",
				"................"
			])
		},
		"cutsies.seeds": {
			name: "Melon slice",
			colors: [
				"#FF8FA3",
				"#3A1E1A",
				"#FFF4E0",
				"#A8DB7A",
				"#4E9E3A",
				"#FFB3C0"
			],
			fill: (x, y) => {
				const X = (x % 16 + 16) % 16, Y = (y % 16 + 16) % 16;
				if (Y === 13) return 3;
				if (Y === 14) return 4;
				if (Y === 15) return 5;
				for (const [sx, sy] of [
					[1, 2],
					[13, 1],
					[2, 7],
					[14, 5],
					[1, 11],
					[13, 10]
				]) {
					if (X === sx && (Y === sy || Y === sy + 1)) return 2;
					if (X === sx && Y === sy - 1) return 6;
				}
				return 1;
			}
		},
		"cutsies.chef": {
			draw: on([
				".33.333.33.",
				"33333333312",
				".311111122.",
				"..1212121..",
				"..4444444.."
			]),
			colors: [
				"#F7F9FC",
				"#D5DCE6",
				"#FFFFFF",
				"#B9C4D2"
			]
		},
		"cutsies.board": { name: "Chopping board" }
	}
};

//#endregion
//#region src/sets/tiltsies.ts
/**
* Tiltsies' machine: its own hamsters (Biscuit, Mochi, Pebble, Custard) and
* the balls they roll in, the pieces on the course and the seeds on it.
* Colours follow the game's hamster.ts and its course.
*/
const set$2 = {
	add: [
		{
			id: "tiltsies.biscuit",
			game: "tiltsies",
			slot: "skin",
			name: "Biscuit hoodie",
			eyes: 9,
			limb: 1,
			about: "The golden classic.",
			colors: [
				"#E9B88A",
				"#C98A55",
				"#F6D2AE",
				"#FF9AA4",
				"#FFF1DE",
				"#EBD3B4"
			],
			outline: "#5A3418",
			art: grid16("biscuit hoodie", [
				"................",
				"................",
				"...33......32...",
				"..3443....3442..",
				"..344311113442..",
				"..311111111112..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1##########2..",
				"..2#########s2..",
				"..25s######s52..",
				"...2555555552...",
				"....22666622....",
				"................",
				"................"
			])
		},
		{
			id: "tiltsies.candy",
			game: "tiltsies",
			slot: "skin",
			name: "Mochi hoodie",
			eyes: 9,
			limb: 1,
			about: "Snow white, with a bow.",
			colors: [
				"#FBF6EF",
				"#E3D6C6",
				"#FFFFFF",
				"#F1C9C9",
				"#E8483B",
				"#B8302A",
				"#FF8A80"
			],
			outline: "#7A5A48",
			art: grid16("mochi hoodie", [
				"................",
				"................",
				"...33.....55.55.",
				"..3443....57675.",
				"..3443111155155.",
				"..311111111112..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1##########2..",
				"..2#########s2..",
				"..23s######s32..",
				"...2333333332...",
				"....22222222....",
				"................",
				"................"
			])
		},
		{
			id: "tiltsies.starry",
			game: "tiltsies",
			slot: "skin",
			name: "Starfall pyjamas",
			eyes: 9,
			limb: 1,
			colors: [
				"#3A4A8C",
				"#2A3466",
				"#5A6CB8",
				"#FFC93A",
				"#FFF4D6",
				"#DDE6FF"
			],
			outline: "#161C3A",
			art: grid16("starfall pyjamas", [
				"................",
				"......331112....",
				".....3111112255.",
				"....31111111255.",
				"...3114111142...",
				"..311111111412..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1##########2..",
				"..2#########s2..",
				"..26s######s62..",
				"..216666666612..",
				"...2242224222...",
				"................",
				"................"
			])
		},
		{
			id: "tiltsies.golden",
			game: "tiltsies",
			slot: "skin",
			name: "Golden seed",
			eyes: 9,
			limb: 1,
			showpiece: true,
			signature: "shimmer",
			about: "The rare seed on a course, worn.",
			colors: [
				"#F2B530",
				"#C98A12",
				"#FFE07A",
				"#FFF3C0"
			],
			outline: "#6A4508",
			art: grid16("golden seed", [
				"................",
				".......32.......",
				"......3312......",
				".....313112.....",
				"....34131142....",
				"...3141311412...",
				"...3141111412...",
				"..311h#####112..",
				"..31h#######12..",
				"..31#######s12..",
				"..21#######s12..",
				"..211#####s112..",
				"..211411114112..",
				"...2222222222...",
				"................",
				"................"
			])
		},
		{
			id: "tiltsies.bow",
			game: "tiltsies",
			slot: "hat",
			name: "Mochi’s bow",
			colors: [
				"#E8483B",
				"#B8302A",
				"#FF8A80",
				"#8A1E18"
			],
			draw: on([
				"11...11",
				"1311131",
				"1114111",
				"12.4.21",
				"..2.2.."
			], -3)
		},
		{
			id: "tiltsies.sprout",
			game: "tiltsies",
			slot: "hat",
			name: "Pebble’s sprout",
			colors: [
				"#6CC24A",
				"#3E8A2E",
				"#B4EA8A",
				"#5A9A3A"
			],
			draw: on([
				".33...11.",
				"3333.1112",
				".3334112.",
				"....4....",
				"....4...."
			])
		},
		{
			id: "tiltsies.daisy",
			game: "tiltsies",
			slot: "hat",
			name: "Daisy crown",
			colors: [
				"#FFFFFF",
				"#DCE3EA",
				"#FFC93A",
				"#E0A010",
				"#6CC24A",
				"#3E8A2E"
			],
			draw: on([
				".1....1....1.",
				"131..131..131",
				".1.55.1.55.1.",
				"6555555555556"
			])
		},
		{
			id: "tiltsies.tiles",
			game: "tiltsies",
			slot: "frame",
			name: "Course tiles",
			colors: [
				"#F4EBD6",
				"#C6E0AE",
				"#9DB487",
				"#FFFBF0"
			],
			fill: (x, y) => {
				const tx = x % 4, ty = y % 4;
				if (tx === 3 || ty === 3) return 3;
				if (tx === 0 && ty === 0) return 4;
				return (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 2 : 1;
			}
		},
		{
			id: "tiltsies.sky",
			game: "tiltsies",
			slot: "frame",
			name: "Cloudy sky",
			colors: [
				"#BFE6FF",
				"#EAF7FF",
				"#D6EFFF"
			],
			fill: (x, y) => {
				const puffs = [
					[
						1.5,
						3.6,
						1.6
					],
					[
						3.8,
						2.6,
						2.1
					],
					[
						6.2,
						3.4,
						1.5
					]
				];
				const inside = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
				if (y <= 4 && puffs.some(([cx, cy, r]) => inside(cx, cy, r))) return y === 4 ? 3 : 2;
				return 1;
			}
		},
		{
			id: "tiltsies.trail",
			game: "tiltsies",
			slot: "frame",
			name: "Seed trail",
			colors: [
				"#F6EFDF",
				"#8A7A68",
				"#D9CDB8"
			],
			fill: (x, y) => {
				const k = (x + 3 * y) % 10;
				return k === 0 ? 2 : k === 8 ? 3 : 1;
			}
		},
		{
			id: "tiltsies.sunseed",
			game: "tiltsies",
			slot: "buddy",
			name: "Pocket hamster",
			colors: [
				"#E9B88A",
				"#C98A55",
				"#F6D2AE",
				"#FF9AA4",
				"#FFF1DE"
			],
			art: pet("pocket hamster", [
				".4..4.",
				"311112",
				"3o11o2",
				"154452",
				".5555."
			])
		},
		{
			id: "tiltsies.bumper",
			game: "tiltsies",
			slot: "buddy",
			name: "Ladybug",
			colors: [
				"#E8392B",
				"#A8231A",
				"#FF7A6E",
				"#2B2F38",
				"#FFFFFF"
			],
			art: pet("ladybug", [
				".5445.",
				"311412",
				"141412",
				"311142",
				".1122."
			])
		},
		{
			id: "tiltsies.spring",
			game: "tiltsies",
			slot: "buddy",
			name: "Springy",
			about: "Every trampoline’s best friend.",
			colors: [
				"#7CCB5A",
				"#4E9A3A",
				"#B4EA8A",
				"#E8F5C8",
				"#FF9AA4"
			],
			art: pet("springy", [
				"3o..o3",
				"311112",
				"511115",
				"144441",
				"22..22"
			])
		},
		{
			id: "tiltsies.ghost",
			game: "tiltsies",
			slot: "buddy",
			name: "Ghost",
			about: "Your best run, rolling along beside you.",
			colors: [
				"#9DB8D6",
				"#EEF5FD",
				"#D8C0A8",
				"#FFFFFF"
			],
			art: pet("ghost", [
				".1241.",
				"132231",
				"133331",
				"233332",
				".1221."
			])
		}
	],
	retire: [
		"tiltsies.hamster",
		"tiltsies.marble",
		"tiltsies.acorn",
		"tiltsies.astronaut",
		"tiltsies.seed",
		"tiltsies.wheel",
		"tiltsies.ufo",
		"tiltsies.maze",
		"tiltsies.spiral",
		"tiltsies.bedding",
		"tiltsies.hamlet",
		"tiltsies.rolly",
		"tiltsies.sunflower",
		"tiltsies.hedgehog"
	],
	redraw: {
		"tiltsies.ball": {
			eyes: 9,
			colors: [
				"#BFE2F2",
				"#EAF6FD",
				"#FFFFFF",
				"#8CC7E5"
			],
			outline: "#4E7A92",
			art: grid16("hamster ball", [
				"................",
				"......1111......",
				"....11332211....",
				"...1322222221...",
				"..132222222224..",
				"..122hh####224..",
				".122h#######224.",
				".12h#########24.",
				".12##########24.",
				".12##########24.",
				"..1#########s4..",
				"..1########ss4..",
				"...1s######s4...",
				"....44ssss44....",
				"......4444......",
				"................"
			])
		},
		"tiltsies.ears": { draw: onPair([
			"33.",
			"321",
			"321",
			"114"
		], 0) },
		"tiltsies.buddy": {
			colors: [
				"#E9B88A",
				"#C98A55",
				"#FFF1DE",
				"#FF9AA4",
				"#2A1B10"
			],
			draw: on([
				".24....42.",
				".11111112.",
				"1151111512",
				"1113443122",
				".33333332."
			])
		}
	}
};

//#endregion
//#region src/sets/trackdle.ts
/**
* Trackdle's machine: its drivers and crew, its die-cast cars and what
* stands round the track, on its snow and canyon tracks too.
* The livery is the game's own: Tangerine #ED6137 with cream #FFF4DC stripes,
* toy-black tyres, orange ramps with a cream chevron, a cream band on a cone.
*/
const set$1 = {
	add: [
		{
			id: "trackdle.coupe",
			game: "trackdle",
			slot: "skin",
			name: "Pit crew",
			eyes: 9,
			limb: 1,
			colors: [
				"#ED6137",
				"#B8441F",
				"#F7905F",
				"#FFF4DC",
				"#2B2F38",
				"#6B7380",
				"#E5323B"
			],
			outline: "#4A1A0A",
			art: grid16("pit crew", [
				"................",
				"................",
				"................",
				".....555555.....",
				"...55h####s55...",
				"..5h########s5..",
				"..5##########5..",
				".66##########66.",
				".61##########16.",
				".66##########66.",
				"..5##########s..",
				"..s57#######ss..",
				"..211411114112..",
				"...2111111112...",
				"................",
				"................"
			])
		},
		{
			id: "trackdle.van",
			game: "trackdle",
			slot: "skin",
			name: "Snow parka",
			eyes: 9,
			limb: 1,
			about: "For the snow tracks.",
			colors: [
				"#ED6137",
				"#B8441F",
				"#F7905F",
				"#FFF8EA",
				"#E3D3B0",
				"#5A1E0C"
			],
			outline: "#4A1A0A",
			art: grid16("snow parka", [
				"................",
				"................",
				"................",
				"....33111111....",
				"...3311111112...",
				"..311444444112..",
				"..144h####s441..",
				"..14h######s42..",
				"..4##########4..",
				"..4##########5..",
				"..4#########s5..",
				"..54s######s45..",
				"..215444444512..",
				"...2211611122...",
				"................",
				"................"
			])
		},
		{
			id: "trackdle.buggy",
			game: "trackdle",
			slot: "skin",
			name: "Dune rider",
			eyes: 9,
			limb: 1,
			about: "For the canyon tracks.",
			colors: [
				"#E8C98F",
				"#C9A26A",
				"#F6E3B8",
				"#3A3F48",
				"#3FA9C9",
				"#BFF0FF",
				"#D93A2B",
				"#A8231A"
			],
			outline: "#4A2A10",
			art: grid16("dune rider", [
				"................",
				"................",
				".....333111.....",
				"...3311211112...",
				"..445654456544..",
				"..215551155512..",
				"..321112111122..",
				"..21h######s12..",
				"..1##########2..",
				"..1##########2..",
				"..2#########s2..",
				"..27s######s72..",
				"..877777777778..",
				"...2228782222...",
				"................",
				"................"
			])
		},
		{
			id: "trackdle.formula",
			game: "trackdle",
			slot: "skin",
			name: "Formula 07",
			eyes: 8,
			limb: 1,
			showpiece: true,
			signature: "embers",
			about: "No. 07’s driver, visor up.",
			colors: [
				"#ED6137",
				"#B8441F",
				"#F7905F",
				"#FFF4DC",
				"#2B2F38",
				"#7FB6D8",
				"#F2C230"
			],
			outline: "#3A1408",
			art: grid16("formula 07", [
				"................",
				"......3441......",
				"....33144111....",
				"...3311441112...",
				"..356555555552..",
				"..31h######112..",
				"..3h########s2..",
				"..1h#########2..",
				"..1##########2..",
				"..1#########s2..",
				"..12########22..",
				"..244s####s442..",
				"..211714411112..",
				"...2211441122...",
				"................",
				"................"
			])
		},
		{
			id: "trackdle.lights",
			game: "trackdle",
			slot: "hat",
			name: "Cowboy hat",
			about: "For the canyon tracks.",
			colors: [
				"#A8743F",
				"#7A5230",
				"#C99A63",
				"#ED6137"
			],
			draw: on([
				"....311.112...",
				"....3111112...",
				"3...4444444..2",
				"31111111111122"
			])
		},
		{
			id: "trackdle.spoiler",
			game: "trackdle",
			slot: "hat",
			name: "Boost flame",
			about: "Hit a boost pad and it catches.",
			colors: [
				"#FF7A2F",
				"#E5323B",
				"#FFD23F",
				"#FFF4C2"
			],
			draw: on([
				"...2.....2..",
				"..21..2..12.",
				".2131.21.312",
				"213431213431",
				"213444444312"
			])
		},
		{
			id: "trackdle.surfboard",
			game: "trackdle",
			slot: "hat",
			name: "Bobble hat",
			about: "For the snow tracks.",
			colors: [
				"#ED6137",
				"#B8441F",
				"#FFF4DC",
				"#E3CFA6",
				"#F7905F"
			],
			draw: on([
				"....3334....",
				"...511112...",
				"..33333334..",
				".5111111112.",
				"343434343434"
			])
		},
		{
			id: "trackdle.finish",
			game: "trackdle",
			slot: "hat",
			name: "Chequered bandana",
			colors: [
				"#23262D",
				"#F4F4F4",
				"#C9CFD8"
			],
			draw: on([
				"...2112211....",
				"..221122112...",
				".21122112211..",
				"22112211221112"
			])
		},
		{
			id: "trackdle.boost",
			game: "trackdle",
			slot: "frame",
			name: "Boost pad",
			colors: ["#143049", "#9C8545"],
			fill: (x, y) => {
				for (const cy of [
					2,
					7,
					12
				]) for (const cx of [2, 13]) {
					const dx = x - cx, dy = y - cy;
					if (Math.abs(dy) <= 1 && (dx === -Math.abs(dy) || dx === 1 - Math.abs(dy))) return 2;
				}
				return 1;
			}
		},
		{
			id: "trackdle.tyres",
			game: "trackdle",
			slot: "buddy",
			name: "Tyre stack",
			colors: [
				"#3A3F48",
				"#5C6370",
				"#23262D",
				"#C9CFD8"
			],
			art: pet("tyre stack", [
				".1111.",
				"134431",
				"211112",
				"134431",
				".1111."
			])
		},
		{
			id: "trackdle.ramp",
			game: "trackdle",
			slot: "buddy",
			name: "Lil racer",
			about: "A pocket-sized No. 07.",
			colors: [
				"#ED6137",
				"#B8441F",
				"#F7905F",
				"#CFE6EE",
				"#23262D",
				"#FFE7A0"
			],
			art: pet("lil racer", [
				".3112.",
				"3o44o2",
				"611116",
				"222222",
				"55..55"
			])
		},
		{
			id: "trackdle.cactus",
			game: "trackdle",
			slot: "buddy",
			name: "Saguaro",
			colors: [
				"#4F9B62",
				"#2F6B40",
				"#8ED07A",
				"#FF8FB8",
				"#FFE07A"
			],
			art: pet("saguaro", [
				"..45..",
				"3.31.1",
				"3o11o2",
				".3112.",
				".3112."
			])
		}
	],
	retire: [
		"trackdle.racer",
		"trackdle.stopwatch",
		"trackdle.tyre",
		"trackdle.rocket",
		"trackdle.helmet",
		"trackdle.trophy",
		"trackdle.goggles",
		"trackdle.f1",
		"trackdle.flag",
		"trackdle.snail",
		"trackdle.kart",
		"trackdle.hare"
	],
	redraw: {
		"trackdle.conelet": {
			colors: [
				"#FF8A3D",
				"#D9621E",
				"#FFF4DC",
				"#FFB27A",
				"#2B2F38"
			],
			art: pet("conelet", [
				"..41..",
				".4112.",
				"3o33o3",
				"411112",
				"555555"
			])
		},
		"trackdle.cone": {
			name: "Cone suit",
			eyes: 9,
			limb: 1,
			colors: [
				"#FF8A3D",
				"#D9621E",
				"#FFF4DC",
				"#FFB27A",
				"#2B2F38",
				"#E6D5B3"
			],
			art: grid16("cone suit", [
				"................",
				".......41.......",
				"......4112......",
				"......3336......",
				".....411112.....",
				".....411112.....",
				"....33333336....",
				"...41######12...",
				"..41h#######12..",
				"..41########12..",
				"..41########12..",
				"..41s######s12..",
				"..333333333336..",
				".55555555555555.",
				"................",
				"................"
			])
		},
		"trackdle.cap": {
			colors: ["#23262D", "#FFFFFF"],
			draw: on([
				"....aaaA....",
				"..aa2222aA..",
				".aaa2112aaA.",
				".aaaaaaaaaAA",
				"AAAAAAAAAAAA"
			])
		},
		"trackdle.tarmac": {
			name: "Canyon sunset",
			colors: [
				"#FFC49A",
				"#FFA978",
				"#FFF4CC",
				"#C8613D",
				"#9E4630",
				"#FF8F62"
			],
			fill: (x, y) => {
				const X = (x % 16 + 16) % 16, Y = (y % 16 + 16) % 16;
				if (Math.hypot(X - 3.5, Y - 3.5) <= 2.2) return 3;
				const top = [
					11,
					11,
					11,
					11,
					13,
					13,
					12,
					12,
					12,
					14,
					14,
					10,
					10,
					10,
					10,
					13
				][X];
				if (Y >= top) return [
					3,
					8,
					14
				].includes(X) ? 5 : 4;
				return Y < 6 ? 1 : Y < 10 ? 2 : 6;
			}
		}
	}
};

//#endregion
//#region src/sets/pets.ts
/** A hat stood on the crown as drawn, rather than pulled down round the head like a cap. */
const perch = (rows, sink = 1) => {
	const s = stamp(rows);
	return (c) => sit(c, s, 0, sink);
};
/**
* A pair of ears set `out` columns past the sides of the head, where there is
* room, so they stand at its corners the way a cat's or a fox's do, rather
* than meeting in the middle on a narrow head. Drawn for the left side; the
* right is its mirror.
*/
const earsOut = (rows, out) => {
	const left = stamp(rows), right = mirror(left);
	return (c) => {
		const r = c.rows[c.shoulder()], l = fitRoom(c, left), rr = fitRoom(c, right);
		seat(c, l, Math.max(1, r.left - out));
		seat(c, rr, Math.min(GRID_SIZE - 1 - width(rr), r.right + out - width(rr) + 1));
	};
};
/** Headphones: a pair of ears at the head's corners (`earsOut`), and a band and its cups over them, worn like a cap. */
const headset = (band, ear, out) => {
	const wearBand = on(band), wearEars = earsOut(ear, out);
	return (c) => {
		wearEars(c);
		wearBand(c);
	};
};
/**
* The Pet shop: no game's machine, the club's own. Cats, dogs, foxes and
* bunnies: animal onesies with the guy's own face looking out, animal ears to
* wear, a pet bed and cherry blossom to sit in, and a little pet at his feet.
*/
const set = {
	add: [
		{
			id: "pets.cat",
			game: "pets",
			slot: "skin",
			name: "Cat onesie",
			eyes: 9,
			limb: 4,
			colors: [
				"#5D5880",
				"#45405F",
				"#7F79A8",
				"#F7F4FF",
				"#FF9CC0",
				"#E8394F",
				"#FFD04A",
				"#C98A12",
				"#D6D0EA"
			],
			outline: "#1F1B2E",
			art: grid16("cat onesie", [
				"................",
				"..31........12..",
				"..351......152..",
				"..355111111552..",
				"..311114411112..",
				"..311144441112..",
				"..31h######s12..",
				".41h########s24.",
				"..1##########2..",
				".41##########24.",
				"..1#########s2..",
				"..21s######s124.",
				"..2666677666621.",
				"...2454884542...",
				"................",
				"................"
			])
		},
		{
			id: "pets.shiba",
			game: "pets",
			slot: "skin",
			name: "Shiba onesie",
			eyes: 9,
			limb: 1,
			colors: [
				"#E99447",
				"#C2692A",
				"#F7B877",
				"#FFF3DF",
				"#EBD3B4",
				"#E5484D",
				"#B22F3A"
			],
			outline: "#5A2E10",
			art: grid16("shiba onesie", [
				"................",
				"..31........12..",
				"..341......142..",
				"..344111111442..",
				"..311411114112..",
				"..311111111112..",
				"..34h######s42..",
				"..4h########s4..",
				"..4##########4..",
				"..4##########43.",
				"..4#########s44.",
				"..44s######s442.",
				"..2667666676622.",
				"...2117667112...",
				"................",
				"................"
			])
		},
		{
			id: "pets.bunny",
			game: "pets",
			slot: "skin",
			name: "Bunny hoodie",
			eyes: 10,
			limb: 1,
			colors: [
				"#FFC2D8",
				"#E893B4",
				"#FFE3EE",
				"#FF7FAE",
				"#FFFFFF",
				"#EADFF0"
			],
			outline: "#7A2E4E",
			art: grid16("bunny hoodie", [
				"................",
				"...33......3311.",
				"..3143....3141..",
				"..3143....3142..",
				"..3143....3142..",
				"..311111111112..",
				"..311111111112..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1##########25.",
				"..2#########s26.",
				"..21s######s12..",
				"...2554224552...",
				"................",
				"................"
			])
		},
		{
			id: "pets.frog",
			game: "pets",
			slot: "skin",
			name: "Frog hoodie",
			eyes: 9,
			limb: 1,
			colors: [
				"#86D45E",
				"#4F9E3A",
				"#BDEB91",
				"#FFFFFF",
				"#1F2A1A",
				"#FF9AAE",
				"#EAF7C8"
			],
			outline: "#24451A",
			art: grid16("frog hoodie", [
				"................",
				"..34442..34442..",
				".345542..345542.",
				".31444111144412.",
				"..311111111112..",
				"..311111111112..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..6##########6..",
				"..2#########s2..",
				"..21s######s12..",
				"...2177777712...",
				"....22222222....",
				"................",
				"................"
			])
		},
		{
			id: "pets.kitsune",
			game: "pets",
			slot: "skin",
			name: "Kitsune",
			eyes: 9,
			limb: 1,
			showpiece: true,
			signature: "neon",
			about: "A fox spirit, a tail for every hundred years.",
			colors: [
				"#FFFDF7",
				"#DCD3E8",
				"#FFFFFF",
				"#E5383B",
				"#F28A2E",
				"#C2601A",
				"#FFF0C8",
				"#FFB066",
				"#FFD04A"
			],
			outline: "#4A2232",
			art: grid16("kitsune", [
				"................",
				"..77.3....2.77..",
				".777.34..42.777.",
				".85563411426558.",
				".85631144112658.",
				"..631111111126..",
				"..31h######s12..",
				".74h########s47.",
				".81##########18.",
				"..1##########2..",
				"..1#########s2..",
				".721s######s127.",
				".85244499444258.",
				".65521111112556.",
				"..66........66..",
				"................"
			])
		},
		{
			id: "pets.ears",
			game: "pets",
			slot: "hat",
			name: "Cat ears",
			free: true,
			colors: [],
			draw: earsOut([
				"h.....",
				"#ho...",
				"#cwo..",
				"s#cw#o"
			], 2)
		},
		{
			id: "pets.puppy-ears",
			game: "pets",
			slot: "hat",
			name: "Head puppy",
			colors: [
				"#FFF8EE",
				"#E2D2BC",
				"#FFFFFF",
				"#B07040",
				"#7E4A26",
				"#2B1D18",
				"#FF8A9E"
			],
			draw: perch([
				".543111245.",
				".441o1o144.",
				".451161154.",
				".5.32723.5."
			])
		},
		{
			id: "pets.fox-ears",
			game: "pets",
			slot: "hat",
			name: "Fox ears",
			colors: [
				"#F28A2E",
				"#C2601A",
				"#FFB066",
				"#FFF1DC",
				"#3A2418"
			],
			draw: earsOut([
				"5o...",
				"55o..",
				"343o.",
				"1442o"
			], 2)
		},
		{
			id: "pets.bunny-ears",
			game: "pets",
			slot: "hat",
			name: "Bunny ears",
			colors: [
				"#FFFFFF",
				"#FFA8C8",
				"#E2D8EC"
			],
			draw: perch([
				".13.....1111",
				".123...1223.",
				".123...123..",
				".123...123.."
			])
		},
		{
			id: "pets.headphones",
			game: "pets",
			slot: "hat",
			name: "Cat-ear headphones",
			colors: [
				"#FF9EC8",
				"#E06A9E",
				"#FFD0E4",
				"#7FF0FF",
				"#E8FFFF",
				"#B8457A"
			],
			draw: headset([
				"..21111112..",
				"66........66",
				"64........46"
			], [
				"1....",
				"13o..",
				"154o.",
				"1145o"
			], 1)
		},
		{
			id: "pets.paws",
			game: "pets",
			slot: "frame",
			name: "Paw prints",
			colors: [
				"#FFE6DA",
				"#E58A74",
				"#F0A994"
			],
			fill: (x, y) => {
				const X = (x % 16 + 16) % 16, Y = (y % 16 + 16) % 16;
				const PAW = [
					".x.x.",
					"x...x",
					".xxx.",
					".xxx."
				];
				for (const [px, py] of [
					[0, 0],
					[11, 1],
					[0, 11],
					[11, 12]
				]) {
					const r = PAW[Y - py], ch = r?.[X - px];
					if (ch === "x") return (px + py) % 2 ? 3 : 2;
				}
				return 1;
			}
		},
		{
			id: "pets.cushion",
			game: "pets",
			slot: "frame",
			name: "Cozy cushion",
			colors: [
				"#FFF3E4",
				"#FFE3CC",
				"#B98AE0",
				"#8A5CB8",
				"#DDC2F5",
				"#FFD6E6"
			],
			fill: (x, y) => {
				const X = (x % 16 + 16) % 16, Y = (y % 16 + 16) % 16;
				const d = ((X - 7.5) / 9.2) ** 2 + ((Y - 17) / 9) ** 2;
				const inner = ((X - 7.5) / 5.6) ** 2 + ((Y - 17) / 5.4) ** 2;
				if (inner <= 1) return 6;
				if (d <= 1) {
					const dIn = ((X - 7.5) / 8.4) ** 2 + ((Y - 17) / 8) ** 2;
					return dIn > 1 ? 5 : Y >= 14 || X <= 1 || X >= 14 ? 4 : 3;
				}
				return X % 4 < 2 ? 1 : 2;
			}
		},
		{
			id: "pets.sakura",
			game: "pets",
			slot: "frame",
			name: "Sakura",
			colors: [
				"#E3F1FF",
				"#FF8FB8",
				"#FFD0E1",
				"#6E4636",
				"#FFE36E",
				"#FFB3CF"
			],
			fill: (x, y) => {
				const X = (x % 16 + 16) % 16, Y = (y % 16 + 16) % 16;
				for (const [bx, by] of [
					[1, 1],
					[7, 1],
					[12, 0],
					[14, 3]
				]) {
					if (X === bx && Y === by) return 5;
					const d = Math.abs(X - bx) + Math.abs(Y - by);
					if (d === 1) return Y < by || X < bx ? 3 : 2;
				}
				if ([
					[0, 3],
					[1, 3],
					[2, 2],
					[3, 2],
					[4, 1],
					[5, 1],
					[6, 0],
					[8, 0],
					[9, 0],
					[10, 1],
					[11, 1]
				].some(([bx, by]) => X === bx && Y === by)) return 4;
				for (const [px, py] of [
					[1, 7],
					[14, 7],
					[0, 11],
					[15, 12],
					[3, 15],
					[12, 15]
				]) {
					if (X === px && Y === py) return 6;
					if (X === px + 1 && Y === py + 1) return 3;
				}
				return 1;
			}
		},
		{
			id: "pets.kitten",
			game: "pets",
			slot: "buddy",
			name: "Kitten",
			colors: [
				"#F6A04D",
				"#D07228",
				"#FFC98A",
				"#FF9AAE",
				"#FFF4E6"
			],
			art: pet("kitten", [
				"1...1.",
				"14.41.",
				"11111.",
				"1o1o13",
				"154512"
			])
		},
		{
			id: "pets.puppy",
			game: "pets",
			slot: "buddy",
			name: "Puppy",
			colors: [
				"#F2C27A",
				"#D29A50",
				"#FFE2B0",
				"#8A5530",
				"#2B1D18",
				"#FF8A9E",
				"#FFF6E8"
			],
			art: pet("puppy", [
				"41314",
				"4o1o4",
				"47574",
				".767.",
				".2.2."
			])
		},
		{
			id: "pets.axolotl",
			game: "pets",
			slot: "buddy",
			name: "Axolotl",
			colors: [
				"#FFB3CF",
				"#E77FA8",
				"#FFE0EC",
				"#FF6F9F",
				"#D9417A",
				"#8A2E52"
			],
			art: pet("axolotl", [
				"5.33.5",
				"451154",
				"1o11o1",
				"116611",
				".2..2."
			])
		},
		{
			id: "pets.bunny-buddy",
			game: "pets",
			slot: "buddy",
			name: "Bunny",
			colors: [
				"#FFFFFF",
				"#DCD0E8",
				"#FFA8C8"
			],
			art: pet("bunny", [
				".1..1.",
				".3..3.",
				".1111.",
				"1o11o1",
				"213312"
			])
		}
	],
	retire: [],
	redraw: {}
};

//#endregion
//#region src/sets/index.ts
/**
* Each machine's set, one file a machine, so every game's things are drawn
* from what is really in that game and kept in one place.
*/
const SETS = {
	amountle: set$9,
	halfsies: set$8,
	stackdle: set$7,
	flipsies: set$6,
	puttsies: set$5,
	weighsies: set$4,
	cutsies: set$3,
	tiltsies: set$2,
	trackdle: set$1,
	pets: set
};

//#endregion
//#region src/loop.ts
/**
* Everything that moves on its own clock (auras, effects, finishes, a Lucky
* guy's sheen, live eyes, sparkles) repeats in LOOP_MS, so any loop of a whole
* number of LOOP_MS closes perfectly: its last frame runs into its first like
* any other frame. Each motion keeps its own speed as near as it can, nudged
* so a whole number of its cycles fill LOOP_MS, and anything drawn from noise
* per step or per generation draws the same noise again each LOOP_MS.
*/
const LOOP_MS = 6e3;
const TAU$1 = Math.PI * 2;
/** `v` brought into 0 to `n`, negative numbers too. */
const wrap$1 = (v, n) => (v % n + n) % n;
/** `period` ms, nudged so a whole number of them fill LOOP_MS. */
const fit = (period) => LOOP_MS / Math.max(1, Math.round(LOOP_MS / Math.abs(period)));
/** The `d` in `sin(t / d)`, nudged so the wave (2πd ms) comes round in LOOP_MS. */
const wave = (d) => fit(TAU$1 * d) / TAU$1;
/** A step's length in a pattern `n` steps long, nudged so the pattern comes round in LOOP_MS. */
const steps = (step, n) => fit(step * Math.max(1, n)) / Math.max(1, n);
/** A count of `step` ms that starts again every LOOP_MS: for noise drawn fresh each step or generation. */
function tick(t, step) {
	const s = fit(step);
	return wrap$1(Math.floor(t / s), Math.round(LOOP_MS / s));
}
/** How far through a cycle of about `period` ms, 0 to 1, coming round in LOOP_MS. */
const cycle = (t, period) => {
	const p = fit(period);
	return wrap$1(t, p) / p;
};
/**
* How many times to play something `duration` ms long so everything on its own
* clock comes round with it: the plays that get closest to whole turns of
* LOOP_MS (`turns`), the clock running `speed` times as fast to close exactly.
*/
function fitLoop(duration) {
	let best = {
		repeats: 1,
		turns: 1,
		speed: LOOP_MS / duration
	};
	for (let turns = 1; turns <= 3; turns++) {
		const repeats = Math.max(1, Math.round(turns * LOOP_MS / duration));
		if (repeats * duration > LOOP_MS * 2) continue;
		const speed = turns * LOOP_MS / (repeats * duration);
		if (Math.abs(Math.log(speed)) < Math.abs(Math.log(best.speed))) best = {
			repeats,
			turns,
			speed
		};
	}
	return best;
}

//#endregion
//#region src/sparkle.ts
const DOT_DEEP = [[
	0,
	0,
	2
]];
const DOT = [[
	0,
	0,
	1
]];
const CROSS = [
	[
		0,
		0,
		0
	],
	[
		-1,
		0,
		1
	],
	[
		1,
		0,
		1
	],
	[
		0,
		-1,
		1
	],
	[
		0,
		1,
		1
	]
];
const GLINT = [
	[
		0,
		0,
		0
	],
	[
		-1,
		-1,
		2
	],
	[
		1,
		1,
		2
	],
	[
		1,
		-1,
		2
	],
	[
		-1,
		1,
		2
	]
];
/**
* The sparkle `f` of the way through its life (0 to 1), as cells round its
* centre. Outside 0 to 1 it isn't there.
*/
function sparkleAt(f) {
	if (f < 0 || f >= 1) return [];
	return f < .16 ? DOT_DEEP : f < .32 ? DOT : f < .6 ? CROSS : f < .78 ? GLINT : f < .9 ? DOT : DOT_DEEP;
}
/** The room a sparkle needs at its biggest: its centre and the cells beside and across from it. */
const SPARKLE_REACH = [
	[0, 0],
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
	[-1, -1],
	[1, 1],
	[1, -1],
	[-1, 1]
];

//#endregion
//#region src/auras.ts
/**
* Auras: the top of the ladder, above a Grail. An aura is an effect drawn in
* the empty pixels round a guy, never over him, so it shows on a board row as
* well as on a card, and it moves whenever he does.
*
* About one capsule in a thousand, from any machine, is an aura instead of the
* machine's own item (`AURA_ODDS`). A copy of one has a finish of its own (the
* aura finishes in ./owned), a float and a print like any copy, and here they
* show: a low float is a dense aura, a battered one flickers with gaps, and the
* print sets its timing and which way it turns.
*/
/** One capsule in this many is an aura. */
const AURA_ODDS = 1 / 1e3;
/** A well-mixed number in [0, 1) from integers. */
function noise$1(...n) {
	let h = 2654435769;
	for (const v of n) {
		h = Math.imul(h ^ v, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		h ^= h >>> 16;
	}
	return (h >>> 0) / 4294967296;
}
/** The guy's extent, and the top of each column. */
function shape(mask) {
	const h = mask.length, w = mask[0].length;
	let top = h, bottom = -1, left = w, right = -1;
	const tops = new Array(w).fill(-1);
	mask.forEach((row, y) => row.forEach((on$1, x) => {
		if (!on$1) return;
		top = Math.min(top, y);
		bottom = Math.max(bottom, y);
		left = Math.min(left, x);
		right = Math.max(right, x);
		if (tops[x] < 0) tops[x] = y;
	}));
	return {
		w,
		h,
		top,
		bottom,
		left,
		right,
		tops,
		cx: (left + right) / 2,
		cy: (top + bottom) / 2
	};
}
/** Every empty cell within `reach` of the guy (by steps), with how far it is. */
function ring(mask, reach) {
	const h = mask.length, w = mask[0].length, out = [];
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		if (mask[y][x]) continue;
		let d = Infinity;
		for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (mask[y + dy]?.[x + dx]) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
		if (d <= reach) out.push([
			x,
			y,
			d
		]);
	}
	return out;
}
const plus = (x, y, k, arm = 1) => [
	[
		x,
		y,
		0
	],
	[
		x - arm,
		y,
		k
	],
	[
		x + arm,
		y,
		k
	],
	[
		x,
		y - arm,
		k
	],
	[
		x,
		y + arm,
		k
	]
];
const wrap = (v, n) => (v % n + n) % n;
const AURAS = [
	{
		id: "aura.flames",
		name: "Flames",
		colors: [
			"#FFE27A",
			"#FF8A2B",
			"#E5484D"
		],
		still: 300,
		cells: (mask, t, print) => {
			const s = shape(mask), step = tick(t, 110) + print, out = [];
			s.tops.forEach((top, x) => {
				if (top < 0) return;
				const tall = 1 + Math.floor(noise$1(x, step) * 3.2);
				for (let k = 1; k <= tall; k++) out.push([
					x,
					top - k,
					Math.min(2, k - 1)
				]);
			});
			mask.forEach((row, y) => row.forEach((on$1, x) => {
				if (on$1) {
					for (const dx of [-1, 1]) if (!row[x + dx] && noise$1(x + dx, y, step) > .86) out.push([
						x + dx,
						y - 1,
						1
					]);
				}
			}));
			return out;
		}
	},
	{
		id: "aura.orbit",
		name: "Orbit",
		colors: [
			"#FFFFFF",
			"#FFD45C",
			"#C98A1A"
		],
		still: 900,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], turn = print % 2 ? -1 : 1, rx = Math.min(6.5, s.w / 2 - 1.5);
			for (let i = 0; i < 3; i++) {
				const a = turn * t / wave(560) + i * 2.094 + print;
				out.push(...plus(Math.round(s.w / 2 - .5 + Math.cos(a) * rx), Math.round(s.top + 1 + Math.sin(a) * 1.6), 1));
			}
			return out;
		}
	},
	{
		id: "aura.halo",
		name: "Halo",
		colors: [
			"#FFFFFF",
			"#FFD45C",
			"#B97A10"
		],
		still: 0,
		cells: (mask, t, print) => {
			const s = shape(mask), y = Math.max(1, s.top - 2 - Math.floor((t + print * 7) / steps(400, 2)) % 2), x0 = Math.round(s.cx) - 3, glint$1 = Math.floor(t / steps(160, 8)) % 8, out = [];
			for (let x = x0; x <= x0 + 7; x++) out.push([
				x,
				y,
				x - x0 === glint$1 || x - x0 === glint$1 + 1 ? 0 : 1
			]);
			for (let x = x0 + 1; x <= x0 + 6; x++) out.push([
				x,
				y + 1,
				2
			]);
			return out;
		}
	},
	{
		id: "aura.sparkles",
		name: "Sparkles",
		colors: [
			"#FFFFFF",
			"#FFF3B0",
			"#8FD8FF"
		],
		still: 500,
		cells: (mask, t, print) => {
			const near = ring(mask, 3), out = [];
			for (let i = 0; i < 5; i++) {
				const at = t + i * 173 + print * 11, life = tick(at, 520), phase = cycle(at, 520);
				const [x, y] = near[Math.floor(noise$1(i, life, print) * near.length)] ?? [0, 0];
				out.push(...glint(x, y, phase));
			}
			return out;
		}
	},
	{
		id: "aura.hearts",
		name: "Hearts",
		colors: [
			"#FFC2D4",
			"#FF5C8A",
			"#C2335F"
		],
		still: 700,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], lanes = [
				0,
				s.w - 3,
				Math.round(s.w / 2) - 1
			];
			for (let i = 0; i < 3; i++) {
				const span$1 = i === 2 ? Math.max(3, s.top) : Math.ceil(s.cy) + 1, y = Math.round(span$1 - wrap(Math.floor((t + i * 520 + print * 13) / steps(150, span$1 + 3)), span$1 + 3));
				const x = lanes[i];
				out.push([
					x,
					y,
					1
				], [
					x + 2,
					y,
					1
				], [
					x,
					y + 1,
					1
				], [
					x + 1,
					y + 1,
					0
				], [
					x + 2,
					y + 1,
					1
				], [
					x + 1,
					y + 2,
					2
				]);
			}
			return out;
		}
	},
	{
		id: "aura.bubbles",
		name: "Bubbles",
		colors: [
			"#FFFFFF",
			"#A9E4FF",
			"#3E9BE0"
		],
		still: 400,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 4; i++) {
				const x = [
					0,
					s.w - 3,
					1,
					s.w - 4
				][i], y = s.h - 1 - wrap(Math.floor((t + i * 470 + print * 9) / steps(120, s.h + 3)), s.h + 3);
				const big = i % 2 === 0;
				if (big) out.push([
					x + 1,
					y,
					1
				], [
					x,
					y + 1,
					2
				], [
					x + 2,
					y + 1,
					2
				], [
					x + 1,
					y + 2,
					1
				], [
					x + 1,
					y + 1,
					-1
				]);
				else out.push([
					x,
					y,
					1
				], [
					x + 1,
					y,
					0
				], [
					x,
					y + 1,
					2
				], [
					x + 1,
					y + 1,
					1
				]);
			}
			return out.filter((c) => c[2] >= 0);
		}
	},
	{
		id: "aura.storm",
		name: "Rain cloud",
		colors: [
			"#F4F6FB",
			"#B9C3D6",
			"#4F8BE8"
		],
		still: 600,
		cells: (mask, t, print) => {
			const s = shape(mask), cy = Math.max(1, s.top - 3), x0 = Math.round(s.cx) - 3, out = [];
			for (let x = x0 + 1; x <= x0 + 2; x++) out.push([
				x,
				cy - 2,
				0
			]);
			for (let x = x0; x <= x0 + 5; x++) out.push([
				x,
				cy - 1,
				0
			]);
			for (let x = x0 - 1; x <= x0 + 7; x++) out.push([
				x,
				cy,
				1
			]);
			for (let i = 0; i < 4; i++) {
				const x = x0 + 1 + (i * 2 + print) % 5, fall = wrap(Math.floor((t + i * 230) / steps(90, s.h - cy)), s.h - cy);
				out.push([
					x,
					cy + 1 + fall,
					2
				]);
			}
			return out;
		}
	},
	{
		id: "aura.lightning",
		name: "Lightning",
		colors: [
			"#FFFFFF",
			"#8FD8FF",
			"#7C5CFF"
		],
		still: 200,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], beat = Math.floor((t + print * 31) / steps(110, 15)), flash = beat % 5;
			if (flash === 4) return out;
			for (const [side, x0] of [[0, 1], [1, s.w - 2]]) {
				if ((beat + side) % 3 === 2) continue;
				let x = x0;
				for (let y = 0; y <= s.cy; y++) {
					if (mask[y]?.[x]) break;
					out.push([
						x,
						y,
						flash === 0 ? 0 : 1
					]);
					if ((y + beat + side) % 3 === 0) {
						x += side ? -1 : 1;
						out.push([
							x,
							y,
							2
						]);
					}
				}
			}
			return out;
		}
	},
	{
		id: "aura.notes",
		name: "Music",
		colors: [
			"#FFFFFF",
			"#B9A4FF",
			"#6A4BD8"
		],
		still: 500,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 2; i++) {
				const span$1 = Math.ceil(s.cy) + 4, y = Math.round(s.cy - wrap(Math.floor((t + i * 700 + print * 17) / steps(170, span$1)), span$1));
				const x = (i ? s.w - 4 : 0) + Math.floor(t / steps(340, 2) + i) % 2;
				out.push([
					x + 1,
					y,
					1
				], [
					x + 2,
					y,
					1
				], [
					x + 1,
					y + 1,
					1
				], [
					x + 1,
					y + 2,
					1
				], [
					x,
					y + 3,
					2
				], [
					x + 1,
					y + 3,
					2
				]);
			}
			return out;
		}
	},
	{
		id: "aura.snow",
		name: "Snowfall",
		colors: [
			"#FFFFFF",
			"#DCEEFF",
			"#8FBCE8"
		],
		still: 800,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 12; i++) {
				const fall = wrap(Math.floor((t + i * 311 + print * 7) / steps(170, s.h)), s.h), x = wrap(Math.round(noise$1(i, print) * s.w + Math.sin((t + i * 400) / wave(600)) * 1.2), s.w);
				out.push([
					x,
					fall,
					i % 3 === 0 ? 0 : i % 3
				]);
			}
			return out;
		}
	},
	{
		id: "aura.petals",
		name: "Petals",
		colors: [
			"#FFE4EE",
			"#FF9EC2",
			"#E0558E"
		],
		still: 800,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 8; i++) {
				const fallN = s.h + 2, at = Math.floor((t + i * 377 + print * 5) / steps(150, fallN)), step = wrap(at, fallN), y = step - 1;
				const gen = wrap(Math.floor(at / fallN), Math.round(LOOP_MS / (steps(150, fallN) * fallN)));
				const x = wrap(Math.round(noise$1(i, print, gen) * s.w) - Math.floor(step / 2), s.w);
				out.push([
					x,
					y,
					1
				], [
					x + 1,
					y + i % 2,
					i % 2 ? 2 : 0
				]);
			}
			return out;
		}
	},
	{
		id: "aura.galaxy",
		name: "Galaxy",
		colors: [
			"#FFFFFF",
			"#A88BFF",
			"#5B3FC8"
		],
		still: 600,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], turn = print % 2 ? -1 : 1;
			const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x, y]) => [
				x,
				y,
				Math.atan2(y - s.cy, x - s.cx)
			]).sort((a, b) => a[2] - b[2]);
			const n = track.length;
			for (let i = 0; i < 3 && n; i++) {
				const [x, y] = track[wrap(turn * Math.floor(t / steps(120, n)) + Math.round(i * n / 3) + print * 5, n)];
				for (const [dx, dy, k] of [
					[
						0,
						0,
						1
					],
					[
						1,
						0,
						2
					],
					[
						0,
						1,
						2
					],
					[
						-1,
						0,
						2
					],
					[
						0,
						-1,
						2
					],
					[
						1,
						1,
						2
					]
				]) out.push([
					x + dx,
					y + dy,
					k
				]);
			}
			const far = ring(mask, 4).filter(([, , d]) => d >= 3);
			for (let i = 0; i < 4; i++) {
				const life = fit(900), at = t + i * (life / 4) + print * 31, gen = tick(at, 900), f = cycle(at, 900);
				const [x, y] = far[Math.floor(noise$1(i, gen, print, 23) * far.length)] ?? [0, 0];
				if (f < .75) out.push(...glint(x, y, f / .75));
			}
			return out;
		}
	},
	{
		id: "aura.rainbow",
		name: "Rainbow",
		colors: [
			"#FF6B78",
			"#FFB347",
			"#FFE27A",
			"#7DD87A",
			"#5FB4FF",
			"#B98CFF",
			"#FFFFFF"
		],
		still: 0,
		cells: (mask, t, print) => {
			const s = shape(mask), cx = s.w / 2 - .5, cy = s.cy + 2, top = Math.max(0, s.top - 4), out = [];
			const glint$1 = wrap(Math.floor((t + print * 40) / steps(70, 40)), 40) - 6;
			for (let y = top; y < cy; y++) for (let x = 0; x < s.w; x++) {
				const d = Math.hypot((x - cx) / (s.w / 2), (y - cy) / (cy - top));
				if (d < .74 || d > 1) continue;
				const band = Math.min(5, Math.floor((1 - d) / .0435));
				const along = Math.round(Math.atan2(cy - y, x - cx) / Math.PI * 30);
				out.push([
					x,
					y,
					Math.abs(along - glint$1) <= 1 && band % 2 === 0 ? 6 : band
				]);
			}
			for (const fx of [0, s.w - 3]) for (const [dx, dy] of [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1]
			]) out.push([
				fx + dx,
				cy - 1 + dy,
				6
			]);
			return out;
		}
	},
	{
		id: "aura.glitch",
		name: "Glitch",
		colors: [
			"#FFFFFF",
			"#2EF2FF",
			"#FF3DCB"
		],
		still: 260,
		cells: (mask, t, print) => {
			const step = tick(t + print * 13, 120), out = [];
			mask.forEach((row, y) => {
				if (noise$1(y, step, print) < .55) return;
				const shove = noise$1(y, step, 2) < .5 ? 1 : 2;
				row.forEach((on$1, x) => {
					if (!on$1) return;
					if (!row[x - 1]) out.push([
						x - shove,
						y,
						1
					]);
					if (!row[x + 1]) out.push([
						x + shove,
						y,
						2
					]);
				});
			});
			return out;
		}
	},
	{
		id: "aura.fireflies",
		name: "Fireflies",
		colors: [
			"#FFFDE0",
			"#FFE45C",
			"#9ED45A"
		],
		still: 450,
		cells: (mask, t, print) => {
			const near = ring(mask, 3), out = [];
			for (let i = 0; i < 8; i++) {
				const [ax, ay] = near[Math.floor(noise$1(i, print, 3) * near.length)] ?? [0, 0];
				const x = ax + Math.round(Math.sin(t / wave(700) + i * 1.7) * 1.5), y = ay + Math.round(Math.cos(t / wave(900) + i * 2.3));
				const phase = cycle(t + i * 397 + print * 29, 1600);
				if (phase > .65) continue;
				out.push(...phase > .15 && phase < .45 ? plus(x, y, 2) : [[
					x,
					y,
					1
				]]);
			}
			return out;
		}
	},
	{
		id: "aura.neon",
		name: "Neon",
		colors: [
			"#FFE3F4",
			"#FF3FA4",
			"#8A1F62"
		],
		still: 300,
		cells: (mask, t, print) => {
			const s = shape(mask), beat = tick(t + print * 53, 90), n = Math.round(LOOP_MS / fit(90));
			const since = Math.min(...[1, 2].map((k) => wrap(beat - Math.floor(noise$1(print, k) * n), n)));
			const off = since === 2 || since === 4, dim = since <= 5 && !off;
			const stretch = Math.floor(noise$1(print, 3) * 4);
			return ring(mask, 2).flatMap(([x, y, d]) => {
				if (off) return d === 1 ? [[
					x,
					y,
					2
				]] : [];
				const quarter = Math.floor(wrap(Math.atan2(y - s.cy, x - s.cx) / TAU + .5, 1) * 4);
				if (dim && quarter === stretch) return d === 1 ? [[
					x,
					y,
					1
				]] : [];
				return [[
					x,
					y,
					d === 1 ? 0 : 1
				]];
			});
		}
	},
	{
		id: "aura.echo",
		name: "Echo",
		colors: [
			"#EDE4FF",
			"#9B7CFF",
			"#3B2A73"
		],
		still: 400,
		cells: (mask, t, print) => {
			const sway = Math.round((Math.sin((t + print * 41) / wave(380)) + 1) * 1.2) + 1, out = [];
			mask.forEach((row, y) => row.forEach((on$1, x) => {
				if (!on$1) return;
				const edge = !mask[y - 1]?.[x];
				out.push([
					x - sway,
					y - 1,
					edge ? 1 : 2
				], [
					x + sway,
					y - 1,
					edge ? 1 : 2
				]);
			}));
			return out;
		}
	},
	{
		id: "aura.comet",
		name: "Comet",
		colors: [
			"#FFFFFF",
			"#8FE3FF",
			"#4A6BD8"
		],
		still: 300,
		cells: (mask, t, print) => {
			const s = shape(mask), turn = print % 2 ? -1 : 1;
			const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x$1, y$1]) => [
				x$1,
				y$1,
				Math.atan2(y$1 - s.cy, x$1 - s.cx)
			]).sort((p, q) => p[2] - q[2]);
			if (!track.length) return [];
			const n = track.length, head$1 = wrap(turn * Math.floor(t / steps(45, n)) + print * 7, n), out = [];
			for (let j = 10; j >= 1; j--) {
				const [x$1, y$1] = track[wrap(head$1 - turn * j, n)];
				out.push([
					x$1,
					y$1,
					j < 3 ? 0 : j < 6 ? 1 : 2
				]);
			}
			const [x, y] = track[head$1];
			out.push(...plus(x, y, 1));
			return out;
		}
	},
	{
		id: "aura.butterflies",
		name: "Butterflies",
		colors: [
			"#FFF5D6",
			"#FF9F43",
			"#8A4DFF"
		],
		still: 0,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 2; i++) {
				const side = i ? 1 : -1, x = Math.round(s.w / 2 - .5 + side * (s.w / 2 - 2.5) + Math.sin(t / wave(800) + i * 3 + print) * 1.2);
				const y = Math.round(Math.max(2, s.top) + Math.sin(t / wave(520) + i * 2.1 + print) * 1.5 + i * 3);
				out.push([
					x,
					y,
					0
				], [
					x,
					y + 1,
					0
				]);
				if (Math.floor((t + i * 60) / steps(140, 2)) % 2 === 0) for (const d of [-1, 1]) out.push([
					x + d,
					y - 1,
					1
				], [
					x + 2 * d,
					y - 1,
					1
				], [
					x + d,
					y,
					1
				], [
					x + 2 * d,
					y,
					2
				], [
					x + d,
					y + 1,
					2
				], [
					x + d,
					y + 2,
					2
				]);
				else for (const d of [-1, 1]) out.push([
					x + d,
					y - 1,
					1
				], [
					x + d,
					y - 2,
					1
				], [
					x + d,
					y,
					2
				]);
			}
			return out;
		}
	},
	{
		id: "aura.aurora",
		name: "Aurora",
		colors: [
			"#F2FFF8",
			"#46F0B4",
			"#2BB59A",
			"#8A6BFF"
		],
		still: 700,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], d = print % 2 ? 1 : -1;
			const fold = wrap((t + print * 90) / steps(90, s.w + 10), s.w + 10) - 5;
			for (let x = 0; x < s.w; x++) {
				const hem = Math.round(3.4 + Math.sin(x * .42 + d * t / wave(520) + print) * 1.3 + Math.sin(x * 1.1 - t / wave(330)) * .6);
				const ray = Math.sin(x * 1.25 + d * t / wave(260) + print * .7);
				for (let y = 0; y <= hem; y++) {
					const up = hem - y;
					if (ray < -.2 && up > 1) continue;
					const k = up === 0 ? Math.abs(x - fold) < 1.5 ? 0 : 1 : up === 1 ? ray > .5 ? 1 : 2 : up === 2 ? 2 : 3;
					out.push([
						x,
						y,
						k
					]);
				}
			}
			for (let i = 0; i < 2; i++) {
				const x = Math.floor(noise$1(i, print, 41) * s.w);
				if (Math.sin(t / wave(240) + i * 2.1) > .3) out.push([
					x,
					0,
					0
				]);
			}
			return out;
		}
	},
	{
		id: "aura.datarain",
		name: "Data rain",
		colors: [
			"#E6FFE9",
			"#3CFF6B",
			"#159A3C"
		],
		still: 500,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let x = 0; x < s.w; x++) {
				if (noise$1(x, print, 11) < .15) continue;
				const speed = 40 + Math.floor(noise$1(x, print, 12) * 50), len = 6 + Math.floor(noise$1(x, print, 13) * 4);
				const head$1 = wrap(Math.floor((t + noise$1(x, print) * 3e3) / steps(speed, s.h + len + 2)), s.h + len + 2) - 1;
				for (let j = 0; j < len; j++) {
					const glyph = noise$1(x, head$1 - j, tick(t, 160)) > .82;
					out.push([
						x,
						head$1 - j,
						j === 0 ? 0 : glyph ? 0 : j < len / 2 ? 1 : 2
					]);
				}
			}
			return out;
		}
	},
	{
		id: "aura.vortex",
		name: "Vortex",
		colors: [
			"#FFFFFF",
			"#5FD3FF",
			"#3A3FD9"
		],
		still: 300,
		cells: (mask, t, print) => {
			const s = shape(mask), turn = print % 2 ? -1 : 1, out = [];
			for (const [x, y, d] of ring(mask, 4)) {
				const a = Math.atan2(y - s.cy, x - s.cx) / (2 * Math.PI), r = Math.hypot(x - s.cx, y - s.cy);
				const v = wrap(a * 3 + r * .3 - turn * t / fit(700) + print * .1, 1);
				if (v < .24) out.push([
					x,
					y,
					v < .08 ? 0 : d <= 2 ? 1 : 2
				]);
			}
			return out;
		}
	},
	{
		id: "aura.fireworks",
		name: "Fireworks",
		colors: [
			"#FFFFFF",
			"#FF5C8A",
			"#FFD45C"
		],
		still: 650,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 2; i++) {
				const cycle$1 = fit(1500), local = wrap(t + i * 750 + print * 37, cycle$1), shot = tick(t + i * 750 + print * 37, 1500);
				const cx = i ? s.w - 3 - Math.floor(noise$1(shot, i) * 2) : 2 + Math.floor(noise$1(shot, i) * 2), cy = 2 + Math.floor(noise$1(shot, i, 2) * 3), p = local / cycle$1;
				if (p < .2) {
					const y = Math.round(cy + (1 - p / .2) * 6);
					out.push([
						cx,
						y,
						0
					], [
						cx,
						y + 1,
						2
					]);
					continue;
				}
				if (p > .85) continue;
				const r = Math.min(3, 1 + Math.floor((p - .2) / .14)), k = p < .45 ? 0 : p < .65 ? 1 : 2;
				out.push([
					cx,
					cy,
					k
				]);
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
					[1, 1],
					[-1, 1],
					[1, -1],
					[-1, -1]
				]) {
					const reach = dx && dy ? Math.max(1, r - 1) : r;
					out.push([
						cx + dx * reach,
						cy + dy * reach,
						k
					], ...r > 1 && k < 2 ? [[
						cx + dx * (reach - 1),
						cy + dy * (reach - 1),
						2
					]] : []);
				}
			}
			return out;
		}
	},
	{
		id: "aura.ripple",
		name: "Ripple",
		colors: [
			"#FFFFFF",
			"#A6EEFF",
			"#4FB8F2",
			"#2F6FC8"
		],
		still: 250,
		cells: (mask, t, print) => {
			const out = [], reach = 6;
			const h = mask.length, w = mask[0].length;
			const p = cycle(t + print * 23, 1600), rings = [p, wrap(p + .5, 1)].map((q) => .8 + q * reach);
			for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
				if (mask[y][x]) continue;
				let d = Infinity;
				for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (mask[y + dy]?.[x + dx]) d = Math.min(d, Math.hypot(dx, dy));
				for (const r of rings) {
					if (Math.abs(d - r) > .5) continue;
					const k = r < 2.2 ? 1 : r < 3.8 ? 2 : 3;
					if (k === 3 && (x + y) % 2) continue;
					if (r < 1.6 && (x + y + tick(t, 200)) % 2) continue;
					out.push([
						x,
						y,
						k === 1 && noise$1(x, y, tick(t, 400)) > .86 ? 0 : k
					]);
				}
			}
			return out;
		}
	}
];
/**
* Auras no capsule gives: the founder's Origin, a gold halo with stars going
* round him and a shimmer in every colour. One of one.
*/
const ONE_OF_ONE_AURAS = [{
	id: "aura.origin",
	name: "Origin",
	colors: [
		"#FFFFFF",
		"#FFD45C",
		"#B97A10"
	],
	still: 900,
	cells: (mask, t, print) => [...AURAS.find((a) => a.id === "aura.halo").cells(mask, t, print), ...AURAS.find((a) => a.id === "aura.orbit").cells(mask, t, print)]
}];
const byId$1 = new Map([...AURAS, ...ONE_OF_ONE_AURAS].map((a) => [a.id, a]));
const auraById = (id) => id ? byId$1.get(id) : void 0;
/**
* How much an aura copy does on top of its aura, by how rare its finish is
* among auras: 0 for Classic (half of all auras) up to 4 for Black pearl
* (three in a thousand); Origin, one of one, is 5 whatever its finish.
*/
const INTENSITY = {
	classic: 0,
	fade: 1,
	frost: 1,
	toxic: 2,
	shadow: 2,
	sapphire: 3,
	ruby: 3,
	pearl: 4
};
function auraIntensity(id, finish) {
	if (ONE_OF_ONE_AURAS.some((a) => a.id === id)) return 5;
	return INTENSITY[finish ?? "classic"] ?? 0;
}
const TAU = Math.PI * 2;
/**
* Points round the guy on a squarish ellipse, `gx` cells clear of his sides
* and `gy` of his top and foot, in order: where a rarer aura's pieces ride.
*/
function loop(s, gx, gy) {
	const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps$1 = 720;
	const pts = [];
	for (let i = 0; i < steps$1; i++) {
		const a = i / steps$1 * TAU, c = Math.cos(a), sn = Math.sin(a);
		const x = Math.round(s.cx + rx * Math.sign(c) * Math.abs(c) ** .6), y = Math.round(s.cy + ry * Math.sign(sn) * Math.abs(sn) ** .6);
		const last = pts[pts.length - 1];
		if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
	}
	return pts;
}
/** A 2x2 orb: a bright corner, two mid, one deep. */
const orb = (x, y) => [
	[
		x,
		y,
		0
	],
	[
		x + 1,
		y,
		1
	],
	[
		x,
		y + 1,
		1
	],
	[
		x + 1,
		y + 1,
		2
	]
];
/** A sparkle (./sparkle) as aura cells: its heart, arms and edges are the aura's colours 0, 1 and 2. */
const glint = (x, y, f) => sparkleAt(f).map(([dx, dy, k]) => [
	x + dx,
	y + dy,
	k
]);
/**
* What a rarer aura adds round the guy, in chunky pieces at his own pixel
* size (no thin lines: a one-pixel line reads as drawn, not as pixel art):
* a sparkle opening now and then a few cells out (1), two orbs circling him
* (2), more of both (3, 4, and Origin's 5). Pieces may sit past the frame's
* sides when `mask` is padded, so a card shows them whole.
*/
function extras(mask, t, print, level) {
	if (level <= 0) return [];
	const s = shape(mask), out = [], phase = noise$1(print, 3);
	const gy = Math.min(2, s.top), inner = loop(s, 3, gy), near = loop(s, 4, gy);
	const runs = [
		0,
		1,
		1,
		2,
		2,
		3
	][level], life = fit(1300);
	for (let i = 0; i < runs; i++) {
		const at = t + i * life / runs + print * 29, gen = tick(at, 1300), f = cycle(at, 1300) / .55;
		const [x, y] = near[Math.floor(noise$1(i, gen, print, 41) * near.length)];
		if (f < 1) out.push(...glint(x, y, f));
	}
	const orbs = [
		0,
		0,
		2,
		2,
		3,
		3
	][level];
	for (let i = 0; i < orbs; i++) {
		const n = inner.length, [x, y] = inner[wrap(Math.floor(t / steps(26, n)) + Math.round(i * n / orbs + phase * n), n)];
		out.push(...orb(x - 1, y - 1));
	}
	return out;
}
/**
* An aura's cells round `mask` at `t`, only in empty pixels, thinned by the
* copy's float: a Box Fresh aura is whole, a battered one flickers with gaps.
* A rarer finish adds more (`extras`). With `pad`, those extras may spread
* that many columns past either side of the frame (x from -pad to
* width + pad - 1), for a picture with room round the guy, like a card.
*/
function auraCells(id, mask, t, copy, pad = 0) {
	const aura = auraById(id);
	if (!aura) return [];
	const h = mask.length, w = mask[0].length, print = copy?.print ?? 0, scuff = copy?.scuff ?? 0;
	const seen = new Set(), step = tick(t, 150);
	const wide = pad ? mask.map((row) => [
		...new Array(pad).fill(false),
		...row,
		...new Array(pad).fill(false)
	]) : mask;
	const more = extras(wide, t, print, auraIntensity(id, copy?.finish)).map(([x, y, k]) => [
		x - pad,
		y,
		k
	]);
	const cells = [...aura.cells(mask, t, print), ...more];
	return cells.map(([x, y, k]) => [
		Math.round(x),
		Math.round(y),
		k
	]).filter(([x, y]) => {
		if (x < -pad || y < 0 || x >= w + pad || y >= h || mask[y]?.[x] || seen.has(y * (w + 2 * pad) + x + pad)) return false;
		seen.add(y * (w + 2 * pad) + x + pad);
		return noise$1(x, y, step, print, 7) >= scuff * .45;
	});
}
/** Each aura finish's three colours, brightest first; Classic keeps the aura's own. */
const RAMPS = {
	frost: [
		"#FFFFFF",
		"#BFE8FF",
		"#6FB4F2"
	],
	toxic: [
		"#F2FF9A",
		"#7DFF4F",
		"#1FA84A"
	],
	shadow: [
		"#EEE8FF",
		"#A08AF2",
		"#6B54C9"
	],
	sapphire: [
		"#E6F0FF",
		"#5C8DFF",
		"#2F5DE6"
	],
	ruby: [
		"#FFE3EA",
		"#FF5279",
		"#CF1F48"
	],
	pearl: [
		"#F6F0FF",
		"#CDBEFF",
		"#9A86E0"
	]
};
const FADE = [
	"#FFE07A",
	"#FF6FB5",
	"#7C5CFF"
];
/**
* Neon is one colour a copy: the finish's own (Frost ice blue, Toxic acid
* green and so on), or for Classic, Fade and Black pearl one the print deals
* from a sign maker's tubes. Its core, its colour, and the bare glass when it
* flickers off.
*/
const NEON_TUBES = {
	classic: [
		"#FF3FA4",
		"#2FD9FF",
		"#FF5A3C",
		"#B45CFF",
		"#3DFF8F",
		"#FFC23A"
	],
	fade: [
		"#FF6A4D",
		"#FF4F9A",
		"#FFB23A"
	],
	frost: ["#7FD8FF"],
	toxic: ["#9DFF3A"],
	shadow: ["#9A6BFF"],
	sapphire: ["#3D7BFF"],
	ruby: ["#FF2D55"],
	pearl: [
		"#C9A2FF",
		"#FF9EC9",
		"#7FF5D2"
	]
};
function neonRamp(finish, print) {
	const tubes = NEON_TUBES[finish] ?? NEON_TUBES.classic, c = tubes[print % tubes.length];
	const rgb$3 = [
		1,
		3,
		5
	].map((i) => parseInt(c.slice(i, i + 2), 16));
	const to = (target, a) => "#" + rgb$3.map((v) => Math.round(v + (target - v) * a).toString(16).padStart(2, "0")).join("").toUpperCase();
	return [
		to(255, .35),
		to(15, .38),
		to(25, .72)
	];
}
const hsl = (h, s, l) => {
	const f = (n) => {
		const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
		return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
	};
	return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};
/**
* The colour of one aura cell in a finish. Fade runs its sunset down the aura
* and drifts; the Deep sea finishes glint; Black pearl glints in every colour.
*/
function auraColor(id, k, finish, x, y, t, print = 0) {
	const aura = auraById(id);
	if (!aura) return "#FFFFFF";
	if (id === "aura.neon") return neonRamp(finish, print)[Math.min(2, k)];
	const sweep = wrap(x + y * .7 - t / steps(55, 26), 26) < 1.6;
	if (ONE_OF_ONE_AURAS.includes(aura)) {
		if (sweep) return hsl(wrap((x + y) * 18 + t * 360 / fit(2160), 360), .9, .78);
		return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	}
	if (finish === "fade") {
		const i = wrap(Math.floor((y + x * .5 + t / steps(140, 6)) / 2), 3);
		return k === 0 ? "#FFFFFF" : FADE[(i + k) % 3];
	}
	const ramp = RAMPS[finish];
	if (!ramp) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	if (finish === "pearl") return hsl(wrap(275 + 55 * Math.sin((x + y) * .35 + t / wave(520)), 360), .5, sweep ? .93 : [
		.86,
		.76,
		.66
	][Math.min(2, k % 3)]);
	if (sweep && (finish === "sapphire" || finish === "ruby")) return ramp[0];
	return ramp[Math.min(2, k % 3)];
}

//#endregion
//#region src/effects.ts
const EFFECTS = {
	shimmer: {
		name: "Shimmer",
		what: "Glints race across it.",
		item: 25,
		aura: 5
	},
	pulse: {
		name: "Pulse",
		what: "It breathes, brightening and dimming.",
		item: 60,
		aura: 10
	},
	holo: {
		name: "Holo",
		what: "A rainbow sheen sweeps across it, like foil.",
		item: 150,
		aura: 25
	},
	neon: {
		name: "Neon",
		what: "A buzzing neon edge runs round it, changing colour.",
		item: 250,
		aura: 30
	},
	bubbles: {
		name: "Bubbles",
		what: "Bubbles wobble up off it.",
		item: 350,
		aura: 40
	},
	hearts: {
		name: "Hearts",
		what: "Little hearts float up off it.",
		item: 500,
		aura: 60
	},
	chroma: {
		name: "Chroma",
		what: "Its colours cycle round the rainbow.",
		item: 600,
		aura: 80
	},
	rime: {
		name: "Rime",
		what: "Frost creeps over it from the edges and melts away.",
		item: 800,
		aura: 100
	},
	embers: {
		name: "Embers",
		what: "Sparks drift up off it.",
		item: 1e3,
		aura: 150
	},
	static: {
		name: "Static",
		what: "It glitches: rows slip sideways and its colours split.",
		item: 1200,
		aura: 200
	},
	lava: {
		name: "Lava",
		what: "Molten light flows up through it under a dark crust.",
		item: 1800,
		aura: 300
	},
	starlight: {
		name: "Starlight",
		what: "Stars twinkle inside it, like a night sky.",
		item: 2500,
		aura: 400
	},
	electric: {
		name: "Electric",
		what: "Lightning crackles round it and it flashes white.",
		item: 4e3,
		aura: 600
	}
};
const FX_IDS = Object.keys(EFFECTS);
/** The effect a uniform number in [0, 1) gives, rarest checked first, or none. */
function rollFx(u, aura) {
	let edge = 0;
	for (const id of [...FX_IDS].reverse()) {
		edge += 1 / EFFECTS[id][aura ? "aura" : "item"];
		if (u < edge) return id;
	}
	return void 0;
}
const rgb$2 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$3 = (a, b, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b[i] - a[i]) * t);
const WHITE = [
	255,
	255,
	255
];
function noise(...n) {
	let h = 2654435769;
	for (const v of n) {
		h = Math.imul(h ^ v, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		h ^= h >>> 16;
	}
	return (h >>> 0) / 4294967296;
}
const hue = (h, s = .9, l = .65) => {
	const f = (n) => {
		const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
		return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
	};
	return [
		f(0),
		f(8),
		f(4)
	];
};
/** One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two copies move together. */
function fxColor(color, fx, x, y, t, print = 0) {
	const c = rgb$2(color), tt = t + print * 37;
	switch (fx) {
		case "shimmer": {
			const at = cycle(tt, 900) * 34 - 8;
			for (const band of [at, at - 14]) {
				const d = x + y - band;
				if (d >= 0 && d < 1.5) return "#FFFFFF";
				if (d >= -1.5 && d < 0) return hex$1(mix$3(c, [
					150,
					220,
					255
				], .75));
			}
			return noise(x, y, tick(tt, 140)) > .94 ? "#FFFFFF" : color;
		}
		case "pulse": {
			const b = Math.sin(tt / wave(260));
			return hex$1(mix$3(c, b > 0 ? WHITE : [
				0,
				0,
				0
			], (b > 0 ? .45 : .14) * Math.abs(b)));
		}
		case "holo": return hex$1(mix$3(c, hue(((x * 22 + y * 14 + tt * 360 / fit(1800)) % 360 + 360) % 360), .45));
		case "chroma": {
			const h = ((tt * 360 / fit(2520) + (x + y) * 14) % 360 + 360) % 360, l = (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;
			return hex$1(mix$3(c, hue(h, .95, Math.min(.78, Math.max(.32, l))), .78));
		}
		case "starlight": {
			const night = mix$3(mix$3(c, [
				24,
				18,
				66
			], .6), [
				110,
				70,
				220
			], .16 * (1 + Math.sin(tt / wave(700) + x * .5 + y * .3)));
			return noise(x, y, print) > .93 ? hex$1(mix$3(night, [
				210,
				200,
				255
			], .55)) : hex$1(night);
		}
		case "embers": return hex$1(mix$3(c, [
			255,
			120,
			40
		], .16 + .14 * Math.max(0, Math.sin(tt / wave(140) + x * 1.3 - y * .8))));
		case "neon": return hex$1(mix$3(c, hue((tt * 360 / fit(5040) % 360 + 360) % 360, 1, .62), .2 + .08 * Math.sin(tt / wave(380))));
		case "bubbles": return hex$1(mix$3(c, [
			190,
			235,
			255
		], .1 + .08 * Math.sin(tt / wave(300) + y)));
		case "hearts": return hex$1(mix$3(c, [
			255,
			140,
			190
		], .14 + .08 * Math.sin(tt / wave(400) + x * .5)));
		case "rime": {
			const reach = .5 + .5 * Math.sin(tt / wave(900) - y * .35);
			const n = noise(x, y, tick(tt, 400), print);
			if (reach > .35 && n > .72) return n > .9 ? "#FFFFFF" : "#DDF4FF";
			return hex$1(mix$3(c, [
				190,
				228,
				255
			], .3 + .5 * reach));
		}
		case "static": {
			const roll$1 = cycle(tt, 70 * 24) * 24 - 4, burst = noise(tick(tt, 90), print, 7) > .62;
			if (burst) {
				const r = noise(x, y, tick(tt, 60));
				return r > .8 ? "#FFFFFF" : hex$1(mix$3(c, r > .45 ? [
					255,
					60,
					90
				] : [
					60,
					200,
					255
				], .55));
			}
			if (Math.abs(y - roll$1) < 1) return hex$1(mix$3(c, WHITE, .45));
			return y % 2 ? hex$1(mix$3(c, [
				0,
				0,
				0
			], .16)) : color;
		}
		case "lava": {
			const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * .9 + tt / wave(700)) * 2);
			const crust = mix$3(c, [
				40,
				18,
				12
			], .55);
			return flow > .55 ? hex$1(mix$3([
				255,
				120,
				30
			], [
				255,
				230,
				120
			], (flow - .55) * 2.2)) : flow > .25 ? hex$1(mix$3(crust, [
				220,
				70,
				20
			], .6)) : hex$1(crust);
		}
		case "electric": {
			const flash = noise(tick(tt, 120), print, 11) > .8;
			if (flash) return hex$1(mix$3(c, WHITE, .7));
			const vein = Math.abs(Math.sin(x * 1.7 + y * .9 + tt / wave(90))) > .93;
			return vein ? hex$1(mix$3(c, [
				200,
				240,
				255
			], .75)) : hex$1(mix$3(c, [
				110,
				180,
				255
			], .22));
		}
	}
}
/** Under this many cells a copy is small: its effect is pushed harder and glows round it. */
const SMALL_COPY = 80;
/** An effect that darkens an item; on a small copy it keeps more of the item's colour. */
const DARKENS = ["starlight"];
/** Offsets within two cells, nearest first. */
const NEAR2 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[-1, 1],
	[1, -1],
	[-1, -1],
	[2, 0],
	[-2, 0],
	[0, 2],
	[0, -2]
];
/** Effects that already draw round the item, so no halo. */
const OWN_EDGE = [
	"neon",
	"bubbles",
	"hearts",
	"embers",
	"electric",
	"rime",
	"starlight"
];
/** The aura's slot in a frame (FRAME_SLOTS order, from 1). */
const AURA_SLOT = 5;
/** A cross: a centre and its four neighbours. */
const cross = (a, b) => [
	[
		0,
		0,
		a
	],
	[
		1,
		0,
		b
	],
	[
		-1,
		0,
		b
	],
	[
		0,
		1,
		b
	],
	[
		0,
		-1,
		b
	]
];
/**
* What an effect looks like round an aura's wearer, in chunky pieces at his
* pixel size, `f` (0 to 1) through each piece's life: what makes an aura with
* an effect look special at a glance, not only recoloured.
*/
function signature(fx, f, t, i) {
	const rainbow = (o) => hex$1(hue(((t * 360 / fit(2880) + i * 90 + o) % 360 + 360) % 360, 1, .62));
	switch (fx) {
		case "shimmer": return {
			cells: f < .3 || f > .7 ? [[
				0,
				0,
				"#FFFFFF"
			]] : cross("#FFFFFF", "#CDEBFF"),
			rise: 0
		};
		case "pulse": {
			const on$1 = Math.sin(t / wave(260)) > 0;
			return {
				cells: [
					[
						0,
						0,
						on$1 ? "#FFFFFF" : "#C9B8FF"
					],
					[
						1,
						0,
						on$1 ? "#C9B8FF" : "#8E72FF"
					],
					[
						0,
						1,
						on$1 ? "#C9B8FF" : "#8E72FF"
					],
					[
						1,
						1,
						"#8E72FF"
					]
				],
				rise: 0
			};
		}
		case "holo":
		case "chroma": return {
			cells: cross(rainbow(0), rainbow(60)),
			rise: 0
		};
		case "neon": return {
			cells: cross("#FFFFFF", rainbow(0)),
			rise: 0
		};
		case "bubbles": return {
			cells: [
				[
					0,
					0,
					"#FFFFFF"
				],
				[
					1,
					0,
					"#9ED8FF"
				],
				[
					0,
					1,
					"#9ED8FF"
				],
				[
					1,
					1,
					"#5FB8F0"
				]
			],
			rise: 6
		};
		case "hearts": return {
			cells: [
				[
					-1,
					-1,
					"#FF8FBE"
				],
				[
					1,
					-1,
					"#FF8FBE"
				],
				[
					-1,
					0,
					"#FF5C9A"
				],
				[
					0,
					0,
					"#FF5C9A"
				],
				[
					1,
					0,
					"#FF5C9A"
				],
				[
					0,
					1,
					"#E0457F"
				]
			],
			rise: 5
		};
		case "rime": return {
			cells: [
				...cross("#FFFFFF", "#BFE6FF"),
				[
					-1,
					-1,
					"#E6F6FF"
				],
				[
					1,
					1,
					"#E6F6FF"
				],
				[
					1,
					-1,
					"#E6F6FF"
				],
				[
					-1,
					1,
					"#E6F6FF"
				]
			].filter((_, k) => f > .3 && f < .7 || k < 5),
			rise: -3
		};
		case "embers": return {
			cells: [[
				0,
				0,
				f < .5 ? "#FFF2A8" : "#FF7A1A"
			], [
				0,
				1,
				f < .5 ? "#FFC53D" : "#C2412E"
			]],
			rise: 7
		};
		case "static": return {
			cells: f % .25 < .12 ? [
				[
					0,
					0,
					"#FF3D6E"
				],
				[
					1,
					0,
					"#FF3D6E"
				],
				[
					2,
					0,
					"#3DD8FF"
				]
			] : [[
				0,
				0,
				"#3DD8FF"
			], [
				-1,
				0,
				"#FFFFFF"
			]],
			rise: 0
		};
		case "lava": return {
			cells: [
				[
					0,
					0,
					"#FFE27A"
				],
				[
					1,
					0,
					"#FF8A2B"
				],
				[
					0,
					1,
					"#FF8A2B"
				],
				[
					1,
					1,
					"#C2412E"
				]
			],
			rise: 4
		};
		case "starlight": return {
			cells: f > .35 && f < .65 ? [
				...cross("#FFFFFF", "#C9BEFF"),
				[
					2,
					0,
					"#8E72FF"
				],
				[
					-2,
					0,
					"#8E72FF"
				],
				[
					0,
					2,
					"#8E72FF"
				],
				[
					0,
					-2,
					"#8E72FF"
				]
			] : cross("#FFFFFF", "#8E72FF"),
			rise: 0
		};
		case "electric": return {
			cells: f % .3 < .15 ? [
				[
					0,
					0,
					"#FFFFFF"
				],
				[
					1,
					1,
					"#7FE8FF"
				],
				[
					0,
					2,
					"#FFFFFF"
				],
				[
					1,
					3,
					"#7FE8FF"
				]
			] : [],
			rise: 0
		};
	}
}
/**
* Applies the effects of the copies a frame shows: `slots` says which slot
* each pixel belongs to (1 skin, 2 hat, 3 frame, 4 buddy, 5 aura, as in
* `FRAME_SLOTS`), `copies` the copy in each slot. Some effects also draw in
* the empty pixels round their copy: bubbles, hearts and embers rise off it,
* a neon tube and electric bolts run round it.
*
* On an aura the effect is an accent, not a flood: the aura's own pieces take
* it, nothing is drawn round its scattered cells, and its signature (hearts,
* bubbles, sparks, a strike) rises off it more sparingly than off an item.
*/
function applyFx(colors, slots, copies, t) {
	if (!copies.some((o) => o?.fx)) return colors;
	const out = colors.map((row) => [...row]);
	const H = out.length, W = out[0].length;
	const empty = (x, y) => y >= 0 && y < H && x >= 0 && x < W && !out[y][x];
	const put = (x, y, c) => {
		if (empty(x, y)) out[y][x] = c;
	};
	const size = copies.map((_, k) => slots.reduce((n, row) => n + row.filter((s) => s === k + 1).length, 0));
	const small = (k) => k + 1 !== AURA_SLOT && size[k] > 0 && size[k] < SMALL_COPY;
	slots.forEach((row, y) => row.forEach((s, x) => {
		const o = copies[s - 1];
		if (!s || !o?.fx || !colors[y][x]) return;
		const fx = fxColor(colors[y][x], o.fx, x, y, t, o.print);
		const a = rgb$2(colors[y][x]), b = rgb$2(fx);
		if (s === AURA_SLOT) {
			out[y][x] = fx;
			return;
		}
		if (!small(s - 1)) {
			out[y][x] = fx;
			return;
		}
		out[y][x] = hex$1(DARKENS.includes(o.fx) ? mix$3(a, b, .42) : mix$3(a, b, 1.5));
	}));
	copies.forEach((o, k) => {
		if (!o?.fx || !small(k) || OWN_EDGE.includes(o.fx)) return;
		const beat = tick(t + o.print * 37, 140);
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s || colors[y][x]) return;
			const from = NEAR2.find(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1);
			if (!from || noise(x, y, beat, o.print, 17) > .4) return;
			out[y][x] = hex$1(mix$3(rgb$2(out[y + from[1]][x + from[0]]), WHITE, .15));
		}));
	});
	const cellsOf = (k) => {
		const c = [];
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && colors[y][x]) c.push([x, y]);
		}));
		return c;
	};
	const dark = (c) => !!c && rgb$2(c).reduce((a, v) => a + v, 0) < 240;
	const edgeOf = (k) => {
		const outside = slots.map((row) => row.map(() => false)), queue = [];
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && slots[y][x] !== k + 1) {
			outside[y][x] = true;
			queue.push([x, y]);
		}
		while (queue.length) {
			const [x, y] = queue.pop();
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const nx = x + dx, ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= W || ny >= H || outside[ny][nx] || slots[ny][nx] === k + 1) continue;
				if (out[ny][nx] && slots[ny][nx] && !dark(colors[ny][nx])) continue;
				outside[ny][nx] = true;
				queue.push([nx, ny]);
			}
		}
		const cells = [];
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s || !outside[y][x]) return;
			if ([
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].some(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1)) cells.push([x, y]);
		}));
		return cells;
	};
	const depth = (k) => {
		const d = new Map(), own$1 = cellsOf(k), mine = new Set(own$1.map(([x, y]) => y * W + x));
		for (const [x, y] of own$1) {
			let best = 9;
			for (let r = 1; r < 9 && best === 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && !mine.has((y + dy) * W + x + dx)) best = Math.min(best, r);
			d.set(y * W + x, best);
		}
		return d;
	};
	const risers = (o, k, spacing, rise, share, draw) => {
		const tops = new Map();
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && colors[y][x] && !tops.has(x)) tops.set(x, y);
		}));
		for (const [x, top] of tops) {
			if (noise(x, o.print, 5) > share) continue;
			const step = wrap$1(Math.floor((t + noise(x, o.print) * 4e3) / steps(spacing, rise + 3)), rise + 3);
			if (step < rise) draw(x + (Math.floor(step / 2) % 2 ? 1 : 0), top - 1 - step, step);
		}
	};
	copies.forEach((o, k) => {
		if (!o?.fx) return;
		const tt = t + o.print * 37, aura = k + 1 === AURA_SLOT;
		if (o.fx === "pulse" && !aura) {
			const breath = Math.sin(tt / wave(260));
			if (breath > .2) for (const [x, y] of cellsOf(k)) for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) put(x + dx, y + dy, hex$1(mix$3(rgb$2(colors[y][x]), WHITE, .25 + .3 * breath)));
		}
		if (o.fx === "neon" && !aura) {
			const glow = .55 + .1 * Math.sin(tt / wave(380)), rim$1 = edgeOf(k), turn = tt * 360 / fit(3600);
			for (const [x, y] of rim$1) out[y][x] = hex$1(hue(((turn + (x + y) * 10) % 360 + 360) % 360, 1, glow));
			for (const [x, y] of rim$1) for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) put(x + dx, y + dy, hex$1(hue(((turn + (x + y) * 10) % 360 + 360) % 360, .9, .32)));
		}
		if (o.fx === "rime") {
			const reach = 1 + 1.6 * (.5 + .5 * Math.sin(tt / wave(900)));
			for (const [key, d] of depth(k)) {
				const x = key % W, y = Math.floor(key / W);
				if (d > reach) continue;
				const glint$1 = noise(x, y, tick(tt, 300), o.print) > .82;
				out[y][x] = glint$1 ? "#FFFFFF" : hex$1(mix$3(rgb$2(out[y][x]), [
					214,
					240,
					255
				], aura ? .5 : d <= 1 ? .85 : .6));
			}
			if (!aura) {
				for (const [x, y] of edgeOf(k)) if (noise(x, y, tick(tt, 300), 3) > .7 && out[y][x] && dark(colors[y][x] ?? "#000000")) out[y][x] = "#BFE6FF";
			}
		}
		if (o.fx === "starlight") {
			const deep = depth(k), inner = [...deep].filter(([, d]) => d >= 2).map(([key]) => key);
			for (let i = 0; i < 3 && inner.length; i++) {
				const at = tt + i * 333, gen = tick(at, 1e3), f = cycle(at, 1e3);
				const key = inner[Math.floor(noise(i, gen, o.print, 9) * inner.length)], x = key % W, y = Math.floor(key / W);
				if (f > .8) continue;
				out[y][x] = "#FFFFFF";
				if (f > .25 && f < .6) {
					for (const [dx, dy] of [
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1]
					]) if (deep.has((y + dy) * W + x + dx)) out[y + dy][x + dx] = "#C9BEFF";
				}
			}
			const shot = cycle(tt, 2600);
			if (shot < .25) for (const [key] of deep) {
				const x = key % W, y = Math.floor(key / W);
				const d = x - y - (shot * 40 - 12);
				if (d >= 0 && d < 1) out[y][x] = "#FFFFFF";
				else if (d >= 1 && d < 2.5) out[y][x] = "#B9A8FF";
			}
		}
		if (o.fx === "electric") {
			const beat = tick(tt, 90);
			if (noise(beat, o.print, 13) > .45) {
				const rim$1 = edgeOf(k);
				for (let b = 0; b < (aura ? 1 : 2) && rim$1.length; b++) {
					let [x, y] = rim$1[Math.floor(noise(beat, b, o.print) * rim$1.length)];
					const sx = noise(beat, b, 2) > .5 ? 1 : -1;
					for (let j = 0; j < 4; j++) {
						if (j && !empty(x, y)) break;
						if (j) out[y][x] = j < 2 ? "#FFFFFF" : "#7FE8FF";
						x += j % 2 ? sx : 0;
						y -= j % 2 ? 0 : 1;
					}
				}
			}
		}
		if (o.fx === "bubbles") risers(o, k, aura ? 200 : 150, 6, aura ? .3 : .55, (x, y, step) => {
			if (step >= 5) {
				put(x, y, "#E8F8FF");
				return;
			}
			put(x, y, "#FFFFFF");
			put(x + 1, y, "#9ED8FF");
			put(x, y + 1, "#9ED8FF");
			put(x + 1, y + 1, "#5FB8F0");
		});
		if (o.fx === "hearts") risers(o, k, aura ? 260 : 210, 6, aura ? .25 : .45, (x, y) => {
			for (const [dx, dy, c] of [
				[
					-1,
					-1,
					"#FF8FBE"
				],
				[
					1,
					-1,
					"#FF8FBE"
				],
				[
					-1,
					0,
					"#FF5C9A"
				],
				[
					0,
					0,
					"#FF5C9A"
				],
				[
					1,
					0,
					"#FF5C9A"
				],
				[
					0,
					1,
					"#E0457F"
				]
			]) put(x + dx, y + dy, c);
		});
		if (o.fx === "embers") risers(o, k, aura ? 120 : 100, 6, aura ? .35 : .6, (x, y, step) => {
			const c = step < 2 ? ["#FFF2A8", "#FFC53D"] : step < 4 ? ["#FFC53D", "#FF7A1A"] : ["#FF7A1A", "#C2412E"];
			put(x, y, c[0]);
			put(x, y + 1, c[1]);
		});
		if (aura) {
			const spots = [];
			for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
				if (out[y][x]) continue;
				let near = 9;
				for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
					const c = slots[y + dy]?.[x + dx];
					if (colors[y + dy]?.[x + dx] && c !== AURA_SLOT) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
				}
				if (near >= 2 && near <= 3) spots.push([x, y]);
			}
			const life = 1200;
			for (let i = 0; i < 3 && spots.length; i++) {
				const at = tt + i * life / 3, gen = tick(at, 1200), f = cycle(at, 1200);
				if (f > .85) continue;
				const [x, y] = spots[Math.floor(noise(i, gen, o.print, 51) * spots.length)], sg = signature(o.fx, f, tt, i);
				const dy = -Math.round(f * sg.rise);
				for (const [cx, cy, c] of sg.cells) put(x + cx, y + cy + dy, c);
			}
		}
		if (o.fx === "static" && noise(tick(tt, 90), o.print, 7) > .6) {
			const yy = Math.floor(noise(tick(tt, 90), o.print, 9) * H), dir = noise(tick(tt, 90), 1) > .5 ? 1 : -1;
			for (const r of [yy, yy + 1]) {
				if (r >= H) continue;
				const row = out[r], copy = [...row];
				slots[r].forEach((s, x) => {
					if (s === k + 1 && copy[x]) {
						const nx = x + dir;
						if (nx >= 0 && nx < W) row[nx] = copy[x];
					}
				});
			}
			if (!aura) for (const [x, y] of cellsOf(k)) {
				if (empty(x - 1, y)) out[y][x - 1] = "#FF3D6E";
				if (empty(x + 1, y)) out[y][x + 1] = "#3DD8FF";
			}
		}
	});
	return out;
}

//#endregion
//#region src/pins.ts
/**
* Each pin is its own silhouette, so the gold ones never read alike: a
* twinkling star, a zigzag bolt, a crown with a red jewel. Append only: copies
* store pin ids.
*/
const PINS = [
	{
		id: "star",
		name: "Gold star",
		how: "A perfect day",
		art: stamp([
			".y.",
			"ywy",
			".y."
		])
	},
	{
		id: "flame",
		name: "Flame",
		how: "A 7-day streak",
		art: stamp([
			".r.",
			"rry",
			"ryy"
		])
	},
	{
		id: "heart",
		name: "Heart",
		how: "100 days played",
		art: stamp([
			"r.r",
			"rrr",
			".r."
		])
	},
	{
		id: "bolt",
		name: "Bolt",
		how: "Fastest of the day",
		art: stamp([
			".yy",
			".y.",
			"yy."
		])
	},
	{
		id: "crown",
		name: "Crown",
		how: "Top of a board for a day",
		art: stamp([
			"y.y",
			"yry",
			"yyy"
		])
	},
	{
		id: "leaf",
		name: "Leaf",
		how: "A first week in the club",
		art: stamp([
			".gg",
			"ggg",
			"G.."
		])
	}
];
/** A copy holds at most this many pins. */
const MAX_PINS = 3;
const pinById = (id) => PINS.find((p) => p.id === id);
/** The tally marks a copy shows for its tally: none, 2 or 4. */
function tallyMarks(tally) {
	return (tally ?? 0) >= 100 ? 4 : (tally ?? 0) >= 30 ? 2 : 0;
}
/** A year of days: the item's outline goes gold. */
const GOLD_RIM_DAYS = 365;
const START = {
	skin: LAYER.skin,
	hat: LAYER.hat,
	frame: LAYER.frame,
	buddy: LAYER.buddy
};
const own = (slot, token) => token >= START[slot] && token < START[slot] + 10;
/** What a pin keeps clear of: the face it is stuck beside. */
const FACE = new Set([
	T.EYE,
	T.BLUSH,
	T.MOUTH,
	T.TONGUE
]);
const N4 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/**
* Scratches tally marks and sticks pins onto one worn item's pixels.
*
* Each pin goes as near its own corner as it fits whole: on an item the first
* bottom right, the second bottom left, the third top right; on a frame top
* left, top right, then bottom left, since a buddy sits bottom right. It never
* covers the face or another pin, and a backing plate in the outline colour
* goes round it, so it reads as a badge stuck on and not as part of the
* drawing. A hat is too small to hold one whole, so there a pin may hang off
* its side into the air, where the outline wraps it.
*/
function markItem(grid, slot, copy) {
	const cells = [];
	grid.forEach((row, y) => row.forEach((t, x) => {
		if (own(slot, t)) cells.push([x, y]);
	}));
	if (!cells.length) return;
	const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
	const [left, right, top, bottom] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys)
	];
	let marks = tallyMarks(copy.tally);
	for (let y = bottom; y >= top && marks > 0; y--) {
		const row = cells.filter(([, cy]) => cy === y).map(([x]) => x).sort((a, b) => a - b);
		for (let i = 1; i < row.length - 1 && marks > 0; i += 2, marks--) grid[y][row[i]] = T.WHITE;
	}
	const frame = slot === "frame", hat$1 = slot === "hat";
	const at = (x, y) => grid[y]?.[x] ?? 0;
	const air = (x, y) => hat$1 && at(x, y) === 0 && x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1;
	const taken = new Set();
	const corners = frame ? [
		[
			1,
			1,
			0,
			0
		],
		[
			GRID_SIZE - 2,
			1,
			1,
			0
		],
		[
			1,
			GRID_SIZE - 2,
			0,
			1
		]
	] : [
		[
			right,
			bottom - 1,
			1,
			1
		],
		[
			left,
			bottom - 1,
			0,
			1
		],
		[
			right,
			top + 1,
			1,
			0
		]
	];
	(copy.pins ?? []).slice(0, MAX_PINS).forEach((id, k) => {
		const pin = pinById(id);
		if (!pin) return;
		const h = pin.art.length, w = pin.art[0].length;
		const [cx, cy, sx, sy] = corners[k];
		let best;
		for (let ay = 0; ay <= GRID_SIZE - h; ay++) for (let ax = 0; ax <= GRID_SIZE - w; ax++) {
			let onItem = 0, inAir = 0, lost = 0, crowded = 0;
			pin.art.forEach((row, dy) => row.forEach((t, dx) => {
				if (!t) return;
				const x = ax + dx, y = ay + dy;
				if (taken.has(y * GRID_SIZE + x)) lost++;
				else if (own(slot, at(x, y))) onItem++;
				else if (air(x, y)) inAir++;
				else lost++;
				for (const [nx, ny] of N4) {
					const n = at(x + nx, y + ny);
					if (FACE.has(n) || hat$1 && n !== 0 && n !== T.OUTLINE && !own(slot, n) && !taken.has((y + ny) * GRID_SIZE + x + nx)) crowded++;
				}
			}));
			if (!onItem || inAir > onItem) continue;
			const d = Math.abs(ax + sx * (w - 1) - cx) + Math.abs(ay + sy * (h - 1) - cy);
			const score = lost * 300 + crowded * 100 + inAir * 4 + d;
			if (!best || score < best.score) best = {
				x: ax,
				y: ay,
				score
			};
		}
		if (!best) return;
		const placed = [];
		pin.art.forEach((row, dy) => row.forEach((t, dx) => {
			const x = best.x + dx, y = best.y + dy;
			if (!t || taken.has(y * GRID_SIZE + x) || !(own(slot, at(x, y)) || air(x, y))) return;
			grid[y][x] = t;
			placed.push([x, y]);
		}));
		for (const [x, y] of placed) taken.add(y * GRID_SIZE + x);
		const inside = (x, y) => frame || N4.every(([dx, dy]) => at(x + dx, y + dy) !== 0);
		for (const [x, y] of placed) for (const [dx, dy] of N4) {
			const nx = x + dx, ny = y + dy;
			if (own(slot, at(nx, ny)) && inside(nx, ny)) grid[ny][nx] = T.OUTLINE;
			taken.add(ny * GRID_SIZE + nx);
		}
	});
}
/**
* After a year of days, the outline around an item goes gold; a frame's edge
* does. A pin's backing plate stays dark, so a gold pin still stands out.
*/
function goldRim(grid, slot) {
	const edge = (x, y) => x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
	const set$10 = [];
	grid.forEach((row, y) => row.forEach((t, x) => {
		if (slot === "frame") {
			if (own("frame", t) && edge(x, y)) set$10.push([x, y]);
			return;
		}
		if (t !== T.OUTLINE) return;
		if (!edge(x, y) && N4.every(([dx, dy]) => grid[y + dy][x + dx] !== 0)) return;
		if ([
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		].some(([dx, dy]) => own(slot, grid[y + dy]?.[x + dx] ?? 0))) set$10.push([x, y]);
	}));
	for (const [x, y] of set$10) grid[y][x] = (x + y) % 2 ? T.GOLD : T.GOLD_SHADE;
}

//#endregion
//#region src/paints.ts
/**
* Paint, as in TF2: a tin of one colour brushed over a hat or a buddy. It
* tints every colour of the item to the paint, keeping each one's light and
* shade, so the drawing reads as before, only in the new colour. Paint never
* changes a copy's finish, float or rarity, and it scrapes off.
*/
const PAINTS = {
	"lack-of-hue": {
		name: "A Lack of Hue",
		hex: "#2D2B36"
	},
	"abundance": {
		name: "An Abundance of White",
		hex: "#EEEDE6"
	},
	"pure-gold": {
		name: "Pure Gold",
		hex: "#E7B53B"
	},
	"pink-as-heck": {
		name: "Pink as Heck",
		hex: "#FF6EB4"
	},
	"noble-violet": {
		name: "Noble Violet",
		hex: "#7D4FA6"
	},
	"zesty-lime": {
		name: "Zesty Lime",
		hex: "#8FD43A"
	},
	"deep-sea": {
		name: "Deep Sea Teal",
		hex: "#2E8C8A"
	},
	"club-orange": {
		name: "Club Orange",
		hex: "#E8792F"
	},
	"team-red": {
		name: "Team Red",
		hex: "#C2403F"
	},
	"team-blue": {
		name: "Team Blue",
		hex: "#4E7FB3"
	},
	"mint": {
		name: "Mint Condition",
		hex: "#A8DDB5"
	},
	"clear-skies": {
		name: "Clear Skies",
		hex: "#8CC4F2"
	}
};
const PAINT_IDS = Object.keys(PAINTS);
/** What can be painted. */
const PAINTABLE = ["hat", "buddy"];
const rgb$1 = (hex$2) => [
	1,
	3,
	5
].map((i) => parseInt(hex$2.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const light$1 = (c) => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
const mix$2 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
/**
* An item's colours under a paint: the first colour (an item's main one)
* becomes the paint, and every other colour sits as much lighter or darker
* than the paint as it did than the main one.
*/
function painted(colors, paint$1) {
	const p = paint$1 && PAINTS[paint$1];
	if (!p || !colors.length) return colors;
	const base$1 = rgb$1(p.hex), main = light$1(rgb$1(colors[0]));
	return colors.map((hex$2) => {
		const d = light$1(rgb$1(hex$2)) - main;
		return toHex(d >= 0 ? mix$2(base$1, [
			255,
			255,
			255
		], Math.min(1, d * 1.5)) : mix$2(base$1, [
			0,
			0,
			0
		], Math.min(1, -d * 1.5)));
	});
}

//#endregion
//#region src/owned.ts
const GRADES = [
	{
		id: "everyday",
		name: "Everyday",
		color: "#4B69FF"
	},
	{
		id: "special",
		name: "Special",
		color: "#8847FF"
	},
	{
		id: "prized",
		name: "Prized",
		color: "#D32CE6"
	},
	{
		id: "mythic",
		name: "Mythic",
		color: "#EB4B4B"
	},
	{
		id: "grail",
		name: "★ Grail",
		color: "#E4AE39"
	},
	{
		id: "aura",
		name: "★ Aura",
		color: "#19D3C5"
	}
];
/**
* Each finish: its grade, the chance a capsule rolls it, and the scuff range
* it can come in. The flashy finishes only exist barely worn, so there is no
* Battered Nebula.
*/
const FINISHES = {
	"plain": {
		name: "Plain",
		grade: 0,
		odds: 79.87,
		scuffs: [0, 1]
	},
	"sunset": {
		name: "Sunset",
		grade: 1,
		odds: 15.98,
		scuffs: [0, .08]
	},
	"tempered": {
		name: "Tempered",
		grade: 2,
		odds: 1.6,
		scuffs: [0, 1]
	},
	"nebula": {
		name: "Nebula",
		grade: 2,
		odds: 1.6,
		scuffs: [0, .08]
	},
	"prism": {
		name: "Prism",
		grade: 3,
		odds: .5,
		scuffs: [0, .08]
	},
	"negative": {
		name: "Negative",
		grade: 3,
		odds: .2,
		scuffs: [0, .08]
	},
	"gold": {
		name: "Gold",
		grade: 4,
		odds: .25,
		scuffs: [0, .08]
	},
	"classic": {
		name: "Classic",
		grade: 5,
		odds: 0,
		aura: 50,
		scuffs: [0, 1]
	},
	"fade": {
		name: "Fade",
		grade: 5,
		odds: 0,
		aura: 22,
		scuffs: [0, 1]
	},
	"frost": {
		name: "Frost",
		grade: 5,
		odds: 0,
		aura: 12,
		scuffs: [0, 1]
	},
	"toxic": {
		name: "Toxic",
		grade: 5,
		odds: 0,
		aura: 8,
		scuffs: [0, 1]
	},
	"shadow": {
		name: "Shadow",
		grade: 5,
		odds: 0,
		aura: 5,
		scuffs: [0, 1]
	},
	"sapphire": {
		name: "Deep sea · Sapphire",
		grade: 5,
		odds: 0,
		aura: 1.5,
		scuffs: [0, 1]
	},
	"ruby": {
		name: "Deep sea · Ruby",
		grade: 5,
		odds: 0,
		aura: 1.2,
		scuffs: [0, 1]
	},
	"pearl": {
		name: "Deep sea · Black pearl",
		grade: 5,
		odds: 0,
		aura: .3,
		scuffs: [0, 1]
	}
};
/** Condition, by scuff, in the words toy collectors use. */
const WEAR = [
	{
		name: "Box Fresh",
		short: "BF",
		max: .07
	},
	{
		name: "Like New",
		short: "LN",
		max: .15
	},
	{
		name: "Played With",
		short: "PW",
		max: .38
	},
	{
		name: "Well Loved",
		short: "WL",
		max: .45
	},
	{
		name: "Battered",
		short: "BT",
		max: 1.01
	}
];
function wearOf(scuff) {
	return WEAR.find((w) => scuff < w.max);
}
/** The famous prints. A Tempered copy with one of these comes out nearly all blue. */
const DEEP_BLUE_PRINTS = [
	661,
	670,
	321,
	387,
	955
];
/**
* Tempered steel's tints, darkest to lightest. The print picks one; the famous
* Deep Blue prints are the only all-blue ones.
*/
const TINTS = {
	"Steel": [
		"#3A5FC0",
		"#86A8E8",
		"#E2BC5A"
	],
	"Rose": [
		"#B8456F",
		"#F09AB8",
		"#F2CF7A"
	],
	"Emerald": [
		"#16806A",
		"#4FCB9E",
		"#CFE68A"
	],
	"Copper": [
		"#94401F",
		"#E0773A",
		"#F6C978"
	],
	"Violet": [
		"#5A3CB0",
		"#9F82F0",
		"#7FC6F2"
	],
	"Deep Blue": [
		"#1B3A9E",
		"#2F5FD0",
		"#6F9BF5"
	]
};
/** A Tempered copy's tint, from its print. */
function temperTint(print) {
	return DEEP_BLUE_PRINTS.includes(print) ? "Deep Blue" : [
		"Steel",
		"Rose",
		"Emerald",
		"Copper",
		"Violet"
	][print % 5];
}
/** A Nebula copy's look, from its print: three rare ones, otherwise one of four. */
function nebulaPhase(print) {
	const p = print % 20;
	return p === 0 ? "Red Giant" : p === 1 ? "Blue Moon" : p === 2 ? "Black Hole" : `Nebula ${[
		"I",
		"II",
		"III",
		"IV"
	][print % 4]}`;
}
const RARE_PHASES = [
	"Red Giant",
	"Blue Moon",
	"Black Hole"
];
/** What makes this copy special beyond its finish, if anything. */
function special(o) {
	if (o.finish === "tempered" && DEEP_BLUE_PRINTS.includes(o.print)) return "Deep Blue";
	if (o.finish === "nebula" && RARE_PHASES.includes(nebulaPhase(o.print))) return nebulaPhase(o.print);
	return void 0;
}
function gradeOf(o) {
	if (FINISHES[o.finish].grade === 5) return GRADES[5];
	return GRADES[Math.min(4, FINISHES[o.finish].grade + (special(o) ? 1 : 0))];
}
/** The name as it would show on an inventory card. */
function nameOf(o) {
	const item = itemById(o.item);
	const base$1 = (o.date ? `${o.date.slice(0, 4)} ` : "") + (item?.name ?? o.item);
	const tally = (o.souvenir ? "Souvenir " : "") + (o.fx && o.fx !== item?.signature ? `${EFFECTS[o.fx].name} ` : "") + (o.tally !== void 0 ? "Strange " : "");
	if (FINISHES[o.finish].aura) return `${tally}★ ${base$1}${o.finish === "classic" ? "" : ` | ${FINISHES[o.finish].name}`}`;
	if (o.finish === "plain") return tally + base$1;
	const look = o.finish === "nebula" ? nebulaPhase(o.print) : o.finish === "tempered" ? special(o) ? "Deep Blue" : `${temperTint(o.print)} Tempered` : FINISHES[o.finish].name;
	return `${tally}${base$1} | ${look}`;
}
/**
* A copy as one short string, to store or put in a URL:
* `puttsies.ball~nebula~0.0123456~20`; with a tally `…~20~t412`; with pins
* `…~p` and their ids joined by `+`, as in `…~t412~pstar+flame`.
*/
function encode(o) {
	const parts = [
		o.item,
		o.finish,
		o.scuff.toFixed(7),
		String(o.print)
	];
	if (o.tally !== void 0) parts.push(`t${o.tally}`);
	if (o.pins?.length) parts.push(`p${o.pins.slice(0, MAX_PINS).join("+")}`);
	if (o.date) parts.push(`d${o.date}`);
	if (o.souvenir) parts.push(`s${o.souvenir}`);
	if (o.fx) parts.push(`x${o.fx}`);
	if (o.craft !== void 0) parts.push(`c${o.craft}`);
	if (o.paint) parts.push(`k${o.paint}`);
	return parts.join("~");
}
function decode(s) {
	const [item, finish, scuff, print, ...extra] = s.split("~");
	if (!itemById(item) || !(finish in FINISHES)) return null;
	const f = Number(scuff), p = Number(print);
	if (!(f >= 0 && f <= 1) || !Number.isInteger(p) || p < 0 || p > 999) return null;
	const o = {
		item,
		finish,
		scuff: f,
		print: p
	};
	for (const part of extra) {
		if (part.startsWith("t") && /^\d+$/.test(part.slice(1))) o.tally = Number(part.slice(1));
		if (part.startsWith("d") && /^\d{4}-\d{2}-\d{2}$/.test(part.slice(1))) o.date = part.slice(1);
		if (part.startsWith("s") && /^\d{4}-\d{2}-\d{2}$/.test(part.slice(1))) o.souvenir = part.slice(1);
		if (part.startsWith("x") && FX_IDS.includes(part.slice(1))) o.fx = part.slice(1);
		if (part.startsWith("c") && /^\d{1,9}$/.test(part.slice(1))) o.craft = Number(part.slice(1));
		if (part.startsWith("k") && PAINT_IDS.includes(part.slice(1))) o.paint = part.slice(1);
		if (part.startsWith("p")) {
			const pins = part.slice(1).split("+").filter((id) => pinById(id)).slice(0, MAX_PINS);
			if (pins.length) o.pins = pins;
		}
	}
	return o;
}
/** A uniform number in [0, 1) from a string, for deterministic rolls. */
function unit(seed) {
	return hash(seed) / 4294967296;
}
/**
* The copy every player has from the start: their game's free hat, plain, with
* a scuff and print taken from their name. Everyone gets one, and everyone's
* is a little different — a lucky name gets a 0.003 Box Fresh.
*/
function starter(name, game) {
	return {
		item: freeItem(game).id,
		finish: "plain",
		scuff: Math.round(unit(`${name}|${game}|float`) * 1e7) / 1e7,
		print: hash(`${name}|${game}|pattern`) % 1e3
	};
}
/**
* Opens a capsule for a game: one of its items (the free hat aside), with a
* finish, scuff, print and maybe a tally, all rolled from `seed`.
*
* The seed decides everything, so the same seed always opens the same thing.
* In production the seed must come from the server — a random value made at
* drop time and stored with the copy — never from anything a player picks.
*/
function roll(seed, game) {
	if (unit(`${seed}|aura`) < AURA_ODDS) return rollAura(seed);
	return rollFrom(gameItems(game).filter((i) => !i.free), seed);
}
/** An aura, from any machine: which one, its finish by share, any float, a print and maybe a tally. */
function rollAura(seed) {
	const aura = AURAS[hash(`${seed}|which`) % AURAS.length];
	let r = unit(`${seed}|finish`) * 100;
	let finish = "classic";
	for (const [id, f] of Object.entries(FINISHES)) {
		if (!f.aura) continue;
		r -= f.aura;
		if (r < 0) {
			finish = id;
			break;
		}
	}
	const o = {
		item: aura.id,
		finish,
		scuff: Math.round(unit(`${seed}|float`) * 1e7) / 1e7,
		print: hash(`${seed}|pattern`) % 1e3
	};
	if (unit(`${seed}|stattrak`) < .1) o.tally = 0;
	const fx = rollFx(unit(`${seed}|fx`), true);
	if (fx) o.fx = fx;
	return o;
}
/**
* A seasonal drop: one of the hats in season on `day` (`YYYY-MM-DD`), rolled
* like a capsule and stamped with the day. Null when nothing is in season.
*/
function rollSeason(seed, day) {
	const pool = inSeason(day);
	if (!pool.length) return null;
	return {
		...rollFrom(pool, seed),
		date: day.slice(0, 10)
	};
}
function rollFrom(pool, seed) {
	let item = pool[hash(`${seed}|item`) % pool.length];
	if (pool.some((i) => i.showpiece)) {
		let r$1 = unit(`${seed}|item`) * pool.reduce((a, i) => a + itemWeight(i), 0);
		item = pool.find((i) => (r$1 -= itemWeight(i)) < 0) ?? pool[pool.length - 1];
	}
	let r = unit(`${seed}|finish`) * 100;
	let finish = "plain";
	for (const [id, f] of Object.entries(FINISHES)) {
		r -= f.odds;
		if (r < 0) {
			finish = id;
			break;
		}
	}
	const [lo, hi] = FINISHES[finish].scuffs;
	const scuff = Math.round((lo + unit(`${seed}|float`) * (hi - lo)) * 1e7) / 1e7;
	const print = hash(`${seed}|pattern`) % 1e3;
	const o = {
		item: item.id,
		finish,
		scuff,
		print
	};
	if (unit(`${seed}|stattrak`) < .1) o.tally = 0;
	const fx = rollFx(unit(`${seed}|fx`), false) ?? item.signature;
	if (fx) o.fx = fx;
	return o;
}
/** Which slot a copy goes in. */
function slotOf(o) {
	return itemById(o.item)?.slot;
}
const rgb = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$1 = (a, b, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b[i] - a[i]) * t);
const lum = (c) => (.3 * c[0] + .59 * c[1] + .11 * c[2]) / 255;
/** A well-mixed number in [0, 1) for a cell, so neighbouring cells don't correlate. */
function cellNoise(...n) {
	let h = 2654435769;
	for (const v of n) {
		h = Math.imul(h ^ v, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		h ^= h >>> 16;
	}
	return (h >>> 0) / 4294967296;
}
/**
* Shades a finish colour by how light the item's own colour was there: dark
* parts go deep, light parts go towards white. The full range keeps the
* item's own drawing (a golf ball's dimples, a brick's studs) showing through
* the finish instead of flattening it to one colour.
*/
const shaded = (c, l) => {
	const t = Math.max(0, Math.min(1, (l - .15) / .75));
	return t < .5 ? mix$1(mix$1(c, [
		0,
		0,
		0
	], .5), c, t * 2) : mix$1(c, mix$1(c, [
		255,
		255,
		255
	], .6), (t - .5) * 2);
};
const PAINT = {
	"plain": (_x, _y, _l, _p, original) => original,
	"sunset": (x, y, l, p) => {
		const t = Math.max(0, Math.min(1, (x + y * .5 - 2 + p % 100 / 12) / 14));
		const c = t < .5 ? mix$1(rgb("#F5C542"), rgb("#E55AA8"), t * 2) : mix$1(rgb("#E55AA8"), rgb("#7A4BE0"), (t - .5) * 2);
		return shaded(c, l);
	},
	"tempered": (x, y, l, p) => {
		const stops = TINTS[temperTint(p)];
		const band = Math.floor(((x + y + p % 11) % 12 + 12) % 12 / 3);
		return shaded(rgb(stops[[
			0,
			1,
			2,
			1
		][band]]), l);
	},
	"nebula": (x, y, l, p) => {
		const phase = nebulaPhase(p);
		const base$1 = phase === "Red Giant" ? rgb("#D0102E") : phase === "Blue Moon" ? rgb("#1E4FE8") : phase === "Black Hole" ? rgb("#2A1E3A") : rgb([
			"#8A2AB0",
			"#3A2AB0",
			"#2A6AB0",
			"#B02A8A"
		][p % 4]);
		const c = cellNoise(p, x, y, 2) < .2 ? mix$1(base$1, rgb("#FFD6F0"), .55) : base$1;
		return shaded(c, l);
	},
	"prism": (x, y, l, p) => {
		const h = ((x * 23 + y * 17 + p * 7) % 360 + 360) % 360;
		const k = (n) => {
			const t = (n + h / 30) % 12;
			return .5 - .5 * Math.max(-1, Math.min(t - 3, 9 - t, 1));
		};
		const c = [
			k(0) * 255,
			k(8) * 255,
			k(4) * 255
		];
		return mix$1(shaded(c, l), [
			255,
			255,
			255
		], .18);
	},
	"negative": (_x, _y, _l, _p, original) => {
		const inverted = [
			255 - original[0],
			255 - original[1],
			255 - original[2]
		];
		return mix$1(inverted, [
			92,
			52,
			160
		], .22);
	},
	"classic": (_x, _y, _l, _p, original) => original,
	"fade": (_x, _y, _l, _p, original) => original,
	"frost": (_x, _y, _l, _p, original) => original,
	"toxic": (_x, _y, _l, _p, original) => original,
	"shadow": (_x, _y, _l, _p, original) => original,
	"sapphire": (_x, _y, _l, _p, original) => original,
	"ruby": (_x, _y, _l, _p, original) => original,
	"pearl": (_x, _y, _l, _p, original) => original,
	"gold": (x, y, l) => {
		if ((x + y) % 6 === 0 && l > .5) return rgb("#FFFBE6");
		return l > .75 ? rgb("#FFF1B0") : l > .5 ? rgb("#F2C230") : l > .3 ? rgb("#C8901E") : rgb("#7A5212");
	}
};
const PRIMER = rgb("#8B9097");
/**
* Paints one cell of an owned item: its finish, then its wear. Chips land in
* places fixed by the print, so a copy always wears the same way, and how many
* show is the scuff. `glint` is set once the first Box Fresh glint has been
* placed.
*/
function paintCell(color, x, y, o, state) {
	const original = rgb(color);
	let c = PAINT[o.finish](x, y, lum(original), o.print, original);
	if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, .9) * .45) c = mix$1(PRIMER, c, .25);
	c = mix$1(c, [
		120,
		116,
		112
	], Math.min(.25, o.scuff * .3));
	if (o.scuff < .07 && !state.glint && lum(c) > .55) {
		c = [
			255,
			255,
			255
		];
		state.glint = true;
	}
	return hex(c);
}

//#endregion
//#region src/items.ts
const skins = [
	{
		id: "amountle.jar",
		game: "amountle",
		name: "Jar of gems",
		eyes: 7,
		colors: [
			"#E3F5F7",
			"#BFE1E7",
			"#FFFFFF",
			"#2E9C94",
			"#217A73",
			"#3FD1C1",
			"#1F9C90",
			"#A6F4EA"
		],
		outline: "#2F6870",
		art: grid16("jar", [
			"................",
			"................",
			"................",
			"....44444444....",
			"....45555554....",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...1111111112...",
			"...1111111112...",
			"...1111111112...",
			"...6876786872...",
			"...7686867862...",
			"....77777777....",
			"................",
			"................"
		])
	},
	{
		id: "halfsies.pot",
		game: "halfsies",
		name: "Clay pot",
		eyes: 7,
		limb: 1,
		colors: [
			"#E07B4C",
			"#B85A34",
			"#F4A77C",
			"#5E2A1C",
			"#F6DCBB"
		],
		outline: "#5A2618",
		art: grid16("pot", [
			"................",
			"................",
			"................",
			"...3111111112...",
			"....22222222....",
			"....31111111....",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..111111111112..",
			"..454545454542..",
			"..545454545452..",
			"...2222222222...",
			"................",
			"................"
		])
	},
	{
		id: "stackdle.block",
		game: "stackdle",
		name: "Toy block",
		eyes: 8,
		limb: 1,
		colors: [
			"#4C8DF6",
			"#3467C9",
			"#7FB0FF",
			"#C4DBFF"
		],
		outline: "#1F3F86",
		art: grid16("block", [
			"................",
			"................",
			"................",
			"..344444444443..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..222222222222..",
			"................",
			"................"
		])
	},
	{
		id: "flipsies.bottle",
		game: "flipsies",
		name: "Water bottle",
		eyes: 8,
		colors: [
			"#3E7BE0",
			"#2B5BB5",
			"#C4E8FB",
			"#93CDEE",
			"#FFFFFF",
			"#F3F6FA",
			"#3E7BE0"
		],
		outline: "#2A5A8C",
		art: grid16("bottle", [
			"................",
			"................",
			"......1111......",
			"......2222......",
			".....333333.....",
			"....53333334....",
			"...5333333334...",
			"...5333333334...",
			"...5333333334...",
			"...3333333334...",
			"...3333333334...",
			"...6666666666...",
			"...7777777777...",
			"....44444444....",
			"................",
			"................"
		])
	},
	{
		id: "puttsies.ball",
		game: "puttsies",
		name: "Golf ball",
		eyes: 8,
		colors: [
			"#F7F8FA",
			"#D3D8E2",
			"#B9C0CE",
			"#E1E5EC",
			"#FFFFFF",
			"#E5484D"
		],
		outline: "#6B7385",
		art: grid16("golf ball", [
			"................",
			"................",
			"................",
			"................",
			".....141411.....",
			"....14141411....",
			"...5111111141...",
			"..511111111114..",
			"..411111111111..",
			"..111111111114..",
			"..411111111112..",
			"..141111111122..",
			"...4141412222...",
			"....22222222....",
			".......66.......",
			"................"
		])
	},
	{
		id: "weighsies.cheese",
		game: "weighsies",
		name: "Cheese wheel",
		eyes: 9,
		limb: 1,
		colors: [
			"#FFC94A",
			"#E3A52E",
			"#FFE38F",
			"#D98F22"
		],
		outline: "#8A5A12",
		art: grid16("cheese", [
			"................",
			"................",
			"................",
			"................",
			"....33333333....",
			"..333333333333..",
			"..233333333332..",
			"..111111111112..",
			"..111111111112..",
			"..111111111112..",
			"..111111111112..",
			"..111111111112..",
			"..141111114112..",
			"...2242222422...",
			"................",
			"................"
		])
	},
	{
		id: "cutsies.kiwi",
		game: "cutsies",
		name: "Kiwi",
		about: "Turns your guy into a fuzzy brown kiwi, cut open on top.",
		eyes: 10,
		limb: 1,
		colors: [
			"#C08F5E",
			"#9C6E43",
			"#D9AE7E",
			"#86CF55",
			"#7A5432",
			"#2A1B10",
			"#F1F7D4"
		],
		outline: "#4E3420",
		art: grid16("kiwi", [
			"................",
			"................",
			"................",
			".....555555.....",
			"....54466445....",
			"...5446776445...",
			"...5444664445...",
			"...3555555552...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..111111111112..",
			"...1111111122...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "tiltsies.ball",
		game: "tiltsies",
		name: "Hamster ball",
		eyes: 9,
		colors: [
			"#DFF2FB",
			"#B7DCEE",
			"#FFFFFF",
			"#EDB57D",
			"#CC8E55",
			"#FFE7CB"
		],
		outline: "#4E7A92",
		art: grid16("hamster ball", [
			"................",
			"................",
			".....111111.....",
			"....13111111....",
			"...1311111111...",
			"..131441144111..",
			"..114444444411..",
			"..144444444442..",
			"..144444444442..",
			"..144444444442..",
			"..144444444442..",
			"..144466664442..",
			"...1556666551...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "trackdle.racer",
		game: "trackdle",
		name: "Racer",
		eyes: 8,
		limb: 1,
		colors: [
			"#FF7A2F",
			"#D65A1C",
			"#FFAE73",
			"#FFFFFF",
			"#23262D"
		],
		outline: "#6A2A0C",
		art: grid16("racer", [
			"................",
			"................",
			"................",
			"................",
			".....114411.....",
			"....31144111....",
			"...3111441111...",
			"..311111111111..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..111111111122..",
			"...5454545454...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "amountle.crystal",
		game: "amountle",
		name: "Crystal",
		eyes: 8,
		colors: [
			"#3FD1C1",
			"#1F9C90",
			"#A6F4EA",
			"#FFFFFF"
		],
		outline: "#14524C",
		art: grid16("gem", [
			"................",
			"................",
			"................",
			"......3311......",
			".....333111.....",
			"....43331111....",
			"...3333311111...",
			"..333331111112..",
			"..333311111112..",
			"..111111111122..",
			"...1111111122...",
			"....11111222....",
			".....111222.....",
			"......1222......",
			".......22.......",
			"................"
		])
	},
	{
		id: "halfsies.kitchen-scale",
		game: "halfsies",
		name: "Kitchen scale",
		eyes: 8,
		limb: 1,
		colors: [
			"#F4F4F2",
			"#CFD3D8",
			"#FFFFFF",
			"#2B2F38",
			"#E5484D",
			"#9AA0A8"
		],
		outline: "#3C4048",
		art: grid16("kitchen scale", [
			"................",
			"................",
			"...6666666666...",
			"....66666666....",
			"......2222......",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311114411112..",
			"..222245542222..",
			"................",
			"................"
		])
	},
	{
		id: "stackdle.triangle",
		game: "stackdle",
		name: "Triangle",
		eyes: 10,
		limb: 1,
		colors: [
			"#FFB03B",
			"#E58A1F",
			"#FFD27A"
		],
		outline: "#7A3E0A",
		art: grid16("triangle", [
			"................",
			"................",
			".......33.......",
			"......3311......",
			"......3311......",
			".....331111.....",
			".....331111.....",
			"....33111111....",
			"....31111111....",
			"...3111111112...",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			".22222222222222.",
			"................",
			"................"
		])
	},
	{
		id: "flipsies.bullseye",
		game: "flipsies",
		name: "Bullseye",
		eyes: 8,
		colors: [
			"#FFFFFF",
			"#8EC5F0",
			"#3E7BE0",
			"#D9E3EE"
		],
		outline: "#1E3F78",
		art: grid16("bullseye", [
			"................",
			"................",
			"................",
			".....333333.....",
			"....33111133....",
			"...3311111133...",
			"..331122221133..",
			"..311222222113..",
			"..312211112213..",
			"..312211112213..",
			"..311222222113..",
			"..331122221133..",
			"...3311111133...",
			"....33333333....",
			"................",
			"................"
		])
	},
	{
		id: "puttsies.pillow",
		game: "puttsies",
		name: "Quilt pillow",
		eyes: 8,
		colors: [
			"#F7B7B0",
			"#B9E3A8",
			"#B3D4F5",
			"#FBE3A1",
			"#C98A84"
		],
		outline: "#6E3E3A",
		art: grid16("quilt pillow", [
			"................",
			"................",
			"..5..........5..",
			"..555555555555..",
			"..511111222225..",
			"..511111222225..",
			"..511111222225..",
			"..511111222225..",
			"..533333444445..",
			"..533333444445..",
			"..533333444445..",
			"..533333444445..",
			"..555555555555..",
			"..5..........5..",
			"................",
			"................"
		])
	},
	{
		id: "weighsies.kettlebell",
		game: "weighsies",
		name: "Kettlebell",
		eyes: 8,
		limb: 1,
		colors: [
			"#4A4E5E",
			"#2E3140",
			"#6C7286",
			"#F2C230"
		],
		outline: "#14161C",
		art: grid16("kettlebell", [
			"................",
			"................",
			".....111111.....",
			"....1......1....",
			"....1......1....",
			"....31111112....",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"...3114444112...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "cutsies.melon",
		game: "cutsies",
		name: "Melon slice",
		eyes: 8,
		colors: [
			"#F25C6B",
			"#2EB872",
			"#2A1B10",
			"#E8F5D0"
		],
		outline: "#5A1A22",
		art: grid16("melon slice", [
			"................",
			"................",
			"................",
			"................",
			".11111111111111.",
			".13111111111131.",
			"..311111111113..",
			"..111111111111..",
			"..111111111111..",
			"..111111111111..",
			"...1111111111...",
			"...4111111114...",
			"....44444444....",
			".....222222.....",
			"................",
			"................"
		])
	},
	{
		id: "tiltsies.hamster",
		game: "tiltsies",
		name: "Hamster",
		eyes: 8,
		limb: 2,
		colors: [
			"#EDB57D",
			"#CC8E55",
			"#FFE7CB",
			"#FFB3A7"
		],
		outline: "#5A3418",
		art: grid16("hamster", [
			"................",
			"................",
			"...22......22...",
			"...2421111242...",
			"...1111111111...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311133331112..",
			"..311333333112..",
			"..113333333311..",
			"...2333333332...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "trackdle.cone",
		game: "trackdle",
		name: "Traffic cone",
		eyes: 10,
		colors: [
			"#FF7A2F",
			"#D65A1C",
			"#FFFFFF",
			"#FFAE73",
			"#2B2F38"
		],
		outline: "#6A2A0C",
		art: grid16("traffic cone", [
			"................",
			".......11.......",
			".......11.......",
			"......4112......",
			"......3333......",
			".....411112.....",
			".....411112.....",
			"....33333333....",
			"....41111112....",
			"...4111111112...",
			"...4111111112...",
			"...3333333333...",
			"..411111111112..",
			".55555555555555.",
			"................",
			"................"
		])
	},
	{
		id: "amountle.piggy",
		game: "amountle",
		name: "Piggy bank",
		eyes: 8,
		limb: 2,
		colors: [
			"#FFA3C0",
			"#E5799C",
			"#FFC9DA",
			"#2B2F38",
			"#F2C230"
		],
		outline: "#8C3556",
		art: grid16("piggy bank", [
			"................",
			"................",
			".......55.......",
			"...22..44..22...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"...3111111112...",
			"...2222222222...",
			"................",
			"................",
			"................"
		])
	},
	{
		id: "halfsies.avocado",
		game: "halfsies",
		name: "Avocado half",
		eyes: 7,
		colors: [
			"#DCF0A6",
			"#BBDB7C",
			"#3F6B22",
			"#7A4A2A",
			"#B07444"
		],
		outline: "#2C4A16",
		art: grid16("avocado", [
			"................",
			"................",
			"......3333......",
			".....311113.....",
			"....31111113....",
			"...3111111113...",
			"..311111111113..",
			"..311111111113..",
			"..311111111113..",
			"..311111111223..",
			"..311111111223..",
			"..311114451223..",
			"...3115544223...",
			"....33333333....",
			"................",
			"................"
		])
	},
	{
		id: "stackdle.brick",
		game: "stackdle",
		name: "Building brick",
		eyes: 8,
		limb: 2,
		colors: [
			"#F05A4E",
			"#C23B31",
			"#FF8A80",
			"#D9463C"
		],
		outline: "#6E1A14",
		art: grid16("building brick", [
			"................",
			"................",
			"...34..34..34...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..222222222222..",
			"................",
			"................",
			"................"
		])
	},
	{
		id: "flipsies.pancakes",
		game: "flipsies",
		name: "Pancake stack",
		eyes: 9,
		colors: [
			"#F4C987",
			"#CF9450",
			"#FFE7B0",
			"#FFF6C9",
			"#9A4E1C"
		],
		outline: "#6B3810",
		art: grid16("pancakes", [
			"................",
			"................",
			".......44.......",
			"......4444......",
			"...5555555555...",
			"..355555555552..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..222222222222..",
			"..311111111112..",
			"..222222222222..",
			"................",
			"................"
		])
	},
	{
		id: "puttsies.bag",
		game: "puttsies",
		name: "Golf bag",
		eyes: 8,
		limb: 2,
		colors: [
			"#3A9466",
			"#256B47",
			"#5CB585",
			"#D7DCE4",
			"#8A93A3",
			"#FFFFFF"
		],
		outline: "#163F2A",
		art: grid16("golf bag", [
			"................",
			"....44.44.44....",
			".....5..5..5....",
			".....5..5..5....",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..366666666662..",
			"..311111111112..",
			"...2222222222...",
			"................",
			"................"
		])
	},
	{
		id: "weighsies.anvil",
		game: "weighsies",
		name: "Anvil",
		eyes: 6,
		colors: [
			"#9AA2B2",
			"#6E7688",
			"#C4CAD6"
		],
		outline: "#30343E",
		art: grid16("anvil", [
			"................",
			"................",
			"................",
			"....3111111112..",
			".3311111111112..",
			"..311111111112..",
			"...3111111112...",
			"...3111111112...",
			".....311112.....",
			".....311112.....",
			"....31111112....",
			"...3111111112...",
			"...2222222222...",
			"................",
			"................",
			"................"
		])
	},
	{
		id: "cutsies.toast",
		game: "cutsies",
		name: "Toast",
		eyes: 8,
		colors: [
			"#F7E0AA",
			"#E3C07C",
			"#FFF1CF",
			"#B77634"
		],
		outline: "#5E3410",
		art: grid16("toast", [
			"................",
			"................",
			"....44444444....",
			"...4111111114...",
			"..411111111114..",
			"..431111111124..",
			"..431111111124..",
			"..431111111124..",
			"..431111111124..",
			"..431111111124..",
			"..431111111124..",
			"..431111111124..",
			"..422222222224..",
			"..444444444444..",
			"................",
			"................"
		])
	},
	{
		id: "tiltsies.marble",
		game: "tiltsies",
		name: "Marble",
		eyes: 8,
		colors: [
			"#9ED8F2",
			"#68B2DA",
			"#E9F8FF",
			"#FF7AA8",
			"#FFFFFF"
		],
		outline: "#245A7A",
		art: grid16("marble", [
			"................",
			"................",
			"................",
			".....444111.....",
			"....35441111....",
			"...3511111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111142..",
			"...3111111442...",
			"....21114422....",
			".....222222.....",
			"................",
			"................"
		])
	},
	{
		id: "trackdle.stopwatch",
		game: "trackdle",
		name: "Stopwatch",
		eyes: 9,
		colors: [
			"#FFFFFF",
			"#E3E7EE",
			"#E5484D",
			"#2B2F38",
			"#C9CED8"
		],
		outline: "#7A1E22",
		art: grid16("stopwatch", [
			"................",
			".......44.......",
			"......5555......",
			".....333333.....",
			"...3311111133...",
			"..311111111113..",
			"..311114411113..",
			"..311111111113..",
			"..311111111113..",
			"..311111111113..",
			"..311111111123..",
			"..311111111223..",
			"...3311112233...",
			".....333333.....",
			"................",
			"................"
		])
	},
	{
		id: "amountle.gumball",
		game: "amountle",
		name: "Gumball machine",
		eyes: 7,
		colors: [
			"#EAF6FA",
			"#C5DDE6",
			"#FFFFFF",
			"#E5484D",
			"#B83236",
			"#FFD447",
			"#3FD1C1",
			"#FF7AA8",
			"#5A1A22"
		],
		outline: "#5A1A22",
		art: grid16("gumball machine", [
			"................",
			"................",
			".......44.......",
			".....455554.....",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..111111111112..",
			"..167186171682..",
			"...6871687862...",
			"...4444444444...",
			"...4444994445...",
			"...5555555555...",
			"................",
			"................"
		])
	},
	{
		id: "halfsies.lemon",
		game: "halfsies",
		name: "Lemon half",
		eyes: 8,
		colors: [
			"#FFE680",
			"#F2D35E",
			"#FFFFFF",
			"#FFD23A",
			"#E0A61E",
			"#FFFBE6"
		],
		outline: "#7A5A0A",
		art: grid16("lemon half", [
			"................",
			"................",
			"................",
			".....444444.....",
			"...4466666655...",
			"..461311113165..",
			"..461131131165..",
			"..461111111165..",
			"..461111111165..",
			"..461111111165..",
			"..461111111165..",
			"..461131131165..",
			"...4631113165...",
			"....55555555....",
			"................",
			"................"
		])
	},
	{
		id: "stackdle.stack",
		game: "stackdle",
		name: "Block stack",
		eyes: 8,
		limb: 2,
		colors: [
			"#FFB03B",
			"#E58A1F",
			"#FFD27A",
			"#FFE2A8",
			"#4C8DF6",
			"#3467C9",
			"#FF8FB1",
			"#E0628A",
			"#FFC2D6"
		],
		outline: "#6A3A0A",
		art: grid16("block stack", [
			"................",
			"................",
			".....997778.....",
			".....977778.....",
			".....888888.....",
			"..344444444442..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..222222222222..",
			"...5555555556...",
			"...5555555556...",
			"...6666666666...",
			"................",
			"................"
		])
	},
	{
		id: "flipsies.can",
		game: "flipsies",
		name: "Soda can",
		eyes: 8,
		colors: [
			"#E5484D",
			"#B83236",
			"#FF7A7E",
			"#D7DCE4",
			"#9AA0A8",
			"#FFFFFF"
		],
		outline: "#5A1A22",
		art: grid16("soda can", [
			"................",
			"................",
			"................",
			"...5444444445...",
			"...4555555554...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...6661111666...",
			"...3116666112...",
			"...4555555554...",
			"....44444444....",
			"................",
			"................"
		])
	},
	{
		id: "puttsies.windmill",
		game: "puttsies",
		name: "Windmill",
		eyes: 10,
		colors: [
			"#F4EDE0",
			"#D9CDB4",
			"#FFFFFF",
			"#C2463A",
			"#8E2E26",
			"#FFFFFF",
			"#B07A4A",
			"#2B2F38",
			"#3A9466"
		],
		outline: "#4A2A1E",
		art: grid16("windmill", [
			"................",
			"..66........66..",
			"..766......667..",
			"...766....667...",
			"....76688667....",
			".....644446.....",
			"...6444444456...",
			"..644444444456..",
			".67311111111276.",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111992...",
			"...2222222992...",
			"................",
			"................"
		])
	},
	{
		id: "weighsies.flour",
		game: "weighsies",
		name: "Flour sack",
		eyes: 9,
		limb: 2,
		colors: [
			"#F2E6CC",
			"#D6C5A0",
			"#FFFBF0",
			"#B07444",
			"#7FA8D8",
			"#4E78B0"
		],
		outline: "#5E4A2A",
		art: grid16("flour sack", [
			"................",
			"................",
			".....31...13....",
			"......3113......",
			".......44.......",
			".....311112.....",
			"....31111112....",
			"...3111111112...",
			"..311111111112..",
			"..311111111112..",
			"..311111111112..",
			"..315555555612..",
			"..316666666612..",
			"...2222222222...",
			"................",
			"................"
		])
	},
	{
		id: "cutsies.strawberry",
		game: "cutsies",
		name: "Strawberry",
		eyes: 8,
		colors: [
			"#F0435A",
			"#B82A40",
			"#FF8A96",
			"#FFE07A",
			"#5CB85C",
			"#3E8E3E"
		],
		outline: "#5A1422",
		art: grid16("strawberry", [
			"................",
			"................",
			"......5..5......",
			"....55566555....",
			"...3166666612...",
			"..341111111142..",
			"..311111111112..",
			"..411111111114..",
			"..311111111112..",
			"..311111111112..",
			"...4111111142...",
			"...3114114112...",
			"....21111122....",
			".....222222.....",
			"................",
			"................"
		])
	},
	{
		id: "tiltsies.acorn",
		game: "tiltsies",
		name: "Acorn",
		eyes: 9,
		colors: [
			"#E0A868",
			"#B87F42",
			"#F6CF98",
			"#8A5A32",
			"#A87448",
			"#6A4224",
			"#5C3A1E"
		],
		outline: "#3E2410",
		art: grid16("acorn", [
			"................",
			"................",
			".......77.......",
			"....55545554....",
			"...5454545454...",
			"..454545454546..",
			"..666666666666..",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"....31111112....",
			".....311112.....",
			".......22.......",
			"................",
			"................"
		])
	},
	{
		id: "trackdle.tyre",
		game: "trackdle",
		name: "Tyre",
		eyes: 8,
		colors: [
			"#C9CED8",
			"#9AA0A8",
			"#EEF1F5",
			"#2B2F38",
			"#4A4E58",
			"#FF7A2F"
		],
		outline: "#14161C",
		art: grid16("tyre", [
			"................",
			"................",
			"......5454......",
			"....44444445....",
			"...4446666445...",
			"..444633116445..",
			"..546331111644..",
			"..446311111644..",
			"..463111111264..",
			"..446111112644..",
			"..546111122644..",
			"..444611226445..",
			"...4446666445...",
			"....44444445....",
			"......5454......",
			"................"
		])
	}
];
const hats = [
	{
		id: "amountle.gem",
		game: "amountle",
		name: "Gem band",
		free: true,
		colors: [
			"#E3E7EE",
			"#9AA3B2",
			"#FFFFFF"
		],
		draw: on([
			"...wwaA...",
			"..wwaaaA..",
			".waaaaaaA.",
			"...aaAA...",
			"3121aA1212"
		], 0, 2)
	},
	{
		id: "amountle.crown",
		game: "amountle",
		name: "Jewelled crown",
		colors: [
			"#FFD25A",
			"#D99A1E",
			"#3FD1C1",
			"#A6F4EA",
			"#E5484D",
			"#FFF1B0",
			"#FF9EA1"
		],
		draw: on([
			"6....7....6",
			"1...656...2",
			"16.61112.12",
			"64311511432",
			"22222222222"
		], 0, 2)
	},
	{
		id: "halfsies.bowl",
		game: "halfsies",
		name: "Bandana",
		free: true,
		colors: [],
		draw: on([
			"...waaaA....",
			"..waawaaA.aA",
			".waaaaawaAA.",
			"waawaaaawaAA"
		], 0, 2)
	},
	{
		id: "halfsies.scale",
		game: "halfsies",
		name: "Hatchling",
		colors: [
			"#FFF6E6",
			"#DCC8A6",
			"#FFFFFF",
			"#B08A5A",
			"#FFF1A0",
			"#FFD23A",
			"#2A1B10",
			"#FF8A2B",
			"#E0A010"
		],
		draw: on([
			"...5669...",
			"...67698..",
			"3.319191.2",
			"3141111412",
			".21122112."
		], 0, 2)
	},
	{
		id: "stackdle.cube",
		game: "stackdle",
		name: "Brick cap",
		free: true,
		colors: [],
		draw: on([
			".wA..wA..wA.",
			"waaaaaaaaaaA",
			"aaaaaaaaaaaA",
			"aaaaaaaaaaAA",
			"AAAAAAAAAAAA"
		], 0, 2)
	},
	{
		id: "stackdle.tower",
		game: "stackdle",
		name: "Block tower",
		colors: [
			"#FF8FB1",
			"#D9557F",
			"#FFB03B",
			"#D97A12",
			"#6FA8FF",
			"#3F6FD0",
			"#FFD6E2",
			"#FFE0A0",
			"#C8DEFF"
		],
		draw: on([
			"..9556..",
			"..5556..",
			"71128334",
			"11123334",
			"22224444"
		], 0, 2)
	},
	{
		id: "flipsies.cap",
		game: "flipsies",
		name: "Bottle cap",
		free: true,
		colors: [],
		draw: on([
			".x.a.a.a.a.A.",
			"xaaaaaaaaaaaA",
			"xaAaAaAaAaAaA",
			"AAAAAAAAAAAAA"
		], 0, 2)
	},
	{
		id: "flipsies.landed",
		game: "flipsies",
		name: "Landed bottle",
		colors: [
			"#D6F0FD",
			"#8CCBEF",
			"#FFFFFF",
			"#E5484D",
			"#4A9BD8",
			"#1E4FA8",
			"#B8313A"
		],
		draw: on([
			"....66....",
			"....36....",
			"..311112..",
			"..344447..",
			"..355552.."
		], 0, 2)
	},
	{
		id: "puttsies.visor",
		game: "puttsies",
		name: "Golf cap",
		free: true,
		colors: [],
		draw: on([
			"....xaaA.....",
			"..xaaaaaaA...",
			".xaaawaaaaA..",
			"xaaaaaaaaaAAA"
		], 0, 2)
	},
	{
		id: "puttsies.flag",
		game: "puttsies",
		name: "Pin flag",
		colors: [
			"#E8ECF2",
			"#E5484D",
			"#A82A33",
			"#9BE36B",
			"#4CAF50",
			"#2E7D32",
			"#1C2A1E",
			"#FF8A8E"
		],
		draw: on([
			"......18882...",
			"......122223..",
			"..44441444445.",
			".4555575555556"
		], 0, 2)
	},
	{
		id: "weighsies.wedge",
		game: "weighsies",
		name: "Cheese wedge",
		free: true,
		colors: [
			"#FFBE3A",
			"#D9931F",
			"#B8761A",
			"#FFE08A"
		],
		draw: on([
			".........411",
			"......411111",
			"...411311131",
			"411111111112",
			"222222222222"
		], 0, 2)
	},
	{
		id: "weighsies.scale",
		game: "weighsies",
		name: "Heavyweight belt",
		colors: [
			"#F2C230",
			"#B9852A",
			"#FFF1B0",
			"#D8343C",
			"#8A1F26",
			"#3FA0FF",
			"#C8ECFF"
		],
		draw: on([
			"....311112....",
			"44443176124444",
			"55553166125555",
			"....222222...."
		], 0, 2)
	},
	{
		id: "cutsies.slice",
		game: "cutsies",
		name: "Kiwi slice",
		free: true,
		about: "A round of kiwi worn like a beret. Cutsies is the slicing game.",
		colors: [
			"#86CF55",
			"#C9F08F",
			"#2A1B10",
			"#F1F7D4",
			"#B98A5A",
			"#5FA83A",
			"#7A5432"
		],
		draw: on([
			"..555577..",
			".52311317.",
			"5231441367",
			".51311367.",
			"..777777.."
		])
	},
	{
		id: "cutsies.chef",
		game: "cutsies",
		name: "Chef's toque",
		about: "A chef's tall white toque, for the one who does the cutting in Cutsies.",
		colors: [
			"#FFFFFF",
			"#DCE3EC",
			"#B9C4D2",
			"#E5484D",
			"#A8202F"
		],
		draw: on([
			".11.11.12.",
			"1111111122",
			"1111111223",
			".12121223.",
			".44444445."
		])
	},
	{
		id: "tiltsies.ears",
		game: "tiltsies",
		name: "Hamster ears",
		free: true,
		colors: [
			"#EDB57D",
			"#FFB3A7",
			"#FFD8A8",
			"#C98A45"
		],
		draw: onPair([
			"33.",
			"321",
			"114"
		], 0)
	},
	{
		id: "tiltsies.buddy",
		game: "tiltsies",
		name: "Head hamster",
		about: "A hamster that naps on your head between runs.",
		colors: [
			"#EDB57D",
			"#C98A45",
			"#FFE7CB",
			"#FF9AA4",
			"#2A1B10"
		],
		draw: on([
			".11....12.",
			".14111142.",
			"1151111512",
			"1433443342",
			"1133333322"
		])
	},
	{
		id: "trackdle.cap",
		game: "trackdle",
		name: "Pit cap",
		free: true,
		colors: ["#23262D", "#FFFFFF"],
		draw: on([
			"....xaaA....",
			"..xaaaaaaA..",
			"..12121212..",
			"..aaaaaaaAAA"
		])
	},
	{
		id: "trackdle.helmet",
		game: "trackdle",
		name: "Race helmet",
		colors: [
			"#FF7A2F",
			"#D65A1C",
			"#FFFFFF",
			"#1C2733",
			"#6FA8D8",
			"#FFB27A"
		],
		draw: on([
			"...661111...",
			".6611331112.",
			".1111331122.",
			"444444455544"
		])
	},
	{
		id: "amountle.cluster",
		game: "amountle",
		name: "Crystal crest",
		colors: [
			"#B98AF5",
			"#7A4FD0",
			"#EBDDFF",
			"#3FD1C1",
			"#1F9C90",
			"#C8FFF7",
			"#FFD25A",
			"#D99A1E",
			"#FFF1B0"
		],
		draw: on([
			".....3.....",
			"..6..31..6.",
			".645.312.45",
			"64453112645",
			"99777777778"
		], 0, 2)
	},
	{
		id: "halfsies.helmet",
		game: "halfsies",
		name: "Saucepan",
		colors: [
			"#E07B4C",
			"#A9532E",
			"#FFB088",
			"#2B2B33",
			"#4E4E5A"
		],
		draw: on([
			".3331112....",
			".3111112....",
			".3111112....",
			".3111112....",
			"333333332554"
		], 1, 2)
	},
	{
		id: "stackdle.ring",
		game: "stackdle",
		name: "Ring stacker",
		colors: [
			"#FF5C6A",
			"#C22E3E",
			"#FFB03B",
			"#D97A12",
			"#7DD87A",
			"#3E9A4C",
			"#5C9BFF",
			"#2F64C8",
			"#FFE066"
		],
		draw: on([
			"....99....",
			"...1112...",
			"..333334..",
			".55555556.",
			"7777777778"
		])
	},
	{
		id: "flipsies.beret",
		game: "flipsies",
		name: "Diving helmet",
		colors: [
			"#E8B04A",
			"#B07A1E",
			"#FFE08A",
			"#9FE0FF",
			"#3E8FD6",
			"#6B4512"
		],
		draw: on([
			"....3666....",
			"..33111112..",
			".3114444112.",
			"611445544116",
			"6.62626262.6"
		], 0, 2)
	},
	{
		id: "puttsies.tam",
		game: "puttsies",
		name: "Tartan tam",
		colors: [
			"#2E7D4F",
			"#1F5C38",
			"#F2C230",
			"#E5484D",
			"#5FB07A",
			"#FF8A8E",
			"#B8313A"
		],
		draw: on([
			".....64.....",
			"...5513552..",
			".55113111312",
			"333333333332",
			".1131113112."
		], 0, 2)
	},
	{
		id: "weighsies.dumbbell",
		game: "weighsies",
		name: "Barbell",
		colors: [
			"#E5484D",
			"#A82A33",
			"#FF8A8E",
			"#E3E7EE",
			"#8A93A3"
		],
		draw: on([
			"31..........12",
			"31..........12",
			"31444444444412",
			"31555555555512"
		], 0, 2)
	},
	{
		id: "cutsies.orange",
		game: "cutsies",
		name: "Orange helmet",
		about: "Half an orange, scooped out and worn. It still smells great.",
		colors: [
			"#FF9F2E",
			"#E07B14",
			"#FFD08A",
			"#5CB85C",
			"#2E7D3A",
			"#6A4A1E",
			"#FFF1D6"
		],
		draw: on([
			"....6445..",
			"..331115..",
			".33131112.",
			"3131111122",
			"7777777777"
		])
	},
	{
		id: "tiltsies.seed",
		game: "tiltsies",
		name: "Maze miner",
		about: "A hard hat with a lamp, for finding the way through the maze in the dark.",
		colors: [
			"#FFD23A",
			"#D9A01E",
			"#FFF1A8",
			"#8A93A3",
			"#FFFFFF"
		],
		draw: on([
			"...31111...",
			"..3144412..",
			".311454122.",
			".311444122.",
			"22222222222"
		])
	},
	{
		id: "trackdle.trophy",
		game: "trackdle",
		name: "Trophy",
		about: "The winner's cup, in a laurel wreath.",
		colors: [
			"#FFD25A",
			"#C8901E",
			"#FFF1B0",
			"#5CB85C",
			"#2E7D3A"
		],
		draw: on([
			"4.33111112.5",
			"43.311112.25",
			"443.3112.255",
			".44..32..55.",
			"..4422222.5."
		])
	},
	{
		id: "amountle.coin-stack",
		game: "amountle",
		name: "Pirate hat",
		colors: [
			"#3E3852",
			"#221E30",
			"#625A80",
			"#FFD25A",
			"#C98A1A",
			"#FFFFFF"
		],
		draw: on([
			"..3111112..",
			".316666612.",
			"43162626124",
			".431666124.",
			"..4444445.."
		], 0, 2)
	},
	{
		id: "amountle.gumball-dome",
		game: "amountle",
		name: "Gumball dome",
		colors: [
			"#E5484D",
			"#A8283A",
			"#FF8A8E",
			"#FFD25A",
			"#3FD1C1",
			"#5C9BFF",
			"#FFFFFF",
			"#BFE6F5",
			"#FF6FC8"
		],
		draw: on([
			"...7888...",
			"..849568..",
			".86594548.",
			"3111111112",
			".21144112."
		], 0, 2)
	},
	{
		id: "halfsies.sandwich",
		game: "halfsies",
		name: "Melon helmet",
		colors: [
			"#4FAE5C",
			"#2E7D3A",
			"#9EE08A",
			"#F0435A",
			"#FFF4E0",
			"#2A1B10",
			"#C22E40"
		],
		draw: on([
			"..3212121..",
			".321212122.",
			"55555555555",
			"44644464447",
			"74447444677"
		], 0, 2)
	},
	{
		id: "halfsies.half-moon",
		game: "halfsies",
		name: "Half moon helm",
		colors: [
			"#3A4A6B",
			"#222C44",
			"#5E7096",
			"#FFD25A",
			"#D99A1E",
			"#FFF1B0",
			"#E5484D"
		],
		draw: on([
			"6....31....4",
			"46..3112..45",
			".4664774445.",
			"331111111122",
			"222222222222"
		], 0, 2)
	},
	{
		id: "stackdle.arch",
		game: "stackdle",
		name: "Castle keep",
		colors: [
			"#B5BCC8",
			"#7E8696",
			"#E3E7EE",
			"#E5484D",
			"#B02A35",
			"#3A3F4A"
		],
		draw: on([
			"31.31.31.12",
			"31111411112",
			"31611511612",
			"22222422222",
			"22222222222"
		], 0, 2)
	},
	{
		id: "stackdle.hardhat",
		game: "stackdle",
		name: "Hard hat",
		colors: [
			"#FFC93A",
			"#D9921A",
			"#FFE9A0",
			"#4A4E5E",
			"#FFFFFF"
		],
		draw: on([
			"....3311....",
			"..33111112..",
			".3114551112.",
			".3111111112.",
			"322222222222"
		], 0, 2)
	},
	{
		id: "flipsies.cup",
		game: "flipsies",
		name: "Party cup",
		colors: [
			"#E5484D",
			"#B83236",
			"#FFFFFF",
			"#FF8A8E",
			"#FF9A3C",
			"#DDE3EA"
		],
		draw: on([
			".....55...",
			".33333336.",
			".41111122.",
			"..411122..",
			"..411122.."
		], 0, 2)
	},
	{
		id: "flipsies.fin",
		game: "flipsies",
		name: "Shark fin",
		colors: [
			"#8FA6BC",
			"#56708A",
			"#D4E2EE",
			"#5CB8F2",
			"#FFFFFF",
			"#2F7CC8"
		],
		draw: on([
			".......31.....",
			"......3112....",
			"....331112....",
			"54543111112454"
		], 0, 2)
	},
	{
		id: "puttsies.argyle",
		game: "puttsies",
		name: "Argyle bucket",
		colors: [
			"#F4EDE0",
			"#C9BFA8",
			"#3A9466",
			"#E5484D",
			"#2E7D4F"
		],
		draw: on([
			"...113311...",
			"..13441431..",
			"..31331331..",
			"555555555555"
		], 0, 2)
	},
	{
		id: "puttsies.crown",
		game: "puttsies",
		name: "Hole-in-one crown",
		colors: [
			"#FFD25A",
			"#D99A1E",
			"#FFF1A8",
			"#FFFFFF",
			"#C9CFDA",
			"#E5484D",
			"#3FB56A"
		],
		draw: on([
			"3....45....1",
			"31..4455..12",
			"311111111112",
			"317161716172"
		], 0, 2)
	},
	{
		id: "weighsies.feather",
		game: "weighsies",
		name: "Viking helm",
		colors: [
			"#F4E6C8",
			"#C9A878",
			"#FFFFFF",
			"#C9CFDA",
			"#7E879A",
			"#F2C230",
			"#B9852A"
		],
		draw: on([
			"3............2",
			"31...3444...12",
			".3113444445122",
			"..6766676667.."
		], 0, 2)
	},
	{
		id: "weighsies.laurel",
		game: "weighsies",
		name: "Gold laurels",
		colors: [
			"#F2C230",
			"#B9852A",
			"#FFF1B0",
			"#E5484D"
		],
		draw: on([
			"13.3......3.31",
			".3131....1312.",
			"..2131..1312..",
			"...22144122..."
		], 0, 2)
	},
	{
		id: "cutsies.banana",
		game: "cutsies",
		name: "Banana split",
		about: "Three scoops on a split banana, with a cherry on top.",
		colors: [
			"#FFE066",
			"#E0B020",
			"#FFF4E0",
			"#E8D2B0",
			"#8A5A3A",
			"#5E3A1C",
			"#FF9EBB",
			"#E06A90",
			"#E5384D"
		],
		draw: on([
			".....99.....",
			".33.5556.77.",
			"133455566782",
			"111111111122"
		])
	},
	{
		id: "cutsies.kabuto",
		game: "cutsies",
		name: "Samurai kabuto",
		about: "A lacquered samurai helmet with golden horns, for the sharpest blade in Cutsies.",
		colors: [
			"#D8343F",
			"#8E1B26",
			"#FFD25A",
			"#C8901E",
			"#2B2F38",
			"#FF7A80"
		],
		draw: on([
			"3..........4",
			"33..6111..44",
			".3361111124.",
			"..61133112..",
			".5252525252."
		])
	},
	{
		id: "tiltsies.wheel",
		game: "tiltsies",
		name: "Marble crown",
		about: "A gold crown set with the three rarest marbles in the maze.",
		colors: [
			"#FFD25A",
			"#C8901E",
			"#FFF1B0",
			"#5CB8F2",
			"#2F7CC8",
			"#FF7AA8",
			"#C9407A",
			"#7DD87A",
			"#3E9A4C"
		],
		draw: on([
			".44..66..88.",
			".45..67..89.",
			".31..31..12.",
			"331111111122",
			"322222222222"
		])
	},
	{
		id: "tiltsies.ufo",
		game: "tiltsies",
		name: "Hamster UFO",
		about: "A hamster at the wheel of its own flying saucer.",
		colors: [
			"#C9CED8",
			"#8A93A3",
			"#F4F7FA",
			"#BFE8FF",
			"#EDB57D",
			"#FFD23A",
			"#6FA8D8",
			"#2A1B10"
		],
		draw: on([
			"...445547...",
			"..44855877..",
			"331111111122",
			".2626262622."
		])
	},
	{
		id: "trackdle.goggles",
		game: "trackdle",
		name: "Vintage racer",
		about: "A leather racing cap with the goggles pushed up, from when cars had no roofs.",
		colors: [
			"#8A5A2E",
			"#5E3A1C",
			"#B98250",
			"#C9CED8",
			"#6FA8D8",
			"#C4E8FB",
			"#8A93A3"
		],
		draw: on([
			"...331111...",
			"..31111112..",
			".4657114657.",
			".4557114557.",
			"311777777112"
		], 0, 2)
	},
	{
		id: "trackdle.f1",
		game: "trackdle",
		name: "Formula car",
		about: "A whole race car, parked on top.",
		colors: [
			"#E5484D",
			"#A8202F",
			"#FF8A8E",
			"#2B2F38",
			"#FFFFFF",
			"#FFD447",
			"#8A93A3"
		],
		draw: on([
			"222..66.....",
			".2311551111.",
			"444111114441",
			"474.....474."
		])
	}
];
const frames = [
	{
		id: "amountle.sparkle",
		game: "amountle",
		name: "Gem field",
		colors: [
			"#E4F6F4",
			"#3FD1C1",
			"#A6F4EA"
		],
		fill: (x, y) => {
			const gems = [
				[2, 2],
				[13, 3],
				[1, 9],
				[14, 12],
				[4, 14],
				[11, 14]
			];
			for (const [gx, gy] of gems) {
				if (x === gx && y === gy) return 2;
				if (Math.abs(x - gx) + Math.abs(y - gy) === 1) return 3;
			}
			return 1;
		}
	},
	{
		id: "halfsies.stripes",
		game: "halfsies",
		name: "Kitchen teal",
		colors: ["#7DD8D0", "#6CC7BF"],
		fill: (x, y) => (x + y) % 4 < 2 ? 1 : 2
	},
	{
		id: "stackdle.toybox",
		game: "stackdle",
		name: "Toy box",
		colors: [
			"#DCE8FF",
			"#FF8FB1",
			"#FFB03B",
			"#6FA8FF"
		],
		fill: (x, y) => {
			if ((x === 1 || x === 2) && (y === 1 || y === 2)) return 2;
			if (y === 13 && x >= 12 && x <= 14) return 3;
			if (y === 12 && x === 13) return 3;
			if ((x === 1 || x === 2) && (y === 13 || y === 14)) return 4;
			return 1;
		}
	},
	{
		id: "flipsies.target",
		game: "flipsies",
		name: "Bullseye",
		colors: [
			"#CFE8FB",
			"#8EC5F0",
			"#FFFFFF"
		],
		fill: (x, y) => {
			const d = Math.floor(Math.hypot(x - 7.5, y - 7.5));
			return d % 3 === 0 ? 2 : d % 3 === 1 ? 3 : 1;
		}
	},
	{
		id: "puttsies.quilt",
		game: "puttsies",
		name: "Patchwork",
		colors: [
			"#F7B7B0",
			"#B9E3A8",
			"#B3D4F5",
			"#FBE3A1",
			"#D7C6F2",
			"#FFFFFF"
		],
		fill: (x, y) => {
			if ((x % 4 === 0 || y % 4 === 0) && (x + y) % 2 === 0) return 6;
			return (Math.floor(x / 4) + Math.floor(y / 4) * 2) % 5 + 1;
		}
	},
	{
		id: "weighsies.lavender",
		game: "weighsies",
		name: "Lavender",
		colors: ["#C9B8F5", "#B39EEC"],
		fill: (x, y) => x % 3 === 1 && y % 3 === 1 ? 2 : 1
	},
	{
		id: "cutsies.slices",
		game: "cutsies",
		name: "Kiwi slices",
		about: "A wooden chopping board with a kiwi sliced at each corner.",
		colors: [
			"#D9A066",
			"#86CF55",
			"#2A1B10",
			"#7A5432",
			"#F1F7D4",
			"#BE8650"
		],
		fill: (x, y) => {
			for (const [kx, ky] of [
				[2, 2],
				[13, 13],
				[13, 2],
				[2, 13]
			]) {
				const d2 = (x - kx) ** 2 + (y - ky) ** 2;
				if (d2 === 0) return 5;
				if (d2 === 2) return 3;
				if (d2 <= 4) return 2;
				if (d2 <= 6) return 4;
			}
			return (y + (x >> 2)) % 5 === 0 ? 6 : 1;
		}
	},
	{
		id: "tiltsies.maze",
		game: "tiltsies",
		name: "Toy maze",
		colors: ["#F4EBD6", "#CFE3B0"],
		fill: (x, y) => (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 2 : 1
	},
	{
		id: "trackdle.flag",
		game: "trackdle",
		name: "Checkered flag",
		colors: ["#2A2D33", "#F4F4F4"],
		fill: (x, y) => (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 1 : 2
	},
	{
		id: "amountle.coins",
		game: "amountle",
		name: "Coin pile",
		colors: [
			"#FFF4D6",
			"#F2C230",
			"#C8901E"
		],
		fill: (x, y) => y >= 12 ? (x + y) % 3 === 0 ? 3 : 2 : (x * 7 + y * 3) % 23 === 0 ? 2 : 1
	},
	{
		id: "halfsies.gingham",
		game: "halfsies",
		name: "Gingham",
		colors: [
			"#FFFFFF",
			"#F7C2BA",
			"#EE968B"
		],
		fill: (x, y) => {
			const a = Math.floor(x / 2) % 2, b = Math.floor(y / 2) % 2;
			return a && b ? 3 : a || b ? 2 : 1;
		}
	},
	{
		id: "stackdle.bricks",
		game: "stackdle",
		name: "Bricks",
		colors: [
			"#F08A5D",
			"#D9704A",
			"#FCE1D2"
		],
		fill: (x, y) => y % 4 === 3 || (x + Math.floor(y / 4) % 2 * 2) % 4 === 3 ? 3 : (x + y) % 5 === 0 ? 2 : 1
	},
	{
		id: "flipsies.waves",
		game: "flipsies",
		name: "Waves",
		colors: [
			"#BFE6FF",
			"#7CC4F2",
			"#FFFFFF"
		],
		fill: (x, y) => {
			const v = (y + [
				0,
				1,
				1,
				0
			][x % 4]) % 4;
			return v === 0 ? 2 : v === 1 && x % 4 === 1 ? 3 : 1;
		}
	},
	{
		id: "puttsies.fairway",
		game: "puttsies",
		name: "Fairway",
		colors: ["#A6DB86", "#8CCB6C"],
		fill: (x) => Math.floor(x / 3) % 2 ? 2 : 1
	},
	{
		id: "weighsies.ruler",
		game: "weighsies",
		name: "Ruler",
		colors: ["#FFE9A8", "#B98420"],
		fill: (x, y) => y <= 1 && x % 2 === 0 || y === 2 && x % 4 === 0 || y >= 14 && x % 2 === 1 ? 2 : 1
	},
	{
		id: "cutsies.seeds",
		game: "cutsies",
		name: "Melon seeds",
		colors: [
			"#FF8FA3",
			"#2A1B10",
			"#FFC2CC"
		],
		fill: (x, y) => (x * 3 + y * 5) % 11 === 0 ? 2 : (x + y) % 2 === 0 && y % 3 === 0 ? 3 : 1
	},
	{
		id: "tiltsies.spiral",
		game: "tiltsies",
		name: "Spiral",
		colors: ["#E6D8FF", "#B9A3F0"],
		fill: (x, y) => Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))) % 2 ? 2 : 1
	},
	{
		id: "trackdle.tarmac",
		game: "trackdle",
		name: "Tarmac",
		colors: [
			"#5A5F6B",
			"#4A4E58",
			"#F2C230"
		],
		fill: (x, y) => x === 7 || x === 8 ? y % 4 < 2 ? 3 : 1 : (x * 5 + y * 3) % 7 === 0 ? 2 : 1
	},
	{
		id: "amountle.beans",
		game: "amountle",
		name: "Jelly beans",
		colors: [
			"#FFF4E4",
			"#FF5C8A",
			"#FFD447",
			"#3FD1C1",
			"#8C7CF0",
			"#7DD87A"
		],
		fill: (x, y) => {
			const beans = [
				[
					1,
					1,
					2
				],
				[
					12,
					1,
					4
				],
				[
					6,
					0,
					6
				],
				[
					0,
					5,
					5
				],
				[
					14,
					6,
					3
				],
				[
					1,
					10,
					4
				],
				[
					13,
					11,
					2
				],
				[
					3,
					14,
					3
				],
				[
					9,
					14,
					5
				],
				[
					12,
					14,
					6
				],
				[
					0,
					13,
					6
				]
			];
			for (const [bx, by, c] of beans) if (y === by && (x === bx || x === bx + 1)) return c;
			return 1;
		}
	},
	{
		id: "halfsies.split",
		game: "halfsies",
		name: "Half and half",
		colors: [
			"#F6C7AE",
			"#A9E3DC",
			"#FFFFFF"
		],
		fill: (x, y) => x + y === 15 && x % 2 === 0 ? 3 : x + y < 15 ? 1 : 2
	},
	{
		id: "stackdle.blueprint",
		game: "stackdle",
		name: "Blueprint",
		colors: [
			"#3A78D8",
			"#5A92E6",
			"#CFE2FF"
		],
		fill: (x, y) => {
			if ((x === 1 || x === 4) && y >= 1 && y <= 4 || (y === 1 || y === 4) && x >= 1 && x <= 4) return 3;
			return x % 4 === 3 || y % 4 === 3 ? 2 : 1;
		}
	},
	{
		id: "flipsies.tiles",
		game: "flipsies",
		name: "Pool tiles",
		colors: [
			"#9ED8F2",
			"#86CBEC",
			"#E9F8FF"
		],
		fill: (x, y) => x % 3 === 2 || y % 3 === 2 ? 3 : (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 2 : 1
	},
	{
		id: "puttsies.green",
		game: "puttsies",
		name: "Putting green",
		colors: [
			"#8ED46E",
			"#7CC45C",
			"#2B2F38",
			"#FFFFFF",
			"#E5484D"
		],
		fill: (x, y) => {
			if (x === 1 && y >= 0 && y <= 3) return 4;
			if ((x === 2 || x === 3) && y === 0) return 5;
			if (x === 2 && y === 1) return 5;
			if ((x === 0 || x === 2) && y === 4) return 3;
			if (x === 1 && y === 4) return 3;
			return Math.floor((x + y) / 3) % 2 ? 2 : 1;
		}
	},
	{
		id: "weighsies.dial",
		game: "weighsies",
		name: "Scale dial",
		colors: [
			"#FFF8E8",
			"#2B2F38",
			"#E5484D",
			"#E8DCC0"
		],
		fill: (x, y) => {
			const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy);
			if (d > 7.6) return 4;
			if (dx > 1 && dy < -1 && Math.abs(dx + dy) < .6) return 3;
			const a = Math.round(Math.atan2(dy, dx) / (2 * Math.PI) * 24);
			if (d > 6.2 && a % 2 === 0) return 2;
			return 1;
		}
	},
	{
		id: "cutsies.board",
		game: "cutsies",
		name: "Cutting board",
		colors: [
			"#E8C690",
			"#D9B077",
			"#B98B52"
		],
		fill: (x, y) => {
			if (x === 2 && y === 2 || x === 13 && y === 12) return 3;
			return (y + Math.floor(x / 5)) % 4 === 0 ? 2 : 1;
		}
	},
	{
		id: "tiltsies.bedding",
		game: "tiltsies",
		name: "Wood shavings",
		colors: [
			"#F6EBD2",
			"#E3C997",
			"#CFAE74"
		],
		fill: (x, y) => (x * 5 + y * 7) % 9 === 0 ? 2 : (x * 3 + y * 11) % 13 === 0 || y >= 13 && (x + y) % 3 === 0 ? 3 : 1
	},
	{
		id: "trackdle.kerb",
		game: "trackdle",
		name: "Kerb",
		colors: [
			"#5A5F6B",
			"#E5484D",
			"#FFFFFF",
			"#4A4E58"
		],
		fill: (x, y) => y <= 1 || y >= 14 ? Math.floor((x + y) / 2) % 2 ? 2 : 3 : (x * 5 + y * 3) % 7 === 0 ? 4 : 1
	}
];
/**
* A pet that sits at the guy's feet, bottom right, in front of everything but
* the face. Each is a bold shape of its own with a lit side, a shaded side and
* a face, filling as much of its 6x5 as it can, so it reads at a glance on any
* guy and any frame.
*/
const buddies = [
	{
		id: "amountle.gemling",
		game: "amountle",
		name: "Gemling",
		colors: [
			"#3FD1C1",
			"#1F9C90",
			"#C8FFF7",
			"#137068",
			"#FFFFFF"
		],
		art: pet("gemling", [
			"..531.",
			".33112",
			".31112",
			".1o1o2",
			"..124."
		])
	},
	{
		id: "halfsies.pea",
		game: "halfsies",
		name: "Toaster",
		colors: [
			"#C9D1DC",
			"#7E8898",
			"#F2F5F9",
			"#E8B060",
			"#B07A30",
			"#2B2F38"
		],
		art: pet("toaster", [
			".4545.",
			".33332",
			"611112",
			".1o1o2",
			".62226"
		])
	},
	{
		id: "stackdle.cubelet",
		game: "stackdle",
		name: "Cubelet",
		colors: [
			"#FFB03B",
			"#D97A12",
			"#FFE0A0",
			"#A85A0A"
		],
		art: pet("cubelet", [
			"..333.",
			".33334",
			".11112",
			".1o1o2",
			".22224"
		])
	},
	{
		id: "flipsies.droplet",
		game: "flipsies",
		name: "Droplet",
		colors: [
			"#5CB8F2",
			"#2F7CC8",
			"#FFFFFF",
			"#1E5A9E"
		],
		art: pet("droplet", [
			"....3.",
			"...312",
			"..3112",
			".3o1o2",
			".11224"
		])
	},
	{
		id: "puttsies.tee",
		game: "puttsies",
		name: "Tee buddy",
		colors: [
			"#FFFFFF",
			"#C9CFDA",
			"#E8B060",
			"#B98232"
		],
		art: pet("tee buddy", [
			"....1.",
			"...112",
			"..1212",
			".1o1o2",
			"..334."
		])
	},
	{
		id: "weighsies.mouse",
		game: "weighsies",
		name: "Mouse",
		colors: [
			"#B9C0CE",
			"#7E879A",
			"#FF9EBB",
			"#E3E7EE"
		],
		art: pet("mouse", [
			"....44",
			"...434",
			"..11o1",
			".11113",
			"32222."
		])
	},
	{
		id: "cutsies.seedling",
		game: "cutsies",
		name: "Seedling",
		about: "A sprout in a clay pot that follows you around. It came from a kiwi seed.",
		colors: [
			"#7DD87A",
			"#3E9A4C",
			"#E07B4C",
			"#B05A30",
			"#F4A77C"
		],
		art: pet("seedling", [
			"...112",
			".55554",
			".3o3o4",
			".33344",
			"..344."
		])
	},
	{
		id: "tiltsies.hamlet",
		game: "tiltsies",
		name: "Hamlet",
		colors: [
			"#F2B66D",
			"#C98A45",
			"#FFF1DE",
			"#FF9EBB"
		],
		art: pet("hamlet", [
			"..1.2.",
			".11112",
			".1o1o2",
			".43342",
			".3322."
		])
	},
	{
		id: "trackdle.snail",
		game: "trackdle",
		name: "Turbo snail",
		colors: [
			"#E5484D",
			"#A8202F",
			"#FFD08A",
			"#9FD18A",
			"#5FA04A",
			"#FFFFFF"
		],
		art: pet("turbo snail", [
			"..1.o4",
			"13314.",
			"162144",
			".22244",
			"444455"
		])
	},
	{
		id: "amountle.jellybean",
		game: "amountle",
		name: "Gummy bear",
		colors: [
			"#FF5C6A",
			"#B8283A",
			"#FFB0B6"
		],
		art: pet("gummy bear", [
			".3..3.",
			".31112",
			"311112",
			".1o1o2",
			".13332"
		])
	},
	{
		id: "amountle.piglet",
		game: "amountle",
		name: "Piggy bank",
		colors: [
			"#FFA3C0",
			"#D9658C",
			"#FFD2E0",
			"#FFE066",
			"#D9A21E",
			"#B8406E"
		],
		art: pet("piggy bank", [
			".2.45.",
			".31112",
			"311112",
			".1o1o2",
			".16662"
		])
	},
	{
		id: "amountle.mimic",
		game: "amountle",
		name: "Mimic chest",
		colors: [
			"#B86B32",
			"#6E3A18",
			"#E59A55",
			"#FFD25A",
			"#C98A1A",
			"#3A1020",
			"#FFFFFF"
		],
		art: pet("mimic chest", [
			".3112.",
			".31112",
			"344542",
			".1o1o2",
			".76767"
		])
	},
	{
		id: "halfsies.yolk",
		game: "halfsies",
		name: "Sunny egg",
		colors: [
			"#FFFFFF",
			"#C9D1DC",
			"#FFC93A",
			"#E58A12",
			"#FFF2B8"
		],
		art: pet("sunny egg", [
			"..111.",
			".11111",
			"115331",
			".3o3o4",
			".13342"
		])
	},
	{
		id: "halfsies.berry",
		game: "halfsies",
		name: "Strawberry",
		colors: [
			"#F0435A",
			"#A82238",
			"#FF9AAA",
			"#5CB85C",
			"#2E7D3A",
			"#FFE7A0"
		],
		art: pet("strawberry", [
			".4545.",
			".31112",
			"316162",
			".1o1o2",
			"..162."
		])
	},
	{
		id: "halfsies.avo",
		game: "halfsies",
		name: "Avo",
		colors: [
			"#D8EE8A",
			"#9CCB4A",
			"#2E5A1E",
			"#A0602E",
			"#6A3A18",
			"#D99060"
		],
		art: pet("avo", [
			"..233.",
			".21113",
			"211113",
			".2o1o3",
			".26443"
		])
	},
	{
		id: "stackdle.pyramid",
		game: "stackdle",
		name: "Ziggurat",
		colors: [
			"#FF8FB1",
			"#D9557F",
			"#FFC9DA",
			"#FFD25A",
			"#A83A60"
		],
		art: pet("ziggurat", [
			"...4..",
			"..312.",
			".33332",
			".1o1o2",
			".25552"
		])
	},
	{
		id: "stackdle.brickling",
		game: "stackdle",
		name: "Brickling",
		colors: [
			"#5C9BFF",
			"#2F64C8",
			"#B5D3FF",
			"#1E3F8A"
		],
		art: pet("brickling", [
			".3..3.",
			".33332",
			".11112",
			".1o1o2",
			".22224"
		])
	},
	{
		id: "stackdle.wobble",
		game: "stackdle",
		name: "Wobble",
		colors: [
			"#7DD87A",
			"#3E9A4C",
			"#C6F5B0",
			"#FFD84A",
			"#D9A21E",
			"#FF6F91",
			"#C93A66"
		],
		art: pet("wobble", [
			"..67..",
			".4445.",
			"311112",
			".1o1o2",
			".2222."
		])
	},
	{
		id: "flipsies.shortstack",
		game: "flipsies",
		name: "Short stack",
		colors: [
			"#E8A04E",
			"#9A5A20",
			"#FBD79A",
			"#FFE45C",
			"#6A300C"
		],
		art: pet("short stack", [
			"....33",
			"...422",
			"..3333",
			".1o1o5",
			"222252"
		])
	},
	{
		id: "flipsies.duck",
		game: "flipsies",
		name: "Rubber duck",
		colors: [
			"#FFD84A",
			"#E0A820",
			"#FFF1A8",
			"#FF7A1A"
		],
		art: pet("rubber duck", [
			"....31",
			"...3o4",
			"...112",
			"311112",
			".22222"
		])
	},
	{
		id: "flipsies.whale",
		game: "flipsies",
		name: "Lil whale",
		colors: [
			"#5C8FE0",
			"#2F5FB0",
			"#9CC2F5",
			"#E6F3FF",
			"#7FD8FF"
		],
		art: pet("lil whale", [
			"...5.5",
			"....5.",
			"..3111",
			"3311o1",
			".44442"
		])
	},
	{
		id: "puttsies.gopher",
		game: "puttsies",
		name: "Gopher",
		colors: [
			"#B07A4A",
			"#7A4E2A",
			"#F2D4A8",
			"#7ED957",
			"#3A9466",
			"#FFFFFF"
		],
		art: pet("gopher", [
			"....2.",
			"...311",
			"..31o3",
			".41136",
			"445554"
		])
	},
	{
		id: "puttsies.frog",
		game: "puttsies",
		name: "Hazard frog",
		colors: [
			"#6CC24A",
			"#3E8E2E",
			"#C8F59A",
			"#256B20"
		],
		art: pet("hazard frog", [
			"...33.",
			"..1o12",
			".11144",
			"322122"
		])
	},
	{
		id: "puttsies.turtle",
		game: "puttsies",
		name: "Golf turtle",
		colors: [
			"#FFFFFF",
			"#C9CFDA",
			"#8A93A3",
			"#6CC24A",
			"#3E8E2E"
		],
		art: pet("golf turtle", [
			"....44",
			"...4o4",
			"..1214",
			".12124",
			"555555"
		])
	},
	{
		id: "weighsies.cheddar",
		game: "weighsies",
		name: "Cheddar",
		colors: [
			"#FFC94A",
			"#D98F22",
			"#FFE38F",
			"#E3A52E",
			"#B8761A"
		],
		art: pet("cheddar", [
			"....31",
			"...311",
			"..3141",
			".3o1o1",
			"222222"
		])
	},
	{
		id: "weighsies.chick",
		game: "weighsies",
		name: "Chick",
		colors: [
			"#FFE066",
			"#E8B320",
			"#FFF6C2",
			"#FF8A2B",
			"#C9851A"
		],
		art: pet("chick", [
			"....3.",
			"...311",
			"..31o4",
			".31112",
			"..4.4."
		])
	},
	{
		id: "weighsies.elephant",
		game: "weighsies",
		name: "Baby elephant",
		colors: [
			"#B9C0CE",
			"#7E879A",
			"#E3E7EE",
			"#FFB3C7",
			"#5E6677"
		],
		art: pet("baby elephant", [
			"....31",
			"...4o1",
			"..3415",
			".31115",
			".2.2.5"
		])
	},
	{
		id: "cutsies.cherries",
		game: "cutsies",
		name: "Cherries",
		colors: [
			"#E5384D",
			"#A8202F",
			"#FF9AA4",
			"#4FAE5C",
			"#2E7D3A"
		],
		art: pet("cherries", [
			"...45.",
			"..312.",
			".3o1o2",
			".11112",
			"31222."
		])
	},
	{
		id: "cutsies.pineapple",
		game: "cutsies",
		name: "Pineapple",
		colors: [
			"#FFC93A",
			"#D9961E",
			"#FFE7A0",
			"#5CB85C",
			"#2E7D3A"
		],
		art: pet("pineapple", [
			"...454",
			"..3122",
			".3o2o2",
			".12122",
			"..222."
		])
	},
	{
		id: "cutsies.shadow",
		game: "cutsies",
		name: "Lil ninja",
		about: "A tiny ninja who cuts whatever you leave on the board.",
		colors: [
			"#4A5068",
			"#262A38",
			"#7A8098",
			"#FFE4C2",
			"#E5484D",
			"#A8202F"
		],
		art: pet("lil ninja", [
			"..3116",
			".55552",
			"14o4o2",
			".11112",
			".12.12"
		])
	},
	{
		id: "tiltsies.rolly",
		game: "tiltsies",
		name: "Rolly",
		colors: [
			"#A8DDF5",
			"#4F94C4",
			"#FFFFFF",
			"#EDB57D",
			"#B97A45",
			"#FF9EBB"
		],
		art: pet("rolly", [
			"..3112",
			".34142",
			"31o4o2",
			".14652",
			"..222."
		])
	},
	{
		id: "tiltsies.sunflower",
		game: "tiltsies",
		name: "Sunflower",
		colors: [
			"#FFD23A",
			"#E0A61E",
			"#A86A3A",
			"#4FAE5C",
			"#FFF1A8",
			"#6E4220"
		],
		art: pet("sunflower", [
			"..5112",
			".53332",
			"13o3o2",
			".13662",
			"44122."
		])
	},
	{
		id: "tiltsies.hedgehog",
		game: "tiltsies",
		name: "Rollhog",
		about: "A hedgehog that curls into a ball and rolls the maze with you.",
		colors: [
			"#A8794E",
			"#5E3A1C",
			"#D9AE7E",
			"#FFE4C2",
			"#2A1B10"
		],
		art: pet("rollhog", [
			"..3131",
			".31312",
			"34o4o2",
			".44542",
			".4..4."
		])
	},
	{
		id: "trackdle.conelet",
		game: "trackdle",
		name: "Conelet",
		colors: [
			"#FF7A2F",
			"#C8501A",
			"#FFFFFF",
			"#FFAE73",
			"#2B2F38"
		],
		art: pet("conelet", [
			"...41.",
			"..3332",
			".4o1o2",
			".33332",
			"555555"
		])
	},
	{
		id: "trackdle.kart",
		game: "trackdle",
		name: "Go-kart",
		colors: [
			"#E5484D",
			"#A8202F",
			"#E8F4FF",
			"#2B2F38",
			"#FF8A8E",
			"#FFD447"
		],
		art: pet("go-kart", [
			"..5112",
			".13332",
			"13o3o2",
			".61162",
			"44..44"
		])
	},
	{
		id: "trackdle.hare",
		game: "trackdle",
		name: "Pace hare",
		about: "The hare the whole field chases, in its racing scarf.",
		colors: [
			"#C9A27A",
			"#8E6A44",
			"#FFB3C1",
			"#E5484D",
			"#A8202F",
			"#F4E6D2"
		],
		art: pet("pace hare", [
			"...1.2",
			"..1112",
			".1o1o2",
			".66612",
			".4445."
		])
	}
];
/**
* Hats that only drop on certain days of the year. A copy keeps the date it
* dropped, so a 2026 Pumpkin is a different thing from a 2027 one.
*/
const seasonal = [
	{
		id: "club.birthday",
		game: "club",
		name: "Club birthday",
		season: {
			from: "10-12",
			to: "10-16"
		},
		colors: [
			"#5FB4FF",
			"#FFD447",
			"#FF6FA0"
		],
		draw: on([
			"...3...",
			"..121..",
			"..212..",
			".12121.",
			"2121212"
		], 0, 2)
	},
	{
		id: "club.pumpkin",
		game: "club",
		name: "Pumpkin",
		season: {
			from: "10-20",
			to: "11-02"
		},
		colors: [
			"#FF8A2B",
			"#D9661A",
			"#4FAE5C",
			"#FFB866"
		],
		draw: on([
			"...33...",
			".412214.",
			"41121121",
			"11121121",
			".222222."
		], 0, 2)
	},
	{
		id: "club.snowcap",
		game: "club",
		name: "Snow cap",
		season: {
			from: "12-15",
			to: "01-06"
		},
		colors: [
			"#E5484D",
			"#B83236",
			"#FFFFFF",
			"#DCE3EC",
			"#FF8A8E"
		],
		draw: on([
			"....511122.33",
			"..51111111234",
			".51111111112.",
			"3433343334333"
		])
	},
	{
		id: "club.sweetheart",
		game: "club",
		name: "Sweetheart",
		season: {
			from: "02-10",
			to: "02-16"
		},
		colors: [
			"#FF5C8A",
			"#D93A6A",
			"#FFC2D4"
		],
		draw: on([
			".11..11.",
			"13111112",
			"11111112",
			".111112.",
			"..1122.."
		])
	},
	{
		id: "club.newyear",
		game: "club",
		name: "New Year top hat",
		season: {
			from: "12-29",
			to: "01-02"
		},
		colors: [
			"#2B2F38",
			"#4A4E5E",
			"#F2C230",
			"#FF6FA0",
			"#5FB4FF"
		],
		draw: on([
			"...2111111...",
			"...2111111...",
			"...3334333...",
			".21111111111."
		])
	},
	{
		id: "club.lantern",
		game: "club",
		name: "Red lantern",
		season: {
			from: "01-20",
			to: "02-12"
		},
		colors: [
			"#E5363D",
			"#B02028",
			"#FFD447",
			"#FF8A80"
		],
		draw: on([
			"...3...",
			".33333.",
			"4111112",
			"4111112",
			".33333."
		], 0, 2)
	},
	{
		id: "club.shamrock",
		game: "club",
		name: "Leprechaun hat",
		season: {
			from: "03-10",
			to: "03-18"
		},
		colors: [
			"#4FBF5C",
			"#2E8E3E",
			"#F2C230",
			"#2B2F38",
			"#A8EBA8",
			"#B98A1A"
		],
		draw: on([
			"...5111112.55",
			"...5111112.15",
			"...4436344..2",
			".51111111112."
		])
	},
	{
		id: "club.blossom",
		game: "club",
		name: "Cherry blossom",
		season: {
			from: "03-19",
			to: "04-14"
		},
		colors: [
			"#FFB3D1",
			"#F07AA8",
			"#FFF4A0",
			"#FFFFFF",
			"#5FBF6A"
		],
		draw: on([
			".1.....1.....",
			"434.1.434.1..",
			".1.434.1.434.",
			"552515525155."
		])
	},
	{
		id: "club.egg",
		game: "club",
		name: "Painted egg",
		season: {
			from: "03-22",
			to: "04-25"
		},
		colors: [
			"#B9A3F0",
			"#8C7CF0",
			"#FFE066",
			"#7FD1AE",
			"#E6DCFF"
		],
		draw: on([
			"..51..",
			".5112.",
			"511112",
			"343434",
			"111112"
		], 0, 2)
	},
	{
		id: "club.daisy",
		game: "club",
		name: "Daisy chain",
		season: {
			from: "05-01",
			to: "05-31"
		},
		colors: [
			"#FFFFFF",
			"#FFD23A",
			"#4FAE5C",
			"#DCE3EC"
		],
		draw: on([
			".1...1...1..",
			"121.121.121.",
			".1...1...1..",
			"334333433343"
		])
	},
	{
		id: "club.sunhat",
		game: "club",
		name: "Sun hat",
		season: {
			from: "06-14",
			to: "07-20"
		},
		colors: [
			"#F2D58A",
			"#D9B060",
			"#E5484D",
			"#FFF1C2"
		],
		draw: on([
			"....414141....",
			"....333333....",
			"41111111111111",
			"22222222222222"
		])
	},
	{
		id: "club.sparkler",
		game: "club",
		name: "Fireworks",
		season: {
			from: "07-01",
			to: "07-07"
		},
		colors: [
			"#FFE066",
			"#FF6B78",
			"#7FB0FF",
			"#FFFFFF",
			"#8A93A3"
		],
		draw: on([
			"2..1..3",
			".2.1.3.",
			"..444..",
			"1444442",
			"..555.."
		], 0, 2)
	},
	{
		id: "club.icecream",
		game: "club",
		name: "Ice cream",
		season: {
			from: "08-01",
			to: "08-25"
		},
		colors: [
			"#FFB3D1",
			"#F07AA8",
			"#E8B060",
			"#B98232",
			"#FFE3EE"
		],
		draw: on([
			"...3...",
			"..343..",
			".34343.",
			"1111112",
			"5111112"
		], 0, 2)
	},
	{
		id: "club.maple",
		game: "club",
		name: "Maple leaf",
		season: {
			from: "09-20",
			to: "11-30"
		},
		colors: [
			"#E8572E",
			"#B83A1A",
			"#FFA05A",
			"#8A5A32"
		],
		draw: on([
			"....1....",
			"1.11311.1",
			"111131111",
			".1131311.",
			"..2.4.2.."
		])
	},
	{
		id: "club.turkey",
		game: "club",
		name: "Turkey feathers",
		season: {
			from: "11-18",
			to: "11-30"
		},
		colors: [
			"#E5484D",
			"#FF9F2E",
			"#FFD447",
			"#8A5A32",
			"#B07444"
		],
		draw: on([
			"1.2.3.2.1",
			"121323121",
			".2133312.",
			"..44544.."
		])
	},
	{
		id: "club.antlers",
		game: "club",
		name: "Reindeer antlers",
		season: {
			from: "12-01",
			to: "12-24"
		},
		colors: [
			"#A8743F",
			"#7A5228",
			"#E5484D",
			"#4FAE5C",
			"#C9935A"
		],
		draw: on([
			"5.5......5.5",
			"1.1.1..1.1.1",
			".112....211.",
			"..22434422.."
		])
	}
];
/** The seasonal items that drop on a day (`YYYY-MM-DD` or a Date, read in UTC). */
function inSeason(day) {
	const md = (typeof day === "string" ? day : day.toISOString()).slice(5, 10);
	return items.filter((i) => i.season && (i.season.from <= i.season.to ? md >= i.season.from && md <= i.season.to : md >= i.season.from || md <= i.season.to));
}
/**
* One per machine: a whole new character, drawn bigger and bolder than the
* rest, rarer than any other item in its machine (`SHOWPIECE_WEIGHT`), and
* every copy moves with its own effect (`signature`).
*/
const showpieces = [
	{
		id: "amountle.dragon",
		game: "amountle",
		name: "Dragon",
		eyes: 8,
		limb: 2,
		showpiece: true,
		signature: "embers",
		about: "Guards the jar.",
		colors: [
			"#3BB273",
			"#25814F",
			"#86E3AE",
			"#FFE29A",
			"#FFF6DC",
			"#9B6BE0",
			"#6A44B0",
			"#E8C25A",
			"#FF8A3D"
		],
		outline: "#123F27",
		art: grid16("dragon", [
			"................",
			"....5......5....",
			"....55....55....",
			".....311112.....",
			".66.31111112.66.",
			".67311111111276.",
			".66311111111266.",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3114444112...",
			"...3144444412.2.",
			"....24444442.22.",
			".....222222.....",
			"................",
			"................"
		])
	},
	{
		id: "stackdle.robot",
		game: "stackdle",
		name: "Robot",
		eyes: 8,
		limb: 2,
		showpiece: true,
		signature: "electric",
		about: "Built one block at a time.",
		colors: [
			"#B8C4D6",
			"#7C8AA3",
			"#E6EEF8",
			"#FF4D5E",
			"#4FD1FF",
			"#FFD447",
			"#3A4258",
			"#FFFFFF"
		],
		outline: "#2A3044",
		art: grid16("robot", [
			"................",
			".......4........",
			".......7........",
			"...3333333332...",
			"..731111111127..",
			"..731111111127..",
			"..731111111127..",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...2222222222...",
			"...2575645752...",
			"...2222222222...",
			"....77....77....",
			"................",
			"................"
		])
	},
	{
		id: "flipsies.shark",
		game: "flipsies",
		name: "Shark",
		eyes: 8,
		limb: 2,
		showpiece: true,
		signature: "bubbles",
		about: "Lands every flip.",
		colors: [
			"#5B8DB8",
			"#3E6A91",
			"#9CC4E4",
			"#F2F7FB",
			"#2E5272",
			"#D7E6F2"
		],
		outline: "#1B3550",
		art: grid16("shark", [
			"................",
			".......5........",
			"......55........",
			".....355........",
			"....31111112....",
			"...3111111112...",
			"...3111111112...",
			"..53111111112...",
			"..53111111112...",
			"...3144444412...",
			".2231444444125..",
			".22.24444442.55.",
			".....244442.....",
			"......2222......",
			"................",
			"................"
		])
	},
	{
		id: "weighsies.knight",
		game: "weighsies",
		name: "Knight",
		eyes: 8,
		limb: 2,
		showpiece: true,
		signature: "shimmer",
		about: "Armour weighs a ton.",
		colors: [
			"#C9D3E0",
			"#8A97AB",
			"#F2F6FB",
			"#E5484D",
			"#A82E33",
			"#FFE6CC",
			"#FFC93C",
			"#3A4258"
		],
		outline: "#272D3D",
		art: grid16("knight", [
			"................",
			".......44.......",
			"......4554......",
			"....33171112....",
			"...3111711112...",
			"..311117111112..",
			"..316666666612..",
			"..316666666612..",
			"..316666666612..",
			"..316666666612..",
			"..311666666112..",
			"..311666666112..",
			"...2777777772...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "tiltsies.astronaut",
		game: "tiltsies",
		name: "Astronaut",
		eyes: 8,
		limb: 1,
		showpiece: true,
		signature: "starlight",
		about: "Rolls in zero gravity.",
		colors: [
			"#F4F6FA",
			"#C3CAD6",
			"#FFFFFF",
			"#CFEAFF",
			"#7FB8E8",
			"#FF8A3D",
			"#3A4258",
			"#E5484D",
			"#3A6FE0"
		],
		outline: "#2B3346",
		art: grid16("astronaut", [
			"................",
			".......8........",
			".......7........",
			"....33111112....",
			"...3155555512...",
			"..315444444512..",
			"..354344444451..",
			"..354444444451..",
			"..354444444451..",
			"..354444444451..",
			"..315444444512..",
			"..611544445116..",
			"..611191111116..",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "trackdle.rocket",
		game: "trackdle",
		name: "Rocket",
		eyes: 9,
		showpiece: true,
		signature: "embers",
		about: "Fastest lap ever.",
		colors: [
			"#F4F6FA",
			"#C3CAD6",
			"#FFFFFF",
			"#E5484D",
			"#A82E33",
			"#FF8A3D",
			"#FFD447",
			"#3A6FE0",
			"#FFF3B0"
		],
		outline: "#3A1418",
		art: grid16("rocket", [
			"................",
			".......44.......",
			"......4445......",
			".....444445.....",
			"....31111112....",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			".4.3111111112.5.",
			".443111111112.5.",
			".44.31111112..5.",
			".....676676.....",
			"......6766......",
			"................"
		])
	},
	{
		id: "puttsies.ufo",
		game: "puttsies",
		name: "UFO",
		eyes: 7,
		showpiece: true,
		signature: "neon",
		about: "Hole in one, from orbit.",
		colors: [
			"#C9F7EA",
			"#8ED9C6",
			"#FFFFFF",
			"#A9B4C8",
			"#6E7A93",
			"#E6ECF5",
			"#FFD447",
			"#FF7AA8",
			"#6BE07B"
		],
		outline: "#283147",
		art: grid16("ufo", [
			"................",
			"................",
			".....311112.....",
			"....31111112....",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"..611111111116..",
			".66666666666665.",
			".47448449447445.",
			".55555555555555.",
			"...5........5...",
			"................",
			"................",
			"................"
		])
	},
	{
		id: "cutsies.ninja",
		game: "cutsies",
		name: "Ninja",
		eyes: 9,
		limb: 4,
		showpiece: true,
		signature: "pulse",
		about: "Slices before you see it.",
		colors: [
			"#FFE0C2",
			"#1A1B2C",
			"#4A4E6E",
			"#2B2D42",
			"#E5484D",
			"#A82E33",
			"#C9D3E0"
		],
		outline: "#0E0F1A",
		art: grid16("ninja", [
			"................",
			"................",
			".....344442.....",
			"....34444442....",
			"...5555555555...",
			"...666666666656.",
			"...344444444265.",
			"...3111111112.6.",
			"...3111111112...",
			"...3111111112...",
			"...3111111112...",
			"...3411111142...",
			"...3474444442...",
			"....22222222....",
			"................",
			"................"
		])
	},
	{
		id: "halfsies.cyborg",
		game: "halfsies",
		name: "Cyborg",
		eyes: 8,
		limb: 2,
		showpiece: true,
		signature: "holo",
		about: "Half of you, upgraded.",
		colors: [
			"#B8C4D6",
			"#7C8AA3",
			"#E6EEF8",
			"#4FD1FF",
			"#FF4D5E",
			"#FF4D5E"
		],
		outline: "#2A3044",
		art: grid16("cyborg", [
			"................",
			"................",
			"................",
			".....hh#3311....",
			"....h###31111...",
			"...h####3116122.",
			"...#####31111...",
			"...#####31111...",
			"...#####31111...",
			"...#####31111...",
			"...s####31111...",
			"...s####311612..",
			"....ss##31112...",
			".....sss2222....",
			"................",
			"................"
		])
	}
];
/** Every item: each game's skins, then hats, then frames, then buddies, then the seasonal hats. */
const base = [
	...skins.map((i) => ({
		...i,
		slot: "skin"
	})),
	...showpieces.map((i) => ({
		...i,
		slot: "skin"
	})),
	...hats.map((i) => ({
		...i,
		slot: "hat"
	})),
	...frames.map((i) => ({
		...i,
		slot: "frame"
	})),
	...buddies.map((i) => ({
		...i,
		slot: "buddy"
	})),
	...seasonal.map((i) => ({
		...i,
		slot: "hat"
	})),
	...[...AURAS, ...ONE_OF_ONE_AURAS].map(({ id, name, colors }) => ({
		id,
		name,
		colors,
		game: "club",
		slot: "aura"
	}))
];
/** Every item: the first lists, each machine's set laid over them (redraws, retirements), then its new items. */
const items = (() => {
	const sets = Object.values(SETS);
	const out = base.map((i) => {
		const set$10 = sets.find((st) => st.redraw[i.id] || st.retire.includes(i.id));
		return set$10 ? {
			...i,
			...set$10.redraw[i.id],
			...set$10.retire.includes(i.id) ? { retired: true } : {}
		} : i;
	});
	return [...out, ...sets.flatMap((st) => st.add)];
})();
const byId = new Map(items.map((i) => [i.id, i]));
function itemById(id) {
	return id ? byId.get(id) : void 0;
}
/** Each machine's own colour: its set symbol on a card, as the site's machines are painted. */
const SET_COLORS = {
	amountle: "#ff7eb6",
	halfsies: "#f2b066",
	stackdle: "#ffd447",
	flipsies: "#5fb4ff",
	puttsies: "#74d97c",
	weighsies: "#a98bff",
	cutsies: "#ff6b6b",
	tiltsies: "#4fd6c4",
	trackdle: "#ff8a3d",
	pets: "#e48cf2"
};
/** Every machine, in the order they joined: a new one goes on the end, so nothing else moves. */
const GAMES = [
	"amountle",
	"halfsies",
	"stackdle",
	"flipsies",
	"puttsies",
	"weighsies",
	"cutsies",
	"tiltsies",
	"trackdle",
	"pets"
];
/** What a machine is called: its game's name, or the Pet shop. */
const machineName = (game) => game === "pets" ? "Pet shop" : game[0].toUpperCase() + game.slice(1);
/** How often a showpiece comes out of its machine, against 1 for every other item. */
const SHOWPIECE_WEIGHT = .5;
/** An item's weight in its machine's draw: none once it's retired. */
const itemWeight = (item) => item.retired ? 0 : item.showpiece ? SHOWPIECE_WEIGHT : 1;
/** A game's items: what its machine holds now. Retired ones are left out; `itemById` still finds them. */
function gameItems(game) {
	return items.filter((i) => i.game === game && !i.retired);
}
/** The hat every player wears in a game until they put something else on. */
function freeItem(game) {
	return items.find((i) => i.game === game && i.free && !i.retired) ?? items.find((i) => i.game === game && i.free);
}
/**
* Puts items on a resolved guy. Naming a game puts on that game's free hat —
* the player's own copy of it when their `name` is given. Then each `equip`
* entry, an item id or an encoded owned copy, takes its slot.
*/
function dress(config, options = {}, name) {
	const out = {
		...config,
		owned: { ...config.owned }
	};
	if (options.game) {
		out.hat = freeItem(options.game).id;
		if (name !== void 0) out.owned.hat = starter(name, options.game);
	}
	for (const entry of options.equip ?? []) {
		const copy = entry.includes("~") ? decode(entry) : null;
		const item = byId.get(copy ? copy.item : entry);
		if (!item) continue;
		out[item.slot] = item.id;
		if (copy) out.owned[item.slot] = copy;
		else delete out.owned[item.slot];
	}
	return out;
}
function contrast$1(a, b) {
	const lum$1 = (hex$2) => {
		const c = (i) => {
			const v = parseInt(hex$2.slice(1 + i * 2, 3 + i * 2), 16) / 255;
			return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
		};
		return .2126 * c(0) + .7152 * c(1) + .0722 * c(2);
	};
	const [hi, lo] = [lum$1(a), lum$1(b)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
/** Adds the equipped items' own colours to a palette. */
function withItems(palette, config) {
	const colors = { ...palette.colors };
	for (const slot of [
		"skin",
		"hat",
		"frame",
		"buddy",
		"aura"
	]) {
		const item = itemById(config[slot]);
		if (!item) continue;
		const paint$1 = PAINTABLE.includes(slot) ? config.owned?.[slot]?.paint : void 0;
		painted(item.colors, paint$1).forEach((hex$2, i) => {
			colors[LAYER[slot] + i] = hex$2;
		});
		if (slot === "skin") {
			if (item.outline) colors[T.OUTLINE] = item.outline;
			const dark = "#15111C", light$2 = "#FFF1D6";
			colors[T.EYE] = colors[T.MOUTH] = contrast$1(dark, item.colors[0]) >= contrast$1(light$2, item.colors[0]) ? dark : light$2;
		}
	}
	return {
		name: palette.name,
		colors
	};
}

//#endregion
//#region src/parts/heads.ts
const head = (name, eyes$1, feet$1, rows) => {
	if (rows.length !== 16 || rows.some((r) => r.length !== 16)) throw new Error(`Head "${name}" must be drawn on a 16x16 grid`);
	return {
		name,
		art: stamp(rows),
		eyes: eyes$1,
		feet: feet$1
	};
};
const heads = [
	head("round", 8, true, [
		"................",
		"................",
		"................",
		"................",
		".....######.....",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"....########....",
		"................",
		"................"
	]),
	head("mochi", 8, true, [
		"................",
		"................",
		"................",
		"................",
		"................",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("egg", 8, true, [
		"................",
		"................",
		"................",
		"......####......",
		".....######.....",
		"....########....",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"....########....",
		".....######.....",
		"................",
		"................"
	]),
	head("gumdrop", 8, true, [
		"................",
		"................",
		"................",
		"......####......",
		".....######.....",
		"....########....",
		"....########....",
		"...##########...",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("onigiri", 9, true, [
		"................",
		"................",
		"................",
		".......##.......",
		"......####......",
		".....######.....",
		"....########....",
		"...##########...",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("ghost", 8, false, [
		"................",
		"................",
		"................",
		"................",
		"......####......",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..##.##..##.##..",
		"................"
	]),
	head("slime", 9, true, [
		"................",
		"................",
		"................",
		"........#.......",
		".......##.......",
		"......####......",
		".....######.....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("loaf", 8, true, [
		"................",
		"................",
		"................",
		"................",
		"....###..###....",
		"...##########...",
		"..############..",
		"..############..",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"................",
		"................"
	]),
	head("cloud", 8, false, [
		"................",
		"................",
		"................",
		"................",
		"....##.##.##....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"....##.##.##....",
		"................",
		"................"
	]),
	head("pill", 8, true, [
		"................",
		"................",
		"................",
		".....######.....",
		"....########....",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"....########....",
		"................",
		"................"
	]),
	head("chonk", 9, true, [
		"................",
		"................",
		"................",
		"................",
		"................",
		".....######.....",
		"...##########...",
		"..############..",
		".##############.",
		".##############.",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		"................",
		"................"
	]),
	head("block", 8, true, [
		"................",
		"................",
		"................",
		"................",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("tower", 8, true, [
		"................",
		"................",
		".....######.....",
		"....########....",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"....########....",
		"................",
		"................"
	]),
	head("gourd", 9, true, [
		"................",
		"................",
		"......####......",
		".....######.....",
		".....######.....",
		"....########....",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"................",
		"................"
	]),
	head("flame", 10, false, [
		"................",
		"........#.......",
		".......##.......",
		"......####......",
		"....#.####.#....",
		"...##.#hh#.##...",
		"..###.#hh#.###..",
		"..####hhhh####..",
		".####hhhhhh####.",
		"..##hhhhhhhh##..",
		"..##hhhhhhhh##..",
		"..##hhhhhhhh##..",
		"...#hhhhhhhh#...",
		"....hhhhhhhh....",
		".....hhhhhh.....",
		"................"
	]),
	head("jellyfish", 8, false, [
		"................",
		"................",
		"......####......",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		".##############.",
		".#s##s####s##s#.",
		"..##...##...##..",
		"...##..##..##...",
		"..##...##...##..",
		"................"
	]),
	head("octopus", 8, false, [
		"................",
		"................",
		"................",
		".....######.....",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		".###.##..##.###.",
		".#..##.##.##..#.",
		".##..#....#..##.",
		"................"
	]),
	head("robot", 8, true, [
		"................",
		".......rr.......",
		".......ss.......",
		"..############..",
		"..#s########s#..",
		"..#hhhhhhhhhh#..",
		".s#hhhhhhhhhh#s.",
		".d#hhhhhhhhhh#d.",
		".s#hhhhhhhhhh#s.",
		"..#hhhhhhhhhh#..",
		"..#hhhhhhhhhh#..",
		"..############..",
		"..#s########s#..",
		"................",
		"................",
		"................"
	]),
	head("cactus", 9, true, [
		"................",
		"......####......",
		".....#s##s#.....",
		"....##s##s##....",
		".#..##s##s##..#.",
		".##.##s##s##.##.",
		".##.########.##.",
		".##.########.##.",
		".##############.",
		"..############..",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"................",
		"................"
	]),
	head("saucer", 8, false, [
		"................",
		"................",
		"......####......",
		"....########....",
		"...##########...",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		".##############.",
		".#y##y####y##y#.",
		".ssssssssssssss.",
		"...dd......dd...",
		"................",
		"................"
	]),
	head("shard", 9, false, [
		"................",
		".......##.......",
		"......####......",
		".....######.....",
		"....########....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"...##########...",
		"....########....",
		".....######.....",
		"......####......",
		"................"
	]),
	head("toadstool", 10, true, [
		"................",
		".....######.....",
		"...##h####h##...",
		"..##hhh##hhh##..",
		".####h####h####.",
		".##############.",
		".ssssssssssssss.",
		"...##########...",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"...##########...",
		"................",
		"................"
	]),
	head("bat", 8, false, [
		"................",
		"................",
		".s............s.",
		".ss..#....#..ss.",
		".sss.##..##.sss.",
		".sss.######.sss.",
		".ss##########ss.",
		".ss##########ss.",
		".ss##########ss.",
		".ss##########ss.",
		".s.s.######.s.s.",
		".....######.....",
		"......####......",
		"................",
		"................",
		"................"
	]),
	head("crab", 8, false, [
		"................",
		".dd.d......d.dd.",
		".dd.d......d.dd.",
		".dddd......dddd.",
		"..##........##..",
		"..##.######.##..",
		"..############..",
		".##############.",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		"...##########...",
		"..#.#......#.#..",
		"................",
		"................"
	]),
	head("heart", 7, true, [
		"................",
		"..####....####..",
		".######..######.",
		".##############.",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		"..############..",
		"...##########...",
		"....########....",
		".....######.....",
		"......####......",
		".......##.......",
		"................",
		"................"
	]),
	head("dumpling", 10, true, [
		"................",
		"................",
		"................",
		"................",
		"................",
		".....#.##.#.....",
		"....########....",
		"...##########...",
		"..############..",
		".##############.",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		"................",
		"................"
	]),
	head("tooth", 8, false, [
		"................",
		"................",
		"..###......###..",
		".######..######.",
		".##############.",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"....########....",
		"....###..###....",
		"....##....##....",
		".....#....#.....",
		"................"
	]),
	head("star", 8, false, [
		"................",
		".......##.......",
		"......####......",
		".....######.....",
		".##############.",
		".##############.",
		"..############..",
		"...##########...",
		"...##########...",
		"...##########...",
		"..############..",
		"..############..",
		".######..######.",
		".####......####.",
		".##..........##.",
		"................"
	]),
	head("acorn", 10, false, [
		"................",
		".........#......",
		".....ssssss.....",
		"...sss#ss#sss...",
		"..s#ssssssss#s..",
		".sss#ss##ss#sss.",
		".dddddddddddddd.",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"....########....",
		"......####......",
		"................"
	]),
	head("gem", 8, false, [
		"................",
		"................",
		"....hhhhhhhh....",
		"...#h#hhhh#h#...",
		"..##h##hh##h##..",
		".ssssssssssssss.",
		"..############..",
		"..############..",
		"...##########...",
		"...##########...",
		"....#s####s#....",
		".....#s##s#.....",
		"......#ss#......",
		".......##.......",
		"................",
		"................"
	]),
	head("clover", 7, false, [
		"................",
		"..####....####..",
		".######..######.",
		".######..######.",
		".######ss######.",
		".##############.",
		"...##########...",
		"...##########...",
		".##############.",
		".##############.",
		".######ss######.",
		".######..######.",
		"..####.##.####..",
		"........#.......",
		".........#......",
		"................"
	]),
	head("disco", 8, true, [
		"................",
		"................",
		"................",
		".....hh##hh.....",
		"....h##hh##h....",
		"...hh##hh##hh...",
		"..#hh######hh#..",
		"..h##########h..",
		"..h##########h..",
		"..#s########s#..",
		"..s##########s..",
		"..#ss######ss#..",
		"...ss##ss##ss...",
		"....#ss##ss#....",
		"................",
		"................"
	])
];

//#endregion
//#region src/parts/eyes.ts
const eyes_ = (name, rows) => ({
	name,
	art: stamp(rows)
});
const eyes = [
	eyes_("beans", [
		"e....e",
		"A....A",
		"......"
	]),
	eyes_("shiny", ["we....we", "eA....Ae"]),
	eyes_("happy", [".ee....ee.", "e..e..e..e"]),
	eyes_("sparkle", [
		"we....we",
		"ee....ee",
		"eA....Ae"
	]),
	eyes_("wink", ["we....e.", "eA...e.e"]),
	eyes_("glossy", [
		"we....we",
		"ee....ee",
		"Aw....Aw"
	]),
	eyes_("excited", [
		"e......e",
		".e....e.",
		"e......e"
	]),
	eyes_("hearts", [
		"w.r..w.r",
		"rrr..rrr",
		".r....r."
	]),
	eyes_("lashes", [
		"e......e",
		".e....e.",
		".e....e."
	]),
	eyes_("chill", [
		"ss....ss",
		"we....ew",
		"eA....Ae"
	]),
	eyes_("side-eye", [
		"ss....ss",
		"ew....ew",
		"Ae....Ae"
	]),
	eyes_("shades", [
		".eeeeeeee.",
		"eAAe..eAAe",
		".ee....ee."
	]),
	eyes_("star", [
		".y....y.",
		"yyy..yyy",
		".y....y."
	]),
	eyes_("squint", ["eee..eee", "eA....Ae"]),
	eyes_("fired up", [
		".r......r.",
		"rre....err",
		".ey....ye."
	]),
	eyes_("laser", [
		".ee....ee.",
		"rey....yer",
		".ee....ee."
	]),
	eyes_("cyclops", [
		".ww.",
		"weAe",
		"eeee"
	]),
	eyes_("sleepy", ["e.e....e.e", "eee....eee"]),
	eyes_("dizzy", [
		"e.e..e.e",
		".e....e.",
		"e.e..e.e"
	]),
	eyes_("anime", [
		".ee....ee.",
		"eew....wee",
		".aA....Aa."
	]),
	eyes_("galaxy", [
		".ew....we.",
		"eAye..eyAe",
		".Ae....eA."
	]),
	eyes_("diamond", [
		".wa....wa.",
		"aaAe..aaAe",
		".eA....eA."
	]),
	eyes_("dragon", [
		".y......y.",
		"yey....yey",
		"YeY....YeY"
	]),
	eyes_("shoujo", [
		".ee....ee.",
		"ewA....Awe",
		"eAw....wAe"
	]),
	eyes_("kitty", [
		".ee....ee.",
		"yey....yey",
		"Yey....yeY"
	]),
	eyes_("joy", [".e......e.", "e.e....e.e"]),
	eyes_("puppy", [
		".ee....ee.",
		"wee....wee",
		"eew....eew"
	])
];

//#endregion
//#region src/parts/mouths.ts
const mouth = (name, rows) => ({
	name,
	art: stamp(rows)
});
const mouths = [
	mouth("smile", ["m..m", ".mm."]),
	mouth("cat", ["m.mm.m", ".m..m."]),
	mouth("laugh", [
		"mmmm",
		"mttm",
		".mm."
	]),
	mouth("beak", ["m.m", ".m."]),
	mouth("blep", [
		"m..m",
		".mm.",
		"..t."
	]),
	mouth("grin", ["mmmmmm", ".mttm."]),
	mouth("fang", [
		"mmmm",
		"mwtm",
		".mm."
	]),
	mouth("smirk", [
		"....",
		"...m",
		"mmm."
	]),
	mouth("ooh", [
		".mm.",
		"mttm",
		".mm."
	]),
	mouth("tiny", [".mm."]),
	mouth("wobble", ["m.m.m.", ".m.m.m"]),
	mouth("toothy", ["mwwwwm", ".mmmm."]),
	mouth("tongue out", ["mmmm", "..t."]),
	mouth("flat", ["mmmm", ".tt."]),
	mouth("gritted", [
		".mmmm.",
		"mwwwwm",
		".mmmm."
	]),
	mouth("bubblegum", [
		".cccc.",
		"cwcccc",
		".cccc."
	]),
	mouth("bunny", ["mmmm", "mwwm"]),
	mouth("vampire", [
		"m....m",
		"mwmmwm",
		".mmmm."
	]),
	mouth("wide", ["m....m", ".mmmm."]),
	mouth("gold tooth", [
		"m....m",
		"mwwywm",
		".mmmm."
	]),
	mouth("grillz", [
		"mmmmmm",
		"myYyYm",
		".mmmm."
	]),
	mouth("mustache", [
		"mm..mm",
		"mmmmmm",
		"..mm.."
	]),
	mouth("kissy", [
		"mm",
		".m",
		"mm"
	]),
	mouth("yay", [
		"mmmmm",
		".mtm.",
		"..m.."
	]),
	mouth("tehe", [
		"m....m",
		".mmmm.",
		"...tt."
	])
];

//#endregion
//#region src/parts/cheeks.ts
const cheeks_ = (name, rows) => ({
	name,
	art: stamp(rows)
});
const cheeks = [
	cheeks_("bare", []),
	cheeks_("blush", ["cc......cc"]),
	cheeks_("dot", ["c........c"]),
	cheeks_("rosy", ["cc......cc", ".c......c."]),
	cheeks_("freckles", ["c.c....c.c"]),
	cheeks_("scar", [".......o..", "........o."]),
	cheeks_("band-aid", ["......xxc.", ".......cxx"]),
	cheeks_("war paint", [
		"rr......rr",
		"..........",
		"rr......rr"
	]),
	cheeks_("whiskers", [
		"oo......oo",
		"..........",
		"oo......oo"
	]),
	cheeks_("hearts", ["r.r....r.r", ".r......r."]),
	cheeks_("shine", ["ww......ww"]),
	cheeks_("stripes", ["AA......AA", ".AA....AA."]),
	cheeks_("stars", [
		".y......y.",
		"yyy....yyy",
		".y......y."
	]),
	cheeks_("gold leaf", [".y......y.", "yYw....wYy"]),
	cheeks_("flushed", ["cc......cc", "cc......cc"]),
	cheeks_("shy", ["c.c....c.c", ".c......c."]),
	cheeks_("mole", ["..........", "........m."]),
	cheeks_("jewels", [
		".a......a.",
		"awA....awA",
		".A......A."
	]),
	cheeks_("rainbow", [
		"rr......rr",
		"yy......yy",
		"gg......gg"
	]),
	cheeks_("manga blush", [".rc.....rc", "rc.....rc."])
];

//#endregion
//#region src/parts/bodies.ts
/** Each single mark, biggest first: a smaller body gets the smaller one. */
const heart$1 = [[
	"r.r",
	"rrr",
	".r."
], ["r.r", ".r."]].map(stamp);
const star$1 = [
	[
		".y.",
		"ywy",
		".y."
	],
	[
		".y.",
		"yyy",
		".y."
	],
	["y"]
].map(stamp);
const moon = [
	[
		".yy",
		"y..",
		"y..",
		".yy"
	],
	[
		".yy",
		"y..",
		".yy"
	],
	[
		".y",
		"y.",
		".y"
	]
].map(stamp);
const bolt = [
	[
		"..y",
		".yy",
		"yyy",
		"yy.",
		"y.."
	],
	[
		"..y",
		"yyy",
		"y.."
	],
	[
		".y",
		"yy",
		"y."
	]
].map(stamp);
/** The cells the eyes and mouth take, as `y * 64 + x`. */
const faceOf$1 = (c) => {
	const f = c.face, out = new Set();
	if (!f) return out;
	for (let y = f.top; y <= f.line; y++) for (const e of f.eyes) for (let x = e.left; x <= e.right; x++) out.add(y * 64 + x);
	const mx = c.centred(f.mouth);
	f.mouth.forEach((row, dy) => row.forEach((t, dx) => {
		if (t) out.add((f.mouthTop + dy) * 64 + mx + dx);
	}));
	return out;
};
/**
* Where a mark goes: every pixel on the body (with body either side, unless
* `loose`), and a clear pixel from the eyes and mouth, so it never reads as
* part of the face. Under the mouth first, then low on either side, then the
* forehead (where hair or a hat would most often cover it).
*/
const spotFor = (c, s, loose = false) => {
	const face = faceOf$1(c);
	const inside = (x, y) => c.isBody(x, y) && (loose || c.isBody(x - 1, y) && c.isBody(x + 1, y));
	const nearFace$1 = (x, y) => {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (face.has((y + dy) * 64 + x + dx)) return true;
		return false;
	};
	const fits = (x0, y0) => s.every((row, dy) => row.every((t, dx) => !t || inside(x0 + dx, y0 + dy) && !nearFace$1(x0 + dx, y0 + dy)));
	const w = s[0].length, h = s.length, mid = Math.floor(c.centre) - Math.floor(w / 2), f = c.face;
	const tries = [];
	if (f) for (let y = f.mouthBottom + 2; y <= c.bottom - h + 1; y++) tries.push([mid, y], [mid - 1, y], [mid + 1, y]);
	if (f) for (let y = c.bottom - h + 1; y >= f.top; y--) for (let off = 2; off <= 6; off++) tries.push([mid + off, y], [mid - off, y]);
	for (let y = c.crown; y <= (f ? f.top - h : c.crown + 1); y++) for (const off of [
		0,
		-2,
		2,
		-3,
		3
	]) tries.push([mid + off, y]);
	return tries.find(([x, y]) => fits(x, y)) ?? null;
};
/**
* A mark drawn as big as there's room for: the full one, else a smaller one
* of the same thing, so a small body still shows its mark.
*/
const mark = (c, sizes) => {
	for (const loose of [false, true]) for (const s of sizes) {
		const at = spotFor(c, s, loose);
		if (at) {
			c.draw(s, at[0], at[1], true);
			return;
		}
	}
};
/** Paints only where the bare body is — markings never leave the silhouette. */
function onBody(c, x, y, token) {
	if (c.isBody(x, y)) c.set(x, y, token);
}
const bodies = [
	{
		name: "plain",
		draw: () => {}
	},
	{
		name: "belly",
		draw: (c) => {
			const x = Math.floor(c.centre);
			for (let dx = -2; dx < 2; dx++) onBody(c, x + dx, c.bottom - 1, T.BELLY);
			for (let dx = -3; dx < 3; dx++) onBody(c, x + dx, c.bottom, T.BELLY);
		}
	},
	{
		name: "two tone",
		draw: (c) => {
			for (let y = c.eyeLine + 2; y <= c.bottom; y++) {
				const r = c.rows[y];
				if (r) for (let x = r.left + 1; x < r.right; x++) onBody(c, x, y, T.BELLY);
			}
		}
	},
	{
		name: "tabby",
		draw: (c) => {
			const x = Math.floor(c.centre);
			for (const dx of [
				-3,
				-1,
				0,
				2
			]) {
				onBody(c, x + dx, c.crown + 1, T.SHADE);
				onBody(c, x + dx, c.crown + 2, T.SHADE);
			}
		}
	},
	{
		name: "spots",
		draw: (c) => {
			const x = Math.floor(c.centre);
			const y = c.crown + 1;
			onBody(c, x - 3, y + 1, T.SHADE);
			onBody(c, x - 2, y + 1, T.SHADE);
			onBody(c, x - 3, y + 2, T.SHADE);
			onBody(c, x + 2, y, T.SHADE);
			const low = c.rows[c.bottom - 1];
			if (low) {
				onBody(c, low.right - 1, c.bottom - 1, T.SHADE);
				onBody(c, low.right - 2, c.bottom - 1, T.SHADE);
			}
		}
	},
	{
		name: "star mark",
		draw: (c) => {
			mark(c, star$1);
		}
	},
	{
		name: "heart mark",
		draw: (c) => {
			mark(c, heart$1);
		}
	},
	{
		name: "gleam",
		draw: (c) => {
			const r = c.rows[c.crown + 1], r2 = c.rows[c.crown + 2], r3 = c.rows[c.crown + 3];
			if (!r || !r2 || !r3) return;
			onBody(c, r.right - 3, c.crown + 1, T.LIGHT);
			onBody(c, r.right - 2, c.crown + 1, T.WHITE);
			onBody(c, r2.right - 2, c.crown + 2, T.LIGHT);
			onBody(c, r2.right - 1, c.crown + 2, T.WHITE);
			onBody(c, r3.right - 1, c.crown + 3, T.LIGHT);
		}
	},
	{
		name: "stripes",
		draw: (c) => {
			for (let y = c.eyeLine + 3; y <= c.bottom; y += 2) {
				const r = c.rows[y];
				if (r) for (let x = r.left + 1; x < r.right; x++) onBody(c, x, y, T.ACCENT);
			}
		}
	},
	{
		name: "zigzag",
		draw: (c) => {
			const y = c.eyeLine + 3;
			const r = c.rows[y];
			if (r) for (let x = r.left; x <= r.right; x++) onBody(c, x, y + x % 2, T.ACCENT);
		}
	},
	{
		name: "split",
		draw: (c) => {
			for (let y = c.crown; y <= c.bottom; y++) {
				const r = c.rows[y];
				if (r) {
					for (let x = r.left; x < Math.floor(c.centre); x++) if (c.get(x, y) === T.BODY) onBody(c, x, y, T.BELLY);
				}
			}
		}
	},
	{
		name: "moon mark",
		draw: (c) => {
			mark(c, moon);
		}
	},
	{
		name: "bolt mark",
		draw: (c) => {
			mark(c, bolt);
		}
	},
	{
		name: "starry",
		draw: (c) => {
			const x = Math.floor(c.centre);
			for (const [sx, sy] of [[x + 3, c.crown + 2], [x - 4, c.bottom - 1]]) {
				for (const [dx, dy] of [
					[0, -1],
					[-1, 0],
					[1, 0],
					[0, 1]
				]) onBody(c, sx + dx, sy + dy, T.GOLD);
				onBody(c, sx, sy, T.WHITE);
			}
			onBody(c, x - 3, c.crown + 2, T.GOLD);
			onBody(c, x + 4, c.bottom - 1, T.WHITE);
			onBody(c, x - 1, c.crown + 1, T.WHITE);
		}
	},
	{
		name: "polka dots",
		draw: (c) => {
			const x = Math.floor(c.centre);
			const dots = [
				[-4, c.crown + 2],
				[-1, c.crown + 1],
				[2, c.crown + 2],
				[5, c.crown + 4],
				[-5, c.eyeLine + 2],
				[-2, c.bottom - 1],
				[1, c.bottom],
				[4, c.bottom - 1]
			];
			for (const [dx, y] of dots) onBody(c, x + dx, y, T.ACCENT);
		}
	},
	{
		name: "blaze",
		draw: (c) => {
			const x = Math.floor(c.centre);
			for (let y = c.crown; y <= c.eyeLine - 1; y++) {
				onBody(c, x - 1, y, T.BELLY);
				onBody(c, x, y, T.BELLY);
			}
		}
	},
	{
		name: "sprinkles",
		draw: (c) => {
			const x = Math.floor(c.centre);
			const bits = [
				[
					-4,
					c.crown + 2,
					T.ACCENT
				],
				[
					-1,
					c.crown + 1,
					T.GOLD
				],
				[
					2,
					c.crown + 2,
					T.BLUSH
				],
				[
					5,
					c.crown + 4,
					T.LEAF
				],
				[
					-5,
					c.eyeLine + 2,
					T.GOLD
				],
				[
					-2,
					c.bottom - 1,
					T.LEAF
				],
				[
					1,
					c.bottom,
					T.ACCENT
				],
				[
					4,
					c.bottom - 1,
					T.BLUSH
				]
			];
			for (const [dx, y, t] of bits) onBody(c, x + dx, y, t);
		}
	},
	{
		name: "kintsugi",
		draw: (c) => {
			const x = Math.floor(c.centre);
			const cracks = [[
				[1, c.crown],
				[2, c.crown + 1],
				[2, c.crown + 2],
				[3, c.crown + 3],
				[4, c.crown + 3],
				[5, c.crown + 4],
				[5, c.crown + 5]
			], [
				[-6, c.bottom - 3],
				[-5, c.bottom - 2],
				[-4, c.bottom - 2],
				[-3, c.bottom - 1],
				[-3, c.bottom],
				[-2, c.bottom]
			]];
			for (const crack of cracks) crack.forEach(([dx, y], i) => onBody(c, x + dx, y, i % 3 === 1 ? T.GOLD_SHADE : T.GOLD));
		}
	},
	{
		name: "gold dipped",
		draw: (c) => {
			const x = Math.floor(c.centre);
			for (let y = c.bottom - 2; y <= c.bottom; y++) {
				const r = c.rows[y];
				if (r) for (let gx = r.left; gx <= r.right; gx++) onBody(c, gx, y, y === c.bottom ? T.GOLD_SHADE : T.GOLD);
			}
			for (const dx of [
				-4,
				-1,
				3
			]) onBody(c, x + dx, c.bottom - 3, T.GOLD);
			onBody(c, x - 4, c.bottom - 4, T.GOLD);
		}
	}
];

//#endregion
//#region src/parts/accessories.ts
/**
* The box round one eye that a lens frames: a column of glass either side of
* the eye and a rim round that. Built from where the eyes really are, so any
* eyes on any head sit in the middle of their lens.
*/
function lensBox(c, k) {
	const f = c.face, e = f.eyes[k];
	return {
		left: e.left - 2,
		right: e.right + 2,
		top: f.top - 1,
		bottom: f.line + 1
	};
}
/** A rim round a box with its corners cut, so a lens reads round. */
function rim(c, b, token, fill) {
	for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
		const edgeX = x === b.left || x === b.right, edgeY = y === b.top || y === b.bottom;
		if (edgeX && edgeY) continue;
		if (edgeX || edgeY) c.set(x, y, token);
		else if (fill !== void 0) c.set(x, y, fill);
	}
}
/** Glasses that fit the eyes: a lens round each, a bridge, and arms to the side of the head. */
function fittedGlasses(c, frame, glass, glint$1) {
	const f = c.face;
	if (!f || !f.eyes.length) return;
	const boxes = f.eyes.map((_, k) => lensBox(c, k));
	boxes.forEach((b) => {
		rim(c, b, frame, glass);
		c.set(b.left + 1, b.top + 1, glint$1);
	});
	if (boxes.length === 2) for (let x = boxes[0].right + 1; x < boxes[1].left; x++) c.set(x, f.top, frame);
	const r = c.rows[f.top];
	if (r) {
		for (let x = r.left; x < boxes[0].left; x++) c.set(x, f.top, frame);
		for (let x = boxes[boxes.length - 1].right + 1; x <= r.right; x++) c.set(x, f.top, frame);
	}
}
const bowtie = stamp([
	"aa..aa",
	"aAxxAa",
	"aa..aa"
]);
const star = stamp([
	".y.",
	"yyy",
	".y."
]);
const heart = stamp([
	"r.r",
	"rrr",
	".r."
]);
const flower = stamp([
	".a.",
	"aya",
	".a."
]);
/** Paints a body cell unless the mouth is already there. */
function wear(c, x, y, token) {
	if (c.get(x, y) === T.MOUTH || c.get(x, y) === T.TONGUE) return;
	c.set(x, y, token);
}
/** Whether a cell is on or next to an eye or the mouth. */
function nearFace(c, x, y, gap = 1) {
	const f = c.face;
	if (!f) return false;
	const mx = c.centred(f.mouth);
	for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
		const px = x + dx, py = y + dy;
		if (py >= f.top && py <= f.line && f.eyes.some((e) => px >= e.left && px <= e.right)) return true;
		if (f.mouth[py - f.mouthTop]?.[px - mx]) return true;
	}
	return false;
}
/** Whether a cell is on or next to the mouth. */
function nearMouth(c, x, y) {
	const f = c.face;
	if (!f) return false;
	const mx = c.centred(f.mouth);
	for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (f.mouth[y + dy - f.mouthTop]?.[x + dx - mx]) return true;
	return false;
}
/**
* Where a `w` by `h` piece goes on the chest: every cell on the body and a cell clear of the face. Low on the wearer's right first, then their left, then under the mouth.
*/
function clearSpot(c, w, h, gap = 1, top = c.eyeLine - 1) {
	const mid = Math.floor(c.centre) - 1;
	const fits = (x0, y0) => {
		for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (!c.isBody(x0 + dx, y0 + dy) || nearFace(c, x0 + dx, y0 + dy, gap)) return false;
		return true;
	};
	const tries = [];
	for (let off = 2; off <= 6; off++) for (let y = c.bottom - h + 1; y >= top; y--) tries.push([mid + off, y], [mid - off + 2 - w, y]);
	for (let y = (c.face?.mouthBottom ?? c.eyeLine) + 2; y <= c.bottom - h + 1; y++) tries.push([mid, y]);
	return tries.find(([x, y]) => fits(x, y)) ?? null;
}
const accessories = [
	{
		name: "none",
		layer: "body",
		draw: () => {}
	},
	{
		name: "glasses",
		layer: "face",
		draw: (c) => fittedGlasses(c, T.ACCENT_SHADE, T.LIGHT, T.WHITE)
	},
	{
		name: "scarf",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x = r.left; x <= r.right; x++) wear(c, x, y, (x - r.left) % 4 < 2 ? T.ACCENT : T.TRIM);
			wear(c, r.right - 2, y + 1, T.ACCENT);
			wear(c, r.right - 2, y + 2, T.ACCENT_SHADE);
		}
	},
	{
		name: "bell collar",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x$1 = r.left; x$1 <= r.right; x$1++) wear(c, x$1, y, T.ACCENT);
			const x = Math.floor(c.centre);
			wear(c, x - 1, y + 1, T.GOLD);
			wear(c, x, y + 1, T.GOLD_SHADE);
		}
	},
	{
		name: "bowtie",
		layer: "body",
		draw: (c) => {
			const x = c.centred(bowtie);
			bowtie.forEach((row, dy) => row.forEach((token, dx) => {
				if (token) wear(c, x + dx, c.neck + dy, token);
			}));
		}
	},
	{
		name: "bandana",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x$1 = r.left; x$1 <= r.right; x$1++) wear(c, x$1, y, T.ACCENT);
			const x = Math.floor(c.centre);
			for (let dx = -2; dx < 2; dx++) wear(c, x + dx, y + 1, T.ACCENT);
			wear(c, x - 1, y + 2, T.ACCENT_SHADE);
			wear(c, x, y + 2, T.ACCENT_SHADE);
		}
	},
	{
		name: "star sticker",
		layer: "body",
		draw: (c) => {
			const at = clearSpot(c, 3, 3, 1, c.eyeLine + 1) ?? clearSpot(c, 3, 3);
			if (at) {
				c.draw(star, at[0], at[1], true);
				return;
			}
			const r = c.rows[c.eyeLine - 3];
			if (r) c.draw(star, r.right - 3, c.eyeLine - 4, true);
		}
	},
	{
		name: "heart badge",
		layer: "body",
		draw: (c) => {
			const r = c.rows[c.bottom - 1];
			if (!r) return;
			heart.forEach((row, dy) => row.forEach((token, dx) => {
				const x = r.right - 3 + dx, y = c.bottom - 2 + dy;
				if (token && c.isBody(x, y)) wear(c, x, y, token);
			}));
		}
	},
	{
		name: "monocle",
		layer: "face",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const e = f.eyes[f.eyes.length - 1];
			const b = {
				left: e.left - 1,
				right: e.right + 1,
				top: f.top - 1,
				bottom: f.line + 1
			};
			for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
				const edgeX = x === b.left || x === b.right, edgeY = y === b.top || y === b.bottom;
				if (edgeX && edgeY) continue;
				if (edgeX || edgeY) c.set(x, y, y === b.bottom || x === b.right ? T.GOLD_SHADE : T.GOLD);
			}
			c.set(b.left + 1, b.top, T.WHITE);
			for (let i = 0, x = b.right + 1, y = b.bottom; y <= c.bottom && c.isBody(x, y); i++, y++) {
				c.set(x, y, i % 2 ? T.GOLD : T.GOLD_SHADE);
				if (i === 1 && c.isBody(x + 1, y + 1)) x++;
			}
		}
	},
	{
		name: "eye patch",
		layer: "over",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const e = f.eyes[0], b = {
				left: e.left - 1,
				right: e.right + 1,
				top: f.top - 1,
				bottom: f.line
			};
			for (let y = b.top; y <= b.bottom; y++) for (let x = b.left; x <= b.right; x++) {
				const corner = (x === b.left || x === b.right) && (y === b.top || y === b.bottom);
				if (!corner && c.isBody(x, y)) c.set(x, y, T.OUTLINE);
			}
			c.set(b.left + 1, b.top + 1, T.DEEP);
			for (let x = b.right, y = b.top - 1; y >= b.top - 3 && c.isBody(x, y); x++, y--) c.set(x, y, T.OUTLINE);
			for (let x = b.left - 1, y = b.top + 1; c.isBody(x, y); x--) c.set(x, y, T.OUTLINE);
		}
	},
	{
		name: "necklace",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x = r.left + 1; x < r.right; x += 2) wear(c, x, y, T.WHITE);
			wear(c, Math.floor(c.centre) - 1, y + 1, T.GOLD);
		}
	},
	{
		name: "medal",
		layer: "body",
		draw: (c) => {
			const sizes = [
				stamp([
					"aAa",
					".y.",
					"ywY",
					".Y."
				]),
				stamp([
					".A.",
					"ywY",
					".Y."
				]),
				stamp([
					"aA",
					"wy",
					"yY"
				])
			];
			for (const art of sizes) {
				const at$1 = clearSpot(c, art[0].length, art.length, 1, c.eyeLine + 1) ?? clearSpot(c, art[0].length, art.length);
				if (at$1) {
					c.draw(art, at$1[0], at$1[1]);
					return;
				}
			}
			const at = clearSpot(c, 2, 3, 0);
			if (at) c.draw(sizes[2], at[0], at[1]);
		}
	},
	{
		name: "flower pin",
		layer: "body",
		draw: (c) => {
			const r = c.rows[c.eyeLine - 3];
			if (r) c.draw(flower, r.left + 1, c.eyeLine - 4, true);
		}
	},
	{
		name: "headband",
		layer: "face",
		draw: (c) => {
			const y = c.eyeLine - 4;
			const r = c.rows[y];
			if (!r) return;
			for (let x = r.left; x <= r.right; x++) c.set(x, y, x === r.right ? T.ACCENT_SHADE : T.ACCENT);
		}
	},
	{
		name: "necktie",
		layer: "body",
		draw: (c) => {
			const low = c.face?.mouthBottom ?? 0, x = Math.floor(c.centre) - 1, y = Math.min(Math.max(c.neck, low + 2), c.bottom);
			if (y <= low) return;
			for (const cx of [x - 1, x + 2]) if (c.isBody(cx, y) && !nearFace(c, cx, y)) c.set(cx, y, T.WHITE);
			wear(c, x, y, T.EYE);
			wear(c, x + 1, y, T.EYE);
			for (let ty = y + 1; ty <= c.bottom + 1; ty++) {
				const k = ty - y;
				wear(c, x, ty, k % 2 ? T.ACCENT : T.EYE);
				wear(c, x + 1, ty, k % 2 ? T.EYE : T.ACCENT);
			}
		}
	},
	{
		name: "lei",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			const flowers = [
				T.ACCENT,
				T.BLUSH,
				T.GOLD
			];
			for (let x = r.left; x <= r.right; x++) {
				const i = x - r.left;
				wear(c, x, y, i % 2 ? T.LEAF : flowers[i / 2 % 3]);
			}
		}
	},
	{
		name: "goggles",
		layer: "face",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const y = Math.max(3, f.top - 2), r = c.rows[y];
			if (r) for (let x = r.left - 1; x <= r.right + 1; x++) c.set(x, y, T.DEEP);
			for (const e of f.eyes) {
				const x0 = e.left - 1;
				c.set(x0 + 1, y - 2, T.ACCENT_SHADE);
				c.set(x0 + 2, y - 2, T.ACCENT_SHADE);
				c.set(x0, y - 1, T.ACCENT_SHADE);
				c.set(x0 + 1, y - 1, T.WHITE);
				c.set(x0 + 2, y - 1, T.ACCENT);
				c.set(x0 + 3, y - 1, T.ACCENT_SHADE);
				c.set(x0, y, T.ACCENT_SHADE);
				c.set(x0 + 1, y, T.ACCENT);
				c.set(x0 + 2, y, T.ACCENT);
				c.set(x0 + 3, y, T.ACCENT_SHADE);
			}
		}
	},
	{
		name: "gold chain",
		layer: "body",
		draw: (c) => {
			const y = c.neck, r = c.rows[y];
			if (!r) return;
			const mid = Math.floor(c.centre), dip = Math.max(0, Math.min(2, c.bottom - y - 2));
			for (let x = r.left; x <= r.right; x++) {
				const k = Math.min(x - r.left, r.right - x), cy = y + Math.min(dip, k >> 1);
				if (c.isBody(x, cy)) wear(c, x, cy, x % 2 ? T.GOLD_SHADE : T.GOLD);
			}
			const ym = y + dip + 1;
			const medallion = [
				[
					-2,
					0,
					T.GOLD_SHADE
				],
				[
					-1,
					0,
					T.WHITE
				],
				[
					0,
					0,
					T.GOLD
				],
				[
					1,
					0,
					T.GOLD_SHADE
				],
				[
					-1,
					1,
					T.GOLD
				],
				[
					0,
					1,
					T.GOLD_SHADE
				]
			];
			for (const [dx, dy, t] of medallion) if (c.isBody(mid + dx, ym + dy)) wear(c, mid + dx, ym + dy, t);
		}
	},
	{
		name: "heart shades",
		layer: "over",
		draw: (c) => {
			const f = c.face;
			if (f?.eyes.length !== 2) return;
			const frame = stamp([
				"rr.rr",
				"rwoor",
				".ror."
			]);
			const top = f.line - 2;
			const xs = [f.eyes[0].left - 2, f.eyes[1].right - 2];
			for (const x of xs) frame.forEach((row, dy) => row.forEach((t, dx) => {
				if (t) c.set(x + dx, top + dy, t);
			}));
			for (let x = xs[0] + 5; x < xs[1]; x++) c.set(x, top + 1, T.RED);
			const r = c.rows[top];
			if (r) for (let x = r.left; x < xs[0]; x++) c.set(x, top, T.RED);
			if (r) for (let x = xs[1] + 5; x <= r.right; x++) c.set(x, top, T.RED);
			for (const x of xs) if (!nearMouth(c, x + 2, top + 3)) c.set(x + 2, top + 3, T.RED);
		}
	},
	{
		name: "masquerade",
		layer: "face",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const L = f.eyes[0].left - 2, R = f.eyes[f.eyes.length - 1].right + 2, mid = Math.floor(c.centre);
			for (let y = f.top - 1; y <= f.line; y++) for (let x = L; x <= R; x++) {
				if (y === f.line && (x === mid - 1 || x === mid)) continue;
				if (c.isBody(x, y)) c.set(x, y, y === f.line ? T.GOLD_SHADE : T.GOLD);
			}
			c.set(L, f.top - 2, T.GOLD);
			c.set(L - 1, f.top - 3, T.GOLD);
			c.set(R, f.top - 2, T.GOLD);
			c.set(R + 1, f.top - 3, T.GOLD);
			c.set(L + 1, f.top - 1, T.WHITE);
			if (f.eyes.length === 2) {
				c.set(mid - 1, f.top - 1, T.RED);
				c.set(mid, f.top - 1, T.RED);
			}
			c.set(R, f.top - 3, T.ACCENT);
			c.set(R, f.top - 4, T.ACCENT);
			c.set(R - 1, f.top - 5, T.ACCENT_SHADE);
		}
	}
];

//#endregion
//#region src/parts/canvas.ts
/**
* The grid a guy is being drawn on, plus the measurements every part needs to
* sit properly on whichever shape it landed on: where the crown is, how wide
* each row is, where the eyes go.
*
* Measurements are taken from the bare silhouette once, before anything is
* worn, so a hat cannot change where the next part thinks the head is.
*/
var Canvas = class Canvas {
	grid;
	/** Per-row span of the bare body, or null for rows it doesn't reach. */
	rows;
	/** First row of the body. */
	crown;
	/** Last row of the body (feet excluded). */
	bottom;
	/** Row the bottom of the eyes sits on. */
	eyeLine;
	/** Centre of the body, between two columns: 8 means the seam of 7 and 8. */
	centre;
	/** The very top of the head at its middle (on a pointed head, the tip). Hats see `crown` as `hatTop`. */
	tip;
	/** Where the eyes and mouth go; set by compose before anything is worn. */
	face = null;
	body;
	/**
	* The silhouette is everything the starting drawing covers — a plain body,
	* or a skin like a jar or a golf ball, which is drawn in its own colours.
	*/
	constructor(grid, eyeLine) {
		this.grid = grid;
		this.eyeLine = eyeLine;
		this.body = grid.map((row) => row.map((v) => v !== 0));
		this.rows = this.body.map((row) => {
			const left = row.indexOf(true);
			return left === -1 ? null : {
				left,
				right: row.lastIndexOf(true)
			};
		});
		const waist = this.rows[eyeLine];
		this.centre = (waist.left + waist.right + 1) / 2;
		const mid = Math.floor(this.centre);
		const tops = [mid - 1, mid].map((x) => this.topOf(x)).filter((y) => y !== null);
		this.crown = tops.length ? Math.min(...tops) : this.rows.findIndex((r) => r !== null);
		this.tip = this.crown;
		let bottom = this.crown;
		this.rows.forEach((r, y) => {
			if (r) bottom = y;
		});
		this.bottom = bottom;
	}
	/**
	* Places the face: the eye stamp's bottom row on the eye line, the mouth's
	* top row just under it, both centred. Everything worn is fitted to this.
	*/
	setFace(eye, mouth$1) {
		const x0 = this.centred(eye);
		const cols = [];
		for (let dx = 0; dx < width(eye); dx++) if (eye.some((row) => row[dx])) cols.push(x0 + dx);
		const eyes$1 = [];
		for (const x of cols) {
			const last = eyes$1[eyes$1.length - 1];
			if (last && x === last.right + 1) last.right = x;
			else eyes$1.push({
				left: x,
				right: x
			});
		}
		const firstRow = eye.findIndex((row) => row.some(Boolean));
		const m = this.placeMouth(eye, mouth$1);
		const top = m.line - eye.length + 1;
		this.face = {
			top: top + Math.max(0, firstRow),
			line: m.line,
			eyes: eyes$1,
			mouthTop: m.top,
			mouthBottom: m.top + m.art.length - 1,
			mouth: m.art
		};
	}
	/**
	* The mouth's top row goes just under the eyes, unless a pixel of it would
	* sit beside or under an eye pixel: eyes that run into a mouth turn a face
	* into one shape (an H, a box), and it stops reading as eyes and a mouth. A
	* corner touch is fine. Then the mouth drops a row or two where the head has
	* room for it, with a column of face either side if it can. Where it hasn't
	* (a heart's point, a car's bumper), the eyes go up a row instead.
	*/
	placeMouth(eye, mouth$1, corners) {
		const ex = this.centred(eye), mx = this.centred(mouth$1), w = width(mouth$1);
		const eyeAt = (line$1) => {
			const at = new Set(), ey = line$1 - eye.length + 1;
			eye.forEach((row, dy) => row.forEach((t, dx) => {
				if (t && this.isBody(ex + dx, ey + dy)) at.add((ey + dy) * 64 + ex + dx);
			}));
			return at;
		};
		const thin = corners ?? eye.every((row, dy) => dy === 0 || row.every((t, dx) => !t || !eye[dy - 1][dx]));
		const near = thin ? [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
			[1, -1],
			[-1, -1]
		] : [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		];
		const clear = (at, top$1) => mouth$1.every((row, dy) => row.every((t, dx) => {
			const x = mx + dx, y = top$1 + dy;
			return !t || !this.isBody(x, y) || !near.some(([ox, oy]) => at.has((y + oy) * 64 + x + ox));
		}));
		const fits = (top$1, margin) => mouth$1.every((row, dy) => {
			const y = top$1 + dy;
			if (!row.some(Boolean)) return true;
			return (!margin || this.isBody(mx - 1, y) && this.isBody(mx + w, y)) && row.every((t, dx) => !t || this.isBody(mx + dx, y));
		});
		const eyesFit = (line$1) => {
			const ey = line$1 - eye.length + 1;
			return eye.every((row, dy) => row.every((t, dx) => !t || this.isBody(ex + dx, ey + dy) && this.isBody(ex + dx, ey + dy - 1)));
		};
		const line = this.eyeLine, top = line + 1, here = eyeAt(line);
		if (clear(here, top)) return {
			top,
			line,
			art: mouth$1
		};
		for (const margin of [true, false]) for (const drop of [1, 2]) if (clear(here, top + drop) && fits(top + drop, margin)) return {
			top: top + drop,
			line,
			art: mouth$1
		};
		if (eyesFit(line - 1)) {
			const up = eyeAt(line - 1);
			for (const drop of [0, 1]) if (clear(up, top + drop) && fits(top + drop, false)) return {
				top: top + drop,
				line: line - 1,
				art: mouth$1
			};
		}
		if (thin) return this.placeMouth(eye, mouth$1, false);
		const art = mouth$1.map((row, dy) => row.map((t, dx) => {
			const x = mx + dx, y = top + dy;
			return [
				[1, 0],
				[-1, 0],
				[0, -1]
			].some(([ox, oy]) => here.has((y + oy) * 64 + x + ox)) ? 0 : t;
		}));
		return {
			top,
			line,
			art
		};
	}
	/**
	* The row a collar, scarf or necklace goes on: three under the eye line, or
	* the first row under a mouth that reaches lower, where the body still has one.
	*/
	get neck() {
		const low = (this.face?.mouthBottom ?? 0) + 1;
		return low > this.eyeLine + 3 && low <= this.bottom ? low : this.eyeLine + 3;
	}
	/**
	* The lowest row a hat or topper may paint on the head: it stops at least one
	* row above the eyes (two where the head has the room), so nothing worn on
	* top ever covers the face.
	*/
	get floor() {
		const top = this.face ? this.face.top : this.eyeLine - 2;
		return Math.min(top - 1, Math.max(this.tip, top - 2));
	}
	/**
	* The first row wide enough to wear a hat on. On a round head it is the
	* crown; on a pointed one it is where the point has widened out, so a cap
	* sits round the head instead of balancing on its tip.
	*/
	get hatTop() {
		for (let y = this.tip; y <= this.floor; y++) {
			const r = this.rows[y];
			if (r && r.right - r.left + 1 >= 6) return y;
		}
		return Math.min(this.tip, this.floor);
	}
	/**
	* The canvas as hats and toppers see it: its `crown` is `hatTop`, so every
	* "a row under the crown" lands on the head and not on a point.
	*/
	forHats() {
		const view = Object.create(this);
		Object.defineProperty(view, "crown", { value: Math.max(this.tip, Math.min(this.hatTop, this.floor - 1)) });
		return view;
	}
	/** A copy to try something on: the same measurements over its own grid. */
	clone() {
		return Object.assign(Object.create(Canvas.prototype), this, { grid: this.grid.map((row) => [...row]) });
	}
	/**
	* The same canvas with the head built up `k` rows into a dome, for a cap to
	* wrap on a head with almost no forehead. Returns the dome's cells too, so
	* whatever the cap leaves of them can be taken away again.
	*/
	domed(k) {
		const grid = this.grid.map((row) => [...row]), dome = [];
		const r = this.rows[this.tip];
		if (r) for (let i = 1; i <= k && this.tip - i >= 1; i++) {
			const left = r.left + i, right = r.right - i;
			if (right - left < 1) break;
			for (let x = left; x <= right; x++) {
				grid[this.tip - i][x] = 1;
				dome.push([x, this.tip - i]);
			}
		}
		const canvas = new Canvas(grid, this.eyeLine);
		canvas.face = this.face;
		Object.defineProperty(canvas, "floor", { value: this.floor });
		return {
			canvas,
			dome
		};
	}
	inside(x, y) {
		return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
	}
	/** Whether the bare silhouette covers this cell. */
	isBody(x, y) {
		return this.inside(x, y) && this.body[y][x];
	}
	get(x, y) {
		return this.inside(x, y) ? this.grid[y][x] : 0;
	}
	/**
	* The grid's border belongs to the outline, so parts never paint on it: a
	* hat on a tall head or an arm beside a wide one stops a pixel short instead
	* of running off the edge with no outline.
	*/
	set(x, y, token) {
		if (x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1) this.grid[y][x] = token;
		else if (token) this.refused++;
	}
	/** Pixels `set` turned away at the border: what a part lost off the edge (`hatCut` counts them). */
	refused = 0;
	/** First row the bare body covers in this column, or null. */
	topOf(x) {
		for (let y = 0; y < GRID_SIZE; y++) if (this.isBody(x, y)) return y;
		return null;
	}
	/** First row at least `min` wide — where ears can sit on a pointed head. */
	shoulder(min = 8) {
		for (let y = this.crown; y <= this.bottom; y++) {
			const r = this.rows[y];
			if (r && r.right - r.left + 1 >= min) return y;
		}
		return this.crown;
	}
	/**
	* Draws a stamp with its top-left at (x, y). `onBody` keeps it to the bare
	* silhouette, which is what stops a face from hanging off a narrow head.
	*/
	draw(s, x, y, onBody$1 = false) {
		s.forEach((row, dy) => row.forEach((token, dx) => {
			if (!token) return;
			if (onBody$1 && !this.isBody(x + dx, y + dy)) return;
			this.set(x + dx, y + dy, token);
		}));
	}
	/** Left column that centres a stamp on the body. */
	centred(s) {
		return Math.floor(this.centre - width(s) / 2);
	}
	/** Repaints every body cell in a row. */
	paintRow(y, token) {
		const r = this.rows[y];
		if (!r) return;
		for (let x = r.left; x <= r.right; x++) if (this.isBody(x, y)) this.set(x, y, token);
	}
};

//#endregion
//#region src/palette.ts
const COLOURWAYS = [
	{
		name: "Peach",
		body: "#FFB38A",
		accent: "#7FC8F8",
		trim: "#FFF3E0"
	},
	{
		name: "Bubblegum",
		body: "#FF9EC7",
		accent: "#8C7CF0",
		trim: "#FFFFFF"
	},
	{
		name: "Butter",
		body: "#FFE07A",
		accent: "#FF7F96",
		trim: "#FFFFFF"
	},
	{
		name: "Mint",
		body: "#8FE3B8",
		accent: "#FF8FB1",
		trim: "#FFF6C8"
	},
	{
		name: "Sky",
		body: "#8CCBFF",
		accent: "#FFC857",
		trim: "#FFFFFF"
	},
	{
		name: "Lilac",
		body: "#C9A7F5",
		accent: "#FFD166",
		trim: "#FFF0F6"
	},
	{
		name: "Coral",
		body: "#FF8E7F",
		accent: "#5CC8C0",
		trim: "#FFF6E8"
	},
	{
		name: "Lime",
		body: "#C6E86E",
		accent: "#FF8C69",
		trim: "#FFFFFF"
	},
	{
		name: "Aqua",
		body: "#78DCE8",
		accent: "#FF7AA8",
		trim: "#FFF8D6"
	},
	{
		name: "Tangerine",
		body: "#FFA552",
		accent: "#6C8CF5",
		trim: "#FFF1D6"
	},
	{
		name: "Strawberry",
		body: "#FF7A93",
		accent: "#7FD1AE",
		trim: "#FFF0F3"
	},
	{
		name: "Periwinkle",
		body: "#9DAEFF",
		accent: "#FF9F7A",
		trim: "#FFFFFF"
	},
	{
		name: "Cream",
		body: "#FFF1D0",
		accent: "#FF8FAB",
		trim: "#9AD9F5"
	},
	{
		name: "Cocoa",
		body: "#C69276",
		accent: "#FF9FB5",
		trim: "#FFF1DC"
	},
	{
		name: "Caramel",
		body: "#E8B074",
		accent: "#7EC4CF",
		trim: "#FFF6E6"
	},
	{
		name: "Grape",
		body: "#A68BF0",
		accent: "#7FE0C8",
		trim: "#FFF4C2"
	},
	{
		name: "Teal",
		body: "#5ED3C3",
		accent: "#FFB86B",
		trim: "#FFFFFF"
	},
	{
		name: "Snow",
		body: "#F2F5FA",
		accent: "#7BB8FF",
		trim: "#FFB5C8"
	},
	{
		name: "Sage",
		body: "#A9D6A0",
		accent: "#F7A072",
		trim: "#FFF8E7"
	},
	{
		name: "Rose",
		body: "#F6A6C1",
		accent: "#6FC2B8",
		trim: "#FFFFFF"
	},
	{
		name: "Honey",
		body: "#FFC94D",
		accent: "#E86A8E",
		trim: "#FFF4D6"
	},
	{
		name: "Seafoam",
		body: "#A8F0D8",
		accent: "#9A8CF5",
		trim: "#FFFFFF"
	},
	{
		name: "Blush",
		body: "#FFC4C4",
		accent: "#7AA9F0",
		trim: "#FFFFFF"
	},
	{
		name: "Ocean",
		body: "#6FB4F2",
		accent: "#FFDD6B",
		trim: "#FFFFFF"
	},
	{
		name: "Plum",
		body: "#D48BD8",
		accent: "#FFD36B",
		trim: "#FFF0FA"
	},
	{
		name: "Sunflower",
		body: "#FFD84A",
		accent: "#6FA8F0",
		trim: "#FFFFFF"
	},
	{
		name: "Melon",
		body: "#B8F28C",
		accent: "#FF7A8A",
		trim: "#FFF5E0"
	},
	{
		name: "Lavender",
		body: "#B8B6F7",
		accent: "#FF9EBB",
		trim: "#FFFFFF"
	},
	{
		name: "Pumpkin",
		body: "#FF9446",
		accent: "#7C6BE0",
		trim: "#FFE9A8"
	},
	{
		name: "Cotton Candy",
		body: "#A9DCFF",
		accent: "#FFA3D1",
		trim: "#FFFFFF"
	},
	{
		name: "Matcha",
		body: "#9CCB7A",
		accent: "#E9A2C8",
		trim: "#FFF7E0"
	},
	{
		name: "Ruby",
		body: "#F2697E",
		accent: "#FFD56B",
		trim: "#FFF3E0"
	},
	{
		name: "Charcoal",
		body: "#4A4E5E",
		accent: "#E8483D",
		trim: "#F2C230"
	},
	{
		name: "Cobalt",
		body: "#3D6FE0",
		accent: "#F2C230",
		trim: "#FFFFFF"
	},
	{
		name: "Midnight",
		body: "#2E3A66",
		accent: "#5FE0B0",
		trim: "#FFE066"
	},
	{
		name: "Oxblood",
		body: "#8E2A3A",
		accent: "#F2C230",
		trim: "#FFF1D6"
	},
	{
		name: "Forest",
		body: "#2F6B4A",
		accent: "#F28A2E",
		trim: "#FFF1D6"
	},
	{
		name: "Grape Soda",
		body: "#6B3FA0",
		accent: "#3DE0B0",
		trim: "#FFE066"
	},
	{
		name: "Fuchsia",
		body: "#F27ACF",
		accent: "#6FD6C2",
		trim: "#FFFFFF"
	},
	{
		name: "Lemon",
		body: "#EEF07A",
		accent: "#8C7CF0",
		trim: "#FFFFFF"
	},
	{
		name: "Denim",
		body: "#6A92E0",
		accent: "#FFB38A",
		trim: "#FFF3E0"
	},
	{
		name: "Ice",
		body: "#D2F1FF",
		accent: "#FF8FB1",
		trim: "#7BB8FF"
	},
	{
		name: "Opal",
		body: "#F4F0FA",
		accent: "#7FE0C8",
		trim: "#FFB5D8",
		tones: {
			2: "#C9B8F0",
			3: "#D4FFF2",
			13: "#FFE0F0",
			19: "#9FD8F0"
		}
	},
	{
		name: "Obsidian",
		body: "#433B5E",
		accent: "#FFD45C",
		trim: "#FFE9A8",
		tones: {
			2: "#2A2440",
			3: "#B79CFF",
			13: "#5A4F7A",
			19: "#1E1A2E"
		}
	},
	{
		name: "Aurora",
		body: "#2E5878",
		accent: "#FF7AC8",
		trim: "#B8FFE0",
		tones: {
			2: "#3B3F86",
			3: "#7DFFC8",
			13: "#3E8A8C",
			19: "#4A2F7A"
		}
	}
];
/** Hand-set token colours by colourway name, applied over the derived ones. */
const TONES = new Map(COLOURWAYS.filter((w) => w.tones).map((w) => [w.name, w.tones]));
function hexToRgb(hex$2) {
	return [
		1,
		3,
		5
	].map((i) => parseInt(hex$2.slice(i, i + 2), 16));
}
function rgbToHex(r, g, b) {
	return "#" + [
		r,
		g,
		b
	].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl(hex$2) {
	const [r, g, b] = hexToRgb(hex$2).map((v) => v / 255);
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [
		0,
		0,
		l
	];
	const d = max - min;
	const s = l > .5 ? d / (2 - max - min) : d / (max + min);
	const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return [
		h * 60,
		s,
		l
	];
}
function fromHsl([h, s, l]) {
	h = (h % 360 + 360) % 360;
	s = Math.min(1, Math.max(0, s));
	l = Math.min(1, Math.max(0, l));
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(h / 60 % 2 - 1));
	const m = l - c / 2;
	const [r, g, b] = h < 60 ? [
		c,
		x,
		0
	] : h < 120 ? [
		x,
		c,
		0
	] : h < 180 ? [
		0,
		c,
		x
	] : h < 240 ? [
		0,
		x,
		c
	] : h < 300 ? [
		x,
		0,
		c
	] : [
		c,
		0,
		x
	];
	return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function mix(a, b, amount) {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}
/** Moves a hue `amount` degrees towards `target` along the short way round. */
function towards(hue$1, target, amount) {
	const diff = (target - hue$1 + 540) % 360 - 180;
	return hue$1 + Math.sign(diff) * Math.min(Math.abs(diff), amount);
}
function luminance(hex$2) {
	const channel = (v) => {
		v /= 255;
		return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	};
	const [r, g, b] = hexToRgb(hex$2);
	return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b);
}
function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
/**
* Shade a colour by hand: darker and leaning towards violet, but never richer.
* Adding saturation in the shadow is what turned a green body's shade neon.
*/
function shadeOf(hex$2, depth = .12) {
	const [h, s, l] = toHsl(hex$2);
	return fromHsl([
		towards(h, 265, 12),
		s * .85,
		l - depth
	]);
}
/** Builds the full set of token colours from a body, an accent and a trim. */
function derive(name, body, accent, trim) {
	const [h] = toHsl(body);
	const outlineHue = towards(h, 285, 25);
	const outline$1 = fromHsl([
		outlineHue,
		.42,
		toHsl(body)[2] >= .5 ? .3 : toHsl(body)[2] * .25
	]);
	const dark = fromHsl([
		outlineHue,
		.38,
		.14
	]), deeper = fromHsl([
		outlineHue,
		.4,
		.06
	]);
	const ink = contrast(dark, body) >= 4.2 || contrast(dark, body) > contrast("#FFF1D6", body) ? dark : contrast(deeper, body) >= 3.9 ? deeper : "#FFF1D6";
	let blush = "#FF8FA8";
	for (let i = 0; i < 8 && contrast(blush, body) < 1.3; i++) blush = shadeOf(blush, .06);
	let tongue = "#FF6B88";
	for (let i = 0; i < 8 && contrast(tongue, body) < 1.4; i++) tongue = shadeOf(tongue, .06);
	const goldReads = contrast("#FFD45C", body) >= 1.45;
	const gold = goldReads ? "#FFD45C" : "#E8901A";
	const goldShade = goldReads ? "#F0A93A" : "#B3620E";
	return {
		name,
		colors: {
			1: body,
			2: shadeOf(body),
			3: mix(body, "#FFFFFF", .55),
			4: outline$1,
			5: ink,
			6: "#FFFFFF",
			7: blush,
			8: ink,
			9: tongue,
			10: accent,
			11: shadeOf(accent),
			12: trim,
			13: mix(body, "#FFFBF0", .6),
			14: "#7DD87A",
			15: "#4FAE5C",
			16: gold,
			17: goldShade,
			18: "#FF6B78",
			19: shadeOf(body, .24),
			...TONES.get(name)
		}
	};
}
const palettes = COLOURWAYS.map((w) => derive(w.name, w.body, w.accent, w.trim));
function getPalette(index) {
	return palettes[index % palettes.length];
}
function resolveColor(palette, token) {
	if (token === 0) return null;
	return palette.colors[token] ?? null;
}
/** Tones a colourway can be worn in: pastel, as picked, vivid. */
const SHADE_COUNT = 3;
/**
* Re-derives a palette in another tone. The pastel tone lifts the body and
* accent towards white; the vivid tone deepens them. It deliberately barely
* adds saturation — saturating an already-bright lime turns it acid. Either way
* the outline, shading and blush are worked out again from the result, so a
* toned palette is as coherent as the original.
*/
function shadePalette(palette, shade) {
	if (shade === 1) return palette;
	const tone = (hex$2) => {
		if (shade === 0) return mix(hex$2, "#FFFFFF", .3);
		const [h, s, l] = toHsl(hex$2);
		return fromHsl([
			h,
			Math.min(.8, s + .04),
			l > .4 ? l - .08 : l
		]);
	};
	const c = palette.colors;
	return derive(palette.name, tone(c[1]), tone(c[10]), c[12]);
}
/**
* The Lucky variant: the same colourway turned round the colour wheel, with
* gold trim. Derived again, so the face and outline read as well as ever.
*/
function luckyPalette(palette) {
	const turn = (hex$2) => {
		const [h, s, l] = toHsl(hex$2);
		let hue$1 = (h + 150) % 360;
		const dark = l < .45;
		if (dark && hue$1 >= 10 && hue$1 <= 110) hue$1 += 130;
		return fromHsl([
			hue$1,
			dark ? Math.max(.6, Math.min(.85, s + .15)) : Math.max(.7, Math.min(.92, s + .25)),
			dark ? Math.min(Math.max(l, .22), .28) : Math.min(Math.max(l, .6), .68)
		]);
	};
	const c = palette.colors;
	return derive(`${palette.name} Lucky`, turn(c[1]), turn(c[10]), "#FFE9A8");
}
/** The palette a guy is drawn in: his colourway, in his tone, Lucky if he is. */
const POINTED = [
	3,
	4,
	6,
	13,
	14,
	20
];
const NOT_BROWN = {
	13: 0,
	14: 20
};
/** The colourway a guy is drawn in: his own, unless a brown on a pointed head would read as a poo. */
const shownPalette = (config) => POINTED.includes(config.head) && config.palette in NOT_BROWN ? NOT_BROWN[config.palette] : config.palette;
function paletteOf(config) {
	const toned = shadePalette(getPalette(shownPalette(config)), config.shade);
	return config.lucky ? luckyPalette(toned) : toned;
}

//#endregion
//#region src/compose.ts
/**
* Feet, as columns either side of the centre seam. `null` tucks them away.
*/
const FOOT_STYLES = [
	{
		offsets: [2, 3],
		token: T.BODY
	},
	{
		offsets: [2],
		token: T.BODY
	},
	{
		offsets: [3, 4],
		token: T.BODY
	},
	{
		offsets: [2, 3],
		token: T.TRIM
	},
	null
];
/** Arm poses. */
const ARM_STYLES = [
	"none",
	"sides",
	"wave"
];
/**
* Light from the upper left, as on a glossy vinyl toy: a white specular point
* and a gleam near the top-left of the head, a shade along the bottom and the
* lower right, and a deeper shade where those meet. Applied the same way to
* every shape, which is a lot of what makes the set look like one hand drew it.
*/
function light(c) {
	const middle = (c.crown + c.bottom) / 2;
	for (let y$1 = c.crown; y$1 <= c.bottom; y$1++) for (let x = 0; x < GRID_SIZE; x++) {
		if (!c.isBody(x, y$1)) continue;
		const below = !c.isBody(x, y$1 + 1);
		const right = y$1 > middle && !c.isBody(x + 1, y$1);
		if (below || right) c.set(x, y$1, below && x >= c.centre + 1 ? T.DEEP : T.SHADE);
	}
	const y = c.crown + 1;
	const r = c.rows[y];
	if (r && r.right - r.left >= 5) {
		c.set(r.left + 1, y, T.WHITE);
		c.set(r.left + 2, y, T.LIGHT);
		if (c.isBody(r.left + 1, y + 1)) c.set(r.left + 1, y + 1, T.LIGHT);
	}
}
function feet(c, style, limb) {
	const spec = FOOT_STYLES[style];
	if (!spec) return;
	const base$1 = c.rows[c.bottom];
	if (!base$1) return;
	const y = c.bottom + 1;
	const mid = Math.floor(c.centre);
	for (const off of spec.offsets) for (const x of [mid - off, mid + off - 1]) if (x >= base$1.left && x <= base$1.right) c.set(x, y, spec.token === T.BODY ? limb : spec.token);
}
function arms(c, style, limb) {
	const pose = ARM_STYLES[style];
	if (pose === "none") return;
	const y = c.eyeLine + 2;
	const r = c.rows[y];
	if (!r || r.left < 2 || r.right > GRID_SIZE - 3) return;
	const nub = (x, top) => {
		c.set(x, top, limb);
		c.set(x, top + 1, limb);
	};
	nub(r.left - 1, y);
	if (pose === "sides") nub(r.right + 1, y);
	if (pose === "wave") {
		const raised = c.rows[y - 2];
		if (raised) nub(raised.right + 1, y - 2);
	}
}
/**
* Every empty cell touching something gets the outline colour. Diagonals are
* left open, which rounds the corners off instead of boxing them in. Lines
* already drawn in the outline colour — an antenna stalk, a glasses frame —
* don't get outlined themselves, or they'd come out three pixels thick.
*/
function outline(grid) {
	const filled = grid.map((row) => row.map((v) => v !== 0 && v !== T.OUTLINE));
	for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
		if (grid[y][x] !== 0) continue;
		if (y > 0 && filled[y - 1][x] || y < GRID_SIZE - 1 && filled[y + 1][x] || x > 0 && filled[y][x - 1] || x < GRID_SIZE - 1 && filled[y][x + 1]) grid[y][x] = T.OUTLINE;
	}
}
/** Moves an item's `1`–`9` colours into its layer's range. */
function claim(grid, layer) {
	for (const row of grid) for (let x = 0; x < GRID_SIZE; x++) if (row[x] >= LOCAL) row[x] = row[x] - LOCAL + layer;
}
function skinOf(config) {
	const item = itemById(config.skin);
	return item?.slot === "skin" ? item : void 0;
}
/** Where a guy's eyes and mouth sit, for anything that moves them afterwards (animate). */
function faceOf(config) {
	const c = startCanvas(config);
	c.setFace(eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art, mouths[config.mouth].art);
	return c.face;
}
function startCanvas(config) {
	const skin = skinOf(config);
	if (skin) {
		const grid = skin.art.map((row) => [...row]);
		claim(grid, LAYER.skin);
		return new Canvas(grid, skin.eyes);
	}
	const head$1 = heads[config.head];
	return new Canvas(head$1.art.map((row) => [...row]), head$1.eyes);
}
/**
* Heads that are their own hairdo: a bat's ears and wings leave a face of a
* few rows, and ears or a hat on top of them crowded it out. A hat the player
* puts on still goes on.
*/
const EARED = new Set(["bat"]);
/**
* Patterns that scatter pale marks all over: on a skin dark enough for light
* ink they crowd round the eyes' whites and the face is lost in them, so a
* dark guy goes plain. Single marks, a belly and the chase finishes stay.
*/
const SCATTERED = new Set([
	"tabby",
	"spots",
	"gleam",
	"stripes",
	"zigzag",
	"polka dots",
	"sprinkles"
]);
const darkSkin = (config) => {
	const ink = paletteOf(config).colors[T.EYE];
	return !!ink && contrast(ink, "#000000") > 10;
};
/** Parts meant to be shown off: they always show. */
const CHASE = new Set([
	"kintsugi",
	"gold dipped",
	"gold leaf",
	"jewels",
	"rainbow"
]);
/**
* What of a guy's extras is drawn. Hair (or a hat), something worn, cheek
* marks and a body pattern all at once crowd sixteen pixels, so a guy shows
* at most two of them, one on a head with eight rows or fewer (a bat, a crab):
* the pattern goes first, then the cheeks. Hair and what he wears always
* show, and so does a chase part. On a skin dark enough for light ink, the
* scattered patterns go too.
*/
function extrasOf(config, c) {
	const body = bodies[config.body].name, cheek = cheeks[config.cheeks];
	let pattern = config.body !== 0 && !(SCATTERED.has(body) && darkSkin(config));
	let marks = cheek.art.length > 0;
	const top = itemById(config.hat)?.slot === "hat" || config.hair !== 0 && !EARED.has(heads[config.head].name);
	const worn = config.accessory !== 0;
	const small = c.bottom - c.crown + 1 <= 8, limit = small ? 2 : 3;
	const quiet = pattern && !SCATTERED.has(body) && body !== "starry" && !small;
	const count = () => [
		top,
		worn,
		pattern && !quiet,
		marks
	].filter(Boolean).length;
	if (count() > limit && pattern && !CHASE.has(body)) pattern = false;
	if (count() > limit && marks && !CHASE.has(cheek.name)) marks = false;
	return {
		pattern,
		cheeks: marks
	};
}
/**
* The body and its markings, lit, with no face, hat or accessory on it.
* The blink frame fills vacated eye cells from here.
*/
function composeBase(config) {
	const c = startCanvas(config);
	if (!skinOf(config)) {
		light(c);
		if (extrasOf(config, c).pattern) bodies[config.body].draw(c);
	}
	return c.grid;
}
/**
* A four-point twinkle in a corner the guy leaves empty: the mark of a Gold
* finish. Top right first, then top left.
*/
function sparkle(grid) {
	for (const [x, y] of [[13, 2], [2, 2]]) {
		const cells = [
			[x, y],
			[x - 1, y],
			[x + 1, y],
			[x, y - 1],
			[x, y + 1]
		];
		if (cells.every(([cx, cy]) => grid[cy][cx] === 0)) {
			for (const [cx, cy] of cells) grid[cy][cx] = cx === x && cy === y ? T.WHITE : T.GOLD;
			return;
		}
	}
}
/** The cells the eyes and mouth cover, as `y * GRID_SIZE + x`. */
function faceCells(c, eye, mouth$1) {
	const face = new Set();
	const mark$1 = (s, x0, y0) => s.forEach((row, dy) => row.forEach((t, dx) => {
		if (t && c.isBody(x0 + dx, y0 + dy)) face.add((y0 + dy) * GRID_SIZE + x0 + dx);
	}));
	mark$1(eye, c.centred(eye), c.face.line - eye.length + 1);
	mark$1(c.face.mouth, c.centred(mouth$1), c.face.mouthTop);
	return face;
}
const touches = (face, x, y) => {
	for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (face.has((y + dy) * GRID_SIZE + x + dx)) return true;
	return false;
};
/**
* Cheeks, kept off the face: each side slides out (up to three columns, or
* a row lower) to where the most of it shows without touching an eye or the mouth. Patterns
* (whiskers, stars, a scar) keep clear of the face diagonally too and off the
* body's edge, where a dark one would read as the outline; a plain blush may
* sit diagonally by an eye, as a blush does.
*/
function placeCheeks(c, cheek, face) {
	const w = width(cheek), x0 = c.centred(cheek), y0 = c.face.line + 1, half = Math.floor(w / 2);
	const side = (x, y) => face.has(y * GRID_SIZE + x - 1) || face.has(y * GRID_SIZE + x + 1) || face.has((y - 1) * GRID_SIZE + x) || face.has((y + 1) * GRID_SIZE + x);
	const inner = (x, y) => c.isBody(x - 1, y) && c.isBody(x + 1, y) && c.isBody(x, y - 1) && c.isBody(x, y + 1);
	const ok = (x, y, t) => c.isBody(x, y) && !face.has(y * GRID_SIZE + x) && (t === T.BLUSH ? !side(x, y) : !touches(face, x, y) && inner(x, y));
	for (const [from, to, dir] of [[
		0,
		half,
		-1
	], [
		w - half,
		w,
		1
	]]) {
		let best = [];
		for (const down of [0, 1]) for (let shift = 0; shift <= 3; shift++) {
			const cells = [];
			cheek.forEach((row, dy) => {
				for (let dx = from; dx < to; dx++) {
					const x = x0 + dx + dir * shift, y = y0 + dy + down;
					if (row[dx] && ok(x, y, row[dx])) cells.push([
						x,
						y,
						row[dx]
					]);
				}
			});
			if (cells.length > best.length) best = cells;
		}
		for (const [x, y, t] of best) c.set(x, y, t);
	}
}
/**
* The face is a few pixels; a marking that runs into them turns it into a
* smudge. So any patterned skin pixel touching the eyes or mouth (diagonals
* too) goes back to plain skin. Things worn on the face stay.
*/
function clearFace(c, face, bare, worn) {
	for (const k of face) {
		const fx = k % GRID_SIZE, fy = Math.floor(k / GRID_SIZE);
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
			const x = fx + dx, y = fy + dy;
			if (!c.isBody(x, y) || face.has(y * GRID_SIZE + x) || worn[y][x]) continue;
			if (c.grid[y][x] < LAYER.skin && c.grid[y][x] !== bare[y][x]) c.grid[y][x] = bare[y][x];
		}
	}
}
/**
* Where a buddy stands, on a picture whose cells `taken` marks as his (in any
* frame of any move: `roomFor` grows the still to cover them). It stands on
* the floor, right then left, as close to its corner as it can while a clear
* pixel, diagonals included, runs between its outline and him.
*
* Where there is no such spot, it stands in front of him in the bottom-right
* corner, as it always has, with its own outline, leaving out any pixel that
* would touch his eyes or mouth (`face`). That is every head and skin there is
* today: a guy fills his sixteen columns, and a 6x5 buddy apart from him
* needs nine to eleven more (`scripts/buddy-room.ts` measures it), so `apart`
* only comes true on a picture wider than his own.
*/
function buddySpot(art, taken, face = () => false) {
	const H = taken.length, W = taken[0].length, h = art.length, w = width(art);
	const at = (x0, y0$1) => {
		const cells = [];
		const on$1 = (x, y) => (art[y - y0$1]?.[x - x0] ?? 0) !== 0;
		for (let y = y0$1 - 1; y <= y0$1 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) if (on$1(x, y)) cells.push([
			x,
			y,
			art[y - y0$1][x - x0]
		]);
		else if (on$1(x + 1, y) || on$1(x - 1, y) || on$1(x, y + 1) || on$1(x, y - 1)) cells.push([
			x,
			y,
			T.OUTLINE
		]);
		return cells;
	};
	const clear = (cells) => cells.every(([x, y]) => {
		if (x < 0 || y < 0 || x >= W || y >= H) return false;
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (taken[y + dy]?.[x + dx]) return false;
		return true;
	});
	const y0 = H - 1 - h;
	for (let k = 0; k + w + 2 <= W; k++) for (const x0 of [W - 1 - w - k, 1 + k]) {
		const cells = at(x0, y0);
		if (clear(cells)) return {
			cells,
			apart: true
		};
	}
	const corner = at(W - 1 - w, y0).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && !face(x, y));
	return {
		cells: corner,
		apart: false
	};
}
/**
* The cells a guy may cover in any frame of any move, from his still: an arm
* out at either side and a step sideways (two columns), down two rows where a
* squash lowers him, and turned round in his sixteen columns. A buddy stays
* on the floor (./animate), so this is all it has to keep clear of.
*/
function roomFor(still) {
	const H = still.length, W = still[0].length;
	const out = still.map((row) => row.map(() => false));
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (!still[y][x] && !(x < GRID_SIZE && still[y][GRID_SIZE - 1 - x])) continue;
		for (let dy = 0; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
			const yy = y + dy, xx = x + dx;
			if (yy < H && xx >= 0 && xx < W) out[yy][xx] = true;
		}
	}
	return out;
}
/**
* Composes every part into one 16x16 grid of colour tokens.
*
* The order matters and is the same for every guy: the lit body and its
* markings, then whatever sits on top of the head, then anything worn over
* the eyes, then the face itself (cheeks, eyes, mouth), then whatever is worn
* on the body. Feet and arms are added before the outline, and the outline is
* drawn around the finished shape so hats, ears and arms all get one too.
*/
function compose(config) {
	return build(config);
}
/**
* The buddy a guy wears, where it stands in his still (`cells`, art in its
* own `1`–`9` colours), and his eyes and mouth (`face`, as `y * 16 + x`), so
* ./animate can stand it on the floor while he moves.
*/
function buddyOf(config) {
	const report = { hatCut: 0 };
	build(config, report);
	return report.buddy;
}
function build(config, report) {
	const skin = skinOf(config);
	const hat$1 = itemById(config.hat);
	const frame = itemById(config.frame);
	const c = startCanvas(config);
	const eye = eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art, mouth$1 = mouths[config.mouth].art;
	c.setFace(eye, mouth$1);
	if (skin) {
		if (skin.limb) {
			const limb = LAYER.skin + skin.limb - 1;
			feet(c, config.feet, limb);
			arms(c, config.arms, limb);
		}
	} else {
		light(c);
		if (heads[config.head].feet) feet(c, config.feet, T.BODY);
		arms(c, config.arms, T.BODY);
	}
	const bare = c.grid.map((row) => [...row]);
	const extras$1 = extrasOf(config, c);
	if (!skin && extras$1.pattern) bodies[config.body].draw(c);
	const before = c.grid.map((row) => [...row]);
	const onTop = (draw) => {
		const tryOn = (domed) => {
			const { canvas, dome } = domed ? c.domed(3 - (c.floor - c.tip + 1)) : {
				canvas: c.clone(),
				dome: []
			};
			const view = canvas.forHats();
			view.refused = 0;
			draw(view);
			let cut = view.refused;
			const wrapped = dome.filter(([x, y]) => canvas.grid[y][x] !== 1).length;
			for (const [x, y] of dome) if (canvas.grid[y][x] === 1) canvas.grid[y][x] = 0;
			for (let y = c.floor + 1; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (canvas.grid[y][x] !== before[y][x] && c.isBody(x, y)) {
				canvas.grid[y][x] = before[y][x];
				cut++;
			}
			let shown$1 = 0;
			canvas.grid.forEach((row, y) => row.forEach((v, x) => {
				if (v !== before[y][x]) shown$1++;
			}));
			return {
				grid: canvas.grid,
				shown: shown$1,
				cut,
				cap: dome.length > 0 && wrapped * 2 >= dome.length
			};
		};
		let best = tryOn(false);
		if (c.tip <= c.floor && c.floor - c.tip + 1 < 3) {
			const d = tryOn(true);
			if (d.cap && d.shown > best.shown) best = d;
		}
		best.grid.forEach((row, y) => row.forEach((v, x) => {
			c.grid[y][x] = v;
		}));
		return best.cut;
	};
	if (hat$1?.slot === "hat") {
		const cut = onTop((cv) => hat$1.draw(cv));
		if (report) report.hatCut = cut;
		claim(c.grid, LAYER.hat);
		for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
			const t = c.grid[y][x], below = c.grid[y + 1][x];
			if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
		}
	} else if (!skin && !EARED.has(heads[config.head].name)) onTop((cv) => hair[config.hair].draw(cv));
	const accessory = accessories[config.accessory];
	const preFace = c.grid.map((row) => [...row]);
	if (accessory.layer === "face") accessory.draw(c);
	const onFace = c.grid.map((row, y) => row.map((v, x) => v !== preFace[y][x]));
	const line = c.face.line;
	const cheek = skin || extras$1.cheeks ? cheeks[config.cheeks].art : [];
	const face = faceCells(c, eye, mouth$1);
	clearFace(c, face, bare, onFace);
	if (cheek.length) placeCheeks(c, cheek, face);
	c.draw(eye, c.centred(eye), line - eye.length + 1, true);
	c.draw(c.face.mouth, c.centred(mouth$1), c.face.mouthTop, true);
	if (accessory.layer === "over") accessory.draw(c);
	if (accessory.layer === "body" && !skin) accessory.draw(c);
	const worn = (slot) => itemById(config[slot])?.slot === slot ? config.owned?.[slot] : void 0;
	for (const slot of ["skin", "hat"]) {
		const o = worn(slot);
		if (o) markItem(c.grid, slot, o);
	}
	outline(c.grid);
	for (const slot of ["skin", "hat"]) if ((worn(slot)?.tally ?? 0) >= GOLD_RIM_DAYS) goldRim(c.grid, slot);
	if (config.flip) for (const row of c.grid) row.reverse();
	const buddy = itemById(config.buddy);
	const shown = new Set([...face].map((k) => config.flip ? k - k % GRID_SIZE + GRID_SIZE - 1 - k % GRID_SIZE : k));
	const spot = buddy?.slot === "buddy" ? buddySpot(buddy.art, roomFor(c.grid.map((row) => row.map(Boolean))), (x, y) => touches(shown, x, y)) : void 0;
	if (Object.values(config.owned ?? {}).some((o) => o?.finish === "gold")) sparkle(c.grid);
	const aura = auraById(itemById(config.aura)?.slot === "aura" ? config.aura : void 0);
	if (aura) {
		const mask = c.grid.map((row) => row.map(Boolean));
		for (const [x, y, k] of auraCells(aura.id, mask, aura.still, config.owned?.aura)) c.grid[y][x] = LAYER.aura + k;
	}
	if (frame?.slot === "frame") {
		for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (!c.grid[y][x]) c.grid[y][x] = LAYER.frame + frame.fill(x, y) - 1;
		const o = worn("frame");
		if (o) {
			markItem(c.grid, "frame", o);
			if ((o.tally ?? 0) >= GOLD_RIM_DAYS) goldRim(c.grid, "frame");
		}
	}
	if (spot) {
		for (const [x, y, t] of spot.cells) c.grid[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t;
		if (report) report.buddy = {
			...spot,
			face: shown
		};
	}
	return c.grid;
}
const showsCache = new Map();
/**
* Whether a guy's markings (`body`) or cheeks are drawn at all: on a crowded or
* small guy one may give way, and then it is the same guy as without it.
*/
function shows(config, slot) {
	if (!config[slot]) return true;
	const key = slot + JSON.stringify(config);
	let v = showsCache.get(key);
	if (v === void 0) {
		v = JSON.stringify(compose(config)) !== JSON.stringify(compose({
			...config,
			[slot]: 0
		}));
		if (showsCache.size > 5e3) showsCache.clear();
		showsCache.set(key, v);
	}
	return v;
}

//#endregion
//#region src/paint.ts
/**
* Turns a composed grid into colours. Most cells take their token's palette
* colour; a cell belonging to an owned item is repainted with that copy's
* finish and wear.
*/
function paint(grid, config, palette, small = false, still = true) {
	const state = { glint: false };
	const slotOf$1 = (t) => t >= LAYER.aura ? "aura" : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
	const aura = auraById(config.aura);
	if (small) ({grid, palette} = forSmall(grid, palette));
	const chase = chaseEyes(grid, config);
	return grid.map((row, y) => row.map((token, x) => {
		const color = chase?.[y][x] ?? (token === T.WHITE ? catchlight(grid, x, y, palette) : resolveColor(palette, token));
		if (!color) return null;
		const slot = slotOf$1(token);
		const copy = slot ? config.owned?.[slot] : void 0;
		const painted$1 = slot === "aura" ? aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still, copy.print) : color : copy ? paintCell(color, x, y, copy, state) : color;
		return still && copy?.fx ? fxColor(painted$1, copy.fx, x, y, 0, copy.print) : painted$1;
	}));
}
/**
* Chase eyes keep their own colours on every guy, so galaxy eyes are always a
* galaxy: drawn in his accent they came out a different speck on each body.
*/
const CHASE_COLORS = {
	galaxy: {
		[T.EYE]: "#1C0E3D",
		[T.WHITE]: "#FFFFFF",
		[T.ACCENT_SHADE]: "#8A5CFF",
		[T.GOLD]: "#FF8BE0"
	},
	diamond: {
		[T.EYE]: "#0B2F4D",
		[T.WHITE]: "#FFFFFF",
		[T.ACCENT]: "#9EF0FF",
		[T.ACCENT_SHADE]: "#2BA8E0"
	},
	dragon: {
		[T.EYE]: "#240800",
		[T.GOLD]: "#FFD23A",
		[T.GOLD_SHADE]: "#FF5A14"
	}
};
function chaseEyes(grid, config) {
	const colors = CHASE_COLORS[eyes[config.eyes]?.name ?? ""];
	if (!colors) return null;
	const f = faceOf(config);
	const left = f.eyes[0].left - 1, right = f.eyes[f.eyes.length - 1].right + 1;
	return grid.map((row, y) => row.map((t, x) => y >= f.top - 1 && y <= f.line && x >= left && x <= right ? colors[t] : void 0));
}
/** At or under this many pixels across, a guy is drawn for a small size (`forSmall`). */
const SMALL_SIZE = 36;
/**
* A guy drawn small, in a board's row or beside a name, is a pixel or two a
* cell, and his face is what goes first: a catchlight takes half an eye, the
* soft highlight blots the forehead, and a dark ink that reads at 128 greys
* out. Small, each eye is solid, the highlight goes back to the body colour,
* and dark ink goes darker still. Nothing moves, so he is the same guy.
*/
function forSmall(grid, palette) {
	const eyeAt = (x, y) => grid[y]?.[x] === T.EYE;
	const out = grid.map((row, y) => row.map((t, x) => {
		if (t === T.WHITE && (eyeAt(x - 1, y) || eyeAt(x + 1, y) || eyeAt(x, y - 1) || eyeAt(x, y + 1))) return T.EYE;
		if (t === T.LIGHT) return T.BODY;
		return t;
	}));
	const ink = palette.colors[T.EYE];
	if (!ink || contrast("#FFFFFF", ink) < 3) return {
		grid: out,
		palette
	};
	const deep = mix(ink, "#000000", .45);
	return {
		grid: out,
		palette: {
			...palette,
			colors: {
				...palette.colors,
				[T.EYE]: deep,
				[T.MOUTH]: deep
			}
		}
	};
}
/**
* An eye's white catchlight. On a light face a white pixel on the eye's edge
* melts into the skin and leaves the eye a bitten-off L, so there it is a
* pale tint of the eye instead: the eye keeps its whole shape and still shines.
*/
function catchlight(grid, x, y, palette) {
	const white = resolveColor(palette, T.WHITE);
	const near = [
		[x - 1, y],
		[x + 1, y],
		[x, y - 1],
		[x, y + 1]
	].map(([nx, ny]) => grid[ny]?.[nx] ?? 0);
	if (!white || !near.includes(T.EYE)) return white;
	const ink = resolveColor(palette, T.EYE);
	if (ink && contrast(ink, "#000000") > 10) return resolveColor(palette, T.OUTLINE) ?? "#000000";
	if (!ink || contrast(white, ink) < 3) return white;
	const pale = near.some((t) => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette, t) ?? "#000000") < 1.6);
	return pale ? mix(ink, white, .6) : white;
}

//#endregion
Object.defineProperty(exports, 'AURAS', {
  enumerable: true,
  get: function () {
    return AURAS;
  }
});
Object.defineProperty(exports, 'AURA_ODDS', {
  enumerable: true,
  get: function () {
    return AURA_ODDS;
  }
});
Object.defineProperty(exports, 'CAPSULE_ONLY', {
  enumerable: true,
  get: function () {
    return CAPSULE_ONLY;
  }
});
Object.defineProperty(exports, 'DEAL_2', {
  enumerable: true,
  get: function () {
    return DEAL_2;
  }
});
Object.defineProperty(exports, 'DEAL_3', {
  enumerable: true,
  get: function () {
    return DEAL_3;
  }
});
Object.defineProperty(exports, 'DEAL_PREFIX', {
  enumerable: true,
  get: function () {
    return DEAL_PREFIX;
  }
});
Object.defineProperty(exports, 'DEEP_BLUE_PRINTS', {
  enumerable: true,
  get: function () {
    return DEEP_BLUE_PRINTS;
  }
});
Object.defineProperty(exports, 'EFFECTS', {
  enumerable: true,
  get: function () {
    return EFFECTS;
  }
});
Object.defineProperty(exports, 'FINISHES', {
  enumerable: true,
  get: function () {
    return FINISHES;
  }
});
Object.defineProperty(exports, 'FOOT_STYLES', {
  enumerable: true,
  get: function () {
    return FOOT_STYLES;
  }
});
Object.defineProperty(exports, 'FX_IDS', {
  enumerable: true,
  get: function () {
    return FX_IDS;
  }
});
Object.defineProperty(exports, 'GAMES', {
  enumerable: true,
  get: function () {
    return GAMES;
  }
});
Object.defineProperty(exports, 'GOLD_RIM_DAYS', {
  enumerable: true,
  get: function () {
    return GOLD_RIM_DAYS;
  }
});
Object.defineProperty(exports, 'GRADES', {
  enumerable: true,
  get: function () {
    return GRADES;
  }
});
Object.defineProperty(exports, 'GRID_SIZE', {
  enumerable: true,
  get: function () {
    return GRID_SIZE;
  }
});
Object.defineProperty(exports, 'LAYER', {
  enumerable: true,
  get: function () {
    return LAYER;
  }
});
Object.defineProperty(exports, 'LOCAL', {
  enumerable: true,
  get: function () {
    return LOCAL;
  }
});
Object.defineProperty(exports, 'LOOP_MS', {
  enumerable: true,
  get: function () {
    return LOOP_MS;
  }
});
Object.defineProperty(exports, 'LUCKY_ODDS', {
  enumerable: true,
  get: function () {
    return LUCKY_ODDS;
  }
});
Object.defineProperty(exports, 'MAX_PINS', {
  enumerable: true,
  get: function () {
    return MAX_PINS;
  }
});
Object.defineProperty(exports, 'ONE_OF_ONE_AURAS', {
  enumerable: true,
  get: function () {
    return ONE_OF_ONE_AURAS;
  }
});
Object.defineProperty(exports, 'PAINTABLE', {
  enumerable: true,
  get: function () {
    return PAINTABLE;
  }
});
Object.defineProperty(exports, 'PAINTS', {
  enumerable: true,
  get: function () {
    return PAINTS;
  }
});
Object.defineProperty(exports, 'PAINT_IDS', {
  enumerable: true,
  get: function () {
    return PAINT_IDS;
  }
});
Object.defineProperty(exports, 'PINS', {
  enumerable: true,
  get: function () {
    return PINS;
  }
});
Object.defineProperty(exports, 'RETIRED_EYES', {
  enumerable: true,
  get: function () {
    return RETIRED_EYES;
  }
});
Object.defineProperty(exports, 'SET_COLORS', {
  enumerable: true,
  get: function () {
    return SET_COLORS;
  }
});
Object.defineProperty(exports, 'SHADE_COUNT', {
  enumerable: true,
  get: function () {
    return SHADE_COUNT;
  }
});
Object.defineProperty(exports, 'SHOWPIECE_WEIGHT', {
  enumerable: true,
  get: function () {
    return SHOWPIECE_WEIGHT;
  }
});
Object.defineProperty(exports, 'SMALL_SIZE', {
  enumerable: true,
  get: function () {
    return SMALL_SIZE;
  }
});
Object.defineProperty(exports, 'SPARKLE_REACH', {
  enumerable: true,
  get: function () {
    return SPARKLE_REACH;
  }
});
Object.defineProperty(exports, 'T', {
  enumerable: true,
  get: function () {
    return T;
  }
});
Object.defineProperty(exports, 'WEAR', {
  enumerable: true,
  get: function () {
    return WEAR;
  }
});
Object.defineProperty(exports, '__toESM', {
  enumerable: true,
  get: function () {
    return __toESM;
  }
});
Object.defineProperty(exports, 'accessories', {
  enumerable: true,
  get: function () {
    return accessories;
  }
});
Object.defineProperty(exports, 'accessoryWeights', {
  enumerable: true,
  get: function () {
    return accessoryWeights;
  }
});
Object.defineProperty(exports, 'applyFx', {
  enumerable: true,
  get: function () {
    return applyFx;
  }
});
Object.defineProperty(exports, 'armWeights', {
  enumerable: true,
  get: function () {
    return armWeights;
  }
});
Object.defineProperty(exports, 'auraById', {
  enumerable: true,
  get: function () {
    return auraById;
  }
});
Object.defineProperty(exports, 'auraCells', {
  enumerable: true,
  get: function () {
    return auraCells;
  }
});
Object.defineProperty(exports, 'auraColor', {
  enumerable: true,
  get: function () {
    return auraColor;
  }
});
Object.defineProperty(exports, 'bodies', {
  enumerable: true,
  get: function () {
    return bodies;
  }
});
Object.defineProperty(exports, 'bodyWeights', {
  enumerable: true,
  get: function () {
    return bodyWeights;
  }
});
Object.defineProperty(exports, 'buddyOf', {
  enumerable: true,
  get: function () {
    return buddyOf;
  }
});
Object.defineProperty(exports, 'cheekWeights', {
  enumerable: true,
  get: function () {
    return cheekWeights;
  }
});
Object.defineProperty(exports, 'cheeks', {
  enumerable: true,
  get: function () {
    return cheeks;
  }
});
Object.defineProperty(exports, 'compose', {
  enumerable: true,
  get: function () {
    return compose;
  }
});
Object.defineProperty(exports, 'composeBase', {
  enumerable: true,
  get: function () {
    return composeBase;
  }
});
Object.defineProperty(exports, 'cycle', {
  enumerable: true,
  get: function () {
    return cycle;
  }
});
Object.defineProperty(exports, 'dealOf', {
  enumerable: true,
  get: function () {
    return dealOf;
  }
});
Object.defineProperty(exports, 'decode', {
  enumerable: true,
  get: function () {
    return decode;
  }
});
Object.defineProperty(exports, 'dress', {
  enumerable: true,
  get: function () {
    return dress;
  }
});
Object.defineProperty(exports, 'encode', {
  enumerable: true,
  get: function () {
    return encode;
  }
});
Object.defineProperty(exports, 'eyeWeights', {
  enumerable: true,
  get: function () {
    return eyeWeights;
  }
});
Object.defineProperty(exports, 'eyes', {
  enumerable: true,
  get: function () {
    return eyes;
  }
});
Object.defineProperty(exports, 'faceOf', {
  enumerable: true,
  get: function () {
    return faceOf;
  }
});
Object.defineProperty(exports, 'fit', {
  enumerable: true,
  get: function () {
    return fit;
  }
});
Object.defineProperty(exports, 'fitLoop', {
  enumerable: true,
  get: function () {
    return fitLoop;
  }
});
Object.defineProperty(exports, 'footWeights', {
  enumerable: true,
  get: function () {
    return footWeights;
  }
});
Object.defineProperty(exports, 'freeItem', {
  enumerable: true,
  get: function () {
    return freeItem;
  }
});
Object.defineProperty(exports, 'fxColor', {
  enumerable: true,
  get: function () {
    return fxColor;
  }
});
Object.defineProperty(exports, 'gameItems', {
  enumerable: true,
  get: function () {
    return gameItems;
  }
});
Object.defineProperty(exports, 'getPalette', {
  enumerable: true,
  get: function () {
    return getPalette;
  }
});
Object.defineProperty(exports, 'gradeOf', {
  enumerable: true,
  get: function () {
    return gradeOf;
  }
});
Object.defineProperty(exports, 'hair', {
  enumerable: true,
  get: function () {
    return hair;
  }
});
Object.defineProperty(exports, 'hairWeights', {
  enumerable: true,
  get: function () {
    return hairWeights;
  }
});
Object.defineProperty(exports, 'hash', {
  enumerable: true,
  get: function () {
    return hash;
  }
});
Object.defineProperty(exports, 'hashNth', {
  enumerable: true,
  get: function () {
    return hashNth;
  }
});
Object.defineProperty(exports, 'headWeights', {
  enumerable: true,
  get: function () {
    return headWeights;
  }
});
Object.defineProperty(exports, 'heads', {
  enumerable: true,
  get: function () {
    return heads;
  }
});
Object.defineProperty(exports, 'inSeason', {
  enumerable: true,
  get: function () {
    return inSeason;
  }
});
Object.defineProperty(exports, 'itemById', {
  enumerable: true,
  get: function () {
    return itemById;
  }
});
Object.defineProperty(exports, 'itemWeight', {
  enumerable: true,
  get: function () {
    return itemWeight;
  }
});
Object.defineProperty(exports, 'items', {
  enumerable: true,
  get: function () {
    return items;
  }
});
Object.defineProperty(exports, 'luckyPalette', {
  enumerable: true,
  get: function () {
    return luckyPalette;
  }
});
Object.defineProperty(exports, 'machineName', {
  enumerable: true,
  get: function () {
    return machineName;
  }
});
Object.defineProperty(exports, 'mouthWeights', {
  enumerable: true,
  get: function () {
    return mouthWeights;
  }
});
Object.defineProperty(exports, 'mouths', {
  enumerable: true,
  get: function () {
    return mouths;
  }
});
Object.defineProperty(exports, 'nameOf', {
  enumerable: true,
  get: function () {
    return nameOf;
  }
});
Object.defineProperty(exports, 'nebulaPhase', {
  enumerable: true,
  get: function () {
    return nebulaPhase;
  }
});
Object.defineProperty(exports, 'paint', {
  enumerable: true,
  get: function () {
    return paint;
  }
});
Object.defineProperty(exports, 'painted', {
  enumerable: true,
  get: function () {
    return painted;
  }
});
Object.defineProperty(exports, 'paletteOf', {
  enumerable: true,
  get: function () {
    return paletteOf;
  }
});
Object.defineProperty(exports, 'paletteWeights', {
  enumerable: true,
  get: function () {
    return paletteWeights;
  }
});
Object.defineProperty(exports, 'palettes', {
  enumerable: true,
  get: function () {
    return palettes;
  }
});
Object.defineProperty(exports, 'pinById', {
  enumerable: true,
  get: function () {
    return pinById;
  }
});
Object.defineProperty(exports, 'resolve', {
  enumerable: true,
  get: function () {
    return resolve;
  }
});
Object.defineProperty(exports, 'resolveColor', {
  enumerable: true,
  get: function () {
    return resolveColor;
  }
});
Object.defineProperty(exports, 'roll', {
  enumerable: true,
  get: function () {
    return roll;
  }
});
Object.defineProperty(exports, 'rollFx', {
  enumerable: true,
  get: function () {
    return rollFx;
  }
});
Object.defineProperty(exports, 'rollSeason', {
  enumerable: true,
  get: function () {
    return rollSeason;
  }
});
Object.defineProperty(exports, 'shadePalette', {
  enumerable: true,
  get: function () {
    return shadePalette;
  }
});
Object.defineProperty(exports, 'shadeWeights', {
  enumerable: true,
  get: function () {
    return shadeWeights;
  }
});
Object.defineProperty(exports, 'shownPalette', {
  enumerable: true,
  get: function () {
    return shownPalette;
  }
});
Object.defineProperty(exports, 'shows', {
  enumerable: true,
  get: function () {
    return shows;
  }
});
Object.defineProperty(exports, 'slotOf', {
  enumerable: true,
  get: function () {
    return slotOf;
  }
});
Object.defineProperty(exports, 'sparkleAt', {
  enumerable: true,
  get: function () {
    return sparkleAt;
  }
});
Object.defineProperty(exports, 'special', {
  enumerable: true,
  get: function () {
    return special;
  }
});
Object.defineProperty(exports, 'starter', {
  enumerable: true,
  get: function () {
    return starter;
  }
});
Object.defineProperty(exports, 'steps', {
  enumerable: true,
  get: function () {
    return steps;
  }
});
Object.defineProperty(exports, 'tallyMarks', {
  enumerable: true,
  get: function () {
    return tallyMarks;
  }
});
Object.defineProperty(exports, 'temperTint', {
  enumerable: true,
  get: function () {
    return temperTint;
  }
});
Object.defineProperty(exports, 'tick', {
  enumerable: true,
  get: function () {
    return tick;
  }
});
Object.defineProperty(exports, 'unlockWeight', {
  enumerable: true,
  get: function () {
    return unlockWeight;
  }
});
Object.defineProperty(exports, 'wave', {
  enumerable: true,
  get: function () {
    return wave;
  }
});
Object.defineProperty(exports, 'wearOf', {
  enumerable: true,
  get: function () {
    return wearOf;
  }
});
Object.defineProperty(exports, 'withItems', {
  enumerable: true,
  get: function () {
    return withItems;
  }
});
Object.defineProperty(exports, 'withoutRetired', {
  enumerable: true,
  get: function () {
    return withoutRetired;
  }
});
Object.defineProperty(exports, 'wrap', {
  enumerable: true,
  get: function () {
    return wrap$1;
  }
});
//# sourceMappingURL=paint-CrGdjXhO.cjs.map