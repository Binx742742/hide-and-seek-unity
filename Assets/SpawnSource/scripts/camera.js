// The orbit rig: the engine presents the orbit and casts the arm; this writes the honest row (the eye)
// every tick and lets the wheel pull the arm in and out.
export function onInput(ctx, input) {
  const z = input.axes.zoomIn ?? 0;
  if (z) ctx.self.state.desiredDist = Math.max(1.8, Math.min(6, (ctx.self.state.desiredDist ?? 3.4) - z * 0.6));
}
export function update(ctx) {
  ctx.self.hideLocalPlayer = false;
  const t = ctx.self.target, v = ctx.self.view, s = ctx.self.state;
  if (!t || !v) return;
  const d = s.desiredDist ?? 3.4, h = s.heightOffset ?? 1.75, cp = Math.cos(v.pitch), f = t.feetPosition;
  ctx.self.feetPosition = { x: f.x + Math.sin(v.yaw) * cp * d, y: f.y + h - Math.sin(v.pitch) * d, z: f.z + Math.cos(v.yaw) * cp * d };
  ctx.self.rotation = { lookAt: { x: f.x, y: f.y + (s.lookOffsetY ?? 1.5), z: f.z }, include: ["yaw", "pitch"] };
}
