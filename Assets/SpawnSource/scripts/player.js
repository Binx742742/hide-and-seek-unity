// The player's body: walking (eased toward the keys), and every verb of the hunt.
// Roles are written by places/main/sim.js into state.role: "hider" | "mimic" | "ghost" | "lobby".
// Hits are judged here, on the striker's machine, and written to the target's state (hp -= d).
import PLAYER from "./lib/data/player.yml";
import RULES from "./lib/data/rules.yml";
import { FORMS, bearTrap, baitCrate, lureCan, fakeLoot, tripwire, barricade, smokeCloud, SMOKE_FX, gutSnare } from "../templates/props.js";
const TR = RULES.tricks;
const H = RULES.hunger;
import { SFX } from "./lib/sfx.js";
import DREAM from "./lib/data/dream.yml";
import CHARS from "./lib/data/characters.yml";
import { FAKE_NAMES } from "../templates/dream.js";
import { raycast } from "builtin/physics";
import { noise } from "./lib/noise.js";
const RV = RULES.reveal;
const PW = RULES.powers;

const DISGUISES = ["none", "crate", "barrel", "loot", "fisherman", "locker", "tarp", "dinghy", "dumpster"];
const BITERS = ["loot", "fisherman", "locker", "tarp", "dinghy", "dumpster"]; // forms a hider would open
const SPOT_FORMS = { locker: "locker", tarp: "tarp", boat: "dinghy", dumpster: "dumpster" };

function walkOf(ctx) { const w = (ctx.session.walk ??= {}); return (w[ctx.self.id] ??= {}); }
const phase = (ctx) => ctx.place.state.phase ?? "lobby";
const stunned = (ctx) => (ctx.self.state.stunUntil ?? 0) > ctx.now();
const rooted = (ctx) => (ctx.self.state.rootUntil ?? 0) > ctx.now() || stunned(ctx) || !!ctx.self.state.hiddenIn || !!ctx.self.state.talk;
const HIDE_NAMES = { locker: "a locker", tarp: "the tarp", boat: "the dinghy", dumpster: "the dumpster" };

function say(ctx, text) { ctx.self.state.msg = { text, at: ctx.now() }; }
function sound(ctx, clip, pos, volume = 0.8) { ctx.emit("playSound", { clip, position: pos ?? ctx.self.feetPosition, volume, maxDistance: 30 }); }
function chest(p) { return { x: p.x, y: p.y + 1.1, z: p.z }; }
function forward(ctx) { const w = walkOf(ctx); return { x: -(w.aimSin ?? 0), z: -(w.aimCos ?? 1) }; }

// every enemy body this role can hurt: players and the bot mimic
function enemies(ctx) {
  const role = ctx.self.state.role, out = [];
  for (const p of ctx.place.players) {
    if (p.id === ctx.self.id) continue;
    if (role === "mimic" && p.state.role === "hider") out.push(p);
    if (role === "hider" && (p.state.role === "mimic" || p.state.role === "hider")) out.push(p);
  }
  if (role === "mimic") for (const b of ctx.query({ tags: ["npc-hider"], radius: 30 })) if (!b.state.dead) out.push(ctx.getObject(b.id) ?? b);
  if (role === "mimic") for (const b of ctx.query({ tags: ["scarecrow"], radius: 30 })) out.push(b);
  if (role === "hider") for (const b of ctx.query({ tags: ["mimic-bot"], radius: 30 })) if (!b.state.dead) out.push(ctx.getObject(b.id) ?? b);
  return out;
}

function pickTarget(ctx, list, range, cone) {
  const me = ctx.self.feetPosition, f = forward(ctx);
  let best = null, bestD = range;
  for (const t of list) {
    const dx = t.feetPosition.x - me.x, dz = t.feetPosition.z - me.z, d = Math.hypot(dx, dz);
    if (d > bestD || Math.abs(t.feetPosition.y - me.y) > 2) continue;
    if (t.state?.smoked && d > 1.6) continue; // in the smoke you only find them by touch
    const ang = d < 1.7 ? 0 : (Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d))) * 180) / Math.PI;
    if (ang > cone / 2) continue;
    best = t; bestD = d;
  }
  return best;
}

