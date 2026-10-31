/**
 * Where everyone sits in the 3D stadium (./stadium3d), and where the camera stands: pure numbers, no
 * three.js, so a test can check every venue on every shape of canvas.
 *
 * The world is in guys: a guy is one unit wide and one tall, standing on their row's floor. The stand
 * faces +z; its front row's middle is at the origin (up `front` from the floor) and it climbs back
 * toward -z, straight across (`line`), on steps (`steps`, the porch) or round an arc whose centre is
 * out over the floor toward the camera (`arc`), so a big venue's sides wrap round toward the viewer.
 * The camera stands out over the floor looking back at the stand, tilted down, at the distance where
 * the people present just fill the stand's band of the frame: the front row's feet at `feet` and the
 * last row's heads at `top` (both in normalised device coordinates). Seats are only where the camera
 * sees a whole guy, and fill from the front row's middle out, as the 2D stadium (./stadium) does.
 */
import { VENUES, venueFor, type VenueId } from './stadium';

export { VENUES, venueFor, type VenueId };

/** A tier of the stand: each row's rise and depth, and the share of the rows it ends at. */
export interface Tier3D { rise: number; tread: number; share: number }

/** How a venue's stand is shaped and framed. */
export interface Spec3D {
  shape: 'steps' | 'line' | 'arc';
  /** An arc's front row radius, and how far it turns either side of the middle at most (radians). */
  radius: number; span: number;
  /** Seat to seat along a row. */
  pitch: number;
  tiers: Tier3D[];
  /** Between tiers: the fascia's height and the walkway's depth. */
  fascia: number; walkway: number;
  /** Seats between stair aisles (0 for none) and an aisle's width. */
  section: number; aisle: number;
  /** The front row's floor above the pitch, and how many rows the venue has at most. */
  front: number; rowsMax: number;
  /** The camera: vertical field of view and downward tilt (degrees), and where the stand sits in the frame. */
  fov: number; tilt: number; feet: number; top: number;
  /** The tallest a front-row guy may be, as a share of the canvas's height. */
  cap: number;
  /** Rows of empty benches kept above the people (bleachers, a gym's pull-outs). */
  empty: number;
  /** Laid out for the venue's capacity, not the people in now (its benches never change). */
  fixed?: boolean;
  /** Rows are centred groups of the people present (the porch), at most this many rows. */
  centred?: number;
}

const T = (rise: number, tread: number, share = 1): Tier3D => ({ rise, tread, share });

/** Each venue's stand and camera. */
export const SPECS: Record<VenueId, Spec3D> = {
  porch: { shape: 'steps', radius: 0, span: 0, pitch: 1.2, tiers: [T(0.36, 0.78)], fascia: 0, walkway: 0, section: 0, aisle: 0, front: 0.36, rowsMax: 3, fov: 30, tilt: 5, feet: -0.5, top: 0.36, cap: 0.22, empty: 0, fixed: true, centred: 3 },
  bleachers: { shape: 'line', radius: 0, span: 0, pitch: 1.1, tiers: [T(0.44, 0.86)], fascia: 0, walkway: 0, section: 0, aisle: 0, front: 0.5, rowsMax: 6, fov: 30, tilt: 7, feet: -0.48, top: 0.42, cap: 0.14, empty: 2, fixed: true },
  gym: { shape: 'line', radius: 0, span: 0, pitch: 1.06, tiers: [T(0.42, 0.82)], fascia: 0, walkway: 0, section: 0, aisle: 0, front: 0.42, rowsMax: 14, fov: 32, tilt: 8, feet: -0.42, top: 0.36, cap: 0.115, empty: 1 },
  hall: { shape: 'line', radius: 0, span: 0, pitch: 1.06, tiers: [T(0.36, 0.95, 0.55), T(0.5, 0.95)], fascia: 1.1, walkway: 0.6, section: 13, aisle: 0.42, front: 0.55, rowsMax: 40, fov: 34, tilt: 5, feet: -0.62, top: 0.5, cap: 0.095, empty: 0 },
  arena: { shape: 'arc', radius: 70, span: 0.95, pitch: 1.04, tiers: [T(0.42, 0.9, 0.56), T(0.58, 0.9)], fascia: 1.2, walkway: 0.8, section: 14, aisle: 0.42, front: 0.9, rowsMax: 80, fov: 34, tilt: 9, feet: -0.52, top: 0.42, cap: 0.07, empty: 0 },
  stadium: { shape: 'arc', radius: 60, span: 1.15, pitch: 1.04, tiers: [T(0.44, 0.9, 0.5), T(0.62, 0.9)], fascia: 1.4, walkway: 1, section: 24, aisle: 0.42, front: 1, rowsMax: 110, fov: 36, tilt: 11, feet: -0.56, top: 0.5, cap: 0.045, empty: 0 },
  bowl: { shape: 'arc', radius: 50, span: 1.35, pitch: 1.04, tiers: [T(0.42, 0.9, 0.34), T(0.58, 0.9, 0.68), T(0.72, 0.9)], fascia: 1.4, walkway: 1, section: 26, aisle: 0.42, front: 1, rowsMax: 150, fov: 38, tilt: 13, feet: -0.6, top: 0.46, cap: 0.035, empty: 0 },
};

