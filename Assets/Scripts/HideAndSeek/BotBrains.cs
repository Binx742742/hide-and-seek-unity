// scripts/bot-mimic.js and scripts/bot-hider.js.
// Decisions run every 3th Update, matching updateSchedule.every = 3.
// Spawn pathfinding (builtin/nav findPath) is not available here: the goal is still a straight line.
// YardMotion.Slide only keeps that step out of walls. It does not pick a new goal.
// Gravity is the same yard value as the player, so a goal written at y 0 still lands on the floor.

using UnityEngine;

namespace HideAndSeek
{
    [RequireComponent(typeof(Actor))]
    public class BotMimic : MonoBehaviour
    {
        public BotMode Mode = BotMode.AmbushGo;
        public Vector3 Goal;
        public bool HasGoal;
        public float GoAt;
        public float Until;
        public float LastSeenAt;
        public Vector3 LastSeen;
        public float HeardAt;
        public float EarAt;
        public FishPile Food;
        public float NextThink;

        Actor _a;
        int _frame;
        Vector3 _vel;
        float _vertical;

        void Awake() { _a = GetComponent<Actor>(); }

        void Update()
        {
            var dir = RoundDirector.Instance;
            if (dir == null)
                return;
            if (++_frame % 3 == 0)
                Think(dir);
            if (_a.HiddenIn != null)
                return;
            Vector3 p = transform.position;
            if (_vel.sqrMagnitude > 0f && !_a.Dead)
            {
                Vector3 step = _vel * Time.deltaTime;
                if (HasGoal)
                {
                    Vector3 to = Goal - p;
                    to.y = 0f;
                    if (to.magnitude <= 0.8f)
                        _vel = Vector3.zero;
                    else if (step.magnitude > to.magnitude)
                        step = new Vector3(to.x, 0f, to.z);
                }
                p = YardMotion.Slide(p, step);
            }
            // bot-mimic.js moveTo keeps a downward velocity. Without it a goal at y 0
            // never reaches a floor that is above or below the spawn height.
            float dt = Time.deltaTime;
            _vertical += BodyTune.YardGravity * dt;
            p.y += _vertical * dt;
            bool grounded = false;
            YardMotion.Snap(ref p, ref _vertical, ref grounded, _a.GroundY);
            transform.position = p;
        }

        void Think(RoundDirector dir)
        {
            var rules = dir.Rules;
            var bot = rules;
            float now = Time.time;
            _vel = Vector3.zero;
            if (_a.Dead || dir.Phase != RoundPhase.Hunt)
                return;
            if (_a.IsStunned || now < _a.RootUntil)
            {
                if (_a.Disguise != DisguiseForm.None)
                    _a.ChangeDisguise(DisguiseForm.None);
                return;
            }

            Vector3 me = transform.position;
            Actor target = null;
            float td = 99f;
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var p = actors[i];
                if (p == null || p == _a || p.Dead || p.Role != RoleKind.Hider || p.HiddenIn != null)
                    continue;
                float d = YardMath.Flat(me, p.transform.position);
                bool visible = _a.Disguise == DisguiseForm.None ? Sees(p, bot.botSight) : d < 3.5f;
                if (d < td && visible)
                {
                    target = p;
                    td = d;
                }
            }

            if (target != null)
            {
                if (_a.Disguise != DisguiseForm.None)
                {
                    _a.ChangeDisguise(DisguiseForm.None);
                    dir.PlaySfx("unmorph", me);
                }
                if (Mode != BotMode.Hunt && now > _a.DarkReadyAt)
                {
                    _a.DarkReadyAt = now + bot.blackoutCooldown;
                    dir.SetBlackout(now + bot.blackoutSeconds);
                }
                Mode = BotMode.Hunt;
                LastSeen = target.transform.position;
                LastSeenAt = now;
                float dmg = bot.botDamage + _a.Power * bot.hungerClawPer;
                if (td < bot.botReach && now > _a.AtkReadyAt)
                {
                    _a.AtkReadyAt = now + bot.botCooldown;
                    target.Hp -= dmg;
                    target.HurtAt = now;
                    dir.RaiseHit(new HitInfo
                    {
                        Source = _a,
                        Target = target,
                        Amount = dmg,
                        Point = target.transform.position + Vector3.up * 1.1f,
                        Cause = "bot"
                    });
                    dir.PlaySfx("claw", target.transform.position);
                    return;
                }
                Seek(target.transform.position, bot.botChase + _a.Power * bot.hungerBotChasePer, 0.8f);
                return;
            }

