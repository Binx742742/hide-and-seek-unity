// Verbs from scripts/player.js. Call these from input, UI, or tests.
// Combat resolution, crafting, hiding, fish powers, and the convince bar live here.
// Hits write the target's Hp directly, the same way the striker's machine did.

using System.Collections.Generic;
using UnityEngine;

namespace HideAndSeek
{
    [RequireComponent(typeof(Actor))]
    public class ActorActions : MonoBehaviour
    {
        Actor _a;
        float _promptAt;
        float _earAt;
        float _beatAt;
        bool _wasFaded;

        void Awake()
        {
            _a = GetComponent<Actor>();
        }

        void Update()
        {
            var dir = _a.Director != null ? _a.Director : RoundDirector.Instance;
            if (dir == null)
                return;
            MaintainTalk(dir);
            MaintainHide(dir);
            bool faded = _a.IsFaded;
            if (faded != _wasFaded)
            {
                _wasFaded = faded;
                _a.NotifyVisuals();
            }
            if (_a.Role == RoleKind.Hider && dir.Phase != RoundPhase.Lobby)
                MaintainHiderSense(dir);
            else if (_a.Dread != 0)
                _a.Dread = 0;
            if (_a.Role == RoleKind.Mimic && dir.Phase == RoundPhase.Hunt)
                MaintainEars(dir);
        }

        public void Attack()
        {
            var dir = Dir();
            if (dir == null)
                return;
            if (_a.Talk != null)
            {
                JudgeTalk(dir);
                return;
            }
            if (_a.HiddenIn != null || _a.IsStunned)
                return;
            if (dir.Phase != RoundPhase.Hunt)
                return;
            if (_a.Role != RoleKind.Hider && _a.Role != RoleKind.Mimic)
                return;

            var rules = dir.Rules;
            float now = Time.time;
            bool mimic = _a.Role == RoleKind.Mimic;
            float reach = mimic ? rules.clawReach : rules.stabReach;
            float cooldown = mimic ? rules.clawCooldown : rules.stabCooldown;
            float cone = mimic ? rules.clawCone : BodyTune.StabConeFallback;

            if (mimic && now < _a.ClawReadyAt)
            {
                _a.Say("claws not ready. " + Mathf.CeilToInt(_a.ClawReadyAt - now) + "s");
                return;
            }
            if (now < _a.AtkReadyAt)
                return;
            _a.AtkReadyAt = now + cooldown;
            if (mimic && _a.Disguise != DisguiseForm.None)
                _a.ChangeDisguise(DisguiseForm.None);
            _a.NoteSwing();

            Actor target = PickTarget(dir, reach, cone);
            if (target == null && mimic && TryDrag(dir, rules, reach, now))
                return;
            if (target == null && mimic)
            {
                var door = DoorAhead(dir, rules.doorReach, true);
                if (door != null)
                {
                    door.Press(_a, "claw");
                    dir.PlaySfx("whoosh", transform.position);
                    return;
                }
            }
            if (target == null && !mimic && TrySplitFake(dir, rules, reach))
                return;
            if (target == null)
            {
                dir.PlaySfx("whoosh", transform.position);
                return;
            }

            bool ambush = mimic && !_a.Revealed && target.Role == RoleKind.Hider && now >= _a.AmbushReadyAt;
            if (ambush)
                _a.AmbushReadyAt = now + rules.ambushCooldown;
            float dmg = ambush
                ? rules.ambushDamage
                : (mimic ? rules.clawDamage + _a.Power * rules.hungerClawPer : rules.stabDamage);
            target.Hp -= dmg;
            target.HurtAt = now;
            if (mimic && !_a.Revealed && target.Role == RoleKind.Hider)
                Witness(dir, target, target.Hp);
            if (mimic && _a.Power >= rules.frenzyAt)
            {
                float cap = _a.Risen ? rules.risenHp : rules.seekerHp;
                _a.Hp = Mathf.Min(cap, _a.Hp + rules.frenzyHeal);
            }
            if (target.Disguise != DisguiseForm.None)
                target.ChangeDisguise(DisguiseForm.None);
            dir.RaiseHit(new HitInfo
            {
                Source = _a,
                Target = target,
                Amount = dmg,
                Point = target.transform.position + Vector3.up * 1.1f,
                Cause = mimic ? "claw" : "stab",
                Ambush = ambush
            });
            dir.PlaySfx(mimic ? "claw" : "stab", target.transform.position);
            dir.PlaySfx(mimic ? "hurt" : "mimicHurt", target.transform.position);
        }

        public void Interact()
        {
            var dir = Dir();
            if (dir == null || _a.IsStunned)
                return;
            if (_a.Role == RoleKind.Hider)
            {
                if (_a.HiddenIn != null)
                    LeaveHide(false);
                else if (_a.Talk != null)
                    JudgeTalk(dir);
                else
                    Search(dir);
                return;
            }
            bool hunt = dir.Phase == RoundPhase.Hunt;
            bool foodNear = _a.Role == RoleKind.Mimic && hunt && FindFood(dir, false) != null;
            if (!foodNear && _a.Disguise == DisguiseForm.None)
            {
                var door = DoorAhead(dir, dir.Rules.doorReach, false);
                if (door != null)
                    door.Press(_a, "toggle");
            }
            if (_a.Role == RoleKind.Mimic && hunt)
                Eat();
        }

