// Turns the humanoid avatar, plays its 3D GLB clips (Idle/Walk/Run/Sprint) by movement speed: the body's own
// paces pick the clip, and it plays at the body's speed over its pace on this body (rateOf below), and sits it
// when it is seated. turnTo picks the heading: the body's own state.turnTo when a script
// wrote one (a world whose places differ writes it as the body changes place), else the world's
// default in lib/data/player.yml. 'movement' (the fresh world's value: the standard third person):
// keys down, the body turns toward where the keys point; keys up, it HOLDS its heading while the
// look swings (the camera orbits a still body) until the look is more than turnInPlace degrees off
// the body, then it turns in place to where the look is: whole, feet with hips, ONE turn to one heading,
// a look still moving is never chased, and holds again.
// Every turn is ONE eased, rate-capped step per tick (turnSmoothing / turnSpeed, shortest arc);
// never the velocity, which dies the moment you stop. 'walk': the same turn toward the keys, and a
// standing body keeps its heading whatever the look does: no turn in place. 'camera' (an aim game:
// the body IS the head): it snaps to the view on every input, walking too; a smoothed head reads as
// input lag. The heading comes from the raw move axes rotated into the camera basis (the same
// rotation player.js gives velocity), so physics can never bend it; the smoothed yaw lives in this
// script's own scratch (gaitOf below), never read back off the entity (wire-quantized). The engine
// turns no body: this script is the yaw's one writer. It only animates a 3D model: on a
// sprite-wearing player it does nothing. The turn is stepAngle from builtin/math; this file is its
// worked example.
// The clips follow what the body DID, never what it was asked to do: this script stands BEFORE
// player.js in the body's behavior list (templates/player.js), so the velocity it reads is what the
// body moved last tick: a body pressed into a wall reads 0 and stands, whatever the keys and the
// camera do. Read after the walker's write, the same dot answers the walker's ask, and a blocked body
// would walk in place for every other player.
import PLAYER from './lib/data/player.yml'
import { stepAngle } from 'builtin/math'

// The body's own word, else the world's default.
function turnTo(ctx) {
  return ctx.self.state.turnTo ?? PLAYER.turnTo
}

// The turn's working numbers: the smoothed yaw, its target, the turn-in-place flag, the speed the
// clips were last set to: are this machine's alone: nobody else reads them, and a value written to
// state rides the wire and the save on every tick it changes (a turning body would send a row a
// tick). ctx.session is the room-life scratch: never on the wire, gone with the room. One slot per
// body, so an NPC wearing this script has its own. state keeps what others must see (turnTo, the
// seat flags below).
function gaitOf(ctx) {
  const gaits = (ctx.session.gait ??= {})
  return (gaits[ctx.self.id] ??= {})
}

// An angle in degrees into (-180, 180].
function wrapDeg(deg) {
  let a = deg % 360
  if (a > 180) a -= 360
  else if (a <= -180) a += 360
  return a
}

// How far a gait clip's rate may stray from its authored beat. Under its pace a clip slows to 1/PACE_BAND (0.8×: a
// stroll on a brisk Walk); slower than that the Walk keeps the floor's tempo and SHORTENS ITS STRIDE instead: it shares
// the body with the Idle, its share the speed over the floor's pace (the idle→walk blend space every engine walks), so a
// grandmother at 0.85 m/s on a Walk that paces 1.3 takes short steps at 0.8× rather than feet that cover 1.04 m/s under a
// body moving 0.85 (an 18% skate). Over its pace, a clip with a faster rung above stretches to PACE_STRETCH: a walk half
// again as quick still reads as a walk, then the Run takes over, and the body's TOP rung, the fastest clip it carries,
// stretches to PACE_STRETCH_TOP: past it there is nothing to hand over to, and legs that pump fast beat feet that
// skate (a six-year-old at 3.3 m/s on a Sprint whose pace is 2.3 on her legs).
const PACE_BAND = 1.25
const PACE_STRETCH = 1.5
const PACE_STRETCH_TOP = 2
// The idle ends and the Walk begins at this share of the body's own Walk pace: 0.63 m/s on a man whose Walk paces 1.4,
// 0.35 on a child whose Walk paces 0.77: a body creeping slower than that stands, one at half its stride's pace walks.
const WALK_FROM = 0.45
// A gait rung is held down to this share of its threshold, for at most this long, before the body drops to the rung below.
const HOLD = 0.85
const HOLD_SECONDS = 0.35

