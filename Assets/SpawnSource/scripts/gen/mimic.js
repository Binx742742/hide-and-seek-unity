// The Mimic's true shape: a lanky, hunched tar-black thing whose head is a split fish crate.
// Origin at its feet, faces -Z. The crate lid is the jaw (bone "jaw", hinge at the crate's back top edge):
// self.bones.jaw.pitch > 0 opens it wider. No collider: it rides a character capsule.
const TAR = "oklch(0.16 0.02 20)", TAR_WET = "oklch(0.2 0.025 20)", BONE = "oklch(0.85 0.03 80)";
const CLAW = "oklch(0.62 0.04 70)", RUST = "oklch(0.4 0.09 45)", MAW = "oklch(0.5 0.2 25)";
const PLANK = "cdn/texture-weathered-wooden-shipping-crate-planks.png";
// head (crate) frame: origin at the lower box's bottom centre
const HEAD = [0, 1.38, -0.66], W = 0.56, HB = 0.33, D = 0.58, OPEN = 44, TILT = 16; // TILT: the crate tips its maw up toward what it faces
const HINGE = [0, HB, D / 2]; // head-local
export function skeleton() {
  return { root: { pivot: [0, 1, 0] }, jaw: { parent: "root", pivot: headF(HINGE) } };
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const Q = (ctx, a, b, c, d) => ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
const T3 = (ctx, a, b, c) => ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
const rotX = (p, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
const headF = (p) => add(rotX(p, TILT), HEAD);
const lidF = (p) => headF(add(rotX(p, OPEN), HINGE)); // lid-local: hinge at origin, lid runs z 0..-D

function catmull(P, R, per) {
  const pts = [], rads = [], n = P.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n - 1)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      rads.push(R[i] + (R[i + 1] - R[i]) * t);
    }
  }
  pts.push(P[n - 1]); rads.push(R[n - 1]);
  return { pts, rads };
}
// a tube along pts; frame v = ref projected off the tangent, u = v × T (so u × v = T: faces wind outward)
function tube(ctx, pts, rads, segs, ref, o = {}) {
  const rx = o.rx ?? 1, rz = o.rz ?? 1, n = pts.length, rings = [], frames = [];
  for (let i = 0; i < n; i++) {
    const T = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
    let f = sub(ref, mul(T, dot(ref, T)));
    if (len(f) < 1e-3) f = sub([0.31, 0.5, 0.81], mul(T, dot([0.31, 0.5, 0.81], T)));
    const v = norm(f), u = cross(v, T), ring = [];
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2, r = rads[i] * (o.prof ? o.prof(i, th) : 1);
      ring.push(add(pts[i], add(mul(u, Math.cos(th) * r * rx), mul(v, Math.sin(th) * r * rz))));
    }
    rings.push(ring); frames.push({ T, u, v, r: rads[i] });
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < segs; j++) Q(ctx, rings[i][j], rings[i][j + 1], rings[i + 1][j + 1], rings[i + 1][j]);
  if (o.capStart !== false && rads[0] > 0) for (let j = 0; j < segs; j++) T3(ctx, pts[0], rings[0][j + 1], rings[0][j]);
  if (o.capEnd !== false && rads[n - 1] > 0) for (let j = 0; j < segs; j++) T3(ctx, pts[n - 1], rings[n - 1][j], rings[n - 1][j + 1]);
  return frames;
}
function needle(ctx, base, tip, r, segs) {
  const A = norm(sub(tip, base));
  let f = sub([0, 0, -1], mul(A, A[2] * -1));
  if (len(f) < 1e-3) f = sub([1, 0, 0], mul(A, A[0]));
  const v = norm(f), u = cross(v, A), ring = [];
  for (let j = 0; j <= segs; j++) { const th = (j / segs) * Math.PI * 2; ring.push(add(base, add(mul(u, Math.cos(th) * r), mul(v, Math.sin(th) * r)))); }
  for (let j = 0; j < segs; j++) T3(ctx, tip, ring[j], ring[j + 1]);
}
function box(ctx, F, c, h) {
  const P = (sx, sy, sz) => F([c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]]);
  Q(ctx, P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1));
  Q(ctx, P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1));
  Q(ctx, P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1));
  Q(ctx, P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1));
  Q(ctx, P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1));
  Q(ctx, P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1));
}
function hide(ctx) { ctx.albedo(null); ctx.emissive(null); ctx.color(TAR); ctx.roughness(0.3); ctx.metalness(0.1); ctx.smooth(); }

