// Multiplayer, models, and the cannery yard are NOT ported yet.
// Numbers transcribed from Assets/SpawnSource/scripts/lib/data/rules.yml (and design.md).
// Do not invent stats — keep this file in sync with rules.yml when the Spawn world changes.

using UnityEngine;

namespace HideAndSeek
{
    /// <summary>
    /// Round timing, HP, speeds, and combat values from the live Spawn Gullmouth rules.
    /// Create via Assets → Create → HideAndSeek → Round Rules, or use RoundRules.Default.
    /// </summary>
    [CreateAssetMenu(fileName = "RoundRules", menuName = "HideAndSeek/Round Rules", order = 0)]
    public class RoundRules : ScriptableObject
    {
        [Header("Round timing (seconds) — rules.yml")]
        public float lobbySeconds = 15f;
        public float hideSeconds = 30f;   // solo bot cage only; human rounds skip Hide
        public float huntSeconds = 420f;
        public float endSeconds = 8f;

        [Header("Reveal / start lock — rules.yml reveal")]
        public float startLockSeconds = 30f; // claws locked from hunt start (human rounds)

        [Header("Player counts — rules.yml")]
        public int seats = 5;                 // round fills to this many with npc hiders
        public int playersPerSeeker = 5;      // 1 seeker per 5 players at the draw

        [Header("HP — rules.yml")]
        public float hiderHp = 100f;
        public float seekerHp = 200f;
        public float risenHp = 90f;           // hider who died and rose as a mimic

        [Header("Speeds (m/s) — rules.yml")]
        public float hiderSpeed = 5.5f;
        public float seekerSpeed = 6.4f;
        public float disguisedSpeed = 1.2f;
        public float ghostSpeed = 7f;
        public float fishermanSpeed = 2.8f;   // mimic dressed as sleepwalking fisherman

        [Header("Claw (mimic) — rules.yml claw")]
        public float clawDamage = 34f;
        public float clawReach = 2.4f;
        public float clawCooldown = 0.9f;
        public float clawCone = 70f;

        [Header("Stab (hider) — rules.yml stab")]
        public float stabDamage = 8f;
        public float stabReach = 2.3f;
        public float stabCooldown = 1.1f;

        [Header("Mimic loot bite — rules.yml mimicLoot")]
        public float mimicLootDamage = 45f;
        public float mimicLootStun = 1.5f;

        [Header("Loot — rules.yml")]
        public float lootRefillSeconds = 45f;

        [Header("Trap / bait — rules.yml")]
        public float trapDamage = 35f;
        public float trapRoot = 2.5f;
        public float trapRadius = 1.1f;
        public float baitDamage = 45f;
        public float baitStun = 2f;
        public float baitRadius = 1.3f;

        [Header("Fake loot (mimic plants) — rules.yml fake")]
        public float fakeDamage = 35f;
        public float fakeStun = 1.6f;
        public int fakeMax = 3;
        public float fakeCooldown = 8f;

        [Header("Lure / flash — rules.yml")]
        public float lureDelay = 6f;
        public float lureRadius = 30f;
        public float flashRange = 7f;
        public float flashCone = 60f;
        public float flashStun = 2.5f;

        [Header("Bot mimic — rules.yml bot")]
        public float botWalk = 2.6f;
        public float botChase = 5.2f;
        public float botSight = 16f;
        public float botDamage = 25f;
        public float botReach = 1.9f;
        public float botCooldown = 1.2f;
        public float botHp = 200f;

        [Header("Hunger / fish piles — rules.yml hunger")]
        public int hungerPiles = 10;
        public float hungerRegrow = 40f;
        public int hungerMax = 5;
        public float hungerClawPer = 6f;
        public float hungerSpeedPer = 0.3f;
        public float hungerBotChasePer = 0.25f;
        public float hungerReach = 1.8f;

        [Header("Reveal — rules.yml reveal")]
        public float revealWitness = 18f;
        public float revealDark = 7f;
        public float ambushDamage = 100f;
        public float ambushCooldown = 30f;

        [Header("Dream master — rules.yml dreamMaster")]
        public float blackoutSeconds = 8f;
        public float blackoutCooldown = 35f;
        public float falseClueCooldown = 20f;
        public int falseClueMax = 2;
        public float falseClueDamage = 25f;
        public float falseClueStun = 1.5f;

        [Header("Fish powers — rules.yml powers (unlocked at that many fish)")]
        public int scentAt = 1;
        public float scentCooldown = 25f;
        public float scentRange = 32f;
        public float scentSeconds = 4f;
        public int lungeAt = 2;
        public float lungeCooldown = 9f;
        public float lungeSpeed = 22f;
        public float lungeSeconds = 0.35f;
        public int wailAt = 3;
        public float wailCooldown = 40f;
        public float wailRadius = 10f;
        public float wailStun = 1.6f;
        public int fadeAt = 4;
        public float fadeCooldown = 45f;
        public float fadeSeconds = 6f;
        public int frenzyAt = 5;
        public float frenzyHeal = 12f;