// Each stepping clip's pace on THIS body, in metres a second, keyed by clip name or library address:
// the engine's measure in ctx.world.assets[<model>].gait, times the body's scale; none until measured.
function pacesOf(ctx) {
  const model = ctx.self.model
  const ref = typeof model === 'string' ? model : model?.id
  const measured = (ref && ctx.world?.assets?.[ref]?.gait) || {}
  const scale = ctx.self.effectiveScale?.y ?? 1
  const paces = {}
  for (const name in measured) paces[name] = measured[name] * scale
  return paces
}

// A gait clip's rate: the body's speed over the clip's pace, between 1/PACE_BAND and `stretch` (PACE_STRETCH under a
// faster rung, PACE_STRETCH_TOP on the body's top rung). Standing (or with no pace to read) the clip plays as
// authored. This `speed` is the rate the engine plays: nothing overrules it.
function rateOf(speed, pace, stretch) {
  if (!(speed > 0.1) || !(pace > 0)) return 1
  return Math.min(stretch, Math.max(1 / PACE_BAND, speed / pace))
}

// The seat's held pose. A body attached to something (a hull's seat, a mount, a chair) is seated,
// and this script (the body's one channel writer) holds this pose instead of the gait. A constant
// function of time: the mixer bakes it once, no per-frame code. Values are offsets from the
// T-pose bind. Rotations are degrees in each bone's own frame, the same on every humanoid rig; the
// hip drop is a FRACTION of the rig's hips rest height (sit.units), so the pelvis lands on the seat
// on every avatar, whatever its rig units. Feet stay at the attach point: the seat point is where
// the feet go, and the hips settle about half the body's height above it.
export function sit() {
  return {
    Hips: { position: [0, -0.5, 0] },
    Spine02: { rotation: [-8, 0, 0] },
    LeftUpLeg: { rotation: [-95, 0, 0] },
    RightUpLeg: { rotation: [-95, 0, 0] },
    LeftLeg: { rotation: [85, 0, 0] },
    RightLeg: { rotation: [85, 0, 0] },
    LeftArm: { rotation: [65, 0, 15] },
    RightArm: { rotation: [65, 0, -15] },
    LeftForeArm: { rotation: [60, 0, 30] },
    RightForeArm: { rotation: [60, 0, -30] },
  }
}
sit.units = 'hips'
sit.duration = 0.1

export function onInput(ctx, input) {
  if (ctx.self.sprite) return
  const sin = input.axes.aimYawSin
  const cos = input.axes.aimYawCos
  if (typeof sin !== 'number' || typeof cos !== 'number') return
  const moveX = input.axes.moveX ?? 0
  const moveZ = input.axes.moveZ ?? 0
  const mode = turnTo(ctx)
  const gait = gaitOf(ctx)
  const walking = moveX || moveZ
  const viewYaw = (Math.atan2(sin, cos) * 180) / Math.PI
  if ((mode === 'movement' || mode === 'walk') && walking) {
    // The move axes in the camera basis: the body faces where it walks.
    gait.targetYaw = (Math.atan2(-(cos * moveX - sin * moveZ), sin * moveX + cos * moveZ) * 180) / Math.PI
    gait.turningInPlace = false
  } else if (mode === 'movement') {
    // Standing: hold while the look is within turnInPlace of the body. Past it, ONE turn to where the look is now: the
    // target stays put while the body turns, so a look still moving is never chased, then hold again.
    if (!gait.turningInPlace) {
      const bodyYaw = gait.bodyYaw ?? ctx.self.yaw ?? viewYaw
      if (Math.abs(wrapDeg(viewYaw - bodyYaw)) > (PLAYER.turnInPlace ?? 90)) {
        gait.targetYaw = viewYaw
        gait.turningInPlace = true
      } else {
        gait.targetYaw = null
      }
    }
  } else {
    // 'walk': a standing body holds. 'camera': the view heading.
    gait.targetYaw = mode === 'walk' ? null : viewYaw
  }
}

