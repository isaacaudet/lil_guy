var LilGuy = (function(exports) {

"use strict";

//#region src/types.ts
const GRID_SIZE = 16;

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
	const pick$1 = (slot, weights) => weightedPick(weights, hashNth(input, slot));
	const deal = dealOf(input);
	const w = deal === 4 ? DEAL_4 : deal === 3 ? DEAL_3 : DEAL_2;
	let eyes$1 = overrides?.eyes ?? pick$1(1, w.eyes);
	if (RETIRED_EYES.includes(eyes$1)) eyes$1 = weightedPick(withoutRetired(w.eyes, RETIRED_EYES), hashNth(input, 14));
	return {
		head: overrides?.head ?? pick$1(0, w.head),
		eyes: eyes$1,
		mouth: overrides?.mouth ?? pick$1(2, w.mouth),
		hair: overrides?.hair ?? pick$1(3, w.hair),
		body: overrides?.body ?? pick$1(4, w.body),
		accessory: overrides?.accessory ?? pick$1(5, w.accessory),
		palette: pick$1(6, w.palette),
		rotation: overrides?.rotation ?? hashNth(input, 7) % 9,
		flip: overrides?.flip ?? hashNth(input, 8) % 2 === 1,
		shade: overrides?.shade ?? pick$1(9, shadeWeights),
		feet: overrides?.feet ?? pick$1(10, footWeights),
		cheeks: overrides?.cheeks ?? pick$1(11, w.cheeks),
		arms: overrides?.arms ?? pick$1(12, armWeights),
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
		".hhh#......#hhh.",
		".h#..........#h.",
		".#ss........ss#.",
		"..sss......sss..",
		"....s######s....",
		"...##########...",
		"..############..",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		".s.##########.s.",
		".s.s.s....s.s.s.",
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
const pair = (name, rows, inset$1 = 0, sink = 1) => {
	const left = stamp(rows);
	const right = mirror(left);
	return {
		name,
		draw: (c) => {
			const r = c.rows[c.shoulder()];
			seat(c, left, r.left + inset$1, sink);
			seat(c, right, r.right - inset$1 - width(right) + 1, sink);
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
const across$1 = (c, y) => {
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
			wear$2(c, fitted(stamps, across$1(c, y) + 2), y, dx);
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
		"......ww..",
		"....wwwwwb",
		"..wwwwwwwb",
		".wwwwwwwb.",
		"wwoooowb..",
		"w.w.ww...."
	], [
		".....ww.",
		"...wwwwb",
		".wwwwwwb",
		"wwooowb.",
		"w.w.w..."
	]], 1),
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
	hat("witch hat", [[
		"........aA..",
		"......aaA.A.",
		".....aaAAA..",
		"....aaaAAA..",
		"...xxxyxxx..",
		"aaAAAAAAAAAA"
	], [
		"......aA..",
		"....aaA.A.",
		"...aaAAA..",
		"..xxxyxx..",
		"aaAAAAAAAA"
	]], 3),
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
	const inside$1 = (x, y) => c.isBody(x, y) && (loose || c.isBody(x - 1, y) && c.isBody(x + 1, y));
	const nearFace$1 = (x, y) => {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (face.has((y + dy) * 64 + x + dx)) return true;
		return false;
	};
	const fits = (x0, y0) => s.every((row, dy) => row.every((t, dx) => !t || inside$1(x0 + dx, y0 + dy) && !nearFace$1(x0 + dx, y0 + dy)));
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
			const low = (c.face?.mouthBottom ?? 0) + 2;
			const y = low > c.eyeLine + 3 && low < c.bottom ? low : c.eyeLine + 3;
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
function rim$1(c, b$1, token, fill) {
	for (let y = b$1.top; y <= b$1.bottom; y++) for (let x = b$1.left; x <= b$1.right; x++) {
		const edgeX = x === b$1.left || x === b$1.right, edgeY = y === b$1.top || y === b$1.bottom;
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
	boxes.forEach((b$1) => {
		rim$1(c, b$1, frame, glass);
		c.set(b$1.left + 1, b$1.top + 1, glint$1);
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
function wear$1(c, x, y, token) {
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
			for (let x = r.left; x <= r.right; x++) wear$1(c, x, y, (x - r.left) % 4 < 2 ? T.ACCENT : T.TRIM);
			wear$1(c, r.right - 2, y + 1, T.ACCENT);
			wear$1(c, r.right - 2, y + 2, T.ACCENT_SHADE);
		}
	},
	{
		name: "bell collar",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x$1 = r.left; x$1 <= r.right; x$1++) wear$1(c, x$1, y, T.ACCENT);
			const x = Math.floor(c.centre);
			wear$1(c, x - 1, y + 1, T.GOLD);
			wear$1(c, x, y + 1, T.GOLD_SHADE);
		}
	},
	{
		name: "bowtie",
		layer: "body",
		draw: (c) => {
			const x = c.centred(bowtie);
			bowtie.forEach((row, dy) => row.forEach((token, dx) => {
				if (token) wear$1(c, x + dx, c.neck + dy, token);
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
			for (let x$1 = r.left; x$1 <= r.right; x$1++) wear$1(c, x$1, y, T.ACCENT);
			const x = Math.floor(c.centre);
			for (let dx = -2; dx < 2; dx++) wear$1(c, x + dx, y + 1, T.ACCENT);
			wear$1(c, x - 1, y + 2, T.ACCENT_SHADE);
			wear$1(c, x, y + 2, T.ACCENT_SHADE);
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
				if (token && c.isBody(x, y)) wear$1(c, x, y, token);
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
			const b$1 = {
				left: e.left - 1,
				right: e.right + 1,
				top: f.top - 1,
				bottom: f.line + 1
			};
			for (let y = b$1.top; y <= b$1.bottom; y++) for (let x = b$1.left; x <= b$1.right; x++) {
				const edgeX = x === b$1.left || x === b$1.right, edgeY = y === b$1.top || y === b$1.bottom;
				if (edgeX && edgeY) continue;
				if (edgeX || edgeY) c.set(x, y, y === b$1.bottom || x === b$1.right ? T.GOLD_SHADE : T.GOLD);
			}
			c.set(b$1.left + 1, b$1.top, T.WHITE);
			for (let i = 0, x = b$1.right + 1, y = b$1.bottom; y <= c.bottom && c.isBody(x, y); i++, y++) {
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
			const e = f.eyes[0], b$1 = {
				left: e.left - 1,
				right: e.right + 1,
				top: f.top - 1,
				bottom: f.line
			};
			for (let y = b$1.top; y <= b$1.bottom; y++) for (let x = b$1.left; x <= b$1.right; x++) {
				const corner = (x === b$1.left || x === b$1.right) && (y === b$1.top || y === b$1.bottom);
				if (!corner && c.isBody(x, y)) c.set(x, y, T.OUTLINE);
			}
			c.set(b$1.left + 1, b$1.top + 1, T.DEEP);
			for (let x = b$1.right, y = b$1.top - 1; y >= b$1.top - 3 && c.isBody(x, y); x++, y--) c.set(x, y, T.OUTLINE);
			for (let x = b$1.left - 1, y = b$1.top + 1; c.isBody(x, y); x--) c.set(x, y, T.OUTLINE);
		}
	},
	{
		name: "necklace",
		layer: "body",
		draw: (c) => {
			const y = c.neck;
			const r = c.rows[y];
			if (!r) return;
			for (let x = r.left + 1; x < r.right; x += 2) wear$1(c, x, y, T.WHITE);
			wear$1(c, Math.floor(c.centre) - 1, y + 1, T.GOLD);
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
			wear$1(c, x, y, T.EYE);
			wear$1(c, x + 1, y, T.EYE);
			for (let ty = y + 1; ty <= c.bottom + 1; ty++) {
				const k = ty - y;
				wear$1(c, x, ty, k % 2 ? T.ACCENT : T.EYE);
				wear$1(c, x + 1, ty, k % 2 ? T.EYE : T.ACCENT);
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
				wear$1(c, x, y, i % 2 ? T.LEAF : flowers[i / 2 % 3]);
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
				if (c.isBody(x, cy)) wear$1(c, x, cy, x % 2 ? T.GOLD_SHADE : T.GOLD);
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
			for (const [dx, dy, t] of medallion) if (c.isBody(mid + dx, ym + dy)) wear$1(c, mid + dx, ym + dy, t);
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
function wear(c, s, dx, sink) {
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
	return (c) => wear(c, s, dx, sink);
};
const onPair = (rows, inset$1 = 0) => {
	const left = stamp(rows);
	const right = mirror(left);
	return (c) => {
		const r = c.rows[c.shoulder()], l = fitRoom(c, left), rr = fitRoom(c, right);
		seat(c, l, r.left + inset$1);
		seat(c, rr, r.right - inset$1 - width(rr) + 1);
	};
};
/**
* The biggest a buddy is drawn: its art, inside the outline compose gives it.
* It stands on the floor beside him in the moving and baked pictures
* (`buddyBeside` in ./compose), which are `BUDDY_ROOM` columns wider for this
* box; the 16x16 icon has no room for it and leaves it out.
*/
const BUDDY_BOX = {
	width: 8,
	height: 8
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
/**
* A frame drawn as a 16x16 picture: `1`–`9` are its colours and `.` its
* ground (colour 1). It repeats past the edges, for the card face's bigger
* backdrop.
*/
const backdrop = (name, rows) => {
	if (rows.length !== GRID_SIZE || rows.some((r) => r.length !== GRID_SIZE || /[^.1-9]/.test(r))) throw new Error(`Frame "${name}" must be drawn on a 16x16 grid in its own colours`);
	const at = rows.map((r) => [...r].map((ch) => ch === "." ? 1 : +ch));
	return (x, y) => at[(y % GRID_SIZE + GRID_SIZE) % GRID_SIZE][(x % GRID_SIZE + GRID_SIZE) % GRID_SIZE];
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
			eyes: 9,
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
				"......331112....",
				"....3344111112..",
				"...344111111112.",
				"..3441111111112.",
				"..341h####s1112.",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1##########2..",
				"..1#########s2..",
				".31s########s2..",
				".321s######s12..",
				"..2215ssss512...",
				"...22222222.....",
				"................"
			])
		},
		{
			id: "amountle.todays-jar",
			game: "amountle",
			slot: "skin",
			name: "Today’s jar",
			eyes: 8,
			showpiece: true,
			signature: "holo",
			about: "One guess a day.",
			colors: [
				"#EAF7F8",
				"#BFE1E7",
				"#FFFFFF",
				"#FFD25A",
				"#C98A1A",
				"#FF5C8A",
				"#FFD447",
				"#3FD1C1",
				"#8C7CF0"
			],
			outline: "#2F6870",
			art: grid16("todays jar", [
				"................",
				".......45.......",
				"....44444445....",
				"...3111111112...",
				"..311oooooo112..",
				".311ohh####o112.",
				".31oh#######o12.",
				".3oh#########o2.",
				".3o##########o2.",
				".6o##########o7.",
				".6o#########so7.",
				".78os######so67.",
				".88996677889966.",
				".67788996677889.",
				"..222222222222..",
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
				"#E4F6F9",
				"#A8D8E0",
				"#FF6F9C",
				"#FFC93A",
				"#FFE89A",
				"#3FD1C1",
				"#8C7CF0",
				"#C98A1A",
				"#FFFFFF"
			],
			art: pet("lil jar", [
				".554448.",
				"..8888..",
				".911112.",
				"91o11o12",
				"91111112",
				"36743672",
				"67364732",
				".364762."
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
				"#E09A12",
				"#FFB0A0"
			],
			art: pet("candy corn", [
				"...12...",
				"..1112..",
				"..3334..",
				".3o33o4.",
				".373374.",
				"33333344",
				"55555566",
				".555566."
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
		"amountle.jellybean": {
			colors: [
				"#FF5C6A",
				"#C8303F",
				"#FFB0B6",
				"#8E1A2C"
			],
			art: pet("gummy bear", [
				".31..12.",
				".311112.",
				".1o11o2.",
				".113412.",
				"31133112",
				"21333122",
				".111122.",
				".12..12."
			])
		},
		"amountle.crystal": {
			eyes: 8,
			colors: [
				"#8CEBDF",
				"#3FBFB0",
				"#D2FFF8",
				"#FFFFFF",
				"#23897D"
			],
			outline: "#14524C",
			art: grid16("crystal", [
				"................",
				"......4331......",
				".....433112.....",
				"....43331112....",
				"...433oooo112...",
				"..43ohh####o12..",
				".43oh#######o12.",
				".31o########o12.",
				".31o########o22.",
				".11o#######so22.",
				"..11os####so22..",
				"...511oooo225...",
				"....51112225....",
				".....521225.....",
				"......5522......",
				"................"
			])
		},
		"amountle.gemling": {
			colors: [
				"#3FD1C1",
				"#1F9C90",
				"#C8FFF7",
				"#137068",
				"#FFFFFF",
				"#FF9CB8"
			],
			art: pet("gemling", [
				".355112.",
				"35531122",
				"31111112",
				"31o11o12",
				".164462.",
				"..1112..",
				"...12..."
			])
		},
		"amountle.gem": { draw: on([
			"....wwaA....",
			"...waaaaA...",
			"....aaAA....",
			".....aA.....",
			"312121212123"
		], 0, 2) },
		"amountle.gumball": {
			eyes: 7,
			limb: 5,
			colors: [
				"#EAF6FA",
				"#C5DDE6",
				"#FFFFFF",
				"#E5484D",
				"#B83236",
				"#FFD447",
				"#3FD1C1",
				"#FF7AA8",
				"#D9DEE6"
			],
			outline: "#5A1A22",
			art: grid16("gumball machine", [
				"................",
				".......45.......",
				".....311112.....",
				"....6oooooo8....",
				"...7ohh####o8...",
				".36oh#######o71.",
				".1oh#########o2.",
				".1o##########o2.",
				".7o#########so8.",
				".68os######so76.",
				"..86os####so67..",
				"..444444444445..",
				"..449944455445..",
				"..449944455445..",
				"...5555555555...",
				"................"
			])
		},
		"amountle.jar": {
			eyes: 8,
			limb: 5,
			colors: [
				"#E3F5F7",
				"#9CCFD8",
				"#FFFFFF",
				"#2E9C94",
				"#217A73",
				"#3FD1C1",
				"#FF5C8A",
				"#FFD447",
				"#8C7CF0"
			],
			outline: "#2F6870",
			art: grid16("jar", [
				"................",
				"...4545454545...",
				"...4444444444...",
				"..311111111112..",
				".3111oooooo1112.",
				".311ohh####o112.",
				".31oh#######o12.",
				".3oh#########o2.",
				".3o##########o2.",
				".1o##########o2.",
				".1o#########so2.",
				".67os######so76.",
				".89678967896789.",
				".76897689768976.",
				"..222222222222..",
				"................"
			])
		},
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
				const shift$1 = row % 2 ? 4 : 0, col = Math.floor((x + shift$1) / 8), tx = (x + shift$1) % 8;
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
			name: "Burger suit",
			eyes: 9,
			limb: "own",
			colors: [
				"#EFA352",
				"#C47A30",
				"#FFC98A",
				"#FFF6DC",
				"#7DC24A",
				"#FFC93A",
				"#8A4A26",
				"#5A2E16"
			],
			outline: "#4A2410",
			art: grid16("burger suit", [
				"................",
				"................",
				"....33331112....",
				"...3114111412...",
				"..311141114112..",
				"..221111111122..",
				".555h######s555.",
				".5h##########s5.",
				".h############s.",
				".##############.",
				".#############s.",
				"..s##########s..",
				".666ss####ss666.",
				".31111111111112.",
				"..222222222222..",
				"................"
			])
		},
		{
			id: "halfsies.trophy",
			game: "halfsies",
			slot: "skin",
			name: "Trophy cup",
			eyes: 6,
			colors: [
				"#F5C33B",
				"#C8901E",
				"#FFE58A",
				"#4A2E18",
				"#6E4628",
				"#FFF3C4"
			],
			outline: "#6A4208",
			art: grid16("trophy half", [
				"................",
				"................",
				".....h#####.....",
				"....h#######....",
				"...h#########...",
				"...##########...",
				"...##########...",
				"...##########...",
				"...##########...",
				".11333333333311.",
				".1.3311111111.2.",
				".22131111111122.",
				"....22111122....",
				".......22.......",
				"....45566554....",
				"................"
			])
		},
		{
			id: "halfsies.perfect-split",
			game: "halfsies",
			slot: "skin",
			name: "Banana split",
			eyes: 10,
			showpiece: true,
			signature: "shimmer",
			about: "A banana cut in half, to the gram.",
			colors: [
				"#FFFDF6",
				"#E6DCCB",
				"#FFFFFF",
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
				".....311112.....",
				"....31111112....",
				"...h22222222s...",
				"..h##########s..",
				"..###########s..",
				".h############s.",
				".#############s.",
				".66###########6.",
				".676ss####ss676.",
				".86677777777668.",
				"..888888888889..",
				"...9999999999...",
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
				"#8A5A2E",
				"#B8834E",
				"#5A3418"
			],
			art: pet("lil acorn", [
				"....6...",
				"..5546..",
				".545446.",
				"54545446",
				".666666.",
				".3o11o2.",
				".311112.",
				"..3122.."
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
				"#B8283A",
				"#5CB85C",
				"#FF8A8E"
			],
			art: pet("cake slice", [
				".....78.",
				"....3854",
				"..333336",
				"33333334",
				"1o11o112",
				"55555556",
				"11111112",
				"22222222"
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
		"halfsies.avo": {
			colors: [
				"#D8EE8A",
				"#9CCB4A",
				"#2E5A1E",
				"#A0602E",
				"#6A3A18",
				"#D99060",
				"#4E8A2E",
				"#F0FAC0"
			],
			art: pet("avo", [
				"..7777..",
				".788117.",
				"78o11o13",
				"78111113",
				"71164123",
				"71145123",
				".711223.",
				"..3333.."
			])
		},
		"halfsies.avocado": {
			eyes: 9,
			colors: [
				"#E2EE9A",
				"#A9CF5C",
				"#3F6B22",
				"#6E9A34",
				"#F7F0A8"
			],
			outline: "#22380F",
			art: grid16("avocado", [
				"................",
				"......4333......",
				".....421123.....",
				"....42155123....",
				"...4215555123...",
				"...421oooo123...",
				"..42oh####so23..",
				".42oh#######o23.",
				".42o########o23.",
				".42o########o23.",
				".42o#######so23.",
				".425os####so523.",
				"..4255oooo5523..",
				"...4222222223...",
				"....33333333....",
				"................"
			])
		},
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
			eyes: 10,
			limb: "own",
			colors: [
				"#FFB27E",
				"#E8805E",
				"#FFD6B4",
				"#FF8A80",
				"#6CC24A",
				"#3E8E2E",
				"#7A4A26",
				"#E07A62"
			],
			outline: "#7A2E1C",
			art: grid16("peach", [
				"................",
				".......7556.....",
				"....33381112....",
				"...3338111142...",
				"..333381114442..",
				".33333811144442.",
				".3331h####s1442.",
				".331h######s142.",
				".31h########s42.",
				".31##########42.",
				".22##########22.",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
				"................",
				"................"
			])
		},
		"halfsies.yolk": {
			name: "Half-shell chick",
			colors: [
				"#FFD84A",
				"#E0A820",
				"#FFF2A0",
				"#FF8A2E",
				"#FFFFFF",
				"#C9D1DC",
				"#A8B2C2"
			],
			art: pet("half-shell chick", [
				"...3....",
				"..3311..",
				".311112.",
				".1o11o2.",
				".114412.",
				"51511516",
				"55555566",
				".555776."
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
			eyes: 10,
			limb: "own",
			colors: [
				"#5FE0B4",
				"#34A985",
				"#A8F7DC",
				"#24785E",
				"#FFD447",
				"#FFF1A8"
			],
			outline: "#17533F",
			art: grid16("wedge", [
				"................",
				".33.............",
				".3133...........",
				".315133.........",
				".356511333......",
				".31511111133....",
				".3111111111133..",
				".31111111111112.",
				"..ssssssssssss..",
				"..h##########s..",
				"..h##########s..",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
				"................",
				"................"
			])
		},
		{
			id: "stackdle.keystone",
			game: "stackdle",
			slot: "skin",
			name: "Keystone",
			eyes: 10,
			limb: "own",
			colors: [
				"#F88F7B",
				"#D9705C",
				"#FFBFAF",
				"#B85D4A",
				"#FFD447",
				"#FFF1A8"
			],
			outline: "#6E2A1C",
			art: grid16("keystone", [
				"................",
				".33333333333332.",
				".31111155111112.",
				"..311156651112..",
				"..311115511112..",
				"...3111111112...",
				"...2222222222...",
				"...ssssssssss...",
				"..h##########s..",
				"..h##########s..",
				"..###########s..",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
				"................",
				"................"
			])
		},
		{
			id: "stackdle.arch-piece",
			game: "stackdle",
			slot: "skin",
			name: "Arch",
			eyes: 9,
			limb: "own",
			colors: [
				"#F6C768",
				"#DBAD4A",
				"#FFE3A0",
				"#9E7E2D",
				"#F88F7B",
				"#D9705C"
			],
			outline: "#5E4A12",
			art: grid16("arch", [
				"................",
				".....335533.....",
				"...3311561122...",
				"..311444444112..",
				".3114hhh###4112.",
				".314h######s412.",
				".34h########s42.",
				".34##########42.",
				".34##########42.",
				".34##########42.",
				".22##########22.",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
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
				"#E4EDF9",
				"#93A9CB",
				"#FFFFFF",
				"#7FB8EE",
				"#3F74B0",
				"#E8B86A"
			],
			art: pet("lil yeti", [
				".6.33.6.",
				".631136.",
				"31444412",
				"34o44o42",
				"14455412",
				"31111112",
				"11111122",
				".11..12."
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
				"#FF9AAA"
			],
			art: pet("lil star", [
				"...31...",
				"...31...",
				"33311112",
				".3o11o2.",
				"..4114..",
				"..1112..",
				".112112.",
				".12..12."
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
				"#FFD27A",
				"#A85A0A",
				"#FFEDB8"
			],
			art: pet("cubelet", [
				"..553333",
				".5533332",
				"11111122",
				"1o11o122",
				"11441122",
				"11111122",
				"1111112.",
				".4..4..."
			])
		},
		"stackdle.wobble": {
			name: "Wobble",
			colors: [
				"#7DD87A",
				"#3E9A4C",
				"#C6F5B0",
				"#E5384D",
				"#FF9AA0",
				"#6A4020",
				"#F4F7FA",
				"#B8C2CE"
			],
			art: pet("wobble", [
				"....6...",
				"...54...",
				".331112.",
				".3o11o2.",
				"31111122",
				"31111122",
				"77777788",
				".888888."
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
			eyes: 10,
			limb: "own",
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
				"...6644444444...",
				"..643331111114..",
				".64377711111145.",
				".64178811111145.",
				".64111111111145.",
				".6411h####s1145.",
				".641h######s145.",
				".64h########s45.",
				".64##########45.",
				".55##########55.",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
				"................",
				"................"
			])
		},
		{
			id: "flipsies.moai",
			game: "flipsies",
			slot: "skin",
			name: "Moai",
			eyes: 10,
			limb: "own",
			showpiece: true,
			signature: "lava",
			colors: [
				"#B3A797",
				"#7F7365",
				"#DDD3C4",
				"#4A4038",
				"#C0503A",
				"#8E3424",
				"#E07A5A",
				"#7FA35A"
			],
			outline: "#3A322B",
			art: grid16("moai", [
				"................",
				".....775556.....",
				"....31111112....",
				"...3333333332...",
				"..214441344412..",
				"..211111311112..",
				"..211121121112..",
				"..214222222412..",
				".21ssssssssss12.",
				".21h########s12.",
				".21##########12.",
				"..###########s..",
				"...#########s...",
				"...8ssssssss8...",
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
				"#FFFFFF",
				"#FFB060"
			],
			art: pet("goldfish", [
				"..335...",
				".33115.5",
				"34o11255",
				"31111225",
				".1111255",
				"..122..5"
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
				"#FFE36A",
				"#E0B030"
			],
			art: pet("ketchup", [
				"...45...",
				"..4445..",
				".311112.",
				".3o11o2.",
				".366672.",
				".366772.",
				".311122.",
				"..1122.."
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
				"#FF8A1A",
				"#D9661A"
			],
			art: pet("rubber duckling", [
				"..331...",
				".33111..",
				"44o112..",
				".5111..3",
				".1111131",
				"31131112",
				"11111122",
				".222222."
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
				".46.46..",
				".46.46..",
				"33333312",
				"31o11o12",
				"31111125",
				"31111122",
				"22222222",
				".5....5."
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
			eyes: 10,
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
				"......4445......",
				".....444445.....",
				".....555555.....",
				"...3111111112...",
				"..311oooooo112..",
				".311ohh####o112.",
				".31oh#######o12.",
				".3oh#########o2.",
				".3o##########o2.",
				".1o##########o2.",
				".1o#########so2.",
				".86os######so68.",
				".76666666666667.",
				"..777777777777..",
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
				"#4C5262",
				"#9AA2B8"
			],
			outline: "#0E0F13",
			art: grid16("eight ball hoodie", [
				"................",
				".....533334.....",
				"....53333114....",
				"...5333314114...",
				"..533333141234..",
				"..533666666334..",
				"..536hh####634..",
				".536h######s634.",
				".56h########s64.",
				".56##########64.",
				".56#########s64.",
				".536s######s634.",
				"..536ssssss634..",
				"..533666666334..",
				"...4444444444...",
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
				".2....2.",
				".211112.",
				".1o11o2.",
				".833382.",
				".135312.",
				".134412.",
				"67666676",
				".767767."
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
				"..5311..",
				".141135.",
				"11311412",
				"11o11o12",
				"66111166",
				"66666667",
				".667777."
			])
		},
		{
			id: "puttsies.windup",
			game: "puttsies",
			slot: "buddy",
			name: "Wind-up mouse",
			colors: [
				"#AEB6C6",
				"#77819A",
				"#E6EAF1",
				"#FF8FB0",
				"#E0B040",
				"#9A7420"
			],
			art: pet("wind-up mouse", [
				"33..33..",
				"34..43..",
				"311112..",
				"1o11o2.5",
				"11441265",
				"311122.5",
				".2..2..."
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
				"#D9A21E",
				"#FF8A8E",
				"#8FB8FF",
				"#FFF0A0"
			],
			art: pet("toy blocks", [
				"..99955.",
				"..9o5o6.",
				"..95556.",
				"..56666.",
				"77718883",
				"71128334",
				"71128334",
				"12224444"
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
			colors: [
				"#FAFAF6",
				"#D3D6DE",
				"#FFFFFF",
				"#C9CED9",
				"#B8BDC9",
				"#E5484D",
				"#B83236"
			],
			outline: "#4A4E5A",
			art: grid16("golf ball", [
				"................",
				"................",
				".....331112.....",
				"....33141142....",
				"...3141114112...",
				"..314oooooo412..",
				".314ohhh###o412.",
				".31oh#######o12.",
				".3oh#########o2.",
				".1o##########o2.",
				".4o#########so4.",
				".14os######so42.",
				"..14os####so42..",
				"...24oooooo42...",
				"......6667......",
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
			name: "Patchwork quilt",
			eyes: 9,
			limb: 3,
			colors: [
				"#F7B7B0",
				"#B9E3A8",
				"#B3D4F5",
				"#FBE3A1",
				"#E59A92",
				"#94C985",
				"#8DB8E6",
				"#E9C979",
				"#FFF6E6"
			],
			outline: "#6E3E3A",
			art: grid16("patchwork quilt", [
				"................",
				".....111222.....",
				"....11112222....",
				"...1111122222...",
				"..111111222222..",
				"..519999999962..",
				"..519hh####962..",
				".519h######s926.",
				".59h########s96.",
				".79##########98.",
				".79#########s98.",
				".739s######s948.",
				"..739ssssss948..",
				"..733333444448..",
				"...7777788888...",
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
			eyes: 10,
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
				"..444......444..",
				".45441111114454.",
				"..311111111112..",
				"..311411114112..",
				"..314411114412..",
				"..311115511112..",
				"..311h####s112..",
				"..31h######s12..",
				"..1h########s2..",
				"..1##########2..",
				"..1#########s2..",
				"..21s######s12..",
				"...244ssss442...",
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
				"#D9EEE9",
				"#D8854A",
				"#9C5228",
				"#F7B47E",
				"#B8693A",
				"#FFE3C8"
			],
			fill: backdrop("pennies", [
				".443...443......",
				"46223.46223.443.",
				"42523.4252346223",
				"32223.3222342523",
				".333...333.32223",
				"............333.",
				".443............",
				"46223........443",
				"42523.......4622",
				"32223.......4252",
				".333........3222",
				".443.........333",
				"46223.......443.",
				"42523..443.46223",
				"32223.4622342523",
				".333..4252332223"
			])
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
				const band$1 = Math.floor(y / 3), col = (x + band$1 % 2 * 3) % 6, ry = y % 3;
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
				".2....2.",
				".42..24.",
				".121212.",
				".1o11o1.",
				".335331.",
				"..1111.2",
				"..13312.",
				"..3..3.."
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
				".5.5....",
				"..5...12",
				"..3...1.",
				".33111..",
				"33o11122",
				"31111122",
				"44441122",
				".44442.."
			])
		},
		{
			id: "weighsies.trex",
			game: "weighsies",
			slot: "buddy",
			name: "Baby walrus",
			colors: [
				"#B98A6A",
				"#8A5E44",
				"#D9AE8E",
				"#FFF8EC",
				"#EBCBAA",
				"#5A3A2A"
			],
			art: pet("baby walrus", [
				"..3112..",
				".311112.",
				"31o11o12",
				"31566512",
				"11555512",
				"21411422",
				".24..42.",
				".2....2."
			])
		},
		{
			id: "weighsies.pigeon",
			game: "weighsies",
			slot: "buddy",
			name: "Pigeon",
			colors: [
				"#A3ABBA",
				"#6F7889",
				"#D3D8E2",
				"#9A6BD6",
				"#3FC79A",
				"#F07070",
				"#F2C98E"
			],
			art: pet("pigeon", [
				"..33....",
				".3o31...",
				"7311....",
				".45111..",
				".541111.",
				".3112211",
				"..112222",
				"..6..6.."
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
			name: "Peeled banana",
			colors: [
				"#FFE04A",
				"#D9A11E",
				"#FFF6D2",
				"#5C3A1E",
				"#FFF19A",
				"#F0DCA0"
			],
			draw: on([
				".4..........",
				"441.........",
				".2115......3",
				"..2211555136",
				"....2222222."
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
				"#5CA83A",
				"#FF9C8A"
			],
			art: pet("pear", [
				"...455..",
				"...4....",
				"..3112..",
				"..3112..",
				".311112.",
				"3o1111o2",
				"16111162",
				".111122."
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
				"#4FA93A",
				"#2E7A26"
			],
			art: pet("tomato", [
				"...45...",
				".344451.",
				"33131412",
				"31o11o12",
				"31111112",
				"11111122",
				".111122."
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
				"..3131..",
				".313132.",
				".3o11o2.",
				".131312.",
				"41313125",
				"44131255",
				".441255.",
				"..4455.."
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
				"...45...",
				".444455.",
				"..3112..",
				".311122.",
				".3o11o2.",
				"31111122",
				"11111122",
				".111222."
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
		"cutsies.board": {
			name: "Chopping board",
			colors: [
				"#E6BE86",
				"#CC9C5E",
				"#F6DDB2",
				"#6B4528",
				"#F2F5F9",
				"#A7B1BF",
				"#3E3440",
				"#E5483D",
				"#FFB59A"
			],
			fill: backdrop("chopping board", [
				"................",
				".44...........5.",
				".44..222222...56",
				".33...........56",
				".........2222.56",
				"..............56",
				"222222........56",
				"..............66",
				"..............77",
				"..............73",
				"..............77",
				"................",
				".....88.........",
				"....8998..222222",
				".....88.........",
				"22222..........."
			])
		}
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
			eyes: 10,
			limb: "own",
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
				"......3412......",
				".....341142.....",
				"....34114142....",
				"...3411141412...",
				"..314h####s412..",
				".314h######s412.",
				".31h########s12.",
				".31##########12.",
				".22##########22.",
				"..###########s..",
				"...#########s...",
				"....ssssssss....",
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
				const inside$1 = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
				if (y <= 4 && puffs.some(([cx, cy, r]) => inside$1(cx, cy, r))) return y === 4 ? 3 : 2;
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
			name: "Ball hamster",
			colors: [
				"#A9DDF2",
				"#6FB2D6",
				"#FFFFFF",
				"#E9B88A",
				"#B97C48",
				"#FFF1DE",
				"#FF9AA4"
			],
			art: pet("ball hamster", [
				"..3112..",
				".351152.",
				"31444412",
				"14o44o42",
				"17466472",
				"14566542",
				".215512.",
				"..1222.."
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
				"#FFFFFF",
				"#4A4F62"
			],
			art: pet("ladybug", [
				".6....6.",
				"..6666..",
				".656656.",
				"33114112",
				"34111142",
				"11141122",
				"14111422",
				".111122."
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
				".33..32.",
				".3o33o2.",
				"31111112",
				"35111152",
				"11222211",
				"11444412",
				".144412.",
				"12.22.22"
			])
		},
		{
			id: "tiltsies.ghost",
			game: "tiltsies",
			slot: "buddy",
			name: "Ghost",
			about: "Your best run, rolling along beside you.",
			colors: [
				"#F2F6FF",
				"#C6D3EA",
				"#FFFFFF",
				"#FFA8C4",
				"#FFC9DA"
			],
			art: pet("ghost", [
				".35..52.",
				".311112.",
				"31111112",
				"31o11o12",
				"14111412",
				"11111122",
				"11111122",
				"1.12.1.2"
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
				"#3E4450",
				"#6A7382",
				"#1A1D24",
				"#9AA2AE",
				"#F2F4F7",
				"#E5484D",
				"#A8202F"
			],
			art: pet("tyre stack", [
				".244442.",
				"24333342",
				"21444412",
				"65555556",
				"65o55o57",
				"76555677",
				"21212121",
				".111111."
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
				"#FFE7A0",
				"#FFFFFF"
			],
			art: pet("lil racer", [
				"..3311..",
				".374442.",
				".4o44o4.",
				"33111112",
				"61122116",
				"11111122",
				"55....55"
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
				"...454..",
				"..33112.",
				"..3o1o2.",
				"3.31112.",
				"33311122",
				"..311.22",
				"..31112.",
				"..31112."
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
				"#3A3F48",
				"#E6D5B3"
			],
			art: pet("conelet", [
				"...41...",
				"..4112..",
				"..3336..",
				".4o11o2.",
				".411112.",
				".333336.",
				"41111112",
				"55555555"
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
const headset = (band$1, ear, out) => {
	const wearBand = on(band$1), wearEars = earsOut(ear, out);
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
				"#E9944A",
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
				"...1........1...",
				"..141......141..",
				"..1441....1441..",
				"..311111111112..",
				"..314411114412..",
				"..311######112..",
				"..31########12..",
				"..1##########2..",
				"..4##########4..",
				"..4##########4..",
				"..44########44..",
				"...44######44...",
				"...2666776662...",
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
				"#A82430",
				"#F28A2E",
				"#C2601A"
			],
			outline: "#4A2232",
			art: grid16("kitsune", [
				"................",
				"..3..........2..",
				"..34........42..",
				"..344......442..",
				"..341111111142..",
				"..311114411112..",
				"..311h####s112..",
				".331h######s123.",
				".61h########s16.",
				".61##########16.",
				".71#########s17.",
				".672s######s276.",
				".36624444442663.",
				"................",
				"................",
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
				"#E3A05A",
				"#B9773A",
				"#FFFFFF",
				"#8A5028",
				"#5E3418",
				"#2B1D18",
				"#3A2A26"
			],
			draw: perch([
				"..41133114..",
				".5411331145.",
				".5416336145.",
				".5433773345."
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
				"#FF6FAE",
				"#D23A7E",
				"#FFC2DD",
				"#5FEFFF",
				"#E8FFFF",
				"#7A2858",
				"#4E1638"
			],
			draw: headset([
				"..31111112..",
				".61......16.",
				"6556....6556"
			], [
				"1...",
				"12..",
				"142.",
				"1442"
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
				"#E6F2FF",
				"#FF8FB8",
				"#FFD0E1",
				"#7A4E3A",
				"#FFE36E",
				"#FFB3CF"
			],
			fill: backdrop("sakura", [
				".3....4.3.......",
				"352.44.352.....4",
				".2.43...2.....34",
				".44352.......352",
				"4...2.........2.",
				"................",
				"................",
				"................",
				"..............6.",
				"................",
				".6..............",
				"................",
				"................",
				"6...............",
				"................",
				"................"
			])
		},
		{
			id: "pets.kitten",
			game: "pets",
			slot: "buddy",
			name: "Kitten",
			colors: [
				"#FFA95C",
				"#E07A34",
				"#FFD3A1",
				"#FF7F9E",
				"#FFFFFF"
			],
			art: pet("kitten", [
				".1....1.",
				".141141.",
				".311112.",
				".1o11o2.",
				".155452.",
				"..1111.2",
				"..15512.",
				"..5..5.."
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
				"..3112..",
				"43111124",
				"41o11o14",
				"41755714",
				".176671.",
				"..1111..",
				".311112.",
				".22..22."
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
				"4.3113.4",
				".431134.",
				"54111145",
				".1o11o1.",
				"41166114",
				".111122.",
				".12..12."
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
				".13..13.",
				".13..13.",
				".13..12.",
				".111112.",
				"1o1111o2",
				"11133112",
				".111112.",
				".12..12."
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
const TAU$2 = Math.PI * 2;
/** `v` brought into 0 to `n`, negative numbers too. */
const wrap$1 = (v, n) => (v % n + n) % n;
/** `period` ms, nudged so a whole number of them fill LOOP_MS. */
const fit = (period) => LOOP_MS / Math.max(1, Math.round(LOOP_MS / Math.abs(period)));
/** The `d` in `sin(t / d)`, nudged so the wave (2πd ms) comes round in LOOP_MS. */
const wave = (d) => fit(TAU$2 * d) / TAU$2;
/** A step's length in a pattern `n` steps long, nudged so the pattern comes round in LOOP_MS. */
const steps = (step$1, n) => fit(step$1 * Math.max(1, n)) / Math.max(1, n);
/** A count of `step` ms that starts again every LOOP_MS: for noise drawn fresh each step or generation. */
function tick(t, step$1) {
	const s = fit(step$1);
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
function noise$2(...n) {
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
			const s = shape(mask), step$1 = tick(t, 110) + print, out = [];
			s.tops.forEach((top, x) => {
				if (top < 0) return;
				const tall = 1 + Math.floor(noise$2(x, step$1) * 3.2);
				for (let k = 1; k <= tall; k++) out.push([
					x,
					top - k,
					Math.min(2, k - 1)
				]);
			});
			mask.forEach((row, y) => row.forEach((on$1, x) => {
				if (on$1) {
					for (const dx of [-1, 1]) if (!row[x + dx] && noise$2(x + dx, y, step$1) > .86) out.push([
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
				const [x, y] = near[Math.floor(noise$2(i, life, print) * near.length)] ?? [0, 0];
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
				const fall = wrap(Math.floor((t + i * 311 + print * 7) / steps(170, s.h)), s.h), x = wrap(Math.round(noise$2(i, print) * s.w + Math.sin((t + i * 400) / wave(600)) * 1.2), s.w);
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
				const fallN = s.h + 2, at = Math.floor((t + i * 377 + print * 5) / steps(150, fallN)), step$1 = wrap(at, fallN), y = step$1 - 1;
				const gen = wrap(Math.floor(at / fallN), Math.round(LOOP_MS / (steps(150, fallN) * fallN)));
				const x = wrap(Math.round(noise$2(i, print, gen) * s.w) - Math.floor(step$1 / 2), s.w);
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
			]).sort((a, b$1) => a[2] - b$1[2]);
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
				const [x, y] = far[Math.floor(noise$2(i, gen, print, 23) * far.length)] ?? [0, 0];
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
				const band$1 = Math.min(5, Math.floor((1 - d) / .0435));
				const along = Math.round(Math.atan2(cy - y, x - cx) / Math.PI * 30);
				out.push([
					x,
					y,
					Math.abs(along - glint$1) <= 1 && band$1 % 2 === 0 ? 6 : band$1
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
			const step$1 = tick(t + print * 13, 120), out = [];
			mask.forEach((row, y) => {
				if (noise$2(y, step$1, print) < .55) return;
				const shove = noise$2(y, step$1, 2) < .5 ? 1 : 2;
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
				const [ax, ay] = near[Math.floor(noise$2(i, print, 3) * near.length)] ?? [0, 0];
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
			const since = Math.min(...[1, 2].map((k) => wrap(beat - Math.floor(noise$2(print, k) * n), n)));
			const off = since === 2 || since === 4, dim = since <= 5 && !off;
			const stretch = Math.floor(noise$2(print, 3) * 4);
			return ring(mask, 2).flatMap(([x, y, d]) => {
				if (off) return d === 1 ? [[
					x,
					y,
					2
				]] : [];
				const quarter = Math.floor(wrap(Math.atan2(y - s.cy, x - s.cx) / TAU$1 + .5, 1) * 4);
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
				const x = Math.floor(noise$2(i, print, 41) * s.w);
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
				if (noise$2(x, print, 11) < .15) continue;
				const speed = 40 + Math.floor(noise$2(x, print, 12) * 50), len = 6 + Math.floor(noise$2(x, print, 13) * 4);
				const head$1 = wrap(Math.floor((t + noise$2(x, print) * 3e3) / steps(speed, s.h + len + 2)), s.h + len + 2) - 1;
				for (let j = 0; j < len; j++) {
					const glyph$1 = noise$2(x, head$1 - j, tick(t, 160)) > .82;
					out.push([
						x,
						head$1 - j,
						j === 0 ? 0 : glyph$1 ? 0 : j < len / 2 ? 1 : 2
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
				const cx = i ? s.w - 3 - Math.floor(noise$2(shot, i) * 2) : 2 + Math.floor(noise$2(shot, i) * 2), cy = 2 + Math.floor(noise$2(shot, i, 2) * 3), p = local / cycle$1;
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
						k === 1 && noise$2(x, y, tick(t, 400)) > .86 ? 0 : k
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
const TAU$1 = Math.PI * 2;
/**
* Points round the guy on a squarish ellipse, `gx` cells clear of his sides
* and `gy` of his top and foot, in order: where a rarer aura's pieces ride.
*/
function loop(s, gx, gy) {
	const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps$1 = 720;
	const pts = [];
	for (let i = 0; i < steps$1; i++) {
		const a = i / steps$1 * TAU$1, c = Math.cos(a), sn = Math.sin(a);
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
	const s = shape(mask), out = [], phase = noise$2(print, 3);
	const gy = Math.min(2, s.top), inner = loop(s, 3, gy), near = loop(s, 4, gy);
	const runs$1 = [
		0,
		1,
		1,
		2,
		2,
		3
	][level], life = fit(1300);
	for (let i = 0; i < runs$1; i++) {
		const at = t + i * life / runs$1 + print * 29, gen = tick(at, 1300), f = cycle(at, 1300) / .55;
		const [x, y] = near[Math.floor(noise$2(i, gen, print, 41) * near.length)];
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
	const seen = new Set(), step$1 = tick(t, 150);
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
		return noise$2(x, y, step$1, print, 7) >= scuff * .45;
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
const NEON_TUBES$1 = {
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
	const tubes = NEON_TUBES$1[finish] ?? NEON_TUBES$1.classic, c = tubes[print % tubes.length];
	const rgb$7 = [
		1,
		3,
		5
	].map((i) => parseInt(c.slice(i, i + 2), 16));
	const to = (target, a) => "#" + rgb$7.map((v) => Math.round(v + (target - v) * a).toString(16).padStart(2, "0")).join("").toUpperCase();
	return [
		to(255, .35),
		to(15, .38),
		to(25, .72)
	];
}
const hsl$1 = (h, s, l) => {
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
		if (sweep) return hsl$1(wrap((x + y) * 18 + t * 360 / fit(2160), 360), .9, .78);
		return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	}
	if (finish === "fade") {
		const i = wrap(Math.floor((y + x * .5 + t / steps(140, 6)) / 2), 3);
		return k === 0 ? "#FFFFFF" : FADE[(i + k) % 3];
	}
	const ramp$1 = RAMPS[finish];
	if (!ramp$1) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	if (finish === "pearl") return hsl$1(wrap(275 + 55 * Math.sin((x + y) * .35 + t / wave(520)), 360), .5, sweep ? .93 : [
		.86,
		.76,
		.66
	][Math.min(2, k % 3)]);
	if (sweep && (finish === "sapphire" || finish === "ruby")) return ramp$1[0];
	return ramp$1[Math.min(2, k % 3)];
}
/**
* The one colour an aura copy is known by, in its finish: its most vivid
* colour (Flames' orange, Frost's ice blue, a Neon copy's tube). Its card is
* dressed in it.
*/
function auraHue(id, finish, print = 0) {
	const aura = auraById(id);
	const colors = id === "aura.neon" ? [neonRamp(finish, print)[0], NEON_TUBES$1[finish]?.[print % NEON_TUBES$1[finish].length] ?? "#FF3FA4"] : aura && ONE_OF_ONE_AURAS.includes(aura) ? aura.colors : finish === "fade" ? FADE : finish === "pearl" ? ["#B9A2FF"] : RAMPS[finish] ?? aura?.colors ?? ["#19D3C5"];
	const vivid = (hex$3) => {
		const [r, g, b$1] = [
			1,
			3,
			5
		].map((i) => parseInt(hex$3.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1);
		return (max - min) * (1 - Math.abs(max + min - 1) * .3);
	};
	return colors.reduce((a, c) => vivid(c) > vivid(a) ? c : a, colors[0]);
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
		what: "A buzzing neon edge runs round it.",
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
const rgb$6 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$2 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$6 = (a, b$1, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b$1[i] - a[i]) * t);
const WHITE$2 = [
	255,
	255,
	255
];
function noise$1(...n) {
	let h = 2654435769;
	for (const v of n) {
		h = Math.imul(h ^ v, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		h ^= h >>> 16;
	}
	return (h >>> 0) / 4294967296;
}
const hue$1 = (h, s = .9, l = .65) => {
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
/** A Neon copy's tube: one colour from a sign maker's set, dealt by its print, never the whole wheel. */
const NEON_TUBES = [
	[
		255,
		63,
		164
	],
	[
		47,
		217,
		255
	],
	[
		255,
		90,
		60
	],
	[
		180,
		92,
		255
	],
	[
		61,
		255,
		143
	],
	[
		255,
		194,
		58
	]
];
const neonTube = (print) => NEON_TUBES[print % NEON_TUBES.length];
/** One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two copies move together. */
function fxColor(color, fx, x, y, t, print = 0) {
	const c = rgb$6(color), tt = t + print * 37;
	switch (fx) {
		case "shimmer": {
			const at = cycle(tt, 900) * 34 - 8;
			for (const band$1 of [at, at - 14]) {
				const d = x + y - band$1;
				if (d >= 0 && d < 1.5) return "#FFFFFF";
				if (d >= -1.5 && d < 0) return hex$2(mix$6(c, [
					150,
					220,
					255
				], .75));
			}
			return noise$1(x, y, tick(tt, 140)) > .94 ? "#FFFFFF" : color;
		}
		case "pulse": {
			const b$1 = Math.sin(tt / wave(260));
			return hex$2(mix$6(c, b$1 > 0 ? WHITE$2 : [
				0,
				0,
				0
			], (b$1 > 0 ? .45 : .14) * Math.abs(b$1)));
		}
		case "holo": return hex$2(mix$6(c, hue$1(((x * 22 + y * 14 + tt * 360 / fit(1800)) % 360 + 360) % 360), .45));
		case "chroma": {
			const h = ((tt * 360 / fit(2520) + (x + y) * 14) % 360 + 360) % 360, l = (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;
			return hex$2(mix$6(c, hue$1(h, .95, Math.min(.78, Math.max(.32, l))), .78));
		}
		case "starlight": {
			const night = mix$6(mix$6(c, [
				24,
				18,
				66
			], .6), [
				110,
				70,
				220
			], .16 * (1 + Math.sin(tt / wave(700) + x * .5 + y * .3)));
			return noise$1(x, y, print) > .93 ? hex$2(mix$6(night, [
				210,
				200,
				255
			], .55)) : hex$2(night);
		}
		case "embers": return hex$2(mix$6(c, [
			255,
			120,
			40
		], .16 + .14 * Math.max(0, Math.sin(tt / wave(140) + x * 1.3 - y * .8))));
		case "neon": return hex$2(mix$6(c, neonTube(print), .16 + .06 * Math.sin(tt / wave(380))));
		case "bubbles": return hex$2(mix$6(c, [
			190,
			235,
			255
		], .1 + .08 * Math.sin(tt / wave(300) + y)));
		case "hearts": return hex$2(mix$6(c, [
			255,
			140,
			190
		], .14 + .08 * Math.sin(tt / wave(400) + x * .5)));
		case "rime": {
			const reach = .5 + .5 * Math.sin(tt / wave(900) - y * .35);
			const n = noise$1(x, y, tick(tt, 400), print);
			if (reach > .35 && n > .72) return n > .9 ? "#FFFFFF" : "#DDF4FF";
			return hex$2(mix$6(c, [
				190,
				228,
				255
			], .3 + .5 * reach));
		}
		case "static": {
			const roll$1 = cycle(tt, 70 * 24) * 24 - 4, burst = noise$1(tick(tt, 90), print, 7) > .62;
			if (burst) {
				const r = noise$1(x, y, tick(tt, 60));
				return r > .8 ? "#FFFFFF" : hex$2(mix$6(c, r > .45 ? [
					255,
					60,
					90
				] : [
					60,
					200,
					255
				], .55));
			}
			if (Math.abs(y - roll$1) < 1) return hex$2(mix$6(c, WHITE$2, .45));
			return y % 2 ? hex$2(mix$6(c, [
				0,
				0,
				0
			], .16)) : color;
		}
		case "lava": {
			const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * .9 + tt / wave(700)) * 2);
			const crust = mix$6(c, [
				40,
				18,
				12
			], .55);
			return flow > .55 ? hex$2(mix$6([
				255,
				120,
				30
			], [
				255,
				230,
				120
			], (flow - .55) * 2.2)) : flow > .25 ? hex$2(mix$6(crust, [
				220,
				70,
				20
			], .6)) : hex$2(crust);
		}
		case "electric": {
			const flash = noise$1(tick(tt, 120), print, 11) > .8;
			if (flash) return hex$2(mix$6(c, WHITE$2, .7));
			const vein = Math.abs(Math.sin(x * 1.7 + y * .9 + tt / wave(90))) > .93;
			return vein ? hex$2(mix$6(c, [
				200,
				240,
				255
			], .75)) : hex$2(mix$6(c, [
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
const cross = (a, b$1) => [
	[
		0,
		0,
		a
	],
	[
		1,
		0,
		b$1
	],
	[
		-1,
		0,
		b$1
	],
	[
		0,
		1,
		b$1
	],
	[
		0,
		-1,
		b$1
	]
];
/**
* What an effect looks like round an aura's wearer, in chunky pieces at his
* pixel size, `f` (0 to 1) through each piece's life: what makes an aura with
* an effect look special at a glance, not only recoloured.
*/
function signature(fx, f, t, i) {
	const rainbow = (o) => hex$2(hue$1(((t * 360 / fit(2880) + i * 90 + o) % 360 + 360) % 360, 1, .62));
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
	const empty$1 = (x, y) => y >= 0 && y < H && x >= 0 && x < W && !out[y][x];
	const put = (x, y, c) => {
		if (empty$1(x, y)) out[y][x] = c;
	};
	const size = copies.map((_, k) => slots.reduce((n, row) => n + row.filter((s) => s === k + 1).length, 0));
	const small = (k) => k + 1 !== AURA_SLOT && size[k] > 0 && size[k] < SMALL_COPY;
	slots.forEach((row, y) => row.forEach((s, x) => {
		const o = copies[s - 1];
		if (!s || !o?.fx || !colors[y][x]) return;
		const fx = fxColor(colors[y][x], o.fx, x, y, t, o.print);
		const a = rgb$6(colors[y][x]), b$1 = rgb$6(fx);
		if (s === AURA_SLOT) {
			out[y][x] = fx;
			return;
		}
		if (!small(s - 1)) {
			out[y][x] = fx;
			return;
		}
		out[y][x] = hex$2(DARKENS.includes(o.fx) ? mix$6(a, b$1, .42) : mix$6(a, b$1, 1.5));
	}));
	copies.forEach((o, k) => {
		if (!o?.fx || !small(k) || OWN_EDGE.includes(o.fx)) return;
		const beat = tick(t + o.print * 37, 140);
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s || colors[y][x]) return;
			const from = NEAR2.find(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1);
			if (!from || noise$1(x, y, beat, o.print, 17) > .4) return;
			out[y][x] = hex$2(mix$6(rgb$6(out[y + from[1]][x + from[0]]), WHITE$2, .15));
		}));
	});
	const cellsOf = (k) => {
		const c = [];
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && colors[y][x]) c.push([x, y]);
		}));
		return c;
	};
	const dark = (c) => !!c && rgb$6(c).reduce((a, v) => a + v, 0) < 240;
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
	const risers = (o, k, spacing, rise, share$1, draw) => {
		const tops = new Map();
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && colors[y][x] && !tops.has(x)) tops.set(x, y);
		}));
		for (const [x, top] of tops) {
			if (noise$1(x, o.print, 5) > share$1) continue;
			const step$1 = wrap$1(Math.floor((t + noise$1(x, o.print) * 4e3) / steps(spacing, rise + 3)), rise + 3);
			if (step$1 < rise) draw(x + (Math.floor(step$1 / 2) % 2 ? 1 : 0), top - 1 - step$1, step$1);
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
			]) put(x + dx, y + dy, hex$2(mix$6(rgb$6(colors[y][x]), WHITE$2, .25 + .3 * breath)));
		}
		if (o.fx === "neon" && !aura) {
			const tube = neonTube(o.print), glow = .3 + .12 * Math.sin(tt / wave(380)), rim$2 = edgeOf(k);
			for (const [x, y] of rim$2) out[y][x] = hex$2(mix$6(tube, WHITE$2, glow));
			for (const [x, y] of rim$2) for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) put(x + dx, y + dy, hex$2(mix$6(tube, [
				20,
				12,
				36
			], .5)));
		}
		if (o.fx === "rime") {
			const reach = 1 + 1.6 * (.5 + .5 * Math.sin(tt / wave(900)));
			for (const [key, d] of depth(k)) {
				const x = key % W, y = Math.floor(key / W);
				if (d > reach) continue;
				const glint$1 = noise$1(x, y, tick(tt, 300), o.print) > .82;
				out[y][x] = glint$1 ? "#FFFFFF" : hex$2(mix$6(rgb$6(out[y][x]), [
					214,
					240,
					255
				], aura ? .5 : d <= 1 ? .85 : .6));
			}
			if (!aura) {
				for (const [x, y] of edgeOf(k)) if (noise$1(x, y, tick(tt, 300), 3) > .7 && out[y][x] && dark(colors[y][x] ?? "#000000")) out[y][x] = "#BFE6FF";
			}
		}
		if (o.fx === "starlight") {
			const deep = depth(k), inner = [...deep].filter(([, d]) => d >= 2).map(([key]) => key);
			for (let i = 0; i < 3 && inner.length; i++) {
				const at = tt + i * 333, gen = tick(at, 1e3), f = cycle(at, 1e3);
				const key = inner[Math.floor(noise$1(i, gen, o.print, 9) * inner.length)], x = key % W, y = Math.floor(key / W);
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
			if (noise$1(beat, o.print, 13) > .45) {
				const rim$2 = edgeOf(k);
				for (let b$1 = 0; b$1 < (aura ? 1 : 2) && rim$2.length; b$1++) {
					let [x, y] = rim$2[Math.floor(noise$1(beat, b$1, o.print) * rim$2.length)];
					const sx = noise$1(beat, b$1, 2) > .5 ? 1 : -1;
					for (let j = 0; j < 4; j++) {
						if (j && !empty$1(x, y)) break;
						if (j) out[y][x] = j < 2 ? "#FFFFFF" : "#7FE8FF";
						x += j % 2 ? sx : 0;
						y -= j % 2 ? 0 : 1;
					}
				}
			}
		}
		if (o.fx === "bubbles") risers(o, k, aura ? 200 : 150, 6, aura ? .3 : .55, (x, y, step$1) => {
			if (step$1 >= 5) {
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
		if (o.fx === "embers") risers(o, k, aura ? 120 : 100, 6, aura ? .35 : .6, (x, y, step$1) => {
			const c = step$1 < 2 ? ["#FFF2A8", "#FFC53D"] : step$1 < 4 ? ["#FFC53D", "#FF7A1A"] : ["#FF7A1A", "#C2412E"];
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
				const [x, y] = spots[Math.floor(noise$1(i, gen, o.print, 51) * spots.length)], sg = signature(o.fx, f, tt, i);
				const dy = -Math.round(f * sg.rise);
				for (const [cx, cy, c] of sg.cells) put(x + cx, y + cy + dy, c);
			}
		}
		if (o.fx === "static" && noise$1(tick(tt, 90), o.print, 7) > .6) {
			const yy = Math.floor(noise$1(tick(tt, 90), o.print, 9) * H), dir = noise$1(tick(tt, 90), 1) > .5 ? 1 : -1;
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
				if (empty$1(x - 1, y)) out[y][x - 1] = "#FF3D6E";
				if (empty$1(x + 1, y)) out[y][x + 1] = "#3DD8FF";
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
		const row = cells.filter(([, cy]) => cy === y).map(([x]) => x).sort((a, b$1) => a - b$1);
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
		const inside$1 = (x, y) => frame || N4.every(([dx, dy]) => at(x + dx, y + dy) !== 0);
		for (const [x, y] of placed) for (const [dx, dy] of N4) {
			const nx = x + dx, ny = y + dy;
			if (own(slot, at(nx, ny)) && inside$1(nx, ny)) grid[ny][nx] = T.OUTLINE;
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
const rgb$5 = (hex$3) => [
	1,
	3,
	5
].map((i) => parseInt(hex$3.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const light$1 = (c) => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
const mix$5 = (a, b$1, t) => a.map((v, i) => v + (b$1[i] - v) * t);
/**
* An item's colours under a paint: the first colour (an item's main one)
* becomes the paint, and every other colour sits as much lighter or darker
* than the paint as it did than the main one.
*/
function painted(colors, paint$1) {
	const p = paint$1 && PAINTS[paint$1];
	if (!p || !colors.length) return colors;
	const base$1 = rgb$5(p.hex), main = light$1(rgb$5(colors[0]));
	return colors.map((hex$3) => {
		const d = light$1(rgb$5(hex$3)) - main;
		return toHex(d >= 0 ? mix$5(base$1, [
			255,
			255,
			255
		], Math.min(1, d * 1.5)) : mix$5(base$1, [
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
/**
* The machine a mystery capsule comes from: any of them, each as likely as its
* share of every machine's capsule pool (the items a capsule can give, by
* weight), so every item across the machines is as likely as it is in its own.
* Then `roll(seed, game)` opens it as that machine's capsule.
*/
function mysteryMachine(seed) {
	const pools = GAMES.map((game) => gameItems(game).filter((i) => !i.free).reduce((a, i) => a + itemWeight(i), 0));
	let r = unit(`${seed}|machine`) * pools.reduce((a, b$1) => a + b$1, 0);
	return GAMES.find((_, i) => (r -= pools[i]) < 0) ?? GAMES[GAMES.length - 1];
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
const rgb$4 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$4 = (a, b$1, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b$1[i] - a[i]) * t);
const lum$1 = (c) => (.3 * c[0] + .59 * c[1] + .11 * c[2]) / 255;
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
	return t < .5 ? mix$4(mix$4(c, [
		0,
		0,
		0
	], .5), c, t * 2) : mix$4(c, mix$4(c, [
		255,
		255,
		255
	], .6), (t - .5) * 2);
};
/** A colour along a ramp of stops, `t` 0 to 1, blended smoothly between them. */
const ramp = (stops, t) => {
	const at = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(at));
	return mix$4(stops[i], stops[i + 1], at - i);
};
/** A colour taken through its tone: `t` 0 its shadow, 0.5 itself, 1 its highlight. */
const toned = (c, t, deep = [
	16,
	12,
	34
]) => t < .5 ? mix$4(mix$4(c, deep, .62), c, t * 2) : mix$4(c, mix$4(c, [
	255,
	255,
	255
], .72), (t - .5) * 2);
const hsl = (h, s, l) => {
	const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
	return [
		0,
		8,
		4
	].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
};
const hueOf = (c) => {
	const [r, g, b$1] = c.map((v) => v / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1), d = max - min;
	if (d < 1e-6) return {
		h: 0,
		s: 0
	};
	const l = (max + min) / 2, s = d / (1 - Math.abs(2 * l - 1));
	const h = max === r ? (g - b$1) / d % 6 : max === g ? (b$1 - r) / d + 2 : (r - g) / d + 4;
	return {
		h: (h * 60 + 360) % 360,
		s
	};
};
const GOLD = [
	"#4A2A06",
	"#8A5510",
	"#C48A1C",
	"#EDB52E",
	"#FFD95A",
	"#FFF1B8",
	"#FFFBEA"
].map(rgb$4);
const WHITE_GOLD = [
	"#3A3226",
	"#76695A",
	"#B3A58E",
	"#DDD2BC",
	"#F2EBDC",
	"#FFFBF2",
	"#FFFFFF"
].map(rgb$4);
/** How far across the item a cell is, corner to corner, about 0 to 1: what a finish's sweep runs along. */
const across = (x, y) => (x + y * .8) / 26;
/**
* Where each of an item's own colours sits for a finish: its main colour (the
* first) in the middle, the rest by how much lighter or darker than it they
* are, and how far their colour is from it. A finish paints by these, so the
* item's shading and its parts (a hood, its lining, the ears' insides) keep
* the steps the artist drew between them.
*/
function toneOf(colors) {
	const ls = colors.map((c) => lum$1(rgb$4(c))), main = ls[0] ?? .5;
	const down = .47 / Math.max(.33, main - Math.min(...ls)), up = .47 / Math.max(.33, Math.max(...ls) - main);
	const chroma = (c) => {
		const g = (c[0] + c[1] + c[2]) / 3;
		return c.map((v) => v - g);
	};
	const key = colors[0] ? chroma(rgb$4(colors[0])) : [
		0,
		0,
		0
	];
	return new Map(colors.map((c, i) => {
		const k = chroma(rgb$4(c));
		return [c.toUpperCase(), {
			tone: .5 + (ls[i] - main) * (ls[i] < main ? down : up),
			part: Math.min(1, Math.hypot(k[0] - key[0], k[1] - key[1], k[2] - key[2]) / 120)
		}];
	}));
}
/**
* Each finish as a clean, premium version of the item: its colours mapped
* through the finish's own ramp by tone, so the item's shading and parts all
* still read, and any colour shift runs in smooth bands across the whole
* item, never pixel by pixel. The shaders (./finish-shader) move a sheen over
* it.
*/
const PAINT = {
	"plain": (_x, _y, _t, _p, original) => original,
	"sunset": (x, y, _t, p, _o, l) => {
		const t = Math.max(0, Math.min(1, (x + y * .5 - 2 + p % 100 / 12) / 14));
		const c = t < .5 ? mix$4(rgb$4("#F5C542"), rgb$4("#E55AA8"), t * 2) : mix$4(rgb$4("#E55AA8"), rgb$4("#7A4BE0"), (t - .5) * 2);
		return shaded(c, l);
	},
	"tempered": (x, y, tone, p, _o, _l, part) => {
		const [a, b$1, c] = TINTS[temperTint(p)].map(rgb$4);
		const s = (across(x, y) * 1.5 + p % 11 / 11 + part * .4) % 1, k = (1 - Math.cos(s * Math.PI * 2)) / 2;
		const band$1 = s < .5 ? mix$4(a, b$1, k) : mix$4(c, b$1, 1 - k);
		return toned(band$1, .12 + tone * .8, [
			10,
			16,
			40
		]);
	},
	"nebula": (x, y, tone, p, _o, _l, part) => {
		const phase = nebulaPhase(p);
		const [a, b$1] = phase === "Red Giant" ? ["#C8102E", "#FF6A3D"] : phase === "Blue Moon" ? ["#1E4FE8", "#58B8FF"] : phase === "Black Hole" ? ["#2A1E3A", "#4A2A6A"] : [
			["#7A2AB8", "#3A3AD0"],
			["#3A2AB0", "#8A3AC8"],
			["#2A5AC0", "#6A2AB0"],
			["#A82A8A", "#4A2AB8"]
		][p % 4];
		const cloud = Math.min(1, (.5 + .5 * Math.sin(x * .5 + p) * Math.cos(y * .42 - p * .7)) * (1 - part) + part * .95);
		const t = Math.pow(tone, 1.15);
		return ramp([
			[
				8,
				6,
				22
			],
			mix$4(rgb$4(a), rgb$4(b$1), cloud),
			mix$4(mix$4(rgb$4(a), rgb$4(b$1), cloud), rgb$4("#FFC4EC"), .5),
			rgb$4("#FFF0FA")
		], t * .92);
	},
	"prism": (x, y, tone, p) => {
		const h = (across(x, y) * 300 + p * 7) % 360;
		return mix$4(hsl(h, .6, .3 + .58 * tone), [
			255,
			255,
			255
		], .14);
	},
	"negative": (_x, _y, tone, _p, original) => {
		const { h, s } = hueOf([
			255 - original[0],
			255 - original[1],
			255 - original[2]
		]);
		return mix$4(hsl(h, Math.min(.7, s * .8 + .15), .26 + .6 * (1 - tone)), [
			92,
			52,
			160
		], .2);
	},
	"classic": (_x, _y, _t, _p, original) => original,
	"fade": (_x, _y, _t, _p, original) => original,
	"frost": (_x, _y, _t, _p, original) => original,
	"toxic": (_x, _y, _t, _p, original) => original,
	"shadow": (_x, _y, _t, _p, original) => original,
	"sapphire": (_x, _y, _t, _p, original) => original,
	"ruby": (_x, _y, _t, _p, original) => original,
	"pearl": (_x, _y, _t, _p, original) => original,
	"gold": (x, y, tone, _p, _o, _l, part) => {
		const t = tone * .92 + Math.max(0, 1 - Math.abs(across(x, y) - .42) / .16) * .14;
		return mix$4(ramp(GOLD, t), ramp(WHITE_GOLD, t), part * .6);
	}
};
const PRIMER = rgb$4("#8B9097");
/**
* A finished skin's outline: the deepest colour of its finish, so a purple
* Nebula frog isn't ringed in frog green. Negative and Sunset keep the skin's own.
*/
function finishOutline(o) {
	if (o.finish === "gold") return "#3A2206";
	if (o.finish === "nebula") return "#160C30";
	if (o.finish === "prism") return "#2C2048";
	if (o.finish === "tempered") return hex$1(mix$4(rgb$4(TINTS[temperTint(o.print)][0]), [
		8,
		10,
		26
	], .72));
	return void 0;
}
/**
* Paints one cell of an owned item: its finish, then its wear. Chips land in
* places fixed by the print, so a copy always wears the same way, and how many
* show is the scuff. `glint` is set once the first Box Fresh glint has been
* placed. `tone` is the colour's place among the item's own (`toneOf`); left
* out, its lightness stands in.
*/
function paintCell(color, x, y, o, state, tone) {
	const original = rgb$4(color), l = lum$1(original);
	let c = PAINT[o.finish](x, y, tone?.tone ?? Math.max(0, Math.min(1, (l - .15) / .75)), o.print, original, l, tone?.part ?? 0);
	if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, .9) * .45) c = mix$4(c, PRIMER, Math.min(.75, .3 + o.scuff * .6));
	c = mix$4(c, [
		120,
		116,
		112
	], Math.min(.25, o.scuff * .3));
	if (o.scuff < .07 && !state.glint && lum$1(c) > .55) {
		c = [
			255,
			255,
			255
		];
		state.glint = true;
	}
	return hex$1(c);
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
			const a = Math.floor(x / 2) % 2, b$1 = Math.floor(y / 2) % 2;
			return a && b$1 ? 3 : a || b$1 ? 2 : 1;
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
* A pet that stands on the floor beside the guy (`buddyBeside` in ./compose).
* Each is a bold shape of its own with a lit side, a shaded side and a face,
* filling as much of its 8x8 (`BUDDY_BOX`) as it can, so it reads at a glance
* beside any guy and in any frame. The machines' sets redraw most of these.
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
function contrast$1(a, b$1) {
	const lum$2 = (hex$3) => {
		const c = (i) => {
			const v = parseInt(hex$3.slice(1 + i * 2, 3 + i * 2), 16) / 255;
			return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
		};
		return .2126 * c(0) + .7152 * c(1) + .0722 * c(2);
	};
	const [hi, lo] = [lum$2(a), lum$2(b$1)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
/** Adds the equipped items' own colours to a palette. */
/**
* The guy's own colours a hat can be drawn in (cat ears in his fur), in the
* order a finished copy takes them into the hat's layer after the hat's own
* colours (`ownFinishTokens`), so its finish reaches them too. Outline and
* face ink stay his.
*/
const OWN_TOKENS = [
	T.BODY,
	T.SHADE,
	T.LIGHT,
	T.BLUSH,
	T.WHITE,
	T.ACCENT,
	T.ACCENT_SHADE,
	T.BELLY,
	T.DEEP
];
/** Whether the hat he wears is a copy with a finish, whose pixels in his own colours should take it. */
function ownFinishTokens(config) {
	const hat$1 = itemById(config.hat), finish = config.owned?.hat?.finish;
	return hat$1?.slot === "hat" && !!finish && finish !== "plain";
}
function withItems(palette$1, config) {
	const colors = { ...palette$1.colors };
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
		painted(item.colors, paint$1).forEach((hex$3, i) => {
			colors[LAYER[slot] + i] = hex$3;
		});
		if (slot === "hat" && ownFinishTokens(config)) OWN_TOKENS.forEach((t, j) => {
			const n = item.colors.length + j;
			if (n <= 9 && palette$1.colors[t]) colors[LAYER.hat + n] = palette$1.colors[t];
		});
		if (slot === "skin") {
			const owned = config.owned?.skin;
			if (item.outline) colors[T.OUTLINE] = (owned && finishOutline(owned)) ?? item.outline;
			const e = item.eyes ?? 0;
			const own$1 = !!item.art && item.art.slice(e - 2, e + 2).every((row) => row.slice(4, 12).every((t) => t > 0 && t < LOCAL));
			if (!own$1) {
				const dark = "#15111C", light$2 = "#FFF1D6";
				colors[T.EYE] = colors[T.MOUTH] = contrast$1(dark, item.colors[0]) >= contrast$1(light$2, item.colors[0]) ? dark : light$2;
			}
		}
	}
	return {
		name: palette$1.name,
		colors
	};
}

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
function hexToRgb(hex$3) {
	return [
		1,
		3,
		5
	].map((i) => parseInt(hex$3.slice(i, i + 2), 16));
}
function rgbToHex(r, g, b$1) {
	return "#" + [
		r,
		g,
		b$1
	].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl(hex$3) {
	const [r, g, b$1] = hexToRgb(hex$3).map((v) => v / 255);
	const max = Math.max(r, g, b$1), min = Math.min(r, g, b$1);
	const l = (max + min) / 2;
	if (max === min) return [
		0,
		0,
		l
	];
	const d = max - min;
	const s = l > .5 ? d / (2 - max - min) : d / (max + min);
	const h = max === r ? (g - b$1) / d + (g < b$1 ? 6 : 0) : max === g ? (b$1 - r) / d + 2 : (r - g) / d + 4;
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
	const [r, g, b$1] = h < 60 ? [
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
	return rgbToHex((r + m) * 255, (g + m) * 255, (b$1 + m) * 255);
}
function mix$3(a, b$1, amount) {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b$1);
	return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}
/** Moves a hue `amount` degrees towards `target` along the short way round. */
function towards(hue$2, target, amount) {
	const diff = (target - hue$2 + 540) % 360 - 180;
	return hue$2 + Math.sign(diff) * Math.min(Math.abs(diff), amount);
}
function luminance(hex$3) {
	const channel = (v) => {
		v /= 255;
		return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	};
	const [r, g, b$1] = hexToRgb(hex$3);
	return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b$1);
}
function contrast(a, b$1) {
	const [hi, lo] = [luminance(a), luminance(b$1)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
/**
* Shade a colour by hand: darker and leaning towards violet, but never richer.
* Adding saturation in the shadow is what turned a green body's shade neon.
*/
function shadeOf(hex$3, depth = .12) {
	const [h, s, l] = toHsl(hex$3);
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
			3: mix$3(body, "#FFFFFF", .55),
			4: outline$1,
			5: ink,
			6: "#FFFFFF",
			7: blush,
			8: ink,
			9: tongue,
			10: accent,
			11: shadeOf(accent),
			12: trim,
			13: mix$3(body, "#FFFBF0", .6),
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
function resolveColor(palette$1, token) {
	if (token === 0) return null;
	return palette$1.colors[token] ?? null;
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
function shadePalette(palette$1, shade) {
	if (shade === 1) return palette$1;
	const tone = (hex$3) => {
		if (shade === 0) return mix$3(hex$3, "#FFFFFF", .3);
		const [h, s, l] = toHsl(hex$3);
		return fromHsl([
			h,
			Math.min(.8, s + .04),
			l > .4 ? l - .08 : l
		]);
	};
	const c = palette$1.colors;
	return derive(palette$1.name, tone(c[1]), tone(c[10]), c[12]);
}
/**
* The Lucky variant: the same colourway turned round the colour wheel, with
* gold trim. Derived again, so the face and outline read as well as ever.
*/
function luckyPalette(palette$1) {
	const turn = (hex$3) => {
		const [h, s, l] = toHsl(hex$3);
		let hue$2 = (h + 150) % 360;
		const dark = l < .45;
		if (dark && hue$2 >= 10 && hue$2 <= 110) hue$2 += 130;
		return fromHsl([
			hue$2,
			dark ? Math.max(.6, Math.min(.85, s + .15)) : Math.max(.7, Math.min(.92, s + .25)),
			dark ? Math.min(Math.max(l, .22), .28) : Math.min(Math.max(l, .6), .68)
		]);
	};
	const c = palette$1.colors;
	return derive(`${palette$1.name} Lucky`, turn(c[1]), turn(c[10]), "#FFE9A8");
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
	const toned$1 = shadePalette(getPalette(shownPalette(config)), config.shade);
	return config.lucky ? luckyPalette(toned$1) : toned$1;
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
/** Reds and golds, which make an eye loud (hearts, stars, fired up, a laser). */
const LOUD_EYE = new Set([
	T.RED,
	T.GOLD,
	T.GOLD_SHADE
]);
const loudEyes = (config) => eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art.some((row) => row.some((t) => LOUD_EYE.has(t)));
/** Cheek marks in colours of their own (hearts, stars, war paint, a plaster), not a blush or a fine line. */
const LOUD_CHEEK = new Set([
	T.RED,
	T.GOLD,
	T.GOLD_SHADE,
	T.ACCENT,
	T.ACCENT_SHADE,
	T.TRIM
]);
const loudCheeks = (config) => cheeks[config.cheeks].art.some((row) => row.some((t) => LOUD_CHEEK.has(t)));
/**
* What of a guy's extras is drawn. Hair (or a hat), something worn, cheek
* marks and a body pattern all at once crowd sixteen pixels, so a guy shows
* at most two of them, one on a head with eight rows or fewer (a bat, a crab):
* the pattern goes first, then the cheeks. Hair and what he wears always
* show, and so does a chase part. On a skin dark enough for light ink, the
* scattered patterns go too. A face boxed in, with hair or a hat down to
* the eyes and something worn on them or just under the mouth, has room for
* one fewer. And a face carries one loud thing: cheek marks that are more
* than a blush give way to eyes in their own colours.
*/
function extrasOf(config, c, face) {
	const body = bodies[config.body].name, cheek = cheeks[config.cheeks];
	let pattern = config.body !== 0 && !(SCATTERED.has(body) && darkSkin(config));
	let marks = cheek.art.length > 0;
	const top = itemById(config.hat)?.slot === "hat" || config.hair !== 0 && !EARED.has(heads[config.head].name);
	const worn = config.accessory !== 0;
	const small = c.bottom - c.crown + 1 <= 8;
	const limit = (small ? 2 : 3) - (top && worn && boxedIn(config, c, face) ? 1 : 0);
	const quiet = pattern && !SCATTERED.has(body) && body !== "starry" && !small;
	const count$1 = () => [
		top,
		worn,
		pattern && !quiet,
		marks
	].filter(Boolean).length;
	if (count$1() > limit && pattern && !quiet && !CHASE.has(body)) pattern = false;
	if (count$1() > limit && marks && !CHASE.has(cheek.name)) marks = false;
	if (marks && !CHASE.has(cheek.name) && loudCheeks(config) && loudEyes(config)) marks = false;
	return {
		pattern,
		cheeks: marks
	};
}
/** Whether any cell `draw` paints on a copy of the canvas, among those `keep` allows, comes within `reach` of `cells`. */
function paintsNear(c, draw, cells, reach, keep = () => true) {
	const view = c.clone();
	draw(view);
	return view.grid.some((row, y) => row.some((v, x) => v !== c.grid[y][x] && keep(x, y) && cells.some((k) => Math.abs(k % GRID_SIZE - x) <= reach && Math.abs(Math.floor(k / GRID_SIZE) - y) <= reach)));
}
/**
* A face boxed in: what's on top comes down to the eyes (hair or a hat in the
* row over them), and what he wears is on the eyes or sits a row under the mouth.
*/
function boxedIn(config, c, face) {
	const eyeAt = [...face].filter((k) => Math.floor(k / GRID_SIZE) <= c.face.line);
	const mouthAt = [...face].filter((k) => Math.floor(k / GRID_SIZE) >= c.face.mouthTop);
	const hat$1 = itemById(config.hat);
	const top = (v) => hat$1?.slot === "hat" ? hat$1.draw(v.forHats()) : hair[config.hair].draw(v.forHats());
	if (!paintsNear(c, top, eyeAt, 1, (_, y) => y <= c.floor)) return false;
	const accessory = accessories[config.accessory];
	return accessory.layer !== "body" || paintsNear(c, (v) => accessory.draw(v), mouthAt, 2);
}
/**
* The body and its markings, lit, with no face, hat or accessory on it.
* The blink frame fills vacated eye cells from here.
*/
function composeBase(config) {
	const c = startCanvas(config);
	if (!skinOf(config)) {
		const { face, extras: extras$1, worn, cheekAt } = faceAndCheeks(c, config, false);
		light(c);
		if (extras$1.pattern) markings(c, config, face, worn, cheekAt);
	}
	return c.grid;
}
/**
* Sets the face on a canvas, and works out where the eyes and mouth go, which
* extras show (a skin always shows its cheeks) and where the cheek marks go.
*/
function faceAndCheeks(c, config, skin) {
	const eye = eyes[RETIRED_EYES.includes(config.eyes) ? 0 : config.eyes].art, mouth$1 = mouths[config.mouth].art;
	c.setFace(eye, mouth$1);
	const face = faceCells(c, eye, mouth$1);
	const extras$1 = extrasOf(config, c, face);
	const cheek = skin || extras$1.cheeks ? cheeks[config.cheeks].art : [];
	const loud = new Set(), ex = c.centred(eye), ey = c.face.line - eye.length + 1;
	eye.forEach((row, dy) => row.forEach((t, dx) => {
		if (LOUD_EYE.has(t)) loud.add((ey + dy) * GRID_SIZE + ex + dx);
	}));
	const worn = new Set(), accessory = accessories[config.accessory];
	if (accessory.layer !== "body") {
		const view = c.clone();
		accessory.draw(view);
		view.grid.forEach((row, y) => row.forEach((v, x) => {
			if (v !== c.grid[y][x]) worn.add(y * GRID_SIZE + x);
		}));
	}
	return {
		eye,
		mouth: mouth$1,
		face,
		extras: extras$1,
		worn,
		cheekAt: cheek.length ? cheekCells(c, cheek, face, loud) : []
	};
}
/**
* A four-point twinkle in a corner the guy leaves empty: the mark of a Gold
* finish. Top right first, then top left.
*/
function sparkle$1(grid) {
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
* sit diagonally by an eye, as a blush does, but not by an eye's own reds and
* golds (`loud`), where pink on red is one smudge. Where they go, as
* `[x, y, token]`: worked out before the marking, so it can keep clear of them.
*/
function cheekCells(c, cheek, face, loud) {
	const out = [];
	const w = width(cheek), x0 = c.centred(cheek), y0 = c.face.line + 1, half = Math.floor(w / 2);
	const side = (x, y) => face.has(y * GRID_SIZE + x - 1) || face.has(y * GRID_SIZE + x + 1) || face.has((y - 1) * GRID_SIZE + x) || face.has((y + 1) * GRID_SIZE + x);
	const inner = (x, y) => c.isBody(x - 1, y) && c.isBody(x + 1, y) && c.isBody(x, y - 1) && c.isBody(x, y + 1);
	const ok = (x, y, t) => c.isBody(x, y) && !face.has(y * GRID_SIZE + x) && (t === T.BLUSH ? !side(x, y) && !touches(loud, x, y) : !touches(face, x, y) && inner(x, y));
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
		for (const down of [0, 1]) for (let shift$1 = 0; shift$1 <= 3; shift$1++) {
			const cells = [];
			cheek.forEach((row, dy) => {
				for (let dx = from; dx < to; dx++) {
					const x = x0 + dx + dir * shift$1, y = y0 + dy + down;
					if (row[dx] && ok(x, y, row[dx])) cells.push([
						x,
						y,
						row[dx]
					]);
				}
			});
			if (cells.length > best.length) best = cells;
		}
		out.push(...best);
	}
	return out;
}
/**
* Markings that run across the body in rows (a belly, stripes): one that
* comes near the face gives way there a whole row at a time, so it never
* wraps round the mouth with a notch.
*/
const BANDS = new Set([
	"belly",
	"two tone",
	"stripes"
]);
/** A split tints half the body flat, face and all, rather than ringing the face with a halo of the other half. */
const FILLS = new Set(["split"]);
/** Markings that scatter specks of colour: they keep a wider berth, and stay off the cheek marks too. */
const SPECKS = new Set([
	"polka dots",
	"sprinkles",
	"starry"
]);
/**
* Paints a guy's marking, keeping a quiet zone round his face: the face is a
* few pixels, and a marking that runs into them turns it into noise. Nothing
* of a marking stays touching the eyes or mouth (diagonals too), or what he
* wears on his face; specks of colour (dots, sprinkles, stars) keep two pixels
* off the eyes and mouth, and off the cheek marks, which they would run into.
* The body colour shows there instead. Where that would leave none of the
* marking (a belly on a head with no room under the mouth), it only keeps off
* the eyes and mouth themselves, as it always has: the zone cleans a marking
* up, it never takes one away.
*/
function markings(c, config, face, worn, cheekAt) {
	const name = bodies[config.body].name;
	const before = c.grid.map((row) => [...row]);
	bodies[config.body].draw(c);
	if (FILLS.has(name) && !darkSkin(config)) return;
	const painted$2 = [];
	c.grid.forEach((row, y) => row.forEach((v, x) => {
		if (v !== before[y][x]) painted$2.push([x, y]);
	}));
	const near = (x, y, reach, marks$1) => {
		for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (face.has((y + dy) * GRID_SIZE + x + dx)) return true;
		return touches(marks$1, x, y);
	};
	const specks = SPECKS.has(name);
	const marks = new Set([...worn, ...specks ? cheekAt.map(([x, y]) => y * GRID_SIZE + x) : []]);
	const crowded = painted$2.filter(([x, y]) => near(x, y, specks ? 2 : 1, marks));
	const rows = new Set(crowded.map(([, y]) => y));
	let clear = BANDS.has(name) ? painted$2.filter(([, y]) => rows.has(y)) : crowded;
	if (clear.length === painted$2.length) clear = painted$2.filter(([x, y]) => near(x, y, 1, new Set()));
	for (const [x, y] of clear) c.grid[y][x] = before[y][x];
}
/**
* Anything painted in his own colours since the marking (hair reaching down)
* that touches the eyes or mouth, diagonals too, goes back to the skin and
* its marking (`marked`), so nothing runs into the face. Things worn on the face stay.
*/
function clearFace(c, face, marked, worn) {
	for (const k of face) {
		const fx = k % GRID_SIZE, fy = Math.floor(k / GRID_SIZE);
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
			const x = fx + dx, y = fy + dy;
			if (!c.isBody(x, y) || face.has(y * GRID_SIZE + x) || worn[y][x]) continue;
			if (c.grid[y][x] < LAYER.skin && c.grid[y][x] !== marked[y][x]) c.grid[y][x] = marked[y][x];
		}
	}
}
/**
* Where a buddy stands, on a picture whose cells `taken` marks as his (in any
* frame of any move: `movesRoom`). It stands on the floor, right then left, as
* close to its corner as it can while a clear pixel, diagonals included, runs
* between its outline and him. `apart` is false, and `cells` empty, where
* there is no such spot: the picture needs more columns (`buddyBeside` adds
* them; `scripts/buddy-room.ts` measures how many).
*/
function buddySpot(art, taken) {
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
	return {
		cells: [],
		apart: false
	};
}
/** The most columns a wide picture adds past his sixteen for a buddy: a full `BUDDY_BOX` one, on the widest head or skin. */
const BUDDY_ROOM = 12;
/**
* Where his buddy stands in the moving and baked pictures: on the floor to his
* right, past his sixteen columns, as near him as it can be with a clear pixel
* between them in every frame of every move (`movesRoom`), its whole art
* drawn. The picture is as wide as that needs, `BUDDY_ROOM` more at most.
* Undefined when he has no buddy. The 16x16 icon has no room for it and
* leaves it out (`compose`).
*/
function buddyBeside(config) {
	const buddy = itemById(config.buddy);
	if (buddy?.slot !== "buddy") return void 0;
	const room = movesRoom(config);
	for (let extra = width(buddy.art) + 2;; extra++) {
		const spot = buddySpot(buddy.art, room.map((row) => [...row, ...new Array(GRID_SIZE + extra - row.length).fill(false)]));
		if (spot.apart) return {
			width: GRID_SIZE + extra,
			cells: spot.cells
		};
	}
}
/**
* His buddy on its own, its whole art (in the buddy's layer) and outline where
* it stands beside him (`buddyBeside`), on a grid that wide: what a moving
* picture draws for it, and an item view of a buddy shows.
*/
function buddyAlone(config) {
	const beside = buddyBeside(config);
	if (!beside) return void 0;
	const grid = Array.from({ length: GRID_SIZE }, () => new Array(beside.width).fill(0));
	for (const [x, y, t] of beside.cells) grid[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t;
	return grid;
}
/**
* The cells he covers in any frame of any move, on his sixteen columns and the one a step takes him past them, as
* ./animate moves him: his still with either arm out, turned round, a step to
* either side (a dance's, an oops), down two rows where a squash lowers him
* and up one for the hop a buddy takes on its own (it hops higher only while
* he is off the ground too). Tighter than `roomFor`, which allows two steps.
*/
function movesRoom(config) {
	const plain = {
		...config,
		buddy: void 0,
		frame: void 0,
		aura: void 0
	};
	const out = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE + 1).fill(false));
	for (const arms$1 of new Set([
		config.arms,
		1,
		2
	])) {
		const g = compose({
			...plain,
			arms: arms$1
		});
		for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
			if (!g[y][x] && !g[y][GRID_SIZE - 1 - x]) continue;
			for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) {
				const yy = y + dy, xx = x + dx;
				if (yy >= 0 && yy < GRID_SIZE && xx >= 0) out[yy][xx] = true;
			}
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
function build(config, report) {
	const skin = skinOf(config);
	const hat$1 = itemById(config.hat);
	const frame = itemById(config.frame);
	const c = startCanvas(config);
	const { eye, mouth: mouth$1, face, extras: extras$1, worn: wornOnFace, cheekAt } = faceAndCheeks(c, config, !!skin);
	if (skin) {
		if (skin.limb) {
			const limb = skin.limb === "own" ? T.BODY : LAYER.skin + skin.limb - 1;
			feet(c, config.feet, limb);
			arms(c, config.arms, limb);
		}
	} else {
		light(c);
		if (heads[config.head].feet) feet(c, config.feet, T.BODY);
		arms(c, config.arms, T.BODY);
	}
	if (!skin && extras$1.pattern) markings(c, config, face, wornOnFace, cheekAt);
	const marked = c.grid.map((row) => [...row]);
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
			let shown = 0;
			canvas.grid.forEach((row, y) => row.forEach((v, x) => {
				if (v !== before[y][x]) shown++;
			}));
			return {
				grid: canvas.grid,
				shown,
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
		const own$1 = [];
		if (ownFinishTokens(config)) c.grid.forEach((row, y) => row.forEach((v, x) => {
			if (v !== before[y][x] && OWN_TOKENS.includes(v)) own$1.push([x, y]);
		}));
		claim(c.grid, LAYER.hat);
		for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
			const t = c.grid[y][x], below = c.grid[y + 1][x];
			if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
		}
		for (const [x, y] of own$1) {
			const n = hat$1.colors.length + OWN_TOKENS.indexOf(c.grid[y][x]);
			if (OWN_TOKENS.includes(c.grid[y][x]) && n <= 9) c.grid[y][x] = LAYER.hat + n;
		}
	} else if (!skin && !EARED.has(heads[config.head].name)) onTop((cv) => hair[config.hair].draw(cv));
	const accessory = accessories[config.accessory];
	const preFace = c.grid.map((row) => [...row]);
	if (accessory.layer === "face") accessory.draw(c);
	const onFace = c.grid.map((row, y) => row.map((v, x) => v !== preFace[y][x]));
	const line = c.face.line;
	clearFace(c, face, marked, onFace);
	for (const [x, y, t] of cheekAt) c.set(x, y, t);
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
	if (Object.values(config.owned ?? {}).some((o) => o?.finish === "gold")) sparkle$1(c.grid);
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
function paint(grid, config, palette$1, small = false, still = true) {
	const state = { glint: false };
	const slotOf$1 = (t) => t >= LAYER.aura ? "aura" : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
	const aura = auraById(config.aura);
	if (small) ({grid, palette: palette$1} = forSmall(grid, palette$1));
	const chase = chaseEyes(grid, config);
	const tones = new Map();
	const tonesOf = (slot) => {
		let m = tones.get(slot);
		if (!m) tones.set(slot, m = toneOf(Array.from({ length: 10 }, (_, i) => palette$1.colors[LAYER[slot] + i]).filter((c) => !!c)));
		return m;
	};
	return grid.map((row, y) => row.map((token, x) => {
		const color = chase?.[y][x] ?? (token === T.WHITE ? catchlight(grid, x, y, palette$1) : resolveColor(palette$1, token));
		if (!color) return null;
		const slot = slotOf$1(token);
		const copy = slot ? config.owned?.[slot] : void 0;
		const painted$2 = slot === "aura" ? aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still, copy.print) : color : copy ? paintCell(color, x, y, copy, state, tonesOf(slot).get(color.toUpperCase())) : color;
		return still && copy?.fx ? fxColor(painted$2, copy.fx, x, y, 0, copy.print) : painted$2;
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
function forSmall(grid, palette$1) {
	const eyeAt = (x, y) => grid[y]?.[x] === T.EYE;
	const out = grid.map((row, y) => row.map((t, x) => {
		if (t === T.WHITE && (eyeAt(x - 1, y) || eyeAt(x + 1, y) || eyeAt(x, y - 1) || eyeAt(x, y + 1))) return T.EYE;
		if (t === T.LIGHT) return T.BODY;
		return t;
	}));
	const ink = palette$1.colors[T.EYE];
	if (!ink || contrast("#FFFFFF", ink) < 3) return {
		grid: out,
		palette: palette$1
	};
	const deep = mix$3(ink, "#000000", .45);
	return {
		grid: out,
		palette: {
			...palette$1,
			colors: {
				...palette$1.colors,
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
function catchlight(grid, x, y, palette$1) {
	const white = resolveColor(palette$1, T.WHITE);
	const near = [
		[x - 1, y],
		[x + 1, y],
		[x, y - 1],
		[x, y + 1]
	].map(([nx, ny]) => grid[ny]?.[nx] ?? 0);
	if (!white || !near.includes(T.EYE)) return white;
	const ink = resolveColor(palette$1, T.EYE);
	if (ink && contrast(ink, "#000000") > 10) return resolveColor(palette$1, T.OUTLINE) ?? "#000000";
	if (!ink || contrast(white, ink) < 3) return white;
	const pale = near.some((t) => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette$1, t) ?? "#000000") < 1.6);
	return pale ? mix$3(ink, white, .6) : white;
}

//#endregion
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
const empty = (width$1 = FRAME_WIDTH) => Array.from({ length: FRAME_HEIGHT }, () => new Array(width$1).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted$1(grid, config, palette$1, small = false, face = null, width$1 = FRAME_WIDTH) {
	const colors = paint(grid, config, palette$1, small, false);
	const out = empty(width$1);
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
			if (k === T.WHITE) cell.c = wrap$1(t / steps(160, 5) + x * 3 + y * 2, 5) < 1.2 ? "#FFFFFF" : "#CBB8FF";
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
	const nearFace$1 = (x, y) => {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (layer[y + dy]?.[x + dx]?.feature) return true;
		return false;
	};
	const ink_ = (ch) => ch === "#" || ch === "+";
	const cells = [];
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const ch = rows[y - 1]?.[x - 1], on$1 = ink_(ch);
		if (on$1 || NEIGHBOURS.some(([dx, dy]) => ink_(rows[y - 1 + dy]?.[x - 1 + dx]))) cells.push([
			x0 + x,
			y0 + y,
			on$1 ? ch === "+" ? accent : color : ink
		]);
	}
	for (const [x, y, c] of cells) if (x >= 0 && y < FRAME_HEIGHT && !nearFace$1(x, y)) layer[y][x] = {
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
			const on$1 = ink(ch);
			const near = !on$1 && !(open && inside$1(x, y)) && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
			if (on$1 || near) cells.push([
				x0 + x,
				y0 + y,
				on$1 ? ch === "+" ? accent ?? color : color : "#1B1428"
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
function poseMouth(pose, own$1) {
	if (pose === "laugh" || pose === "laughWave") return mouthIndex("laugh");
	if (pose === "frown") return mouthIndex("wobble");
	if (pose === "ooh") return mouthIndex("ooh");
	if (pose === "blep") return mouthIndex("blep");
	if (pose === "smile" || pose === "content") return own$1 === mouthIndex("smile") ? mouthIndex("grin") : mouthIndex("smile");
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
			const base$1 = compose(figure), mouth$1 = poseMouth(pose, config.mouth);
			const worn = mouth$1 === void 0 ? base$1 : compose({
				...figure,
				mouth: mouth$1,
				arms: pose === "laughWave" ? 2 : figure.arms
			});
			grids.set(pose, pose === "shut" ? closeEyes(base$1, config) : pose === "left" ? glance(base$1, config, -1) : pose === "right" ? glance(base$1, config, 1) : pose === "frown" || pose === "content" || pose === "huff" || pose === "oops" ? closeEyes(worn, config) : pose === "blush" ? compose({
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
	const base$1 = grid("base");
	let first = -1, last = -1;
	base$1.forEach((row, y) => {
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
	let backdrop$1 = null;
	const frameItem = itemById(config.frame);
	if (frameItem?.slot === "frame") {
		const tall = Array.from({ length: GRID_SIZE + HEADROOM * 2 }, (_, y) => Array.from({ length: W }, (_$1, x) => LAYER.frame + frameItem.fill(x, y + 48) - 1));
		const colors = paint(tall, config, palette$1, false, false);
		backdrop$1 = Array.from({ length: FRAME_HEIGHT }, (_, y) => colors[y < HEADROOM ? GRID_SIZE - HEADROOM + y : y - HEADROOM]);
	}
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
	const loop$1 = options.loop && "fit" in options.loop ? {
		...fitLoop(lapMs),
		fine: options.loop.fine
	} : options.loop;
	const laps = loop$1 ? loop$1.repeats + 1 : 1, span$1 = loop$1 ? lapMs * loop$1.repeats : 0;
	const clock = (ms) => loop$1 ? ms * loop$1.turns * LOOP_MS % (LOOP_MS * span$1) / span$1 : ms;
	const slices = [];
	let t = 0;
	for (let lap = 0; lap < laps; lap++) for (const beat of beats) {
		let n = wornAura || withFx || lucky || liveEye || goldMark || buddyLife ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
		if (loop$1?.fine) n = Math.max(n, Math.ceil(beat.ms / 80));
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
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(wrap$1(t$1, fit(800)) / (fit(800) / 2)) % 2);
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
			const on$1 = Math.floor(wrap$1(t$1 + seed, fit(640)) / (fit(640) / 2)) % 2 === 0;
			const ring$1 = grade === 4 ? on$1 ? "#FFE27A" : "#E4AE39" : on$1 ? gradeColor : mix$2(gradeColor, "#000000", .35);
			for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = {
				c: ring$1,
				item: false
			};
		}
		if (grade >= 3 && !wornAura) {
			const colors$1 = grade === 4 ? GOLD_SPARKLE : sparkleIn(gradeColor), count$1 = grade === 4 ? 2 : 1;
			for (let i = 0; i < count$1; i++) sparkleRun(layer, spots, t$1 + phase + i * fit(1700) / count$1, 1700, .5, phase + i, colors$1);
		}
		const flat = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop$1?.[y][x] ?? null));
		const slots = layer.map((row, y) => row.map((cell, x) => cell ? cell.slot ?? 0 : backdrop$1?.[y][x] ? 3 : 0));
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
	const frames$1 = loop$1 ? all.filter((_, i) => slices[i].lap > 0) : all;
	return {
		move,
		width: W,
		height: FRAME_HEIGHT,
		frames: frames$1,
		duration: frames$1.reduce((n, f) => n + f.ms, 0),
		timed,
		...loop$1 ? { turns: loop$1.turns } : {}
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
	const { frames: frames$1, duration } = animation;
	let t = once ? Math.min(ms, duration - 1) : (ms % duration + duration) % duration;
	for (const frame of frames$1) {
		if (t < frame.ms) return frame;
		t -= frame.ms;
	}
	return frames$1[frames$1.length - 1];
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
function pickable(own$1, slot, unlocks) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	const total = weights.reduce((a, b$1) => a + b$1, 0);
	const earned = unlocks?.[slot] ?? [];
	return weights.map((w, i) => i).filter((i) => (weights[i] / total >= RARE || i === own$1[slot] || earned.includes(i)) && !(slot === "eyes" && RETIRED_EYES.includes(i)));
}
/** Whether a look only uses parts this player may pick. */
function allowed(own$1, look, unlocks) {
	return SLOTS.every(([, slot]) => look[slot] === void 0 || pickable(own$1, slot, unlocks).includes(look[slot]));
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
function decodeLook(code, own$1, unlocks) {
	if (typeof code !== "string" || !code.startsWith("2:")) return null;
	const look = {};
	for (const part of code.slice(2).split(".").filter(Boolean)) {
		const slot = SLOTS.find((s) => s[0] === part[0]);
		const n = Number(part.slice(1));
		if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
		if (slot[1] === "eyes" && RETIRED_EYES.includes(n)) continue;
		look[slot[1]] = n;
	}
	if (own$1 && !allowed(own$1, look, unlocks)) return null;
	return look;
}
/** A player's guy: from their seed, with their picked look laid over it. */
function lookOf(seed, code = "", unlocks) {
	const own$1 = resolve(seed);
	const look = code ? decodeLook(code, own$1, unlocks) : null;
	return look ? {
		...own$1,
		...look
	} : own$1;
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
  else c = mix(c, vec3(1.0, 0.97, 0.84), w * 0.5 * coat) + b * 0.35 * coat;
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
		const s = .5 + .5 * Math.sin(d * .8 - time * TAU / 2 + print);
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
		const shifted = hueShift(c, .32 * Math.sin(time * TAU / 6 + d * .12 + fract(print * .618) * TAU) * coat);
		const s = Math.max(0, Math.sin(time * TAU / 3 + h * 97));
		return mix$1(shifted, [
			1,
			.94,
			1
		], step(.972, h) * s * s * s * coat);
	}
	if (finish < 4.5) return add(hueShift(c, time * TAU / 6 * coat), w * .14 * coat);
	if (finish < 5.5) return add(add(c, scale([
		.28,
		.12,
		.45
	], b$1 * coat)), .07 * Math.sin(time * TAU / 3 + d * .5 + fract(print * .618) * TAU) * coat);
	return add(mix$1(c, [
		1,
		.97,
		.84
	], w * .5 * coat), b$1 * .35 * coat);
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
const SINES = Float64Array.from({ length: 4097 }, (_, i) => Math.sin(i / 4096 * TAU));
const sine = (x) => {
	const u = x * (4096 / TAU), i = Math.floor(u), j = i & 4095;
	return SINES[j] + (SINES[j + 1] - SINES[j]) * (u - i);
};
/**
* `editionColor` over a fixed set of pixels, for drawing the same card again
* and again: what doesn't move is worked out once, so each moment costs a few
* multiplies a pixel. The returned function writes each pixel's colour at
* `time` into `out` (0 to 1, unclamped, three a pixel), as `editionColor` gives it.
*/
function editionField(ed, v, o, px, pixels) {
	const { x, y, region, h, rgb: rgb$7 } = pixels, n = region.length;
	if (ed < .5) return (_, out) => out.set(rgb$7);
	const at = new Float32Array(n);
	for (let k = 0; k < n; k++) at[k] = mod(x[k] + y[k] * .6 + v * 13, 60);
	/** `sweep(at, time, width)`, with T = time * 10 brought into 0 to 60. */
	const band$1 = (k, T$1, width$1) => {
		let u = at[k] - T$1;
		if (u < 0) u += 60;
		const d = Math.abs(u - 30) / width$1;
		return d > 1 ? 0 : 1 - d;
	};
	const a = new Float32Array(n * 3), s = new Float32Array(n), c2 = new Float32Array(n);
	if (ed < 1.5) {
		for (let k = 0; k < n; k++) {
			const r = rgb$7[k * 3], g = rgb$7[k * 3 + 1], b$1 = rgb$7[k * 3 + 2], l = .299 * r + .587 * g + .114 * b$1;
			a[k * 3] = r + (l * .8 + .05 - r) * .6;
			a[k * 3 + 1] = g + (l * .92 + .08 - g) * .6;
			a[k * 3 + 2] = b$1 + (l * 1.1 + .16 - b$1) * .6;
			const phase = (x[k] * .7 + y[k] * .45 + v * 3) * 1.3;
			s[k] = Math.sin(phase);
			c2[k] = Math.cos(phase);
		}
		return (time, out) => {
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU / 2), sa = Math.sin(time * TAU / 2);
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
			const T$1 = mod(time * 10, 60), ca = Math.cos(time * TAU / 3), sa = Math.sin(time * TAU / 3);
			for (let k = 0; k < n; k++) {
				const t = .5 + .5 * (s[k] * ca - c2[k] * sa), m = .55 * (region[k] > 1.5 ? .6 : 1), add$1 = lift[k] + band$1(k, T$1, 5) * .25;
				const tr = 1 + -.72 * t, tg = .3 + .32 * t, tb = .42 + .5800000000000001 * t;
				const r = rgb$7[k * 3], g = rgb$7[k * 3 + 1], b$1 = rgb$7[k * 3 + 2];
				out[k * 3] = r + (r * .5 + tr * .55 - r) * m + add$1;
				out[k * 3 + 1] = g + (g * .5 + tg * .55 - g) * m + add$1;
				out[k * 3 + 2] = b$1 + (b$1 * .5 + tb * .55 - b$1) * m + add$1;
			}
		};
	}
	if (ed < 3.5) {
		const lum$3 = new Float32Array(n);
		for (let k = 0; k < n; k++) {
			const r = rgb$7[k * 3], g = rgb$7[k * 3 + 1], b$1 = rgb$7[k * 3 + 2];
			const i = .596 * r - .274 * g - .322 * b$1, q = .211 * r - .523 * g + .312 * b$1;
			const hue$3 = Math.atan2(q, i) + (x[k] - y[k]) * .05, ch = Math.hypot(i, q);
			lum$3[k] = .299 * r + .587 * g + .114 * b$1;
			s[k] = ch * Math.cos(hue$3);
			c2[k] = ch * Math.sin(hue$3);
			a[k] = (x[k] + y[k]) * .03 + v * .25;
		}
		const hsv1 = (hh, o$1) => {
			const p = Math.abs(fract(hh + o$1) * 6 - 3) - 1;
			return 1 + ((p < 0 ? 0 : p > 1 ? 1 : p) - 1) * .6;
		};
		return (time, out) => {
			const T$1 = mod(time * 10, 60), ct = Math.cos(time * TAU / 6), st = Math.sin(time * TAU / 6);
			for (let k = 0; k < n; k++) {
				const I = s[k] * ct + c2[k] * st, Q = c2[k] * ct - s[k] * st, Y = lum$3[k];
				const hh = fract(a[k] - time / 6), add$1 = band$1(k, T$1, 5) * .18;
				const hr = Y + .956 * I + .621 * Q, hg = Y - .272 * I - .647 * Q, hb = Y - 1.106 * I + 1.703 * Q;
				out[k * 3] = hr + (rgb$7[k * 3] * .45 + hsv1(hh, 1) * .6 - hr) * .5 + add$1;
				out[k * 3 + 1] = hg + (rgb$7[k * 3 + 1] * .45 + hsv1(hh, 2 / 3) * .6 - hg) * .5 + add$1;
				out[k * 3 + 2] = hb + (rgb$7[k * 3 + 2] * .45 + hsv1(hh, 1 / 3) * .6 - hb) * .5 + add$1;
			}
		};
	}
	if (ed < 4.5) {
		for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) {
			const m = 1 - rgb$7[k * 3 + j];
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
			out[k * 3] = rgb$7[k * 3] + (lr - rgb$7[k * 3]) * m;
			out[k * 3 + 1] = rgb$7[k * 3 + 1] + (lg - rgb$7[k * 3 + 1]) * m;
			out[k * 3 + 2] = rgb$7[k * 3 + 2] + (lb - rgb$7[k * 3 + 2]) * m;
		}
	};
	const lum$2 = new Float32Array(n), hue$2 = new Float32Array(n), chroma = new Float32Array(n);
	for (let k = 0; k < n; k++) {
		const z = region[k] > 1.5 ? 7 : 12, qx = (x[k] - o[0]) / z, qy = (y[k] - o[1]) / z;
		const r = Math.hypot(qx, qy), turn = Math.atan2(qy, qx) + r * 1.8;
		s[k] = Math.cos(turn) * r;
		c2[k] = Math.sin(turn) * r;
		const cr = rgb$7[k * 3], cg = rgb$7[k * 3 + 1], cb = rgb$7[k * 3 + 2];
		const i = .596 * cr - .274 * cg - .322 * cb, q = .211 * cr - .523 * cg + .312 * cb;
		lum$2[k] = .299 * cr + .587 * cg + .114 * cb;
		hue$2[k] = Math.atan2(q, i);
		chroma[k] = Math.hypot(i, q);
		a[k] = (x[k] - y[k]) * .16;
	}
	/** A glint opening on a pixel whose noise is high enough. */
	const glint$1 = (k, time) => {
		if (h[k] < .965) return 0;
		const g = Math.max(0, Math.sin(time * TAU / 2 + h[k] * 91)), g2 = g * g;
		return g2 * g2 * g2 * .6;
	};
	return (time, out) => {
		const T$1 = mod(time * 10, 60), th = time * TAU / 6, ct = Math.cos(th), st = Math.sin(th), B = time * TAU / 3;
		for (let k = 0; k < n; k++) {
			const wx = s[k] * ct + c2[k] * st, wy = c2[k] * ct - s[k] * st;
			const f = Math.floor((.5 + .5 * sine(wx * 3.2 + sine(wy * 2.6 + B) * 1.5)) * 3.99);
			const r = rgb$7[k * 3], g = rgb$7[k * 3 + 1], b$1 = rgb$7[k * 3 + 2], gl = glint$1(k, time);
			if (region[k] > 1.5) {
				const m$1 = .7 + .25 * f, add$2 = band$1(k, T$1, 5) * .12 + gl;
				out[k * 3] = r * m$1 + add$2;
				out[k * 3 + 1] = g * m$1 + add$2;
				out[k * 3 + 2] = b$1 * m$1 + add$2;
				continue;
			}
			const m = .86 + .1 * f, turn = hue$2[k] + .4 * Math.sin(a[k] + th + v), ch = chroma[k] * m, Y = lum$2[k] * m;
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
	const noise$3 = new Uint8Array(W * FRAME_HEIGHT * 4);
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
			noise$3[i] = noiseOf(x, y, print * 4);
		}
	}));
	return {
		colors,
		info,
		noise: noise$3
	};
}
/** Whether any pixel of the frame belongs to a copy with a finish that shimmers. */
const shines = (frame, owned = {}) => frame.slots.some((row) => row.some((slot) => slot > 0 && SHADER_FINISHES.includes(owned?.[FRAME_SLOTS[slot - 1]]?.finish)));
/**
* The shader's picture, in plain code: the frame with each copy's finish
* running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
*/
function shineFrame(frame, owned, ms) {
	const { colors, info, noise: noise$3 } = shineData(frame, owned);
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
		], finish, info[i + 1] / 255, noise$3[i] / 255, x + y, y, info[i + 2] * 4, time, 0);
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
	const texture = (unit$1) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit$1);
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
			const { colors, info, noise: noise$3 } = shineData(frame, owned), W = frame.colors[0].length;
			if (target.width !== W) target.width = W;
			gl.viewport(0, 0, W, FRAME_HEIGHT);
			[
				colors,
				info,
				noise$3
			].forEach((bytes, unit$1) => {
				gl.activeTexture(gl.TEXTURE0 + unit$1);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit$1]);
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
	const s = SURFACES[kind], wear$3 = Math.round(Math.min(1, Math.max(0, scuff)) * 10) / 10;
	return {
		kind,
		...s,
		roughness: Math.min(1, +(s.roughness + wear$3 * .55).toFixed(3)),
		clearcoat: +(s.clearcoat * (1 - wear$3)).toFixed(3)
	};
}
const lum = (hex$3) => {
	const n = parseInt(hex$3.slice(1, 7), 16);
	return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex$3, k) => {
	const n = parseInt(hex$3.slice(1, 7), 16), f = (v) => Math.round(v * k).toString(16).padStart(2, "0");
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
	const span$1 = Array.from({ length: H }, () => new Array(W).fill(null));
	let deepest = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const c = C[y][x], s = S[y][x];
		if (!c || s === 3) continue;
		const d = s === 4 ? buddy[y][x] : figure[y][x];
		let t = small ? 1 + .45 * Math.min(d, 3) : 1.3 + 1.05 * Math.min(d, 4);
		if (s === 4 && !small) t *= .82;
		if (s === 2 && !small) t += .5;
		const lift = feature(x, y);
		span$1[y][x] = {
			z0: -t / 2,
			z1: t / 2 + lift
		};
		front[y][x] = t / 2 + lift;
		deepest = Math.max(deepest, t);
	}
	let squeeze$1 = 1;
	if (options.deepest) {
		let lo = Infinity, hi = -Infinity;
		for (const row of span$1) for (const s of row) if (s) {
			lo = Math.min(lo, s.z0);
			hi = Math.max(hi, s.z1);
		}
		if (hi - lo > options.deepest) squeeze$1 = options.deepest / (hi - lo);
	}
	if (squeeze$1 < 1) {
		for (const row of span$1) for (const s of row) if (s) {
			s.z0 *= squeeze$1;
			s.z1 *= squeeze$1;
		}
		for (const row of front) row.forEach((v, x) => {
			row[x] = v * squeeze$1;
		});
		deepest *= squeeze$1;
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
		const { z0, z1 } = span$1[y][x];
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
			lift: feature(x, y) * squeeze$1
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
	const base$1 = resolve(seed);
	const draw = (equip) => {
		const cfg = dress(base$1, { equip });
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
const linear = (hex$3) => {
	const n = parseInt(hex$3.slice(1, 7), 16);
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
	const quad = (a, b$1, c, d, n, rgb$7) => {
		const shaded$1 = [
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
			nor.push(...shaded$1[i]);
			col.push(...rgb$7);
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
			const RIM = .4, rim$2 = z1 - RIM;
			const wallQuads = (spans, corners, n) => {
				for (const [a, b$1] of spans) {
					if (c.side === void 0 || c.side === c.color || b$1 <= rim$2) {
						const q$1 = corners(a, b$1);
						quad(q$1[0], q$1[1], q$1[2], q$1[3], n, b$1 <= rim$2 ? side : face);
						continue;
					}
					if (a < rim$2) {
						const q$1 = corners(a, rim$2);
						quad(q$1[0], q$1[1], q$1[2], q$1[3], n, side);
					}
					const q = corners(Math.max(a, rim$2), b$1);
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
	const [lo, hi] = FINISHES[o.finish].scuffs, span$1 = hi - lo;
	const share$1 = (a, b$1) => Math.max(1e-9, (Math.min(b$1, hi) - Math.max(a, lo)) / span$1);
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
	const own$1 = itemById(o.item)?.signature;
	if (o.fx && o.fx === own$1) notes.push({
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
function upscale(rgba, width$1, height, scale$1) {
	if (scale$1 === 1) return rgba;
	const W = width$1 * scale$1, out = new Uint8ClampedArray(W * height * scale$1 * 4);
	for (let y = 0; y < height; y++) for (let x = 0; x < width$1; x++) {
		const i = (y * width$1 + x) * 4;
		for (let dy = 0; dy < scale$1; dy++) for (let dx = 0; dx < scale$1; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale$1 + dy) * W + x * scale$1 + dx) * 4);
	}
	return out;
}
/**
* Up to 255 colours that stand for every opaque pixel across the frames: all
* of them when there are that few, else a median cut weighted by how much
* each colour is used.
*/
function palette(frames$1) {
	const counts = new Map();
	for (const f of frames$1) for (let i = 0; i < f.length; i += 4) {
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
	const frames$1 = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const colours = palette(frames$1);
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
	frames$1.forEach((f, n) => {
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
function layout(frames$1) {
	const key = (px, i) => px[i + 3] < 128 ? -1 : px[i] << 16 | px[i + 1] << 8 | px[i + 2];
	const index = new Map([[-1, 0]]);
	for (const px of frames$1) for (let i = 0; i < px.length && index.size <= 256; i += 4) {
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
	const frames$1 = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const { indexed, colours, rows } = layout(frames$1);
	const head$1 = new Uint8Array([
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
	]), chunk("IHDR", head$1)];
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
	if (animated) parts.push(chunk("acTL", concat([u32(frames$1.length), u32(0)])));
	for (let i = 0; i < frames$1.length; i++) {
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
		const data = await zlib(rows(frames$1[i], W, H));
		parts.push(i === 0 ? chunk("IDAT", data) : chunk("fdAT", concat([u32(seq++), data])));
		if (!animated) break;
	}
	parts.push(chunk("IEND", new Uint8Array()));
	return concat(parts);
}
/** A PNG of one RGBA frame, scaled up by whole pixels. */
function encodePng(rgba, width$1, height, scale$1 = 1) {
	return png({
		width: width$1,
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
function wrapText(text, width$1) {
	const parts = text.split(" · ");
	if (parts.length > 1 && parts.every((p) => textWidth(p) <= width$1)) {
		const out = [];
		for (const p of parts) {
			const next = out.length ? out[out.length - 1] + " · " + p : p;
			if (out.length && textWidth(next) <= width$1) out[out.length - 1] = next;
			else out.push(p);
		}
		return out;
	}
	const lines = [];
	let line = "";
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const next = line ? line + " " + word : word;
		if (textWidth(next) <= width$1) {
			line = next;
			continue;
		}
		if (line) lines.push(line);
		line = "";
		let rest = word;
		while (textWidth(rest) > width$1) {
			let k = rest.length - 1;
			while (k > 1 && textWidth(rest.slice(0, k)) > width$1) k--;
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
/** A Grail's gold, its light and its deep. */
const GOLD_HI = [
	255,
	222,
	110
], GOLD_LO = [
	204,
	124,
	22
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
	const glint$1 = Float64Array.from({ length: W * H }, (_, i) => hash$1(i % W, Math.floor(i / W), 11));
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
		glint: glint$1,
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
* hop leaves the floor. A frame item's backdrop is a panel behind them and
* doesn't count: its edges may go under the window's rim.
*/
function cardFit(frames$1, width$1, cellX) {
	let left = Infinity, right = -Infinity, top = FRAME_HEIGHT, foot = 0, topAll = FRAME_HEIGHT, footAll = 0;
	for (const f of frames$1) f.colors.forEach((row, y) => row.forEach((c, x) => {
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
	const mid = width$1 <= FRAME_WIDTH || right < left ? FRAME_WIDTH * ZOOM / 2 : (left + right) / 2;
	const rest = frames$1[0]?.colors.findIndex((row, y) => row.some((c, x) => c && frames$1[0].slots[y][x] !== 5 && frames$1[0].slots[y][x] !== 3)) ?? top;
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
function cardArt(input, anim, owned, g, ed) {
	const zoom = ZOOM, nudge = buddyNudge(anim);
	const cellX = (gx, slot) => gx * zoom - (gx >= FRAME_WIDTH && slot !== 5 ? nudge : 0);
	const fit$1 = cardFit(anim.frames, anim.width, cellX), shape$1 = cardShape();
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
			const base$1 = mix(GOLD_HI, GOLD_LO, yy / H * .85 + .1 * Math.sin(x * .05 + yy * .02));
			return yy % 3 === 0 ? mix(base$1, GOLD_LO, .12) : base$1;
		}
		if (neg) return mix(mix(IVORY$1, tone, .35), mix(IVORY$1, tone, .6), yy / H);
		return mix(mix(tone, WHITE$1, .08), mix(tone, INK$1, .25), yy / H);
	};
	const rows = Array.from({ length: H }, (_, yy) => gold ? null : stock(0, yy));
	const auraDeep = mix(ah, INK$1, .62), auraLight = mix(ah, INK$1, .3), inlay = aura ? mix(ah, WHITE$1, .7) : mix(GOLD_LO, INK$1, .25);
	for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
		const d = shape$1.depth[yy * W + x], bevel = shape$1.bevel[yy * W + x];
		if (!d) continue;
		if (d <= 2) {
			s.set(x, yy, INK$1);
			continue;
		}
		let c = rows[yy] ?? stock(x, yy);
		if (bevel === 1) c = mix(c, WHITE$1, .35);
		else if (bevel) c = mix(c, INK$1, .3);
		else if ((aura || gold) && d <= 5) c = inlay;
		if (aura && d > 6) {
			const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
			s.set(x, yy, mix(auraDeep, auraLight, Math.max(0, 1 - r) ** 1.2), 2);
			continue;
		}
		s.set(x, yy, c, 1);
	}
	const light$2 = g >= 0 ? mix(IVORY$1, gc, .22) : mix(IVORY$1, gc, .12);
	if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$2 = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
		if (rim$2) {
			s.set(x, yy, INK$1);
			continue;
		}
		const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 62, (yy - wcy) / 70);
		let c = gold ? mix([
			108,
			60,
			10
		], [
			242,
			174,
			62
		], Math.max(0, 1 - r) ** 1.2) : mix(light$2, mix(light$2, gc, .35), depth * .6);
		if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK$1, .35);
		s.set(x, yy, c, 2);
	}
	for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
		const pw = W - side * 2, ph = plateBottom - plateTop + 1;
		if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
		const edge = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
		const base$1 = gold ? [
			92,
			52,
			8
		] : aura ? mix(mix(ah, INK$1, .6), INK$1, .45) : PLATE$1;
		s.set(x, yy, edge ? INK$1 : yy === plateTop + 1 ? mix(base$1, WHITE$1, .16) : yy >= plateBottom - 2 ? mix(base$1, INK$1, .45) : base$1);
	}
	const quiet = gold ? [
		236,
		196,
		120
	] : aura ? mix(ah, WHITE$1, .6) : [
		184,
		176,
		206
	];
	const titleInk = (x, yy, tm) => gold ? mix([
		255,
		210,
		90
	], [
		255,
		248,
		214
	], .5 + .5 * Math.sin(x * .15 - tm / wave(1e3 / 3) + yy * .1)) : mix(mix(ah, WHITE$1, .5), WHITE$1, .5 + .5 * Math.sin(x * .12 - tm / wave(1e3 / 2) + yy * .1));
	const titlePixels = [];
	titles.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), titleTop + k * 12 - 2, (x, yy) => {
		if (!(gold || aura)) return WHITE$1;
		titlePixels.push(x, yy);
		return titleInk(x, yy, 0);
	}, INK$1));
	rest.forEach((l, k) => s.text(l, Math.floor((W - textWidth(l)) / 2), subTop + k * 11 - 2, () => quiet));
	if (pill) {
		const w = pillW, x0 = paired ? Math.floor((W - w - 6 - textWidth(subs[0])) / 2) : Math.floor((W - w) / 2);
		const fill = gold ? [
			236,
			164,
			32
		] : tone;
		for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
			const edge = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
			s.set(x, yy, edge ? INK$1 : yy >= pillTop + 12 ? mix(fill, INK$1, .45) : yy === pillTop + 1 ? mix(fill, WHITE$1, .4) : fill);
		}
		s.text(pill, x0 + 7, pillTop - 1, () => WHITE$1, mix(fill, INK$1, .6));
		if (paired) s.text(subs[0], x0 + w + 6, pillTop - 1, () => quiet);
	}
	foots.forEach((l, k) => s.text(l, side + 5, footTop + k * 11 - 2, () => quiet));
	if (markHex) {
		const m = rgb$2(markHex), x0 = W - side - 14, y0 = footTop;
		for (let yy = 0; yy < 9; yy++) for (let x = 0; x < 9; x++) {
			const rim$2 = x === 0 || yy === 0 || x === 8 || yy === 8;
			s.set(x0 + x, y0 + yy, rim$2 ? INK$1 : x === 1 || yy === 1 ? mix(m, WHITE$1, .45) : x === 7 || yy === 7 ? mix(m, [
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
	const edIdx = [];
	for (let i = 0; i < W * H; i++) if (s.region[i]) edIdx.push(i);
	const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
	edIdx.forEach((i, k) => {
		const x = i % W, yy = (i - x) / W;
		ex[k] = x / 5;
		ey[k] = yy / 5;
		er[k] = s.region[i];
		eh[k] = shape$1.glint[(yy >> 1) * W + (x >> 1)];
		for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
	});
	const field = editionField(ed, v, [wcx / 5, wcy / 5], .2, {
		x: ex,
		y: ey,
		region: er,
		h: eh,
		rgb: ergb
	});
	const edOut = new Float32Array(n * 3), edAt = Int32Array.from(edIdx);
	const soul = aura;
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit$1.mid);
	const oy0 = soul ? Math.max(5 - fit$1.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - (fit$1.topAll + fit$1.footAll + 1) * zoom / 2) - 10) : Math.round((WIN.top + WIN.bottom + 1) / 2 - (fit$1.rest + fit$1.foot + 1) * zoom / 2) + 4;
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
			const own$1 = (gx, gy) => !!colors[gy][gx] && slots[gy][gx] !== 5 && slots[gy][gx] === 4 === buddy;
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
		const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
		const bx = ox - 2, by = oy - 2, bw = fw * zoom + 4, bh = fh * zoom + 4, out = [];
		mask.fill(0, 0, bw * bh);
		for (let gy = 0; gy < fh; gy++) {
			const row = colors[gy], srow = slots[gy];
			for (let gx = 0; gx < fw; gx++) if (row[gx] && srow[gx] !== 5) for (let dy = 0; dy < zoom; dy++) mask.fill(1, (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]), (2 + gy * zoom + dy) * bw + 2 + cellX(gx, srow[gx]) + zoom);
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
	const drawGuy = (frame, oy, body$1, shineTime) => {
		const { colors, slots } = frame, fh = colors.length, fw = colors[0]?.length ?? 0;
		const put = (i, r, g$1, b$1) => {
			body$1[i * 4] = r;
			body$1[i * 4 + 1] = g$1;
			body$1[i * 4 + 2] = b$1;
		};
		const fl = aura ? [] : floorsOf(frame, oy);
		for (let f = 0; f < fl.length; f += 3) {
			const sx = fl[f], sy = fl[f + 1], rx = fl[f + 2];
			for (let yy = Math.ceil(sy - 4); yy <= sy + 4; yy++) for (let x = Math.ceil(sx - rx); x <= sx + rx; x++) {
				if (x < 0 || yy < 0 || x >= W || yy >= H || s.region[yy * W + x] !== 2) continue;
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
		for (const behind of [true, false]) for (let gy = 0; gy < fh; gy++) for (let gx = 0; gx < fw; gx++) {
			const hex$3 = colors[gy][gx];
			if (!hex$3 || slots[gy][gx] === 3 !== behind) continue;
			const slot = slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0, x0 = ox + cellX(gx, slot);
			const f = copy ? SHADER_FINISHES.indexOf(copy.finish) : -1, c = rgb$2(hex$3);
			if (copy && f >= 0) litDone.fill(0);
			for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
				const cx = x0 + dx, cy = oy + gy * zoom + dy;
				if (cx < 0 || cy < 0 || cx >= W || cy >= H || !room[cy * W + cx]) continue;
				if (!copy || f < 0) {
					put(cy * W + cx, c[0], c[1], c[2]);
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
		for (const [gx, gy, hex$3] of frame.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
			const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy, c = rgb$2(hex$3);
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
			out.set(shape$1.shadow);
			for (let yy = 0; yy < H; yy++) {
				const [a, b$1] = shape$1.runs[yy];
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
	const card = cardPlayer(input, ms), frames$1 = [];
	for (let i = 0; i < card.count; i++) frames$1.push(card.frame(i));
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		frames: frames$1,
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
function cardPlayer(input, ms = 80, { keep = true } = {}) {
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
	const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input), art = cardArt(input, anim, owned, g, cardEdition(input, g));
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
function cardStill(input, t = .6) {
	const anim = animateLoop(input.seed, input.move ?? "idle", {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	});
	const g = cardGrade(input);
	return cardArt(input, anim, ownedBySlot(input.copies ?? []), g, cardEdition(input, g)).draw(frameAt(anim, 0), t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
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
	const W = anim.width, frames$1 = anim.frames.map((f) => {
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
		frames: frames$1,
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
	const colors = paint(grid, config, withItems(paletteOf(config), config));
	const owned = config.owned ?? {};
	const g = spec.grade ?? (copies.length ? Math.max(...copies.map(gradeIndex)) : -1);
	const last = copies[copies.length - 1], lastItem = last ? itemById(last.item) : void 0;
	const set$10 = spec.set ?? (lastItem && lastItem.game !== "club" ? lastItem.game : void 0);
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
	const base$1 = new Uint8Array(W * H * 4), kind = new Uint8Array(W * H * 4), noise$3 = new Uint8Array(W * H * 4);
	const put = (x, y, c, k, fi = -1, sc = 0, pr = 0) => {
		const i = (y * W + x) * 4, print = Math.floor(pr / 4);
		base$1.set([
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
		noise$3[i] = noiseOf(x, y, print * 4);
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
	const light$2 = gold ? [
		112,
		62,
		10
	] : blend(IVORY, gc, g >= 0 ? .22 : spec.tint ? .3 : .12);
	const glow = gold ? [
		232,
		160,
		48
	] : blend(light$2, gc, .2);
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
		else put(x, y, blend(light$2, glow, Math.max(0, 1 - d) ** 1.4), WINDOW);
	}
	grid.forEach((row, y) => row.forEach((t, x) => {
		const hex$3 = colors[y][x];
		if (!hex$3) return;
		const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
		const o = slot ? owned[slot] : void 0;
		const fi = o ? SHADER_FINISHES.indexOf(o.finish) : -1;
		if (x + gx0 > 1 && x + gx0 < W - 2) put(x + gx0, y + 11, rgb$1(hex$3), o ? ITEM : GUY, fi, o ? o.scuff : 0, o ? o.print : 0);
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
	const mark$1 = set$10 ? SET_COLORS[set$10] : void 0;
	if (mark$1) for (let y = 36; y <= 38; y++) for (let x = 20; x <= 22; x++) put(x, y, x === 20 && y === 36 ? blend(rgb$1(mark$1), WHITE, .5) : x === 22 || y === 38 ? blend(rgb$1(mark$1), [
		0,
		0,
		0
	], .35) : rgb$1(mark$1), FIXED);
	return {
		base: base$1,
		kind,
		noise: noise$3,
		grade: g,
		negative: copies.some((o) => o.finish === "negative"),
		seed: last ? last.print : 0,
		holo,
		variant: last ? last.print % 4 : 0,
		edition,
		origin
	};
}
/** Whether a face changes over time at all: a plain card with no finishes is one picture. */
const faceMoves = (f) => f.edition > 0 || f.kind.some((v, i) => i % 4 === 1 && v > 0);
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
	const n = cells.length, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb$7 = new Float32Array(n * 3);
	cells.forEach((i, k) => {
		x[k] = i % W;
		y[k] = Math.floor(i / W);
		region[k] = Math.floor(f.kind[i * 4] / 32 + .5);
		h[k] = f.noise[i * 4] / 255;
		for (let j = 0; j < 3; j++) rgb$7[k * 3 + j] = f.base[i * 4 + j] / 255;
	});
	got = {
		at,
		field: editionField(f.edition, f.variant, f.origin, 1, {
			x,
			y,
			region,
			h,
			rgb: rgb$7
		}),
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
			if (k === ITEM && finish >= 0) c = finishColor(c, finish, f.kind[i + 2] / 255, f.noise[i] / 255, x + y, y, f.kind[i + 3] * 4, time, 1);
		}
		if (hover && hover.strength > 0) {
			const light$2 = (1 - smoothstep(0, .34, distance([(x + .5) / W, (y + .5) / H], [hover.x, hover.y]))) * .35 * hover.strength;
			c = [
				c[0] + light$2,
				c[1] + light$2,
				c[2] + light$2
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
uniform float time, hover, edition, variant;
uniform vec2 light, origin;
${GLSL_COMMON}
${GLSL_EDITIONS}
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
  if (k > 3.5 && k < 4.5 && finish >= 0.0) c = finishColor(c, finish, kd.b, h, cell.x + cell.y, cell.y, print, time, 1.0);
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
		"origin"
	].map((n) => [n, gl.getUniformLocation(program, n)]));
	gl.uniform1i(u.base, 0);
	gl.uniform1i(u.kind, 1);
	gl.uniform1i(u.noise, 2);
	gl.viewport(0, 0, FACE_WIDTH, FACE_HEIGHT);
	const textures = [
		0,
		1,
		2
	].map((unit$1) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit$1);
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
			].forEach((bytes, unit$1) => {
				gl.activeTexture(gl.TEXTURE0 + unit$1);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit$1]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FACE_WIDTH, FACE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
			});
			gl.uniform1f(u.time, loopSeconds(ms));
			gl.uniform1f(u.edition, face.edition);
			gl.uniform1f(u.variant, face.variant);
			gl.uniform2f(u.origin, face.origin[0], face.origin[1]);
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
const ART_VERSION = 8;
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
		visible(on$1) {
			this.onScreen = on$1;
			if (!this.player) {
				if (on$1) this.render();
				return;
			}
			if (on$1) play(this.player);
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
			const style = (width$1, height) => `width:${width$1 * size}px;height:${height * size}px;${pixels}`;
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
			const frames$1 = baked.get(key);
			if (!frames$1) {
				this.replaceChildren();
				return;
			}
			const canvas = document.createElement("canvas");
			canvas.width = frames$1.width;
			canvas.height = frames$1.height;
			canvas.style.cssText = style(frames$1.width, frames$1.height);
			this.canvas = canvas;
			this.replaceChildren(canvas);
			this.player = {
				el: this,
				frames: frames$1,
				images: [],
				start: performance.now(),
				shown: -1,
				total: frames$1.delays.reduce((a, b$1) => a + b$1, 0)
			};
			this.paint(0);
			this.player.shown = 0;
			if (frames$1.frames.length > 1) play(this.player);
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
const leftOf = (width$1, W) => AURA_PAD + Math.floor((W - AURA_PAD * 2 - width$1) / 2);
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
function merged(width$1, height, frames$1, delays) {
	const out = {
		width: width$1,
		height,
		frames: [],
		delays: []
	};
	frames$1.forEach((f, i) => {
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
	const shining = plain.frames.some((f) => shines(f, owned));
	if (!plain.timed && !shining) return {
		frames: merged(W, GUY_HEIGHT, plain.frames.map((f) => place(f, W, left)), plain.frames.map((f) => f.ms)),
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
		frames: merged(W, GUY_HEIGHT, anim.frames.map((f) => place(f, W, left, shining ? shineFrame(f, owned, f.at ?? 0) : void 0)), anim.frames.map((f) => f.ms)),
		left
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
	const backdrop$1 = spec.equip?.find((code) => itemById(decode(code)?.item)?.slot === "frame");
	const baked = bakeAt(backdrop$1 ? {
		...spec,
		equip: spec.equip.filter((code) => code !== backdrop$1)
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
	const ground = backdrop$1 ? backdropGround(spec, side, ox + baked.left, oy) : null, solid = groundOf(g.frames[0], W, H);
	const frames$1 = g.frames.map((px) => {
		const out = ground ? new Uint8ClampedArray(ground) : new Uint8ClampedArray(side * side * 4);
		if (!ground) for (let i = 0; i < side * side; i++) out.set(solid, i * 4);
		for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit(px, x, y)) out.set(px.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), ((y + oy) * side + x + ox) * 4);
		return out;
	});
	return {
		width: side,
		height: side,
		frames: frames$1,
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
	const frames$1 = [], delays = [];
	for (let t = 0; t < LOOP_MS; t += STEP_MS) {
		frames$1.push(cardFaceAt(face, t));
		delays.push(STEP_MS);
	}
	return merged(FACE_WIDTH, FACE_HEIGHT, frames$1, delays);
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
async function bakedImage(frames$1, kind, scale$1 = 1) {
	if (kind === "still") return encodePng(frames$1.frames[0], frames$1.width, frames$1.height, scale$1);
	if (kind === "sheet") {
		const s = sheetOf(frames$1);
		return encodePng(s.rgba, s.width, s.height, scale$1);
	}
	return encodeApng(frames$1, scale$1);
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
exports.ARM_NAMES = ARM_NAMES
exports.ART_VERSION = ART_VERSION
exports.AURAS = AURAS
exports.AURA_ODDS = AURA_ODDS
exports.BAKED_SIZE = BAKED_SIZE
exports.BUDDY_GUY_WIDTH = BUDDY_GUY_WIDTH
exports.CAPSULE_ONLY = CAPSULE_ONLY
exports.CARD_FRAGMENT = CARD_FRAGMENT
exports.CARD_HEIGHT = CARD_HEIGHT
exports.CARD_WIDTH = CARD_WIDTH
exports.CRAFT_COST = CRAFT_COST
exports.DEAL_PREFIX = DEAL_PREFIX
exports.DEEP_BLUE_PRINTS = DEEP_BLUE_PRINTS
exports.DEFAULT_COLORS = DEFAULT_COLORS
exports.DEFAULT_COLORS_DARK = DEFAULT_COLORS_DARK
exports.DEFAULT_COLORS_LIGHT = DEFAULT_COLORS_LIGHT
exports.EFFECTS = EFFECTS
exports.EMOTE_UNLOCKS = EMOTE_UNLOCKS
exports.FACE_HEIGHT = FACE_HEIGHT
exports.FACE_WIDTH = FACE_WIDTH
exports.FINISHES = FINISHES
exports.FOOT_NAMES = FOOT_NAMES
exports.FOOT_STYLES = FOOT_STYLES
exports.FRAME_HEIGHT = FRAME_HEIGHT
exports.FRAME_SLOTS = FRAME_SLOTS
exports.FRAME_WIDTH = FRAME_WIDTH
exports.FX_IDS = FX_IDS
exports.GAMES = GAMES
exports.GLSL_COMMON = GLSL_COMMON
exports.GOLD_RIM_DAYS = GOLD_RIM_DAYS
exports.GRADES = GRADES
exports.GRID_SIZE = GRID_SIZE
exports.GUY_HEIGHT = GUY_HEIGHT
exports.GUY_TIERS = GUY_TIERS
exports.GUY_WIDTH = GUY_WIDTH
exports.HEADROOM = HEADROOM
exports.LOOP_MS = LOOP_MS
exports.LUCKY_ODDS = LUCKY_ODDS
exports.MAX_PINS = MAX_PINS
exports.MOVES = MOVES
exports.NAME_KEY = NAME_KEY
exports.ONE_OF_ONE_AURAS = ONE_OF_ONE_AURAS
exports.PAINTABLE = PAINTABLE
exports.PAINTS = PAINTS
exports.PAINT_COST = PAINT_COST
exports.PAINT_IDS = PAINT_IDS
exports.PART_ODDS = PART_ODDS
exports.PART_SLOTS = PART_SLOTS
exports.PINS = PINS
exports.PROFILE_SIZE = PROFILE_SIZE
exports.RECLAIMED = RECLAIMED
exports.REFINED = REFINED
exports.RETIRED_EYES = RETIRED_EYES
exports.SCRAP = SCRAP
exports.SHADER_FINISHES = SHADER_FINISHES
exports.SHADE_COUNT = SHADE_COUNT
exports.SHINE_FRAGMENT = SHINE_FRAGMENT
exports.SHOWPIECE_WEIGHT = SHOWPIECE_WEIGHT
exports.SMALL_SIZE = SMALL_SIZE
exports.TAG_MAX = TAG_MAX
exports.TIER_ICONS = TIER_ICONS
exports.TONE_NAMES = TONE_NAMES
exports.TRAIT_ICONS = TRAIT_ICONS
exports.TRAIT_SLOTS = TRAIT_SLOTS
exports.WEAR = WEAR
exports.WIDE_FRAME_WIDTH = WIDE_FRAME_WIDTH
exports.accessories = accessories
exports.allowed = allowed
exports.animate = animate
exports.animateLoop = animateLoop
exports.animateOptions = animateOptions
exports.applyFx = applyFx
exports.auraById = auraById
exports.auraCells = auraCells
exports.auraColor = auraColor
exports.bakeCard = bakeCard
exports.bakeGuy = bakeGuy
exports.bakeView = bakeView
exports.bakedImage = bakedImage
exports.bodies = bodies
exports.buddyAlone = buddyAlone
exports.cardFace = cardFace
exports.cardFaceAt = cardFaceAt
exports.cardFrames = cardFrames
exports.cardPlayer = cardPlayer
exports.cardStill = cardStill
exports.cheeks = cheeks
exports.cleanTag = cleanTag
exports.closeEyes = closeEyes
exports.collectorNotes = collectorNotes
exports.compose = compose
exports.composeBase = composeBase
exports.copyOneIn = copyOneIn
exports.craftCopy = craftCopy
exports.craftable = craftable
exports.createCardShader = createCardShader
exports.createShine = createShine
exports.dealOf = dealOf
exports.decode = decode
exports.decodeLook = decodeLook
exports.defineLilGuy = defineLilGuyHere
exports.drawFrame = drawFrame
exports.dress = dress
exports.encode = encode
exports.encodeApng = encodeApng
exports.encodeGif = encodeGif
exports.encodeLook = encodeLook
exports.encodePng = encodePng
exports.eyes = eyes
exports.faceMoves = faceMoves
exports.faceSpec = faceSpec
exports.finishColor = finishColor
exports.floatShare = floatShare
exports.frameAt = frameAt
exports.freeItem = freeItem
exports.fxColor = fxColor
exports.gameItems = gameItems
exports.getColor = getColor
exports.getPalette = getPalette
exports.gradeOf = gradeOf
exports.guyCode = guyCode
exports.guyOneIn = guyOneIn
exports.guyRank = guyRank
exports.guyScore = guyScore
exports.hair = hair
exports.hash = hash
exports.hashNth = hashNth
exports.heads = heads
exports.inSeason = inSeason
exports.isMove = isMove
exports.itemById = itemById
exports.itemFrame = itemFrame
exports.itemWeight = itemWeight
exports.items = items
exports.lookOf = lookOf
exports.luckyPalette = luckyPalette
exports.machineName = machineName
exports.machineSet = machineSet
exports.makeSeed = makeSeed
exports.metalCoins = metalCoins
exports.metalText = metalText
exports.mouths = mouths
exports.mysteryMachine = mysteryMachine
exports.nameKey = nameKey
exports.nameOf = nameOf
exports.nameSkeleton = nameSkeleton
exports.nebulaPhase = nebulaPhase
exports.noiseOf = noiseOf
exports.ownedOf = ownedOf
exports.paint = paint
exports.painted = painted
exports.paletteOf = paletteOf
exports.palettes = palettes
exports.partCode = partCode
exports.partCost = partCost
exports.partName = partName
exports.pickable = pickable
exports.pinById = pinById
exports.profileFrames = profileFrames
exports.rareParts = rareParts
exports.readGuyCode = readGuyCode
exports.readPart = readPart
exports.resolve = resolve
exports.resolveColor = resolveColor
exports.roll = roll
exports.rollFx = rollFx
exports.rollPart = rollPart
exports.rollSeason = rollSeason
exports.setProgress = setProgress
exports.shadePalette = shadePalette
exports.sheetOf = sheetOf
exports.shineData = shineData
exports.shineFit = shineFit
exports.shineFrame = shineFrame
exports.shines = shines
exports.shows = shows
exports.slotOf = slotOf
exports.smeltValue = smeltValue
exports.special = special
exports.squashRows = squashRows
exports.starter = starter
exports.surfaceOf = surfaceOf
exports.tallyMarks = tallyMarks
exports.temperTint = temperTint
exports.textWidth = textWidth
exports.toAnimatedSvg = toAnimatedSvg
exports.toCardGif = toCardGif
exports.toCardPng = toCardPng
exports.toGuyGif = toGuyGif
exports.toPng = toPng
exports.toProfileGif = toProfileGif
exports.toProfilePng = toProfilePng
exports.toShareSvg = toShareSvg
exports.toSvgString = toSvgString
exports.tradeFloat = tradeFloat
exports.tradeGames = tradeGames
exports.traitOdds = traitOdds
exports.unlocksOf = unlocksOf
exports.upscale = upscale
exports.voxelColumns = voxelColumns
exports.voxelItem = voxelItem
exports.voxelMesh = voxelMesh
exports.wearOf = wearOf
exports.withItems = withItems
return exports;
})({});