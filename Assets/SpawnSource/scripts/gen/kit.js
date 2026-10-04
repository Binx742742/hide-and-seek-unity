// Gullmouth building kit: the shared modelling helpers every scripts/gen/<building>.js draws with.
// Every face is wound from an outward direction (never eyeballed): quad/tri flip themselves to face n.
export const T = {
  concrete: "cdn/texture-stained-concrete-floor.png",
  corrugated: "cdn/texture-rusted-corrugated-sheet-metal.png",
  timber: "cdn/texture-weathered-tar-black-timber-planks.png",
  green: "cdn/texture-peeling-green-paint-on-steel.png",
  stainless: "cdn/texture-scratched-stained-stainless-steel.png",
  rust: "cdn/texture-rusted-steel-plate.png",
  rubber: "cdn/texture-worn-black-rubber-conveyor-belt.png",
  rope: "cdn/texture-salt-bleached-fishing-net-rope.png",
  hull: "cdn/texture-rotting-painted-boat-planks.png",
  panel: "cdn/texture-dirty-white-insulated-cold-storage-panel.png",
  boxes: "cdn/texture-shrink-wrapped-cardboard-boxes.png",
  pallet: "cdn/texture-weathered-pallet-wood.png",
  rackPaint: "cdn/texture-chipped-orange-paint-rusted-steel.png",
  cinder: "cdn/texture-grey-cinder-block.png",
  siding: "cdn/texture-rusted-white-trailer-siding.png",
  lino: "cdn/texture-worn-cracked-linoleum-floor.png",
  paper: "cdn/texture-yellowed-typed-paper-documents.png",
  floorboards: "cdn/texture-old-oily-timber-floorboards.png",
  slate: "cdn/texture-wet-dark-slate-roof-tiles.png",
};
export const LAMP = "oklch(0.82 0.12 70)";
const S = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const X = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const D = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const N = (u) => { const l = Math.hypot(u[0], u[1], u[2]) || 1; return [u[0] / l, u[1] / l, u[2] / l]; };
export const mid = (ps) => { let x = 0, y = 0, z = 0; for (const p of ps) { x += p[0]; y += p[1]; z += p[2]; } const n = ps.length; return [x / n, y / n, z / n]; };

