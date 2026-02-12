//#region src/next/handler.d.ts
type LilGuyHandlerOptions = {
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
type LilGuyHandler = {
  GET: (request: Request) => Promise<Response>;
};
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
declare function toLilGuyHandler(options?: LilGuyHandlerOptions): LilGuyHandler; //#endregion
export { LilGuyHandler, LilGuyHandlerOptions, toLilGuyHandler };
//# sourceMappingURL=index.d.cts.map