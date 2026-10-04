// The referee of Gullmouth: lobby → hide (solo bot, caged) or straight to hunt (a player is the mimic) → end.
// Picks the mimic, moves bodies, judges traps, turns the dead into ghosts and names the winner in place.state.
import RULES from "../../scripts/lib/data/rules.yml";
import { SFX } from "../../scripts/lib/sfx.js";
import { animate } from "builtin/tween";
import DREAM from "../../scripts/lib/data/dream.yml";
import { noise } from "../../scripts/lib/noise.js";
const NPC_NAMES = ["Mags", "Tobin", "Wren", "Iver", "Nell", "Corrie", "Abe", "Lotte", "Sim", "Hettie"];
const NPC_LOOKS = ["dockhand", "gutter", "runaway", "watch"];
import CHARS from "../../scripts/lib/data/characters.yml";

export const cadence = "100ms";
const MUSIC = {
  lobby: "cdn/music-dark-ambient-horror-drone-low-cello-foghorn-distant-loop.mp3",
  hunt: "cdn/music-tense-horror-pulsing-low-strings-ticking-clock-percussion-loop.mp3",
};
const SNAP = `fx
pop sparks burst=18 life=.15..0.35 v=up(1..2)+sdir()*(2..4) size=.015..0.03 acc=grav()*.5+drag(1.5) col=hdr(4,2.6,1) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)
pop blood burst=14 life=.4..0.8 v=up(1.5..3)+sdir()*(.8..1.6) size=.03..0.06 acc=grav()+drag(1) col=oklch(.3 .12 25) a=1>.7:1>0 sz=$size floor=stick r=sprite(droplet,alpha,velocity,.03)`;
const BLAST = `fx
pop fire burst=26 life=.3..0.7 v=sdir()*(3..6)+up(1) size=.4..0.8 acc=drag(3)+buoy(1) col=hdr(5,2.6,.7)>hdr(1.5,.4,.08)><.1,.08,.07> a=1>.6:.8>0 sz=$size*(.6>1.6) rot=spin(.3) r=sprite(flame-wisp,add)
pop chips burst=24 life=.6..1.2 v=sdir()*(4..8)+up(2..4) size=.05..0.12 spin=-9..9 acc=grav()+drag(.4) col=oklch(.42 .05 120) a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(splinter,alpha)
pop smoke burst=10 life=1.5..2.5 v=sdir()*(1..2)+up(.8) size=.6..1 acc=drag(1.5)+buoy(.5) col=<.16,.15,.14> a=0>.1:.6>1:0 sz=$size*(.7>2.4) r=sprite(smoke-puff,alpha)
pop light burst=1 life=.35 g=1>0 r=light(<1,.6,.25>,$g*200,16)`;
const DEATH = `fx
pop soul burst=20 life=1.2..2 on=sphere(.4) v=up(.8..1.6) size=.05..0.1 acc=curl(.6)+buoy(.4) col=hdr(.8,1,1.3) a=0>.1:.8>.7:.6>0 sz=$size r=sprite(mote,add)
pop blood burst=26 life=.5..0.9 v=up(1..3)+sdir()*(1..2) size=.04..0.08 acc=grav()+drag(.8) col=oklch(.3 .13 25) a=1 sz=$size floor=stick r=sprite(droplet,alpha,velocity,.03)`;
const CAGE = { x: RULES.cage.x, z: RULES.cage.z, y: 0.3 };

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function spawnAt(i, n) { const a = (i / Math.max(1, n)) * Math.PI * 2; return { x: RULES.spawn.x + Math.cos(a) * 2, y: 0.5, z: RULES.spawn.z + Math.sin(a) * 2 }; }

