// Runs Assets/SpawnSource/scripts/gen and the cell scenes, and writes primitive records
// Unity can spawn. Geometry stays in the generators; this only records their boxes and tubes.
//
//   node --experimental-strip-types tools/bake-yard.mjs
// Register the loader first (see the bottom of this file's spawn path). Run via:
//   node --import ./tools/register-yard.mjs tools/bake-yard.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genDir = path.join(root, "Assets/SpawnSource/scripts/gen");
const LOD = 2;

function rng(seed) {
  let s = (Math.imul(seed || 1, 2654435761) >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function oklchToRgb(spec) {
  if (typeof spec !== "string") return [0.75, 0.75, 0.72];
  const m = spec.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
  if (!m) return [0.75, 0.75, 0.72];
  const L = Number(m[1]), C = Number(m[2]), H = Number(m[3]) * Math.PI / 180;
  const a = C * Math.cos(H), b = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, mm = m_ * m_ * m_, ss = s_ * s_ * s_;
  let r = +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss;
  let g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss;
  let bl = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss;
  const enc = (u) => {
    u = Math.min(1, Math.max(0, u));
    return u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
  };
  return [enc(r), enc(g), enc(bl)];
}

function rgbInt(c) {
  const q = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (q(c[0]) << 16) | (q(c[1]) << 8) | q(c[2]);
}

function nrm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

function quatFromAxes(ax, ay, az) {
  ax = nrm(ax); ay = nrm(ay); az = nrm(az);
  // Re-orthogonalize so a sheared roof still becomes a rigid box along its edges.
  az = nrm(cross(ax, ay));
  ay = nrm(cross(az, ax));
  const r00 = ax[0], r01 = ay[0], r02 = az[0];
  const r10 = ax[1], r11 = ay[1], r12 = az[1];
  const r20 = ax[2], r21 = ay[2], r22 = az[2];
  const tr = r00 + r11 + r22;
  let x, y, z, w;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = 0.25 * s; x = (r21 - r12) / s; y = (r02 - r20) / s; z = (r10 - r01) / s;
  } else if (r00 > r11 && r00 > r22) {
    const s = Math.sqrt(1 + r00 - r11 - r22) * 2;
    w = (r21 - r12) / s; x = 0.25 * s; y = (r01 + r10) / s; z = (r02 + r20) / s;
  } else if (r11 > r22) {
    const s = Math.sqrt(1 + r11 - r00 - r22) * 2;
    w = (r02 - r20) / s; x = (r01 + r10) / s; y = 0.25 * s; z = (r12 + r21) / s;
  } else {
    const s = Math.sqrt(1 + r22 - r00 - r11) * 2;
    w = (r10 - r01) / s; x = (r02 + r20) / s; y = (r12 + r21) / s; z = 0.25 * s;
  }
  const len = Math.hypot(x, y, z, w) || 1;
  return [x / len, y / len, z / len, w / len];
}

function round3(v) { return Math.round(v * 1000) / 1000; }

function makeCtx(params, seed, lod) {
  const parts = [];
  const tint = { rgb: [0.75, 0.73, 0.68], em: 0 };
  function push(kind, px, py, pz, qx, qy, qz, qw, sx, sy, sz) {
    if (![sx, sy, sz].every((n) => Number.isFinite(n) && n > 0.005 && n < 80)) return;
    if (Math.max(sx, sy, sz) < 0.03 && kind !== 0) return;
    parts.push({
      kind, px: round3(px), py: round3(py), pz: round3(pz),
      qx: round3(qx), qy: round3(qy), qz: round3(qz), qw: round3(qw),
      sx: round3(sx), sy: round3(sy), sz: round3(sz),
      color: rgbInt(tint.rgb), emit: tint.em
    });
  }
  const ctx = {
    lod, params: params || {}, seed: seed || 1, random: rng(seed || 1),
    albedo() {}, roughness() {}, metalness() {}, smooth() {}, flat() {},
    color(c) { tint.rgb = oklchToRgb(c); },
    emissive(r) { tint.em = r ? 1 : 0; },
    bone() {},
    partBox(x0, y0, z0, x1, y1, z1) {
      const sx = Math.abs(x1 - x0), sy = Math.abs(y1 - y0), sz = Math.abs(z1 - z0);
      push(0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0, 1, sx, sy, sz);
    },
    partObox(c, h, yaw = 0, pitch = 0, roll = 0) {
      const r = Math.PI / 180;
      const ax = rot([1, 0, 0], yaw, pitch, roll);
      const ay = rot([0, 1, 0], yaw, pitch, roll);
      const az = rot([0, 0, 1], yaw, pitch, roll);
      const q = quatFromAxes(ax, ay, az);
      push(0, c[0], c[1], c[2], q[0], q[1], q[2], q[3], h[0] * 2, h[1] * 2, h[2] * 2);
      function rot(p, yawD, pitchD, rollD) {
        let [x, y, z] = p; let c_, s_;
        c_ = Math.cos(rollD * r); s_ = Math.sin(rollD * r); [x, y] = [x * c_ - y * s_, x * s_ + y * c_];
        c_ = Math.cos(pitchD * r); s_ = Math.sin(pitchD * r); [y, z] = [y * c_ - z * s_, y * s_ + z * c_];
        c_ = Math.cos(yawD * r); s_ = Math.sin(yawD * r); [x, z] = [x * c_ + z * s_, -x * s_ + z * c_];
        return [x, y, z];
      }
    },
    partAxes(c, u, v, w, hu, hv, hw) {
      const q = quatFromAxes(u, v, w);
      push(0, c[0], c[1], c[2], q[0], q[1], q[2], q[3], Math.abs(hu) * 2, Math.abs(hv) * 2, Math.abs(hw) * 2);
    },
    partTube(p0, p1, r0, r1) {
      const d = sub(p1, p0);
      const len = Math.hypot(d[0], d[1], d[2]);
      if (len < 0.01) return;
      const dir = [d[0] / len, d[1] / len, d[2] / len];
      let ax = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      ax = nrm(cross(dir, ax));
      const az = nrm(cross(dir, ax));
      const q = quatFromAxes(ax, dir, az);
      const r = Math.max(0.01, (Math.abs(r0) + Math.abs(r1 || r0)) / 2);
      push(1, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, q[0], q[1], q[2], q[3], r * 2, len, r * 2);
    },
    partSphere(c, rx, ry, rz) {
      push(2, c[0], c[1], c[2], 0, 0, 0, 1, Math.abs(rx) * 2, Math.abs(ry) * 2, Math.abs(rz) * 2);
    },
    partHexa(P) {
      const u = sub(P[1], P[0]), v = sub(P[4], P[0]), w = sub(P[3], P[0]);
      const c = [0, 0, 0];
      for (const p of P) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
      c[0] /= P.length; c[1] /= P.length; c[2] /= P.length;
      const q = quatFromAxes(u, v, w);
      push(0, c[0], c[1], c[2], q[0], q[1], q[2], q[3], Math.hypot(u[0], u[1], u[2]), Math.hypot(v[0], v[1], v[2]), Math.hypot(w[0], w[1], w[2]));
    },
    quad(...a) {
      const p = [[a[0], a[1], a[2]], [a[3], a[4], a[5]], [a[6], a[7], a[8]], [a[9], a[10], a[11]]];
      const c = [(p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4, (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4];
      plate(c, p[0], p[1], p[3]);
    },
    tri(...a) {
      const p = [[a[0], a[1], a[2]], [a[3], a[4], a[5]], [a[6], a[7], a[8]]];
      const area = Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) * 0.5;
      if (area < 0.08) return;
      const c = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3];
      plate(c, p[0], p[1], p[2]);
    }
  };
  function plate(c, a, b, d) {
    const u = sub(b, a), v = sub(d, a);
    const n = cross(u, v);
    const area = Math.hypot(n[0], n[1], n[2]);
    if (area < 0.04) return;
    const q = quatFromAxes(u, n, v);
    push(0, c[0], c[1], c[2], q[0], q[1], q[2], q[3], Math.hypot(u[0], u[1], u[2]), 0.06, Math.hypot(v[0], v[1], v[2]));
  }
  return { ctx, parts };
}

const cache = new Map();
async function loadGen(script) {
  if (cache.has(script)) return cache.get(script);
  const url = pathToFileURL(path.join(root, "Assets/SpawnSource", script)).href;
  const mod = await import(url);
  cache.set(script, mod);
  return mod;
}

async function bakeForm(script, params, seed, lod = LOD) {
  const key = script + "|" + JSON.stringify(params || {}) + "|" + (seed || 1) + "|" + lod;
  if (formCache.has(key)) return formCache.get(key);
  const mod = await loadGen(script);
  const id = "f" + forms.length;
  let visual = [];
  let solid = [];
  if (typeof mod.geometry === "function") {
    const g = makeCtx(params, seed, lod);
    mod.geometry(g.ctx);
    visual = g.parts;
  }
  if (typeof mod.collider === "function") {
    const c = makeCtx(params, seed, 1);
    mod.collider(c.ctx);
    solid = c.parts;
  } else {
    solid = visual;
    visual = visual.map((p) => ({ ...p }));
  }
  const form = { id, visual, solid: solid === visual ? visual : solid };
  formCache.set(key, form);
  forms.push(form);
  return form;
}
const formCache = new Map();
const forms = [];

function num(v, d = 0) { return typeof v === "number" ? v : d; }

function nodeFromScene(raw, id) {
  const feet = raw.feetPosition || { x: 0, y: 0, z: 0 };
  const rot = raw.rotation || {};
  const prim = raw.primitive || {};
  const tags = Array.isArray(raw.tags) ? raw.tags.join(",") : "";
  const state = raw.state || {};
  const node = {
    id: id || raw.id || "",
    px: num(feet.x), py: num(feet.y), pz: num(feet.z),
    pitch: num(rot.pitch), yaw: num(rot.yaw), roll: num(rot.roll),
    form: "",
    tags,
    render: raw.render === false ? 0 : 1,
    behavior: raw.behavior || "",
    hideKind: state.kind || "",
    insideX: state.inside ? num(state.inside.x) : 0,
    insideY: state.inside ? num(state.inside.y) : 0,
    insideZ: state.inside ? num(state.inside.z) : 0,
    doorKind: state.kind || "",
    doorW: num(state.w, 1.2),
    doorH: 2.25,
    doorSwing: num(state.swing, 100),
    yaw0: num(state.yaw0, num(rot.yaw)),
    lightR: 1, lightG: 0.9, lightB: 0.6,
    lightIntensity: 0, lightRange: 0,
    lightBase: state.base || 0,
    lightDist: state.distance || 0,
    shadow: 0,
    kind: -1, sx: 1, sy: 1, sz: 1, oy: 0, color: 0xc8c0b4,
    children: []
  };
  if (raw.light) {
    const rgb = oklchToRgb(raw.light.color);
    node.lightR = round3(rgb[0]); node.lightG = round3(rgb[1]); node.lightB = round3(rgb[2]);
    node.lightIntensity = num(raw.light.intensity);
    node.lightRange = num(raw.light.distance);
    node.shadow = raw.light.shadow && raw.light.shadow.enabled ? 1 : 0;
    if (!node.lightBase) node.lightBase = node.lightIntensity;
    if (!node.lightDist) node.lightDist = node.lightRange;
  }
  if (prim.kind === "box") {
    node.kind = 0;
    node.sx = num(prim.width, 1); node.sy = num(prim.height, 1); node.sz = num(prim.depth, 1);
    node.oy = node.sy / 2;
  } else if (prim.kind === "cylinder") {
    node.kind = 1;
    const r = num(prim.radiusTop, num(prim.radiusBottom, 0.5));
    const h = num(prim.height, 1);
    node.sx = r * 2; node.sy = h; node.sz = r * 2;
    node.oy = h / 2;
  } else if (prim.kind === "sphere") {
    node.kind = 2;
    const r = num(prim.radius, 0.5);
    node.sx = node.sy = node.sz = r * 2;
  }
  if (raw.material && raw.material.color) node.color = rgbInt(oklchToRgb(raw.material.color));
  return { node, prim, seed: prim.seed || (prim.params && prim.params.seed) || 1 };
}

async function fill(raw, id) {
  const { node, prim, seed } = nodeFromScene(raw, id);
  if (raw.spline && Array.isArray(raw.spline.points)) {
    // Scene spline points and width. The 2 m step is only how the ribbon is drawn.
    node.form = await bakeRailway(raw.spline);
  } else if (prim.kind === "scripted" && prim.script) {
    const form = await bakeForm(prim.script, prim.params || {}, seed);
    node.form = form.id;
  }
  if (Array.isArray(raw.children)) {
    for (const ch of raw.children) {
      if (!ch || typeof ch !== "object") continue;
      if (ch.audio || ch.fx || ch.vector) continue;
      node.children.push(await fill(ch, ch.id || ""));
    }
  }
  return node;
}

function expandDots(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.includes(".")) {
      const parts = k.split(".");
      let cur = out;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = expandDots(v);
    } else out[k] = expandDots(v);
  }
  return out;
}

