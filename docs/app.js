/**
 * An endless plane of lil guys.
 *
 * There is no list. Every cell on the integer lattice is itself the seed —
 * `"12,-7"` — so the grid has no edges and nothing is precomputed: pull in any
 * direction and the characters under you are hashed into existence as they
 * arrive.
 *
 * The feel is the point, so the motion is modelled rather than approximated.
 * Velocity comes from a short sample window rather than the last event, so a
 * flick reads the throw and not the twitch at the end of it. The glide and the
 * zoom both settle on exponential decay against real elapsed time, so they
 * behave the same at 60Hz and at 120Hz. And zoom eases toward a target while
 * holding the point under the cursor fixed, which is what makes a wheel tick
 * feel pulled rather than applied.
 */
(() => {
  const L = window.LilGuy;
  const ART = L.GRID_SIZE;

  const canvas = document.getElementById('plane');
  const ctx = canvas.getContext('2d', { alpha: false });
  const seedText = document.getElementById('seed');

  const BG = '#0b0b0d';
  const MIN_SCALE = 40;      // px per cell — zoomed out, a swarm
  const MAX_SCALE = 900;     // one guy filling most of the screen
  const START_SCALE = 210;
  const MARGIN = 0.13;       // share of each cell left as air

  const GLIDE_TAU = 340;     // ms — how long a flick keeps running
  const ZOOM_TAU = 70;       // ms — how quickly zoom settles on its target
  const STOP = 0.014;        // px/ms — below this the glide is over
  const FADE = 220;          // ms — a guy fading up as he is drawn
  const BUDGET = 7;          // ms per frame spent making new guys

  /** World coordinates at the centre of the screen, and pixels per cell. */
  const cam = { x: 0.5, y: 0.5, scale: START_SCALE, target: START_SCALE };
  const vel = { x: 0, y: 0 };   // world units per ms
  let anchor = null;            // { wx, wy, sx, sy } — held fixed while zooming

  let width = 0, height = 0, dpr = 1;
  let pointer = null;

  // The hint has done its job the moment you touch the plane.
  const hud = document.getElementById('hud');
  const touched = () => hud.classList.add('touched');

  const clamp = s => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  /* ------------------------------------------------------------------ art */

  const sprites = new Map();
  const CACHE_CAP = 3000;
  const rgbCache = new Map();

  function rgb(hex) {
    let v = rgbCache.get(hex);
    if (!v) {
      v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      rgbCache.set(hex, v);
    }
    return v;
  }

  function spriteFor(seed) {
    let s = sprites.get(seed);
    if (s) return s;

    const cfg = L.resolve(seed);
    const grid = L.compose(cfg);
    const pal = L.shadePalette(L.getPalette(cfg.palette), cfg.shade);

    const cv = document.createElement('canvas');
    cv.width = cv.height = ART;
    const c = cv.getContext('2d');
    const img = c.createImageData(ART, ART);
    const d = img.data;
    for (let y = 0, p = 0; y < ART; y++) {
      for (let x = 0; x < ART; x++, p += 4) {
        const hex = L.resolveColor(pal, grid[y][x]);
        if (!hex) continue;
        const [r, g, b] = rgb(hex);
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);

    if (sprites.size >= CACHE_CAP) sprites.delete(sprites.keys().next().value);
    s = { cv, born: performance.now() };
    sprites.set(seed, s);
    return s;
  }

  /* --------------------------------------------------------------- camera */

  const seedAt = (i, j) => `${i},${j}`;
  const toWorldX = sx => cam.x + (sx - width / 2) / cam.scale;
  const toWorldY = sy => cam.y + (sy - height / 2) / cam.scale;

  /** Puts a world point back under a screen point. */
  function pin(wx, wy, sx, sy) {
    cam.x = wx - (sx - width / 2) / cam.scale;
    cam.y = wy - (sy - height / 2) / cam.scale;
  }

  function zoomTo(next, sx, sy) {
    const to = clamp(next);
    if (to === cam.target) return;
    anchor = { wx: toWorldX(sx), wy: toWorldY(sy), sx, sy };
    cam.target = to;
    run();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    run();
  }

  /* ---------------------------------------------------------------- frame */

  let running = false;
  let lastFrame = 0;

  function run() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;
    let alive = false;

    if (Math.abs(cam.target - cam.scale) > 0.15) {
      cam.scale += (cam.target - cam.scale) * (1 - Math.exp(-dt / ZOOM_TAU));
      alive = true;
    } else {
      cam.scale = cam.target;
    }
    if (anchor) {
      pin(anchor.wx, anchor.wy, anchor.sx, anchor.sy);
      if (!alive) anchor = null;
    }

    if (!dragging && (vel.x || vel.y)) {
      cam.x += vel.x * dt;
      cam.y += vel.y * dt;
      const decay = Math.exp(-dt / GLIDE_TAU);
      vel.x *= decay;
      vel.y *= decay;
      if (Math.hypot(vel.x, vel.y) * cam.scale < STOP) vel.x = vel.y = 0;
      else alive = true;
    }

    // The plane moves under a still cursor, so the readout has to follow the
    // frame rather than the pointer.
    readout();
    if (draw(now) || dragging) alive = true;
    if (alive) requestAnimationFrame(frame);
    else running = false;
  }

  function draw(now) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    const s = cam.scale;
    const inset = s * MARGIN;
    const size = Math.round(s - inset * 2);

    const i0 = Math.floor(toWorldX(0));
    const i1 = Math.ceil(toWorldX(width));
    const j0 = Math.floor(toWorldY(0));
    const j1 = Math.ceil(toWorldY(height));

    const deadline = now + BUDGET;
    let pending = false;
    let fading = false;

    for (let j = j0; j <= j1; j++) {
      const y = (j - cam.y) * s + height / 2 + inset;
      for (let i = i0; i <= i1; i++) {
        const seed = seedAt(i, j);
        // A guy not yet made waits for a later frame rather than blowing the
        // budget. An empty cell for one frame reads as loading; a stutter
        // reads as broken.
        if (!sprites.has(seed) && performance.now() > deadline) { pending = true; continue; }

        const sprite = spriteFor(seed);
        const age = now - sprite.born;
        const alpha = age < FADE ? age / FADE : 1;
        if (alpha < 1) { fading = true; ctx.globalAlpha = alpha; }

        ctx.drawImage(sprite.cv, Math.round((i - cam.x) * s + width / 2 + inset), Math.round(y), size, size);
        if (alpha < 1) ctx.globalAlpha = 1;
      }
    }

    return pending || fading;
  }

  /* -------------------------------------------------------------- pointer */

  const active = new Map();
  let dragging = false;
  let samples = [];
  let pinch = 0;

  function sample(dx, dy, t) {
    samples.push({ dx, dy, t });
    // A throw should read the last stretch of the gesture — not the whole
    // drag, and not only the final jitter.
    while (samples.length > 1 && t - samples[0].t > 90) samples.shift();
  }

  function throwVelocity() {
    if (samples.length < 2) return { x: 0, y: 0 };
    const span = samples[samples.length - 1].t - samples[0].t;
    if (span <= 0) return { x: 0, y: 0 };
    let dx = 0, dy = 0;
    for (const s of samples) { dx += s.dx; dy += s.dy; }
    return { x: dx / span, y: dy / span };
  }

  const points = () => [...active.values()];
  const spread = () => { const p = points(); return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
  const mid = () => { const p = points(); return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; };

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touched();
    if (active.size === 1) {
      dragging = true;
      vel.x = vel.y = 0;
      anchor = null;
      cam.target = cam.scale;
      samples = [];
      canvas.classList.add('drag');
      run();
    } else if (active.size === 2) {
      pinch = spread();
    }
  });

  canvas.addEventListener('pointermove', e => {
    pointer = { x: e.clientX, y: e.clientY };
    readout();

    const prev = active.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers zoom and pan together, tracking the fingers exactly — a
    // pinch is direct manipulation, so easing it would feel like lag.
    if (active.size >= 2) {
      const now = spread();
      const m = mid();
      if (pinch > 0 && now > 0) {
        const wx = toWorldX(m.x), wy = toWorldY(m.y);
        cam.scale = cam.target = clamp(cam.scale * (now / pinch));
        pin(wx, wy, m.x, m.y);
        anchor = null;
      }
      pinch = now;
      run();
      return;
    }

    if (!dragging) return;
    cam.x -= dx / cam.scale;
    cam.y -= dy / cam.scale;
    sample(-dx / cam.scale, -dy / cam.scale, e.timeStamp);
    run();
  });

  function release(e) {
    if (!active.has(e.pointerId)) return;
    active.delete(e.pointerId);
    if (active.size < 2) pinch = 0;
    if (active.size > 0) return;

    dragging = false;
    canvas.classList.remove('drag');
    // A gesture that ended in a pause should stop, not fling: if the last
    // sample is stale the finger was already at rest.
    const idle = samples.length ? e.timeStamp - samples[samples.length - 1].t : Infinity;
    if (idle < 60) {
      const t = throwVelocity();
      vel.x = t.x; vel.y = t.y;
    }
    samples = [];
    run();
  }

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { pointer = null; readout(); });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    // A trackpad pinch arrives as ctrl+wheel with fine deltas, a mouse wheel
    // arrives coarse. Both zoom, but the pinch needs a gentler constant or it
    // overshoots on every gesture.
    touched();
    const k = e.ctrlKey ? 0.01 : 0.0022;
    zoomTo(cam.target * Math.exp(-e.deltaY * k), e.clientX, e.clientY);
  }, { passive: false });

  canvas.addEventListener('dblclick', e => zoomTo(cam.target * 2.2, e.clientX, e.clientY));

  /* -------------------------------------------------------------- readout */

  function readout() {
    const sx = pointer ? pointer.x : width / 2;
    const sy = pointer ? pointer.y : height / 2;
    seedText.textContent = `"${seedAt(Math.floor(toWorldX(sx)), Math.floor(toWorldY(sy)))}"`;
  }

  /* ------------------------------------------------------------------- go */

  addEventListener('resize', resize);
  addEventListener('orientationchange', resize);
  // Safari's own pinch would zoom the page out from under the canvas.
  document.addEventListener('gesturestart', e => e.preventDefault());
  resize();
  readout();
})();
