import { resolve } from "../resolve";
import { compose } from "../compose";
import { getPalette, resolveColor } from "../palette";
import type { ColorToken, Palette } from "../types";
import { GRID_SIZE } from "../types";

export type LilGuyImageProps = {
	/** Name to generate avatar from */
	name: string;
	/** Image size in pixels */
	size: number;
	/** Optional custom palette */
	palette?: Palette;
	/** Optional part overrides */
	parts?: Partial<{
		head: number;
		eyes: number;
		mouth: number;
		hair: number;
		body: number;
		accessory: number;
	}>;
};

/**
 * Static LilGuy image component for use with Next.js ImageResponse (Satori).
 * Uses only Satori-compatible CSS (flexbox, no CSS grid, no SVG foreignObject).
 */
export function LilGuyImage({ name, size, palette: customPalette, parts: partOverrides }: LilGuyImageProps) {
	const config = resolve(name, partOverrides);
	const palette = customPalette ?? getPalette(config.palette);
	const grid = compose(config);
	const pixelSize = Math.floor(size / GRID_SIZE);

	// Build pixel divs — Satori doesn't support SVG <rect> well,
	// so we use absolutely positioned divs
	const pixels: React.ReactElement[] = [];
	for (let y = 0; y < GRID_SIZE; y++) {
		for (let x = 0; x < GRID_SIZE; x++) {
			const token = grid[y][x] as ColorToken;
			const color = resolveColor(palette, token);
			if (color) {
				pixels.push(
					<div
						key={`${x}-${y}`}
						style={{
							position: "absolute",
							left: x * pixelSize,
							top: y * pixelSize,
							width: pixelSize,
							height: pixelSize,
							backgroundColor: color,
						}}
					/>
				);
			}
		}
	}

	return (
		<div
			style={{
				width: size,
				height: size,
				display: "flex",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{pixels}
		</div>
	);
}
