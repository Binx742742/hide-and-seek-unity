// Gullmouth's film stock: wet night fog the sodium lamps glow through, a cold drained grade, a deep vignette, grain.
// High and ultra march real mist (lit by the moon and every lamp); lower tiers keep the grade and the place's height fog.
import { grade, vignette, grain } from "builtin/postfx";
import { vec2, vec3, vec4, float, Loop, mx_noise_float, cameraPosition, screenUV } from "builtin/tsl";
import { sunDirection, sunRadiance, ambientRadiance, sunVisibility, lightsAt, windTravel } from "builtin/lighting";

function mist(ctx) {
  const air = ctx.target("air", { width: 640, height: 360 });
  const fog = ctx.pass(air, (uv) => {
    const ray = ctx.worldPosition(uv).sub(cameraPosition), dir = ray.normalize();
    const dt = ray.length().min(55).div(20);
    const start = uv.mul(air.size).dot(vec2(0.0671, 0.0058)).fract().mul(52.98).fract();
    const toMoon = dir.dot(sunDirection).mul(0.5).add(0.5).pow(4).mul(0.5);
    const wind = vec3(windTravel.x, 0, windTravel.y), light = vec3(0).toVar(), clear = float(1).toVar();
    Loop(20, ({ i }) => {
      const p = cameraPosition.add(dir.mul(float(i).add(start).mul(dt)));
      const n = mx_noise_float(p.sub(wind).mul(0.18)).mul(0.6).add(mx_noise_float(p.sub(wind.mul(1.7)).mul(0.55)).mul(0.4)).add(1);
      const d = ctx.param("density", 0.04).mul(p.y.max(0).div(-3).exp()).mul(n);
      const through = d.mul(dt).negate().exp();
      const lamp = lightsAt(p, { shadow: false }).mul(ctx.param("lampGlow", 0.12));
      light.addAssign(sunRadiance.mul(sunVisibility(p)).mul(toMoon).add(ambientRadiance.mul(0.12)).add(lamp).mul(clear).mul(float(1).sub(through)));
      clear.mulAssign(through);
    });
    return vec4(light, clear);
  });
  const half = vec2(0.5).div(air.size);
  const f = fog.sample(screenUV.add(half)).add(fog.sample(screenUV.sub(half))).mul(0.5);
  return ctx.scene.mul(f.w).add(f.rgb);
}

export function look(ctx) {
  // the engine's bloom: the sodium bulbs, the cage lamps and the lit windows halo; walls never do (threshold stays at white)
  ctx.param("bloomStrength", 0.55);
  ctx.param("bloomRadius", 0.9);
  ctx.param("bloomThreshold", 1);
  const air = ctx.quality === "high" || ctx.quality === "ultra" ? mist(ctx) : ctx.scene;
  let c = grade(air, { exposure: 1.5, saturation: 0.82, contrast: 1.08, temperature: -0.07, gamma: 1.06, lift: [0.004, 0.008, 0.016] });
  c = vignette(c, ctx.param("vignette", 0.42), { color: "oklch(0.1 0.02 250)", feather: 0.55 });
  return grain(c, 0.035);
}
