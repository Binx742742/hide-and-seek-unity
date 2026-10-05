# Design references — systems pillars

These are reference pillars for **Gullmouth / Hide and Seek**. They describe the pressure a small crew should feel in a round. They live under `docs/` so Unity does not import them as runtime assets.

`Assets/SpawnSource/scripts/lib/data/rules.yml` stays the sheet. The C# port reads that sheet. A pillar here becomes a rule only after it is designed into `rules.yml`. This page sets no health, speeds, drain rates, inventory sizes, or scare timers.

Look (lighting, interiors, the seeker silhouette, palette, HUD) stays in [style references](style-references/README.md). This page is systems only.

## How this sits next to the mimic

The live round is already asymmetrical, and the salt yard is where that split plays. The **mimic** is the stalking threat in the cannery and Saltgate: faster than a hider, much harder to kill, with lethal claws, scent, and tricks, and a body that looks like crew until someone sees it hurt someone. **Hiders** are the survivors: a weak stab, hiding spots, and a craft kit that pays off when people share scrap, wire, and powder.

In design talk that stalking role is the Salt-touched threat. In `rules.yml`, `design.md`, and the C# port the role is still the mimic. `playersPerSeeker` is still one seeker per five players, two in a room of ten. `seats` is still 5. The 1-vs-4 and 2-vs-3 shapes below are the reference target for that same split. The sheet keeps the current draw until those shapes are written into `rules.yml`.

`RoundDirector` in the Unity port is the match referee (lobby, hide, hunt, end, wins). The Director AI in [section 4](#4-the-director-ai-system) is a separate pacing idea.

## 1. Asymmetrical Role System (1 vs 4 or 2 vs 3)

A full small lobby is one threat against four survivors, or two threats against three. The sides are built for different jobs.

### The Threat (1–2 players)

An overpowering stalking entity, with an alien or monster presence. High mobility, sensory tracking, and lethal attacks. One or two of them can end a crew that tries to fight fair.

### The Survivors (3–4 players)

Limited physical defense and high vulnerability. Escape comes from utility, stealth, and cooperation.

### Tension loop

The threat does not know who is baiting and who is hiding. Survivors can spend a life, a noise, or a tool to pull the stalker off someone else, and the stalker has to guess which body is the real one. That uncertainty is the mind game: a callout might be a lure, and a quiet corner might be the person the group is actually trying to save.

## 2. Dynamic Sanity & Communication Interference

Talking is a tool, and the yard can take it away. `design.md` still lists proximity-voice tuning as an open question. `IProximityVoice` in the Unity port is an empty hook with no distance model. The beats below are the reference for that open question.

### Proximity voice

Voice muffles and distorts with distance and with obstacles. A wall or a steel door turns a clear sentence into something you have to strain to parse. Someone on the far side of a barred Saltgate door, or deep in the drains, sounds far away.

### Sanity meter

A sanity meter drops from dark events and from staying in the dark. Light, and getting back to the crew, are how a survivor stays someone the others can trust. Drain rate, floor, and recovery belong in `rules.yml` when the meter is designed.

### Glitch communication

Low sanity breaks the radio. Static, fake callouts, and distorted teammate voices make the crew doubt what they just heard. The point is paranoia: a warning might be a friend, a glitch, or the thing that wants the door opened.

## 3. Resource Scarcity & Shared Inventory

The yard stays poor on purpose. Today's sheet does that with scarce loot crates and personal craft (scrap, wire, powder), plus a shared clue count for the dreamers. The pillar below is a stronger version of that scarcity: one moving stash the whole crew shares. The round does not spawn that chest yet.

### Communal stash

A shared mobile supply chest with a limited inventory. The argument is the point. One flashlight battery, or one medkit, and a crew that all need it. Who carries it, who spends it, and who is left in the dark are decisions the group makes out loud.

### Asymmetrical tools

Useful tools are split across players — a weapon, a map, a lockpick — so the escape needs more than one person still standing. The person with the map is how the crew knows the yard. The person with the lockpick is how a steel door opens. The current craft kit works the other way: any hider can build the same traps from materials they find. This pillar asks for that extra mutual dependence once the split is written into the sheet.

Mood for those arguments: Indie Game Joe's short [A 5-player horror game where harmless games become cruel tests of nerve and trust](https://www.youtube.com/watch?v=uwGiBmG9Tiw). Friends under pressure, bluffing, and turning on each other. Use it as tone for how scarce gear should feel in voice chat. It is a mood reference for Gullmouth, separate from any system in `rules.yml`.

## 4. The Director AI System

A pacing layer in the spirit of the Left 4 Dead 2 director. It watches how the round is going and spends scares so the crew cannot settle. The bot mimic's chase loop is a different thing: it hunts by sight and a few noise cues. It does not retune the round because the group clumped or split.

### Pacing control

The director monitors health, how tightly the survivors are grouped, and how much noise they are making. A quiet, healthy, huddled crew is a crew that needs pressure. A crew that is already bleeding and scattered has enough.

### Adaptive scares

When the group is too tight, the director spends psychological stressors that pull them apart: a sound down a side hall, a light dying, a voice that is not quite a teammate. When they split up, it spends direct attacks on the people who are alone. The aim is the same tension loop as [section 1](#1-asymmetrical-role-system-1-vs-4-or-2-vs-3) — uncertainty about bait, a glitch, or the threat — kept moving for the whole hunt.

## What the sheet still owns

Until a pillar is designed into `rules.yml`:

- Seat count, seekers per lobby, health, speeds, claw and stab, craft recipes, and hunt length stay as written.
- Proximity voice stays the open question in `design.md` and the empty `IProximityVoice` hook.
- Sanity, the communal chest, tool roles, and director pacing wait for a rules pass.
- The mimic remains the threat role. Hiders remain the survivors. Risen mimics, disguise, and the dreamer win stay as `design.md` and `rules.yml` already describe them.
