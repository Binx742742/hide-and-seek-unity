// The Saltgate storm drains, in WORLD coordinates (place the root at 0,0,0, no rotation).
// Floor y 0, brick vault to y 3 under the bluff (whose ground is y 4). One mouth into the yard (x -43.4, z 26),
// three stairs up through holes in the town ground: west (x -111.4..-103.6), chapel (z 77.6..85.4), south (z -29.4..-21.6).
// Built on a 1 m cell grid: every corridor or stair cell gets a floor; a side with no neighbour gets a wall.
import { T, paint, box, quad } from "./kit.js";
const H = 3, TOP = 4.05, WT = 0.35;
// corridors [x0, x1, z0, z1]
const RUNS = [[-104, -43, 24, 28], [-84, -80, 28, 78], [-62, -58, -22, 24]];
// stairs: cells rise from y 0 to 4 along a direction: [x0, x1, z0, z1, axis, sign] (sign: which way is up)
const STAIRS = [[-112, -104, 24, 28, "x", -1], [-84, -80, 78, 86, "z", 1], [-62, -58, -30, -22, "z", -1]];
const key = (x, z) => x + "," + z;
function cells() {
  const m = new Map();
  for (const [x0, x1, z0, z1] of RUNS) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) m.set(key(x, z), { x, z, y: 0, roof: true });
  for (const [x0, x1, z0, z1, ax, sg] of STAIRS) {
    const n = ax === "x" ? x1 - x0 : z1 - z0;
    for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
      const i = ax === "x" ? (sg > 0 ? x - x0 : x1 - 1 - x) : (sg > 0 ? z - z0 : z1 - 1 - z);
      m.set(key(x, z), { x, z, y: ((i + 1) / n) * 4, stair: true, i, n, ax, sg });
    }
  }
  return m;
}
const MOUTH = -44; // cells east of this are the culvert mouth (open to the yard on the east)
function build(ctx, coll) {
  const m = cells(), L = ctx.lod ?? 1, rnd = () => ctx.random();
  if (!coll && L >= 3) { paint(ctx, T.concrete, { col: "oklch(0.55 0.02 220)", rough: 0.9 }); box(ctx, -43.4, 2.9, 23.4, -42.9, 4.4, 28.6); box(ctx, -43.4, 0, 23.4, -42.9, 4.4, 24); box(ctx, -43.4, 0, 28, -42.9, 4.4, 28.6); box(ctx, -44, 3, 24, -43.4, 3.35, 28); return; } // underground: far away only the culvert face shows
  // floors and steps
  if (!coll) paint(ctx, T.concrete, { col: "oklch(0.62 0.02 220)", rough: 0.95 });
  for (const c of m.values()) {
    if (!c.stair) box(ctx, c.x, -0.3, c.z, c.x + 1, 0, c.z + 1, coll ? undefined : [0, 2, 3, 4, 5]);
    else {
      // two treads per cell: 0.5 m deep, rising 0.25 each
      for (let k = 0; k < 2; k++) {
        const y = c.y - (1 - k) * (4 / c.n / 2);
        const a = c.ax === "x" ? (c.sg > 0 ? c.x + k * 0.5 : c.x + 1 - (k + 1) * 0.5) : c.x, b = c.ax === "x" ? a + 0.5 : c.x + 1;
        const e = c.ax === "z" ? (c.sg > 0 ? c.z + k * 0.5 : c.z + 1 - (k + 1) * 0.5) : c.z, f = c.ax === "z" ? e + 0.5 : c.z + 1;
        box(ctx, a, -0.3, e, b, y, f);
      }
    }
  }
  // walls: a side with no neighbour cell
  if (!coll) paint(ctx, T.cinder, { col: "oklch(0.55 0.04 40)", rough: 0.95 });
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const c of m.values()) for (const [dx, dz] of dirs) {
    if (m.has(key(c.x + dx, c.z + dz))) continue;
    if (dx === 1 && c.x + 1 > MOUTH) continue; // the mouth stays open
    const top = c.stair ? TOP : (c.x >= -49 ? H + 1.2 : H);
    if (dx === 1) box(ctx, c.x + 1, 0, c.z, c.x + 1 + WT, top, c.z + 1);
    if (dx === -1) box(ctx, c.x - WT, 0, c.z, c.x, top, c.z + 1);
    if (dz === 1) box(ctx, c.x, 0, c.z + 1, c.x + 1, top, c.z + 1 + WT);
    if (dz === -1) box(ctx, c.x, 0, c.z - WT, c.x + 1, top, c.z);
  }
  // the vault: a roof slab over every corridor cell, a hair below the bluff
  if (!coll) paint(ctx, T.concrete, { col: "oklch(0.4 0.02 220)", rough: 0.95 });
  for (const c of m.values()) if (c.roof) box(ctx, c.x - 0.02, H, c.z - 0.02, c.x + 1.02, H + 0.35, c.z + 1.02);
  if (coll) return;
  // the headwall over the mouth: weathered concrete with the year cast in
  paint(ctx, T.concrete, { col: "oklch(0.55 0.02 220)", rough: 0.9 });
  box(ctx, -43.4, 2.9, 23.4, -42.9, 4.4, 28.6);
  box(ctx, -43.4, 0, 23.4, -42.9, 4.4, 24); box(ctx, -43.4, 0, 28, -42.9, 4.4, 28.6);
  if (L >= 4) return;
  // the gutter: a dark wet channel down the middle of each run, and slime streaks on the walls
  paint(ctx, null, { col: "oklch(0.2 0.03 180)", rough: 0.05, metal: 0.1 });
  for (const [x0, x1, z0, z1] of RUNS) {
    if (x1 - x0 > z1 - z0) { const zc = (z0 + z1) / 2; quad(ctx, [x0, 0.012, zc - 0.35], [x1, 0.012, zc - 0.35], [x1, 0.012, zc + 0.35], [x0, 0.012, zc + 0.35], [0, 1, 0]); }
    else { const xc = (x0 + x1) / 2; quad(ctx, [xc - 0.35, 0.012, z0], [xc + 0.35, 0.012, z0], [xc + 0.35, 0.012, z1], [xc - 0.35, 0.012, z1], [0, 1, 0]); }
  }
  paint(ctx, null, { col: "oklch(0.3 0.05 140)", rough: 0.4 });
  for (const c of m.values()) if (c.roof && rnd() < 0.18) {
    const h = 0.8 + rnd() * 1.8;
    if (!m.has(key(c.x, c.z - 1))) box(ctx, c.x + rnd() * 0.6, 0.02, c.z - 0.01, c.x + 0.15 + rnd() * 0.6, h, c.z + 0.005);
    if (!m.has(key(c.x, c.z + 1))) box(ctx, c.x + rnd() * 0.6, 0.02, c.z + 0.995, c.x + 0.15 + rnd() * 0.6, h, c.z + 1.01);
  }
  // pipes along the main run's north wall, rust bands every few metres
  paint(ctx, T.rust, { col: "oklch(0.6 0.05 45)", rough: 0.6, metal: 0.6 });
  box(ctx, -103.8, 2.35, 27.7, -44.2, 2.55, 27.95);
  for (let x = -100; x < -45; x += 4) box(ctx, x, 2.3, 27.6, x + 0.1, 2.6, 28);
  // rubbish washed into the corners: planks, a boot, bottles
  paint(ctx, T.timber, { col: "oklch(0.7 0.02 60)", rough: 0.95 });
  for (const c of m.values()) if (c.roof && rnd() < 0.05) box(ctx, c.x + 0.1, 0, c.z + 0.1 + rnd() * 0.5, c.x + 0.9, 0.05, c.z + 0.25 + rnd() * 0.5);
}
export function geometry(ctx) { build(ctx, false); }
export function collider(ctx) { build(ctx, true); }
