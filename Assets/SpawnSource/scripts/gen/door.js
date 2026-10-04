// A door leaf. Origin at the HINGE, bottom: the leaf runs +x from 0 to w, its face centred on z 0,
// so a yaw about the origin swings it on its hinge edge. kinds:
//   plank: tar-black boards, a Z brace, strap hinges and a ring pull (cottages, sheds, chapel)
//   grate: a rusted iron gate of bars in a frame (the drains); you see through it
//   panel: dark wainscot panelling that matches a wall: the secret door (it slides, never swings)
import { T, paint, box, obox, tube } from "./kit.js";
export function geometry(ctx) {
  const { kind = "plank", w = 1.2, h = 2.25 } = ctx.params, L = ctx.lod ?? 1;
  if (kind === "grate") return grate(ctx, w, h, L);
  if (kind === "panel") return panel(ctx, w, h, L);
  const t = 0.06;
  paint(ctx, T.timber, { col: "oklch(0.9 0.02 60)", rough: 0.9 });
  const n = Math.max(4, Math.round(w / 0.2)), bw = w / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * bw + 0.004, x1 = (i + 1) * bw - 0.004, sag = L <= 2 ? ((i * 37) % 5) * 0.004 : 0;
    box(ctx, x0, 0.02 + sag, -t / 2, x1, h - sag, t / 2);
  }
  if (L >= 4) return;
  // the ledges and the brace, on the inside (+z) face
  paint(ctx, T.timber, { col: "oklch(0.8 0.02 60)", rough: 0.9 });
  for (const y of [0.3, h - 0.35]) box(ctx, 0.06, y, t / 2, w - 0.06, y + 0.14, t / 2 + 0.03);
  const ang = (Math.atan2(h - 0.95, w - 0.2) * 180) / Math.PI;
  obox(ctx, [w / 2, h / 2, t / 2 + 0.015], [Math.hypot(w - 0.2, h - 0.95) / 2, 0.065, 0.015], 0, 0, ang);
  // strap hinges on the outside (−z) face, the ring pull and a keyhole plate on the latch side
  paint(ctx, T.rust, { col: "oklch(0.55 0.03 40)", rough: 0.6, metal: 0.7 });
  for (const y of [0.42, h - 0.42]) box(ctx, 0, y - 0.03, -t / 2 - 0.012, w * 0.62, y + 0.03, -t / 2);
  for (const y of [0.42, h - 0.42]) tube(ctx, [0.0, y - 0.07, -t / 2 - 0.02], [0.0, y + 0.07, -t / 2 - 0.02], 0.018, 0.018, 6);
  box(ctx, w - 0.2, 0.92, -t / 2 - 0.01, w - 0.1, 1.12, -t / 2);
  if (L <= 2) {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, b = ((i + 1) / 10) * Math.PI * 2, c = [w - 0.15, 1.02, -t / 2 - 0.04];
      tube(ctx, [c[0] + Math.cos(a) * 0.06, c[1] + Math.sin(a) * 0.06, c[2]], [c[0] + Math.cos(b) * 0.06, c[1] + Math.sin(b) * 0.06, c[2]], 0.008, 0.008, 4, false); }
    // nail heads, black with rain
    paint(ctx, null, { col: "oklch(0.18 0.01 40)", rough: 0.5, metal: 0.6 });
    for (const y of [0.37, h - 0.28]) for (let i = 0; i < n; i++) box(ctx, i * bw + bw / 2 - 0.008, y - 0.008, t / 2 + 0.03, i * bw + bw / 2 + 0.008, y + 0.008, t / 2 + 0.034);
  }
}
function grate(ctx, w, h, L) {
  paint(ctx, T.rust, { col: "oklch(0.7 0.03 40)", rough: 0.55, metal: 0.75 });
  const f = 0.05;
  box(ctx, 0, 0, -f / 2, f, h, f / 2); box(ctx, w - f, 0, -f / 2, w, h, f / 2);
  box(ctx, f, 0, -f / 2, w - f, f, f / 2); box(ctx, f, h - f, -f / 2, w - f, h, f / 2);
  box(ctx, f, h * 0.48, -f / 2, w - f, h * 0.48 + 0.04, f / 2);
  const n = Math.round(w / 0.13);
  for (let i = 1; i < n; i++) { const x = (i / n) * w; tube(ctx, [x, f, 0], [x, h - f, 0], 0.014, 0.014, L <= 2 ? 6 : 4, false); }
  if (L <= 2) { // the chain hasp on the latch stile
    box(ctx, w - 0.12, 1.0, -0.06, w - 0.02, 1.16, -f / 2);
  }
}
function panel(ctx, w, h, L) {
  const t = 0.08;
  paint(ctx, T.floorboards, { col: "oklch(0.62 0.04 50)", rough: 0.75 });
  box(ctx, 0, 0, -t / 2, w, h, t / 2);
  if (L >= 4) return;
  paint(ctx, T.floorboards, { col: "oklch(0.55 0.04 50)", rough: 0.7 });
  // raised fields and a dado rail on the room (−z) side, so it reads as the wall it hides in
  const cols = Math.max(1, Math.round(w / 0.6)), cw = w / cols;
  for (let i = 0; i < cols; i++) {
    box(ctx, i * cw + 0.08, 0.15, -t / 2 - 0.02, (i + 1) * cw - 0.08, 0.9, -t / 2);
    box(ctx, i * cw + 0.08, 1.1, -t / 2 - 0.02, (i + 1) * cw - 0.08, h - 0.15, -t / 2);
  }
  box(ctx, 0, 0.95, -t / 2 - 0.04, w, 1.03, -t / 2);
  box(ctx, 0, 0, -t / 2 - 0.03, w, 0.12, -t / 2);
}
export function collider(ctx) {
  const { kind = "plank", w = 1.2, h = 2.25 } = ctx.params, t = kind === "grate" ? 0.06 : 0.1;
  box(ctx, 0, 0, -t / 2, w, h, t / 2);
}