export function paint(ctx, tex, { col = "oklch(0.95 0.01 80)", rough = 0.85, metal = 0, a } = {}) {
  ctx.albedo(tex ?? null);
  if (a !== undefined) ctx.color(col, a); else ctx.color(col);
  ctx.roughness(rough); ctx.metalness(metal);
}
export function quad(ctx, a, b, c, d, n) {
  if (D(X(S(b, a), S(c, a)), n) >= 0) ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  else ctx.quad(d[0], d[1], d[2], c[0], c[1], c[2], b[0], b[1], b[2], a[0], a[1], a[2]);
}
export function tri(ctx, a, b, c, n) {
  if (D(X(S(b, a), S(c, a)), n) >= 0) ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  else ctx.tri(c[0], c[1], c[2], b[0], b[1], b[2], a[0], a[1], a[2]);
}
// 8 points: 0-3 the bottom ring, 4-7 the top ring in the same order. skip: face indices (0 bottom, 1 top, 2-5 sides)
const HF = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
export function hexa(ctx, P, skip) {
  const C = mid(P);
  HF.forEach((f, i) => { if (skip && skip.includes(i)) return; const q = f.map((k) => P[k]); quad(ctx, q[0], q[1], q[2], q[3], S(mid(q), C)); });
}
export function box(ctx, x0, y0, z0, x1, y1, z1, skip) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1), e = Math.min(z0, z1), f = Math.max(z0, z1);
  if (b - a < 1e-4 || d - c < 1e-4 || f - e < 1e-4) return;
  hexa(ctx, [[a, c, e], [b, c, e], [b, c, f], [a, c, f], [a, d, e], [b, d, e], [b, d, f], [a, d, f]], skip);
}
export function rot(p, yaw = 0, pitch = 0, roll = 0) {
  const r = Math.PI / 180; let [x, y, z] = p, c, s;
  c = Math.cos(roll * r); s = Math.sin(roll * r); [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(pitch * r); s = Math.sin(pitch * r); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(yaw * r); s = Math.sin(yaw * r); [x, z] = [x * c + z * s, -x * s + z * c];
  return [x, y, z];
}
// an oriented box about its centre c, half-extents h, turned yaw/pitch/roll (degrees)
export function obox(ctx, c, h, yaw = 0, pitch = 0, roll = 0) {
  hexa(ctx, [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]].map(([a, b, d]) => {
    const q = rot([a * h[0], b * h[1], d * h[2]], yaw, pitch, roll); return [q[0] + c[0], q[1] + c[1], q[2] + c[2]];
  }));
}
// a part of a group turned as one (a tipped chair): centre and corners both ride the group's rotation
export function gbox(ctx, origin, c, h, yaw = 0, pitch = 0, roll = 0) {
  const q = rot(c, yaw, pitch, roll); obox(ctx, [origin[0] + q[0], origin[1] + q[1], origin[2] + q[2]], h, yaw, pitch, roll);
}
// a bar or a pipe from p0 to p1 (n = 4 is a square bar)
export function tube(ctx, p0, p1, r0, r1 = r0, n = 8, caps = true) {
  const a = N(S(p1, p0)), up = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = N(X(a, up)), v = X(a, u);
  const ring = (p, r) => { const o = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + Math.PI / n, cs = Math.cos(t), sn = Math.sin(t); o.push([p[0] + (u[0] * cs + v[0] * sn) * r, p[1] + (u[1] * cs + v[1] * sn) * r, p[2] + (u[2] * cs + v[2] * sn) * r]); } return o; };
  const A = ring(p0, r0), B = ring(p1, r1);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, q = [A[i], A[j], B[j], B[i]], m = mid(q), k = D(S(m, p0), a);
    quad(ctx, q[0], q[1], q[2], q[3], S(m, [p0[0] + a[0] * k, p0[1] + a[1] * k, p0[2] + a[2] * k]));
  }
  if (caps) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (r0 > 0) tri(ctx, p0, A[i], A[j], [-a[0], -a[1], -a[2]]);
    if (r1 > 0) tri(ctx, p1, B[i], B[j], a);
  }
}
// a flat ring (a vat's lip) at height y
export function annulus(ctx, x, y, z, r0, r1, n) {
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI * 2 + Math.PI / n, t1 = ((i + 1) / n) * Math.PI * 2 + Math.PI / n;
    quad(ctx, [x + Math.cos(t0) * r0, y, z + Math.sin(t0) * r0], [x + Math.cos(t1) * r0, y, z + Math.sin(t1) * r0], [x + Math.cos(t1) * r1, y, z + Math.sin(t1) * r1], [x + Math.cos(t0) * r1, y, z + Math.sin(t0) * r1], [0, 1, 0]);
  }
}
// a wall on the line `at` (z = at when along "x", x = at when along "z"), from..to, y0..y1, thickness t,
// holes [{ c, w, sill, h }] cut whole through it: column by column, solid wherever no hole covers.
export function wall(ctx, along, at, from, to, y0, y1, t, holes = []) {
  const piece = (a, b, ya, yb) => { if (b - a < 1e-3 || yb - ya < 1e-3) return; if (along === "x") box(ctx, a, ya, at - t / 2, b, yb, at + t / 2); else box(ctx, at - t / 2, ya, a, at + t / 2, yb, b); };
  const xs = [from, to]; for (const h of holes) xs.push(h.c - h.w / 2, h.c + h.w / 2);
  const s = [...new Set(xs.filter((x) => x >= from && x <= to))].sort((p, q) => p - q);
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1], m = (a + b) / 2;
    const cov = holes.filter((h) => Math.abs(m - h.c) < h.w / 2).map((h) => [h.sill ?? y0, (h.sill ?? y0) + h.h]).sort((p, q) => p[0] - q[0]);
    let y = y0;
    for (const [s0, e0] of cov) { if (s0 > y) piece(a, b, y, Math.min(s0, y1)); y = Math.max(y, e0); }
    if (y < y1) piece(a, b, y, y1);
  }
}
const P2 = (along, at, u, y, d = 0) => (along === "x" ? [u, y, at + d] : [at + d, y, u]);
// a frame round a hole, standing proud of both faces, never inside the clear opening
export function trim(ctx, along, at, h, t, k = 0.08) {
  const sill = h.sill ?? 0, L = h.c - h.w / 2, R = h.c + h.w / 2, top = sill + h.h, d = t / 2 + 0.03;
  const p = (a, b, ya, yb) => { const A = P2(along, at, a, ya, -d), B = P2(along, at, b, yb, d); box(ctx, A[0], A[1], A[2], B[0], B[1], B[2]); };
  p(L - k, L, sill, top); p(R, R + k, sill, top); p(L - k, R + k, top, top + k);
  if (sill > 0.05) p(L - k - 0.04, R + k + 0.04, sill - 0.05, sill);
}
// broken panes: jagged shards left in a window's frame (translucent, so no shadow)
export function shards(ctx, along, at, h, rnd) {
  const sill = h.sill ?? 0, L = h.c - h.w / 2, R = h.c + h.w / 2, top = sill + h.h, n = along === "x" ? [0, 0, 1] : [1, 0, 0];
  paint(ctx, null, { col: "oklch(0.8 0.03 210)", a: 0.28, rough: 0.05 });
  const edges = [[[L, sill], [R, sill], [0, 1]], [[L, top], [R, top], [0, -1]], [[L, sill], [L, top], [1, 0]], [[R, sill], [R, top], [-1, 0]]];
  for (const [a, b, dir] of edges) {
    if (rnd() < 0.3) continue;
    const cnt = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < cnt; i++) {
      const f0 = rnd() * 0.7, f1 = f0 + 0.1 + rnd() * 0.25, fm = (f0 + f1) / 2 + (rnd() - 0.5) * 0.1, depth = 0.1 + rnd() * 0.35;
      const lp = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const p0 = lp(f0), p1 = lp(Math.min(1, f1)), pm = lp(fm), sp = Math.min(h.w, h.h) * depth;
      tri(ctx, P2(along, at, p0[0], p0[1]), P2(along, at, p1[0], p1[1]), P2(along, at, pm[0] + dir[0] * sp, pm[1] + dir[1] * sp), n);
    }
  }
}
// a convex outline [[u, y], …] in the wall plane, extruded t thick: a gable, a trapezoid
export function prism(ctx, along, at, pts, t) {
  const F = pts.map(([u, y]) => P2(along, at, u, y, -t / 2)), B = pts.map(([u, y]) => P2(along, at, u, y, t / 2)), C = mid([...F, ...B]);
  const nf = along === "x" ? [0, 0, -1] : [-1, 0, 0], nb = [-nf[0], -nf[1], -nf[2]];
  for (let i = 1; i < pts.length - 1; i++) { tri(ctx, F[0], F[i], F[i + 1], nf); tri(ctx, B[0], B[i], B[i + 1], nb); }
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length, q = [F[i], F[j], B[j], B[i]]; quad(ctx, q[0], q[1], q[2], q[3], S(mid(q), C)); }
}
// a puddle: a dark glossy film just over the floor
export function puddle(ctx, x, y, z, r, rnd) {
  const n = 9, pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, rr = r * (0.6 + rnd() * 0.5); pts.push([x + Math.cos(t) * rr, y, z + Math.sin(t) * rr * 0.7]); }
  for (let i = 0; i < n; i++) tri(ctx, [x, y, z], pts[i], pts[(i + 1) % n], [0, 1, 0]);
}
// a caged work-lamp hung on a cord from `top` to the bulb at p (the light itself is the root's child)
export function cageLamp(ctx, p, top, L) {
  const [x, y, z] = p;
  paint(ctx, null, { col: "oklch(0.2 0.01 60)", rough: 0.6, metal: 0.3 });
  tube(ctx, [x, top, z], [x, y + 0.2, z], 0.01, 0.01, 4, false);
  tube(ctx, [x, y + 0.22, z], [x, y + 0.08, z], 0.05, 0.2, 12, true);
  if (L <= 2) for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2, cx = Math.cos(t) * 0.11, cz = Math.sin(t) * 0.11;
    tube(ctx, [x + cx * 1.5, y + 0.09, z + cz * 1.5], [x + cx, y - 0.16, z + cz], 0.007, 0.007, 3, false);
  }
  ctx.albedo(null); ctx.color("oklch(0.95 0.05 80)"); ctx.emissive(3.2, 2.1, 0.9);
  tube(ctx, [x, y + 0.08, z], [x, y - 0.1, z], 0.045, 0.035, 8, true);
  ctx.emissive(null);
}