export function geometry(ctx) {
  const L = ctx.lod ?? 1;
  const segs = [0, 12, 9, 6, 5, 4][L], per = [0, 6, 4, 3, 2, 1][L], fine = L <= 2, mid = L <= 3;
  ctx.bone("root");
  hide(ctx);

  // ---- torso: hunched spine, wide ribcage, thin waist ----
  const spine = catmull(
    [[0, 0.94, 0.24], [0, 1.06, 0.14], [0, 1.22, 0.06], [0, 1.4, -0.04], [0, 1.56, -0.16], [0, 1.66, -0.27], [0, 1.6, -0.4]],
    [0.12, 0.16, 0.12, 0.19, 0.23, 0.2, 0.13], per);
  const ns = spine.pts.length;
  const tor = tube(ctx, spine.pts, spine.rads, Math.max(segs + 2, 4), [0, 0, -1], {
    rx: 1.18, rz: 0.82,
    prof: (i, th) => { const t = i / (ns - 1); const back = Math.max(0, -Math.sin(th)); return 1 + (t > 0.55 && t < 0.9 ? 0.18 * back * Math.sin(((t - 0.55) / 0.35) * Math.PI) : 0); }, // the hump
  });
  // ribs: slanted hoops proud of the hide, open over the spine
  if (mid) {
    ctx.color(TAR_WET);
    const nr = fine ? 6 : 4;
    for (let k = 0; k < nr; k++) {
      const t = 0.42 + (k / (nr - 1)) * 0.32, i = Math.round(t * (ns - 1)), fr = tor[i], c = spine.pts[i], pts = [], rr = [];
      const m = 12;
      for (let s = 0; s <= m; s++) {
        const th = ((-62 + (s / m) * 304) * Math.PI) / 180, front = Math.max(0, Math.sin(th));
        pts.push(add(c, add(add(mul(fr.u, Math.cos(th) * fr.r * 1.18), mul(fr.v, Math.sin(th) * fr.r * 0.82)), mul(fr.T, -0.07 * front))));
        rr.push(s === 0 || s === m ? 0.004 : 0.02);
      }
      tube(ctx, pts, rr, fine ? 6 : 4, fr.T, { capStart: false, capEnd: false });
    }
    // spine knobs along the back
    for (let i = Math.round(ns * 0.2); i < ns - 1; i += fine ? 2 : 3) {
      const fr = tor[i], base = add(spine.pts[i], mul(fr.v, -fr.r * 0.78));
      needle(ctx, base, add(base, add(mul(fr.v, -0.07 - 0.03 * Math.sin(i)), mul(fr.T, 0.03))), 0.03, fine ? 6 : 4);
    }
    ctx.color(TAR);
  }
  // neck: from the hump forward-down into the crate's broken back
  tube(ctx, ...Object.values(catmull([[0, 1.6, -0.3], [0, 1.6, -0.42], [0, 1.58, -0.56]], [0.13, 0.12, 0.1], per)), segs, [0, 1, 0]);

  // ---- arms: too long, claws hooking at the ground ----
  const arm = (sx, zo, yo, chain) => {
    const P = [[0.1 * sx, 1.6, -0.2], [0.27 * sx, 1.6, -0.2], [0.38 * sx, 1.38, -0.17], [0.45 * sx, 1.12, -0.14 + zo], [0.47 * sx, 0.82 + yo, -0.28 + zo], [0.45 * sx, 0.5 + yo, -0.42 + zo], [0.45 * sx, 0.38 + yo, -0.5 + zo]];
    const a = catmull(P, [0.1, 0.085, 0.065, 0.05, 0.062, 0.04, 0.045], per);
    hide(ctx); tube(ctx, a.pts, a.rads, segs, [0, 0, -1]);
    const palm = P[6], nf = L <= 4 ? 3 : 1;
    for (let f = 0; f < nf; f++) {
      const dx = nf === 1 ? 0 : (f - 1) * 0.05 * sx + (f === 1 ? 0 : 0.01 * sx), x = palm[0];
      const fing = catmull([[x + dx * 0.6, palm[1] - 0.01, palm[2] - 0.02], [x + dx * 1.4, palm[1] - 0.14 - yo * 0.3, palm[2] - 0.1 - (f === 1 ? 0.02 : 0)], [x + dx * 1.6, 0.14, palm[2] - 0.14]], [0.024, 0.018, 0.017], per);
      hide(ctx); tube(ctx, fing.pts, fing.rads, Math.max(4, segs - 4), [1, 0, 0]);
      const cb = fing.pts[fing.pts.length - 1];
      const cl = catmull([cb, [cb[0], 0.07, cb[2]], [cb[0], 0.03, cb[2] + 0.06], [cb[0], 0.04, cb[2] + 0.12]], [0.016, 0.012, 0.006, 0.0], per);
      ctx.color(CLAW); ctx.roughness(0.35); tube(ctx, cl.pts, cl.rads, Math.max(4, segs - 4), [1, 0, 0], { capEnd: false });
    }
    if (chain && L <= 3) chainArm(ctx, P[3], P[5], L);
  };
  arm(-1, 0, 0, true);
  arm(1, -0.07, 0.03, false);

  // ---- digitigrade legs ----
  for (const sx of [-1, 1]) {
    const P = [[0.15 * sx, 1.0, 0.16], [0.2 * sx, 0.82, 0.04], [0.21 * sx, 0.62, -0.06], [0.2 * sx, 0.45, 0.08], [0.19 * sx, 0.28, 0.2], [0.18 * sx, 0.15, 0.12], [0.18 * sx, 0.05, 0.02]];
    const g = catmull(P, [0.125, 0.1, 0.065, 0.05, 0.045, 0.038, 0.04], per);
    hide(ctx); tube(ctx, g.pts, g.rads, segs, [0, 0, -1]);
    const ball = P[6], nt = L <= 4 ? 3 : 1;
    if (mid) { ctx.color(CLAW); needle(ctx, add(P[4], [0, 0, 0.02]), add(P[4], [0, 0.05, 0.12]), 0.018, 5); } // hock spur
    for (let f = 0; f < nt; f++) {
      const dx = nt === 1 ? 0 : (f - 1) * 0.045 * sx, x = ball[0];
      const toe = catmull([[x + dx * 0.5, 0.045, 0.0], [x + dx * 1.5, 0.03, -0.12]], [0.026, 0.02], per);
      hide(ctx); tube(ctx, toe.pts, toe.rads, Math.max(4, segs - 4), [0, 1, 0]);
      const c0 = toe.pts[toe.pts.length - 1];
      const cl = catmull([c0, [c0[0] + dx * 0.2, 0.026, -0.19], [c0[0] + dx * 0.3, 0.008, -0.24]], [0.015, 0.009, 0], per);
      ctx.color(CLAW); ctx.roughness(0.35); tube(ctx, cl.pts, cl.rads, Math.max(4, segs - 4), [0, 1, 0], { capEnd: false });
    }
  }

  // ---- the head: a split fish crate ----
  head(ctx, L, segs, per, fine, mid);
}