        public void PlantKey()
        {
            var dir = Dir();
            if (dir == null)
                return;
            if (_a.Role == RoleKind.Hider && _a.HiddenIn == null)
            {
                var door = DoorAhead(dir, dir.Rules.doorReach, true);
                if (door != null)
                    door.Press(_a, "bar");
                else
                    _a.Say("no shut door to bar");
            }
            else if (_a.Role == RoleKind.Mimic && dir.Phase == RoundPhase.Hunt)
                PlantFake();
        }

        public void CycleDisguise()
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase == RoundPhase.End)
                return;
            var forms = YardLayout.PlayerForms;
            int i = 0;
            for (int k = 0; k < forms.Length; k++)
                if (forms[k] == _a.Disguise)
                    i = k;
            DisguiseForm next = forms[(i + 1) % forms.Length];
            DisguiseForm was = _a.Disguise;
            _a.ChangeDisguise(next);
            dir.PlaySfx(next == DisguiseForm.None ? "unmorph" : "morph", transform.position);
            if (next == DisguiseForm.Fisherman)
                _a.Say("you are " + _a.BorrowedName + ", a sleepwalker. shuffle, don't run.");
            else if (was == DisguiseForm.None)
                _a.Say(next == DisguiseForm.Loot ? "you are a loot crate. hold still." : "you are a " + next.ToString().ToLowerInvariant() + ". hold still.");
        }

        public void Eat()
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase != RoundPhase.Hunt)
                return;
            var rules = dir.Rules;
            if (_a.Power >= rules.hungerMax)
            {
                _a.Say("gorged. nothing more fits");
                return;
            }
            FishPile pile = FindFood(dir, false);
            if (pile == null)
                return;
            Vector3 at = pile.transform.position;
            Destroy(pile.gameObject);
            _a.Power += 1;
            dir.NoteEaten(at);
            dir.PlaySfx("eat", transform.position);
            _a.NotifyVisuals();
            string got = PowerUnlockedAt(_a.Power, rules);
            if (got == "scent") _a.Say("fed. SCENT awakens · C");
            else if (got == "lunge") _a.Say("fed. LUNGE awakens · V");
            else if (got == "wail") _a.Say("fed. WAIL awakens · X");
            else if (got == "fade") _a.Say("fed. FADE awakens · Z");
            else if (got == "frenzy") _a.Say("fed. FRENZY awakens: your claws heal you");
            else _a.Say("fed. power " + _a.Power + "/" + rules.hungerMax);
        }

        public void Blackout()
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase != RoundPhase.Hunt)
                return;
            float now = Time.time;
            if (now < _a.DarkReadyAt)
            {
                _a.Say("the dark returns in " + Mathf.CeilToInt(_a.DarkReadyAt - now) + "s");
                return;
            }
            var rules = dir.Rules;
            _a.DarkReadyAt = now + rules.blackoutCooldown;
            dir.SetBlackout(now + rules.blackoutSeconds);
            _a.Say("the lamps die");
        }

        public void HangFalseClue()
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase != RoundPhase.Hunt || dir.Dream == null)
                return;
            float now = Time.time;
            var rules = dir.Rules;
            if (now < _a.LieReadyAt)
            {
                _a.Say("a new lie in " + Mathf.CeilToInt(_a.LieReadyAt - now) + "s");
                return;
            }
            _a.LieReadyAt = now + rules.falseClueCooldown;
            CrumbleOldestFalse(dir, rules.falseClueMax);
            var real = dir.Dream.RandomClue();
            if (real == null)
                return;
            Vector3 f = YardMath.Forward(transform);
            Vector3 at = transform.position + f * 1.5f + Vector3.up * 1.1f;
            var clue = dir.SpawnClue(real, at, true, _a.ActorId);
            if (clue != null)
                clue.SpawnedAt = now;
            _a.Say("a lie hangs in the air");
        }

        public void PlantFake()
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase != RoundPhase.Hunt)
                return;
            float now = Time.time;
            var rules = dir.Rules;
            if (now < _a.PlantReadyAt)
            {
                _a.Say("fake loot ready in " + Mathf.CeilToInt(_a.PlantReadyAt - now) + "s");
                return;
            }
            CrumbleOldestFake(dir, rules.fakeMax);
            _a.PlantReadyAt = now + rules.fakeCooldown;
            Vector3 f = YardMath.Forward(transform);
            var go = dir.SpawnMarker("fake-loot", transform.position + f * 1.4f, PrimitiveType.Cube, 0.7f);
            var loot = go.AddComponent<LootCrate>();
            loot.Fake = true;
            loot.OwnerId = _a.ActorId;
            loot.SpawnedAt = now;
            YardForms.Dress(go, "loot");
            dir.PlaySfx("morph", transform.position);
            _a.Say("fake loot planted. let them open it");
        }

        public void Craft(CraftKind kind)
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Hider || _a.HiddenIn != null)
                return;
            if (dir.Phase != RoundPhase.Hide && dir.Phase != RoundPhase.Hunt)
                return;
            var rules = dir.Rules;
            if (!rules.TryCost(kind, out int scrap, out int wire, out int powder))
                return;
            if (_a.Scrap < scrap || _a.Wire < wire || _a.Powder < powder)
            {
                _a.Say("need " + CostLabel(scrap, wire, powder));
                return;
            }
            _a.Scrap -= scrap;
            _a.Wire -= wire;
            _a.Powder -= powder;
            float now = Time.time;
            Vector3 f = YardMath.Forward(transform);
            Vector3 me = transform.position;
            dir.PlaySfx("craft", me);
            if (kind == CraftKind.Trap)
                SpawnHazard(dir, "trap", me + f * 1.1f + Vector3.up * 0.04f, PropKind.Trap, now + 1f, 0f);
            else if (kind == CraftKind.Bait)
            {
                var go = dir.SpawnMarker("rigged-fish", me + f * 1.4f, PrimitiveType.Sphere, 0.35f);
                var pile = go.AddComponent<FishPile>();
                pile.Rigged = true;
                // fishpile.js params.rigged is the same tray plus the fuse tube.
                YardForms.Dress(go, "fish-rigged");
                var haz = go.AddComponent<PlacedHazard>();
                haz.Kind = PropKind.Bait;
                haz.OwnerId = _a.ActorId;
                haz.ArmAt = now + 1.5f;
            }
            else if (kind == CraftKind.Lure)
                SpawnHazard(dir, "lure", me + f * 1f + Vector3.up * 0.02f, PropKind.Lure, 0f, now + rules.lureDelay);
            else if (kind == CraftKind.Flash)
                DetonateFlash(dir, rules, me, f, now);
            if (kind == CraftKind.Trap) _a.Say("bear trap set");
            else if (kind == CraftKind.Bait) _a.Say("rigged fish set");
            else if (kind == CraftKind.Lure) _a.Say("rattle lure: 6s");
            else _a.Say("FLASH");
        }

        public void UsePower(string key)
        {
            var dir = Dir();
            if (dir == null || _a.Role != RoleKind.Mimic || dir.Phase != RoundPhase.Hunt)
                return;
            var rules = dir.Rules;
            int need = rules.PowerAt(key);
            if (_a.Power < need)
            {
                _a.Say(key + " needs " + need + " fish in you");
                return;
            }
            float now = Time.time;
            float ready = _a.CooldownReadyAt(key);
            if (now < ready)
            {
                _a.Say(key + " in " + Mathf.CeilToInt(ready - now) + "s");
                return;
            }
            float cd = rules.PowerCooldown(key);
            if (cd > 0f)
                _a.SetCooldownReadyAt(key, now + cd);
            if (key != "scent" && _a.Disguise != DisguiseForm.None)
                _a.ChangeDisguise(DisguiseForm.None);
            Vector3 me = transform.position;
            if (key == "scent")
            {
                int n = 0;
                var actors = dir.Actors;
                for (int i = 0; i < actors.Count; i++)
                {
                    var p = actors[i];
                    if (p == null || p.Role != RoleKind.Hider)
                        continue;
                    if (YardMath.Flat(p.transform.position, me) > rules.scentRange)
                        continue;
                    Component mark = p.HiddenIn != null ? (Component)p.HiddenIn : p;
                    dir.RaiseHighlight(mark, rules.scentSeconds, "scent");
                    n++;
                }
                dir.PlaySfx("sniff", me);
                _a.Say(n > 0 ? "you smell " + n + " of them" : "nothing living near");
            }
            else if (key == "lunge")
            {
                _a.LungeUntil = now + rules.lungeSeconds;
                _a.AtkReadyAt = 0f;
                dir.PlaySfx("lunge", me);
            }
            else if (key == "wail")
            {
                var actors = dir.Actors;
                for (int i = 0; i < actors.Count; i++)
                {
                    var p = actors[i];
                    if (p == null || p.Role != RoleKind.Hider)
                        continue;
                    if (YardMath.Flat(p.transform.position, me) > rules.wailRadius)
                        continue;
                    p.StunUntil = now + rules.wailStun;
                    p.HurtAt = now;
                }
                dir.PlaySfx("wail", me);
                if (!_a.Revealed)
                {
                    _a.Revealed = true;
                    dir.PostFeed("that scream came from " + _a.DisplayName + ". THE MIMIC");
                    dir.RaiseRevealed(_a);
                    _a.NotifyVisuals();
                }
            }
            else if (key == "fade")
            {
                _a.FadeUntil = now + rules.fadeSeconds;
                dir.PlaySfx("fade", me);
                _a.Say("they can't see you. move");
                _a.NotifyVisuals();
            }
            _a.PowerPerformed?.Invoke(key);
        }

        public void UseBestPower()
        {
            var dir = Dir();
            if (dir == null)
                return;
            var rules = dir.Rules;
            float now = Time.time;
            string[] order = { "lunge", "scent", "wail", "fade" };
            for (int i = 0; i < order.Length; i++)
            {
                string k = order[i];
                if (_a.Power >= rules.PowerAt(k) && now >= _a.CooldownReadyAt(k))
                {
                    UsePower(k);
                    return;
                }
            }
            _a.Say(_a.Power > 0 ? "nothing ready" : "eat fish to grow powers");
        }

        public bool CanAfford(CraftKind kind)
        {
            var dir = Dir();
            if (dir == null || !dir.Rules.TryCost(kind, out int scrap, out int wire, out int powder))
                return false;
            return _a.Scrap >= scrap && _a.Wire >= wire && _a.Powder >= powder;
        }

        void Search(RoundDirector dir)
        {
            if (!TryNearest(dir, out string kind, out Component row))
                return;
            float now = Time.time;
            var rules = dir.Rules;
            if (kind == "mimic" && row is Actor mimic)
            {
                _a.Hp -= rules.mimicLootDamage;
                _a.StunUntil = now + rules.mimicLootStun;
                _a.HurtAt = now;
                bool wasMan = mimic.Disguise == DisguiseForm.Fisherman;
                bool wasSpot = mimic.Disguise == DisguiseForm.Locker || mimic.Disguise == DisguiseForm.Tarp
                    || mimic.Disguise == DisguiseForm.Dinghy || mimic.Disguise == DisguiseForm.Dumpster;
                mimic.ChangeDisguise(DisguiseForm.None);
                dir.PlaySfx("bite", mimic.transform.position);
                dir.RaiseHit(new HitInfo { Source = mimic, Target = _a, Amount = rules.mimicLootDamage, Point = transform.position, Cause = "bite" });
                _a.Say(wasMan ? "THAT WASN'T A FISHERMAN" : wasSpot ? "THE HIDING PLACE HAD TEETH" : "IT WAS THE MIMIC");
                return;
            }
            if (kind == "door" && row is YardDoor door)
            {
                door.Press(_a, "toggle");
                return;
            }
            if (kind == "hide" && row is HidingSpot spot)
            {
                EnterHide(spot);
                return;
            }
            if (kind == "clue" && row is ClueShard clue)
            {
                TakeClue(dir, clue);
                return;
            }
            if (kind == "dreamer" && row is DreamerNpc dreamer)
            {
                StartTalk(dir, dreamer);
                return;
            }
            if (kind == "fake" && row is LootCrate fake)
            {
                _a.Hp -= rules.fakeDamage;
                _a.StunUntil = now + rules.fakeStun;
                _a.HurtAt = now;
                Vector3 pos = fake.transform.position;
                Destroy(fake.gameObject);
                dir.PlaySfx("bite", pos);
                dir.RaiseHit(new HitInfo { Source = null, Target = _a, Amount = rules.fakeDamage, Point = pos, Cause = "fake" });
                _a.Say("FAKE. it had teeth");
                return;
            }
            if (kind == "loot" && row is LootCrate crate)
                Rummage(dir, crate, true);
        }

        public void Rummage(RoundDirector dir, LootCrate crate, bool grantItems)
        {
            if (crate == null)
                return;
            float now = Time.time;
            var rules = dir.Rules;
            dir.MakeNoise(crate.transform.position, rules.noiseLoot, "loot");
            if (crate.Fake)
                return;
            if (!grantItems)
            {
                dir.PlaySfx("rummage", crate.transform.position);
                return;
            }
            if (crate.EmptyUntil > now)
            {
                dir.PlaySfx("empty", crate.transform.position);
                _a.Say("picked clean. refills in " + Mathf.CeilToInt(crate.EmptyUntil - now) + "s");
                return;
            }
            crate.EmptyUntil = now + rules.lootRefillSeconds;
            int n = 1 + (UnityEngine.Random.value < 0.5f ? 1 : 0);
            var got = new List<string>(2);
            for (int i = 0; i < n; i++)
            {
                float r = UnityEngine.Random.value;
                string k = r < 0.45f ? "scrap" : r < 0.75f ? "wire" : "powder";
                if (k == "scrap") _a.Scrap++;
                else if (k == "wire") _a.Wire++;
                else _a.Powder++;
                got.Add(k);
            }
            dir.PlaySfx("rummage", crate.transform.position);
            _a.Say("+" + string.Join(" +", got));
        }

        void TakeClue(RoundDirector dir, ClueShard clue)
        {
            if (clue == null || clue.Taken)
                return;
            clue.Taken = true;
            var rend = clue.GetComponent<Renderer>();
            if (rend != null)
                rend.enabled = false;
            var rules = dir.Rules;
            if (clue.False || !string.IsNullOrEmpty(clue.OwnerId))
            {
                float now = Time.time;
                _a.Hp -= rules.falseClueDamage;
                _a.HurtAt = now;
                _a.StunUntil = now + rules.falseClueStun;
                _a.ReadText = "it was a lie. the picture smiles at you";
                _a.ReadPicture = null;
                _a.ReadAt = now;
                dir.PlaySfx("wrong", clue.transform.position);
                dir.MakeNoise(clue.transform.position, rules.noiseLoot, "loot");
                dir.RaiseHit(new HitInfo { Target = _a, Amount = rules.falseClueDamage, Point = clue.transform.position, Cause = "falseclue" });
                Destroy(clue.gameObject);
                return;
            }
            _a.ReadText = clue.Text;
            _a.ReadPicture = clue.Picture;
            _a.ReadAt = Time.time;
            dir.PlaySfx("shard", clue.transform.position);
        }

        void StartTalk(RoundDirector dir, DreamerNpc npc)
        {
            if (npc == null || npc.Awake || npc.Talker != null)
                return;
            float now = Time.time;
            if (npc.CoolUntil > now)
            {
                _a.Say(npc.DisplayName + " won't hear you yet");
                return;
            }
            float width = dir.Dream.ZoneWidth(dir.Clues);
            ConvinceMath.RollZone(width, out float z0, out float z1);
            npc.Talker = _a;
            dir.MakeNoise(npc.transform.position, dir.Rules.noiseTalk, "talk");
            _a.Talk = new ConvinceTalk
            {
                Npc = npc,
                Name = npc.DisplayName,
                StartedAt = now,
                Period = dir.Dream.PeriodSeconds(dir.Clues),
                Zone0 = z0,
                Zone1 = z1
            };
        }

        public void JudgeTalk(RoundDirector dir)
        {
            var tk = _a.Talk;
            if (tk == null)
                return;
            float now = Time.time;
            var npc = tk.Npc;
            var dream = dir.Dream;
            if (npc == null)
            {
                EndTalk();
                return;
            }
            if (now - tk.PressAt < BodyTune.TalkDebounce)
                return;
            float u = ConvinceMath.Needle(tk.StartedAt, tk.Period, now);
            bool hit = ConvinceMath.InGold(u, tk.Zone0, tk.Zone1);
            tk.PressAt = now;
            if (now - tk.NoiseAt > 2.5f)
            {
                tk.NoiseAt = now;
                dir.MakeNoise(npc.transform.position, dir.Rules.noiseTalk, "talk");
            }
            if (hit)
            {
                tk.Hits++;
                tk.LastOk = true;
                tk.FlashAt = now;
                float width = dream.ZoneWidth(dir.Clues);
                ConvinceMath.RollZone(width, out tk.Zone0, out tk.Zone1);
                tk.Period = dream.PeriodSeconds(dir.Clues);
                dir.PlaySfx("tick", npc.transform.position);
                if (tk.Hits >= dream.hits)
                {
                    npc.Awake = true;
                    npc.Talker = null;
                    _a.Talk = null;
                    _a.Say(npc.DisplayName + " wakes up");
                    dir.RaiseDreamerAwake(npc);
                    return;
                }
            }
            else
            {
                tk.Misses++;
                tk.LastOk = false;
                tk.FlashAt = now;
                dir.PlaySfx("wrong", npc.transform.position);
                if (tk.Misses >= dream.misses)
                {
                    npc.CoolUntil = now + dream.cooldown;
                    npc.Talker = null;
                    _a.Talk = null;
                    dir.PlaySfx("scream", npc.transform.position);
                    dir.MakeNoise(npc.transform.position, dir.Rules.noiseLoot, "loot");
                    // player.js writes place.state.noise directly (the bot's investigate ping is a NoisePing).
                    // The scream also sets that noise point. MakeNoise already spawns the ping the bot hears.
                    _a.Say(npc.DisplayName + " screams. it heard that");
                    return;
                }
            }
        }

        public void EnterHide(HidingSpot spot)
        {
            if (spot == null || spot.Occupant != null || _a.Role != RoleKind.Hider)
                return;
            spot.Occupant = _a;
            _a.HiddenIn = spot;
            _a.HideFrom = transform.position;
            transform.position = spot.InsidePoint;
            var dir = Dir();
            bool metal = spot.Kind == HideKind.Locker || spot.Kind == HideKind.Dumpster;
            dir?.PlaySfx(metal ? "cage" : "rummage", spot.transform.position);
            _a.Say("hiding in " + YardMath.HideNoun(spot.Kind) + ". E to climb out");
            _a.HiddenChanged?.Invoke(true);
            _a.NotifyVisuals();
        }

        public void LeaveHide(bool quiet)
        {
            var spot = _a.HiddenIn;
            if (spot != null && spot.Occupant == _a)
                spot.Occupant = null;
            if (spot != null)
            {
                Vector3 f = spot.transform.position;
                // player.js steps out along the spot's −Z. Markers use that yaw as Unity yaw, so −forward.
                Vector3 outPos = f - spot.transform.forward * 1.3f + Vector3.up * 0.1f;
                if (spot.Kind == HideKind.Tarp || spot.Kind == HideKind.Boat)
                    outPos = _a.HideFrom;
                transform.position = outPos;
                if (!quiet)
                {
                    bool metal = spot.Kind == HideKind.Locker || spot.Kind == HideKind.Dumpster;
                    Dir()?.PlaySfx(metal ? "cage" : "rummage", f);
                }
            }
            _a.HiddenIn = null;
            _a.HiddenChanged?.Invoke(false);
            _a.NotifyVisuals();
        }

        void MaintainTalk(RoundDirector dir)
        {
            if (_a.Talk == null)
                return;
            var npc = _a.Talk.Npc;
            if (npc == null || _a.Role != RoleKind.Hider || _a.HurtAt > _a.Talk.StartedAt
                || dir.Phase == RoundPhase.End
                || YardMath.Flat(npc.transform.position, transform.position) > BodyTune.TalkBreakDistance)
                EndTalk();
        }

        void EndTalk()
        {
            if (_a.Talk != null && _a.Talk.Npc != null && _a.Talk.Npc.Talker == _a)
                _a.Talk.Npc.Talker = null;
            _a.Talk = null;
        }

        void MaintainHide(RoundDirector dir)
        {
            if (_a.HiddenIn == null)
                return;
            var spot = _a.HiddenIn;
            if (spot == null || spot.Occupant != _a || _a.Role != RoleKind.Hider)
            {
                LeaveHide(true);
                return;
            }
            Vector3 want = spot.InsidePoint;
            if (YardMath.Flat(transform.position, want) > 0.3f || Mathf.Abs(transform.position.y - want.y) > 0.3f)
                transform.position = want;
        }

        void MaintainHiderSense(RoundDirector dir)
        {
            if (Time.time <= _promptAt)
                return;
            _promptAt = Time.time + 0.2f;
            _a.PromptVerb = null;
            _a.PromptTarget = null;
            if (_a.HiddenIn == null && TryNearest(dir, out string kind, out Component row))
            {
                _a.PromptTarget = row;
                _a.PromptVerb = VerbFor(kind, row);
            }
            int dread = 0;
            float near = 99f;
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var t = actors[i];
                if (t == null || t == _a || t.Dead)
                    continue;
                bool scary = t.Role == RoleKind.Mimic && (t.Revealed || t.IsBot || t.Disguise != DisguiseForm.None);
                if (!scary)
                    continue;
                near = Mathf.Min(near, YardMath.Flat(t.transform.position, transform.position));
            }
            dread = near < 6f ? 2 : near < 14f ? 1 : 0;
            if (_a.Dread != dread)
                _a.Dread = dread;
            if (dread > 0 && Time.time > _beatAt)
            {
                _beatAt = Time.time + (dread == 2 ? 0.65f : 1.2f);
                dir.PlaySfx("heart", transform.position);
            }
        }

        void MaintainEars(RoundDirector dir)
        {
            if (dir == null || Time.time <= _earAt)
                return;
            _earAt = Time.time + 0.25f;
            // Pings already live on the director. BotMimic reads them; the mimic HUD can too.
        }

        bool TryDrag(RoundDirector dir, RoundRules rules, float reach, float now)
        {
            HidingSpot spot = null;
            float best = reach + 1.2f;
            var spots = dir.Spots;
            for (int i = 0; i < spots.Count; i++)
            {
                var s = spots[i];
                if (s == null || s.Occupant == null)
                    continue;
                float d = YardMath.Flat(transform.position, s.transform.position);
                if (d < best)
                {
                    best = d;
                    spot = s;
                }
            }
            if (spot == null)
                return false;
            Actor victim = spot.Occupant;
            spot.Occupant = null;
            if (victim == null)
                return true;
            victim.Hp -= rules.clawDamage;
            victim.HurtAt = now;
            victim.StunUntil = now + BodyTune.DragStunSeconds;
            dir.PlaySfx("claw", spot.transform.position);
            dir.PlaySfx("hurt", spot.transform.position);
            dir.RaiseHit(new HitInfo
            {
                Source = _a,
                Target = victim,
                Amount = rules.clawDamage,
                Point = spot.transform.position,
                Cause = "drag"
            });
            _a.Say("dragged one out");
            return true;
        }

        bool TrySplitFake(RoundDirector dir, RoundRules rules, float reach)
        {
            Vector3 me = transform.position;
            Vector3 f = YardMath.Forward(transform);
            LootCrate best = null;
            float bestD = reach + 0.6f;
            var loot = dir.Loot;
            for (int i = 0; i < loot.Count; i++)
            {
                var c = loot[i];
                if (c == null || !c.Fake)
                    continue;
                Vector3 d = c.transform.position - me;
                d.y = 0f;
                float dist = d.magnitude;
                if (dist > bestD)
                    continue;
                float dot = dist < 0.001f ? 1f : Vector3.Dot(d / dist, f);
                if (dot < 0.5f)
                    continue;
                bestD = dist;
                best = c;
            }
            if (best == null)
                return false;
            Vector3 pos = best.transform.position;
            Destroy(best.gameObject);
            dir.PlaySfx("unmorph", pos);
            _a.Say("a fake. it shrieks and splits");
            return true;
        }

        Actor PickTarget(RoundDirector dir, float range, float cone)
        {
            Vector3 me = transform.position;
            Vector3 f = YardMath.Forward(transform);
            Actor best = null;
            float bestD = range;
            var list = Enemies(dir);
            for (int i = 0; i < list.Count; i++)
            {
                var t = list[i];
                if (t == null)
                    continue;
                float dy = Mathf.Abs(t.transform.position.y - me.y);
                if (dy > 2f)
                    continue;
                float d = YardMath.Flat(me, t.transform.position);
                if (d > bestD)
                    continue;
                if (d >= 1.7f)
                {
                    Vector3 to = t.transform.position - me;
                    to.y = 0f;
                    float ang = Mathf.Acos(Mathf.Clamp(Vector3.Dot(to.normalized, f), -1f, 1f)) * Mathf.Rad2Deg;
                    if (ang > cone * 0.5f)
                        continue;
                }
                best = t;
                bestD = d;
            }
            return best;
        }

        List<Actor> Enemies(RoundDirector dir)
        {
            var list = new List<Actor>();
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var p = actors[i];
                if (p == null || p == _a || p.Dead)
                    continue;
                if (_a.Role == RoleKind.Mimic && p.Role == RoleKind.Hider)
                {
                    if (p.IsNpc && YardMath.Flat(transform.position, p.transform.position) > 30f)
                        continue;
                    list.Add(p);
                }
                else if (_a.Role == RoleKind.Hider && (p.Role == RoleKind.Mimic || p.Role == RoleKind.Hider))
                {
                    if ((p.IsNpc || p.IsBot) && YardMath.Flat(transform.position, p.transform.position) > 30f)
                        continue;
                    list.Add(p);
                }
            }
            return list;
        }

        void Witness(RoundDirector dir, Actor victim, float hpLeft)
        {
            var rules = dir.Rules;
            float range = dir.Dark ? rules.revealDark : rules.revealWitness;
            Actor who = hpLeft > 0f ? victim : null;
            if (who == null)
            {
                var actors = dir.Actors;
                for (int i = 0; i < actors.Count; i++)
                {
                    var p = actors[i];
                    if (p == null || p == _a || p == victim || p.Role != RoleKind.Hider || p.HiddenIn != null)
                        continue;
                    if (YardMath.Flat(p.transform.position, transform.position) > range)
                        continue;
                    if (LineOfSight.Clear(p.transform.position, transform.position, 1.6f, 1.2f))
                    {
                        who = p;
                        break;
                    }
                }
            }
            if (who == null)
            {
                _a.Say("nobody saw. stay one of them");
                return;
            }
            _a.Revealed = true;
            dir.PostFeed(who.DisplayName + " saw it. " + _a.DisplayName + " IS THE MIMIC");
            dir.PlaySfx("unmorph", transform.position);
            dir.RaiseRevealed(_a);
            _a.NotifyVisuals();
            _a.Say(who.DisplayName + " saw you. the mask is off");
        }

        bool TryNearest(RoundDirector dir, out string kind, out Component row)
        {
            kind = null;
            row = null;
            Vector3 me = transform.position;
            float best = 2.6f;
            var loot = dir.Loot;
            for (int i = 0; i < loot.Count; i++)
            {
                var c = loot[i];
                if (c == null)
                    continue;
                float d = YardMath.Flat(c.transform.position, me);
                if (d < best)
                {
                    best = d;
                    kind = c.Fake ? "fake" : "loot";
                    row = c;
                }
            }
            var clues = dir.CluesList;
            for (int i = 0; i < clues.Count; i++)
            {
                var c = clues[i];
                if (c == null || c.Taken)
                    continue;
                float raw = YardMath.Flat(c.transform.position, me);
                if (raw > 2.4f)
                    continue;
                float d = raw - 0.6f;
                if (d < best)
                {
                    best = d;
                    kind = "clue";
                    row = c;
                }
            }
            float reach = dir.Dream != null ? dir.Dream.reach : 2.6f;
            var dreamers = dir.Dreamers;
            for (int i = 0; i < dreamers.Count; i++)
            {
                var n = dreamers[i];
                if (n == null || n.Awake || n.Talker != null)
                    continue;
                float raw = YardMath.Flat(n.transform.position, me);
                if (raw > reach)
                    continue;
                float d = raw - 0.6f;
                if (d < best)
                {
                    best = d;
                    kind = "dreamer";
                    row = n;
                }
            }
            var spots = dir.Spots;
            for (int i = 0; i < spots.Count; i++)
            {
                var s = spots[i];
                if (s == null || s.Occupant != null)
                    continue;
                float raw = YardMath.Flat(s.transform.position, me);
                if (raw > 2.8f)
                    continue;
                float d = raw - 0.4f;
                if (d < best)
                {
                    best = d;
                    kind = "hide";
                    row = s;
                }
            }
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var p = actors[i];
                if (p == null || p == _a || p.Dead || p.Role != RoleKind.Mimic || !YardMath.IsBiter(p.Disguise))
                    continue;
                float d = YardMath.Flat(p.transform.position, me);
                if (d < 2.6f && d < best)
                {
                    best = d;
                    kind = "mimic";
                    row = p;
                }
            }
            var door = DoorAhead(dir, dir.Rules.doorReach, false);
            if (door != null)
            {
                float d = YardMath.Flat(door.LeafCenter(), me) + 0.4f;
                if (d < best)
                {
                    kind = "door";
                    row = door;
                }
            }
            return row != null;
        }

        YardDoor DoorAhead(RoundDirector dir, float reach, bool shutOnly)
        {
            Vector3 me = transform.position;
            YardDoor best = null;
            float bestD = reach;
            var doors = dir.Doors;
            for (int i = 0; i < doors.Count; i++)
            {
                var d = doors[i];
                if (d == null)
                    continue;
                if (shutOnly && (d.Open || d.Broken))
                    continue;
                if (Mathf.Abs(d.transform.position.y - me.y) > 2.2f)
                    continue;
                float dist = YardMath.Flat(d.LeafCenter(), me);
                if (dist < bestD)
                {
                    bestD = dist;
                    best = d;
                }
            }
            return best;
        }

        FishPile FindFood(RoundDirector dir, bool includeRigged)
        {
            float reach = dir.Rules.hungerReach + 0.5f;
            FishPile best = null;
            float bestD = reach;
            var food = dir.Food;
            for (int i = 0; i < food.Count; i++)
            {
                var f = food[i];
                if (f == null)
                    continue;
                if (f.Rigged && !includeRigged)
                    continue;
                float d = YardMath.Flat(transform.position, f.transform.position);
                if (d < bestD)
                {
                    bestD = d;
                    best = f;
                }
            }
            return best;
        }

        void DetonateFlash(RoundDirector dir, RoundRules rules, Vector3 me, Vector3 f, float now)
        {
            dir.PlaySfx("flash", me + f * 2f + Vector3.up * 1.2f);
            var foes = Enemies(dir);
            for (int i = 0; i < foes.Count; i++)
            {
                var t = foes[i];
                float d = YardMath.Flat(t.transform.position, me);
                if (d > rules.flashRange)
                    continue;
                float ang = 0f;
                if (d >= 1f)
                {
                    Vector3 to = t.transform.position - me;
                    to.y = 0f;
                    ang = Mathf.Acos(Mathf.Clamp(Vector3.Dot(to.normalized, f), -1f, 1f)) * Mathf.Rad2Deg;
                }
                // player.js compares against flash.cone itself, not cone/2.
                if (ang > rules.flashCone)
                    continue;
                t.StunUntil = now + rules.flashStun;
                if (t.Disguise != DisguiseForm.None)
                    t.ChangeDisguise(DisguiseForm.None);
            }
        }

        void SpawnHazard(RoundDirector dir, string name, Vector3 at, PropKind kind, float armAt, float fireAt)
        {
            PrimitiveType prim = kind == PropKind.Lure ? PrimitiveType.Cylinder : PrimitiveType.Cylinder;
            float scale = kind == PropKind.Lure ? 0.2f : 0.45f;
            var go = dir.SpawnMarker(name, at, prim, scale);
            var h = go.AddComponent<PlacedHazard>();
            h.Kind = kind;
            h.OwnerId = _a.ActorId;
            h.ArmAt = armAt;
            h.FireAt = fireAt;
            // bearTrap is a torus in the template. Unity has no torus; the bake uses two cylinders.
            YardForms.Dress(go, kind == PropKind.Lure ? "lure" : "trap");
        }

        void CrumbleOldestFake(RoundDirector dir, int max)
        {
            var mine = new List<LootCrate>();
            var loot = dir.Loot;
            for (int i = 0; i < loot.Count; i++)
                if (loot[i] != null && loot[i].Fake && loot[i].OwnerId == _a.ActorId)
                    mine.Add(loot[i]);
            if (mine.Count < max)
                return;
            mine.Sort((a, b) => a.SpawnedAt.CompareTo(b.SpawnedAt));
            Destroy(mine[0].gameObject);
        }

        void CrumbleOldestFalse(RoundDirector dir, int max)
        {
            var mine = new List<ClueShard>();
            var clues = dir.CluesList;
            for (int i = 0; i < clues.Count; i++)
            {
                var c = clues[i];
                if (c != null && c.False && c.OwnerId == _a.ActorId && !c.Taken)
                    mine.Add(c);
            }
            if (mine.Count < max)
                return;
            mine.Sort((a, b) => a.SpawnedAt.CompareTo(b.SpawnedAt));
            Destroy(mine[0].gameObject);
        }

        static string PowerUnlockedAt(int power, RoundRules rules)
        {
            if (power == rules.scentAt) return "scent";
            if (power == rules.lungeAt) return "lunge";
            if (power == rules.wailAt) return "wail";
            if (power == rules.fadeAt) return "fade";
            if (power == rules.frenzyAt) return "frenzy";
            return null;
        }

        static string CostLabel(int scrap, int wire, int powder)
        {
            var bits = new List<string>();
            if (scrap > 0) bits.Add(scrap + " scrap");
            if (wire > 0) bits.Add(wire + " wire");
            if (powder > 0) bits.Add(powder + " powder");
            return string.Join(" + ", bits);
        }

        static string VerbFor(string kind, Component row)
        {
            if (kind == "hide") return "Hide";
            if (kind == "clue") return "Take";
            if (kind == "dreamer" && row is DreamerNpc n) return "Wake " + n.DisplayName;
            if (kind == "mimic" && row is Actor a)
            {
                if (a.Disguise == DisguiseForm.Fisherman)
                    return "Wake " + (string.IsNullOrEmpty(a.BorrowedName) ? "them" : a.BorrowedName);
                if (a.Disguise == DisguiseForm.Locker || a.Disguise == DisguiseForm.Tarp
                    || a.Disguise == DisguiseForm.Dinghy || a.Disguise == DisguiseForm.Dumpster)
                    return "Hide";
                return "Search";
            }
            if (kind == "door" && row is YardDoor d)
            {
                if (d.Broken) return "Smashed";
                if (d.Open) return "Shut";
                return "Open";
            }
            return "Search";
        }

        RoundDirector Dir()
        {
            return _a.Director != null ? _a.Director : RoundDirector.Instance;
        }
    }

    public static class LineOfSight
    {
        // player.js sightOf / bot sees: a static hit closer than len-0.6 blocks.
        // Actor stand-ins have no colliders, so only level geometry and marker primitives count.
        public static bool Clear(Vector3 fromFeet, Vector3 toFeet, float eye, float chest)
        {
            Vector3 o = fromFeet + Vector3.up * eye;
            Vector3 t = toFeet + Vector3.up * chest;
            Vector3 d = t - o;
            float len = d.magnitude;
            if (len < 0.001f)
                return true;
            if (Physics.Raycast(o, d / len, out RaycastHit hit, len, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore))
                return hit.distance > len - 0.6f;
            return true;
        }
    }
}