const BLOOD = `fx
pop blood burst=16..24 life=.4..0.8 v=<%dir|0,0,1>*(2..4)+sdir()*(.6..1.4)+<0,1.2,0> size=.03..0.07 acc=grav()+drag(1) col=oklch(.35 .14 25)>oklch(.22 .1 25) a=1>.7:1>0 sz=$size floor=stick r=sprite(droplet,alpha,velocity,.03)
pop mist burst=4 life=.3..0.5 v=sdir()*.4 size=.2..0.35 acc=drag(2) col=oklch(.3 .12 25) a=.5>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const MORPH = `fx
pop splinters burst=20..30 life=.5..1 v=up(1.5..3)+sdir()*(1..2.5) size=.04..0.1 spin=-8..8 acc=grav()+drag(.8) col=oklch(.45 .05 60)>oklch(.3 .04 50) a=1>.7:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(splinter,alpha)
pop murk burst=6 life=.6..1 v=sdir()*.6+up(.3) size=.4..0.7 acc=drag(2)+buoy(.3) col=oklch(.2 .03 300) a=0>.15:.6>1:0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const FLASH = `fx
pop core burst=1 life=.25 size=5 col=hdr(6,6,5.5) a=1>0 sz=$size*(.4>1.4) r=sprite(soft-disc,add)
pop sparks burst=30 life=.2..0.5 v=sdir()*(5..9) size=.02..0.04 acc=drag(2) col=hdr(5,4,2) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)
pop glow burst=1 life=.3 g=1>0 r=light(<1,.95,.85>,$g*120,18)`;
const DUST = `fx
pop dust burst=10 life=.6..1.1 v=up(.3..0.8)+sdir()*.5 size=.12..0.25 acc=buoy(.3)+drag(1.6) col=oklch(.55 .03 70) a=0>.15:.4>1:0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;

function menuInput(ctx, input) {
  const s = ctx.self.state, a = input.actionData?.menu ?? {};
  if (!s.menu) {
    if ((s.role === "hider" || s.role === "mimic") && (phase(ctx) === "hide" || phase(ctx) === "hunt")) { s.msg = { text: "finish the round first", at: ctx.now() }; return; }
    s.menu = true; s.tutorial = false; return;
  }
  if (a.op === "tutorial") { s.tutorial = true; return; }
  // continue, or M while the page is up: remember it and drop onto the menu. M from the menu still closes.
  if (a.op === "tutordone" || (s.tutorial && !a.op)) { s.tutorial = false; s.sawTutorial = true; return; }
  if (s.tutorial) return;
  if (a.op === "pick") { if (CHARS.some((c) => c.id === a.char)) s.character = a.char; return; }
  if (a.op === "play") { s.menu = false; s.tutorial = false; return; }
  const room = a.op === "new" ? "room-" + Math.floor(ctx.random() * 1e6).toString(36) : a.op === "join" ? String(a.room ?? "") : "";
  if (!/^[a-z0-9_-]{1,64}$/.test(room)) { s.menu = false; return; }
  s.joining = true;
  const out = ctx.cross(ctx.self, "world:" + ctx.world.id + "/room:" + room);
  if (!out?.crossed) { s.joining = false; s.menuMsg = { text: out?.verdict?.message ?? "that lobby is full", at: ctx.now() }; }
}

export function onInput(ctx, input) {
  const w = walkOf(ctx), s = ctx.self.state;
  if (input.pressed.menu) return menuInput(ctx, input);
  if (s.menu) { w.moveIntent = { x: 0, z: 0 }; return; }
  w.aimSin = input.axes.aimYawSin ?? 0; w.aimCos = input.axes.aimYawCos ?? 1;
  const mx = input.axes.moveX ?? 0, mz = input.axes.moveZ ?? 0, mag = Math.hypot(mx, mz);
  const nx = mag > 1 ? mx / mag : mx, nz = mag > 1 ? mz / mag : mz;
  let speed = PLAYER.walkSpeed;
  if (s.role === "hider") speed = RULES.hiderSpeed;
  else if (s.role === "mimic") speed = s.disguise === "fisherman" ? RULES.fishermanSpeed : s.disguise && s.disguise !== "none" ? RULES.disguisedSpeed : !s.revealed ? RULES.hiderSpeed : RULES.seekerSpeed + (s.power ?? 0) * H.speedPer;
  else if (s.role === "ghost") speed = RULES.ghostSpeed;
  if (rooted(ctx)) speed = 0;
  w.moveIntent = { x: (w.aimCos * nx - w.aimSin * nz) * speed, z: -(w.aimSin * nx + w.aimCos * nz) * speed };
  if ((w.lungeUntil ?? 0) > ctx.now()) { const f = forward(ctx); w.moveIntent = { x: f.x * PW.lunge.speed, z: f.z * PW.lunge.speed }; }

  if (input.pressed.jump && ctx.self.grounded && !rooted(ctx)) {
    const v = ctx.self.velocity;
    ctx.self.velocity = { x: v.x, y: PLAYER.jumpSpeed * 0.75, z: v.z };
  }
  if (stunned(ctx)) return;
  const ph = phase(ctx);
  if (input.pressed.attack && s.talk) judgeTalk(ctx);
  else if (input.pressed.attack && !s.hiddenIn) attack(ctx, ph);
  if (input.pressed.interact && s.role === "hider") { if (s.hiddenIn) leaveHide(ctx); else if (s.talk) judgeTalk(ctx); else search(ctx); }
  if (input.pressed.disguise && s.role === "mimic" && ph !== "end") cycleDisguise(ctx);
  if (input.pressed.plant && s.role === "hider" && !s.hiddenIn) { if (!useDoor(ctx, "bar")) say(ctx, "no shut door to bar"); }
  if (input.pressed.interact && s.role !== "hider") {
    const food = s.role === "mimic" && ph === "hunt" && ctx.query({ tags: ["food"], radius: H.reach + 0.5 }).some((r) => !r.tags.includes("bait"));
    if (!food && !(s.disguise && s.disguise !== "none")) useDoor(ctx, "toggle");
  }
  if (input.pressed.interact && s.role === "mimic" && ph === "hunt") eat(ctx);
  if (input.pressed.blackout && s.role === "mimic" && ph === "hunt") blackout(ctx);
  if (input.pressed.falseclue && s.role === "mimic" && ph === "hunt") falseClue(ctx);
  if (input.pressed.plant && s.role === "mimic" && ph === "hunt") plantFake(ctx);
  if (s.role === "mimic" && ph === "hunt") {
    if (input.pressed.scent) power(ctx, "scent");
    if (input.pressed.lunge) power(ctx, "lunge");
    if (input.pressed.wail) power(ctx, "wail");
    if (input.pressed.fade) power(ctx, "fade");
    if (input.pressed.power) { const best = ["lunge", "scent", "wail", "fade"].find((k) => (s.power ?? 0) >= PW[k].at && ctx.now() >= (s.cd?.[k] ?? 0)); if (best) power(ctx, best); else say(ctx, (s.power ?? 0) ? "nothing ready" : "eat fish to grow powers"); }
  }
  if (s.role === "mimic" && ph === "hunt") {
    if (input.pressed.echo) trick(ctx, "echo");
    if (input.pressed.snare) trick(ctx, "snare");
    if (input.pressed.steal) trick(ctx, "steal");
  }
  for (const [i, kind] of [[1, "trap"], [2, "bait"], [3, "lure"], [4, "flash"], [5, "tripwire"], [6, "barricade"], [7, "smoke"], [8, "scarecrow"]])
    if (input.pressed["craft" + i] && s.role === "hider" && !s.hiddenIn && (ph === "hide" || ph === "hunt")) craft(ctx, kind);
}

function attack(ctx, ph) {
  const s = ctx.self.state, now = ctx.now();
  if (ph !== "hunt" || (s.role !== "hider" && s.role !== "mimic")) return;
  const w = s.role === "mimic" ? RULES.claw : RULES.stab;
  if (s.role === "mimic" && now < (s.clawReadyAt ?? 0)) { say(ctx, `claws not ready. ${Math.ceil((s.clawReadyAt - now) / 1000)}s`); return; }
  if (now < (s.atkAt ?? 0)) return;
  s.atkAt = now + w.cooldown * 1000;
  if (s.role === "mimic" && s.disguise !== "none") setDisguise(ctx, "none");
  s.swing = now; // the HUD and others read the swing beat
  const t = pickTarget(ctx, enemies(ctx), w.range, w.cone ?? 80);
  if (!t && s.role === "mimic") {
    const me = ctx.self.feetPosition;
    for (const r of ctx.query({ tags: ["hidespot"], radius: w.range + 1.2 })) {
      if (!r.state.occupant) continue;
      const spot = ctx.getObject(r.id), victim = ctx.place.players.find((p) => p.id === r.state.occupant) ?? ctx.getObject(r.state.occupant);
      spot.state.occupant = null;
      if (!victim) continue;
      victim.state.hp = (victim.state.hp ?? 100) - w.damage; victim.state.hurtAt = now; victim.state.stunUntil = now + 800;
      const at = { x: r.feetPosition.x, y: r.feetPosition.y + 1, z: r.feetPosition.z };
      ctx.emit("fx", { position: at, script: BLOOD, params: { dir: { x: 0, y: 1, z: 0 } } });
      ctx.emit("damageNumber", { position: { ...at, y: at.y + 0.6 }, value: w.damage, color: "oklch(0.65 0.2 25)", crit: true });
      ctx.emit("shake", { target: r.id, intensity: 0.4, duration: 0.4 });
      ctx.emit("hitstop", { duration: 0.05 });
      sound(ctx, SFX.claw, at, 1); sound(ctx, SFX.hurt, at, 0.8);
      say(ctx, "dragged one out");
      return;
    }
  }
  if (t && t.tags?.includes?.("scarecrow")) { popScarecrow(ctx, t, ctx.self); return; }
  if (!t && s.role === "mimic") {
    const me = ctx.self.feetPosition, f = forward(ctx);
    for (const r of ctx.query({ tags: ["barricade"], radius: w.range + 1.6 })) {
      const dx = r.feetPosition.x - me.x, dz = r.feetPosition.z - me.z, d = Math.hypot(dx, dz) || 1;
      if (d > 1.7 && (dx * f.x + dz * f.z) / d < 0.3) continue;
      hitBarricade(ctx, r.id); return;
    }
  }
  if (!t && s.role === "mimic") {
    const d = doorAhead(ctx, RULES.door.reach, true);
    if (d) { ctx.emit("press", { by: ctx.self.id, act: "claw" }, { to: d.id }); sound(ctx, SFX.whoosh, null, 0.5); return; }
  }
  if (!t && s.role === "hider") {
    // a stab into a fake loot crate splits it open
    const me = ctx.self.feetPosition, f = forward(ctx);
    for (const r of ctx.query({ tags: ["fake"], radius: w.range + 0.6 })) {
      const dx = r.feetPosition.x - me.x, dz = r.feetPosition.z - me.z, d = Math.hypot(dx, dz) || 1;
      if ((dx * f.x + dz * f.z) / d < 0.5) continue;
      ctx.destroy(r.id);
      ctx.emit("fx", { position: { x: r.feetPosition.x, y: r.feetPosition.y + 0.4, z: r.feetPosition.z }, script: MORPH });
      sound(ctx, SFX.unmorph, r.feetPosition, 0.9);
      say(ctx, "a fake. it shrieks and splits");
      return;
    }
  }
  if (!t) { sound(ctx, SFX.whoosh, null, 0.5); return; }
  // a hidden mimic's first strike is a killing one, once in a while
  const ambush = s.role === "mimic" && !s.revealed && t.state.role === "hider" && now >= (s.ambushAt ?? 0);
  if (ambush) s.ambushAt = now + RV.ambushCooldown * 1000;
  const dmg = ambush ? RV.ambushDamage : w.damage + (s.role === "mimic" ? (s.power ?? 0) * H.clawPer : 0);
  const hpLeft = (t.state.hp ?? 100) - dmg;
  t.state.hp = hpLeft;
  if (s.role === "mimic" && !s.revealed && t.state.role === "hider") witnessed(ctx, t, hpLeft);
  t.state.hurtAt = now;
  if (s.role === "mimic" && (s.power ?? 0) >= PW.frenzy.at) s.hp = Math.min(s.risen ? RULES.risenHp : RULES.seekerHp, (s.hp ?? 0) + PW.frenzy.heal);
  if (t.state.disguise && t.state.disguise !== "none") t.state.disguise = "none"; // a stab reveals the thing in the crate
  const f = forward(ctx), at = chest(t.feetPosition);
  ctx.emit("fx", { position: at, script: BLOOD, params: { dir: { x: f.x, y: 0.2, z: f.z } } });
  ctx.emit("damageNumber", { position: { x: at.x, y: at.y + 0.6, z: at.z }, value: dmg, color: s.role === "mimic" ? "oklch(0.65 0.2 25)" : "oklch(0.85 0.12 85)" });
  ctx.emit("squash", { target: t.id, axis: "y", intensity: 0.25, duration: 0.18 });
  ctx.emit("hitstop", { duration: 0.035 });
  ctx.emit("cameraPunch", { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.35 });
  sound(ctx, s.role === "mimic" ? SFX.claw : SFX.stab, at, 0.9);
  sound(ctx, s.role === "mimic" ? SFX.hurt : SFX.mimicHurt, at, 0.7);
}

// did anyone see it? the survivor, or any hider with a clear line to it inside the fog
function sightOf(ctx, from, to) {
  const o = { x: from.x, y: from.y + 1.6, z: from.z }, t = { x: to.x, y: to.y + 1.2, z: to.z };
  const d = { x: t.x - o.x, y: t.y - o.y, z: t.z - o.z }, len = Math.hypot(d.x, d.y, d.z) || 1;
  const hit = raycast(ctx, o, { x: d.x / len, y: d.y / len, z: d.z / len }, { distance: len, bodies: "static", physicsOnly: true });
  return !hit || hit.distance > len - 0.6;
}
function witnessed(ctx, victim, hpLeft) {
  const s = ctx.self.state, me = ctx.self.feetPosition, dark = !!ctx.place.state.dark, range = dark ? RV.dark : RV.witness;
  let who = hpLeft > 0 ? victim : null;
  if (!who) for (const p of ctx.place.players) {
    if (p.id === ctx.self.id || p.id === victim.id || p.state.role !== "hider" || p.state.hiddenIn) continue;
    if (Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z) > range) continue;
    if (sightOf(ctx, p.feetPosition, me)) { who = p; break; }
  }
  if (!who) { say(ctx, "nobody saw. stay one of them"); return; }
  s.revealed = true;
  const st = ctx.place.state, now = ctx.now();
  st.feed = [...(st.feed ?? []).slice(-3), { text: `${who.displayName} saw it. ${ctx.self.displayName} IS THE MIMIC`, at: now }];
  ctx.emit("fx", { position: me, script: MORPH });
  ctx.emit("playSound", { clip: SFX.unmorph, position: me, volume: 1, maxDistance: 50 });
  ctx.emit("screenShake", { intensity: 0.5, duration: 0.4 }, { audience: { nearby: me, radius: 25 } });
  say(ctx, `${who.displayName} saw you. the mask is off`);
}

// the nearest searchable thing in front of you: a loot crate, a bait crate, or the mimic wearing one
function nearestSearchable(ctx) {
  const me = ctx.self.feetPosition;
  let best = null, bestD = 2.6;
  for (const r of ctx.query({ tags: ["loot"], radius: 2.6 })) {
    const d = Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z);
    if (d < bestD) { best = { kind: r.tags.includes("fake") ? "fake" : "loot", row: r }; bestD = d; }
  }
  for (const r of ctx.query({ tags: ["clue"], radius: 2.4 })) {
    if (r.state.taken) continue;
    const d = Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z) - 0.6;
    if (d < bestD) { best = { kind: "clue", row: r }; bestD = d; }
  }
  for (const r of ctx.query({ tags: ["dreamer"], radius: DREAM.convince.reach })) {
    if (r.state.awake || r.state.talker) continue;
    const d = Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z) - 0.6;
    if (d < bestD) { best = { kind: "dreamer", row: r }; bestD = d; }
  }
  for (const r of ctx.query({ tags: ["hidespot"], radius: 2.8 })) {
    if (r.state.occupant) continue;
    const d = Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z) - 0.4;
    if (d < bestD) { best = { kind: "hide", row: r }; bestD = d; }
  }
  for (const p of ctx.place.players) {
    if (p.id === ctx.self.id || p.state.role !== "mimic" || !BITERS.includes(p.state.disguise)) continue;
    const d = Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z);
    if (d < bestD) { best = { kind: "mimic", row: p }; bestD = d; }
  }
  for (const b of ctx.query({ tags: ["mimic-bot"], radius: 2.6 })) {
    if (!BITERS.includes(b.state.disguise) || b.state.dead) continue;
    const d = Math.hypot(b.feetPosition.x - me.x, b.feetPosition.z - me.z);
    if (d < bestD) { best = { kind: "mimic", row: ctx.getObject(b.id) }; bestD = d; }
  }
  const door = doorAhead(ctx, RULES.door.reach, false);
  if (door) { const d = Math.hypot(door.feetPosition.x - me.x, door.feetPosition.z - me.z) + 0.4; if (d < bestD) { best = { kind: "door", row: door }; bestD = d; } }
  return best;
}
// the nearest door within reach, by its middle (a leaf's origin is its hinge); shutOnly for claws and bars
function doorAhead(ctx, reach, shutOnly) {
  const me = ctx.self.feetPosition; let best = null, bestD = reach;
  for (const r of ctx.query({ tags: ["door"], radius: reach + 1.6 })) {
    if (shutOnly && (r.state.open || r.state.broken)) continue;
    if (Math.abs(r.feetPosition.y - me.y) > 2.2) continue;
    const a = ((r.state.yaw0 ?? 0) * Math.PI) / 180, hw = (r.state.w ?? 1.2) / 2;
    const cx = r.feetPosition.x + Math.cos(a) * hw, cz = r.feetPosition.z - Math.sin(a) * hw;
    const d = Math.hypot(cx - me.x, cz - me.z);
    if (d < bestD) { best = r; bestD = d; }
  }
  return best;
}
function useDoor(ctx, act) {
  const d = doorAhead(ctx, RULES.door.reach, act === "bar");
  if (!d) return false;
  ctx.emit("press", { by: ctx.self.id, act }, { to: d.id });
  return true;
}

function search(ctx) {
  const s = ctx.self.state, now = ctx.now(), hit = nearestSearchable(ctx);
  if (!hit) return;
  const pos = hit.row.feetPosition;
  if (hit.kind === "mimic") {
    // the crate opens, and it has teeth
    s.hp = (s.hp ?? 100) - RULES.mimicLoot.damage;
    s.stunUntil = now + RULES.mimicLoot.stun * 1000; s.hurtAt = now;
    const wasMan = hit.row.state.disguise === "fisherman", wasSpot = ["locker", "tarp", "dinghy", "dumpster"].includes(hit.row.state.disguise);
    hit.row.state.disguise = "none";
    ctx.emit("fx", { position: chest(ctx.self.feetPosition), script: BLOOD, params: { dir: { x: 0, y: 1, z: 0 } } });
    ctx.emit("damageNumber", { position: chest(ctx.self.feetPosition), value: RULES.mimicLoot.damage, color: "oklch(0.65 0.2 25)", crit: true });
    ctx.emit("screenShake", { intensity: 0.6, duration: 0.4 });
    sound(ctx, SFX.bite, pos, 1);
    say(ctx, wasMan ? "THAT WASN'T A FISHERMAN" : wasSpot ? "THE HIDING PLACE HAD TEETH" : "IT WAS THE MIMIC");
    return;
  }
  if (hit.kind === "door") { useDoor(ctx, "toggle"); return; }
  if (hit.kind === "hide") { enterHide(ctx, hit.row.id); return; }
  if (hit.kind === "clue") { takeClue(ctx, hit.row.id); return; }
  if (hit.kind === "dreamer") { startTalk(ctx, hit.row.id); return; }
  if (hit.kind === "fake") {
    // the mimic's fake: the lid opens on teeth
    s.hp = (s.hp ?? 100) - RULES.fake.damage;
    s.stunUntil = now + RULES.fake.stun * 1000; s.hurtAt = now;
    ctx.destroy(hit.row.id);
    ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.5, z: pos.z }, script: MORPH });
    ctx.emit("fx", { position: chest(ctx.self.feetPosition), script: BLOOD, params: { dir: { x: 0, y: 1, z: 0 } } });
    ctx.emit("damageNumber", { position: chest(ctx.self.feetPosition), value: RULES.fake.damage, color: "oklch(0.65 0.2 25)", crit: true });
    ctx.emit("screenShake", { intensity: 0.5, duration: 0.35 });
    sound(ctx, SFX.bite, pos, 1);
    say(ctx, "FAKE. it had teeth");
    ctx.emit("stat", { name: "bitten by fake loot" });
    return;
  }
  const crate = ctx.getObject(hit.row.id);
  if (!crate) return;
  noise(ctx, pos, RULES.noise.loot, "loot");
  if ((crate.state.emptyUntil ?? 0) > now) { sound(ctx, SFX.empty, pos, 0.5); say(ctx, `picked clean. refills in ${Math.ceil((crate.state.emptyUntil - now) / 1000)}s`); return; }
  crate.state.emptyUntil = now + RULES.lootRefill * 1000;
  const inv = { scrap: 0, wire: 0, powder: 0, ...(s.inv ?? {}) }, got = [];
  const n = 1 + (ctx.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) { const r = ctx.random(), k = r < 0.45 ? "scrap" : r < 0.75 ? "wire" : "powder"; inv[k]++; got.push(k); }
  s.inv = inv;
  sound(ctx, SFX.rummage, pos, 0.7);
  ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.7, z: pos.z }, script: DUST });
  ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+" + got.join(" +"), color: "oklch(0.85 0.12 85)" });
  ctx.emit("stat", { name: "crates searched" });
}

function craft(ctx, kind) {
  const s = ctx.self.state, need = RULES.recipes[kind], inv = { scrap: 0, wire: 0, powder: 0, ...(s.inv ?? {}) };
  for (const k in need) if ((inv[k] ?? 0) < need[k]) { say(ctx, `need ${Object.entries(need).map(([a, b]) => b + " " + a).join(" + ")}`); return; }
  for (const k in need) inv[k] -= need[k];
  s.inv = inv;
  const me = ctx.self.feetPosition, f = forward(ctx), now = ctx.now();
  const at = (d, y = 0) => ({ x: me.x + f.x * d, y: me.y + y, z: me.z + f.z * d });
  sound(ctx, SFX.craft, null, 0.6);
  ctx.emit("stat", { name: "crafted " + kind });
  if (kind === "trap") ctx.spawn({ ...bearTrap, feetPosition: at(1.1, 0.04), state: { kind: "trap", owner: ctx.self.id, armAt: now + 1000 } });
  if (kind === "bait") ctx.spawn({ ...baitCrate, feetPosition: at(1.4), rotation: { yaw: ctx.random() * 360 }, state: { kind: "bait", owner: ctx.self.id, armAt: now + 1500, emptyUntil: 0 } });
  if (kind === "lure") ctx.spawn({ ...lureCan, feetPosition: at(1, 0.02), state: { kind: "lure", owner: ctx.self.id, fireAt: now + RULES.lure.delay * 1000 } });
  if (kind === "flash") {
    const p = at(2, 1.2);
    ctx.emit("fx", { position: p, script: FLASH });
    sound(ctx, SFX.flash, p, 1);
    for (const t of enemies(ctx)) {
      const dx = t.feetPosition.x - me.x, dz = t.feetPosition.z - me.z, d = Math.hypot(dx, dz);
      if (d > RULES.flash.range) continue;
      const ang = d < 1 ? 0 : (Math.acos((dx * f.x + dz * f.z) / d) * 180) / Math.PI;
      if (ang > RULES.flash.cone) continue;
      t.state.stunUntil = now + RULES.flash.stun * 1000;
      if (t.state.disguise && t.state.disguise !== "none") t.state.disguise = "none";
      if (t.state.role === "mimic") ctx.emit("screenFlash", { color: "white", duration: 1.2, intensity: 0.9 }, { audience: { player: t.id } });
    }
  }
  const yaw = (Math.atan2(-f.x, -f.z) * 180) / Math.PI;
  if (kind === "tripwire") ctx.spawn({ ...tripwire(RULES.tripwire.length), feetPosition: at(1.2), rotation: { yaw }, state: { kind: "tripwire", owner: ctx.self.id, armAt: now + 1500, yaw } });
  if (kind === "barricade") {
    const mine = ctx.query({ tags: ["barricade"], radius: 400 }).filter((r) => r.state.owner === ctx.self.id);
    if (mine.length >= RULES.barricade.max) ctx.destroy(mine.sort((a, b) => (a.state.at ?? 0) - (b.state.at ?? 0))[0].id);
    ctx.spawn({ ...barricade(RULES.barricade.width), feetPosition: at(1.4), rotation: { yaw }, state: { kind: "barricade", owner: ctx.self.id, hp: RULES.barricade.hp, at: now } });
    sound(ctx, SFX.hammer, at(1.4), 0.9);
    noise(ctx, me, RULES.noise.door, "door");
  }
  if (kind === "smoke") {
    const p = at(0.5);
    ctx.spawn({ ...smokeCloud, feetPosition: p, lifetime: RULES.smoke.seconds, fx: { script: SMOKE_FX, params: { r: RULES.smoke.radius } }, state: { kind: "smoke", radius: RULES.smoke.radius, until: now + RULES.smoke.seconds * 1000 } });
    sound(ctx, SFX.smoke, p, 1);
  }
  if (kind === "scarecrow") {
    const mine = ctx.query({ tags: ["scarecrow"], radius: 400 }).filter((r) => r.state.owner === ctx.self.id);
    if (mine.length >= RULES.scarecrow.max) ctx.destroy(mine.sort((a, b) => (a.state.at ?? 0) - (b.state.at ?? 0))[0].id);
    const c = CHARS.find((x) => x.id === (s.character ?? "own")), model = c?.model ?? s.avatarModel ?? CHARS.find((x) => x.model)?.model;
    ctx.spawn({ tags: ["scarecrow"], model, feetPosition: at(1.3), rotation: { yaw: yaw + 180 + (ctx.random() - 0.5) * 40 }, castShadow: true, mixer: { base: { clip: "Idle", loop: "loop" } },
      children: [{ id: "lamp", feetPosition: { x: 0.35, y: 1.15, z: -0.3 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 1.6, distance: 7 } }],
      state: { kind: "scarecrow", owner: ctx.self.id, at: now, role: "hider" } });
  }
  const names = { trap: "bear trap set", bait: "rigged fish set", lure: "rattle lure: 6s", flash: "FLASH", tripwire: "tripwire strung. it rings when it crosses", barricade: "planks nailed up", smoke: "SMOKE. you can't be seen in it", scarecrow: "a scarecrow wearing your face" };
  say(ctx, names[kind]);
}

// ── the dream ──
function takeClue(ctx, id) {
  const c = ctx.getObject(id);
  if (!c || c.state.taken) return;
  c.state.taken = true; c.visible = false;
  if (c.tags?.includes("falseclue") || c.state.owner) {
    const s = ctx.self.state, now = ctx.now();
    s.hp = (s.hp ?? 100) - DM.falseClueDamage; s.hurtAt = now; s.stunUntil = now + DM.falseClueStun * 1000;
    s.read = { text: "it was a lie. the picture smiles at you", at: now };
    ctx.emit("fx", { position: c.feetPosition, script: MORPH });
    ctx.emit("damageNumber", { position: chest(ctx.self.feetPosition), value: DM.falseClueDamage, color: "oklch(0.65 0.2 25)", crit: true });
    ctx.emit("screenShake", { intensity: 0.4, duration: 0.3 });
    sound(ctx, SFX.wrong, c.feetPosition, 1);
    ctx.place.state.noise = { x: c.feetPosition.x, z: c.feetPosition.z, at: now };
    ctx.destroy(c.id);
    return;
  }
  ctx.self.state.read = { text: c.state.text, pic: c.state.pic, at: ctx.now() };
  sound(ctx, SFX.shard, c.feetPosition, 0.9);
  ctx.emit("damageNumber", { position: { ...c.feetPosition, y: c.feetPosition.y + 1.6 }, text: "CLUE", color: "oklch(0.85 0.1 230)" });
  ctx.emit("stat", { name: "clues found" });
}
function convinceTune(ctx) {
  const n = ctx.place.state.clues ?? 0, C = DREAM.convince;
  return { period: C.period + n * C.periodPerClue, zone: Math.min(C.zoneMax, C.zone + n * C.zonePerClue) };
}
function newZone(ctx, w) { const a = 0.05 + ctx.random() * (0.9 - w); return [a, a + w]; }
function startTalk(ctx, id) {
  const npc = ctx.getObject(id), now = ctx.now();
  if (!npc || npc.state.awake || npc.state.talker) return;
  if ((npc.state.coolUntil ?? 0) > now) { say(ctx, `${npc.state.name} won't hear you yet`); return; }
  const t = convinceTune(ctx);
  npc.state.talker = ctx.self.id;
  noise(ctx, npc.feetPosition, RULES.noise.talk, "talk");
  ctx.self.state.talk = { npc: id, name: npc.state.name, at: now, period: t.period, zone: newZone(ctx, t.zone), hits: 0, misses: 0 };
  ctx.self.velocity = { x: 0, y: ctx.self.velocity.y, z: 0 };
}
function needle(talk, now) { const x = ((now - talk.at) / talk.period) % 2; return x < 1 ? x : 2 - x; }
function endTalk(ctx) {
  const s = ctx.self.state, npc = s.talk ? ctx.getObject(s.talk.npc) : null;
  if (npc && npc.state.talker === ctx.self.id) npc.state.talker = null;
  s.talk = null;
}
function judgeTalk(ctx) {
  const s = ctx.self.state, now = ctx.now(), tk = s.talk, npc = ctx.getObject(tk.npc), C = DREAM.convince;
  if (!npc) { endTalk(ctx); return; }
  if (now - (tk.pressAt ?? 0) < 180) return;
  const u = needle(tk, now), hit = u >= tk.zone[0] - 0.015 && u <= tk.zone[1] + 0.015;
  const t = convinceTune(ctx), next = { ...tk, pressAt: now };
  if (now - (tk.noiseAt ?? 0) > 2500) { next.noiseAt = now; noise(ctx, npc.feetPosition, RULES.noise.talk, "talk"); }
  if (hit) {
    next.hits++; next.zone = newZone(ctx, t.zone); next.flash = { ok: true, at: now };
    sound(ctx, SFX.tick, npc.feetPosition, 0.7);
    if (next.hits >= C.hits) {
      npc.state.awake = true; npc.state.talker = null; s.talk = null;
      say(ctx, `${npc.state.name} wakes up`);
      ctx.emit("stat", { name: "dreamers woken" });
      return;
    }
  } else {
    next.misses++; next.flash = { ok: false, at: now };
    sound(ctx, SFX.wrong, npc.feetPosition, 0.7);
    if (next.misses >= C.misses) {
      npc.state.coolUntil = now + C.cooldown * 1000; npc.state.talker = null; s.talk = null;
      ctx.emit("playSound", { clip: SFX.scream, position: npc.feetPosition, volume: 1, maxDistance: 60 });
      ctx.emit("shake", { target: npc.id, intensity: 0.3, duration: 1 });
      ctx.place.state.noise = { x: npc.feetPosition.x, z: npc.feetPosition.z, at: now };
      say(ctx, `${npc.state.name} screams. it heard that`);
      return;
    }
  }
  s.talk = next;
}