function resetBody(p, role, round) {
  if (p.state.hiddenIn) { p.state.hiddenIn = null; }
  p.state.talk = null;
  Object.assign(p.state, { role, risen: false, revealed: false, ambushAt: 0, clawReadyAt: 0, power: 0, cd: {}, fadeUntil: 0, faded: false, team: role === "mimic" ? "mimic" : role === "hider" ? "hiders" : role === "lobby" ? null : p.state.team, hp: role === "mimic" ? RULES.seekerHp : RULES.hiderHp, inv: { scrap: 0, wire: 0, powder: 0 }, disguise: "none", stunUntil: 0, rootUntil: 0, round, msg: null, prompt: null, dread: 0 });
}
function clearRound(ctx) {
  for (const r of ctx.query({ anyTags: ["trap", "bait", "lure", "fake", "mimic-bot", "dreamer", "clue", "food", "npc-hider", "ping"] })) ctx.destroy(r.id);
  for (const r of ctx.query({ tags: ["door"] })) { const d = ctx.getObject(r.id); if (d) Object.assign(d.state, { open: false, broken: false, barredUntil: 0, barCoolUntil: 0, hp: RULES.door.hp }); }
  ctx.place.state.ate = null; ctx.place.state.blackout = null;
  ctx.place.state.clues = 0; ctx.place.state.awake = 0;
  for (const r of ctx.query({ tags: ["loot"] })) { const h = ctx.getObject(r.id); if (h) h.state.emptyUntil = 0; }
  delete ctx.place.state.noise;
  for (const r of ctx.query({ tags: ["hidespot"] })) { const h = ctx.getObject(r.id); if (h && h.state.occupant) h.state.occupant = null; }
}
function cageDoor(ctx, open) {
  const d = ctx.place.objects["cage-door"];
  if (!d) return;
  animate(ctx, d, { "feetPosition.y": open ? CAGE.y + 2.9 : CAGE.y }, { duration: open ? 1.2 : 0.4, easing: "easeOutCubic" });
}
function mimicBodies(ctx) {
  const out = ctx.place.players.filter((p) => p.state.role === "mimic");
  for (const b of ctx.query({ tags: ["mimic-bot"] })) { const h = ctx.getObject(b.id); if (h && !h.state.dead) out.push(h); }
  return out;
}
function finish(ctx, winner, why) {
  const s = ctx.place.state;
  s.phase = "end"; s.winner = winner; s.why = why + (s.mimicIds?.includes("bot") ? "" : `. the mimic was ${s.mimicName}`); s.endsAt = ctx.now() + RULES.endSeconds * 1000;
  s.lastResult = { round: s.round, winner, why: s.why, at: ctx.now() };
  ctx.music.stop({ fade: 0.5 });
  ctx.emit("playSound", { clip: winner === "hiders" ? SFX.bell : SFX.death, volume: 0.9 }, { audience: "all" });
  ctx.emit("slowMo", { scale: 0.35, duration: 1.2 }, { audience: "all" });
  ctx.emit("milestone", { step: 3, name: "round finished" }, { audience: "all" });
}

