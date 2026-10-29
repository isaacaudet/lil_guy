import { guyCode, type CardSpec } from './guy-code';
import { LIL_GUY_PRESETS, lilGuyImg, type LilGuyPresetName } from './kit';
import type { Frames } from './gif';

/**
 * `<lil-guy>`: a guy, finished, in any page.
 *
 *   <lil-guy name="mia"></lil-guy>                 any player's name: a claimed one as he's worn, anyone
 *                                                  else the guy the name deals (needs a host)
 *   <lil-guy seed="Sneaky Gumdrop"></lil-guy>      a guy drawn from any text
 *   <lil-guy code="eyJzIjoi…"></lil-guy>           an exact guy (`guyCode`), or set `.spec`
 *   view="idle"   a move looping (default), or `still`, `icon`, `face`, `pfp`, `card`, `art`,
 *                 `card-full`, each with a `-still` (GAMES.md has their sizes)
 *   preset="row"  a place in a game (`LIL_GUY_PRESETS`: menu, chat, row, results, profile, card,
 *                 card-full), which sets the view and size unless they are given
 *   size="4"      screen pixels per art pixel (default 4, or the preset's); a guy with a buddy is wider
 *   label="mia"   what a screen reader says; without it he's decorative
 *
 * With a host (`defineLilGuy({ host })`) it is an `<img>` of the Worker's
 * picture: no library on the page, cached for good. Without one it plays the
 * same frames, baked in the page by the library, which is what the lil guys
 * site does. Either way the picture is the library's plain-code renderer's,
 * so it matches the URL pixel for pixel.
 */
export interface LilGuyOptions {
  /** Where the lil guys Worker is, e.g. `https://lilguys.dleclub.com`. */
  host?: string;
  /** Bakes a view of a spec or a code in the page (the full library passes its own); without it a host is needed. */
  bake?: (guy: CardSpec | string, view: string) => Frames | null;
  /** The element's tag, `lil-guy` by default. */
  tag?: string;
}

type Player = { el: LilGuyElement; frames: Frames; images: (ImageData | undefined)[]; start: number; shown: number; total: number };

/** The fastest a guy on the page is redrawn: about 15 frames a second, near enough to his own frames. */
const FRAME_MS = 66;
/** How many guys not seen before are baked in one frame, so a long board fills in instead of holding the page. */
const BAKES_PER_FRAME = 2;

