// Referee for Gullmouth, from places/main/sim.js, plus the phase timer this scene already had.
// Human rounds skip Hide and lock claws for reveal.startLock. Solo bot rounds still use the cage.
// simulateMatch is set by LocalRoundDriver. With it off, only the timer runs (no roles, no damage).

using System;
using System.Collections.Generic;
using UnityEngine;

namespace HideAndSeek
{
    public enum RoundPhase
    {
        Lobby,
        Hide,
        Hunt,
        End
    }

    public class RoundDirector : MonoBehaviour
    {
        public static RoundDirector Instance { get; private set; }

        [Tooltip("Leave empty to use RoundRules.CreateRuntimeDefaults() from rules.yml numbers.")]
        public RoundRules rules;

        public RoundRules Rules => rules;

        [Tooltip("Leave empty to use DreamCatalog.CreateRuntimeDefaults() from dream.yml.")]
        public DreamCatalog dream;

        [Tooltip("If true, run Hide (bot cage). Overwritten at round start when simulateMatch is on: fewer than 2 humans means a bot.")]
        public bool soloBotRound = true;

        [Tooltip("LocalRoundDriver turns this on. Lobby then waits for someone who left the menu, and hunt resolves wins.")]
        public bool simulateMatch;

        public MonoBehaviour visualHook;
        public MonoBehaviour lampHook;

        public RoundPhase Phase { get; private set; } = RoundPhase.Lobby;
        public float PhaseTimeRemaining { get; private set; }
        public float ClawLockRemaining { get; private set; }
        public bool ClawsLocked => ClawLockRemaining > 0f;

        public int RoundIndex { get; private set; }
        public RoundWinner Winner { get; private set; }
        public string Why { get; private set; }
        public string MimicName { get; private set; }
        public int Clues { get; private set; }
        public int ClueTotal { get; private set; }
        public int DreamersAwake { get; private set; }
        public int DreamerTotal { get; private set; }
        public bool Dark { get; private set; }
        public Actor LocalActor { get; set; }
        public Transform PersistentRoot { get; set; }
        public Transform RoundRoot { get; set; }
        public CageGate Cage { get; set; }

        public readonly List<Actor> Actors = new List<Actor>();
        public readonly List<LootCrate> Loot = new List<LootCrate>();
        public readonly List<HidingSpot> Spots = new List<HidingSpot>();
        public readonly List<FishPile> Food = new List<FishPile>();
        public readonly List<PlacedHazard> Hazards = new List<PlacedHazard>();
        public readonly List<KitPiece> Kit = new List<KitPiece>();
        public readonly List<YardDoor> Doors = new List<YardDoor>();
        public readonly List<ClueShard> CluesList = new List<ClueShard>();
        public readonly List<DreamerNpc> Dreamers = new List<DreamerNpc>();
        public readonly List<NoisePing> Pings = new List<NoisePing>();
        public readonly List<FeedLine> Feed = new List<FeedLine>();
        public readonly List<string> MimicIds = new List<string>();

        public DreamCatalog Dream => dream;

        public event Action<RoundPhase> PhaseChanged;
        public event Action<RoundWinner, string> RoundEnded;
        public event Action<string> FeedPosted;
        public event Action<Actor> Revealed;
        public event Action<HitInfo> HitLanded;
        public event Action<DreamerNpc> DreamerWoke;
        public event Action<bool> BlackoutChanged;
        public event Action<bool> CageMoved;
        public event Action<string, Vector3> SfxPlayed;
        public event Action<string> MusicCue;
        public event Action<Component, float, string> Highlighted;

        /// <summary>Salt-touched service. Null only before Awake. Solo and bot rounds mark nobody.</summary>
        public SaltTouchedRound Salt { get; private set; }

        readonly List<string> _lastMimicUsers = new List<string>();
        readonly List<float> _regrowAt = new List<float>();
        float _blackoutUntil;

        void Awake()
        {
            Instance = this;
            if (rules == null)
                rules = RoundRules.CreateRuntimeDefaults();
            if (dream == null)
                dream = DreamCatalog.CreateRuntimeDefaults();
            Salt = new SaltTouchedRound(this);
        }

        void OnDestroy()
        {
            if (Instance == this)
                Instance = null;
        }

        void Start()
        {
            EnterLobby();
        }

        void Update()
        {
            float dt = Time.deltaTime;
            Salt?.Tick();
            if (ClawLockRemaining > 0f)
                ClawLockRemaining = Mathf.Max(0f, ClawLockRemaining - dt);

            if (simulateMatch)
            {
                CatchUpLateJoiners();
                if (Phase == RoundPhase.Hide || Phase == RoundPhase.Hunt)
                    MaintainSmoke();
            }

            if (Phase == RoundPhase.Lobby && simulateMatch && EligibleHumans().Count == 0)
                return;

            if (Phase == RoundPhase.Lobby && simulateMatch
                && EligibleHumans().Count >= BodyTune.FastStartPlayers
                && PhaseTimeRemaining > BodyTune.FastStartSeconds)
                PhaseTimeRemaining = BodyTune.FastStartSeconds;

            if (PhaseTimeRemaining > 0f)
                PhaseTimeRemaining -= dt;

            if (Phase == RoundPhase.Hunt && simulateMatch)
            {
                TickHunt();
                return;
            }

            if (PhaseTimeRemaining <= 0f)
                AdvancePhase();
        }

