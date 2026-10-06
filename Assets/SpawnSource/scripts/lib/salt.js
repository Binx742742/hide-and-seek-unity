// Salt-touched: one human hider the dream has quietly turned (marked by places/main/sim.js at hunt start, 4+ players).
// The mark lives on that player's own row: state.salt = { round, unbar, ping, committed, verbs, at }.
// Any sabotage (unbar a door, bleed a drain, salt ping) commits them; commit() is the one writer of that flip.
// Numbers: lib/data/rules.yml saltTouched (mirrors the Unity port) and saltTuning (this port only).
import RULES from "./data/rules.yml";
export const SALT = RULES.saltTouched;
export const SALT_TUNE = RULES.saltTuning;

// the mark, only if it belongs to the round being played and its bearer still hides
export function saltOf(p, roundId) {
  const m = p?.state?.salt;
  if (!m || (roundId && m.round !== roundId)) return null;
  return m;
}
// sabotage needs the hunt, the mark of this round, and a living hider (a risen or dead bearer can't)
export function canSabotage(p, ps) {
  const m = saltOf(p, ps?.roundId);
  return !!m && ps.phase === "hunt" && p.state.role === "hider" && (p.state.hp ?? 1) > 0 && !p.state.hiddenIn;
}
// how many seats a round of n human players gets: 0 under minPlayers, count at or over, never more than 1
export function saltSeats(n) {
  const S = SALT.seats;
  return Math.min(1, n >= S.minPlayers ? S.count : S.below);
}
// a sabotage happened: flip to committed, remember the verb and where (the mimic's hint names the area)
export function commit(p, verb, pos, patch = {}) {
  const m = p.state.salt;
  if (!m) return;
  p.state.salt = { ...m, ...patch, committed: true, verbs: [...(m.verbs ?? []), verb], at: { x: pos.x, y: pos.y ?? 0, z: pos.z } };
}
// the salt-touched's own result: rules saltTouched.win[clean|committed][hiders|mimic]
export function saltWon(m, winner) {
  const v = SALT.win[m?.committed ? "committed" : "clean"][winner === "mimic" ? "mimic" : "hiders"];
  return v === "withHiders" || v === "withMimic";
}
// the area a hint names: districts, never a person
export function areaOf(p) {
  if (!p) return "the yard";
  if (p.x < -43 && (p.y ?? 0) < 2.5) return "the drains";
  if (p.x < -58) return "Saltgate";
  if (p.x > 46) return "the Rail Siding";
  if (p.z > 34) return "Fishermen's Row";
  if (p.z < -24) return "the pier";
  return "the cannery yard";
}
