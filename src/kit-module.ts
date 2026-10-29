import { defineLilGuy } from './element';
import { setLilGuysHost } from './kit';

/**
 * The kit as the lil guys Worker serves it at `/lilguys.mjs`, a module: import what you need, talking
 * to the Worker it came from, with `<lil-guy>` ready to use.
 *
 *   import { lilGuyImg, lilGuysFor } from 'https://lilguys.dleclub.com/lilguys.mjs';
 */
const host = new URL(import.meta.url).origin;
if (/^https?:/.test(host)) { setLilGuysHost(host); defineLilGuy({ host }); }

export * from './kit';
export { defineLilGuy };
export { ART_VERSION, BAKED_SIZE, PICTURE_VIEWS, guyCode, viewSize } from './guy-code';
