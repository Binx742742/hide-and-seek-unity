// Salt-touched: one human hider, marked quietly at hunt start.
// Numbers are rules.yml saltTouched (seats, unbar, drain, ping, flicker, win, ownHud).
// They stay RoleKind.Hider for damage, hiding, and crafts.
// Solo, bot, tutorial, and 1v1 rounds take saltTouched.seats.below (0) and mark nobody.
// Sabotage verbs are callable. They are not bound to keys. No flood mesh, no CDN chime, no netcode.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace HideAndSeek
{
    /// <summary>
    /// Round service. RoundDirector owns one. Events are the sabotage and tell hooks.
    /// </summary>
    public interface ISaltTouched
    {
        event Action<Actor> Committed;
        event Action<Actor, YardDoor> DoorUnbarred;
        event Action<Actor, YardDoor> DrainBled;
        event Action<Actor, Vector3> SaltPingDropped;
        event Action<Actor> SaltChimed;
        event Action<Actor, KitPiece> PropFlickered;

        int SeatCount(int humanPlayers, bool botRound, bool tutorialOrSoloDemo);
        SaltTouched AssignAtHuntStart(IList<Actor> humanHiders, int humanPlayers, bool botRound, bool tutorialOrSoloDemo);
        void ClearMarks();
        bool TryUnbar(Actor who, YardDoor door);
        bool TryBleedDrain(Actor who, YardDoor hatch);
        bool TrySaltPing(Actor who, Vector3 tile);
        bool RollPropFlicker(Actor who, KitPiece piece);
        void NotifyDied(Actor who);
        bool TryPersonalWin(Actor who, RoundWinner roundWinner, out bool won);
        void Tick();
        bool MimicHearsPing();
    }

    /// <summary>
    /// The mark on the chosen hider. State only. Verbs go through <see cref="ISaltTouched"/>.
    /// </summary>
    [DisallowMultipleComponent]
    public class SaltTouched : MonoBehaviour
    {
        public SaltMark Mark = SaltMark.None;
        public int UnbarLeft;
        public int PingLeft;
        public bool HintSent;
        public bool OwnHud = true;

        public bool IsMarked => Mark == SaltMark.Clean || Mark == SaltMark.Committed;

        public void Arm(RoundRules rules)
        {
            Mark = SaltMark.Clean;
            UnbarLeft = rules != null ? rules.saltTouchedUnbarUses : 1;
            PingLeft = rules != null ? rules.saltTouchedPingUses : 1;
            OwnHud = rules == null || rules.saltTouchedOwnHud;
            HintSent = false;
        }

        public void Wipe()
        {
            Mark = SaltMark.None;
            UnbarLeft = 0;
            PingLeft = 0;
            HintSent = false;
        }
    }

    public sealed class SaltTouchedRound : ISaltTouched
    {
        readonly RoundDirector _dir;
        readonly List<YardDoor> _floods = new List<YardDoor>();

        public Vector3 PingTile { get; private set; }
        public float PingUntil { get; private set; }

        public event Action<Actor> Committed;
        public event Action<Actor, YardDoor> DoorUnbarred;
        public event Action<Actor, YardDoor> DrainBled;
        public event Action<Actor, Vector3> SaltPingDropped;
        public event Action<Actor> SaltChimed;
        public event Action<Actor, KitPiece> PropFlickered;

        public SaltTouchedRound(RoundDirector director)
        {
            _dir = director;
        }

        RoundRules Rules => _dir != null && _dir.Rules != null ? _dir.Rules : null;

        public int SeatCount(int humanPlayers, bool botRound, bool tutorialOrSoloDemo)
        {
            var rules = Rules;
            if (rules == null)
                return botRound || tutorialOrSoloDemo || humanPlayers < 4 ? 0 : 1;
            return rules.SaltTouchedSeatCount(humanPlayers, botRound, tutorialOrSoloDemo);
        }

        public SaltTouched AssignAtHuntStart(IList<Actor> humanHiders, int humanPlayers, bool botRound, bool tutorialOrSoloDemo)
        {
            ClearMarks();
            int seats = SeatCount(humanPlayers, botRound, tutorialOrSoloDemo);
            if (seats <= 0 || humanHiders == null || humanHiders.Count == 0)
                return null;

            var pool = new List<Actor>();
            for (int i = 0; i < humanHiders.Count; i++)
            {
                var a = humanHiders[i];
                if (a != null && a.Role == RoleKind.Hider && !a.IsBot && !a.IsNpc)
                    pool.Add(a);
            }
            if (pool.Count == 0)
                return null;

            // seats.count is 1, and design.md forbids a second mark even if the sheet is raised.
            var pick = pool[UnityEngine.Random.Range(0, pool.Count)];
            var mark = pick.GetComponent<SaltTouched>();
            if (mark == null)
                mark = pick.gameObject.AddComponent<SaltTouched>();
            mark.Arm(Rules);
            // Quiet. No feed line, no Say, no badge for anyone else.
            return mark;
        }

        public void ClearMarks()
        {
            ReleaseFloods();
            PingUntil = 0f;
            if (_dir == null)
                return;
            var actors = _dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var a = actors[i];
                if (a == null)
                    continue;
                // Immediate, so AssignAtHuntStart can add a fresh mark in the same call.
                var marks = a.GetComponents<SaltTouched>();
                for (int m = 0; m < marks.Length; m++)
                {
                    if (marks[m] != null)
                        UnityEngine.Object.DestroyImmediate(marks[m]);
                }
            }
        }

        void ReleaseFloods()
        {
            for (int i = 0; i < _floods.Count; i++)
            {
                var hatch = _floods[i];
                if (hatch == null)
                    continue;
                if (hatch.SaltForced)
                {
                    hatch.Open = false;
                    hatch.SaltForced = false;
                }
                hatch.SaltFloodUntil = 0f;
                hatch.SaltWet = false;
            }
            _floods.Clear();
        }

        public bool TryUnbar(Actor who, YardDoor door)
        {
            if (!CanSabotage(who, out var mark) || door == null || mark.UnbarLeft <= 0)
                return false;
            // A player bar is BarredUntil still in the future. A broken leaf has nothing to lift.
            if (door.Broken || Time.time >= door.BarredUntil)
                return false;
            mark.UnbarLeft -= 1;
            door.BarredUntil = 0f;
            // Silent to them: no Say on who. The creak is noise.door for everyone else.
            // TODO: play that creak in range and skip who. No proximity-voice stand-in, no CDN clip.
            BecomeCommitted(mark, who, "something salt-touched a barred door");
            DoorUnbarred?.Invoke(who, door);
            return true;
        }

        public bool TryBleedDrain(Actor who, YardDoor hatch)
        {
            if (!CanSabotage(who, out var mark) || hatch == null)
                return false;
            // The hatch is a Saltgate drain grate. Hold-interact is the caller's job. rules.yml has no hold length.
            if (hatch.Kind != DoorKind.Grate)
                return false;
            var rules = Rules;
            float seconds = rules != null ? rules.saltTouchedDrainSeconds : 45f;
            hatch.Open = true;
            hatch.SaltForced = true;
            hatch.SaltFloodUntil = Time.time + seconds;
            hatch.SaltWet = true;
            if (!_floods.Contains(hatch))
                _floods.Add(hatch);
            // TODO: flood mesh. SaltWet is the sheen tell for the mimic and careful eyes.
            BecomeCommitted(mark, who, "something salt-touched the west drain");
            DrainBled?.Invoke(who, hatch);
            return true;
        }

        public bool TrySaltPing(Actor who, Vector3 tile)
        {
            if (!CanSabotage(who, out var mark) || mark.PingLeft <= 0)
                return false;
            var rules = Rules;
            float seconds = rules != null ? rules.saltTouchedPingSeconds : 10f;
            mark.PingLeft -= 1;
            PingTile = tile;
            PingUntil = Time.time + seconds;
            // Not a RoundDirector ping. Those rings are shared, and noise.life is 4 s, not ping.seconds.
            // Hiders hear nothing. MimicHearsPing is the mimic ear hook.
            BecomeCommitted(mark, who, "something salt-touched a heartbeat");
            SaltPingDropped?.Invoke(who, tile);
            return true;
        }

        /// <summary>
        /// rules.yml saltTouched.flicker (0.15). Scarecrow or smoke only. Does not commit them.
        /// </summary>
        public bool RollPropFlicker(Actor who, KitPiece piece)
        {
            if (who == null || piece == null)
                return false;
            if (piece.Kind != KitKind.Smoke && piece.Kind != KitKind.Scarecrow)
                return false;
            var mark = who.GetComponent<SaltTouched>();
            if (mark == null || !mark.IsMarked)
                return false;
            var rules = Rules;
            float chance = rules != null ? rules.saltTouchedFlicker : 0.15f;
            if (UnityEngine.Random.value >= chance)
                return false;
            piece.SaltFlicker = true;
            PropFlickered?.Invoke(who, piece);
            // TODO: allies see the prop flicker wrong. Suspicion, not proof. No VFX in this stub.
            return true;
        }

        public void NotifyDied(Actor who)
        {
            if (who == null)
                return;
            var mark = who.GetComponent<SaltTouched>();
            if (mark == null || mark.Mark != SaltMark.Committed)
                return;
            // Clean death is the ordinary hider death. The caller already plays that.
            SaltChimed?.Invoke(who);
            WhisperMimics("a salt chime");
            // TODO: CDN salt-chime clip, mimic ears only. No name, no public feed.
        }

        public bool TryPersonalWin(Actor who, RoundWinner roundWinner, out bool won)
        {
            won = false;
            if (who == null || roundWinner == RoundWinner.None)
                return false;
            var mark = who.GetComponent<SaltTouched>();
            if (mark == null || !mark.IsMarked)
                return false;
            var rules = Rules;
            if (rules == null)
                return false;
            // Overrides the risen-mimic team check. The table is personal. The round winner does not change.
            won = rules.SaltTouchedWins(mark.Mark, roundWinner);
            return true;
        }

        public void Tick()
        {
            float now = Time.time;
            for (int i = _floods.Count - 1; i >= 0; i--)
            {
                var hatch = _floods[i];
                if (hatch == null)
                {
                    _floods.RemoveAt(i);
                    continue;
                }
                if (now < hatch.SaltFloodUntil)
                    continue;
                if (hatch.SaltForced)
                {
                    hatch.Open = false;
                    hatch.SaltForced = false;
                }
                // SaltWet stays. The sheen outlives the 45 s flood.
                _floods.RemoveAt(i);
            }
        }

        /// <summary>
        /// True while a false heartbeat is up (saltTouched.ping.seconds, 10).
        /// No radius is set on the sheet. Hider code must not call this.
        /// </summary>
        public bool MimicHearsPing()
        {
            return Time.time < PingUntil;
        }

        bool CanSabotage(Actor who, out SaltTouched mark)
        {
            mark = null;
            if (who == null || who.Role != RoleKind.Hider || who.Dead || who.Hp <= 0f)
                return false;
            if (_dir == null || _dir.Phase != RoundPhase.Hunt)
                return false;
            mark = who.GetComponent<SaltTouched>();
            return mark != null && mark.IsMarked;
        }

        void BecomeCommitted(SaltTouched mark, Actor who, string hint)
        {
            bool first = mark.Mark != SaltMark.Committed;
            mark.Mark = SaltMark.Committed;
            if (!first)
                return;
            Committed?.Invoke(who);
            if (mark.HintSent)
                return;
            mark.HintSent = true;
            // Private. Actor.Say shows on that body only. Not a round feed, and not a name.
            WhisperMimics(hint);
        }

        void WhisperMimics(string hint)
        {
            if (_dir == null || string.IsNullOrEmpty(hint))
                return;
            var actors = _dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var a = actors[i];
                if (a != null && a.Role == RoleKind.Mimic && !a.Dead)
                    a.Say(hint);
            }
        }
    }
}