function enterHide(ctx, id) {
  const s = ctx.self.state, spot = ctx.getObject(id);
  if (!spot || spot.state.occupant) return;
  spot.state.occupant = ctx.self.id;
  s.hiddenIn = id; s.hideFrom = { ...ctx.self.feetPosition };
  const f = spot.feetPosition, i = spot.state.inside ?? { x: 0, y: 0, z: 0 };
  ctx.self.feetPosition = { x: f.x + i.x, y: f.y + i.y, z: f.z + i.z };
  ctx.self.velocity = { x: 0, y: 0, z: 0 };
  sound(ctx, spot.state.kind === "locker" || spot.state.kind === "dumpster" ? SFX.cage : SFX.rummage, f, 0.35);
  say(ctx, `hiding in ${HIDE_NAMES[spot.state.kind] ?? "it"}. E to climb out`);
}
function leaveHide(ctx, quiet) {
  const s = ctx.self.state, spot = s.hiddenIn ? ctx.getObject(s.hiddenIn) : null;
  if (spot && spot.state.occupant === ctx.self.id) spot.state.occupant = null;
  if (spot) {
    // step out the front (its −Z), or back where you climbed in from
    const yaw = ((spot.rotation?.yaw ?? 0) * Math.PI) / 180, f = spot.feetPosition;
    const out = { x: f.x - Math.sin(yaw) * 1.3, y: f.y + 0.1, z: f.z - Math.cos(yaw) * 1.3 };
    ctx.self.feetPosition = spot.state.kind === "tarp" || spot.state.kind === "boat" ? (s.hideFrom ?? out) : out;
    if (!quiet) sound(ctx, spot.state.kind === "locker" || spot.state.kind === "dumpster" ? SFX.cage : SFX.rummage, f, 0.35);
  }
  s.hiddenIn = null;
}

