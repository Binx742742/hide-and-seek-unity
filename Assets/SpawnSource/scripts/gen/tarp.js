// A heap of oily canvas tarp thrown over nets and crates, edges pooling on the slate, ropes slack. Big enough to crawl under.
// Origin = bottom centre. No collider: a body pushes in under it.
import { paint } from "./kit.js";
function blob(ctx, c, rx, ry, rz, sd, nl, nm) {
  const P = (i, j) => { const ph = (i / nl) * Math.PI / 2, th = (j / nm) * Math.PI * 2, sp = Math.sin(ph);
    const k = 1 + sp * (0.14 * Math.sin(th * 3 + sd) * Math.sin(ph * 3 + sd * 1.7) + 0.06 * Math.sin(th * 7 + sd * 2.3));
    return [c[0] + rx * k * Math.cos(th) * sp, c[1] + ry * Math.cos(ph) * (1 + 0.08 * Math.sin(th * 2 + sd) * sp), c[2] + rz * k * Math.sin(th) * sp]; };
  for (let i = 0; i < nl; i++) for (let j = 0; j < nm; j++) {
    const a = P(i, j), b = P(i, j + 1), cc = P(i + 1, j + 1), d = P(i + 1, j);
    ctx.quad(a[0], a[1], a[2], d[0], d[1], d[2], cc[0], cc[1], cc[2], b[0], b[1], b[2]);
  }
}
export function geometry(ctx) {
  const L = ctx.lod, nl = L <= 2 ? 7 : 3, nm = L <= 2 ? 16 : 8, sd = (ctx.seed ?? 1) * 1.3;
  paint(ctx, "cdn/texture-oily-dark-blue-canvas-tarp-creased.png", { col: "oklch(0.85 0.03 240)", rough: 0.75 });
  ctx.smooth();
  blob(ctx, [0, 0, 0], 1.25, 1.15, 1.0, sd, nl, nm);
  if (L <= 2) blob(ctx, [0.8, 0, 0.5], 0.6, 0.5, 0.55, sd + 2, 5, 10);
  ctx.flat();
}