/** The most a venue seats, however many come: past it, guys wait for a seat. */
export const MOST_SEATS = 16384;

/**
 * How many people a venue is laid out for while `count` are in: steps of about 15% (the porch and
 * bleachers, every head). A venue's first step is already 15% past its first head, so the people
 * walking in just behind them don't lay it out again.
 */
export function stepFor(count: number): number {
  const i = VENUES.findIndex(v => count <= v.upTo), v = VENUES[i < 0 ? VENUES.length - 1 : i];
  if (i >= 0 && i <= 1) return Math.max(1, count);
  const lo = i < 0 ? VENUES[VENUES.length - 1].upTo : VENUES[i - 1].upTo + 1;
  let s = Math.ceil(lo * 1.15);
  while (s < count) s = Math.ceil(s * 1.15);
  return i < 0 ? s : Math.min(s, v.upTo);
}

/**
 * What a venue laid out for `laid` people (`laidVenue`) does now that `count` are in: grows at once,
 * but only shrinks once the crowd is well under it (a step and a bit, or a venue's first head and a
 * twentieth), so someone joining and leaving at a step's edge doesn't lay it out again each time.
 */
export function stepWith(count: number, laid: number, laidVenue: VenueId): { step: number; venue: VenueId } {
  const want = stepFor(count), venue = venueFor(count);
  if (want >= laid || venue !== laidVenue && VENUES.findIndex(v => v.id === venue) > VENUES.findIndex(v => v.id === laidVenue)) return { step: want, venue };
  const i = VENUES.findIndex(v => v.id === laidVenue);
  if (venue !== laidVenue) {
    // Down a venue only below its first head, less a twentieth.
    const first = i > 0 ? VENUES[i - 1].upTo + 1 : 1;
    return count < Math.floor(first * 0.95) ? { step: want, venue } : { step: laid, venue: laidVenue };
  }
  // The porch and bleachers seat every head: nothing to rebuild.
  if (i <= 1) return { step: want, venue };
  return count < laid / 1.15 / 1.1 ? { step: want, venue } : { step: laid, venue: laidVenue };
}

// ------------------------------------------------------------ the camera

export type Vec3 = [number, number, number];

/** A perspective camera: where it is, what it looks at, its vertical field of view (degrees) and aspect. */
export interface Camera3D { position: Vec3; target: Vec3; fov: number; aspect: number; near: number; far: number }

/** Projects world points through a camera to normalised device coordinates (x right, y up, -1 to 1). */
export function projector(cam: Camera3D) {
  const [px, py, pz] = cam.position;
  let fx = cam.target[0] - px, fy = cam.target[1] - py, fz = cam.target[2] - pz;
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // Right = forward × up (0, 1, 0); up = right × forward.
  let rx = -fz, rz = fx;
  const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  const tanV = Math.tan(cam.fov * Math.PI / 360), tanH = tanV * cam.aspect;
  /** [ndc x, ndc y, depth along the view]. */
  return (x: number, y: number, z: number): Vec3 => {
    const vx = x - px, vy = y - py, vz = z - pz;
    const d = vx * fx + vy * fy + vz * fz;
    return [(vx * rx + vz * rz) / (d * tanH), (vx * ux + vy * uy + vz * uz) / (d * tanV), d];
  };
}

/** The vertical field of view a venue takes on a canvas: narrower on a wide strip, so the sides never stretch. */
export function fovFor(spec: Spec3D, aspect: number): number {
  const tanV = Math.min(Math.tan(spec.fov * Math.PI / 360), Math.tan(41 * Math.PI / 180) / aspect);
  return Math.atan(tanV) * 360 / Math.PI;
}

