// The bot mimic: when fewer than two humans play, this hunts them. It ambushes as a crate, barrel or loot crate
// beside the real loot, bursts out when a hider comes close, chases what it sees, follows rattle lures,
// and loses you if you break its sight long enough. Numbers: lib/data/rules.yml bot.
import RULES from "./lib/data/rules.yml";
import { FORMS, fakeLoot } from "../templates/props.js";
import DREAM from "./lib/data/dream.yml";
import { SFX } from "./lib/sfx.js";
import { FAKE_NAMES } from "../templates/dream.js";
import { raycast } from "builtin/physics";
import { findPath } from "builtin/nav";

export const updateSchedule = { every: 3 };
const B = RULES.bot;
const FORM_NAMES = ["crate", "barrel", "loot", "fisherman", "locker", "dumpster"];
function mem(ctx) { const m = (ctx.session.bot ??= {}); return (m[ctx.self.id] ??= {}); }
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function sees(ctx, p) {
  const me = ctx.self.feetPosition, d = flat(me, p.feetPosition);
  if (d > B.sight) return false;
  if (d < 3) return true;
  const o = { x: me.x, y: me.y + 1.5, z: me.z }, t = { x: p.feetPosition.x, y: p.feetPosition.y + 1.2, z: p.feetPosition.z };
  const dir = { x: t.x - o.x, y: t.y - o.y, z: t.z - o.z }, len = Math.hypot(dir.x, dir.y, dir.z);
  const hit = raycast(ctx, o, { x: dir.x / len, y: dir.y / len, z: dir.z / len }, { distance: len, bodies: "static", physicsOnly: true });
  return !hit || hit.distance > len - 0.6;
}

function dress(ctx) {
  const s = ctx.self.state, m = mem(ctx);
  const form = s.disguise && s.disguise !== "none" && !s.dead ? s.disguise : null;
  if (form === (m.form ?? null)) return;
  if (m.formId) ctx.destroy(m.formId);
  m.formId = null; m.form = form;
  for (const c of ["body"]) { const h = ctx.getObject(ctx.self.id + "/" + c); if (h) h.visible = !form; }
  if (form === "fisherman") m.formId = ctx.spawn({ parent: ctx.self.id, id: "form", template: "templates/dream.js#fishermanForm", feetPosition: { x: 0, y: 0, z: 0 }, state: { name: s.name ?? FAKE_NAMES[0], line: null } });
  else if (form) { const f = FORMS[form]; m.formId = ctx.spawn({ parent: ctx.self.id, id: "form", primitive: f.primitive, material: f.material, children: f.children, feetPosition: { x: 0, y: 0, z: 0 } }); }
}

function moveTo(ctx, goal, speed) {
  const m = mem(ctx), me = ctx.self.feetPosition, now = ctx.now();
  if (!goal || flat(me, goal) < 0.8) { ctx.self.velocity = { x: 0, y: ctx.self.velocity.y - 1, z: 0 }; return true; }
  if (!m.path || now > (m.pathAt ?? 0) || flat(m.pathGoal ?? goal, goal) > 2) {
    const r = findPath(ctx, me, goal, {});
    m.path = r && r.points && r.points.length ? r.points.slice(1) : [goal];
    m.pathAt = now + 1500; m.pathGoal = goal;
  }
  while (m.path.length > 1 && flat(me, m.path[0]) < 0.7) m.path.shift();
  const next = m.path[0] ?? goal, dx = next.x - me.x, dz = next.z - me.z, d = Math.hypot(dx, dz) || 1;
  ctx.self.velocity = { x: (dx / d) * speed, y: ctx.self.grounded ? -1 : ctx.self.velocity.y - 9.8 * 0.1, z: (dz / d) * speed };
  ctx.self.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
  return false;
}

function pickAmbush(ctx) {
  const spots = RULES.loot, i = Math.floor(ctx.random() * spots.length), a = ctx.random() * Math.PI * 2;
  return { x: spots[i][0] + Math.cos(a) * 1.7, y: 0, z: spots[i][1] + Math.sin(a) * 1.7 };
}