// the mimic eats: a real pile feeds it; a rigged one is judged by the referee the moment it gets close
function eat(ctx) {
  const s = ctx.self.state, me = ctx.self.feetPosition;
  const r = ctx.query({ tags: ["food"], radius: H.reach + 0.5 }).find((r) => !r.tags.includes("bait"));
  if (!r) return;
  if ((s.power ?? 0) >= H.max) { say(ctx, "gorged. nothing more fits"); return; }
  ctx.destroy(r.id);
  s.power = (s.power ?? 0) + 1;
  ctx.place.state.ate = { at: ctx.now(), x: r.feetPosition.x, z: r.feetPosition.z };
  ctx.emit("fx", { position: { ...r.feetPosition, y: r.feetPosition.y + 0.3 }, script: BLOOD, params: { dir: { x: 0, y: 1, z: 0 } } });
  ctx.emit("playSound", { clip: SFX.eat, position: me, volume: 1, maxDistance: 35 });
  const KEY = { scent: "C", lunge: "V", wail: "X", fade: "Z", frenzy: "" };
  const got = Object.keys(PW).find((k) => PW[k].at === s.power);
  say(ctx, got ? `fed. ${got.toUpperCase()} awakens${KEY[got] ? " · " + KEY[got] : ": your claws heal you"}` : `fed. power ${s.power}/${H.max}`);
}

