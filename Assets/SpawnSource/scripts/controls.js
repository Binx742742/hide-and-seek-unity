// Touch surface per role: hiders stab/search, the mimic claws/disguises, ghosts just walk.
// A role read as missing for a frame keeps the last surface, so the layout never flickers.
let last = "default";
export default (ctx) => {
  const r = ctx.player?.state?.role;
  if (r === undefined || r === null) return last;
  last = r === "mimic" ? "mimic" : r === "ghost" ? "ghost" : "default";
  return last;
};
