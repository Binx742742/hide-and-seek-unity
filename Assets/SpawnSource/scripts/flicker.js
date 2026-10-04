// A failing bulb: rides a light object and stutters its intensity. Tuned by state: base (intensity), color, distance.
export const updateSchedule = { every: { seconds: 0.1 } };
export function update(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (now < (s.holdUntil ?? 0)) return;
  const r = ctx.random();
  let v = s.base ?? 9, hold = 300 + r * 1800;
  if (r < 0.18) { v = (s.base ?? 9) * 0.08; hold = 60 + r * 400; }
  else if (r < 0.3) { v = (s.base ?? 9) * 0.5; hold = 80 + r * 200; }
  s.holdUntil = now + hold;
  ctx.self.light = { kind: "point", color: s.color ?? "oklch(0.82 0.12 70)", intensity: v, distance: s.distance ?? 14, shadow: { enabled: false } };
}
