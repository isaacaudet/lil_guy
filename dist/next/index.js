import { GRID_SIZE, compose, getPalette, resolve, resolveColor, shadePalette } from "../palette-iITYy5V_.js";
import { jsx } from "react/jsx-runtime";
import { ImageResponse } from "next/og";

//#region src/next/image.tsx
/**
* Static LilGuy image component for use with Next.js ImageResponse (Satori).
* Uses only Satori-compatible CSS (flexbox, no CSS grid, no SVG foreignObject).
*/
function LilGuyImage({ name, size, palette: customPalette, parts: partOverrides }) {
	const config = resolve(name, partOverrides);
	const palette = customPalette ?? shadePalette(getPalette(config.palette), config.shade);
	const grid = compose(config);
	const pixelSize = Math.floor(size / GRID_SIZE);
	const pixels = [];
	for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
		const token = grid[y][x];
		const color = resolveColor(palette, token);
		if (color) pixels.push(/* @__PURE__ */ jsx("div", { style: {
			position: "absolute",
			left: x * pixelSize,
			top: y * pixelSize,
			width: pixelSize,
			height: pixelSize,
			backgroundColor: color
		} }, `${x}-${y}`));
	}
	return /* @__PURE__ */ jsx("div", {
		style: {
			width: size,
			height: size,
			display: "flex",
			position: "relative",
			overflow: "hidden"
		},
		children: pixels
	});
}

//#endregion
//#region src/next/handler.tsx
function parseNumber(value, defaultValue, min = 1, max = 2e3) {
	if (value === null) return defaultValue;
	const num = Number.parseInt(value, 10);
	if (Number.isNaN(num)) return defaultValue;
	return Math.min(Math.max(num, min), max);
}
/**
* Creates a Next.js route handler for generating LilGuy avatar images.
*
* @example
* ```ts
* // app/api/avatar/route.ts
* import { toLilGuyHandler } from "lil_guy/next";
*
* export const { GET } = toLilGuyHandler();
* ```
*
* Query parameters:
* - `name` (required): String to generate avatar from
* - `size`: Image size in pixels (default: 400, max: 2000)
*/
function toLilGuyHandler(options = {}) {
	const { size: defaultSize = 400, cacheControl = "public, max-age=31536000, immutable" } = options;
	async function GET(request) {
		const url = new URL(request.url);
		const searchParams = url.searchParams;
		const name = searchParams.get("name");
		if (!name) return new ImageResponse(/* @__PURE__ */ jsx("div", {
			style: {
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#f3f4f6",
				color: "#6b7280",
				fontSize: 24,
				fontFamily: "sans-serif"
			},
			children: "Missing ?name= parameter"
		}), {
			width: defaultSize,
			height: defaultSize,
			status: 400,
			headers: { "Content-Type": "image/png" }
		});
		const size = parseNumber(searchParams.get("size"), defaultSize, 16, 2e3);
		const headers = { "Content-Type": "image/png" };
		if (cacheControl) headers["Cache-Control"] = cacheControl;
		return new ImageResponse(/* @__PURE__ */ jsx(LilGuyImage, {
			name,
			size
		}), {
			width: size,
			height: size,
			headers
		});
	}
	return { GET };
}

//#endregion
export { toLilGuyHandler };
//# sourceMappingURL=index.js.map