        public void EnterLobby()
        {
            if (simulateMatch && RoundIndex > 0)
                ReturnEveryoneToLobby();
            Phase = RoundPhase.Lobby;
            PhaseTimeRemaining = rules.lobbySeconds;
            ClawLockRemaining = 0f;
            Salt?.ClearMarks();
            Winner = RoundWinner.None;
            Why = null;
            Debug.Log($"[RoundDirector] Lobby ({rules.lobbySeconds}s)");
            PhaseChanged?.Invoke(Phase);
            MusicCue?.Invoke("lobby");
        }

        void AdvancePhase()
        {
            switch (Phase)
            {
                case RoundPhase.Lobby:
                    if (simulateMatch)
                        StartRound(EligibleHumans().Count < 2);
                    else if (soloBotRound)
                        EnterHide();
                    else
                        EnterHunt(true);
                    break;
                case RoundPhase.Hide:
                    PostFeed(MimicIds.Contains("bot") ? "the cage is open" : "one of you is not what they seem");
                    PlaySfx("bell", Vector3.zero);
                    if (MimicIds.Contains("bot"))
                        PlaySfx("cage", rules.CagePosition());
                    EnterHunt(false);
                    break;
                case RoundPhase.Hunt:
                    EnterEnd();
                    break;
                case RoundPhase.End:
                    EnterLobby();
                    break;
            }
        }

        void EnterHide()
        {
            Phase = RoundPhase.Hide;
            PhaseTimeRemaining = rules.hideSeconds;
            ClawLockRemaining = 0f;
            Cage?.SetOpen(false);
            Debug.Log($"[RoundDirector] Hide / bot cage ({rules.hideSeconds}s)");
            PhaseChanged?.Invoke(Phase);
        }

        void EnterHunt(bool applyStartLock)
        {
            Phase = RoundPhase.Hunt;
            PhaseTimeRemaining = rules.huntSeconds;
            ClawLockRemaining = applyStartLock ? rules.startLockSeconds : 0f;
            if (!applyStartLock)
                Cage?.SetOpen(true);
            Debug.Log(applyStartLock
                ? $"[RoundDirector] Hunt ({rules.huntSeconds}s), claws locked {rules.startLockSeconds}s"
                : $"[RoundDirector] Hunt ({rules.huntSeconds}s)");
            PhaseChanged?.Invoke(Phase);
            MusicCue?.Invoke("hunt");
        }

        void EnterEnd()
        {
            Phase = RoundPhase.End;
            PhaseTimeRemaining = rules.endSeconds;
            ClawLockRemaining = 0f;
            Debug.Log($"[RoundDirector] End ({rules.endSeconds}s)");
            PhaseChanged?.Invoke(Phase);
        }

        public void BeginHumanRound()
        {
            soloBotRound = false;
            if (simulateMatch)
                StartRound(false);
            else
                EnterHunt(true);
        }

        public void BeginSoloBotRound()
        {
            soloBotRound = true;
            if (simulateMatch)
                StartRound(true);
            else
                EnterHide();
        }

        public void StartRound(bool botRound)
        {
            ClearRoundObjects();
            RoundIndex += 1;
            soloBotRound = botRound;
            var players = EligibleHumans();
            int want = botRound ? 0 : Mathf.Max(1, Mathf.FloorToInt(players.Count / (float)rules.playersPerSeeker));
            var pool = new List<Actor>();
            for (int i = 0; i < players.Count; i++)
                if (!_lastMimicUsers.Contains(players[i].UserId))
                    pool.Add(players[i]);
            if (pool.Count < want + 1)
            {
                pool.Clear();
                pool.AddRange(players);
            }
            var seekers = new List<Actor>();
            while (seekers.Count < want && pool.Count > 0)
            {
                int idx = UnityEngine.Random.Range(0, pool.Count);
                seekers.Add(pool[idx]);
                pool.RemoveAt(idx);
            }
            _lastMimicUsers.Clear();
            for (int i = 0; i < seekers.Count; i++)
                _lastMimicUsers.Add(seekers[i].UserId);

            MimicIds.Clear();
            if (botRound)
                MimicIds.Add("bot");
            else
                for (int i = 0; i < seekers.Count; i++)
                    MimicIds.Add(seekers[i].ActorId);

            MimicName = botRound ? "the thing" : JoinNames(seekers);
            for (int i = players.Count - 1; i > 0; i--)
            {
                int j = UnityEngine.Random.Range(0, i + 1);
                var tmp = players[i];
                players[i] = players[j];
                players[j] = tmp;
            }
            for (int i = 0; i < players.Count; i++)
            {
                var p = players[i];
                bool seeker = seekers.Contains(p);
                ResetBody(p, seeker ? RoleKind.Mimic : RoleKind.Hider);
                p.transform.position = rules.SpawnAt(i, players.Count);
                p.GroundY = p.transform.position.y;
            }
            float now = Time.time;
            if (!botRound)
            {
                for (int i = 0; i < seekers.Count; i++)
                {
                    seekers[i].ClawReadyAt = now + rules.startLockSeconds;
                    seekers[i].AmbushReadyAt = seekers[i].ClawReadyAt;
                }
            }

            if (botRound)
                SpawnBot();

            int npcs = Mathf.Max(0, rules.seats - players.Count - (botRound ? 1 : 0));
            for (int i = 0; i < npcs; i++)
                SpawnNpc(i, npcs, players.Count);

            SpawnDreamersAndClues();
            for (int i = 0; i < rules.hungerPiles; i++)
                SpawnFood();
            ClueTotal = dream != null ? dream.ClueCount : 0;
            DreamerTotal = dream != null ? dream.DreamerCount : 0;
            Clues = 0;
            DreamersAwake = 0;
            Winner = RoundWinner.None;
            Why = null;
            Feed.Clear();
            _regrowAt.Clear();
            _blackoutUntil = 0f;
            Dark = false;

            // Hunt start for a human round (the next call). A bot round has saltTouched.seats.below = 0.
            AssignSalt(botRound, players);

            if (botRound)
                EnterHide();
            else
            {
                PlaySfx("bell", Vector3.zero);
                PostFeed("one of you is not what they seem");
                EnterHunt(true);
            }
        }