function startRound(ctx) {
  const s = ctx.place.state, now = ctx.now(), players = ctx.place.players.filter((p) => !p.state.menu);
  clearRound(ctx);
  s.round = (s.round ?? 0) + 1;
  const bot = players.length < 2;
  // a fair draw: whoever was the mimic last round sits this one out of the draw
  // a fair draw: one seeker per 5 players; last round's seekers sit this draw out when there are enough others
  const want = bot ? 0 : Math.max(1, Math.floor(players.length / RULES.playersPerSeeker));
  const last = s.lastMimicUsers ?? [];
  let pool = players.filter((p) => !last.includes(p.userId));
  if (pool.length < want + 1) pool = [...players];
  const seekers = [];
  while (seekers.length < want && pool.length) seekers.push(...pool.splice(Math.floor(ctx.random() * pool.length), 1));
  s.lastMimicUsers = seekers.map((p) => p.userId);
  s.mimicIds = bot ? ["bot"] : seekers.map((p) => p.id);
  s.mimicId = s.mimicIds[0]; s.mimicName = bot ? "the thing" : seekers.map((p) => p.displayName).join(" & ");
  s.hiderCount = players.length - seekers.length;
  // nobody knows: the mimic wakes in the same ring as everyone, wearing its own face
  const ring = [...players];
  for (let j = ring.length - 1; j > 0; j--) { const r = Math.floor(ctx.random() * (j + 1)); [ring[j], ring[r]] = [ring[r], ring[j]]; }
  ring.forEach((p, i) => { resetBody(p, seekers.includes(p) ? "mimic" : "hider", s.round); p.feetPosition = spawnAt(i, ring.length); });
  // claws lock from this instant. a human round is already the hunt, so the half-minute is spent beside someone who cannot strike
  for (const p of seekers) { p.state.clawReadyAt = now + RULES.reveal.startLock * 1000; p.state.ambushAt = p.state.clawReadyAt; }
  s.clawsAt = now + RULES.reveal.startLock * 1000;
  if (bot) ctx.spawn("mimic-bot", {
    tags: ["mimic-bot"], feetPosition: { ...CAGE, y: CAGE.y + 0.3 }, physics: { body: "character" }, render: false,
    primitive: { kind: "capsule", radius: 0.35, halfHeight: 0.6 }, behavior: ["scripts/bot-mimic.js"],
    state: { hp: RULES.bot.hp, disguise: "none", mode: "ambush-go", role: "mimic" },
    children: [{ id: "body", template: "templates/creature.js#mimicBody" }],
  });
  // empty seats fill with npc hiders; whoever joins mid-round takes one over
  const npcs = Math.max(0, (RULES.seats ?? 5) - players.length - (bot ? 1 : 0));
  for (let i = 0; i < npcs; i++) spawnNpc(ctx, i, npcs, players.length);
  // the dream fills: dreamers shuffle near home, shards hang where things are wrong
  for (const d of DREAM.dreamers) ctx.spawn(d.id, { template: "templates/dream.js#dreamer", feetPosition: { x: d.home[0], y: 0.3, z: d.home[1] }, state: { home: d.home, name: d.name, says: d.says, awake: false, talker: null } });
  for (const c of DREAM.clues) ctx.spawn(c.id, { template: "templates/dream.js#clue", feetPosition: { x: c.at[0], y: 1.1, z: c.at[1] }, material: { texture: c.pic, emissive: "oklch(0.35 0.05 230)", emissiveIntensity: 0.5, roughness: 0.5 }, state: { text: c.text, pic: c.pic, taken: false } });
  for (let i = 0; i < RULES.hunger.piles; i++) spawnFood(ctx);
  s.clueTotal = DREAM.clues.length; s.dreamerTotal = DREAM.dreamers.length;
  s.winner = null; s.why = null; s.feed = [];
  if (bot) {
    // alone: the thing waits in the cage for hideSeconds, then the door opens
    cageDoor(ctx, false);
    s.phase = "hide"; s.endsAt = now + RULES.hideSeconds * 1000;
  } else {
    // a player is the mimic: no hide. everyone is already together; claws stay locked from this hunt start
    s.phase = "hunt"; s.endsAt = now + RULES.huntSeconds * 1000;
    ctx.emit("playSound", { clip: SFX.bell, volume: 0.8 }, { audience: "all" });
    ctx.music.play(MUSIC.hunt, { fade: 1.5, volume: 0.65 });
    feed(ctx, "one of you is not what they seem");
  }
  ctx.emit("milestone", { step: 1, name: "round started" }, { audience: "all" });
}

