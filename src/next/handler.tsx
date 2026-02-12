import { ImageResponse } from "next/og";
import { LilGuyImage } from "./image";

// ============================================================================
// Types
// ============================================================================

export type LilGuyHandlerOptions = {
	/**
	 * Default image size in pixels.
	 * Can be overridden via `?size=` query param.
	 * @default 400
	 */
	size?: number;

	/**
	 * Cache-Control header value.
	 * Set to `null` to disable caching.
	 * @default "public, max-age=31536000, immutable"
	 */
	cacheControl?: string | null;
};

export type LilGuyHandler = {
	GET: (request: Request) => Promise<Response>;
};

// ============================================================================
// Helpers
// ============================================================================

function parseNumber(
	value: string | null,
	defaultValue: number,
	min = 1,
	max = 2000
): number {
	if (value === null) return defaultValue;
	const num = Number.parseInt(value, 10);
	if (Number.isNaN(num)) return defaultValue;
	return Math.min(Math.max(num, min), max);
}

// ============================================================================
// Main Export
// ============================================================================

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
export function toLilGuyHandler(
	options: LilGuyHandlerOptions = {}
): LilGuyHandler {
	const {
		size: defaultSize = 400,
		cacheControl = "public, max-age=31536000, immutable",
	} = options;

	async function GET(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const searchParams = url.searchParams;

		const name = searchParams.get("name");
		if (!name) {
			return new ImageResponse(
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#f3f4f6",
						color: "#6b7280",
						fontSize: 24,
						fontFamily: "sans-serif",
					}}
				>
					Missing ?name= parameter
				</div>,
				{
					width: defaultSize,
					height: defaultSize,
					status: 400,
					headers: { "Content-Type": "image/png" },
				}
			);
		}

		const size = parseNumber(searchParams.get("size"), defaultSize, 16, 2000);

		const headers: Record<string, string> = {
			"Content-Type": "image/png",
		};

		if (cacheControl) {
			headers["Cache-Control"] = cacheControl;
		}

		return new ImageResponse(
			<LilGuyImage name={name} size={size} />,
			{ width: size, height: size, headers }
		);
	}

	return { GET };
}
