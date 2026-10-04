// A slopped tray of gutted cod on the slate: grey-silver bodies, pink cuts, a rag of guts, ice gone to water.
// params.rigged: a fuse of tarred twine poking out under the fish (you have to look). Origin = bottom centre.
import { paint, box, tube } from "./kit.js";
export function geometry(ctx) {
  const L = ctx.lod, rig = ctx.params?.rigged;
  paint(ctx, "cdn/texture-weathered-pallet-wood.png", { col: "oklch(0.7 0.03 60)", rough: 0.9 });
  box(ctx, -0.55, 0, -0.38, 0.55, 0.06, 0.38);
  for (const s of [-1, 1]) { box(ctx, -0.55, 0.06, s * 0.38 - 0.02, 0.55, 0.16, s * 0.38 + 0.02); box(ctx, s * 0.55 - 0.02, 0.06, -0.38, s * 0.55 + 0.02, 0.16, 0.38); }
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n = L <= 2 ? 7 : 4, seg = L <= 2 ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const cx = (r() - 0.5) * 0.7, cz = (r() - 0.5) * 0.45, y = 0.1 + (i % 3) * 0.05, a = r() * Math.PI, dx = Math.cos(a) * 0.22, dz = Math.sin(a) * 0.22;
    paint(ctx, null, { col: i % 2 ? "oklch(0.62 0.02 240)" : "oklch(0.52 0.03 90)", rough: 0.25, metal: 0.3 });
    tube(ctx, [cx - dx, y + 0.04, cz - dz], [cx, y + 0.06, cz], 0.012, 0.065, seg);
    tube(ctx, [cx, y + 0.06, cz], [cx + dx * 0.9, y + 0.05, cz + dz * 0.9], 0.065, 0.025, seg);
    if (L <= 2) { paint(ctx, null, { col: "oklch(0.6 0.12 15)", rough: 0.3 }); tube(ctx, [cx - dx * 0.2, y + 0.11, cz - dz * 0.2], [cx + dx * 0.5, y + 0.1, cz + dz * 0.5], 0.02, 0.015, 5); }
  }
  if (L <= 2) {
    paint(ctx, null, { col: "oklch(0.35 0.12 20)", rough: 0.2 });
    tube(ctx, [0.2, 0.12, 0.15], [0.35, 0.1, 0.22], 0.05, 0.03, 6);
    if (rig) { paint(ctx, null, { col: "oklch(0.2 0.01 60)", rough: 0.9 }); tube(ctx, [-0.5, 0.1, -0.3], [-0.62, 0.05, -0.42], 0.008, 0.008, 4); }
  }
}