function spawnNpc(ctx, i, n, off) {
  const look = CHARS.find((c) => c.id === NPC_LOOKS[i % NPC_LOOKS.length]), name = NPC_NAMES[Math.floor(ctx.random() * NPC_NAMES.length)];
  const p = spawnAt(off + i, off + n);
  ctx.spawn({
    tags: ["npc-hider", "npc"], feetPosition: { x: p.x + 1.5, y: 0.5, z: p.z + 1.5 }, physics: "character", model: look?.model, castShadow: true,
    behavior: ["scripts/bot-hider.js", "scripts/humanoid-locomotion.js"],
    ui: '<div facing="player" at="0.5 1.12" width="1.4m" class="text-center"><div class="text-[120px] font-bold" style="color:oklch(0.9 0.03 80);text-shadow:0 0 24px #000">{{ state.name }}</div></div>',
    state: { role: "hider", hp: RULES.hiderHp, name, character: look?.id, mode: "loot" },
  });
}
// a player who arrives mid-round takes over an npc hider: its body, its place, its wounds
function takeOver(ctx, p) {
  const s = ctx.place.state;
  const row = ctx.query({ tags: ["npc-hider"] }).find((r) => !r.state.dead && !r.state.hiddenIn) ?? ctx.query({ tags: ["npc-hider"] }).find((r) => !r.state.dead);
  if (!row) return false;
  const npc = ctx.getObject(row.id); if (!npc) return false;
  if (npc.state.hiddenIn) { const spot = ctx.getObject(npc.state.hiddenIn); if (spot && spot.state.occupant === npc.id) spot.state.occupant = null; }
  resetBody(p, "hider", s.round);
  p.state.hp = Math.max(1, npc.state.hp ?? RULES.hiderHp);
  p.feetPosition = { x: npc.feetPosition.x, y: npc.feetPosition.y + 0.3, z: npc.feetPosition.z };
  p.state.msg = { text: `you woke up as ${npc.state.name}. hide.`, at: ctx.now() };
  feed(ctx, `${p.displayName} took ${npc.state.name}'s place`);
  ctx.destroy(npc.id);
  s.hiderCount = (s.hiderCount ?? 0) + 1;
  return true;
}
function spawnFood(ctx) {
  const taken = ctx.query({ tags: ["food"] }).map((r) => r.feetPosition);
  const free = RULES.food.filter(([x, z]) => !taken.some((p) => Math.hypot(p.x - x, p.z - z) < 3));
  if (!free.length) return;
  const [x, z] = free[Math.floor(ctx.random() * free.length)];
  ctx.spawn({ template: "templates/props.js#fishPile", feetPosition: { x, z, y: { terrain: 0 } }, rotation: { yaw: ctx.random() * 360 } });
}
// the dream master's blackout: the yard lamps die, then come back
function lamps(ctx, on) {
  for (let i = 1; i <= 15; i++) { const l = ctx.getObject(`lamp-${i}/light`); if (l && l.light) l.light = { ...l.light, intensity: on ? 25 : 0 }; }
}
function judgeDark(ctx) {
  const s = ctx.place.state, dark = !!(s.blackout && ctx.now() < s.blackout.until);
  if (dark && !s.dark) { s.dark = true; lamps(ctx, false); feed(ctx, "the lamps die. it's here somewhere"); ctx.emit("playSound", { clip: SFX.wrong, volume: 0.8 }, { audience: "all" }); }
  else if (!dark && s.dark) { s.dark = false; lamps(ctx, true); }
}
function feed(ctx, text) { const s = ctx.place.state; s.feed = [...(s.feed ?? []).slice(-3), { text, at: ctx.now() }]; }