// ── the dream master ──
const DM = RULES.dreamMaster;
function blackout(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (now < (s.darkAt ?? 0)) { say(ctx, `the dark returns in ${Math.ceil((s.darkAt - now) / 1000)}s`); return; }
  s.darkAt = now + DM.blackoutCooldown * 1000;
  ctx.place.state.blackout = { until: now + DM.blackout * 1000, at: now };
  say(ctx, "the lamps die");
}
function falseClue(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (now < (s.lieAt ?? 0)) { say(ctx, `a new lie in ${Math.ceil((s.lieAt - now) / 1000)}s`); return; }
  s.lieAt = now + DM.falseClueCooldown * 1000;
  const mine = ctx.query({ tags: ["falseclue"] }).filter((r) => r.state.owner === ctx.self.id && !r.state.taken);
  if (mine.length >= DM.falseClueMax) ctx.destroy(mine.sort((a, b) => a.state.at - b.state.at)[0].id);
  const real = DREAM.clues[Math.floor(ctx.random() * DREAM.clues.length)];
  const me = ctx.self.feetPosition, f = forward(ctx);
  ctx.spawn({ template: "templates/dream.js#clue", tags: ["clue", "falseclue"], feetPosition: { x: me.x + f.x * 1.5, y: me.y + 1.1, z: me.z + f.z * 1.5 },
    material: { texture: real.pic, emissive: "oklch(0.35 0.05 230)", emissiveIntensity: 0.5, roughness: 0.5 }, state: { text: real.text, pic: real.pic, taken: false, owner: ctx.self.id, at: now } });
  say(ctx, "a lie hangs in the air");
}