function chainArm(ctx, E, Wr, L) {
  ctx.albedo(null); ctx.emissive(null); ctx.color(RUST); ctx.roughness(0.75); ctx.metalness(0.55); ctx.flat();
  const A = norm(sub(Wr, E)), p1 = norm(cross(A, [0, 1, 0])), p2 = cross(A, p1), armLen = len(sub(Wr, E));
  const R = 0.085, turns = 2.6, t0 = 0.12, t1 = 0.92;
  const at = (t) => { const ph = t * turns * Math.PI * 2; const along = (t0 + (t1 - t0) * t) * armLen; return { p: add(add(E, mul(A, along)), add(mul(p1, Math.cos(ph) * R), mul(p2, Math.sin(ph) * R))), rad: norm(add(mul(p1, Math.cos(ph)), mul(p2, Math.sin(ph)))) }; };
  if (L === 3) { // far: a twisted rope of chain
    const pts = [], rr = [];
    for (let s = 0; s <= 40; s++) { pts.push(at(s / 40).p); rr.push(0.014); }
    tube(ctx, pts, rr, 4, A);
    return;
  }
  const helixLen = Math.hypot(turns * 2 * Math.PI * R, (t1 - t0) * armLen), nl = Math.floor(helixLen / 0.05);
  const ms = L === 1 ? 10 : 7, ws = L === 1 ? 4 : 3;
  const link = (c, a, nrm) => {
    const b = cross(nrm, a), pts = [], rr = [];
    for (let s = 0; s <= ms; s++) { const th = (s / ms) * Math.PI * 2; pts.push(add(c, add(mul(a, Math.cos(th) * 0.034), mul(b, Math.sin(th) * 0.02)))); rr.push(0.0075); }
    tube(ctx, pts, rr, ws, nrm, { capStart: false, capEnd: false });
  };
  let last = null;
  for (let i = 0; i <= nl; i++) {
    const t = i / nl, h = at(t), h2 = at(Math.min(1, t + 0.01)), h0 = at(Math.max(0, t - 0.01));
    const a = norm(sub(h2.p, h0.p));
    link(h.p, a, i % 2 ? norm(cross(a, h.rad)) : h.rad);
    last = h;
  }
  // a loose end hanging off the wrist
  let p = add(last.p, [0, -0.02, 0]);
  for (let i = 0; i < 6; i++) { const a = norm([0.08 * Math.sin(i * 1.7), -1, 0.15]); p = add(p, mul(a, 0.05)); link(p, a, i % 2 ? [1, 0, 0] : [0, 0, 1]); }
  hide(ctx);
}

