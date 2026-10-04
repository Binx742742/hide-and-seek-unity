// Gullmouth ground: a flat wet asphalt yard at y 0 (x -44..96), a rock shore falling to the sea south of
// z -36 (the pier stands over it), and west of the old fence the town of Saltgate on a bluff at y 4,
// its bank cut by one road ramp (z -20..-12) and one hidden gully (z 60..62). Low scrub hills outside.
// Under Saltgate the old storm drains run at floor y 0: the bluff is what roofs them.
function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const WEST = -120, TOWN = 4;
// how far outside the whole map (x -120..96, z -36..100)
function outside(x, z) {
  const dx = x < WEST ? WEST - x : Math.max(0, x - 96), dz = Math.max(0, z - 100);
  return Math.hypot(dx, dz);
}
// the bluff: 0 east of x -45, TOWN west of x -47.5; the ramp and the gully cut it
function bluff(x, z) {
  const bank = TOWN * smooth((-45 - x) / 2.5);
  const zone = (z0, z1) => clamp01(Math.min(z - z0, z1 - z) / 1.2 + 0.5);
  const ramp = TOWN * clamp01((-44 - x) / 16), gully = TOWN * clamp01((-44 - x) / 12);
  let h = bank;
  const wr = zone(-20, -12); if (wr > 0) h = h + (Math.min(bank, ramp) - h) * wr;
  const wg = zone(60, 62); if (wg > 0) h = h + (Math.min(bank, gully) - h) * wg;
  return h;
}
export function heightAt(x, z) {
  const shore = smooth((-36 - z) / 8) * -6;
  const o = outside(x, z);
  const hills = smooth(o / 25) * (4 + vnoise(x * 0.04, z * 0.04) * 9) + vnoise(x * 0.2, z * 0.2) * 0.6 * smooth(o / 6);
  const base = x < -44 ? bluff(x, z) : 0;
  return shore + base + (z > -40 ? hills : hills * smooth((z + 50) / 10));
}
export function materialAt(x, z) {
  const o = outside(x, z);
  if (z < -36.5) return { rock: 1 };
  if (o > 3) return { grass: 1 };
  if (o > 0.5) return { gravel: 1 };
  if (x < -44) {
    // the bank is bare rock; the town is rough grass with gravel worn through
    if (x > -48 && !(z > -20 && z < -12)) return { rock: 1 };
    const g = vnoise(x * 0.12, z * 0.12);
    return g > 0.62 ? { gravel: 1 } : { grass: 1 };
  }
  const g = vnoise(x * 0.15, z * 0.15);
  return g > 0.72 ? { gravel: 1 } : { asphalt: 1 };
}
