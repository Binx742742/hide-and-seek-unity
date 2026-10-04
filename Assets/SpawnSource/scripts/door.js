// Every door in Gullmouth: one row, one leaf, everyone sees the same swing.
// state: { kind, open, yaw0, swing, home, slide, barredUntil, hp, broken, by }
// A press arrives as ctx.emit("press", { by, act }, { to: doorId }): act "toggle" (E), "bar" (R, a hider
// on a shut door), "claw" (the monster's swing at a shut door). A barred door holds against toggle until
// its bar time runs out or three claws break it, and a broken door hangs open for the rest of the round.
import RULES from "./lib/data/rules.yml";
import { SFX } from "./lib/sfx.js";
import { noise } from "./lib/noise.js";
const D = RULES.door;
const tell = (ctx, by, text) => { const p = ctx.getObject(by); if (p && p.state) p.state.msg = { text, at: ctx.now() }; };
function snd(ctx, clip, vol = 0.9) { ctx.emit("playSound", { clip, position: ctx.self.feetPosition, volume: vol, maxDistance: 26 }); }
function ping(ctx, kind, radius) { noise(ctx, ctx.self.feetPosition, radius, kind); }
export const ears = {
  press: (ctx, { by, act }) => {
    const s = ctx.self.state, now = ctx.now(), barred = !s.broken && now < (s.barredUntil ?? 0);
    if (act === "bar") {
      if (s.broken) return tell(ctx, by, "it's smashed. nothing to bar");
      if (s.open) return tell(ctx, by, "shut it first");
      if (barred) return tell(ctx, by, `already barred. ${Math.ceil((s.barredUntil - now) / 1000)}s`);
      if (now < (s.barCoolUntil ?? 0)) return tell(ctx, by, "the bar's still warm. wait");
      s.barredUntil = now + D.bar * 1000; s.barCoolUntil = s.barredUntil + D.barCooldown * 1000; s.hp = D.hp;
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
    s.open = !s.open; s.by = by;
    ping(ctx, "door", RULES.noise.door * 0.5);
    const grate = s.kind === "grate", panel = s.kind === "panel";
    snd(ctx, panel ? SFX.panelSlide : grate ? (s.open ? SFX.gateOpen : SFX.gateShut) : s.open ? SFX.doorOpen : SFX.doorShut, 0.75);
  },
};
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
