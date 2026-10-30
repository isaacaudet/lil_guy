/**
 * Just enough of a page for createCrowd and createStadium to run under bun: canvases whose 2D calls
 * are recorded, ImageData, and animation frames run by hand.
 */
export interface Call { name: string; args: unknown[] }

export interface FakeCanvas { width: number; height: number; clientWidth: number; clientHeight: number; calls: Call[]; getContext(): unknown }

export function fakeCanvas(clientWidth = 300, clientHeight = 150): FakeCanvas {
  const calls: Call[] = [];
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 0 });
      return (...args: unknown[]) => { calls.push({ name: String(key), args }); };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { width: 0, height: 0, clientWidth, clientHeight, calls, getContext: () => ctx };
}

let frames: ((t: number) => void)[] = [];

/** Puts the stand-ins on globalThis; call the returned function to take them off again. */
export function installPage(): () => void {
  const g = globalThis as Record<string, unknown>;
  const before = { document: g.document, ImageData: g.ImageData, requestAnimationFrame: g.requestAnimationFrame, cancelAnimationFrame: g.cancelAnimationFrame };
  frames = [];
  g.document = { createElement: () => fakeCanvas() };
  g.ImageData = class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} };
  g.requestAnimationFrame = (cb: (t: number) => void) => frames.push(cb);
  g.cancelAnimationFrame = () => {};
  return () => Object.assign(g, before);
}

/** Runs the frame that is waiting, at time `t`; false when nothing asked for one. */
export function runFrame(t: number): boolean {
  const waiting = frames;
  frames = [];
  for (const cb of waiting) cb(t);
  return waiting.length > 0;
}
