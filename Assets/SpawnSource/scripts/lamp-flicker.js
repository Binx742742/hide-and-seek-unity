// A dying sodium lamp: its head light (the child "<id>/light") stutters in short bursts, then holds steady a while.
// Steady intensity = state.base (default 25). ctx.random only; sleeps between every change.
export function update(ctx) {
  const lamp = ctx.getObject(`${ctx.self.id}/light`);
  if (!lamp || !lamp.light) { ctx.sleep(2); return; }
  const base = ctx.self.state.base ?? 25;
  const left = ctx.self.state.burst ?? 0;
  if (left > 0) {
    ctx.self.state.burst = left - 1;
    lamp.light.intensity = left === 1 ? base : ctx.random() < 0.6 ? base * (0.03 + ctx.random() * 0.3) : base * (0.7 + ctx.random() * 0.3);
    ctx.sleep(0.04 + ctx.random() * 0.14);
  } else {
    lamp.light.intensity = base;
    ctx.self.state.burst = 3 + Math.floor(ctx.random() * 7);
    ctx.sleep(1.5 + ctx.random() * 6);
  }
}
