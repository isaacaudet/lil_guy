import { inflateSync } from 'node:zlib';

/**
 * Small decoders for the pictures the library writes, so a test can play an
 * animated PNG or GIF back the way a browser does (each frame laid over the
 * last as its disposal and blend say) and compare every frame with what went in.
 */

export interface Played { width: number; height: number; frames: Uint8ClampedArray[]; delays: number[] }

const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const u16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];

/** An APNG (or a plain PNG) as the frames a viewer shows, colour type 3 or 6, no filters but none. */
export function playPng(bytes: Uint8Array): Played {
  let at = 8, W = 0, H = 0, type = 0;
  let plte: number[][] = [], trns: number[] = [];
  type Ctl = { w: number; h: number; x: number; y: number; delay: number; dispose: number; blend: number; data: Uint8Array[] };
  const ctls: Ctl[] = [];
  let idat: Uint8Array[] = [];
  let current: Ctl | null = null;
  while (at < bytes.length) {
    const len = u32(bytes, at), kind = String.fromCharCode(...bytes.subarray(at + 4, at + 8)), d = bytes.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') { W = u32(d, 0); H = u32(d, 4); type = d[9]; }
    if (kind === 'PLTE') for (let i = 0; i < d.length; i += 3) plte.push([d[i], d[i + 1], d[i + 2]]);
    if (kind === 'tRNS') trns = [...d];
    if (kind === 'fcTL') { current = { w: u32(d, 4), h: u32(d, 8), x: u32(d, 12), y: u32(d, 16), delay: Math.round(u16(d, 20) * 1000 / (u16(d, 22) || 100)), dispose: d[24], blend: d[25], data: [] }; ctls.push(current); }
    if (kind === 'IDAT') { if (current) current.data.push(d); else idat.push(d); }
    if (kind === 'fdAT') current!.data.push(d.subarray(4));
    at += 12 + len;
  }
  if (!ctls.length) ctls.push({ w: W, h: H, x: 0, y: 0, delay: 0, dispose: 0, blend: 0, data: idat });
  const canvas = new Uint8ClampedArray(W * H * 4), out: Played = { width: W, height: H, frames: [], delays: [] };
  for (const c of ctls) {
    const raw = inflateSync(Buffer.concat(c.data.map(x => Buffer.from(x))));
    const bpp = type === 3 ? 1 : 4, stride = c.w * bpp + 1;
    for (let y = 0; y < c.h; y++) {
      if (raw[y * stride] !== 0) throw new Error('filtered row');
      for (let x = 0; x < c.w; x++) {
        const o = ((c.y + y) * W + c.x + x) * 4, s = y * stride + 1 + x * bpp;
        const px = type === 3 ? [...plte[raw[s]], trns[raw[s]] ?? 255] : [...raw.subarray(s, s + 4)];
        if (c.blend === 0 || px[3] >= 128) canvas.set(px, o);
      }
    }
    out.frames.push(canvas.slice());
    out.delays.push(c.delay);
    if (c.dispose === 1) for (let y = 0; y < c.h; y++) canvas.fill(0, ((c.y + y) * W + c.x) * 4, ((c.y + y) * W + c.x + c.w) * 4);
  }
  return out;
}

function lzwDecode(data: Uint8Array, min: number, count: number): Uint8Array {
  const out = new Uint8Array(count);
  const clear = 1 << min, end = clear + 1;
  let size = min + 1, dict: number[][] = [], prev: number[] | null = null, bits = 0, acc = 0, p = 0;
  const reset = () => { dict = Array.from({ length: clear }, (_, i) => [i]); dict.push([], []); size = min + 1; prev = null; };
  reset();
  for (const byte of data) {
    acc |= byte << bits; bits += 8;
    while (bits >= size) {
      const code = acc & ((1 << size) - 1); acc >>= size; bits -= size;
      if (code === clear) { reset(); continue; }
      if (code === end) return out;
      let entry = dict[code];
      if (!entry) entry = [...prev!, prev![0]];
      for (const v of entry) out[p++] = v;
      if (prev) { dict.push([...prev, entry[0]]); if (dict.length === 1 << size && size < 12) size++; }
      prev = entry;
    }
  }
  return out;
}

/** A GIF as the frames a viewer shows: each frame drawn over the canvas, transparent pixels left alone, then disposed. */
export function playGif(b: Uint8Array): Played {
  const W = b[6] | (b[7] << 8), H = b[8] | (b[9] << 8), flags = b[10];
  const size = 2 << (flags & 7), table: number[][] = [];
  let at = 13;
  for (let i = 0; i < size; i++, at += 3) table.push([b[at], b[at + 1], b[at + 2]]);
  const canvas = new Uint8ClampedArray(W * H * 4), out: Played = { width: W, height: H, frames: [], delays: [] };
  let dispose = 0, transparent = -1, delay = 0;
  while (at < b.length) {
    const kind = b[at];
    if (kind === 0x3b) break;
    if (kind === 0x21) {
      const label = b[at + 1];
      if (label === 0xf9) { const p = b[at + 3]; dispose = (p >> 2) & 7; transparent = p & 1 ? b[at + 6] : -1; delay = (b[at + 4] | (b[at + 5] << 8)) * 10; }
      at += 2;
      while (b[at]) at += b[at] + 1;
      at++;
      continue;
    }
    if (kind !== 0x2c) throw new Error('bad block ' + kind);
    const x = b[at + 1] | (b[at + 2] << 8), y = b[at + 3] | (b[at + 4] << 8), w = b[at + 5] | (b[at + 6] << 8), h = b[at + 7] | (b[at + 8] << 8);
    at += 10;
    const min = b[at++], chunks: number[] = [];
    while (b[at]) { for (let k = 1; k <= b[at]; k++) chunks.push(b[at + k]); at += b[at] + 1; }
    at++;
    const idx = lzwDecode(new Uint8Array(chunks), min, w * h);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const v = idx[r * w + c];
      if (v === transparent) continue;
      canvas.set([...table[v], 255], ((y + r) * W + x + c) * 4);
    }
    out.frames.push(canvas.slice());
    out.delays.push(delay);
    if (dispose === 2) for (let r = 0; r < h; r++) canvas.fill(0, ((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4);
  }
  return out;
}

/** Frames with every pixel under half alpha made transparent black, for comparing what shows. */
export const shown = (px: Uint8ClampedArray) => { const out = new Uint8ClampedArray(px); for (let i = 0; i < out.length; i += 4) if (out[i + 3] < 128) out.fill(0, i, i + 4); else out[i + 3] = 255; return out; };