/** The camera `distance` out from the front row, tilted down, with the front row's feet at `spec.feet`. */
export function cameraFor(spec: Spec3D, aspect: number, distance: number): Camera3D {
  const fov = fovFor(spec, aspect), tanV = Math.tan(fov * Math.PI / 360), tilt = spec.tilt * Math.PI / 180;
  const below = tilt + Math.atan(-spec.feet * tanV), y = spec.front + distance * Math.tan(below);
  return { position: [0, y, distance], target: [0, y - Math.sin(tilt) * distance, distance - Math.cos(tilt) * distance], fov, aspect, near: Math.max(0.1, distance * 0.02), far: distance * 6 + 400 };
}

// ------------------------------------------------------------ rows and seats

/** A row: its tier, its floor's height above the front row's, how far back it is (or its radius on an arc), and its seats. */
export interface Row3D { tier: number; y: number; back: number; radius: number; first: number; seats: number }
/** A seat: where a guy's feet are, which way they face (radians about y), their row, and how tall they are on the canvas (a share of its height). */
export interface Seat3D { x: number; y: number; z: number; yaw: number; row: number; h: number }

/** A row's profile, front first: its tier, floor height above the front row and depth behind it, up to `rowsMax`. */
export function profile(spec: Spec3D, rows = spec.rowsMax): { tier: number; y: number; back: number }[] {
  const out: { tier: number; y: number; back: number }[] = [];
  let y = 0, back = 0, tier = 0;
  for (let r = 0; r < rows; r++) {
    // A tier ends at its share of the rows; the next starts behind a walkway, up a fascia.
    while (tier < spec.tiers.length - 1 && r >= Math.round(spec.tiers[tier].share * rows)) {
      tier++;
      y += spec.fascia; back += spec.walkway;
    }
    out.push({ tier, y, back });
    y += spec.tiers[tier].rise; back += spec.tiers[tier].tread;
  }
  return out;
}

/** The venue laid out on a canvas. */
export interface Layout3D {
  id: VenueId;
  spec: Spec3D;
  aspect: number;
  /** How many it was laid out for. */
  count: number;
  camera: Camera3D;
  /** Rows with seats, then any empty ones kept above them. */
  rows: Row3D[];
  /** Every seat, in the order they fill: the front row's middle first. */
  seats: Seat3D[];
  /** Rows that hold people (the rest are empty benches). */
  used: number;
  /** Aisles: their middles, as x (a line) or angles (an arc), in the lower tier's terms. */
  aisles: number[];
  /** How far the stand runs either side: half a width (a line) or an angle (an arc), past what the camera sees. */
  reach: number;
  /** The camera's depth to the front row's middle and to the last row's. */
  depth: [number, number];
}

const DRIFT = 0.03;

interface Built { rows: Row3D[]; seats: Seat3D[]; count: number; aisles: number[]; reach: number }

/**
 * The seats the camera sees whole, row by row from the front, until a row's heads would be above the
 * band's top (or `need` people are seated, or `rowsCap` rows are made). With `countOnly`, just how many.
 */