function merge(base, over) {
  if (!over) return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object") out[k] = merge(out[k], v);
    else out[k] = v;
  }
  return out;
}

function loadScenes() {
  const py = `
import json, re, pathlib, yaml
def load(p):
    text = pathlib.Path(p).read_text()
    text = re.sub(r'(?m)^.*vector:.*$', '  vector: ""', text)
    text = re.sub(r'oklch\\(([^)]*)\\)', lambda m: '"' + m.group(0) + '"', text)
    return yaml.safe_load(text)
root = ${JSON.stringify(path.join(root, "Assets/SpawnSource/places/main/cells"))}
files = ["x0z0.scene", "x-1z0.scene", "x-1z1.scene"]
print(json.dumps({f: load(str(pathlib.Path(root)/f)) for f in files}))
`;
  const out = execFileSync("python3", ["-c", py], { maxBuffer: 64 * 1024 * 1024 }).toString();
  return JSON.parse(out);
}

function terrainMod() {
  return import(pathToFileURL(path.join(root, "Assets/SpawnSource/scripts/flat-starter-terrain.js")).href);
}
let terrainModP;
function loadTerrain() {
  if (!terrainModP) terrainModP = terrainMod();
  return terrainModP;
}

// The railway node is a spline, not a generator. Boxes follow its points.
// Step length is a display choice; width and the polyline are the scene.
async function bakeRailway(spline) {
  const mod = await loadTerrain();
  const pts = spline.points;
  const width = typeof spline.width === "number" ? spline.width : 2.4;
  const step = 2;
  const color = rgbInt(oklchToRgb("oklch(0.32 0.02 50)"));
  const parts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const n = Math.max(1, Math.round(len / step));
    const yaw = Math.atan2(dx, dz);
    const qy = Math.sin(yaw / 2), qw = Math.cos(yaw / 2);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = a[0] + dx * t;
      const z = a[2] + dz * t;
      const y = mod.heightAt(x, z);
      parts.push({
        kind: 0, px: round3(x), py: round3(y + 0.04), pz: round3(z),
        qx: 0, qy: round3(qy), qz: 0, qw: round3(qw),
        sx: round3(width), sy: 0.08, sz: round3(len / n), color, emit: 0
      });
    }
  }
  const id = "f" + forms.length;
  forms.push({ id, visual: parts, solid: parts.map((p) => ({ ...p })) });
  console.log("railway", id, "segments", parts.length, "width", width);
  return id;
}

