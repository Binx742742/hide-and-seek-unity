// Every door in Gullmouth: one row, one leaf, everyone sees the same swing.
// state: { kind, open, yaw0, swing, home, slide, barredUntil, hp, broken, by }
// A press arrives as ctx.emit("press", { by, act }, { to: doorId }): act "toggle" (E), "bar" (R, a hider
// on a shut door), "claw" (the monster's swing at a shut door). A barred door holds against toggle until
// its bar time runs out or three claws break it, and a broken door hangs open for the rest of the round.
// Salt-touched (scripts/lib/salt.js) adds two acts only their bearer can make: "unbar" lifts a player's bar (once a round),
// "bleed" (a drain grate) forces it open and flooding for saltTouched.drain.seconds; it will not shut or bar till then.
import RULES from "./lib/data/rules.yml";
import { SFX } from "./lib/sfx.js";
import { noise } from "./lib/noise.js";
import { SALT, saltOf, canSabotage, commit } from "./lib/salt.js";
const D = RULES.door;
const tell = (ctx, by, text) => { const p = ctx.getObject(by); if (p && p.state) p.state.msg = { text, at: ctx.now() }; };
function snd(ctx, clip, vol = 0.9) { ctx.emit("playSound", { clip, position: ctx.self.feetPosition, volume: vol, maxDistance: 26 }); }
function ping(ctx, kind, radius) { noise(ctx, ctx.self.feetPosition, radius, kind); }
export const ears = {
  press: (ctx, { by, act }) => {
    const s = ctx.self.state, now = ctx.now(), barred = !s.broken && now < (s.barredUntil ?? 0), flooding = now < (s.floodUntil ?? 0);
    if (act === "unbar") return unbar(ctx, by, barred);
    if (act === "bleed") return bleed(ctx, by, flooding);
    if (act === "bar") {
      if (s.broken) return tell(ctx, by, "it's smashed. nothing to bar");
      if (flooding) return tell(ctx, by, "the water's forcing it. no bar will hold");
      if (s.open) return tell(ctx, by, "shut it first");
      if (barred) return tell(ctx, by, `already barred. ${Math.ceil((s.barredUntil - now) / 1000)}s`);
      if (now < (s.barCoolUntil ?? 0)) return tell(ctx, by, "the bar's still warm. wait");
      s.barredUntil = now + D.bar * 1000; s.barCoolUntil = s.barredUntil + D.barCooldown * 1000; s.hp = D.hp; s.barredBy = by;
      snd(ctx, SFX.bar); ctx.emit("shake", { target: ctx.self.id, intensity: 0.12, duration: 0.2 });
      return tell(ctx, by, `barred for ${D.bar}s`);
    }
    if (act === "claw") {
      if (s.open || s.broken) return;
      if (!barred) { s.open = true; s.by = by; snd(ctx, SFX.doorHit, 1); return; } // a shut, unbarred door just bursts open
      s.hp = (s.hp ?? D.hp) - 1;
      ctx.emit("shake", { target: ctx.self.id, intensity: 0.35, duration: 0.3 });
      ping(ctx, "door", RULES.noise.door);
      if (s.hp <= 0) { s.broken = true; s.open = true; s.barredUntil = 0; snd(ctx, SFX.doorBreak, 1);
        ctx.emit("fx", { position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 1.2 }, script: SPLINTERS }); }
      else snd(ctx, SFX.doorHit, 1);
      return;
    }
    // toggle
    if (barred && !s.open) { snd(ctx, SFX.locked, 0.8); ping(ctx, "door", RULES.noise.door * 0.6); return tell(ctx, by, "barred from the other side"); }
    if (s.broken) return;
    if (flooding && s.open) { snd(ctx, SFX.locked, 0.6); return tell(ctx, by, `the drain's flooding. it won't shut for ${Math.ceil((s.floodUntil - now) / 1000)}s`); }
    s.open = !s.open; s.by = by;
    ping(ctx, "door", RULES.noise.door * 0.5);
    const grate = s.kind === "grate", panel = s.kind === "panel";
    snd(ctx, panel ? SFX.panelSlide : grate ? (s.open ? SFX.gateOpen : SFX.gateShut) : s.open ? SFX.doorOpen : SFX.doorShut, 0.75);
  },
};
// the door's middle (its origin is the hinge): where a flood pours from
function middle(ctx) {
  const s = ctx.self.state, f = ctx.self.feetPosition, a = ((s.yaw0 ?? 0) * Math.PI) / 180, hw = (s.w ?? 1.2) / 2;
  return { x: f.x + Math.cos(a) * hw, y: f.y, z: f.z - Math.sin(a) * hw };
}
// salt: a player's bar lifted in secret. free, once a round, a soft creak at the door's noise distance
function unbar(ctx, by, barred) {
  const s = ctx.self.state, p = ctx.getObject(by), ps = ctx.place.state, m = p && saltOf(p, ps.roundId);
  if (!m || !canSabotage(p, ps)) return;
  if ((m.unbar ?? 0) <= 0) return tell(ctx, by, "you've lifted your one bar");
  if (!barred || s.open) return tell(ctx, by, "it isn't barred");
  s.barredUntil = 0; s.hp = D.hp;
  ctx.emit("playSound", { clip: SFX.saltCreak, position: ctx.self.feetPosition, volume: 0.35, maxDistance: RULES.noise.door });
  ping(ctx, "door", RULES.noise.door);
  commit(p, "unbar", ctx.self.feetPosition, { unbar: m.unbar - 1 });
  tell(ctx, by, "the bar slides free. nobody saw");
}
// salt: a drain grate bled. it swings open, floods, and won't shut or bar for the drain's seconds
function bleed(ctx, by, flooding) {
  const s = ctx.self.state, p = ctx.getObject(by), now = ctx.now();
  if (s.kind !== "grate" || !p || !canSabotage(p, ctx.place.state)) return;
  if (flooding) return tell(ctx, by, "it's already bleeding");
  const secs = SALT.drain.seconds, at = middle(ctx);
  s.open = true; s.barredUntil = 0; s.floodUntil = now + secs * 1000; s.by = by;
  ctx.emit("playSound", { clip: SFX.saltBleed, position: at, volume: 1, maxDistance: 34 });
  ctx.emit("shake", { target: ctx.self.id, intensity: 0.25, duration: 0.6 });
  ping(ctx, "door", RULES.noise.door);
  ctx.spawn({ tags: ["flood"], feetPosition: { x: at.x, y: at.y + 0.05, z: at.z }, lifetime: secs, fx: { script: FLOOD }, state: { kind: "flood", door: ctx.self.id, until: s.floodUntil } });
  commit(p, "bleed", at);
  tell(ctx, by, `the drain bleeds. it won't shut for ${secs}s`);
}
const FLOOD = `fx
pop spray rate=?mobile:10|20 on=disc(1.4) life=.5..1 v=up(1.2..2.6)+sdir()*.7 size=.04..0.1 acc=grav()+drag(.6) col=oklch(.55 .04 210) a=.8>0 sz=$size floor=stick r=sprite(droplet,alpha,velocity,.03)
pop mist rate=?mobile:3|6 on=disc(1.8) life=1.5..2.5 v=up(.2..0.4)+sdir()*.3 size=.8..1.4 acc=drag(1)+buoy(.05) col=<.36,.4,.44> a=0>.15:.5>.6:.6>0 sz=$size*(.6>1.4) r=sprite(smoke-puff,alpha)`;
const SPLINTERS = `fx
pop chips burst=30 life=.6..1.2 v=sdir()*(3..6)+up(1..3) size=.04..0.12 spin=-9..9 acc=grav()+drag(.4) col=oklch(.3 .03 50) a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(splinter,alpha)
pop dust burst=8 life=1..1.8 v=sdir()*(.5..1.2) size=.3..0.6 acc=drag(1.5)+buoy(.2) col=<.35,.32,.28> a=0>.3:.4>0 sz=$size*(.7>2) r=sprite(smoke-puff,alpha)`;
// the swing: an eased yaw about the hinge (or a slide for a panel); asleep once it rests
export function update(ctx, dt) {
  const s = ctx.self.state, want = s.open ? 1 : 0, cur = s.cur ?? 0;
  if (cur === want) { ctx.sleep(); return; }
  const rate = s.kind === "panel" ? 0.9 : s.broken ? 6 : 2.6;
  const next = cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), rate * dt);
  s.cur = next;
  if (s.kind === "panel") {
    const h = s.home, a = ((s.yaw0 ?? 0) * Math.PI) / 180, d = (s.slide ?? 1.2) * next;
    ctx.self.feetPosition = { x: h.x + Math.cos(a) * d, y: h.y, z: h.z - Math.sin(a) * d };
  } else ctx.self.rotation = { yaw: (s.yaw0 ?? 0) + (s.swing ?? 100) * next * (s.broken ? 1.15 : 1) };
}
