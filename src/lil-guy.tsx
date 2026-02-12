import * as React from "react";
import { resolve } from "./resolve";
import { compose } from "./compose";
import { hash } from "./hash";
import { getPalette, resolveColor } from "./palette";
import type { ColorToken, Intensity3D, Palette } from "./types";
import { GRID_SIZE } from "./types";

// ============================================================================
// 3D Effect Constants
// ============================================================================

const INTENSITY_PRESETS = {
	none: { rotateRange: 0, translateZ: 0, perspective: "none" as const },
	subtle: { rotateRange: 5, translateZ: 4, perspective: "800px" },
	medium: { rotateRange: 10, translateZ: 8, perspective: "500px" },
	dramatic: { rotateRange: 15, translateZ: 12, perspective: "300px" },
};

const SPHERE_POSITIONS = [
	{ x: -1, y: 1 },
	{ x: 1, y: 1 },
	{ x: 1, y: 0 },
	{ x: 0, y: 1 },
	{ x: -1, y: 0 },
	{ x: 0, y: 0 },
	{ x: 0, y: -1 },
	{ x: -1, y: -1 },
	{ x: 1, y: -1 },
];

const BLINK_KEYFRAMES = `
@keyframes lilguy-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  96% { transform: scaleY(0.05); }
}`;

let blinkInjected = false;
function injectBlinkKeyframes() {
	if (blinkInjected || typeof document === "undefined") return;
	const style = document.createElement("style");
	style.textContent = BLINK_KEYFRAMES;
	document.head.appendChild(style);
	blinkInjected = true;
}

// ============================================================================
// Types
// ============================================================================

