// Every small thing the game spawns: loot, decoys, traps, and the forms the mimic wears.
// The mimic's disguises reuse these exact shapes (FORMS), so a disguised mimic is pixel-identical to the real thing.
const WOOD = { texture: "cdn/texture-weathered-wooden-shipping-crate-planks.png", color: "oklch(0.92 0.02 70)", roughness: 0.9 };
const ARMY = { texture: "cdn/texture-army-green-painted-wood-crate-scuffed.png", color: "oklch(0.95 0.02 130)", roughness: 0.85 };
const DRUM = { texture: "cdn/texture-rusted-oil-drum-steel-red-paint.png", color: "oklch(0.95 0.01 40)", roughness: 0.7, metalness: 0.4 };
const IRON = { color: "oklch(0.32 0.02 50)", roughness: 0.55, metalness: 0.8 };
const STRIPE = { color: "oklch(0.78 0.14 85)", roughness: 0.6 };

// shapes, without physics or behavior: [primitive spec, children]
export const FORMS = {
  // the hiding places: the same script and seed as the scene's, so the fake is the real one's twin
  locker: { primitive: { kind: "scripted", script: "scripts/gen/locker.js", params: {}, seed: 13 } },
  tarp: { primitive: { kind: "scripted", script: "scripts/gen/tarp.js", params: {}, seed: 11 } },
  dinghy: { primitive: { kind: "scripted", script: "scripts/gen/dinghy.js", params: {}, seed: 13 } },
  dumpster: { primitive: { kind: "scripted", script: "scripts/gen/dumpster.js", params: {}, seed: 1 } },
  crate: {
    primitive: { kind: "box", width: 0.95, height: 0.95, depth: 0.95 }, material: WOOD,
  },
  barrel: {
    primitive: { kind: "cylinder", radiusTop: 0.42, radiusBottom: 0.42, height: 1.15, radialSegments: 20 }, material: DRUM,
  },
  loot: {
    primitive: { kind: "box", width: 1.1, height: 0.7, depth: 0.75 }, material: ARMY,
    children: [
      { id: "band", feetPosition: { x: 0, y: 0.48, z: 0 }, primitive: { kind: "box", width: 1.12, height: 0.08, depth: 0.77 }, material: STRIPE },
      { id: "latch", feetPosition: { x: 0, y: 0.38, z: -0.39 }, primitive: { kind: "box", width: 0.14, height: 0.16, depth: 0.04 }, material: IRON },
    ],
  },
};

// A real loot crate: E searches it (scripts/player.js), it refills on a timer (state.emptyUntil).
export const lootCrate = {
  tags: ["loot", "interactable"],
  ...FORMS.loot, children: FORMS.loot.children,
  physics: { body: "static", collider: "box" },
  state: { emptyUntil: 0 },
};
// A plain wooden crate or a barrel: cover, and the reason a still crate is never trusted.
export const decoyCrate = { tags: ["decoy"], ...FORMS.crate, physics: { body: "static", collider: "box" } };
export const decoyBarrel = { tags: ["decoy"], ...FORMS.barrel, physics: { body: "static", collider: "auto" } };

// Hider traps (spawned by scripts/player.js, judged by places/main/sim.js)
export const bearTrap = {
  tags: ["trap"],
  primitive: { kind: "torus", radius: 0.32, tube: 0.035, radialSegments: 8, tubularSegments: 20 },
  rotation: { pitch: 90 },
  material: IRON,
  children: [
    { id: "jaw-a", feetPosition: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0 }, primitive: { kind: "cone", radius: 0.3, height: 0.08, radialSegments: 14, openEnded: true }, material: IRON },
    { id: "plate", feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.03 }, material: { color: "oklch(0.4 0.05 50)", metalness: 0.6, roughness: 0.6 } },
  ],
  state: { kind: "trap" },
};
// the mimic's food: a tray of gutted fish. Eat one, grow stronger.
export const fishPile = { tags: ["food"], primitive: { kind: "scripted", script: "scripts/gen/fishpile.js", params: {}, seed: 1 }, state: { kind: "food" } };
// the hiders' rigged fish: the same tray, powder under the guts (a twist of fuse is the only tell)
export const baitCrate = { tags: ["bait", "food"], primitive: { kind: "scripted", script: "scripts/gen/fishpile.js", params: { rigged: true }, seed: 1 }, state: { kind: "bait" } };
export const fakeLoot = { ...lootCrate, tags: ["loot", "interactable", "fake"], physics: { body: "static", collider: "box" }, state: { kind: "fake", emptyUntil: 0 } }; // the mimic's: identical to the real thing
export const lureCan = {
  tags: ["lure"],
  primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.09, height: 0.22, radialSegments: 12 },
  material: { color: "oklch(0.6 0.03 230)", metalness: 0.9, roughness: 0.35 },
  state: { kind: "lure" },
};