        void TickHunt()
        {
            Prune();
            JudgeTraps();
            JudgeKit();
            JudgeDark();
            float now = Time.time;
            var snapshot = Actors.ToArray();
            for (int i = 0; i < snapshot.Length; i++)
            {
                var p = snapshot[i];
                if (p == null || p.IsNpc || p.IsBot)
                    continue;
                if (p.Role == RoleKind.Hider && p.Hp <= 0f)
                {
                    PlaySfx("death", p.transform.position);
                    // Clean: ordinary death. Committed: salt chime for the mimic, no name.
                    Salt?.NotifyDied(p);
                    ResetBody(p, RoleKind.Mimic);
                    p.Hp = rules.risenHp;
                    p.MaxHp = rules.risenHp;
                    p.Risen = true;
                    p.Revealed = true;
                    p.Team = TeamKind.Mimic;
                    p.NotifyVisuals();
                    PostFeed(p.DisplayName + " was taken. now they hunt");
                }
            }
            while (_regrowAt.Count > 0 && now >= _regrowAt[0])
            {
                _regrowAt.RemoveAt(0);
                SpawnFood();
            }
            int clues = 0;
            int awake = 0;
            for (int i = 0; i < CluesList.Count; i++)
            {
                var c = CluesList[i];
                if (c != null && c.Taken && string.IsNullOrEmpty(c.OwnerId))
                    clues++;
            }
            for (int i = 0; i < Dreamers.Count; i++)
                if (Dreamers[i] != null && Dreamers[i].Awake)
                    awake++;
            if (clues != Clues)
            {
                Clues = clues;
                PostFeed("a clue: " + clues + "/" + ClueTotal + ". they'll listen easier");
            }
            if (awake != DreamersAwake)
            {
                DreamersAwake = awake;
                PostFeed("a dreamer woke: " + awake + "/" + DreamerTotal);
            }
            if (DreamerTotal > 0 && awake >= DreamerTotal)
            {
                Finish(RoundWinner.Hiders, "everyone woke up. it was only a dream");
                return;
            }
            for (int i = 0; i < snapshot.Length; i++)
            {
                var n = snapshot[i];
                if (n == null || !n.IsNpc || n.Dead || n.Hp > 0f)
                    continue;
                n.Dead = true;
                if (n.HiddenIn != null && n.HiddenIn.Occupant == n)
                    n.HiddenIn.Occupant = null;
                PlaySfx("death", n.transform.position);
                PostFeed(n.DisplayName + " was taken");
                Destroy(n.gameObject);
            }
            for (int i = 0; i < snapshot.Length; i++)
            {
                var m = snapshot[i];
                if (m == null || m.Role != RoleKind.Mimic || m.Hp > 0f || m.Dead)
                    continue;
                if (m.IsBot)
                {
                    m.Dead = true;
                    continue;
                }
                bool risen = m.Risen;
                ResetBody(m, RoleKind.Ghost);
                m.Team = TeamKind.Mimic;
                m.NotifyVisuals();
                PostFeed(risen ? m.DisplayName + " is put to rest" : m.DisplayName + ", a true mimic, is dead");
            }
            if (TransferMasks())
                return;
            if (!TrueMimicAlive())
            {
                Finish(RoundWinner.Hiders, "the mimic is dead");
                return;
            }
            if (CountLivingHiders() == 0)
            {
                Finish(RoundWinner.Mimic, "nobody is left");
                return;
            }
            if (PhaseTimeRemaining <= 0f)
                Finish(RoundWinner.Hiders, "dawn came. they survived");
        }

        void Finish(RoundWinner winner, string why)
        {
            if (Phase == RoundPhase.End)
                return;
            string suffix = MimicIds.Contains("bot") ? "" : ". the mimic was " + MimicName;
            Winner = winner;
            Why = why + suffix;
            Phase = RoundPhase.End;
            PhaseTimeRemaining = rules.endSeconds;
            ClawLockRemaining = 0f;
            MusicCue?.Invoke("stop");
            PlaySfx(winner == RoundWinner.Hiders ? "bell" : "death", Vector3.zero);
            Debug.Log("[RoundDirector] End (" + rules.endSeconds + "s) " + Why);
            PhaseChanged?.Invoke(Phase);
            RoundEnded?.Invoke(winner, Why);
        }