function head(ctx, L, segs, per, fine, mid) {
  const r = ctx.random;
  const wood = () => { ctx.emissive(null); ctx.albedo(PLANK); ctx.color("oklch(0.93 0.02 75)"); ctx.roughness(0.88); ctx.metalness(0); ctx.flat(); };
  const hw = W / 2, hd = D / 2, t = 0.012;
  wood();
  if (L >= 4) { // the far view: the open crate as two boxes
    box(ctx, headF, [0, HB / 2, 0], [hw, HB / 2, hd]);
    ctx.bone("jaw"); box(ctx, lidF, [0, 0.0, -hd], [hw, 0.03, hd]); ctx.bone("root");
    return;
  }
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(ctx, headF, [sx * (hw - 0.02), HB / 2, sz * (hd - 0.02)], [0.02, HB / 2, 0.02]);
  // floor
  box(ctx, headF, [0, t, 0], [hw, t, hd]);
  const ph = 0.05, ys = [0.06, 0.17, 0.28];
  for (let k = 0; k < 3; k++) {
    const y = ys[k], j = () => (r() - 0.5) * 0.006;
    // sides
    for (const sx of [-1, 1]) box(ctx, headF, [sx * (hw - t) + j(), y, 0], [t, ph, hd]);
    // back: the middle board is gone where the neck comes through
    if (k !== 1) box(ctx, headF, [0, y, hd - t + j()], [hw, ph, t]);
    else for (const sx of [-1, 1]) box(ctx, headF, [sx * (hw - 0.06), y, hd - t], [0.06, ph, t]);
    // front: the top board is split open
    if (k < 2) box(ctx, headF, [0, y, -hd + t + j()], [hw, ph, t]);
    else {
      box(ctx, headF, [-hw + 0.115, y - 0.01, -hd + t - 0.008], [0.115, ph - 0.01, t]);
      box(ctx, headF, [hw - 0.1, y + 0.005, -hd + t], [0.1, ph, t]);
      // splinters jutting off the split
      if (fine) { ctx.color("oklch(0.85 0.03 75)"); needle(ctx, headF([-0.04, y + 0.02, -hd + t]), headF([0.0, y + 0.05, -hd - 0.01]), 0.012, 4); needle(ctx, headF([0.08, y - 0.02, -hd + t]), headF([0.04, y + 0.02, -hd - 0.01]), 0.01, 4); ctx.color("oklch(0.93 0.02 75)"); }
    }
  }
  if (L === 1) { // nails
    ctx.albedo(null); ctx.color("oklch(0.3 0.03 40)"); ctx.metalness(0.6); ctx.roughness(0.6);
    for (const y of ys) for (const sx of [-1, 1]) box(ctx, headF, [sx * (hw - 0.02), y, -hd - 0.002], [0.007, 0.007, 0.004]);
  }
  // inside: wet flesh lining, a tongue, the red throat
  hide(ctx);
  box(ctx, headF, [0, 0.03, 0.0], [hw - 0.03, 0.006, hd - 0.03]);
  if (mid) {
    const tg = catmull([[0, 0.06, 0.2], [0, 0.085, 0.0], [0.01, 0.075, -0.14], [0.03, 0.1, -0.22]], [0.075, 0.06, 0.045, 0.015], per);
    ctx.color(TAR_WET); tube(ctx, tg.pts.map(headF), tg.rads, Math.max(5, segs - 2), [0, 1, 0], { rx: 1.4, rz: 0.55 });
  }
  ctx.color(MAW); ctx.emissive(MAW); ctx.roughness(0.6);
  box(ctx, headF, [0, 0.14, hd - 0.035], [0.17, 0.045, 0.006]);
  box(ctx, headF, [0, 0.038, 0.05], [0.12, 0.004, 0.16]);
  hide(ctx);
  // gums along the rim, then the needles
  ctx.color(TAR_WET); ctx.flat();
  box(ctx, headF, [0, HB - 0.005, -hd + 0.04], [hw - 0.03, 0.012, 0.016]);
  for (const sx of [-1, 1]) box(ctx, headF, [sx * (hw - 0.04), HB - 0.005, -0.02], [0.016, 0.012, hd - 0.06]);
  const tseg = fine ? 5 : 4;
  const teeth = (F, y, dir) => {
    ctx.color(BONE); ctx.roughness(0.4); ctx.metalness(0);
    const nf = fine ? 9 : 6, nsd = fine ? 5 : 3;
    for (let i = 0; i < nf; i++) { const x = -0.23 + (i / (nf - 1)) * 0.46, l = 0.09 + r() * 0.09; const b = [x, y, -hd + 0.04]; needle(ctx, F(b), F(add(b, [(r() - 0.5) * 0.04, dir * l, 0.04 + r() * 0.03])), 0.011 + r() * 0.004, tseg); }
    if (L <= 2) for (const sx of [-1, 1]) for (let i = 0; i < nsd; i++) { const z = -0.2 + (i / (nsd - 1)) * 0.36, l = 0.07 + r() * 0.07; const b = [sx * (hw - 0.04), y, z]; needle(ctx, F(b), F(add(b, [-sx * (0.03 + r() * 0.03), dir * l, (r() - 0.5) * 0.03])), 0.01, tseg); }
  };
  teeth(headF, HB, 1);
  // tendrils of hide gripping the crate from beneath
  if (fine) {
    hide(ctx);
    for (const sx of [-1, 1]) {
      const g = catmull([[sx * 0.12, -0.02, 0.3], [sx * 0.29, -0.01, 0.08], [sx * 0.305, 0.07, -0.14], [sx * 0.3, 0.16, -0.27]], [0.035, 0.025, 0.015, 0.0], per);
      tube(ctx, g.pts.map(headF), g.rads, 6, [0, 1, 0], { capEnd: false });
    }
  }

  // ---- the lid: the jaw, hinged at the back top edge ----
  ctx.bone("jaw");
  wood();
  const lt = 0.012, pd = (D - 0.01) / 3;
  for (let k = 0; k < 3; k++) box(ctx, lidF, [(r() - 0.5) * 0.008, lt, -(k + 0.5) * (pd + 0.005) - 0.002], [hw, lt, pd / 2]);
  for (const sx of [-1, 1]) box(ctx, lidF, [sx * 0.18, 2 * lt + 0.01, -hd], [0.025, 0.01, hd - 0.01]); // cleats
  box(ctx, lidF, [0, -0.03, -D + lt], [hw, 0.03, lt]); // skirt
  for (const sx of [-1, 1]) box(ctx, lidF, [sx * (hw - lt), -0.03, -hd], [lt, 0.03, hd]);
  // rusted strap hinges
  ctx.albedo(null); ctx.color(RUST); ctx.metalness(0.55); ctx.roughness(0.75);
  for (const sx of [-1, 1]) { box(ctx, lidF, [sx * 0.17, 2 * lt + 0.003, -0.06], [0.02, 0.003, 0.07]); box(ctx, headF, [sx * 0.17, HB - 0.06, hd + 0.003], [0.02, 0.06, 0.003]); }
  // inside the lid: the upper gum and its needles
  hide(ctx); ctx.color(TAR_WET); ctx.flat();
  box(ctx, lidF, [0, -0.004, -hd], [hw - 0.03, 0.006, hd - 0.03]);
  box(ctx, lidF, [0, -0.05, -D + 0.04], [hw - 0.03, 0.012, 0.016]);
  for (const sx of [-1, 1]) box(ctx, lidF, [sx * (hw - 0.04), -0.05, -hd], [0.016, 0.012, hd - 0.06]);
  // lid teeth hang toward the lower jaw; the lid frame shares the head's z (front at -D), so shift the rim
  const lidTeeth = (p) => lidF([p[0], p[1], p[2] - hd]);
  teeth(lidTeeth, -0.06, -1);
  ctx.bone("root");
}
