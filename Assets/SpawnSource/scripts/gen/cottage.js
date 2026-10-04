// A Saltgate cottage: rough stone walls, a slate gable roof (ridge along x), a plank door hole in the
// south (−z) face, one shuttered window either side. Origin: ground centre. params { w, d, h, door, back, seed }
// door: the door's centre x; back: an extra low opening in the north wall (the secret way through).
import { T, paint, box, wall, trim, prism, quad, tri, obox, tube } from "./kit.js";
function shape(ctx) {
  const { w = 6, d = 5, h = 2.8, door = 0, back = null } = ctx.params;
  const W = w / 2, D = d / 2, t = 0.4;
  const DOOR = { c: door, w: 1.2, sill: 0, h: 2.25 };
  const wins = [{ c: door - 1.7, w: 0.8, sill: 1.0, h: 0.9 }, { c: door + 1.7, w: 0.8, sill: 1.0, h: 0.9 }].filter((q) => Math.abs(q.c) + 0.5 < W - t);
  const BACK = back !== null ? { c: back, w: 1.1, sill: 0, h: 2.0 } : null;
  return { W, D, h, t, DOOR, wins, BACK, ridge: h + d * 0.45 };
}
function shell(ctx, coll) {
  const s = shape(ctx), { W, D, h, t } = s;
  if (!coll) paint(ctx, T.cinder, { col: "oklch(0.62 0.03 70)", rough: 0.95 });
  wall(ctx, "x", -D + t / 2, -W, W, 0, h, t, [s.DOOR, ...s.wins]);
  wall(ctx, "x", D - t / 2, -W, W, 0, h, t, s.BACK ? [s.BACK] : [{ c: 0, w: 0.7, sill: 1.2, h: 0.6 }]);
  wall(ctx, "z", -W + t / 2, -D + t, D - t, 0, h, t, []);
  wall(ctx, "z", W - t / 2, -D + t, D - t, 0, h, t, []);
  // gables
  prism(ctx, "z", -W + t / 2, [[-D, h], [D, h], [0, s.ridge]], t);
  prism(ctx, "z", W - t / 2, [[-D, h], [D, h], [0, s.ridge]], t);
  // the roof: two slate planes over the ridge
  if (!coll) paint(ctx, T.slate, { col: "oklch(0.75 0.02 240)", rough: 0.6 });
  const o = 0.35, y0 = h - o * (s.ridge - h) / D;
  for (const sg of [-1, 1]) {
    const a = [-W - 0.3, y0, sg * (D + o)], b = [W + 0.3, y0, sg * (D + o)], c = [W + 0.3, s.ridge + 0.05, 0], e = [-W - 0.3, s.ridge + 0.05, 0];
    const n = [0, 1, sg * 0.8];
    quad(ctx, a, b, c, e, n);
    if (!coll) quad(ctx, [a[0], a[1] - 0.12, a[2]], [b[0], b[1] - 0.12, b[2]], [c[0], c[1] - 0.12, c[2]], [e[0], e[1] - 0.12, e[2]], [0, -1, -sg * 0.8]);
  }
  // floor
  if (!coll) paint(ctx, T.floorboards, { rough: 0.9 });
  box(ctx, -W + t, 0, -D + t, W - t, 0.05, D - t);
}
export function geometry(ctx) {
  const s = shape(ctx), { W, D, h, t } = s, L = ctx.lod ?? 1;
  shell(ctx, false);
  if (L >= 4) return;
  paint(ctx, T.timber, { col: "oklch(0.8 0.02 60)", rough: 0.9 });
  trim(ctx, "x", -D + t / 2, s.DOOR, t, 0.1);
  for (const q of s.wins) {
    trim(ctx, "x", -D + t / 2, q, t, 0.07);
    // shutters hanging off one hinge each, one slipped
    obox(ctx, [q.c - q.w / 2 - 0.22, q.sill + q.h / 2, -D - 0.05], [0.2, q.h / 2, 0.025], 12, 0, 0);
    obox(ctx, [q.c + q.w / 2 + 0.2, q.sill + q.h / 2 - 0.08, -D - 0.06], [0.2, q.h / 2, 0.025], -25, 0, 9);
    paint(ctx, null, { col: "oklch(0.12 0.02 240)", rough: 0.2 });
    box(ctx, q.c - q.w / 2, q.sill, -D + t / 2 - 0.01, q.c + q.w / 2, q.sill + q.h, -D + t / 2 + 0.01);
    paint(ctx, T.timber, { col: "oklch(0.8 0.02 60)", rough: 0.9 });
  }
  if (s.BACK) trim(ctx, "x", D - t / 2, s.BACK, t, 0.06);
  // a chimney stack on the east gable, soot-black at the top
  paint(ctx, T.cinder, { col: "oklch(0.5 0.02 60)", rough: 0.95 });
  box(ctx, W - 0.9, h, -0.35, W - 0.2, s.ridge + 0.9, 0.35);
  paint(ctx, null, { col: "oklch(0.15 0.01 60)", rough: 0.9 });
  box(ctx, W - 0.95, s.ridge + 0.75, -0.4, W - 0.15, s.ridge + 0.95, 0.4);
  if (L >= 3) return;
  // inside: a table with two cups, one chair pushed back, a cold hearth
  const y = 0.05;
  paint(ctx, T.timber, { col: "oklch(0.88 0.03 60)", rough: 0.85 });
  box(ctx, -0.7, y + 0.72, -0.4, 0.7, y + 0.77, 0.4);
  for (const [x, z] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) box(ctx, x - 0.03, y, z - 0.03, x + 0.03, y + 0.72, z + 0.03);
  obox(ctx, [1.15, y + 0.45, 0.2], [0.22, 0.03, 0.22], 20, 0, 0);
  obox(ctx, [1.3, y + 0.75, 0.38], [0.22, 0.3, 0.025], 20, -8, 0);
  paint(ctx, null, { col: "oklch(0.85 0.02 90)", rough: 0.4 });
  tube(ctx, [-0.3, y + 0.77, 0], [-0.3, y + 0.86, 0], 0.04, 0.045, 8);
  tube(ctx, [0.35, y + 0.77, 0.15], [0.35, y + 0.86, 0.15], 0.04, 0.045, 8);
  paint(ctx, T.cinder, { col: "oklch(0.4 0.02 60)", rough: 0.95 });
  box(ctx, W - t - 0.5, 0, -0.6, W - t, 1.1, 0.6);
  paint(ctx, null, { col: "oklch(0.1 0.01 60)", rough: 1 });
  box(ctx, W - t - 0.52, 0.05, -0.4, W - t - 0.49, 0.7, 0.4);
}
export function collider(ctx) { shell(ctx, true); }
