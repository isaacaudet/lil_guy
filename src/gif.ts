/**
 * Animated GIFs and PNGs from RGBA frames, with no dependencies, so a card or
 * a guy can be saved anywhere the library runs (a browser, a game's server,
 * a script). Pixel art stays crisp: frames are scaled up by whole pixels,
 * never smoothed.
 */

export interface Frames {
  width: number;
  height: number;
  /** RGBA, `width * height * 4` bytes each. Alpha under 128 is transparent. */
  frames: Uint8ClampedArray[];
  /** How long each frame shows, in milliseconds. */
  delays: number[];
}

/** Each pixel made a `scale` by `scale` block. */
export function upscale(rgba: Uint8ClampedArray, width: number, height: number, scale: number): Uint8ClampedArray {
  if (scale === 1) return rgba;
  const W = width * scale, out = new Uint8ClampedArray(W * height * scale * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) out.set(rgba.subarray(i, i + 4), ((y * scale + dy) * W + x * scale + dx) * 4);
  }
  return out;
}

/**
 * Up to 255 colours that stand for every opaque pixel across the frames: all
 * of them when there are that few, else a median cut weighted by how much
 * each colour is used.
 */
function palette(frames: Uint8ClampedArray[]): number[] {
  const counts = new Map<number, number>();
  for (const f of frames) for (let i = 0; i < f.length; i += 4) {
    if (f[i + 3] < 128) continue;
    const c = (f[i] << 16) | (f[i + 1] << 8) | f[i + 2];
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  const all = [...counts.entries()];
  if (all.length <= 255) return all.map(([c]) => c);
  type Box = [number, number][];
  const ch = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  const range = (box: Box, k: number) => { let lo = 255, hi = 0; for (const [c] of box) { const v = ch(c, k); if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
  let boxes: Box[] = [all];
  while (boxes.length < 255) {
    let best = -1, bk = 0, bw = -1;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let k = 0; k < 3; k++) { const w = range(box, k) * Math.log2(1 + box.reduce((a, [, n]) => a + n, 0)); if (w > bw) { bw = w; best = i; bk = k; } }
    });
    if (best < 0) break;
    const box = boxes[best].sort((a, b) => ch(a[0], bk) - ch(b[0], bk));
    const total = box.reduce((a, [, n]) => a + n, 0);
    let run = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { run += box[i][1]; if (run >= total / 2) { cut = i + 1; break; } }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes.map(box => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const [c, k] of box) { r += ch(c, 0) * k; g += ch(c, 1) * k; b += ch(c, 2) * k; n += k; }
    return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  });
}

/** LZW-compresses colour indices into GIF data sub-blocks. */
function lzw(indices: Uint8Array, minCode: number, out: number[]): void {
  const clear = 1 << minCode, end = clear + 1;
  let size = minCode + 1, next = end + 1, dict = new Map<number, number>();
  let bits = 0, acc = 0;
  const block: number[] = [];
  const emit = (code: number) => {
    acc |= code << bits; bits += size;
    while (bits >= 8) { block.push(acc & 255); acc >>= 8; bits -= 8; if (block.length === 255) { out.push(255, ...block); block.length = 0; } }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minCode + 1; next = end + 1; }
    prefix = k;
  }
  emit(prefix); emit(end);
  if (bits > 0) block.push(acc & 255);
  if (block.length) out.push(block.length, ...block);
  out.push(0);
}

/**
 * An animated GIF that loops forever. Transparent pixels stay transparent
 * (each frame clears to them), so a guy can be saved without a background.
 */
export function encodeGif(input: Frames, scale = 1): Uint8Array {
  const W = input.width * scale, H = input.height * scale;
  const frames = input.frames.map(f => upscale(f, input.width, input.height, scale));
  const colours = palette(frames);
  const table = [0, ...colours];                       // index 0 is transparent
  let bitsPer = 1; while ((1 << bitsPer) < table.length) bitsPer++;
  const out: number[] = [];
  const word = (n: number) => out.push(n & 255, (n >> 8) & 255);
  out.push(...[...'GIF89a'].map(c => c.charCodeAt(0)));
  word(W); word(H);
  out.push(0x80 | ((bitsPer - 1) << 4) | (bitsPer - 1), 0, 0);
  for (let i = 0; i < 1 << bitsPer; i++) { const c = table[i] ?? 0; out.push((c >> 16) & 255, (c >> 8) & 255, c & 255); }
  out.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  const nearest = new Map<number, number>();
  const indexOf = (c: number) => {
    let i = nearest.get(c);
    if (i !== undefined) return i;
    let best = 1, bd = Infinity;
    for (let k = 1; k < table.length; k++) {
      const p = table[k], dr = ((c >> 16) & 255) - ((p >> 16) & 255), dg = ((c >> 8) & 255) - ((p >> 8) & 255), db = (c & 255) - (p & 255);
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bd) { bd = d; best = k; if (!d) break; }
    }
    nearest.set(c, best);
    return best;
  };
  frames.forEach((f, n) => {
    const delay = Math.max(2, Math.round((input.delays[n] ?? 80) / 10));
    out.push(0x21, 0xf9, 4, (2 << 2) | 1); word(delay); out.push(0, 0);
    out.push(0x2c); word(0); word(0); word(W); word(H); out.push(0);
    const idx = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < f.length; i += 4, p++) idx[p] = f[i + 3] < 128 ? 0 : indexOf((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
    const min = Math.max(2, bitsPer);
    out.push(min);
    lzw(idx, min, out);
  });
  out.push(0x3b);
  return new Uint8Array(out);
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (bytes: Uint8Array) => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** zlib-wrapped deflate: compressed where the runtime has CompressionStream, else stored. */
async function zlib(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Stored blocks: no compression, but a valid PNG everywhere.
  const out: number[] = [0x78, 0x01];
  for (let i = 0; i < raw.length; i += 65535) {
    const n = Math.min(65535, raw.length - i);
    out.push(i + n >= raw.length ? 1 : 0, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255);
    for (let k = 0; k < n; k++) out.push(raw[i + k]);
  }
  let a = 1, b = 0; for (const v of raw) { a = (a + v) % 65521; b = (b + a) % 65521; }
  out.push(b >> 8, b & 255, a >> 8, a & 255);
  return new Uint8Array(out);
}

/** A PNG of one RGBA frame, scaled up by whole pixels. */
export async function encodePng(rgba: Uint8ClampedArray, width: number, height: number, scale = 1): Promise<Uint8Array> {
  const W = width * scale, H = height * scale, px = upscale(rgba, width, height, scale);
  const raw = new Uint8Array((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1); }
  const chunk = (type: string, data: Uint8Array) => {
    const body = new Uint8Array(4 + data.length); body.set([...type].map(c => c.charCodeAt(0))); body.set(data, 4);
    const len = data.length, c = crc32(body);
    return [len >>> 24, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...body, c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255];
  };
  const ihdr = new Uint8Array([W >>> 24, (W >>> 16) & 255, (W >>> 8) & 255, W & 255, H >>> 24, (H >>> 16) & 255, (H >>> 8) & 255, H & 255, 8, 6, 0, 0, 0]);
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', ihdr), ...chunk('IDAT', await zlib(raw)), ...chunk('IEND', new Uint8Array())]);
}
