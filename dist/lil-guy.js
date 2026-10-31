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
	2,
	0,
	0
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
	2,
	0
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
* from any deal stays exactly as dealt, and the weight here is its share
* among a slot's rare parts when a capsule picks one, as a dealt part's
* weight is. The starry, kitty, joy and puppy set, October 2026; then the
* night set, the rarest to unlock: eclipse and void eyes, the idea and
* thought toppers, op art markings.
*/
const CAPSULE_ONLY = {
	eyes: {
		23: 6,
		24: 6,
		25: 8,
		26: 8,
		27: 3,
		28: 3
	},
	mouth: {
		22: 8,
		23: 8,
		24: 6
	},
	cheeks: { 19: 8 },
	hair: {
		37: 4,
		38: 4
	},
	body: { 19: 3 }
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
		"...##########...",
		"..s.s......s.s..",
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
		"..###......###..",
		".#h###....###h#.",
		".######..######.",
		".######ss######.",
		"..#####ss#####..",
		"...##########...",
		"...##########...",
		"..#####ss#####..",
		".######ss######.",
		".#h####ss####h#.",
		".######..######.",
		"..###......###..",
		".......##.......",
		"........#.......",
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
		".rr....rr.",
		"rwwr..rwwr",
		".rY....Yr."
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
	eyes_("big eyes", [
		".ee....ee.",
		"eew....wee",
		".aA....Aa."
	]),
	eyes_("galaxy", [
		".aaA..aaA.",
		"aewA..aewA",
		"AAA....AAA"
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
	eyes_("starry", [
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
	]),
	eyes_("eclipse", [
		".yw....yw.",
		"yeey..yeey",
		".yy....yy."
	]),
	eyes_("void", [
		".ee....ee.",
		"eeee..ewee",
		".ee....ee."
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
	cheeks_("big blush", [".rc.....rc", "rc.....rc."])
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
const GRID$1 = 16;
/**
* The thought topper's cloud: two white puffs over a shaded foot, so it holds
* apart from a white body. Two rows, so on a round head it floats clear of the
* crown with only its outline between.
*/
const THOUGHT = stamp([".ww.ww", "wxxxxx"]);
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
function capRows(c, n, fill, shade$1) {
	for (let y = Math.min(c.tip, c.crown); y < Math.min(c.crown + n, c.floor + 1); y++) {
		c.paintRow(y, fill);
		const r = c.rows[y];
		if (r) c.set(r.right, y, shade$1);
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
		"....r.....",
		"...rYr..r.",
		".r.rYr.rYr",
		".rYrYyrrYr",
		"rYyYyyyYyr",
		"rYyywwyyYr"
	], [
		"...r....",
		"..rYr.r.",
		".rrYyrYr",
		"rYyyYyYr",
		"rYywwyYr"
	]], 2),
	centre("idea", [
		"a..yyy..a",
		"..yywyy..",
		"a.ywyyY.a",
		"...yyY...",
		"...xGx..."
	], 0, 1),
	{
		name: "thought",
		draw: (c) => {
			const w = width(THOUGHT), near = [
				[0, 0],
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			];
			const cells = (x0$1, y0$1) => THOUGHT.flatMap((row, dy) => row.flatMap((t, dx) => t ? [[
				x0$1 + dx,
				y0$1 + dy,
				t
			]] : []));
			const touches$1 = (x$1, y$1) => near.some(([dx, dy]) => c.isBody(x$1 + dx, y$1 + dy));
			const spots = [];
			for (let y0$1 = 1; y0$1 <= 2; y0$1++) for (let x0$1 = GRID$1 - 1 - w; x0$1 >= 7; x0$1--) spots.push([x0$1, y0$1]);
			const covered = ([x0$1, y0$1]) => cells(x0$1, y0$1).filter(([x$1, y$1]) => c.isBody(x$1, y$1)).length;
			const [x0, y0] = spots.find(([a, b$1]) => cells(a, b$1).every(([x$1, y$1]) => !touches$1(x$1, y$1))) ?? spots.filter(([, y$1]) => y$1 === 1).reduce((a, b$1) => covered(b$1) < covered(a) ? b$1 : a);
			const taken = new Set();
			for (const [x$1, y$1, t] of cells(x0, y0)) {
				c.set(x$1, y$1, t);
				taken.add(y$1 * GRID$1 + x$1);
			}
			const clear = (x$1, y$1) => !c.isBody(x$1, y$1) && near.every(([dx, dy]) => !taken.has((y$1 + dy) * GRID$1 + x$1 + dx));
			let x = x0, y = y0 + THOUGHT.length - 1;
			for (const [dx, dy] of [[-2, 0], [-1, 1]]) {
				x += dx;
				y += dy;
				if (x < 1 || y > GRID$1 - 2 || !clear(x, y)) break;
				c.set(x, y, T.WHITE);
				taken.add(y * GRID$1 + x);
			}
		}
	}
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
			const seam = (pts) => pts.forEach(([x, y]) => {
				if (!c.isBody(x, y)) return;
				c.set(x, y, T.GOLD);
				if (c.isBody(x, y + 1) && c.get(x, y + 1) !== T.GOLD) c.set(x, y + 1, T.LEAF_SHADE);
			});
			const ry = c.eyeLine + 1, r = c.rows[ry], ly = c.bottom - 2, l = c.rows[ly];
			if (r) seam([
				[r.right, ry],
				[r.right - 1, ry],
				[r.right - 2, ry + 1],
				[r.right - 3, ry + 1],
				[r.right - 3, ry + 2]
			]);
			if (l) seam([
				[l.left, ly],
				[l.left + 1, ly],
				[l.left + 2, ly + 1],
				[l.left + 3, ly + 1],
				[l.left + 4, ly],
				[l.left + 5, ly]
			]);
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
	},
	{
		name: "op art",
		draw: (c) => {
			const cx = c.centre - .5;
			for (let y = c.eyeLine + 2; y <= c.bottom; y++) for (let x = 0; x < 16; x++) onBody(c, x, y, (y + Math.floor(Math.abs(x - cx) / 2)) % 2 ? T.TRIM : T.LEAF_SHADE);
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
function fittedGlasses(c, frame$1, glass, glint$1) {
	const f = c.face;
	if (!f || !f.eyes.length) return;
	const boxes$1 = f.eyes.map((_, k) => lensBox(c, k));
	boxes$1.forEach((b$1) => {
		rim$1(c, b$1, frame$1, glass);
		c.set(b$1.left + 1, b$1.top + 1, glint$1);
	});
	if (boxes$1.length === 2) for (let x = boxes$1[0].right + 1; x < boxes$1[1].left; x++) c.set(x, f.top, frame$1);
	const r = c.rows[f.top];
	if (r) {
		for (let x = r.left; x < boxes$1[0].left; x++) c.set(x, f.top, frame$1);
		for (let x = boxes$1[boxes$1.length - 1].right + 1; x <= r.right; x++) c.set(x, f.top, frame$1);
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
				if (edgeX || edgeY) c.set(x, y, T.GOLD);
				else if (c.get(x, y) === T.BODY) c.set(x, y, T.LIGHT);
			}
			c.set(b$1.left + 1, b$1.top, T.WHITE);
			for (let i = 0, x = b$1.right, y = b$1.bottom + 1; i < 5 && y <= c.bottom && c.isBody(x, y); i++, y++) {
				if (i % 2 === 0) c.set(x, y, T.GOLD);
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
			const frame$1 = stamp([
				"rr.rr",
				"rwoor",
				".ror."
			]);
			const top = f.line - 2;
			const xs = [f.eyes[0].left - 2, f.eyes[1].right - 2];
			for (const x of xs) frame$1.forEach((row, dy) => row.forEach((t, dx) => {
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
			const L = f.eyes[0].left - 2, R$1 = f.eyes[f.eyes.length - 1].right + 2, mid = Math.floor(c.centre);
			for (let y = f.top - 1; y <= f.line; y++) for (let x = L; x <= R$1; x++) {
				if (y === f.line && (x === L || x === R$1 || x === mid - 1 || x === mid)) continue;
				if (c.isBody(x, y)) c.set(x, y, y === f.top - 1 ? T.TRIM : y === f.top && x === L + 1 ? T.LEAF : T.LEAF_SHADE);
			}
			for (const [x, out] of [[L, -1], [R$1, 1]]) {
				c.set(x, f.top - 1, T.TRIM);
				c.set(x, f.top - 2, T.GOLD);
				c.set(x + out, f.top - 1, T.GOLD);
				c.set(x + out, f.top - 2, T.GOLD);
				c.set(x + out, f.top - 3, T.GOLD);
			}
			if (f.eyes.length === 2) {
				c.set(mid - 1, f.top - 1, T.RED);
				c.set(mid, f.top - 1, T.RED);
			}
			c.set(R$1 + 1, f.top - 4, T.ACCENT);
			c.set(R$1 + 1, f.top - 5, T.ACCENT);
			c.set(R$1, f.top - 6, T.ACCENT);
		}
	}
];

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
/** The night colourways: deep bodies that a pastel tone softens but keeps deep. */
const NIGHT_COLOURWAYS = new Set([
	"Charcoal",
	"Cobalt",
	"Midnight",
	"Oxblood",
	"Forest",
	"Grape Soda"
]);
function hexToRgb(hex$4) {
	return [
		1,
		3,
		5
	].map((i) => parseInt(hex$4.slice(i, i + 2), 16));
}
function rgbToHex(r, g, b$1) {
	return "#" + [
		r,
		g,
		b$1
	].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl$1(hex$4) {
	const [r, g, b$1] = hexToRgb(hex$4).map((v) => v / 255);
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
function mix$6(a, b$1, amount) {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b$1);
	return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}
/** Moves a hue `amount` degrees towards `target` along the short way round. */
function towards(hue$2, target, amount) {
	const diff = (target - hue$2 + 540) % 360 - 180;
	return hue$2 + Math.sign(diff) * Math.min(Math.abs(diff), amount);
}
function luminance$1(hex$4) {
	const channel = (v) => {
		v /= 255;
		return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	};
	const [r, g, b$1] = hexToRgb(hex$4);
	return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b$1);
}
function contrast$2(a, b$1) {
	const [hi, lo] = [luminance$1(a), luminance$1(b$1)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
function toLab(hex$4) {
	const lin = hexToRgb(hex$4).map((v) => {
		v /= 255;
		return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	});
	const [x, y, z] = [
		(.4124 * lin[0] + .3576 * lin[1] + .1805 * lin[2]) / .95047,
		.2126 * lin[0] + .7152 * lin[1] + .0722 * lin[2],
		(.0193 * lin[0] + .1192 * lin[1] + .9505 * lin[2]) / 1.08883
	].map((v) => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
	return [
		116 * y - 16,
		500 * (x - y),
		200 * (y - z)
	];
}
/**
* How far apart two colours look (CIE76 in Lab): under about 20 a part in one
* melts into a body in the other, however different their brightness.
*/
function deltaE(a, b$1) {
	const p = toLab(a), q = toLab(b$1);
	return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
/**
* Shade a colour by hand: darker and leaning towards violet, but never richer.
* Adding saturation in the shadow is what turned a green body's shade neon.
*/
function shadeOf(hex$4, depth = .12) {
	const [h, s, l] = toHsl$1(hex$4);
	return fromHsl([
		towards(h, 265, 12),
		s * .85,
		l - depth
	]);
}
/** Builds the full set of token colours from a body, an accent and a trim. */
function derive(name, body, accent, trim) {
	const [h] = toHsl$1(body);
	const outlineHue = towards(h, 285, 25);
	const outline$1 = fromHsl([
		outlineHue,
		.42,
		toHsl$1(body)[2] >= .5 ? .3 : toHsl$1(body)[2] * .25
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
	const ink = contrast$2(dark, body) >= 4.2 || contrast$2(dark, body) > contrast$2("#FFF1D6", body) ? dark : contrast$2(deeper, body) >= 3.9 ? deeper : "#FFF1D6";
	let blush = "#FF8FA8";
	for (let i = 0; i < 8 && contrast$2(blush, body) < 1.3; i++) blush = shadeOf(blush, .06);
	let tongue = "#FF6B88";
	for (let i = 0; i < 8 && contrast$2(tongue, body) < 1.4; i++) tongue = shadeOf(tongue, .06);
	const goldReads = contrast$2("#FFD45C", body) >= 1.45;
	const gold = goldReads ? "#FFD45C" : "#E8901A";
	const goldShade = goldReads ? "#F0A93A" : "#B3620E";
	return {
		name,
		colors: {
			1: body,
			2: shadeOf(body),
			3: mix$6(body, "#FFFFFF", .55),
			4: outline$1,
			5: ink,
			6: "#FFFFFF",
			7: blush,
			8: ink,
			9: tongue,
			10: accent,
			11: shadeOf(accent),
			12: trim,
			13: mix$6(body, "#FFFBF0", .6),
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
*
* A night colourway's pastel lifts its body a little and keeps its
* saturation, so it stays a night colour: mixed towards white, oxblood went
* mauve and forest grey-green.
*/
function shadePalette(palette$1, shade$1) {
	if (shade$1 === 1) return palette$1;
	const night = NIGHT_COLOURWAYS.has(palette$1.name);
	const tone = (hex$4, body = false) => {
		const [h, s, l] = toHsl$1(hex$4);
		if (shade$1 === 0) return night && body ? fromHsl([
			h,
			s,
			l + .1
		]) : mix$6(hex$4, "#FFFFFF", .3);
		return fromHsl([
			h,
			Math.min(.8, s + .04),
			l > .4 ? l - .08 : l
		]);
	};
	const c = palette$1.colors;
	return derive(palette$1.name, tone(c[1], true), tone(c[10]), c[12]);
}
/**
* The Lucky variant: the same colourway turned round the colour wheel, with
* gold trim. Derived again, so the face and outline read as well as ever.
*/
function luckyPalette(palette$1) {
	const turn$1 = (hex$4) => {
		const [h, s, l] = toHsl$1(hex$4);
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
	return derive(`${palette$1.name} Lucky`, turn$1(c[1]), turn$1(c[10]), "#FFE9A8");
}
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
/** The palette a guy is drawn in: their colourway, in their tone, Lucky if they are. */
function paletteOf(config) {
	const toned$1 = shadePalette(getPalette(shownPalette(config)), config.shade);
	return config.lucky ? luckyPalette(toned$1) : toned$1;
}

//#endregion
//#region src/founder.ts
/**
* The founder: the lil guys site keeps the name "isaac" for the person who
* made the DLE Club, and deals him this seed. He isn't dealt from it: he is a
* clean guy in a crown, picked by hand, so `resolve(FOUNDER_SEED)` gives this
* look with `founder: true`, and `guyRank` ranks him the one of one rather
* than by his traits' odds. Anything that draws or ranks a guy from the
* library (the site, the Worker, the club's games) agrees.
*/
const FOUNDER_SEED = "founder:isaac";
const byName = (list, name) => list.findIndex((x) => x.name === name);
/** His parts (laid over his seed's rotation) and colourway. */
const FOUNDER_LOOK = {
	parts: {
		head: byName(heads, "round"),
		eyes: byName(eyes, "glossy"),
		mouth: byName(mouths, "smile"),
		cheeks: byName(cheeks, "blush"),
		hair: byName(hair, "crown"),
		body: 0,
		accessory: 0,
		arms: 2,
		feet: 0,
		shade: 1,
		flip: false,
		lucky: false
	},
	palette: byName(palettes, "Ocean")
};
/** The two copies no capsule gives, both his: the Gold flag and the Origin aura. */
const FOUNDER_COPIES = {
	flag: {
		item: "trackdle.flag",
		finish: "gold",
		scuff: 0,
		print: 1,
		tally: 999,
		pins: [
			"crown",
			"star",
			"flame"
		]
	},
	aura: {
		item: "aura.origin",
		finish: "classic",
		scuff: 0,
		print: 1,
		fx: "shimmer"
	}
};
/** Whether a seed is the founder's. */
const isFounder = (seed) => seed === FOUNDER_SEED;
/** Whether a copy is one of the founder's own, which no capsule gives (in his locker, nobody else's). */
const isFounderCopy = (o) => o.item === FOUNDER_COPIES.aura.item || o.item === FOUNDER_COPIES.flag.item && o.finish === "gold" && o.tally === 999 && o.print === 1;

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
	if (input === FOUNDER_SEED) return {
		...dealFrom(input, {
			...FOUNDER_LOOK.parts,
			...overrides
		}),
		palette: FOUNDER_LOOK.palette,
		founder: true
	};
	return dealFrom(input, overrides);
}
function dealFrom(input, overrides) {
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
	* sit beside, under or at a corner of an eye pixel: eyes that run into a mouth
	* turn a face into one shape (an H, a box, a zigzag), and it stops reading as
	* eyes and a mouth. Then the mouth drops a row or two where the head has
	* room for it, with a column of face either side if it can. Where it hasn't
	* (a heart's point, a car's bumper), the eyes go up a row instead, and only
	* if neither works is a corner touch allowed.
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
		const thin = corners ?? true;
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
* outline. Every face has the same eyes: two cells square, `wo` over `oo`,
* the guy's outline ink with a white catchlight, a pixel of the buddy between
* each eye and its outline and a gap between the two. Neither colour is the
* buddy's own, so no finish repaints them: the eyes stay dark and shining on
* Gold, Negative and Nebula alike.
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
				"9wo11wo2",
				"9oo11oo2",
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
				".333334.",
				"3wo33wo4",
				"3oo33oo4",
				"57555576",
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
				"1wo11wo2",
				"1oo11oo2",
				".114412.",
				"31133112",
				".111122.",
				".12..12."
			])
		},
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
				"3wo11wo2",
				"3oo11oo2",
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
				".555446.",
				"54545446",
				"66666666",
				"3wo11wo2",
				"1oo11oo2",
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
				"1wo11wo2",
				"1oo11oo2",
				"55555556",
				"11111112"
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
				"7wo11wo3",
				"7oo11oo3",
				"71164123",
				"71145123",
				".711223.",
				"..3333.."
			])
		},
		"halfsies.avocado": {
			eyes: 8,
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
				"...415oooo513...",
				"..41ohhh###o13..",
				".1oh#########o1.",
				".1o##########o1.",
				".1o##########o1.",
				".1o##########o1.",
				".1o#########so1.",
				".41os######so13.",
				".421os####so123.",
				"..4211oooo1123..",
				"...4222222223...",
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
				".331112.",
				"3wo11wo2",
				"1oo11oo2",
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
				"34444442",
				"3wo44wo2",
				"1oo44oo2",
				"31455412",
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
				"..3112..",
				"3wo11wo2",
				"3oo11oo2",
				".341142.",
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
				"1wo1wo22",
				"1oo1oo22",
				"11141122",
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
				"3wo11wo2",
				"1oo11oo2",
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
				"3wo11255",
				"3oo11225",
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
				"3wo11wo2",
				"3oo11oo2",
				"36666772",
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
				".3wo11..",
				"44oo12..",
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
				"3wo11wo2",
				"3oo11oo2",
				"31111125",
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
			eyes: 9,
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
				".....444445.....",
				".....555555.....",
				"....31111112....",
				"..331111111122..",
				"..31h######s12..",
				"..31########12..",
				"..31########12..",
				"..31########12..",
				"..31s######s12..",
				"..388s####s882..",
				"..863666666667..",
				"...6666666677...",
				"....77777777....",
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
				"1wo11wo2",
				"1oo11oo2",
				".835382.",
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
				"13111412",
				"1wo11wo2",
				"1oo11oo2",
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
				"3111112.",
				"1wo1wo2.",
				"1oo1oo25",
				"11141265",
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
				".9999956",
				".5wo5wo6",
				".5oo5oo6",
				".5555566",
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
				const band$2 = Math.floor(y / 3), col = (x + band$2 % 2 * 3) % 6, ry = y % 3;
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
				"1wo11wo1",
				"1oo11oo1",
				".335331.",
				"..1331.2",
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
				"3wo11122",
				"3oo11122",
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
				".311112.",
				"3wo11wo2",
				"1oo11oo2",
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
				".3wo1...",
				"73oo1...",
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
				"3wo11wo2",
				"1oo11oo2",
				".161162."
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
				"3wo11wo2",
				"3oo11oo2",
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
				".131312.",
				"4wo13wo5",
				"4oo31oo5",
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
				"3wo11wo2",
				"1oo11oo2",
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
				"1wo44wo2",
				"1oo66oo2",
				"17566572",
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
				".666666.",
				"33141132",
				"3wo11wo2",
				"1oo11oo2",
				"14111412",
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
				".33..33.",
				"3wo33wo2",
				"3oo11oo2",
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
				"3wo11wo2",
				"3oo11oo2",
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
				"6wo55wo6",
				"6oo55oo7",
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
				".374472.",
				"4wo44wo4",
				"4oo44oo4",
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
				".3wo1wo2",
				".3oo1oo2",
				"3.31112.",
				"33311122",
				"..311.22",
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
				".411112.",
				"4wo11wo2",
				"4oo11oo2",
				"33333336",
				"55555555"
			])
		},
		"trackdle.cone": {
			eyes: 10,
			colors: [
				"#FF8A3D",
				"#D9621E",
				"#FFF4DC",
				"#FFB27A",
				"#2B2F38",
				"#E6D5B3"
			],
			art: grid16("traffic cone", [
				"................",
				".......41.......",
				"......4112......",
				"......4112......",
				".....333336.....",
				".....411112.....",
				"....41111112....",
				"....41111112....",
				"....33333336....",
				"...3333333336...",
				"...3333333336...",
				"..411111111112..",
				"..411111111112..",
				".41111111111112.",
				".55555555555555.",
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
const headset = (band$2, ear, out) => {
	const wearBand = on(band$2), wearEars = earsOut(ear, out);
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
				"3wo11wo2",
				"1oo11oo2",
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
				"4wo11wo4",
				"4oo11oo4",
				".175571.",
				".176671.",
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
				"1wo11wo1",
				"4oo11oo4",
				".116611.",
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
				"1wo11wo2",
				"1oo11oo2",
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
const TAU$4 = Math.PI * 2;
/** `v` brought into 0 to `n`, negative numbers too. */
const wrap$1 = (v, n) => (v % n + n) % n;
/** `period` ms, nudged so a whole number of them fill LOOP_MS. */
const fit$1 = (period) => LOOP_MS / Math.max(1, Math.round(LOOP_MS / Math.abs(period)));
/** The `d` in `sin(t / d)`, nudged so the wave (2πd ms) comes round in LOOP_MS. */
const wave = (d) => fit$1(TAU$4 * d) / TAU$4;
/** A step's length in a pattern `n` steps long, nudged so the pattern comes round in LOOP_MS. */
const steps = (step$1, n) => fit$1(step$1 * Math.max(1, n)) / Math.max(1, n);
/** A count of `step` ms that starts again every LOOP_MS: for noise drawn fresh each step or generation. */
function tick(t, step$1) {
	const s = fit$1(step$1);
	return wrap$1(Math.floor(t / s), Math.round(LOOP_MS / s));
}
/** How far through a cycle of about `period` ms, 0 to 1, coming round in LOOP_MS. */
const cycle = (t, period) => {
	const p = fit$1(period);
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
const STAR = [
	...CROSS,
	[
		-2,
		0,
		2
	],
	[
		2,
		0,
		2
	],
	[
		0,
		-2,
		2
	],
	[
		0,
		2,
		2
	]
];
/**
* The star a Lucky guy or a Gold copy throws off over his head (Isaac, October 29: the one-cell glint
* read as a stray pixel): the sparkle with its arms grown out a cell at its height, so it opens from a
* dot to a cross to a long four-point star and back.
*/
function starAt(f) {
	if (f < 0 || f >= 1) return [];
	return f < .14 ? DOT_DEEP : f < .28 ? DOT : f < .43 ? CROSS : f < .71 ? STAR : f < .86 ? CROSS : DOT;
}

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
/**
* A still piece every frame shows, so even an aura of a few moving specks
* always has something there: a picture (rows of `0`–`3` for its colours,
* `.` empty) of at least eight cells, in the empty spot nearest one of the
* top corners beside the guy's head, the print choosing which, a cell clear
* of the guy on every side. The first of `arts` that fits is drawn: a big one
* where there is room, a small one over the head of a guy who nearly fills
* the frame. The last is three cells wide at most: for a guy who leaves no
* room at all, it goes just past the frame's edge beside the head, in the
* columns a padded picture keeps for an aura (`auraCells`' `pad`). It bobs a
* cell every `bob` ms when given.
*/
function anchor(mask, t, print, arts, bob = 0) {
	const H = mask.length, W = mask[0].length, s = shape(mask), right = print % 2 === 1;
	const on$1 = (x, y) => !!mask[y]?.[x];
	const draw = (art$1, x0, y0$1) => {
		const out = [];
		art$1.forEach((row, dy) => [...row].forEach((ch, dx) => {
			if (ch !== ".") out.push([
				x0 + dx,
				y0$1 + dy,
				Number(ch)
			]);
		}));
		return out;
	};
	for (const art$1 of arts) {
		const bobs = bob && art$1 === arts[0], h$1 = art$1.length + (bobs ? 1 : 0), w$1 = art$1[0].length, tx = right ? W - w$1 : 0, ty = Math.max(0, s.top - h$1);
		let best = null, far$2 = Infinity;
		for (let y = 0; y + h$1 <= H; y++) for (let x = 0; x + w$1 <= W; x++) {
			let clear = true;
			for (let dy = 0; dy < h$1 && clear; dy++) for (let dx = 0; dx < w$1 && clear; dx++) {
				const X = x + dx, Y = y + dy;
				if (on$1(X, Y) || on$1(X - 1, Y) || on$1(X + 1, Y) || on$1(X, Y - 1) || on$1(X, Y + 1)) clear = false;
			}
			const d = Math.abs(x - tx) + Math.abs(y - ty) * 1.5;
			if (clear && d < far$2) {
				far$2 = d;
				best = [x, y];
			}
		}
		if (best) return draw(art$1, best[0], best[1] + (bobs && Math.floor(t / steps(bob, 2)) % 2 ? 1 : 0));
	}
	const art = arts[arts.length - 1], w = art[0].length, h = art.length, edge = right ? W - 1 : 0;
	let y0 = Math.max(0, Math.min(H - h, s.top)), far$1 = Infinity;
	for (let y = 0; y + h <= H; y++) {
		let clear = true;
		for (let Y = y - 1; Y <= y + h && clear; Y++) if (on$1(edge, Y)) clear = false;
		if (clear && Math.abs(y - s.top) < far$1) {
			far$1 = Math.abs(y - s.top);
			y0 = y;
		}
	}
	return draw(art, right ? W : -w, y0);
}
const AURAS = [
	{
		id: "aura.flames",
		name: "Flames",
		colors: [
			"#FFE27A",
			"#FF8A2B",
			"#E5484D"
		],
		still: 2510,
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
		still: 330,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], turn$1 = print % 2 ? -1 : 1, rx = Math.min(6.5, s.w / 2 - 1.5);
			for (let k = 0; k < 28; k += 2) {
				const a = k / 28 * Math.PI * 2;
				out.push([
					Math.round(s.w / 2 - .5 + Math.cos(a) * rx),
					Math.round(s.top + 1 + Math.sin(a) * 1.6),
					2
				]);
			}
			for (let i = 0; i < 3; i++) {
				const a = turn$1 * t / wave(560) + i * 2.094 + print;
				out.push(...plus(Math.round(s.w / 2 - .5 + Math.cos(a) * rx), Math.round(s.top + 1 + Math.sin(a) * 1.6), 1));
			}
			return [...out, ...anchor(mask, t, print, [[
				".111.",
				"21012",
				".111."
			], [
				".1.",
				"111",
				"202",
				"111",
				".1."
			]])];
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
		still: 5660,
		cells: (mask, t, print) => {
			const near = ring(mask, 3), out = [];
			for (let i = 0; i < 5; i++) {
				const at = t + i * 173 + print * 11, life = tick(at, 520), phase = cycle(at, 520);
				const [x, y] = near[Math.floor(noise$2(i, life, print) * near.length)] ?? [0, 0];
				out.push(...glint(x, y, phase));
			}
			const on$1 = Math.floor(t / steps(260, 2)) % 2 === 0;
			return [...out, ...anchor(mask, t, print, on$1 ? [
				[
					"..2..",
					"..1..",
					"21012",
					"..1..",
					"..2.."
				],
				[
					".2.2.",
					"21012",
					".2.2."
				],
				[
					"2.2",
					".1.",
					"101",
					".1.",
					"2.2"
				]
			] : [
				[
					".2.2.",
					"2.1.2",
					".101.",
					"2.1.2",
					".2.2."
				],
				[
					"2.1.2",
					".101.",
					"2.1.2"
				],
				[
					".1.",
					"212",
					".0.",
					"212",
					".1."
				]
			])];
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
		still: 4670,
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
			const beat = cycle(t + print * 13, 700) < .2;
			return [...out, ...anchor(mask, t, print, beat ? [
				[
					".1.1.",
					"10111",
					"11111",
					".111.",
					"..2.."
				],
				[
					"11.11",
					"10111",
					".121."
				],
				[
					"1.1",
					"101",
					"111",
					".1.",
					".2."
				]
			] : [
				[
					".1.1.",
					"10111",
					".111.",
					"..2.."
				],
				[
					".1.1.",
					"10111",
					".121."
				],
				[
					"1.1",
					"101",
					"111",
					".2."
				]
			])];
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
		still: 4740,
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
			return [...out.filter((c) => c[2] >= 0), ...anchor(mask, t, print, [
				[
					".11.",
					"10.2",
					"1..2",
					".22."
				],
				[
					".11.",
					"1002",
					".22."
				],
				[
					"11.",
					"102",
					"1.2",
					".22"
				]
			], 300)];
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
		still: 1120,
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
		still: 0,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], beat = Math.floor((t + print * 31) / steps(110, 15)), flash = beat % 5;
			for (const [side, x0] of [[0, 1], [1, s.w - 2]]) {
				if ((beat + side) % 3 === 2 && flash !== 4) continue;
				let x = x0;
				for (let y = 0; y <= s.cy; y++) {
					if (mask[y]?.[x]) break;
					out.push([
						x,
						y,
						flash === 0 ? 0 : flash === 4 ? 2 : 1
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
			return [...out, ...anchor(mask, t, print, [flash === 0 ? [
				".11",
				".1.",
				"101",
				".1.",
				"11."
			] : [
				".22",
				".2.",
				"212",
				".2.",
				"22."
			]])];
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
		still: 4670,
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
			return [...out, ...anchor(mask, t, print, [
				[
					"..11",
					"..12",
					"..1.",
					"011.",
					"12.."
				],
				[
					"..11",
					"..12",
					"011.",
					"11.."
				],
				[
					".11",
					".12",
					".1.",
					"11.",
					"12."
				]
			], 340)];
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
		still: 2740,
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
			const turn$1 = Math.floor(t / steps(500, 2)) % 2;
			return [...out, ...anchor(mask, t, print, turn$1 ? [
				[
					"2.1.2",
					".212.",
					"11011",
					".212.",
					"2.1.2"
				],
				[
					"2.1.2",
					".101.",
					"2.1.2"
				],
				[
					"2.2",
					".1.",
					"101",
					".1.",
					"2.2"
				]
			] : [
				[
					"..1..",
					"2.1.2",
					"11011",
					"2.1.2",
					"..1.."
				],
				[
					".212.",
					"11011",
					".212."
				],
				[
					".1.",
					"212",
					"101",
					"212",
					".1."
				]
			])];
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
		still: 5820,
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
			return [...out, ...anchor(mask, t, print, [
				[
					"2.1.2",
					".111.",
					"11011",
					".111.",
					"2.1.2"
				],
				[
					"2.1.2",
					"11011",
					"2.1.2"
				],
				[
					".2.",
					"212",
					"101",
					"212",
					".2."
				]
			])];
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
		still: 3670,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], turn$1 = print % 2 ? -1 : 1;
			const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x, y]) => [
				x,
				y,
				Math.atan2(y - s.cy, x - s.cx)
			]).sort((a, b$1) => a[2] - b$1[2]);
			const n = track.length;
			for (let i = 0; i < 3 && n; i++) {
				const [x, y] = track[wrap(turn$1 * Math.floor(t / steps(120, n)) + Math.round(i * n / 3) + print * 5, n)];
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
			const far$1 = ring(mask, 4).filter(([, , d]) => d >= 3);
			for (let i = 0; i < 4; i++) {
				const life = fit$1(900), at = t + i * (life / 4) + print * 31, gen = tick(at, 900), f = cycle(at, 900);
				const [x, y] = far$1[Math.floor(noise$2(i, gen, print, 23) * far$1.length)] ?? [0, 0];
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
				const band$2 = Math.min(5, Math.floor((1 - d) / .0435));
				const along = Math.round(Math.atan2(cy - y, x - cx) / Math.PI * 30);
				out.push([
					x,
					y,
					Math.abs(along - glint$1) <= 1 && band$2 % 2 === 0 ? 6 : band$2
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
		still: 1920,
		cells: (mask, t, print) => {
			const step$1 = tick(t + print * 13, 120), out = [];
			const slipped = (y) => {
				const row = mask[y], shove = noise$2(y, step$1, 2) < .5 ? 1 : 2, cells = [];
				row.forEach((on$1, x) => {
					if (!on$1) return;
					if (!row[x - 1] && x - shove >= 0 && !row[x - shove]) cells.push([
						x - shove,
						y,
						1
					]);
					if (!row[x + 1] && x + shove < row.length && !row[x + shove]) cells.push([
						x + shove,
						y,
						2
					]);
				});
				return cells;
			};
			const rows = mask.map((_, y) => [y, noise$2(y, step$1, print)]).sort((a, b$1) => b$1[1] - a[1]);
			for (const [y, n] of rows) {
				if (n < .55 && out.length >= 8) break;
				out.push(...slipped(y));
			}
			const flip = noise$2(step$1, print, 4) > .5;
			return [...out, ...anchor(mask, t, print, flip ? [["111.2", ".2221"], [
				"112",
				".21",
				"221"
			]] : [["1.222", "2111."], [
				"122",
				"21.",
				"211"
			]])];
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
		still: 3540,
		cells: (mask, t, print) => {
			const near = ring(mask, 3), out = [];
			for (let i = 0; i < 8; i++) {
				const [ax, ay] = near[Math.floor(noise$2(i, print, 3) * near.length)] ?? [0, 0];
				const x = ax + Math.round(Math.sin(t / wave(700) + i * 1.7) * 1.5), y = ay + Math.round(Math.cos(t / wave(900) + i * 2.3));
				const phase = cycle(t + i * 397 + print * 29, 1600);
				if (phase > .65 && i > 1) continue;
				out.push(...phase > .15 && phase < .45 ? plus(x, y, 2) : [[
					x,
					y,
					1
				]]);
			}
			const glow = Math.floor(t / steps(400, 2)) % 2 === 0;
			return [...out, ...anchor(mask, t, print, glow ? [[
				".2...",
				"202..",
				".2.1.",
				"..101",
				"...1."
			], [
				".2.",
				"202",
				".2.",
				".1.",
				"101",
				".1."
			]] : [[
				".1...",
				"101..",
				".1.2.",
				"..202",
				"...2."
			], [
				".1.",
				"101",
				".1.",
				".2.",
				"202",
				".2."
			]])];
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
			const s = shape(mask), beat = tick(t + print * 53, 90), n = Math.round(LOOP_MS / fit$1(90));
			const since = Math.min(...[1, 2].map((k) => wrap(beat - Math.floor(noise$2(print, k) * n), n)));
			const off = since === 2 || since === 4, dim = since <= 5 && !off;
			const stretch = Math.floor(noise$2(print, 3) * 4);
			return ring(mask, 2).flatMap(([x, y, d]) => {
				if (off) return d === 1 ? [[
					x,
					y,
					2
				]] : [];
				const quarter = Math.floor(wrap(Math.atan2(y - s.cy, x - s.cx) / TAU$3 + .5, 1) * 4);
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
		still: 4830,
		cells: (mask, t, print) => {
			const s = shape(mask), turn$1 = print % 2 ? -1 : 1;
			const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x$1, y$1]) => [
				x$1,
				y$1,
				Math.atan2(y$1 - s.cy, x$1 - s.cx)
			]).sort((p, q) => p[2] - q[2]);
			if (!track.length) return [];
			const n = track.length, head$1 = wrap(turn$1 * Math.floor(t / steps(45, n)) + print * 7, n), out = [];
			for (let j = 10; j >= 1; j--) {
				const [x$1, y$1] = track[wrap(head$1 - turn$1 * j, n)];
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
		still: 3720,
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
			const open = Math.floor(t / steps(600, 2)) % 2 === 0;
			return [...out, ...anchor(mask, t, print, open ? [[
				"11.11",
				"21012",
				".2.2."
			], [
				"1.1",
				"101",
				"1.1",
				"2.2"
			]] : [[
				".111.",
				".101.",
				".2.2."
			], [
				"1.1",
				"101",
				".1.",
				"2.2"
			]])];
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
		still: 2380,
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
		still: 5740,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let x = -3; x < s.w + 3; x++) {
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
		still: 1790,
		cells: (mask, t, print) => {
			const s = shape(mask), turn$1 = print % 2 ? -1 : 1, out = [];
			for (const [x, y, d] of ring(mask, 4)) {
				const a = Math.atan2(y - s.cy, x - s.cx) / (2 * Math.PI), r = Math.hypot(x - s.cx, y - s.cy);
				const v = wrap(a * 3 + r * .3 - turn$1 * t / fit$1(700) + print * .1, 1);
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
		still: 4260,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let i = 0; i < 2; i++) {
				const cycle$1 = fit$1(1500), local = wrap(t + i * 750 + print * 37, cycle$1), shot = tick(t + i * 750 + print * 37, 1500);
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
				if (p > .92) continue;
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
			const lit$1 = Math.floor(t / steps(300, 2)) % 2 === 0;
			return [...out, ...anchor(mask, t, print, [lit$1 ? [
				"2.2",
				".1.",
				"101",
				".1.",
				"2.2"
			] : [
				".2.",
				"212",
				".0.",
				"212",
				".2."
			]])];
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
const TAU$3 = Math.PI * 2;
/**
* Points round the guy on a squarish ellipse, `gx` cells clear of his sides
* and `gy` of his top and foot, in order: where a rarer aura's pieces ride.
*/
function loop(s, gx, gy) {
	const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps$1 = 720;
	const pts = [];
	for (let i = 0; i < steps$1; i++) {
		const a = i / steps$1 * TAU$3, c = Math.cos(a), sn = Math.sin(a);
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
	][level], life = fit$1(1300);
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
/** Black pearl, as its card is dressed: its nacre's pale sheen, then the teal and rose its highlights catch. */
const PEARL = [
	"#A995E8",
	"#46B5A6",
	"#C863A0"
];
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
	const rgb$9 = [
		1,
		3,
		5
	].map((i) => parseInt(c.slice(i, i + 2), 16));
	const to = (target, a) => "#" + rgb$9.map((v) => Math.round(v + (target - v) * a).toString(16).padStart(2, "0")).join("").toUpperCase();
	return [
		to(255, .35),
		to(15, .38),
		to(25, .72)
	];
}
const hsl$2 = (h, s, l) => {
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
		if (sweep) return hsl$2(wrap((x + y) * 18 + t * 360 / fit$1(2160), 360), .9, .78);
		return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	}
	if (finish === "fade") {
		const i = wrap(Math.floor((y + x * .5 + t / steps(140, 6)) / 2), 3);
		return k === 0 ? "#FFFFFF" : FADE[(i + k) % 3];
	}
	const ramp$1 = RAMPS[finish];
	if (!ramp$1) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	if (finish === "pearl") {
		const hue$2 = [
			168,
			278,
			328
		][wrap(Math.floor((x + y * .7) / 3 + t / steps(420, 3)), 3)];
		if (sweep) return hsl$2(hue$2, .5, .9);
		return [
			hsl$2(hue$2, .55, .84),
			hsl$2(hue$2, .5, .66),
			hsl$2(hue$2, .3, .34)
		][Math.min(2, k)];
	}
	if (sweep && (finish === "sapphire" || finish === "ruby")) return ramp$1[0];
	return ramp$1[Math.min(2, k % 3)];
}
/**
* The one colour an aura copy is known by, in its finish: its most vivid
* colour (Flames' orange, Frost's ice blue, a Neon copy's tube). Its card is
* dressed in it.
*/
function auraHue(id, finish, print = 0) {
	if (finish === "pearl" && id !== "aura.neon" && !ONE_OF_ONE_AURAS.some((a) => a.id === id)) return PEARL[0];
	const colors = auraColors(id, finish, print);
	const vivid = (hex$4) => {
		const [r, g, b$1] = [
			1,
			3,
			5
		].map((i) => parseInt(hex$4.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1);
		return (max - min) * (1 - Math.abs(max + min - 1) * .3);
	};
	return colors.reduce((a, c) => vivid(c) > vivid(a) ? c : a, colors[0]);
}
/** The colours an aura copy's card is dressed from, in its finish: the list `auraHue` picks the most vivid of. */
function auraColors(id, finish, print = 0) {
	const aura = auraById(id);
	return id === "aura.neon" ? [neonRamp(finish, print)[0], NEON_TUBES$1[finish]?.[print % NEON_TUBES$1[finish].length] ?? "#FF3FA4"] : aura && ONE_OF_ONE_AURAS.includes(aura) ? aura.colors : finish === "fade" ? FADE : finish === "pearl" ? PEARL : RAMPS[finish] ?? aura?.colors ?? ["#19D3C5"];
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
/**
* Each effect's badge: a five-by-five picture of it in its own colours, for a
* card's corner and anywhere a copy's effect is named. Each letter is a
* colour in `BADGE_INKS`; `.` is empty.
*/
const FX_BADGES = {
	shimmer: [
		"..w..",
		"..s..",
		"wsWsw",
		"..s..",
		"..w.."
	],
	pulse: [
		".vvv.",
		"v...v",
		"v.W.v",
		"v...v",
		".vvv."
	],
	holo: [
		"r.y.g",
		".y.g.",
		"y.g.b",
		".g.b.",
		"g.b.v"
	],
	neon: [
		".ppp.",
		"p...p",
		"p...p",
		"p...p",
		".ppp."
	],
	bubbles: [
		".bb..",
		"bWb..",
		".bb..",
		"...bb",
		"...bW"
	],
	hearts: [
		"pp.pp",
		"pPPPp",
		"pPPPp",
		".pPp.",
		"..p.."
	],
	chroma: [
		"rrrrr",
		"yyyyy",
		"ggggg",
		"bbbbb",
		"vvvvv"
	],
	rime: [
		"s.s.s",
		".sWs.",
		"sWWWs",
		".sWs.",
		"s.s.s"
	],
	embers: [
		"..o..",
		".oy..",
		".oyo.",
		"oyWyo",
		".ooo."
	],
	static: [
		"rrr..",
		"..ccc",
		"rrrr.",
		".cccc",
		"rr..."
	],
	lava: [
		"..o..",
		".oyo.",
		"oyWyo",
		"oyyyo",
		".ooo."
	],
	starlight: [
		"..W..",
		"..v..",
		"WvWvW",
		"..v..",
		"..W.."
	],
	electric: [
		"..yy.",
		".yy..",
		"yyyyy",
		"..yy.",
		".yy.."
	]
};
/** The colours a badge is drawn in. */
const BADGE_INKS = {
	W: "#FFFFFF",
	w: "#E6F4FF",
	s: "#9ED8FF",
	v: "#A98BFF",
	r: "#FF5A6E",
	y: "#FFD23F",
	g: "#5FD38A",
	b: "#5FA8FF",
	p: "#FF6FAE",
	P: "#FFC2DB",
	o: "#FF8A2B",
	c: "#3DD8FF"
};
/** The effect a uniform number in [0, 1) gives, rarest checked first, or none. */
function rollFx(u, aura) {
	let edge = 0;
	for (const id of [...FX_IDS].reverse()) {
		edge += 1 / EFFECTS[id][aura ? "aura" : "item"];
		if (u < edge) return id;
	}
	return void 0;
}
const rgb$8 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$3 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$5 = (a, b$1, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b$1[i] - a[i]) * t);
const WHITE$4 = [
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
/**
* The finishes an effect repaints whole: Plain and Sunset, the commonest, so
* a cheap copy with an effect changes a lot, and an aura's own, whose few
* scattered cells the effect only marks. On every other finish an effect is a
* layer over it (`layered`): the finish shows through and the effect runs
* over it as a band, a sheen or a few cells, never as a new coat of paint, so
* a Deep Blue with Chroma looks like both.
*/
const REPAINTS = new Set([
	"plain",
	"sunset",
	"classic",
	"fade",
	"frost",
	"toxic",
	"shadow",
	"sapphire",
	"ruby",
	"pearl"
]);
/** Whether an effect on a copy in `finish` is a layer over the finish rather than a repaint of it. */
const layered = (finish) => !!finish && !REPAINTS.has(finish);
/** A colour's lightness, 0 to 1. */
const light$3 = (c) => (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;
/**
* One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two
* copies move together. Given the copy's `finish`, an effect that recolours
* is laid over a finish other than Plain or Sunset instead of repainting it
* (`layered`).
*/
function fxColor(color, fx, x, y, t, print = 0, finish) {
	const c = rgb$8(color), tt = t + print * 37;
	if (layered(finish)) {
		const over = overFinish(c, fx, x, y, tt, print);
		if (over) return hex$3(over);
	}
	switch (fx) {
		case "shimmer": {
			const at = cycle(tt, 900) * 34 - 8;
			for (const band$2 of [at, at - 14]) {
				const d = x + y - band$2;
				if (d >= 0 && d < 1.5) return "#FFFFFF";
				if (d >= -1.5 && d < 0) return hex$3(mix$5(c, [
					150,
					220,
					255
				], .75));
			}
			return noise$1(x, y, tick(tt, 140)) > .94 ? "#FFFFFF" : color;
		}
		case "pulse": {
			const b$1 = Math.sin(tt / wave(260));
			return hex$3(mix$5(c, b$1 > 0 ? WHITE$4 : [
				0,
				0,
				0
			], (b$1 > 0 ? .45 : .14) * Math.abs(b$1)));
		}
		case "holo": return hex$3(mix$5(c, hue$1(((x * 22 + y * 14 + tt * 360 / fit$1(1800)) % 360 + 360) % 360), .45));
		case "chroma": {
			const h = ((tt * 360 / fit$1(2520) + (x + y) * 14) % 360 + 360) % 360, l = (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;
			return hex$3(mix$5(c, hue$1(h, .95, Math.min(.78, Math.max(.32, l))), .78));
		}
		case "starlight": {
			const night = mix$5(mix$5(c, [
				24,
				18,
				66
			], .6), [
				110,
				70,
				220
			], .16 * (1 + Math.sin(tt / wave(700) + x * .5 + y * .3)));
			return noise$1(x, y, print) > .93 ? hex$3(mix$5(night, [
				210,
				200,
				255
			], .55)) : hex$3(night);
		}
		case "embers": return hex$3(mix$5(c, [
			255,
			120,
			40
		], .16 + .14 * Math.max(0, Math.sin(tt / wave(140) + x * 1.3 - y * .8))));
		case "neon": return hex$3(mix$5(c, neonTube(print), .16 + .06 * Math.sin(tt / wave(380))));
		case "bubbles": return hex$3(mix$5(c, [
			190,
			235,
			255
		], .1 + .08 * Math.sin(tt / wave(300) + y)));
		case "hearts": return hex$3(mix$5(c, [
			255,
			140,
			190
		], .14 + .08 * Math.sin(tt / wave(400) + x * .5)));
		case "rime": {
			const reach = .5 + .5 * Math.sin(tt / wave(900) - y * .35);
			const n = noise$1(x, y, tick(tt, 400), print);
			if (reach > .35 && n > .72) return n > .9 ? "#FFFFFF" : "#DDF4FF";
			return hex$3(mix$5(c, [
				190,
				228,
				255
			], .3 + .5 * reach));
		}
		case "static": {
			const roll$1 = cycle(tt, 70 * 24) * 24 - 4, burst = noise$1(tick(tt, 90), print, 7) > .62;
			if (burst) {
				const r = noise$1(x, y, tick(tt, 60));
				return r > .8 ? "#FFFFFF" : hex$3(mix$5(c, r > .45 ? [
					255,
					60,
					90
				] : [
					60,
					200,
					255
				], .55));
			}
			if (Math.abs(y - roll$1) < 1) return hex$3(mix$5(c, WHITE$4, .45));
			return y % 2 ? hex$3(mix$5(c, [
				0,
				0,
				0
			], .16)) : color;
		}
		case "lava": {
			const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * .9 + tt / wave(700)) * 2);
			const crust = mix$5(c, [
				40,
				18,
				12
			], .55);
			return flow > .55 ? hex$3(mix$5([
				255,
				120,
				30
			], [
				255,
				230,
				120
			], (flow - .55) * 2.2)) : flow > .25 ? hex$3(mix$5(crust, [
				220,
				70,
				20
			], .6)) : hex$3(crust);
		}
		case "electric": {
			const flash = noise$1(tick(tt, 120), print, 11) > .8;
			if (flash) return hex$3(mix$5(c, WHITE$4, .7));
			const vein = Math.abs(Math.sin(x * 1.7 + y * .9 + tt / wave(90))) > .93;
			return vein ? hex$3(mix$5(c, [
				200,
				240,
				255
			], .75)) : hex$3(mix$5(c, [
				110,
				180,
				255
			], .22));
		}
	}
}
/**
* An effect that would recolour a copy, as a layer over its finish instead
* (`layered`), or null for one that already leaves the colour alone. Chroma is
* a rainbow band crossing it, Holo a light foil sheen with a bright line, Lava
* veins only in its darkest parts, Starlight a few stars and no night, Rime a
* thin frost, Static a lighter glitch and Electric a weaker flash.
*/
function overFinish(c, fx, x, y, tt, print) {
	switch (fx) {
		case "chroma": {
			const at = cycle(tt, 2520) * 40 - 8, d = x + y - at, h = ((tt * 360 / fit$1(2520) + (x + y) * 14) % 360 + 360) % 360;
			if (d >= 0 && d < 4) return mix$5(c, hue$1((h + Math.floor(d) * 60) % 360, .95, Math.min(.72, Math.max(.4, light$3(c)))), .62);
			return mix$5(c, hue$1(h, .9, Math.min(.7, Math.max(.35, light$3(c)))), .1);
		}
		case "holo": {
			const d = x * .8 + y - (cycle(tt, 1800) * 40 - 8);
			const foil = mix$5(c, hue$1(((x * 22 + y * 14 + tt * 360 / fit$1(1800)) % 360 + 360) % 360), .16);
			return d >= 0 && d < 1.2 ? mix$5(foil, WHITE$4, .55) : foil;
		}
		case "lava": {
			if (light$3(c) > .3) return c;
			const flow = Math.sin(y * 1.1 + tt / wave(220) + Math.sin(x * .9 + tt / wave(700)) * 2);
			return flow > .55 ? mix$5([
				255,
				120,
				30
			], [
				255,
				230,
				120
			], (flow - .55) * 2.2) : flow > .25 ? mix$5(c, [
				220,
				70,
				20
			], .45) : mix$5(c, [
				40,
				18,
				12
			], .25);
		}
		case "starlight": return noise$1(x, y, print) > .93 ? mix$5(c, [
			236,
			230,
			255
		], .75) : c;
		case "rime": {
			const reach = .5 + .5 * Math.sin(tt / wave(900) - y * .35), n = noise$1(x, y, tick(tt, 400), print);
			if (reach > .45 && n > .93) return n > .97 ? WHITE$4 : [
				221,
				244,
				255
			];
			return mix$5(c, [
				200,
				234,
				255
			], .22 * reach);
		}
		case "static": {
			const roll$1 = cycle(tt, 70 * 24) * 24 - 4, burst = noise$1(tick(tt, 90), print, 7) > .62;
			if (burst) {
				const r = noise$1(x, y, tick(tt, 60));
				return r > .9 ? WHITE$4 : mix$5(c, r > .45 ? [
					255,
					60,
					90
				] : [
					60,
					200,
					255
				], .3);
			}
			if (Math.abs(y - roll$1) < 1) return mix$5(c, WHITE$4, .4);
			return y % 2 ? mix$5(c, [
				0,
				0,
				0
			], .08) : c;
		}
		case "electric": {
			const flash = noise$1(tick(tt, 120), print, 11) > .8;
			if (flash) return mix$5(c, WHITE$4, .3);
			const vein = Math.abs(Math.sin(x * 1.7 + y * .9 + tt / wave(90))) > .93;
			return vein ? mix$5(c, [
				200,
				240,
				255
			], .5) : mix$5(c, [
				110,
				180,
				255
			], .06);
		}
		default: return null;
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
	const rainbow = (o) => hex$3(hue$1(((t * 360 / fit$1(2880) + i * 90 + o) % 360 + 360) % 360, 1, .62));
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
	const put$1 = (x, y, c) => {
		if (empty$1(x, y)) out[y][x] = c;
	};
	const size = copies.map((_, k) => slots.reduce((n, row) => n + row.filter((s) => s === k + 1).length, 0));
	const small$1 = (k) => k + 1 !== AURA_SLOT && size[k] > 0 && size[k] < SMALL_COPY;
	slots.forEach((row, y) => row.forEach((s, x) => {
		const o = copies[s - 1];
		if (!s || !o?.fx || !colors[y][x]) return;
		const fx = fxColor(colors[y][x], o.fx, x, y, t, o.print, o.finish);
		const a = rgb$8(colors[y][x]), b$1 = rgb$8(fx);
		if (s === AURA_SLOT) {
			out[y][x] = fx;
			return;
		}
		if (!small$1(s - 1) || layered(o.finish)) {
			out[y][x] = fx;
			return;
		}
		out[y][x] = hex$3(DARKENS.includes(o.fx) ? mix$5(a, b$1, .42) : mix$5(a, b$1, 1.5));
	}));
	copies.forEach((o, k) => {
		if (!o?.fx || !small$1(k) || OWN_EDGE.includes(o.fx)) return;
		const beat = tick(t + o.print * 37, 140);
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s || colors[y][x]) return;
			const from = NEAR2.find(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1);
			if (!from || noise$1(x, y, beat, o.print, 17) > .4) return;
			out[y][x] = hex$3(mix$5(rgb$8(out[y + from[1]][x + from[0]]), WHITE$4, .15));
		}));
	});
	const cellsOf = (k) => {
		const c = [];
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && colors[y][x]) c.push([x, y]);
		}));
		return c;
	};
	const dark = (c) => !!c && rgb$8(c).reduce((a, v) => a + v, 0) < 240;
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
			]) put$1(x + dx, y + dy, hex$3(mix$5(rgb$8(colors[y][x]), WHITE$4, .25 + .3 * breath)));
		}
		if (o.fx === "neon" && !aura) {
			const tube = neonTube(o.print), glow = .3 + .12 * Math.sin(tt / wave(380)), rim$2 = edgeOf(k);
			for (const [x, y] of rim$2) out[y][x] = hex$3(mix$5(tube, WHITE$4, glow));
			for (const [x, y] of rim$2) for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) put$1(x + dx, y + dy, hex$3(mix$5(tube, [
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
				const glint$1 = noise$1(x, y, tick(tt, 300), o.print) > (layered(o.finish) ? .95 : .82);
				out[y][x] = glint$1 ? "#FFFFFF" : hex$3(mix$5(rgb$8(out[y][x]), [
					214,
					240,
					255
				], aura ? .5 : layered(o.finish) ? d <= 1 ? .3 : .15 : d <= 1 ? .85 : .6));
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
				put$1(x, y, "#E8F8FF");
				return;
			}
			put$1(x, y, "#FFFFFF");
			put$1(x + 1, y, "#9ED8FF");
			put$1(x, y + 1, "#9ED8FF");
			put$1(x + 1, y + 1, "#5FB8F0");
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
			]) put$1(x + dx, y + dy, c);
		});
		if (o.fx === "embers") risers(o, k, aura ? 120 : 100, 6, aura ? .35 : .6, (x, y, step$1) => {
			const c = step$1 < 2 ? ["#FFF2A8", "#FFC53D"] : step$1 < 4 ? ["#FFC53D", "#FF7A1A"] : ["#FF7A1A", "#C2412E"];
			put$1(x, y, c[0]);
			put$1(x, y + 1, c[1]);
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
				for (const [cx, cy, c] of sg.cells) put$1(x + cx, y + cy + dy, c);
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
const FACE$1 = new Set([
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
	const frame$1 = slot === "frame", hat$1 = slot === "hat";
	const at = (x, y) => grid[y]?.[x] ?? 0;
	const air = (x, y) => hat$1 && at(x, y) === 0 && x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1;
	const taken = new Set();
	const corners = frame$1 ? [
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
					if (FACE$1.has(n) || hat$1 && n !== 0 && n !== T.OUTLINE && !own(slot, n) && !taken.has((y + ny) * GRID_SIZE + x + nx)) crowded++;
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
		const inside$1 = (x, y) => frame$1 || N4.every(([dx, dy]) => at(x + dx, y + dy) !== 0);
		for (const [x, y] of placed) for (const [dx, dy] of N4) {
			const nx = x + dx, ny = y + dy;
			if (own(slot, at(nx, ny)) && inside$1(nx, ny)) grid[ny][nx] = T.OUTLINE;
			taken.add(ny * GRID_SIZE + nx);
		}
	});
}
/**
* After a year of days, the outline around an item goes gold; a frame's edge
* does. Every other step of it stays ink, so it shows on any finish: on a
* Gold or orange item the ink steps keep its edge, on a dark or pale one the
* gold steps stand out. Only gold and outline cells, which the face's blink
* and squash leave alone. A pin's backing plate stays dark, so a gold pin
* still stands out.
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
	for (const [x, y] of set$10) if ((x + y) % 2) grid[y][x] = T.GOLD;
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
	},
	"frostbite": {
		name: "Frostbite",
		hex: "#9FD6F0",
		month: "2026-11"
	},
	"last-ember": {
		name: "Last Ember",
		hex: "#C4502A",
		month: "2026-11"
	},
	"evergreen": {
		name: "Evergreen",
		hex: "#2F6B45",
		month: "2026-12"
	},
	"candy-cane": {
		name: "Candy Cane",
		hex: "#E04A5A",
		month: "2026-12"
	},
	"midnight": {
		name: "Midnight Blue",
		hex: "#232F5C",
		month: "2027-01"
	},
	"champagne": {
		name: "Champagne",
		hex: "#E9D9A6",
		month: "2027-01"
	},
	"sweetheart": {
		name: "Sweetheart",
		hex: "#E36A8E",
		month: "2027-02"
	},
	"sugar-plum": {
		name: "Sugar Plum",
		hex: "#6B3B6E",
		month: "2027-02"
	},
	"lucky-clover": {
		name: "Lucky Clover",
		hex: "#3FA35B",
		month: "2027-03"
	},
	"puddle": {
		name: "Puddle Grey",
		hex: "#8A93A0",
		month: "2027-03"
	},
	"blossom": {
		name: "Cherry Blossom",
		hex: "#F3B8C8",
		month: "2027-04"
	},
	"robins-egg": {
		name: "Robin’s Egg",
		hex: "#8FD3D0",
		month: "2027-04"
	}
};
const PAINT_IDS = Object.keys(PAINTS);
/** Metal for a paint of the month: two refined, six times an ordinary tin. */
const LIMITED_PAINT_COST = 18;
/** The month a paint of the month is on sale (`YYYY-MM`), or undefined for one always on the shelf. */
const paintMonth = (id) => PAINTS[id].month;
/** Whether a paint can be bought on `day` (`YYYY-MM-DD`): always, or in its month. */
const paintOnSale = (id, day) => {
	const m = paintMonth(id);
	return !m || day.startsWith(m);
};
/** The paints for sale on `day`: the shelf, then that month's. */
const paintsOnSale = (day) => PAINT_IDS.filter((id) => paintOnSale(id, day));
/** What a tin of `id` costs, in scrap. */
const paintCost = (id, base$1) => paintMonth(id) ? LIMITED_PAINT_COST : base$1;
/** What can be painted. */
const PAINTABLE = ["hat", "buddy"];
const rgb$7 = (hex$4) => [
	1,
	3,
	5
].map((i) => parseInt(hex$4.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const light$2 = (c) => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
const mix$4 = (a, b$1, t) => a.map((v, i) => v + (b$1[i] - v) * t);
/**
* An item's colours under a paint: the first colour (an item's main one)
* becomes the paint, and every other colour sits as much lighter or darker
* than the paint as it did than the main one.
*/
function painted(colors, paint$1) {
	const p = paint$1 && PAINTS[paint$1];
	if (!p || !colors.length) return colors;
	const base$1 = rgb$7(p.hex), main = light$2(rgb$7(colors[0]));
	return colors.map((hex$4) => {
		const d = light$2(rgb$7(hex$4)) - main;
		return toHex(d >= 0 ? mix$4(base$1, [
			255,
			255,
			255
		], Math.min(1, d * 1.5)) : mix$4(base$1, [
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
* Battered Nebula. Append only: a copy stores its finish's id, and a capsule
* rolls them in this order.
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
		odds: 15.97,
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
		odds: .1,
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
	},
	"op": {
		name: "Op",
		grade: 4,
		odds: .06,
		scuffs: [0, .08]
	},
	"impossible": {
		name: "Impossible",
		grade: 4,
		odds: .05,
		scuffs: [0, .08]
	},
	"grid": {
		name: "Grid",
		grade: 4,
		odds: .05,
		scuffs: [0, .08]
	}
};
/** The graphic finishes: a pattern of their own across the item, in ink, ivory and coral. */
const GRAPHIC_FINISHES = [
	"op",
	"impossible",
	"grid"
];
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
/** An effect at least this rare (one copy in this many) makes its copy an Unusual (`unusual`). */
const UNUSUAL_ONE_IN = 250;
/**
* Whether a copy is an Unusual: a showpiece, or a copy with an effect rarer
* than about one in 250 that isn't its showpiece's own (rated on the aura
* ladder for an aura). What its card, its reveal and a board celebrate,
* whatever its grade; the grade itself (`gradeOf`) is unchanged.
*/
function unusual(o) {
	const item = itemById(o.item);
	if (item?.showpiece) return true;
	if (!o.fx || o.fx === item?.signature || !EFFECTS[o.fx]) return false;
	return EFFECTS[o.fx][FINISHES[o.finish]?.aura ? "aura" : "item"] >= UNUSUAL_ONE_IN;
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
const rgb$6 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$2 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$3 = (a, b$1, t) => [
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
	return t < .5 ? mix$3(mix$3(c, [
		0,
		0,
		0
	], .5), c, t * 2) : mix$3(c, mix$3(c, [
		255,
		255,
		255
	], .6), (t - .5) * 2);
};
/** A colour along a ramp of stops, `t` 0 to 1, blended smoothly between them. */
const ramp = (stops, t) => {
	const at = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(at));
	return mix$3(stops[i], stops[i + 1], at - i);
};
/** A colour taken through its tone: `t` 0 its shadow, 0.5 itself, 1 its highlight. */
const toned = (c, t, deep = [
	16,
	12,
	34
]) => t < .5 ? mix$3(mix$3(c, deep, .62), c, t * 2) : mix$3(c, mix$3(c, [
	255,
	255,
	255
], .72), (t - .5) * 2);
const hsl$1 = (h, s, l) => {
	const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
	return [
		0,
		8,
		4
	].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
};
/** Rich polished gold, from a deep amber shade through saturated warm yellows to a light highlight. */
const GOLD$2 = [
	"#7A3E00",
	"#B06A04",
	"#E09A12",
	"#F8C424",
	"#FFDD4A",
	"#FFEFA0",
	"#FFF8D8"
].map(rgb$6);
const WHITE_GOLD = [
	"#3A3226",
	"#76695A",
	"#B3A58E",
	"#DDD2BC",
	"#F2EBDC",
	"#FFFBF2",
	"#FFFFFF"
].map(rgb$6);
/**
* A colour's tone with some of its own lightness kept: a pale item stays pale in a dark finish and a
* dark part stays darker than it, so a big costume keeps its light and dark instead of one blob.
*/
const lit = (tone, l) => tone * .6 + l * .4;
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
	const ls = colors.map((c) => lum$1(rgb$6(c))), main = ls[0] ?? .5;
	const down = .47 / Math.max(.33, main - Math.min(...ls)), up = .47 / Math.max(.33, Math.max(...ls) - main);
	const chroma$1 = (c) => {
		const g = (c[0] + c[1] + c[2]) / 3;
		return c.map((v) => v - g);
	};
	const key = colors[0] ? chroma$1(rgb$6(colors[0])) : [
		0,
		0,
		0
	];
	return new Map(colors.map((c, i) => {
		const k = chroma$1(rgb$6(c));
		return [c.toUpperCase(), {
			tone: .5 + (ls[i] - main) * (ls[i] < main ? down : up),
			part: Math.min(1, Math.hypot(k[0] - key[0], k[1] - key[1], k[2] - key[2]) / 120)
		}];
	}));
}
const measured = (b$1, eyes$1) => {
	const w = Math.max(1, b$1.right - b$1.left + 1), h = Math.max(1, b$1.bottom - b$1.top + 1);
	return {
		x0: b$1.left,
		y0: b$1.top,
		w,
		h,
		cx: b$1.left + (w - 1) / 2,
		cy: b$1.top + (h - 1) / 2,
		eyes: eyes$1
	};
};
/**
* Where a face sits on a skin, by row from its eyes' line: the columns its
* eyes and mouth, and the cells touching them, take on nearly every guy (the
* face is drawn centred on the grid). A finish that would bury the face in
* ink or in a void keeps these cells light, so the face reads at any size.
*/
const FACE_WINDOW = {
	[-3]: [4, 11],
	[-2]: [3, 12],
	[-1]: [3, 12],
	0: [3, 12],
	1: [4, 11],
	2: [4, 11],
	3: [5, 10],
	4: [6, 9]
};
const inFace = (b$1, x, y) => {
	const span$1 = b$1.eyes === void 0 ? void 0 : FACE_WINDOW[y - b$1.eyes];
	return !!span$1 && x >= span$1[0] && x <= span$1[1];
};
/** A graphic finish's colour in a face's window: the same pattern, gone pale, so the face's ink reads on every cell of it. */
const paled = (c, b$1, x, y) => inFace(b$1, x, y) ? mix$3(c, IVORY_RGB, .56) : c;
/**
* Where each worn item sits on a composed grid, read off its layer's tokens
* (`LAYER` in ./parts/art: a skin's 20s, a hat's 30s, a frame's 40s, a
* buddy's 50s): the boxes `paintCell` sweeps each copy's finish across.
*/
function boxesIn(grid) {
	const out = {};
	grid.forEach((row, y) => row.forEach((t, x) => {
		const slot = [
			"skin",
			"hat",
			"frame",
			"buddy"
		].find((k) => t >= LAYER[k] && t < LAYER[k] + 10);
		if (!slot) return;
		const b$1 = out[slot];
		if (!b$1) out[slot] = {
			left: x,
			top: y,
			right: x,
			bottom: y
		};
		else {
			b$1.left = Math.min(b$1.left, x);
			b$1.right = Math.max(b$1.right, x);
			b$1.top = Math.min(b$1.top, y);
			b$1.bottom = Math.max(b$1.bottom, y);
		}
	}));
	return out;
}
const boxes = new Map();
/**
* The box an item usually takes when nobody measured it: a skin's own art (it
* is drawn on the whole grid), a frame's whole grid, a buddy's art where it
* stands beside the guy (`buddyAlone`), and a hat over the middle of the head.
*/
function boxOf(itemId) {
	let b$1 = boxes.get(itemId);
	if (b$1) return b$1;
	const item = itemById(itemId), art = item?.art;
	const lit$1 = (rows) => {
		let left = 99, right = -1, top = 99, bottom = -1;
		rows.forEach((row, y) => row.forEach((v, x) => {
			if (v) {
				left = Math.min(left, x);
				right = Math.max(right, x);
				top = Math.min(top, y);
				bottom = Math.max(bottom, y);
			}
		}));
		return right < 0 ? null : {
			left,
			right,
			top,
			bottom
		};
	};
	const own$1 = art ? lit$1(art) : null;
	b$1 = item?.slot === "frame" ? {
		left: 0,
		top: 0,
		right: 15,
		bottom: 15
	} : item?.slot === "skin" && own$1 ? own$1 : item?.slot === "buddy" && own$1 ? {
		left: 19,
		top: 15 - (own$1.bottom - own$1.top + 1),
		right: 18 + (own$1.right - own$1.left + 1),
		bottom: 14
	} : {
		left: 3,
		top: 1,
		right: 12,
		bottom: 5
	};
	boxes.set(itemId, b$1);
	return b$1;
}
/** Where a cell sits across its item's box, corner to corner, 0 to 1, along a slope (`dy` per column). */
const sweepOf = (x, y, b$1, dy) => (x - b$1.x0 + (y - b$1.y0) * dy) / Math.max(1, b$1.w - 1 + (b$1.h - 1) * dy);
/** The club's ink, ivory and coral, and the primaries a Grid finish fills its panes with. */
const INK_RGB = rgb$6("#17131F"), IVORY_RGB = rgb$6("#F4EFE4"), CORAL$1 = rgb$6("#EE6A50");
const PRIMARIES = [
	"#D9402E",
	"#2C55C8",
	"#F2C230"
].map(rgb$6);
/** The famous prints' own looks, drawn in place of their finish's: what makes a one in a million look it. */
const FAMOUS = {
	"Deep Blue": (x, y, tone, p, l, b$1) => {
		const line = x - b$1.x0 + (y - b$1.y0) * .9 - (b$1.w - 1 + (b$1.h - 1) * .9) * (.3 + p % 5 * .1);
		if (line >= 0 && line < 1) return rgb$6("#EEF6FF");
		if (line >= -1 && line < 2) return mix$3(ramp(SAPPHIRE, lit(tone, l)), rgb$6("#9CC8FF"), .55);
		return ramp(SAPPHIRE, .1 + lit(tone, l) * .75);
	},
	"Black Hole": (x, y, tone, p, l, b$1) => {
		if (b$1.eyes !== void 0) {
			const edge = b$1.eyes - 4, d = Math.hypot((x - b$1.cx) / Math.max(1.5, b$1.w * .3), (y - edge - .5) / Math.max(1, edge - b$1.y0 + .5));
			if (y <= edge && d < 1) return mix$3(rgb$6("#07060B"), rgb$6("#231C33"), lit(tone, l) * .7);
			if (y <= edge) return ramp([
				"#FFF3D2",
				"#FFB45C",
				"#E2581F",
				"#8A2A12"
			].map(rgb$6), Math.min(1, (d - 1) * .8));
			if (y === edge + 1) return mix$3(rgb$6("#FFF3D2"), rgb$6("#FF8A30"), Math.min(1, Math.abs(x - b$1.cx) / Math.max(1, b$1.w / 2)));
			const t = (y - edge - 1) / Math.max(1, b$1.y0 + b$1.h - edge - 1) + (.5 - lit(tone, l)) * .25;
			return ramp([
				"#FFE6B0",
				"#FFB45C",
				"#E2581F",
				"#8A2A12"
			].map(rgb$6), Math.max(0, Math.min(inFace(b$1, x, y) ? .5 : 1, t)));
		}
		const dx = (x - b$1.cx) / Math.max(1, b$1.w / 2), dy = (y - b$1.cy) / Math.max(1, b$1.h / 2), tilt = ((p >> 2) % 3 - 1) * .25;
		if (Math.abs(y - b$1.cy - (x - b$1.cx) * tilt) < .5) return mix$3(rgb$6("#FFF3D2"), rgb$6("#FF8A30"), Math.min(1, Math.abs(dx) * 1.1));
		if (Math.hypot(dx, dy) > .8 || tone > .72) return mix$3(rgb$6("#FFE6B0"), rgb$6("#E2581F"), Math.max(0, Math.min(1, (dy + 1) / 2)));
		return mix$3(rgb$6("#07060B"), rgb$6("#231C33"), lit(tone, l) * .7);
	},
	"Red Giant": (x, y, tone, _p, l, b$1) => {
		const r = Math.hypot((x - b$1.cx) / Math.max(1, b$1.w / 2), (y - b$1.cy) / Math.max(1, b$1.h / 2));
		return ramp([
			"#FFF1C2",
			"#FFB347",
			"#F0602E",
			"#C41E2C",
			"#5E0A1A"
		].map(rgb$6), Math.min(1, r * .78 + (.55 - lit(tone, l)) * .6));
	},
	"Blue Moon": (x, y, tone, p, l, b$1) => {
		const shade$1 = (x - b$1.cx) * (p % 2 ? 1 : -1) / Math.max(1, b$1.w / 2);
		const crater = cellNoise(p, x, y, 21) > .82 && tone < .7;
		const t = Math.max(0, Math.min(1, .2 + lit(tone, l) * .75 - Math.max(0, shade$1 - .35) * .9 - (crater ? .18 : 0)));
		return ramp([
			"#1E2F78",
			"#4E6CC8",
			"#9DB4EE",
			"#DCE6FF",
			"#FFFFFF"
		].map(rgb$6), t);
	}
};
/** Deep Blue's sapphire, deep to light. */
const SAPPHIRE = [
	"#05124F",
	"#0B2EA8",
	"#1A50E6",
	"#4C86FF",
	"#A9CBFF"
].map(rgb$6);
/**
* Each finish as a clean, premium version of the item: its colours mapped
* through the finish's own ramp by tone, so the item's shading and parts all
* still read, and any colour shift runs in smooth bands across the item's own
* box (`ItemBox`), never pixel by pixel: every Prism shows its whole rainbow
* and every Sunset its three colours, on a hat as on a skin. The shaders
* (./finish-shader) move a sheen over it.
*/
const PAINT = {
	"plain": (_x, _y, _t, _p, original) => original,
	"sunset": (x, y, _t, p, _o, l, _part, b$1) => {
		const t = Math.max(0, Math.min(1, sweepOf(x, y, b$1, .5) * 1.1 - .05 + (p % 100 / 100 - .5) * .2));
		const c = t < .5 ? mix$3(rgb$6("#F5C542"), rgb$6("#E55AA8"), t * 2) : mix$3(rgb$6("#E55AA8"), rgb$6("#7A4BE0"), (t - .5) * 2);
		return shaded(c, l);
	},
	"tempered": (x, y, tone, p, _o, l, part, b$1) => {
		if (DEEP_BLUE_PRINTS.includes(p)) return FAMOUS["Deep Blue"](x, y, tone, p, l, b$1);
		const [a, bb, c] = TINTS[temperTint(p)].map(rgb$6);
		const s = (across(x, y) * 1.5 + p % 11 / 11 + part * .4) % 1, k = (1 - Math.cos(s * Math.PI * 2)) / 2;
		const band$2 = s < .5 ? mix$3(a, bb, k) : mix$3(c, bb, 1 - k);
		return toned(band$2, .28 + lit(tone, l) * .5, [
			10,
			16,
			40
		]);
	},
	"nebula": (x, y, tone, p, _o, l, part, b$1) => {
		const phase = nebulaPhase(p);
		if (FAMOUS[phase]) return FAMOUS[phase](x, y, tone, p, l, b$1);
		const [a, c] = [
			["#7A2AB8", "#3A3AD0"],
			["#3A2AB0", "#8A3AC8"],
			["#2A5AC0", "#6A2AB0"],
			["#A82A8A", "#4A2AB8"]
		][p % 4];
		const cloud = Math.min(1, (.5 + .5 * Math.sin(x * .5 + p) * Math.cos(y * .42 - p * .7)) * (1 - part) + part * .95);
		const t = .2 + lit(Math.pow(tone, 1.1), l) * .72, sky = mix$3(rgb$6(a), rgb$6(c), cloud);
		return ramp([
			mix$3(sky, [
				8,
				6,
				22
			], .6),
			sky,
			mix$3(sky, rgb$6("#FFC4EC"), .5),
			rgb$6("#FFF0FA")
		], t);
	},
	"prism": (x, y, tone, p, _o, _l, _part, b$1) => {
		const h = (sweepOf(x, y, b$1, .8) * 300 + p * 7) % 360;
		return mix$3(hsl$1(h, .6, .3 + .58 * tone), [
			255,
			255,
			255
		], .14);
	},
	"negative": (x, y, tone, p, _o, _l, part, b$1) => {
		const d = x - b$1.cx - (y - b$1.cy) * .35 * (p % 2 ? 1 : -1), face = inFace(b$1, x, y), dark = d < 0 !== p % 4 >= 2 && !face;
		if (d >= -1 && d < 0 && !face) return rgb$6("#D9468F");
		if (d >= 0 && d < 1 && !face) return rgb$6("#3BB8CF");
		if (dark) return tone < .35 ? rgb$6("#8E88A4") : part > .45 ? rgb$6("#3A3448") : tone > .62 ? rgb$6("#0C0A12") : rgb$6("#1C1826");
		return tone > .62 ? rgb$6("#5C566E") : part > .45 ? rgb$6("#CFC8D8") : tone < .35 ? rgb$6("#FFFFFF") : rgb$6("#F3EDE0");
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
		const t = .1 + tone * .82 + Math.max(0, 1 - Math.abs(across(x, y) - .42) / .16) * .12;
		return mix$3(ramp(GOLD$2, t), ramp(WHITE_GOLD, t), part * .3);
	},
	"op": (x, y, tone, p, _o, _l, _part, b$1) => {
		const r = b$1.eyes === void 0 ? Math.hypot(x - b$1.cx, y - b$1.cy) : Math.hypot((x - 7.5) * .8, y - b$1.eyes - .5);
		if (tone < .15 && !inFace(b$1, x, y)) return INK_RGB;
		if (r < .75 && b$1.eyes === void 0) return CORAL$1;
		return paled(Math.floor(r + .25 + p % 3 / 3) % 2 ? INK_RGB : IVORY_RGB, b$1, x, y);
	},
	"impossible": (x, y, tone, p, _o, _l, _part, b$1) => {
		if (tone < .15 && !inFace(b$1, x, y)) return INK_RGB;
		const left = x <= b$1.cx, s = y - b$1.y0 + (left ? x - b$1.cx : b$1.cx - x) + (left ? 0 : 1) + p % 6;
		return paled([
			INK_RGB,
			IVORY_RGB,
			CORAL$1
		][(Math.floor(s / 2) % 3 + 3) % 3], b$1, x, y);
	},
	"grid": (x, y, tone, p, _o, _l, _part, b$1) => {
		if (tone < .15 && !inFace(b$1, x, y)) return INK_RGB;
		const v1 = b$1.x0 + Math.max(1, Math.round((b$1.w - 1) * (.3 + p % 3 * .06))), v2 = b$1.x0 + Math.round((b$1.w - 1) * (.64 + (p >> 2) % 3 * .06));
		const h1 = b$1.y0 + Math.max(1, Math.round((b$1.h - 1) * (.42 + (p >> 4) % 3 * .08)));
		if (x === v1 || x === v2 || y === h1) return paled(INK_RGB, b$1, x, y);
		const pane = (x > v1 ? 1 : 0) + (x > v2 ? 1 : 0) + (y > h1 ? 3 : 0), at = (pane - p % 6 + 6) % 6;
		return paled(at === 0 ? PRIMARIES[0] : at === 2 ? PRIMARIES[1] : at === 4 ? PRIMARIES[2] : IVORY_RGB, b$1, x, y);
	}
};
/**
* The ink a skin's face takes in a finish that keeps the cells round the face
* light (`FACE_WINDOW`): the graphic finishes, Negative and a Black Hole. Undefined in
* any other finish, where the face keeps the ink worked out from the skin's
* own colour.
*/
function faceInk(o) {
	return GRAPHIC_FINISHES.includes(o.finish) || o.finish === "negative" || o.finish === "nebula" && nebulaPhase(o.print) === "Black Hole" ? "#15111C" : void 0;
}
const PRIMER = rgb$6("#8B9097");
/**
* A finished skin's outline: the deepest colour of its finish, so a purple
* Nebula frog isn't ringed in frog green. Negative and Sunset keep the skin's own.
*/
function finishOutline(o) {
	if (o.finish === "gold") return "#4A2400";
	if (o.finish === "nebula") return nebulaPhase(o.print) === "Red Giant" ? "#3A0610" : nebulaPhase(o.print) === "Blue Moon" ? "#101A4A" : "#160C30";
	if (o.finish === "prism") return "#2C2048";
	if (o.finish === "tempered") return DEEP_BLUE_PRINTS.includes(o.print) ? "#030A30" : hex$2(mix$3(rgb$6(TINTS[temperTint(o.print)][0]), [
		8,
		10,
		26
	], .72));
	if (GRAPHIC_FINISHES.includes(o.finish)) return "#17131F";
	return void 0;
}
/**
* Paints one cell of an owned item: its finish, then its wear. Chips land in
* places fixed by the print, so a copy always wears the same way, and how many
* show is the scuff. `glint` is set once the first Box Fresh glint has been
* placed. `tone` is the colour's place among the item's own (`toneOf`); left
* out, its lightness stands in. `box` is where the item sits on the grid
* (`ItemBox`); left out, the box its slot usually takes (`boxOf`).
*/
function paintCell(color, x, y, o, state, tone, box) {
	const original = rgb$6(color), l = lum$1(original);
	const item = itemById(o.item), b$1 = measured(box ?? boxOf(o.item), item?.slot === "skin" ? item.eyes : void 0);
	let c = PAINT[o.finish](x, y, tone?.tone ?? Math.max(0, Math.min(1, (l - .15) / .75)), o.print, original, l, tone?.part ?? 0, b$1);
	if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, .9) * .45) c = mix$3(c, PRIMER, Math.min(.75, .3 + o.scuff * .6));
	c = mix$3(c, [
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
	return hex$2(c);
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
const seasonal$1 = [
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
	...seasonal$1.map((i) => ({
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
	const lum$2 = (hex$4) => {
		const c = (i) => {
			const v = parseInt(hex$4.slice(1 + i * 2, 3 + i * 2), 16) / 255;
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
		painted(item.colors, paint$1).forEach((hex$4, i) => {
			colors[LAYER[slot] + i] = hex$4;
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
				const dark = "#15111C", light$4 = "#FFF1D6";
				colors[T.EYE] = colors[T.MOUTH] = (owned && faceInk(owned)) ?? (contrast$1(dark, item.colors[0]) >= contrast$1(light$4, item.colors[0]) ? dark : light$4);
			}
		}
	}
	return {
		name: palette$1.name,
		colors
	};
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
function light$1(c) {
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
	return !!ink && contrast$2(ink, "#000000") > 10;
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
	const small$1 = c.bottom - c.crown + 1 <= 8;
	const limit = (small$1 ? 2 : 3) - (top && worn && boxedIn(config, c, face) ? 1 : 0);
	const quiet = pattern && !SCATTERED.has(body) && body !== "starry" && !small$1;
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
		light$1(c);
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
	const frame$1 = itemById(config.frame);
	const c = startCanvas(config);
	const { eye, mouth: mouth$1, face, extras: extras$1, worn: wornOnFace, cheekAt } = faceAndCheeks(c, config, !!skin);
	if (skin) {
		if (skin.limb) {
			const limb = skin.limb === "own" ? T.BODY : LAYER.skin + skin.limb - 1;
			feet(c, config.feet, limb);
			arms(c, config.arms, limb);
		}
	} else {
		light$1(c);
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
	if (frame$1?.slot === "frame") {
		for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (!c.grid[y][x]) c.grid[y][x] = LAYER.frame + frame$1.fill(x, y) - 1;
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
* finish and wear. Before that, a chase part's own fixed colours
* (`PART_COLORS`) paint over the palette.
*/
function paint(grid, config, palette$1, small$1 = false, still$1 = true) {
	const state = { glint: false };
	const slotOf$1 = (t) => t >= LAYER.aura ? "aura" : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
	const aura = auraById(config.aura);
	if (small$1) ({grid, palette: palette$1} = forSmall(grid, palette$1, (eyes[config.eyes]?.name ?? "") in EYE_COLORS));
	const fixed = partColors(grid, config, palette$1);
	const boxes$1 = boxesIn(grid);
	const tones = new Map();
	const tonesOf = (slot) => {
		let m = tones.get(slot);
		if (!m) tones.set(slot, m = toneOf(Array.from({ length: 10 }, (_, i) => palette$1.colors[LAYER[slot] + i]).filter((c) => !!c)));
		return m;
	};
	return grid.map((row, y) => row.map((token, x) => {
		const color = fixed?.[y][x] ?? (token === T.WHITE ? catchlight(grid, x, y, palette$1) : resolveColor(palette$1, token));
		if (!color) return null;
		const slot = slotOf$1(token);
		const copy = slot ? config.owned?.[slot] : void 0;
		const painted$2 = slot === "aura" ? aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still, copy.print) : color : copy ? paintCell(color, x, y, copy, state, tonesOf(slot).get(color.toUpperCase()), boxes$1[slot]) : color;
		return still$1 && copy?.fx ? fxColor(painted$2, copy.fx, x, y, 0, copy.print, copy.finish) : painted$2;
	}));
}
const GOLD$1 = "#FFD45C";
/**
* A corona in gold; on a body gold melts into (Butter, Honey, Tangerine), whichever of a pale gold
* and an amber stands off it best, both in hue and in lightness.
*/
const goldOn = (body) => {
	if (deltaE(GOLD$1, body) >= 30) return GOLD$1;
	const stands = (c) => Math.min(contrast$2(c, body) / 1.5, deltaE(c, body) / 30);
	return stands("#FFF4CC") >= stands("#E8901A") ? "#FFF4CC" : "#E8901A";
};
/**
* Chase eyes keep their own colours on every guy, so galaxy eyes are always a
* galaxy: drawn in the accent they came out a different speck on each body.
* Each is a token-to-colour map, painted only inside the eyes' box.
*/
const EYE_COLORS = {
	galaxy: {
		[T.EYE]: "#0E0824",
		[T.WHITE]: "#FFFFFF",
		[T.ACCENT]: "#D9C2FF",
		[T.ACCENT_SHADE]: "#6E3FE6"
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
	},
	laser: {
		[T.WHITE]: "#FFFFFF",
		[T.GOLD]: "#FFE7A0",
		[T.RED]: "#E8262C",
		[T.GOLD_SHADE]: "#A3101E"
	},
	eclipse: (body) => ({
		[T.EYE]: "#07070C",
		[T.WHITE]: "#FFFFFF",
		[T.GOLD]: goldOn(body)
	}),
	void: {
		[T.EYE]: "#05040A",
		[T.WHITE]: "#FFFFFF"
	}
};
/** Eyes whose pits a dark body would swallow: there the skin touching them is lit in the body's own light tone. */
const VOID_RIM = new Set(["void"]);
/**
* The masquerade's violet and its highlight: deep, or pale on a body deep violet sinks into
* (Midnight, Grape Soda), or near black on a violet body both melt into.
*/
const MASK_VIOLETS = [
	["#5A2D9C", "#8657D6"],
	["#A47CF2", "#CBB2FF"],
	["#2A1250", "#4A2A86"]
];
const maskViolet = (body) => MASK_VIOLETS.slice(0, 2).find(([v]) => deltaE(v, body) >= 30 && contrast$2(v, body) >= 1.5) ?? MASK_VIOLETS.reduce((a, b$1) => deltaE(b$1[0], body) > deltaE(a[0], body) ? b$1 : a);
/**
* Toppers, accessories and markings with colours of their own, as the chase
* eyes have, so each reads the same on every body: on fire in flame colours,
* not the shared red that came out salmon pink, a violet mask with a gold rim,
* gold seams with a dark edge that holds on a pale body. Painted only on the
* part's own cells (`partMask`).
*/
const PART_COLORS = {
	hair: {
		"on fire": {
			[T.RED]: "#C8281E",
			[T.GOLD_SHADE]: "#F0661C",
			[T.GOLD]: "#FFA62B",
			[T.WHITE]: "#FFF0B0"
		},
		idea: {
			[T.GOLD]: "#FFE27A",
			[T.GOLD_SHADE]: "#F2B33D",
			[T.WHITE]: "#FFFFFF",
			[T.TRIM]: "#B9C0CE",
			[T.LEAF_SHADE]: "#6E7689",
			[T.ACCENT]: "#FFD45C"
		},
		thought: {
			[T.WHITE]: "#FFFFFF",
			[T.TRIM]: "#C5D2E8"
		}
	},
	accessory: { masquerade: (body) => {
		const [violet, light$4] = maskViolet(body);
		return {
			[T.LEAF_SHADE]: violet,
			[T.LEAF]: light$4,
			[T.TRIM]: GOLD$1,
			[T.GOLD]: GOLD$1,
			[T.RED]: "#E0245E",
			[T.ACCENT]: "#FF6FA8"
		};
	} },
	body: {
		kintsugi: { [T.LEAF_SHADE]: "#3A2410" },
		"op art": {
			[T.LEAF_SHADE]: "#17131F",
			[T.TRIM]: "#FFF1D6"
		}
	}
};
const LISTS = {
	hair,
	accessory: accessories,
	body: bodies
};
const colorsOn = (colors, palette$1) => typeof colors === "function" ? colors(palette$1.colors[T.BODY] ?? "#FFFFFF") : colors;
/** Every cell a chase part paints in its own colours, or null for a guy with none. */
function partColors(grid, config, palette$1) {
	let out = null;
	const put$1 = (x, y, c) => {
		if (!c) return;
		out ??= grid.map((row) => row.map(() => void 0));
		if (out[y]?.[x] === void 0 && out[y]) out[y][x] = c;
	};
	const eyeName = eyes[config.eyes]?.name ?? "", eyeMap = colorsOn(EYE_COLORS[eyeName], palette$1);
	if (eyeMap) {
		const f = faceOf(config);
		const left = f.eyes[0].left - 1, right = f.eyes[f.eyes.length - 1].right + 1;
		const inBox$1 = (x, y, below = 0) => y >= f.top - 1 && y <= f.line + below && x >= left && x <= right;
		grid.forEach((row, y) => row.forEach((t, x) => {
			if (inBox$1(x, y)) put$1(x, y, eyeMap[t]);
		}));
		const ink = palette$1.colors[T.EYE];
		if (VOID_RIM.has(eyeName) && ink && contrast$2(ink, "#000000") > 10) {
			const pit = (x, y) => grid[y]?.[x] === T.EYE;
			grid.forEach((row, y) => row.forEach((t, x) => {
				if (inBox$1(x, y, 1) && SKIN_TOKENS.has(t) && (pit(x - 1, y) || pit(x + 1, y) || pit(x, y - 1) || pit(x, y + 1))) put$1(x, y, palette$1.colors[T.LIGHT]);
			}));
		}
	}
	for (const slot of [
		"hair",
		"accessory",
		"body"
	]) {
		const map = colorsOn(PART_COLORS[slot][LISTS[slot][config[slot]]?.name ?? ""], palette$1);
		if (!map) continue;
		const mask = partMask(config, slot);
		const under = slot === "accessory" ? underEyes(config) : null;
		const f = under && faceOf(config);
		const iris = (t, x, y) => !!f && IRIS_TOKENS$1.has(t) && y >= f.top - 1 && y <= f.line && under?.[y]?.[x] !== t;
		grid.forEach((row, y) => row.forEach((t, x) => {
			if (mask[y]?.[x] && !iris(t, x, y) || under?.[y]?.[x] && under[y][x] === t) put$1(x, y, map[t]);
		}));
	}
	return out;
}
const unders = new Map();
/**
* What a face accessory (a masquerade, a monocle, glasses) paints round the
* eyes, as it lies under them: compose draws it before the eyes, so they
* cover it, and a glance that moves them (./animate) shows it again. A glint
* it puts in the eye rows moves with the eyes too, so where it paints one
* over its own colour, that colour is what lies under. A token for each cell
* it paints, 0 elsewhere, laid out as the finished guy is (mirrored with the
* guy); null for a guy with no face accessory.
*/
function underEyes(config) {
	const accessory = accessories[config.accessory];
	if (accessory?.layer !== "face") return null;
	const key = JSON.stringify([
		config.head,
		config.skin,
		config.eyes,
		config.mouth,
		config.accessory,
		config.body,
		config.cheeks,
		config.palette,
		config.shade,
		config.flip
	]);
	if (unders.has(key)) return unders.get(key);
	const skin = itemById(config.skin), base$1 = composeBase(config);
	const c = new Canvas(base$1.map((row) => [...row]), skin?.slot === "skin" ? skin.eyes : heads[config.head].eyes);
	c.face = faceOf(config);
	const lies = base$1.map((row) => row.map(() => 0)), set$10 = c.set.bind(c);
	c.set = (x, y, t) => {
		set$10(x, y, t);
		if (c.get(x, y) === t && t && t !== T.EYE && t !== T.WHITE) lies[y][x] = t;
	};
	accessory.draw(c);
	const any = lies.some((row) => row.some(Boolean));
	if (config.flip) for (const row of lies) row.reverse();
	if (unders.size > 2e3) unders.clear();
	unders.set(key, any ? lies : null);
	return any ? lies : null;
}
const BIG_BLUSH = cheeks.findIndex((c) => c.name === "big blush");
const LAUGH = mouths.findIndex((m) => m.name === "laugh");
/**
* The guy as ./animate composes the poses: another mouth, arms up or out, a
* big blush. A marking keeps clear of the mouth and cheeks, so it lands on
* other cells in each, and a mask taken from the still alone left the cells a
* laugh uncovers in the palette's own leaf green.
*/
const posed = (figure) => [
	figure,
	...mouths.map((_, mouth$1) => ({
		...figure,
		mouth: mouth$1
	})),
	{
		...figure,
		arms: 1
	},
	{
		...figure,
		arms: 2
	},
	{
		...figure,
		mouth: LAUGH,
		arms: 2
	},
	{
		...figure,
		cheeks: BIG_BLUSH
	}
];
const masks = new Map();
/**
* The cells a guy's topper, accessory or marking takes, in any pose: where the
* guy differs from the same guy without it, still or posed (`posed`). Only the
* part's own colour tokens are repainted there, so a cheek mark or pattern
* that a crowded guy drops (and shows bare body instead) is left alone. A
* topper never reaches the face, so its mask stops above the eyes and its
* still is enough.
*/
function partMask(config, slot) {
	const figure = {
		...config,
		frame: void 0,
		aura: void 0,
		buddy: void 0
	};
	const key = slot + JSON.stringify(figure);
	let mask = masks.get(key);
	if (!mask) {
		const top = slot === "hair" ? faceOf(figure).top - 1 : Infinity;
		const all = Array.from({ length: GRID }, () => new Array(GRID).fill(false));
		for (const pose of slot === "hair" ? [figure] : posed(figure)) {
			const on$1 = compose(pose), off = compose({
				...pose,
				[slot]: 0
			});
			on$1.forEach((row, y) => row.forEach((t, x) => {
				if (y < top && t !== off[y][x]) all[y][x] = true;
			}));
		}
		mask = all;
		if (masks.size > 2e3) masks.clear();
		masks.set(key, mask);
	}
	return mask;
}
const GRID = 16;
/** The guy's own skin: what lights round a void eye's pits. */
const SKIN_TOKENS = new Set([
	T.BODY,
	T.SHADE,
	T.LIGHT,
	T.DEEP,
	T.BELLY
]);
/** The colour low in an eye (shiny, sparkle, beans), as ./animate moves it with the eye. */
const IRIS_TOKENS$1 = new Set([T.ACCENT, T.ACCENT_SHADE]);
/** At or under this many pixels across, a guy is drawn for a small size (`forSmall`). */
const SMALL_SIZE = 36;
/**
* A guy drawn small, in a board's row or beside a name, is a pixel or two a
* cell, and his face is what goes first: a catchlight takes half an eye, the
* soft highlight blots the forehead, and a dark ink that reads at 128 greys
* out. Small, each eye is solid, the highlight goes back to the body colour,
* and dark ink goes darker still. Nothing moves, so he is the same guy.
*/
function forSmall(grid, palette$1, keepShine$1 = false) {
	const eyeAt = (x, y) => grid[y]?.[x] === T.EYE;
	const out = grid.map((row, y) => row.map((t, x) => {
		if (t === T.WHITE && !keepShine$1 && (eyeAt(x - 1, y) || eyeAt(x + 1, y) || eyeAt(x, y - 1) || eyeAt(x, y + 1))) return T.EYE;
		if (t === T.LIGHT) return T.BODY;
		return t;
	}));
	const ink = palette$1.colors[T.EYE];
	if (!ink || contrast$2("#FFFFFF", ink) < 3) return {
		grid: out,
		palette: palette$1
	};
	const deep = mix$6(ink, "#000000", .45);
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
	if (ink && contrast$2(ink, "#000000") > 10) return resolveColor(palette$1, T.OUTLINE) ?? "#000000";
	if (!ink || contrast$2(white, ink) < 3) return white;
	const pale = near.some((t) => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast$2(white, resolveColor(palette$1, t) ?? "#000000") < 1.6);
	return pale ? mix$6(ink, white, .6) : white;
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
const rgb$5 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$2 = (a, b$1, t) => {
	const x = rgb$5(a), y = rgb$5(b$1);
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
const empty = (width$1 = FRAME_WIDTH) => Array.from({ length: FRAME_HEIGHT }, () => new Array(width$1).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted$1(grid, config, palette$1, small$1 = false, face = null, width$1 = FRAME_WIDTH) {
	const colors = paint(grid, config, palette$1, small$1, false);
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
	const [r, g, b$1] = rgb$5(c).map((v) => v / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1), l = (max + min) / 2, d = max - min;
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
	const chroma$1 = body ? Math.max(...rgb$5(body)) / 255 - Math.min(...rgb$5(body)) / 255 : 0, h = body ? hsl(body)[0] : 0;
	if (chroma$1 < .3 || h < 170 || h > 340) return [210, 300];
	if (h < 255) return [h + 50, Math.max(300, h + 80)];
	return h < 300 ? [h + 50, h + 80] : [210, h - 50];
}
/** A Lucky guy: a rainbow sheen sweeping across his skin every couple of seconds. */
function luckyShimmer(layer, t, seed) {
	const at = cycle(t + seed, 2200) * (FRAME_WIDTH + FRAME_HEIGHT + 14) - 7;
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.body) return;
		const d = Math.abs(x + y * .8 - at);
		if (d < 3) cell.c = mix$2(cell.c, hue(((t * 360 / fit$1(1800) + (x - y) * 22) % 360 + 360) % 360, .95, .68), d < 1.2 ? .6 : .3);
	}));
}
/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder, starry eyes glisten. `body` is the body's colour. */
function liveEyes(layer, kind, t, seed, body) {
	const [lo, hi] = kind === "galaxy" ? galaxyBand(body) : [0, 0];
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.eye) return;
		const k = cell.eye;
		if (kind === "galaxy") {
			if (k === T.WHITE) cell.c = wrap$1(t / steps(160, 5) + x * 3 + y * 2, 5) < 1.2 ? "#FFFFFF" : "#CBB8FF";
			else if (k !== T.EYE) {
				const [, s, l] = hsl(cell.c);
				cell.c = hue((lo + hi) / 2 + (hi - lo) / 2 * Math.sin(t / wave(380) + x * .9 + y * .7), s, l);
			}
		} else if (kind === "diamond") {
			const at = cycle(t + seed, 1400) * 24 - 4, d = Math.abs(x - y * .5 - at);
			if (k !== T.EYE) cell.c = mix$2(cell.c, "#E6FCFF", .25 + .2 * Math.sin(t / wave(250) + x));
			if (d < 1.5) cell.c = mix$2(cell.c, "#FFFFFF", d < .6 ? .9 : .5);
		} else if (kind === "dragon") {
			const flash = cycle(t + seed, 2e3) * fit$1(2e3) < 160;
			if (k === T.GOLD || k === T.GOLD_SHADE) cell.c = flash ? "#FFF6B0" : mix$2(cell.c, "#FF4A1C", .25 + .3 * (.5 + .5 * Math.sin(t / wave(260))));
		} else if (kind === "starry") {
			const ms = cycle(t + seed, 2400) * fit$1(2400);
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
	const f = cycle(t + phase, period) * fit$1(period);
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
function sparkle(layer, x, y, f, colors, shape$1 = sparkleAt) {
	for (const [dx, dy, k] of shape$1(f)) {
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
function sparkleRun(layer, spots, at, period, life, salt, colors, shape$1 = sparkleAt) {
	if (!spots.length) return;
	const f = cycle(at, period) / life;
	if (f >= 1) return;
	const [x, y] = spots[Math.floor(noise(tick(at, period), salt) * spots.length)];
	sparkle(layer, x, y, f, colors, shape$1);
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
/**
* `poseStill`, with which cells are the guy's own skin (`body`) and the frame row the eyes start on
* (`eyes`): what an emote that opens the head needs to know.
*/
function poseCells(input, pose, options = {}) {
	const { config, grid } = poser(input, options);
	const palette$1 = withItems(options.palette ?? paletteOf(config), config);
	const layer = painted$1(grid(pose), config, palette$1, false, null, FRAME_WIDTH);
	const looks$1 = GLANCES[pose];
	if (looks$1) keepShine(layer, painted$1(grid(looks$1[0]), config, palette$1, false, null, FRAME_WIDTH), grid(looks$1[0]), config, looks$1[1]);
	const body = layer.map((row) => row.map((cell) => !!cell?.body)), eyes$1 = faceOf(config).top + HEADROOM;
	if (!options.rare) return {
		colors: layer.map((row) => row.map((cell) => cell?.c ?? null)),
		body,
		eyes: eyes$1
	};
	const { step: step$1, of } = options.rare;
	const ring$1 = ringOf(config, options.rarity !== false);
	if (ring$1) for (const [x, y] of rim(layer)) layer[y][x] = {
		c: ringCell(ring$1, x, y, step$1),
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
	const c = rgb$5(h);
	return (Math.max(...c) - Math.min(...c)) / 255;
};
/** A colour's relative luminance, as contrast ratios read it. */
const luminance = (h) => {
	const [r, g, b$1] = rgb$5(h).map((v) => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
	return .2126 * r + .7152 * g + .0722 * b$1;
};
/** The luminance an aura's ring keeps between: 2 to 1 or more against a dark page (#18181B) and against white. */
const RING_DARKEST = .07, RING_LIGHTEST = .47;
/** `c` taken darker or lighter, as little as it needs, into the luminance a ring reads at on any page. */
function legible(c) {
	const l = luminance(c), toward = l > RING_LIGHTEST ? "#000000" : l < RING_DARKEST ? "#FFFFFF" : null;
	if (!toward) return c;
	for (let i = 1; i <= 20; i++) {
		const m = mix$2(c, toward, i / 20), lm = luminance(m);
		if (lm >= RING_DARKEST && lm <= RING_LIGHTEST) return m;
	}
	return c;
}
/** A colour's hue, 0 to 360. */
const hueOf = (h) => {
	const [r, g, b$1] = rgb$5(h), max = Math.max(r, g, b$1), d = max - Math.min(r, g, b$1);
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
	const x = rgb$5(a), y = rgb$5(b$1);
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
		colors: grade === 4 ? ["#FFE27A", "#E4AE39"] : [color, mix$2(color, "#000000", .35)],
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
function ringTurn(ring$1, at) {
	const s = steps(RING_STEP, ring$1.colors.length);
	return Math.floor(wrap$1(at, s * ring$1.colors.length) / s);
}
/** A ring cell's colour at (x, y) on turn `turn`: a grade's ring all one colour; an aura's in diagonal bands two cells wide, moved on a band a turn. */
function ringCell(ring$1, x, y, turn$1) {
	const n = ring$1.colors.length, band$2 = ring$1.bands ? Math.floor((x - y) / 2) : 0;
	return ring$1.colors[((band$2 + turn$1) % n + n) % n];
}
/** A little picture's cells with its dark outline, from its top-left: [x, y, colour]. */
function emoteCells(kind) {
	const { rows, open } = EMOTES[kind];
	const w = rows[0].length + 2, h = rows.length + 2;
	const inside$1 = (x, y) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
	const ink = (ch) => emoteInk(kind, ch) !== null;
	const cells = [];
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const ch = rows[y - 1]?.[x - 1], on$1 = emoteInk(kind, ch);
		const near = !on$1 && !(open && inside$1(x, y)) && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
		if (on$1 || near) cells.push([
			x,
			y,
			on$1 ?? EMOTE_INK
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
	const height = grid.length, width$1 = grid[0]?.length ?? 0;
	const lit$1 = (row) => row.slice(0, cols).some(Boolean);
	const head$1 = grid.findIndex(lit$1);
	if (head$1 < 0) return;
	let skinTop = -1;
	for (let y = 0; y < height && skinTop < 0; y++) for (let x = 0; x < cols; x++) if (skin(x, y)) {
		skinTop = y;
		break;
	}
	const cut = Math.max(head$1 + 1, Math.min((skinTop < 0 ? head$1 : skinTop) + 2, eyes$1 - 1));
	const span$1 = (row) => {
		const xs = (row ?? []).slice(0, cols).flatMap((c, x) => c ? [x] : []);
		return xs.length ? [xs[0], xs[xs.length - 1]] : null;
	};
	const at = cut < height ? span$1(grid[cut]) : null;
	if (!at || lift < 1) return;
	const [left, right] = at, mid = (left + right) / 2;
	const put$1 = (x, y, c) => {
		if (x >= 0 && y >= 0 && x < width$1 && y < height && !grid[y][x]) grid[y][x] = cell(c);
	};
	const lid = grid.slice(0, cut).map((row) => row.slice(0, cols));
	for (let y = 0; y < cut; y++) for (let x = 0; x < cols; x++) grid[y][x] = null;
	lid.forEach((row, y) => row.forEach((c, x) => {
		if (c && y - lift >= 0) grid[y - lift][x] = c;
	}));
	const [ul, ur] = span$1(lid[cut - 1]) ?? at;
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
				const star$2 = (x * 5 + y * 3 + step$1) % 7 === 0, dust = (x * 3 + y * 7) % 5 === 0;
				put$1(x, y, x === a || x === b$1 ? EMOTE_INK : star$2 ? STARS[(x + y) % 2] : dust ? DUST : VOID);
			}
		}
		for (let i = 0; i < 2; i++) {
			const s = (step$1 + i * 3) % 6, side = i ? 1 : -1;
			put$1(Math.round(mid + side * ((right - left) / 2 - 1 + (s >> 1))), top + 1 - (s >> 1), STARS[i]);
		}
	}
}
/** The lid's step `at` ms into a move: six steps of LID_STEP_MS, round and round. */
const lidStep = (at) => Math.floor(wrap$1(at, fit$1(LID_STEP_MS * 6)) / (fit$1(LID_STEP_MS * 6) / 6)) % 6;
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
			const base$1 = compose(figure), mouth$1 = poseMouth(pose, config.mouth), looks$1 = GLANCES[pose];
			const worn = mouth$1 === void 0 ? base$1 : compose({
				...figure,
				mouth: mouth$1,
				arms: pose === "laughWave" ? 2 : figure.arms
			});
			grids.set(pose, pose === "shut" ? closeEyes(base$1, config) : looks$1 ? glance(grid(looks$1[0]), config, looks$1[1]) : pose === "frown" || pose === "content" || pose === "huff" || pose === "oops" ? closeEyes(worn, config) : pose === "blush" ? compose({
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
	const alone = buddyAlone(config), W = alone?.[0].length ?? FRAME_WIDTH;
	const wornAura = auraOf(config);
	const fxCopies = FRAME_SLOTS.map((slot) => config.owned?.[slot]);
	const withFx = fxCopies.some((o) => o?.fx);
	const lucky = !!config.lucky && options.rarity !== false && !options.small;
	const liveEye = options.small ? void 0 : LIVE_EYES.get(config.eyes);
	const canWave = JSON.stringify(grid("wave")) !== JSON.stringify(grid("sides"));
	const plan$1 = squashPlan(config, figure, grid);
	const layers = new Map();
	const layerOf = (pose) => {
		if (!layers.has(pose)) {
			const layer = painted$1(grid(pose), config, palette$1, !!options.small, liveEye ? faceOf(figure) : null, W), looks$1 = GLANCES[pose];
			if (looks$1) keepShine(layer, layerOf(looks$1[0]), grid(looks$1[0]), config, looks$1[1]);
			layers.set(pose, layer);
		}
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
	const backdrop$1 = backdropColors(config, palette$1, 0, 0, W, FRAME_HEIGHT);
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
	const opens = opensHead(options.emote) ? options.emote : void 0;
	const headTop = (layer) => layer.findIndex((row) => row.slice(0, GRID_SIZE).some(Boolean));
	const baseHead = opens ? headTop(layerOf("base")) : 0, baseEyes = faceOf(config).top + HEADROOM;
	const ring$1 = wornAura ? options.glance ? ringColours(-1, wornAura, config.owned?.aura) : null : ringColours(grade);
	const ringPhase = wornAura ? (config.owned?.aura?.print ?? 0) * 37 : seed;
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
	const trailFrom = grade >= 3 && !wornAura ? [mix$2(gradeColor, "#000000", .2), mix$2(gradeColor, "#000000", .55)] : [];
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
			const at = cycle(t$1 + phase, 1600) * (W + FRAME_HEIGHT + 8) - 4;
			layer.forEach((row, y) => row.forEach((cell, x) => {
				if (!cell?.item) return;
				const d = Math.abs(x + y - at);
				if (d < 1) cell.c = mix$2(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix$2(cell.c, "#FFFFFF", .25);
			}));
		}
		if (lucky) luckyShimmer(layer, t$1, seed);
		if (liveEye) liveEyes(layer, liveEye, t$1, seed, palette$1.colors[T.BODY]);
		if (lucky && !wornAura && grade < 3 && !goldMark) sparkleRun(layer, headSpots, t$1 + seed * 7, 2300, .55, seed, GOLD_SPARKLE, starAt);
		if (goldMark) sparkleRun(layer, headSpots, t$1 + goldCopy.print * 37, 2600, .55, goldCopy.print, GOLD_SPARKLE, starAt);
		const around = ring$1 ? rim(layer) : [];
		if (beat.stars) {
			const gold = sparkleIn(palette$1.colors[T.GOLD] ?? "#F2C230");
			for (let i = 0; i < 2; i++) sparkleRun(layer, headSpots, t$1 + i * fit$1(360) / 2 + seed, 360, 1, seed + i, gold);
		}
		if (beat.drop) sweatDrop(layer, beat.slide ?? 0);
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote && !opens) emote(layer, options.emote, false, Math.floor(wrap$1(t$1, fit$1(800)) / (fit$1(800) / 2)) % 2);
		const outside = [];
		if (wornAura && !options.glance) {
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
		} else if (ring$1) {
			const turn$1 = ringTurn(ring$1, t$1 + ringPhase);
			for (const [x, y] of around) if (!layer[y][x]) layer[y][x] = {
				c: ringCell(ring$1, x, y, turn$1),
				item: false
			};
		}
		if (grade >= 3 && !wornAura) {
			const colors$1 = grade === 4 ? GOLD_SPARKLE : sparkleIn(gradeColor), count$1 = grade === 4 ? 2 : 1;
			for (let i = 0; i < count$1; i++) sparkleRun(layer, spots, t$1 + phase + i * fit$1(1700) / count$1, 1700, .5, phase + i, colors$1);
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
	for (const frame$1 of frames$1) {
		if (t < frame$1.ms) return frame$1;
		t -= frame$1.ms;
	}
	return frames$1[frames$1.length - 1];
}
/** Draws a frame at (x, y), each pixel `scale` units square. */
function drawFrame(ctx, frame$1, x = 0, y = 0, scale$1 = 1) {
	frame$1.colors.forEach((row, py) => row.forEach((c, px) => {
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
	const groups = anim.frames.map((frame$1, i) => {
		const start = pct(at), end = pct(at + frame$1.ms);
		at += frame$1.ms;
		const last = i === anim.frames.length - 1;
		const keys = i === 0 ? `0%{visibility:visible}${end}%{visibility:hidden}${last ? "" : "100%{visibility:hidden}"}` : `0%{visibility:hidden}${start}%{visibility:visible}${last ? "100%{visibility:visible}" : `${end}%{visibility:hidden}100%{visibility:hidden}`}`;
		css.push(`.${id} .f${i}{animation-name:${id}-${i}}@keyframes ${id}-${i}{${keys}}`);
		const rects = frame$1.colors.flatMap((row, y) => runs(row).map((r) => `<rect x="${r.x}" y="${y}" width="${r.width}" height="1" fill="${r.color}"/>`));
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
	const small$1 = options.small ?? size <= SMALL_SIZE;
	const colors = paint(compose(config), config, palette$1, small$1);
	const box = small$1 ? bounds(colors, options.square ? 0 : 3) : {
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
const clamp$1 = (x, a, b$1) => Math.min(Math.max(x, a), b$1);
const step = (edge, x) => x < edge ? 0 : 1;
const smoothstep = (a, b$1, x) => {
	const t = clamp$1((x - a) / (b$1 - a), 0, 1);
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
const band$1 = (d, time, print) => 1 - clamp$1(Math.abs(mod(d - time * 10 + print, 60) - 30) - .5, 0, 1);
/** `soft` from GLSL_COMMON: a wide, soft band of light, three cells either side of its middle. */
const soft = (d, time, print) => 1 - clamp$1(Math.abs(mod(d - time * 10 + print, 60) - 30) / 3, 0, 1);
/**
* `finishColor` from GLSL_COMMON. `finish` is an index in SHADER_FINISHES.
* Each finish moves in smooth light across the whole item, never pixel by
* pixel: Tempered and Gold a soft sheen and a fine glint, Nebula a slow drift
* of its colours and a few fixed stars pulsing, Prism its rainbow sweeping
* round, Negative a slow pulse.
*/
function finishColor(c, finish, scuff, h, d, row, print, time, scan) {
	const b$1 = band$1(d, time, print), w = soft(d, time, print);
	const coat = clamp$1(1 - scuff * 1.4, 0, 1) * step(scuff * .55, h);
	if (finish < .5) return add(c, b$1 * .45 * step(scuff, .07));
	if (finish < 1.5) {
		const s = .5 + .5 * Math.sin(d * .8 - time * TAU$2 / 2 + print);
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
		const shifted = hueShift(c, .32 * Math.sin(time * TAU$2 / 6 + d * .12 + fract(print * .618) * TAU$2) * coat);
		const s = Math.max(0, Math.sin(time * TAU$2 / 3 + h * 97));
		return mix$1(shifted, [
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
const toByte = (v) => Math.round(clamp$1(v, 0, 1) * 255);
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
	const { x, y, region, h, rgb: rgb$9 } = pixels, n = region.length;
	if (ed < .5) return (_, out) => out.set(rgb$9);
	const at = new Float32Array(n);
	for (let k = 0; k < n; k++) at[k] = mod(x[k] + y[k] * .6 + v * 13, 60);
	/** `sweep(at, time, width)`, with T = time * 10 brought into 0 to 60. */
	const band$2 = (k, T$1, width$1) => {
		let u = at[k] - T$1;
		if (u < 0) u += 60;
		const d = Math.abs(u - 30) / width$1;
		return d > 1 ? 0 : 1 - d;
	};
	const a = new Float32Array(n * 3), s = new Float32Array(n), c2 = new Float32Array(n);
	if (ed < 1.5) {
		for (let k = 0; k < n; k++) {
			const r = rgb$9[k * 3], g = rgb$9[k * 3 + 1], b$1 = rgb$9[k * 3 + 2], l = .299 * r + .587 * g + .114 * b$1;
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
				const w = .5 + .5 * (s[k] * ca - c2[k] * sa), w2 = w * w, m = w2 * w2 * w2 * .22 + band$2(k, T$1, 5) * .4;
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
				const t = .5 + .5 * (s[k] * ca - c2[k] * sa), m = .55 * (region[k] > 1.5 ? .6 : 1), add$1 = lift[k] + band$2(k, T$1, 5) * .25;
				const tr = 1 + -.72 * t, tg = .3 + .32 * t, tb = .42 + .5800000000000001 * t;
				const r = rgb$9[k * 3], g = rgb$9[k * 3 + 1], b$1 = rgb$9[k * 3 + 2];
				out[k * 3] = r + (r * .5 + tr * .55 - r) * m + add$1;
				out[k * 3 + 1] = g + (g * .5 + tg * .55 - g) * m + add$1;
				out[k * 3 + 2] = b$1 + (b$1 * .5 + tb * .55 - b$1) * m + add$1;
			}
		};
	}
	if (ed < 3.5) {
		const lum$3 = new Float32Array(n);
		for (let k = 0; k < n; k++) {
			const r = rgb$9[k * 3], g = rgb$9[k * 3 + 1], b$1 = rgb$9[k * 3 + 2];
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
			const T$1 = mod(time * 10, 60), ct = Math.cos(time * TAU$2 / 6), st = Math.sin(time * TAU$2 / 6);
			for (let k = 0; k < n; k++) {
				const I = s[k] * ct + c2[k] * st, Q = c2[k] * ct - s[k] * st, Y = lum$3[k];
				const hh = fract(a[k] - time / 6), add$1 = band$2(k, T$1, 5) * .18;
				const hr = Y + .956 * I + .621 * Q, hg = Y - .272 * I - .647 * Q, hb = Y - 1.106 * I + 1.703 * Q;
				out[k * 3] = hr + (rgb$9[k * 3] * .45 + hsv1(hh, 1) * .6 - hr) * .5 + add$1;
				out[k * 3 + 1] = hg + (rgb$9[k * 3 + 1] * .45 + hsv1(hh, 2 / 3) * .6 - hg) * .5 + add$1;
				out[k * 3 + 2] = hb + (rgb$9[k * 3 + 2] * .45 + hsv1(hh, 1 / 3) * .6 - hb) * .5 + add$1;
			}
		};
	}
	if (ed < 4.5) {
		for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) {
			const m = 1 - rgb$9[k * 3 + j];
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
				const w = band$2(k, T$1, 5) * .6;
				out[k * 3] = a[k * 3] + .3 * w;
				out[k * 3 + 1] = a[k * 3 + 1] + .16 * w;
				out[k * 3 + 2] = a[k * 3 + 2] + .5 * w;
			}
		};
	}
	if (ed < 5.5) return (time, out) => {
		const T$1 = mod(time * 10, 60);
		for (let k = 0; k < n; k++) {
			const win = region[k] > 1.5, m = win ? band$2(k, T$1, 9) * .16 : band$2(k, T$1, 5) * .6;
			const lr = 1, lg = win ? .94 : .97, lb = win ? .78 : .84;
			out[k * 3] = rgb$9[k * 3] + (lr - rgb$9[k * 3]) * m;
			out[k * 3 + 1] = rgb$9[k * 3 + 1] + (lg - rgb$9[k * 3 + 1]) * m;
			out[k * 3 + 2] = rgb$9[k * 3 + 2] + (lb - rgb$9[k * 3 + 2]) * m;
		}
	};
	const lum$2 = new Float32Array(n), hue$2 = new Float32Array(n), chroma$1 = new Float32Array(n);
	for (let k = 0; k < n; k++) {
		const z = region[k] > 1.5 ? 7 : 12, qx = (x[k] - o[0]) / z, qy = (y[k] - o[1]) / z;
		const r = Math.hypot(qx, qy), turn$1 = Math.atan2(qy, qx) + r * 1.8;
		s[k] = Math.cos(turn$1) * r;
		c2[k] = Math.sin(turn$1) * r;
		const cr = rgb$9[k * 3], cg = rgb$9[k * 3 + 1], cb = rgb$9[k * 3 + 2];
		const i = .596 * cr - .274 * cg - .322 * cb, q = .211 * cr - .523 * cg + .312 * cb;
		lum$2[k] = .299 * cr + .587 * cg + .114 * cb;
		hue$2[k] = Math.atan2(q, i);
		chroma$1[k] = Math.hypot(i, q);
		a[k] = (x[k] - y[k]) * .16;
	}
	/** A glint opening on a pixel whose noise is high enough. */
	const glint$1 = (k, time) => {
		if (h[k] < .965) return 0;
		const g = Math.max(0, Math.sin(time * TAU$2 / 2 + h[k] * 91)), g2 = g * g;
		return g2 * g2 * g2 * .6;
	};
	return (time, out) => {
		const T$1 = mod(time * 10, 60), th = time * TAU$2 / 6, ct = Math.cos(th), st = Math.sin(th), B = time * TAU$2 / 3;
		for (let k = 0; k < n; k++) {
			const wx = s[k] * ct + c2[k] * st, wy = c2[k] * ct - s[k] * st;
			const f = Math.floor((.5 + .5 * sine(wx * 3.2 + sine(wy * 2.6 + B) * 1.5)) * 3.99);
			const r = rgb$9[k * 3], g = rgb$9[k * 3 + 1], b$1 = rgb$9[k * 3 + 2], gl = glint$1(k, time);
			if (region[k] > 1.5) {
				const m$1 = .7 + .25 * f, add$2 = band$2(k, T$1, 5) * .12 + gl;
				out[k * 3] = r * m$1 + add$2;
				out[k * 3 + 1] = g * m$1 + add$2;
				out[k * 3 + 2] = b$1 * m$1 + add$2;
				continue;
			}
			const m = .86 + .1 * f, turn$1 = hue$2[k] + .4 * Math.sin(a[k] + th + v), ch = chroma$1[k] * m, Y = lum$2[k] * m;
			const I = ch * Math.cos(turn$1), Q = ch * Math.sin(turn$1), add$1 = band$2(k, T$1, 5) * .35 + gl;
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
function shineData(frame$1, owned = {}) {
	const W = frame$1.colors[0].length;
	const colors = new Uint8Array(W * FRAME_HEIGHT * 4);
	const info = new Uint8Array(W * FRAME_HEIGHT * 4);
	const noise$3 = new Uint8Array(W * FRAME_HEIGHT * 4);
	frame$1.colors.forEach((row, y) => row.forEach((c, x) => {
		if (!c) return;
		const i = (y * W + x) * 4;
		colors.set([
			parseInt(c.slice(1, 3), 16),
			parseInt(c.slice(3, 5), 16),
			parseInt(c.slice(5, 7), 16),
			255
		], i);
		const slot = frame$1.slots[y][x];
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
const shines = (frame$1, owned = {}) => frame$1.slots.some((row) => row.some((slot) => slot > 0 && SHADER_FINISHES.includes(owned?.[FRAME_SLOTS[slot - 1]]?.finish)));
/**
* The shader's picture, in plain code: the frame with each copy's finish
* running `ms` into its loop, as RGBA bytes. The same colours the GPU draws.
*/
function shineFrame(frame$1, owned, ms) {
	const { colors, info, noise: noise$3 } = shineData(frame$1, owned);
	const out = new Uint8ClampedArray(colors);
	const time = loopSeconds(ms), W = frame$1.colors[0].length;
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
		draw(frame$1, owned, ms) {
			const { colors, info, noise: noise$3 } = shineData(frame$1, owned), W = frame$1.colors[0].length;
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
	const s = SURFACES[kind], wear$3 = Math.round(Math.min(1, Math.max(0, scuff)) * 10) / 10;
	return {
		kind,
		...s,
		roughness: Math.min(1, +(s.roughness + wear$3 * .55).toFixed(3)),
		clearcoat: +(s.clearcoat * (1 - wear$3)).toFixed(3)
	};
}
const lum = (hex$4) => {
	const n = parseInt(hex$4.slice(1, 7), 16);
	return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex$4, k) => {
	const n = parseInt(hex$4.slice(1, 7), 16), f = (v) => Math.round(v * k).toString(16).padStart(2, "0");
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
function voxelColumns(frame$1, owned = {}, options = {}) {
	const C$1 = frame$1.colors, S$1 = frame$1.slots, H = C$1.length, W = C$1[0]?.length ?? 0, small$1 = !!options.item;
	const slotName = (s) => [
		"skin",
		"hat",
		"frame",
		"buddy"
	][s - 1];
	const figure = inset(W, H, (x, y) => !!C$1[y][x] && S$1[y][x] !== 3 && S$1[y][x] !== 4);
	const buddy = inset(W, H, (x, y) => !!C$1[y][x] && S$1[y][x] === 4);
	const feature = (x, y) => {
		const c = C$1[y][x];
		if (!c || S$1[y][x] !== 0 || figure[y][x] < 2) return 0;
		const l = lum(c);
		return l < .22 ? .45 : l > .86 ? .3 : 0;
	};
	const front = Array.from({ length: H }, () => new Array(W).fill(-Infinity));
	const span$1 = Array.from({ length: H }, () => new Array(W).fill(null));
	let deepest = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const c = C$1[y][x], s = S$1[y][x];
		if (!c || s === 3) continue;
		const d = s === 4 ? buddy[y][x] : figure[y][x];
		let t = small$1 ? 1 + .45 * Math.min(d, 3) : 1.3 + 1.05 * Math.min(d, 4);
		if (s === 4 && !small$1) t *= .82;
		if (s === 2 && !small$1) t += .5;
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
		const c = C$1[y][x], s = S$1[y][x];
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
				const n = C$1[y + dy]?.[x + dx];
				return !!n && !feature(x + dx, y + dy) && lum(n) >= .22 && lum(n) <= .86;
			});
			if (around) back = C$1[y + around[1]][x + around[0]];
		}
		const color = shade$1 ? darken(c, 1 - shade$1 * .045) : c;
		let side = color;
		if (lum(c) < .3 && (s === 4 ? buddy[y][x] : figure[y][x]) === 1) {
			const inside$1 = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].map(([dx, dy]) => C$1[y + dy]?.[x + dx]).filter((n) => !!n && lum(n) >= .3);
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
const linear = (hex$4) => {
	const n = parseInt(hex$4.slice(1, 7), 16);
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
	const quad = (a, b$1, c, d, n, rgb$9) => {
		const shaded$1 = [
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
			nor.push(...shaded$1[i]);
			col.push(...rgb$9);
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
	let boxes$1 = [all];
	let weights = [weigh(all)];
	while (boxes$1.length < 255) {
		let best = -1, bk = 0, bw = -1;
		boxes$1.forEach((box$1, i) => {
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
		const box = boxes$1[best].sort((a, b$1) => ch(a[0], bk) - ch(b$1[0], bk));
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
		boxes$1.splice(best, 1, lo, hi);
		weights.splice(best, 1, weigh(lo), weigh(hi));
	}
	return boxes$1.map((box) => {
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
	const frames$1 = input.frames.map((f) => {
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
		frames: frames$1
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
function changed(a, b$1, W, H) {
	let x0 = W, y0 = H, x1 = -1, y1 = -1;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
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
	const W = input.width * scale$1, H = input.height * scale$1, n = input.frames.length;
	const frames$1 = input.frames.map((f) => upscale(f, input.width, input.height, scale$1));
	const colours = palette(frames$1);
	const table = [0, ...colours];
	let bitsPer = 1;
	while (1 << bitsPer < table.length) bitsPer++;
	const out = [];
	const word = (n$1) => out.push(n$1 & 255, n$1 >> 8 & 255);
	out.push(...[..."GIF89a"].map((c) => c.charCodeAt(0)));
	word(W);
	word(H);
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
	frames$1.forEach((f, k) => {
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
		const before = whole[k] ? null : frames$1[k - 1];
		const idx = new Uint8Array(bw * bh);
		for (let y = 0, p = 0; y < bh; y++) for (let x = 0; x < bw; x++, p++) {
			const i = ((by + y) * W + bx + x) * 4;
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
/** The `w` by `h` box at `x`, `y` of a picture `W` wide. */
function crop(rgba, W, x, y, w, h) {
	if (x === 0 && w === W) return rgba.subarray(y * W * 4, (y + h) * W * 4);
	const out = new Uint8ClampedArray(w * h * 4);
	for (let r = 0; r < h; r++) out.set(rgba.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
	return out;
}
async function png(input, scale$1, animated, plays = 0) {
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
	if (animated) parts.push(chunk("acTL", concat([u32(frames$1.length), u32(plays)])));
	for (let i = 0; i < frames$1.length; i++) {
		const box = i === 0 ? null : changed(input.frames[i - 1], input.frames[i], input.width, input.height);
		const [bx, by, bw, bh] = i === 0 ? [
			0,
			0,
			W,
			H
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
		const data = await zlib(rows(i === 0 ? frames$1[i] : crop(frames$1[i], W, bx, by, bw, bh), bw, bh));
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
* An animated PNG of the frames, looping for ever, or played `plays` times and
* left on its last frame (a capsule's open plays once). Browsers play it in a
* plain `<img>` with no script, keep its transparency whole, and a still viewer
* shows its first frame. Scale it up by whole pixels here, or in CSS with
* `image-rendering: pixelated`.
*/
function encodeApng(input, scale$1 = 1, plays = 0) {
	return png(input, scale$1, true, plays);
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
function paintColors(colors, hue$2) {
	const main = unhex(hue$2), h = toHsl(main)[0];
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
	const { x, y, region, rgb: rgb$9 } = pixels, n = region.length;
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
		const { colors: [c1, c2, c3], contrast: contrast$3, form: [family, k, ox, oy], phase } = paint$1 ?? {
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
		const w = .5 / contrast$3, k1v = new Float32Array(nb), k2v = new Float32Array(nb), arms$1 = Math.abs(k), turn$1 = Math.sign(k);
		return (time, out) => {
			const th = time * TAU$1 / 6;
			if (family === 0) for (let b$1 = 0; b$1 < nb; b$1++) val[b$1] = .5 + .5 * sin(arms$1 * aa[b$1] + turn$1 * 5 * rr[b$1] - th + phase + .7 * sin(2.3 * rr[b$1] - th) + .5 * sin(qx[b$1] * 2 - qy[b$1] * 1.6 + th));
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
					out[j] = rgb$9[j];
					out[j + 1] = rgb$9[j + 1];
					out[j + 2] = rgb$9[j + 2];
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
		const ux0 = Float32Array.from(bx, (d) => d / 10 * 1.6), uy0 = Float32Array.from(by, (d) => d / 10 * 1.6), lum$2 = new Float32Array(n);
		for (let k = 0; k < n; k++) lum$2[k] = .42 + .5 * (.299 * rgb$9[k * 3] + .587 * rgb$9[k * 3 + 1] + .114 * rgb$9[k * 3 + 2]);
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
					const ch = lum$2[k] * CHROME[i];
					out[j + i] = ch + (1 - ch) * .4 * d;
				}
			}
		};
	}
	const ax = Float32Array.from(bx, (d) => d + o[0]), ay = Float32Array.from(by, (d) => d + o[1]);
	const col = new Float32Array(nb * 3), w1 = new Float32Array(nb), w2 = new Float32Array(nb), rim$2 = new Float32Array(nb * 3);
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
			const v$1 = sin((ax[b$1] * .3 + ay[b$1] * .5) * .45 - th), band$2 = clamp01((v$1 - .6) / .3);
			w1[b$1] = band$2 * .16;
			w2[b$1] = band$2 * (1 - band$2) * 4 * .3;
			hslInto(rim$2, b$1 * 3, fract(.55 + .3 * v$1 + ay[b$1] * .01), .8, .7);
		}
		for (let k = 0; k < n; k++) {
			const j = k * 3, b$1 = blockOf[k], win = region[k] > 1.5;
			for (let i = 0; i < 3; i++) {
				const c = rgb$9[j + i];
				if (look === 4) {
					const base$1 = c + (OPAL[i] - c) * .5;
					out[j + i] = base$1 + (col[b$1 * 3 + i] - base$1) * (win ? .45 : .3) * w1[b$1];
					continue;
				}
				const kk = win ? .6 : 1;
				out[j + i] = c + (c * .5 + col[b$1 * 3 + i] * .55 - c) * .5 * kk + BAND_LIGHT[i] * w1[b$1] * kk + rim$2[b$1 * 3 + i] * w2[b$1] * kk;
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
function sheenField(px, { x, y, region, rgb: rgb$9, raised }) {
	const n = region.length, s = new Float32Array(n), k = new Float32Array(n), star$2 = new Float32Array(px < .5 ? n * 2 : 0), lit$1 = new Float32Array(2);
	for (let i = 0; i < n; i++) {
		s[i] = x[i] + y[i];
		k[i] = (.65 + .35 * (raised?.[i] ?? 0)) * (region[i] > 1.5 ? .6 : 1);
		if (px < .5) GLINTS.forEach(([gx, gy], g) => {
			const qx = Math.abs(x[i] - gx) * 5, qy = Math.abs(y[i] - gy) * 5, a = Math.min(qx, qy), b$1 = Math.max(qx, qy);
			star$2[i * 2 + g] = b$1 < .5 ? 1 : a < .5 && b$1 < 3.5 ? .8 - .2 * b$1 : 0;
		});
	}
	return (time, out) => {
		const pos = sheenPos(time);
		for (let g = 0; g < 2; g++) lit$1[g] = clamp01(1 - Math.abs(GLINTS[g][0] + GLINTS[g][1] - pos) / 1.2);
		for (let i = 0; i < n; i++) {
			const j = i * 3, d = Math.abs(s[i] - pos), g = star$2.length ? star$2[i * 2] * lit$1[0] + star$2[i * 2 + 1] * lit$1[1] : 0;
			if (d >= 4.5 && !g) {
				out[j] = rgb$9[j];
				out[j + 1] = rgb$9[j + 1];
				out[j + 2] = rgb$9[j + 2];
				continue;
			}
			const halo = clamp01(1 - d / 4.5), glow = clamp01(1 - d / 2.2), core = clamp01(1 - d / .7), kk = k[i];
			const a = halo * halo * .35 * kk, b$1 = glow * .55 * kk, c = core * .85 * kk;
			for (let ch = 0; ch < 3; ch++) {
				let v = rgb$9[j + ch];
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
const rgb$4 = (h) => {
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
const glyph = (ch) => EXTRA[ch] ?? GLYPHS[ch] ?? GLYPHS["?"];
/** Whether the card's pixel type has a glyph for `ch` (anything else is written "?"). */
const hasGlyph = (ch) => ch in EXTRA || ch in GLYPHS;
/** How wide a line of text is, in pixels. */
const textWidth = (s) => [...s].reduce((w, ch) => w + glyph(ch)[0], 0);
/** A line of text made to fit `width` on one line: as it is, a pixel tighter between letters, or cut short with "…". */
function fitLine(text, width$1) {
	const wide = (t, spacing) => textWidth(t) + spacing * ([...t].length - 1);
	if (wide(text, 0) <= width$1) return {
		text,
		spacing: 0
	};
	if (wide(text, -1) <= width$1) return {
		text,
		spacing: -1
	};
	const chars = [...text];
	while (chars.length > 1 && wide(chars.join("").trimEnd() + "…", -1) > width$1) chars.pop();
	return {
		text: chars.join("").trimEnd() + "…",
		spacing: -1
	};
}
/** The grade badge's room either side of its word, and the gap after it: tight, so a rank beside it fits whole. */
const PILL_PAD = 6, PILL_GAP = 4;
/** The line beside the badge, fitted to `width`; a rank ("Top 0.055%") drops its "Top" rather than be cut. */
function rankFit(text, width$1) {
	const fit$2 = fitLine(text, width$1);
	return fit$2.text === text ? fit$2 : fitLine(text.replace(/^Top (?=\d)/, ""), width$1);
}
/** How wide the line beside a badge reading `pill` may be. */
const rankRoom = (pill) => CARD_WIDTH - M * 2 - 10 - textWidth(pill) - PILL_PAD * 2 - PILL_GAP;
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
				const [adv, rows] = glyph(ch);
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
], WHITE$3 = [
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
	const W = CARD_WIDTH, H = BODY_HEIGHT, depth = new Uint8Array(W * H), bevel = new Uint8Array(W * H);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (!inside(x, y)) continue;
		let d = 1;
		while (d < 9 && inside(x - d, y) && inside(x + d, y) && inside(x, y - d) && inside(x, y + d)) d++;
		const lit$1 = !inside(x - 3, y) || !inside(x, y - 3), deep = !inside(x + 3, y) || !inside(x, y + 3);
		depth[y * W + x] = d;
		bevel[y * W + x] = deep ? 2 : lit$1 ? 1 : 0;
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
* hop leaves the floor. A frame item's backdrop doesn't count: it fills the
* whole window behind them.
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
function cardArt(input, anim, owned, g, ed, looks$1 = {}) {
	const edge = looks$1.edge ?? "none", grid = edge === "none";
	const zoom = ZOOM, nudge = buddyNudge(anim, grid);
	const cellX = (gx, slot) => gx * zoom - (gx >= FRAME_WIDTH && slot !== 5 ? nudge : 0);
	const fit$2 = cardFit(anim.frames, anim.width, cellX), shape$1 = cardShape();
	const lastCopy = input.copies?.[input.copies.length - 1];
	const shift$1 = lastCopy ? lastCopy.print * 37 : [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6e3, 0);
	const v = lastCopy ? lastCopy.print % 4 : 0;
	const W = CARD_WIDTH, H = BODY_HEIGHT, side = M;
	const s = new Surface(W, H);
	const gold = ed === 5, aura = ed === 6, neg = ed === 4;
	const framed = gold && looks$1.gold !== "brushed", struck = gold && !framed;
	const gc = g >= 0 ? rgb$4(GRADES[g].color) : [
		104,
		118,
		146
	];
	const auraCopy = owned.aura;
	const ah = aura && auraCopy ? rgb$4(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
	const tone = aura ? ah : gc;
	const textW = W - M * 2 - 10, left = side + 5;
	const copies = input.copies ?? [];
	const topCopy = copies.filter((o) => GRADES.findIndex((x) => x.id === gradeOf(o).id) === g).pop();
	const unusualCopy = [...copies].reverse().find((o) => unusual(o) && o.fx);
	const pill = input.lines?.[0] ? unstarred(input.lines[0]) : void 0;
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
	const pillW = pill ? textWidth(pill) + PILL_PAD * 2 : 0;
	const subW = pill ? rankRoom(pill) : textW;
	const sub = input.lines?.[1] ? rankFit(unstarred(input.lines[1]), subW) : void 0;
	const plateBottom = H - 1 - 6;
	let y = plateBottom - 3 - footH;
	const footTop = y;
	if (footH) y -= 2;
	const plateRowTop = plateRow ? y -= 14 : y;
	if (plateRow) y -= 2;
	const pillTop = pill || sub ? y -= 15 : y;
	if (pill || sub) y -= 3;
	y -= 12;
	const titleTop = y;
	const plateTop = y - 3;
	const WIN = {
		left: side,
		right: W - 1 - side,
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
		if (framed) return mix(DARK_HI, DARK_LO, yy / H);
		if (gold) {
			const base$1 = mix(GOLD_HI, GOLD_LO, yy / H * .9 + .08 * Math.sin(x * .05 + yy * .02));
			return yy % 3 === 0 ? mix(base$1, GOLD_LO, .12) : base$1;
		}
		if (neg) return mix(mix(IVORY$2, tone, .35), mix(IVORY$2, tone, .6), yy / H);
		return mix(mix(tone, WHITE$3, .08), mix(tone, INK$2, .25), yy / H);
	};
	const rows = Array.from({ length: H }, (_, yy) => gold ? null : stock(0, yy));
	const auraDeep = mix(ah, INK$2, .62), auraLight = mix(ah, INK$2, .3), inlay = mix(ah, WHITE$3, .7);
	const trim = new Uint8Array(W * H);
	for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) {
		const d = shape$1.depth[yy * W + x], bevel = shape$1.bevel[yy * W + x];
		if (!d) continue;
		if (d <= 2) {
			s.set(x, yy, INK$2);
			continue;
		}
		let c = rows[yy] ?? stock(x, yy);
		if (framed && bevel && d === 3) {
			c = bevel === 1 ? GOLD_LIGHT : GOLD_DEEP;
			trim[yy * W + x] = 1;
		} else if (struck && bevel) c = mix(mix([
			255,
			238,
			168
		], BRUSHED.bevelLo, (x + yy * 1.4) / (W + H * 1.4)), bevel === 1 ? WHITE$3 : INK$2, .2);
		else if (bevel === 1) c = mix(c, WHITE$3, .35);
		else if (bevel) c = mix(c, INK$2, .3);
		else if (aura && d <= 5) c = inlay;
		if (aura && d > 6) {
			const r = Math.hypot((x - wcx) / 80, (yy - wcy) / 100);
			s.set(x, yy, mix(auraDeep, auraLight, Math.max(0, 1 - r) ** 1.2), 2);
			continue;
		}
		s.set(x, yy, c, 1);
	}
	const light$4 = g >= 0 ? mix(IVORY$2, gc, .22) : mix(IVORY$2, gc, .12);
	/** A framed Grail's window: a few large soft bands of three golds, on blocks of two card pixels, holding still. */
	const fieldGold = (x, yy) => {
		const qx = ((x >> 1) * 2 - wcx) / 40, qy = ((yy >> 1) * 2 - wcy) / 40;
		const t = .5 + .5 * Math.sin(qy * 3.2 + 1.3 * Math.sin(qx * 2.4 + .6) + .6 * Math.sin(qx * 4.1 - qy * 1.7));
		const k1 = Math.min(1, Math.max(0, (t - .35) / .12 + .5)), k2 = Math.min(1, Math.max(0, (t - .72) / .12 + .5));
		return mix(mix(FIELD_GOLDS[0], FIELD_GOLDS[1], k1), FIELD_GOLDS[2], k2);
	};
	const own$1 = !aura && !gold && topCopy ? windowArt(topCopy, WIN, wcx, wcy) : null;
	if (!aura) for (let yy = WIN.top; yy <= WIN.bottom; yy++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$2 = x - WIN.left < 2 || WIN.right - x < 2 || yy - WIN.top < 2 || WIN.bottom - yy < 2;
		if (rim$2) {
			const inner = x - WIN.left === 1 || WIN.right - x === 1 || yy - WIN.top === 1 || WIN.bottom - yy === 1;
			if (framed && inner) trim[yy * W + x] = 1;
			s.set(x, yy, framed && inner ? BRIGHT_GOLD : struck && inner ? [
				255,
				226,
				140
			] : struck ? BRUSHED.rim : INK$2);
			continue;
		}
		const depth = (yy - WIN.top) / (WIN.bottom - WIN.top), r = Math.hypot((x - wcx) / 64, (yy - wcy) / 72);
		let c = framed ? fieldGold(x, yy) : !gold ? mix(light$4, mix(light$4, gc, .35), depth * .6) : mix(mix(AMBER, AMBER_GLOW, Math.max(0, 1 - r) ** 1.3), mix(AMBER, INK$2, .3), depth * .3);
		if (own$1) c = own$1(x, yy, 0);
		if (yy - WIN.top === 2 || x - WIN.left === 2) c = mix(c, INK$2, .35);
		s.set(x, yy, c, own$1 ? 3 : 2);
	}
	if (struck) for (const [sx, sy] of [
		[WIN.left + 1, WIN.top + 1],
		[WIN.right - 1, WIN.top + 1],
		[WIN.left + 1, WIN.bottom - 1],
		[WIN.right - 1, WIN.bottom - 1]
	]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
		const d = dx * dx + dy * dy, x = sx + dx, yy = sy + dy;
		if (d > 10 || shape$1.depth[yy * W + x] <= 2) continue;
		s.set(x, yy, d > 6 ? BRUSHED.quiet : mix([
			255,
			244,
			196
		], [
			196,
			128,
			26
		], (dx + dy + 4) / 8));
	}
	const onPlate = new Uint8Array(W * H);
	if (!struck) for (let yy = plateTop; yy <= plateBottom; yy++) for (let x = side; x <= W - 1 - side; x++) {
		const pw = W - side * 2, ph = plateBottom - plateTop + 1;
		if (!inBox(x - side, yy - plateTop, pw, ph, 4)) continue;
		const edge$1 = !inBox(x - side - 1, yy - plateTop, pw, ph, 4) || !inBox(x - side + 1, yy - plateTop, pw, ph, 4) || yy === plateTop || yy === plateBottom;
		const base$1 = aura ? mix(mix(ah, INK$2, .6), INK$2, .45) : PLATE$1;
		onPlate[yy * W + x] = 1;
		s.set(x, yy, edge$1 ? INK$2 : yy === plateTop + 1 ? mix(base$1, WHITE$3, .16) : yy >= plateBottom - 2 ? mix(base$1, INK$2, .45) : base$1);
	}
	const quiet = struck ? BRUSHED.quiet : aura ? mix(ah, WHITE$3, .6) : [
		184,
		176,
		206
	];
	const titleInk = (x, yy, tm) => mix(mix(ah, WHITE$3, .5), WHITE$3, .5 + .5 * Math.sin(x * .12 - tm / wave(1e3 / 2) + yy * .1));
	const titlePixels = [];
	s.text(titleFit.text, left, titleTop - 2, (x, yy) => {
		if (struck) return GOLD_INK;
		if (!aura) return WHITE$3;
		titlePixels.push(x, yy);
		return titleInk(x, yy, 0);
	}, struck ? GOLD_CUT : INK$2, titleFit.spacing);
	if (pill) {
		const w = pillW, x0 = left;
		const fill = struck ? BRUSHED.pill : framed ? BRIGHT_GOLD : tone;
		for (let yy = pillTop; yy < pillTop + 15; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - pillTop, w, 15, 4)) continue;
			const edge$1 = !inBox(x - x0 - 1, yy - pillTop, w, 15, 4) || !inBox(x - x0 + 1, yy - pillTop, w, 15, 4) || yy === pillTop || yy === pillTop + 14;
			s.set(x, yy, edge$1 ? INK$2 : yy >= pillTop + 12 ? mix(fill, INK$2, .45) : yy === pillTop + 1 ? mix(fill, WHITE$3, .4) : fill);
		}
		s.text(pill, x0 + PILL_PAD, pillTop - 1, () => struck ? [
			255,
			222,
			130
		] : framed ? PILL_INK : WHITE$3, framed ? GOLD_LIGHT : mix(fill, INK$2, .6));
	}
	if (sub) s.text(sub.text, pill ? left + pillW + PILL_GAP : left, pillTop - 1, () => quiet, void 0, sub.spacing);
	if (footFit) s.text(footFit.text, left, footTop - 2, () => quiet, void 0, footFit.spacing);
	if (plateRow) {
		const w = Math.min(textW, textWidth(plateRow.text) + plateRow.spacing * ([...plateRow.text].length - 1) + 10), x0 = left, fill = rgb$4(GRADES[plateGrade].color);
		const ink = plateGrade === 4 ? PILL_INK : WHITE$3;
		for (let yy = plateRowTop; yy < plateRowTop + 14; yy++) for (let x = x0; x < x0 + w; x++) {
			if (!inBox(x - x0, yy - plateRowTop, w, 14, 3)) continue;
			const edge$1 = !inBox(x - x0 - 1, yy - plateRowTop, w, 14, 3) || !inBox(x - x0 + 1, yy - plateRowTop, w, 14, 3) || yy === plateRowTop || yy === plateRowTop + 13;
			s.set(x, yy, edge$1 ? INK$2 : yy >= plateRowTop + 11 ? mix(fill, INK$2, .45) : yy === plateRowTop + 1 ? mix(fill, WHITE$3, .4) : fill);
		}
		s.text(plateRow.text, x0 + 5, plateRowTop - 2, () => ink, plateGrade === 4 ? GOLD_LIGHT : mix(fill, INK$2, .6), plateRow.spacing);
	}
	if (sealed) {
		const cx = W - 1 - side - 10, cy = footTop + 3;
		for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
			const d = dx * dx + dy * dy;
			if (d > 52) continue;
			const rim$2 = d > 38, notch = rim$2 && Math.round(Math.atan2(dy, dx) / (Math.PI / 8)) % 2 === 0;
			s.set(cx + dx, cy + dy, notch && d > 46 ? struck ? BRUSHED.pill : PLATE$1 : rim$2 ? INK$2 : d < 14 && dx + dy < 0 ? [
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
	const tag = new Surface(tagged ? W : 0, tagged ? H : 0);
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
			if (ink) for (let k = 0; k < 4; k++) tag.set(tagX + 3 + bx * 2 + (k & 1), y0 + 3 + by * 2 + (k >> 1), rgb$4(ink));
		}));
	}
	if (input.corner) {
		const w = textWidth(input.corner) + 6, x0 = WIN.right - 4 - w, y0 = WIN.top + 4;
		for (let yy = y0; yy < y0 + 14; yy++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (yy === y0 || yy === y0 + 13))) tag.set(x, yy, yy >= y0 + 12 ? [
			0,
			0,
			0
		] : INK$2);
		tag.text(input.corner, x0 + 3, y0 - 2, () => WHITE$3);
	}
	const tagIdx = [];
	if (tagged) {
		for (let i = 0; i < W * H; i++) if (tag.px[i * 4 + 3]) tagIdx.push(i);
	}
	const soul = aura;
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - fit$2.mid);
	const stand = soul ? Math.max(5 - fit$2.topAll * zoom, Math.round((WIN.top + WIN.bottom) / 2 - (fit$2.topAll + fit$2.footAll + 1) * zoom / 2) - 10) : Math.round((WIN.top + WIN.bottom + 1) / 2 - (fit$2.rest + fit$2.foot + 1) * zoom / 2) + 4;
	const roomTop = soul ? 3 : WIN.top + 2, roomFoot = WIN.bottom - 2;
	const highest = roomTop - fit$2.topAll * zoom, lowest = roomFoot + 1 - (fit$2.footAll + 1) * zoom;
	const oy0 = !grid ? stand : highest > lowest ? highest : Math.min(lowest, Math.max(highest, stand));
	const floor = Uint8Array.from(s.region, (r) => r === 2 || r === 3 ? 1 : 0);
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
		colors.forEach((row, j) => row.forEach((hex$4, i) => {
			const c = hex$4 ? rgb$4(hex$4) : INK$2;
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
	const look = struck ? 0 : lookFor(ed, topCopy?.finish, looks$1.look);
	const plays = (i) => framed ? s.region[i] === 2 || trim[i] === 1 : s.region[i] > 0 && s.region[i] < 3;
	const ownIdx = [];
	if (own$1?.moves) {
		for (let i = 0; i < W * H; i++) if (s.region[i] === 3) {
			const x = i % W, yy = (i - x) / W;
			if (yy - WIN.top !== 2 && x - WIN.left !== 2) ownIdx.push(i);
		}
	}
	const edIdx = [];
	for (let i = 0; i < W * H; i++) if (plays(i)) edIdx.push(i);
	const n = edIdx.length, ex = new Float32Array(n), ey = new Float32Array(n), er = new Uint8Array(n), eh = new Float32Array(n), ergb = new Float32Array(n * 3);
	const raised = new Float32Array(n);
	edIdx.forEach((i, k) => {
		const x = i % W, yy = (i - x) / W;
		ex[k] = x / 5;
		ey[k] = yy / 5;
		er[k] = s.region[i] || 1;
		eh[k] = shape$1.glint[(yy >> 1) * W + (x >> 1)];
		raised[k] = trim[i];
		for (let j = 0; j < 3; j++) ergb[k * 3 + j] = s.px[i * 4 + j] / 255;
	});
	const paint$1 = look === 1 ? {
		colors: paintColors(auraCopy ? auraColors(auraCopy.item, auraCopy.finish, auraCopy.print) : [GRADES[Math.max(0, g)].color], auraCopy ? auraHue(auraCopy.item, auraCopy.finish, auraCopy.print) : GRADES[Math.max(0, g)].color),
		contrast: looks$1.contrast ?? PAINT_CONTRAST,
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
	const clip = (cx, cy) => pop ? inside(cx, cy) && cx > 2 && cx < W - 3 && cy > 2 && cy < WIN.bottom - 1 : cy > WIN.top + 1 && cy < WIN.bottom - 1 && cx > WIN.left && cx < WIN.right;
	const edgeC = aura ? mix(ah, WHITE$3, .55) : struck ? [
		255,
		236,
		170
	] : WHITE$3;
	const room = new Uint8Array(W * H);
	for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (clip(x, yy)) room[yy * W + x] = pop && (yy <= WIN.top + 1 || x <= WIN.left + 1 || x >= WIN.right - 1) ? 2 : 1;
	const mask = new Uint8Array((anim.width * zoom + 4) * (FRAME_HEIGHT * zoom + 4));
	const lit$1 = new Float32Array((zoom * 2 - 1) * 3), litDone = new Uint8Array(zoom * 2 - 1);
	/**
	* His frame drawn into `body` with its top-left at `oy`: the sticker edge
	* round him, his pixels, each worn copy's finish on its own pixels (on the
	* card's raw clock `shineTime`, as the guy keeps it), and the soft shadows
	* on the window's floor under him and his buddy.
	*/
	const floors = new Map();
	const floorsOf = (frame$1, oy) => {
		let got = floors.get(frame$1);
		if (got) return got;
		const { colors, slots } = frame$1;
		got = [];
		for (const buddy of [false, true]) {
			let lo = -1, l = Infinity, r = -Infinity;
			const own$2 = (gx, gy) => !!colors[gy][gx] && slots[gy][gx] !== 5 && slots[gy][gx] !== 3 && slots[gy][gx] === 4 === buddy;
			colors.forEach((row, gy) => row.forEach((_, gx) => {
				if (own$2(gx, gy)) lo = gy;
			}));
			if (lo < 0) continue;
			for (let gy = Math.max(0, lo - 1); gy <= lo; gy++) colors[gy].forEach((_, gx) => {
				if (own$2(gx, gy)) {
					l = Math.min(l, cellX(gx, slots[gy][gx]));
					r = Math.max(r, cellX(gx, slots[gy][gx]) + zoom);
				}
			});
			got.push(ox + (l + r) / 2, Math.min(WIN.bottom - 7, oy + (lo + 1) * zoom - 3), Math.max(6, (r - l) * .38 + 2));
		}
		floors.set(frame$1, got);
		return got;
	};
	/**
	* The sticker edge round him for a frame of his move standing at `oy`, so his dark outline never sinks
	* into the window: each empty pixel two across or down from him, or one diagonally. Card pixel indices,
	* doubled, plus one where it turns white against the window's rim; kept by frame.
	*/
	const edges = new Map();
	const edgesOf = (frame$1, oy) => {
		let byY = edges.get(frame$1);
		if (!byY) edges.set(frame$1, byY = new Map());
		let got = byY.get(oy);
		if (got) return got;
		if (grid) {
			byY.set(oy, got = new Int32Array(0));
			return got;
		}
		const { colors, slots } = frame$1, fh = colors.length, fw = colors[0]?.length ?? 0;
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
	const drawGuy = (frame$1, oy, body$1, shineTime) => {
		const { colors, slots } = frame$1, fh = colors.length, fw = colors[0]?.length ?? 0;
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
		const fl = aura ? [] : floorsOf(frame$1, oy);
		for (let f = 0; f < fl.length; f += 3) {
			const sx = fl[f], sy = fl[f + 1], rx = fl[f + 2];
			const gy = grid ? sy + zoom : sy, reach = grid ? zoom : 0;
			for (let yy = Math.ceil(gy - 4 - reach); yy <= gy + 4 + reach; yy++) for (let x = Math.ceil(sx - rx - reach); x <= sx + rx + reach; x++) {
				if (x < 0 || yy < 0 || x >= W || yy >= H || !floor[yy * W + x]) continue;
				const px = grid ? ox + Math.floor((x - ox) / zoom) * zoom + zoom / 2 : x, py = grid ? oy + Math.floor((yy - oy) / zoom) * zoom + zoom / 2 : yy;
				const fx = (px - sx) / rx, fy = (py - gy) / 4, d = fx * fx + fy * fy;
				if (d >= 1) continue;
				const i = (yy * W + x) * 4, k = 1 - .16 * (1 - d);
				body$1[i] *= k;
				body$1[i + 1] *= k;
				body$1[i + 2] *= k;
			}
		}
		for (const e of edgesOf(frame$1, oy)) {
			const c = e & 1 ? WHITE$3 : edgeC;
			put$1(e >> 1, c[0], c[1], c[2]);
		}
		for (let gy = 0; gy < fh; gy++) for (let gx = 0; gx < fw; gx++) {
			const hex$4 = colors[gy][gx];
			if (!hex$4 || slots[gy][gx] === 3) continue;
			const slot = slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0, x0 = ox + cellX(gx, slot);
			const f = copy ? SHADER_FINISHES.indexOf(copy.finish) : -1, c = rgb$4(hex$4);
			if (copy && f >= 0) litDone.fill(0);
			for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
				const cx = x0 + dx, cy = oy + gy * zoom + dy;
				if (cx < 0 || cy < 0 || cx >= W || cy >= H || !room[cy * W + cx]) continue;
				if (!copy || f < 0) {
					put$1(cy * W + cx, c[0], c[1], c[2]);
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
					lit$1[k * 3] = out[0] * 255;
					lit$1[k * 3 + 1] = out[1] * 255;
					lit$1[k * 3 + 2] = out[2] * 255;
				}
				put$1(cy * W + cx, lit$1[k * 3], lit$1[k * 3 + 1], lit$1[k * 3 + 2]);
			}
		}
		for (const [gx, gy, hex$4] of frame$1.outside ?? []) for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
			const cx = ox + gx * zoom + dx, cy = oy + gy * zoom + dy, c = rgb$4(hex$4);
			if (cx >= 0 && cy >= 0 && cx < W && cy < H && room[cy * W + cx]) put$1(cy * W + cx, c[0], c[1], c[2]);
		}
	};
	const body = s.px.slice();
	let whole = null;
	return {
		square,
		moves: ed > 0 || !!own$1?.moves || Object.values(owned).some((o) => o && shines$1(o)),
		pose(t) {
			const tm = t * 1e3 + shift$1;
			return {
				lift: Math.round(1 + Math.sin(TAU_MS(tm, 3e3))),
				bob: soul && !grid ? Math.round(Math.sin(tm / wave(1e3 / 2.6)) * 2) : 0
			};
		},
		draw(frame$1, t, out) {
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
				const x = i % W, c = own$1(x, (i - x) / W, tm);
				body[i * 4] = c[0];
				body[i * 4 + 1] = c[1];
				body[i * 4 + 2] = c[2];
			}
			drawGuy(frame$1, oy0 + bob, body, loopSeconds(t * 1e3));
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
		},
		drawSquare(frame$1, t, out) {
			this.draw(frame$1, t, whole ??= new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
			for (let yy = 0; yy < square.size; yy++) out.set(body.subarray(((square.y + yy) * W + square.x) * 4, ((square.y + yy) * W + square.x + square.size) * 4), yy * square.size * 4);
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
	const star$2 = (x, y) => hash$1(x >> 1, y >> 1, p) > .985;
	let art;
	switch (look) {
		case "Deep Blue": {
			art = (x, y, tm) => {
				const bx = (x >> 1) * 2, by = (y >> 1) * 2, d = depth(by), a = TAU_MS(tm, 4e3);
				const q = Math.sin(bx * .19 + Math.sin(by * .15 + a) * 1.7) + Math.sin(by * .21 - bx * .09 - a * 2 + p);
				const sea = mix([
					46,
					92,
					214
				], [
					6,
					16,
					58
				], banded(d, 5));
				return Math.abs(q) < .11 ? mix(sea, [
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
				const disc = Math.hypot(dx / 58, dy / 15), ring$1 = Math.hypot(dx, dy * 1.05) / 34;
				if (Math.abs(disc - 1) < .09) {
					const knot = Math.abs(((Math.atan2(dy * 3.9, dx) / TAU - cycle(tm, 3e3)) % 1 + 1) % 1 - .5) < .07;
					return knot ? [
						255,
						248,
						224
					] : mix([
						255,
						226,
						160
					], [
						226,
						92,
						32
					], banded((dy / 15 + 1) / 2, 3));
				}
				if (Math.abs(ring$1 - 1) < .07 && dy < 0) return mix([
					255,
					210,
					140
				], [
					200,
					80,
					30
				], banded(-dy / 34, 2));
				if (disc < 1.35 && disc > .8) return mix([
					5,
					4,
					9
				], [
					96,
					34,
					14
				], banded(1 - Math.abs(disc - 1) / .35, 3) * .6);
				return star$2(x, y) ? [
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
			if (r < 1) return mix([
				255,
				196,
				92
			], [
				196,
				32,
				40
			], banded(r, 4));
			return mix([
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
			] : mix([
				236,
				242,
				255
			], [
				176,
				198,
				246
			], banded(r, 3));
			return star$2(x, y) ? [
				220,
				230,
				255
			] : mix([
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
const SEGMENTS$1 = [
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
	const on$1 = SEGMENTS$1[digit] ?? 0, lit$1 = [
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
		for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) s.set(x0 + x + dx, y0 + y + dy, on$1 & 1 << k ? lit$1 : dim);
	});
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
	const width$1 = square ? art.square.size : CARD_WIDTH, height = square ? art.square.size : CARD_HEIGHT;
	const draw = (frame$1, t, out) => square ? art.drawSquare(frame$1, t, out) : art.draw(frame$1, t, out);
	const one = keep ? null : new Uint8ClampedArray(width$1 * height * 4);
	let shown = -1;
	return {
		width: width$1,
		height,
		count: count$1,
		delay: total / count$1,
		delays,
		frame(i) {
			const k = (i % count$1 + count$1) % count$1;
			if (cache[k]) return cache[k];
			const frame$1 = frameAt(anim, k * total / count$1), t = k * turns * LOOP_MS / count$1 % LOOP_MS / 1e3;
			const { lift } = art.pose(t), pose = art.moves ? -1 : frameOf.get(frame$1) * 4 + lift;
			if (!keep) {
				if (pose < 0 || pose !== shown) draw(frame$1, t, one);
				shown = pose;
				return one;
			}
			let px = pose >= 0 ? poses.get(pose) : void 0;
			if (!px) {
				px = draw(frame$1, t, new Uint8ClampedArray(width$1 * height * 4));
				if (pose >= 0) poses.set(pose, px);
			}
			return cache[k] = px;
		}
	};
}
/** The card standing still, for a picture. */
function cardStill(input, t = .6, looks$1 = {}) {
	const anim = animateLoop(input.seed, input.move ?? "idle", {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	});
	const g = cardGrade(input);
	return cardArt(input, anim, ownedBySlot(input.copies ?? []), g, cardEdition(input, g), looks$1).draw(frameAt(anim, 0), t, new Uint8ClampedArray(CARD_WIDTH * CARD_HEIGHT * 4));
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
	const art = cardArtPlayer(input, ms, options), frames$1 = [];
	for (let i = 0; i < art.count; i++) frames$1.push(art.frame(i));
	return {
		width: art.width,
		height: art.height,
		frames: frames$1,
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
	const anim = animateLoop(seed, move, options), bg = options.background ? rgb$4(options.background) : null;
	const W = anim.width, frames$1 = anim.frames.map((f) => {
		const px = new Uint8ClampedArray(W * FRAME_HEIGHT * 4);
		f.colors.forEach((row, y) => row.forEach((c, x) => {
			const v = c ? rgb$4(c) : bg;
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
const rgb$3 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend$2 = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const gradeIndex = (o) => GRADES.findIndex((g) => g.id === gradeOf(o).id);
const INK$1 = [
	24,
	20,
	31
], WHITE$2 = [
	255,
	255,
	255
], IVORY$1 = [
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
	const W = FACE_WIDTH, H = FACE_HEIGHT;
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
	const edition = top ? GRAPHIC_FINISHES.includes(top.finish) ? 5 : editionOf(top.finish) : g < 0 ? 0 : [
		0,
		1,
		2,
		3,
		5,
		6
	][Math.min(g, 5)];
	const base$1 = new Uint8Array(W * H * 4), kind = new Uint8Array(W * H * 4), noise$3 = new Uint8Array(W * H * 4);
	const put$1 = (x, y, c, k, fi = -1, sc = 0, pr = 0) => {
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
	const gc = g >= 0 ? rgb$3(GRADES[Math.min(g, GRADES.length - 1)].color) : spec.tint ? rgb$3(spec.tint) : [
		104,
		118,
		146
	];
	const aura = edition === 6, gold = edition === 5, neg = edition === 4;
	const auraCopy = copies.find((o) => itemById(o.item)?.slot === "aura");
	const tone = aura && auraCopy ? rgb$3(auraHue(auraCopy.item, auraCopy.finish, auraCopy.print)) : gc;
	const gx0 = Math.floor((W - FRAME_WIDTH) / 2), left = Math.max(2, gx0 - 2), right = Math.min(W - 3, gx0 + FRAME_WIDTH + 1), wTop = 9, wBottom = 28;
	const origin = [(left + right) / 2, (wTop + wBottom) / 2];
	const stock = (x, y) => gold ? blend$2([
		46,
		42,
		64
	], [
		28,
		24,
		40
	], y / H) : neg ? blend$2(blend$2(IVORY$1, tone, .35), blend$2(IVORY$1, tone, .6), y / H) : blend$2(blend$2(tone, WHITE$2, .08), blend$2(tone, INK$1, .25), y / H);
	const plate = aura ? blend$2(blend$2(tone, INK$1, .6), INK$1, .45) : PLATE;
	const light$4 = blend$2(IVORY$1, gc, g >= 0 ? .22 : spec.tint ? .3 : .12), glow = blend$2(light$4, gc, .2);
	/** A Grail's window: a few large soft bands of three golds, as the big card's. */
	const fieldGold = (x, y) => {
		const qx = (x - origin[0]) / 8, qy = (y - origin[1]) / 8;
		const t = .5 + .5 * Math.sin(qy * 3.2 + 1.3 * Math.sin(qx * 2.4 + .6) + .6 * Math.sin(qx * 4.1 - qy * 1.7));
		const k1 = Math.min(1, Math.max(0, (t - .35) / .12 + .5)), k2 = Math.min(1, Math.max(0, (t - .72) / .12 + .5));
		return blend$2(blend$2([
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
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const cx = Math.min(x, W - 1 - x), cy = Math.min(y, H - 1 - y);
		if (cx + cy < 2) continue;
		if (cx === 0 || cy === 0 || cx + cy === 2) {
			put$1(x, y, INK$1, FIXED);
			continue;
		}
		const bevel = cx === 1 || cy === 1 || cx + cy === 3;
		const deep = x > W / 2 && cx === 1 || y > H / 2 && cy === 1;
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
		if (bevel) c = deep ? blend$2(c, INK$1, .3) : blend$2(c, WHITE$2, .35);
		if (aura && !bevel) {
			const d = Math.hypot((x - origin[0]) / 15, (y - origin[1]) / 19);
			put$1(x, y, blend$2(blend$2(tone, INK$1, .62), blend$2(tone, INK$1, .3), Math.max(0, 1 - d) ** 1.2), WINDOW);
			continue;
		}
		put$1(x, y, c, CARD);
	}
	for (let y = 2; y <= 7; y++) for (let x = 2; x <= W - 3; x++) {
		if ((x === 2 || x === W - 3) && (y === 2 || y === 7)) continue;
		put$1(x, y, y === 2 ? blend$2(plate, WHITE$2, .16) : y === 7 ? INK$1 : plate, FIXED);
	}
	if (!aura) for (let y = wTop; y <= wBottom; y++) for (let x = left; x <= right; x++) {
		const d = Math.hypot((x - origin[0]) / 10, (y - origin[1]) / 11);
		if (x === left || y === wTop || x === right || y === wBottom) put$1(x, y, INK$1, FIXED);
		else put$1(x, y, gold ? fieldGold(x, y) : blend$2(light$4, glow, Math.max(0, 1 - d) ** 1.4), WINDOW);
	}
	const frameCopy = owned.frame, fx0 = aura ? 2 : left + 1, fx1 = aura ? W - 3 : right - 1, fy0 = aura ? 8 : wTop + 1, fy1 = aura ? 29 : wBottom - 1;
	const ground = backdropColors(config, palette$1, fx0 - gx0, fy0 - 11 + HEADROOM, fx1 - fx0 + 1, fy1 - fy0 + 1);
	if (ground) {
		const fi = frameCopy ? SHADER_FINISHES.indexOf(frameCopy.finish) : -1;
		ground.forEach((row, j) => row.forEach((hex$4, i) => {
			if (hex$4) put$1(fx0 + i, fy0 + j, rgb$3(hex$4), ITEM, fi, frameCopy?.scuff ?? 0, frameCopy?.print ?? 0);
		}));
	}
	grid.forEach((row, y) => row.forEach((t, x) => {
		const hex$4 = colors[y][x];
		if (!hex$4 || ground && t >= LAYER.frame && t < LAYER.buddy) return;
		const slot = t >= LAYER.aura ? null : t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
		const o = slot ? owned[slot] : void 0;
		const fi = o ? SHADER_FINISHES.indexOf(o.finish) : -1;
		if (x + gx0 > 1 && x + gx0 < W - 2) put$1(x + gx0, y + 11, rgb$3(hex$4), o ? ITEM : GUY, fi, o ? o.scuff : 0, o ? o.print : 0);
	}));
	for (let y = 30; y <= H - 3; y++) for (let x = 2; x <= W - 3; x++) {
		if ((x === 2 || x === W - 3) && (y === 30 || y === H - 3)) continue;
		put$1(x, y, y === 30 ? INK$1 : plate, FIXED);
	}
	const buddy = new Uint8Array(W * H * 4), alone = buddyAlone(config), buddyOwned = owned.buddy;
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
		for (const [x, y, hex$4, art] of cells) {
			const i = ((y + oy) * W + x + ox) * 4;
			buddy.set([...rgb$3(hex$4), art ? 255 : 128], i);
			noise$3[i + 1] = noiseOf(x + ox, y + oy, buddyCopy[2]);
		}
	}
	const look = lookFor(edition, top?.finish, spec.look);
	const face = {
		base: base$1,
		kind,
		noise: noise$3,
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
	const W = FACE_WIDTH, H = FACE_HEIGHT, at = new Int32Array(W * H).fill(-1), cells = [];
	for (let i = 0; i < W * H; i++) {
		if (f.base[i * 4 + 3] < 128 || Math.floor(f.kind[i * 4] / 32 + .5) > WINDOW) continue;
		at[i] = cells.length;
		cells.push(i);
	}
	const n = cells.length, x = new Float32Array(n), y = new Float32Array(n), region = new Uint8Array(n), h = new Float32Array(n), rgb$9 = new Float32Array(n * 3);
	cells.forEach((i, k) => {
		x[k] = i % W;
		y[k] = Math.floor(i / W);
		region[k] = Math.floor(f.kind[i * 4] / 32 + .5);
		h[k] = f.noise[i * 4] / 255;
		for (let j = 0; j < 3; j++) rgb$9[k * 3 + j] = f.base[i * 4 + j] / 255;
	});
	const raised = Float32Array.from(x, (cx, k) => faceRaised(cx, y[k]));
	const pixels = {
		x,
		y,
		region,
		h,
		rgb: rgb$9,
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
	const W = FACE_WIDTH, H = FACE_HEIGHT, out = new Uint8ClampedArray(W * H * 4);
	const time = loopSeconds(ms), { at, field, out: ed } = faceField(f), lift = buddyLift(f, ms);
	field(time, ed);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const i = (y * W + x) * 4;
		if (f.base[i + 3] < 128) continue;
		let c;
		const e = at[i >> 2], s = ((y + lift) * W + x) * 4, b$1 = y + lift < H ? f.buddy[s + 3] : 0;
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
			const light$4 = (1 - smoothstep(0, .34, distance([(x + .5) / W, (y + .5) / H], [hover.x, hover.y]))) * .35 * hover.strength;
			c = [
				c[0] + light$4,
				c[1] + light$4,
				c[2] + light$4
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
				face.noise,
				face.buddy
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
	const posed$1 = new Map();
	const cellsOf = (pose, k) => {
		const key = `${pose} ${k}`;
		if (!posed$1.has(key)) posed$1.set(key, poseCells(spec.seed, pose, {
			...options,
			rare: {
				step: k,
				of: steps$1
			}
		}));
		return posed$1.get(key);
	};
	const first = cellsOf(def.poses[0], 0);
	const head$1 = first.colors.findIndex((row) => row.some(Boolean));
	const top = Math.max(0, head$1 - 1 - (def.room ?? 0));
	const frames$1 = [];
	let star$2;
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
		if (lucky && star$2 === void 0) star$2 = starSpot(grid);
		if (star$2) luckyStar(grid, star$2, at);
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
		frames$1.push(px);
	}
	return {
		width: EMOTE_SIZE,
		height: EMOTE_SIZE,
		frames: frames$1,
		delays: frames$1.map(() => STEP_MS$1)
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
const ART_VERSION = 16;
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
	const base$1 = view.replace(/-still$/, "");
	return base$1 === "icon" ? BAKED_SIZE.icon : base$1 === "face" || base$1.startsWith("emote-") ? BAKED_SIZE.face : base$1 === "card" ? BAKED_SIZE.card : base$1 === "art" ? BAKED_SIZE.art : base$1 === "card-full" ? BAKED_SIZE.cardFull : null;
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
		const card = who.urls.cardFull.split("/").slice(-2)[0];
		return `${host.replace(/\/+$/, "")}/g/${version}/${card}/${file}`;
	}
	return `${host.replace(/\/+$/, "")}/g/${version}/${guyPart(who)}/${file}`;
}
/** A view's box at `scale`, in CSS pixels: null for the width of a move, which a buddy widens, when nothing says. */
function lilGuySize(view, scale$1 = 1, wide) {
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
		width: wide === void 0 ? null : (wide ? BAKED_SIZE.buddy.width : BAKED_SIZE.guy.width) * scale$1,
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
	const wide = options.wide ?? (isInfo(who) ? who.wide : void 0);
	const box = lilGuySize(v, scale$1, wide);
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
			const style = (width$1, height) => `width:${width$1 * size}px;height:${height * size}px;${pixels}`;
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
const rgb$2 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
/** A frame on the padded canvas `W` wide, from column `left`: the guy's pixels (shone, if given) and the aura cells past his sides. */
function place(frame$1, W, left, shone) {
	const out = new Uint8ClampedArray(W * GUY_HEIGHT * 4), fw = frame$1.colors[0].length;
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const o = (y * W + x + left) * 4;
		if (shone) {
			const i = (y * fw + x) * 4;
			if (shone[i + 3]) out.set(shone.subarray(i, i + 4), o);
			continue;
		}
		const c = frame$1.colors[y][x];
		if (c) out.set([...rgb$2(c), 255], o);
	}
	for (const [x, y, c] of frame$1.outside ?? []) if (x + left >= 0 && x + left < W) out.set([...rgb$2(c), 255], (y * W + x + left) * 4);
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
		width: W,
		left,
		frames: plain.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W, l.left);
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
		width: W,
		left,
		frames: anim.frames.map((f) => {
			const l = lay(f);
			return place(l.frame, W, l.left, shining ? shineFrame(l.frame, owned, f.at ?? 0) : void 0);
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
	const lit$1 = plain.frames.map(rowsLit), ends = [];
	const ground = Math.max(...lit$1.map(([, bottom]) => bottom));
	plain.frames.reduce((t$1, f) => {
		ends.push(t$1 + f.ms);
		return t$1 + f.ms;
	}, 0);
	const liftAt = (t$1) => {
		const pos = t$1 % plain.duration, k = ends.findIndex((e) => pos < e);
		return Math.max(0, ground - lit$1[k < 0 ? 0 : k][1]);
	};
	const side = view === "icon" ? ICON_SIZE : FACE_SIZE;
	const rest = lit$1[0][0] + Math.max(0, ground - lit$1[0][1]);
	const top = view === "icon" ? HEADROOM : Math.min(FRAME_HEIGHT - side, Math.max(0, rest));
	const left = raw.left + (FRAME_WIDTH - side) / 2, W = raw.width;
	let t = 0;
	const frames$1 = raw.frames.map((px, k) => {
		const lift = liftAt(t);
		t += raw.delays[k];
		const out = new Uint8ClampedArray(side * side * 4);
		for (let y = 0; y < side; y++) {
			const from = top + y - lift;
			if (from >= 0 && from < FRAME_HEIGHT) out.set(px.subarray((from * W + left) * 4, (from * W + left + side) * 4), y * side * 4);
		}
		return out;
	});
	return fewerColours(merged(side, side, frames$1, raw.delays));
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
	const base$1 = resolve(spec.seed), rank = guyRank(base$1), copies = faceSpec(spec).copies ?? [];
	const rarest = traitOdds(base$1).sort((a, b$1) => a.chance - b$1.chance)[0]?.name ?? "";
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
function grounded(frame$1, ground, left) {
	const W = ground[0].length, fw = frame$1.colors[0].length;
	const colors = ground.map((row) => row.slice()), slots = ground.map((row) => row.map((c) => c ? 3 : 0));
	for (let y = 0; y < FRAME_HEIGHT; y++) for (let x = 0; x < fw; x++) {
		const c = frame$1.colors[y][x];
		if (c && frame$1.slots[y][x] !== 3) {
			colors[y][x + left] = c;
			slots[y][x + left] = frame$1.slots[y][x];
		}
	}
	for (const [x, y, c] of frame$1.outside ?? []) if (x + left >= 0 && x + left < W) {
		colors[y][x + left] = c;
		slots[y][x + left] = 0;
	}
	return {
		...frame$1,
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
	const backdrop$1 = spec.equip?.find((code) => itemById(decode(code)?.item)?.slot === "frame");
	const baked = bakeAt(backdrop$1 ? {
		...spec,
		equip: spec.equip.filter((code) => code !== backdrop$1)
	} : spec, move), g = baked.frames, W = g.width, H = g.height;
	const lit$1 = (px, x, y) => px[(y * W + x) * 4 + 3] >= 128;
	let left = W, right = -1, top = H, bottom = -1;
	for (const px of g.frames) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (!lit$1(px, x, y)) continue;
		left = Math.min(left, x);
		right = Math.max(right, x);
		top = Math.min(top, y);
		bottom = Math.max(bottom, y);
	}
	const cx = (left + right + 1) / 2, cy = (top + bottom + 1) / 2;
	let reach = 0;
	for (const px of g.frames) for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit$1(px, x, y)) reach = Math.max(reach, Math.hypot(Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx)), Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy))));
	const side = Math.ceil(reach * 2) + 2, ox = Math.round(side / 2 - cx), oy = Math.round(side / 2 - cy);
	const ground = backdrop$1 ? backdropGround(spec, side, ox + baked.left, oy) : null, solid = groundOf(g.frames[0], W, H);
	const frames$1 = g.frames.map((px) => {
		const out = ground ? new Uint8ClampedArray(ground) : new Uint8ClampedArray(side * side * 4);
		if (!ground) for (let i = 0; i < side * side; i++) out.set(solid, i * 4);
		for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (lit$1(px, x, y)) out.set(px.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), ((y + oy) * side + x + ox) * 4);
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
	const frame$1 = itemById(config.frame);
	const grid = Array.from({ length: side }, (_, y) => Array.from({ length: side }, (_$1, x) => LAYER.frame + frame$1.fill(x - ox + 48, y - oy - HEADROOM + 48) - 1));
	const colors = paint(grid, config, withItems(paletteOf(config), config), false, false);
	const out = new Uint8ClampedArray(side * side * 4);
	colors.forEach((row, y) => row.forEach((c, x) => {
		if (c) out.set([...rgb$2(c).map((v, k) => Math.round(v * .55 + [
			20,
			24,
			36
		][k] * .45)), 255], (y * side + x) * 4);
	}));
	return out;
}
/** A profile picture's ground: the guy's commonest colour that isn't an outline, most of the way to white. */
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
/**
* The frames in a sprite sheet, with how long each shows: for a game. Left to right, `columns` to a
* row (all of them in one strip by default), then the next row down.
*/
function sheetOf(f, columns = f.frames.length) {
	const cols = Math.max(1, Math.min(columns, f.frames.length)), rows = Math.ceil(f.frames.length / cols);
	const W = f.width * cols, rgba = new Uint8ClampedArray(W * f.height * rows * 4);
	f.frames.forEach((px, k) => {
		const ox = k % cols * f.width, oy = Math.floor(k / cols) * f.height;
		for (let y = 0; y < f.height; y++) rgba.set(px.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((oy + y) * W + ox) * 4);
	});
	return {
		width: W,
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
async function bakedImage(frames$1, kind, scale$1 = 1, columns) {
	if (kind === "still") return encodePng(frames$1.frames[0], frames$1.width, frames$1.height, scale$1);
	if (kind === "sheet") {
		const s = sheetOf(frames$1, columns);
		return encodePng(s.rgba, s.width, s.height, scale$1);
	}
	if (kind === "gif") return encodeGif(frames$1, scale$1);
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
		const card = cardPlayer(cardInputOf(spec));
		return {
			width: card.width,
			height: card.height,
			frames: [card.frame(0)],
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
	const base$1 = spec.palette !== void 0 ? paletteOf({
		...config,
		palette: spec.palette
	}) : paletteOf(config);
	const colors = base$1.colors;
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
	const base$1 = spec.palette !== void 0 ? paletteOf({
		...config,
		palette: spec.palette
	}) : paletteOf(config);
	const palette$1 = withItems(base$1, config), colors = palette$1.colors;
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
	const f = faceOf(config), mark$1 = (x, y, v) => {
		if (x >= 0 && y >= 0 && x < side && y < side && grid[y][x] && !look.face[y * side + x]) look.face[y * side + x] = v;
	};
	for (const e of f.eyes) for (let y = f.top; y <= f.line; y++) for (let x = e.left; x <= e.right; x++) mark$1(x, y, 1);
	if (f.eyes.length) {
		const centre$1 = (f.eyes[0].left + f.eyes[f.eyes.length - 1].right + 1) / 2, w = f.mouth.reduce((m, r) => Math.max(m, r.length), 0), mx = Math.floor(centre$1 - w / 2);
		f.mouth.forEach((row, dy) => row.forEach((t, dx) => {
			if (t) mark$1(mx + dx, f.mouthTop + dy, 2);
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
	const S$1 = look.side;
	const full = () => Array.from({ length: S$1 }, (_, y) => Array.from({ length: S$1 }, (_$1, x) => look.inks[look.painted[y * S$1 + x]] || null));
	const drawn = size === 16 ? full() : size === 5 || size === 3 ? far(look, size) : (size === 14 || size === 12 ? carve(look, full(), size) : null) ?? shrink(look, MAKE[size]);
	const lit$1 = drawn.map((row) => row.some(Boolean)), first = lit$1.indexOf(true), last = lit$1.lastIndexOf(true);
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
	const width$1 = cols * size, height = rows * size, rgba = new Uint8ClampedArray(width$1 * height * 4);
	specs.forEach((spec, n) => {
		const s = crowdSprite(spec, size, options), ox = n % cols * size, oy = Math.floor(n / cols) * size;
		for (let y = 0; y < size; y++) rgba.set(s.rgba.subarray(y * size * 4, (y + 1) * size * 4), ((oy + y) * width$1 + ox) * 4);
	});
	return {
		width: width$1,
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
	const S$1 = look.side;
	let x0 = S$1, x1 = -1, y0 = S$1, y1 = -1;
	for (let y = 0; y < S$1; y++) for (let x = 0; x < S$1; x++) {
		const i = y * S$1 + x;
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
	const S$1 = look.side, h = box.y1 - box.y0 + 1, count$1 = new Map();
	for (let y = box.y0 + Math.floor(h * from); y <= Math.min(box.y1, box.y0 + Math.ceil(h * to) - 1); y++) for (let x = box.x0; x <= box.x1; x++) {
		const i = y * S$1 + x, t = look.tokens[i];
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
	const crown = crownOf(look, size), head$1 = crown.some(Boolean) ? crown.map((on$1) => on$1 ? top : null) : size === 3 ? [
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
		head$1,
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
		head$1,
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
	const S$1 = look.side;
	let x0 = S$1, x1 = -1, y0 = S$1;
	for (let y = 0; y < S$1; y++) for (let x = 0; x < S$1; x++) if (look.painted[y * S$1 + x]) {
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		y0 = Math.min(y0, y);
	}
	if (x1 < 0) return Array(n).fill(false);
	const w = x1 - x0 + 1, rows = 3;
	return Array.from({ length: n }, (_, i) => {
		const a = x0 + Math.floor(w * i / n), b$1 = x0 + Math.floor(w * (i + 1) / n);
		let on$1 = 0;
		for (let y = y0; y < y0 + rows; y++) for (let x = a; x < Math.max(b$1, a + 1); x++) if (look.painted[y * S$1 + x]) on$1++;
		return on$1 >= Math.max(b$1 - a, 1) * rows * .5;
	});
}
/**
* A guy at 14 or 12 with their face as drawn at 16: rows and columns of the rest of them that most
* repeat a neighbour are taken out until they fit (columns in mirrored pairs, so a guy drawn
* symmetric stays so), never one through the eyes or mouth, nor one that would close the gap between
* two features. Null when the face leaves too little to take out.
*/
function carve(look, cells, size) {
	const S$1 = look.side;
	let feature = Array.from({ length: S$1 }, (_, y) => Array.from({ length: S$1 }, (_$1, x) => look.face[y * S$1 + x] > 0));
	const lit$1 = cells.map((r) => r.some(Boolean)), y0 = lit$1.indexOf(true), y1 = lit$1.lastIndexOf(true);
	if (y0 < 0) return null;
	let x0 = S$1, x1 = -1;
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
	const S$1 = look.side, ink = look.ink, tok = (x, y) => x >= 0 && y >= 0 && x < S$1 && y < S$1 ? look.tokens[y * S$1 + x] : 0;
	const box = insideOf(look);
	if (!box) return [[]];
	const { x0, y0 } = box, bw = box.x1 - x0 + 1, bh = box.y1 - y0 + 1, k = Math.max(bw, bh) / make.inner;
	const w = Math.max(1, Math.round(bw / k)), h = Math.max(1, Math.round(bh / k));
	const P = make.ring ? 1 : 0, W = w + 2 * P, H = h + 2 * P;
	const out = Array.from({ length: H }, () => Array(W).fill(null));
	const ox = x0 + (bw - w * k) / 2, oy = y0 + (bh - h * k) / 2;
	for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
		const sx0 = ox + i * k, sx1 = sx0 + k, sy0 = oy + j * k, sy1 = sy0 + k;
		const weight = new Map();
		let cover = 0;
		for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
			const a = (Math.min(x + 1, sx1) - Math.max(x, sx0)) * (Math.min(y + 1, sy1) - Math.max(y, sy0));
			const t = tok(x, y);
			if (a <= 0 || !t || look.outline[y * S$1 + x]) continue;
			cover += a;
			const c = look.inks[look.shrunk[y * S$1 + x]];
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
		for (let y = 0; y < S$1; y++) for (let x = 0; x < S$1; x++) {
			if (!want(tok(x, y), y * S$1 + x) || seen.has(y * S$1 + x)) continue;
			const stack$1 = [[x, y]], cells = [];
			seen.add(y * S$1 + x);
			while (stack$1.length) {
				const [cx, cy] = stack$1.pop();
				cells.push([cx, cy]);
				for (const [dx, dy] of ROUND) {
					const nx = cx + dx, ny = cy + dy;
					if (nx >= 0 && ny >= 0 && nx < S$1 && ny < S$1 && want(tok(nx, ny), ny * S$1 + nx) && !seen.has(ny * S$1 + nx)) {
						seen.add(ny * S$1 + nx);
						stack$1.push([nx, ny]);
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
			for (const cells of found) for (const [x, y] of cells) count$1.set(look.painted[y * S$1 + x], (count$1.get(look.painted[y * S$1 + x]) ?? 0) + 1);
			let most = 0;
			for (const [c, n] of count$1) if (n > most) {
				most = n;
				eye = look.inks[c];
			}
		}
		const spots = found.sort((a, b$1) => b$1.length - a.length).slice(0, 2).map(spot).sort((a, b$1) => a[0] - b$1[0]);
		if (spots.length === 2 && Math.abs(spots[0][1] - spots[1][1]) <= 1 && spots[1][0] - spots[0][0] < 2) {
			const width$1 = (j) => inside$1[j] ? inside$1[j].lastIndexOf(true) - inside$1[j].indexOf(true) + 1 : 0;
			let row = Math.max(spots[0][1], spots[1][1]);
			if (width$1(row) < 3) row = [row + 1, row - 1].find((j) => width$1(j) >= 3) ?? row;
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
		const mouth$1 = parts((t) => t === T.MOUTH || t === T.TONGUE).sort((a, b$1) => b$1.length - a.length)[0];
		const near = (i, j) => [...taken].some((t) => {
			const [a, b$1] = t.split(",").map(Number);
			return Math.abs(a - i) <= 1 && Math.abs(b$1 - j) <= 1;
		});
		if (mouth$1) {
			let [i, j] = spot(mouth$1);
			if (near(i, j)) j++;
			if (inside$1[j]?.[i] && !near(i, j)) out[j][i] = look.mouth;
		}
	}
	if (make.ring) {
		for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!inside$1[j][i] && SIDES.some(([dx, dy]) => inside$1[j + dy]?.[i + dx])) out[j][i] = ink;
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
function standIn(size, base$1) {
	const shade$1 = tinted(base$1.body, {
		toward: "#000000",
		amount: 0,
		shade: .35
	}), b$1 = base$1.body, e = base$1.eye;
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
	].some(([dx, dy]) => !out[j + dy]?.[i + dx])) out[j][i] = base$1.ink;
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
	let waving = !!options.wave, waveStart = 0, frame$1 = 0, gone = false, lastFrame = 0;
	let lit$1 = null;
	const moving = new Set(), rare = new Set();
	const sheets = new Map(), stand = new Map();
	const restless = new Set();
	let shown = [];
	let queue = [], made = 0;
	const queued = new Set();
	const code = (size, band$3) => size * 64 + band$3;
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
		const s = sheetsOf(size)[Math.floor(id / CELLS)], cell = id % CELLS, cx = cell % COLS * size, cy = Math.floor(cell / COLS) * size, W = s.canvas.width;
		let left = size, right = -1, top = size;
		const [hr, hg, hb] = tint ? rgbOf(tint.toward) : [
			0,
			0,
			0
		], a = tint?.amount ?? 0, f = 1 - (tint?.shade ?? 0), d = s.data;
		const lefts = new Int8Array(size).fill(-1), rights = new Int8Array(size).fill(-1);
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const o = (y * size + x) * 4, p = ((cy + y) * W + cx + x) * 4;
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
	function cellOf(g, seat$1) {
		const s = scene.seats[seat$1], band$3 = scene.bands[seat$1], c = code(s.size, band$3), own$1 = g.cells.get(c);
		if (own$1 !== void 0) return own$1;
		const key = `${c}${g.base.body}${g.base.eye}${g.base.ink}`;
		let at = stand.get(key);
		if (!at) {
			at = [s.size, alloc(s.size)];
			put$1(s.size, at[1], rgbaOf(standIn(s.size, g.base), s.size), scene.tints[band$3]);
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
		const s = scene.seats[g.seat], band$3 = scene.bands[g.seat], c = code(s.size, band$3);
		if (g.cells.has(c)) return;
		g.look ??= crowdLook(g.spec);
		const id = alloc(s.size);
		put$1(s.size, id, crowdSpriteOf(g.look, s.size).rgba, scene.tints[band$3]);
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
		if (lit$1) {
			lit$1.overlay = null;
			lit$1.aim = "";
			lit$1.drawn = null;
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
	const rectOf = (seat$1, lift = 0) => {
		const s = scene.seats[seat$1];
		return [
			s.x - 3,
			s.y - lift - 3,
			s.size + 6,
			s.size + lift + 4
		];
	};
	/** Whether a guy is part of the baked picture: seated, made or standing in, and not moving. */
	const atRest = (g) => lit$1?.guy !== g && !moving.has(g) && !slide;
	/** Seats of row `r` whose cells reach across world x `from` to `to`, as places in the row. */
	function span$1(r, from, to) {
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
				const x = i * TILE, [a, b$1] = span$1(r, x, x + TILE);
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
			const x0 = Math.max(from, t.x), x1 = Math.min(to, t.x + TILE), [a, b$1] = span$1(r, x0, x1);
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
	function restIn(seat$1) {
		if (seat$1 >= 0 && seat$1 < scene.seats.length && !(building && rowOf[seat$1] >= building.next)) restless.add(seat$1);
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
		const seats = [...restless].filter((seat$1) => rowOf[seat$1] >= 0);
		restless.clear();
		for (const seat$1 of seats) {
			const r = rowOf[seat$1], s = scene.seats[seat$1], [a, b$1] = span$1(r, s.x - 1, s.x + s.size + 1), row = scene.rows[r];
			for (let p = a; p < b$1; p++) {
				const g = bySeat[row[p]];
				if (g && atRest(g)) cellOf(g, row[p]);
			}
		}
		uploadAll();
		const rects = [];
		for (const seat$1 of seats) {
			const s = scene.seats[seat$1];
			retile(rowOf[seat$1], s.x - 1, s.x + s.size + 1);
			rects.push(rectOf(seat$1, 2));
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
			const [a, b$1] = span$1(r, from, to), row = scene.rows[r];
			for (let p = a; p < b$1; p++) {
				const g = bySeat[row[p]];
				if (g && moving.has(g) && lit$1?.guy !== g) drawLive(target, g, row[p], t);
			}
		}
		if (t >= 0 && waving) swathe(target);
		if (dimmed && lit$1?.overlay) dim(target, x0, y0, x1 - x0, y1 - y0);
		target.restore();
	}
	const band$2 = () => scene.wave ?? scene.pitch * 9.5;
	const waveX = (t) => {
		const b$1 = band$2(), span$2 = scene.width + 2.5 * b$1;
		return (t - waveStart) / WAVE_MS % 1 * span$2 - 1.3 * b$1;
	};
	let crest = 0, waveCrest = NaN;
	/** How far up the wave has a seat at `x`. */
	function waveUp(x) {
		const d = (x - crest) / (band$2() / 9.5);
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
		const u = band$2() / 9.5, at = (r) => {
			const [a] = span$1(r, crest, crest + 1), s = scene.seats[scene.rows[r][Math.min(a, scene.rows[r].length - 1)]];
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
		const u = band$2() / 9.5, top = Math.max(0, standTop - biggest - 4);
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
		const u = band$2() / 9.5;
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
		const row = scene.rows[r], u = band$2() / 9.5;
		const [a, b$1] = span$1(r, Math.max(from, crest - 8 * u - rowBig[r]), Math.min(to, crest + 1.5 * u + 1));
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
			arms$1(target, g, i, s.x, s.y - liftOf(waveUp(s.x + s.size / 2), s.size), s.size, id);
		}
	}
	/**
	* Arms up for the wave (the front rows' guys, 12 and up), out of their sides at the shoulder: in their
	* body colour just clear of their head, bending out a pixel halfway, to a hand just over it, in their ink.
	*/
	function arms$1(target, g, i, x, y, size, id) {
		const info = armOf(size, id), ext = extOf(size, id);
		if (!info || !ext) return;
		const bandI = scene.bands[i], left = x + (info & 15) - 1, right = x + (info >> 4 & 15) + 1, shoulder = y + (info >> 8 & 15), top = y + (ext >> 8 & 15);
		if (g.arm?.[0] !== bandI || g.arm[1] !== scene) g.arm = [
			bandI,
			scene,
			tinted(g.base.body, scene.tints[bandI]),
			tinted(g.base.ink, scene.tints[bandI])
		];
		const hand = top - (size >= 12 ? 1 : 0), bend = Math.round((shoulder + hand) / 2), wide = size >= 12, [, , body, ink] = g.arm;
		for (const [ax, out] of [[left, -1], [right, 1]]) {
			const up$1 = ax + out;
			target.fillStyle = body;
			target.fillRect(ax, bend, 1, shoulder - bend + 1);
			target.fillRect(up$1, hand, 1, bend - hand + 1);
			target.fillStyle = ink;
			target.fillRect(up$1, hand - 1, 1, 1);
			if (wide) {
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
		if (up$1 && s.size >= 12) arms$1(target, g, i, s.x, s.y + dy, s.size, id);
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
			const small$1 = scene.seats[g.seat].size <= 5;
			if (!small$1 && !g.glint) continue;
			const b$1 = small$1 ? far$1 : near, at = startOf(g, small$1);
			b$1.slots[Math.floor(at / b$1.period * SLOTS$1) % SLOTS$1].push(g);
		}
		beats = [far$1, near];
	}
	const startOf = (g, small$1) => small$1 ? (4e3 - g.hash % 4e3) % 4e3 : 90 * ((60 - g.hash % 97 % 60) % 60);
	/** The glints showing at `t`, as [guy, rect]. */
	function glintsAt(t) {
		if (glintsDue) sortGlints();
		const out = [];
		for (const b$1 of beats) {
			const now = t % b$1.period, first = Math.floor((now - b$1.dur) / b$1.period * SLOTS$1), last = Math.floor(now / b$1.period * SLOTS$1);
			for (let k = first; k <= last; k++) for (const g of b$1.slots[(k % SLOTS$1 + SLOTS$1) % SLOTS$1]) {
				if (g.seat < 0 || g.seat >= scene.seats.length || lit$1?.guy === g || moving.has(g) || bySeat[g.seat] !== g) continue;
				const small$1 = b$1.period === 4e3, since = ((now - startOf(g, small$1)) % b$1.period + b$1.period) % b$1.period;
				if (since >= b$1.dur) continue;
				const s = scene.seats[g.seat];
				out.push([g, small$1 ? [
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
		frame$1 = 0;
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
		const budget = building && !building.all ? 0 : performance.now() + (moving.size || waving || lit$1 ? 4 : 7);
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
		const spotNow = lit$1 ? spotFrame(t) : null;
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
				if (lit$1?.overlay) dim(ctx, 0, 0, scene.width, scene.height);
			}
			whole = false;
		} else {
			const dirty = merge([
				...dark,
				...live,
				...changed$1
			]);
			spotPaint = !!spotNow && (!lit$1.drawn || spotNow.moved || [...dirty, ...swept].some((r) => meets(r, lit$1.drawn)));
			if (spotPaint && lit$1.drawn) dirty.push(lit$1.drawn);
			ctx.setTransform(k, 0, 0, k, ox, oy);
			painted$2 = dirty.length + swept.length > 0;
			for (const r of merge(dirty)) patch(ctx, r, t);
			if (swept.length) patch(ctx, swept, t);
		}
		const was = new Set(shown.map((r) => `${r[0]},${r[1]}`));
		for (const [g, [x, y, w, h]] of glints) {
			if (!painted$2 && was.has(`${x},${y}`) || lit$1?.drawn && meets([
				x,
				y,
				w,
				h
			], lit$1.drawn)) continue;
			ctx.fillStyle = scene.seats[g.seat].size <= 5 ? g.shine : "#ffffff";
			ctx.fillRect(x, y, w, h);
		}
		shown = glints.map(([, r]) => r);
		if (lit$1) spot(t, spotNow, spotPaint);
		if (busy() || whole || shown.length) wake();
	}
	const busy = () => !!(waving || lit$1 || fade || slide || building || wanted || restless.size || made < queue.length || moving.size || options.idle);
	function drawSlide(t) {
		const e = 1 - Math.pow(1 - Math.min(1, 1 - (slide.until - t) / SLIDE_MS), 3), { k, ox, oy } = scene;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		for (const row of scene.rows) for (const i of row) {
			const g = bySeat[i];
			if (!g || lit$1?.guy === g) continue;
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
	let spotSprite = null, spotFor$1 = null;
	/** Where the spotlit guy is at `t`, in device pixels, and whether the canvas must be drawn whole for it. */
	function spotFrame(now) {
		const t = Math.floor(now / 33.3) * 33.3;
		const { guy, from, until } = lit$1, seated = guy.seat >= 0 && guy.seat < scene.seats.length;
		const s = seated ? scene.seats[guy.seat] : null, { k, ox, oy } = scene;
		const rise = Math.max(0, Math.min(1, (t - from) / 450, (until - t) / 350));
		const lineH = lit$1.label ? Math.round(30 * dpr) : 0, pad = Math.round(8 * dpr);
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
		const aim = `${Math.round((tx - ox) / k)},${Math.round((tb - oy) / k)},${Math.round(ts / k)}`, swung = aim !== lit$1.aim;
		if (swung || !lit$1.overlay) {
			lit$1.overlay = overlayFor((tx - ox) / k, (tb - oy) / k, ts / k);
			lit$1.aim = aim;
		}
		const pose = `${Math.round(cx)},${Math.round(bottom)},${Math.round(side)},${Math.round(rise * 32)}`, moved = pose !== lit$1.pose;
		lit$1.pose = pose;
		const level = Math.round(4 * Math.max(0, Math.min(1, (now - from) / 250, (until - now) / 250))) / 4, stepped = level !== lit$1.level;
		lit$1.level = level;
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
		const { level, overlay: o } = lit$1;
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
		const W = scene.width, H = scene.height, c = lit$1?.overlay?.canvas ?? document.createElement("canvas");
		const lights = scene.lights ?? [], light$4 = lights.length ? lights.reduce((best, l) => Math.abs(l.x - cx) < Math.abs(best.x - cx) ? l : best) : null;
		const wTop = Math.max(2, side * .3), wBottom = side * .85, poolW = side * 1.25, poolH = side * .55, poolY = bottom - side * .1;
		const top = Math.max(0, Math.floor(light$4 ? Math.min(light$4.y, bottom - side * 1.6) : bottom - side * 1.6)), end = Math.min(H, Math.ceil(poolY + poolH + 2));
		const left = Math.max(0, Math.floor(Math.min(light$4?.x ?? cx, cx - poolW) - wTop - 3)), right = Math.min(W, Math.ceil(Math.max(light$4?.x ?? cx, cx + poolW) + wTop + 3));
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
			const u = light$4 ? Math.max(0, Math.min(1, (y - light$4.y) / Math.max(1, bottom - side * .5 - light$4.y))) : 0;
			const mid = light$4 ? light$4.x + (cx - light$4.x) * u : cx, half = light$4 && y >= light$4.y && y <= bottom ? wTop + (wBottom - wTop) * u : -1;
			const reach = (h) => {
				const v = 1 - ((y - poolY) / h) ** 2;
				return v > 0 ? poolW * Math.sqrt(v) : -1;
			};
			const pw = Math.max(reach(poolH), light$4 ? -1 : reach(side * 1.4));
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
				const pool = ((x - cx) / poolW) ** 2 + ((y - poolY) / poolH) ** 2 - 1, glow = light$4 ? 9 : ((x - cx) / poolW) ** 2 + ((y - poolY) / (side * 1.4)) ** 2 - 1;
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
		const { guy, label, from, until } = lit$1;
		if (t >= until || guys.get(guy.key) !== guy) {
			lit$1 = null;
			restIn(guy.seat);
			whole = true;
			return;
		}
		const seated = guy.seat >= 0 && guy.seat < scene.seats.length, { k, ox, oy } = scene;
		if (!lit$1.landed && t - from > 300) {
			lit$1.landed = true;
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
		if (spotFor$1 !== guy) {
			guy.look ??= crowdLook(guy.spec);
			spotSprite ??= document.createElement("canvas");
			spotSprite.width = spotSprite.height = 16;
			spotSprite.getContext("2d").putImageData(new ImageData(crowdSpriteOf(guy.look, 16).rgba, 16, 16), 0, 0);
			spotFor$1 = guy;
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
		lit$1.drawn = [
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
		const W = devW / dpr, cy = dcy / dpr, maxW = W - 16;
		let px = 15, line = text;
		const font = (size) => options.font ?? `700 ${size}px system-ui, sans-serif`;
		ctx.font = font(px);
		while (!options.font && px > 11 && ctx.measureText(line).width + 20 > maxW) ctx.font = font(--px);
		const cut = line.lastIndexOf(" · "), tail = cut > 0 ? line.slice(cut) : "";
		let head$1 = cut > 0 ? line.slice(0, cut) : line;
		while (head$1.length > 1 && ctx.measureText(line).width + 20 > maxW) {
			head$1 = head$1.slice(0, -1);
			line = head$1.trimEnd() + "…" + tail;
		}
		const tw = Math.min(maxW, Math.ceil(ctx.measureText(line).width) + 20);
		const x = Math.max(8 + tw / 2, Math.min(W - 8 - tw / 2, dcx / dpr));
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
		if (!frame$1 && !gone) frame$1 = requestAnimationFrame(draw);
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
		join(key, spec, seat$1, arrive = true) {
			const b$1 = crowdBase(spec), now = performance.now();
			const g = {
				key,
				spec,
				seat: seat$1,
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
			if (seat$1 >= 0 && seat$1 < scene.seats.length) {
				bySeat[seat$1] = g;
				if (arrive && scene.seats[seat$1].size >= 6 && moving.size < 160) {
					g.arriving = true;
					moving.add(g);
				}
				restIn(seat$1);
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
			if (lit$1?.guy === g) {
				lit$1 = null;
				whole = true;
			}
			if (g.seat >= 0 && bySeat[g.seat] === g) {
				bySeat[g.seat] = void 0;
				restIn(g.seat);
			}
			forget(g);
			wake();
		},
		move(g, seat$1) {
			if (g.seat >= 0 && bySeat[g.seat] === g) {
				bySeat[g.seat] = void 0;
				restIn(g.seat);
			}
			g.seat = seat$1;
			if (rare.has(g)) glintsDue = true;
			if (seat$1 >= 0 && seat$1 < scene.seats.length) {
				bySeat[seat$1] = g;
				restIn(seat$1);
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
		wave(on$1) {
			if (on$1 && !waving) waveStart = performance.now();
			if (!on$1 && waving) whole = true;
			waving = on$1;
			wake();
		},
		spotlight(g, label, ms) {
			const now = performance.now();
			const was = lit$1?.guy;
			lit$1 = {
				guy: g,
				label,
				from: now,
				until: now + ms,
				overlay: lit$1?.overlay ?? null,
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
			if (frame$1) cancelAnimationFrame(frame$1);
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
function crowdSeats(width$1, height, density = 1, seed = "crowd") {
	const rows = [];
	let at = -1;
	for (let feet$1 = height;;) {
		const d = Math.max(0, feet$1 / height), want = 2 + 15 * Math.pow(d, 2.1) / Math.sqrt(density);
		let best = LADDER$1.reduce((b$1, s, i) => Math.abs(Math.log(s / want)) < Math.abs(Math.log(LADDER$1[b$1] / want)) ? i : b$1, 0);
		if (at >= 0) best = Math.min(at + 1, Math.max(at, best));
		at = best;
		const size = LADDER$1[at];
		if (feet$1 - size < -size / 4) break;
		rows.push({
			y: feet$1 - size,
			size
		});
		feet$1 -= Math.max(2, Math.round(size * (size <= 3 ? .67 : .6)));
	}
	rows.reverse();
	const seats = [];
	rows.forEach(({ y, size }, row) => {
		const step$1 = size <= 2 ? 3 : size <= 5 ? size : Math.round(size * .92);
		const r = (k$1) => hash(`${seed}:${row}:${k$1}`) % 1e3 / 1e3;
		let x = -size + Math.floor(r(-1) * step$1) - (row % 2 * step$1 >> 1), k = 0;
		while (x < width$1 + size) {
			const sy = y - (size <= 6 ? Math.floor(r(k * 2) * 2) : 0);
			if (x >= -size / 4 && x + size <= width$1 + size / 4 && sy >= -size / 4) seats.push({
				x,
				y: sy,
				size,
				row
			});
			x += step$1 + Math.floor(r(k * 2 + 1) * 2);
			k++;
		}
	});
	const mid = width$1 / 2;
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
	function build$1(devW, devH, dpr) {
		const css$1 = `${devW / dpr}x${devH / dpr}`;
		if (laidCss && css$1 !== laidCss) zoom = zoomFor(devW / dpr, devH / dpr, render?.guys.size ?? 0, zoom);
		laidCss = css$1;
		const backdrop$1 = behind(), tints = LADDER$1.map((s) => ({
			toward: backdrop$1,
			amount: HAZE[s],
			shade: 0
		}));
		const k = Math.max(1, Math.round(zoom * dpr)), W = Math.ceil(devW / k), H = Math.ceil(devH / k);
		const seats = crowdSeats(W, H, options.density ?? 1);
		seatCount = seats.length;
		const rows = [];
		seats.forEach((s, i) => {
			(rows[s.row] ??= []).push(i);
		});
		return {
			width: W,
			height: H,
			k,
			ox: 0,
			oy: devH - H * k,
			seats,
			rows: Array.from(rows, (r) => (r ?? []).sort((a, b$1) => seats[a].x - seats[b$1].x)),
			bands: Uint8Array.from(seats, (s) => LADDER$1.indexOf(s.size)),
			tints,
			backdrop: null,
			pitch: Math.max(4, seats[0]?.size ?? 8),
			shadow: lightness(backdrop$1) > .5 ? "#141820" : backdrop$1
		};
	}
	const css = () => [canvas.clientWidth || 300, canvas.clientHeight || 150];
	zoom = zoomFor(css()[0], css()[1], 0, 0);
	render = createRender(canvas, {
		build: build$1,
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
			const g = render.guys.get(waiting), seat$1 = free.shift();
			release(g.seat);
			render.move(g, seat$1);
		}
	}
	function release(seat$1) {
		let i = 0;
		while (i < free.length && free[i] < seat$1) i++;
		free.splice(i, 0, seat$1);
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
			const seat$1 = free.length && free[0] < seatCount ? free.shift() : next++;
			arrived.set(key, arrivals++);
			rendered.join(key, {
				...guy,
				seed: guy.seed ?? key
			}, seat$1);
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
		wave(on$1) {
			rendered.wave(on$1);
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
function crowdPicture(guys, width$1, height, options = {}) {
	const seats = crowdSeats(width$1, height, options.density ?? 1);
	const seed = options.seed ?? "crowd";
	const count$1 = Math.min(seats.length, guys.length + Math.max(0, options.fill ?? 0));
	const n = parseInt((options.backdrop ?? "#1d2030").slice(1, 7), 16), bg = [
		n >> 16 & 255,
		n >> 8 & 255,
		n & 255
	];
	const rgba = new Uint8ClampedArray(width$1 * height * 4);
	for (let i = 0; i < rgba.length; i += 4) {
		rgba[i] = bg[0];
		rgba[i + 1] = bg[1];
		rgba[i + 2] = bg[2];
		rgba[i + 3] = 255;
	}
	const sat = Array.from({ length: count$1 }, (_, k) => k).sort((a, b$1) => seats[a].row - seats[b$1].row || seats[a].x - seats[b$1].x);
	for (const k of sat) {
		const seat$1 = seats[k], a = HAZE[seat$1.size];
		const spec = k < guys.length ? {
			...guys[k],
			seed: guys[k].seed ?? `${seed}:${k}`
		} : { seed: `${seed}:${k}` };
		const sprite$1 = crowdSprite(spec, seat$1.size);
		for (let y = 0; y < seat$1.size; y++) for (let x = 0; x < seat$1.size; x++) {
			const px = seat$1.x + x, py = seat$1.y + y, o = (y * seat$1.size + x) * 4;
			if (!sprite$1.rgba[o + 3] || px < 0 || py < 0 || px >= width$1 || py >= height) continue;
			const at = (py * width$1 + px) * 4;
			for (let c = 0; c < 3; c++) rgba[at + c] = Math.round(sprite$1.rgba[o + c] * (1 - a) + bg[c] * a);
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
function plan(id, W, H, front, count$1, countOnly = false, spill = 0, depth = STYLES[id].depth) {
	const st = spill >= 3 ? {
		...STYLES[id],
		tiers: [],
		section: 0,
		bow: 0,
		arches: 0
	} : STYLES[id], cx = W / 2;
	const floorTop = spill >= 2 ? H : H - Math.round(H * st.floor), board = st.boards ? Math.max(2, Math.round(front * .35)) : 0;
	const standMax = H * st.stand, bowH = st.bow * Math.min(H, W * 9 / 16);
	const bowAt = (x) => {
		const u = (x - cx) / (W / 2);
		return bowH * Math.max(0, 1 - u * u);
	};
	const rows = [], breaks = [];
	let lift = 0, at = LADDER.indexOf(front), tier = 0;
	const roof = spill ? 0 : (ROOF[id] ?? 0) * H, room = floorTop - board - bowH - roof - 2;
	for (let r = 0; r < (st.centred || 400); r++) {
		const want = depth ? front / (1 + lift / (depth * H)) : front;
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
	const feet$1 = (r, x) => floorTop - board - bowAt(x) - rows[r].lift;
	const arches = [];
	const lower = rows.filter((r) => r.tier === 0).length;
	if (st.arches && lower >= 6 && !countOnly && rows[Math.max(1, Math.round(lower * .35))].size >= 6) {
		const row = Math.max(1, Math.round(lower * .35)), r0 = rows[row], secW = st.section * r0.pitch + r0.aisle;
		for (let v = 0; v < st.arches; v++) {
			const j = Math.round((W * (v + .5) / st.arches - cx) / secW);
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
			const per = Math.max(1, Math.floor((W - 4) / p)), left = Math.max(0, count$1 - n), rowsLeft = Math.max(1, Math.ceil(left / per));
			const here = Math.min(per, Math.ceil(left / rowsLeft));
			const prev = seats.filter((q) => q.row === r - 1).length;
			const shift$1 = r > 0 && (prev - here) % 2 === 0 ? r % 2 ? p / 2 : -p / 2 : 0;
			for (let i = 0; i < here; i++) xs.push(Math.round(cx + (i - (here - 1) / 2) * p - s / 2 + shift$1));
		} else if (row.section) {
			const secW = row.section * p + row.aisle, inSec = odd ? row.section - 1 : row.section;
			const j0 = Math.floor(-cx / secW) - 1, j1 = Math.ceil((W - cx) / secW) + 1;
			for (let j = j0; j <= j1; j++) {
				const left = cx + (j - .5) * secW + row.aisle / 2 + (odd ? p / 2 : 0);
				const arch = arches.find((a) => a.x === j && r >= a.row && r < a.row + 2);
				for (let i = 0; i < inSec; i++) {
					if (arch && Math.abs(i - (inSec - 1) / 2) < arch.w / 2) continue;
					xs.push(Math.round(left + i * p + (p - s) / 2));
				}
			}
		} else {
			const start = cx - s / 2 + (odd ? p / 2 : 0), i0 = Math.ceil(-start / p), i1 = Math.floor((W - s - start) / p);
			for (let i = i0; i <= i1; i++) xs.push(Math.round(start + i * p));
		}
		for (const x0 of xs) {
			const j = s <= 5 ? (r * 73856093 ^ x0 * 19349663) >>> 0 : 0, x = x0 + (j % 7 === 0 ? 1 : j % 7 === 1 ? -1 : 0);
			if (x < 0 || x + s > W) continue;
			const y = Math.round(feet$1(r, x0 + s / 2)) - s + (j % 5 === 2 ? 1 : j % 5 === 3 ? -1 : 0);
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
	if (seats.length < count$1 && spill < 3) return plan(id, W, H, front, count$1, false, !spill && (ROOF[id] ?? 0) > 0 ? 1 : Math.max(2, spill + 1), depth);
	seats.sort((p, q) => p.row - q.row || Math.abs(p.x + p.size / 2 - cx) - Math.abs(q.x + q.size / 2 - cx) || p.x - q.x);
	const used = seats.length ? Math.min(rows.length, seats[Math.min(seats.length, count$1) - 1].row + 1) : 0;
	return {
		id,
		W,
		H,
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
		feet: feet$1
	};
}
/** How many seats a venue has on a world at a front size: the same whatever the head count (but on the porch, whose rows centre on who's there), so a growing crowd works each out once. */
const seatCounts = new Map();
function seatsAt(id, W, H, front, count$1, depth = STYLES[id].depth) {
	if (STYLES[id].centred) return plan(id, W, H, front, count$1, true, 0, depth);
	const key = `${id} ${W} ${H} ${front} ${depth}`;
	let n = seatCounts.get(key);
	if (n === void 0) {
		if (seatCounts.size > 4e3) seatCounts.clear();
		seatCounts.set(key, n = plan(id, W, H, front, count$1, true, 0, depth));
	}
	return n;
}
/**
* How a venue sits on a canvas `devW` × `devH` device pixels for `count` people: whole device pixels to a
* world pixel (never under one CSS pixel to one world pixel), and the front-row size, as big as the
* venue allows while everyone still fits.
*/
function fit(id, devW, devH, dpr, count$1) {
	const st = STYLES[id], cap = st.cap * devH / dpr, kCss = Math.max(1, Math.ceil(dpr - 1e-6));
	const fronts = [...st.fronts, ...LADDER.filter((s) => s < st.fronts[st.fronts.length - 1])];
	const found = [];
	for (let k = 1; k < kCss + 80; k++) {
		const W$1 = Math.ceil(devW / k), H$1 = Math.ceil(devH / k);
		if (H$1 < 20 || fronts[fronts.length - 1] * k / dpr > cap) break;
		for (const front of fronts) {
			const css$1 = front * k / dpr;
			if (css$1 > cap) continue;
			if (seatsAt(id, W$1, H$1, front, count$1) >= count$1) {
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
	const W = Math.ceil(devW / best.k), H = Math.ceil(devH / best.k);
	let lo = st.depth, hi = st.depth * 24;
	if (st.depth) for (let i = 0; i < 7; i++) {
		const mid = (lo + hi) / 2;
		if (seatsAt(id, W, H, best.front, count$1, mid) >= count$1) lo = mid;
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
	const f = fit(id, w, h, dpr, count$1);
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
	constructor(W, H) {
		this.W = W;
		this.H = H;
		this.px = new Uint32Array(W * H);
	}
	static seen = new Map();
	static c(hex$4) {
		let c = Pic.seen.get(hex$4);
		if (c === void 0) {
			const n = parseInt(hex$4.slice(1, 7), 16);
			Pic.seen.set(hex$4, c = (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0);
		}
		return c;
	}
	rect(x, y, w, h, hex$4, level = 16) {
		const c = Pic.c(hex$4), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
		if (x1 <= x0) return;
		for (let j = y0; j < y1; j++) {
			if (level >= 16) {
				this.px.fill(c, j * this.W + x0, j * this.W + x1);
				continue;
			}
			for (let r = 0; r < 4; r++) if (BAYER[(j & 3) * 4 + r] < level) for (let i = x0 + (r - x0 & 3); i < x1; i += 4) this.px[j * this.W + i] = c;
		}
	}
	dot(x, y, hex$4) {
		this.rect(x, y, 1, 1, hex$4);
	}
	/** Blends a rect toward a colour by `a`, for lines painted on a floor. */
	mix(x, y, w, h, hex$4, a) {
		const c = Pic.c(hex$4), x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(this.W, Math.round(x + w)), y1 = Math.min(this.H, Math.round(y + h));
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
const shade = (hex$4, f) => {
	const key = hex$4 + f;
	let out = shades.get(key);
	if (out === void 0) {
		const n = parseInt(hex$4.slice(1, 7), 16);
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
	const st = STYLES[p.id], { W } = p;
	const runs$1 = [];
	for (let x = 0; x < W;) {
		const up = Math.round(-p.bowAt(x + .5));
		let e = x + 1;
		while (e < W && Math.round(-p.bowAt(e + .5)) === up) e++;
		runs$1.push(x, e, up);
		x = e;
	}
	for (let r = top - 1; r >= 0; r--) {
		const row = p.rows[r], seat$1 = st.seats[Math.min(row.tier, st.seats.length - 1)], tread = shade(seat$1, -.25), edge = shade(seat$1, -.5), base$1 = Math.round(p.feet(r, 0) + p.bowAt(0));
		for (let i = 0; i < runs$1.length; i += 3) {
			const x = runs$1[i], w = runs$1[i + 1] - x, feet$1 = base$1 + runs$1[i + 2];
			pic.rect(x, feet$1 - row.rise, w, row.rise, tread);
			pic.rect(x, feet$1 - 1, w, 1, edge);
		}
	}
	for (const s of p.seats) if (s.row < top) {
		const row = p.rows[s.row], seat$1 = st.seats[Math.min(row.tier, st.seats.length - 1)], h = Math.max(1, Math.round(s.size * .45));
		pic.rect(s.x + (s.size > 4 ? 1 : 0), s.y + s.size - h - 1, Math.max(1, s.size - (s.size > 4 ? 2 : 0)), h, seat$1);
		if (s.size >= 6) pic.rect(s.x + 1, s.y + s.size - h - 1, s.size - 2, 1, shade(seat$1, .25));
	}
	for (let r = 0; r < top; r++) {
		const row = p.rows[r], secW = row.section * row.pitch + row.aisle;
		if (!row.section) continue;
		for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W - p.cx) / secW) + 1; j++) {
			const x = Math.round(p.cx + (j - .5) * secW - row.aisle / 2), feet$1 = Math.round(p.feet(r, x));
			pic.rect(x, feet$1 - row.rise, row.aisle, row.rise, shade(st.seats[0], .12));
			pic.rect(x, feet$1 - 1, row.aisle, 1, shade(st.seats[0], -.35));
			if (r % 3 === 1) pic.dot(x + row.aisle, feet$1 - row.rise, "#aeb6c6");
		}
	}
	for (const a of p.arches) {
		if (a.row + 1 >= top) continue;
		const r0 = p.rows[a.row], secW = r0.section * r0.pitch + r0.aisle, mid = Math.round(p.cx + a.x * secW), w = Math.round(a.w * r0.pitch) + 1;
		const bottom = Math.round(p.feet(a.row, mid)), topY = Math.round(p.feet(a.row + 1, mid) - p.rows[a.row + 1].rise), x = mid - (w >> 1), rim$2 = shade(st.seats[0], .25);
		pic.rect(x - 1, topY - 1, w + 2, bottom - topY + 1, rim$2);
		pic.rect(x, topY, w, bottom - topY, "#0b0e18");
		pic.rect(x, topY, w, 1, "#141a28");
		pic.dot(x, topY, rim$2);
		pic.dot(x + w - 1, topY, rim$2);
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
function scoreboard(pic, cx, y, w, h, c, frame$1) {
	const dh = Math.max(5, Math.min(h - 4, 11)), t = dh >= 9 ? 2 : 1;
	const fits = (n$1) => Math.min(Math.floor(dh * .6), Math.floor((w - 4 - (n$1 - 1) - (n$1 > 2 ? 1 : 0)) / n$1));
	const n = fits(4) >= 3 ? 4 : fits(2) >= 3 ? 2 : 0, dw = n ? fits(n) : 0;
	const bw = n ? n * dw + (n - 1) + (n > 2 ? 1 : 0) + 4 : Math.min(w, 8), bh = dh + 4, x = Math.round(cx - bw / 2);
	pic.rect(x - 1, y - 1, bw + 2, bh + 2, frame$1);
	pic.rect(x, y, bw, bh, "#151a26");
	for (let i = 0; i < n; i++) {
		const dx = x + 2 + i * (dw + 1) + (n > 2 && i > 1 ? 1 : 0), on$1 = [
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
		seg.forEach(([sx, sy, sw, sh], k) => pic.rect(dx + sx, y + 2 + sy, sw, sh, on$1 >> 6 - k & 1 ? c : shade(c, -.75)));
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
	const { W, H, id } = p, pic = new Pic(W, H), st = STYLES[id], lights = [];
	if (!p.rows.length) {
		pic.rect(0, 0, W, H, "#1d2333");
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	let top = Math.max(1, Math.min(p.rows.length, p.used));
	for (let extra = id === "bleachers" ? 2 : id === "gym" ? 1 : 0; extra > 0 && top < p.rows.length && p.rows[top].lift + p.rows[top].size <= p.standMax; extra--) top++;
	const r = top - 1, standTop = (x) => Math.round(p.feet(r, x) - p.rows[r].rise - (p.rows[r].size - p.rows[r].rise));
	const fr = Math.max(1, Math.round(H / 90));
	if (id === "porch") {
		pic.rect(0, 0, W, H, "#3b4a5e");
		for (let y = 0; y < H; y += Math.max(3, fr * 3)) {
			pic.rect(0, y, W, 1, "#2f3c4f");
			pic.rect(0, y + 1, W, 1, "#45566c");
		}
		const eave = Math.round(H * .11), winW = Math.round(W * .18), winH = Math.round(H * .22), wx = Math.round(W * .16), wy = Math.round(H * .24);
		pic.rect(wx - 4, wy - 4, winW + 8, winH + 8, "#4f5560");
		pic.rect(wx - 2, wy - 2, winW + 4, winH + 4, "#6b6862");
		pic.rect(wx - 1, wy - 1, winW + 2, winH + 2, "#2a2230");
		pic.rect(wx, wy, winW, winH, "#ffd27a");
		pic.rect(wx, wy + winH - Math.round(winH * .3), winW, Math.round(winH * .3), "#f2b45a");
		pic.rect(wx + Math.round(winW / 2), wy, 1, winH, "#2a2230");
		pic.rect(wx, wy + Math.round(winH / 2), winW, 1, "#2a2230");
		const dw = Math.round(W * .12), dx = Math.round(W * .68), dy = Math.round(H * .2);
		pic.rect(dx - 2, dy - 2, dw + 4, H, "#2b2433");
		pic.rect(dx, dy, dw, H, "#6b4a33");
		pic.rect(dx + 2, dy + 3, dw - 4, Math.round(H * .18), "#5a3d2a");
		pic.rect(dx + dw - 4, Math.round(H * .42), 2, 2, "#e7b53b");
		pic.rect(0, 0, W, eave, "#1c2238");
		pic.rect(0, eave - 2, W, 2, "#2a2230");
		pic.rect(0, eave, W, 1, "#5a4a3a");
		for (const px of [0, W - Math.max(3, Math.round(W * .025))]) {
			const pw = Math.max(3, Math.round(W * .025));
			pic.rect(px, eave, pw, H, "#8a5f3e");
			pic.rect(px + 1, eave, 1, H, "#a8794f");
		}
		lights.push(...bulbs(pic, W * .03, W * .97, eave + 1, H * .05, Math.max(8, Math.round(W / 14))));
	} else if (id === "bleachers") {
		const horizon = Math.round(standTop(p.cx) + H * .03);
		pic.bands(0, horizon, [
			"#26284a",
			"#4a3a68",
			"#8a4f6e",
			"#e0876a"
		]);
		for (let x = 0; x < W; x++) {
			const t = Math.round(H * .07 + hash("tree" + Math.floor(x / 5)) % 7 + 3 * Math.sin(x / 9));
			pic.rect(x, horizon - t, 1, H, "#1d2a2a");
		}
		const sbx = Math.round(W * .87), sby = Math.round(H * .12);
		pic.rect(sbx - 1, sby, 2, horizon, "#2a2f3d");
		scoreboard(pic, sbx, sby, Math.round(W * .14), Math.round(H * .09), "#ff7a3c", "#2a2f3d");
	} else if (id === "gym") {
		pic.rect(0, 0, W, H, "#b3a891");
		for (let y = 0; y < H; y += 3 * fr) {
			pic.rect(0, y, W, 1, "#a39883");
			for (let x = y / (3 * fr) % 2 * 4 * fr; x < W; x += 8 * fr) pic.rect(x, y, 1, 3 * fr, "#a39883");
		}
		const wallTop = Math.round(H * .04);
		pic.rect(0, 0, W, wallTop, "#2a2630");
		const winY = Math.round(H * .07), winH = Math.round(H * .1), n = Math.max(3, Math.round(W / 80)), ww = Math.round(W / n * .55);
		for (let i = 0; i < n; i++) {
			const x = Math.round((i + .5) * W / n - ww / 2);
			pic.rect(x - 1, winY - 1, ww + 2, winH + 2, "#4a4f5c");
			pic.rect(x, winY, ww, winH, "#9ec3e6");
			pic.rect(x, winY, ww, Math.round(winH / 3), "#b9d6f0");
			for (let m = 1; m < 3; m++) pic.rect(x + Math.round(ww * m / 3), winY, 1, winH, "#4a4f5c");
		}
		pic.rect(0, Math.round(H * .24), W, Math.max(2, fr * 2), "#2c3a5e");
		for (const u of [.35, .65]) {
			const x = Math.round(W * u), lw = Math.max(5, Math.round(W * .03)) | 1, ly = wallTop + Math.max(3, Math.round(H * .06)), lh = Math.max(2, lw >> 1);
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
				scoreboard(pic, Math.round(W * u), Math.round(H * .06), Math.round(W * .2), Math.round(H * .1), "#ff5a4a", "#0d0f16");
				return;
			}
			const bw = Math.round(W * .07), bh = Math.round(H * .17), bx = Math.round(W * u - bw / 2), c = CLUB[i * 2];
			pic.rect(bx, wallTop, bw, bh, c);
			pic.rect(bx, wallTop + Math.round(bh * .25), bw, Math.max(1, fr), shade(c, .45));
			for (let k = 0; k < bw / 2; k++) pic.rect(bx + k, wallTop + bh + k * 0, 1, Math.round(bw / 2 - k) * .6 + 1, c), pic.rect(bx + bw - 1 - k, wallTop + bh, 1, Math.round(bw / 2 - k) * .6 + 1, c);
			pic.rect(bx + bw / 2 - 1, wallTop + bh, 2, Math.round(bw * .3), "#b3a891");
		});
	} else if (id === "hall") {
		pic.rect(0, 0, W, H, "#2e1c33");
		const ceil = Math.round(H * .08), cw = Math.max(6, Math.round(W / 18)), ch = Math.max(2, Math.round(ceil / 3));
		pic.rect(0, 0, W, ceil, "#1d1222");
		for (let x = Math.round(cw / 4); x < W; x += cw) for (let y = 2; y + ch <= ceil - 2; y += ch + 2) {
			pic.rect(x, y, cw - 3, ch, "#281830");
			pic.rect(x, y + ch - 1, cw - 3, 1, "#35223c");
		}
		pic.rect(0, ceil, W, Math.max(1, fr), "#b58a3a");
		pic.rect(0, ceil + Math.max(1, fr), W, 1, "#6e5022");
		const n = Math.max(4, Math.round(W / 60)), wall = standTop(p.cx);
		for (let i = 0; i <= n; i++) {
			const x = Math.round(i * W / n), pw = Math.max(3, Math.round(W * .025));
			pic.rect(x - pw / 2, ceil + 2, pw, H, "#3a2440");
			pic.rect(x - pw / 2, ceil + 2, 1, H, "#4a2f50");
			const sy = Math.round(ceil + (wall - ceil) * .62);
			if (sy + 4 < wall) {
				pic.rect(x - 3, sy - 2, 7, 6, "#4d3040");
				pic.rect(x - 2, sy - 1, 5, 4, "#6a4045");
				pic.rect(x - 1, sy, 3, 2, "#ffcf6b");
				pic.dot(x, sy, "#fff6d8");
			}
		}
		const room = wall - ceil - 4, cn = W > 260 ? 3 : 1;
		for (let i = 0; i < cn && room >= 6; i++) {
			const x = Math.round(W * (i + .5) / cn), cwid = Math.max(7, Math.min(Math.round(W * .07), room * 2)) | 1, drop = Math.max(2, Math.round(room * .3));
			const y = ceil + 2 + drop, half = cwid >> 1, th = Math.max(3, Math.round(cwid * .35));
			for (let j = -th * 2; j <= th * 2; j++) {
				const span$1 = Math.round(cwid * Math.sqrt(Math.max(0, 1 - (j / (th * 2)) ** 2)));
				pic.rect(x - span$1, y + j, span$1 * 2 + 1, 1, "#5a3a40", 3);
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
		const roof = Math.round((ROOF[id] ?? .15) * H), sky = id === "arena" ? "#0f121c" : "#0d1019";
		pic.bands(0, H, id === "arena" ? [
			"#0c0f18",
			"#141826",
			"#161b2a"
		] : [
			"#0a0d16",
			"#111727",
			"#1a2033"
		]);
		if (id === "arena") {
			pic.rect(0, 0, W, roof, "#0c0f18");
			for (let x = 0; x < W; x++) {
				const u = x % 12;
				pic.dot(x, Math.round(roof * .3) + Math.abs(u - 6), "#1e2434");
				pic.dot(x, Math.round(roof * .3), "#232a3b");
				pic.dot(x, Math.round(roof * .3) + 6, "#232a3b");
			}
			const sw = Math.round(W * .2), sh = Math.round(roof * .62), sx = Math.round(p.cx - sw / 2), sy = Math.round(roof * .18);
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
			[.18, .82].forEach((u) => lights.push(lightBank(pic, Math.round(W * u), Math.round(roof * .45), Math.max(1, Math.round(Math.min(H, W * 9 / 16) * .008)), 3, 1, W * .05, standTop(W * u), sky)));
		} else {
			const banks = id === "bowl" ? 6 : 4, cell = Math.max(1, Math.round(Math.min(H, W * 9 / 16) * .009)), bh = 2 * (cell + 1) + 1;
			const from = id === "stadium" ? Math.round(roof * .45) : 0;
			const bankY = (x) => Math.max(from + 1, Math.min(roof + 1, standTop(x) - Math.max(2, fr * 2) - bh - 2));
			const bankAt = Array.from({ length: banks }, (_, i) => {
				const x = Math.round(W * (i + .5) / banks);
				return {
					x,
					y: bankY(x)
				};
			});
			for (const b$1 of bankAt) lights.push(lightBank(pic, b$1.x, b$1.y, cell, 4, 2, W * .06, standTop(b$1.x), sky));
			if (from) for (let i = 0; i < W * from / 40; i++) {
				const h = hash("star" + i);
				pic.dot(h % W, (h >> 12) % from, i % 5 ? "#3a4466" : "#c9d1de");
			}
			pic.rect(0, from, W, roof - from, "#151a28");
			for (let y = from + 3; y < roof - 4; y += 5) pic.rect(0, y, W, 1, "#1a2030");
			for (let x = Math.round(W / 48); x < W; x += Math.max(4, Math.round(W / 24))) pic.rect(x, from, 1, roof - 3 - from, "#1e2536");
			if (id === "bowl") for (const u of [.035, .785]) {
				const sw = Math.round(W * .18), sh = Math.round(Math.min(roof * .5, W * .06)), sx = Math.round(W * u), sy = Math.round(roof * .18);
				pic.rect(sx - 1, sy - 1, sw + 2, sh + 2, "#2a3042");
				pic.rect(sx, sy, sw, sh, "#0f2a4a");
				pic.rect(sx, sy, sw, 1, "#5fb4ff");
				for (let i = 0; i < 6; i++) pic.rect(sx + 2 + i * Math.floor((sw - 4) / 6), sy + 3, Math.floor((sw - 4) / 6) - 1, sh - 6, CLUB[(i + (u > .5 ? 3 : 0)) % CLUB.length], 10);
			}
			for (let x = 0; x < W; x++) {
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
	if (!st.centred && id !== "bleachers") for (let x = 0; x < W; x++) {
		const y = standTop(x) - Math.max(2, fr * 2), y1 = Math.round(p.feet(r, x + .5)) - p.rows[r].rise;
		pic.rect(x, y, 1, y1 - y, wallC);
		pic.dot(x, y, wallTopC);
	}
	if (id === "porch") {
		const steps$1 = Math.max(2, p.used);
		for (let s = steps$1 - 1; s >= 0; s--) {
			const row = p.rows[Math.min(s, p.rows.length - 1)], feet$1 = Math.round(p.feet(Math.min(s, p.rows.length - 1), p.cx)), tread = Math.max(2, Math.round(row.size * .18));
			pic.rect(0, feet$1 - tread, W, H, "#7a5234");
			pic.rect(0, feet$1 - tread, W, tread, "#a0714a");
			pic.rect(0, feet$1 - tread, W, 1, "#c08a5c");
			pic.rect(0, feet$1, W, H, "#6b4a33");
		}
		const ground = p.floorTop;
		pic.rect(0, ground, W, H - ground, "#24301f");
		for (let x = 0; x < W; x++) if (hash("g" + x) % 3 === 0) pic.dot(x, ground, "#2f3d28");
		pic.rect(p.cx - W * .12, ground, W * .24, H - ground, "#5a5550");
		pic.rect(p.cx - W * .12, ground, W * .24, 1, "#6e6862");
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	if (id === "bleachers") {
		for (let r$1 = top - 1; r$1 >= 0; r$1--) {
			const row = p.rows[r$1], feet$1 = Math.round(p.feet(r$1, p.cx)), plank = Math.max(2, Math.round(row.size * .2));
			pic.rect(0, feet$1 - row.rise, W, row.rise, "#262b38");
			pic.rect(0, feet$1 - plank, W, plank, "#9aa6b8");
			pic.rect(0, feet$1 - plank, W, 1, "#d7dde6");
			pic.rect(0, feet$1 - 1, W, 1, "#5d6778");
		}
		const front = Math.round(p.feet(0, p.cx)), leg = Math.max(8, Math.round(W / 10));
		for (let x = Math.round(leg / 2); x < W; x += leg) {
			pic.rect(x, front, 2, p.floorTop - front, "#5d6778");
			for (let j = 0; j < p.floorTop - front; j++) pic.dot(x + 2 + Math.round(j * .8), front + j, "#4c566b");
		}
		pic.rect(0, p.floorTop, W, H - p.floorTop, "#2f7a43");
		for (let x = 0; x < W; x++) if (Math.floor(x / Math.max(10, W / 16)) % 2) pic.rect(x, p.floorTop, 1, H, "#2a7040");
		pic.mix(0, p.floorTop + Math.round((H - p.floorTop) * .4), W, 1, "#ffffff", .7);
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	if (id === "gym") {
		for (let r$1 = top - 1; r$1 >= 0; r$1--) {
			const row = p.rows[r$1], feet$1 = Math.round(p.feet(r$1, p.cx)), plank = Math.max(2, Math.round(row.size * .22));
			pic.rect(0, feet$1 - row.rise, W, row.rise, "#8f5f33");
			pic.rect(0, feet$1 - plank, W, plank, "#c58b4f");
			pic.rect(0, feet$1 - plank, W, 1, "#e0b07a");
		}
		const front = Math.round(p.feet(0, p.cx));
		pic.rect(0, front, W, p.floorTop - front, "#5a3b22");
		for (let y = p.floorTop; y < H; y++) pic.rect(0, y, W, 1, Math.floor((y - p.floorTop) / Math.max(2, fr * 2)) % 2 ? "#c08950" : "#c9925a");
		for (let y = p.floorTop; y < H; y += Math.max(2, fr * 2)) for (let x = hash("s" + y) % 40; x < W; x += 40) pic.dot(x, y, "#a8743f");
		const line = (x, y, w, h) => pic.mix(x, y, w, h, "#ffffff", .6);
		const sy = p.floorTop + Math.max(2, fr * 2);
		line(0, sy, W, 1);
		line(p.cx, sy, 1, H - sy);
		const rx$1 = Math.round(W * .1), ry$1 = Math.max(4, Math.round((H - sy) * .45));
		for (let a = 0; a <= 180; a += .5) {
			const t = a * Math.PI / 180;
			line(Math.round(p.cx + Math.cos(t) * rx$1), Math.round(sy + Math.sin(t) * ry$1), 1, 1);
		}
		for (const kx of [Math.round(W * .06), Math.round(W * .82)]) {
			line(kx, sy, Math.round(W * .12), 1);
			line(kx, sy, 1, H - sy);
			line(kx + Math.round(W * .12), sy, 1, H - sy);
		}
		return {
			canvas: pic.canvas(),
			lights
		};
	}
	paintStand(pic, p, top);
	if (id === "hall") {
		for (let r$1 = 0; r$1 < top; r$1++) {
			const row = p.rows[r$1], feet$1 = Math.round(p.feet(r$1, p.cx));
			pic.rect(0, feet$1 - row.rise, W, 1, "#e0675a");
			pic.rect(0, feet$1 - row.rise + 1, W, Math.max(1, Math.round(row.size * .15)), "#8c2a3c");
		}
		p.breaks.forEach((b$1) => {
			if (!p.rows.some((r$1, i) => i < top && r$1.lift > b$1.lift)) return;
			const y = Math.round(p.floorTop - p.board - b$1.lift - b$1.h);
			pic.rect(0, y, W, b$1.h, "#4a1f2e");
			pic.rect(0, y, W, 1, "#d9a441");
			pic.rect(0, y + b$1.h - 1, W, 1, "#8a6a2a");
			for (let x = 2; x < W; x += 6) pic.dot(x, y + (b$1.h >> 1), "#d9a441");
			pic.rect(0, y + b$1.h, W, Math.max(1, Math.round(b$1.h * .5)), "#2a1220");
		});
		for (let r$1 = 0; r$1 < top; r$1++) {
			const row = p.rows[r$1], secW = row.section * row.pitch + row.aisle;
			if (row.section) for (let j = Math.floor(-p.cx / secW) - 1; j <= Math.ceil((W - p.cx) / secW) + 1; j++) {
				const x = Math.round(p.cx + (j - .5) * secW - row.aisle / 2), feet$1 = Math.round(p.feet(r$1, x));
				pic.rect(x, feet$1 - row.rise, row.aisle, row.rise, "#3a2a30");
				pic.dot(x, feet$1 - 1, "#ffd27a");
			}
		}
		const lip = p.floorTop;
		pic.rect(0, lip, W, H - lip, "#3a2a22");
		for (let y = lip + 2; y < H; y += Math.max(2, fr * 2)) pic.rect(0, y, W, 1, "#33241d");
		pic.rect(0, lip, W, 1, "#f2d6a0");
		for (let x = Math.round(W / 32); x < W; x += Math.max(4, Math.round(W / 16))) {
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
		const sw = Math.max(12, W / 24);
		for (let i = x; i < x + w;) {
			const band$2 = Math.floor(i / sw), e = Math.min(x + w, Math.ceil((band$2 + 1) * sw));
			pic.rect(i, y, e - i, H - y, band$2 % 2 ? stripe : pitch);
			i = e;
		}
	});
	const touch = Math.round(p.floorTop + (H - p.floorTop) * .3);
	pic.mix(0, touch, W, 1, "#ffffff", .7);
	pic.mix(p.cx, touch, 1, H - touch, "#ffffff", .7);
	const rx = Math.round(W * .09), ry = Math.max(3, Math.round((H - touch) * .6));
	for (let a = 0; a <= 180; a += .4) {
		const t = a * Math.PI / 180;
		pic.mix(Math.round(p.cx + Math.cos(t) * rx), Math.round(touch + Math.sin(t) * ry), 1, 1, "#ffffff", .7);
	}
	if (id !== "arena") {
		const banks = id === "bowl" ? 6 : 4, cy = (p.floorTop + H) / 2, ry$1 = (H - p.floorTop) / 2;
		for (let i = 0; i < banks; i++) for (let y = Math.ceil(p.floorTop); y < H; y++) {
			const half = W * .06 * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry$1) ** 2));
			pic.rect(W * (i + .5) / banks - half, y, half * 2, 1, "#3a9a58", 4);
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
	function build$1(devW, devH, dpr) {
		const id = venueFor(laidFor), f = fit(id, devW, devH, dpr, laidFor), W = Math.ceil(devW / f.k), H = Math.ceil(devH / f.k);
		const p = plan(id, W, H, f.front, laidFor, false, 0, f.depth), st = STYLES[id];
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
			width: W,
			height: H,
			k: f.k,
			ox: Math.floor((devW - W * f.k) / 2),
			oy: devH - H * f.k,
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
			wave: id === "arena" || id === "stadium" || id === "bowl" ? W * .1 : void 0
		};
		return scene;
	}
	const render = createRender(canvas, {
		build: build$1,
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
		wave(on$1) {
			render.wave(on$1);
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
//#region src/capsule.ts
const WHITE$1 = [
	255,
	255,
	255
], INK = [
	22,
	18,
	34
];
const rgb$1 = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend$1 = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const CAPSULE_STATES = [
	"closed",
	"wobble",
	"open"
];
/** The grids a capsule is drawn on. 64 is the master; the small ones have their own simpler drawing. */
const CAPSULE_GRIDS = [
	16,
	24,
	32,
	64
];
const CORAL = "#fe5f55", IVORY = "#f3ead6", NAVY = "#11151b";
const seasonal = items.filter((i) => i.season);
/** How much lighter a colour is than another, as WCAG measures it (1 to 21). */
function contrast(a, b$1) {
	const lum$2 = (h) => {
		const c = rgb$1(h).map((v) => v / 255).map((v) => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
		return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
	};
	const [x, y] = [lum$2(a), lum$2(b$1)].sort((p, q) => q - p);
	return (x + .05) / (y + .05);
}
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
/** A season's candy: its hat's first colour, lifted toward white when it's too dark to read on the club's navy (New Year's black hat makes a silver capsule). */
function seasonColour(i) {
	let c = i.colors[0].toLowerCase();
	for (let t = .05; contrast(c, NAVY) < 4 && t <= 1; t += .05) c = hex(blend$1(rgb$1(i.colors[0]), WHITE$1, t));
	return c;
}
/** Every capsule: the machines in the order they joined, then mystery, free, and each season's. */
const CAPSULES = [
	...GAMES.map((g) => ({
		id: g,
		name: machineName(g),
		kind: "machine",
		colour: SET_COLORS[g],
		game: g
	})),
	{
		id: "mystery",
		name: "Mystery",
		kind: "mystery",
		colour: CORAL
	},
	{
		id: "free",
		name: "Free daily",
		kind: "free",
		colour: CORAL
	},
	...seasonal.map((i) => ({
		id: seasonId(i),
		name: i.name,
		kind: "season",
		colour: seasonColour(i),
		item: i.id,
		from: i.season.from,
		to: i.season.to
	}))
];
function seasonId(i) {
	return "season." + i.id.replace(/^club\./, "");
}
/**
* A capsule by its id (`puttsies`, `mystery`, `free`, `season.pumpkin`), or by `season` and a
* seasonal item's id (`club.pumpkin` or `pumpkin`). Undefined for anything else.
*/
function capsuleById(id, season) {
	if (id === "season" && season) id = "season." + season.replace(/^(club|season)\./, "");
	return CAPSULES.find((c) => c.id === id);
}
/** A square of RGBA pixels that blends what's set over what's there, as the site's capsule was drawn. */
var Px = class Px {
	d;
	constructor(w) {
		this.w = w;
		this.d = new Uint8ClampedArray(w * w * 4);
	}
	set(x, y, c, a = 255) {
		x = Math.round(x);
		y = Math.round(y);
		if (x < 0 || y < 0 || x >= this.w || y >= this.w) return;
		const d = this.d, i = (y * this.w + x) * 4, k = a / 255;
		if (a >= 255 || !d[i + 3]) {
			d[i] = c[0];
			d[i + 1] = c[1];
			d[i + 2] = c[2];
			d[i + 3] = a;
			return;
		}
		d[i] += (c[0] - d[i]) * k;
		d[i + 1] += (c[1] - d[i + 1]) * k;
		d[i + 2] += (c[2] - d[i + 2]) * k;
		d[i + 3] = Math.max(d[i + 3], a);
	}
	alpha(x, y) {
		return x < 0 || y < 0 || x >= this.w || y >= this.w ? 0 : this.d[(y * this.w + x) * 4 + 3];
	}
	/** Ink round everything solid: each empty pixel beside one that's mostly there. */
	outline(c) {
		const add$1 = [];
		for (let y = 0; y < this.w; y++) for (let x = 0; x < this.w; x++) {
			if (this.alpha(x, y)) continue;
			if ([
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].some(([dx, dy]) => this.alpha(x + dx, y + dy) > 150)) add$1.push([x, y]);
		}
		for (const [x, y] of add$1) this.set(x, y, c);
	}
	/** Moved by whole pixels, what slides off the edge lost. */
	shifted(dx, dy) {
		const out = new Px(this.w);
		for (let y = 0; y < this.w; y++) for (let x = 0; x < this.w; x++) {
			const sx = x - dx, sy = y - dy;
			if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.w) continue;
			out.d.set(this.d.subarray((sy * this.w + sx) * 4, (sy * this.w + sx) * 4 + 4), (y * this.w + x) * 4);
		}
		return out;
	}
};
/** `layers` stacked, each over the one before, into one picture. */
function stack(w, layers) {
	const out = new Uint8ClampedArray(w * w * 4);
	for (const l of layers) for (let i = 0; i < out.length; i += 4) {
		const sa = l.d[i + 3] / 255;
		if (!sa) continue;
		const da = out[i + 3] / 255, a = sa + da * (1 - sa);
		for (let k = 0; k < 3; k++) out[i + k] = Math.round((l.d[i + k] * sa + out[i + k] * da * (1 - sa)) / a);
		out[i + 3] = Math.round(a * 255);
	}
	return out;
}
/** A grid of rows of letters, painted from `key`; '.' is see-through. */
const sprite = (key, rows) => rows.map((r) => [...r].map((ch) => key[ch] ?? null));
const toys = new Map();
/** A guy as a toy: the 'mystery' guy (the same face in every capsule) in a machine's skin or a season's hat. */
function guyToy(equip) {
	if (!toys.has(equip)) {
		const cfg = dress(resolve("mystery"), { equip: [equip] });
		toys.set(equip, paint(compose(cfg), cfg, withItems(shadePalette(getPalette(cfg.palette), cfg.shade), cfg)));
	}
	return toys.get(equip);
}
/** A toy at half size for the 16 grid: each two by two the colour most of it is, the darker on a tie. */
function halved(cells) {
	const out = [];
	for (let y = 0; y < cells.length; y += 2) {
		const row = [];
		for (let x = 0; x < cells[0].length; x += 2) {
			const n = new Map();
			for (const c of [
				cells[y][x],
				cells[y][x + 1],
				cells[y + 1]?.[x],
				cells[y + 1]?.[x + 1]
			]) if (c) n.set(c, (n.get(c) ?? 0) + 1);
			const lum$2 = (h) => {
				const [r, g, b$1] = rgb$1(h);
				return r * .3 + g * .59 + b$1 * .11;
			};
			const best = [...n].sort((a, b$1) => b$1[1] - a[1] || lum$2(a[0]) - lum$2(b$1[0]))[0];
			row.push(best && best[1] >= 2 ? best[0] : null);
		}
		out.push(row);
	}
	return out;
}
const QKEY = {
	k: "#161222",
	c: CORAL,
	l: "#ff9b8c",
	s: "#c63f3a"
};
const QUESTION = sprite(QKEY, [
	"................",
	".....kkkkkk.....",
	"....kllllcck....",
	"...kllkkkkcsk...",
	"...kckk..kcsk...",
	"...kkk..kccsk...",
	".......kccsk....",
	"......kccsk.....",
	"......kcsk......",
	"......kkkk......",
	"......kcsk......",
	"......kkkk......",
	"................",
	"................",
	"................",
	"................"
]);
const QUESTION_24 = sprite(QKEY, [
	"................",
	".....kkkkkk.....",
	"....kllllcck....",
	"....kkkk.kcsk...",
	"........kccsk...",
	".......kcsk.....",
	".......kkk......",
	".......kcsk.....",
	".......kkkk....."
]);
const QUESTION_16 = sprite(QKEY, [
	"........",
	"...ccc..",
	".....s..",
	"....c...",
	"........",
	"....c..."
]);
/** A sprite with ink round it: every empty cell beside a filled one. */
function inked(cells, ink = "#161222") {
	const at = (x, y) => cells[y]?.[x] ?? null;
	return cells.map((row, y) => row.map((c, x) => c ?? ([
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	].some(([dx, dy]) => at(x + dx, y + dy) && at(x + dx, y + dy) !== ink) ? ink : null)));
}
const SKEY = {
	e: IVORY,
	c: CORAL,
	s: "#d9473f",
	w: "#fff6d8"
};
const STAMP = inked(sprite(SKEY, [
	"................",
	"...e.e.e.e.e....",
	"....eeeeeeeee...",
	"...eeccccccsee..",
	"....ecccwccse...",
	"...eeccwwwcsee..",
	"....ecwwwwwse...",
	"...eeccwcwcsee..",
	"....eccccccse...",
	"...eesssssssee..",
	"....eeeeeeeee...",
	"...e.e.e.e.e....",
	"................",
	"................",
	"................",
	"................"
]));
const STAMP_24 = inked(sprite(SKEY, [
	"................",
	"....e.e.e.e.....",
	".....eeeeeee....",
	"....eeccccsee...",
	".....eccwcse....",
	"....eecwwwsee...",
	".....ecwcwse....",
	"....eesssssee...",
	".....eeeeeee....",
	"....e.e.e.e....."
]));
const STAMP_16 = sprite(SKEY, [
	"........",
	"........",
	"..eeee..",
	"..ecwe..",
	"..ecce..",
	"..eeee.."
]);
const RAINBOW = [
	"#ff6b6b",
	"#ff8a3d",
	"#ffd447",
	"#74d97c",
	"#4fd6c4",
	"#5fb4ff",
	"#a98bff",
	"#ff7eb6"
].map(rgb$1);
const SEGMENTS = {
	16: [
		0,
		2,
		5,
		7
	],
	24: [
		0,
		2,
		3,
		5,
		6,
		7
	],
	32: [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7
	],
	64: [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7
	]
};
const RADIUS = {
	16: 6.5,
	24: 10.5,
	32: 14.5,
	64: 29.5
};
function segment(u, v, grid) {
	const R$1 = RADIUS[grid], along = u / R$1 / Math.sqrt(Math.max(.05, 1 - (v / R$1) ** 2)), lon = Math.asin(Math.max(-1, Math.min(1, along)));
	const of = SEGMENTS[grid], k = Math.min(of.length - 1, Math.floor((lon + Math.PI / 2) / Math.PI * of.length));
	return RAINBOW[of[k]];
}
/** The band round the club's own capsules (a season's, the free one): rows below the seam, in pixels from the middle. */
const BAND = {
	16: [1.5, 3.5],
	24: [2.5, 5.5],
	32: [3.5, 7.5],
	64: [6.5, 14.5]
};
const band = (v, grid) => v >= BAND[grid][0] && v < BAND[grid][1];
/** Of a hat's colours, the one furthest from its first: the season's band. */
function bandColour(colors) {
	const a = rgb$1(colors[0]);
	return colors.map(rgb$1).reduce((best, c) => Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) > Math.hypot(best[0] - a[0], best[1] - a[1], best[2] - a[2]) ? c : best, a);
}
const looks = new Map();
function lookOf$1(c) {
	if (looks.has(c.id)) return looks.get(c.id);
	const toyOf = (equip) => (grid) => grid === 16 ? halved(guyToy(equip)) : guyToy(equip);
	const candy = rgb$1(c.colour);
	let look;
	if (c.kind === "machine") look = {
		candy: () => candy,
		toy: toyOf(gameItems(c.game).find((i) => i.slot === "skin").id)
	};
	else if (c.kind === "season") {
		const stripe = bandColour([c.colour, ...items.find((i) => i.id === c.item).colors.slice(1)]);
		look = {
			candy: (_, v, grid) => band(v, grid) ? stripe : candy,
			toy: toyOf(c.item)
		};
	} else if (c.kind === "mystery") look = {
		candy: segment,
		toy: (grid) => grid === 16 ? QUESTION_16 : grid === 24 ? QUESTION_24 : QUESTION
	};
	else {
		const ivory = rgb$1(IVORY);
		look = {
			candy: (_, v, grid) => band(v, grid) ? candy : ivory,
			toy: (grid) => grid === 16 ? STAMP_16 : grid === 24 ? STAMP_24 : STAMP
		};
	}
	looks.set(c.id, look);
	return look;
}
const SHUT = {
	turn: 0,
	lid: 0,
	lift: 0
};
const ALL$1 = {
	toy: true,
	dome: true
};
/** Where the toy's top left sits on each grid (at two pixels a cell on 64). */
const TOY_AT = {
	16: {
		x: 4,
		y: 1
	},
	24: {
		x: 4,
		y: 2
	},
	32: {
		x: 8,
		y: 3
	},
	64: {
		x: 16,
		y: 6
	}
};
/** The middle of each grid's capsule. */
const CENTRE = {
	16: 7.5,
	24: 11.5,
	32: 15.5,
	64: 31.5
};
/** Which part of the capsule a point is in, from how far below the middle it is along the capsule's own up. */
const partAt = (v, grid) => v < -1 ? "dome" : v < 0 ? "seam" : v < 1 && grid !== 16 && grid !== 24 ? "seam2" : "candy";
/**
* How far the toy moves as the capsule rocks, in whole pixels: it rides along with the dome but stays
* upright, so a face, a question mark or a stamp never breaks up into loose pixels mid-rock.
*/
function toyShift(grid, turn$1) {
	const v = -RADIUS[grid] * .45, c = Math.cos(turn$1), s = Math.sin(turn$1);
	return [Math.round(-s * v) || 0, Math.round(c * v - v) || 0];
}
/** A point on the body and on the dome, each turned back to the capsule's own upright: what the halves draw from. */
function places(grid, pose, x, y) {
	const C$1 = CENTRE[grid], turn$1 = (t, yy) => {
		const c = Math.cos(t), s = Math.sin(t);
		return [C$1 + (x - C$1) * c + (yy - C$1) * s, C$1 - (x - C$1) * s + (yy - C$1) * c];
	};
	const [bu, bv] = turn$1(pose.turn, y), [, dv] = turn$1(pose.turn + pose.lid, y + pose.lift);
	return {
		bu,
		bv,
		body: partAt(bv - C$1, grid),
		dome: partAt(dv - C$1, grid) === "dome",
		lip: pose.lid !== 0 && dv - C$1 >= (grid === 64 ? -3 : -2) && dv - C$1 < -1
	};
}
/**
* The master, at 64: the site's capsule exactly as it was drawn there, a clear dome over a candy half,
* shaded as a sphere lit from the top left, with the toy showing through. The halves come back apart,
* each outlined.
*/
function master(look, pose, show = ALL$1) {
	const top = new Px(64), bot = new Px(64), R$1 = 29.5, C$1 = 31.5, L = [
		-.48,
		-.6,
		.64
	], toy = look.toy(64), [ox, oy] = toyShift(64, pose.turn);
	for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
		const p = places(64, pose, x, y);
		if (show.toy && p.body === "dome" && Math.hypot(x - C$1, y - C$1) < R$1 - 2) {
			const hex$4 = toy[Math.floor((y - oy - 6) / 2)]?.[Math.floor((x - ox - 16) / 2)];
			if (hex$4) top.set(x, y, blend$1(rgb$1(hex$4), [
				228,
				238,
				255
			], .16));
		}
		const ly = y + pose.lift, ldx = (x - C$1) / R$1, ldy = (ly - C$1) / R$1, lr2 = ldx * ldx + ldy * ldy;
		if (show.dome && p.dome && lr2 <= 1) {
			const rim$2 = Math.pow(lr2, 3), ang = Math.atan2(ldy, ldx);
			top.set(x, y, blend$1([
				214,
				228,
				250
			], [
				120,
				140,
				190
			], rim$2 * .5), Math.round(28 + rim$2 * 175));
			if (lr2 > .6 && lr2 < .78 && ang < -1.8 && ang > -2.75) top.set(x, y, WHITE$1, 215);
			if (lr2 > .6 && lr2 < .7 && ang > -.6 && ang < -.25) top.set(x, y, WHITE$1, 90);
			if (p.lip) top.set(x, y, [
				167,
				184,
				220
			], 220);
		}
		const dx = (x - C$1) / R$1, dy = (y - C$1) / R$1, r2 = dx * dx + dy * dy;
		if (r2 > 1 || p.body === "dome") continue;
		const candy = look.candy(p.bu - C$1, p.bv - C$1, 64);
		if (p.body !== "candy") {
			bot.set(x, y, blend$1(candy, WHITE$1, p.body === "seam" ? .55 : .18));
			continue;
		}
		const nz = Math.sqrt(1 - r2), lit$1 = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
		let c = lit$1 < .55 ? blend$1(candy, INK, (.55 - lit$1) * 1.1) : blend$1(candy, WHITE$1, (lit$1 - .55) * .55);
		if (r2 > .88) c = blend$1(c, INK, .3);
		if (Math.hypot(dx + .5, dy - .2) < .09) c = blend$1(c, WHITE$1, .6);
		bot.set(x, y, c);
	}
	if (show.dome) {
		for (const [x, y, a] of [
			[
				17,
				12,
				255
			],
			[
				18,
				12,
				255
			],
			[
				17,
				13,
				255
			],
			[
				22,
				9,
				170
			]
		]) if (places(64, pose, x, y - pose.lift).dome) top.set(x, y - pose.lift, WHITE$1, a);
	}
	top.outline(INK);
	bot.outline(INK);
	return {
		top,
		bot
	};
}
const SMALL = {
	16: [
		"................",
		".....######.....",
		"...##eeeeee##...",
		"..#eeHHllmmee#..",
		"..#eHllllmmme#..",
		".#eHllllmmmmde#.",
		".#ellllmmmmdde#.",
		".#elllmmmmmdde#.",
		".#emmmmmmmddde#.",
		".#emsmmmmdddde#.",
		".#emmmmdddddde#.",
		"..#edddddddde#..",
		"..#eeddddddee#..",
		"...##eeeeee##...",
		".....######.....",
		"................"
	],
	24: [
		"........................",
		"........########........",
		"......##eeeeeeee##......",
		".....#eeHHlllmmmee#.....",
		"....#eHHHHlllmmmmme#....",
		"...#eHHHlllllmmmmmde#...",
		"..#eHHHllllllmmmmmdde#..",
		"..#eHHlllllllmmmmmdde#..",
		".#elllllllllmmmmmmddde#.",
		".#ellllllllmmmmmmdddde#.",
		".#elllllllmmmmmmmdddde#.",
		".#emllllmmmmmmmmddddde#.",
		".#emmmmmmmmmmmmdddddde#.",
		".#emmmssmmmmmmddddddde#.",
		".#emmmssmmmmmdddddddde#.",
		".#emmmmmmmmmddddddddde#.",
		"..#emmmmmddddddddddde#..",
		"..#edddddddddddddddde#..",
		"...#edddddddddddddde#...",
		"....#edddddddddddde#....",
		".....#eeddddddddee#.....",
		"......##eeeeeeee##......",
		"........########........",
		"........................"
	],
	32: [
		"................................",
		"...........##########...........",
		".........##eeeeeeeeee##.........",
		".......##eeHlllllmmmmee##.......",
		"......#eeHHHHlllllmmmmmee#......",
		".....#elHHHHHlllllmmmmmmde#.....",
		"....#elHHHHHllllllmmmmmmdde#....",
		"...#elHHHHllllllllmmmmmmmdde#...",
		"...#eHHHHlllllllllmmmmmmmdde#...",
		"..#eHHHHlllllllllmmmmmmmdddde#..",
		"..#eHHHllllllllllmmmmmmmdddde#..",
		".#elllHlllllllllmmmmmmmmddddde#.",
		".#ellllllllllllmmmmmmmmmddddde#.",
		".#elllllllllllmmmmmmmmmdddddde#.",
		".#emllllllllmmmmmmmmmmddddddde#.",
		".#emmlllllmmmmmmmmmmmmddddddde#.",
		".#emmmmmmmmmmmmmmmmmmdddddddde#.",
		".#emmmmmssmmmmmmmmmmddddddddde#.",
		".#emmmmsssmmmmmmmmmdddddddddde#.",
		".#emmmmsssmmmmmmmmddddddddddde#.",
		".#emmmmmmmmmmmmmddddddddddddde#.",
		"..#emmmmmmmmmmdddddddddddddde#..",
		"..#eddmmmmmddddddddddddddddde#..",
		"...#edddddddddddddddddddddde#...",
		"...#edddddddddddddddddddddde#...",
		"....#edddddddddddddddddddde#....",
		".....#edddddddddddddddddde#.....",
		"......#eeddddddddddddddee#......",
		".......##eeddddddddddee##.......",
		".........##eeeeeeeeee##.........",
		"...........##########...........",
		"................................"
	]
};
/** A small grid, from its letters: the toy, the glass, the seam and the candy, then each half outlined. */
function small(look, grid, pose, show = ALL$1) {
	const rows = SMALL[grid], C$1 = CENTRE[grid], R$1 = C$1 - 1, at = TOY_AT[grid], toy = look.toy(grid), [ox, oy] = toyShift(grid, pose.turn);
	const top = new Px(grid), bot = new Px(grid), letter = (x, y) => rows[y]?.[x] ?? ".";
	for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
		const p = places(grid, pose, x, y), body = letter(x, y), dome = letter(x, y + pose.lift);
		if (show.toy && p.body === "dome" && (body === "e" ? grid === 16 && y > 1 : body !== "." && body !== "#")) {
			const hex$4 = toy[y - oy - at.y]?.[x - ox - at.x];
			if (hex$4) top.set(x, y, blend$1(rgb$1(hex$4), pose.lift && !pose.lid ? [
				255,
				226,
				170
			] : [
				228,
				238,
				255
			], .16));
		}
		if (show.dome && p.dome && dome !== ".") {
			const r2 = ((x - C$1) ** 2 + (y + pose.lift - C$1) ** 2) / (R$1 * R$1), rim$2 = Math.min(1, r2) ** 3, toyHere = top.alpha(x, y) === 255;
			if (dome === "#") continue;
			if (dome === "e" && !toyHere) top.set(x, y, [
				167,
				184,
				220
			], 210);
			else top.set(x, y, blend$1([
				214,
				228,
				250
			], [
				120,
				140,
				190
			], rim$2 * .5), Math.round(28 + rim$2 * 175));
			if (dome === "H") top.set(x, y, WHITE$1, 215);
			if (p.lip) top.set(x, y, [
				167,
				184,
				220
			], 220);
		}
		if (p.body === "dome" || body === "." || body === "#") continue;
		const candy = look.candy(p.bu - C$1, p.bv - C$1, grid);
		if (p.body !== "candy") {
			bot.set(x, y, blend$1(candy, WHITE$1, p.body === "seam" ? .55 : .18));
			continue;
		}
		bot.set(x, y, body === "e" ? blend$1(candy, INK, .38) : body === "d" ? blend$1(candy, INK, .2) : body === "l" || body === "H" ? blend$1(candy, WHITE$1, .22) : body === "s" ? blend$1(candy, WHITE$1, .6) : candy);
	}
	top.outline(INK);
	bot.outline(INK);
	return {
		top,
		bot
	};
}
const halvesAt = (look, grid, pose, show = ALL$1) => grid === 64 ? master(look, pose, show) : small(look, grid, pose, show);
/**
* Warm light from a capsule cracked open, drawn behind both halves and only where light can come from:
* a glow behind the dome's glass (brightest by the crack, so the toy stands dark against it), white-hot
* in the gap between dome and candy, and out of the crack past the side on 32 and 64. On 16 and 24 the
* dome lifts straight off, so it glows all over, like a bulb, over a white-hot line.
*/
function light(grid, pose, top, bot) {
	const g = new Px(grid), C$1 = CENTRE[grid], R$1 = RADIUS[grid] + 1;
	const hot = [
		255,
		248,
		222
	], warm = [
		255,
		210,
		112
	];
	const tilt = pose.lid ? pose.lid < 0 ? 1 : -1 : 0;
	const mouth$1 = {
		x: C$1 + tilt * (R$1 - 1),
		y: C$1 - 1 - pose.lift - Math.abs(Math.sin(pose.lid)) * R$1 * .5
	};
	for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
		if (top.alpha(x, y)) {
			const t = Math.min(1, Math.max(0, tilt ? (C$1 - y) / (R$1 * 2) + .12 - .3 * tilt * (x - C$1) / R$1 : (C$1 - 1 - pose.lift - y) / (R$1 * 1.4)));
			g.set(x, y, tilt ? blend$1(hot, [
				255,
				186,
				84
			], t) : blend$1([
				255,
				236,
				170
			], [
				255,
				194,
				80
			], t), Math.round(250 - (tilt ? 50 : 40) * t));
			continue;
		}
		if (bot.alpha(x, y) || !tilt) continue;
		const p = places(grid, pose, x, y);
		if (Math.hypot(x - C$1, y - C$1) <= R$1 || Math.hypot(x - C$1, y + pose.lift - C$1) <= R$1) {
			if (!p.dome && p.body === "dome" && y < C$1 + 1) g.set(x, y, hot);
			continue;
		}
		const d = Math.hypot(x - mouth$1.x, y - mouth$1.y), ang = Math.atan2(mouth$1.y - y, (x - mouth$1.x) * tilt);
		const ray = ang > -.2 && [
			.15,
			.6,
			1.1
		].some((a) => Math.abs(ang - a) * d < (grid === 64 ? 1.4 : .7)) && d < R$1 * .75;
		if (ray || d < (grid === 64 ? 4 : 1.5)) g.set(x, y, blend$1(hot, warm, d / R$1), Math.round(240 * Math.max(.25, 1 - d / (R$1 * .75))));
	}
	if (!tilt) for (let x = 0; x < grid; x++) {
		let under = -1, over = grid;
		for (let y = 0; y < grid; y++) {
			if (top.alpha(x, y)) under = y;
			if (bot.alpha(x, y) && over === grid) over = y;
		}
		if (under >= 0 && over < grid) for (let y = under + 1; y < over; y++) g.set(x, y, hot);
	}
	const near = (x, y) => [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
		[1, 1],
		[-1, -1],
		[1, -1],
		[-1, 1]
	].filter(([dx, dy]) => g.alpha(x + dx, y + dy) || top.alpha(x + dx, y + dy) || bot.alpha(x + dx, y + dy)).length;
	for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) if (g.alpha(x, y) && !top.alpha(x, y) && !bot.alpha(x, y) && near(x, y) <= 1) g.d.fill(0, (y * grid + x) * 4, (y * grid + x) * 4 + 4);
	return g;
}
/** One frame: the halves in a pose, stacked, shifted by `dx`, with the light behind them when it's open. */
function frame(look, grid, pose, dx = 0) {
	const { top, bot } = halvesAt(look, grid, pose);
	if (!pose.lift) return stack(grid, [bot.shifted(dx, 0), top.shifted(dx, 0)]);
	if (!pose.lid) for (let y = 0; y < Math.ceil(CENTRE[grid] - 1); y++) bot.d.fill(0, y * grid * 4, (y + 1) * grid * 4);
	const candy = pose.drop ? bot.shifted(0, pose.drop) : bot;
	return stack(grid, [
		light(grid, pose, top, candy),
		candy,
		top
	]);
}
/**
* Cracked open: on 32 and 64 the dome tips back on its left edge, light pouring out on the right; on 16
* and 24, too small for that to read, the halves part a pixel each way round a line of light and the
* dome glows.
*/
const openPose = (grid) => grid >= 32 ? {
	turn: 0,
	lid: -14 * Math.PI / 180,
	lift: 1
} : {
	turn: 0,
	lid: 0,
	lift: 1,
	drop: 1
};
const ROCK$1 = [
	0,
	.5,
	1,
	.5,
	0,
	-.5,
	-1,
	-.5,
	0,
	.5,
	1,
	.5,
	0,
	-.5,
	-1,
	-.5
];
const ROCK_DEGREES = {
	16: 9,
	24: 6,
	32: 13,
	64: 13
};
const REST_MS = 700, ROCK_MS = 50;
/** The base grid and whole-number scale for a size: 16, 24, 32 or 64, or a whole multiple of one (64 first). */
function gridFor(size, grid) {
	if (!Number.isInteger(size) || size < 16) return null;
	if (grid) return CAPSULE_GRIDS.includes(grid) && size % grid === 0 ? {
		grid,
		scale: size / grid
	} : null;
	const fit$2 = [
		64,
		32,
		24,
		16
	].find((g) => size % g === 0);
	return fit$2 ? {
		grid: fit$2,
		scale: size / fit$2
	} : null;
}
/**
* A capsule as frames: one still frame `closed` or `open`, or the `wobble`'s loop (a rest, then two
* quick rocks either way, back where it started). Null for a machine, state or size there isn't.
*/
function capsuleFrames(options) {
	const c = capsuleById(options.machine, options.season), state = options.state ?? "closed", fit$2 = gridFor(options.size ?? options.grid ?? 64, options.grid);
	if (!c || !fit$2 || !CAPSULE_STATES.includes(state)) return null;
	const look = lookOf$1(c), { grid, scale: scale$1 } = fit$2;
	const frames$1 = state === "wobble" ? ROCK$1.map((f) => frame(look, grid, {
		...SHUT,
		turn: f * ROCK_DEGREES[grid] * Math.PI / 180
	}, grid < 32 && Math.abs(f) === 1 ? f : 0)) : [frame(look, grid, state === "open" ? openPose(grid) : SHUT)];
	return {
		width: grid * scale$1,
		height: grid * scale$1,
		frames: frames$1.map((f) => upscale(f, grid, grid, scale$1)),
		delays: state === "wobble" ? ROCK$1.map((_, k) => k === 0 ? REST_MS : ROCK_MS) : [1e3]
	};
}
/**
* A shut capsule's two halves apart, each `grid` square and outlined on its own, for a page that
* moves them itself (the site twists the dome off and drops the candy away). The dome is drawn over
* the candy. Null for a capsule there isn't.
*/
function capsuleHalves(machine, options = {}) {
	const c = capsuleById(machine, options.season), grid = options.grid ?? 64;
	if (!c || !CAPSULE_GRIDS.includes(grid)) return null;
	const { top, bot } = halvesAt(lookOf$1(c), grid, SHUT);
	return {
		top: top.d,
		bottom: bot.d,
		size: grid
	};
}
/**
* A capsule's halves in any pose, each `grid` square and outlined on its own, the toy and the dome's
* glass drawn or left out (`show`): what ./capsule-open plays its open from. Not in the library's
* index; a page plays the open, or moves `capsuleHalves` itself.
*/
function capsuleLayers(id, pose, show = ALL$1, grid = 64) {
	const c = capsuleById(id);
	if (!c || !CAPSULE_GRIDS.includes(grid)) return null;
	const { top, bot } = halvesAt(lookOf$1(c), grid, pose, show);
	return {
		top: top.d,
		bottom: bot.d
	};
}
/**
* A capsule's picture from the lil guys Worker (`setLilGuysHost` moves it): `/g/<art version>/capsule/<id>-<state>-<grid>@<scale>.png`,
* an animated PNG for the wobble. Only PNG: a GIF has no see-through glass.
*/
function capsuleUrl(id, state = "closed", grid = 64, options = {}) {
	const { scale: scale$1 = 1, host = lilGuysHost() } = options;
	return `${host}/g/${ART_VERSION}/capsule/${id}-${state}-${grid}${scale$1 > 1 ? "@" + scale$1 : ""}.png`;
}
/** The plain files of the capsule pack (`/capsules/`): every capsule shut, at 16, 32, 64 and 128. */
const CAPSULE_FILE_SIZES = [
	16,
	32,
	64,
	128
];
const capsuleFile = (id, size) => `${id}-${size}.png`;
/**
* The manifest a game reads to show capsules: each one's plain files (shut, 16 to 128) and its Worker
* pictures in every state on each grid, 128 being the master at 2×. Wobble's are animated PNGs.
*/
function capsuleManifest(host = lilGuysHost()) {
	const sizes = (id, state) => Object.fromEntries([...CAPSULE_GRIDS.map((g) => [String(g), capsuleUrl(id, state, g, { host })]), ["128", capsuleUrl(id, state, 64, {
		host,
		scale: 2
	})]]);
	return {
		version: ART_VERSION,
		grids: CAPSULE_GRIDS,
		states: CAPSULE_STATES,
		url: `${host}/g/${ART_VERSION}/capsule/{id}-{state}-{grid}{scale}.png`,
		capsules: CAPSULES.map((c) => ({
			...c,
			files: Object.fromEntries(CAPSULE_FILE_SIZES.map((s) => [String(s), `${host}/capsules/${capsuleFile(c.id, s)}`])),
			closed: sizes(c.id, "closed"),
			wobble: sizes(c.id, "wobble"),
			open: sizes(c.id, "open")
		}))
	};
}

//#endregion
//#region src/capsule-open.ts
const WHITE = [
	255,
	255,
	255
];
const rgb = (s) => [
	parseInt(s.slice(1, 3), 16),
	parseInt(s.slice(3, 5), 16),
	parseInt(s.slice(5, 7), 16)
];
const blend = (a, b$1, t) => a.map((v, i) => Math.round(v + (b$1[i] - v) * t));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const DEG = Math.PI / 180;
/** The open's stage at 1×, square: the capsule's 64 master at its foot, room above for the burst and what comes out. */
const CAPSULE_OPEN_SIZE = 96;
const S = CAPSULE_OPEN_SIZE;
/** The capsule's 64 square on the stage, its foot on the stage's; its middle, its round, and the middle of the candy's rim. */
const AT_X = 16, AT_Y = 32, C = 31.5, R = 29.5, MOUTH_X = 48, MOUTH_Y = 62;
/** The light and sparks are drawn in the toy's cells, two pixels square, so nothing is ever a lone pixel. */
const CELL = 2;
/** Where what comes out stands over the open half: the bottom of the item itself, sitting just over the rim. */
const HOVER = 58;
/** A stage's pixels, each layer laid over what's there as the capsule's halves are stacked. */
var Stage = class {
	d = new Uint8ClampedArray(S * S * 4);
	put(x, y, r, g, b$1, a) {
		if (x < 0 || y < 0 || x >= S || y >= S || !a) return;
		const d = this.d, i = (y * S + x) * 4, sa = a / 255, da = d[i + 3] / 255, out = sa + da * (1 - sa);
		d[i] = Math.round((r * sa + d[i] * da * (1 - sa)) / out);
		d[i + 1] = Math.round((g * sa + d[i + 1] * da * (1 - sa)) / out);
		d[i + 2] = Math.round((b$1 * sa + d[i + 2] * da * (1 - sa)) / out);
		d[i + 3] = Math.round(out * 255);
	}
	/** A `w` by `h` picture with its top left at `x`, `y`; rows from `below` down left out (what's still inside the candy). */
	over(src, w, h, x, y, below = Infinity) {
		for (let sy = 0; sy < h; sy++) {
			const ty = y + sy;
			if (ty < 0 || ty >= S || ty >= below) continue;
			for (let sx = 0; sx < w; sx++) {
				const i = (sy * w + sx) * 4;
				if (src[i + 3]) this.put(x + sx, ty, src[i], src[i + 1], src[i + 2], src[i + 3]);
			}
		}
	}
	/** One cell of light, solid, on the stage's grid of cells. */
	cell(x, y, c) {
		const cx = Math.floor(x / CELL) * CELL, cy = Math.floor(y / CELL) * CELL;
		for (let dy = 0; dy < CELL; dy++) for (let dx = 0; dx < CELL; dx++) this.put(cx + dx, cy + dy, c[0], c[1], c[2], 255);
	}
	/** A spark: a cell, or a plus of five. */
	spark(x, y, c, big) {
		this.cell(x, y, c);
		if (big) for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) this.cell(x + dx * CELL, y + dy * CELL, c);
	}
	/** A line of cells from `r0` to `r1` out from `x`, `y` at angle `a`, coloured by how far along `length` it is. */
	ray(x, y, a, r0, r1, length, colours) {
		const seen = new Set();
		for (let r = Math.max(0, r0); r <= r1; r += 1) {
			const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, key = Math.floor(px / CELL) * 1e3 + Math.floor(py / CELL);
			if (seen.has(key)) continue;
			seen.add(key);
			this.cell(px, py, colours[Math.min(colours.length - 1, Math.floor(r / Math.max(1, length) * colours.length))]);
		}
	}
};
/** Pixels left with one neighbour or none (a dome's sliver at the stage's edge) are taken out, so nothing reads as a speck. */
function despeckle(d) {
	const lit$1 = (x, y) => x >= 0 && y >= 0 && x < S && y < S && d[(y * S + x) * 4 + 3] > 0;
	for (let pass = 0; pass < 12; pass++) {
		const gone = [];
		for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
			if (!lit$1(x, y)) continue;
			let n = 0;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
				[1, 1],
				[-1, -1],
				[1, -1],
				[-1, 1]
			]) if (lit$1(x + dx, y + dy)) n++;
			if (n <= 1) gone.push((y * S + x) * 4);
		}
		if (!gone.length) return;
		for (const i of gone) d.fill(0, i, i + 4);
	}
}
/** A seeded run of numbers in [0, 1), so an open plays the same every time it's drawn. */
function seeded(seed) {
	let s = seed >>> 0;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** How big an open plays for a copy: its grade (0 Everyday to 5 Aura), a showpiece or an unusual effect at least Prized; null with nothing inside. */
function capsuleOpenTier(copy) {
	if (!copy) return null;
	const grade = GRADES.findIndex((g) => g.id === gradeOf(copy).id);
	return Math.max(grade, unusual(copy) ? 2 : 0);
}
const BUILDS = [
	{
		rest: 220,
		rocks: [[
			10,
			40,
			0
		]],
		beat: 0,
		tremble: 0,
		crack: [90, 110],
		rays: 6,
		reach: 20,
		sparks: 6,
		rings: 0,
		rain: 0,
		fan: 0,
		stars: 0,
		rise: 300
	},
	{
		rest: 240,
		rocks: [[
			11,
			40,
			0
		], [
			12,
			40,
			.25
		]],
		beat: 80,
		tremble: 0,
		crack: [100, 120],
		rays: 8,
		reach: 26,
		sparks: 10,
		rings: 0,
		rain: 0,
		fan: 0,
		stars: 0,
		rise: 320
	},
	{
		rest: 250,
		rocks: [
			[
				11,
				40,
				.15
			],
			[
				13,
				40,
				.35
			],
			[
				14,
				40,
				.55
			]
		],
		beat: 120,
		tremble: 0,
		crack: [
			100,
			110,
			130
		],
		rays: 10,
		reach: 32,
		sparks: 16,
		rings: 1,
		rain: 0,
		fan: 6,
		stars: 2,
		rise: 340
	},
	{
		rest: 260,
		rocks: [
			[
				12,
				40,
				.2
			],
			[
				13,
				40,
				.4
			],
			[
				14,
				30,
				.6
			],
			[
				14,
				30,
				.75
			]
		],
		beat: 140,
		tremble: 6,
		crack: [
			110,
			120,
			140
		],
		rays: 12,
		reach: 38,
		sparks: 22,
		rings: 1,
		rain: 0,
		fan: 8,
		stars: 3,
		rise: 360
	},
	{
		rest: 270,
		rocks: [
			[
				12,
				40,
				.2
			],
			[
				13,
				40,
				.35
			],
			[
				14,
				30,
				.5
			],
			[
				15,
				30,
				.65
			],
			[
				15,
				30,
				.8
			]
		],
		beat: 150,
		tremble: 8,
		crack: [
			120,
			130,
			150,
			170
		],
		rays: 14,
		reach: 44,
		sparks: 28,
		rings: 2,
		rain: 14,
		fan: 10,
		stars: 4,
		rise: 400
	},
	{
		rest: 280,
		rocks: [
			[
				12,
				40,
				.2
			],
			[
				13,
				40,
				.35
			],
			[
				14,
				30,
				.5
			],
			[
				15,
				30,
				.65
			],
			[
				16,
				30,
				.8
			],
			[
				16,
				30,
				.9
			]
		],
		beat: 160,
		tremble: 10,
		crack: [
			130,
			140,
			160,
			180
		],
		rays: 16,
		reach: 46,
		sparks: 32,
		rings: 2,
		rain: 18,
		fan: 12,
		stars: 5,
		rise: 440
	}
];
const WARM = {
	hot: [
		255,
		248,
		222
	],
	mid: [
		255,
		210,
		112
	],
	deep: [
		255,
		178,
		72
	],
	sparks: []
};
const GOLD = {
	hot: rgb("#fff3c4"),
	mid: rgb("#f7c23e"),
	deep: rgb("#d4961f"),
	sparks: [
		"#fff3c4",
		"#ffd45a",
		"#e4ae39",
		"#b07818"
	].map(rgb)
};
function lightOf(capsule, copy, tier) {
	if (tier === null) {
		const own$1 = rgb(capsule.colour);
		return {
			...WARM,
			deep: blend(own$1, WARM.deep, .35),
			sparks: [
				WARM.hot,
				WARM.mid,
				own$1,
				blend(own$1, WHITE, .4)
			]
		};
	}
	if (tier === 4) return GOLD;
	if (tier === 5 && copy && slotOf(copy) === "aura") {
		const own$1 = auraColors(copy.item, copy.finish, copy.print).map(rgb), teal = rgb(GRADES[5].color);
		const mid$1 = own$1[0], deep = own$1[1] ?? teal;
		return {
			hot: blend(mid$1, WHITE, .6),
			mid: mid$1,
			deep,
			sparks: [
				...own$1,
				teal,
				blend(mid$1, WHITE, .6)
			]
		};
	}
	const g = rgb(GRADES[tier].color), hot = blend(g, WHITE, .8), mid = blend(g, WHITE, .42);
	return {
		hot,
		mid,
		deep: g,
		sparks: [
			hot,
			mid,
			g,
			WHITE
		]
	};
}
const OUTLINE = "#1a1626";
/**
* A copy on its own, as the lil guys site shows one: the pixels that are the item (by layer, or by
* what changes when a guy puts it on), outlined, its finish moving and its effect playing, scaled up
* by whole cells to a size that reads over the capsule. An aura has nothing to show on its own, so
* it comes out round the guy who wears it.
*/
function itemArt(copy, seed) {
	const slot = slotOf(copy);
	if (!slot) return null;
	if (slot === "aura") return auraArt(copy, seed);
	const base$1 = resolve(seed), code = encode(copy), want = FRAME_SLOTS.indexOf(slot) + 1, lo = LAYER[slot];
	const draw = (equip) => {
		const cfg = dress(base$1, { equip });
		const grid = slot === "buddy" && buddyAlone(cfg) || compose(cfg);
		return {
			grid,
			colors: paint(grid, cfg, withItems(paletteOf(cfg), cfg), false, false)
		};
	};
	const worn = draw([code]);
	let mask = worn.grid.map((row) => row.map((t) => t >= lo && t < lo + 10));
	if (!mask.some((r) => r.some(Boolean))) {
		const bare = draw([]);
		mask = worn.colors.map((row, y) => row.map((c, x) => !!c && c !== bare.colors[y][x]));
	}
	const W = worn.grid[0].length, H = FRAME_HEIGHT, top = H - worn.grid.length;
	const colors = Array.from({ length: H }, () => new Array(W).fill(null));
	const slots = Array.from({ length: H }, () => new Array(W).fill(0));
	worn.colors.forEach((row, y) => row.forEach((c, x) => {
		if (mask[y][x] && c) {
			colors[y + top][x] = c;
			slots[y + top][x] = want;
		}
	}));
	const edge = [];
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!colors[y][x] && [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	].some(([dx, dy]) => slots[y + dy]?.[x + dx])) edge.push([x, y]);
	for (const [x, y] of edge) colors[y][x] = OUTLINE;
	let x0 = W, y0 = H, x1 = -1, y1 = -1;
	colors.forEach((row, y) => row.forEach((c, x) => {
		if (c) {
			x0 = Math.min(x0, x);
			y0 = Math.min(y0, y);
			x1 = Math.max(x1, x);
			y1 = Math.max(y1, y);
		}
	}));
	if (x1 < 0) return null;
	const k = clamp(Math.floor(Math.min(40 / (x1 - x0 + 1), 34 / (y1 - y0 + 1))), 2, 4);
	const ownBottom = y1;
	if (copy.fx) {
		const up = [
			"embers",
			"bubbles",
			"hearts"
		].includes(copy.fx) ? 7 : copy.fx === "electric" ? 3 : 1;
		y0 = Math.max(0, y0 - up);
		x0 = Math.max(0, x0 - 1);
		x1 = Math.min(W - 1, x1 + 1);
		y1 = Math.min(H - 1, y1 + 1);
	}
	const owned = { [slot]: copy };
	const copies = FRAME_SLOTS.map((s) => owned[s]);
	const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
	return {
		w: bw * k,
		h: bh * k,
		foot: (y1 - ownBottom) * k,
		at(ms) {
			const frame$1 = {
				colors: copy.fx ? applyFx(colors, slots, copies, ms) : colors,
				slots,
				ms: 0
			};
			const shone = shineFrame(frame$1, owned, ms), out = new Uint8ClampedArray(bw * bh * 4);
			for (let y = 0; y < bh; y++) out.set(shone.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x1 + 1) * 4), y * bw * 4);
			return upscale(out, bw, bh, k);
		}
	};
}
/** An aura round the guy who wears it, playing as his baked picture does, cropped to everything it ever lights. */
function auraArt(copy, seed) {
	const f = bakeGuy({
		seed,
		equip: [encode(copy)]
	}, "idle");
	let x0 = f.width, y0 = f.height, x1 = -1, y1 = -1;
	for (const px of f.frames) for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (px[(y * f.width + x) * 4 + 3]) {
		x0 = Math.min(x0, x);
		x1 = Math.max(x1, x);
		y0 = Math.min(y0, y);
		y1 = Math.max(y1, y);
	}
	const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = 2, total = f.delays.reduce((a, b$1) => a + b$1, 0);
	return {
		w: bw * k,
		h: bh * k,
		foot: 0,
		at(ms) {
			let t = (ms % total + total) % total, i = 0;
			while (t >= f.delays[i] && i < f.frames.length - 1) t -= f.delays[i++];
			const out = new Uint8ClampedArray(bw * bh * 4);
			for (let y = 0; y < bh; y++) out.set(f.frames[i].subarray(((y0 + y) * f.width + x0) * 4, ((y0 + y) * f.width + x1 + 1) * 4), y * bw * 4);
			return upscale(out, bw, bh, k);
		}
	};
}
/** The rock: a half lean, all the way, half, upright, then the same the other way. */
const ROCK = [
	.5,
	1,
	.5,
	0,
	-.5,
	-1,
	-.5,
	0
];
/** How long the hold frame shows: it's the last, so it stays. */
const HOLD_MS = 1e3;
const SHUT_POSE = {
	turn: 0,
	lid: 0,
	lift: 0
};
const ALL = {
	toy: true,
	dome: true
};
/**
* A capsule opening, as frames: what's inside's grade sets how long it builds and how big it bursts.
* It plays once; the last frame is the hold, what came out standing over the open half. Null for a
* capsule there isn't, a copy of an item there isn't, or a size that isn't a whole multiple of 96.
*/
function capsuleOpenFrames(options) {
	const capsule = capsuleById(options.capsule), size = options.size ?? S, copy = options.copy;
	if (!capsule || !Number.isInteger(size) || size < S || size % S) return null;
	if (copy && !itemById(copy.item)) return null;
	const art = copy ? itemArt(copy, options.guy ?? "mystery") : null;
	if (copy && !art) return null;
	const tier = capsuleOpenTier(copy), light$4 = lightOf(capsule, copy, tier);
	const build$1 = tier === null ? {
		...BUILDS[0],
		fan: 4
	} : BUILDS[tier];
	const random = seeded(hash(`${capsule.id}|${copy ? encode(copy) : "none"}`));
	const kept = new Map();
	const layers = (pose, show = ALL) => {
		const key = `${pose.turn.toFixed(4)},${pose.lid.toFixed(4)},${pose.lift},${show.toy},${show.dome}`;
		let l = kept.get(key);
		if (!l) kept.set(key, l = capsuleLayers(capsule.id, pose, show));
		return l;
	};
	/**
	* Light inside the capsule, behind both halves: the glass filling with it from the seam up as far as
	* `leak` reaches (in three bands, hot by the seam), and white-hot in any gap between the halves.
	*/
	const glow = (pose, top, bottom, leak) => {
		const g = new Uint8ClampedArray(64 * 64 * 4), sn = Math.sin(pose.turn), cs = Math.cos(pose.turn), reach = leak * 2 * R;
		for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
			const i = (y * 64 + x) * 4, above = -(-(x - C) * sn + (y - C) * cs) - 1;
			let c = null;
			if (top[i + 3]) {
				if (above >= -1 && above <= reach) c = above < reach / 3 ? light$4.hot : above < reach * 2 / 3 ? light$4.mid : light$4.deep;
			} else if (pose.lift && !bottom[i + 3] && Math.hypot(x - C, y - C) <= R + .5 && above > -2) c = light$4.hot;
			if (c) g.set([...c, 255], i);
		}
		return g;
	};
	/** The capsule shut or cracked, rocked `turn`, `leak` of its light showing, moved `dx`, `dy` on the stage. */
	const capsuleFrame = (pose, leak, dx = 0, dy = 0, more) => {
		const st = new Stage(), { top, bottom } = layers(pose), x = AT_X + dx, y = AT_Y + dy;
		if (leak > 0 || pose.lift) st.over(glow(pose, top, bottom, pose.lift ? 1 : leak), 64, 64, x, y);
		st.over(bottom, 64, 64, x, y);
		if (leak > 0 && !pose.lift) seamLight(st, pose.turn, leak, x, y);
		st.over(top, 64, 64, x, y);
		more?.(st);
		return st.d;
	};
	/** The seam lit from the middle out as far as `leak`, and past the sides once it's bright, light leaking out of the crack. */
	const seamLight = (st, turn$1, leak, x, y) => {
		const sn = Math.sin(turn$1), cs = Math.cos(turn$1), half = leak * (R - 1);
		for (let u = -half; u <= half; u += .5) for (const v of [-.5, .5]) {
			const px = Math.round(x + C + u * cs - v * sn), py = Math.round(y + C + u * sn + v * cs);
			st.put(px, py, ...light$4.hot, 255);
		}
		if (leak < .3) return;
		for (const side of [-1, 1]) {
			const ex = x + C + side * (R + 2) * cs + .5 * sn, ey = y + C + side * (R + 2) * sn - .5 * cs;
			const along = Math.atan2(side * sn, side * cs), up = side > 0 ? -1 : 1, len = Math.round(leak * 12);
			st.ray(ex, ey, along, 0, len, len, [light$4.hot, light$4.mid]);
			if (leak >= .6) st.ray(ex, ey, along + up * .5, 0, len - 4, len, [
				light$4.hot,
				light$4.mid,
				light$4.deep
			]);
		}
	};
	const frames$1 = [], delays = [];
	const beats = {
		rocks: [],
		crack: 0,
		pop: 0,
		hold: 0
	};
	let clock = 0;
	const push = (px, ms) => {
		despeckle(px);
		frames$1.push(px);
		delays.push(ms);
		clock += ms;
	};
	if ((options.from ?? "drop") === "drop") {
		for (const dy of [
			-80,
			-66,
			-48,
			-26
		]) push(capsuleFrame(SHUT_POSE, 0, 0, dy), 30);
		beats.land = clock;
		const dust = (st, k$1) => {
			for (const side of [-1, 1]) {
				const x = MOUTH_X + side * (22 + k$1 * 5), y = 90 - k$1 * 2;
				st.cell(x, y, [
					214,
					206,
					190
				]);
				if (k$1 < 2) st.cell(x + side * CELL, y + CELL, [
					158,
					150,
					136
				]);
				if (k$1 < 2) st.cell(x, y + CELL, [
					214,
					206,
					190
				]);
				if (k$1 < 1) st.cell(x - side * CELL, y + CELL, [
					158,
					150,
					136
				]);
			}
		};
		[
			[0, 60],
			[-6, 40],
			[-8, 40],
			[-6, 40],
			[0, 50],
			[-2, 40],
			[0, 40]
		].forEach(([dy, ms], k$1) => push(capsuleFrame(SHUT_POSE, 0, 0, dy, k$1 < 3 ? (st) => dust(st, k$1) : void 0), ms));
	}
	push(capsuleFrame(SHUT_POSE, 0), build$1.rest);
	build$1.rocks.forEach(([deg, step$1, leak], r) => {
		beats.rocks.push(clock);
		for (const f of ROCK) push(capsuleFrame({
			turn: f * deg * DEG,
			lid: 0,
			lift: 0
		}, leak), step$1);
		const next = build$1.rocks[r + 1];
		if (next && build$1.beat) push(capsuleFrame(SHUT_POSE, (leak + next[2]) / 2), build$1.beat);
	});
	const lastLeak = build$1.rocks[build$1.rocks.length - 1][2];
	for (let k$1 = 0; k$1 < build$1.tremble; k$1++) {
		const leak = lastLeak + (.95 - lastLeak) * (k$1 + 1) / build$1.tremble;
		push(capsuleFrame({
			turn: (k$1 % 2 ? -2 : 2) * DEG,
			lid: 0,
			lift: 0
		}, leak, k$1 % 2 ? -1 : 1), 40);
	}
	beats.crack = clock;
	const crackLids = build$1.crack.map((_, k$1) => -((k$1 + 1) * 14) / build$1.crack.length);
	build$1.crack.forEach((ms, k$1) => {
		const pose = {
			turn: 0,
			lid: crackLids[k$1] * DEG,
			lift: 1
		};
		push(capsuleFrame(pose, 1, 0, 0, (st) => {
			const len = 6 + k$1 * 4 + (tier ?? 0) * 2;
			for (const a of [
				-.15,
				-.6,
				-1.1
			]) st.ray(AT_X + C + R, AT_Y + C - 2, a, 1, len, len, [
				light$4.hot,
				light$4.mid,
				light$4.deep
			]);
		}), ms);
	});
	beats.pop = clock;
	const t5 = tier ?? 0, lid0 = crackLids[crackLids.length - 1] * DEG;
	const rayLife = 240 + 40 * t5, riseAt = 80, riseEnd = riseAt + build$1.rise;
	const rays = Array.from({ length: build$1.rays }, (_, i) => {
		const a = t5 >= 3 ? -Math.PI / 2 + 2 * Math.PI * (i + .5) / build$1.rays : -Math.PI * .9 + Math.PI * .8 * i / Math.max(1, build$1.rays - 1);
		return {
			a,
			length: build$1.reach * (i % 2 ? .62 : 1)
		};
	});
	const sparks = Array.from({ length: build$1.sparks }, (_, i) => ({
		a: -Math.PI / 2 + (random() - .5) * (t5 >= 3 ? Math.PI * 1.7 : Math.PI * 1.1),
		v: .07 + random() * .09 + t5 * .01,
		life: 220 + random() * (140 + 60 * t5),
		colour: light$4.sparks[i % light$4.sparks.length],
		big: i % 3 === 0
	}));
	const rain = Array.from({ length: build$1.rain }, (_, i) => ({
		x: 8 + random() * 80,
		from: 140 + random() * 360,
		v: .08 + random() * .04,
		colour: light$4.sparks[i % light$4.sparks.length]
	}));
	const sparkEnd = Math.max(0, ...sparks.map((s) => s.life));
	const rainEnd = rain.length ? Math.max(...rain.map((d) => d.from + 100 / d.v)) : 0;
	const settle = copy ? riseEnd : 0;
	const end = Math.max(rayLife, sparkEnd, settle, Math.min(rainEnd, riseEnd + 320), 260);
	const itemX = art ? Math.round(MOUTH_X - art.w / 2) : 0;
	const hoverTop = art ? HOVER + art.foot - art.h : 0;
	const itemTop = (t) => {
		const p = clamp((t - riseAt) / build$1.rise, 0, 1), s = 1.7, e = 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
		return Math.round(MOUTH_Y + (hoverTop - MOUTH_Y) * e);
	};
	const { bottom: candy, top: toy } = layers(SHUT_POSE, {
		toy: !copy,
		dome: false
	});
	const fanAt = (st, grow) => {
		for (let i = 0; i < build$1.fan; i++) {
			const a = -Math.PI * .86 + Math.PI * .72 * i / Math.max(1, build$1.fan - 1), len = (16 + 3 * t5) * (i % 2 ? .7 : 1) * grow;
			if (len >= CELL) st.ray(MOUTH_X, MOUTH_Y - 2, a, 12, 12 + len, 12 + len, i % 2 ? [light$4.mid] : [light$4.deep]);
		}
	};
	const pool = (st, grow) => {
		const rows = t5 >= 3 ? 3 : t5 >= 1 ? 2 : 1;
		for (let r = 0; r < rows; r++) {
			const half = Math.round((34 + 2 * t5) / 2 * grow * (1 - r * .3));
			for (let x = -half; x < half; x += CELL) st.cell(MOUTH_X + x, MOUTH_Y - CELL * (r + 1), r === rows - 1 && rows > 1 ? light$4.mid : light$4.hot);
		}
	};
	/** The flash as the dome pops: a star of light out of the mouth, hot in the middle to a deep edge, its rows from `below` down left out. */
	const flash = (st, below) => {
		const outer = 24 + 4 * t5, inner = 12 + t5;
		for (let y = MOUTH_Y - outer; y <= MOUTH_Y + outer && y < below; y += CELL) for (let x = MOUTH_X - outer; x <= MOUTH_X + outer; x += CELL) {
			const dx = x + 1 - MOUTH_X, dy = y + 1 - MOUTH_Y, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
			const edge = inner + (outer - inner) * Math.abs(Math.cos(4 * a)) ** 4;
			if (r <= edge) st.cell(x, y, r < edge - 3 * CELL ? light$4.hot : r < edge - CELL ? light$4.mid : light$4.deep);
		}
	};
	const popFrame = (t) => {
		const st = new Stage();
		if (t === 0) flash(st, MOUTH_Y + 64);
		for (const ray of rays) {
			if (t === 0 || t > rayLife) continue;
			const head$1 = 10 + ray.length * Math.min(1, (t + 80) / 200), tail = 10 + ray.length * clamp((t - 100) / (rayLife - 100), 0, 1);
			if (head$1 - tail >= CELL) st.ray(MOUTH_X, MOUTH_Y, ray.a, tail, head$1, 10 + ray.length, [
				light$4.hot,
				light$4.mid,
				light$4.deep
			]);
		}
		for (let j = 0; j < build$1.rings; j++) {
			const at = t - 40 - 110 * j;
			if (at < 0 || at > 260) continue;
			const r = 10 + at * .16, colour = j ? light$4.hot : light$4.mid;
			for (let a = 0; a < Math.PI * 2; a += CELL / r / 1.6) if (!j || Math.floor(a * r / (CELL * 3)) % 2 === 0) st.cell(MOUTH_X + Math.cos(a) * r, MOUTH_Y + Math.sin(a) * r, colour);
		}
		if (build$1.fan && t >= riseAt) fanAt(st, clamp((t - riseAt) / build$1.rise, 0, 1));
		pool(st, clamp(t / 80, .5, 1));
		if (art && t >= riseAt) st.over(art.at(beats.pop + t), art.w, art.h, itemX, itemTop(t), MOUTH_Y);
		st.over(candy, 64, 64, AT_X, AT_Y);
		if (!copy) st.over(toy, 64, 64, AT_X, AT_Y);
		const p = (t + 30) / 230;
		if (p < 1) {
			const dome = layers({
				turn: 0,
				lid: lid0 - 2.6 * p,
				lift: 0
			}, {
				toy: false,
				dome: true
			}).top;
			st.over(dome, 64, 64, AT_X + Math.round(-38 * p), AT_Y - 1 + Math.round(-(120 * p - 36 * p * p)));
		}
		if (t === 0) flash(st, MOUTH_Y);
		for (const s of sparks) {
			if (t === 0 || t > s.life) continue;
			const out = 12 + s.v * t, x = MOUTH_X + Math.cos(s.a) * out, y = MOUTH_Y + Math.sin(s.a) * out + 35e-5 * t * t;
			st.spark(x, y, s.colour, s.big && t < s.life / 2);
		}
		for (const d of rain) {
			if (t < d.from) continue;
			const y = -2 + (t - d.from) * d.v;
			if (y < 88) st.cell(d.x + Math.sin((t - d.from) / 90) * 2, y, d.colour);
		}
		return st.d;
	};
	push(popFrame(0), 60);
	for (let t = 60; t < end; t += 40) push(popFrame(t), 40);
	const hold = new Stage();
	if (build$1.fan) fanAt(hold, 1);
	pool(hold, 1);
	if (art) hold.over(art.at(clock), art.w, art.h, itemX, hoverTop);
	hold.over(candy, 64, 64, AT_X, AT_Y);
	if (!copy) hold.over(toy, 64, 64, AT_X, AT_Y);
	const box = art ? {
		x: itemX,
		y: hoverTop,
		w: art.w,
		h: art.h
	} : {
		x: MOUTH_X - 14,
		y: 30,
		w: 28,
		h: 30
	};
	for (let k$1 = 0, tries = 0; k$1 < build$1.stars && tries < 200; tries++) {
		const x = 6 + random() * (S - 12), y = 6 + random() * (MOUTH_Y - 14);
		if (x > box.x - 8 && x < box.x + box.w + 8 && y > box.y - 8 && y < box.y + box.h + 8) continue;
		hold.spark(x, y, k$1 % 2 ? light$4.deep : light$4.mid, true);
		k$1++;
	}
	push(hold.d, HOLD_MS);
	const merged$1 = {
		width: S,
		height: S,
		frames: [],
		delays: []
	};
	const same$1 = (a, b$1) => {
		for (let j = 0; j < a.length; j++) if (a[j] !== b$1[j]) return false;
		return true;
	};
	frames$1.forEach((f, i) => {
		const last = merged$1.frames.length - 1;
		if (last >= 0 && same$1(merged$1.frames[last], f)) merged$1.delays[last] += delays[i];
		else {
			merged$1.frames.push(f);
			merged$1.delays.push(delays[i]);
		}
	});
	merged$1.delays[merged$1.delays.length - 1] = HOLD_MS;
	beats.hold = merged$1.delays.slice(0, -1).reduce((a, b$1) => a + b$1, 0);
	const k = size / S;
	return {
		width: size,
		height: size,
		frames: merged$1.frames.map((f) => upscale(f, S, S, k)),
		delays: merged$1.delays,
		beats,
		tier,
		item: art ? {
			x: itemX * k,
			y: hoverTop * k,
			width: art.w * k,
			height: art.h * k
		} : void 0
	};
}
/**
* Plays an open on a canvas, once, at whole device pixels with smoothing off, centred in the canvas,
* and leaves the hold frame showing. A canvas the page gives a CSS size is filled at the most whole
* pixels that fit; give `scale` for a set size. Throws for a capsule or copy there isn't.
*/
function playCapsuleOpen(canvas, options) {
	const open = capsuleOpenFrames({
		...options,
		size: S
	});
	if (!open) throw new Error(`No capsule open for "${options.capsule}"${options.copy ? ` with ${encode(options.copy)}` : ""}`);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No 2D context on that canvas");
	const dpr = globalThis.devicePixelRatio || 1;
	const el = canvas;
	const cssW = el.clientWidth || 0, cssH = el.clientHeight || 0;
	let k;
	if (options.scale !== void 0) {
		k = Math.max(1, Math.floor(options.scale));
		canvas.width = S * k;
		canvas.height = S * k;
		if (el.style) {
			el.style.width = `${S * k / dpr}px`;
			el.style.height = `${S * k / dpr}px`;
		}
	} else if (cssW && cssH) {
		if (el.style && dpr !== 1 && cssW === canvas.width && cssH === canvas.height) {
			el.style.width = `${cssW}px`;
			el.style.height = `${cssH}px`;
		}
		canvas.width = Math.max(1, Math.round(cssW * dpr));
		canvas.height = Math.max(1, Math.round(cssH * dpr));
		k = Math.max(1, Math.floor(Math.min(canvas.width / S, canvas.height / S)));
	} else {
		k = Math.max(1, Math.round(dpr));
		canvas.width = S * k;
		canvas.height = S * k;
	}
	const ox = Math.floor((canvas.width - S * k) / 2), oy = Math.floor((canvas.height - S * k) / 2);
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const starts = [];
	open.delays.reduce((t, d) => {
		starts.push(t);
		return t + d;
	}, 0);
	const last = open.frames.length - 1;
	const order = [
		...open.beats.land !== void 0 ? [["land", open.beats.land]] : [],
		...open.beats.rocks.map((t) => ["rock", t]),
		["crack", open.beats.crack],
		["pop", open.beats.pop],
		["hold", open.beats.hold]
	];
	let shown = -1, fired = 0, began = -1, handle = null, over = false, finish;
	const done = new Promise((r) => {
		finish = r;
	});
	const raf = globalThis.requestAnimationFrame;
	const caf = globalThis.cancelAnimationFrame;
	const later = (cb) => raf ? raf(cb) : setTimeout(() => cb(performance.now()), 16);
	const cancel = () => {
		if (handle === null) return;
		if (raf && caf) caf(handle);
		else clearTimeout(handle);
		handle = null;
	};
	const show = (i) => {
		if (i === shown) return;
		shown = i;
		const px = upscale(open.frames[i], S, S, k), w = S * k;
		let image;
		if (typeof ImageData === "function") image = new ImageData(px, w, w);
		else {
			image = ctx.createImageData(w, w);
			image.data.set(px);
		}
		ctx.putImageData(image, ox, oy);
	};
	const end = () => {
		if (over) return;
		over = true;
		cancel();
		finish();
	};
	const tick$1 = (now) => {
		handle = null;
		if (over) return;
		if (began < 0) began = now;
		const t = now - began;
		let i = shown < 0 ? 0 : shown;
		while (i < last && t >= starts[i + 1]) i++;
		show(i);
		while (fired < order.length && t >= order[fired][1]) options.onBeat?.(order[fired++][0]);
		if (i === last) {
			end();
			return;
		}
		handle = later(tick$1);
	};
	handle = later(tick$1);
	return {
		done,
		skip() {
			if (over) return;
			show(last);
			fired = order.length;
			options.onBeat?.("hold");
			end();
		},
		destroy() {
			end();
		}
	};
}
/**
* An open's picture from the lil guys Worker (`setLilGuysHost` moves it):
* `/g/<art version>/capsule-open/<capsule>-<copy or none>[-still]@<scale>.png`, an animated PNG that plays
* once and stays on its hold frame. `sheet` gives the sprite sheet's `.sheet.png`, or its `.sheet.json`
* with each frame's time and the beats.
*/
function capsuleOpenUrl(capsule, copy, options = {}) {
	const { scale: scale$1 = 1, host = lilGuysHost(), from = "drop", sheet } = options;
	return `${host}/g/${ART_VERSION}/capsule-open/${capsule}-${copy ? encode(copy) : "none"}${from === "still" ? "-still" : ""}${sheet ? ".sheet" : ""}${scale$1 > 1 ? "@" + scale$1 : ""}.${sheet === "json" ? "json" : "png"}`;
}

//#endregion
exports.ARM_NAMES = ARM_NAMES
exports.ART_VERSION = ART_VERSION
exports.AURAS = AURAS
exports.AURA_ODDS = AURA_ODDS
exports.BADGE_INKS = BADGE_INKS
exports.BAKED_SIZE = BAKED_SIZE
exports.BATCH_MAX = BATCH_MAX
exports.BUDDY_GUY_WIDTH = BUDDY_GUY_WIDTH
exports.CAPSULES = CAPSULES
exports.CAPSULE_FILE_SIZES = CAPSULE_FILE_SIZES
exports.CAPSULE_GRIDS = CAPSULE_GRIDS
exports.CAPSULE_ONLY = CAPSULE_ONLY
exports.CAPSULE_OPEN_SIZE = CAPSULE_OPEN_SIZE
exports.CAPSULE_STATES = CAPSULE_STATES
exports.CARD_EDGES = CARD_EDGES
exports.CARD_FRAGMENT = CARD_FRAGMENT
exports.CARD_FULL_MS = CARD_FULL_MS
exports.CARD_GOLDS = CARD_GOLDS
exports.CARD_HEIGHT = CARD_HEIGHT
exports.CARD_LOOKS = CARD_LOOKS
exports.CARD_WIDTH = CARD_WIDTH
exports.CRAFT_COST = CRAFT_COST
exports.CROWD_SIZES = CROWD_SIZES
exports.DEAL_PREFIX = DEAL_PREFIX
exports.DEEP_BLUE_PRINTS = DEEP_BLUE_PRINTS
exports.DEFAULT_COLORS = DEFAULT_COLORS
exports.DEFAULT_COLORS_DARK = DEFAULT_COLORS_DARK
exports.DEFAULT_COLORS_LIGHT = DEFAULT_COLORS_LIGHT
exports.EFFECTS = EFFECTS
exports.EMOTE_SET = EMOTE_SET
exports.EMOTE_SIZE = EMOTE_SIZE
exports.EMOTE_UNLOCKS = EMOTE_UNLOCKS
exports.FACE_BUDDY_SPOTS = FACE_BUDDY_SPOTS
exports.FACE_HEIGHT = FACE_HEIGHT
exports.FACE_SIZE = FACE_SIZE
exports.FACE_WIDTH = FACE_WIDTH
exports.FINISHES = FINISHES
exports.FOOT_NAMES = FOOT_NAMES
exports.FOOT_STYLES = FOOT_STYLES
exports.FOUNDER_COPIES = FOUNDER_COPIES
exports.FOUNDER_LOOK = FOUNDER_LOOK
exports.FOUNDER_RANK = FOUNDER_RANK
exports.FOUNDER_SEED = FOUNDER_SEED
exports.FRAME_HEIGHT = FRAME_HEIGHT
exports.FRAME_SLOTS = FRAME_SLOTS
exports.FRAME_WIDTH = FRAME_WIDTH
exports.FX_BADGES = FX_BADGES
exports.FX_IDS = FX_IDS
exports.GAMES = GAMES
exports.GLSL_COMMON = GLSL_COMMON
exports.GLSL_LOOKS = GLSL_LOOKS
exports.GOLD_RIM_DAYS = GOLD_RIM_DAYS
exports.GRADES = GRADES
exports.GRAPHIC_FINISHES = GRAPHIC_FINISHES
exports.GRID_SIZE = GRID_SIZE
exports.GUY_HEIGHT = GUY_HEIGHT
exports.GUY_TIERS = GUY_TIERS
exports.GUY_WIDTH = GUY_WIDTH
exports.HEADROOM = HEADROOM
exports.ICON_SIZE = ICON_SIZE
exports.LILGUYS_HOST = LILGUYS_HOST
exports.LIL_GUY_PLACEHOLDER = LIL_GUY_PLACEHOLDER
exports.LIL_GUY_PRESETS = LIL_GUY_PRESETS
exports.LIMITED_PAINT_COST = LIMITED_PAINT_COST
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
exports.PICTURE_VIEWS = PICTURE_VIEWS
exports.PINS = PINS
exports.PROFILE_SIZE = PROFILE_SIZE
exports.RECLAIMED = RECLAIMED
exports.REFINED = REFINED
exports.RETIRED_EYES = RETIRED_EYES
exports.SCRAP = SCRAP
exports.SHADER_FINISHES = SHADER_FINISHES
exports.SHADE_COUNT = SHADE_COUNT
exports.SHEET_MAX = SHEET_MAX
exports.SHINE_FRAGMENT = SHINE_FRAGMENT
exports.SHOWPIECE_WEIGHT = SHOWPIECE_WEIGHT
exports.SMALL_SIZE = SMALL_SIZE
exports.TAG_MAX = TAG_MAX
exports.TIER_ICONS = TIER_ICONS
exports.TITLE_MAX = TITLE_MAX
exports.TONE_NAMES = TONE_NAMES
exports.TRAIT_ICONS = TRAIT_ICONS
exports.TRAIT_SLOTS = TRAIT_SLOTS
exports.UNUSUAL_ONE_IN = UNUSUAL_ONE_IN
exports.VENUES = VENUES
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
exports.auraColors = auraColors
exports.bakeCard = bakeCard
exports.bakeGuy = bakeGuy
exports.bakeSquare = bakeSquare
exports.bakeView = bakeView
exports.bakedImage = bakedImage
exports.bodies = bodies
exports.boxOf = boxOf
exports.buddyAlone = buddyAlone
exports.buddyLift = buddyLift
exports.capsuleById = capsuleById
exports.capsuleFile = capsuleFile
exports.capsuleFrames = capsuleFrames
exports.capsuleHalves = capsuleHalves
exports.capsuleManifest = capsuleManifest
exports.capsuleOpenFrames = capsuleOpenFrames
exports.capsuleOpenTier = capsuleOpenTier
exports.capsuleOpenUrl = capsuleOpenUrl
exports.capsuleUrl = capsuleUrl
exports.cardArtFrames = cardArtFrames
exports.cardArtPlayer = cardArtPlayer
exports.cardFace = cardFace
exports.cardFaceAt = cardFaceAt
exports.cardFrames = cardFrames
exports.cardInputOf = cardInputOf
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
exports.createCrowd = createCrowd
exports.createShine = createShine
exports.createStadium = createStadium
exports.crowdPicture = crowdPicture
exports.crowdSeats = crowdSeats
exports.crowdSheet = crowdSheet
exports.crowdShine = crowdShine
exports.crowdSprite = crowdSprite
exports.dealOf = dealOf
exports.decode = decode
exports.decodeGuy = decodeGuy
exports.decodeLook = decodeLook
exports.defineLilGuy = defineLilGuyHere
exports.drawFrame = drawFrame
exports.dress = dress
exports.emoteFrames = emoteFrames
exports.encode = encode
exports.encodeApng = encodeApng
exports.encodeGif = encodeGif
exports.encodeGuy = encodeGuy
exports.encodeLook = encodeLook
exports.encodePng = encodePng
exports.eyes = eyes
exports.faceMoves = faceMoves
exports.faceSpec = faceSpec
exports.fewerColours = fewerColours
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
exports.hasGlyph = hasGlyph
exports.hash = hash
exports.hashNth = hashNth
exports.heads = heads
exports.inSeason = inSeason
exports.isEmote = isEmote
exports.isFounder = isFounder
exports.isFounderCopy = isFounderCopy
exports.isMove = isMove
exports.itemById = itemById
exports.itemFrame = itemFrame
exports.itemWeight = itemWeight
exports.items = items
exports.layered = layered
exports.lilGuyImg = lilGuyImg
exports.lilGuySize = lilGuySize
exports.lilGuyUrl = lilGuyUrl
exports.lilGuysFor = lilGuysFor
exports.lilGuysHost = lilGuysHost
exports.lookFor = lookFor
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
exports.paintCost = paintCost
exports.paintMonth = paintMonth
exports.paintOnSale = paintOnSale
exports.painted = painted
exports.paintsOnSale = paintsOnSale
exports.paletteOf = paletteOf
exports.palettes = palettes
exports.partCode = partCode
exports.partCost = partCost
exports.partName = partName
exports.pickable = pickable
exports.pinById = pinById
exports.playCapsuleOpen = playCapsuleOpen
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
exports.setLilGuysHost = setLilGuysHost
exports.setProgress = setProgress
exports.shadePalette = shadePalette
exports.sheetColumns = sheetColumns
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
exports.stadiumSeats = stadiumSeats
exports.starter = starter
exports.surfaceOf = surfaceOf
exports.tallyMarks = tallyMarks
exports.temperTint = temperTint
exports.textWidth = textWidth
exports.toAnimatedSvg = toAnimatedSvg
exports.toCardArtGif = toCardArtGif
exports.toCardArtPng = toCardArtPng
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
exports.unusual = unusual
exports.upscale = upscale
exports.venueFor = venueFor
exports.viewSize = viewSize
exports.visibleOneIn = visibleOneIn
exports.voxelColumns = voxelColumns
exports.voxelItem = voxelItem
exports.voxelMesh = voxelMesh
exports.wearOf = wearOf
exports.withItems = withItems
return exports;
})({});