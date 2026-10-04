// The mimic's true shape: drawn when it isn't wearing a crate. A child of its character capsule (feet at the
// parent's feet, facing -Z); the capsule is its collider, so this has none. Bone "jaw" is the crate lid.
export const mimicBody = {
  feetPosition: { x: 0, y: 0, z: 0 },
  primitive: { kind: "scripted", script: "scripts/gen/mimic.js", seed: 7 },
  material: { pbr: true },
  castShadow: true,
};
