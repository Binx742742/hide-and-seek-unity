# Hide and Seek (Unity port)

This folder is a **Unity 6** project for **Gullmouth / Hide and Seek**, carried over from the live Spawn world [@binxius/hide-and-seek](https://spawn.co). The cannery meshes are not in this project. What is here is the gameplay you can call from C#, plus the original Spawn text under `Assets/SpawnSource`.

**Editor target:** Unity **6000.0.23f1**. Open this folder in that editor (or a close 6000.0.x). Unity generates `Library/` on first open. Built-in modules only — no URP, no Netcode package.

## How to play the stand-in round

1. Open `Assets/Scenes/Bootstrap.unity`.
2. Press Play.
3. The local body starts in the menu. Read the tutorial, press **CONTINUE**, then **PLAY HERE**.
4. The lobby holds at 15 seconds until someone has left the menu. One human means a **bot round**: 30 seconds of cage hide, then a 420 second hunt. The bot, NPC hiders, dreamers, clues, fish, loot, and hiding spots are colored primitives at the source coordinates.

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
| Combat: claw, stab, ambush, drag-out, reveal (survivor or a witness with line of sight), frenzy heal | CDN character models, clue pictures, sound files, and music tracks. `IActorVisuals` is where a mesh would be parented. `Actor.VisualsChanged`, `DisguiseChanged`, `SwingStarted`, and `PowerPerformed` are the animator events. `SfxPlayed` carries the `sfx.js` clip id. `MusicCue` is `"lobby"`, `"hunt"`, or `"stop"`. |
| Crafting and hazards: trap, bait, lure, flash. Flash uses the full `flash.cone` (60°), matching `player.js`. | The cannery, pier, row, and siding meshes. Markers are cubes and capsules at the real coordinates. `YardDoor` swings if you place one; the driver does not invent doors. `doorClawGap` is stored because it is in `rules.yml`; `door.js` never reads it. |
| Hiding spots (locker, tarp, dinghy, dumpster), loot rummage, fish piles and the five powers | NavMesh. Bots walk a straight line. Replace `BotMimic` / `BotHider` seeking with a path when a walkable yard exists. Spawn used `builtin/nav`. |
| Dreamers, clues, the convince needle, false clues, blackout. `IYardLamps` plus `BlackoutChanged` is the lamp hook (`lamp-1`..`15` in `sim.js`). | Netcode. Nothing in this project references Unity Netcode. A second human is a local stand-in transform, not a connected client. |
| Menu and tutorial as `OnGUI` logic (`arrival.js` + the keyboard copy in `ui.js`) | Pointer lock and the humanoid gait clips in `player.yml`. The stand-in camera leaves the cursor unlocked so the menu can be clicked. Pitch is clamped only so the orbit stays upright. |
| Bot mimic decision loop and bot hider loop against those stand-ins | Orbit-engine replication beyond the behaviours above. |

`rules.yml` stays the canonical sheet. `RoundRules.CreateRuntimeDefaults()` fills an unassigned rules asset from that sheet, including the 17 food spots and 26 loot spots.

## Where to look

- **`Assets/SpawnSource/`** — original Spawn sources (`design.md`, `scripts/`, `places/`, `rules.yml`).
- **`Assets/Scripts/HideAndSeek/`** — the C# port:
  - `RoundRules.cs`, `DreamCatalog.cs`, `CharacterCatalog.cs` — data
  - `RoundDirector.cs` — referee (`places/main/sim.js`)
  - `Actor.cs`, `ActorActions.cs` — body and verbs (`player.js`)
  - `BotBrains.cs` — `bot-mimic.js`, `bot-hider.js`
  - `WorldObjects.cs`, `YardLayout.cs` — markers, doors, cage gate, hiding spots
  - `MenuFlow.cs`, `RoundHud.cs`, `LocalPlayerInput.cs`, `StandInCamera.cs`
  - `LocalRoundDriver.cs` — Bootstrap entry that spawns the stand-ins
  - `SpawnOnly.cs` — `ILobbyDirectory`, `IProximityVoice`, `IActorVisuals`, `IYardLamps`
  - `GameTypes.cs` — shared enums and the small constants that live in JS rather than YAML (stab cone fallback 80°, drag stun 0.8s, talk break 4m, lobby walk 6, yard gravity −24)

## Round behaviour

- **Bot round** (fewer than 2 humans who have left the menu): Lobby → Hide (cage at rules `cage`, door slides 2.9m) → Hunt → End → Lobby.
- **Human round**: Lobby → Hunt. Claws locked for 30s from hunt start. Risen players bypass that lock because `ResetBody` clears `ClawReadyAt`.
- A hider who dies rises as a revealed mimic (90 HP) on the mimic team. NPC hiders die and are removed. A true mimic who dies becomes a ghost on the mimic team. Risen do not count as true mimics for the win check.
- Wins: every dreamer awake; every true mimic dead; no living hiders (players and NPCs — the HUD uses that same count); hunt timer elapsed ("dawn came. they survived"). If the last true mimic leaves and fewer than two hiders remain, hiders win because the mimic fled.

## Notes

- No third-party packages. Do not commit secrets, `Library/`, or `node_modules`.
- This was checked by reading the C# against the Spawn sources. Play Mode was not run here: this environment has no Unity editor.