        bool TransferMasks()
        {
            var ids = new List<string>(MimicIds);
            for (int i = 0; i < ids.Count; i++)
            {
                string id = ids[i];
                if (id == "bot" || FindActor(id) != null)
                    continue;
                var pool = new List<Actor>();
                for (int p = 0; p < Actors.Count; p++)
                {
                    var a = Actors[p];
                    if (a != null && !a.IsNpc && !a.IsBot && a.Role == RoleKind.Hider)
                        pool.Add(a);
                }
                if (pool.Count < 2)
                {
                    MimicIds.Remove(id);
                    if (MimicIds.Count == 0)
                    {
                        Finish(RoundWinner.Hiders, "the mimic fled the dream");
                        return true;
                    }
                    continue;
                }
                var heir = pool[UnityEngine.Random.Range(0, pool.Count)];
                float hp = heir.Hp;
                ResetBody(heir, RoleKind.Mimic);
                heir.Hp = Mathf.Max(hp, 100f);
                heir.MaxHp = rules.seekerHp;
                for (int m = 0; m < MimicIds.Count; m++)
                    if (MimicIds[m] == id)
                        MimicIds[m] = heir.ActorId;
                MimicName = heir.DisplayName;
                heir.Say("the mimic fled. its mask is yours now. nobody knows");
                PostFeed("the mimic fled the dream. someone else wears its face now");
            }
            return false;
        }

        bool TrueMimicAlive()
        {
            for (int i = 0; i < MimicIds.Count; i++)
            {
                string id = MimicIds[i];
                if (id == "bot")
                {
                    for (int a = 0; a < Actors.Count; a++)
                    {
                        var b = Actors[a];
                        if (b != null && b.IsBot && !b.Dead && b.Hp > 0f)
                            return true;
                    }
                }
                else
                {
                    var p = FindActor(id);
                    if (p != null && p.Role == RoleKind.Mimic && p.Hp > 0f)
                        return true;
                }
            }
            return false;
        }

        public int CountLivingHiders()
        {
            int n = 0;
            for (int i = 0; i < Actors.Count; i++)
            {
                var a = Actors[i];
                if (a != null && a.Role == RoleKind.Hider && !a.Dead && a.Hp > 0f)
                    n++;
            }
            return n;
        }

        void JudgeTraps()
        {
            float now = Time.time;
            var hazards = Hazards.ToArray();
            for (int i = 0; i < hazards.Length; i++)
            {
                var t = hazards[i];
                if (t == null)
                    continue;
                if (t.Kind == PropKind.Lure)
                {
                    if (!t.Fired && now >= t.FireAt)
                    {
                        t.Fired = true;
                        PlaySfx("rattle", t.transform.position);
                        // sim.js: playSound maxDistance is lure.radius (30). The ear ping is noise.lure (40).
                        // place.state.noise is also written there; nothing in the bot reads it.
                        MakeNoise(t.transform.position, rules.noiseLure, "loot");
                    }
                    if (t.Fired && now - t.FireAt > BodyTune.LureLinger)
                        Destroy(t.gameObject);
                    continue;
                }
                if (now < t.ArmAt)
                    continue;
                float radius = t.Kind == PropKind.Bait ? rules.baitRadius : rules.trapRadius;
                Actor victim = null;
                for (int m = 0; m < Actors.Count; m++)
                {
                    var a = Actors[m];
                    if (a == null || a.Role != RoleKind.Mimic || a.Dead)
                        continue;
                    if (YardMath.Flat(a.transform.position, t.transform.position) < radius
                        && Mathf.Abs(a.transform.position.y - t.transform.position.y) < 1.5f)
                    {
                        victim = a;
                        break;
                    }
                }
                if (victim == null)
                    continue;
                if (t.Kind == PropKind.Trap)
                {
                    victim.Hp -= rules.trapDamage;
                    victim.RootUntil = now + rules.trapRoot;
                    PlaySfx("snap", t.transform.position);
                    RaiseHit(new HitInfo { Source = null, Target = victim, Amount = rules.trapDamage, Point = t.transform.position, Cause = "trap" });
                    PostFeed("a bear trap bit the mimic");
                }
                else
                {
                    victim.Hp -= rules.baitDamage;
                    victim.StunUntil = now + rules.baitStun;
                    PlaySfx("bait", t.transform.position);
                    RaiseHit(new HitInfo { Source = null, Target = victim, Amount = rules.baitDamage, Point = t.transform.position, Cause = "bait" });
                    PostFeed("it bit into rigged fish. BOOM");
                    if (victim.Power > 0)
                        victim.Power -= 1;
                }
                victim.HurtAt = now;
                if (!victim.Revealed)
                {
                    victim.Revealed = true;
                    PostFeed(string.IsNullOrEmpty(victim.DisplayName)
                        ? "the trap caught it"
                        : "the trap caught " + victim.DisplayName + ". THEY ARE THE MIMIC");
                    PlaySfx("unmorph", victim.transform.position);
                    RaiseRevealed(victim);
                    victim.NotifyVisuals();
                }
                if (victim.Disguise != DisguiseForm.None)
                    victim.ChangeDisguise(DisguiseForm.None);
                PlaySfx("mimicHurt", victim.transform.position);
                Destroy(t.gameObject);
            }
        }

