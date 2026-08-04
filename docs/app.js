/**
 * The wall.
 *
 * Two things make this feel instant on a set this size. Sorting only needs
 * `resolve` — hashing a string, no drawing — so ordering 200,000 guys by hue
 * costs a fraction of a second. And `compose` only ever runs for cells that
 * are actually on screen, under a time budget per frame, so a fast scroll
 * stays smooth and fills in behind itself rather than stalling.
 */
(() => {
  const L = window.LilGuy;
  const GRID = L.GRID_SIZE;

  // Mirrors the part arrays in the library. Labels only — a mismatch is
  // caught below and degrades to indices rather than lying.
  const NAMES = {
    head: ['round','gumdrop','tall','wide','pear','egg','bean','ghost','horned','eared','stack','crystal','cloud','slime','tri','lump','droop','peanut','spire','boulder'],
    eyes: ['dots','round','happy','sparkle','wink','cross','tiny dots','wide','sleepy','angry','hearts','cyclops','dizzy','side-eye','visor','pleading','starry','big shine','curious','soft bean','doe','content','twinkle'],
    mouth: ['smile','grin','cat','open','flat','tongue','fang','squiggle','gape','frown','smirk','teeth','oh','beam','tiny','wobble','tiny cat','blep','soft smile','laugh'],
    hair: ['none','antenna','tuft','crown','cap','beanie','spikes','bow','flower','tophat','propeller','star','sprout','bandana','antlers','halo','beret','wizard','earmuffs','laurel','heart pin','star clip','pompom','leaf pair','party hat','chef toque','cat ears','bunny ears','cowboy','toadstool','candle','top knot','visor','flower crown'],
    body: ['plain','striped','spotted','heart','belly','zigzag','two-tone','star','checker','splotch','sprinkles','sash','gradient','patch','big dots','bands','freckle band','collar patch','pebbles','crest','overalls','paw print','crescent','diamond','lightning','stitch seam','flower spot','pocket patch'],
    accessory: ['none','glasses','sunglasses','blush','freckles','bowtie','monocle','eyepatch','scarf','whiskers','bandaid','tears','earring','headphones','flushed','sweat','crumb','antennae','moustache','beard','necktie','pendant','bib','square frames','button nose','beauty mark','star sticker','heart cheeks','collar bell'],
  };
  const SLOTS = [['head', L.heads], ['eyes', L.eyes], ['mouth', L.mouths],
                 ['hair', L.hair], ['body', L.bodies], ['accessory', L.accessories]];
  for (const [slot, parts] of SLOTS) {
    if (NAMES[slot].length !== parts.length) {
      console.warn(`lil_guy: ${slot} labels are stale (${NAMES[slot].length} vs ${parts.length})`);
      NAMES[slot] = parts.map((_, i) => `#${i}`);
    }
  }
  const label = (slot, i) => NAMES[slot][i] ?? `#${i}`;

  const $ = id => document.getElementById(id);
  const scroll = $('scroll'), spacer = $('spacer'), wall = $('wall');
  const card = $('card'), pin = $('pin'), stat = $('stat');
  const ctx = wall.getContext('2d', { alpha: false });

  const state = {
    count: 2500,
    order: 'hue',
    cell: 20,
    gap: 2,
    guys: [],
    cols: 1,
    rows: 1,
    hover: -1,
    pinned: null,
  };

  /* ---------- colour ---------- */

  const rgbCache = new Map();
  function rgb(hex) {
    let v = rgbCache.get(hex);
    if (!v) {
      v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      rgbCache.set(hex, v);
    }
    return v;
  }
  function hueOf(hex) {
    const [r, g, b] = rgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return { h: -1, l: (mx + mn) / 2 };
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, l: (mx + mn) / 2 };
  }

  /* ---------- the set ---------- */

  // A cheap deterministic shuffle, so "random" is stable across redraws and
  // across reloads — you can link someone to what you are looking at.
  function scramble(i) {
    let x = (i ^ 0x9e3779b9) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
    return (x ^ (x >>> 15)) >>> 0;
  }

  function build() {
    const guys = new Array(state.count);
    for (let i = 0; i < state.count; i++) {
      const name = `lil-guy-${i}`;
      const cfg = L.resolve(name);
      const pal = L.getPalette(cfg.palette);
      const { h, l } = hueOf(pal.colors[1]);
      guys[i] = { name, cfg, palette: pal, h, l, i };
    }
    sort(guys);
    state.guys = guys;
    bitmaps.clear();
    layout();
  }

  function sort(guys) {
    const by = {
      hue: (a, b) => a.h - b.h || a.l - b.l,
      random: (a, b) => scramble(a.i) - scramble(b.i),
      head: (a, b) => a.cfg.head - b.cfg.head || a.h - b.h,
      palette: (a, b) => a.cfg.palette - b.cfg.palette || a.cfg.head - b.cfg.head,
    }[state.order];
    guys.sort(by);
  }

  /* ---------- rasterising ---------- */

  const bitmaps = new Map();
  const BITMAP_CAP = 20000;

  function bitmapFor(guy) {
    let cv = bitmaps.get(guy.name);
    if (cv) return cv;

    const grid = L.compose(guy.cfg);
    const pal = L.shadePalette(guy.palette, guy.cfg.shade);
    cv = document.createElement('canvas');
    cv.width = cv.height = GRID;
    const c = cv.getContext('2d');
    const img = c.createImageData(GRID, GRID);
    const d = img.data;
    for (let y = 0, p = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++, p += 4) {
        const hex = L.resolveColor(pal, grid[y][x]);
        if (!hex) continue;
        const [r, g, b] = rgb(hex);
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);

    // Plain FIFO eviction. An LRU would be tidier but the access pattern here
    // is a scrolling window, so oldest-first is already the right guess.
    if (bitmaps.size >= BITMAP_CAP) {
      const oldest = bitmaps.keys().next().value;
      bitmaps.delete(oldest);
    }
    bitmaps.set(guy.name, cv);
    return cv;
  }

  /* ---------- layout + paint ---------- */

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = scroll.clientWidth, h = scroll.clientHeight;
    wall.width = Math.round(w * dpr);
    wall.height = Math.round(h * dpr);
    wall.style.width = w + 'px';
    wall.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const step = state.cell + state.gap;
    state.cols = Math.max(1, Math.floor((w - state.gap) / step));
    state.rows = Math.ceil(state.guys.length / state.cols);
    spacer.style.height = (state.rows * step + state.gap) + 'px';

    stat.textContent =
      `${state.guys.length.toLocaleString()} guys · ${state.cols}×${state.rows.toLocaleString()} · ${state.cell}px`;
    paint();
  }

  let queued = false;
  function paint() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  }

  function draw() {
    const step = state.cell + state.gap;
    const top = scroll.scrollTop;
    const w = wall.width / (Math.min(window.devicePixelRatio || 1, 2));
    const h = wall.height / (Math.min(window.devicePixelRatio || 1, 2));

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const first = Math.max(0, Math.floor((top - state.gap) / step));
    const last = Math.min(state.rows - 1, Math.ceil((top + h) / step));

    // Cells already rasterised are free; new ones get a slice of the frame so
    // a flung scroll never blocks. Whatever misses out is drawn as a ghost and
    // picked up on the next pass.
    const deadline = performance.now() + 7;
    let missed = false;

    for (let row = first; row <= last; row++) {
      const y = state.gap + row * step - top;
      for (let col = 0; col < state.cols; col++) {
        const idx = row * state.cols + col;
        if (idx >= state.guys.length) break;
        const guy = state.guys[idx];
        const x = state.gap + col * step;

        const ready = bitmaps.has(guy.name);
        if (!ready && performance.now() > deadline) {
          ctx.fillStyle = '#14141d';
          ctx.fillRect(x + state.cell * 0.3, y + state.cell * 0.3, state.cell * 0.4, state.cell * 0.4);
          missed = true;
          continue;
        }
        ctx.drawImage(bitmapFor(guy), x, y, state.cell, state.cell);
      }
    }

    if (state.hover >= first * state.cols && state.hover < (last + 1) * state.cols) {
      const row = Math.floor(state.hover / state.cols), col = state.hover % state.cols;
      ctx.strokeStyle = '#f0a060';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        state.gap + col * step - 1.5,
        state.gap + row * step - top - 1.5,
        state.cell + 3, state.cell + 3
      );
    }

    if (missed) paint();
  }

  /* ---------- inspecting ---------- */

  function indexAt(clientX, clientY) {
    const box = scroll.getBoundingClientRect();
    const step = state.cell + state.gap;
    const x = clientX - box.left - state.gap;
    const y = clientY - box.top + scroll.scrollTop - state.gap;
    if (x < 0 || y < 0) return -1;
    const col = Math.floor(x / step), row = Math.floor(y / step);
    if (col >= state.cols || x % step > state.cell || y % step > state.cell) return -1;
    const idx = row * state.cols + col;
    return idx < state.guys.length ? idx : -1;
  }

  function facts(guy) {
    return SLOTS.map(([slot]) => [slot, label(slot, guy.cfg[slot])])
      .concat([['palette', guy.palette.name]]);
  }

  function showCard(guy, clientX, clientY) {
    const box = scroll.getBoundingClientRect();
    card.innerHTML =
      `<div class="nm">${guy.name}</div><dl>` +
      facts(guy).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
      '</dl>';
    card.style.left = Math.max(110, Math.min(box.width - 110, clientX - box.left)) + 'px';
    card.style.top = (clientY - box.top) + 'px';
    card.classList.add('on');
  }

  function showPin(guy) {
    state.pinned = guy;
    pin.innerHTML =
      '<canvas width="16" height="16"></canvas>' +
      `<div class="nm">${guy.name}</div><dl>` +
      facts(guy).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
      `<dt>shade</dt><dd>${['soft', 'as drawn', 'deep'][guy.cfg.shade]}</dd>` +
      `<dt>feet</dt><dd>${['as drawn', 'nubs', 'wide', 'stilts'][guy.cfg.feet]}</dd>` +
      `<dt>mirrored</dt><dd>${guy.cfg.flip ? 'yes' : 'no'}</dd>` +
      '</dl><div class="row"><button data-act="copy">copy seed</button>' +
      '<button data-act="close">close</button></div>';
    const c = pin.querySelector('canvas').getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(bitmapFor(guy), 0, 0);
    pin.classList.add('on');
    location.hash = encodeURIComponent(guy.name);
  }

  /* ---------- events ---------- */

  scroll.addEventListener('scroll', paint, { passive: true });
  addEventListener('resize', layout);

  scroll.addEventListener('pointermove', e => {
    const idx = indexAt(e.clientX, e.clientY);
    if (idx !== state.hover) { state.hover = idx; paint(); }
    if (idx < 0) { card.classList.remove('on'); return; }
    showCard(state.guys[idx], e.clientX, e.clientY);
  });
  scroll.addEventListener('pointerleave', () => {
    state.hover = -1; card.classList.remove('on'); paint();
  });
  scroll.addEventListener('click', e => {
    const idx = indexAt(e.clientX, e.clientY);
    if (idx >= 0) showPin(state.guys[idx]);
  });

  pin.addEventListener('click', e => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'close') { pin.classList.remove('on'); state.pinned = null; }
    if (act === 'copy' && state.pinned) {
      navigator.clipboard.writeText(state.pinned.name);
      e.target.textContent = 'copied';
      setTimeout(() => { e.target.textContent = 'copy seed'; }, 1200);
    }
  });

  $('order').addEventListener('change', e => {
    state.order = e.target.value;
    sort(state.guys);
    scroll.scrollTop = 0;
    layout();
  });

  $('size').addEventListener('input', e => {
    state.cell = +e.target.value;
    layout();
  });

  $('count').addEventListener('click', e => {
    const n = e.target.dataset && e.target.dataset.n;
    if (!n) return;
    for (const b of $('count').children) b.setAttribute('aria-pressed', b === e.target);
    state.count = +n;
    scroll.scrollTop = 0;
    build();
  });

  // Anything you type becomes a guy — that is the whole point of the library,
  // so the search box makes one rather than filtering the wall.
  let typing;
  $('find').addEventListener('input', e => {
    clearTimeout(typing);
    const q = e.target.value.trim();
    typing = setTimeout(() => {
      if (!q) { pin.classList.remove('on'); return; }
      const cfg = L.resolve(q);
      showPin({ name: q, cfg, palette: L.getPalette(cfg.palette) });
    }, 120);
  });

  /* ---------- go ---------- */

  build();
  const seed = decodeURIComponent(location.hash.slice(1));
  if (seed) {
    $('find').value = seed;
    const cfg = L.resolve(seed);
    showPin({ name: seed, cfg, palette: L.getPalette(cfg.palette) });
  }
})();