async function terrain() {
  const mod = await loadTerrain();
  const ox = -120, oz = -50, step = 4, nx = 56, nz = 40;
  const h = [];
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) h.push(round3(mod.heightAt(ox + ix * step, oz + iz * step)));
  }
  return { ox, oz, step, nx, nz, h, sea: -1.6 };
}

function holes() {
  return [
    [-49, 24, -43.2, 28],
    [-112, 24, -104, 28],
    [-84, 78, -80, 86],
    [-62, -30, -58, -22]
  ];
}

async function main() {
  const props = await import(pathToFileURL(path.join(root, "Assets/SpawnSource/templates/props.js")).href);
  const door = await import(pathToFileURL(path.join(root, "Assets/SpawnSource/templates/door.js")).href);
  const libs = { "templates/props.js": props, "templates/door.js": door };
  const scenes = loadScenes();
  const nodes = [];
  for (const data of Object.values(scenes)) {
    for (const [key, raw0] of Object.entries(data)) {
      let raw = expandDots(raw0);
      if (raw.template) {
        const [file, name] = raw.template.split("#");
        const lib = libs[file];
        if (!lib || !lib[name]) { console.warn("missing template", raw.template); continue; }
        raw = merge(JSON.parse(JSON.stringify(lib[name])), raw.overrides || {});
      }
      if (raw.audio || raw.fx) continue;
      // cage-sign is an SVG. Harbour ambience and sea mist are skipped above. No stand-in art.
      if (raw.vector && !raw.primitive && !raw.spline) continue;
      nodes.push(await fill(raw, key));
    }
  }
  // Disguise / crafted forms the round spawns later. Same generators as templates/props.js.
  const extras = [
    ["crate", null, null, null],
    ["barrel", null, null, null],
    ["loot", null, null, null],
    ["fish", "scripts/gen/fishpile.js", {}, 1],
    ["fish-rigged", "scripts/gen/fishpile.js", { rigged: true }, 1],
    ["locker", "scripts/gen/locker.js", {}, 13],
    ["tarp", "scripts/gen/tarp.js", {}, 11],
    ["dinghy", "scripts/gen/dinghy.js", {}, 13],
    ["dumpster", "scripts/gen/dumpster.js", {}, 1],
    ["door-plank", "scripts/gen/door.js", { kind: "plank", w: 1.2, h: 2.25 }, 1],
    ["door-grate", "scripts/gen/door.js", { kind: "grate", w: 1.2, h: 2.25 }, 1],
    ["door-panel", "scripts/gen/door.js", { kind: "panel", w: 1.2, h: 2.25 }, 1],
    ["mimic", "scripts/gen/mimic.js", {}, 7, 4]
  ];
  const alias = {};
  for (const [name, script, params, seed, lod] of extras) {
    if (!script) {
      alias[name] = name;
      continue;
    }
    const form = await bakeForm(script, params, seed, lod || LOD);
    alias[name] = form.id;
  }
  // Primitive forms taken straight from templates/props.js FORMS (not a generator).
  function primForm(id, parts) {
    forms.push({ id, visual: parts, solid: parts });
    alias[id] = id;
  }
  const wood = rgbInt(oklchToRgb("oklch(0.92 0.02 70)"));
  const army = rgbInt(oklchToRgb("oklch(0.95 0.02 130)"));
  const drum = rgbInt(oklchToRgb("oklch(0.95 0.01 40)"));
  const stripe = rgbInt(oklchToRgb("oklch(0.78 0.14 85)"));
  const iron = rgbInt(oklchToRgb("oklch(0.32 0.02 50)"));
  const box = (px, py, pz, sx, sy, sz, color) => ({ kind: 0, px, py, pz, qx: 0, qy: 0, qz: 0, qw: 1, sx, sy, sz, color, emit: 0 });
  const cyl = (px, py, pz, r, h, color) => ({ kind: 1, px, py, pz, qx: 0, qy: 0, qz: 0, qw: 1, sx: r * 2, sy: h, sz: r * 2, color, emit: 0 });
  primForm("crate", [box(0, 0.475, 0, 0.95, 0.95, 0.95, wood)]);
  primForm("barrel", [cyl(0, 0.575, 0, 0.42, 1.15, drum)]);
  primForm("loot", [
    box(0, 0.35, 0, 1.1, 0.7, 0.75, army),
    box(0, 0.48, 0, 1.12, 0.08, 0.77, stripe),
    box(0, 0.38, -0.39, 0.14, 0.16, 0.04, iron)
  ]);
  // bearTrap torus radius 0.32, tube 0.035, plus the plate cylinder in the template. No torus primitive.
  primForm("trap", [cyl(0, 0.04, 0, 0.32, 0.08, iron), cyl(0, 0.015, 0, 0.12, 0.03, iron)]);
  primForm("lure", [cyl(0, 0.11, 0, 0.09, 0.22, rgbInt(oklchToRgb("oklch(0.6 0.03 230)")))]);
  const aliasList = Object.entries(alias).map(([name, id]) => ({ name, id }));
  const holeList = holes().map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }));
  const file = { forms, alias: aliasList, nodes, terrain: await terrain(), holes: holeList };
  let parts = 0;
  for (const f of forms) parts += f.visual.length + f.solid.length;
  const json = JSON.stringify(file);
  const outDir = path.join(root, "Assets/StreamingAssets/HideAndSeek");
  fs.mkdirSync(outDir, { recursive: true });
  const gz = zlib.gzipSync(Buffer.from(json));
  fs.writeFileSync(path.join(outDir, "yard.json.gz"), gz);
  console.log("forms", forms.length, "nodes", nodes.length, "parts", parts, "json", json.length, "gz", gz.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
