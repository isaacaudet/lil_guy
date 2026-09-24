import { hash } from '../hash';
import type { Palette } from '../types';
import { STATES, animationFrames } from './animate';
import { composeLayersV2, type Composed } from './compose';
import { backdrops } from './parts';
import { getPaletteV2, resolveColorV2, shadePaletteV2 } from './palettes';
import { resolveV2, type PartOverridesV2 } from './resolve';
import { GRID_SIZE_V2 as N, type AnimationState, type AvatarConfigV2, type ColorTokenV2, type PaletteV2 } from './types';

const OUTLINE = 5;

export interface RenderOptionsV2 {
  /** Rendered width and height in CSS pixels. Default 128. */
  size?: number;
  square?: boolean;
  /**
   * Draw with this palette exactly as given — no shade, no legibility pass.
   * That is how a customized guy is drawn today, and passing the same palette
   * keeps him the same colour.
   */
  palette?: Palette | PaletteV2;
  /** Part overrides, applied on top of the name's roll (string input only). */
  parts?: PartOverridesV2;
  /** Accessible name. Omit when the avatar sits beside the name it stands for. */
  title?: string;
  /** Animation state. Default `still`, which is what lists should use. */
  state?: AnimationState;
  /** Backdrop tile for cards and the profile. Overrides the config's own. */
  backdrop?: number;
  /**
   * The tiny preview (for ~24px): drops the outline around the silhouette and
   * any backdrop, which at that size are just noise around a smaller face.
   */
  preview?: boolean;
}

type ColorGrid = (string | null)[][];

/** Removes outline pixels that touch the outside, leaving interior line work. */
function dropEdgeOutline(grid: number[][]): number[][] {
  const empty = (y: number, x: number) => y < 0 || y >= N || x < 0 || x >= N || !grid[y][x];
  return grid.map((row, y) => row.map((t, x) =>
    t === OUTLINE && (empty(y - 1, x) || empty(y + 1, x) || empty(y, x - 1) || empty(y, x + 1)) ? 0 : t
  ));
}

interface Painter {
  base: Palette | PaletteV2;
  tints: { top?: Palette | PaletteV2; outfit?: Palette | PaletteV2 };
}

function painterFor(config: AvatarConfigV2, raw?: Palette | PaletteV2): Painter {
  const shade = config.shade ?? 1;
  const pick = (index: number) => raw ? getPaletteV2(index) : shadePaletteV2(getPaletteV2(index), shade);
  const tints: Painter['tints'] = {};
  if (config.tints?.top !== undefined) tints.top = pick(config.tints.top);
  if (config.tints?.outfit !== undefined) tints.outfit = pick(config.tints.outfit);
  return { base: raw ?? pick(config.palette), tints };
}

function paint(composed: Composed, painter: Painter, preview: boolean): ColorGrid {
  const grid = preview ? dropEdgeOutline(composed.grid) : composed.grid;
  return grid.map((row, y) => row.map((token, x) => {
    const layer = composed.layers[y][x];
    const palette = (layer === 'top' || layer === 'outfit' ? painter.tints[layer] : undefined) ?? painter.base;
    return resolveColorV2(palette, token as ColorTokenV2);
  }));
}

/**
 * Turns a colour grid into one `<path>` per colour.
 *
 * Runs of one colour along a row become a rectangle, and a rectangle keeps
 * growing downwards for as long as the next row has the same run. At 32x32
 * the big flat areas of a body collapse to a handful of rectangles, which is
 * what keeps a character to a few KB in a hundred-row leaderboard.
 */
export function toPaths(colors: ColorGrid): string {
  interface Rect { x: number; y: number; w: number; h: number; color: string }
  const done: Rect[] = [];
  let open = new Map<string, Rect>();

  for (let y = 0; y <= N; y++) {
    const next = new Map<string, Rect>();
    if (y < N) {
      let x = 0;
      while (x < N) {
        const color = colors[y][x];
        let end = x + 1;
        while (end < N && colors[y][end] === color) end++;
        if (color) {
          const key = `${x},${end - x},${color}`;
          const rect = open.get(key);
          if (rect) { rect.h++; open.delete(key); next.set(key, rect); }
          else next.set(key, { x, y, w: end - x, h: 1, color });
        }
        x = end;
      }
    }
    for (const rect of open.values()) done.push(rect);
    open = next;
  }

  const byColor = new Map<string, string[]>();
  for (const r of done.sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!byColor.has(r.color)) byColor.set(r.color, []);
    byColor.get(r.color)!.push(`M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`);
  }
  return [...byColor].map(([color, d]) => `<path fill="${color}" d="${d.join('')}"/>`).join('');
}

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

const pct = (n: number) => `${+n.toFixed(3)}%`;

/**
 * An animated guy as one SVG string: CSS keyframes, no script.
 *
 * Pixels that never change are drawn once; each distinct face gets a small
 * overlay of only the pixels it changes, switched on and off in step with the
 * whole-character transform. Under reduced motion every animation stops and
 * the guy rests on his first frame.
 */
