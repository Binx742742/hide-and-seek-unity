// The dream's people and its shards. Spawned each round by places/main/sim.js from scripts/lib/data/dream.yml.
const SHIMMER = `fx
pop glow n=1 at=point() r=light(<.6,.75,1>,2.2,5)
pop motes rate=6 on=sphere(.35) life=1.2..2 v=sdir()*.15+up(.2) size=.03..0.06 acc=curl(.4) col=hdr(1.1,1.4,2) a=0>.2:.9>.7:.6>0 sz=$size r=sprite(mote,add)`;
export const dreamer = {
  tags: ["dreamer", "npc"],
  model: "cdn/character-old-fisherman-dockworker-yellow-oilskin-coat-wool-cap.glb",
  physics: "character",
  behavior: ["scripts/dreamer.js", "scripts/humanoid-locomotion.js"],
  ui: '<div facing="player" at="0.5 1.15" width="1.6m" class="text-center"><div class="text-[150px] font-bold" style="color:oklch(0.85 0.06 230);text-shadow:0 0 30px #000">{{ state.name }}</div><div class="text-[110px] italic" style="color:oklch(0.8 0.03 240 / .85);text-shadow:0 0 30px #000">{{ state.line.text | default "zzz" }}</div></div>',
};
// a memory shard: a hanging photograph that should not be here, glowing faintly blue
export const clue = {
  tags: ["clue"],
  primitive: { kind: "box", width: 0.42, height: 0.5, depth: 0.02 },
  material: { color: "oklch(0.95 0.02 230)", emissive: "oklch(0.7 0.08 230)", emissiveIntensity: 0.6, roughness: 0.4 },
  fx: { script: SHIMMER },
  behavior: "scripts/clue.js",
};

// the mimic wearing a fisherman: the same oilskin and the same sleep-talk plate, a borrowed name
export const fishermanForm = {
  model: dreamer.model,
  ui: dreamer.ui,
  mixer: { base: { clip: "Idle", loop: "loop" } },
  castShadow: true,
};
export const FAKE_NAMES = ["Old Wenna", "Dace Morrow", "Cobb the netter", "Little Fen", "Skipper Hobb", "Ada Lusk"];