        void JudgeKit()
        {
            float now = Time.time;
            var pieces = Kit.ToArray();
            for (int i = 0; i < pieces.Length; i++)
            {
                var wire = pieces[i];
                if (wire == null || wire.Kind != KitKind.Tripwire || now < wire.ArmAt)
                    continue;
                Actor victim = null;
                Vector3 origin = wire.transform.position;
                Vector3 axis = wire.transform.right;
                Vector3 side = wire.transform.forward;
                float half = rules.tripwireLength * 0.5f + 0.2f;
                for (int m = 0; m < Actors.Count; m++)
                {
                    var a = Actors[m];
                    if (a == null || a.Role != RoleKind.Mimic || a.Dead)
                        continue;
                    Vector3 d = a.transform.position - origin;
                    float along = d.x * axis.x + d.z * axis.z;
                    float lateral = d.x * side.x + d.z * side.z;
                    if (Mathf.Abs(along) <= half
                        && Mathf.Abs(lateral) < rules.tripwireReach
                        && Mathf.Abs(d.y) < 1.2f)
                    {
                        victim = a;
                        break;
                    }
                }
                if (victim == null)
                    continue;
                Vector3 at = wire.transform.position;
                Destroy(wire.gameObject);
                PlaySfx("wire", at);
                PlaySfx("bell", at);
                victim.RootUntil = now + rules.tripwireRoot;
                victim.MarkedUntil = now + rules.tripwireMark;
                if (victim.Disguise != DisguiseForm.None)
                    victim.ChangeDisguise(DisguiseForm.None);
                if (!victim.Revealed)
                {
                    victim.Revealed = true;
                    PostFeed(string.IsNullOrEmpty(victim.DisplayName)
                        ? "the tripwire rang. it's there, see it through the walls"
                        : "the tripwire rang on " + victim.DisplayName + ". THE MIMIC");
                    RaiseRevealed(victim);
                    victim.NotifyVisuals();
                }
                else
                    PostFeed("a tripwire rang. it's there, see it through the walls");
            }

            pieces = Kit.ToArray();
            for (int i = 0; i < pieces.Length; i++)
            {
                var snare = pieces[i];
                if (snare == null || snare.Kind != KitKind.Snare || now < snare.ArmAt)
                    continue;
                Actor prey = null;
                for (int p = 0; p < Actors.Count; p++)
                {
                    var a = Actors[p];
                    if (a == null || a.Dead || a.Role != RoleKind.Hider || a.HiddenIn != null)
                        continue;
                    if (YardMath.Flat(a.transform.position, snare.transform.position) < rules.snareReach
                        && Mathf.Abs(a.transform.position.y - snare.transform.position.y) < 1.2f)
                    {
                        prey = a;
                        break;
                    }
                }
                if (prey == null)
                    continue;
                Vector3 at = snare.transform.position;
                Destroy(snare.gameObject);
                prey.Hp -= rules.snareDamage;
                prey.HurtAt = now;
                prey.RootUntil = now + rules.snareRoot;
                PlaySfx("snare", at);
                RaiseHit(new HitInfo { Source = null, Target = prey, Amount = rules.snareDamage, Point = at, Cause = "snare" });
                MakeNoise(at, rules.snareRing, "snare");
            }
        }

        void MaintainSmoke()
        {
            float now = Time.time;
            for (int i = 0; i < Actors.Count; i++)
            {
                var a = Actors[i];
                if (a == null || now < a.SmokeCheckAt)
                    continue;
                a.SmokeCheckAt = now + BodyTune.SmokeSampleSeconds;
                bool inside = false;
                if (a.Role == RoleKind.Hider)
                {
                    for (int s = 0; s < Kit.Count; s++)
                    {
                        var cloud = Kit[s];
                        if (cloud == null || cloud.Kind != KitKind.Smoke || now >= cloud.Until)
                            continue;
                        if (YardMath.Flat(a.transform.position, cloud.transform.position) < cloud.Radius)
                        {
                            inside = true;
                            break;
                        }
                    }
                }
                if (a.Smoked == inside)
                    continue;
                a.Smoked = inside;
                a.NotifyVisuals();
            }
        }

        void JudgeDark()
        {
            bool dark = Time.time < _blackoutUntil;
            if (dark == Dark)
                return;
            Dark = dark;
            if (lampHook is IYardLamps lamps)
                lamps.SetLit(!dark);
            if (dark)
            {
                PostFeed("the lamps die. it's here somewhere");
                PlaySfx("wrong", Vector3.zero);
            }
            BlackoutChanged?.Invoke(dark);
        }

        void CatchUpLateJoiners()
        {
            if (Phase == RoundPhase.Lobby)
            {
                for (int i = 0; i < Actors.Count; i++)
                {
                    var p = Actors[i];
                    if (p == null || p.IsBot || p.IsNpc || p.InMenu)
                        continue;
                    if (p.Role != RoleKind.Lobby)
                        ResetBody(p, RoleKind.Lobby);
                }
                return;
            }
            if (Phase != RoundPhase.Hide && Phase != RoundPhase.Hunt)
                return;
            var humans = Actors.ToArray();
            for (int i = 0; i < humans.Length; i++)
            {
                var p = humans[i];
                if (p == null || p.IsBot || p.IsNpc || p.InMenu)
                    continue;
                if (p.RoundJoined == RoundIndex)
                    continue;
                if (TakeOverNpc(p))
                    continue;
                if (Phase == RoundPhase.Hide)
                {
                    ResetBody(p, RoleKind.Hider);
                    p.transform.position = rules.SpawnAt(0, 1);
                    p.GroundY = p.transform.position.y;
                }
                else
                    ResetBody(p, RoleKind.Ghost);
            }
        }

        bool TakeOverNpc(Actor p)
        {
            Actor npc = null;
            for (int i = 0; i < Actors.Count; i++)
            {
                var n = Actors[i];
                if (n == null || !n.IsNpc || n.Dead)
                    continue;
                if (n.HiddenIn == null)
                {
                    npc = n;
                    break;
                }
                if (npc == null)
                    npc = n;
            }
            if (npc == null)
                return false;
            if (npc.HiddenIn != null && npc.HiddenIn.Occupant == npc)
                npc.HiddenIn.Occupant = null;
            ResetBody(p, RoleKind.Hider);
            p.Hp = Mathf.Max(1f, npc.Hp);
            p.transform.position = npc.transform.position + Vector3.up * 0.3f;
            p.GroundY = npc.GroundY;
            p.Say("you woke up as " + npc.DisplayName + ". hide.");
            PostFeed(p.DisplayName + " took " + npc.DisplayName + "'s place");
            Destroy(npc.gameObject);
            return true;
        }

