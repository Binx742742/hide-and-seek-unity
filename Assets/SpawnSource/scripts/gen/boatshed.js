// Timber boat shed. Origin: floor centre (world -28,0,6). Local x -7..7, z -9..9. Ridge along Z.
// Openings: 3 m doorway east (z 0), broken plank gap north (x 1). A rotting boat on cradles down the middle.
import { T, paint, box, obox, tube, wall, trim, prism, hexa, quad, tri, mid } from "./kit.js";
const W = 7, D = 9, H = 5, RIDGE = 7.5, t = 0.16;
const HO = { e: [{ c: 0, w: 3, sill: 0, h: 3.1 }], n: [{ c: 1, w: 1.5, sill: 0, h: 2.5 }] };
const BOAT = { z0: -4, z1: 4, beam: 1.3, keel: 0.9 };
function shell(ctx, coll, L) {
  if (!coll) paint(ctx, T.timber, { rough: 0.9 });
  wall(ctx, "x", D, -W - t / 2, W + t / 2, 0, H, t, HO.n);
  wall(ctx, "x", -D, -W - t / 2, W + t / 2, 0, H, t);
  wall(ctx, "z", -W, -D + t / 2, D - t / 2, 0, H, t);
  wall(ctx, "z", W, -D + t / 2, D - t / 2, 0, H, t, HO.e);
  for (const s of [-1, 1]) prism(ctx, "x", s * D, [[-W - t / 2, H], [W + t / 2, H], [0, RIDGE]], t);
  const ov = 0.5, xe = W + ov, ye = H - ov * ((RIDGE - H) / W), th = 0.06;
  const slab = (z0, z1, s) => hexa(ctx, [[0, RIDGE, z0], [0, RIDGE, z1], [s * xe, ye, z1], [s * xe, ye, z0], [0, RIDGE + th, z0], [0, RIDGE + th, z1], [s * xe, ye + th, z1], [s * xe, ye + th, z0]]);
  if (!coll) paint(ctx, T.slate, { rough: 0.6 });
  if (coll || L >= 4) { slab(-D - ov, D + ov, 1); slab(-D - ov, D + ov, -1); }
  else for (const s of [-1, 1]) for (let i = 0; i < 10; i++) { if (s > 0 && i === 3) continue; if (s < 0 && i === 7) continue; slab(-D - ov + i * 1.9, -D - ov + (i + 1) * 1.9, s); }
  if (coll || L >= 3) return;
  // vertical battens outside, tie beams and a ridge pole inside, the jagged ends round the north gap
  paint(ctx, T.timber, { col: "oklch(0.9 0.01 60)", rough: 0.95 });
  if (L <= 2) {
    for (const s of [-1, 1]) for (let u = -W + 0.3; u < W; u += 0.7) box(ctx, u - 0.04, 0, s * (D + t / 2), u + 0.04, H, s * (D + t / 2 + 0.03));
    for (let u = -D + 0.6; u < D; u += 0.7) { if (Math.abs(u) < 1.7) continue; box(ctx, W + t / 2, 0, u - 0.04, W + t / 2 + 0.03, H, u + 0.04); box(ctx, -W - t / 2 - 0.03, 0, u - 0.04, -W - t / 2, H, u + 0.04); }
  }
  for (let z = -7.5; z <= 7.5; z += 3) { box(ctx, -W, H - 0.25, z - 0.1, W, H, z + 0.1); box(ctx, -0.08, H, z - 0.08, 0.08, RIDGE - 0.05, z + 0.08); }
  box(ctx, -0.1, RIDGE - 0.25, -D, 0.1, RIDGE, D);
  for (const [x, len] of [[0.35, 0.6], [0.6, 0.3], [1.7, 0.45], [1.95, 0.8]]) box(ctx, x - 0.1, 2.5, D - t / 2, x + 0.1, 2.5 - len * 0.0 + 0.0 + 0.0 + 0.0 - 0.0, D + t / 2);
  paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
  trim(ctx, "z", W, HO.e[0], t, 0.12);
}
// the hull: a U section lofted bow (-z) to stern (+z), a rot hole in its starboard flank
const hw = (tt) => BOAT.beam * Math.max(0.03, 1 - Math.pow(Math.abs(tt - 0.55) / 0.55, 2.2));
const sheer = (tt) => 2.4 + 0.45 * (1 - tt) * (1 - tt);
const keel = (tt) => BOAT.keel + 0.7 * Math.pow(1 - tt, 3);
function hullPt(i, k, NS, NK) {
  const tt = i / NS, z = BOAT.z0 + (BOAT.z1 - BOAT.z0) * tt, w = hw(tt), kb = keel(tt), sh = sheer(tt);
  const a = (k / NK) * Math.PI - Math.PI / 2, s = Math.sin(a);
  return [Math.sign(s) * w * Math.pow(Math.abs(s), 0.7), kb + (sh - kb) * (1 - Math.cos(a)), z];
}
function boat(ctx, L, coll) {
  if (coll) {
    box(ctx, -BOAT.beam, BOAT.keel, BOAT.z0, BOAT.beam, 2.6, BOAT.z1);
    for (const z of [-2.6, 0, 2.6]) box(ctx, -1.2, 0, z - 0.15, 1.2, BOAT.keel, z + 0.15);
    return;
  }
  const NS = L <= 1 ? 24 : L <= 2 ? 16 : L <= 3 ? 10 : 6, NK = L <= 2 ? 12 : L <= 3 ? 8 : 4;
  paint(ctx, T.hull, { rough: 0.85 });
  for (let i = 0; i < NS; i++) for (let k = 0; k < NK; k++) {
    if (L <= 3 && i >= Math.round(NS * 0.55) && i < Math.round(NS * 0.7) && k >= Math.round(NK * 0.6) && k < Math.round(NK * 0.8)) continue;
    const a = hullPt(i, k, NS, NK), b = hullPt(i + 1, k, NS, NK), c = hullPt(i + 1, k + 1, NS, NK), d = hullPt(i, k + 1, NS, NK), m = mid([a, b, c, d]);
    quad(ctx, a, b, c, d, [m[0], m[1] - sheer(i / NS) - 0.5, 0]);
  }
  // transom
  const st = []; for (let k = 0; k <= NK; k++) st.push(hullPt(NS, k, NS, NK));
  const sc = mid(st); for (let k = 0; k < NK; k++) tri(ctx, sc, st[k], st[k + 1], [0, 0, 1]);
  if (L >= 4) return;
  paint(ctx, T.timber, { rough: 0.9 });
  // keel, gunwales, ribs, thwarts, a cabin aft gone soft
  for (let i = 0; i < NS; i++) {
    const a = hullPt(i, NK / 2, NS, NK), b = hullPt(i + 1, NK / 2, NS, NK);
    tube(ctx, [0, a[1] - 0.06, a[2]], [0, b[1] - 0.06, b[2]], 0.09, 0.09, 4, false);
    for (const k of [0, NK]) { const p = hullPt(i, k, NS, NK), q = hullPt(i + 1, k, NS, NK); tube(ctx, p, q, 0.06, 0.06, 4, false); }
  }
  if (L <= 2) for (let i = 2; i < NS - 1; i += 2) for (let k = 0; k < NK; k++) { const p = hullPt(i, k, NS, NK), q = hullPt(i, k + 1, NS, NK); tube(ctx, [p[0] * 0.95, p[1] + 0.03, p[2]], [q[0] * 0.95, q[1] + 0.03, q[2]], 0.035, 0.035, 4, false); }
  for (const tt of [0.3, 0.5]) { const z = BOAT.z0 + 8 * tt, w = hw(tt) * 0.95, y = sheer(tt) - 0.35; box(ctx, -w, y - 0.05, z - 0.14, w, y, z + 0.14); }
  paint(ctx, T.hull, { col: "oklch(0.92 0.01 220)", rough: 0.8 });
  const cz0 = 1.4, cz1 = 3.2, cy = sheer(0.75) - 0.25;
  box(ctx, -0.75, cy, cz0, 0.75, cy + 1.1, cz1, [1]);
  paint(ctx, T.timber, { rough: 0.9 });
  obox(ctx, [0.05, cy + 1.14, (cz0 + cz1) / 2], [0.85, 0.04, 1.0], 0, 0, 7);
  paint(ctx, null, { col: "oklch(0.1 0.01 230)", rough: 0.3 });
  box(ctx, -0.5, cy + 0.6, cz0 - 0.01, 0.5, cy + 0.95, cz0);
  // mast stump
  paint(ctx, T.timber, { rough: 0.9 });
  tube(ctx, [0, keel(0.35) + 0.2, -1.2], [0, 3.6, -1.2], 0.09, 0.07, 8);
  // cradles
  for (const z of [-2.6, 0, 2.6]) {
    box(ctx, -1.2, 0, z - 0.14, 1.2, 0.25, z + 0.14);
    const tt = (z - BOAT.z0) / 8;
    for (const s of [-1, 1]) { const w = hw(tt); tube(ctx, [s * 1.0, 0.2, z], [s * w * 0.75, keel(tt) + 0.45, z], 0.08, 0.08, 4); }
    box(ctx, -0.25, 0.2, z - 0.12, 0.25, keel(tt), z + 0.12);
  }
}
function blob(ctx, cx, cz, r, h, seed) {
  const NA = 10, NR = 4, P = (a, b) => { const aa = (a / NA) * 6.283, bb = (b / NR) * Math.PI / 2, n = 1 + 0.18 * Math.sin(aa * 3 + seed) * Math.cos(bb * 2 + seed); return [cx + Math.cos(aa) * Math.cos(bb) * r * n, Math.sin(bb) * h * n + 0.01, cz + Math.sin(aa) * Math.cos(bb) * r * 0.8 * n]; };
  for (let a = 0; a < NA; a++) for (let b = 0; b < NR; b++) { const q = [P(a, b), P(a + 1, b), P(a + 1, b + 1), P(a, b + 1)], m = mid(q); quad(ctx, q[0], q[1], q[2], q[3], [m[0] - cx, m[1], m[2] - cz]); }
}
function props(ctx, L, coll) {
  const NETS = [[-4.9, -6.6, 1.1, 0.7], [-4.1, -7.3, 0.8, 0.5], [5.4, 4.6, 1.0, 0.6]];
  if (coll) {
    for (const [x, z, r, h] of NETS) box(ctx, x - r * 0.8, 0, z - r * 0.6, x + r * 0.8, h * 0.8, z + r * 0.6);
    box(ctx, -W + t / 2, 0, -2, -W + t / 2 + 0.85, 0.95, 2);
    return;
  }
  paint(ctx, T.rope, { rough: 0.95 });
  NETS.forEach(([x, z, r, h], i) => blob(ctx, x, z, r, h, i * 1.7));
  if (L >= 4) return;
  // floats in the nets
  paint(ctx, null, { col: "oklch(0.55 0.13 45)", rough: 0.6 });
  for (const [x, y, z] of [[-4.6, 0.62, -6.3], [-5.3, 0.45, -7.0], [5.1, 0.5, 4.2]]) tube(ctx, [x, y - 0.1, z], [x, y + 0.1, z], 0.12, 0.12, 8);
  // workbench on the west wall, a vice and junk on it, shelf under
  const bx = -W + t / 2;
  paint(ctx, T.timber, { col: "oklch(0.92 0.02 60)", rough: 0.9 });
  box(ctx, bx, 0.88, -2, bx + 0.85, 0.95, 2);
  box(ctx, bx, 0.25, -1.9, bx + 0.8, 0.29, 1.9);
  for (const [a, b] of [[0.05, -1.95], [0.75, -1.95], [0.05, 1.88], [0.75, 1.88]]) box(ctx, bx + a, 0, b, bx + a + 0.07, 0.88, b + 0.07);
  box(ctx, bx, 1.2, -2, bx + 0.25, 1.24, 2);
  if (L <= 2) {
    paint(ctx, T.rust, { rough: 0.6, metal: 0.6 });
    box(ctx, bx + 0.6, 0.95, 1.2, bx + 0.8, 1.12, 1.45);
    tube(ctx, [bx + 0.7, 1.05, 1.1], [bx + 0.7, 1.05, 0.9], 0.015, 0.015, 4);
    obox(ctx, [bx + 0.45, 0.97, -0.6], [0.15, 0.02, 0.04], 20);
    tube(ctx, [bx + 0.3, 0.97, 0.2], [bx + 0.55, 0.97, 0.5], 0.02, 0.02, 5);
    paint(ctx, null, { col: "oklch(0.3 0.03 60)", rough: 0.7 });
    for (let i = 0; i < 4; i++) tube(ctx, [bx + 0.12, 1.24, -1.6 + i * 0.4], [bx + 0.12, 1.42 + i * 0.03, -1.6 + i * 0.4], 0.07, 0.06, 8);
  }
  // oars leaning on the south wall
  paint(ctx, T.timber, { col: "oklch(0.95 0.03 70)", rough: 0.85 });
  for (let i = 0; i < 3; i++) { const x = 2.2 + i * 0.45; obox(ctx, [x, 1.5, -D + t / 2 + 0.3], [0.035, 1.5, 0.035], 0, 11 + i * 2, (i - 1) * 4); obox(ctx, [x, 0.4, -D + t / 2 + 0.52], [0.08, 0.35, 0.015], 0, 11 + i * 2, (i - 1) * 4); }
}
export function geometry(ctx) {
  const L = ctx.lod ?? 1;
  paint(ctx, T.floorboards, { rough: 0.9 });
  box(ctx, -W + t / 2, 0, -D + t / 2, W - t / 2, 0.03, D - t / 2);
  shell(ctx, false, L);
  if (L >= 5) return;
  boat(ctx, L, false);
  props(ctx, L, false);
  if (L <= 2) {
    paint(ctx, null, { col: "oklch(0.2 0.01 60)", rough: 0.6, metal: 0.3 });
    tube(ctx, [-4.5, H - 0.2, 0], [-4.5, 3.75, 0], 0.01, 0.01, 4, false);
    tube(ctx, [-4.5, 3.8, 0], [-4.5, 3.65, 0], 0.05, 0.2, 12);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; tube(ctx, [-4.5 + Math.cos(a) * 0.16, 3.66, Math.sin(a) * 0.16], [-4.5 + Math.cos(a) * 0.1, 3.42, Math.sin(a) * 0.1], 0.007, 0.007, 3, false); }
    ctx.color("oklch(0.95 0.05 80)"); ctx.emissive(3, 2, 0.85);
    tube(ctx, [-4.5, 3.65, 0], [-4.5, 3.47, 0], 0.045, 0.035, 8);
    ctx.emissive(null);
  }
}
export function collider(ctx) {
  shell(ctx, true, 1);
  boat(ctx, 1, true);
  props(ctx, 1, true);
}
