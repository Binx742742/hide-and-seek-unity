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
