# Hide and Seek (Unity port)

This folder is a **Unity 6** project for **Gullmouth / Hide and Seek**, carried over from the live Spawn world [@binxius/hide-and-seek](https://spawn.co). Gameplay is callable from C#. The yard is the Spawn generators and cell scenes, baked into stand-in meshes at the source coordinates. Character models, sounds, and CDN art are not in this project. The original Spawn text is under `Assets/SpawnSource`.

**Editor target:** Unity **6000.0.23f1**. Open this folder in that editor (or a close 6000.0.x). Unity generates `Library/` on first open. Built-in modules only — no URP, no Netcode package.

## How to play the stand-in round

1. Open `Assets/Scenes/Bootstrap.unity`.
2. Press Play.
3. The local body starts in the menu. Read the tutorial, press **CONTINUE**, then **PLAY HERE**.
4. The lobby holds at 15 seconds until someone has left the menu. One human means a **bot round**: 30 seconds of cage hide, then a 420 second hunt. The cannery, cottages, drains, pier, lamps, doors, loot, and hiding spots are stand-in meshes at the source coordinates, so the yard can be walked. Dreamers and clues stay capsules. A hider or an unrevealed mimic stays a capsule. A revealed mimic with no disguise uses `scripts/gen/mimic.js`. Crate, barrel, loot, locker, tarp, dinghy, and dumpster disguises use those same generator forms.

Keys (from `world.config.yaml`, not invented):

| Key | Action |
| --- | --- |
| WASD | Move. Mouse orbits. Scroll changes the camera arm by 0.6. |
| Space | Jump |
| Click or F | Stab (hider) or claw (mimic) |
| E | Search, hide, wake a dreamer, eat fish, or use a door |
| Q | Cycle mimic disguise |
| R | Bar a shut door, or plant fake loot |
| T | Blackout (mimic, hunt) |
| G | Hang a false clue |
| C V X Z | Scent, lunge, wail, fade |
| 1–4 | Bear trap, powder keg, rattle lure, flash |
| 5–8 | Tripwire, barricade, smoke, scarecrow |
| B H J | Throw voice, gut snare, steal face (mimic, hunt, no fish) |
| M | Menu. Blocked for a living hider or mimic during hide and hunt. |

The HUD **POWER** button calls `ActorActions.UseBestPower`. The Spawn power chip has no keyboard key (`keys: []` in `world.config.yaml`).

`LocalRoundDriver.humanPlayers` defaults to 1. Set it to 2 or more for a human round: no hide phase, claws locked for `reveal.startLock` (30 seconds) from hunt start. Extra humans are not in the menu, so they count as soon as Play starts. `fillNpcSeats` fills `rules.seats` (5) with NPC hiders. Turn it off and the driver sets `seats` to the human count for that play session.

If you remove `LocalRoundDriver`, `RoundDirector.simulateMatch` stays off and the old timer still runs: Lobby → Hide or Hunt → End → Lobby, with console logs and no roles.

## What is ported vs still Spawn-only

Numbers come from `Assets/SpawnSource/scripts/lib/data/rules.yml`, `dream.yml`, `characters.yml`, `player.yml`, `places/main/config.yaml` (yard gravity −24), and the hiding-spot rows in `places/main/cells`. C# defaults match those files. Do not invent stats on top of them.

| Ported (call it from Unity) | Still Spawn-only |
| --- | --- |
| Round phases: lobby 15s (10 eligible humans pull a long lobby to 5s), bot-only hide 30s, human rounds skip hide and lock claws for 30s, hunt 420s, end 8s | Proximity voice. `IProximityVoice` is an empty hook. The scripts never defined a distance model. |
| Draw, roles (hider, mimic, risen, ghost), mask transfer, late join, NPC takeover | The live room list. `sim.js` posts the SQL `lobbies` table every 4s and drops rows older than 20s. `ILobbyDirectory` is the hook. The menu says the list is missing instead of inventing rooms. |
| Combat: claw, stab, ambush, drag-out, reveal (survivor or a witness with line of sight), frenzy heal | CDN character models, dreamer models, clue pictures, sound files, and music tracks. `IActorVisuals` replaces the child `StandInVisual` when assigned. `Actor.VisualsChanged`, `DisguiseChanged`, `SwingStarted`, and `PowerPerformed` are the animator events. `SfxPlayed` carries the `sfx.js` clip id. `MusicCue` is `"lobby"`, `"hunt"`, or `"stop"`. Those names stay a named interface. The files are at `https://www.spawn.co/cdn/<name>` (the filename after `cdn/` in `scripts/lib/sfx.js`, and the lobby and hunt tracks in `places/main/sim.js`). |
| The yard from `scripts/gen` and the three cell scenes, including Saltgate and the storm drains: combined meshes on a child named `Visual`, colliders on `Collision` or a primitive collider. Gameplay stays on the root (`HidingSpot`, `LootCrate`, `YardDoor`, `CageGate`, `Actor`). `YardDoor` swings that root. The cage gate starts closed at `cageFloorY` (the scene pose is the open one). Drain stairs end on the town ground (`TOP` 3.98, top step open). | Harbour ambience (CDN mp3), sea-mist particles, and the cage-sign SVG. Those nodes are not spawned. Fisherman disguise stays a capsule because that body is a CDN model. |
| Terrain from `flat-starter-terrain.js` `heightAt`, with the four drain holes from `places/main/config.yaml`, and a sea plane at y −1.6 with no collider. Lamps `lamp-1`..`15` go to intensity 25 or 0. Bulb stutter and sodium burst use `flicker.js` and `lamp-flicker.js`. A point light is soft when that scene light had shadows enabled. | Light cookies and lightmaps. NavMesh. Bot goals are a straight line (`builtin/nav` is not here). `YardMotion` slides that step off walls and does not choose a new goal. |
| Hiding spots, loot crates, fish piles (the fishpile generator), rigged fish (same tray plus the fuse tube), crafted trap and lure stand-ins, and the five powers. Flash uses the full `flash.cone` (60°), matching `player.js`. `doorClawGap` is stored because it is in `rules.yml`; `door.js` never reads it. | Netcode. Nothing in this project references Unity Netcode. A second human is a local stand-in transform, not a connected client. |
| Dreamers, clues, the convince needle, false clues, blackout. `YardLamps` implements `IYardLamps`. `BlackoutChanged` still fires. | Dreamer meshes and clue pictures. Shards keep the CDN picture path and are not loaded. |
| Creative kit from `rules.yml`: tripwire, barricade (solid collider on the root), smoke, scarecrow, throw voice, gut snare, steal face. The referee judges tripwires and snares. Smoke hides a hider from scent, from the bot, and from claws past 1.6 m. The bot chases a scarecrow and is stunned when it claws one. A stolen face keeps the victim's name until the mimic is revealed, and `ResetBody` clears it. Each piece's mesh is a child named `Visual`. | Scarecrow character models and the kit's CDN textures. The scarecrow is a capsule. Smoke is a marker, not the particle script. The tripwire bell is a cylinder and the snare is a disc, because Unity has no cone or torus. Throw voice does not spawn an ear ping: `player.js` only plays the cry. |
| Menu and tutorial as `OnGUI` logic (`arrival.js` + the keyboard copy in `ui.js`) | Pointer lock and the humanoid gait clips in `player.yml`. The stand-in camera leaves the cursor unlocked so the menu can be clicked. Pitch is clamped only so the orbit stays upright. |
| Bot mimic decision loop and bot hider loop against those stand-ins | Orbit-engine replication beyond the behaviours above. |

`rules.yml` stays the canonical sheet. `RoundRules.CreateRuntimeDefaults()` fills an unassigned rules asset from that sheet, including the 17 food spots, 26 loot spots, and the creative-kit numbers (tripwire, barricade, smoke, scarecrow, echo, snare, steal).

## Where to look

- **`Assets/SpawnSource/`** — original Spawn sources (`design.md`, `scripts/`, `places/`, `rules.yml`).
- **`Assets/UI/Hud/`** — grimdark HUD chrome plates (objective, hider HP, kit cooldown, hunt clock, role ring, warning). Bind notes are in that folder's `README.md`. Not wired into `RoundHud` yet.
- **`Assets/Scripts/HideAndSeek/`** — the C# port:
  - `RoundRules.cs`, `DreamCatalog.cs`, `CharacterCatalog.cs` — data
  - `RoundDirector.cs` — referee (`places/main/sim.js`)
  - `Actor.cs`, `ActorActions.cs` — body and verbs (`player.js`)
  - `BotBrains.cs` — `bot-mimic.js`, `bot-hider.js`
  - `WorldObjects.cs`, `YardLayout.cs` — markers, doors, cage gate, hiding spots
  - `YardBuilder.cs`, `YardMotion.cs`, `ActorVisualStandIn.cs` — baked yard, walking, swappable body mesh
  - `MenuFlow.cs`, `RoundHud.cs`, `LocalPlayerInput.cs`, `StandInCamera.cs`
  - `LocalRoundDriver.cs` — Bootstrap entry that spawns the stand-ins and the yard
  - `SpawnOnly.cs` — `ILobbyDirectory`, `IProximityVoice`, `IActorVisuals`, `IYardLamps`
  - `GameTypes.cs` — shared enums and the small constants that live in JS rather than YAML (stab cone fallback 80°, drag stun 0.8s, talk break 4m, lobby walk 6, yard gravity −24)

## Round behaviour

- **Bot round** (fewer than 2 humans who have left the menu): Lobby → Hide (cage at rules `cage`, door slides 2.9m) → Hunt → End → Lobby.
- **Human round**: Lobby → Hunt. Claws locked for 30s from hunt start. Risen players bypass that lock because `ResetBody` clears `ClawReadyAt`.
- A hider who dies rises as a revealed mimic (90 HP) on the mimic team. NPC hiders die and are removed. A true mimic who dies becomes a ghost on the mimic team. Risen do not count as true mimics for the win check.
- Wins: every dreamer awake; every true mimic dead; no living hiders (players and NPCs — the HUD uses that same count); hunt timer elapsed ("dawn came. they survived"). If the last true mimic leaves and fewer than two hiders remain, hiders win because the mimic fled.

## Yard bake

`tools/bake-yard.mjs` runs the generators and writes `Assets/StreamingAssets/HideAndSeek/yard.json.gz`. Boxes and tubes from one generator become one shared mesh (32-bit indices, because the largest form is past 65k vertices). A plate from `ctx.quad` is a 6 cm box so a fence panel has thickness. The railway is the scene spline, width 2.4, drawn in 2 m steps; that step is display only. Colours are oklch converted to RGB. `ctx.random` in a generator uses the xorshift already written in those files. Flicker timing uses `UnityEngine.Random` with the same thresholds, because the Spawn host RNG is not in this repo.

Regenerate from the repo root:

```bash
node --import ./tools/register-yard.mjs tools/bake-yard.mjs
```

If that file is missing, `LocalRoundDriver` falls back to the loot, hiding-spot, and cage cubes.

## Notes

- No third-party packages. No Netcode, no proximity-voice implementation, no downloaded CDN models or audio.
- Do not commit secrets, `Library/`, or `node_modules`.
- Feet rest on a floor the downward ray actually hit. `Actor.GroundY` is only the rest height when that ray hits nothing. A body under the Saltgate bluff is lifted onto the object named Terrain; roofs and drain floors are other objects. Fish piles use that same terrain height (`y: { terrain: 0 }` in sim.js).
- A dreamer scream and a false clue do not spawn an ear ping. `player.js` only writes `place.state.noise`, and the bot never reads it. A lure's ear ping is `noise.lure` (40 m). The 30 m lure radius is the rattle's audio distance.
- `ActorVisualStandIn` rebuilds its child only when the disguise or the revealed-mimic form changes. Assigning `visualHook` removes that generated child once and does not turn the root renderer back on. Yard meshes and kit pieces stay on a child named `Visual`. Smoke hides that child's renderers for a hider; a visual hook is left to read `Actor.Smoked` itself.
- `Assets/SpawnSource` is the Spawn tree at main `28fedd6`. The drain generator uses `TOP` 3.98 and leaves the top stair step open onto the town. The yard gzip was rebaked from that generator. Saltgate cottages, plank doors, and the drain runs were already in the cell scenes.
- Since `c614750` the Spawn tree adds the Salt-touched hider (`scripts/lib/salt.js`, `rules.yml` `saltTouched` and `saltTuning`, input `saltping` on Y) and round-loop fixes in `places/main/sim.js`, `scripts/player.js`, `scripts/door.js`, and `scripts/ui.js`. The C# port does not implement those yet.
- This was checked by reading the C# against the Spawn sources and by baking the yard file. Play Mode was not run here: this environment has no Unity editor.
