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

        [Header("Spawn / cage positions — rules.yml")]
        public Vector2 spawnXZ = new Vector2(-4f, 2f);
        public Vector2 cageXZ = new Vector2(24f, -31f);

        /// <summary>Runtime defaults matching rules.yml when no asset is assigned.</summary>
        public static RoundRules CreateRuntimeDefaults()
        {
            var r = CreateInstance<RoundRules>();
            r.name = "RoundRules (runtime defaults from rules.yml)";
            return r;
        }
    }
}