function build(spec: Spec3D, cam: Camera3D, need: number, rowsCap = spec.rowsMax, countOnly = false): Built {
  const project = projector(cam), prof = profile(spec), lim = 1 - DRIFT, centred = spec.centred ?? 0;
  const rows: Row3D[] = [], seats: Seat3D[] = [];
  const R0 = spec.radius, arc = spec.shape === 'arc';
  // Aisles: on a line every `section` seats; on an arc at fixed angles, so sections widen up the stand.
  const secW = spec.section ? spec.section * spec.pitch + spec.aisle : 0, secSpan = arc ? secW / R0 : secW;
  let reach = 0, count = 0;
  for (let r = 0; r < Math.min(rowsCap, prof.length); r++) {
    const p = prof[r], y = spec.front + p.y, radius = R0 + p.back;
    // Where a point `s` along the row (arc length from the middle, or x) is, and the row's way along there.
    const at = (s: number): [number, number, number, number] => {
      if (!arc) return [s, -p.back, 1, 0];
      const th = s / radius;
      return [radius * Math.sin(th), R0 - radius * Math.cos(th), Math.cos(th), Math.sin(th)];
    };
    // A guy's height on the canvas (a share of it) if they stand whole in the frame at `s`, else null.
    const whole = (s: number) => {
      if (arc && Math.abs(s / radius) > spec.span) return null;
      const [x, z, tx, tz] = at(s);
      const a = project(x - tx * 0.48, y + 0.5, z - tz * 0.48), b = project(x + tx * 0.48, y + 0.5, z + tz * 0.48);
      if (a[2] <= cam.near || b[2] <= cam.near || Math.abs(a[0]) > lim || Math.abs(b[0]) > lim) return null;
      const head = project(x, y + 1, z), feet = project(x, y, z);
      // On an arc the sides come toward the camera and drop down the frame: they fill it to its bottom corners.
      if (head[1] > lim || feet[1] < (arc ? -0.97 : -1)) return null;
      return (head[1] - feet[1]) / 2;
    };
    // A row whose middle guy's head would be above the band ends the stand.
    const [mx, mz] = at(0), mid = project(mx, y + 1, mz);
    if (r > 0 && (mid[1] > spec.top || mid[2] <= cam.near)) break;
    if (whole(0) === null) break;
    // The furthest along a whole guy stands, either way (the camera is on the middle, so the row is seen the same both ways).
    let lo = 0, hi = arc ? spec.span * radius : 8 * (cam.position[2] + p.back) + 50;
    if (whole(hi) !== null) lo = hi;
    else for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (whole(m) !== null) lo = m; else hi = m; }
    const sMax = lo + 1e-9, odd = r % 2 === 1;
    // Where along the row the seats go.
    const along: number[] = [];
    let here = 0;
    if (centred) {
      // The porch: centred groups, as even as they go, each back face between two front ones.
      const per = Math.floor(2 * sMax / spec.pitch) + 1, left = Math.max(0, need - count), rowsLeft = Math.max(1, Math.ceil(left / per));
      here = Math.min(per, Math.ceil(left / rowsLeft));
      if (!here) break;
      const before = r > 0 ? rows[r - 1].seats : 0, shift = r > 0 && (before - here) % 2 === 0 ? (odd ? 0.5 : -0.5) : 0;
      for (let i = 0; i < here; i++) { const a = (i - (here - 1) / 2 + shift) * spec.pitch; if (Math.abs(a) <= sMax) along.push(a); }
      here = along.length;
    } else if (secW) {
      // Sections between aisles, each row centred in its section. On a straight stand, one seat fewer on
      // alternate rows so faces sit between heads; round an arc, where they are small, rows line up in
      // files, so the stand reads as rows of people rather than a lattice.
      const width = arc ? secSpan * radius - spec.aisle : spec.section * spec.pitch;
      let k = Math.max(1, Math.floor(width / spec.pitch + 1e-6));
      if (!arc && k > 1 && k % 2 !== (odd ? 0 : 1)) k--;
      const step = secSpan * (arc ? radius : 1);
      for (let j = 0; j * step - (k * spec.pitch) / 2 <= sMax; j++) for (const side of j ? [j, -j] : [0]) for (let i = 0; i < k; i++) {
        const a = side * step + (i - (k - 1) / 2) * spec.pitch;
        if (Math.abs(a) > sMax) continue;
        here++;
        if (!countOnly) along.push(a);
      }
    } else {
      const shift = odd ? spec.pitch / 2 : 0, i0 = Math.ceil((-sMax - shift) / spec.pitch), i1 = Math.floor((sMax - shift) / spec.pitch);
      here = Math.max(0, i1 - i0 + 1);
      if (!countOnly) for (let i = i0; i <= i1; i++) along.push(shift + i * spec.pitch);
    }
    if (!here) break;
    count += here;
    if (!countOnly) {
      along.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
      const row: Row3D = { tier: p.tier, y, back: p.back, radius: arc ? radius : 0, first: seats.length, seats: 0 };
      for (const s of along) {
        const h = whole(s) ?? (whole(s * 0.999) ?? 0);
        const [x, z] = at(s);
        // On an arc a guy faces the floor's middle, turned partly back toward the camera so faces read.
        const yaw = arc ? -(s / radius) * 0.6 : 0;
        reach = Math.max(reach, arc ? Math.abs(s / radius) : Math.abs(x));
        seats.push({ x, y, z, yaw, row: r, h });
        row.seats++;
      }
      rows.push(row);
    } else rows.push({ tier: p.tier, y, back: p.back, radius: arc ? radius : 0, first: count - here, seats: here });
    if (count >= need) break;
  }
  const aisles: number[] = [];
  if (secW && !countOnly) for (let j = -80; j < 80; j++) { const a = (j + 0.5) * secSpan; if (!arc || Math.abs(a) <= spec.span) aisles.push(a); }
  return { rows, seats, count, aisles, reach };
}