function judgeTraps(ctx) {
  const now = ctx.now(), mimics = mimicBodies(ctx);
  for (const r of ctx.query({ anyTags: ["trap", "bait", "lure"] })) {
    const t = ctx.getObject(r.id); if (!t) continue;
    const st = t.state;
    if (st.kind === "lure") {
      if (!st.fired && now >= st.fireAt) {
        st.fired = true;
        ctx.emit("playSound", { clip: SFX.rattle, position: t.feetPosition, volume: 1, maxDistance: RULES.lure.radius });
        ctx.emit("shake", { target: t.id, intensity: 0.3, duration: 2 });
        ctx.place.state.noise = { x: t.feetPosition.x, z: t.feetPosition.z, at: now };
        noise(ctx, t.feetPosition, RULES.noise.lure, "loot");
      }
      if (st.fired && now - st.fireAt > 4000) ctx.destroy(t.id);
      continue;
    }
    if (now < (st.armAt ?? 0)) continue;
    const radius = st.kind === "bait" ? RULES.bait.radius : RULES.trap.radius;
    const victim = mimics.find((m) => flat(m.feetPosition, t.feetPosition) < radius && Math.abs(m.feetPosition.y - t.feetPosition.y) < 1.5);
    if (!victim) continue;
    const pos = { x: t.feetPosition.x, y: t.feetPosition.y + 0.4, z: t.feetPosition.z };
    if (st.kind === "trap") {
      victim.state.hp = (victim.state.hp ?? 200) - RULES.trap.damage; victim.state.rootUntil = now + RULES.trap.root * 1000;
      ctx.emit("fx", { position: pos, script: SNAP });
      ctx.emit("playSound", { clip: SFX.snap, position: pos, volume: 1, maxDistance: 35 });
      ctx.emit("damageNumber", { position: { ...pos, y: pos.y + 1.4 }, value: RULES.trap.damage, color: "oklch(0.85 0.12 85)" });
      feed(ctx, "a bear trap bit the mimic");
    } else {
      victim.state.hp = (victim.state.hp ?? 200) - RULES.bait.damage; victim.state.stunUntil = now + RULES.bait.stun * 1000;
      ctx.emit("fx", { position: pos, script: BLAST });
      ctx.emit("shockwave", { position: pos, speed: 14, thickness: 1, intensity: 0.6 });
      ctx.emit("playSound", { clip: SFX.bait, position: pos, volume: 1, maxDistance: 45 });
      ctx.emit("damageNumber", { position: { ...pos, y: pos.y + 1.4 }, value: RULES.bait.damage, color: "oklch(0.8 0.17 55)", crit: true });
      feed(ctx, "it bit into rigged fish. BOOM");
      if ((victim.state.power ?? 0) > 0) victim.state.power -= 1;
    }
    victim.state.hurtAt = now;
    if (victim.state.role === "mimic" && !victim.state.revealed) { victim.state.revealed = true; feed(ctx, `the trap caught ${victim.displayName}. THEY ARE THE MIMIC`); ctx.emit("playSound", { clip: SFX.unmorph, position: victim.feetPosition, volume: 1, maxDistance: 50 }); }
    if (victim.state.disguise && victim.state.disguise !== "none") victim.state.disguise = "none";
    ctx.emit("flash", { target: victim.id, color: "oklch(0.8 0.15 30)", duration: 0.2 });
    ctx.emit("playSound", { clip: SFX.mimicHurt, position: victim.feetPosition, volume: 0.9, maxDistance: 40 });
    ctx.destroy(t.id);
  }
}

// the lobby board: each room posts its head-count every few seconds; the list is every room seen lately
let boardAt = 0, tableMade = false;
function postBoard(ctx) {
  const now = ctx.now(); if (now - boardAt < 4000) return; boardAt = now;
  const s = ctx.place.state, room = ctx.getRoomId?.() ?? "main";
  const n = ctx.place.players.length;
  const sql = ctx.sql;
  (async () => {
    if (!tableMade) { await sql`CREATE TABLE IF NOT EXISTS lobbies (room TEXT PRIMARY KEY, players INTEGER, phase TEXT, round INTEGER, seen INTEGER)`; tableMade = true; }
    await sql`INSERT INTO lobbies (room, players, phase, round, seen) VALUES (${room}, ${n}, ${s.phase ?? "lobby"}, ${s.round ?? 0}, CAST(strftime('%s','now') AS INTEGER)) ON CONFLICT(room) DO UPDATE SET players = excluded.players, phase = excluded.phase, round = excluded.round, seen = excluded.seen`;
    const { rows } = await sql`SELECT room, players, phase FROM lobbies WHERE seen > CAST(strftime('%s','now') AS INTEGER) - 20 AND players > 0 ORDER BY players DESC LIMIT 8`;
    s.lobbies = rows; s.roomId = room;
  })().catch((e) => ctx.log("lobby board", String(e)));
}