        [Header("Door — rules.yml door")]
        public float doorReach = 2.2f;
        public float doorBarSeconds = 30f;
        public float doorBarCooldown = 8f;
        public int doorHp = 3;
        // Present in rules.yml. door.js does not read it; kept so the number is not dropped.
        public float doorClawGap = 0.6f;

        [Header("Noise radii (m) and ping life (s) — rules.yml noise")]
        public float noiseLoot = 34f;
        public float noiseTalk = 28f;
        public float noiseDoor = 22f;
        public float noiseLure = 40f;
        public float noiseLife = 4f;

        [Header("Recipes — rules.yml recipes")]
        public int trapScrap = 2;
        public int baitScrap = 1;
        public int baitPowder = 1;
        public int lureWire = 1;
        public int lureScrap = 1;
        public int flashPowder = 1;
        public int flashWire = 1;

        [Header("Spawn / cage positions — rules.yml")]
        public Vector2 spawnXZ = new Vector2(-4f, 2f);
        public Vector2 cageXZ = new Vector2(24f, -31f);
        public float cageFloorY = 0.3f;

        [Header("Fish pile spots (x,z) — rules.yml food")]
        public Vector2[] foodSpots = FoodFromRules();

        [Header("Loot / ambush spots (x,z) — rules.yml loot")]
        public Vector2[] lootSpots = LootFromRules();

        public Vector3 SpawnAt(int index, int count)
        {
            float a = (index / Mathf.Max(1f, count)) * Mathf.PI * 2f;
            return new Vector3(spawnXZ.x + Mathf.Cos(a) * 2f, 0.5f, spawnXZ.y + Mathf.Sin(a) * 2f);
        }

        public Vector3 CagePosition()
        {
            return new Vector3(cageXZ.x, cageFloorY + 0.3f, cageXZ.y);
        }

        public bool TryCost(CraftKind kind, out int scrap, out int wire, out int powder)
        {
            scrap = wire = powder = 0;
            switch (kind)
            {
                case CraftKind.Trap: scrap = trapScrap; return true;
                case CraftKind.Bait: scrap = baitScrap; powder = baitPowder; return true;
                case CraftKind.Lure: wire = lureWire; scrap = lureScrap; return true;
                case CraftKind.Flash: powder = flashPowder; wire = flashWire; return true;
                default: return false;
            }
        }

        public int PowerAt(string key)
        {
            switch (key)
            {
                case "scent": return scentAt;
                case "lunge": return lungeAt;
                case "wail": return wailAt;
                case "fade": return fadeAt;
                case "frenzy": return frenzyAt;
                default: return 99;
            }
        }

        public float PowerCooldown(string key)
        {
            switch (key)
            {
                case "scent": return scentCooldown;
                case "lunge": return lungeCooldown;
                case "wail": return wailCooldown;
                case "fade": return fadeCooldown;
                default: return 0f;
            }
        }

        /// <summary>Runtime defaults matching rules.yml when no asset is assigned.</summary>
        public static RoundRules CreateRuntimeDefaults()
        {
            var r = CreateInstance<RoundRules>();
            r.name = "RoundRules (runtime defaults from rules.yml)";
            r.hideFlags = HideFlags.HideAndDontSave;
            r.foodSpots = FoodFromRules();
            r.lootSpots = LootFromRules();
            return r;
        }

        public static Vector2[] FoodFromRules()
        {
            return new[]
            {
                new Vector2(-6f, -16f), new Vector2(12f, -24f), new Vector2(24f, 0f), new Vector2(-28f, 2f),
                new Vector2(-6f, 18f), new Vector2(14f, 8f), new Vector2(-20f, -26f), new Vector2(30f, -18f),
                new Vector2(-20f, 72f), new Vector2(20f, 90f), new Vector2(4f, 48f), new Vector2(-36f, 44f),
                new Vector2(-2f, 96f), new Vector2(66f, -28f), new Vector2(88f, 40f), new Vector2(60f, 80f),
                new Vector2(80f, 70f),
            };
        }

        public static Vector2[] LootFromRules()
        {
            return new[]
            {
                new Vector2(-16f, -14f), new Vector2(15f, -30f), new Vector2(0f, -22f), new Vector2(-17f, -30f),
                new Vector2(19f, 2f), new Vector2(33f, 19f), new Vector2(28f, 6f), new Vector2(-32f, 12f),
                new Vector2(-24f, 0f), new Vector2(-14f, 19f), new Vector2(8f, -6f), new Vector2(-8f, -4f),
                new Vector2(-38f, 25f), new Vector2(38f, -30f), new Vector2(10f, 24f), new Vector2(-30f, -30f),
                new Vector2(-15f, -33f), new Vector2(4f, -34f), new Vector2(28f, 66f), new Vector2(-32f, 68f),
                new Vector2(-16f, 85f), new Vector2(40f, 44f), new Vector2(74f, -24f), new Vector2(86f, 22f),
                new Vector2(60f, 52f), new Vector2(78f, 92f),
            };
        }
    }
}