        public void ResetBody(Actor p, RoleKind role)
        {
            if (p.HiddenIn != null)
            {
                if (p.HiddenIn.Occupant == p)
                    p.HiddenIn.Occupant = null;
                p.HiddenIn = null;
            }
            if (p.Talk != null && p.Talk.Npc != null && p.Talk.Npc.Talker == p)
                p.Talk.Npc.Talker = null;
            p.Talk = null;
            p.Role = role;
            p.Risen = false;
            p.Revealed = false;
            p.Dead = false;
            p.AmbushReadyAt = 0f;
            p.ClawReadyAt = 0f;
            p.Power = 0;
            p.ScentReadyAt = p.LungeReadyAt = p.WailReadyAt = p.FadeReadyAt = 0f;
            p.EchoReadyAt = p.SnareReadyAt = p.StealReadyAt = 0f;
            p.FaceOf = null;
            p.FaceName = null;
            p.Smoked = false;
            p.MarkedUntil = 0f;
            p.FadeUntil = 0f;
            p.LungeUntil = 0f;
            p.Disguise = DisguiseForm.None;
            p.StunUntil = 0f;
            p.RootUntil = 0f;
            p.RoundJoined = RoundIndex;
            p.LastMessage = null;
            p.PromptVerb = null;
            p.PromptTarget = null;
            p.Dread = 0;
            p.Scrap = p.Wire = p.Powder = 0;
            p.DesiredVelocity = Vector3.zero;
            if (role == RoleKind.Mimic)
            {
                p.Team = TeamKind.Mimic;
                p.Hp = rules.seekerHp;
                p.MaxHp = rules.seekerHp;
            }
            else if (role == RoleKind.Hider)
            {
                p.Team = TeamKind.Hiders;
                p.Hp = rules.hiderHp;
                p.MaxHp = rules.hiderHp;
            }
            else if (role == RoleKind.Lobby)
            {
                p.Team = TeamKind.None;
                p.Hp = rules.hiderHp;
                p.MaxHp = rules.hiderHp;
            }
            else
            {
                p.Hp = 0f;
            }
            p.NotifyVisuals();
        }

        void ReturnEveryoneToLobby()
        {
            ClearRoundObjects();
            Cage?.SetOpen(false);
            var humans = new List<Actor>();
            for (int i = 0; i < Actors.Count; i++)
            {
                var p = Actors[i];
                if (p != null && !p.IsBot && !p.IsNpc)
                    humans.Add(p);
            }
            for (int i = 0; i < humans.Count; i++)
            {
                ResetBody(humans[i], RoleKind.Lobby);
                humans[i].transform.position = rules.SpawnAt(i, humans.Count);
                humans[i].GroundY = humans[i].transform.position.y;
            }
        }

        public void ClearRoundObjects()
        {
            if (RoundRoot == null)
                return;
            for (int i = RoundRoot.childCount - 1; i >= 0; i--)
                Destroy(RoundRoot.GetChild(i).gameObject);
            for (int i = 0; i < Loot.Count; i++)
                if (Loot[i] != null)
                    Loot[i].EmptyUntil = 0f;
            for (int i = 0; i < Spots.Count; i++)
                if (Spots[i] != null)
                    Spots[i].Occupant = null;
            Pings.Clear();
        }

        void SpawnBot()
        {
            var go = SpawnMarker("mimic-bot", rules.CagePosition(), PrimitiveType.Capsule, 0.9f, true);
            StripCollider(go);
            var a = go.AddComponent<Actor>();
            a.ActorId = "bot";
            a.UserId = "bot";
            a.DisplayName = "the thing";
            a.IsBot = true;
            a.Role = RoleKind.Mimic;
            a.Team = TeamKind.Mimic;
            a.Hp = rules.botHp;
            a.MaxHp = rules.botHp;
            a.RoundJoined = RoundIndex;
            a.GroundY = go.transform.position.y;
            a.Bind(this);
            go.AddComponent<BotMimic>();
            Tint(go, new Color(0.55f, 0.12f, 0.1f));
            go.AddComponent<ActorVisualStandIn>();
        }

        void SpawnNpc(int index, int count, int playerCount)
        {
            Vector3 at = rules.SpawnAt(playerCount + index, playerCount + count);
            at += new Vector3(1.5f, 0f, 1.5f);
            string name = YardLayout.NpcNames[UnityEngine.Random.Range(0, YardLayout.NpcNames.Length)];
            string look = YardLayout.NpcLooks[index % YardLayout.NpcLooks.Length];
            var go = SpawnMarker("npc-" + name, at, PrimitiveType.Capsule, 0.9f, true);
            StripCollider(go);
            var a = go.AddComponent<Actor>();
            a.DisplayName = name;
            a.IsNpc = true;
            a.CharacterId = look;
            a.Role = RoleKind.Hider;
            a.Team = TeamKind.Hiders;
            a.Hp = rules.hiderHp;
            a.MaxHp = rules.hiderHp;
            a.RoundJoined = RoundIndex;
            a.GroundY = at.y;
            a.Bind(this);
            go.AddComponent<BotHider>();
            Tint(go, new Color(0.35f, 0.45f, 0.32f));
            go.AddComponent<ActorVisualStandIn>();
        }

