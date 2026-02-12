/**
 * Next.js adapter for LilGuy avatar image generation.
 *
 * @example
 * ```ts
 * // app/api/avatar/route.ts
 * import { toLilGuyHandler } from "lil_guy/next";
 *
 * export const { GET } = toLilGuyHandler();
 * ```
 *
 * @packageDocumentation
 */

export {
	type LilGuyHandler,
	type LilGuyHandlerOptions,
	toLilGuyHandler,
} from "./handler";
