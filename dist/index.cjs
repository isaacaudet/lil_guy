"use strict";
const require_paint = require('./paint-D3pYVnkK.cjs');
const react = require_paint.__toESM(require("react"));
const react_jsx_runtime = require_paint.__toESM(require("react/jsx-runtime"));

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
	"squish"
];
/** Rows of room above the guy for jumps. */
const HEADROOM = 4;
const FRAME_WIDTH = require_paint.GRID_SIZE;
const FRAME_HEIGHT = require_paint.GRID_SIZE + HEADROOM;
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
		b("wave", 220),
		b("base", 700)
	] : [
		b("base", 200, { dx: -1 }),
		b("base", 200),
		b("base", 200, { dx: 1 }),
		b("base", 200),
		b("base", 700)
	],
	look: () => [
		b("base", 500),
		b("left", 700),
		b("base", 250),
		b("right", 700),
		b("base", 250),
		b("shut", 120),
		b("base", 400)
	],
	cheer: (canWave) => {
		const arm = canWave ? "wave" : "base";
		const up = [
			b("base", 80, { squash: 1 }),
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
			b("base", 90, { squash: 2 })
		];
		return [
			...up,
			...up,
			b(arm, 220, { stars: true }),
			b(canWave ? "sides" : "base", 220),
			b("base", 400)
		];
	},
	sad: () => [
		b("shut", 900, {
			squash: 1,
			drop: true
		}),
		b("shut", 700, {
			squash: 2,
			drop: true
		}),
		b("shut", 900, {
			squash: 1,
			drop: true
		}),
		b("base", 500, { squash: 1 })
	],
	dance: () => [
		b("base", 180, {
			dx: -1,
			squash: 1
		}),
		b("base", 180),
		b("base", 180, {
			dx: 1,
			squash: 1,
			turn: true
		}),
		b("base", 180, { turn: true })
	],
	squish: () => [
		b("base", 90, { squash: 2 }),
		b("base", 80, { squash: -2 }),
		b("base", 80, { squash: 1 }),
		b("base", 70, { squash: -1 }),
		b("base", 700)
	]
};
const EYE_TOKENS = new Set([require_paint.T.EYE, require_paint.T.WHITE]);
/** The row the bottom of the eyes sits on, for this guy's shape or skin. */
function eyeLineOf(config) {
	const skin = require_paint.itemById(config.skin);
	return skin?.slot === "skin" ? skin.eyes : require_paint.heads[config.head].eyes;
}
/** The bare body, mirrored the same way as the finished guy. */
function bareOf(config) {
	const bare = require_paint.composeBase(config);
	if (config.flip) for (const row of bare) row.reverse();
	return bare;
}
/** Eye pixels: eye ink and eye shine in the rows the eyes are drawn on. */
function eyeCells(grid, config) {
	const line = eyeLineOf(config);
	const out = [];
	for (let y = Math.max(0, line - 3); y <= line; y++) for (let x = 0; x < require_paint.GRID_SIZE; x++) if (EYE_TOKENS.has(grid[y][x])) out.push([x, y]);
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
	for (const [x, y] of eyeCells(grid, config)) shut[y][x] = y === lowest.get(x) ? require_paint.T.EYE : bare[y][x] ?? 0;
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
		if (nx >= 0 && nx < require_paint.GRID_SIZE && bare[y][nx]) out[y][nx] = grid[y][x];
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
const empty = () => Array.from({ length: FRAME_HEIGHT }, () => new Array(FRAME_WIDTH).fill(null));
/** Paints a pose and keeps track of which pixels belong to a worn item. */
function painted(grid, config, palette) {
	const colors = require_paint.paint(grid, config, palette);
	const out = empty();
	grid.forEach((row, y) => row.forEach((t, x) => {
		const c = colors[y][x];
		if (c) out[y + HEADROOM][x] = {
			c,
			item: t >= require_paint.LAYER.skin && t < require_paint.LAYER.frame
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
	const config = require_paint.dress(require_paint.resolve(input, options.parts), options, input);
	const palette = require_paint.withItems(options.palette ?? require_paint.shadePalette(require_paint.getPalette(config.palette), config.shade), config);
	const figure = {
		...config,
		frame: void 0
	};
	const grids = new Map();
	const grid = (pose) => {
		if (!grids.has(pose)) {
			const base = require_paint.compose(figure);
			grids.set(pose, pose === "base" ? base : pose === "shut" ? closeEyes(base, config) : pose === "left" ? glance(base, config, -1) : pose === "right" ? glance(base, config, 1) : require_paint.compose({
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
	const frameItem = require_paint.itemById(config.frame);
	if (frameItem?.slot === "frame") {
		const tall = Array.from({ length: require_paint.GRID_SIZE + HEADROOM * 2 }, (_, y) => Array.from({ length: require_paint.GRID_SIZE }, (_$1, x) => require_paint.LAYER.frame + frameItem.fill(x, y + 48) - 1));
		const colors = require_paint.paint(tall, config, palette);
		backdrop = Array.from({ length: FRAME_HEIGHT }, (_, y) => colors[y < HEADROOM ? require_paint.GRID_SIZE - HEADROOM + y : y - HEADROOM]);
	}
	const copies = Object.values(config.owned ?? {}).filter(Boolean);
	const grade = options.rarity === false || !copies.length ? -1 : Math.max(...copies.map((o) => require_paint.GRADES.findIndex((g) => g.id === require_paint.gradeOf(o).id)));
	const gradeColor = grade >= 0 ? require_paint.GRADES[grade].color : "#FFFFFF";
	const seed = require_paint.hash(input) % 997;
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
	const frames = slices.map(({ beat, ms, t: t$1 }) => {
		let layer = layerOf(beat.pose);
		if (beat.turn) layer = layer.map((row) => [...row].reverse());
		layer = squash(layer, beat.squash ?? 0);
		layer = shift(layer, beat.dx ?? 0, beat.dy ?? 0);
		layer = layer.map((row) => row.map((cell) => cell ? { ...cell } : null));
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
			const gold = palette.colors[require_paint.T.GOLD] ?? "#F2C230";
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
		if (grade >= 2) {
			const on = Math.floor((t$1 + seed) / 320) % 2 === 0;
			const ring = grade === 4 ? on ? "#FFE27A" : "#E4AE39" : on ? gradeColor : mix(gradeColor, "#000000", .35);
			for (const [x, y] of aura) if (!layer[y][x]) layer[y][x] = {
				c: ring,
				item: false
			};
		}
		if (grade >= 3) {
			const count = grade === 4 ? 4 : 3;
			SPARKLE_SPOTS.slice(0, count + 2).forEach(([x, y], k) => {
				if ((t$1 / 240 + k * 1.7 + seed) % 4 < 1) twinkle(layer, x, y, "#FFFFFF", grade === 4 ? "#FFE27A" : gradeColor);
			});
		}
		const colors = layer.map((row, y) => row.map((cell, x) => cell?.c ?? backdrop?.[y][x] ?? null));
		return {
			colors,
			ms
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
	const id = `lg${require_paint.hash(`${input}|${move}|${JSON.stringify({
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
const LilGuy = react.forwardRef(({ name, size = 40, shape = "circle", variant = "transparent", interactive = true, palette: customPalette, parts: partOverrides, game, equip, intensity3d = "dramatic", enableBlink = false, colors, colorClasses, gradientOverlayClass, showInitial = false, onRenderMouth, className, style, onMouseEnter, onMouseLeave,...props }, ref) => {
	const [isHovered, setIsHovered] = react.useState(false);
	react.useEffect(() => {
		if (enableBlink || interactive) injectBlinkKeyframes();
	}, [enableBlink, interactive]);
	const { rects, shutRects, bgColor, config, hashValue } = react.useMemo(() => {
		const cfg = require_paint.dress(require_paint.resolve(name, partOverrides), {
			game,
			equip
		}, name);
		const palette = require_paint.withItems(customPalette ?? require_paint.shadePalette(require_paint.getPalette(cfg.palette), cfg.shade), cfg);
		const grid = require_paint.compose(cfg);
		const hv = require_paint.hash(name);
		const toRects = (source, keyPrefix) => {
			const out = [];
			const colors$1 = require_paint.paint(source, cfg, palette);
			for (let y = 0; y < require_paint.GRID_SIZE; y++) for (let x = 0; x < require_paint.GRID_SIZE; x++) {
				const color = colors$1[y][x];
				if (color) out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(
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
	const handleMouseEnter = react.useCallback((e) => {
		if (interactive) setIsHovered(true);
		onMouseEnter?.(e);
	}, [interactive, onMouseEnter]);
	const handleMouseLeave = react.useCallback((e) => {
		if (interactive) setIsHovered(false);
		onMouseLeave?.(e);
	}, [interactive, onMouseLeave]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
			variant === "gradient" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						width: "100%",
						height: "100%"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						"aria-hidden": "true",
						xmlns: "http://www.w3.org/2000/svg",
						viewBox: `0 0 ${require_paint.GRID_SIZE} ${require_paint.GRID_SIZE}`,
						shapeRendering: "crispEdges",
						style: {
							width: "100%",
							height: "100%",
							transform: isHovered && interactive ? "scale(1.08)" : void 0,
							transition: interactive ? "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)" : void 0,
							imageRendering: "pixelated"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
							style: { animation: enableBlink ? `lilguy-eyes-open ${blinkDuration}s ease-in-out ${blinkDelay}s infinite` : void 0 },
							children: rects
						}), enableBlink ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
							style: { animation: `lilguy-eyes-shut ${blinkDuration}s ease-in-out ${blinkDelay}s infinite` },
							children: shutRects
						}) : null]
					})
				}), onRenderMouth?.()]
			}),
			showInitial && name.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
const AvatarContext = react.createContext(null);
/**
* Hook to access the Avatar context.
* Throws an error if used outside of Avatar.
*/
const useAvatarContext = () => {
	const context = react.useContext(AvatarContext);
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
const Avatar = react.forwardRef(({ children, className, style, asChild: _asChild,...props }, ref) => {
	const [imageLoadingStatus, setImageLoadingStatus] = react.useState("idle");
	const contextValue = react.useMemo(() => ({
		imageLoadingStatus,
		onImageLoadingStatusChange: setImageLoadingStatus
	}), [imageLoadingStatus]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AvatarContext.Provider, {
		value: contextValue,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
const AvatarFallback = react.forwardRef(({ name = "", delayMs = 0, children, lilGuy = true, lilGuyProps, className, style,...props }, ref) => {
	const { imageLoadingStatus } = useAvatarContext();
	const [canRender, setCanRender] = react.useState(delayMs === 0);
	react.useEffect(() => {
		if (delayMs > 0) {
			const timerId = window.setTimeout(() => setCanRender(true), delayMs);
			return () => window.clearTimeout(timerId);
		}
	}, [delayMs]);
	const initials = react.useMemo(() => getInitials(name), [name]);
	const shouldRender = canRender && imageLoadingStatus !== "loaded" && imageLoadingStatus !== "loading";
	if (!shouldRender) return null;
	if (children) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
	if (lilGuy) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LilGuy, {
		className,
		"data-avatar-fallback": "",
		name,
		ref,
		size: "100%",
		...lilGuyProps,
		style: { ...style },
		...props
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
const AvatarImage = react.forwardRef(({ src, alt = "", className, style, onLoadingStatusChange,...props }, ref) => {
	const { imageLoadingStatus, onImageLoadingStatusChange } = useAvatarContext();
	const imageRef = react.useRef(null);
	react.useImperativeHandle(ref, () => imageRef.current);
	const updateStatus = react.useCallback((status) => {
		onImageLoadingStatusChange(status);
		onLoadingStatusChange?.(status);
	}, [onImageLoadingStatusChange, onLoadingStatusChange]);
	react.useLayoutEffect(() => {
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
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
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
	for (let x = 0; x <= require_paint.GRID_SIZE; x++) {
		const color = x < require_paint.GRID_SIZE ? colors[y][x] : null;
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
	const config = require_paint.dress(require_paint.resolve(input, options.parts), options, input);
	const palette = require_paint.withItems(options.palette ?? require_paint.shadePalette(require_paint.getPalette(config.palette), config.shade), config);
	const colors = require_paint.paint(require_paint.compose(config), config, palette);
	const size = options.size ?? 128;
	const pixelSize = size / require_paint.GRID_SIZE;
	const rects = [];
	for (let y = 0; y < require_paint.GRID_SIZE; y++) for (const run of rowRuns(colors, y)) rects.push(`<rect x="${run.x * pixelSize}" y="${y * pixelSize}" width="${run.width * pixelSize}" height="${pixelSize}" fill="${run.color}"/>`);
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
	return react.useMemo(() => mergeRefs(refs), refs);
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
			name: require_paint.heads[config.head].name,
			chance: share(require_paint.headWeights, config.head)
		},
		{
			slot: "eyes",
			name: require_paint.eyes[config.eyes].name,
			chance: share(require_paint.eyeWeights, config.eyes)
		},
		{
			slot: "mouth",
			name: require_paint.mouths[config.mouth].name,
			chance: share(require_paint.mouthWeights, config.mouth)
		},
		{
			slot: "cheeks",
			name: require_paint.cheeks[config.cheeks].name,
			chance: share(require_paint.cheekWeights, config.cheeks)
		},
		{
			slot: "topper",
			name: require_paint.hair[config.hair].name,
			chance: share(require_paint.hairWeights, config.hair)
		},
		{
			slot: "markings",
			name: require_paint.bodies[config.body].name,
			chance: share(require_paint.bodyWeights, config.body)
		},
		{
			slot: "accessory",
			name: require_paint.accessories[config.accessory].name,
			chance: share(require_paint.accessoryWeights, config.accessory)
		},
		{
			slot: "colour",
			name: require_paint.palettes[config.palette].name,
			chance: share(require_paint.paletteWeights, config.palette)
		}
	];
}
/** One in how many guys has exactly this combination. */
function guyOneIn(config) {
	return 1 / traitOdds(config).reduce((p, t) => p * t.chance, 1);
}
/** One in how many capsules for its game give a copy at least this good. */
function copyOneIn(o) {
	const item = require_paint.itemById(o.item);
	if (!item) return Infinity;
	const pool = require_paint.gameItems(item.game).filter((i) => !i.free).length;
	const f = require_paint.FINISHES[o.finish];
	let p = 1 / pool * (f.odds / 100);
	if (require_paint.special(o) === "Deep Blue") p *= require_paint.DEEP_BLUE_PRINTS.length / 1e3;
	else if (require_paint.special(o)) p *= 1 / 20;
	const [lo, hi] = f.scuffs;
	p *= Math.max(1e-7, (o.scuff - lo) / (hi - lo));
	if (o.tally !== void 0) p *= .1;
	return 1 / p;
}

//#endregion
exports.Avatar = Avatar
exports.AvatarFallback = AvatarFallback
exports.AvatarImage = AvatarImage
exports.DEEP_BLUE_PRINTS = require_paint.DEEP_BLUE_PRINTS
exports.DEFAULT_COLORS = DEFAULT_COLORS
exports.DEFAULT_COLORS_DARK = DEFAULT_COLORS_DARK
exports.DEFAULT_COLORS_LIGHT = DEFAULT_COLORS_LIGHT
exports.FINISHES = require_paint.FINISHES
exports.FOOT_STYLES = require_paint.FOOT_STYLES
exports.FRAME_HEIGHT = FRAME_HEIGHT
exports.FRAME_WIDTH = FRAME_WIDTH
exports.GAMES = require_paint.GAMES
exports.GRADES = require_paint.GRADES
exports.GRID_SIZE = require_paint.GRID_SIZE
exports.HEADROOM = HEADROOM
exports.LilGuy = LilGuy
exports.MOVES = MOVES
exports.SHADE_COUNT = require_paint.SHADE_COUNT
exports.WEAR = require_paint.WEAR
exports.accessories = require_paint.accessories
exports.animate = animate
exports.bodies = require_paint.bodies
exports.cheeks = require_paint.cheeks
exports.closeEyes = closeEyes
exports.compose = require_paint.compose
exports.composeBase = require_paint.composeBase
exports.copyOneIn = copyOneIn
exports.decode = require_paint.decode
exports.drawFrame = drawFrame
exports.dress = require_paint.dress
exports.encode = require_paint.encode
exports.eyes = require_paint.eyes
exports.frameAt = frameAt
exports.freeItem = require_paint.freeItem
exports.gameItems = require_paint.gameItems
exports.getColor = getColor
exports.getPalette = require_paint.getPalette
exports.gradeOf = require_paint.gradeOf
exports.guyOneIn = guyOneIn
exports.hair = require_paint.hair
exports.hash = require_paint.hash
exports.hashNth = require_paint.hashNth
exports.heads = require_paint.heads
exports.itemById = require_paint.itemById
exports.items = require_paint.items
exports.mergeRefs = mergeRefs
exports.mouths = require_paint.mouths
exports.nameOf = require_paint.nameOf
exports.nebulaPhase = require_paint.nebulaPhase
exports.paint = require_paint.paint
exports.palettes = require_paint.palettes
exports.resolve = require_paint.resolve
exports.resolveColor = require_paint.resolveColor
exports.roll = require_paint.roll
exports.shadePalette = require_paint.shadePalette
exports.slotOf = require_paint.slotOf
exports.special = require_paint.special
exports.starter = require_paint.starter
exports.toAnimatedSvg = toAnimatedSvg
exports.toPng = toPng
exports.toSvgString = toSvgString
exports.traitOdds = traitOdds
exports.useAvatarContext = useAvatarContext
exports.useMergeRefs = useMergeRefs
exports.wearOf = require_paint.wearOf
exports.withItems = require_paint.withItems
//# sourceMappingURL=index.cjs.map