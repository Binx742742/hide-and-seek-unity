// Shared enums and pure helpers transcribed from the Spawn scripts.
// Durations that are milliseconds in JS are seconds here (Unity time). Ratios are unchanged.

using System;
using UnityEngine;

namespace HideAndSeek
{
    public enum RoleKind
    {
        Lobby,
        Hider,
        Mimic,
        Ghost
    }

    public enum TeamKind
    {
        None,
        Hiders,
        Mimic
    }

    public enum RoundWinner
    {
        None,
        Hiders,
        Mimic
    }

    /// <summary>player.js DISGUISES. Hiding-spot kind "boat" maps to Dinghy.</summary>
    public enum DisguiseForm
    {
        None,
        Crate,
        Barrel,
        Loot,
        Fisherman,
        Locker,
        Tarp,
        Dinghy,
        Dumpster
    }

    public enum CraftKind
    {
        Trap,
        Bait,
        Lure,
        Flash
    }

    /// <summary>Scene state.kind on hidespot rows. Boat is an upturned dinghy.</summary>
    public enum HideKind
    {
        Locker,
        Tarp,
        Boat,
        Dumpster
    }

    public enum BotMode
    {
        AmbushGo,
        Ambush,
        Hunt,
        Search,
        Investigate,
        Feed
    }

    public enum PropKind
    {
        Loot,
        FakeLoot,
        Food,
        Bait,
        Trap,
        Lure,
        Clue,
        FalseClue
    }

    public enum DoorKind
    {
        Plank,
        Grate,
        Panel
    }

    /// <summary>
    /// player.yml locomotion plus the 0.75 jump scale in player.js.
    /// Yard gravity is places/main/config.yaml, not rules.yml.
    /// </summary>
    public static class BodyTune
    {
        public const float Acceleration = 80f;
        public const float Deceleration = 120f;
        public const float JumpSpeed = 10f;
        public const float JumpScale = 0.75f;
        public const float LobbyWalkSpeed = 6f;
        public const float YardGravity = -24f;

        // player.js pickTarget: a stab has no cone in rules.yml, so the fallback is 80 degrees.
        public const float StabConeFallback = 80f;

        // player.js drag-out stun is 800 ms, not a rules.yml field.
        public const float DragStunSeconds = 0.8f;

        // player.js judgeTalk ignores a second press inside 180 ms.
        public const float TalkDebounce = 0.18f;

        // player.js gold test expands the zone by 0.015 on each side.
        public const float GoldSlack = 0.015f;

        // player.js drops a conversation past 4 m. Starting one uses dream.yml reach (2.6).
        public const float TalkBreakDistance = 4f;

        // sim.js: a full room (routing.maxPlayers, now 10) pulls a long lobby down to 5 s.
        public const int FastStartPlayers = 10;
        public const float FastStartSeconds = 5f;

        // sim.js lure row is removed 4 s after it fires.
        public const float LureLinger = 4f;

        // dreamer.js: a real sleeper calls out a fisherman disguise inside 4 m, then waits 15 s.
        public const float FishermanSniffInterval = 0.8f;
        public const float FishermanCalloutRange = 4f;
        public const float FishermanCalloutCooldown = 15f;
        public const float FishermanHighlightSeconds = 3f;

        // dreamer.js wander.
        public const float DreamerShuffleSpeed = 0.7f;
        public const float DreamerWakeHideDelay = 2.6f;
    }

    public struct FeedLine
    {
        public string Text;
        public float At;
    }

    public struct HitInfo
    {
        public Actor Source;
        public Actor Target;
        public float Amount;
        public Vector3 Point;
        public string Cause;
        public bool Ambush;
    }

    public static class YardMath
    {
        public static float Flat(Vector3 a, Vector3 b)
        {
            float dx = a.x - b.x;
            float dz = a.z - b.z;
            return Mathf.Sqrt(dx * dx + dz * dz);
        }

        public static Vector3 Forward(Transform t)
        {
            Vector3 f = t.forward;
            f.y = 0f;
            return f.sqrMagnitude < 1e-6f ? Vector3.forward : f.normalized;
        }

        /// <summary>ui.js clock: ceil to whole seconds, m:ss.</summary>
        public static string Clock(float seconds)
        {
            int t = Mathf.Max(0, Mathf.CeilToInt(seconds));
            return t / 60 + ":" + (t % 60).ToString("00");
        }

        public static string DisguiseLabel(DisguiseForm form)
        {
            switch (form)
            {
                case DisguiseForm.Crate: return "a wooden crate";
                case DisguiseForm.Barrel: return "an oil drum";
                case DisguiseForm.Loot: return "a loot crate";
                case DisguiseForm.Fisherman: return "a sleepwalking fisherman";
                case DisguiseForm.Locker: return "a locker";
                case DisguiseForm.Tarp: return "a tarp";
                case DisguiseForm.Dinghy: return "a dinghy";
                case DisguiseForm.Dumpster: return "a dumpster";
                default: return "your own shape";
            }
        }

        public static bool IsBiter(DisguiseForm form)
        {
            return form == DisguiseForm.Loot
                || form == DisguiseForm.Fisherman
                || form == DisguiseForm.Locker
                || form == DisguiseForm.Tarp
                || form == DisguiseForm.Dinghy
                || form == DisguiseForm.Dumpster;
        }

        public static DisguiseForm SpotAsDisguise(HideKind kind)
        {
            switch (kind)
            {
                case HideKind.Locker: return DisguiseForm.Locker;
                case HideKind.Tarp: return DisguiseForm.Tarp;
                case HideKind.Boat: return DisguiseForm.Dinghy;
                case HideKind.Dumpster: return DisguiseForm.Dumpster;
                default: return DisguiseForm.None;
            }
        }

        public static string HideNoun(HideKind kind)
        {
            switch (kind)
            {
                case HideKind.Locker: return "a locker";
                case HideKind.Tarp: return "the tarp";
                case HideKind.Boat: return "the dinghy";
                case HideKind.Dumpster: return "the dumpster";
                default: return "it";
            }
        }
    }

    /// <summary>player.js needle: ping-pongs 0..1 across the period.</summary>
    public static class ConvinceMath
    {
        public static float Needle(float startedAt, float periodSeconds, float now)
        {
            if (periodSeconds <= 0.0001f)
                return 0f;
            float x = ((now - startedAt) / periodSeconds) % 2f;
            if (x < 0f)
                x += 2f;
            return x < 1f ? x : 2f - x;
        }

        public static void RollZone(float width, out float a, out float b)
        {
            a = 0.05f + UnityEngine.Random.value * (0.9f - width);
            b = a + width;
        }

        public static bool InGold(float needle, float zone0, float zone1)
        {
            return needle >= zone0 - BodyTune.GoldSlack && needle <= zone1 + BodyTune.GoldSlack;
        }
    }
}
