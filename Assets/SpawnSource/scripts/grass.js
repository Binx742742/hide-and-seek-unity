// The meadow's blade: the plant IS this file (heightmap-terrain skill, decorations). The layer in
// places/main/config.yaml scatters it 50 to the square metre on the grass material, varies each
// blade's size by the item's `scale`, turns each one by `randomRotation`, bends it in the wind by
// the item's `wind`, and hands its look to scripts/grass-look.js. Rewrite the shape here and every
// blade changes live; delete the layer and the meadow is gone.
// One blade, feet at y = 0, +Y up: two planes crossed at the root, so the blade reads from every
// heading (one plane seen edge-on vanishes); each plane is one quad, wide at the foot, narrow at
// the tip, leaning a little forward. Four triangles a blade. The engine bends it about its feet;
// each vertex takes the bend in proportion to its height: ctx.sway(w) sets that fraction by hand
// for wheat heads and reeds. The vertex colour is the fallback when no look script is set.
export function geometry(ctx) {
  const h = 0.55;
  const w = 0.04;
  const tip = 0.15;
  const lean = 0.08;
  ctx.color('oklch(0.62 0.14 140)');
  // Plane 0 faces +Z; plane 1 is the same quad turned 90° about +Y.
  for (let p = 0; p < 2; p++) {
    const v = (x, y, z) => (p === 0 ? [x, y, z] : [z, y, -x]);
    const a = v(-w, 0, 0);
    const b = v(w, 0, 0);
    const c = v(w * tip, h, lean);
    const d = v(-w * tip, h, lean);
    ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }
}
