import { defineLilGuy } from './element';
import { ART_VERSION, BAKED_SIZE, guyCode, PICTURE_VIEWS, viewSize } from './guy-code';
import { setLilGuysHost } from './kit';

/**
 * The kit as the lil guys Worker serves it at `/lilguys.js`, a classic script: `window.LilGuys` with
 * every helper, talking to the Worker it came from, and `<lil-guy>` ready to use.
 *
 *   <script src="https://lilguys.dleclub.com/lilguys.js"></script>
 *   <script>row.prepend(LilGuys.lilGuyImg('mia', 'row'))</script>
 *   <lil-guy name="Sneaky Gumdrop" preset="chat"></lil-guy>
 *
 * `data-host` on the script tag points it at another Worker (a local one while developing).
 */
const script = typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null) : null;
const host = script?.dataset.host ?? (script?.src ? new URL(script.src).origin : undefined);
if (host) { setLilGuysHost(host); defineLilGuy({ host }); }

export * from './kit';
export { defineLilGuy, ART_VERSION, BAKED_SIZE, PICTURE_VIEWS, guyCode, viewSize };