export function update(ctx) {
  const s = ctx.self.state, now = ctx.now();
  dress(ctx);
  if (s.dead || ctx.place.state.phase !== "hunt") { ctx.self.velocity = { x: 0, y: -2, z: 0 }; return; }
  if ((s.stunUntil ?? 0) > now || (s.rootUntil ?? 0) > now) { ctx.self.velocity = { x: 0, y: -2, z: 0 }; if (s.disguise !== "none") s.disguise = "none"; return; }
  const me = ctx.self.feetPosition;
  const hiders = ctx.place.players.filter((p) => p.state.role === "hider");
  for (const n of ctx.query({ tags: ["npc-hider"], radius: B.sight + 4 })) if (!n.state.dead) { const h = ctx.getObject(n.id); if (h) hiders.push(h); }
  let target = null, td = 99;
  for (const c of ctx.query({ tags: ["scarecrow"], radius: B.sight })) { const h = ctx.getObject(c.id); if (h) hiders.push(h); }
  for (const p of hiders) { if (p.state.hiddenIn || p.state.smoked) continue; const d = flat(me, p.feetPosition); if (d < td && (s.disguise === "none" ? sees(ctx, p) : d < 3.5)) { target = p; td = d; } }

  if (target) {
    if (s.disguise !== "none") { s.disguise = "none"; ctx.emit("playSound", { clip: SFX.unmorph, position: me, volume: 1, maxDistance: 30 }); ctx.emit("screenShake", { intensity: 0.4, duration: 0.3 }, { audience: { player: target.id } }); }
    if (s.mode !== "hunt" && now > (s.darkAt ?? 0)) { s.darkAt = now + RULES.dreamMaster.blackoutCooldown * 1000; ctx.place.state.blackout = { until: now + RULES.dreamMaster.blackout * 1000, at: now }; }
    s.mode = "hunt"; s.last = { x: target.feetPosition.x, y: target.feetPosition.y, z: target.feetPosition.z }; s.lastAt = now;
    if (td < B.reach && now > (s.atkAt ?? 0) && target.tags?.includes?.("scarecrow")) {
      const at = { x: target.feetPosition.x, y: target.feetPosition.y + 1.1, z: target.feetPosition.z };
      ctx.destroy(target.id); s.atkAt = now + B.cooldown * 1000;
      s.stunUntil = now + RULES.scarecrow.stun * 1000; s.mode = "search";
      ctx.emit("playSound", { clip: SFX.pop, position: at, volume: 1, maxDistance: 45 });
      ctx.emit("fx", { position: at, script: `fx\npop powder burst=40 life=.6..1.2 v=sdir()*(2..5)+up(1..2) size=.15..0.35 acc=drag(2)+buoy(.2) col=<.85,.8,.7> a=0>.1:.8>1:0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)` });
      ctx.place.state.feed = [...(ctx.place.state.feed ?? []).slice(-3), { text: "it clawed a scarecrow. powder everywhere", at: now }];
      return;
    }
    if (td < B.reach && now > (s.atkAt ?? 0)) {
      s.atkAt = now + B.cooldown * 1000;
      target.state.hp = (target.state.hp ?? 100) - B.damage - (s.power ?? 0) * RULES.hunger.clawPer; target.state.hurtAt = now;
      const at = { x: target.feetPosition.x, y: target.feetPosition.y + 1.1, z: target.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: B.damage + (s.power ?? 0) * RULES.hunger.clawPer, color: "oklch(0.65 0.2 25)" });
      ctx.emit("playSound", { clip: SFX.claw, position: at, volume: 1, maxDistance: 30 });
      ctx.emit("cameraPunch", { direction: { x: at.x - me.x, y: 0, z: at.z - me.z }, intensity: 0.5 }, { audience: { player: target.id } });
      ctx.emit("squash", { target: target.id, axis: "y", intensity: 0.25, duration: 0.18 });
      ctx.self.velocity = { x: 0, y: -2, z: 0 };
      return;
    }
    moveTo(ctx, target.feetPosition, B.chase + (s.power ?? 0) * RULES.hunger.botChasePer);
    return;
  }
  // a rattle lure pulls it
  // any noise in earshot: a crate rummaged, a sleeper talked to, a door, a rattle (the decoy sounds the same)
  if (s.mode !== "hunt" && now > (s.earAt ?? 0)) {
    s.earAt = now + 600;
    let heard = null;
    for (const r of ctx.query({ tags: ["ping"], radius: 60 })) {
      if ((r.state.at ?? 0) <= (s.heardAt ?? 0) || flat(me, r.feetPosition) > (r.state.radius ?? 30)) continue;
      if (!heard || r.state.at > heard.state.at) heard = r;
    }
    if (heard) { s.mode = "investigate"; s.goal = { x: heard.feetPosition.x, y: heard.feetPosition.y - 1, z: heard.feetPosition.z }; s.heardAt = heard.state.at; if (s.disguise !== "none") s.disguise = "none"; }
  }
  if (s.mode === "hunt" && now - (s.lastAt ?? 0) < 5000) {
    if (moveTo(ctx, s.last, B.chase * 0.85)) {
      s.mode = "search";
      // it saw you go in: it checks the nearest hiding place, sometimes
      const spot = ctx.query({ tags: ["hidespot"], radius: 3.5 }).find((r) => r.state.occupant);
      if (spot && ctx.random() < 0.6) {
        const h = ctx.getObject(spot.id), victim = ctx.place.players.find((p) => p.id === spot.state.occupant) ?? ctx.getObject(spot.state.occupant);
        h.state.occupant = null;
        if (victim) { victim.state.hp = (victim.state.hp ?? 100) - B.damage; victim.state.hurtAt = now; victim.state.stunUntil = now + 800;
          ctx.emit("playSound", { clip: SFX.claw, position: spot.feetPosition, volume: 1, maxDistance: 30 });
          ctx.emit("shake", { target: spot.id, intensity: 0.4, duration: 0.4 }); }
      }
    }
    return;
  }
  // hungry: go eat (it cannot tell rigged fish from real)
  if (s.mode !== "feed" && (s.power ?? 0) < RULES.hunger.max && s.mode !== "ambush" && ctx.random() < 0.01) {
    const food = ctx.query({ tags: ["food"], radius: 60 }).sort((a, b) => flat(me, a.feetPosition) - flat(me, b.feetPosition))[0];
    if (food) { s.mode = "feed"; s.goal = { ...food.feetPosition }; s.foodId = food.id; s.goAt = now; }
  }
  if (s.mode === "feed") {
    const f = ctx.getObject(s.foodId);
    if (!f || now - s.goAt > 25000) { s.mode = "ambush-go"; s.goal = pickAmbush(ctx); s.goAt = now; return; }
    if (moveTo(ctx, s.goal, B.walk * 1.3) || flat(me, f.feetPosition) < RULES.hunger.reach) {
      if (!f.tags.includes("bait")) {
        ctx.destroy(f.id); s.power = (s.power ?? 0) + 1;
        ctx.place.state.ate = { at: now, x: s.goal.x, z: s.goal.z };
        ctx.emit("playSound", { clip: SFX.eat, position: me, volume: 1, maxDistance: 35 });
      }
      s.mode = "ambush-go"; s.goal = pickAmbush(ctx); s.goAt = now;
    }
    return;
  }
  if (s.mode === "investigate") { if (moveTo(ctx, s.goal, B.chase * 0.8)) { s.mode = "ambush-go"; s.goal = pickAmbush(ctx); } return; }
  // ambush: walk to a spot by the loot and become a thing; give up after a while and move on
  if ((s.mode !== "ambush" && s.mode !== "ambush-go") || (s.mode === "ambush-go" && !s.goal)) { s.mode = "ambush-go"; s.goal = pickAmbush(ctx); s.goAt = now; }
  if (s.mode === "ambush-go") {
    if (moveTo(ctx, s.goal, B.walk) || now - (s.goAt ?? now) > 30000) {
      s.mode = "ambush"; s.until = now + 20000 + ctx.random() * 15000;
      // leave a fake beside the real loot on the way: up to the cap, the oldest crumbles
      const mine = ctx.query({ tags: ["fake"], radius: 300 }).filter((r) => r.state.owner === ctx.self.id);
      if (mine.length >= RULES.fake.max) ctx.destroy(mine.sort((a, b) => (a.state.at ?? 0) - (b.state.at ?? 0))[0].id);
      const a = ctx.random() * Math.PI * 2;
      if (ctx.random() < 0.35) {
        const real = DREAM.clues[Math.floor(ctx.random() * DREAM.clues.length)];
        ctx.spawn({ template: "templates/dream.js#clue", tags: ["clue", "falseclue"], feetPosition: { x: me.x + Math.cos(a) * 3, y: me.y + 1.1, z: me.z + Math.sin(a) * 3 }, material: { texture: real.pic, emissive: "oklch(0.35 0.05 230)", emissiveIntensity: 0.5, roughness: 0.5 }, state: { text: real.text, pic: real.pic, taken: false, owner: ctx.self.id, at: now } });
      } else ctx.spawn({ ...fakeLoot, feetPosition: { x: me.x + Math.cos(a) * 2.2, y: me.y, z: me.z + Math.sin(a) * 2.2 }, rotation: { yaw: Math.floor(ctx.random() * 4) * 90 }, state: { kind: "fake", owner: ctx.self.id, at: now, emptyUntil: 0 } });
      s.disguise = FORM_NAMES[Math.floor(ctx.random() * FORM_NAMES.length)];
      if (s.disguise === "fisherman") s.name = FAKE_NAMES[Math.floor(ctx.random() * FAKE_NAMES.length)];
      ctx.self.rotation = { yaw: Math.floor(ctx.random() * 4) * 90 };
      ctx.emit("playSound", { clip: SFX.morph, position: me, volume: 0.5, maxDistance: 14 });
    }
    return;
  }
  ctx.self.velocity = { x: 0, y: -2, z: 0 };
  if (now > (s.until ?? 0)) { s.disguise = "none"; s.mode = "ambush-go"; s.goal = pickAmbush(ctx); s.goAt = now; }
}