function plantFake(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (now < (s.plantAt ?? 0)) { say(ctx, `fake loot ready in ${Math.ceil((s.plantAt - now) / 1000)}s`); return; }
  const mine = ctx.query({ tags: ["fake"] }).filter((r) => r.state.owner === ctx.self.id);
  if (mine.length >= RULES.fake.max) { const old = mine.sort((a, b) => (a.state.at ?? 0) - (b.state.at ?? 0))[0]; ctx.destroy(old.id); } // the oldest crumbles
  s.plantAt = now + RULES.fake.cooldown * 1000;
  const me = ctx.self.feetPosition, f = forward(ctx);
  ctx.spawn({ ...fakeLoot, feetPosition: { x: me.x + f.x * 1.4, y: me.y, z: me.z + f.z * 1.4 }, rotation: { yaw: Math.floor(ctx.random() * 4) * 90 + (ctx.random() - 0.5) * 20 }, state: { kind: "fake", owner: ctx.self.id, at: now, emptyUntil: 0 } });
  sound(ctx, SFX.morph, null, 0.35);
  say(ctx, "fake loot planted. let them open it");
}

// what the fish grew: each power level unlocks one, each with its own cooldown in state.cd
const SNIFF = `fx
pop ring burst=1 life=.9 size=1 col=oklch(.7 .18 25) a=.6>0 sz=$size*(1>30) r=sprite(soft-disc,add)`;
const WAIL = `fx
pop ring burst=3 life=.7..1 size=1 col=oklch(.75 .12 300) a=.7>0 sz=$size*(1>22) r=sprite(soft-disc,add)
pop murk burst=14 life=.8..1.4 v=sdir()*(3..6) size=.4..0.8 acc=drag(2) col=oklch(.2 .05 300) a=0>.1:.5>1:0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
function power(ctx, k) {
  const s = ctx.self.state, now = ctx.now(), P = PW[k], me = ctx.self.feetPosition;
  if ((s.power ?? 0) < P.at) { say(ctx, `${k} needs ${P.at} fish in you`); return; }
  const cd = s.cd ?? {};
  if (now < (cd[k] ?? 0)) { say(ctx, `${k} in ${Math.ceil((cd[k] - now) / 1000)}s`); return; }
  s.cd = { ...cd, [k]: now + P.cooldown * 1000 };
  if (k !== "scent" && s.disguise && s.disguise !== "none") setDisguise(ctx, "none");
  if (k === "scent") {
    let n = 0;
    for (const p of ctx.place.players) {
      if (p.state.role !== "hider" || p.state.smoked || Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z) > P.range) continue;
      const spot = p.state.hiddenIn ? ctx.getObject(p.state.hiddenIn) : null;
      ctx.emit("highlightSet", { target: spot ? spot.id : p.id, color: "oklch(0.7 0.2 25)", style: "xray", duration: P.seconds }, { audience: { player: ctx.self.id } });
      n++;
    }
    ctx.emit("fx", { position: me, script: SNIFF }, { audience: { player: ctx.self.id } });
    ctx.emit("playSound", { clip: SFX.sniff, position: me, volume: 0.7, maxDistance: 12 });
    say(ctx, n ? `you smell ${n} of them` : "nothing living near");
  } else if (k === "lunge") {
    walkOf(ctx).lungeUntil = now + P.seconds * 1000;
    s.atkAt = 0;
    ctx.emit("playSound", { clip: SFX.lunge, position: me, volume: 0.9, maxDistance: 25 });
    ctx.emit("fx", { position: me, script: DUST });
  } else if (k === "wail") {
    for (const p of ctx.place.players) {
      if (p.state.role !== "hider" || Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z) > P.radius) continue;
      p.state.stunUntil = now + P.stun * 1000; p.state.hurtAt = now;
      ctx.emit("screenShake", { intensity: 0.7, duration: 0.6 }, { audience: { player: p.id } });
    }
    ctx.emit("fx", { position: { ...me, y: me.y + 1.2 }, script: WAIL });
    ctx.emit("shockwave", { position: me, speed: 16, thickness: 1.2, intensity: 0.7 });
    ctx.emit("playSound", { clip: SFX.wail, position: me, volume: 1, maxDistance: 60 });
    if (!s.revealed) {
      s.revealed = true;
      const st = ctx.place.state;
      st.feed = [...(st.feed ?? []).slice(-3), { text: `that scream came from ${ctx.self.displayName}. THE MIMIC`, at: now }];
    }
  } else if (k === "fade") {
    s.fadeUntil = now + P.seconds * 1000;
    ctx.emit("fx", { position: me, script: MORPH });
    ctx.emit("playSound", { clip: SFX.fade, position: me, volume: 0.6, maxDistance: 15 });
    say(ctx, "they can't see you. move");
  }
}

// ── the creative kit ──
const POP = `fx
pop powder burst=40 life=.6..1.2 v=sdir()*(2..5)+up(1..2) size=.15..0.35 acc=drag(2)+buoy(.2) col=<.85,.8,.7> a=0>.1:.8>1:0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)
pop straw burst=24 life=.6..1.2 v=sdir()*(2..4)+up(2) size=.04..0.09 spin=-9..9 acc=grav()+drag(.6) col=oklch(.75 .1 85) a=1 sz=$size rot=$age*$spin floor=stick r=sprite(splinter,alpha)
pop glow burst=1 life=.25 g=1>0 r=light(<1,.9,.7>,$g*60,10)`;
const SPLINT = `fx
pop chips burst=22 life=.6..1.2 v=sdir()*(2.5..5)+up(1..2.5) size=.04..0.12 spin=-9..9 acc=grav()+drag(.4) col=oklch(.3 .03 50) a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(splinter,alpha)`;
// the mimic claws a scarecrow: powder in its eyes, and everyone knows what clawed it
export function popScarecrow(ctx, row, striker) {
  const now = ctx.now(), p = row.feetPosition, at = { x: p.x, y: p.y + 1.1, z: p.z };
  ctx.destroy(row.id);
  ctx.emit("fx", { position: at, script: POP });
  ctx.emit("playSound", { clip: SFX.pop, position: at, volume: 1, maxDistance: 45 });
  ctx.emit("shockwave", { position: at, speed: 10, thickness: 0.8, intensity: 0.4 });
  if (striker?.state) {
    striker.state.stunUntil = now + RULES.scarecrow.stun * 1000;
    if (striker.state.disguise && striker.state.disguise !== "none") striker.state.disguise = "none";
    if (striker.isLocal) ctx.emit("screenFlash", { color: "oklch(0.9 0.05 85)", duration: 1, intensity: 0.7 }, { audience: { player: striker.id } });
    if (striker.state.role === "mimic" && !striker.state.revealed && striker.displayName) {
      striker.state.revealed = true;
      const st = ctx.place.state; st.feed = [...(st.feed ?? []).slice(-3), { text: `${striker.displayName} clawed a scarecrow. THE MIMIC`, at: now }];
    }
  }
  noise(ctx, p, RULES.noise.lure, "loot");
  say(ctx, "a scarecrow. powder in your eyes");
}
function hitBarricade(ctx, id) {
  const b = ctx.getObject(id); if (!b) return;
  b.state.hp = (b.state.hp ?? RULES.barricade.hp) - 1;
  const p = b.feetPosition, at = { x: p.x, y: p.y + 1, z: p.z };
  ctx.emit("fx", { position: at, script: SPLINT });
  noise(ctx, p, RULES.noise.door, "door");
  if (b.state.hp <= 0) { ctx.destroy(id); ctx.emit("playSound", { clip: SFX.doorBreak, position: at, volume: 1, maxDistance: 40 }); say(ctx, "the planks give"); }
  else { ctx.emit("shake", { target: id, intensity: 0.3, duration: 0.25 }); ctx.emit("playSound", { clip: SFX.doorHit, position: at, volume: 1, maxDistance: 30 }); say(ctx, `planks: ${b.state.hp} left`); }
}
function trick(ctx, k) {
  const s = ctx.self.state, now = ctx.now(), T = TR[k], cd = s.cd ?? {}, me = ctx.self.feetPosition, f = forward(ctx);
  if (now < (cd[k] ?? 0)) { say(ctx, `${k} in ${Math.ceil((cd[k] - now) / 1000)}s`); return; }
  if (k === "echo") {
    // the cry lands where the fog swallows it: ahead, short of the first wall
    const o = { x: me.x, y: me.y + 1.4, z: me.z }, hit = raycast(ctx, o, { x: f.x, y: 0, z: f.z }, { distance: T.distance, bodies: "static", physicsOnly: true });
    const d = hit ? Math.max(2, hit.distance - 0.8) : T.distance, p = { x: me.x + f.x * d, y: me.y + 1.2, z: me.z + f.z * d };
    ctx.emit("playSound", { clip: SFX.echo, position: p, volume: 1, maxDistance: 40 });
    say(ctx, "your voice, over there. someone will come");
  } else if (k === "snare") {
    const mine = ctx.query({ tags: ["snare"], radius: 400 }).filter((r) => r.state.owner === ctx.self.id);
    if (mine.length >= T.max) ctx.destroy(mine.sort((a, b) => (a.state.at ?? 0) - (b.state.at ?? 0))[0].id);
    ctx.spawn({ ...gutSnare, feetPosition: { x: me.x + f.x * 1.2, y: me.y + 0.02, z: me.z + f.z * 1.2 }, state: { kind: "snare", owner: ctx.self.id, at: now, armAt: now + 1500 } });
    sound(ctx, SFX.morph, null, 0.3);
    say(ctx, "a snare in the dirt. you'll hear it");
  } else if (k === "steal") {
    if (s.revealed) { say(ctx, "they've seen what you are. no face fits now"); return; }
    let best = null, bd = T.reach;
    for (const p of ctx.place.players) { if (p.id === ctx.self.id || p.state.role !== "hider") continue; const d = Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z); if (d < bd) { best = p; bd = d; } }
    if (!best) { say(ctx, "nobody close enough to wear"); return; }
    s.faceOf = best.state.character ?? "own"; s.faceName = best.displayName;
    ctx.emit("fx", { position: me, script: MORPH });
    sound(ctx, SFX.steal, null, 0.5);
    say(ctx, `you wear ${best.displayName}'s face now`);
  }
  s.cd = { ...cd, [k]: now + T.cooldown * 1000 };
}