function animated(config: AvatarConfigV2, state: AnimationState, painter: Painter, preview: boolean): string {
  const frames = animationFrames(config, state);
  const keys: string[] = [];
  const faces: ColorGrid[] = [];
  const faceOf = frames.map((f, i) => {
    const key = JSON.stringify(STATES[state][i].over ?? {});
    let k = keys.indexOf(key);
    if (k === -1) { k = keys.length; keys.push(key); faces.push(paint(f, painter, preview)); }
    return k;
  });

  const fixed: ColorGrid = faces[0].map((row, y) => row.map((c, x) => faces.every(f => f[y][x] === c) ? c : null));
  const overlays = faces.map(f => f.map((row, y) => row.map((c, x) => fixed[y][x] === null ? c : null)));

  const total = frames.reduce((sum, f) => sum + f.ms, 0);
  const starts: number[] = [];
  frames.reduce((t, f) => (starts.push(t / total * 100), t + f.ms), 0);

  const move = frames.map((f, i) => `${pct(starts[i])}{transform:translate(${f.dx}px,${f.dy}px)}`).join('');
  const shows = faces.map((_, k) => frames.map((_, i) => `${pct(starts[i])}{opacity:${faceOf[i] === k ? 1 : 0}}`).join(''));
  // Stagger by config so a leaderboard of guys does not blink in unison.
  const delay = hash(JSON.stringify(config)) % total;

  const css = (id: string) => [
    `.${id}{animation:${id}m ${total}ms step-end -${delay}ms infinite}`,
    `@keyframes ${id}m{${move}100%{transform:translate(${frames[0].dx}px,${frames[0].dy}px)}}`,
    ...shows.map((s, k) => `.${id}${k}{animation:${id}${k} ${total}ms step-end -${delay}ms infinite}@keyframes ${id}${k}{${s}}`),
    `@media (prefers-reduced-motion:reduce){.${id},.${id} g{animation:none}}`,
  ].join('');
  const id = `lg${hash(css('ID')).toString(36)}`;

  return [
    `<style>${css(id)}</style>`,
    `<g class="${id}">`,
    toPaths(fixed),
    ...overlays.map((o, k) => `<g class="${id}${k}"${faceOf[0] === k ? '' : ' opacity="0"'}>${toPaths(o)}</g>`),
    '</g>',
  ].join('');
}

/**
 * A complete SVG for a guy, from a name (rolled exactly as v1 rolls it) or a
 * config. Works anywhere — no DOM — and `api/og.mjs` calls it the same way it
 * calls v1's.
 *
 * The viewBox is the 32x32 grid, so the output is the same whatever `size`
 * is asked for, apart from the width and height.
 */
export function toSvgStringV2(input: string | AvatarConfigV2, options: RenderOptionsV2 = {}): string {
  const config = typeof input === 'string' ? resolveV2(input, options.parts) : input;
  const size = options.size ?? 128;
  const preview = options.preview ?? false;
  const state = options.state ?? 'still';
  const painter = painterFor(config, options.palette);

  const backdropIndex = options.backdrop ?? config.backdrop ?? 0;
  const backdrop = !preview && backdropIndex
    ? toPaths(backdrops[backdropIndex].map(row => row.map(t => resolveColorV2(painter.base, t as ColorTokenV2))))
    : '';
  const body = state === 'still'
    ? toPaths(paint(composeLayersV2(config), painter, preview))
    : animated(config, state, painter, preview);

  const labelled = typeof options.title === 'string' && options.title.length > 0;
  // A hat drawn on row 0 has nowhere to go when the guy hops or bobs, so a
  // square animated guy may rise out of his box rather than lose his hat.
  const overflow = options.square && state !== 'still' ? ' overflow="visible"' : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"${overflow}${labelled ? ' role="img"' : ' role="presentation" aria-hidden="true"'}>`,
    labelled ? `<title>${escapeText(options.title!)}</title>` : '',
    // Every guy's clip is the same circle in the same viewBox, so a page full
    // of them sharing one id is harmless.
    options.square ? '<g>' : `<defs><clipPath id="lg-clip"><circle cx="${N / 2}" cy="${N / 2}" r="${N / 2}"/></clipPath></defs><g clip-path="url(#lg-clip)">`,
    backdrop,
    body,
    '</g>',
    '</svg>',
  ].join('');
}

/**
 * Renders a guy to a PNG data URL, for share cards. Browser-only — it needs
 * canvas and Image. Always the still frame.
 */
export async function toPngV2(input: string | AvatarConfigV2, options: RenderOptionsV2 = {}): Promise<string> {
  const size = options.size ?? 128;
  const svg = toSvgStringV2(input, { ...options, size, state: 'still' });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.width = size;
    img.height = size;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
