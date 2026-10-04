// Cold-storage warehouse. Origin: floor centre (world 26,0,10). Local x -9..9, z -11..11.
// Openings: roller 4x3.5 west (z 0), man door south (x 4), collapsed 2 m hole east (z 5).
import { T, paint, box, obox, tube, wall, trim, hexa } from "./kit.js";
const W = 9, D = 11, H = 6, t = 0.3;
const HO = { w: [{ c: 0, w: 4, sill: 0, h: 3.5 }], s: [{ c: 4, w: 1.5, sill: 0, h: 2.4 }], e: [{ c: 5, w: 2.2, sill: 0, h: 2.7 }] };
const RACKS = [-5, -0.5, 4.2], RZ0 = -7, RZ1 = 7, BAY = 14 / 6, RD = 0.6, RH = 4;
const FALLEN = { rack: 0, bay: 5 };
function shell(ctx, coll, L) {
  if (!coll) paint(ctx, T.corrugated, { col: "oklch(0.95 0.01 230)", rough: 0.8, metal: 0.35 });
  wall(ctx, "x", D, -W - t / 2, W + t / 2, 0, H, t);
  wall(ctx, "x", -D, -W - t / 2, W + t / 2, 0, H, t, HO.s);
  wall(ctx, "z", -W, -D + t / 2, D - t / 2, 0, H, t, HO.w);
  wall(ctx, "z", W, -D + t / 2, D - t / 2, 0, H, t, HO.e);
  // flat roof with a parapet; a skylight frame long since smashed through
  if (!coll) paint(ctx, T.rust, { rough: 0.7, metal: 0.4 });
  const sk = [1.2, 3.2, -1, 1];
  if (coll || L >= 4) box(ctx, -W - t / 2, H, -D - t / 2, W + t / 2, H + 0.2, D + t / 2);
  else {
    box(ctx, -W - t / 2, H, -D - t / 2, sk[0], H + 0.2, D + t / 2);
    box(ctx, sk[1], H, -D - t / 2, W + t / 2, H + 0.2, D + t / 2);
    box(ctx, sk[0], H, -D - t / 2, sk[1], H + 0.2, sk[2]);
    box(ctx, sk[0], H, sk[3], sk[1], H + 0.2, D + t / 2);
  }
  if (coll) return;
  paint(ctx, T.corrugated, { col: "oklch(0.95 0.01 230)", rough: 0.8, metal: 0.35 });
  wall(ctx, "x", D, -W - t / 2, W + t / 2, H + 0.2, H + 0.7, t);
  wall(ctx, "x", -D, -W - t / 2, W + t / 2, H + 0.2, H + 0.7, t);
  wall(ctx, "z", -W, -D + t / 2, D - t / 2, H + 0.2, H + 0.7, t);
  wall(ctx, "z", W, -D + t / 2, D - t / 2, H + 0.2, H + 0.7, t);
  if (L >= 4) return;
  // insulated panel lining inside, its lower edge rotten away in places
  paint(ctx, T.panel, { rough: 0.6 });
  const li = 0.04, o = t / 2 + li / 2 + 0.005;
  wall(ctx, "x", D - o, -W + t / 2, W - t / 2, 0.5, H - 0.4, li);
  wall(ctx, "x", -D + o, -W + t / 2, W - t / 2, 0.5, H - 0.4, li, HO.s);
  wall(ctx, "z", -W + o, -D + t / 2, D - t / 2, 0.5, H - 0.4, li, HO.w);
  wall(ctx, "z", W - o, -D + t / 2, D - t / 2, 0.5, H - 0.4, li, HO.e);
  // I-beams under the roof
  paint(ctx, T.rust, { rough: 0.6, metal: 0.6 });
  for (let z = -8; z <= 8; z += 4) { box(ctx, -W, H - 0.4, z - 0.05, W, H, z + 0.05); if (L <= 2) { box(ctx, -W, H - 0.42, z - 0.12, W, H - 0.38, z + 0.12); box(ctx, -W, H - 0.04, z - 0.12, W, H, z + 0.12); } }
  // roller door: drum over the west opening, its curtain jammed at 3 m
  box(ctx, -W - t / 2 - 0.5, 3.55, -2.3, -W - t / 2, 4.2, 2.3);
  paint(ctx, T.corrugated, { col: "oklch(0.92 0.02 40)", rough: 0.7, metal: 0.5 });
  for (let k = 0; k < 4; k++) box(ctx, -W - t / 2 - 0.2, 3.5 - (k + 1) * 0.13, -2.0, -W - t / 2 - 0.15, 3.5 - k * 0.13, 2.0);
  if (L <= 2) {
    paint(ctx, T.rust, { rough: 0.6, metal: 0.5 });
    trim(ctx, "z", -W, HO.w[0], t, 0.1); trim(ctx, "x", -D, HO.s[0], t, 0.08);
    // the collapse: buckled sheets and torn panel hang round the east hole
    paint(ctx, T.corrugated, { col: "oklch(0.93 0.02 40)", rough: 0.8, metal: 0.4 });
    obox(ctx, [W + 0.35, 2.85, 5.6], [0.03, 0.5, 0.6], 15, 0, 25);
    obox(ctx, [W - 0.6, 0.25, 6.9], [0.6, 0.03, 0.5], 30, 0, 12);
    obox(ctx, [W + 0.9, 0.2, 3.6], [0.7, 0.04, 0.5], -20, 0, -8);
  }
}
function rack(ctx, x, ri, L, coll) {
  const nb = 6;
  if (coll) {
    for (let b = 0; b < nb; b++) { if (ri === FALLEN.rack && b === FALLEN.bay) continue; box(ctx, x - RD, 0, RZ0 + b * BAY - 0.05, x + RD, RH, RZ0 + (b + 1) * BAY + 0.05); }
    return;
  }
  for (let b = 0; b <= nb; b++) {
    if (ri === FALLEN.rack && b === nb) continue;
    const z = RZ0 + b * BAY;
    paint(ctx, T.rackPaint, { rough: 0.7, metal: 0.4 });
    for (const s of [-1, 1]) box(ctx, x + s * RD - 0.05, 0, z - 0.05, x + s * RD + 0.05, RH, z + 0.05);
    if (L <= 3) for (let k = 0; k < 4; k++) { const y0 = 0.2 + k * 0.95; tube(ctx, [x - RD, y0, z], [x + RD, y0 + 0.9, z], 0.02, 0.02, 4, false); }
  }
  for (let b = 0; b < nb; b++) {
    if (ri === FALLEN.rack && b === FALLEN.bay) continue;
    const za = RZ0 + b * BAY, zb = za + BAY;
    paint(ctx, T.rackPaint, { rough: 0.7, metal: 0.4 });
    for (const y of [1.3, 2.6, 3.9]) for (const s of [-1, 1]) box(ctx, x + s * RD - 0.04, y - 0.12, za, x + s * RD + 0.04, y, zb);
    if (L >= 4) continue;
    for (const lv of [0, 1.3, 2.6, 3.9]) for (const half of [0, 1]) {
      const h = Math.sin(ri * 31 + b * 7.3 + lv * 3.1 + half * 5.7);
      if (h < -0.35 || (lv === 3.9 && h < 0.4)) continue; // gaps: see through, reach through
      const zc = za + BAY * (half ? 0.73 : 0.27), y0 = lv + (lv ? 0 : 0.02);
      paint(ctx, T.pallet, { rough: 0.85 });
      box(ctx, x - 0.55, y0, zc - 0.5, x + 0.55, y0 + 0.14, zc + 0.5);
      if (h > 0.05) {
        const bh = Math.min(lv === 0 ? 1.05 : 1.05, 0.55 + (h + 1) * 0.25);
        paint(ctx, T.boxes, { rough: 0.6 });
        obox(ctx, [x + h * 0.06, y0 + 0.14 + bh / 2, zc], [0.5, bh / 2, 0.46], h * 6);
        if (L <= 2) { paint(ctx, null, { col: "oklch(0.92 0.01 230)", a: 0.35, rough: 0.1 }); obox(ctx, [x + h * 0.06, y0 + 0.14 + bh / 2, zc], [0.52, bh / 2 + 0.01, 0.48], h * 6); }
      }
    }
  }
}
function fallen(ctx, L, coll) {
  // the section that let go: a bay frame leaning off rack 1 across the aisle onto rack 2's beams
  const x0 = RACKS[0] + RD, z0 = RZ0 + 5 * BAY, len = 4.2, ang = 36;
  const top = [x0 + Math.cos(ang * Math.PI / 180) * len, Math.sin(ang * Math.PI / 180) * len, 0];
  if (coll) {
    for (const zz of [z0 + 0.1, z0 + BAY - 0.1]) obox(ctx, [(x0 + top[0]) / 2, top[1] / 2, zz], [len / 2, 0.06, 0.06], 0, 0, ang);
    box(ctx, -3.6, 0, 5.5, -2.2, 0.7, 6.7);
    return;
  }
  paint(ctx, T.rackPaint, { rough: 0.75, metal: 0.4 });
  for (const zz of [z0 + 0.05, z0 + BAY - 0.05]) obox(ctx, [(x0 + top[0]) / 2, top[1] / 2, zz], [len / 2, 0.05, 0.05], 0, 0, ang);
  for (const f of [0.3, 0.62, 0.93]) { const px = x0 + (top[0] - x0) * f, py = top[1] * f; box(ctx, px - 0.04, py - 0.06, z0, px + 0.04, py + 0.06, z0 + BAY); }
  if (L >= 4) return;
  // what spilled
  paint(ctx, T.pallet, { rough: 0.85 });
  obox(ctx, [-2.9, 0.35, 6.1], [0.55, 0.07, 0.5], 25, 0, 38);
  obox(ctx, [-3.9, 0.07, 6.6], [0.55, 0.07, 0.5], -12);
  paint(ctx, T.boxes, { rough: 0.6 });
  obox(ctx, [-2.8, 0.3, 5.9], [0.3, 0.3, 0.3], 30, 10, 5);
  obox(ctx, [-3.3, 0.22, 6.5], [0.25, 0.22, 0.3], -15);
  obox(ctx, [-2.5, 0.2, 6.8], [0.28, 0.2, 0.2], 50, 0, 80);
}
function floorLoads(ctx, L, coll) {
  // wrapped pallets left in the aisles and against walls: knee-to-chest cover
  const P = [[-7.6, 6, 1.4, 0], [-7.6, 7.2, 1.0, 5], [7.2, -6, 1.5, -6], [-2.7, -3, 1.2, 8], [6.8, 1.5, 0.9, 12]];
  for (const [x, z, h, yw] of P) {
    if (coll) { obox(ctx, [x, h / 2 + 0.07, z], [0.56, h / 2 + 0.07, 0.52], yw); continue; }
    paint(ctx, T.pallet, { rough: 0.85 });
    obox(ctx, [x, 0.07, z], [0.55, 0.07, 0.5], yw);
    paint(ctx, T.boxes, { rough: 0.6 });
    obox(ctx, [x, 0.14 + h / 2, z], [0.52, h / 2, 0.48], yw);
  }
  if (coll || L >= 4) return;
  // pallets leaning on the north wall
  paint(ctx, T.pallet, { rough: 0.85 });
  for (let i = 0; i < 4; i++) obox(ctx, [-6 + i * 0.12, 0.6, D - t / 2 - 0.35 - i * 0.07], [0.6, 0.6, 0.06], 0, -14 - i * 2);
  for (let i = 0; i < 3; i++) obox(ctx, [W - t / 2 - 0.3 - i * 0.07, 0.6, -3 + i * 0.1], [0.06, 0.6, 0.55], 0, 0, 12 + i * 3);
  paint(ctx, null, { col: "oklch(0.2 0.02 230)", rough: 0.05 });
  for (const [x, z, r] of [[2, 3, 1.2], [-3, -8, 1], [6.5, 6, 1.4]]) { const n = 8; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, b = ((i + 1) / n) * 6.283; ctx.tri(x, 0.025, z, x + Math.cos(b) * r, 0.025, z + Math.sin(b) * r * 0.7, x + Math.cos(a) * r, 0.025, z + Math.sin(a) * r * 0.7); } }
}
export function geometry(ctx) {
  const L = ctx.lod ?? 1;
  paint(ctx, T.concrete, { col: "oklch(0.92 0.01 230)", rough: 0.9 });
  box(ctx, -W + t / 2, 0, -D + t / 2, W - t / 2, 0.02, D - t / 2);
  shell(ctx, false, L);
  if (L >= 5) return;
  RACKS.forEach((x, i) => rack(ctx, x, i, L, false));
  fallen(ctx, L, false);
  floorLoads(ctx, L, false);
  if (L <= 2) {
    // the lamp: a caged bulb on a cord from the beam
    paint(ctx, null, { col: "oklch(0.2 0.01 60)", rough: 0.6, metal: 0.3 });
    tube(ctx, [1.9, H - 0.4, 0], [1.9, 4.95, 0], 0.01, 0.01, 4, false);
    tube(ctx, [1.9, 5.0, 0], [1.9, 4.85, 0], 0.05, 0.2, 12);
    ctx.color("oklch(0.95 0.05 80)"); ctx.emissive(2.4, 1.6, 0.7);
    tube(ctx, [1.9, 4.85, 0], [1.9, 4.66, 0], 0.045, 0.035, 8);
    ctx.emissive(null);
  }
}
export function collider(ctx) {
  shell(ctx, true, 1);
  RACKS.forEach((x, i) => rack(ctx, x, i, 1, true));
  fallen(ctx, 1, true);
  floorLoads(ctx, 1, true);
  box(ctx, -W - t / 2 - 0.5, 3.4, -2.3, -W - t / 2, 4.2, 2.3);
}
