// The cannery hall. Origin: floor centre (world 0,0,-22). Local x -20..20, z -10..10 (+z = north).
// Doors: roller 4.5x4 north (x 0), man doors west (z 0), east (z -4), south (x -12) to the docks.
import { T, paint, box, obox, tube, wall, trim, shards, prism, hexa, annulus, puddle, cageLamp, quad } from "./kit.js";
const W = 20, D = 10, H = 7, RIDGE = 10, t = 0.3;
const HOLES = {
  n: [{ c: 0, w: 4.5, sill: 0, h: 4 }],
  w: [{ c: 0, w: 1.5, sill: 0, h: 2.4 }],
  e: [{ c: -4, w: 1.5, sill: 0, h: 2.4 }],
  s: [{ c: -12, w: 1.5, sill: 0, h: 2.4 }],
};
const CLR = [-17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5];
const clN = CLR.filter((c) => c < 12).map((c) => ({ c, w: 2.4, sill: 5.1, h: 1.3 }));
const clS = CLR.map((c) => ({ c, w: 2.4, sill: 5.1, h: 1.3 }));
const LINE_SEG = [[-14, -9.13], [-7.63, -2.75], [-1.25, 3.63], [5.13, 10]];
const LINES_Z = [5, -5];
const VATS = [[11.6, 0.9], [14.2, 0.9], [11.6, 3.5], [14.2, 3.5]];
const MZ = { x0: 14, x1: 19.85, z0: 6, z1: 9.85, y: 3 };
const ST = { x0: 18.5, x1: 19.8, zTop: 6, n: 17 };
const stRun = ST.n * 0.28, stZ0 = ST.zTop - stRun;
const OFF = { x0: 15.5, z0: 7.5, top: 5.6 };
function walls(ctx, coll) {
  const lo = Math.min(0.6, H);
  // concrete footing course, corrugated iron above
  if (!coll) paint(ctx, T.concrete, { rough: 0.95 });
  const seg = (y0, y1) => {
    wall(ctx, "x", D, -W - t / 2, W + t / 2, y0, y1, t, [...HOLES.n, ...(y1 > 5 ? clN : [])]);
    wall(ctx, "x", -D, -W - t / 2, W + t / 2, y0, y1, t, [...HOLES.s, ...(y1 > 5 ? clS : [])]);
    wall(ctx, "z", -W, -D + t / 2, D - t / 2, y0, y1, t, HOLES.w);
    wall(ctx, "z", W, -D + t / 2, D - t / 2, y0, y1, t, HOLES.e);
  };
  if (coll) { seg(0, H); return; }
  seg(0, lo);
  paint(ctx, T.corrugated, { rough: 0.8, metal: 0.35 });
  seg(lo, H);
}
function roof(ctx, coll, L) {
  const ov = 0.6, ze = D + ov, ye = H - ov * ((RIDGE - H) / D), th = 0.08;
  const slab = (x0, x1, s) => hexa(ctx, [[x0, RIDGE, 0], [x1, RIDGE, 0], [x1, ye, s * ze], [x0, ye, s * ze], [x0, RIDGE + th, 0], [x1, RIDGE + th, 0], [x1, ye + th, s * ze], [x0, ye + th, s * ze]]);
  if (!coll) paint(ctx, T.corrugated, { rough: 0.75, metal: 0.4 });
  const x0 = -W - ov, x1 = W + ov;
  if (coll || L >= 4) { slab(x0, x1, 1); slab(x0, x1, -1); }
  else {
    // sheets 2 m wide; three are gone where storms took them: the moon comes through
    const gone = new Set(["-1:7", "-1:12", "1:3"]);
    for (const s of [1, -1]) for (let i = 0; i < 21; i++) { if (gone.has(`${s}:${i}`)) continue; slab(x0 + i * 2.06, x0 + (i + 1) * 2.06, s); }
  }
  // gables
  if (!coll) paint(ctx, T.corrugated, { rough: 0.8, metal: 0.35 });
  for (const s of [-1, 1]) prism(ctx, "z", s * W, [[-D - t / 2, H], [D + t / 2, H], [0, RIDGE]], t);
  if (coll || L >= 3) return;
  // ridge cap, eave gutters
  paint(ctx, T.rust, { rough: 0.7, metal: 0.5 });
  tube(ctx, [x0, RIDGE + 0.1, 0], [x1, RIDGE + 0.1, 0], 0.14, 0.14, 4, true);
  for (const s of [-1, 1]) tube(ctx, [x0, ye - 0.05, s * (ze + 0.05)], [x1, ye - 0.05, s * (ze + 0.05)], 0.09, 0.09, 6, true);
}
function trusses(ctx, L, rnd) {
  paint(ctx, T.rust, { rough: 0.6, metal: 0.6 });
  const r = 0.07, n = L <= 1 ? 4 : 4;
  for (let x = -15; x <= 15; x += 5) {
    tube(ctx, [x, H, -D], [x, H, D], r, r, n);
    for (const s of [-1, 1]) {
      tube(ctx, [x, H, s * D], [x, RIDGE - 0.1, 0], r, r, n);
      tube(ctx, [x, H, s * 5], [x, RIDGE - 0.1 - 1.45, s * 4.9], 0.05, 0.05, n);
      tube(ctx, [x, H, s * 5], [x, RIDGE - 0.15, 0.2 * s], 0.045, 0.045, n);
    }
    tube(ctx, [x, H, 0], [x, RIDGE - 0.1, 0], r, r, n);
  }
  if (L <= 2) for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
    const f = k / 4, z = s * D * f, y = RIDGE - (RIDGE - H) * f - 0.12;
    tube(ctx, [-W, y, z], [W, y, z], 0.05, 0.05, 4, false);
  }
  // steam header off the vats
  paint(ctx, T.rust, { rough: 0.55, metal: 0.55 });
  tube(ctx, [9, 5.8, 2.2], [19.7, 5.8, 2.2], 0.12, 0.12, 10);
  for (const [x, z] of VATS) { tube(ctx, [x, 2.2, z + (z < 2 ? 0.5 : -0.5)], [x, 5.8, 2.2], 0.07, 0.07, 8); }
}
function chain(ctx, x, z, len, L, rnd) {
  const top = H, bottom = top - len;
  paint(ctx, T.rust, { rough: 0.5, metal: 0.7 });
  if (L >= 2) { tube(ctx, [x, top, z], [x, bottom, z], 0.025, 0.025, 4, false); }
  else {
    const step = 0.11;
    for (let y = top, i = 0; y > bottom; y -= step, i++) {
      const w = 0.04, hgt = 0.075, o = i % 2;
      const P = (a, b) => (o ? [x + a, b, z] : [x, b, z + a]);
      tube(ctx, P(-w, y), P(-w, y - hgt), 0.008, 0.008, 3, false);
      tube(ctx, P(w, y), P(w, y - hgt), 0.008, 0.008, 3, false);
      tube(ctx, P(-w, y), P(w, y), 0.008, 0.008, 3, false);
      tube(ctx, P(-w, y - hgt), P(w, y - hgt), 0.008, 0.008, 3, false);
    }
  }
  // the hook: an arc of bars curling up, a barb at its tip
  let prev = [x, bottom, z];
  const R = 0.12;
  for (let k = 0; k <= 7; k++) {
    const a = (k / 7) * Math.PI * 1.25, p = [x + Math.sin(a) * R, bottom - R + Math.cos(a) * R - R * 0.05, z];
    if (k) tube(ctx, prev, p, 0.018, 0.016, 5, false);
    prev = p;
  }
  tube(ctx, [x, bottom + 0.05, z], [x, bottom - 0.02, z], 0.03, 0.03, 6);
}
function gutLine(ctx, x0, x1, zc, L, coll) {
  const hz = 0.6;
  if (coll) { box(ctx, x0, 0, zc - hz, x1, 1.08, zc + hz); return; }
  paint(ctx, T.stainless, { rough: 0.35, metal: 0.8 });
  box(ctx, x0, 0.9, zc - hz, x1, 0.94, zc + hz);
  // raised lips and drip troughs
  for (const s of [-1, 1]) { box(ctx, x0, 0.94, zc + s * hz - (s > 0 ? 0.05 : 0), x1, 1.0, zc + s * hz + (s < 0 ? 0.05 : 0)); }
  if (L <= 3) box(ctx, x0 + 0.1, 0.25, zc - hz + 0.1, x1 - 0.1, 0.28, zc + hz - 0.1);
  const legs = Math.max(2, Math.round((x1 - x0) / 1.4) + 1);
  for (let i = 0; i < legs; i++) {
    const x = x0 + 0.08 + ((x1 - x0 - 0.16) * i) / (legs - 1);
    for (const s of [-1, 1]) box(ctx, x - 0.04, 0, zc + s * (hz - 0.08) - 0.04, x + 0.04, 0.9, zc + s * (hz - 0.08) + 0.04);
  }
  // the conveyor down the middle: rubber belt between rails, rollers at its ends
  paint(ctx, T.rubber, { rough: 0.9 });
  box(ctx, x0 + 0.15, 0.94, zc - 0.25, x1 - 0.15, 1.02, zc + 0.25);
  if (L <= 2) {
    paint(ctx, T.rust, { rough: 0.5, metal: 0.6 });
    for (const s of [-1, 1]) box(ctx, x0 + 0.1, 0.96, zc + s * 0.29 - 0.02, x1 - 0.1, 1.06, zc + s * 0.29 + 0.02);
    for (const x of [x0 + 0.15, x1 - 0.15]) tube(ctx, [x, 0.98, zc - 0.3], [x, 0.98, zc + 0.3], 0.05, 0.05, 8);
  }
}
function vat(ctx, x, z, L, rnd, coll) {
  if (coll) { box(ctx, x - 1.05, 0, z - 1.05, x + 1.05, 2.25, z + 1.05); return; }
  const n = L <= 2 ? 24 : L <= 3 ? 14 : 8;
  paint(ctx, T.rust, { rough: 0.7, metal: 0.45 });
  tube(ctx, [x, 0.35, z], [x, 2.2, z], 1, 1, n, false);
  tube(ctx, [x, 0.35, z], [x, 0.15, z], 1, 0.75, n, true);
  annulus(ctx, x, 2.2, z, 0.92, 1.06, n);
  if (L <= 3) {
    paint(ctx, T.rust, { col: "oklch(0.92 0.02 50)", rough: 0.8, metal: 0.3 });
    for (const y of [0.9, 1.7]) tube(ctx, [x, y, z], [x, y + 0.08, z], 1.03, 1.03, n, false);
    tube(ctx, [x, 2.12, z], [x, 2.2, z], 1.06, 1.06, n, false);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; box(ctx, x + Math.cos(a) * 0.75 - 0.06, 0, z + Math.sin(a) * 0.75 - 0.06, x + Math.cos(a) * 0.75 + 0.06, 0.4, z + Math.sin(a) * 0.75 + 0.06); }
    // a valve wheel and a drain cock
    tube(ctx, [x + 1.0, 0.55, z], [x + 1.25, 0.55, z], 0.06, 0.06, 6);
    tube(ctx, [x + 1.25, 0.55, z], [x + 1.25, 0.4, z], 0.05, 0.05, 6);
  }
  // black sludge sits a hand below the lip
  paint(ctx, null, { col: "oklch(0.18 0.02 60)", rough: 0.15 });
  annulus(ctx, x, 1.95, z, 0, 0.93, n);
  paint(ctx, null, { col: "oklch(0.25 0.02 60)", rough: 0.9 });
  tube(ctx, [x, 1.95, z], [x, 2.2, z], 0.93, 0.93, n, false);
}
function lockers(ctx, L, rnd, coll) {
  const x0 = -W + t / 2, depth = 0.5, w = 0.68, z0 = -8;
  if (coll) { box(ctx, x0, 0, z0, x0 + depth, 1.95, z0 + 8 * w + 0.05); return; }
  for (let i = 0; i < 8; i++) {
    const zc = z0 + w / 2 + i * (w + 0.007), lean = (rnd() - 0.5) * 3, yw = (rnd() - 0.5) * 2;
    paint(ctx, T.green, { rough: 0.7, metal: 0.4 });
    obox(ctx, [x0 + depth / 2, 1.0, zc], [depth / 2, 0.92, w / 2 - 0.01], yw, 0, lean);
    if (L <= 2) {
      paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
      box(ctx, x0, 0, zc - w / 2 + 0.02, x0 + depth - 0.02, 0.08, zc + w / 2 - 0.02);
      paint(ctx, null, { col: "oklch(0.15 0.01 200)", rough: 0.9 });
      for (let k = 0; k < 4; k++) box(ctx, x0 + depth + 0.002, 1.55 + k * 0.06, zc - 0.15, x0 + depth + 0.012, 1.575 + k * 0.06, zc + 0.15);
      paint(ctx, T.rust, { rough: 0.5, metal: 0.7 });
      box(ctx, x0 + depth, 1.05, zc + w / 2 - 0.12, x0 + depth + 0.04, 1.2, zc + w / 2 - 0.09);
    }
  }
  // the fifth locker's door hangs open on a broken hinge
  if (L <= 3) {
    const zc = z0 + w / 2 + 4 * (w + 0.007), hx = x0 + depth + 0.02, hz = zc - w / 2;
    paint(ctx, null, { col: "oklch(0.12 0.01 200)", rough: 0.9 });
    box(ctx, x0 + depth - 0.005, 0.12, zc - w / 2 + 0.04, x0 + depth + 0.004, 1.88, zc + w / 2 - 0.04);
    paint(ctx, T.green, { rough: 0.7, metal: 0.4 });
    const a = 70 * Math.PI / 180, cx = hx + Math.sin(a) * w / 2, cz = hz + Math.cos(a) * w / 2 * 0.3;
    obox(ctx, [cx, 1.0, cz + 0.05], [0.012, 0.88, w / 2 - 0.02], -70, 0, 4);
  }
}
function mezz(ctx, L, rnd, coll) {
  const { x0, x1, z0, z1, y } = MZ;
  if (!coll) paint(ctx, T.rust, { rough: 0.6, metal: 0.55 });
  box(ctx, x0, y - 0.18, z0, x1, y, z1);
  if (!coll) {
    box(ctx, x0, y - 0.45, z0, x1, y - 0.18, z0 + 0.15);
    box(ctx, x0, y - 0.45, z0, x0 + 0.15, y - 0.18, z1);
  }
  for (const [px, pz] of [[x0 + 0.12, z0 + 0.12], [17, z0 + 0.12], [x0 + 0.12, z1 - 0.2]]) {
    if (coll) box(ctx, px - 0.1, 0, pz - 0.1, px + 0.1, y - 0.18, pz + 0.1);
    else tube(ctx, [px, 0, pz], [px, y - 0.18, pz], 0.1, 0.1, 8);
  }
  // railings on the open edges (the stair head is left open)
  const rail = (a, b) => {
    if (coll) { const lx = Math.min(a[0], b[0]) - 0.03, hx = Math.max(a[0], b[0]) + 0.03, lz = Math.min(a[2], b[2]) - 0.03, hz = Math.max(a[2], b[2]) + 0.03; box(ctx, lx, y, lz, hx, y + 1.08, hz); return; }
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]), posts = Math.max(1, Math.ceil(len / 1.2));
    for (let i = 0; i <= posts; i++) { const f = i / posts, p = [a[0] + (b[0] - a[0]) * f, y, a[2] + (b[2] - a[2]) * f]; tube(ctx, p, [p[0], y + 1.05, p[2]], 0.025, 0.025, 6); }
    tube(ctx, [a[0], y + 1.05, a[2]], [b[0], y + 1.05, b[2]], 0.03, 0.03, 6);
    tube(ctx, [a[0], y + 0.55, a[2]], [b[0], y + 0.55, b[2]], 0.018, 0.018, 4);
    box(ctx, Math.min(a[0], b[0]) - 0.01, y, Math.min(a[2], b[2]) - 0.01, Math.max(a[0], b[0]) + 0.01, y + 0.1, Math.max(a[2], b[2]) + 0.01);
  };
  if (!coll) paint(ctx, T.rackPaint, { rough: 0.7, metal: 0.4 });
  rail([x0 + 0.03, 0, z0 + 0.03], [ST.x0, 0, z0 + 0.03]);
  rail([x0 + 0.03, 0, z0 + 0.03], [x0 + 0.03, 0, z1]);
  // stair: open steel treads between two stringers, rail on its open side
  if (coll) {
    quad(ctx, [ST.x0, 0, stZ0], [ST.x1, 0, stZ0], [ST.x1, y, ST.zTop], [ST.x0, y, ST.zTop], [0, 1, -0.6]);
    box(ctx, ST.x0 - 0.06, 0, stZ0, ST.x0, y + 1.0, ST.zTop);
  } else {
    paint(ctx, T.rust, { rough: 0.55, metal: 0.65 });
    for (let i = 0; i < ST.n; i++) { const ty = ((i + 1) * y) / ST.n, z = stZ0 + i * 0.28; box(ctx, ST.x0, ty - 0.035, z, ST.x1, ty, z + 0.29); }
    for (const x of [ST.x0, ST.x1]) tube(ctx, [x, 0, stZ0], [x, y, ST.zTop], 0.06, 0.06, 4);
    paint(ctx, T.rackPaint, { rough: 0.7, metal: 0.4 });
    for (let i = 0; i <= ST.n; i += 4) { const z = stZ0 + i * 0.28, yy = (i * y) / ST.n; tube(ctx, [ST.x0, yy, z], [ST.x0, yy + 1.0, z], 0.025, 0.025, 6); }
    tube(ctx, [ST.x0, 1.0, stZ0], [ST.x0, y + 1.0, ST.zTop], 0.03, 0.03, 6);
  }
  // the foreman's box: tin walls, a door off the walkway, a smashed window over the floor
  const offH = OFF.top;
  if (!coll) paint(ctx, T.green, { rough: 0.75, metal: 0.3 });
  const door = { c: 8.7, w: 1.4, sill: y, h: 2.3 }, win = { c: 17.8, w: 2.2, sill: y + 1.0, h: 1.1 };
  wall(ctx, "z", OFF.x0, z1 - (z1 - OFF.z0), z1, y, offH, 0.1, [door]);
  wall(ctx, "x", OFF.z0, OFF.x0 - 0.05, x1, y, offH, 0.1, [win]);
  box(ctx, OFF.x0 - 0.05, offH, OFF.z0 - 0.05, x1, offH + 0.1, z1);
  if (coll) { box(ctx, 17.2, y, 8.9, 19.6, y + 0.8, 9.7); return; }
  if (L <= 2) { paint(ctx, T.rust, { rough: 0.6, metal: 0.5 }); trim(ctx, "x", OFF.z0, win, 0.1, 0.05); trim(ctx, "z", OFF.x0, door, 0.1, 0.05); shards(ctx, "x", OFF.z0, win, rnd); }
  if (L <= 3) {
    paint(ctx, T.timber, { rough: 0.8 });
    box(ctx, 17.2, y + 0.74, 8.9, 19.6, y + 0.8, 9.7);
    for (const [a, b] of [[17.25, 8.95], [19.5, 8.95], [17.25, 9.6], [19.5, 9.6]]) box(ctx, a, y, b, a + 0.05, y + 0.74, b + 0.05);
    paint(ctx, T.paper, { rough: 0.9 });
    obox(ctx, [18.0, y + 0.81, 9.3], [0.15, 0.004, 0.11], 20);
    obox(ctx, [16.7, y + 0.003, 9.0], [0.15, 0.003, 0.11], -35);
  }
}
function clutter(ctx, L, rnd, coll) {
  // stacked fish boxes against the south wall, pallets by the north wall: things to duck behind
  const stacks = [[-8.2, -9.2, 3], [-7.2, -9.2, 2], [-8.2, -8.2, 2], [6.2, 9.0, 3], [7.3, 9.0, 1]];
  for (const [x, z, n] of stacks) {
    if (coll) { box(ctx, x - 0.48, 0, z - 0.48, x + 0.48, n * 0.42, z + 0.48); continue; }
    for (let k = 0; k < n; k++) {
      paint(ctx, T.pallet, { col: k % 2 ? "oklch(0.93 0.02 60)" : "oklch(0.97 0.01 80)", rough: 0.85 });
      obox(ctx, [x + (rnd() - 0.5) * 0.06, k * 0.42 + 0.2, z + (rnd() - 0.5) * 0.06], [0.45, 0.2, 0.45], (rnd() - 0.5) * 8);
    }
  }
  if (coll || L >= 4) return;
  paint(ctx, null, { col: "oklch(0.2 0.02 230)", rough: 0.05, metal: 0.1 });
  for (const [x, z, r] of [[-11, 1, 1.4], [4, -2, 1.1], [16, -6, 1.6], [-4, 8, 1.2], [-15, -6, 1]]) puddle(ctx, x, 0.025, z, r, rnd);
  // drain channel down the hall, a grate over it
  paint(ctx, T.rust, { rough: 0.6, metal: 0.6 });
  if (L <= 2) for (let x = -14; x < 10; x += 0.25) box(ctx, x, 0.02, -0.2, x + 0.04, 0.03, 0.2);
}
export function geometry(ctx) {
  const L = ctx.lod ?? 1, rnd = () => ctx.random();
  // floor
  paint(ctx, T.concrete, { col: "oklch(0.93 0.01 230)", rough: 0.9 });
  box(ctx, -W + t / 2, 0, -D + t / 2, W - t / 2, 0.02, D - t / 2);
  walls(ctx, false);
  roof(ctx, false, L);
  if (L >= 5) return;
  for (const z of LINES_Z) for (const [a, b] of LINE_SEG) gutLine(ctx, a, b, z, L, false);
  for (const [x, z] of VATS) vat(ctx, x, z, L, rnd, false);
  mezz(ctx, L, rnd, false);
  if (L >= 4) return;
  lockers(ctx, L, rnd, false);
  clutter(ctx, L, rnd, false);
  // the roller shutter: drum box over the opening, slats rolled half down, buckled at one corner
  paint(ctx, T.rust, { rough: 0.6, metal: 0.55 });
  box(ctx, -2.6, 4.05, D + t / 2, 2.6, 4.75, D + t / 2 + 0.55);
  paint(ctx, T.corrugated, { col: "oklch(0.93 0.02 40)", rough: 0.7, metal: 0.5 });
  for (let k = 0; k < 10; k++) { const y = 4.0 - k * 0.15, sag = k > 6 ? (k - 6) * 0.06 : 0; obox(ctx, [0, y - 0.07 + sag * 0.5, D + t / 2 + 0.12 + sag], [2.24 - (k > 7 ? 0.3 : 0), 0.07, 0.025], 0, 0, k > 7 ? 3 : 0); }
  if (L <= 2) {
    paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
    for (const [al, at, holes] of [["x", D, [...HOLES.n, ...clN]], ["x", -D, [...HOLES.s, ...clS]], ["z", -W, HOLES.w], ["z", W, HOLES.e]]) for (const h of holes) {
      trim(ctx, al, at, h, t, 0.1);
      if (h.sill > 1) shards(ctx, al, at, h, rnd);
    }
    paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
  }
  trusses(ctx, L, rnd);
  if (L <= 2) {
    const chains = [[-15, 3, 3.1], [-15, -2.5, 2.4], [-10, 6.5, 3.6], [-5, -6, 2.8], [-5, 2.5, 3.3], [0, 5.5, 2.2], [0, -4.5, 3.5], [5, -7, 3], [5, 1.5, 2.6], [10, -6, 3.4], [-10, -3.5, 2.9]];
    for (const [x, z, len] of chains) chain(ctx, x + 0.1, z, len, L, rnd);
    for (const [x, z] of [[-5, 0], [10, -1]]) cageLamp(ctx, [x + 0.3, 5.0, z], H, L);
  }
}
export function collider(ctx) {
  const L = 1, rnd = () => 0.5;
  walls(ctx, true);
  roof(ctx, true, L);
  for (const z of LINES_Z) for (const [a, b] of LINE_SEG) gutLine(ctx, a, b, z, L, true);
  for (const [x, z] of VATS) vat(ctx, x, z, L, rnd, true);
  mezz(ctx, L, rnd, true);
  lockers(ctx, L, rnd, true);
  clutter(ctx, L, rnd, true);
  box(ctx, -2.6, 4.0, D + t / 2, 2.6, 4.75, D + t / 2 + 0.55);
  box(ctx, -2.25, 2.5, D + t / 2 + 0.05, 2.25, 4.0, D + t / 2 + 0.3);
}
