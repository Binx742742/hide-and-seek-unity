// An npc hider: keeps a seat warm until a real player takes it over (places/main/sim.js takeOver).
// It roams crate to crate rummaging (noise the monster hears), hides when it sees a revealed monster,
// runs when caught in the open, and can be fooled by fake loot like anyone. state: { role, hp, name, mode, goal, hiddenIn }
import RULES from "./lib/data/rules.yml";
import { SFX } from "./lib/sfx.js";
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import { noise } from "./lib/noise.js";

export const updateSchedule = { every: 3 };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function mem(ctx) { const m = (ctx.session.npcHider ??= {}); return (m[ctx.self.id] ??= {}); }
function stop(ctx) { ctx.self.velocity = { x: 0, y: ctx.self.grounded ? -1 : ctx.self.velocity.y - 1, z: 0 }; }
function moveTo(ctx, goal, speed) {
  const m = mem(ctx), me = ctx.self.feetPosition, now = ctx.now();
  if (!goal || flat(me, goal) < 1.1) { stop(ctx); return true; }
  if (!m.path || now > (m.pathAt ?? 0) || flat(m.pathGoal ?? goal, goal) > 2) {
    const r = findPath(ctx, me, goal, {});
    m.path = r && r.points && r.points.length ? r.points.slice(1) : [goal];
    m.pathAt = now + 2000; m.pathGoal = goal;
  }
  while (m.path.length > 1 && flat(me, m.path[0]) < 0.7) m.path.shift();
  const next = m.path[0] ?? goal, dx = next.x - me.x, dz = next.z - me.z, d = Math.hypot(dx, dz) || 1;
  ctx.self.velocity = { x: (dx / d) * speed, y: ctx.self.grounded ? -1 : ctx.self.velocity.y - 1, z: (dz / d) * speed };
  ctx.self.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
  // stuck: a new goal
  if (now > (m.stuckAt ?? 0)) { if (m.lastPos && flat(me, m.lastPos) < 0.4) { m.path = null; ctx.self.state.goal = null; } m.lastPos = { ...me }; m.stuckAt = now + 2500; }
  return false;
}
function sees(ctx, p) {
  const me = ctx.self.feetPosition, d = flat(me, p.feetPosition);
  if (d > 16) return false;
  if (d < 3) return true;
  const o = { x: me.x, y: me.y + 1.5, z: me.z }, t = { x: p.feetPosition.x, y: p.feetPosition.y + 1.2, z: p.feetPosition.z };
  const dir = { x: t.x - o.x, y: t.y - o.y, z: t.z - o.z }, len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const hit = raycast(ctx, o, { x: dir.x / len, y: dir.y / len, z: dir.z / len }, { distance: len, bodies: "static", physicsOnly: true });
  return !hit || hit.distance > len - 0.6;
}
// what it is afraid of: a monster it can tell is a monster
function threat(ctx) {
  const me = ctx.self.feetPosition; let best = null, bd = 99;
  for (const p of ctx.place.players) if (p.state.role === "mimic" && p.state.revealed && !p.state.faded) { const d = flat(me, p.feetPosition); if (d < bd && sees(ctx, p)) { best = p; bd = d; } }
  for (const b of ctx.query({ tags: ["mimic-bot"], radius: 16 })) if (!b.state.dead && b.state.disguise === "none") { const d = flat(me, b.feetPosition); if (d < bd && sees(ctx, b)) { best = b; bd = d; } }
  return best;
}
function hideIn(ctx, spot) {
  const s = ctx.self.state, h = ctx.getObject(spot.id);
  if (!h || h.state.occupant) return false;
  h.state.occupant = ctx.self.id; s.hiddenIn = spot.id; s.mode = "hidden"; s.until = ctx.now() + 15000 + ctx.random() * 20000;
  ctx.self.visible = false;
  ctx.emit("playSound", { clip: SFX.rummage, position: spot.feetPosition, volume: 0.4, maxDistance: 12 });
  return true;
}
function unhide(ctx) {
  const s = ctx.self.state, h = s.hiddenIn && ctx.getObject(s.hiddenIn);
  if (h && h.state.occupant === ctx.self.id) h.state.occupant = null;
  s.hiddenIn = null; s.mode = "loot"; s.goal = null; ctx.self.visible = true;
}
export function update(ctx) {
  const s = ctx.self.state, now = ctx.now(), me = ctx.self.feetPosition, ph = ctx.place.state.phase;
  if (s.dead) return;
  if ((s.stunUntil ?? 0) > now || (ph !== "hunt" && ph !== "hide")) { stop(ctx); return; }
  if (s.hiddenIn) {
    const h = ctx.getObject(s.hiddenIn);
    if (!h || h.state.occupant !== ctx.self.id) { unhide(ctx); s.mode = "flee"; s.until = now + 4000; return; } // dragged out
    const i = h.state.inside ?? { x: 0, y: 0, z: 0 }, want = { x: h.feetPosition.x + i.x, y: h.feetPosition.y + i.y, z: h.feetPosition.z + i.z };
    if (flat(me, want) > 0.3) ctx.self.feetPosition = want;
    ctx.self.velocity = { x: 0, y: 0, z: 0 };
    if (now > s.until && !threat(ctx)) unhide(ctx);
    return;
  }
  const t = threat(ctx);
  if (t) {
    // a hiding place close by, else run
    const spot = ctx.query({ tags: ["hidespot"], radius: 9 }).filter((r) => !r.state.occupant).sort((a, b) => flat(me, a.feetPosition) - flat(me, b.feetPosition))[0];
    if (spot && flat(t.feetPosition, spot.feetPosition) > 4) { if (moveTo(ctx, spot.feetPosition, 4.4) || flat(me, spot.feetPosition) < 1.8) hideIn(ctx, spot); return; }
    const dx = me.x - t.feetPosition.x, dz = me.z - t.feetPosition.z, d = Math.hypot(dx, dz) || 1;
    s.mode = "flee"; s.until = now + 3000; s.goal = { x: me.x + (dx / d) * 12, y: me.y, z: me.z + (dz / d) * 12 };
    moveTo(ctx, s.goal, 4.4);
    return;
  }
  if (s.mode === "flee" && now < (s.until ?? 0)) { moveTo(ctx, s.goal, 4.2); return; }
  if (s.mode === "rummage") {
    stop(ctx);
    if (now > s.until) { s.mode = ctx.random() < 0.2 ? "seek-hide" : "loot"; s.goal = null; }
    return;
  }
  if (s.mode === "seek-hide") {
    if (!s.goal) { const spot = ctx.query({ tags: ["hidespot"], radius: 40 }).filter((r) => !r.state.occupant)[Math.floor(ctx.random() * 3)]; if (!spot) { s.mode = "loot"; return; } s.goal = { ...spot.feetPosition }; s.spot = spot.id; }
    if (moveTo(ctx, s.goal, 2.6)) { const r = ctx.query({ tags: ["hidespot"], radius: 3 }).find((x) => x.id === s.spot); if (!r || !hideIn(ctx, r)) { s.mode = "loot"; s.goal = null; } }
    return;
  }
  // loot: pick a crate, walk to it, rummage. it can't tell a fake from a real one
  if (!s.goal) {
    const crates = ctx.query({ tags: ["loot"], radius: 45 }).filter((r) => flat(me, r.feetPosition) > 3);
    const c = crates[Math.floor(ctx.random() * crates.length)];
    s.goal = c ? { ...c.feetPosition } : { x: me.x + (ctx.random() - 0.5) * 20, y: me.y, z: me.z + (ctx.random() - 0.5) * 20 };
    s.crate = c?.id ?? null; s.goAt = now;
  }
  if (moveTo(ctx, s.goal, 2.4) || now - (s.goAt ?? now) > 25000) {
    const c = s.crate && ctx.getObject(s.crate);
    if (c && flat(me, c.feetPosition) < 2.5) {
      if (c.tags?.includes?.("fake")) {
        s.hp = (s.hp ?? 100) - RULES.fake.damage; s.stunUntil = now + RULES.fake.stun * 1000;
        ctx.emit("playSound", { clip: SFX.bite, position: c.feetPosition, volume: 1, maxDistance: 30 });
        ctx.emit("damageNumber", { position: { ...me, y: me.y + 2 }, value: RULES.fake.damage, color: "oklch(0.65 0.2 25)" });
        ctx.destroy(c.id);
      } else {
        ctx.emit("playSound", { clip: SFX.rummage, position: c.feetPosition, volume: 0.6, maxDistance: 25 });
        noise(ctx, c.feetPosition, RULES.noise.loot, "loot");
      }
    }
    s.mode = "rummage"; s.until = now + 2000 + ctx.random() * 2000; s.goal = null;
  }
}
