// Transcribed from Assets/SpawnSource/scripts/lib/data/dream.yml and templates/dream.js FAKE_NAMES.
// Picture paths are CDN ids. Nothing in this project downloads them.

using System;
using UnityEngine;

namespace HideAndSeek
{
    [Serializable]
    public class DreamerDef
    {
        public string id;
        public string displayName;
        public Vector2 home;
        public string[] says;
    }

    [Serializable]
    public class ClueDef
    {
        public string id;
        public string picture;
        public Vector2 at;
        public string text;
    }

    [CreateAssetMenu(fileName = "DreamCatalog", menuName = "HideAndSeek/Dream Catalog", order = 1)]
    public class DreamCatalog : ScriptableObject
    {
        [Header("Convince — dream.yml convince (period is milliseconds)")]
        public int hits = 3;
        public int misses = 2;
        public float periodMs = 1300f;
        public float periodPerClueMs = 70f;
        public float zone = 0.13f;
        public float zonePerClue = 0.04f;
        public float zoneMax = 0.5f;
        public float cooldown = 12f;
        public float reach = 2.6f;

        public DreamerDef[] dreamers = DefaultDreamers();
        public ClueDef[] clues = DefaultClues();

        public string[] fakeNames =
        {
            "Old Wenna", "Dace Morrow", "Cobb the netter", "Little Fen", "Skipper Hobb", "Ada Lusk"
        };

        public int ClueCount => clues != null ? clues.Length : 0;
        public int DreamerCount => dreamers != null ? dreamers.Length : 0;

        public float PeriodSeconds(int clueCount)
        {
            return (periodMs + clueCount * periodPerClueMs) / 1000f;
        }

        public float ZoneWidth(int clueCount)
        {
            return Mathf.Min(zoneMax, zone + clueCount * zonePerClue);
        }

        public string RandomFakeName()
        {
            if (fakeNames == null || fakeNames.Length == 0)
                return "a sleeper";
            return fakeNames[UnityEngine.Random.Range(0, fakeNames.Length)];
        }

        public ClueDef RandomClue()
        {
            if (clues == null || clues.Length == 0)
                return null;
            return clues[UnityEngine.Random.Range(0, clues.Length)];
        }

        public static DreamCatalog CreateRuntimeDefaults()
        {
            var d = CreateInstance<DreamCatalog>();
            d.name = "DreamCatalog (runtime defaults from dream.yml)";
            d.hideFlags = HideFlags.HideAndDontSave;
            d.dreamers = DefaultDreamers();
            d.clues = DefaultClues();
            return d;
        }

        static DreamerDef[] DefaultDreamers()
        {
            return new[]
            {
                D("dreamer-1", "Old Haddie", -5f, -20f,
                    "the nets... the nets are full of teeth",
                    "it's tuesday. it's always tuesday",
                    "my wife is waiting at the gate"),
                D("dreamer-2", "Pell the gutter", 68f, 30f,
                    "count the crates. count them again",
                    "the boss said no one leaves till dawn",
                    "dawn doesn't come here, does it"),
                D("dreamer-3", "Mags Dorran", -27f, 7f,
                    "the boat's got no bottom, love",
                    "i hear the bell but i can't find it",
                    "who's that standing behind you"),
                D("dreamer-4", "Young Tam", 5f, -33f,
                    "the water's warm. it shouldn't be warm",
                    "mam says don't go near the cage",
                    "i can't feel my hands"),
                D("dreamer-5", "Foreman Grice", -10f, 80f,
                    "shift's not over. shift is never over",
                    "sign the sheet. sign it",
                    "the lamps buzz my name"),
            };
        }

        static ClueDef[] DefaultClues()
        {
            return new[]
            {
                C("clue-1", "/cdn/value.743666cbf35667e607e34751b18725fcb3ee607f5a36e46a432ad40d3af202d5.png", 10f, -25f, "a clock with no hands. time isn't moving here."),
                C("clue-2", "/cdn/value.11ad39e660df3fc1c6f5b88bc4a66e4512ad95fd407d993b3ce614f016308933.png", -15f, -27f, "a photo of you, asleep. taken from the ceiling."),
                C("clue-3", "/cdn/value.efcc4381623e5939f5860998ed2fc2e9017b1071b64f98689e67d4313e40665d.png", 72f, -6f, "a fish, swimming through the air. this isn't real."),
                C("clue-4", "/cdn/value.df5aa9442a4fde538948213430630daa7a329a417d8a3f70d42d48ccc0368a81.png", -30f, 10f, "WAKE UP, in your own handwriting."),
                C("clue-5", "/cdn/value.a2802c94fecac4756ccbd41378c44443e8f4f03ad6473432b0eedf0f4708af90.png", -26f, 64f, "stairs that climb into the sky and stop."),
                C("clue-6", "/cdn/value.e4091737a5519461360172e5267fe1039c7dd9e64a84ee685214abe8620a61a4.png", 84f, 60f, "a mirror with no one in it. not even you."),
                C("clue-7", "/cdn/value.f1decbbdfbd649f3bfb8b550b0eef6ee1dc702df63903cf750d152bcab2f45ef.png", -2f, 92f, "a gull frozen mid-air. the wind isn't real either."),
                C("clue-8", "/cdn/value.7c79f7ee274da74de912f19ba542fd15207249b000603cea00e540f707a9d03b.png", 28f, 74f, "a door alone on the quay. daylight behind it."),
            };
        }

        static DreamerDef D(string id, string name, float x, float z, params string[] says)
        {
            return new DreamerDef { id = id, displayName = name, home = new Vector2(x, z), says = says };
        }

        static ClueDef C(string id, string picture, float x, float z, string text)
        {
            return new ClueDef { id = id, picture = picture, at = new Vector2(x, z), text = text };
        }
    }
}
