// A clinker-built dinghy left upturned on trestles, keel to the sky, paint flaking, a gap underneath a body can crawl into.
// Origin = bottom centre, bow toward −Z. Hollow collider: the hull's sides and keel; underneath is open.
import { T, paint, quad, box } from "./kit.js";
const LEN = 1.75, B = 0.8, Hh = 1.05, G = 0.32; // half length, half beam, hull height, gap under the gunwale
function hull(z) { const t = Math.abs(z) / LEN; return { w: B * Math.sqrt(Math.max(0, 1 - t * t * (z < 0 ? 1 : 0.7))) + 0.02, k: Hh * (1 - 0.15 * t * t) }; }
export function geometry(ctx) {
  const L = ctx.lod, n = L <= 2 ? 12 : 6, m = L <= 2 ? 6 : 3;
  paint(ctx, T.hull, { col: "oklch(0.92 0.02 30)", rough: 0.85 });
  for (let i = 0; i < n; i++) {
    const z0 = -LEN + (2 * LEN * i) / n, z1 = -LEN + (2 * LEN * (i + 1)) / n, a = hull(z0), b = hull(z1);
    for (const s of [-1, 1]) for (let j = 0; j < m; j++) {
      const u0 = j / m, u1 = (j + 1) / m;
      const p = (h, u) => [s * h.w * Math.cos(u * Math.PI / 2), G + 0.75 + (h.k - 0.75) * Math.sin(u * Math.PI / 2) - (1 - Math.sin(u * Math.PI / 2)) * 0.6, 0];
      const A = p(a, u0), Bq = p(a, u1), C = p(b, u1), D = p(b, u0);
      quad(ctx, [A[0], A[1], z0], [Bq[0], Bq[1], z0], [C[0], C[1], z1], [D[0], D[1], z1], [s, 0.4, 0]);
      quad(ctx, [A[0], A[1], z0], [Bq[0], Bq[1], z0], [C[0], C[1], z1], [D[0], D[1], z1], [-s, -0.4, 0]); // the inside, seen from under
    }
  }
  paint(ctx, T.timber ?? T.pallet, { col: "oklch(0.55 0.03 60)", rough: 0.9 });
  box(ctx, -0.04, Hh + G - 0.02, -LEN, 0.04, Hh + G + 0.07, LEN * 0.95); // keel
  for (const z of [-1.1, 1.1]) { box(ctx, -0.95, G - 0.08, z - 0.06, 0.95, G, z + 0.06); for (const x of [-0.8, 0.8]) box(ctx, x - 0.05, 0, z - 0.05, x + 0.05, G - 0.08, z + 0.05); } // trestles
}
export function collider(ctx) {
  for (const s of [-1, 1]) box(ctx, s * B - 0.06, G, -LEN * 0.9, s * B + 0.06, G + 0.8, LEN * 0.9);
  box(ctx, -B, Hh + G - 0.1, -LEN * 0.9, B, Hh + G, LEN * 0.9);
}