/** Defines `<lil-guy>` (once per tag). */
export function defineLilGuy(options: LilGuyOptions = {}): void {
  const tag = options.tag ?? 'lil-guy';
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  const host = options.host?.replace(/\/+$/, '');

  // One clock for every guy on the page, and only the ones on screen are drawn. Guys coming on screen
  // for the first time wait their turn to be baked, a few a frame.
  const playing = new Set<Player>(), waiting = new Set<LilGuyElement>();
  let ticking = false, last = 0;
  const tick = (now: number) => {
    ticking = playing.size > 0 || waiting.size > 0;
    if (!ticking) return;
    requestAnimationFrame(tick);
    let bakes = BAKES_PER_FRAME;
    for (const el of waiting) { waiting.delete(el); if (el.isConnected) el.render(true); if (--bakes <= 0) break; }
    if (now - last < FRAME_MS) return;
    last = now;
    for (const p of playing) {
      if (!p.el.isConnected) { playing.delete(p); continue; }
      let t = (now - p.start) % p.total, k = 0;
      while (k < p.frames.delays.length - 1 && t >= p.frames.delays[k]) { t -= p.frames.delays[k]; k++; }
      if (k !== p.shown) { p.shown = k; p.el.paint(k); }
    }
  };
  const wake = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  const play = (p: Player) => { playing.add(p); wake(); };
  const seen = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(es => es.forEach(e => (e.target as LilGuyElement).visible(e.isIntersecting)), { rootMargin: '100px' })
    : null;
  // Frames already baked, by code and view, so a guy shown twice is baked once.
  const baked = new Map<string, Frames | null>();

  class LilGuyElement extends HTMLElement {
    static observedAttributes = ['name', 'seed', 'code', 'view', 'size', 'label', 'preset'];
    private _spec: CardSpec | null = null;
    private player: Player | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private onScreen = !seen;

    /** The guy as a spec, instead of a `code` attribute. */
    get spec(): CardSpec | null { return this._spec; }
    set spec(v: CardSpec | null) { this._spec = v; this.render(); }

    connectedCallback() { this.style.display ||= 'inline-block'; this.style.lineHeight = '0'; seen?.observe(this); this.render(); }
    disconnectedCallback() { seen?.unobserve(this); waiting.delete(this); if (this.player) playing.delete(this.player); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }

    /** What the guy is: a code, or `@name` for a claimed one. */
    private who(): string | null {
      if (this._spec) return guyCode(this._spec);
      const code = this.getAttribute('code'), name = this.getAttribute('name'), seed = this.getAttribute('seed');
      if (code) return code;
      if (name) return '@' + name.toLowerCase();
      return seed ? guyCode({ seed }) : null;
    }

    visible(on: boolean) {
      this.onScreen = on;
      if (!this.player) { if (on) this.render(); return; }
      if (on) play(this.player); else playing.delete(this.player);
    }

    paint(k: number) {
      const p = this.player, c = this.canvas;
      if (!p || !c) return;
      c.getContext('2d')!.putImageData(p.images[k] ??= new ImageData(new Uint8ClampedArray(p.frames.frames[k]), p.frames.width, p.frames.height), 0, 0);
    }

    render(bakeNow = false) {
      const who = this.who(), named = this.getAttribute('preset');
      const preset = named && named in LIL_GUY_PRESETS ? LIL_GUY_PRESETS[named as LilGuyPresetName] : null;
      const view = this.getAttribute('view') || preset?.view || 'idle';
      const size = Math.max(1, Math.min(32, Math.round(Number(this.getAttribute('size')) || preset?.scale || 4)));
      const label = this.getAttribute('label');
      if (label) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
      if (this.player) { playing.delete(this.player); this.player = null; }
      if (!who) { this.replaceChildren(); return; }
      const pixels = 'image-rendering:pixelated;image-rendering:crisp-edges';
      const style = (width: number, height: number) => `width:${width * size}px;height:${height * size}px;${pixels}`;
      if (host) {
        // The Worker's picture in a plain <img>: a name goes by `~name`, so anyone's name draws a guy.
        const name = !this._spec && !this.getAttribute('code') && this.getAttribute('name');
        this.replaceChildren(lilGuyImg(name || { code: who }, view, { size, host, alt: '' }));
        return;
      }
      if (!options.bake || who.startsWith('@')) { this.replaceChildren(); return; }
      // Baked when first on screen, so a long board costs only what is seen.
      if (!this.onScreen) { this.replaceChildren(); this.canvas = null; return; }
      const key = `${who}/${view}`;
      if (!baked.has(key)) {
        // A guy not baked yet waits for the clock's next allowance.
        if (!bakeNow) { waiting.add(this); wake(); return; }
        baked.set(key, options.bake(this._spec ?? who, view));
      }
      const frames = baked.get(key);
      if (!frames) { this.replaceChildren(); return; }
      const canvas = document.createElement('canvas');
      canvas.width = frames.width; canvas.height = frames.height; canvas.style.cssText = style(frames.width, frames.height);
      this.canvas = canvas;
      this.replaceChildren(canvas);
      this.player = { el: this, frames, images: [], start: performance.now(), shown: -1, total: frames.delays.reduce((a, b) => a + b, 0) };
      this.paint(0); this.player.shown = 0;
      if (frames.frames.length > 1) play(this.player);
    }
  }
  customElements.define(tag, LilGuyElement);
}

type LilGuyElement = HTMLElement & { paint(k: number): void; visible(on: boolean): void; render(bakeNow?: boolean): void };
