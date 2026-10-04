// A noise: a short-lived row the monster's HUD draws as a ring where it rang. Every ring looks the same,
// so a hider's crate rummage and a rattle lure read alike: that is the decoy.
import RULES from "./data/rules.yml";
export function noise(ctx, pos, radius, kind = "noise") {
  ctx.spawn({ tags: ["ping"], lifetime: RULES.noise.life, audience: "all", feetPosition: { x: pos.x, y: (pos.y ?? 0) + 1, z: pos.z }, state: { kind, at: ctx.now(), radius } });
}
