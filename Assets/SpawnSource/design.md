# Gullmouth — hide and seek in a dead cannery

**What it is.** up to 10-player multiplayer survival horror. Night, fog, an abandoned 1970s fish cannery on the docks.
4 **hiders** scavenge loot crates and craft traps to hurt and kill the **mimic** (the seeker). The mimic
disguises itself as crates, barrels and loot crates to trick hiders and kills them. Third-person camera.

**Round.** lobby (15 s countdown once anyone is here) → **hide** 30 s (mimic caged on the pier, screen black)
→ **hunt** 240 s → **end** 8 s → lobby. With 2+ humans one random human is the mimic; alone (or 1 player),
a bot mimic hunts you. Joiners mid-round watch as ghosts.

**Win / lose.**
- Mimic wins: every hider is dead.
- Hiders win: the clock runs out with anyone alive, OR the mimic's 200 hp hits 0.

**Hider loop.** sneak → E search loot crate (1–2 of scrap / wire / powder, crate refills in 45 s) → craft:
1 bear trap (2 scrap): 35 dmg + roots 2.5 s · 2 bait crate (scrap + powder): a fake loot crate, blows for 45 + stun
when the mimic comes within 1.8 m · 3 rattle lure (wire + scrap): clanks after 6 s, draws the bot · 4 flashbang
(powder + wire): stuns the mimic 2.5 s within 7 m in front. Left click stab: 8 dmg, 1.1 s — also reveals a disguised mimic.
Hider 100 hp, walks 5.5 m/s.

**Mimic loop.** Q cycles disguise: crate → barrel → loot crate → off (moves 1.2 m/s disguised). Left click claw:
34 dmg (3 hits kill), 0.9 s, 2.4 m. A hider who presses E on a mimic disguised as loot takes 45 and is stunned.
Mimic 200 hp, 6.4 m/s. Bot mimic chases at 5.2 (outrunnable), claws 25.

**Numbers agree.** 4 hiders × ~2 traps each ≈ 8 × 35–45 ≈ 320 > 200: killing the mimic takes teamwork, not luck.
Mimic needs 3 claws a hider = 12 claws in 240 s.

**Open questions.** voice proximity chat tuning; more mimic forms; hiding inside lockers.

## Decisions
- 2026-10-03 binxius: 5 player hide and seek horror, hiders loot + craft traps/fake loot, seeker transforms into objects and loot. Setting (cannery at night) is Savi's pick.

