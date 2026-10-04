// The meadow's look: the layer material every blade of scripts/grass.js is drawn with (spawn api
// builtin/three for the material contract; heightmap-terrain for the layer). The engine keeps placement, wind and
// culling; this script owns the surface. ctx.scatter carries the per-blade facts: groundTint (the
// ground's own colour under the blade's feet: its texture, tint and slow macro drift, as the
// terrain shows it), position (the feet in world metres, one value per blade), heightFraction (0 at
// the feet, 1 at the tip), random (a stable 0..1 per blade). The feet take the ground's colour and
// the blade is lit the way the ground is, so a still frame reads one meadow, ground and blades.
// Blades within one 1.5 m cell share a clump seed that leans the colour warm or cool and a little
// brighter or darker; the roots sit in their own shade and the tips in the light; the tips are
// glossier than the roots so the sun's highlight rides them; a blade standing between the eye and
// the sun lets light through its tip (builtin/lighting's sunDirection points toward the sun, and
// sunRadiance is zero at night, so the glow dies with the sun). Every number here is yours to move.
import { mix, hash, vec2, vec3, cameraPosition, positionWorld } from 'builtin/tsl';
import { sunDirection, sunRadiance } from 'builtin/lighting';
import { MeshStandardNodeMaterial } from 'builtin/three';

export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const ground = ctx.scatter.groundTint;
  const feet = ctx.scatter.position;
  const h = ctx.scatter.heightFraction;
  const cell = vec2(feet.x, feet.z).div(1.5).floor();
  const clumpHue = hash(cell.x.mul(157).add(cell.y.mul(311)));
  const clumpValue = hash(cell.x.mul(97).add(cell.y.mul(53)).add(7));
  const clump = ground.mul(mix(vec3(1.1, 1.0, 0.85), vec3(0.9, 1.0, 1.12), clumpHue)).mul(mix(0.82, 1.18, clumpValue));
  const root = clump.mul(0.5);
  const tip = clump.mul(1.35);
  m.colorNode = mix(root, tip, h.pow(1.3));
  m.roughnessNode = mix(0.95, 0.4, h.pow(2));
  const toEye = cameraPosition.sub(positionWorld).normalize();
  const through = toEye.negate().dot(sunDirection).saturate().pow(3);
  m.emissiveNode = tip.mul(sunRadiance).mul(through).mul(h.pow(2)).mul(0.25);
  return m;
}
