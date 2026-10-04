// Portable office trailer. Origin: ground centre (world -12,0,18). Local x -4..4, z -2..2.
// Floor raised to 0.6 on cinder blocks, 2.6 m inside; door south (x 0) with three steps down.
// The west half's floor stays clear: the game drops a loot crate there.
import { T, paint, box, obox, gbox, tube, wall, trim, shards } from "./kit.js";
const W = 4, D = 2, F = 0.6, CH = F + 2.6, t = 0.1;
const DOOR = { c: 0, w: 1.4, sill: F, h: 2.3 };
const WS = { c: -2.4, w: 1.4, sill: F + 1.0, h: 0.9 }, WN = { c: 2.2, w: 1.6, sill: F + 1.0, h: 0.9 };
function shell(ctx, coll, L) {
  if (!coll) paint(ctx, T.siding, { rough: 0.7, metal: 0.3 });
  box(ctx, -W, F - 0.25, -D, W, F, D);
  wall(ctx, "x", -D + t / 2, -W, W, F, CH, t, [DOOR, WS]);
  wall(ctx, "x", D - t / 2, -W, W, F, CH, t, [WN]);
  wall(ctx, "z", -W + t / 2, -D + t, D - t, F, CH, t);
  wall(ctx, "z", W - t / 2, -D + t, D - t, F, CH, t);
  box(ctx, -W - 0.05, CH, -D - 0.05, W + 0.05, CH + 0.15, D + 0.05);
  // steps: 0.2 rise, 0.3 tread
  if (!coll) paint(ctx, T.rust, { rough: 0.6, metal: 0.55 });
  box(ctx, -0.8, 0, -D - 0.6, 0.8, 0.2, -D - 0.3);
  box(ctx, -0.8, 0, -D - 0.3, 0.8, 0.4, -D);
  if (coll) return;
  paint(ctx, T.lino, { rough: 0.8 });
  box(ctx, -W + t, F, -D + t, W - t, F + 0.01, D - t);
  paint(ctx, T.panel, { col: "oklch(0.92 0.02 80)", rough: 0.8 });
  box(ctx, -W + t, CH - 0.02, -D + t, W - t, CH, D - t);
  if (L >= 4) return;
  paint(ctx, T.cinder, { rough: 0.95 });
  for (const x of [-3.4, -1.1, 1.1, 3.4]) for (const z of [-1.5, 1.5]) box(ctx, x - 0.2, 0, z - 0.2, x + 0.2, F - 0.25, z + 0.2);
  paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
  tube(ctx, [-W, 0.3, -0.6], [-W - 1.3, 0.25, 0], 0.05, 0.05, 6); tube(ctx, [-W, 0.3, 0.6], [-W - 1.3, 0.25, 0], 0.05, 0.05, 6);
  tube(ctx, [-W - 1.3, 0.25, 0], [-W - 1.4, 0.25, 0], 0.07, 0.07, 8);
  for (const s of [-1, 1]) { tube(ctx, [-0.8 * s, 0.4, -D - 0.3], [-0.8 * s, 1.35, -D - 0.3], 0.025, 0.025, 6); }
  tube(ctx, [0.8, 1.35, -D - 0.3], [0.8, 1.35 + 0.3, -D], 0.025, 0.025, 6);
  if (L <= 2) {
    trim(ctx, "x", -D + t / 2, DOOR, t, 0.06); trim(ctx, "x", -D + t / 2, WS, t, 0.05); trim(ctx, "x", D - t / 2, WN, t, 0.05);
    shards(ctx, "x", -D + t / 2, WS, () => ctx.random()); shards(ctx, "x", D - t / 2, WN, () => ctx.random());
    // the door leaf, torn off its top hinge, leaning outside
    paint(ctx, T.siding, { col: "oklch(0.93 0.02 60)", rough: 0.7, metal: 0.3 });
    obox(ctx, [1.55, 1.15, -D - 0.35], [0.6, 1.12, 0.03], 8, 14, -4);
  }
}
function furniture(ctx, L, coll) {
  const y = F + 0.01;
  if (coll) {
    box(ctx, 1.9, y, 0.95, 3.85, y + 0.76, D - t);
    box(ctx, W - t - 0.5, y, -1.85, W - t, y + 1.35, -0.55);
    return;
  }
  // desk against the north wall, east half
  paint(ctx, T.timber, { col: "oklch(0.93 0.02 60)", rough: 0.8 });
  box(ctx, 1.9, y + 0.72, 0.95, 3.85, y + 0.76, D - t);
  paint(ctx, T.green, { rough: 0.7, metal: 0.4 });
  box(ctx, 3.3, y, 1.0, 3.8, y + 0.72, D - t - 0.02);
  box(ctx, 1.95, y, 1.0, 2.0, y + 0.72, D - t - 0.02);
  if (L >= 4) return;
  // the dead CRT and its keyboard
  paint(ctx, null, { col: "oklch(0.78 0.02 85)", rough: 0.6 });
  box(ctx, 2.35, y + 0.76, 1.3, 2.85, y + 1.18, 1.8);
  box(ctx, 2.4, y + 0.82, 1.05, 2.8, y + 1.14, 1.3);
  box(ctx, 2.3, y + 0.76, 0.98, 2.95, y + 0.79, 1.08);
  paint(ctx, null, { col: "oklch(0.13 0.02 200)", rough: 0.15, metal: 0.2 });
  box(ctx, 2.45, y + 0.86, 1.045, 2.75, y + 1.1, 1.05);
  // the desk lamp: a goose-neck aimed down at the papers
  paint(ctx, null, { col: "oklch(0.25 0.03 30)", rough: 0.5, metal: 0.5 });
  tube(ctx, [3.4, y + 0.76, 1.6], [3.4, y + 0.79, 1.6], 0.1, 0.1, 10);
  tube(ctx, [3.4, y + 0.79, 1.6], [3.3, y + 1.15, 1.5], 0.012, 0.012, 5);
  tube(ctx, [3.3, y + 1.15, 1.5], [3.15, y + 1.1, 1.3], 0.012, 0.012, 5);
  tube(ctx, [3.15, y + 1.13, 1.3], [3.1, y + 1.0, 1.24], 0.03, 0.09, 10);
  ctx.color("oklch(0.95 0.05 80)"); ctx.emissive(3, 2, 0.9);
  tube(ctx, [3.1, y + 1.02, 1.24], [3.09, y + 0.99, 1.23], 0.03, 0.025, 6);
  ctx.emissive(null);
  // filing cabinets by the east wall, one drawer pulled
  paint(ctx, T.green, { col: "oklch(0.93 0.02 120)", rough: 0.7, metal: 0.4 });
  box(ctx, W - t - 0.5, y, -1.85, W - t, y + 1.32, -1.25);
  box(ctx, W - t - 0.5, y, -1.2, W - t, y + 1.0, -0.6);
  box(ctx, W - t - 0.85, y + 0.62, -1.15, W - t - 0.5, y + 0.9, -0.65);
  // a swivel chair tipped on its back
  paint(ctx, null, { col: "oklch(0.3 0.03 40)", rough: 0.9 });
  const o = [1.3, y, -0.6];
  gbox(ctx, o, [0, 0.28, 0], [0.24, 0.04, 0.24], 35, 0, 80);
  gbox(ctx, o, [0, 0.55, 0.25], [0.22, 0.25, 0.03], 35, 0, 80);
  paint(ctx, T.rust, { rough: 0.6, metal: 0.6 });
  gbox(ctx, o, [0, 0.15, 0], [0.025, 0.13, 0.025], 35, 0, 80);
  // papers everywhere east of the crate's spot
  paint(ctx, T.paper, { rough: 0.9 });
  for (let i = 0; i < 14; i++) { const x = 0.6 + ctx.random() * 3.0, z = -1.7 + ctx.random() * 2.6; obox(ctx, [x, y + 0.004 + i * 0.0005, z], [0.105, 0.002, 0.148], ctx.random() * 180); }
  for (let i = 0; i < 4; i++) obox(ctx, [2.2 + i * 0.3, y + 0.765 + i * 0.002, 1.3 + (i % 2) * 0.2], [0.105, 0.002, 0.148], i * 23);
  // a calendar on the wall, yellowed
  box(ctx, -1.0, F + 1.4, D - t - 0.01, -0.6, F + 1.9, D - t);
}
export function geometry(ctx) {
  const L = ctx.lod ?? 1;
  shell(ctx, false, L);
  if (L >= 5) return;
  furniture(ctx, L, false);
}
export function collider(ctx) {
  shell(ctx, true, 1);
  furniture(ctx, 1, true);
}
