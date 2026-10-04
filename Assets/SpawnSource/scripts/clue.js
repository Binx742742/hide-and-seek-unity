// A clue shard turns slowly and bobs. Painted from state.pic once it is set.
export function update(ctx, dt) {
  if (ctx.self.state.taken) { ctx.sleep(); return; }
  const y = ((ctx.now() / 1000) * 40) % 360;
  ctx.self.rotation = { yaw: y };
}
