/**
 * lil_guy — a maker and an endless plane.
 *
 * Two ideas do most of the work here.
 *
 * Guys live in one texture atlas rather than one canvas each. A canvas per
 * sprite cost 0.20ms to build, against 0.05ms for the art itself: three
 * quarters of the time went on allocating elements. Writing 16x16 tiles into a
 * single atlas costs 0.066ms, so the same frame budget produces three times as
 * many characters, and the plane can keep ahead of a fast throw.
 *
 * The lattice is a spring mesh, not a rigid grid. Every cell is tied to its
 * rest position and to its four neighbours, and carries mass. Dragging the
 * plane accelerates the lattice; the guys resist, so the field stretches
 * behind your hand, the strain travels outward through the couplings, and it
 * rings down when you let go. The cell you grabbed is pinned to your finger,
 * which is what gives the stretch somewhere to pull against.
 */
(() => {
  const L = window.LilGuy;
  const ART = L.GRID_SIZE;

  /* ================================================================ atlas */

  const PAD = 1;                       // transparent gutter, so tiles cannot bleed
  const PITCH = ART + PAD * 2;
  const COLS = 96, ROWS = 96;
  const SLOTS = COLS * ROWS;

  const atlas = document.createElement('canvas');
  atlas.width = COLS * PITCH;
  atlas.height = ROWS * PITCH;
  const atlasCtx = atlas.getContext('2d');
  const tile = atlasCtx.createImageData(ART, ART);

  const sprites = new Map();           // seed → { slot, born, seen }
  const owner = new Array(SLOTS).fill(null);
  let nextSlot = 0;
  let frameId = 0;

  const rgbCache = new Map();
  function rgb(hex) {
    let v = rgbCache.get(hex);
    if (!v) {
      v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      rgbCache.set(hex, v);
    }
    return v;
  }

  /** Paints a guy into `tile` and returns his palette. */
  function paint(seed) {
    const cfg = L.resolve(seed);
    const grid = L.compose(cfg);
    const pal = L.shadePalette(L.getPalette(cfg.palette), cfg.shade);
    const d = tile.data;
    d.fill(0);
    for (let y = 0, p = 0; y < ART; y++) {
      for (let x = 0; x < ART; x++, p += 4) {
        const hex = L.resolveColor(pal, grid[y][x]);
        if (!hex) continue;
        const [r, g, b] = rgb(hex);
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      }
    }
    return pal;
  }

  function spriteFor(seed) {
    let s = sprites.get(seed);
    if (s) { s.seen = frameId; return s; }

    paint(seed);
    // Never recycle a slot whose guy is on screen right now. Without this the
    // ring of prefetched guys evicts the ones being drawn, and the two chase
    // each other in a circle: everything is regenerated every frame and the
    // plane stays empty however much budget it is given.
    let slot = nextSlot, tries = 0;
    while (tries++ < SLOTS) {
      const held = owner[slot];
      if (!held || sprites.get(held).seen < frameId - 1) break;
      slot = (slot + 1) % SLOTS;
    }
    nextSlot = (slot + 1) % SLOTS;
    if (owner[slot]) sprites.delete(owner[slot]);
    owner[slot] = seed;

    atlasCtx.putImageData(tile, (slot % COLS) * PITCH + PAD, ((slot / COLS) | 0) * PITCH + PAD);
    s = { slot, born: performance.now(), seen: frameId };
    sprites.set(seed, s);
    return s;
  }

  const drawSprite = (ctx, s, x, y, size) => ctx.drawImage(
    atlas,
    (s.slot % COLS) * PITCH + PAD, ((s.slot / COLS) | 0) * PITCH + PAD, ART, ART,
    x, y, size, size
  );

  /* ================================================================ maker */

  const stage = document.getElementById('stage');
  const stageCtx = stage.getContext('2d');
  const nameField = document.getElementById('name');
  const DEFAULT_SEED = 'lil_guy';

  const seedOf = () => nameField.value.trim() || DEFAULT_SEED;

  const STAGE_SCALE = stage.width / ART;

  function drawStage() {
    paint(seedOf());
    const src = document.createElement('canvas');
    src.width = src.height = ART;
    src.getContext('2d').putImageData(tile, 0, 0);
    stageCtx.clearRect(0, 0, stage.width, stage.height);
    stageCtx.imageSmoothingEnabled = false;
    stageCtx.drawImage(src, 0, 0, stage.width, stage.height);
  }

  /** A guy at any size, nearest-neighbour, on whatever background is asked for. */
  function render(seed, scale, background) {
    const pal = paint(seed);
    const src = document.createElement('canvas');
    src.width = src.height = ART;
    src.getContext('2d').putImageData(tile, 0, 0);

    const size = ART * scale;
    const label = background ? Math.round(size * 0.2) : 0;
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size + label;
    const c = out.getContext('2d');
    if (background) {
      c.fillStyle = background;
      c.fillRect(0, 0, out.width, out.height);
    }
    c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, size, size);
    return { canvas: out, ctx: c, size, label, pal };
  }

  function save(withName) {
    const seed = seedOf();
    // Plain is transparent, for use as an avatar. Named gets the site's black
    // behind it, because a caption on transparency is unreadable half the time.
    const { canvas, ctx: c, size, label } = render(seed, 64, withName ? '#08080a' : null);
    if (withName) {
      c.fillStyle = 'rgba(255,255,255,.86)';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 ${Math.round(size * 0.062)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      c.fillText(seed, size / 2, size + label / 2 - size * 0.01);
    }
    canvas.toBlob(blob => {
      const slug = seed.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'lil_guy';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lil_guy-${slug}${withName ? '-named' : ''}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  /* ---------------------------------------------------------------- claims
   *
   * A claim keeps the word in this browser and never shows it again. The guy
   * is derived from it, and deriving the word back out of a 16x16 picture is
   * not a thing you can do — so the wall can be public about the character
   * while the word that made him stays yours.
   */

  const STORE = 'lil_guy.claims.v1';

  function claims() {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
    catch { return []; }
  }

  function addClaim(seed, who) {
    const all = claims().filter(c => c.seed !== seed);
    all.unshift({ seed, who, at: Date.now() });
    localStorage.setItem(STORE, JSON.stringify(all.slice(0, 400)));
  }

  const claimBtn = document.getElementById('claim');
  const claimForm = document.getElementById('claimForm');
  const claimName = document.getElementById('claimName');

  claimBtn.addEventListener('click', () => {
    claimForm.hidden = !claimForm.hidden;
    if (!claimForm.hidden) claimName.focus();
  });

  claimForm.addEventListener('submit', e => {
    e.preventDefault();
    const who = claimName.value.trim();
    if (!who) { claimName.focus(); return; }
    addClaim(seedOf(), who);
    claimForm.hidden = true;
    claimName.value = '';
    claimBtn.textContent = 'claimed';
    setTimeout(() => { claimBtn.textContent = 'claim'; }, 1600);
  });

  /* ------------------------------------------------------------------ wall */

  const wallGrid = document.getElementById('wallGrid');
  const wallCount = document.getElementById('wallCount');

  function drawWall() {
    const all = claims();
    wallGrid.innerHTML = '';
    wallCount.textContent = all.length
      ? `${all.length} claimed \u00b7 kept in this browser`
      : '';
    if (!all.length) {
      const empty = document.createElement('p');
      empty.id = 'wallEmpty';
      empty.textContent = 'nothing pinned up yet — claim a word and he lands here';
      wallGrid.appendChild(empty);
      return;
    }
    for (const c of all) {
      const cell = document.createElement('div');
      cell.className = 'pin';
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      paint(c.seed);
      const src = document.createElement('canvas');
      src.width = src.height = ART;
      src.getContext('2d').putImageData(tile, 0, 0);
      const cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(src, 0, 0, 128, 128);
      const who = document.createElement('span');
      who.textContent = c.who;
      cell.append(cv, who);
      wallGrid.appendChild(cell);
    }
  }

  /* --------------------------------------------------------- drifting field
   *
   * A slow field of guys behind the maker, dim enough to sit under the one you
   * are making. It is the same atlas, so it costs a few hundred blits.
   */

  const drift = document.getElementById('drift');
  const driftCtx = drift.getContext('2d');

  const TIDE_CELL = 230;      // px between guys — few and large
  const TIDE_DRIFT = 9;       // px/s, the current
  const TIDE_ANGLE = -0.26;   // radians — rightward, and very slightly up
  const TIDE_SWELL = 0.07;    // bob, as a share of a cell
  const TIDE_SIZE = 0.58;     // how much of a cell a guy fills

  let driftRunning = false;
  let tideAt = 0;                      // seconds, for hit testing the tide

  /** Which drifting guy is under a point, or null. */
  function tideUnder(px, py) {
    const t = tideAt;
    const ox = Math.cos(TIDE_ANGLE) * TIDE_DRIFT * t;
    const oy = Math.sin(TIDE_ANGLE) * TIDE_DRIFT * t;
    const swell = TIDE_CELL * TIDE_SWELL;
    const size = TIDE_CELL * TIDE_SIZE;
    const i = Math.round((px - ox) / TIDE_CELL);
    const j = Math.round((py - oy) / TIDE_CELL);
    // Only the three-by-three around the guess can contain the point once the
    // swell has moved everyone off their lattice position.
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ci = i + di, cj = j + dj;
        const x = ci * TIDE_CELL + ox + Math.cos(t * 0.27 + cj * 0.62) * swell * 0.55;
        const y = cj * TIDE_CELL + oy + Math.sin(t * 0.42 + ci * 0.85 + cj * 0.35) * swell;
        if (px >= x && px <= x + size && py >= y && py <= y + size) return `tide ${ci},${cj}`;
      }
    }
    return null;
  }

  /**
   * A slow tide of guys behind the maker.
   *
   * The whole field slides one way forever, and each guy rides a swell on top
   * of that — the phase of the swell moves through the field rather than
   * ticking in place, so neighbours rise a moment apart and it reads as water
   * rather than a row of bobbing corks. Two periods, a long one for the lift
   * and a longer one for the sway, so the motion never quite repeats.
   */
  function driftFrame(now) {
    if (!driftRunning) return;

    const w = drift.clientWidth, h = drift.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    if (drift.width !== Math.round(w * scale)) {
      drift.width = Math.round(w * scale);
      drift.height = Math.round(h * scale);
    }
    driftCtx.setTransform(scale, 0, 0, scale, 0, 0);
    driftCtx.imageSmoothingEnabled = false;
    driftCtx.clearRect(0, 0, w, h);

    const t = now / 1000;
    tideAt = t;
    const ox = Math.cos(TIDE_ANGLE) * TIDE_DRIFT * t;
    const oy = Math.sin(TIDE_ANGLE) * TIDE_DRIFT * t;
    const swell = TIDE_CELL * TIDE_SWELL;
    const size = Math.round(TIDE_CELL * TIDE_SIZE);

    const i0 = Math.floor(-ox / TIDE_CELL) - 1;
    const j0 = Math.floor(-oy / TIDE_CELL) - 1;
    const cols = Math.ceil(w / TIDE_CELL) + 2;
    const rows = Math.ceil(h / TIDE_CELL) + 2;

    for (let dj = 0; dj < rows; dj++) {
      const j = j0 + dj;
      for (let di = 0; di < cols; di++) {
        const i = i0 + di;
        const lift = Math.sin(t * 0.42 + i * 0.85 + j * 0.35) * swell;
        const sway = Math.cos(t * 0.27 + j * 0.62) * swell * 0.55;
        drawSprite(driftCtx, spriteFor(`tide ${i},${j}`),
          Math.round(i * TIDE_CELL + ox + sway),
          Math.round(j * TIDE_CELL + oy + lift),
          size);
      }
    }
    requestAnimationFrame(driftFrame);
  }

  // One of the ones drifting past can be picked up: he becomes the guy you
  // are making, so the same claim and save sit right underneath him.
  drift.addEventListener('click', e => {
    const box = drift.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    // The middle is under the scrim, where a guy may be all but invisible.
    // Picking one there would read as a click on nothing changing everything.
    const dx = (x - box.width / 2) / (box.width * 0.42);
    const dy = (y - box.height * 0.55) / (box.height * 0.5);
    if (dx * dx + dy * dy < 1) return;
    const seed = tideUnder(x, y);
    if (!seed) return;
    nameField.value = seed;
    drawStage();
  });

  nameField.addEventListener('input', drawStage);
  document.getElementById('savePlain').addEventListener('click', () => save(false));
  document.getElementById('saveNamed').addEventListener('click', () => save(true));

  /* ================================================================ plane */

  const canvas = document.getElementById('plane');
  const ctx = canvas.getContext('2d', { alpha: false });
  const seedText = document.getElementById('seed');
  const galleryView = document.getElementById('galleryView');

  const BG = '#08080a';
  const MIN_SCALE = 40, MAX_SCALE = 900, START_SCALE = 210;
  const MARGIN = 0.13;

  const GLIDE_TAU = 340;   // ms — how long a throw keeps running
  const ZOOM_TAU = 70;     // ms — how quickly zoom settles
  const STOP = 0.05;       // px/ms — below this the glide is over
  const FADE = 200;        // ms — a guy fading up as he lands
  // Making guys you can see comes first, and a hard throw across the zoomed
  // out plane replaces the whole screen several times over — so the budget
  // opens up when there is a backlog. A 20ms frame is a far better trade than
  // a screen with holes in it; it closes back to 6ms the moment you catch up.
  const BUDGET_MIN = 6, BUDGET_MAX = 20;
  const AHEAD = 4;         // ms/frame making guys you are about to see
  const RING = 2;          // cells of prefetch beyond the screen edge
  const LOOKAHEAD = 260;   // ms of travel to prefetch toward

  // Mesh — a lattice of masses on springs. K is the pull back to rest, C the
  // resistance, N the coupling that carries strain between neighbours, DRIVE
  // how strongly the guys resist the lattice being yanked about.
  const K = 90, C = 5.6, N = 150, DRIVE = 0.3, MAX_FLEX = 0.45;
  const SUBSTEP = 0.008;   // s — fixed integration step

  const cam = { x: 0.5, y: 0.5, scale: START_SCALE, target: START_SCALE };
  const vel = { x: 0, y: 0 };
  let camPrev = { x: cam.x, y: cam.y };
  let camVel = { x: 0, y: 0 };
  let anchor = null;
  let width = 0, height = 0, dpr = 1;
  let pointer = null;
  let grabbed = null;                  // lattice cell pinned under the finger

  const clamp = s => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  /**
   * Two ways to lay the plane out.
   *
   * Scattered, a cell's coordinates are its seed, so the plane is endless and
   * costs nothing. Ordered by colour, each row is one palette and the rows run
   * the spectrum, which needs a pool of seeds sorted into palettes first: you
   * cannot ask the hash for a particular colour, you can only look at what it
   * gives you. The pool is built a slice at a time so switching mode never
   * blocks, and the plane stays scattered until it is ready.
   */
  const PER_PALETTE = 220;
  const pool = { ready: false, building: false, order: null, buckets: null, made: 0 };

  function hueOf(hex) {
    const [r, g, b] = rgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return -1;
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return h * 60;
  }

  function buildPool(slice) {
    if (!pool.buckets) {
      pool.buckets = L.palettes.map(() => []);
      pool.order = L.palettes
        .map((p, i) => ({ i, h: hueOf(p.colors[1]) }))
        .sort((a, b) => a.h - b.h)
        .map(p => p.i);
    }
    const target = L.palettes.length * PER_PALETTE;
    const end = Math.min(target, pool.made + slice);
    for (; pool.made < end; pool.made++) {
      const seed = `hue ${pool.made}`;
      pool.buckets[L.resolve(seed).palette].push(seed);
    }
    // Uniform palette weights, so a bucket short of the target only means the
    // roll was uneven; every one of them fills long before the pool does.
    pool.ready = pool.buckets.every(b => b.length > 8);
    return pool.made >= target;
  }

  let ordered = false;

  /** Mixes two integers into a well-spread value — no lattice patterning. */
  function mixHash(i, j) {
    let x = (Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1)) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0;
    return (x ^ (x >>> 13)) >>> 0;
  }

  function seedAt(i, j) {
    if (!ordered || !pool.ready) return `${i},${j}`;
    const bands = pool.order.length;
    const band = ((j % bands) + bands) % bands;
    const bucket = pool.buckets[pool.order[band]];
    return bucket[mixHash(i, j) % bucket.length];
  }
  const toWorldX = sx => cam.x + (sx - width / 2) / cam.scale;
  const toWorldY = sy => cam.y + (sy - height / 2) / cam.scale;

  /* ------------------------------------------------------------ the mesh */

  let mesh = { i0: 0, j0: 0, w: 0, h: 0, dx: null, dy: null, vx: null, vy: null };

  /** Re-frames the mesh over a new span, carrying displacement across. */
  function reframe(i0, j0, w, h) {
    if (mesh.i0 === i0 && mesh.j0 === j0 && mesh.w === w && mesh.h === h) return;
    const n = w * h;
    const next = {
      i0, j0, w, h,
      dx: new Float32Array(n), dy: new Float32Array(n),
      vx: new Float32Array(n), vy: new Float32Array(n),
    };
    const old = mesh;
    if (old.dx) {
      for (let j = 0; j < h; j++) {
        const oj = j0 + j - old.j0;
        if (oj < 0 || oj >= old.h) continue;
        for (let i = 0; i < w; i++) {
          const oi = i0 + i - old.i0;
          if (oi < 0 || oi >= old.w) continue;
          const a = j * w + i, b = oj * old.w + oi;
          next.dx[a] = old.dx[b]; next.dy[a] = old.dy[b];
          next.vx[a] = old.vx[b]; next.vy[a] = old.vy[b];
        }
      }
    }
    mesh = next;
  }

  /**
   * One step of the lattice.
   *
   * Each cell is pulled back to its rest position, resisted by damping, and
   * tugged by its four neighbours; the whole field is driven by how hard the
   * camera is accelerating. Cells off the edge of the mesh count as at rest,
   * so strain has something to terminate against.
   */
  function stepMesh(h, accelX, accelY) {
    const { w, h: rows, dx, dy, vx, vy } = mesh;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        const left = i > 0 ? dx[k - 1] : 0, right = i < w - 1 ? dx[k + 1] : 0;
        const up = j > 0 ? dx[k - w] : 0, down = j < rows - 1 ? dx[k + w] : 0;
        const lapX = left + right + up + down - 4 * dx[k];

        const leftY = i > 0 ? dy[k - 1] : 0, rightY = i < w - 1 ? dy[k + 1] : 0;
        const upY = j > 0 ? dy[k - w] : 0, downY = j < rows - 1 ? dy[k + w] : 0;
        const lapY = leftY + rightY + upY + downY - 4 * dy[k];

        vx[k] += (-K * dx[k] - C * vx[k] + N * lapX + DRIVE * accelX) * h;
        vy[k] += (-K * dy[k] - C * vy[k] + N * lapY + DRIVE * accelY) * h;
        dx[k] += vx[k] * h;
        dy[k] += vy[k] * h;

        if (!(Math.abs(dx[k]) <= MAX_FLEX)) { dx[k] = Math.sign(dx[k] || 0) * MAX_FLEX; vx[k] = 0; }
        if (!(Math.abs(dy[k]) <= MAX_FLEX)) { dy[k] = Math.sign(dy[k] || 0) * MAX_FLEX; vy[k] = 0; }
      }
    }

    // The cell in your hand does not lag — it is the thing everything else is
    // straining against.
    if (grabbed) {
      const i = grabbed.i - mesh.i0, j = grabbed.j - mesh.j0;
      if (i >= 0 && i < w && j >= 0 && j < rows) {
        const k = j * w + i;
        dx[k] = dy[k] = vx[k] = vy[k] = 0;
      }
    }
  }

  /**
   * Whether the lattice has stopped moving in any way you could see.
   *
   * The threshold has to be in pixels, not cells: a twentieth of a cell is
   * nothing at all when a guy is 40px wide and most of a pixel when he is 900.
   * Measured in cells, the mesh went on ringing sub-pixel for the better part
   * of three seconds after every touch, holding the frame loop open the whole
   * time for motion nobody could possibly see.
   */
  function restMesh(scale) {
    if (!mesh.dx) return true;
    const flex = 0.4 / scale;    // px of displacement that still counts as still
    const drift = 2 / scale;     // px/s of velocity that still counts as still
    for (let k = 0; k < mesh.dx.length; k++) {
      if (Math.abs(mesh.dx[k]) > flex || Math.abs(mesh.dy[k]) > flex ||
          Math.abs(mesh.vx[k]) > drift || Math.abs(mesh.vy[k]) > drift) return false;
    }
    // Settle exactly, so nothing is left leaning by a hair.
    mesh.dx.fill(0); mesh.dy.fill(0); mesh.vx.fill(0); mesh.vy.fill(0);
    return true;
  }

  /* ------------------------------------------------------------ prefetch */

  /**
   * Builds guys just off the edge of the screen, working toward wherever the
   * camera is heading. Making them only when they are already visible is what
   * let a fast throw outrun the art.
   */
  function prefetch(deadline) {
    const s = cam.scale;
    const halfW = width / (2 * s), halfH = height / (2 * s);

    // Reach toward wherever the camera is heading, but never further than one
    // extra half-screen. An unbounded lead put the whole prefetch box off the
    // side of the screen during a hard throw: a thousand guys built per frame
    // that nobody could see, evicting every one that was actually on screen.
    const reachX = halfW * 0.4, reachY = halfH * 0.4;
    const leadX = Math.max(-reachX, Math.min(reachX, vel.x * LOOKAHEAD));
    const leadY = Math.max(-reachY, Math.min(reachY, vel.y * LOOKAHEAD));

    const i0 = Math.floor(cam.x - halfW - RING + Math.min(0, leadX));
    const i1 = Math.ceil(cam.x + halfW + RING + Math.max(0, leadX));
    const j0 = Math.floor(cam.y - halfH - RING + Math.min(0, leadY));
    const j1 = Math.ceil(cam.y + halfH + RING + Math.max(0, leadY));

    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const seed = seedAt(i, j);
        if (sprites.has(seed)) continue;
        spriteFor(seed);
        if (performance.now() > deadline) return true;
      }
    }
    return false;
  }

  /* --------------------------------------------------------------- frame */

  let running = false, lastFrame = 0, idleHandle = 0, budget = 6;

  function run() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    frameId++;
    const dt = Math.min(64, Math.max(1, now - lastFrame));
    lastFrame = now;
    let alive = false;

    if (Math.abs(cam.target - cam.scale) > 0.15) {
      cam.scale += (cam.target - cam.scale) * (1 - Math.exp(-dt / ZOOM_TAU));
      alive = true;
    } else cam.scale = cam.target;

    if (anchor) {
      cam.x = anchor.wx - (anchor.sx - width / 2) / cam.scale;
      cam.y = anchor.wy - (anchor.sy - height / 2) / cam.scale;
      if (!alive) anchor = null;
    }

    if (!dragging && (vel.x || vel.y)) {
      cam.x += vel.x * dt;
      cam.y += vel.y * dt;
      const decay = Math.exp(-dt / GLIDE_TAU);
      vel.x *= decay; vel.y *= decay;
      if (Math.hypot(vel.x, vel.y) * cam.scale < STOP) vel.x = vel.y = 0;
      else alive = true;
    }

    // Camera acceleration in cells/s², which is what the lattice feels.
    const secs = dt / 1000;
    const nowVel = { x: (cam.x - camPrev.x) / secs, y: (cam.y - camPrev.y) / secs };
    const MAX_ACCEL = 120;   // cells/s²
    const bound = a => Math.max(-MAX_ACCEL, Math.min(MAX_ACCEL, Number.isFinite(a) ? a : 0));
    const accelX = bound((nowVel.x - camVel.x) / secs);
    const accelY = bound((nowVel.y - camVel.y) / secs);
    camPrev = { x: cam.x, y: cam.y };
    camVel = nowVel;

    layoutMesh();
    let left = secs;
    while (left > 1e-4) {
      const step = Math.min(SUBSTEP, left);
      stepMesh(step, accelX, accelY);
      left -= step;
    }
    if (!restMesh(cam.scale)) alive = true;

    readout();
    if (draw(now)) alive = true;
    if (dragging) alive = true;

    if (alive) { requestAnimationFrame(frame); }
    else {
      running = false;
      // Standing still is the moment to build the surroundings, so the next
      // throw starts with a warm buffer in every direction.
      if (!idleHandle) {
        const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
        idleHandle = idle(d => {
          idleHandle = 0;
          const budgetMs = Math.min(10, d.timeRemaining());
          if (ordered && pool.made < L.palettes.length * PER_PALETTE) {
            const before = pool.ready;
            buildPool(700);
            if (pool.ready !== before) { sprites.clear(); owner.fill(null); }
            run();
            return;
          }
          prefetch(performance.now() + budgetMs);
        });
      }
    }
  }

  function span() {
    const s = cam.scale;
    return {
      i0: Math.floor(toWorldX(0)) - 1, i1: Math.ceil(toWorldX(width)) + 1,
      j0: Math.floor(toWorldY(0)) - 1, j1: Math.ceil(toWorldY(height)) + 1,
    };
  }

  function layoutMesh() {
    const { i0, i1, j0, j1 } = span();
    reframe(i0, j0, i1 - i0 + 1, j1 - j0 + 1);
  }

  function draw(now) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    const s = cam.scale;
    const inset = s * MARGIN;
    const size = Math.round(s - inset * 2);
    const { i0, i1, j0, j1 } = span();

    // Two passes on purpose. Writing a tile into the atlas and then reading the
    // atlas back as a draw source makes the browser synchronise the texture
    // every time it flips between the two — interleaved, a single guy cost
    // ~6ms instead of 0.07. Building everything first and drawing second means
    // one flip per frame.
    const deadline = performance.now() + budget;
    let pending = false;
    for (let j = j0; j <= j1 && !pending; j++) {
      for (let i = i0; i <= i1; i++) {
        if (sprites.has(seedAt(i, j))) continue;
        if (performance.now() > deadline) { pending = true; break; }
        spriteFor(seedAt(i, j));
      }
    }
    if (!pending) prefetch(performance.now() + AHEAD);

    let fading = false;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const sprite = sprites.get(seedAt(i, j));
        if (!sprite) continue;
        sprite.seen = frameId;

        const age = now - sprite.born;
        const alpha = age < FADE ? age / FADE : 1;
        if (alpha < 1) { fading = true; ctx.globalAlpha = alpha; }

        const k = (j - mesh.j0) * mesh.w + (i - mesh.i0);
        const fx = mesh.dx ? mesh.dx[k] || 0 : 0;
        const fy = mesh.dy ? mesh.dy[k] || 0 : 0;

        drawSprite(ctx, sprite,
          Math.round((i + fx - cam.x) * s + width / 2 + inset),
          Math.round((j + fy - cam.y) * s + height / 2 + inset),
          size);
        if (alpha < 1) ctx.globalAlpha = 1;
      }
    }

    budget = pending ? Math.min(BUDGET_MAX, budget * 1.6) : BUDGET_MIN;
    return pending || fading;
  }

  /* ------------------------------------------------------------- gesture */

  const active = new Map();
  let dragging = false, samples = [], pinch = 0, press = null;

  const touched = () => galleryView.classList.add('touched');

  function sample(dx, dy, t) {
    samples.push({ dx, dy, t });
    while (samples.length > 1 && t - samples[0].t > 90) samples.shift();
  }

  function throwVelocity() {
    if (samples.length < 2) return { x: 0, y: 0 };
    const range = samples[samples.length - 1].t - samples[0].t;
    if (range <= 0) return { x: 0, y: 0 };
    let dx = 0, dy = 0;
    for (const s of samples) { dx += s.dx; dy += s.dy; }
    return { x: dx / range, y: dy / range };
  }

  const points = () => [...active.values()];
  const spread = () => { const p = points(); return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
  const mid = () => { const p = points(); return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; };

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touched();
    if (active.size === 1) {
      press = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      dragging = true;
      vel.x = vel.y = 0;
      anchor = null;
      cam.target = cam.scale;
      samples = [];
      grabbed = { i: Math.floor(toWorldX(e.clientX)), j: Math.floor(toWorldY(e.clientY)) };
      canvas.classList.add('drag');
      run();
    } else if (active.size === 2) {
      pinch = spread();
      grabbed = null;
    }
  });

  canvas.addEventListener('pointermove', e => {
    pointer = { x: e.clientX, y: e.clientY };
    const prev = active.get(e.pointerId);
    if (!prev) { readout(); return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (active.size >= 2) {
      const now = spread(), m = mid();
      if (pinch > 0 && now > 0) {
        const wx = toWorldX(m.x), wy = toWorldY(m.y);
        cam.scale = cam.target = clamp(cam.scale * (now / pinch));
        cam.x = wx - (m.x - width / 2) / cam.scale;
        cam.y = wy - (m.y - height / 2) / cam.scale;
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
    grabbed = null;
    canvas.classList.remove('drag');
    const idle = samples.length ? e.timeStamp - samples[samples.length - 1].t : Infinity;
    if (idle < 60) { const t = throwVelocity(); vel.x = t.x; vel.y = t.y; }
    samples = [];
    run();
  }

  // A tap is a press that went nowhere. Anything that travelled was a drag,
  // and the second click of a double-click belongs to the zoom.
  canvas.addEventListener('click', e => {
    if (e.detail !== 1) return;
    if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) return;
    if (e.timeStamp - press.t > 600) return;
    const i = Math.floor(toWorldX(e.clientX));
    const j = Math.floor(toWorldY(e.clientY));
    poke(i, j);
    showPick(seedAt(i, j));
  });

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { pointer = null; });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    touched();
    const k = e.ctrlKey ? 0.01 : 0.0022;
    const to = clamp(cam.target * Math.exp(-e.deltaY * k));
    if (to === cam.target) return;
    anchor = { wx: toWorldX(e.clientX), wy: toWorldY(e.clientY), sx: e.clientX, sy: e.clientY };
    cam.target = to;
    run();
  }, { passive: false });

  canvas.addEventListener('dblclick', e => {
    const to = clamp(cam.target * 2.2);
    if (to === cam.target) return;
    anchor = { wx: toWorldX(e.clientX), wy: toWorldY(e.clientY), sx: e.clientX, sy: e.clientY };
    cam.target = to;
    run();
  });

  /* ------------------------------------------------------------- picking */

  const pick = document.getElementById('pick');
  const pickArt = document.getElementById('pickArt');
  const pickForm = document.getElementById('pickForm');
  const pickName = document.getElementById('pickName');
  let picked = null;

  function showPick(seed) {
    picked = seed;
    paint(seed);
    const src = document.createElement('canvas');
    src.width = src.height = ART;
    src.getContext('2d').putImageData(tile, 0, 0);
    const c = pickArt.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, pickArt.width, pickArt.height);
    c.drawImage(src, 0, 0, pickArt.width, pickArt.height);
    pick.hidden = false;
    pickName.focus({ preventScroll: true });
  }

  function hidePick() { pick.hidden = true; picked = null; }

  document.getElementById('pickClose').addEventListener('click', hidePick);
  pickForm.addEventListener('submit', e => {
    e.preventDefault();
    const who = pickName.value.trim();
    if (!who || !picked) { pickName.focus(); return; }
    addClaim(picked, who);
    const done = pickForm.querySelector('button');
    done.textContent = 'claimed';
    setTimeout(() => { done.textContent = 'claim him'; hidePick(); }, 900);
  });

  /** A small upward kick, so the one you touched bobs on his springs. */
  function poke(i, j) {
    if (!mesh.vy) return;
    const k = (j - mesh.j0) * mesh.w + (i - mesh.i0);
    if (k >= 0 && k < mesh.vy.length) { mesh.vy[k] = -2.4; run(); }
  }

  const modeLink = document.getElementById('mode');
  modeLink.addEventListener('click', () => {
    ordered = !ordered;
    modeLink.textContent = ordered ? 'scatter them \u2192' : 'order by colour \u2192';
    if (ordered && !pool.ready) buildPool(600);
    sprites.clear();
    owner.fill(null);
    run();
  });

  function readout() {
    const sx = pointer ? pointer.x : width / 2;
    const sy = pointer ? pointer.y : height / 2;
    seedText.textContent = `"${seedAt(Math.floor(toWorldX(sx)), Math.floor(toWorldY(sy)))}"`;
  }

  /* -------------------------------------------------------------- routing */

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

  function route() {
    const where = location.hash === '#gallery' ? 'gallery'
      : location.hash === '#wall' ? 'wall' : 'maker';

    document.getElementById('maker').classList.toggle('on', where === 'maker');
    galleryView.classList.toggle('on', where === 'gallery');
    document.getElementById('wallView').classList.toggle('on', where === 'wall');

    driftRunning = where === 'maker';
    if (where !== 'gallery') hidePick();
    if (where === 'gallery') resize();
    if (where === 'wall') drawWall();
    if (where === 'maker') {
      drawStage();
      requestAnimationFrame(driftFrame);
      setTimeout(() => nameField.focus({ preventScroll: true }), 60);
    }
  }

  addEventListener('resize', () => { if (location.hash === '#gallery') resize(); });
  addEventListener('orientationchange', resize);
  addEventListener('hashchange', route);
  document.addEventListener('gesturestart', e => e.preventDefault());

  route();
})();
