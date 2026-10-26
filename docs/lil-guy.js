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
* How often each part turns up, for guys dealt from deal 3 on (seeds made by
* `makeSeed`). Older guys read the frozen `DEAL_2` tables at the end.
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
	2
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
	1
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
* The deal before 3 (seeds without the `3-` prefix, and plain names). Frozen:
* every guy already dealt from one of these keeps his parts, so these lists
* never change, not even to add a part. New parts and new weights go in the
* tables above, which only seeds made by `makeSeed` from deal 3 on read.
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
* Seeds made from deal 3 on start with this. They draw from today's parts and
* weights; anything else (an older seed, a plain name) draws from the frozen
* deal 2 tables, so a guy already dealt never changes when parts are added.
*/
const DEAL_PREFIX = "3-";
/** Which deal an input draws from. */
const dealOf = (input) => input.startsWith(DEAL_PREFIX) ? 3 : 2;
const DEAL_3 = {
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
	const w = dealOf(input) === 3 ? DEAL_3 : DEAL_2;
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
		"......####......",
		".....######.....",
		"..#..######..#..",
		"..##.######.##..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"....########....",
		".....######.....",
		"................"
	]),
	head("jellyfish", 7, false, [
		"................",
		"................",
		".....######.....",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..#.##.##.##.#..",
		"..#..#.##.#..#..",
		".#...#....#...#.",
		".#....#..#....#.",
		"................"
	]),
	head("octopus", 8, false, [
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
		"..############..",
		"..##.##..##.##..",
		".##..#....#..##.",
		".#............#.",
		"................"
	]),
	head("robot", 8, true, [
		"................",
		"................",
		"................",
		"...##########...",
		"..############..",
		"..############..",
		"..############..",
		".##############.",
		".##############.",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		".....######.....",
		"................",
		"................"
	]),
	head("cactus", 10, true, [
		"................",
		"......####......",
		".....######.....",
		"....########....",
		"....########....",
		".##.########.##.",
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
		"................",
		".....######.....",
		"....########....",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		".##############.",
		".##############.",
		"..############..",
		"....#......#....",
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
	head("toadstool", 7, true, [
		"................",
		"................",
		".....######.....",
		"...##########...",
		"..############..",
		".##############.",
		".##############.",
		".##############.",
		"..############..",
		"....########....",
		"....########....",
		"....########....",
		"....########....",
		"...##########...",
		"................",
		"................"
	]),
	head("bat", 8, false, [
		"................",
		"................",
		".#............#.",
		".##..........##.",
		".###.#....#.###.",
		".###.##..##.###.",
		".##.########.##.",
		".##############.",
		".##############.",
		".##############.",
		".#.#.######.#.#.",
		".....######.....",
		"................",
		"................",
		"................",
		"................"
	]),
	head("crab", 9, false, [
		"................",
		"................",
		"................",
		".##..........##.",
		".#.#........#.#.",
		"..##........##..",
		"...##.####.##...",
		"..############..",
		"..############..",
		".##############.",
		".##############.",
		"..############..",
		"...##########...",
		"..#.#......#.#..",
		"................",
		"................"
	]),
	head("heart", 8, true, [
		"................",
		"................",
		"................",
		"...####..####...",
		"..############..",
		"..############..",
		"..############..",
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
		"................",
		"..####....####..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"..############..",
		"...##########...",
		"...##########...",
		"...####..####...",
		"...###....###...",
		"....#......#....",
		"................"
	]),
	head("star", 8, false, [
		"................",
		".......##.......",
		"......####......",
		"......####......",
		".....######.....",
		".##############.",
		"..############..",
		"...##########...",
		"...##########...",
		"...##########...",
		"....########....",
		"...##########...",
		"..#####..#####..",
		"..####....####..",
		".###........###.",
		"................"
	]),
	head("acorn", 9, true, [
		"................",
		"................",
		".......##.......",
		".....######.....",
		"...#s#s##s#s#...",
		".#s#s#s##s#s#s#.",
		".##############.",
		"...##########...",
		"...##########...",
		"...##########...",
		"...##########...",
		"....########....",
		".....######.....",
		"......####......",
		"................",
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
		"....########....",
		".....######.....",
		"......####......",
		".......##.......",
		"................",
		"................"
	]),
	head("clover", 8, false, [
		"................",
		"...###....###...",
		"..#####..#####..",
		".######..######.",
		".##############.",
		".##############.",
		"..############..",
		"...##########...",
		"...##########...",
		"..############..",
		".##############.",
		".##############.",
		".######..######.",
		"..#####..#####..",
		"...###....###...",
		"................"
	]),
	head("disco", 8, true, [
		"................",
		"................",
		"................",
		".....##hh##.....",
		"....h##hh##h....",
		"...##hh##hh##...",
		"..h##hh##hh##h..",
		"..#hh##hh##hh#..",
		"..#hh##hh##hh#..",
		"..h##hh##hh##h..",
		"..h##hh##hh##h..",
		"..#hh##hh##hh#..",
		"...hh##hh##hh...",
		"....#hh##hh#....",
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
	eyes_("beans", ["e....e", "e....e"]),
	eyes_("shiny", ["we....we", "ee....ee"]),
	eyes_("happy", [".e....e.", "e.e..e.e"]),
	eyes_("sparkle", [
		"we....we",
		"ee....ee",
		"ee....ee"
	]),
	eyes_("wink", ["we....e.", "ee...e.e"]),
	eyes_("glossy", [
		"we....we",
		"ee....ee",
		"ew....ew"
	]),
	eyes_("excited", [
		"e......e",
		".e....e.",
		"e......e"
	]),
	eyes_("hearts", [
		"r.r..r.r",
		"rrr..rrr",
		".r....r."
	]),
	eyes_("lashes", [
		"e......e",
		".e....e.",
		".e....e."
	]),
	eyes_("chill", ["ss....ss", "we....we"]),
	eyes_("side-eye", [
		"ss....ss",
		"ew....ew",
		"ee....ee"
	]),
	eyes_("shades", ["weee..weee", ".ee....ee."]),
	eyes_("star", [
		".y....y.",
		"yyy..yyy",
		".y....y."
	]),
	eyes_("squint", ["ee....ee"]),
	eyes_("fired up", [
		"o......o",
		".o....o.",
		"ee....ee"
	]),
	eyes_("laser", [
		"..r....r..",
		"rrw....wrr",
		"..r....r.."
	]),
	eyes_("cyclops", [
		".ww.",
		"weee",
		"eeee"
	]),
	eyes_("sleepy", ["e.e....e.e", ".e......e."]),
	eyes_("dizzy", [
		".ee....ee.",
		"e.e....e.e",
		"ee......ee"
	]),
	eyes_("anime", [
		".eee..eee.",
		".we....we.",
		".ee....ee."
	]),
	eyes_("galaxy", [
		".ee....ee.",
		"eAwe..eAwe",
		".yA....yA."
	]),
	eyes_("diamond", [
		".aa....aa.",
		"awaA..awaA",
		".AA....AA."
	]),
	eyes_("dragon", [
		".y......y.",
		"yey....yey",
		"YeY....YeY"
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
	mouth("fang", ["m..m", ".mw."]),
	mouth("smirk", ["...m", "mmm."]),
	mouth("ooh", [
		".mm.",
		"mttm",
		".mm."
	]),
	mouth("tiny", [".mm."]),
	mouth("wobble", [
		"m.mm.m",
		".m..m.",
		"..tt.."
	]),
	mouth("toothy", ["mwwwwm", ".mmmm."]),
	mouth("tongue out", ["mmmm", "..t."]),
	mouth("flat", ["mmmm"]),
	mouth("gritted", ["mmmmmm", "mwmwmm"]),
	mouth("bubblegum", [
		"...cc.",
		"mm.cwc",
		"...cc."
	]),
	mouth("bunny", ["mmmm", "mwwm"]),
	mouth("vampire", [
		"m....m",
		".mmmm.",
		".w..w."
	]),
	mouth("wide", ["m....m", ".mmmm."]),
	mouth("gold tooth", [
		"mmmmmm",
		"mwwywm",
		".mmmm."
	]),
	mouth("grillz", [
		"mmmmmm",
		"mywyym",
		".mmmm."
	]),
	mouth("mustache", [
		"mm..mm",
		"m.mm.m",
		"..tt.."
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
	cheeks_("freckles", ["s.s....s.s"]),
	cheeks_("scar", [".......o..", "........o."]),
	cheeks_("band-aid", [".......xx."]),
	cheeks_("war paint", ["rr......rr"]),
	cheeks_("whiskers", ["mm......mm"]),
	cheeks_("hearts", ["r.r....r.r", ".r......r."]),
	cheeks_("shine", ["ww......ww"]),
	cheeks_("stripes", ["AA......AA", ".AA....AA."]),
	cheeks_("stars", [
		".y......y.",
		"yyy....yyy",
		".y......y."
	]),
	cheeks_("gold leaf", ["yY......Yy"]),
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
	])
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
		"a..",
		".o.",
		"..o"
	], 1),
	pair("horns", [
		"x.",
		"xx",
		"xx"
	], 1),
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
	centre("crown", [
		"y.y.y",
		"yyyyy",
		"YYrYY"
	]),
	centre("party hat", [
		"..x..",
		".aaA.",
		".xxx.",
		"aaaAa"
	]),
	centre("antenna", [
		"aa",
		"aA",
		"o."
	], 1),
	centre("unicorn horn", [
		".y",
		"yY",
		"yY"
	]),
	centre("star clip", [
		".y.",
		"yyy",
		".y."
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
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			const r = c.rows[c.crown + 2];
			for (let x = r.left; x <= r.right; x++) if ((x - r.left) % 3 !== 1) c.set(x, c.crown + 2, T.ACCENT);
			c.set(r.left, c.crown + 3, T.ACCENT);
			c.set(r.right, c.crown + 3, T.ACCENT_SHADE);
		}
	},
	{
		name: "mushroom",
		draw: (c) => {
			capRows(c, 3, T.RED, T.RED);
			const r = c.rows[c.crown + 2];
			c.set(r.left - 1, c.crown + 2, T.RED);
			c.set(r.right + 1, c.crown + 2, T.RED);
			const x = Math.floor(c.centre);
			c.set(x - 3, c.crown + 1, T.WHITE);
			c.set(x, c.crown, T.WHITE);
			c.set(x + 2, c.crown + 2, T.WHITE);
		}
	},
	{
		name: "eggshell",
		draw: (c) => {
			capRows(c, 2, T.WHITE, T.WHITE);
			const r = c.rows[c.crown + 2];
			for (let x = r.left; x <= r.right; x += 2) c.set(x, c.crown + 2, T.WHITE);
		}
	},
	{
		name: "frosting",
		draw: (c) => {
			capRows(c, 2, T.TRIM, T.TRIM);
			const r = c.rows[c.crown + 2];
			c.set(r.left + 1, c.crown + 2, T.TRIM);
			c.set(r.left + 4, c.crown + 2, T.TRIM);
			c.set(r.right - 2, c.crown + 2, T.TRIM);
			c.set(r.right - 2, c.crown + 3, T.TRIM);
			const x = Math.floor(c.centre);
			c.set(x - 3, c.crown + 1, T.ACCENT);
			c.set(x - 1, c.crown, T.GOLD);
			c.set(x + 1, c.crown + 1, T.LEAF);
			c.set(x + 3, c.crown, T.ACCENT);
		}
	},
	{
		name: "leafy top",
		draw: (c) => {
			c.paintRow(c.crown, T.LEAF);
			const r = c.rows[c.crown + 1];
			for (let x$1 = r.left; x$1 <= r.right; x$1 += 2) c.set(x$1, c.crown + 1, T.LEAF_SHADE);
			const x = Math.floor(c.centre);
			c.set(x, c.crown - 1, T.LEAF);
			if (c.crown > 2) c.set(x - 1, c.crown - 2, T.LEAF);
		}
	},
	{
		name: "beret",
		draw: (c) => {
			capRows(c, 1, T.ACCENT, T.ACCENT);
			const r = c.rows[c.crown];
			c.set(r.left - 1, c.crown, T.ACCENT);
			c.set(r.left - 2, c.crown + 1, T.ACCENT_SHADE);
			c.set(r.left - 1, c.crown + 1, T.ACCENT_SHADE);
			for (let x = r.left; x <= r.right; x++) c.set(x, c.crown - 1, T.ACCENT);
			if (c.crown > 2) c.set(Math.floor(c.centre), c.crown - 2, T.ACCENT_SHADE);
		}
	},
	{
		name: "witch hat",
		draw: (c) => {
			const cone = stamp([
				"..aa.",
				".aaA.",
				".xxx.",
				"aaaaA"
			]);
			seat(c, cone, c.centred(cone));
			const r = c.rows[c.crown];
			for (let x = r.left - 1; x <= r.right + 1; x++) c.set(x, c.crown, T.ACCENT);
		}
	},
	{
		name: "propeller",
		draw: (c) => {
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			c.paintRow(c.crown + 1, T.TRIM);
			const prop = stamp(["xxoaa", "..o.."]);
			c.draw(prop, c.centred(prop), Math.max(1, c.crown - 2));
		}
	},
	centre("mohawk", [
		".aa.",
		".aA.",
		".aA.",
		"aaAA"
	]),
	{
		name: "headphones",
		draw: (c) => {
			const cup = c.eyeLine - 3;
			const r = c.rows[cup + 1];
			const [left, right] = [r.left, r.right];
			for (let y = cup; y < cup + 3; y++) {
				c.set(left - 1, y, T.ACCENT_SHADE);
				c.set(left, y, T.ACCENT);
				c.set(right, y, T.ACCENT);
				c.set(right + 1, y, T.ACCENT_SHADE);
			}
			for (let y = c.crown; y < cup; y++) {
				const row = c.rows[y];
				if (!row) continue;
				c.set(row.left - 1, y, T.ACCENT_SHADE);
				c.set(row.right + 1, y, T.ACCENT_SHADE);
			}
			const top = c.rows[c.crown];
			for (let x = top.left; x <= top.right; x++) c.set(x, c.crown - 1, T.ACCENT_SHADE);
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
			const r = c.rows[c.crown + 1];
			const flowers = [
				T.ACCENT,
				T.GOLD,
				T.BLUSH
			];
			for (let x = r.left; x <= r.right; x++) {
				const top = c.topOf(x);
				if (top === null) continue;
				c.set(x, top, T.LEAF);
				if ((x - r.left) % 3 === 1) c.set(x, top - 1, flowers[Math.floor((x - r.left) / 3) % 3]);
			}
		}
	},
	pair("antlers", [
		"x.x",
		"xx.",
		".x."
	], 1),
	centre("chef hat", [
		".ww.ww.",
		"wwwwwww",
		"wwwwwww",
		".xxxxx."
	]),
	{
		name: "laurel",
		draw: (c) => {
			const r = c.rows[c.crown + 1];
			const mid = Math.floor(c.centre);
			for (let x = r.left; x <= r.right; x++) {
				if (x === mid - 1 || x === mid) continue;
				const top = c.topOf(x);
				if (top === null) continue;
				c.set(x, top - 1, T.GOLD_SHADE);
				if ((x - r.left) % 2 === 0) c.set(x + (x < mid ? -1 : 1), top - 2, T.GOLD);
			}
			for (let dy = 1; dy <= 3; dy++) {
				const row = c.rows[c.crown + dy];
				if (!row) continue;
				c.set(row.left - 1, c.crown + dy, dy % 2 ? T.GOLD : T.GOLD_SHADE);
				c.set(row.right + 1, c.crown + dy, dy % 2 ? T.GOLD : T.GOLD_SHADE);
			}
		}
	},
	centre("star crown", [
		"....y....",
		".y.yyy.y.",
		"yyy.y.yyy",
		".y.....y."
	], 0, 0),
	centre("on fire", [
		"...y...",
		"..yr.y.",
		".yrry..",
		"yrryrry"
	])
];

//#endregion
//#region src/parts/bodies.ts
const heart$1 = stamp([
	"r.r",
	"rrr",
	".r."
]);
const star$1 = stamp([
	".y.",
	"yyy",
	".y."
]);
const moon = stamp([
	".yy",
	"y..",
	".yy"
]);
const bolt = stamp([
	"..y",
	"yyy",
	"y.."
]);
/**
* The top row of a 3-row mark: a row under the crown, where the head is wide
* enough to hold it, as long as it stays a clear row above the eyes. On a head
* with no forehead to spare it goes on the belly under the mouth instead; on
* one with neither, it isn't drawn (a mark between the eyes reads as a face).
*/
const forehead = (c) => {
	const f = c.face;
	if (!f) return c.crown + 1;
	if (c.crown + 1 + 2 <= f.top - 2) return c.crown + 1;
	const belly = f.mouthBottom + 2;
	return belly + 2 <= c.bottom - 1 ? belly : null;
};
const mark = (c, s) => {
	const y = forehead(c);
	if (y !== null) c.draw(s, Math.floor(c.centre) - 1, y, true);
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
function rim$1(c, b$1, token, fill) {
	for (let y = b$1.top; y <= b$1.bottom; y++) for (let x = b$1.left; x <= b$1.right; x++) {
		const edgeX = x === b$1.left || x === b$1.right, edgeY = y === b$1.top || y === b$1.bottom;
		if (edgeX && edgeY) continue;
		if (edgeX || edgeY) c.set(x, y, token);
		else if (fill !== void 0) c.set(x, y, fill);
	}
}
/** Glasses that fit the eyes: a lens round each, a bridge, and arms to the side of the head. */
function fittedGlasses(c, frame, glass, glint) {
	const f = c.face;
	if (!f || !f.eyes.length) return;
	const boxes = f.eyes.map((_, k) => lensBox(c, k));
	boxes.forEach((b$1) => {
		rim$1(c, b$1, frame, glass);
		c.set(b$1.left + 1, b$1.top + 1, glint);
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
const accessories = [
	{
		name: "none",
		layer: "body",
		draw: () => {}
	},
	{
		name: "glasses",
		layer: "face",
		draw: (c) => fittedGlasses(c, T.ACCENT_SHADE, void 0, T.WHITE)
	},
	{
		name: "scarf",
		layer: "body",
		draw: (c) => {
			const y = c.eyeLine + 3;
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
			const y = c.eyeLine + 3;
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
				if (token) wear(c, x + dx, c.eyeLine + 3 + dy, token);
			}));
		}
	},
	{
		name: "bandana",
		layer: "body",
		draw: (c) => {
			const y = c.eyeLine + 3;
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
			const b$1 = lensBox(c, f.eyes.length - 1);
			rim$1(c, b$1, T.GOLD, T.LIGHT);
			c.set(b$1.left + 1, b$1.top + 1, T.WHITE);
			for (let y = b$1.bottom + 1; y <= Math.min(b$1.bottom + 2, c.bottom); y++) c.set(b$1.right, y, y % 2 ? T.GOLD : T.GOLD_SHADE);
		}
	},
	{
		name: "eye patch",
		layer: "over",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const e = f.eyes[0];
			for (let y = f.top - 1; y <= f.line; y++) for (let x = e.left - 1; x <= e.right + 1; x++) {
				const corner = (x === e.left - 1 || x === e.right + 1) && (y === f.top - 1 || y === f.line);
				if (!corner) c.set(x, y, T.EYE);
			}
			c.set(e.left, f.top, T.DEEP);
			for (let i = 1, x = e.right + 1, y = f.top - 1; c.isBody(x + i, y - i) && y - i > c.tip; i++) c.set(x + i, y - i, T.EYE);
		}
	},
	{
		name: "necklace",
		layer: "body",
		draw: (c) => {
			const y = c.eyeLine + 3;
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
			const x = Math.floor(c.centre) - 1, y = c.eyeLine + 3;
			wear(c, x, y, T.ACCENT);
			wear(c, x + 1, y, T.ACCENT_SHADE);
			wear(c, x, y + 1, T.GOLD);
			wear(c, x + 1, y + 1, T.GOLD_SHADE);
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
			const x = Math.floor(c.centre) - 1, y = c.eyeLine + 3;
			wear(c, x, y, T.ACCENT_SHADE);
			wear(c, x + 1, y, T.ACCENT_SHADE);
			for (let ty = y + 1; ty < c.bottom; ty++) {
				wear(c, x, ty, T.ACCENT);
				wear(c, x + 1, ty, T.ACCENT);
			}
			wear(c, x, c.bottom, T.ACCENT_SHADE);
			wear(c, x + 1, c.bottom, T.ACCENT_SHADE);
		}
	},
	{
		name: "lei",
		layer: "body",
		draw: (c) => {
			const y = c.eyeLine + 3;
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
			const y = Math.max(1, f.top - 3);
			const r = c.rows[y + 1];
			if (r) {
				for (let x = r.left; x <= r.right; x++) if (c.isBody(x, y + 1)) c.set(x, y + 1, T.DEEP);
			}
			for (const e of f.eyes) {
				const x0 = e.left - (e.right - e.left < 1 ? 1 : 0), x1 = Math.max(e.right, x0 + 1);
				for (let x = x0; x <= x1; x++) {
					c.set(x, y, x === x0 ? T.WHITE : T.ACCENT);
					c.set(x, y + 1, T.ACCENT_SHADE);
				}
			}
		}
	},
	{
		name: "gold chain",
		layer: "body",
		draw: (c) => {
			const y = c.eyeLine + 3;
			const r = c.rows[y];
			if (!r) return;
			for (let x$1 = r.left; x$1 <= r.right; x$1++) wear(c, x$1, y, (x$1 - r.left) % 2 ? T.GOLD_SHADE : T.GOLD);
			const x = Math.floor(c.centre) - 1;
			for (const [dx, dy, t] of [
				[
					-1,
					1,
					T.GOLD
				],
				[
					0,
					1,
					T.WHITE
				],
				[
					1,
					1,
					T.GOLD
				],
				[
					2,
					1,
					T.GOLD_SHADE
				],
				[
					0,
					2,
					T.GOLD
				],
				[
					1,
					2,
					T.GOLD_SHADE
				]
			]) if (c.isBody(x + dx, y + dy)) wear(c, x + dx, y + dy, t);
		}
	},
	{
		name: "heart shades",
		layer: "over",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const heart$2 = stamp([
				"r.r",
				"rrr",
				".r."
			]);
			const xs = f.eyes.map((e) => Math.round((e.left + e.right) / 2) - 1);
			const y = f.line - 1;
			for (const x of xs) {
				heart$2.forEach((row, dy) => row.forEach((t, dx) => {
					if (t) c.set(x + dx, y - 1 + dy, t);
				}));
				c.set(x, y, T.WHITE);
			}
			if (xs.length === 2) for (let x = xs[0] + 3; x < xs[1]; x++) c.set(x, y - 1, T.RED);
		}
	},
	{
		name: "masquerade",
		layer: "face",
		draw: (c) => {
			const f = c.face;
			if (!f || !f.eyes.length) return;
			const boxes = f.eyes.map((_, k) => lensBox(c, k));
			for (const b$1 of boxes) for (let y = b$1.top + 1; y < b$1.bottom; y++) for (let x = b$1.left; x <= b$1.right; x++) if (c.isBody(x, y)) c.set(x, y, T.GOLD);
			const l = boxes[0].left, r = boxes[boxes.length - 1].right;
			for (let x = l; x <= r; x++) if (c.isBody(x, f.line) && x > boxes[0].right && x < boxes[boxes.length - 1].left) c.set(x, f.line, T.GOLD_SHADE);
			if (boxes.length === 2) {
				const mid = Math.floor(c.centre);
				c.set(mid - 1, f.top, T.RED);
				c.set(mid, f.top, T.RED);
			}
			c.set(l, f.top - 1, T.GOLD);
			c.set(r, f.top - 1, T.GOLD);
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
		const x0 = this.centred(eye), top = this.eyeLine - eye.length + 1;
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
		this.face = {
			top: top + Math.max(0, firstRow),
			line: this.eyeLine,
			eyes: eyes$1,
			mouthTop: this.eyeLine + 1,
			mouthBottom: this.eyeLine + mouth$1.length
		};
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
	}
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
const wrap$1 = (v, n) => (v % n + n) % n;
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
			const s = shape(mask), step = Math.floor(t / 110) + print, out = [];
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
			const s = shape(mask), out = [], turn$1 = print % 2 ? -1 : 1, rx = Math.min(6.5, s.w / 2 - 1.5);
			for (let i = 0; i < 3; i++) {
				const a = turn$1 * t / 560 + i * 2.094 + print;
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
			const s = shape(mask), y = Math.max(1, s.top - 2 - Math.floor((t + print * 7) / 400) % 2), x0 = Math.round(s.cx) - 3, glint = Math.floor(t / 160) % 8, out = [];
			for (let x = x0; x <= x0 + 7; x++) out.push([
				x,
				y,
				x - x0 === glint || x - x0 === glint + 1 ? 0 : 1
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
				const life = Math.floor((t + i * 173 + print * 11) / 520), phase = (t + i * 173 + print * 11) % 520 / 520;
				const [x, y] = near[Math.floor(noise$1(i, life, print) * near.length)] ?? [0, 0];
				out.push(...phase < .35 || phase > .85 ? [[
					x,
					y,
					0
				]] : plus(x, y, phase < .6 ? 1 : 2));
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
				const span = i === 2 ? Math.max(3, s.top) : s.cy + 1, y = Math.round(span - wrap$1(Math.floor((t + i * 520 + print * 13) / 150), span + 3));
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
				][i], y = s.h - 1 - wrap$1(Math.floor((t + i * 470 + print * 9) / 120), s.h + 3);
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
				const x = x0 + 1 + (i * 2 + print) % 5, fall = wrap$1(Math.floor((t + i * 230) / 90), s.h - cy);
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
			const s = shape(mask), out = [], beat = Math.floor((t + print * 31) / 110), flash = beat % 5;
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
				const y = Math.round(s.cy - wrap$1(Math.floor((t + i * 700 + print * 17) / 170), s.cy + 4));
				const x = (i ? s.w - 4 : 0) + Math.floor(t / 340 + i) % 2;
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
				const fall = wrap$1(Math.floor((t + i * 311 + print * 7) / 170), s.h), x = wrap$1(Math.round(noise$1(i, print) * s.w + Math.sin((t + i * 400) / 600) * 1.2), s.w);
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
				const step = Math.floor((t + i * 377 + print * 5) / 150), y = wrap$1(step, s.h + 2) - 1, x = wrap$1(Math.round(noise$1(i, print) * s.w) - Math.floor(step / 2), s.w);
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
			"#7C5CFF",
			"#2A1D5C"
		],
		still: 600,
		cells: (mask, t, print) => {
			const step = Math.floor(t / 200);
			return ring(mask, 2).map(([x, y, d]) => [
				x,
				y,
				noise$1(x, y, step, print) > .9 ? 0 : d === 1 ? 1 : 2
			]);
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
			"#B98CFF"
		],
		still: 0,
		cells: (mask, t, print) => {
			const s = shape(mask), cx = s.w / 2 - .5, cy = s.cy + 2, top = Math.max(0, s.top - 4), shift$1 = Math.floor(t / 200) + print, out = [];
			for (let y = top; y < cy; y++) for (let x = 0; x < s.w; x++) {
				const d = Math.hypot((x - cx) / (s.w / 2), (y - cy) / (cy - top));
				if (d >= .74 && d <= 1) out.push([
					x,
					y,
					wrap$1(Math.floor((1 - d) / .087) + shift$1, 6)
				]);
			}
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
			const step = Math.floor((t + print * 13) / 120), out = [];
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
				const x = ax + Math.round(Math.sin(t / 700 + i * 1.7) * 1.5), y = ay + Math.round(Math.cos(t / 900 + i * 2.3));
				const phase = wrap$1(t + i * 397 + print * 29, 1600) / 1600;
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
			"#FFFFFF",
			"#FF4FD8",
			"#7A2C9E"
		],
		still: 300,
		cells: (mask, t, print) => {
			const s = shape(mask), step = Math.floor((t + print * 17) / 90);
			const tube = ring(mask, 1).map(([x, y]) => [
				x,
				y,
				Math.atan2(y - s.cy, x - s.cx)
			]).sort((a, b$1) => a[2] - b$1[2]);
			if (noise$1(Math.floor(step / 3), print, 5) > .9) return tube.map(([x, y]) => [
				x,
				y,
				2
			]);
			const hot = wrap$1(step, tube.length);
			return tube.filter((_, i) => noise$1(Math.floor(i / 3), step, print) > .06).map(([x, y], i) => [
				x,
				y,
				Math.abs(i - hot) <= 1 ? 0 : 1
			]);
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
			const sway = Math.round((Math.sin((t + print * 41) / 380) + 1) * 1.2) + 1, out = [];
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
			const s = shape(mask), turn$1 = print % 2 ? -1 : 1;
			const track = ring(mask, 2).filter(([, , d]) => d === 2).map(([x$1, y$1]) => [
				x$1,
				y$1,
				Math.atan2(y$1 - s.cy, x$1 - s.cx)
			]).sort((p, q) => p[2] - q[2]);
			if (!track.length) return [];
			const n = track.length, head$1 = wrap$1(turn$1 * Math.floor(t / 45) + print * 7, n), out = [];
			for (let j = 10; j >= 1; j--) {
				const [x$1, y$1] = track[wrap$1(head$1 - turn$1 * j, n)];
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
				const side = i ? 1 : -1, x = Math.round(s.w / 2 - .5 + side * (s.w / 2 - 2.5) + Math.sin(t / 800 + i * 3 + print) * 1.2);
				const y = Math.round(Math.max(2, s.top) + Math.sin(t / 520 + i * 2.1 + print) * 1.5 + i * 3);
				out.push([
					x,
					y,
					0
				], [
					x,
					y + 1,
					0
				]);
				if (Math.floor((t + i * 60) / 140) % 2 === 0) for (const d of [-1, 1]) out.push([
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
			"#E6FFF4",
			"#3DF2B0",
			"#7C5CFF"
		],
		still: 700,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [], step = Math.floor(t / 180);
			for (let x = 0; x < s.w; x++) {
				if (noise$1(x, Math.floor(step / 4), print) < .25) continue;
				const start = 1 + Math.round((Math.sin(x * .7 + t / 700 + print) + 1) * .8);
				const len = 2 + Math.round((Math.sin(x * .45 - t / 600 + print * 2) + 1) * 1.6);
				const glow = start + wrap$1(Math.floor(t / 150) + x, len + 4);
				for (let y = start; y < start + len; y++) out.push([
					x,
					y,
					y === glow ? 0 : y === start ? 2 : 1
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
			"#0E7A2C"
		],
		still: 500,
		cells: (mask, t, print) => {
			const s = shape(mask), out = [];
			for (let x = 0; x < s.w; x++) {
				if (noise$1(x, print, 11) < .4) continue;
				const speed = 70 + Math.floor(noise$1(x, print, 12) * 70), head$1 = wrap$1(Math.floor((t + noise$1(x, print) * 3e3) / speed), s.h + 8) - 2;
				for (let j = 0; j < 5; j++) out.push([
					x,
					head$1 - j,
					j === 0 ? 0 : j < 3 ? 1 : 2
				]);
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
			const s = shape(mask), turn$1 = print % 2 ? -1 : 1, out = [];
			for (const [x, y, d] of ring(mask, 4)) {
				const a = Math.atan2(y - s.cy, x - s.cx) / (2 * Math.PI), r = Math.hypot(x - s.cx, y - s.cy);
				const v = wrap$1(a * 3 + r * .3 - turn$1 * t / 700 + print * .1, 1);
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
				const cycle = 1500, local = wrap$1(t + i * 750 + print * 37, cycle), shot = Math.floor((t + i * 750 + print * 37) / cycle);
				const cx = i ? s.w - 3 - Math.floor(noise$1(shot, i) * 2) : 2 + Math.floor(noise$1(shot, i) * 2), cy = 2 + Math.floor(noise$1(shot, i, 2) * 3), p = local / cycle;
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
			"#7FE3FF",
			"#2F7FD6"
		],
		still: 250,
		cells: (mask, t, print) => {
			const out = [], p = wrap$1(t + print * 23, 1100) / 1100, d = 1 + Math.floor(p * 3);
			for (const [x, y, dd] of ring(mask, 3)) if (dd === d) out.push([
				x,
				y,
				d - 1
			]);
			else if (dd === d - 1 && (x + y) % 2) out.push([
				x,
				y,
				2
			]);
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
* A closed loop one pixel wide round the guy, `gx` cells clear of his sides
* and `gy` of his top and foot: a squarish ellipse (a superellipse, which
* never cuts his box's corners), in order round it, with no doubled corners.
*/
function loop(s, gx, gy) {
	const rx = (s.right - s.left) / 2 + gx, ry = (s.bottom - s.top) / 2 + gy, steps = 720;
	const pts = [];
	for (let i = 0; i < steps; i++) {
		const a = i / steps * TAU, c = Math.cos(a), sn = Math.sin(a);
		const x = Math.round(s.cx + rx * Math.sign(c) * Math.abs(c) ** .5), y = Math.round(s.cy + ry * Math.sign(sn) * Math.abs(sn) ** .5);
		const last = pts[pts.length - 1];
		if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
	}
	while (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
	const out = [];
	pts.forEach((c, i) => {
		const p = out[out.length - 1] ?? pts[pts.length - 1], n = pts[(i + 1) % pts.length];
		const corner = (p[0] === c[0] || p[1] === c[1]) && (n[0] === c[0] || n[1] === c[1]) && p[0] !== n[0] && p[1] !== n[1];
		if (!corner) out.push(c);
	});
	return out;
}
/**
* `count` arcs evenly spaced round a loop, each `len` cells long, travelling
* one cell every `speed` ms (`dir` 1 or -1): a bright head and a fading tail.
*/
function arcs(pts, t, count$1, len, speed, dir, offset) {
	const n = pts.length, head$1 = Math.floor(t / speed) * dir + offset, out = [];
	for (let k = 0; k < count$1; k++) for (let j = 0; j < len; j++) {
		const [x, y] = pts[wrap$1(Math.round(head$1 + k * n / count$1) - j * dir, n)];
		out.push([
			x,
			y,
			j < 2 ? 0 : 1
		]);
	}
	return out;
}
/**
* What a rarer aura adds round the guy, level by level, each in the aura's
* own colours: a twinkling haze (1), clean arcs of light running round a ring
* (2), a second, wider ring turning the other way and sparks rising off him
* (3), longer arcs and stars riding the outer ring (4), and for Origin a
* glowing rim, a lit ring and a crown of rays pulsing over his head (5).
* `mask` may be wider than the frame, so the rings can spread to the sides.
*/
function extras(mask, t, print, level) {
	if (level <= 0) return [];
	const s = shape(mask), out = [], phase = noise$1(print, 3);
	const beat = Math.floor(t / 110);
	const haze = level === 1 ? .08 : 0;
	for (const [x, y, d] of ring(mask, 3)) {
		const n = noise$1(x, y, beat, print, 31);
		if (d >= 2 && n < haze) out.push([
			x,
			y,
			n < haze / 3 ? 0 : 1
		]);
	}
	const gy = Math.min(2, s.top), inner = loop(s, 2, gy), outer = loop(s, 4, gy + 2);
	if (level >= 2) {
		const n = inner.length, long = level >= 4 ? .22 : .16;
		if (level >= 5) for (let i = 0; i < inner.length; i += 2) out.push([
			inner[i][0],
			inner[i][1],
			2
		]);
		out.push(...arcs(inner, t, level >= 4 ? 3 : 2, Math.max(3, Math.round(n * long)), 70, 1, phase * n));
	}
	if (level >= 3) {
		const n = outer.length;
		out.push(...arcs(outer, t, 3, Math.max(3, Math.round(n * (level >= 4 ? .14 : .1))), 55, -1, phase * n * 2));
		const count$1 = [
			0,
			0,
			0,
			3,
			4,
			5
		][level], life = 1300;
		for (let i = 0; i < count$1; i++) {
			const at = t + i * life / count$1 + print * 13, gen = Math.floor(at / life), f = at % life / life;
			const x = s.left - 2 + Math.floor(noise$1(i, gen, print, 5) * (s.right - s.left + 5));
			const y = s.bottom - Math.floor(f * (s.bottom - s.top + 5));
			out.push([
				x + Math.round(Math.sin(at / 210 + i) * .7),
				y,
				f < .55 ? 0 : 1
			]);
		}
	}
	if (level >= 4) {
		const stars = level >= 5 ? 3 : 2, n = outer.length;
		for (let i = 0; i < stars; i++) {
			const [x, y] = outer[wrap$1(Math.floor(t / 90) + Math.round(i * n / stars + phase * n), n)];
			out.push(...plus(x, y, 1));
		}
	}
	if (level >= 5) {
		const pulse = t / 90 % 6;
		for (let r = 1; r <= 4; r++) for (const dx of [
			-3,
			-2,
			0,
			2,
			3
		]) {
			const x = Math.round(s.cx + dx * (1 + r * .25)), y = s.top - r;
			const lit = Math.abs(r - pulse) < 1.2 || dx === 0 && r <= 2;
			if (lit && (dx === 0 || r >= 2)) out.push([
				x,
				y,
				Math.abs(r - pulse) < .6 ? 0 : 1
			]);
		}
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
	const seen = new Set(), step = Math.floor(t / 150);
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
		"#D9CCFF",
		"#5B3FA8",
		"#1C1233"
	],
	sapphire: [
		"#D6E6FF",
		"#2F6BFF",
		"#0B2A8A"
	],
	ruby: [
		"#FFD6DF",
		"#E0204F",
		"#6E0622"
	],
	pearl: [
		"#EFE6FF",
		"#6A54B8",
		"#140F2A"
	]
};
const FADE = [
	"#FFE07A",
	"#FF6FB5",
	"#7C5CFF"
];
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
function auraColor(id, k, finish, x, y, t) {
	const aura = auraById(id);
	if (!aura) return "#FFFFFF";
	if (ONE_OF_ONE_AURAS.includes(aura)) {
		if (noise$1(x, y, Math.floor(t / 160), 9) > .86) return hsl(wrap$1(x * 40 + y * 25 + t / 5, 360), .9, .72);
		return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	}
	if (finish === "fade") {
		const i = wrap$1(Math.floor((y + x * .5 + t / 140) / 2), 3);
		return k === 0 ? "#FFFFFF" : FADE[(i + k) % 3];
	}
	const ramp = RAMPS[finish];
	if (!ramp) return aura.colors[k] ?? aura.colors[aura.colors.length - 1];
	const glint = (finish === "sapphire" || finish === "ruby" || finish === "pearl") && noise$1(x, y, Math.floor(t / 180), 9) > .86;
	if (glint) return finish === "pearl" ? hsl(wrap$1(x * 40 + y * 25 + t / 6, 360), .85, .7) : ramp[0];
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
const rgb$3 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$2 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$4 = (a, b$1, t) => [
	0,
	1,
	2
].map((i) => a[i] + (b$1[i] - a[i]) * t);
const WHITE$1 = [
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
/** A colour turned round the wheel by `deg`, keeping how light and how strong it is. */
function turn(c, deg) {
	const [r, g, b$1] = c.map((v) => v / 255), max = Math.max(r, g, b$1), min = Math.min(r, g, b$1), l = (max + min) / 2, d = max - min;
	if (d < .04) return c;
	const s = d / (1 - Math.abs(2 * l - 1));
	const h = max === r ? 60 * ((g - b$1) / d % 6) : max === g ? 60 * ((b$1 - r) / d + 2) : 60 * ((r - g) / d + 4);
	return hue$1((h + deg + 720) % 360, Math.min(1, s), l);
}
/** One pixel of a copy with an effect, at `t` ms; `print` offsets it so no two copies move together. */
function fxColor(color, fx, x, y, t, print = 0) {
	const c = rgb$3(color), tt = t + print * 37;
	switch (fx) {
		case "shimmer": {
			const at = tt % 900 / 900 * 34 - 8;
			for (const band of [at, at - 14]) {
				const d = x + y - band;
				if (d >= 0 && d < 1.5) return "#FFFFFF";
				if (d >= -1.5 && d < 0) return hex$2(mix$4(c, [
					150,
					220,
					255
				], .75));
			}
			return noise(x, y, Math.floor(tt / 140)) > .94 ? "#FFFFFF" : color;
		}
		case "pulse": return hex$2(mix$4(c, Math.sin(tt / 260) > 0 ? WHITE$1 : [
			0,
			0,
			0
		], .4 * Math.abs(Math.sin(tt / 260))));
		case "holo": return hex$2(mix$4(c, hue$1(((x * 22 + y * 14 + tt / 5) % 360 + 360) % 360), .45));
		case "chroma": {
			const turned = turn(c, tt / 9 + x * 6);
			return turned === c ? hex$2(mix$4(c, hue$1(((tt / 9 + x * 6) % 360 + 360) % 360, .9, .6), .45)) : hex$2(turned);
		}
		case "starlight": {
			const n = noise(x, y, Math.floor(tt / 220), print);
			const night = mix$4(mix$4(c, [
				26,
				18,
				70
			], .62), [
				90,
				60,
				200
			], .12 * (1 + Math.sin(tt / 700 + x * .6 + y)));
			return n > .92 ? "#FFFFFF" : n > .84 ? hex$2(mix$4(night, [
				200,
				180,
				255
			], .7)) : hex$2(night);
		}
		case "embers": return hex$2(mix$4(c, [
			255,
			140,
			60
		], .12 + .1 * Math.sin(tt / 180 + x)));
		case "neon": return hex$2(mix$4(c, hue$1((tt / 12 % 360 + 360) % 360, 1, .62), .18));
		case "bubbles": return hex$2(mix$4(c, [
			190,
			235,
			255
		], .1 + .08 * Math.sin(tt / 300 + y)));
		case "hearts": return hex$2(mix$4(c, [
			255,
			140,
			190
		], .14 + .08 * Math.sin(tt / 400 + x * .5)));
		case "rime": {
			const reach = .5 + .5 * Math.sin(tt / 900 - y * .35);
			const n = noise(x, y, Math.floor(tt / 400), print);
			if (reach > .35 && n > .72) return n > .9 ? "#FFFFFF" : "#DDF4FF";
			return hex$2(mix$4(c, [
				190,
				228,
				255
			], .3 + .5 * reach));
		}
		case "static": {
			const burst = noise(Math.floor(tt / 90), print, 7) > .7;
			if (!burst) return y % 2 ? hex$2(mix$4(c, [
				0,
				0,
				0
			], .12)) : color;
			const r = noise(x, y, Math.floor(tt / 60));
			return r > .85 ? "#FFFFFF" : hex$2(mix$4(c, r > .5 ? [
				255,
				60,
				90
			] : [
				60,
				200,
				255
			], .45));
		}
		case "lava": {
			const flow = Math.sin(y * 1.1 + tt / 220 + Math.sin(x * .9 + tt / 700) * 2);
			const crust = mix$4(c, [
				40,
				18,
				12
			], .55);
			return flow > .55 ? hex$2(mix$4([
				255,
				120,
				30
			], [
				255,
				230,
				120
			], (flow - .55) * 2.2)) : flow > .25 ? hex$2(mix$4(crust, [
				220,
				70,
				20
			], .6)) : hex$2(crust);
		}
		case "electric": {
			const flash = noise(Math.floor(tt / 120), print, 11) > .82;
			return flash ? hex$2(mix$4(c, WHITE$1, .65)) : hex$2(mix$4(c, [
				120,
				190,
				255
			], .16));
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
	"embers"
];
/**
* Applies the effects of the copies a frame shows: `slots` says which slot
* each pixel belongs to (1 skin, 2 hat, 3 frame, 4 buddy, 5 aura, as in
* `FRAME_SLOTS`), `copies` the copy in each slot. Embers also send sparks up
* into the empty pixels above their copy.
*/
function applyFx(colors, slots, copies, t) {
	if (!copies.some((o) => o?.fx)) return colors;
	const out = colors.map((row) => [...row]);
	const size = copies.map((_, k) => slots.reduce((n, row) => n + row.filter((s) => s === k + 1).length, 0));
	const small = (k) => size[k] > 0 && size[k] < SMALL_COPY;
	slots.forEach((row, y) => row.forEach((s, x) => {
		const o = copies[s - 1];
		if (!s || !o?.fx || !colors[y][x]) return;
		const fx = fxColor(colors[y][x], o.fx, x, y, t, o.print);
		if (!small(s - 1)) {
			out[y][x] = fx;
			return;
		}
		const a = rgb$3(colors[y][x]), b$1 = rgb$3(fx);
		out[y][x] = hex$2(DARKENS.includes(o.fx) ? mix$4(a, b$1, .42) : mix$4(a, b$1, 1.5));
	}));
	copies.forEach((o, k) => {
		if (!o?.fx || !small(k) || OWN_EDGE.includes(o.fx)) return;
		const beat = Math.floor((t + o.print * 37) / 140);
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s || colors[y][x]) return;
			const from = NEAR2.find(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1);
			if (!from || noise(x, y, beat, o.print, 17) > .4) return;
			out[y][x] = hex$2(mix$4(rgb$3(out[y + from[1]][x + from[0]]), WHITE$1, .15));
		}));
	});
	copies.forEach((o, k) => {
		if (o?.fx !== "pulse") return;
		const breath = Math.sin((t + o.print * 37) / 260);
		if (breath < .2) return;
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s !== k + 1 || !colors[y][x]) return;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const nx = x + dx, ny = y + dy;
				if (ny >= 0 && ny < out.length && nx >= 0 && nx < out[0].length && !out[ny][nx]) out[ny][nx] = hex$2(mix$4(rgb$3(colors[y][x]), WHITE$1, .25 + .3 * breath));
			}
		}));
	});
	const dark = (c) => !!c && rgb$3(c).reduce((a, v) => a + v, 0) < 240;
	const edgeOf = (k) => {
		const cells = [];
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 || s && s !== k + 1) return;
			if (out[y][x] && !dark(colors[y][x])) return;
			if ([
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].some(([dx, dy]) => slots[y + dy]?.[x + dx] === k + 1)) cells.push([x, y]);
		}));
		return cells;
	};
	const risers = (o, k, spacing, draw) => {
		const tops = new Map();
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && !tops.has(x)) tops.set(x, y);
		}));
		for (const [x, top] of tops) {
			if (noise(x, o.print, 5) > .35) continue;
			const step = Math.floor((t + noise(x, o.print) * 2400) / spacing) % 9;
			if (step < 6) draw(x + (step % 4 === 3 ? 1 : 0), top - 1 - step, step);
		}
	};
	copies.forEach((o, k) => {
		if (!o?.fx) return;
		const tt = t + o.print * 37;
		if (o.fx === "neon") {
			if (noise(Math.floor(tt / 130), o.print, 3) > .93) return;
			for (const [x, y] of edgeOf(k)) out[y][x] = hex$2(hue$1(((tt / 12 + (x + y) * 8) % 360 + 360) % 360, 1, .6));
		}
		if (o.fx === "electric" && noise(Math.floor(tt / 90), o.print, 13) > .6) for (const [x, y] of edgeOf(k)) {
			const n = noise(x, y, Math.floor(tt / 90));
			if (n > .72) out[y][x] = n > .86 ? "#FFFFFF" : "#7FE8FF";
		}
		if (o.fx === "bubbles") risers(o, k, 160, (x, y, step) => {
			if (y >= 0 && y < out.length && x < out[0].length && !out[y][x]) out[y][x] = step > 3 ? "#E8F8FF" : "#9ED8FF";
		});
		if (o.fx === "hearts") risers(o, k, 220, (x, y) => {
			for (const [dx, dy, c] of [
				[
					-1,
					-1,
					"#FF8FBE"
				],
				[
					1,
					-1,
					"#FF6FA8"
				],
				[
					-1,
					0,
					"#FF6FA8"
				],
				[
					0,
					0,
					"#FF6FA8"
				],
				[
					1,
					0,
					"#E0457F"
				],
				[
					0,
					1,
					"#E0457F"
				]
			]) {
				const px = x + dx, py = y + dy;
				if (py >= 0 && py < out.length && px >= 0 && px < out[0].length && !out[py][px]) out[py][px] = c;
			}
		});
		if (o.fx === "static" && noise(Math.floor(tt / 90), o.print, 7) > .7) {
			const yy = Math.floor(noise(Math.floor(tt / 90), o.print, 9) * out.length);
			const row = out[yy], dir = noise(Math.floor(tt / 90), 1) > .5 ? 1 : -1, copy = [...row];
			slots[yy].forEach((s, x) => {
				if (s === k + 1 && copy[x]) {
					const nx = x + dir;
					if (nx >= 0 && nx < row.length) row[nx] = copy[x];
				}
			});
		}
	});
	copies.forEach((o, k) => {
		if (o?.fx !== "embers") return;
		const tops = new Map();
		slots.forEach((row, y) => row.forEach((s, x) => {
			if (s === k + 1 && !tops.has(x)) tops.set(x, y);
		}));
		for (const [x, top] of tops) {
			if (noise(x, o.print, 3) > .45) continue;
			const rise = 5, step = Math.floor((t + noise(x, o.print) * 900) / 110) % (rise + 3), y = top - 1 - step;
			if (step < rise && y >= 0 && !out[y][x]) out[y][x] = step < 2 ? "#FFE27A" : step < 4 ? "#FF8A2B" : "#C2412E";
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
	const frame = slot === "frame", hat = slot === "hat";
	const at = (x, y) => grid[y]?.[x] ?? 0;
	const air = (x, y) => hat && at(x, y) === 0 && x > 0 && y > 0 && x < GRID_SIZE - 1 && y < GRID_SIZE - 1;
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
					if (FACE.has(n) || hat && n !== 0 && n !== T.OUTLINE && !own(slot, n) && !taken.has((y + ny) * GRID_SIZE + x + nx)) crowded++;
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
	const set = [];
	grid.forEach((row, y) => row.forEach((t, x) => {
		if (slot === "frame") {
			if (own("frame", t) && edge(x, y)) set.push([x, y]);
			return;
		}
		if (t !== T.OUTLINE) return;
		if (!edge(x, y) && N4.every(([dx, dy]) => grid[y + dy][x + dx] !== 0)) return;
		if ([
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		].some(([dx, dy]) => own(slot, grid[y + dy]?.[x + dx] ?? 0))) set.push([x, y]);
	}));
	for (const [x, y] of set) grid[y][x] = (x + y) % 2 ? T.GOLD : T.GOLD_SHADE;
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
	const base = (o.date ? `${o.date.slice(0, 4)} ` : "") + (item?.name ?? o.item);
	const tally = (o.souvenir ? "Souvenir " : "") + (o.fx ? `${EFFECTS[o.fx].name} ` : "") + (o.tally !== void 0 ? "Tallied " : "");
	if (FINISHES[o.finish].aura) return `${tally}★ ${base}${o.finish === "classic" ? "" : ` | ${FINISHES[o.finish].name}`}`;
	if (o.finish === "plain") return tally + base;
	const look = o.finish === "nebula" ? nebulaPhase(o.print) : o.finish === "tempered" ? special(o) ? "Deep Blue" : `${temperTint(o.print)} Tempered` : FINISHES[o.finish].name;
	return `${tally}${base} | ${look}`;
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
	const item = pool[hash(`${seed}|item`) % pool.length];
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
	const fx = rollFx(unit(`${seed}|fx`), false);
	if (fx) o.fx = fx;
	return o;
}
/** Which slot a copy goes in. */
function slotOf(o) {
	return itemById(o.item)?.slot;
}
const rgb$2 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
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
const PAINT = {
	"plain": (_x, _y, _l, _p, original) => original,
	"sunset": (x, y, l, p) => {
		const t = Math.max(0, Math.min(1, (x + y * .5 - 2 + p % 100 / 12) / 14));
		const c = t < .5 ? mix$3(rgb$2("#F5C542"), rgb$2("#E55AA8"), t * 2) : mix$3(rgb$2("#E55AA8"), rgb$2("#7A4BE0"), (t - .5) * 2);
		return shaded(c, l);
	},
	"tempered": (x, y, l, p) => {
		const stops = TINTS[temperTint(p)];
		const band = Math.floor(((x + y + p % 11) % 12 + 12) % 12 / 3);
		return shaded(rgb$2(stops[[
			0,
			1,
			2,
			1
		][band]]), l);
	},
	"nebula": (x, y, l, p) => {
		const phase = nebulaPhase(p);
		const base = phase === "Red Giant" ? rgb$2("#D0102E") : phase === "Blue Moon" ? rgb$2("#1E4FE8") : phase === "Black Hole" ? rgb$2("#2A1E3A") : rgb$2([
			"#8A2AB0",
			"#3A2AB0",
			"#2A6AB0",
			"#B02A8A"
		][p % 4]);
		const c = cellNoise(p, x, y, 2) < .2 ? mix$3(base, rgb$2("#FFD6F0"), .55) : base;
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
		return mix$3(shaded(c, l), [
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
		return mix$3(inverted, [
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
		if ((x + y) % 6 === 0 && l > .5) return rgb$2("#FFFBE6");
		return l > .75 ? rgb$2("#FFF1B0") : l > .5 ? rgb$2("#F2C230") : l > .3 ? rgb$2("#C8901E") : rgb$2("#7A5212");
	}
};
const PRIMER = rgb$2("#8B9097");
/**
* Paints one cell of an owned item: its finish, then its wear. Chips land in
* places fixed by the print, so a copy always wears the same way, and how many
* show is the scuff. `glint` is set once the first Box Fresh glint has been
* placed.
*/
function paintCell(color, x, y, o, state) {
	const original = rgb$2(color);
	let c = PAINT[o.finish](x, y, lum$1(original), o.print, original);
	if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, .9) * .45) c = mix$3(PRIMER, c, .25);
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
	return hex$1(c);
}

//#endregion
//#region src/items.ts
const grid16 = (name, rows) => {
	if (rows.length !== GRID_SIZE || rows.some((r) => r.length !== GRID_SIZE)) throw new Error(`Skin "${name}" must be drawn on a 16x16 grid`);
	return stamp(rows);
};
const on = (rows, dx = 0, sink = 1) => {
	const s = stamp(rows);
	return (c) => seat(c, s, c.centred(s) + dx, sink);
};
const onPair = (rows, inset$1 = 0) => {
	const left = stamp(rows);
	const right = mirror(left);
	return (c) => {
		const r = c.rows[c.shoulder()];
		seat(c, left, r.left + inset$1);
		seat(c, right, r.right - inset$1 - width(right) + 1);
	};
};
const L = (n) => LOCAL + n - 1;
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
		name: "Gem",
		free: true,
		colors: ["#E3E7EE", "#9AA3B2"],
		draw: on([
			"..waaA..",
			".waaaaA.",
			"..aaAA..",
			"121aA121"
		])
	},
	{
		id: "amountle.crown",
		game: "amountle",
		name: "Gem crown",
		colors: [
			"#FFD25A",
			"#E0A62E",
			"#3FD1C1",
			"#A6F4EA"
		],
		draw: on([
			"1...4...1",
			"11.141.11",
			"111111111",
			"134313431",
			"222222222"
		], 0, 2)
	},
	{
		id: "halfsies.bowl",
		game: "halfsies",
		name: "Half pot",
		free: true,
		colors: [],
		draw: on([
			"....AA....",
			"..xaaaaA..",
			".xaaaaaaA.",
			"AAAAAAAAAA"
		])
	},
	{
		id: "halfsies.scale",
		game: "halfsies",
		name: "Scale dish",
		colors: [
			"#FFFFFF",
			"#D9DEE6",
			"#2B2F38",
			"#7DF0A0"
		],
		draw: on([
			"...11...",
			".211112.",
			"21111112",
			"33433433"
		])
	},
	{
		id: "stackdle.cube",
		game: "stackdle",
		name: "Little block",
		free: true,
		colors: [],
		draw: on([
			".xA..xA.",
			"xaaaaaaA",
			"aaaaaaaA",
			"AAAAAAAA"
		])
	},
	{
		id: "stackdle.tower",
		game: "stackdle",
		name: "Tower",
		colors: [
			"#FF8FB1",
			"#E0628A",
			"#FFB03B",
			"#E58A1F",
			"#6FA8FF",
			"#4A84E0"
		],
		draw: on([
			"...112..",
			"..33334.",
			"..33334.",
			".555556.",
			".555556."
		], 0, 2)
	},
	{
		id: "flipsies.cap",
		game: "flipsies",
		name: "Bottle cap",
		free: true,
		colors: [],
		draw: on([
			".xaaaaA.",
			"xaaaaaaA",
			"aAaAaAaA"
		])
	},
	{
		id: "flipsies.landed",
		game: "flipsies",
		name: "Landed bottle",
		colors: [
			"#C4E8FB",
			"#93CDEE",
			"#3E7BE0",
			"#FFFFFF"
		],
		draw: on([
			".333.",
			".111.",
			"11112",
			"44442",
			"11112"
		])
	},
	{
		id: "puttsies.visor",
		game: "puttsies",
		name: "Golf visor",
		free: true,
		colors: [],
		draw: (c) => {
			const y = Math.min(c.crown + 1, c.floor);
			capRows(c, y - c.crown + 1, T.ACCENT, T.ACCENT_SHADE);
			const r = c.rows[y];
			if (!r) return;
			for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, y, T.ACCENT_SHADE);
		}
	},
	{
		id: "puttsies.flag",
		game: "puttsies",
		name: "Pin flag",
		colors: [
			"#8A8F99",
			"#E5484D",
			"#B8313A",
			"#7ED957",
			"#4CAF50",
			"#2E7D32"
		],
		draw: on([
			"....1222",
			"....1223",
			"....1...",
			".4441445",
			"55555556"
		])
	},
	{
		id: "weighsies.wedge",
		game: "weighsies",
		name: "Cheese wedge",
		free: true,
		colors: [
			"#FFBE3A",
			"#D9931F",
			"#B8761A"
		],
		draw: on([
			"......1.",
			"....1111",
			"..113111",
			"11111131",
			"22222222"
		])
	},
	{
		id: "weighsies.scale",
		game: "weighsies",
		name: "Balance",
		colors: [
			"#E8B84A",
			"#B9852A",
			"#FFF1B0"
		],
		draw: on([
			"....3....",
			"311111112",
			"1...1...1",
			"322.1.322",
			"...112..."
		])
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
			"#9C6E43"
		],
		draw: on([
			".55555.",
			"5131315",
			"5324235",
			"5131315",
			".55555."
		])
	},
	{
		id: "cutsies.chef",
		game: "cutsies",
		name: "Chef hat",
		about: "A chef's tall white toque, for the one who does the cutting in Cutsies.",
		colors: [
			"#FFFFFF",
			"#DCE3EC",
			"#B9C4D2"
		],
		draw: on([
			".11.111.",
			"11111112",
			"11111122",
			".111112.",
			".333333."
		])
	},
	{
		id: "tiltsies.ears",
		game: "tiltsies",
		name: "Hamster ears",
		free: true,
		colors: ["#EDB57D", "#FFB3A7"],
		draw: onPair([
			"11.",
			"121",
			"111"
		], 0)
	},
	{
		id: "tiltsies.buddy",
		game: "tiltsies",
		name: "Hamster buddy",
		colors: [
			"#EDB57D",
			"#FFE7CB",
			"#2A1B10",
			"#FF9AA4"
		],
		draw: on([
			"1.....1",
			"1111111",
			"1311131",
			"1124211",
			".22222."
		])
	},
	{
		id: "trackdle.cap",
		game: "trackdle",
		name: "Pit cap",
		free: true,
		colors: ["#23262D", "#FFFFFF"],
		draw: (c) => {
			capRows(c, 2, T.ACCENT, T.ACCENT_SHADE);
			const r = c.rows[c.crown + 1];
			for (let x = r.left; x <= r.right; x++) c.set(x, c.crown + 1, (x - r.left) % 2 ? L(1) : L(2));
			for (let x = r.right + 1; x <= Math.min(r.right + 2, 14); x++) c.set(x, c.crown + 1, T.ACCENT_SHADE);
		}
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
			"#6FA8D8"
		],
		draw: on([
			"...11111...",
			"..1133112..",
			".111331112.",
			".111331112.",
			".111331122.",
			"44444445554"
		], 0, 2)
	},
	{
		id: "amountle.cluster",
		game: "amountle",
		name: "Big gem",
		colors: [
			"#3FD1C1",
			"#1F9C90",
			"#A6F4EA",
			"#FFD25A",
			"#E0A62E"
		],
		draw: on([
			"..33112..",
			".3311112.",
			"..11112..",
			"...112...",
			"444454444"
		], 0, 2)
	},
	{
		id: "halfsies.helmet",
		game: "halfsies",
		name: "Pot helmet",
		colors: [
			"#E07B4C",
			"#B85A34",
			"#F4A77C",
			"#5E2A1C",
			"#F6DCBB"
		],
		draw: (c) => {
			capRows(c, 2, L(1), L(2));
			const r = c.rows[c.crown + 2];
			for (let x$1 = r.left - 1; x$1 <= r.right + 1; x$1++) c.set(x$1, c.crown + 2, (x$1 - r.left) % 2 ? L(5) : L(4));
			const x = Math.floor(c.centre);
			if (c.crown > 1) {
				c.set(x - 1, c.crown - 1, L(3));
				c.set(x, c.crown - 1, L(1));
			}
		}
	},
	{
		id: "stackdle.ring",
		game: "stackdle",
		name: "Ring",
		colors: ["#FF8FB1", "#E0628A"],
		draw: on([
			".211112.",
			"21111112",
			"22222222"
		])
	},
	{
		id: "flipsies.beret",
		game: "flipsies",
		name: "Bullseye beret",
		colors: [
			"#FFFFFF",
			"#8EC5F0",
			"#E5484D"
		],
		draw: on([
			"....3....",
			"..22222..",
			".2211122.",
			"221131122",
			".2211122."
		], 0, 2)
	},
	{
		id: "puttsies.tam",
		game: "puttsies",
		name: "Golf tam",
		colors: [
			"#2E7D4F",
			"#1F5C38",
			"#F2C230",
			"#E5484D"
		],
		draw: on([
			"...33...",
			".111111.",
			"14111141",
			"22222222"
		])
	},
	{
		id: "weighsies.dumbbell",
		game: "weighsies",
		name: "Dumbbell",
		colors: [
			"#4A4E5E",
			"#9AA0A8",
			"#D9DEE6"
		],
		draw: on([
			"13.....13",
			"112222211",
			"11.....11"
		])
	},
	{
		id: "cutsies.orange",
		game: "cutsies",
		name: "Orange half",
		colors: [
			"#FF9F2E",
			"#E07B14",
			"#FFD08A",
			"#FFF1D6"
		],
		draw: on([
			"..3111..",
			".311111.",
			"31111112",
			"43434343"
		])
	},
	{
		id: "tiltsies.seed",
		game: "tiltsies",
		name: "Sunflower seed",
		colors: ["#3A3A42", "#E8E4DA"],
		draw: on([
			"...1...",
			"..121..",
			".12121.",
			"1212121",
			"1111111"
		], 0, 2)
	},
	{
		id: "trackdle.trophy",
		game: "trackdle",
		name: "Trophy",
		colors: [
			"#E8A81E",
			"#A8700F",
			"#FFE9A0"
		],
		draw: on([
			"1.313.1",
			"1111111",
			".11111.",
			"..121..",
			".22222."
		])
	},
	{
		id: "amountle.coin-stack",
		game: "amountle",
		name: "Coin stack",
		colors: [
			"#FFD25A",
			"#E0A62E",
			"#FFF1B0",
			"#B8781A"
		],
		draw: on([
			".3311.",
			".4242.",
			"33111.",
			"42424.",
			".33111",
			".42424"
		])
	},
	{
		id: "halfsies.sandwich",
		game: "halfsies",
		name: "Half sandwich",
		colors: [
			"#F6DCA8",
			"#D9A866",
			"#7DD87A",
			"#E5484D",
			"#FFE38F",
			"#B07444"
		],
		draw: on([
			"66......",
			"6116....",
			"653316..",
			"6443516.",
			"66666666"
		], 0, 2)
	},
	{
		id: "stackdle.arch",
		game: "stackdle",
		name: "Arch",
		colors: [
			"#6FA8FF",
			"#4A84E0",
			"#B5D3FF"
		],
		draw: on([
			"3311112",
			"3111112",
			"11...12"
		])
	},
	{
		id: "flipsies.cup",
		game: "flipsies",
		name: "Flipped cup",
		colors: [
			"#E5484D",
			"#B83236",
			"#FFFFFF",
			"#FF7A7E"
		],
		draw: on([
			".4112.",
			".4112.",
			"411112",
			"333333"
		])
	},
	{
		id: "puttsies.argyle",
		game: "puttsies",
		name: "Argyle bucket",
		colors: [
			"#F4EDE0",
			"#3A9466",
			"#2E7D4F",
			"#E5484D"
		],
		draw: on([
			"...1311...",
			"..141141..",
			"..311311..",
			"2222222222"
		])
	},
	{
		id: "weighsies.feather",
		game: "weighsies",
		name: "Feather",
		colors: [
			"#E6DCFF",
			"#B39EEC",
			"#7A5FD0",
			"#4A4E5E"
		],
		draw: on([
			"......11",
			".....121",
			"....121.",
			"...121..",
			"44434444"
		])
	},
	{
		id: "cutsies.banana",
		game: "cutsies",
		name: "Banana",
		colors: [
			"#FFE066",
			"#E0B020",
			"#FFF4B0",
			"#6A4A1E"
		],
		draw: on([
			"4.......4",
			"13.....31",
			".1333331.",
			"..22222.."
		])
	},
	{
		id: "tiltsies.wheel",
		game: "tiltsies",
		name: "Hamster wheel",
		colors: [
			"#C9CED8",
			"#8A93A3",
			"#EDB57D",
			"#2A1B10"
		],
		draw: on([
			".11111.",
			"1.2.2.1",
			"1.343.1",
			"1.333.1",
			".11111."
		], 0, 2)
	},
	{
		id: "trackdle.goggles",
		game: "trackdle",
		name: "Race goggles",
		colors: [
			"#2B2F38",
			"#6FA8D8",
			"#C4E8FB",
			"#FF7A2F"
		],
		draw: (c) => {
			c.paintRow(c.crown, L(4));
			on([
				".11.11.",
				"1321321",
				".11.11."
			], 0, 2)(c);
		}
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
* A buddy's drawing: at most 5x5, the corner the guy leaves it (with a
* pixel round it for its outline). `o` is an eye, in the guy's outline
* colour, so it stays dark whatever finish the buddy has.
*/
const pet = (name, rows) => {
	if (rows.length > 5 || rows.some((r) => r.length > 5)) throw new Error(`Buddy "${name}" must fit in 5x5`);
	return stamp(rows);
};
/**
* A tiny pet that sits at his feet, bottom right, in front of everything.
* Each is a bold shape of its own (a gem, a drop, a bean, a cone) with a lit
* side, a shaded side and a face, filling as much of its 5x5 as it can, so it
* reads at a glance on any guy and any frame.
*/
const buddies = [
	{
		id: "amountle.gemling",
		game: "amountle",
		name: "Gemling",
		colors: [
			"#3FD1C1",
			"#1F9C90",
			"#C8FFF7"
		],
		art: pet("gemling", [
			".333.",
			"31112",
			"1o1o2",
			".112.",
			"..2.."
		])
	},
	{
		id: "halfsies.pea",
		game: "halfsies",
		name: "Pea pod",
		colors: [
			"#7CC45A",
			"#3E8A2A",
			"#C6F59A",
			"#2E6B20"
		],
		art: pet("pea pod", [
			"...4.",
			".334.",
			"31112",
			"1o1o2",
			".122."
		])
	},
	{
		id: "stackdle.cubelet",
		game: "stackdle",
		name: "Cubelet",
		colors: [
			"#FFB03B",
			"#D97A12",
			"#FFE0A0"
		],
		art: pet("cubelet", [
			"33332",
			"31112",
			"1o1o2",
			"11112",
			"22222"
		])
	},
	{
		id: "flipsies.droplet",
		game: "flipsies",
		name: "Droplet",
		colors: [
			"#5CB8F2",
			"#2F7CC8",
			"#FFFFFF"
		],
		art: pet("droplet", [
			"..1..",
			".311.",
			"31112",
			"1o1o2",
			".122."
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
			".112.",
			"1o1o2",
			"11122",
			".222.",
			".343."
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
			"33.33",
			"34143",
			"1o1o2",
			".132.",
			"..2.."
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
			"#B05A30"
		],
		art: pet("seedling", [
			"11.11",
			".121.",
			"33334",
			"3o3o4",
			".444."
		])
	},
	{
		id: "tiltsies.hamlet",
		game: "tiltsies",
		name: "Hamlet",
		colors: [
			"#F2B66D",
			"#C98A45",
			"#FFE4C2",
			"#FF9EBB"
		],
		art: pet("hamlet", [
			"2...2",
			"11112",
			"1o1o2",
			"33433",
			".333."
		])
	},
	{
		id: "trackdle.snail",
		game: "trackdle",
		name: "Turbo snail",
		colors: [
			"#FF8A3A",
			"#C85A14",
			"#FFD08A",
			"#9FD18A",
			"#5FA04A"
		],
		art: pet("turbo snail", [
			".11.o",
			"13214",
			"12214",
			"44444"
		])
	},
	{
		id: "amountle.jellybean",
		game: "amountle",
		name: "Jelly bean",
		colors: [
			"#FF5C8A",
			"#C93A66",
			"#FFC2D4"
		],
		art: pet("jelly bean", [
			".31..",
			"3111.",
			"1o1o1",
			"11112",
			".222."
		])
	},
	{
		id: "amountle.piglet",
		game: "amountle",
		name: "Piglet bank",
		colors: [
			"#FFA3C0",
			"#E5799C",
			"#FFD2E0",
			"#F2C230",
			"#C8406E"
		],
		art: pet("piglet bank", [
			"2.4.2",
			"31112",
			"1o1o2",
			"13312",
			".2.2."
		])
	},
	{
		id: "halfsies.yolk",
		game: "halfsies",
		name: "Sunny egg",
		colors: [
			"#FFFFFF",
			"#D5DBE3",
			"#FFC93A",
			"#E59A12"
		],
		art: pet("sunny egg", [
			".11..",
			"13331",
			"1o3o1",
			"13342",
			".122."
		])
	},
	{
		id: "halfsies.berry",
		game: "halfsies",
		name: "Berry half",
		colors: [
			"#F0435A",
			"#B82A40",
			"#FFC2CC",
			"#5CB85C"
		],
		art: pet("berry half", [
			".444.",
			"13331",
			"1o3o2",
			".132.",
			"..2.."
		])
	},
	{
		id: "stackdle.pyramid",
		game: "stackdle",
		name: "Pyramid",
		colors: [
			"#FF8FB1",
			"#D9557F",
			"#FFC9DA"
		],
		art: pet("pyramid", [
			"..3..",
			".312.",
			".312.",
			"3o1o2",
			"11122"
		])
	},
	{
		id: "stackdle.brickling",
		game: "stackdle",
		name: "Brickling",
		colors: [
			"#5C9BFF",
			"#2F64C8",
			"#B5D3FF"
		],
		art: pet("brickling", [
			".3.3.",
			"33332",
			"1o1o2",
			"11112",
			"22222"
		])
	},
	{
		id: "flipsies.shortstack",
		game: "flipsies",
		name: "Short stack",
		colors: [
			"#E8A04E",
			"#9A5A20",
			"#F8CF8A",
			"#FFF39A",
			"#7A3A10"
		],
		art: pet("short stack", [
			"..4..",
			".333.",
			"1o1o1",
			"25522",
			"11111"
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
			"#FF8A2B"
		],
		art: pet("rubber duck", [
			".31..",
			"1o44.",
			".11.3",
			"31112",
			".222."
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
			"#3A9466",
			"#256B47"
		],
		art: pet("gopher", [
			"2...2",
			"11112",
			"1o1o2",
			"13312",
			"44445"
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
			"#FFFFFF"
		],
		art: pet("hazard frog", [
			"44.44",
			"4o1o4",
			"11112",
			"13332",
			".1.2."
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
			"#E3A52E"
		],
		art: pet("cheddar", [
			"...3.",
			"..311",
			".3141",
			"1o1o1",
			"22222"
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
			"#FF8A2B"
		],
		art: pet("chick", [
			"..3..",
			".311.",
			"1o4o2",
			"11112",
			".4.4."
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
			"#4FAE5C"
		],
		art: pet("cherries", [
			"..44.",
			".4..4",
			"31.31",
			"12.12"
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
			"4.5.4",
			".454.",
			"31212",
			"1o1o2",
			".212."
		])
	},
	{
		id: "tiltsies.rolly",
		game: "tiltsies",
		name: "Rolly",
		colors: [
			"#D8EEF8",
			"#8EBFD8",
			"#FFFFFF",
			"#EDB57D",
			"#CC8E55"
		],
		art: pet("rolly", [
			".312.",
			"34452",
			"1o4o2",
			"14552",
			".222."
		])
	},
	{
		id: "tiltsies.sunflower",
		game: "tiltsies",
		name: "Sunflower",
		colors: [
			"#FFD23A",
			"#E0A61E",
			"#D9A066",
			"#4FAE5C"
		],
		art: pet("sunflower", [
			".1.1.",
			"13331",
			"3o3o3",
			"13331",
			".242."
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
			"#FFAE73"
		],
		art: pet("conelet", [
			"..1..",
			".414.",
			".333.",
			"1o1o2",
			"22222"
		])
	},
	{
		id: "trackdle.kart",
		game: "trackdle",
		name: "Go-kart",
		colors: [
			"#E5484D",
			"#B02A30",
			"#FFD447",
			"#2B2F38",
			"#FF8A8E"
		],
		art: pet("go-kart", [
			"..33.",
			".1341",
			"51112",
			"11222",
			"44.44"
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
			"#FFFFFF"
		],
		draw: on([
			"......33",
			"....112.",
			"..11112.",
			".111112.",
			"33333333"
		], 0, 2)
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
			"...4.5...",
			"..11112..",
			"..11112..",
			"..33333..",
			"111111112"
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
		name: "Shamrock",
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
			"..11112..",
			"..15112..",
			"..44344..",
			".1111112.",
			"111111112"
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
			".4..4..4.",
			"131131131",
			"525525525"
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
			".1..1..1.",
			"121121121",
			"343343343"
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
			"...4112...",
			"...1112...",
			"...3333...",
			"2111111112"
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
			"#E5484D"
		],
		draw: onPair([
			"1.1.",
			"1.1.",
			".11.",
			"..11",
			"..2."
		], 0)
	}
];
/** The seasonal items that drop on a day (`YYYY-MM-DD` or a Date, read in UTC). */
function inSeason(day) {
	const md = (typeof day === "string" ? day : day.toISOString()).slice(5, 10);
	return items.filter((i) => i.season && (i.season.from <= i.season.to ? md >= i.season.from && md <= i.season.to : md >= i.season.from || md <= i.season.to));
}
/** Every item: each game's skins, then hats, then frames, then buddies, then the seasonal hats. */
const items = [
	...skins.map((i) => ({
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
const byId = new Map(items.map((i) => [i.id, i]));
function itemById(id) {
	return id ? byId.get(id) : void 0;
}
const GAMES = [
	"amountle",
	"halfsies",
	"stackdle",
	"flipsies",
	"puttsies",
	"weighsies",
	"cutsies",
	"tiltsies",
	"trackdle"
];
/** A game's items. */
function gameItems(game) {
	return items.filter((i) => i.game === game);
}
/** The hat every player wears in a game until they put something else on. */
function freeItem(game) {
	return items.find((i) => i.game === game && i.free);
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
		item.colors.forEach((hex$3, i) => {
			colors[LAYER[slot] + i] = hex$3;
		});
		if (slot === "skin") {
			if (item.outline) colors[T.OUTLINE] = item.outline;
			const dark = "#15111C", light$1 = "#FFF1D6";
			colors[T.EYE] = colors[T.MOUTH] = contrast$1(dark, item.colors[0]) >= contrast$1(light$1, item.colors[0]) ? dark : light$1;
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
	const base = c.rows[c.bottom];
	if (!base) return;
	const y = c.bottom + 1;
	const mid = Math.floor(c.centre);
	for (const off of spec.offsets) for (const x of [mid - off, mid + off - 1]) if (x >= base.left && x <= base.right) c.set(x, y, spec.token === T.BODY ? limb : spec.token);
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
* The body and its markings, lit, with no face, hat or accessory on it.
* The blink frame fills vacated eye cells from here.
*/
function composeBase(config) {
	const c = startCanvas(config);
	if (!skinOf(config)) {
		light(c);
		bodies[config.body].draw(c);
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
	const skin = skinOf(config);
	const hat = itemById(config.hat);
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
		bodies[config.body].draw(c);
	}
	const before = c.grid.map((row) => [...row]);
	const onTop = (draw) => {
		const tryOn = (domed) => {
			const { canvas, dome } = domed ? c.domed(3 - (c.floor - c.tip + 1)) : {
				canvas: c.clone(),
				dome: []
			};
			draw(canvas.forHats());
			const wrapped = dome.filter(([x, y]) => canvas.grid[y][x] !== 1).length;
			for (const [x, y] of dome) if (canvas.grid[y][x] === 1) canvas.grid[y][x] = 0;
			for (let y = c.floor + 1; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (canvas.grid[y][x] !== before[y][x] && c.isBody(x, y)) canvas.grid[y][x] = before[y][x];
			let shown = 0;
			canvas.grid.forEach((row, y) => row.forEach((v, x) => {
				if (v !== before[y][x]) shown++;
			}));
			return {
				grid: canvas.grid,
				shown,
				cap: dome.length > 0 && wrapped * 2 >= dome.length
			};
		};
		let best = tryOn(false);
		if (c.floor - c.tip + 1 < 3) {
			const d = tryOn(true);
			if (d.cap && d.shown > best.shown) best = d;
		}
		best.grid.forEach((row, y) => row.forEach((v, x) => {
			c.grid[y][x] = v;
		}));
	};
	if (hat?.slot === "hat") {
		onTop((cv) => hat.draw(cv));
		claim(c.grid, LAYER.hat);
		for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
			const t = c.grid[y][x], below = c.grid[y + 1][x];
			if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
		}
	} else if (!skin) onTop((cv) => hair[config.hair].draw(cv));
	const accessory = accessories[config.accessory];
	if (accessory.layer === "face") accessory.draw(c);
	const line = c.eyeLine;
	const cheek = cheeks[config.cheeks].art;
	if (cheek.length) c.draw(cheek, c.centred(cheek), line + 1, true);
	c.draw(eye, c.centred(eye), line - eye.length + 1, true);
	c.draw(mouth$1, c.centred(mouth$1), line + 1, true);
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
	const buddy = itemById(config.buddy);
	if (buddy?.slot === "buddy") {
		const art = buddy.art, h = art.length, w = art[0].length;
		const x0 = GRID_SIZE - 1 - w, y0 = GRID_SIZE - 1 - h;
		const on$1 = (x, y) => (art[y - y0]?.[x - x0] ?? 0) !== 0;
		for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
			if (y < 0 || x < 0 || y >= GRID_SIZE || x >= GRID_SIZE) continue;
			if (on$1(x, y)) {
				const t = art[y - y0][x - x0];
				c.grid[y][x] = t >= LOCAL ? t - LOCAL + LAYER.buddy : t;
			} else if (on$1(x + 1, y) || on$1(x - 1, y) || on$1(x, y + 1) || on$1(x, y - 1)) c.grid[y][x] = T.OUTLINE;
		}
	}
	return c.grid;
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
function mix$2(a, b$1, amount) {
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
			3: mix$2(body, "#FFFFFF", .55),
			4: outline$1,
			5: ink,
			6: "#FFFFFF",
			7: blush,
			8: ink,
			9: tongue,
			10: accent,
			11: shadeOf(accent),
			12: trim,
			13: mix$2(body, "#FFFBF0", .6),
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
		if (shade === 0) return mix$2(hex$3, "#FFFFFF", .3);
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
	const turn$1 = (hex$3) => {
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
	return derive(`${palette$1.name} Lucky`, turn$1(c[1]), turn$1(c[10]), "#FFE9A8");
}
/** The palette a guy is drawn in: his colourway, in his tone, Lucky if he is. */
function paletteOf(config) {
	const toned = shadePalette(getPalette(config.palette), config.shade);
	return config.lucky ? luckyPalette(toned) : toned;
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
	const fp = facePlate(grid, palette$1);
	if (fp) palette$1 = fp.palette;
	const chase = chaseEyes(grid, config);
	return grid.map((row, y) => row.map((token, x) => {
		const color = chase?.[y][x] ?? (fp?.plate[y][x] ? fp.pale : token === T.WHITE ? catchlight(grid, x, y, palette$1) : resolveColor(palette$1, token));
		if (!color) return null;
		const slot = slotOf$1(token);
		const copy = slot ? config.owned?.[slot] : void 0;
		const painted$1 = slot === "aura" ? aura && copy ? auraColor(aura.id, token - LAYER.aura, copy.finish, x, y, aura.still) : color : copy ? paintCell(color, x, y, copy, state) : color;
		return still && copy?.fx ? fxColor(painted$1, copy.fx, x, y, 0, copy.print) : painted$1;
	}));
}
/**
* On a body too dark for dark eyes, the face gets a lighter patch round the
* eyes and mouth (as a penguin or a panda has) and the eyes stay dark on it:
* cream eyes straight on a dark skin smudged into it at any size.
*/
function facePlate(grid, palette$1) {
	const ink = resolveColor(palette$1, T.EYE), body = resolveColor(palette$1, T.BODY);
	if (!ink || !body || contrast(ink, "#000000") <= 10) return null;
	let top = 99, bottom = -1, left = 99, right = -1;
	grid.forEach((row, y) => row.forEach((t, x) => {
		if (t === T.EYE || t === T.MOUTH) {
			top = Math.min(top, y);
			bottom = Math.max(bottom, y);
			left = Math.min(left, x);
			right = Math.max(right, x);
		}
	}));
	if (bottom < 0) return null;
	top -= 1;
	bottom += 1;
	left -= 1;
	right += 1;
	const skin = (t) => t === T.BODY || t === T.SHADE || t === T.LIGHT;
	const plate = grid.map((row, y) => row.map((t, x) => skin(t) && y >= top && y <= bottom && x >= left && x <= right && !((y === top || y === bottom) && (x <= left + 1 || x >= right - 1))));
	const dark = mix$2(resolveColor(palette$1, T.OUTLINE) ?? "#000000", "#000000", .3);
	return {
		plate,
		pale: mix$2(body, "#FFF1D6", .62),
		palette: {
			...palette$1,
			colors: {
				...palette$1.colors,
				[T.EYE]: dark,
				[T.MOUTH]: dark
			}
		}
	};
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
	const deep = mix$2(ink, "#000000", .45);
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
	if (!ink || contrast(white, ink) < 3) return white;
	const pale = near.some((t) => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette$1, t) ?? "#000000") < 1.6);
	return pale ? mix$2(ink, white, .6) : white;
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
const rgb$1 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$1 = (a, b$1, t) => {
	const x = rgb$1(a), y = rgb$1(b$1);
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
	const at = (t + seed) % 2200 / 2200 * (FRAME_WIDTH + FRAME_HEIGHT + 14) - 7;
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.body) return;
		const d = Math.abs(x + y * .8 - at);
		if (d < 3) cell.c = mix$1(cell.c, hue((t / 5 + (x - y) * 22) % 360, .95, .68), d < 1.2 ? .6 : .3);
	}));
}
/** Galaxy eyes swirl, diamond eyes catch the light, dragon eyes smoulder. */
function liveEyes(layer, kind, t, seed) {
	layer.forEach((row, y) => row.forEach((cell, x) => {
		if (!cell?.eye) return;
		const k = cell.eye;
		if (kind === "galaxy") {
			if (k === T.WHITE) cell.c = (t / 160 + x * 3 + y * 2) % 5 < 1.2 ? "#FFFFFF" : "#CBB8FF";
			else if (k !== T.EYE) cell.c = hue(255 + 45 * Math.sin(t / 380 + x * .9 + y * .7), .8, .55);
		} else if (kind === "diamond") {
			const at = (t + seed) % 1400 / 1400 * 24 - 4, d = Math.abs(x - y * .5 - at);
			if (k !== T.EYE) cell.c = mix$1(cell.c, "#E6FCFF", .25 + .2 * Math.sin(t / 250 + x));
			if (d < 1.5) cell.c = mix$1(cell.c, "#FFFFFF", d < .6 ? .9 : .5);
		} else if (kind === "dragon") {
			const flash = (t + seed) % 2e3 < 160;
			if (k === T.GOLD || k === T.GOLD_SHADE) cell.c = flash ? "#FFF6B0" : mix$1(cell.c, "#FF4A1C", .25 + .3 * (.5 + .5 * Math.sin(t / 260)));
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
function twinkle(layer, x, y, centre$1, arms$1) {
	const cells = [
		[
			x,
			y,
			centre$1
		],
		[
			x - 1,
			y,
			arms$1
		],
		[
			x + 1,
			y,
			arms$1
		],
		[
			x,
			y - 1,
			arms$1
		],
		[
			x,
			y + 1,
			arms$1
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
			const on$1 = ink(ch);
			const near = !on$1 && NEIGHBOURS.some(([dx, dy]) => ink(rows[y - 1 + dy]?.[x - 1 + dx]));
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
	const slices = [];
	let t = 0;
	for (const beat of beats) {
		const n = wornAura || withFx || lucky || liveEye ? Math.max(1, Math.ceil(beat.ms / 100)) : grade >= 1 ? Math.max(1, Math.ceil(beat.ms / 150)) : 1;
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
	const trailFrom = grade >= 3 && !wornAura ? [mix$1(gradeColor, "#000000", .2), mix$1(gradeColor, "#000000", .55)] : [];
	const behind = [];
	const frames$1 = slices.map(({ beat, ms, t: t$1 }) => {
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
				if (d < 1) cell.c = mix$1(cell.c, "#FFFFFF", .65);
				else if (d < 2) cell.c = mix$1(cell.c, "#FFFFFF", .25);
			}));
		}
		if (lucky) luckyShimmer(layer, t$1, seed);
		if (liveEye) liveEyes(layer, liveEye, t$1, seed);
		if (lucky && !wornAura && grade < 3) LUCKY_SPOTS.forEach(([x, y], k) => {
			if ((t$1 / 260 + k * 1.3 + seed) % 3 < 1) twinkle(layer, x, y, "#FFFFFF", "#FFD45C");
		});
		const aura = grade >= 2 ? rim(layer) : [];
		if (beat.stars) {
			const gold = palette$1.colors[T.GOLD] ?? "#F2C230";
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
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(t$1 / 400) % 2);
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
			const on$1 = Math.floor((t$1 + seed) / 320) % 2 === 0;
			const ring$1 = grade === 4 ? on$1 ? "#FFE27A" : "#E4AE39" : on$1 ? gradeColor : mix$1(gradeColor, "#000000", .35);
			for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = {
				c: ring$1,
				item: false
			};
		}
		if (grade >= 3 && !wornAura) {
			const count$1 = grade === 4 ? 4 : 3;
			SPARKLE_SPOTS.slice(0, count$1 + 2).forEach(([x, y], k) => {
				if ((t$1 / 240 + k * 1.7 + seed) % 4 < 1) twinkle(layer, x, y, "#FFFFFF", grade === 4 ? "#FFE27A" : gradeColor);
			});
		}
		const flat = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop?.[y][x] ?? null));
		const slots = layer.map((row, y) => row.map((cell, x) => cell ? cell.slot ?? 0 : backdrop?.[y][x] ? 3 : 0));
		const colors = withFx ? applyFx(flat, slots, fxCopies, t$1) : flat;
		return outside.length ? {
			colors,
			ms,
			slots,
			outside
		} : {
			colors,
			ms,
			slots
		};
	});
	return {
		move,
		width: FRAME_WIDTH,
		height: FRAME_HEIGHT,
		frames: frames$1,
		duration: t
	};
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
	[8.0421, 1],
	[10.7729, .9],
	[11.5867, .75],
	[12.1793, .6],
	[12.544, .5],
	[12.9172, .4],
	[13.3205, .3],
	[13.547, .25],
	[13.7991, .2],
	[14.0979, .15],
	[14.479, .1],
	[14.7309, .075],
	[15.062, .05],
	[15.4589, .03],
	[15.7604, .02],
	[16.2643, .01],
	[16.465, .0075],
	[16.7411, .005],
	[17.0756, .003],
	[17.3223, .002],
	[17.7234, .001],
	[18.1205, 5e-4],
	[18.6163, 2e-4],
	[18.9523, 1e-4],
	[19.3143, 5e-5],
	[19.7576, 2e-5],
	[20.4402, 1e-5]
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
function pickable(own$1, slot) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	const total = weights.reduce((a, b$1) => a + b$1, 0);
	return weights.map((w, i) => i).filter((i) => (weights[i] / total >= RARE || i === own$1[slot]) && !(slot === "eyes" && RETIRED_EYES.includes(i)));
}
/** Whether a look only uses parts this player may pick. */
function allowed(own$1, look) {
	return SLOTS.every(([, slot]) => look[slot] === void 0 || pickable(own$1, slot).includes(look[slot]));
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
function decodeLook(code, own$1) {
	if (typeof code !== "string" || !code.startsWith("2:")) return null;
	const look = {};
	for (const part of code.slice(2).split(".").filter(Boolean)) {
		const slot = SLOTS.find((s) => s[0] === part[0]);
		const n = Number(part.slice(1));
		if (!slot || !/^\d{1,3}$/.test(part.slice(1)) || n >= slot[2].length) return null;
		if (slot[1] === "eyes" && RETIRED_EYES.includes(n)) continue;
		look[slot[1]] = n;
	}
	if (own$1 && !allowed(own$1, look)) return null;
	return look;
}
/** A player's guy: from their seed, with their picked look laid over it. */
function lookOf(seed, code = "") {
	const own$1 = resolve(seed);
	const look = code ? decodeLook(code, own$1) : null;
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
	const texture = (unit$1) => {
		const t = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit$1);
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
			[colors, info].forEach((bytes, unit$1) => {
				gl.activeTexture(gl.TEXTURE0 + unit$1);
				gl.bindTexture(gl.TEXTURE_2D, textures[unit$1]);
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
	const s = SURFACES[kind], wear$1 = Math.round(Math.min(1, Math.max(0, scuff)) * 10) / 10;
	return {
		kind,
		...s,
		roughness: Math.min(1, +(s.roughness + wear$1 * .55).toFixed(3)),
		clearcoat: +(s.clearcoat * (1 - wear$1)).toFixed(3)
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
			const RIM$1 = .4, rim$2 = z1 - RIM$1;
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
function upscale(rgba, width$1, height, scale) {
	if (scale === 1) return rgba;
	const W = width$1 * scale, out = new Uint8ClampedArray(W * height * scale * 4);
	for (let y = 0; y < height; y++) for (let x = 0; x < width$1; x++) {
		const i = (y * width$1 + x) * 4;
		for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale + dy) * W + x * scale + dx) * 4);
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
function encodeGif(input, scale = 1) {
	const W = input.width * scale, H = input.height * scale;
	const frames$1 = input.frames.map((f) => upscale(f, input.width, input.height, scale));
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
/** A PNG of one RGBA frame, scaled up by whole pixels. */
async function encodePng(rgba, width$1, height, scale = 1) {
	const W = width$1 * scale, H = height * scale, px = upscale(rgba, width$1, height, scale);
	const raw = new Uint8Array((W * 4 + 1) * H);
	for (let y = 0; y < H; y++) {
		raw[y * (W * 4 + 1)] = 0;
		raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
	}
	const chunk = (type, data) => {
		const body = new Uint8Array(4 + data.length);
		body.set([...type].map((c$1) => c$1.charCodeAt(0)));
		body.set(data, 4);
		const len = data.length, c = crc32(body);
		return [
			len >>> 24,
			len >>> 16 & 255,
			len >>> 8 & 255,
			len & 255,
			...body,
			c >>> 24,
			c >>> 16 & 255,
			c >>> 8 & 255,
			c & 255
		];
	};
	const ihdr = new Uint8Array([
		W >>> 24,
		W >>> 16 & 255,
		W >>> 8 & 255,
		W & 255,
		H >>> 24,
		H >>> 16 & 255,
		H >>> 8 & 255,
		H & 255,
		8,
		6,
		0,
		0,
		0
	]);
	return new Uint8Array([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10,
		...chunk("IHDR", ihdr),
		...chunk("IDAT", await zlib(raw)),
		...chunk("IEND", new Uint8Array())
	]);
}

//#endregion
//#region src/card.ts
/**
* Trading cards, drawn by the library so every game, the site and an export
* show the same card: a guy wearing his copies, moving, each copy's finish
* shining on its own pixels, its effect playing, the card's face dressed for
* the grade, and the words written in the club's pixel type.
*
* A card is `CARD_WIDTH` by `CARD_HEIGHT` card pixels, four to each of the
* guy's pixels, so a shine can sweep across a single pixel of a hat. Scale it
* up by whole numbers to show it; `toCardGif` and `toCardPng` do that for you.
*/
const CARD_WIDTH = 104;
const CARD_HEIGHT = 168;
const ZOOM = 4;
const rgb = (h) => [
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
function hueShift(c, a) {
	const y = .299 * c[0] + .587 * c[1] + .114 * c[2], i = .596 * c[0] - .274 * c[1] - .322 * c[2], q = .211 * c[0] - .523 * c[1] + .312 * c[2];
	const h = Math.atan2(q, i) + a, ch = Math.hypot(i, q), I = ch * Math.cos(h), Q = ch * Math.sin(h);
	return [
		y + .956 * I + .621 * Q,
		y - .272 * I - .647 * Q,
		y - 1.106 * I + 1.703 * Q
	];
}
const hash$1 = (x, y, p) => {
	const s = Math.sin(x * 127.1 + y * 311.7 + p * .731) * 43758.5453;
	return s - Math.floor(s);
};
const FINISHES$1 = [
	"plain",
	"sunset",
	"tempered",
	"nebula",
	"prism",
	"negative",
	"gold"
];
/**
* One card pixel of a copy in its finish at time `t` seconds: the same
* shine the site's shader gives, worked out here so it can be saved.
* `gx, gy` is the guy pixel (what twinkles), `cx, cy` the card pixel (what a
* sweep crosses), so light runs smoothly over a single pixel of a hat.
*/
function shine(c, o, gx, gy, cx, cy, t) {
	const f = FINISHES$1.indexOf(o.finish);
	if (f < 0) return c;
	const d = (cx + cy) / ZOOM, h = hash$1(gx, gy, o.print);
	const band = 1 - Math.min(1, Math.max(0, Math.abs(((d - t * 10 + o.print) % 58 + 58) % 58 - 29) - .5));
	const twinkle$1 = (h * 13 + t * .37) % 1 > .965 ? 1 : 0;
	const coat = Math.min(1, Math.max(0, 1 - o.scuff * 1.4)) * (h >= o.scuff * .55 ? 1 : 0);
	const add = (v, k = 1) => [
		c[0] + v * 255 * k,
		c[1] + v * 255 * k,
		c[2] + v * 255 * k
	];
	switch (f) {
		case 0: return o.scuff <= .07 ? add(band * .45) : c;
		case 1: {
			const s = .5 + .5 * Math.sin(d * .8 - t * 3 + o.print);
			const tint = mix(c, [
				c[0] * .86 + 20,
				c[1] * .96 + 20,
				c[2] * 1.18 + 20
			], .4 * s * coat);
			return [
				tint[0] + band * 127 * coat,
				tint[1] + band * 127 * coat,
				tint[2] + band * 127 * coat
			];
		}
		case 2: return add(twinkle$1 * .55 * coat + band * .25 * coat);
		case 3: {
			const s = hueShift(c, (t * .9 + d * .22) * coat);
			return mix(s, [
				255,
				255,
				255
			], twinkle$1 * coat);
		}
		case 4: {
			const rain = hsv(((d * .07 - t * .3 + o.print * .013) % 1 + 1) % 1, .65, 1);
			const m = mix(c, [
				c[0] * .45 + rain[0] * .75,
				c[1] * .45 + rain[1] * .75,
				c[2] * .45 + rain[2] * .75
			], .6 * coat);
			const row = (gy + Math.floor(t * 10)) % 3 < .5 ? 1.12 : 1;
			return [
				m[0] * row,
				m[1] * row,
				m[2] * row
			];
		}
		case 5: {
			const w = .07 * Math.sin(t * 2 + d * .5) * coat * 255;
			return [
				c[0] + .28 * 255 * band * coat + w,
				c[1] + .12 * 255 * band * coat + w,
				c[2] + .45 * 255 * band * coat + w
			];
		}
		default: return [
			c[0] + band * .7 * coat * 255 + twinkle$1 * .6 * coat * 255,
			c[1] + band * .7 * coat * 255 + twinkle$1 * .54 * coat * 255,
			c[2] + band * .7 * coat * 255 + twinkle$1 * .3 * coat * 255
		];
	}
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
/** The longest start of `s` that fits `width`, with a dot dot when it was cut. */
function fit(s, width$1) {
	if (textWidth(s) <= width$1) return s;
	let out = s;
	while (out.length > 1 && textWidth(out + "..") > width$1) out = out.slice(0, -1);
	return out.trimEnd() + "..";
}
/** Up to two lines that fit `width`: a lone line too long for one wraps at a space onto the second. */
function wrap(lines, width$1) {
	const out = lines.slice(0, 2);
	if (out.length === 1 && textWidth(out[0]) > width$1) {
		const words = out[0].split(" ");
		for (let k = words.length - 1; k > 0; k--) {
			const head$1 = words.slice(0, k).join(" ");
			if (textWidth(head$1) <= width$1) return [head$1, words.slice(k).join(" ")].map((l) => fit(l, width$1));
		}
	}
	return out.map((l) => fit(l, width$1));
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
const WIN = {
	left: 8,
	top: 26,
	right: 95,
	bottom: 113
};
/** The card at `t` seconds, with the guy's frame `frame` in its window. */
function drawCard(input, frame, owned, g, t) {
	const s = new Surface();
	const gc = g >= 0 ? rgb(GRADES[g].color) : [
		120,
		140,
		170
	];
	const sweep = (x, y, speed = 9, w = 10) => Math.max(0, 1 - Math.abs((((x + y) * .5 - t * speed * 6) % 140 + 140) % 140 - 70) / w);
	const face = (x, y) => {
		let c = g === 5 ? mix([
			22,
			26,
			44
		], hsv((x + y) / 260 + t * .05, .35, .45), .35) : g === 4 ? mix(CREAM, [
			255,
			214,
			120
		], .38) : CREAM;
		if (g >= 1) c = mix(c, WHITE, sweep(x, y) * (g >= 3 ? .55 : .3));
		return c;
	};
	for (let y = 0; y < CARD_HEIGHT; y++) for (let x = 0; x < CARD_WIDTH; x++) {
		if (!inside(x, y)) continue;
		const edge$1 = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
		let border = g >= 0 ? mix(gc, EDGE, .35) : EDGE;
		if (g === 3) border = hueShift(gc, t * 1.4 + (x + y) * .05);
		if (g === 5) border = hsv(((x + y) / 120 + t * .3) % 1, .6, .95);
		s.set(x, y, edge$1 ? border : face(x, y));
	}
	const band = g >= 3 ? [
		30,
		26,
		52
	] : g >= 0 ? mix(gc, [
		24,
		22,
		44
	], .3) : [
		58,
		66,
		100
	];
	for (let y = 6; y <= 22; y++) for (let x = 6; x < CARD_WIDTH - 6; x++) if (inside(x, y, 9)) s.set(x, y, y === 6 ? mix(band, WHITE, .3) : y === 22 ? mix(band, [
		0,
		0,
		0
	], .35) : band);
	const foil = (x, y) => g === 4 ? mix([
		196,
		136,
		32
	], [
		255,
		246,
		200
	], .5 + .5 * Math.sin(x * .18 - t * 4 + y * .1)) : g >= 3 ? hsv(((x * .012 - t * .35) % 1 + 1) % 1, .45, 1) : WHITE;
	const title = fit(input.title, CARD_WIDTH - 16);
	s.text(title, Math.floor((CARD_WIDTH - textWidth(title)) / 2), 8, foil, [
		16,
		12,
		32
	]);
	const tint = g === 5 ? [
		26,
		34,
		52
	] : mix(CREAM, gc, g >= 0 ? .3 : .14);
	for (let y = WIN.top; y <= WIN.bottom; y++) for (let x = WIN.left; x <= WIN.right; x++) {
		const rim$2 = x === WIN.left || x === WIN.right || y === WIN.top || y === WIN.bottom;
		const depth = (y - WIN.top) / (WIN.bottom - WIN.top);
		let c = rim$2 ? g === 5 ? [
			60,
			80,
			110
		] : RIM : mix(tint, mix(tint, [
			20,
			24,
			40
		], .5), depth * .35);
		const fx = (x - (WIN.left + WIN.right) / 2) / 30, fy = (y - (WIN.bottom - 9)) / 4;
		if (!rim$2 && fx * fx + fy * fy < 1) c = mix(c, [
			0,
			0,
			0
		], .18 * (1 - fx * fx - fy * fy));
		s.set(x, y, c);
	}
	const ox = Math.round((WIN.left + WIN.right + 1) / 2 - FRAME_WIDTH * ZOOM / 2), oy = WIN.bottom - 3 - FRAME_HEIGHT * ZOOM;
	const solid = (gx, gy) => !!frame.colors[gy]?.[gx] && frame.slots[gy]?.[gx] !== 5;
	const edge = g === 5 ? mix(tint, WHITE, .42) : mix(tint, WHITE, .55);
	for (let y = WIN.top + 1; y < WIN.bottom; y++) for (let x = WIN.left + 1; x < WIN.right; x++) {
		const gx = Math.floor((x - ox) / ZOOM), gy = Math.floor((y - oy) / ZOOM);
		if (solid(gx, gy)) continue;
		const near = [
			[2, 0],
			[-2, 0],
			[0, 2],
			[0, -2],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1]
		].some(([dx, dy]) => solid(Math.floor((x + dx - ox) / ZOOM), Math.floor((y + dy - oy) / ZOOM)));
		if (near) s.set(x, y, edge);
	}
	frame.colors.forEach((row, gy) => row.forEach((hex$3, gx) => {
		if (!hex$3) return;
		const slot = frame.slots[gy][gx], copy = slot ? owned[FRAME_SLOTS[slot - 1]] : void 0;
		for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
			const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
			if (cy <= WIN.top || cy >= WIN.bottom || cx <= WIN.left || cx >= WIN.right) continue;
			let c = rgb(hex$3);
			if (copy) c = shine(c, copy, gx, gy, cx, cy, t);
			s.set(cx, cy, [
				Math.min(255, Math.max(0, c[0])),
				Math.min(255, Math.max(0, c[1])),
				Math.min(255, Math.max(0, c[2]))
			]);
		}
	}));
	for (const [gx, gy, hex$3] of frame.outside ?? []) for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
		const cx = ox + gx * ZOOM + dx, cy = oy + gy * ZOOM + dy;
		if (cy > WIN.top && cy < WIN.bottom && cx > WIN.left && cx < WIN.right) s.set(cx, cy, rgb(hex$3));
	}
	const glare = t * .45 % 2.2 * 140 - 40;
	for (let y = WIN.top + 1; y < WIN.bottom; y++) for (let x = WIN.left + 1; x < WIN.right; x++) {
		const d = x + (y - WIN.top) * .6 - glare;
		if (d > 0 && d < 10) s.set(x, y, mix(s.get(x, y), WHITE, d < 3 ? .22 : .1));
	}
	if (input.corner) {
		const w = textWidth(input.corner) + 5, x0 = WIN.right - 2 - w, y0 = WIN.top + 3;
		for (let y = y0; y < y0 + 13; y++) for (let x = x0; x < x0 + w; x++) if (!((x === x0 || x === x0 + w - 1) && (y === y0 || y === y0 + 12))) s.set(x, y, [
			20,
			18,
			38
		]);
		s.text(input.corner, x0 + 3, y0 - 2, () => WHITE);
	}
	if (g >= 0) for (let p = 0; p < 6; p++) {
		const x0 = 19 + p * 11;
		for (let y = 118; y <= 123; y++) for (let x = x0; x <= x0 + 8; x++) if (!((x === x0 || x === x0 + 8) && (y === 118 || y === 123))) s.set(x, y, p <= g ? y === 118 ? mix(gc, WHITE, .4) : gc : RIM);
	}
	wrap(input.lines ?? [], CARD_WIDTH - 14).forEach((line, k) => {
		const l = fit(line, CARD_WIDTH - 14);
		s.text(l, Math.floor((CARD_WIDTH - textWidth(l)) / 2), 127 + k * 16, () => g === 5 ? [
			220,
			240,
			255
		] : INK, g === 5 ? [
			10,
			12,
			24
		] : void 0);
	});
	if (g >= 3) for (let k = 0; k < 6; k++) {
		const x = Math.floor(hash$1(k, 1, 9) * (CARD_WIDTH - 12)) + 6, y = Math.floor(hash$1(k, 2, 9) * (CARD_HEIGHT - 12)) + 6, on$1 = (hash$1(k, 3, 9) + t * .5) % 1 < .18;
		if (on$1 && s.opaque(x, y)) for (const [dx, dy] of [
			[0, 0],
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) s.set(x + dx, y + dy, dx || dy ? mix(s.get(x + dx, y + dy), WHITE, .6) : WHITE);
	}
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
	const card = cardPlayer(input, ms), frames$1 = [];
	for (let i = 0; i < card.count; i++) frames$1.push(card.frame(i));
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		frames: frames$1,
		delays: frames$1.map(() => ms)
	};
}
/**
* A card to play on screen: each frame is drawn the first time it is asked
* for and kept, so a page can show a card at once and spread the work out.
*/
function cardPlayer(input, ms = 80) {
	const anim = animate(input.seed, input.move ?? "idle", {
		parts: input.parts,
		palette: input.palette,
		equip: (input.copies ?? []).map(encode),
		rarity: false
	});
	const owned = ownedBySlot(input.copies ?? []), g = cardGrade(input);
	const count$1 = Math.ceil(Math.max(2e3, Math.min(anim.duration, 4800)) / ms), cache = [];
	return {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		count: count$1,
		delay: ms,
		frame(i) {
			const k = (i % count$1 + count$1) % count$1;
			return cache[k] ??= drawCard(input, frameAt(anim, k * ms), owned, g, k * ms / 1e3);
		}
	};
}
/** The card standing still, for a picture. */
function cardStill(input, t = .6) {
	const anim = animate(input.seed, input.move ?? "idle", {
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
function toCardGif(input, scale = 3) {
	return encodeGif(cardFrames(input), scale);
}
/** The card as a PNG, each card pixel `scale` by `scale`. */
function toCardPng(input, scale = 4) {
	return encodePng(cardStill(input), CARD_WIDTH, CARD_HEIGHT, scale);
}
/**
* The guy on his own as a looping GIF: his move with everything he wears,
* effects and auras moving, on a transparent background or `background`.
*/
function toGuyGif(seed, move, options = {}, scale = 12) {
	const anim = animate(seed, move, options), bg = options.background ? rgb(options.background) : null;
	const frames$1 = anim.frames.map((f) => {
		const px = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT * 4);
		f.colors.forEach((row, y) => row.forEach((c, x) => {
			const v = c ? rgb(c) : bg;
			if (v) px.set([...v, 255], (y * FRAME_WIDTH + x) * 4);
		}));
		return px;
	});
	return encodeGif({
		width: FRAME_WIDTH,
		height: FRAME_HEIGHT,
		frames: frames$1,
		delays: anim.frames.map((f) => f.ms)
	}, scale);
}

//#endregion
exports.ARM_NAMES = ARM_NAMES
exports.AURAS = AURAS
exports.AURA_ODDS = AURA_ODDS
exports.CARD_HEIGHT = CARD_HEIGHT
exports.CARD_WIDTH = CARD_WIDTH
exports.DEAL_PREFIX = DEAL_PREFIX
exports.DEEP_BLUE_PRINTS = DEEP_BLUE_PRINTS
exports.DEFAULT_COLORS = DEFAULT_COLORS
exports.DEFAULT_COLORS_DARK = DEFAULT_COLORS_DARK
exports.DEFAULT_COLORS_LIGHT = DEFAULT_COLORS_LIGHT
exports.EFFECTS = EFFECTS
exports.EMOTE_UNLOCKS = EMOTE_UNLOCKS
exports.FINISHES = FINISHES
exports.FOOT_NAMES = FOOT_NAMES
exports.FOOT_STYLES = FOOT_STYLES
exports.FRAME_HEIGHT = FRAME_HEIGHT
exports.FRAME_SLOTS = FRAME_SLOTS
exports.FRAME_WIDTH = FRAME_WIDTH
exports.FX_IDS = FX_IDS
exports.GAMES = GAMES
exports.GOLD_RIM_DAYS = GOLD_RIM_DAYS
exports.GRADES = GRADES
exports.GRID_SIZE = GRID_SIZE
exports.GUY_TIERS = GUY_TIERS
exports.HEADROOM = HEADROOM
exports.LUCKY_ODDS = LUCKY_ODDS
exports.MAX_PINS = MAX_PINS
exports.MOVES = MOVES
exports.ONE_OF_ONE_AURAS = ONE_OF_ONE_AURAS
exports.PINS = PINS
exports.RETIRED_EYES = RETIRED_EYES
exports.SHADE_COUNT = SHADE_COUNT
exports.SMALL_SIZE = SMALL_SIZE
exports.TAG_MAX = TAG_MAX
exports.TIER_ICONS = TIER_ICONS
exports.TONE_NAMES = TONE_NAMES
exports.TRAIT_ICONS = TRAIT_ICONS
exports.TRAIT_SLOTS = TRAIT_SLOTS
exports.WEAR = WEAR
exports.accessories = accessories
exports.allowed = allowed
exports.animate = animate
exports.applyFx = applyFx
exports.auraById = auraById
exports.auraCells = auraCells
exports.auraColor = auraColor
exports.bodies = bodies
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
exports.createShine = createShine
exports.dealOf = dealOf
exports.decode = decode
exports.decodeLook = decodeLook
exports.drawFrame = drawFrame
exports.dress = dress
exports.encode = encode
exports.encodeGif = encodeGif
exports.encodeLook = encodeLook
exports.encodePng = encodePng
exports.eyes = eyes
exports.floatShare = floatShare
exports.frameAt = frameAt
exports.freeItem = freeItem
exports.fxColor = fxColor
exports.gameItems = gameItems
exports.getColor = getColor
exports.getPalette = getPalette
exports.gradeOf = gradeOf
exports.guyOneIn = guyOneIn
exports.guyRank = guyRank
exports.guyScore = guyScore
exports.hair = hair
exports.hash = hash
exports.hashNth = hashNth
exports.heads = heads
exports.inSeason = inSeason
exports.itemById = itemById
exports.itemFrame = itemFrame
exports.items = items
exports.lookOf = lookOf
exports.luckyPalette = luckyPalette
exports.machineSet = machineSet
exports.makeSeed = makeSeed
exports.mouths = mouths
exports.nameOf = nameOf
exports.nebulaPhase = nebulaPhase
exports.ownedOf = ownedOf
exports.paint = paint
exports.paletteOf = paletteOf
exports.palettes = palettes
exports.pickable = pickable
exports.pinById = pinById
exports.resolve = resolve
exports.resolveColor = resolveColor
exports.roll = roll
exports.rollFx = rollFx
exports.rollSeason = rollSeason
exports.setProgress = setProgress
exports.shadePalette = shadePalette
exports.shineData = shineData
exports.slotOf = slotOf
exports.special = special
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
exports.toShareSvg = toShareSvg
exports.toSvgString = toSvgString
exports.tradeFloat = tradeFloat
exports.tradeGames = tradeGames
exports.traitOdds = traitOdds
exports.upscale = upscale
exports.voxelColumns = voxelColumns
exports.voxelItem = voxelItem
exports.voxelMesh = voxelMesh
exports.wearOf = wearOf
exports.withItems = withItems
return exports;
})({});