function setDisguise(ctx, d) {
  const s = ctx.self.state;
  if (s.disguise === d) return;
  const was = s.disguise;
  s.disguise = d;
  if (d === "fisherman") s.name = FAKE_NAMES[Math.floor(ctx.random() * FAKE_NAMES.length)];
  ctx.emit("fx", { position: ctx.self.feetPosition, script: MORPH });
  sound(ctx, d === "none" ? SFX.unmorph : SFX.morph, null, 0.55);
  if (d === "fisherman") say(ctx, `you are ${s.name}, a sleepwalker. shuffle, don't run.`);
  else if (was === "none" || !was) say(ctx, `you are a ${d === "loot" ? "loot crate" : d}. hold still.`);
}
function cycleDisguise(ctx) {
  const s = ctx.self.state, i = DISGUISES.indexOf(s.disguise ?? "none");
  setDisguise(ctx, DISGUISES[(i + 1) % DISGUISES.length]);
}

// the body's look follows its state: a disguised mimic draws the form, a ghost draws nothing, a hider carries a lamp
// the picked character: a model on the body; "own" gives the Spawn avatar back
function wear(ctx) {
  const s = ctx.self.state;
  if (s.faceOf && s.role !== "mimic") s.faceOf = null;
  const want = (s.role === "mimic" && !s.revealed && s.faceOf) || s.character || "own";
  if (s.wearing === want) return;
  if (s.avatarModel === undefined) s.avatarModel = ctx.self.model ?? null;
  const c = CHARS.find((x) => x.id === want);
  ctx.self.model = c?.model ?? s.avatarModel;
  s.wearing = want;
}

