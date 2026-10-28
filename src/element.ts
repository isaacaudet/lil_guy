import { ART_VERSION, BAKED_SIZE, guyCode, type CardSpec } from './guy-code';
import type { Frames } from './gif';

/**
 * `<lil-guy>`: a guy, finished, in any page.
 *
 *   <lil-guy name="mia"></lil-guy>                 a claimed name, as he's worn (needs a host)
 *   <lil-guy seed="Sneaky Gumdrop"></lil-guy>      a guy drawn from any text
 *   <lil-guy code="eyJzIjoi…"></lil-guy>           an exact guy (`guyCode`), or set `.spec`
 *   view="idle"   a move looping (default), or `still`, `card`, `card-still`
 *   size="4"      screen pixels per art pixel (default 4); a guy with a buddy is wider (`BAKED_SIZE.buddy`)
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

type Player = { el: LilGuyElement; frames: Frames; start: number; shown: number; total: number };

/** Defines `<lil-guy>` (once per tag). */
export function defineLilGuy(options: LilGuyOptions = {}): void {
  const tag = options.tag ?? 'lil-guy';
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  const host = options.host?.replace(/\/+$/, '');

  // One clock for every guy on the page, and only the ones on screen are drawn.
  const playing = new Set<Player>();
  let ticking = false;
  const tick = (now: number) => {
    ticking = playing.size > 0;
    if (!ticking) return;
    for (const p of playing) {
      if (!p.el.isConnected) { playing.delete(p); continue; }
      let t = (now - p.start) % p.total, k = 0;
      while (k < p.frames.delays.length - 1 && t >= p.frames.delays[k]) { t -= p.frames.delays[k]; k++; }
      if (k !== p.shown) { p.shown = k; p.el.paint(k); }
    }
    requestAnimationFrame(tick);
  };
  const play = (p: Player) => { playing.add(p); if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  const seen = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(es => es.forEach(e => (e.target as LilGuyElement).visible(e.isIntersecting)), { rootMargin: '100px' })
    : null;
  // Frames already baked, by code and view, so a guy shown twice is baked once.
  const baked = new Map<string, Frames | null>();

  class LilGuyElement extends HTMLElement {
    static observedAttributes = ['name', 'seed', 'code', 'view', 'size', 'label'];
    private _spec: CardSpec | null = null;
    private player: Player | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private onScreen = !seen;

    /** The guy as a spec, instead of a `code` attribute. */
    get spec(): CardSpec | null { return this._spec; }
    set spec(v: CardSpec | null) { this._spec = v; this.render(); }

    connectedCallback() { this.style.display ||= 'inline-block'; this.style.lineHeight = '0'; seen?.observe(this); this.render(); }
    disconnectedCallback() { seen?.unobserve(this); if (this.player) playing.delete(this.player); }
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
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.frames.frames[k]), p.frames.width, p.frames.height), 0, 0);
    }

    private render() {
      const who = this.who(), view = this.getAttribute('view') || 'idle';
      const size = Math.max(1, Math.min(32, Math.round(Number(this.getAttribute('size')) || 4)));
      const box = view.startsWith('card') ? BAKED_SIZE.card : BAKED_SIZE.guy;
      const label = this.getAttribute('label');
      if (label) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
      if (this.player) { playing.delete(this.player); this.player = null; }
      if (!who) { this.replaceChildren(); return; }
      const pixels = 'image-rendering:pixelated;image-rendering:crisp-edges';
      const style = (width: number, height: number) => `width:${width * size}px;height:${height * size}px;${pixels}`;
      if (host) {
        const img = document.createElement('img');
        img.src = `${host}/g/${ART_VERSION}/${who}/${view}.png`;
        // A guy with a buddy beside him is wider: the box holds the narrower size until the picture says.
        img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
        img.style.cssText = box === BAKED_SIZE.card ? style(box.width, box.height) : `width:auto;min-width:${box.width * size}px;height:${box.height * size}px;${pixels}`;
        this.replaceChildren(img);
        return;
      }
      if (!options.bake || who.startsWith('@')) { this.replaceChildren(); return; }
      // Baked when first on screen, so a long board costs only what is seen.
      if (!this.onScreen) { this.replaceChildren(); this.canvas = null; return; }
      const key = `${who}/${view}`;
      if (!baked.has(key)) baked.set(key, options.bake(this._spec ?? who, view));
      const frames = baked.get(key);
      if (!frames) { this.replaceChildren(); return; }
      const canvas = document.createElement('canvas');
      canvas.width = frames.width; canvas.height = frames.height; canvas.style.cssText = style(frames.width, frames.height);
      this.canvas = canvas;
      this.replaceChildren(canvas);
      this.player = { el: this, frames, start: performance.now(), shown: -1, total: frames.delays.reduce((a, b) => a + b, 0) };
      this.paint(0); this.player.shown = 0;
      if (frames.frames.length > 1) play(this.player);
    }
  }
  customElements.define(tag, LilGuyElement);
}

type LilGuyElement = HTMLElement & { paint(k: number): void; visible(on: boolean): void };