export interface LilGuyProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	/**
	 * String to generate a deterministic avatar from.
	 * Same string always produces the same character.
	 */
	name: string;

	/**
	 * Size in pixels or CSS units.
	 * @default 40
	 */
	size?: number | string;

	/**
	 * Shape of the avatar.
	 * - "circle": Circular clip (default)
	 * - "square": No clipping
	 * @default "circle"
	 */
	shape?: "circle" | "square";

	/**
	 * Background style.
	 * - "gradient": Adds subtle gradient overlay
	 * - "solid": Plain background from palette
	 * - "transparent": No background (default)
	 * @default "transparent"
	 */
	variant?: "gradient" | "solid" | "transparent";

	/**
	 * Enable hover interaction.
	 * When true, character scales up slightly on hover.
	 * @default true
	 */
	interactive?: boolean;

	/**
	 * Override the palette with a custom one.
	 */
	palette?: Palette;

	/**
	 * Pin specific parts by index. Other parts remain hash-derived.
	 */
	parts?: Partial<{
		head: number;
		eyes: number;
		mouth: number;
		hair: number;
		body: number;
		accessory: number;
	}>;

	/**
	 * 3D rotation intensity.
	 * @default "dramatic"
	 */
	intensity3d?: Intensity3D;

	/**
	 * Enable blink animation.
	 * @default false
	 */
	enableBlink?: boolean;

	/**
	 * Hex background color overrides.
	 */
	colors?: string[];

	/**
	 * Tailwind bg class overrides.
	 */
	colorClasses?: string[];

	/**
	 * CSS class for gradient overlay.
	 */
	gradientOverlayClass?: string;

	/**
	 * Show first letter overlay.
	 * @default false
	 */
	showInitial?: boolean;

	/**
	 * Custom mouth render function.
	 */
	onRenderMouth?: () => React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

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
export const LilGuy = React.forwardRef<HTMLDivElement, LilGuyProps>(
	(
		{
			name,
			size = 40,
			shape = "circle",
			variant = "transparent",
			interactive = true,
			palette: customPalette,
			parts: partOverrides,
			intensity3d = "dramatic",
			enableBlink = false,
			colors,
			colorClasses,
			gradientOverlayClass,
			showInitial = false,
			onRenderMouth,
			className,
			style,
			onMouseEnter,
			onMouseLeave,
			...props
		},
		ref
	) => {
		const [isHovered, setIsHovered] = React.useState(false);

		// Inject blink keyframes once
		React.useEffect(() => {
			if (enableBlink) injectBlinkKeyframes();
		}, [enableBlink]);

		// Resolve config and compose pixel grid
		const { rects, bgColor, config, hashValue } = React.useMemo(() => {
			const cfg = resolve(name, partOverrides);
			const palette = customPalette ?? getPalette(cfg.palette);
			const grid = compose(cfg);
			const hv = hash(name);

			const rectElements: React.ReactElement[] = [];
			for (let y = 0; y < GRID_SIZE; y++) {
				for (let x = 0; x < GRID_SIZE; x++) {
					const token = grid[y][x] as ColorToken;
					const color = resolveColor(palette, token);
					if (color) {
						rectElements.push(
							<rect
								key={`${x}-${y}`}
								x={x}
								y={y}
								width={1}
								height={1}
								fill={color}
							/>
						);
					}
				}
			}

			return {
				rects: rectElements,
				bgColor: palette.colors[3], // outfit color as background
				config: cfg,
				hashValue: hv,
			};
		}, [name, customPalette, partOverrides]);

		// 3D rotation
		const preset = INTENSITY_PRESETS[intensity3d];
		const position =
			SPHERE_POSITIONS[config.rotation] ?? SPHERE_POSITIONS[5];
		const rotateX =
			isHovered && interactive ? 0 : position.y * preset.rotateRange;
		const rotateY =
			isHovered && interactive ? 0 : position.x * preset.rotateRange;

		// Blink timing from hash
		const blinkSeed = hashValue * 31;
		const blinkDelay = (blinkSeed % 40) / 10;
		const blinkDuration = 2 + (blinkSeed % 40) / 10;

		// Size style
		const sizeValue = typeof size === "number" ? `${size}px` : size;

		// Resolve background color from overrides
		const resolvedBgColor = colors?.[0] ?? bgColor;

		// Event handlers
		const handleMouseEnter = React.useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (interactive) setIsHovered(true);
				onMouseEnter?.(e);
			},
			[interactive, onMouseEnter]
		);

		const handleMouseLeave = React.useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (interactive) setIsHovered(false);
				onMouseLeave?.(e);
			},
			[interactive, onMouseLeave]
		);

		return (
			<div
				className={className}
				data-lil-guy=""
				data-interactive={interactive || undefined}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				ref={ref}
				style={{
					width: sizeValue,
					height: sizeValue,
					position: "relative",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					overflow: "hidden",
					borderRadius: shape === "circle" ? "50%" : undefined,
					containerType: "size",
					perspective: preset.perspective,
					...(variant === "solid" && {
						backgroundColor: resolvedBgColor,
					}),
					...style,
				}}
				{...props}
			>
				{/* Gradient overlay */}
				{variant === "gradient" && (
					<div
						className={gradientOverlayClass ?? colorClasses?.[0]}
						data-lil-guy-gradient=""
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 1,
							background:
								gradientOverlayClass || colorClasses?.[0]
									? resolvedBgColor
									: `radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%), ${resolvedBgColor}`,
						}}
					/>
				)}

				{/* 3D face container */}
				<div
					data-lil-guy-face=""
					style={{
						width: "100%",
						height: "100%",
						position: "relative",
						zIndex: 2,
						transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${preset.translateZ}px)`,
						transformStyle: "preserve-3d",
						transition: interactive
							? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
							: undefined,
					}}
				>
					{/* Pixel art SVG */}
					<div
						style={{
							width: "100%",
							height: "100%",
							animation: enableBlink
								? `lilguy-blink ${blinkDuration}s ease-in-out ${blinkDelay}s infinite`
								: undefined,
							transformOrigin: "center 40%",
						}}
					>
						<svg
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
							shapeRendering="crispEdges"
							style={{
								width: "100%",
								height: "100%",
								transform:
									isHovered && interactive
										? "scale(1.08)"
										: undefined,
								transition: interactive
									? "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
									: undefined,
								imageRendering: "pixelated",
							}}
						>
							{rects}
						</svg>
					</div>

					{/* Custom mouth overlay */}
					{onRenderMouth?.()}
				</div>

				{/* Initial letter overlay */}
				{showInitial && name.length > 0 && (
					<div
						data-lil-guy-initial=""
						style={{
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
							textTransform: "uppercase",
						}}
					>
						{name[0]}
					</div>
				)}
			</div>
		);
	}
);

LilGuy.displayName = "LilGuy";