- 2026-10-03 (binxius): fake loot belongs to the MIMIC, not the hiders: "the mimic is the one who places fake loot boxes". Mimic presses R (hunt phase) to plant a fake loot crate identical to the real ones, max 3 (oldest crumbles), 8 s cooldown; opening one bites a hider for 35 and stuns 1.6 s; a hider's stab splits a fake open. The bot mimic plants one each time it settles into an ambush. Hiders' old bait crate became a powder keg (same blast, looks like a small drum, not loot).
- 2026-10-03 (binxius): hiders hide inside things: 4 lockers, 2 tarp heaps, 2 upturned dinghies, the yard dumpster (E in, E out). Hidden = invisible, can't act; the mimic's claw at a hiding place drags them out (damage + stun); the bot checks a spot when it lost you there (60%).
- 2026-10-03 (binxius): "To escape you must kill the monster or find clues to the fact that this a dream and eventually wake up everyone in the dream, fill with npcs you can try and convince, the more clues the easier the mini games become to convince them." New win for hiders: wake all 5 dreamers (scripts/lib/data/dream.yml). 8 clue photographs hang around the yard; E takes one (shared count). E on a dreamer opens the convince bar: stop the needle in the gold 3 times, 2 misses = they scream (the mimic hears) and won't listen for 12 s. Each clue slows the needle 70 ms and widens the gold 4%. Killing the mimic still wins too.
- 2026-10-03 (binxius): "the monster has to feed on something to gain power... hiders can place fake versions": the mimic eats fish piles (E) for power 1–5 (+6 claw, +0.3 speed each); 6 piles at a time, a new one washes up 40 s after each meal. Hiders' craft 2 is rigged fish, identical but for a fuse; it blasts the mimic (45, stun 2) and knocks a power level off. The bot goes to eat when hungry and can't tell the difference.
- 2026-10-03 (binxius): "the monster can manipulate the environment... he is the dream master": T blackout kills the yard lamps 8 s (35 s cooldown); G hangs a false clue, a copy of a real photo that bites (25 + stun) and makes noise. Bot blacks out the yard when it starts a chase, and sometimes hangs false clues.
- 2026-10-03 (binxius): "5 player lobbies, randomize hider/seeker each game": routing.maxPlayers 5 (the door opens a new room past 5, session rooms). The seeker is drawn at random each round, last round's seeker excluded from the draw. A full room starts its lobby countdown at 5 s. Solo = bot mimic.
- 2026-10-03 (binxius): "When a player dies they become a seeker too expand the lobbies to up to 10". Was: dead hiders became ghosts; rooms capped at 5, one seeker. Now: a hider killed rises where they fell as a mimic (90 hp, every mimic power, "RISEN" plate); killing a risen one puts them to rest (ghost). routing.maxPlayers 10; one seeker per 5 players at the draw (5–9 → 1, 10 → 2), last round's seekers sit out. Mimics win when no hider is left; hiders win by dawn, waking the dreamers, or killing every TRUE mimic (risen ones fall with them). A 10-player room starts its countdown at 5 s.
- 2026-10-03 (binxius): "Make it so you look like the monster when you respawn as a monster" + "The monster can also pretend to look like the fishermen". Every human mimic out of disguise (original and risen) now wears the creature body (templates/creature.js#mimicBody), not their avatar. Q cycle adds a 4th form: a sleepwalking fisherman (the dreamers' oilskin model, a borrowed name plate, shuffles at 2.8 m/s and walks/idles). A hider pressing "Wake <name>" on one gets bitten (45 + stun). The bot uses the form too.
- 2026-10-03 (binxius, "sure" to Savi's offer): a real dreamer within 4 m of a mimic dressed as a fisherman screams "THAT'S NOT <NAME>!", turns to it and pulses it red for 3 s (15 s cooldown per dreamer). The fisherman form is a disguise to keep away from the real sleepers.
- 2026-10-03 (binxius: "make it so you dont know who the hider or seeker is, the monster starts as a normal player too until someone sees him hurt someone"): the mimic no longer starts in the cage. it wakes in the same ring as the hiders, looks, walks and carries a lamp like them, and nobody's HUD names it. its first claw on a hider kills (100 dmg, 30 s cooldown). it is REVEALED (creature body, red nametag, feed line) when the victim survives a hit, any other hider with line of sight within 18 m (7 m in a blackout) sees a hit, or a trap/rigged fish bites it. hiders can now stab anyone, since nobody wears a label. risen mimics stay revealed (the monster look from the earlier ask). the end screen names the mimic. solo bot rounds still use the cage.
- 2026-10-03 (binxius: "the monster needs to start with everyone else but have a cooldown of 30 seconds before it can attack"): the mimic spawns in the ring with the hiders and its claws are locked 30 s from round start (rules reveal.startLock), countdown on its HUD.
- 2026-10-03 (binxius: "Expand the map size, keep loot scarce, and make eating fish grant the monster more abilities"): the yard runs north to z 100 (was 34): Fishermen's Row past a torn inner fence (gaps at x 0 and x -28), the locked gate now at the north end. New: smokehouse (-28,62), ice house (26,70), net loft (-14,84), tally hut (16,44), a second container stack, 6 hiding spots, 4 lamps (lamp-7..10), 9 decoys, 5 fish spots (8 piles at once). Only 4 new loot crates (22 total over ~2x the ground). One dreamer and three clues moved north. Fish powers (rules.powers): 1 SCENT (C, hiders through walls 4 s), 2 LUNGE (V, ~8 m pounce), 3 WAIL (X, stuns hiders within 10 m 1.6 s, reveals you), 4 FADE (Z, unseen 6 s), 5 FRENZY (claws heal 12). Touch: one POWER chip fires the best ready one. A rigged fish knocks a level off.
- 2026-10-03 (binxius: "Make a real main menu!" after Savi offered an in-world board; "make basic characters for players to choose"): every fresh arrival opens a main menu over a slow camera drift of the yard: logo, character pick (Yourself = Spawn avatar, Mara dockhand, Bram gutter, Pip runaway, Edda night watch; scripts/lib/data/characters.yml), PLAY HERE, and a live list of other lobbies (each room's referee posts room/players/phase to the sql table `lobbies` every 4 s; rows older than 20 s drop) with JOIN and START A NEW LOBBY (crosses to that room of this world; arrival skips the menu on a join). M / the MENU button reopens it, but not while you're a hider or mimic mid-round. Players in the menu sit out the draw. The mimic wears its picked character too until revealed. Game renamed "Hide and Seek".
- 2026-10-03 (binxius: "Make the map bigger and matches longer then republish"): hunt 240 s → 420 s. The yard runs east to x 96 (was 44): the Rail Siding quarter through two cuts in the old east fence (z -6..0, z 50..56): salt shed (70,-12), pump house (82,14), engine shed (64,40), signal box (84,64), coal store (70,86), two container stacks, a railway line along x 50, lamps 11–15, 6 hiding spots (lockers 7–8, tarps 5–6, dinghy 4, dumpster), 10 decoys, 4 fish spots (10 piles at once). Loot stays scarce: 4 crates (26 total over ~1.6x the ground). Pell the gutter and clues 3 and 6 moved east.
- 2026-10-03 (binxius, via Hide And Seek Dev): human rounds skip hide; claws locked 30s from hunt start; solo bot still uses the cage.
- 2026-10-03 (binxius): basic tutorial page at the start: a first arrival reads it before the menu (the monster looks like a player until they hurt someone or get spotted, claws locked 30s, sneak / search / craft / hide, how a round is won, and the keys that already exist); CONTINUE stores it on player.state so M does not show it again; the menu's TUTORIAL button opens it; a join still skips both.

- 2026-10-03: Saltgate (#2971): a bluff town west of the yard (x -112..-60, ground y 4): ten cottages and a chapel, every door a plank door hiders can bar (R) and the monster claws through; cot-8 has a sliding secret panel out the back. Under it, storm drains (floor y 0) run from a culvert mouth in the yard (x -43, z 26) to three stairs up into the town, each behind an iron grate. Doors ring the monster's noise rings like loot and talk.

## Creative kit (2026-10-04, binxius: "expand the amount of abilities for the monster and hiders, allow players to be creative")
Hiders craft 8 things now (keys 1–8, HUD buttons):
- 5 Tripwire (2 wire): a wire across a gap. The mimic crossing it rings a bell, roots it 1 s, unmasks it, and every hider sees it through walls for 6 s.
- 6 Barricade (2 scrap + 1 wire): planks nailed across a lane, solid. Claws take one plank a swing (4). Max 2 each. Hammering makes door-noise.
- 7 Smoke (2 powder): a 4.5 m cloud for 10 s. A hider inside is unseen: no body, no lamp, no nametag, no scent, bots lose them, claws only find them at touch range.
- 8 Scarecrow (scrap + wire + powder): a dummy wearing your character, lamp lit. The mimic that claws it is stunned 2.2 s in powder, unmasked, and it makes a loud noise.
The mimic gets 3 tricks with no fish needed:
- B Throw voice (16 s): a cry for help sounds up to 14 m ahead, short of the first wall.
- H Gut snare (10 s, max 3): a hider who steps in takes 10, sticks 2.5 s, and it rings for the mimic (60 m).
- J Steal face (30 s): wear the nearest hider's character and name tag until revealed.
Combos the kit is built for: tripwire behind a barricade, smoke to break a chase into a hiding spot, a scarecrow by a rigged fish; the mimic's voice thrown past a snare.
Numbers: scripts/lib/data/rules.yml (tripwire, barricade, smoke, scarecrow, tricks).
