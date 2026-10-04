// This is your game's look: the whole-screen pass between the rendered world and the
// player's eyes. Out of the box it shows the world exactly as the engine renders it. If the
// world has emissive/glow content, the engine uses the bloom defaults below; plain worlds keep
// the bloom pass parked. Edit a number here and the game updates live.
// The pass is mode-agnostic: a game converted to 2D keeps this script working unchanged.
//
// The whole vocabulary: color grades, vignettes, film grain, retro pixelation, depth of
// field, scanlines: lives in the "looks" skill. Start by uncommenting a line below.
import { grade, vignette, grain } from 'builtin/postfx';

export function look(ctx) {
  // Bloom is the engine's, baked into the finished frame before this pass runs. These three
  // params drive that glow live: edit a number here and the bloom retunes with no recompile
  // (a patchAtmosphere'd look param overrides the script's default). They're surfaced here so
  // the dials sit where you can reach them; the look itself never re-blooms.
  const bloomStrength = ctx.param('bloomStrength', 0.15);
  const bloomRadius = ctx.param('bloomRadius', 0.6);
  const bloomThreshold = ctx.param('bloomThreshold', 1);

  let c = ctx.scene;
  // Uncomment to start grading: a touch warmer, a little more contrast:
  c = grade(c, { exposure: 1.45, saturation: 0.85, contrast: 1, temperature: -0.06 });
  // Uncomment to darken the edges of the frame:
  // c = vignette(c, ctx.param('vignette', 0.2), { color: [0.02, 0.02, 0.05] });
  // Uncomment for a faint film grain:
  c = grain(c, 0.03);
  return c;
}