export function update(ctx, dt) {
  if (ctx.self.sprite) return // sprites animate via the 2D mixer, never these GLB clips

  const clips = PLAYER.clips || {}
  // Seated: attached to a hull, a mount, a chair, or a sit someone else wrote on the sit channel
  // (mixer and anim read one table, so the script remembers whether the sit is its own). The seat
  // carries the body; this script holds the sit and sleeps until a row of this body lands from outside it
  // (the sit cleared, a velocity written, the parent changed: any of them wakes it). A sit on ANY OTHER
  // channel plays over the walk and the body slides seated: use `sit`, or parent the body to the seat.
  // A sit that is not its own is theirs: never written, never cleared.
  const theirSit = ctx.self.mixer?.sit && ctx.self.state.gaitSit !== 'own'
  if (ctx.self.parent || theirSit) {
    if (!ctx.self.state.gaitSeated) {
      ctx.self.state.gaitSeated = true
      ctx.self.anim.idle = null
      ctx.self.anim.walk = null
      ctx.self.anim.run = null
      if (ctx.self.anim.sprint) ctx.self.anim.sprint = null
      if (!theirSit) {
        ctx.self.anim.sit = { clip: clips.sit || sit, loop: 'loop', weight: 1, blendIn: 0.15 }
        ctx.self.state.gaitSit = 'own'
      }
      ctx.self.ik = { ...(ctx.self.ik ?? {}), feet: false } // grounding would plant seated feet through the seat
    }
    ctx.sleep()
    return
  }
  const gait = gaitOf(ctx)
  if (ctx.self.state.gaitSeated) {
    ctx.self.state.gaitSeated = false
    if (ctx.self.state.gaitSit === 'own') ctx.self.anim.sit = null
    ctx.self.state.gaitSit = null
    ctx.self.ik = { ...(ctx.self.ik ?? {}), feet: true }
    gait.clipSpeed = undefined // the channels were cleared for the seat: the next tick writes them whatever the speed
  }

  const mode = turnTo(ctx)
  // turnTo 'none': this script turns nothing: another script (or nobody) owns the yaw.
  if (typeof gait.targetYaw === 'number' && mode !== 'none') {
    const target = gait.targetYaw
    const from = gait.bodyYaw ?? ctx.self.yaw ?? target
    gait.bodyYaw =
      mode === 'movement' || mode === 'walk'
        ? stepAngle(from, target, dt, { smoothing: PLAYER.turnSmoothing, maxDegPerSec: PLAYER.turnSpeed })
        : target
    ctx.self.yaw = gait.bodyYaw + (PLAYER.modelYaw || 0) // modelYaw: degrees a model's forward is off its rig's
    // A turn in place ends when the body has come round to the look: it holds again until the next threshold.
    if (gait.turningInPlace && Math.abs(wrapDeg(target - gait.bodyYaw)) < 0.5) {
      gait.turningInPlace = false
      gait.targetYaw = null
    }
  }
  const targetYaw = gait.targetYaw

  const vel = ctx.self.velocity // what the body did last tick: player.js has not written this tick's ask yet (the order above)
  const asked = Math.hypot(vel.x || 0, vel.z || 0)
  // The speed the gait wears is the speed the body MOVED, never more than the word it read: the feet's ground distance since the
  // last tick over dt. The order above answers the player's own walker; a resident whose script runs after this one and keeps
  // writing velocity into a doorway another body fills, or a body pushed while asking for nothing, stands instead of walking in
  // place all the same. The first tick after a spawn or a teleport has no honest distance and wears the word it was given.
  const feet = ctx.self.feetPosition
  const moved =
    feet && gait.lastFeet && dt > 0 ? Math.hypot((feet.x || 0) - gait.lastFeet.x, (feet.z || 0) - gait.lastFeet.z) / dt : null
  if (feet) gait.lastFeet = { x: feet.x || 0, z: feet.z || 0 }
  const speed =
    typeof PLAYER.speedOverride === 'number' ? PLAYER.speedOverride : moved === null || moved > asked * 1.5 + 0.5 ? asked : Math.min(asked, moved)
  // The speed the clips blend and play at: the body's, held still through float noise. A steady run under a
  // turning camera reads a speed that differs by one bit a tick (the hypot of a rotated vector), and a channel
  // written with a new number is a new row on the wire; a step under a millionth of a metre a second is no
  // change in the gait, so the memo stands until the speed really moves. A real change lands whole.
  if (gait.clipSpeed === undefined || Math.abs(speed - gait.clipSpeed) > 1e-6) gait.clipSpeed = speed
  const clipSpeed = gait.clipSpeed
  // Every switch is THIS body's own, read off its measured paces: the Walk begins at WALK_FROM of its Walk pace, the Run at
  // the geometric mean of its Walk and Run paces (where a stretched Walk and a slowed Run strain alike), the Sprint at the
  // mean of its Run and Sprint, so a child at 3.3 m/s sprints on her own legs while a man at 3.3 runs, and no body wears a
  // clip its speed has left behind. lib/data/player.yml's walkThreshold / runThreshold / sprintThreshold win when a world
  // names them (a world upgraded from 5.x carries its old character's there); the player's own body reads the yml's speeds
  // (below). Before the measure lands ({} paces) the switches sit at 0.8 and 3 m/s with no Sprint. ONE gait clip at a time: the speed picks the rung and the mixer crossfades
  // the switch in time (blendIn), so no steady speed ever wears two gaits: two clips with two periods drift against each
  // other and the legs fight. A speed on a threshold switches once: a rung is held down to HOLD of its threshold for
  // HOLD_SECONDS, so a wandering speed never flickers and a speed that settles in the hold band (Shift let go) hands over.
  const walkClip = clips.walk || 'Walk'
  const runClip = clips.run || 'Run'
  const sprintClip = clips.sprint || 'Sprint'
  const paces = pacesOf(ctx)
  const walkPace = paces[walkClip]
  const runPace = paces[runClip]
  const sprintPace = sprintClip === runClip ? 0 : paces[sprintClip]
  // The PLAYER'S OWN body is the one the world's walkSpeed and runSpeed describe: WASD is its walk and Shift is its run, so the
  // Run begins at their geometric mean when the world names both and the Sprint waits for a named sprintThreshold: Shift never
  // wears the Sprint on its own. Its clips play at their authored tempo AT those speeds: the yml's speeds are its paces, the Walk
  // 1× at walkSpeed and the Run 1× at runSpeed, because a world's speeds run two to three times a human body's measured paces
  // (2.6 and 5.4 m/s on a Walk that paces 1.16 and a Run 2.72) and legs pumping at the 1.5× and 2× caps read as a film on fast
  // forward from behind, while the feet's slide is hidden by the camera that follows. Every other humanoid (a villager the world
  // moves at its own speed, seen from the side) reads its own measured paces, where the slide is what shows.
  const own = typeof ctx.self.id === 'string' && ctx.self.id.startsWith('player/')
  const namedRun = own && PLAYER.walkSpeed > 0 && PLAYER.runSpeed > 0 ? Math.sqrt(PLAYER.walkSpeed * PLAYER.runSpeed) : null
  const walkTempo = own && PLAYER.walkSpeed > 0 ? PLAYER.walkSpeed : walkPace
  const runTempo = own && PLAYER.runSpeed > 0 ? PLAYER.runSpeed : runPace
  const walkAt = typeof PLAYER.walkThreshold === 'number' ? PLAYER.walkThreshold : walkPace > 0 ? WALK_FROM * walkPace : 0.8
  const runAt = Math.max(walkAt, typeof PLAYER.runThreshold === 'number' ? PLAYER.runThreshold : namedRun !== null ? namedRun : walkPace > 0 && runPace > 0 ? Math.sqrt(walkPace * runPace) : 3)
  const sprintAt = Math.max(runAt, typeof PLAYER.sprintThreshold === 'number' ? PLAYER.sprintThreshold : !own && runPace > 0 && sprintPace > 0 ? Math.sqrt(runPace * sprintPace) : Infinity)
  const hasSprint = sprintAt < Infinity
  const rungs = ['idle', 'walk', 'run', 'sprint']
  const steps = [walkAt, runAt, sprintAt]
  let rung = gait.rung ?? 'idle'
  const worn = Math.max(0, rungs.indexOf(rung))
  // The hold band: the highest threshold at or under the worn rung's that the speed sits just below.
  let band = null
  for (let j = worn - 1; j >= 0 && band === null; j--) if (clipSpeed >= steps[j] * HOLD && clipSpeed < steps[j]) band = rungs[j + 1]
  gait.heldFor = band && band === gait.heldBand ? gait.heldFor + dt : 0
  gait.heldBand = band
  let next = 0
  while (next < 3 && clipSpeed >= steps[next]) next++
  rung = rungs[next]
  if (band && gait.heldFor < HOLD_SECONDS) rung = band
  gait.rung = rung
  // Anim channels are addresses: assign a channel object and the mixer follows (an equal write is a compare, never a row).
  // Each rung's clip plays at the body's speed over that clip's own pace. `clips: { run: Sprint }` in player.yml puts
  // another clip under the key; a sprint channel stands only on a body whose file carries a Sprint the measure has paced.
  // The Walk's share of the body: whole from its rate floor up; under the floor, the speed over the floor's pace (the feet
  // then cover the body's speed: share × pace/PACE_BAND), the Idle taking the rest. A body with no measured paces walks
  // whole, and so does the player's own body: its tempo is the world's speed, not a pace its feet cover, so a share in
  // that unit would shorten nothing, and the camera that follows it hides the slide the share exists to end.
  const walkFloor = own ? 0 : walkPace / PACE_BAND
  const walkShare = rung !== 'walk' ? 0.001 : walkFloor > 0 && clipSpeed < walkFloor ? Math.max(0.001, clipSpeed / walkFloor) : 1
  ctx.self.anim.idle = { clip: clips.idle || 'Idle', loop: 'loop', weight: rung === 'idle' ? 1 : rung === 'walk' ? Math.max(0.001, 1 - walkShare) : 0.001, blendIn: 0.15 }
  ctx.self.anim.walk = { clip: walkClip, loop: 'loop', weight: walkShare, speed: rateOf(clipSpeed, walkTempo, PACE_STRETCH), blendIn: 0.15 }
  ctx.self.anim.run = { clip: runClip, loop: 'loop', weight: rung === 'run' ? 1 : 0.001, speed: rateOf(clipSpeed, runTempo, hasSprint ? PACE_STRETCH : PACE_STRETCH_TOP), blendIn: 0.15 }
  if (hasSprint) ctx.self.anim.sprint = { clip: sprintClip, loop: 'loop', weight: rung === 'sprint' ? 1 : 0.001, speed: rateOf(clipSpeed, sprintPace, PACE_STRETCH_TOP), blendIn: 0.15 }
  else if (ctx.self.anim.sprint) ctx.self.anim.sprint = null
  // Standing, facing where it was told to: the clips hold their weights until the body moves or onInput
  // writes a new heading, either wakes this update.
  if (speed === 0 && (typeof targetYaw !== 'number' || gait.bodyYaw === targetYaw)) ctx.sleep()
}
