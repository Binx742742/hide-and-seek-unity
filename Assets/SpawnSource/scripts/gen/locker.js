// A tall steel utility locker, green paint peeling to rust, vent slots up top, a dented door. Big enough to stand in.
// Origin = bottom centre, door faces −Z. Hollow collider: back, sides, roof; the front is the way in.
import { T, paint, box, quad, tube } from "./kit.js";
const W = 0.46, D = 0.42, H = 2.05, t = 0.03;
export function geometry(ctx) {
  const L = ctx.lod;
  paint(ctx, T.green, { col: "oklch(0.9 0.02 150)", rough: 0.6, metal: 0.45 });
  box(ctx, -W, 0.08, D - t, W, H, D);          // back
  box(ctx, -W, 0.08, -D, -W + t, H, D);        // left
  box(ctx, W - t, 0.08, -D, W, H, D);          // right
  box(ctx, -W, H - t, -D, W, H, D);            // roof
  box(ctx, -W, 0.08, -D, W, 0.12, D);          // floor
  // the door: closed, a hair proud of the frame, a dent near the bottom
  box(ctx, -W + t, 0.12, -D - 0.02, W - t, H - t, -D + 0.005);
  if (L <= 2) {
    paint(ctx, null, { col: "oklch(0.12 0.01 150)", rough: 0.8 });
    for (let i = 0; i < 6; i++) { const y = H - 0.25 - i * 0.05; box(ctx, -0.22, y, -D - 0.03, 0.22, y + 0.018, -D - 0.015); }
    for (let i = 0; i < 4; i++) { const y = 0.32 + i * 0.05; box(ctx, -0.22, y, -D - 0.03, 0.22, y + 0.018, -D - 0.015); }
    paint(ctx, T.rust, { col: "oklch(0.8 0.04 50)", rough: 0.7, metal: 0.6 });
    tube(ctx, [W - 0.12, 0.95, -D - 0.06], [W - 0.12, 1.2, -D - 0.06], 0.015, 0.015, 6);
    box(ctx, W - 0.15, 1.0, -D - 0.06, W - 0.09, 1.16, -D - 0.025);
    // feet
    for (const x of [-W + 0.05, W - 0.05]) for (const z of [-D + 0.05, D - 0.05]) box(ctx, x - 0.03, 0, z - 0.03, x + 0.03, 0.08, z + 0.03);
    // a stencilled number
    paint(ctx, null, { col: "oklch(0.85 0.05 85)", rough: 0.8 });
    box(ctx, -0.12, 1.55, -D - 0.025, 0.12, 1.6, -D - 0.022);
  }
}
export function collider(ctx) {
  box(ctx, -W, 0, D - 0.06, W, H, D);
  box(ctx, -W, 0, -D, -W + 0.06, H, D);
  box(ctx, W - 0.06, 0, -D, W, H, D);
  box(ctx, -W, H - 0.06, -D, W, H, D);
}