// ── the creative kit ──
const ROPE = { color: "oklch(0.78 0.03 80)", roughness: 0.9 };
const STAKE = { texture: "cdn/texture-weathered-tar-black-timber.png", color: "oklch(0.55 0.03 60)", roughness: 0.9 };
// a wire strung between two stakes along local x, a tin bell in the middle. place at the midpoint, yaw across the gap
export const tripwire = (len) => ({
  tags: ["tripwire"],
  children: [
    { id: "a", feetPosition: { x: -len / 2, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.035, height: 0.45, radialSegments: 6 }, material: STAKE },
    { id: "b", feetPosition: { x: len / 2, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.035, height: 0.45, radialSegments: 6 }, material: STAKE },
    { id: "wire", feetPosition: { x: 0, y: 0.3, z: 0 }, primitive: { kind: "box", width: len, height: 0.012, depth: 0.012 }, material: { ...ROPE, emissive: "oklch(0.5 0.02 80)", emissiveIntensity: 0.3 } },
    { id: "bell", feetPosition: { x: 0, y: 0.2, z: 0 }, primitive: { kind: "cone", radius: 0.06, height: 0.1, radialSegments: 10, openEnded: true }, material: { color: "oklch(0.7 0.09 80)", metalness: 0.9, roughness: 0.35 } },
  ],
  state: { kind: "tripwire" },
});
// planks nailed across a lane: three boards on two posts, a cross-brace
const PLANK = { texture: "cdn/texture-weathered-tar-black-timber.png", color: "oklch(0.72 0.03 60)", roughness: 0.9 };
export const barricade = (w) => ({
  tags: ["barricade"],
  physics: "static",
  primitive: { kind: "box", width: w, height: 1.9, depth: 0.12 }, visible: true,
  material: { color: "oklch(0.3 0.02 60)", roughness: 1, opacity: 0, transparent: true },
  castShadow: true,
  children: [
    { id: "p1", feetPosition: { x: -w / 2 + 0.1, y: 0, z: 0.1 }, primitive: { kind: "box", width: 0.12, height: 1.9, depth: 0.12 }, material: PLANK },
    { id: "p2", feetPosition: { x: w / 2 - 0.1, y: 0, z: 0.1 }, primitive: { kind: "box", width: 0.12, height: 1.9, depth: 0.12 }, material: PLANK },
    { id: "b1", feetPosition: { x: 0, y: 0.35, z: 0 }, rotation: { roll: 3 }, primitive: { kind: "box", width: w, height: 0.24, depth: 0.05 }, material: PLANK },
    { id: "b2", feetPosition: { x: 0, y: 0.85, z: 0 }, rotation: { roll: -2 }, primitive: { kind: "box", width: w * 0.95, height: 0.22, depth: 0.05 }, material: PLANK },
    { id: "b3", feetPosition: { x: 0, y: 1.4, z: 0 }, rotation: { roll: 4 }, primitive: { kind: "box", width: w * 0.9, height: 0.24, depth: 0.05 }, material: PLANK },
    { id: "x", feetPosition: { x: 0, y: 0.95, z: -0.05 }, pivot: "center", rotation: { roll: 38 }, primitive: { kind: "box", width: w * 1.05, height: 0.14, depth: 0.04 }, material: PLANK },
  ],
  state: { kind: "barricade" },
});
// the smoke cloud: thick grey, rolling low, gone in ten seconds
export const SMOKE_FX = `fx
pop puff rate=?mobile:14|26 on=disc(%r|4) life=2.5..4 v=up(.2..0.5)+sdir()*.3 size=1.6..2.6 acc=curl(.3)*.4+drag(.8)+buoy(.05) sz=$size*(.6>1.4) col=<.42,.43,.45>><.3,.31,.33> a=0>.15:.85>.75:.8>0 rot=spin(.12) r=sprite(smoke-puff,alpha)`;
export const smokeCloud = { tags: ["smoke"], state: { kind: "smoke" } };
// the mimic's gut snare: a dark wet loop on the ground, easy to miss in the fog
export const gutSnare = {
  tags: ["snare"],
  primitive: { kind: "torus", radius: 0.32, tube: 0.04, radialSegments: 6, tubularSegments: 16 },
  rotation: { pitch: 90 },
  material: { color: "oklch(0.22 0.06 20)", roughness: 0.25, metalness: 0.1 },
  children: [{ id: "pool", feetPosition: { x: 0, y: 0, z: -0.01 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.42, segments: 16 }, material: { color: "oklch(0.16 0.04 20)", roughness: 0.15 } }],
  state: { kind: "snare" },
};
