import { defineLilGuy } from './element';
import { ART_VERSION, BAKED_SIZE, guyCode } from './guy-code';

/**
 * `<lil-guy>` on its own, for a page that shows guys from the lil guys Worker
 * without the library: a few kilobytes. The script tag says where the Worker
 * is, and the element is ready as soon as it loads:
 *
 *   <script src="https://lilguys.dleclub.com/lil-guy-element.js" data-host="https://lilguys.dleclub.com"></script>
 *   <lil-guy name="mia" view="idle" size="3"></lil-guy>
 */
const script = typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null) : null;
const host = script?.dataset.host ?? (script?.src ? new URL(script.src).origin : undefined);
if (host) defineLilGuy({ host });

export { defineLilGuy, guyCode, ART_VERSION, BAKED_SIZE };