/** The front row's middle guy's height on the canvas (a share of it) with the camera `distance` out. */
function frontShare(spec: Spec3D, aspect: number, distance: number): number {
  const project = projector(cameraFor(spec, aspect, distance));
  return (project(0, spec.front + 1, 0)[1] - project(0, spec.front, 0)[1]) / 2;
}

/** Lays venue `id` out on a canvas of `aspect` (width over height) for `count` people. */
export function layout3d(id: VenueId, aspect: number, count: number): Layout3D {
  const spec = SPECS[id], cap = id === 'bowl' ? MOST_SEATS : Math.min(MOST_SEATS, VENUES.find(v => v.id === id)!.upTo);
  // A fixed venue's camera and benches are for everyone it holds; the porch's centred rows are for whoever is there.
  const want = Math.max(1, Math.min(MOST_SEATS, spec.fixed ? cap : count));
  // The closest the camera comes: where a front-row guy is as tall as the venue allows.
  let lo = 2, hi = 4000;
  while (hi - lo > lo * 0.002) { const mid = (lo + hi) / 2; if (frontShare(spec, aspect, mid) > spec.cap) lo = mid; else hi = mid; }
  const closest = hi;
  const fits = (d: number) => build(spec, cameraFor(spec, aspect, d), want, spec.rowsMax, true).count >= want;
  let distance = closest;
  if (!fits(closest)) {
    // Out until everyone fits.
    let a = closest, b = closest * 2;
    while (!fits(b) && b < 6000) { a = b; b *= 2; }
    // To within half a percent: a closer camera would leave someone out.
    while (b - a > b * 0.005) { const mid = (a + b) / 2; if (fits(mid)) b = mid; else a = mid; }
    distance = b;
  }
  const camera = cameraFor(spec, aspect, distance);
  const built = build(spec, camera, spec.centred ? Math.max(1, count) : want, spec.rowsMax);
  // The porch's steps are as wide as a full porch, however few are on them.
  if (spec.centred) { const full = build(spec, camera, want, spec.rowsMax); built.reach = full.reach; built.rows = full.rows.map((r, i) => ({ ...r, first: built.rows[i]?.first ?? built.seats.length, seats: built.rows[i]?.seats ?? 0 })); }
  const used = built.rows.length;
  // Empty benches above the people, where the venue has them and the frame has room.
  if (spec.empty) {
    const more = build(spec, camera, Infinity, Math.min(spec.rowsMax, used + spec.empty));
    built.rows = more.rows.length > used ? [...built.rows, ...more.rows.slice(used).map(r => ({ ...r, first: built.seats.length, seats: 0 }))] : built.rows;
  }
  const project = projector(camera), last = built.rows[built.rows.length - 1] ?? { y: spec.front, back: 0, radius: spec.radius };
  const backZ = spec.shape === 'arc' ? spec.radius - last.radius : -last.back;
  const depth: [number, number] = [project(0, spec.front, 0)[2], project(0, last.y, backZ)[2]];
  const seats = spec.fixed ? built.seats : built.seats.slice(0, want);
  return { id, spec, aspect, count, camera, rows: built.rows, seats, used, aisles: built.aisles, reach: built.reach, depth };
}

// ------------------------------------------------------------ near, far and their pictures

/** Sizes a far guy's picture comes in, in device pixels square. */
export const TILES = [12, 16, 24, 32, 48, 64, 96] as const;

/**
 * Which of the first `count` seats get a whole 3D guy: those at least `nearPx` device pixels tall on a
 * canvas `devH` tall, the biggest first, at most `most`. Everyone else is a picture of their own guy.
 */
export function nearSeats(seats: readonly Seat3D[], count: number, devH: number, nearPx: number, most: number): Set<number> {
  const big: number[] = [];
  for (let i = 0; i < Math.min(count, seats.length); i++) if (seats[i].h * devH >= nearPx) big.push(i);
  big.sort((a, b) => seats[b].h - seats[a].h || a - b);
  return new Set(big.slice(0, most));
}

/** The picture size for far guys up to `px` device pixels tall: the smallest that is a little bigger, so a picture is never stretched. */
export function tileFor(px: number): number {
  return TILES.find(t => t >= px * 1.15) ?? TILES[TILES.length - 1];
}