function dress(ctx) {
  const s = ctx.self.state, w = walkOf(ctx);
  const form = s.role === "mimic" && s.disguise && s.disguise !== "none" ? s.disguise : null;
  if (form !== (w.form ?? null)) {
    if (w.formId) ctx.destroy(w.formId);
    w.formId = null; w.form = form;
    if (form === "fisherman") w.formId = ctx.spawn({ parent: ctx.self.id, id: "form", template: "templates/dream.js#fishermanForm", feetPosition: { x: 0, y: 0, z: 0 }, state: { name: s.name, line: null } });
    else if (form) {
      const f = FORMS[form];
      w.formId = ctx.spawn({ parent: ctx.self.id, id: "form", primitive: f.primitive, material: f.material, children: f.children, feetPosition: { x: 0, y: 0, z: 0 } });
    }
  }
  // the borrowed fisherman shuffles when the body moves
  if (form === "fisherman" && w.formId) {
    const v = ctx.self.velocity, clip = Math.hypot(v.x, v.z) > 0.4 ? "Walk" : "Idle", h = ctx.getObject(w.formId);
    if (h && w.formClip !== clip) { w.formClip = clip; h.anim.base = clip; }
  } else w.formClip = null;
  // a mimic out of disguise wears the monster: the original seeker and every risen hider alike
  const faded = s.role === "mimic" && (s.fadeUntil ?? 0) > ctx.now();
  if (!!s.faded !== faded) s.faded = faded;
  const beast = s.role === "mimic" && !form && !!s.revealed && !faded;
  if (beast !== !!w.beastId) {
    if (w.beastId) { ctx.destroy(w.beastId); w.beastId = null; }
    if (beast) w.beastId = ctx.spawn({ parent: ctx.self.id, id: "beast", template: "templates/creature.js#mimicBody", feetPosition: { x: 0, y: 0, z: 0 } });
  }
  const render = !(form || beast || faded || s.role === "ghost" || s.hiddenIn || (s.smoked && s.role === "hider"));
  if (ctx.self.render !== render) ctx.self.render = render;
  const lamp = (s.role === "hider" && !s.hiddenIn && !s.smoked) || (s.role === "mimic" && !s.revealed && !form && !faded); // the hidden mimic carries a lamp like anyone
  if (lamp !== !!w.lampId) {
    if (w.lampId) { ctx.destroy(w.lampId); w.lampId = null; }
    if (lamp) w.lampId = ctx.spawn({ parent: ctx.self.id, id: "lamp", feetPosition: { x: 0.35, y: 1.15, z: -0.3 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 1.6, distance: 7 } });
  }
}

export function update(ctx, dt) {
  if (ctx.self.parent) return;
  const s = ctx.self.state, w = walkOf(ctx), now = ctx.now();
  if (ctx.self.isLocal) {
    // the menu's camera: a slow drift over the fogged yard
    if (s.menu) { const a = now / 26000; ctx.view.camera = { eye: { x: Math.cos(a) * 46, y: 26, z: 30 + Math.sin(a) * 46 }, aim: { x: 0, y: 2, z: 30 }, fov: 55 }; ctx.session.menuCam = true; }
    else if (ctx.session.menuCam) { ctx.view.camera = null; ctx.session.menuCam = false; }
  }
  wear(ctx);
  dress(ctx);
  if (s.talk) {
    const npc = ctx.getObject(s.talk.npc);
    if (!npc || s.role !== "hider" || (s.hurtAt ?? 0) > s.talk.at || phase(ctx) === "end" || Math.hypot(npc.feetPosition.x - ctx.self.feetPosition.x, npc.feetPosition.z - ctx.self.feetPosition.z) > 4) endTalk(ctx);
  }
  if (s.hiddenIn) {
    const spot = ctx.getObject(s.hiddenIn);
    if (!spot || spot.state.occupant !== ctx.self.id || s.role !== "hider") { leaveHide(ctx, true); }
    else {
      const f = spot.feetPosition, i = spot.state.inside ?? { x: 0, y: 0, z: 0 }, want = { x: f.x + i.x, y: f.y + i.y, z: f.z + i.z }, p = ctx.self.feetPosition;
      if (Math.hypot(p.x - want.x, p.z - want.z) > 0.3 || Math.abs(p.y - want.y) > 0.3) ctx.self.feetPosition = want;
      ctx.self.velocity = { x: 0, y: 0, z: 0 };
    }
  }
  // walking
  const v = ctx.self.velocity, intent = rooted(ctx) ? { x: 0, z: 0 } : w.moveIntent ?? { x: 0, z: 0 };
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && (intent.x !== 0 || intent.z !== 0));
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * dt;
  const dx = intent.x - v.x, dz = intent.z - v.z, gap = Math.hypot(dx, dz), k = gap > step ? step / gap : 1;
  const vx = v.x + dx * k, vz = v.z + dz * k;
  if (!s.hiddenIn) ctx.self.velocity = { x: vx, y: v.y + ctx.place.gravity.y * dt, z: vz };

  if (now > (w.smokeAt ?? 0)) {
    w.smokeAt = now + 300;
    const me = ctx.self.feetPosition, inSmoke = s.role === "hider" && ctx.query({ tags: ["smoke"], radius: 8 }).some((r) => (r.state.until ?? 0) > now && Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z) < (r.state.radius ?? 4));
    if (!!s.smoked !== inSmoke) s.smoked = inSmoke;
  }
  if (s.role === "hider" && phase(ctx) !== "lobby") {
    // the search prompt, written when its target changes
    if (now > (w.promptAt ?? 0)) {
      w.promptAt = now + 200;
      const h = s.hiddenIn ? null : nearestSearchable(ctx), id = h ? h.row.id : null;
      const verb = h ? ({ hide: "Hide", clue: "Take", dreamer: "Wake " + (h.row.state.name ?? "them"), mimic: h.row.state.disguise === "fisherman" ? "Wake " + (h.row.state.name ?? "them") : SPOT_FORMS[Object.keys(SPOT_FORMS).find((k) => SPOT_FORMS[k] === h.row.state.disguise)] ? "Hide" : "Search", door: h.row.state.broken ? "Smashed" : h.row.state.open ? "Shut" : "Open" }[h.kind] ?? "Search") : null;
      if ((s.prompt ?? null) !== id || (s.promptVerb ?? null) !== verb) { s.prompt = id; s.promptVerb = verb; }
      const door = h?.kind === "door" ? h.row : null, dw = door ? (door.state.broken ? "smashed" : door.state.open ? "open" : "shut") : null;
      if ((s.promptDoor ?? null) !== dw) s.promptDoor = dw;
      // dread: how close the nearest mimic is; the heartbeat only this hider hears
      let near = 99;
      for (const t of enemies(ctx)) if (t.state.role !== "hider" && (t.state.revealed || t.tags?.includes?.("mimic-bot") || (t.state.disguise && t.state.disguise !== "none"))) near = Math.min(near, Math.hypot(t.feetPosition.x - ctx.self.feetPosition.x, t.feetPosition.z - ctx.self.feetPosition.z));
      const dread = near < 6 ? 2 : near < 14 ? 1 : 0;
      if ((s.dread ?? 0) !== dread) s.dread = dread;
      if (dread && now > (w.beatAt ?? 0)) { w.beatAt = now + (dread === 2 ? 650 : 1200); ctx.emit("playSound", { clip: SFX.heart, volume: dread === 2 ? 0.9 : 0.5 }); }
    }
    ctx.self.vignette = Math.min(0.5, (s.hp ?? 100) < 40 ? 0.3 : 0) + ((s.dread ?? 0) === 2 ? 0.15 : 0);
    return;
  }
  if (ctx.self.vignette) ctx.self.vignette = 0;
  if (s.prompt) s.prompt = null;
  if (s.role === "mimic" && phase(ctx) === "hunt" && now > (w.earAt ?? 0)) {
    w.earAt = now + 250;
    const me = ctx.self.feetPosition, heard = [];
    for (const r of ctx.query({ tags: ["ping"], radius: 60 })) if (Math.hypot(r.feetPosition.x - me.x, r.feetPosition.z - me.z) <= (r.state.radius ?? 30)) heard.push(r.id);
    const key = heard.join(",");
    if ((s.pingKey ?? "") !== key) { s.pingKey = key; s.pings = heard; }
  } else if (s.pings?.length && s.role !== "mimic") { s.pings = []; s.pingKey = ""; }
  const still = ctx.self.grounded && vx === 0 && vz === 0 && intent.x === 0 && intent.z === 0;
  if (still && s.role !== "mimic") ctx.sleep(0.5);
}