            if (Mode != BotMode.Hunt && now > EarAt)
            {
                EarAt = now + 0.6f;
                NoisePing heard = null;
                var pings = dir.Pings;
                for (int i = 0; i < pings.Count; i++)
                {
                    var ping = pings[i];
                    if (ping == null || ping.At <= HeardAt)
                        continue;
                    if (YardMath.Flat(me, ping.transform.position) > ping.Radius)
                        continue;
                    if (heard == null || ping.At > heard.At)
                        heard = ping;
                }
                if (heard != null)
                {
                    Mode = BotMode.Investigate;
                    Goal = heard.transform.position;
                    HasGoal = true;
                    HeardAt = heard.At;
                    if (_a.Disguise != DisguiseForm.None)
                        _a.ChangeDisguise(DisguiseForm.None);
                }
            }

            if (Mode == BotMode.Hunt && now - LastSeenAt < 5f)
            {
                if (Seek(LastSeen, bot.botChase * 0.85f, 0.8f))
                {
                    Mode = BotMode.Search;
                    var spots = dir.Spots;
                    HidingSpot spot = null;
                    for (int i = 0; i < spots.Count; i++)
                    {
                        var s = spots[i];
                        if (s == null || s.Occupant == null)
                            continue;
                        if (YardMath.Flat(me, s.transform.position) <= 3.5f)
                        {
                            spot = s;
                            break;
                        }
                    }
                    if (spot != null && UnityEngine.Random.value < 0.6f)
                    {
                        Actor victim = spot.Occupant;
                        spot.Occupant = null;
                        if (victim != null)
                        {
                            victim.Hp -= bot.botDamage;
                            victim.HurtAt = now;
                            victim.StunUntil = now + BodyTune.DragStunSeconds;
                            dir.PlaySfx("claw", spot.transform.position);
                            dir.RaiseHit(new HitInfo
                            {
                                Source = _a,
                                Target = victim,
                                Amount = bot.botDamage,
                                Point = spot.transform.position,
                                Cause = "drag"
                            });
                        }
                    }
                }
                return;
            }

            if (Mode != BotMode.Feed && _a.Power < bot.hungerMax && Mode != BotMode.Ambush && UnityEngine.Random.value < 0.01f)
            {
                FishPile food = null;
                float best = 60f;
                var piles = dir.Food;
                for (int i = 0; i < piles.Count; i++)
                {
                    var f = piles[i];
                    if (f == null)
                        continue;
                    float d = YardMath.Flat(me, f.transform.position);
                    if (d < best)
                    {
                        best = d;
                        food = f;
                    }
                }
                if (food != null)
                {
                    Mode = BotMode.Feed;
                    Goal = food.transform.position;
                    HasGoal = true;
                    Food = food;
                    GoAt = now;
                }
            }

            if (Mode == BotMode.Feed)
            {
                var f = Food;
                if (f == null || now - GoAt > 25f)
                {
                    BeginAmbush(dir, now);
                    return;
                }
                if (Seek(Goal, bot.botWalk * 1.3f, 0.8f) || YardMath.Flat(me, f.transform.position) < bot.hungerReach)
                {
                    if (!f.Rigged)
                    {
                        Vector3 at = f.transform.position;
                        Destroy(f.gameObject);
                        _a.Power += 1;
                        dir.NoteEaten(at);
                        dir.PlaySfx("eat", me);
                    }
                    BeginAmbush(dir, now);
                }
                return;
            }

            if (Mode == BotMode.Investigate)
            {
                if (Seek(Goal, bot.botChase * 0.8f, 0.8f))
                    BeginAmbush(dir, now);
                return;
            }

            if ((Mode != BotMode.Ambush && Mode != BotMode.AmbushGo) || (Mode == BotMode.AmbushGo && !HasGoal))
            {
                Mode = BotMode.AmbushGo;
                Goal = PickAmbush(dir);
                HasGoal = true;
                GoAt = now;
            }
            if (Mode == BotMode.AmbushGo)
            {
                if (Seek(Goal, bot.botWalk, 0.8f) || now - GoAt > 30f)
                    SettleAmbush(dir, now);
                return;
            }

