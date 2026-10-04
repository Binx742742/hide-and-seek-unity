// A reed: a plant file (heightmap-terrain skill, decorations). The `reed` layer in
// places/main/config.yaml scatters it among the blades, sized by the item's `scale`, turned by
// `randomRotation` and bent in the wind by the item's `wind`; the item's `params` colour it (stem,
// head). Feet at y = 0, +Y up: two crossed stem quads a metre tall and a slim four-sided seed head
// riding the tip whole. Every number here is yours to move.
export function geometry(ctx) {
  const { stem = 'oklch(0.62 0.1 110)', head = 'oklch(0.45 0.06 60)' } = ctx.params;
  const h = 1.0;
  const w = 0.01;
  ctx.color(stem);
  for (let p = 0; p < 2; p++) {
    const v = (x, y, z) => (p === 0 ? [x, y, z] : [z, y, -x]);
    const a = v(-w, 0, 0);
    const b = v(w, 0, 0);
    const c = v(w * 0.5, h, 0);
    const d = v(-w * 0.5, h, 0);
    ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }
  ctx.sway(1);
  ctx.color(head);
  const r = 0.014;
  const top = h + 0.14;
  for (let i = 0; i < 4; i++) {
    const t0 = (i / 4) * Math.PI * 2;
    const t1 = ((i + 1) / 4) * Math.PI * 2;
    ctx.tri(Math.cos(t0) * r, h, Math.sin(t0) * r, 0, top, 0, Math.cos(t1) * r, h, Math.sin(t1) * r);
  }
}
