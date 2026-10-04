// A pebble: a plant file that grows no plant (heightmap-terrain skill, decorations). The `pebble`
// layer in places/main/config.yaml scatters it thinly on the grass, sized by the item's `scale` and
// turned by `randomRotation`; the item's `params` colour it (stone). Feet at y = 0, +Y up: a low
// six-sided stone: a ground ring, a shoulder ring and a crown, each ring nudged by ctx.random so no
// two items are the same shape. A decoration has no collider: a rock a player must climb is a
// scatter bed. Every number here is yours to move.
export function geometry(ctx) {
  const { stone = 'oklch(0.6 0.02 80)' } = ctx.params;
  ctx.color(stone);
  const sides = 6;
  const foot = [];
  const shoulder = [];
  for (let i = 0; i < sides; i++) {
    const t = (i / sides) * Math.PI * 2;
    const r0 = 0.09 * (0.85 + ctx.random() * 0.3);
    const r1 = r0 * (0.55 + ctx.random() * 0.25);
    foot.push([Math.cos(t) * r0, 0, Math.sin(t) * r0]);
    shoulder.push([Math.cos(t) * r1, 0.05, Math.sin(t) * r1]);
  }
  const crown = [(ctx.random() - 0.5) * 0.03, 0.08, (ctx.random() - 0.5) * 0.03];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const a = foot[i];
    const b = foot[j];
    const c = shoulder[j];
    const d = shoulder[i];
    ctx.quad(a[0], a[1], a[2], d[0], d[1], d[2], c[0], c[1], c[2], b[0], b[1], b[2]);
    ctx.tri(d[0], d[1], d[2], crown[0], crown[1], crown[2], c[0], c[1], c[2]);
  }
}