export function tick(ctx) {
  postBoard(ctx);
  const s = ctx.place.state, now = ctx.now(), players = ctx.place.players.filter((p) => !p.state.menu);
  s.phase ??= "lobby";
  // late joiners: hide phase makes them a hider; during the hunt they watch as ghosts
  for (const p of players) {
    if ((s.phase === "hide" || s.phase === "hunt") && p.state.round !== s.round && takeOver(ctx, p)) continue;
    if (s.phase === "hide" && p.state.round !== s.round) { resetBody(p, "hider", s.round); p.feetPosition = spawnAt(0, 1); s.hiderCount = (s.hiderCount ?? 0) + 1; }
    else if (s.phase === "hunt" && p.state.round !== s.round) { resetBody(p, "ghost", s.round); }
    else if ((s.phase === "lobby") && p.state.role !== "lobby") { resetBody(p, "lobby", s.round ?? 0); }
  }
  if (s.phase === "lobby") {
    ctx.music.play(MUSIC.lobby, { fade: 2, volume: 0.6 });
    if (!players.length) { s.startAt = null; return; }
    s.startAt ??= now + RULES.lobbySeconds * 1000;
    if (players.length >= 10 && s.startAt - now > 5000) s.startAt = now + 5000; // a full room starts fast
    if (now >= s.startAt) { s.startAt = null; startRound(ctx); }
    return;
  }
  if (s.phase === "hide") {
    if (now >= s.endsAt) {
      s.phase = "hunt"; s.endsAt = now + RULES.huntSeconds * 1000;
      cageDoor(ctx, true);
      if ((s.mimicIds ?? []).includes("bot")) ctx.emit("playSound", { clip: SFX.cage, position: CAGE, volume: 1, maxDistance: 60 });
      ctx.emit("playSound", { clip: SFX.bell, volume: 0.8 }, { audience: "all" });
      ctx.music.play(MUSIC.hunt, { fade: 1.5, volume: 0.65 });
      feed(ctx, (s.mimicIds ?? []).includes("bot") ? "the cage is open" : "one of you is not what they seem");
    }
    return;
  }
  if (s.phase === "hunt") {
    judgeTraps(ctx);
    judgeDark(ctx);
    // the dead
    for (const p of players) {
      if (p.state.role === "hider" && (p.state.hp ?? 100) <= 0) {
        const pos = { x: p.feetPosition.x, y: p.feetPosition.y + 1, z: p.feetPosition.z };
        ctx.emit("fx", { position: pos, script: DEATH });
        ctx.emit("playSound", { clip: SFX.death, position: pos, volume: 1, maxDistance: 60 });
        ctx.emit("screenFlash", { color: "oklch(0.35 0.15 25)", duration: 0.8, intensity: 0.6 }, { audience: { player: p.id } });
        // the dream keeps them: they rise as a mimic where they fell
        resetBody(p, "mimic", s.round);
        p.state.hp = RULES.risenHp; p.state.risen = true; p.state.revealed = true; p.state.team = "mimic";
        ctx.emit("screenShake", { intensity: 0.6, duration: 0.5 }, { audience: { player: p.id } });
        feed(ctx, `${p.displayName} was taken. now they hunt`);
      }
    }
    // the mimic grew: say so, and a new pile washes up somewhere else later
    if (s.ate && s.ate.at !== s.ateSeen) { s.ateSeen = s.ate.at; feed(ctx, "something is eating the catch"); s.regrowAt = [...(s.regrowAt ?? []), now + RULES.hunger.regrow * 1000]; }
    if ((s.regrowAt ?? []).length && now >= s.regrowAt[0]) { s.regrowAt = s.regrowAt.slice(1); spawnFood(ctx); }
    // the dream: count shards and the woken; wake them all and the hiders wake too
    let clues = 0, awake = 0;
    for (const r of ctx.query({ tags: ["clue"] })) if (r.state.taken && !r.state.owner) clues++;
    for (const r of ctx.query({ tags: ["dreamer"] })) if (r.state.awake) awake++;
    if (clues !== (s.clues ?? 0)) { s.clues = clues; feed(ctx, `a clue: ${clues}/${s.clueTotal}. they'll listen easier`); }
    if (awake !== (s.awake ?? 0)) { s.awake = awake; feed(ctx, `a dreamer woke: ${awake}/${s.dreamerTotal}`); }
    if (s.dreamerTotal && awake >= s.dreamerTotal) {
      ctx.emit("screenFlash", { color: "white", duration: 2.5, intensity: 1 }, { audience: "all" });
      return finish(ctx, "hiders", "everyone woke up. it was only a dream");
    }
    for (const r of ctx.query({ tags: ["npc-hider"] })) {
      if (r.state.dead || (r.state.hp ?? 100) > 0) continue;
      const n = ctx.getObject(r.id); if (!n) continue;
      n.state.dead = true;
      if (n.state.hiddenIn) { const spot = ctx.getObject(n.state.hiddenIn); if (spot && spot.state.occupant === n.id) spot.state.occupant = null; }
      const pos = { x: r.feetPosition.x, y: r.feetPosition.y + 1, z: r.feetPosition.z };
      ctx.emit("fx", { position: pos, script: DEATH });
      ctx.emit("playSound", { clip: SFX.death, position: pos, volume: 1, maxDistance: 60 });
      feed(ctx, `${n.state.name} was taken`);
      ctx.destroy(n.id);
    }
    const alive = players.filter((p) => p.state.role === "hider").length + ctx.query({ tags: ["npc-hider"] }).filter((r) => !r.state.dead && (r.state.hp ?? 1) > 0).length;
    const mimics = mimicBodies(ctx);
    // a mimic killed: a risen one falls for good; the true mimic dead (every one of them) ends the dream
    for (const m of mimics.filter((m) => (m.state.hp ?? 1) <= 0)) {
      ctx.emit("fx", { position: { ...m.feetPosition, y: m.feetPosition.y + 1 }, script: BLAST });
      ctx.emit("shockwave", { position: m.feetPosition, speed: 18, thickness: 1.5, intensity: 1 });
      if (m.tags?.includes?.("mimic-bot")) m.state.dead = true;
      else { const risen = m.state.risen; resetBody(m, "ghost", s.round); m.state.team = "mimic"; feed(ctx, risen ? `${m.displayName} is put to rest` : `${m.displayName}, a true mimic, is dead`); }
    }
    // a true mimic who walked out: the mask passes to a random hider, so a quit is never a free win
    for (const id of s.mimicIds ?? []) {
      if (id === "bot" || players.some((p) => p.id === id)) continue;
      const pool = players.filter((p) => p.state.role === "hider");
      if (pool.length < 2) { s.mimicIds = s.mimicIds.filter((x) => x !== id); if (!s.mimicIds.length) return finish(ctx, "hiders", "the mimic fled the dream"); continue; }
      const heir = pool[Math.floor(ctx.random() * pool.length)];
      const hp = heir.state.hp;
      resetBody(heir, "mimic", s.round); heir.state.hp = Math.max(hp ?? 100, 100);
      s.mimicIds = s.mimicIds.map((x) => (x === id ? heir.id : x)); s.mimicName = heir.displayName;
      heir.state.msg = { text: "the mimic fled. its mask is yours now. nobody knows", at: now };
      feed(ctx, "the mimic fled the dream. someone else wears its face now");
    }
    const trueAlive = (s.mimicIds ?? []).some((id) => id === "bot" ? ctx.query({ tags: ["mimic-bot"] }).some((b) => !b.state.dead) : players.some((p) => p.id === id && p.state.role === "mimic"));
    if (!trueAlive) return finish(ctx, "hiders", "the mimic is dead");
    if (alive === 0) return finish(ctx, "mimic", "nobody is left");
    if (now >= s.endsAt) return finish(ctx, "hiders", "dawn came. they survived");
    return;
  }
  if (s.phase === "end" && now >= s.endsAt) {
    clearRound(ctx);
    let i = 0;
    for (const p of players) { resetBody(p, "lobby", s.round); p.feetPosition = spawnAt(i++, players.length); }
    cageDoor(ctx, false);
    s.phase = "lobby"; s.winner = null; s.why = null; s.startAt = now + RULES.lobbySeconds * 1000;
  }
}
