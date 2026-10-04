# Hide and Seek (Unity port bridge)

This folder is a **Unity project starter** for **Gullmouth / Hide and Seek** — a port bridge from the live Spawn world [@binxius/hide-and-seek](https://spawn.co). It is **not** a finished 3D rebuild of the cannery yard.

**Editor target:** Unity **6000.0.23f1** (Unity 6). Open this folder in that editor (or a close 6000.0.x); Unity will generate Library/ and other ignored folders on first open.

## How to open

1. Install Unity Hub + Unity **6000.0.23f1** (or another 6000.0 LTS/patch you already use).
2. Hub → **Open** → choose this folder: `hide-and-seek-unity`.
3. Let Unity import. Ignore missing URP/HDRP packages unless you add a render pipeline later — this starter uses built-in modules only.
4. Open `Assets/Scenes/Bootstrap.unity` (or create a new scene).
5. Select the **RoundDirector** GameObject (or create an empty GameObject and **Add Component → RoundDirector**). Press Play: Console logs Lobby → Hide → Hunt → End using the Spawn rule timings.

If the scene script link is missing after import, drag `Assets/Scripts/HideAndSeek/RoundDirector.cs` onto an empty GameObject.

## What is playable today vs reference

| Ready in Unity | Still Spawn-only / not ported |
| --- | --- |
| Round phase timer stub (`RoundDirector`) | Multiplayer / netcode |
| Rule numbers as a ScriptableObject (`RoundRules`) | 3D cannery, pier, Fishermen's Row, Rail Siding |
| Original scripts & design copied under `Assets/SpawnSource` | Models, disguises, craft UI, dreamers, bots |

**Do not claim the 3D cannery is rebuilt.** The yard, props, and netcode live in the Spawn world. This project carries the rules layer and a readable mirror of the source so you can continue the port in Unity.

## Where to look

- **`Assets/SpawnSource/`** — original Spawn text sources, relative paths preserved:
  - `design.md` — product decisions and loop
  - `AGENTS.md` — agent notes
  - `world.config.yaml`, `sim.js`
  - `places/` — place config and cell scenes (Spawn format, not Unity)
  - `scripts/` — gameplay JS (player, bot, craft, etc.)
  - `scripts/lib/data/rules.yml` — **canonical numbers** (keep C# in sync)
  - `templates/`, `ui/`
- **`Assets/Scripts/HideAndSeek/`** — C# start:
  - `RoundRules.cs` — hide/hunt seconds, HP, speeds, claw/stab/trap damage from `rules.yml`
  - `RoundDirector.cs` — Lobby / Hide (bot only) / Hunt / End; human rounds skip Hide and lock claws for `startLock` seconds

## Round behaviour (as encoded)

- **Solo bot:** Lobby → **Hide** (cage) → Hunt → End → Lobby.
- **Human round:** Lobby → **Hunt** (skip Hide); claws locked for **30 s** from hunt start (`reveal.startLock`). Full multiplayer is **not** implemented — this is a local stub only.

## Notes

- No third-party packages. No `.git` from the Spawn clone. Do not commit secrets or `node_modules`.
- Unity regenerates `Library/`, `Temp/`, `Logs/`, `*.csproj` — they are gitignored.
- Not git-committed yet; commit when you are ready.
