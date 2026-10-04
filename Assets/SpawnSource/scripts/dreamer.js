// A sleepwalking docker: shuffles around their home, murmurs, stands still while someone talks to them.
// state: { home, name, says, awake, talker, coolUntil, wanderTo }. The talking itself is judged in scripts/player.js.
import { SFX } from "./lib/sfx.js";
export const updateSchedule = { every: 3 };
const WAKE = `fx
pop motes burst=40 life=1.5..2.5 on=sphere(.5).c(1) v=up(.6..1.4)+sdir()*.3 size=.04..0.09 acc=curl(.5)+buoy(.4) col=hdr(1.6,1.4,.9) a=0>.1:1>.7:.8>0 sz=$size r=sprite(mote,add)
pop ring burst=1 life=1 size=2.5 col=hdr(1.4,1.2,.8) a=.6>0 sz=$size*(.3>1.5) r=sprite(soft-disc,add)`;
export function update(ctx) {
  const s = ctx.self.state, now = ctx.now(), me = ctx.self.feetPosition;
  if (s.awake) {
    if (!s.goneAt) {
      s.goneAt = now + 2600;
      ctx.emit("fx", { position: me, script: WAKE });
      ctx.emit("playSound", { clip: SFX.wake, position: me, volume: 0.9, maxDistance: 30 });
      ctx.self.velocity = { x: 0, y: -1, z: 0 };
    }
    if (now > s.goneAt && ctx.self.visible !== false) ctx.self.visible = false;
    return;
  }
  // a real sleeper knows a fake one: a mimic in oilskin within 4 m makes them scream and point it out
  if (now > (s.sniffAt ?? 0)) {
    s.sniffAt = now + 800;
    const fakes = ctx.place.players.filter((p) => p.state.role === "mimic" && p.state.disguise === "fisherman")
      .concat(ctx.query({ tags: ["mimic-bot"], radius: 6 }).filter((b) => b.state.disguise === "fisherman" && !b.state.dead));
    const f = fakes.find((p) => Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z) < 4);
    if (f && now > (s.screamAt ?? 0)) {
      s.screamAt = now + 15000;
      s.line = { text: `THAT'S NOT ${String(f.state.name ?? "one of us").toUpperCase()}!`, at: now };
      s.murmurAt = now + 5000;
      ctx.emit("playSound", { clip: SFX.scream, position: me, volume: 1, maxDistance: 45 });
      ctx.emit("highlightSet", { target: f.id, color: "oklch(0.65 0.22 25)", style: "pulse", duration: 3 });
      ctx.emit("shake", { target: ctx.self.id, intensity: 0.15, duration: 1 });
      const st = ctx.place.state; st.feed = [...(st.feed ?? []).slice(-3), { text: `${s.name} is screaming at a fisherman`, at: now }];
      const dx = f.feetPosition.x - me.x, dz = f.feetPosition.z - me.z;
      ctx.self.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
    }
  }
  if (s.talker) {
    const t = ctx.place.players.find((p) => p.id === s.talker);
    if (!t || t.state.talk?.npc !== ctx.self.id) { s.talker = null; }
    else {
      ctx.self.velocity = { x: 0, y: -1, z: 0 };
      const dx = t.feetPosition.x - me.x, dz = t.feetPosition.z - me.z;
      ctx.self.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
      return;
    }
  }
  // shuffle: a slow walk to a point near home, a pause, another
  if (!s.wanderTo || now > (s.wanderUntil ?? 0)) {
    const a = ctx.random() * Math.PI * 2, r = 1 + ctx.random() * 4;
    s.wanderTo = { x: s.home[0] + Math.cos(a) * r, z: s.home[1] + Math.sin(a) * r };
    s.wanderUntil = now + 6000 + ctx.random() * 6000;
  }
  const dx = s.wanderTo.x - me.x, dz = s.wanderTo.z - me.z, d = Math.hypot(dx, dz);
  if (d < 0.5) { ctx.self.velocity = { x: 0, y: -1, z: 0 }; }
  else {
    const sp = 0.7;
    ctx.self.velocity = { x: (dx / d) * sp, y: ctx.self.grounded ? -1 : ctx.self.velocity.y - 1, z: (dz / d) * sp };
    ctx.self.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
  }
  if (now > (s.murmurAt ?? 0)) {
    s.murmurAt = now + 9000 + ctx.random() * 9000;
    const line = s.says[Math.floor(ctx.random() * s.says.length)];
    s.line = { text: line, at: now };
  }
}