            _vel = Vector3.zero;
            if (now > Until)
            {
                _a.ChangeDisguise(DisguiseForm.None);
                BeginAmbush(dir, now);
            }
        }

        void BeginAmbush(RoundDirector dir, float now)
        {
            Mode = BotMode.AmbushGo;
            Goal = PickAmbush(dir);
            HasGoal = true;
            GoAt = now;
        }

        void SettleAmbush(RoundDirector dir, float now)
        {
            Mode = BotMode.Ambush;
            Until = now + 20f + UnityEngine.Random.value * 15f;
            _vel = Vector3.zero;
            var rules = dir.Rules;
            var mine = new System.Collections.Generic.List<LootCrate>();
            var loot = dir.Loot;
            for (int i = 0; i < loot.Count; i++)
                if (loot[i] != null && loot[i].Fake && loot[i].OwnerId == _a.ActorId)
                    mine.Add(loot[i]);
            if (mine.Count >= rules.fakeMax)
            {
                mine.Sort((a, b) => a.SpawnedAt.CompareTo(b.SpawnedAt));
                Destroy(mine[0].gameObject);
            }
            float ang = UnityEngine.Random.value * Mathf.PI * 2f;
            Vector3 me = transform.position;
            if (UnityEngine.Random.value < 0.35f && dir.Dream != null)
            {
                var real = dir.Dream.RandomClue();
                if (real != null)
                {
                    Vector3 at = me + new Vector3(Mathf.Cos(ang) * 3f, 1.1f, Mathf.Sin(ang) * 3f);
                    var clue = dir.SpawnClue(real, at, true, _a.ActorId);
                    if (clue != null)
                        clue.SpawnedAt = now;
                }
            }
            else
            {
                Vector3 at = me + new Vector3(Mathf.Cos(ang) * 2.2f, 0f, Mathf.Sin(ang) * 2.2f);
                var go = dir.SpawnMarker("fake-loot", at, PrimitiveType.Cube, 0.7f);
                var fake = go.AddComponent<LootCrate>();
                fake.Fake = true;
                fake.OwnerId = _a.ActorId;
                fake.SpawnedAt = now;
                YardForms.Dress(go, "loot");
            }
            var forms = YardLayout.BotForms;
            var form = forms[UnityEngine.Random.Range(0, forms.Length)];
            _a.ChangeDisguise(form);
            transform.rotation = Quaternion.Euler(0f, Mathf.Floor(UnityEngine.Random.value * 4f) * 90f, 0f);
            dir.PlaySfx("morph", me);
        }

        Vector3 PickAmbush(RoundDirector dir)
        {
            var spots = dir.Rules.lootSpots;
            if (spots == null || spots.Length == 0)
                return transform.position;
            var s = spots[UnityEngine.Random.Range(0, spots.Length)];
            float a = UnityEngine.Random.value * Mathf.PI * 2f;
            return new Vector3(s.x + Mathf.Cos(a) * 1.7f, 0f, s.y + Mathf.Sin(a) * 1.7f);
        }

        bool Seek(Vector3 goal, float speed, float arrive)
        {
            Goal = goal;
            HasGoal = true;
            Vector3 me = transform.position;
            Vector3 d = goal - me;
            d.y = 0f;
            float dist = d.magnitude;
            if (dist < arrive)
            {
                _vel = Vector3.zero;
                return true;
            }
            _vel = d / dist * speed;
            transform.rotation = Quaternion.LookRotation(d / dist, Vector3.up);
            return false;
        }

