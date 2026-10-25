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
* How often each part turns up.
*
* Every part in the library is meant to be liked, so these are gentle: they
* keep the simplest, sweetest looks the most common and make the busier ones a
* treat to find. A guy with ears, a hat, glasses, a scarf and a pattern all at
* once is too much on sixteen pixels, so the "nothing" options carry weight.
*
*   5  the quiet default
*   4  core charm
*   3  common
*   2  occasional
*   1  a rare find
*
* Each array must be the same length as its part array; a test enforces that.
*/
const headWeights = [
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
];
const eyeWeights = [
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
];
const mouthWeights = [
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
];
const cheekWeights = [
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
];
const hairWeights = [
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
];
const bodyWeights = [
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
];
const accessoryWeights = [
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
/** No colourway is more "correct" than another. */
/** The night colourways (the last six) are half as common as the rest. */
const paletteWeights = [...new Array(32).fill(2), ...new Array(6).fill(1)];
/**
* Picks an index from a weight table using a hash value, so the result is
* deterministic for a given input and the distribution follows the weights.
*/
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
function resolve(input, overrides) {
	const pick = (slot, weights) => weightedPick(weights, hashNth(input, slot));
	return {
		head: overrides?.head ?? pick(0, headWeights),
		eyes: overrides?.eyes ?? pick(1, eyeWeights),
		mouth: overrides?.mouth ?? pick(2, mouthWeights),
		hair: overrides?.hair ?? pick(3, hairWeights),
		body: overrides?.body ?? pick(4, bodyWeights),
		accessory: overrides?.accessory ?? pick(5, accessoryWeights),
		palette: pick(6, paletteWeights),
		rotation: overrides?.rotation ?? hashNth(input, 7) % 9,
		flip: overrides?.flip ?? hashNth(input, 8) % 2 === 1,
		shade: overrides?.shade ?? pick(9, shadeWeights),
		feet: overrides?.feet ?? pick(10, footWeights),
		cheeks: overrides?.cheeks ?? pick(11, cheekWeights),
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
	buddy: 50
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
	head("cactus", 9, true, [
		"................",
		"................",
		".....######.....",
		".##.########.##.",
		".##.########.##.",
		".##.########.##.",
		".##############.",
		"...##########...",
		"...##########...",
		"...##########...",
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
		"................",
		"....#......#....",
		"....##....##....",
		"....########....",
		".#.##########.#.",
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
		".r....r.",
		"rwr..rwr",
		".r....r."
	]),
	eyes_("cyclops", [
		".ww.",
		"weee",
		"eeee"
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
	cheeks_("gold leaf", ["yY......Yy"])
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
	c.draw(s, x, Math.max(1, top + sink - 1 - last));
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
/** Paints the top `n` rows of the head, shading the right-hand edge. */
function capRows(c, n, fill, shade) {
	for (let y = c.crown; y < c.crown + n; y++) {
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
			const r = c.rows[c.crown];
			for (let x = r.left; x <= r.right; x++) c.set(x, c.crown - 1, T.OUTLINE);
			const cups = c.rows[c.crown + 2];
			for (const y of [c.crown + 2, c.crown + 3]) {
				c.set(cups.left, y, T.ACCENT);
				c.set(cups.right, y, T.ACCENT_SHADE);
			}
			c.set(r.left - 1, c.crown, T.OUTLINE);
			c.set(r.right + 1, c.crown, T.OUTLINE);
		}
	}
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
			c.draw(star$1, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
		}
	},
	{
		name: "heart mark",
		draw: (c) => {
			c.draw(heart$1, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
		}
	},
	{
		name: "gleam",
		draw: (c) => {
			const r = c.rows[c.crown + 2];
			if (!r) return;
			onBody(c, r.right - 2, c.crown + 2, T.WHITE);
			onBody(c, r.right - 2, c.crown + 3, T.LIGHT);
			onBody(c, r.right - 1, c.crown + 4, T.LIGHT);
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
			c.draw(moon, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
		}
	},
	{
		name: "bolt mark",
		draw: (c) => {
			c.draw(bolt, Math.floor(c.centre) - 1, c.eyeLine - 5, true);
		}
	},
	{
		name: "starry",
		draw: (c) => {
			const x = Math.floor(c.centre);
			onBody(c, x - 4, c.crown + 2, T.WHITE);
			onBody(c, x + 1, c.crown + 1, T.GOLD);
			onBody(c, x + 3, c.crown + 3, T.WHITE);
			onBody(c, x - 3, c.bottom - 1, T.GOLD);
			onBody(c, x + 4, c.bottom - 2, T.WHITE);
		}
	}
];

//#endregion
//#region src/parts/accessories.ts
const glasses = stamp([
	".oo....oo.",
	"o..oooo..o",
	"o..o..o..o",
	".oo....oo."
]);
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
const monocle = stamp([
	".oo.",
	"o..o",
	"o..o",
	".oo."
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
		draw: (c) => c.draw(glasses, c.centred(glasses), c.eyeLine - 2)
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
			const x = c.centred(glasses) + 6;
			c.draw(monocle, x, c.eyeLine - 2);
			c.set(x + 3, c.eyeLine + 2, T.GOLD);
			c.set(x + 3, c.eyeLine + 3, T.GOLD_SHADE);
		}
	},
	{
		name: "eye patch",
		layer: "body",
		draw: (c) => {
			const x = c.centred(glasses);
			const top = c.eyeLine - 3;
			for (let sx = x; sx < x + width(glasses); sx++) if (c.isBody(sx, top)) wear(c, sx, top, T.DEEP);
			for (let y = c.eyeLine - 2; y <= c.eyeLine; y++) for (let dx = 0; dx < 4; dx++) wear(c, x + dx, y, T.OUTLINE);
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
var Canvas = class {
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
		let bottom = this.crown;
		this.rows.forEach((r, y) => {
			if (r) bottom = y;
		});
		this.bottom = bottom;
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
//#region src/pins.ts
const PINS = [
	{
		id: "star",
		name: "Gold star",
		how: "A perfect day",
		art: stamp([
			".y.",
			"yYy",
			".y."
		])
	},
	{
		id: "flame",
		name: "Flame",
		how: "A 7-day streak",
		art: stamp([
			".r.",
			"rYr",
			"ryr"
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
			"yyy",
			"YYY"
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
/** Scratches tally marks and sticks pins onto one worn item's pixels. */
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
	(copy.pins ?? []).slice(0, MAX_PINS).forEach((id, k) => {
		const pin = pinById(id);
		if (!pin) return;
		const h = pin.art.length, w = pin.art[0].length;
		const anchors = slot === "frame" ? [
			[GRID_SIZE - w, GRID_SIZE - h],
			[0, GRID_SIZE - h],
			[GRID_SIZE - w, 0]
		] : [
			[right - w, bottom - h - 1],
			[left + 1, bottom - h - 1],
			[right - w, top + 1]
		];
		let [ax, ay] = anchors[k];
		for (let tries = 0; tries < (slot === "frame" ? 0 : 4); tries++) {
			let on$1 = 0, total = 0;
			pin.art.forEach((row, dy) => row.forEach((t, dx) => {
				if (!t) return;
				total++;
				if (own(slot, grid[ay + dy]?.[ax + dx] ?? 0)) on$1++;
			}));
			if (on$1 === total) break;
			ax += ax > (left + right) / 2 ? -1 : 1;
			ay += ay > (top + bottom) / 2 ? -1 : 1;
		}
		const placed = [];
		pin.art.forEach((row, dy) => row.forEach((t, dx) => {
			const x = ax + dx, y = ay + dy;
			if (t && y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE && own(slot, grid[y][x])) {
				grid[y][x] = t;
				placed.push([x, y]);
			}
		}));
		const N = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		];
		const inside = (x, y) => N.every(([dx, dy]) => (grid[y + dy]?.[x + dx] ?? 0) !== 0);
		for (const [x, y] of placed) for (const [dx, dy] of N) {
			const nx = x + dx, ny = y + dy;
			if (own(slot, grid[ny]?.[nx] ?? 0) && inside(nx, ny)) grid[ny][nx] = T.OUTLINE;
		}
	});
}
/** After a year of days, the outline around an item goes gold; a frame's edge does. */
function goldRim(grid, slot) {
	const edge = (x, y) => x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
	const set = [];
	grid.forEach((row, y) => row.forEach((t, x) => {
		if (slot === "frame") {
			if (own("frame", t) && edge(x, y)) set.push([x, y]);
			return;
		}
		if (t !== T.OUTLINE) return;
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
	}
};
/** Condition, by scuff, in the words toy collectors use. */
const WEAR = [
	{
		name: "Mint in Box",
		short: "MIB",
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
	return GRADES[Math.min(4, FINISHES[o.finish].grade + (special(o) ? 1 : 0))];
}
/** The name as it would show on an inventory card. */
function nameOf(o) {
	const item = itemById(o.item);
	const base = (o.date ? `${o.date.slice(0, 4)} ` : "") + (item?.name ?? o.item);
	const tally = o.tally !== void 0 ? "Tallied " : "";
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
* is a little different — a lucky name gets a 0.003 Mint in Box.
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
	return rollFrom(gameItems(game).filter((i) => !i.free), seed);
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
	return o;
}
/** Which slot a copy goes in. */
function slotOf(o) {
	return itemById(o.item)?.slot;
}
const rgb$1 = (h) => [
	1,
	3,
	5
].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex$1 = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix$2 = (a, b$1, t) => [
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
	return t < .5 ? mix$2(mix$2(c, [
		0,
		0,
		0
	], .5), c, t * 2) : mix$2(c, mix$2(c, [
		255,
		255,
		255
	], .6), (t - .5) * 2);
};
const PAINT = {
	"plain": (_x, _y, _l, _p, original) => original,
	"sunset": (x, y, l, p) => {
		const t = Math.max(0, Math.min(1, (x + y * .5 - 2 + p % 100 / 12) / 14));
		const c = t < .5 ? mix$2(rgb$1("#F5C542"), rgb$1("#E55AA8"), t * 2) : mix$2(rgb$1("#E55AA8"), rgb$1("#7A4BE0"), (t - .5) * 2);
		return shaded(c, l);
	},
	"tempered": (x, y, l, p) => {
		const stops = TINTS[temperTint(p)];
		const band = Math.floor(((x + y + p % 11) % 12 + 12) % 12 / 3);
		return shaded(rgb$1(stops[[
			0,
			1,
			2,
			1
		][band]]), l);
	},
	"nebula": (x, y, l, p) => {
		const phase = nebulaPhase(p);
		const base = phase === "Red Giant" ? rgb$1("#D0102E") : phase === "Blue Moon" ? rgb$1("#1E4FE8") : phase === "Black Hole" ? rgb$1("#2A1E3A") : rgb$1([
			"#8A2AB0",
			"#3A2AB0",
			"#2A6AB0",
			"#B02A8A"
		][p % 4]);
		const c = cellNoise(p, x, y, 2) < .2 ? mix$2(base, rgb$1("#FFD6F0"), .55) : base;
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
		return mix$2(shaded(c, l), [
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
		return mix$2(inverted, [
			92,
			52,
			160
		], .22);
	},
	"gold": (x, y, l) => {
		if ((x + y) % 6 === 0 && l > .5) return rgb$1("#FFFBE6");
		return l > .75 ? rgb$1("#FFF1B0") : l > .5 ? rgb$1("#F2C230") : l > .3 ? rgb$1("#C8901E") : rgb$1("#7A5212");
	}
};
const PRIMER = rgb$1("#8B9097");
/**
* Paints one cell of an owned item: its finish, then its wear. Chips land in
* places fixed by the print, so a copy always wears the same way, and how many
* show is the scuff. `glint` is set once the first Mint in Box glint has been
* placed.
*/
function paintCell(color, x, y, o, state) {
	const original = rgb$1(color);
	let c = PAINT[o.finish](x, y, lum$1(original), o.print, original);
	if (cellNoise(o.print, x, y, 3) < Math.pow(o.scuff, .9) * .45) c = mix$2(PRIMER, c, .25);
	c = mix$2(c, [
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
	}
];
const hats = [
	{
		id: "amountle.gem",
		game: "amountle",
		name: "Gem",
		free: true,
		colors: [],
		draw: on([
			".xa.",
			"aaaA",
			".aA."
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
			"1.1.1",
			"14341",
			"22222"
		])
	},
	{
		id: "halfsies.bowl",
		game: "halfsies",
		name: "Half pot",
		free: true,
		colors: [],
		draw: on([
			".aaaa.",
			"axxxxA",
			"AAAAAA"
		])
	},
	{
		id: "halfsies.scale",
		game: "halfsies",
		name: "Scale dish",
		colors: [
			"#FFFFFF",
			"#D9DEE6",
			"#2B2F38"
		],
		draw: on([
			"11111111",
			".222222.",
			"...33..."
		])
	},
	{
		id: "stackdle.cube",
		game: "stackdle",
		name: "Little block",
		free: true,
		colors: [],
		draw: on([
			"xxxxA",
			"aaaaA",
			"ayaaA",
			"aaaaA"
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
			".12..",
			".12..",
			"..34.",
			"..34.",
			"55556"
		])
	},
	{
		id: "flipsies.cap",
		game: "flipsies",
		name: "Bottle cap",
		free: true,
		colors: [],
		draw: on([
			".xxxx.",
			"xaaaax",
			"aAaAaA"
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
			".33.",
			".11.",
			"1112",
			"4442",
			"1112"
		])
	},
	{
		id: "puttsies.visor",
		game: "puttsies",
		name: "Golf visor",
		free: true,
		colors: [],
		draw: (c) => {
			const y = c.crown + 1;
			c.paintRow(y, T.ACCENT);
			const r = c.rows[y];
			c.set(r.right, y, T.ACCENT_SHADE);
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
			"#B8313A"
		],
		draw: on([
			"1222",
			"1223",
			"1..."
		], 1)
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
			"...11",
			".1131",
			"11122"
		])
	},
	{
		id: "weighsies.scale",
		game: "weighsies",
		name: "Balance",
		colors: [
			"#2B2F38",
			"#FFFFFF",
			"#D9DEE6"
		],
		draw: on([
			"22.1.22",
			"3111113",
			"...1..."
		])
	},
	{
		id: "cutsies.slice",
		game: "cutsies",
		name: "Kiwi slice",
		free: true,
		colors: [
			"#86CF55",
			"#C9F08F",
			"#2A1B10",
			"#F1F7D4",
			"#9C6E43"
		],
		draw: on([
			".1111.",
			"134431",
			".5555."
		])
	},
	{
		id: "cutsies.chef",
		game: "cutsies",
		name: "Chef hat",
		colors: ["#FFFFFF", "#DCE3EC"],
		draw: on([
			".1111.",
			"111112",
			".2222."
		])
	},
	{
		id: "tiltsies.ears",
		game: "tiltsies",
		name: "Hamster ears",
		free: true,
		colors: ["#EDB57D", "#FFB3A7"],
		draw: onPair(["11", "12"], 1)
	},
	{
		id: "tiltsies.buddy",
		game: "tiltsies",
		name: "Hamster buddy",
		colors: [
			"#EDB57D",
			"#FFE7CB",
			"#2A1B10"
		],
		draw: on([
			"1...1",
			"11111",
			"13131",
			".222."
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
		draw: (c) => {
			capRows(c, 3, L(1), L(2));
			const x = Math.floor(c.centre);
			for (let y$1 = c.crown; y$1 < c.crown + 3; y$1++) {
				c.set(x - 1, y$1, L(3));
				c.set(x, y$1, L(3));
			}
			const y = c.crown + 3;
			const r = c.rows[y];
			for (let vx = r.left; vx <= Math.min(r.right + 1, 14); vx++) c.set(vx, y, L(4));
			c.set(r.right - 1, y, L(5));
			c.set(r.right, y, L(5));
			if (r.left > 1) c.set(r.left - 1, y, L(1));
		}
	},
	{
		id: "amountle.cluster",
		game: "amountle",
		name: "Big gem",
		colors: [
			"#3FD1C1",
			"#1F9C90",
			"#A6F4EA"
		],
		draw: on([
			".331.",
			"33111",
			"31112",
			".112."
		])
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
			".11.",
			"1..2",
			"1..2",
			".22."
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
			".1111.",
			"123321",
			".2222."
		], 1)
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
			"..33..",
			".1411.",
			"141141",
			"222222"
		])
	},
	{
		id: "weighsies.dumbbell",
		game: "weighsies",
		name: "Dumbbell",
		colors: ["#4A4E5E", "#9AA0A8"],
		draw: on([
			"1.....1",
			"1222221",
			"1.....1"
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
			".1111.",
			"111112",
			"343434"
		])
	},
	{
		id: "tiltsies.seed",
		game: "tiltsies",
		name: "Sunflower seed",
		colors: ["#3A3A42", "#E8E4DA"],
		draw: on([
			".1.",
			"121",
			"121",
			"121"
		], 2)
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
		colors: [
			"#9CC8F0",
			"#86CF55",
			"#2A1B10",
			"#7A5432"
		],
		fill: (x, y) => {
			for (const [kx, ky] of [
				[2, 2],
				[13, 13],
				[13, 2],
				[2, 13]
			]) {
				const d = Math.abs(x - kx) + Math.abs(y - ky);
				if (d === 0) return 3;
				if (d === 1) return 2;
				if (d === 2 && x !== kx && y !== ky) return 4;
			}
			return 1;
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
	}
];
/**
* A tiny pet that sits at his feet, bottom right, in front of everything. One
* per game, drawn small enough (4 or 5 pixels) to leave the guy room.
*/
const buddies = [
	{
		id: "amountle.gemling",
		game: "amountle",
		name: "Gemling",
		colors: [
			"#5FE0D0",
			"#2FA89A",
			"#E6FFFB"
		],
		art: stamp([
			".13.",
			"1132",
			"1122",
			".22."
		])
	},
	{
		id: "halfsies.pea",
		game: "halfsies",
		name: "Pea pod",
		colors: [
			"#7CC45A",
			"#4E9A36",
			"#C6F59A"
		],
		art: stamp([
			".11.",
			"1332",
			"1332",
			".22."
		])
	},
	{
		id: "stackdle.cubelet",
		game: "stackdle",
		name: "Cubelet",
		colors: ["#FFB03B", "#E58A1F"],
		art: stamp([
			"1112",
			"o1o2",
			"1112",
			"2222"
		])
	},
	{
		id: "flipsies.droplet",
		game: "flipsies",
		name: "Droplet",
		colors: [
			"#6FC3F5",
			"#3E8FD6",
			"#FFFFFF"
		],
		art: stamp([
			".1..",
			".11.",
			"1311",
			"1112",
			".22."
		])
	},
	{
		id: "puttsies.tee",
		game: "puttsies",
		name: "Tee buddy",
		colors: [
			"#FFFFFF",
			"#D3D8E2",
			"#E8B060"
		],
		art: stamp([
			".11.",
			"1121",
			".22.",
			".3..",
			"333."
		])
	},
	{
		id: "weighsies.mouse",
		game: "weighsies",
		name: "Mouse",
		colors: [
			"#B9C0CE",
			"#FF9EBB",
			"#8A93A3"
		],
		art: stamp([
			"2..2",
			"1111",
			"o11o",
			".33."
		])
	},
	{
		id: "cutsies.seedling",
		game: "cutsies",
		name: "Seedling",
		colors: [
			"#7DD87A",
			"#4FAE5C",
			"#B07444"
		],
		art: stamp([
			"1..1",
			".12.",
			".2..",
			"3333"
		])
	},
	{
		id: "tiltsies.hamlet",
		game: "tiltsies",
		name: "Hamlet",
		colors: [
			"#F2B66D",
			"#FFE4C2",
			"#C98A45"
		],
		art: stamp([
			"3..3",
			"1111",
			"o22o",
			"3333"
		])
	},
	{
		id: "trackdle.snail",
		game: "trackdle",
		name: "Turbo snail",
		colors: [
			"#E8A23A",
			"#B8721A",
			"#9FD18A"
		],
		art: stamp([
			".11.",
			"1221",
			"1121",
			"3333"
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
			"..3..",
			".121.",
			".212.",
			"12121"
		])
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
			"#4FAE5C"
		],
		draw: on([
			"..3..",
			"11211",
			"11211",
			".111."
		])
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
			"....3",
			"..11.",
			".112.",
			"33333"
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
			"11.11",
			"13112",
			".112.",
			"..2.."
		])
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
	const lum$2 = (hex$2) => {
		const c = (i) => {
			const v = parseInt(hex$2.slice(1 + i * 2, 3 + i * 2), 16) / 255;
			return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
		};
		return .2126 * c(0) + .7152 * c(1) + .0722 * c(2);
	};
	const [hi, lo] = [lum$2(a), lum$2(b$1)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
/** Adds the equipped items' own colours to a palette. */
function withItems(palette, config) {
	const colors = { ...palette.colors };
	for (const slot of [
		"skin",
		"hat",
		"frame",
		"buddy"
	]) {
		const item = itemById(config[slot]);
		if (!item) continue;
		item.colors.forEach((hex$2, i) => {
			colors[LAYER[slot] + i] = hex$2;
		});
		if (slot === "skin") {
			if (item.outline) colors[T.OUTLINE] = item.outline;
			const dark = "#15111C", light$1 = "#FFF1D6";
			colors[T.EYE] = colors[T.MOUTH] = contrast$1(dark, item.colors[0]) >= contrast$1(light$1, item.colors[0]) ? dark : light$1;
		}
	}
	return {
		name: palette.name,
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
	if (hat?.slot === "hat") {
		hat.draw(c);
		claim(c.grid, LAYER.hat);
		for (let y = GRID_SIZE - 2; y >= 0; y--) for (let x = 0; x < GRID_SIZE; x++) {
			const t = c.grid[y][x], below = c.grid[y + 1][x];
			if (t >= LAYER.hat && t < LAYER.frame && (below === T.BODY || below === T.LIGHT || below === T.BELLY)) c.grid[y + 1][x] = T.SHADE;
		}
	} else if (!skin) hair[config.hair].draw(c);
	const accessory = accessories[config.accessory];
	if (accessory.layer === "face") accessory.draw(c);
	const line = c.eyeLine;
	const cheek = cheeks[config.cheeks].art;
	if (cheek.length) c.draw(cheek, c.centred(cheek), line + 1, true);
	const eye = eyes[config.eyes].art;
	c.draw(eye, c.centred(eye), line - eye.length + 1, true);
	const mouth$1 = mouths[config.mouth].art;
	c.draw(mouth$1, c.centred(mouth$1), line + 1, true);
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
	}
];
function hexToRgb(hex$2) {
	return [
		1,
		3,
		5
	].map((i) => parseInt(hex$2.slice(i, i + 2), 16));
}
function rgbToHex(r, g, b$1) {
	return "#" + [
		r,
		g,
		b$1
	].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function toHsl(hex$2) {
	const [r, g, b$1] = hexToRgb(hex$2).map((v) => v / 255);
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
function mix$1(a, b$1, amount) {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b$1);
	return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}
/** Moves a hue `amount` degrees towards `target` along the short way round. */
function towards(hue, target, amount) {
	const diff = (target - hue + 540) % 360 - 180;
	return hue + Math.sign(diff) * Math.min(Math.abs(diff), amount);
}
function luminance(hex$2) {
	const channel = (v) => {
		v /= 255;
		return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	};
	const [r, g, b$1] = hexToRgb(hex$2);
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
	]);
	const ink = contrast(dark, body) >= 4.2 || contrast(dark, body) > contrast("#FFF1D6", body) ? dark : "#FFF1D6";
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
			3: mix$1(body, "#FFFFFF", .55),
			4: outline$1,
			5: ink,
			6: "#FFFFFF",
			7: blush,
			8: ink,
			9: tongue,
			10: accent,
			11: shadeOf(accent),
			12: trim,
			13: mix$1(body, "#FFFBF0", .6),
			14: "#7DD87A",
			15: "#4FAE5C",
			16: gold,
			17: goldShade,
			18: "#FF6B78",
			19: shadeOf(body, .24)
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
		if (shade === 0) return mix$1(hex$2, "#FFFFFF", .3);
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
		let hue = (h + 150) % 360;
		const dark = l < .45;
		if (dark && hue >= 10 && hue <= 110) hue += 130;
		return fromHsl([
			hue,
			dark ? Math.max(.6, Math.min(.85, s + .15)) : Math.min(.85, s + .05),
			dark ? Math.min(Math.max(l, .22), .28) : Math.max(l, .66)
		]);
	};
	const c = palette.colors;
	return derive(`${palette.name} Lucky`, turn(c[1]), turn(c[10]), "#FFE9A8");
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
function paint(grid, config, palette, small = false) {
	const state = { glint: false };
	const slotOf$1 = (t) => t >= LAYER.buddy ? "buddy" : t >= LAYER.frame ? "frame" : t >= LAYER.hat ? "hat" : t >= LAYER.skin ? "skin" : null;
	if (small) ({grid, palette} = forSmall(grid, palette));
	return grid.map((row, y) => row.map((token, x) => {
		const color = token === T.WHITE ? catchlight(grid, x, y, palette) : resolveColor(palette, token);
		if (!color) return null;
		const slot = slotOf$1(token);
		const copy = slot ? config.owned?.[slot] : void 0;
		return copy ? paintCell(color, x, y, copy, state) : color;
	}));
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
	const deep = mix$1(ink, "#000000", .45);
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
	if (!ink || contrast(white, ink) < 3) return white;
	const pale = near.some((t) => t !== T.EYE && t !== T.WHITE && t !== 0 && contrast(white, resolveColor(palette, t) ?? "#000000") < 1.6);
	return pale ? mix$1(ink, white, .6) : white;
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
function painted(grid, config, palette, small = false) {
	const colors = paint(grid, config, palette, small);
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
		if (!layers.has(pose)) layers.set(pose, painted(grid(pose), config, palette, !!options.small));
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
		if (beat.emote) emote(layer, beat.emote, !!beat.left, beat.rise ? 1 : 0);
		if (options.emote && !beat.emote) emote(layer, options.emote, false, Math.floor(t$1 / 400) % 2);
		if (grade >= 2) {
			const on$1 = Math.floor((t$1 + seed) / 320) % 2 === 0;
			const ring = grade === 4 ? on$1 ? "#FFE27A" : "#E4AE39" : on$1 ? gradeColor : mix(gradeColor, "#000000", .35);
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
	const palette = withItems(options.palette ?? paletteOf(config), config);
	const size = options.size ?? 128;
	const small = options.small ?? size <= SMALL_SIZE;
	const colors = paint(compose(config), config, palette, small);
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
function pickable(own$1, slot) {
	const weights = SLOTS.find((s) => s[1] === slot)[2];
	return weights.map((w, i) => i).filter((i) => weights[i] >= RARE || i === own$1[slot]);
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
const lum = (hex$2) => {
	const n = parseInt(hex$2.slice(1, 7), 16);
	return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255;
};
const darken = (hex$2, k) => {
	const n = parseInt(hex$2.slice(1, 7), 16), f = (v) => Math.round(v * k).toString(16).padStart(2, "0");
	return `#${f(n >> 16 & 255)}${f(n >> 8 & 255)}${f(n & 255)}`;
};
/** Steps to the nearest pixel outside, 4-way; the border counts as outside. */
function inset(w, h, inside) {
	const d = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_$1, x) => inside(x, y) ? 99 : 0));
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
			const inside = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			].map(([dx, dy]) => C[y + dy]?.[x + dx]).filter((n) => !!n && lum(n) >= .3);
			if (inside.length) side = darken(inside[0], .92);
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
	buddy: [LAYER.buddy, LAYER.buddy + 10]
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
	const quad = (a, b$1, c, d, n, rgb$2) => {
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
			col.push(...rgb$2);
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
exports.DEEP_BLUE_PRINTS = DEEP_BLUE_PRINTS
exports.DEFAULT_COLORS = DEFAULT_COLORS
exports.DEFAULT_COLORS_DARK = DEFAULT_COLORS_DARK
exports.DEFAULT_COLORS_LIGHT = DEFAULT_COLORS_LIGHT
exports.EMOTE_UNLOCKS = EMOTE_UNLOCKS
exports.FINISHES = FINISHES
exports.FOOT_STYLES = FOOT_STYLES
exports.FRAME_HEIGHT = FRAME_HEIGHT
exports.FRAME_SLOTS = FRAME_SLOTS
exports.FRAME_WIDTH = FRAME_WIDTH
exports.GAMES = GAMES
exports.GOLD_RIM_DAYS = GOLD_RIM_DAYS
exports.GRADES = GRADES
exports.GRID_SIZE = GRID_SIZE
exports.HEADROOM = HEADROOM
exports.LUCKY_ODDS = LUCKY_ODDS
exports.MAX_PINS = MAX_PINS
exports.MOVES = MOVES
exports.PINS = PINS
exports.SHADE_COUNT = SHADE_COUNT
exports.SMALL_SIZE = SMALL_SIZE
exports.WEAR = WEAR
exports.accessories = accessories
exports.allowed = allowed
exports.animate = animate
exports.bodies = bodies
exports.cheeks = cheeks
exports.closeEyes = closeEyes
exports.compose = compose
exports.composeBase = composeBase
exports.copyOneIn = copyOneIn
exports.createShine = createShine
exports.decode = decode
exports.decodeLook = decodeLook
exports.drawFrame = drawFrame
exports.dress = dress
exports.encode = encode
exports.encodeLook = encodeLook
exports.eyes = eyes
exports.frameAt = frameAt
exports.freeItem = freeItem
exports.gameItems = gameItems
exports.getColor = getColor
exports.getPalette = getPalette
exports.gradeOf = gradeOf
exports.guyOneIn = guyOneIn
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
exports.rollSeason = rollSeason
exports.shadePalette = shadePalette
exports.shineData = shineData
exports.slotOf = slotOf
exports.special = special
exports.starter = starter
exports.surfaceOf = surfaceOf
exports.tallyMarks = tallyMarks
exports.temperTint = temperTint
exports.toAnimatedSvg = toAnimatedSvg
exports.toPng = toPng
exports.toShareSvg = toShareSvg
exports.toSvgString = toSvgString
exports.traitOdds = traitOdds
exports.voxelColumns = voxelColumns
exports.voxelItem = voxelItem
exports.voxelMesh = voxelMesh
exports.wearOf = wearOf
exports.withItems = withItems
return exports;
})({});