        void SpawnDreamersAndClues()
        {
            if (dream == null)
                return;
            if (dream.dreamers != null)
            {
                for (int i = 0; i < dream.dreamers.Length; i++)
                {
                    var d = dream.dreamers[i];
                    var pos = new Vector3(d.home.x, 0.3f, d.home.y);
                    var go = SpawnMarker(d.id, pos, PrimitiveType.Capsule, 0.85f, true);
                    StripCollider(go);
                    var npc = go.AddComponent<DreamerNpc>();
                    npc.DreamerId = d.id;
                    npc.DisplayName = d.displayName;
                    npc.Says = d.says;
                    npc.Home = pos;
                    Tint(go, new Color(0.75f, 0.62f, 0.28f));
                }
            }
            if (dream.clues != null)
            {
                for (int i = 0; i < dream.clues.Length; i++)
                {
                    var c = dream.clues[i];
                    SpawnClue(c, new Vector3(c.at.x, 1.1f, c.at.y), false, null);
                }
            }
        }

        public ClueShard SpawnClue(ClueDef def, Vector3 pos, bool falseClue, string ownerId)
        {
            if (def == null)
                return null;
            var go = SpawnMarker(falseClue ? "false-" + def.id : def.id, pos, PrimitiveType.Cube, 0.35f, true);
            StripCollider(go);
            var clue = go.AddComponent<ClueShard>();
            clue.ClueId = def.id;
            clue.Text = def.text;
            clue.Picture = def.picture;
            clue.False = falseClue;
            clue.OwnerId = ownerId;
            clue.SpawnedAt = Time.time;
            Tint(go, falseClue ? new Color(0.45f, 0.2f, 0.55f) : new Color(0.55f, 0.7f, 0.9f));
            return clue;
        }

        public void SpawnFood()
        {
            var spots = rules.foodSpots;
            if (spots == null || spots.Length == 0)
                return;
            var free = new List<Vector2>();
            for (int i = 0; i < spots.Length; i++)
            {
                bool taken = false;
                for (int f = 0; f < Food.Count; f++)
                {
                    if (Food[f] == null)
                        continue;
                    var p = Food[f].transform.position;
                    if (Vector2.Distance(new Vector2(p.x, p.z), spots[i]) < 3f)
                    {
                        taken = true;
                        break;
                    }
                }
                if (!taken)
                    free.Add(spots[i]);
            }
            if (free.Count == 0)
                return;
            var spot = free[UnityEngine.Random.Range(0, free.Count)];
            // sim.js: feetPosition y is { terrain: 0 }, the ground under the spot, not world y 0.
            float y = YardMotion.SurfaceY(spot.x, spot.y, 0f);
            var go = SpawnMarker("fish", new Vector3(spot.x, y, spot.y), PrimitiveType.Sphere, 0.35f, true);
            go.AddComponent<FishPile>();
            Tint(go, new Color(0.75f, 0.45f, 0.25f));
            YardForms.Dress(go, "fish");
        }

        public void NoteEaten(Vector3 pos)
        {
            PostFeed("something is eating the catch");
            _regrowAt.Add(Time.time + rules.hungerRegrow);
        }

        public void SetBlackout(float until)
        {
            _blackoutUntil = until;
        }

        public NoisePing MakeNoise(Vector3 pos, float radius, string kind)
        {
            var go = SpawnMarker("ping-" + kind, pos + Vector3.up, PrimitiveType.Sphere, 0.15f, true);
            StripCollider(go);
            var ping = go.AddComponent<NoisePing>();
            ping.Init(radius, kind, rules.noiseLife);
            Pings.Add(ping);
            var rend = go.GetComponent<Renderer>();
            if (rend != null)
                rend.enabled = false;
            return ping;
        }

        public GameObject SpawnMarker(string name, Vector3 pos, PrimitiveType type, float scale)
        {
            return SpawnMarker(name, pos, type, scale, true);
        }

        public GameObject SpawnMarker(string name, Vector3 pos, PrimitiveType type, float scale, bool roundScoped)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.position = pos;
            go.transform.localScale = Vector3.one * scale;
            Transform parent = roundScoped ? RoundRoot : PersistentRoot;
            if (parent != null)
                go.transform.SetParent(parent, true);
            return go;
        }

        public void Register(Actor a)
        {
            if (a != null && !Actors.Contains(a))
            {
                Actors.Add(a);
                a.Bind(this);
            }
        }

        public void Unregister(Actor a) { Actors.Remove(a); }
        public void RegisterLoot(LootCrate c) { Add(Loot, c); }
        public void UnregisterLoot(LootCrate c) { Loot.Remove(c); }
        public void RegisterSpot(HidingSpot s) { Add(Spots, s); }
        public void UnregisterSpot(HidingSpot s) { Spots.Remove(s); }
        public void RegisterFood(FishPile f) { Add(Food, f); }
        public void UnregisterFood(FishPile f) { Food.Remove(f); }
        public void RegisterHazard(PlacedHazard h) { Add(Hazards, h); }
        public void UnregisterHazard(PlacedHazard h) { Hazards.Remove(h); }
        public void RegisterKit(KitPiece k) { Add(Kit, k); }
        public void UnregisterKit(KitPiece k) { Kit.Remove(k); }