        bool Sees(Actor p, float sight)
        {
            float d = YardMath.Flat(transform.position, p.transform.position);
            if (d > sight)
                return false;
            if (d < 3f)
                return true;
            return LineOfSight.Clear(transform.position, p.transform.position, 1.5f, 1.2f);
        }
    }

    [RequireComponent(typeof(Actor))]
    public class BotHider : MonoBehaviour
    {
        public string Mode = "loot";
        public Vector3 Goal;
        public bool HasGoal;
        public HidingSpot Spot;
        public LootCrate Crate;
        public float Until;
        public float GoAt;
        public float StuckAt;
        public Vector3 LastPos;

        Actor _a;
        int _frame;
        Vector3 _vel;
        float _vertical;

        // Speeds and radii are literals in scripts/bot-hider.js, not rules.yml.
        const float Sight = 16f;
        const float HideRadius = 9f;
        const float FleeSpeed = 4.4f;
        const float FleeCarry = 4.2f;
        const float LootSpeed = 2.4f;
        const float SeekHideSpeed = 2.6f;

        void Awake() { _a = GetComponent<Actor>(); }

        void Update()
        {
            var dir = RoundDirector.Instance;
            if (dir == null || _a.Dead)
                return;
            if (++_frame % 3 == 0)
                Think(dir);
            if (_a.HiddenIn != null)
                return;
            Vector3 p = transform.position;
            if (_vel.sqrMagnitude > 0f)
                p = YardMotion.Slide(p, _vel * Time.deltaTime);
            float dt = Time.deltaTime;
            _vertical += BodyTune.YardGravity * dt;
            p.y += _vertical * dt;
            bool grounded = false;
            YardMotion.Snap(ref p, ref _vertical, ref grounded, _a.GroundY);
            transform.position = p;
        }

        void Think(RoundDirector dir)
        {
            float now = Time.time;
            _vel = Vector3.zero;
            if (_a.IsStunned || (dir.Phase != RoundPhase.Hunt && dir.Phase != RoundPhase.Hide))
                return;
            if (_a.HiddenIn != null)
            {
                var h = _a.HiddenIn;
                if (h == null || h.Occupant != _a)
                {
                    Unhide();
                    Mode = "flee";
                    Until = now + 4f;
                    return;
                }
                transform.position = h.InsidePoint;
                if (now > Until && Threat(dir) == null)
                    Unhide();
                return;
            }

            if (now > StuckAt)
            {
                if (LastPos != Vector3.zero && YardMath.Flat(transform.position, LastPos) < 0.4f)
                {
                    HasGoal = false;
                    Goal = Vector3.zero;
                }
                LastPos = transform.position;
                StuckAt = now + 2.5f;
            }

            Actor threat = Threat(dir);
            if (threat != null)
            {
                HidingSpot spot = null;
                float best = HideRadius;
                var spots = dir.Spots;
                for (int i = 0; i < spots.Count; i++)
                {
                    var s = spots[i];
                    if (s == null || s.Occupant != null)
                        continue;
                    float d = YardMath.Flat(transform.position, s.transform.position);
                    if (d < best)
                    {
                        best = d;
                        spot = s;
                    }
                }
                if (spot != null && YardMath.Flat(threat.transform.position, spot.transform.position) > 4f)
                {
                    if (Seek(spot.transform.position, FleeSpeed, 1.1f) || YardMath.Flat(transform.position, spot.transform.position) < 1.8f)
                        HideIn(dir, spot, now);
                    return;
                }
                Vector3 away = transform.position - threat.transform.position;
                away.y = 0f;
                if (away.sqrMagnitude < 0.01f)
                    away = Vector3.forward;
                away.Normalize();
                Mode = "flee";
                Until = now + 3f;
                Seek(transform.position + away * 12f, FleeSpeed, 1.1f);
                return;
            }

            if (Mode == "flee" && now < Until)
            {
                if (HasGoal)
                    Seek(Goal, FleeCarry, 1.1f);
                return;
            }

            if (Mode == "rummage")
            {
                if (now > Until)
                {
                    Mode = UnityEngine.Random.value < 0.2f ? "seek-hide" : "loot";
                    HasGoal = false;
                }
                return;
            }

            if (Mode == "seek-hide")
            {
                if (!HasGoal)
                {
                    var open = new System.Collections.Generic.List<HidingSpot>();
                    var spots = dir.Spots;
                    for (int i = 0; i < spots.Count; i++)
                    {
                        var s = spots[i];
                        if (s != null && s.Occupant == null && YardMath.Flat(transform.position, s.transform.position) <= 40f)
                            open.Add(s);
                    }
                    int idx = Mathf.FloorToInt(UnityEngine.Random.value * 3f);
                    if (idx >= open.Count)
                    {
                        Mode = "loot";
                        return;
                    }
                    Spot = open[idx];
                    Goal = Spot.transform.position;
                    HasGoal = true;
                }
                if (Seek(Goal, SeekHideSpeed, 1.1f))
                {
                    if (Spot == null || Spot.Occupant != null || !HideIn(dir, Spot, now))
                    {
                        Mode = "loot";
                        HasGoal = false;
                    }
                }
                return;
            }

            if (!HasGoal)
            {
                LootCrate pick = null;
                var loot = dir.Loot;
                var pool = new System.Collections.Generic.List<LootCrate>();
                for (int i = 0; i < loot.Count; i++)
                {
                    var c = loot[i];
                    if (c == null)
                        continue;
                    float d = YardMath.Flat(transform.position, c.transform.position);
                    if (d > 3f && d <= 45f)
                        pool.Add(c);
                }
                if (pool.Count > 0)
                    pick = pool[UnityEngine.Random.Range(0, pool.Count)];
                if (pick != null)
                {
                    Crate = pick;
                    Goal = pick.transform.position;
                }
                else
                {
                    Crate = null;
                    Goal = transform.position + new Vector3((UnityEngine.Random.value - 0.5f) * 20f, 0f, (UnityEngine.Random.value - 0.5f) * 20f);
                }
                HasGoal = true;
                GoAt = now;
            }

            if (Seek(Goal, LootSpeed, 1.1f) || now - GoAt > 25f)
            {
                var c = Crate;
                if (c != null && YardMath.Flat(transform.position, c.transform.position) < 2.5f)
                {
                    if (c.Fake)
                    {
                        _a.Hp -= dir.Rules.fakeDamage;
                        _a.StunUntil = now + dir.Rules.fakeStun;
                        dir.PlaySfx("bite", c.transform.position);
                        dir.RaiseHit(new HitInfo { Target = _a, Amount = dir.Rules.fakeDamage, Point = c.transform.position, Cause = "fake" });
                        Destroy(c.gameObject);
                    }
                    else
                    {
                        var actions = GetComponent<ActorActions>();
                        if (actions != null)
                            actions.Rummage(dir, c, false);
                        else
                        {
                            dir.MakeNoise(c.transform.position, dir.Rules.noiseLoot, "loot");
                            dir.PlaySfx("rummage", c.transform.position);
                        }
                    }
                }
                Mode = "rummage";
                Until = now + 2f + UnityEngine.Random.value * 2f;
                HasGoal = false;
                Crate = null;
            }
        }

        Actor Threat(RoundDirector dir)
        {
            Actor best = null;
            float bd = 99f;
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var p = actors[i];
                if (p == null || p == _a || p.Dead)
                    continue;
                bool monster = p.Role == RoleKind.Mimic && p.Revealed && !p.IsFaded;
                bool botOpen = p.IsBot && p.Disguise == DisguiseForm.None;
                if (!monster && !botOpen)
                    continue;
                float d = YardMath.Flat(transform.position, p.transform.position);
                if (d < bd && Sees(p))
                {
                    bd = d;
                    best = p;
                }
            }
            return best;
        }

        bool Sees(Actor p)
        {
            float d = YardMath.Flat(transform.position, p.transform.position);
            if (d > Sight)
                return false;
            if (d < 3f)
                return true;
            return LineOfSight.Clear(transform.position, p.transform.position, 1.5f, 1.2f);
        }

        bool HideIn(RoundDirector dir, HidingSpot spot, float now)
        {
            if (spot == null || spot.Occupant != null)
                return false;
            spot.Occupant = _a;
            _a.HiddenIn = spot;
            _a.HideFrom = transform.position;
            Mode = "hidden";
            Until = now + 15f + UnityEngine.Random.value * 20f;
            transform.position = spot.InsidePoint;
            var r = GetComponent<Renderer>();
            if (r != null)
                r.enabled = false;
            dir.PlaySfx("rummage", spot.transform.position);
            _a.HiddenChanged?.Invoke(true);
            return true;
        }

        void Unhide()
        {
            if (_a.HiddenIn != null && _a.HiddenIn.Occupant == _a)
                _a.HiddenIn.Occupant = null;
            _a.HiddenIn = null;
            Mode = "loot";
            HasGoal = false;
            var r = GetComponent<Renderer>();
            if (r != null)
                r.enabled = true;
            _a.HiddenChanged?.Invoke(false);
        }

        bool Seek(Vector3 goal, float speed, float arrive)
        {
            Goal = goal;
            HasGoal = true;
            Vector3 d = goal - transform.position;
            d.y = 0f;
            float dist = d.magnitude;
            if (dist < arrive)
            {
                _vel = Vector3.zero;
                return true;
            }
            _vel = (d / dist) * speed;
            transform.rotation = Quaternion.LookRotation(d / dist, Vector3.up);
            return false;
        }
    }
}