        public void DropOldestKit(KitKind kind, string owner, int max)
        {
            int count = 0;
            KitPiece oldest = null;
            for (int i = 0; i < Kit.Count; i++)
            {
                var k = Kit[i];
                if (k == null || k.Kind != kind || k.OwnerId != owner)
                    continue;
                count++;
                if (oldest == null || k.SpawnedAt < oldest.SpawnedAt)
                    oldest = k;
            }
            if (count >= max && oldest != null)
                Destroy(oldest.gameObject);
        }

        public GameObject SpawnKitRoot(string name, Vector3 pos, float yaw)
        {
            var go = new GameObject(name);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            Transform parent = RoundRoot != null ? RoundRoot : transform;
            go.transform.SetParent(parent, true);
            return go;
        }
        public void RegisterDoor(YardDoor d) { Add(Doors, d); }
        public void UnregisterDoor(YardDoor d) { Doors.Remove(d); }
        public void RegisterClue(ClueShard c) { Add(CluesList, c); }
        public void UnregisterClue(ClueShard c) { CluesList.Remove(c); }
        public void RegisterDreamer(DreamerNpc d) { Add(Dreamers, d); }
        public void UnregisterDreamer(DreamerNpc d) { Dreamers.Remove(d); }

        static void Add<T>(List<T> list, T item) where T : UnityEngine.Object
        {
            if (item != null && !list.Contains(item))
                list.Add(item);
        }

        public void PostFeed(string text)
        {
            if (Feed.Count >= 4)
                Feed.RemoveAt(0);
            Feed.Add(new FeedLine { Text = text, At = Time.time });
            FeedPosted?.Invoke(text);
            Debug.Log("[Round] " + text);
        }

        public void PlaySfx(string id, Vector3 pos) { SfxPlayed?.Invoke(id, pos); }
        public void RaiseHit(HitInfo hit) { HitLanded?.Invoke(hit); }
        public void RaiseRevealed(Actor a) { Revealed?.Invoke(a); }
        public void RaiseDreamerAwake(DreamerNpc n) { DreamerWoke?.Invoke(n); }
        public void RaiseHighlight(Component target, float seconds, string reason) { Highlighted?.Invoke(target, seconds, reason); }
        public void RaiseCage(bool open) { CageMoved?.Invoke(open); }

        public void ApplyVisuals(Actor a)
        {
            if (visualHook is IActorVisuals visuals)
                visuals.Apply(a);
        }

        public List<Actor> EligibleHumans()
        {
            var list = new List<Actor>();
            for (int i = 0; i < Actors.Count; i++)
            {
                var a = Actors[i];
                if (a != null && !a.IsBot && !a.IsNpc && !a.InMenu)
                    list.Add(a);
            }
            return list;
        }

        public Actor FindActor(string id)
        {
            for (int i = 0; i < Actors.Count; i++)
                if (Actors[i] != null && Actors[i].ActorId == id)
                    return Actors[i];
            return null;
        }

        public bool LocalWon()
        {
            var me = LocalActor;
            if (me == null || Winner == RoundWinner.None)
                return false;
            // saltTouched.win. Personal result. A risen salt-touched body does not use the mimic-team check.
            if (Salt != null && Salt.TryPersonalWin(me, Winner, out bool saltWon))
                return saltWon;
            if (Winner == RoundWinner.Mimic)
                return me.Role == RoleKind.Mimic || me.Team == TeamKind.Mimic;
            return me.Role == RoleKind.Hider || (me.Role == RoleKind.Ghost && me.Team != TeamKind.Mimic);
        }

        void AssignSalt(bool botRound, List<Actor> players)
        {
            if (Salt == null)
                return;
            // Tutorial page and the solo demo take seats.below (0), same as a bot round and a 1v1.
            bool tutorialOrSolo = botRound;
            var hiders = new List<Actor>();
            for (int i = 0; i < players.Count; i++)
            {
                var p = players[i];
                if (p == null)
                    continue;
                if (p.ShowTutorial)
                    tutorialOrSolo = true;
                if (p.Role == RoleKind.Hider)
                    hiders.Add(p);
            }
            Salt.AssignAtHuntStart(hiders, players.Count, botRound, tutorialOrSolo);
        }

        void Prune()
        {
            Actors.RemoveAll(a => a == null);
            Loot.RemoveAll(a => a == null);
            Food.RemoveAll(a => a == null);
            Hazards.RemoveAll(a => a == null);
            CluesList.RemoveAll(a => a == null);
            Dreamers.RemoveAll(a => a == null);
            Pings.RemoveAll(a => a == null);
        }

        static void StripCollider(GameObject go)
        {
            var c = go.GetComponent<Collider>();
            if (c != null)
                Destroy(c);
        }

        static void Tint(GameObject go, Color color)
        {
            var r = go.GetComponent<Renderer>();
            if (r == null)
                return;
            Shader shader = Shader.Find("Sprites/Default");
            if (shader == null)
                shader = Shader.Find("Unlit/Color");
            if (shader == null)
                return;
            var mat = new Material(shader);
            mat.color = color;
            r.sharedMaterial = mat;
        }

        static string JoinNames(List<Actor> seekers)
        {
            if (seekers.Count == 0)
                return "the thing";
            if (seekers.Count == 1)
                return seekers[0].DisplayName;
            var parts = new string[seekers.Count];
            for (int i = 0; i < seekers.Count; i++)
                parts[i] = seekers[i].DisplayName;
            return string.Join(" & ", parts);
        }
    }
}
