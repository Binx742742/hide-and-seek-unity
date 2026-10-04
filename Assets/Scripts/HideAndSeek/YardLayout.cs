// Hiding spots transcribed from places/main/cells (state.kind, feetPosition, rotation.yaw, state.inside).
// Markers only — not the cannery meshes. Loot and fish coordinates live on RoundRules (rules.yml).

using UnityEngine;

namespace HideAndSeek
{
    public struct HideSpotDef
    {
        public string Id;
        public HideKind Kind;
        public Vector3 Position;
        public float Yaw;
        public Vector3 Inside;

        public HideSpotDef(string id, HideKind kind, float x, float y, float z, float yaw, float insideY)
        {
            Id = id;
            Kind = kind;
            Position = new Vector3(x, y, z);
            Yaw = yaw;
            Inside = new Vector3(0f, insideY, 0f);
        }
    }

    public static class YardLayout
    {
        public static readonly HideSpotDef[] HideSpots =
        {
            new HideSpotDef("hide-locker-1", HideKind.Locker, -19.4f, 0f, -14f, -90f, 0.12f),
            new HideSpotDef("hide-locker-2", HideKind.Locker, -19.4f, 0f, -15f, -90f, 0.12f),
            new HideSpotDef("hide-locker-3", HideKind.Locker, 34.4f, 0f, 2f, 90f, 0.12f),
            new HideSpotDef("hide-locker-4", HideKind.Locker, -34.4f, 0f, 0f, -90f, 0.12f),
            new HideSpotDef("hide-locker-5", HideKind.Locker, 34.4f, 0f, 62f, 90f, 0.12f),
            new HideSpotDef("hide-locker-6", HideKind.Locker, -34.4f, 0f, 56f, -90f, 0.12f),
            new HideSpotDef("hide-locker-7", HideKind.Locker, 78.4f, 0f, -20f, 90f, 0.12f),
            new HideSpotDef("hide-locker-8", HideKind.Locker, 57.6f, 0f, 34f, -90f, 0.12f),
            new HideSpotDef("hide-locker-drain", HideKind.Locker, -90f, 0f, 27.45f, 180f, 0.12f),
            new HideSpotDef("hide-locker-town-1", HideKind.Locker, -68.3f, 4.05f, 37.7f, 270f, 0.12f),
            new HideSpotDef("hide-locker-town-2", HideKind.Locker, -88.6f, 4.05f, 55.7f, 0f, 0.12f),
            new HideSpotDef("hide-tarp-1", HideKind.Tarp, -24f, 0f, -8f, 20f, 0f),
            new HideSpotDef("hide-tarp-2", HideKind.Tarp, 16f, 0f, -2f, 140f, 0f),
            new HideSpotDef("hide-tarp-3", HideKind.Tarp, -10f, 0f, 50f, 35f, 0f),
            new HideSpotDef("hide-tarp-4", HideKind.Tarp, 32f, 0f, 92f, -15f, 0f),
            new HideSpotDef("hide-tarp-5", HideKind.Tarp, 88f, 0f, -28f, 20f, 0f),
            new HideSpotDef("hide-tarp-6", HideKind.Tarp, 62f, 0f, 72f, 140f, 0f),
            new HideSpotDef("hide-tarp-chapel", HideKind.Tarp, -88f, 4f, 84f, 35f, 0f),
            new HideSpotDef("hide-dinghy-1", HideKind.Boat, 8f, 0f, 14f, 70f, 0f),
            new HideSpotDef("hide-dinghy-2", HideKind.Boat, -34f, 0f, 21f, 10f, 0f),
            new HideSpotDef("hide-dinghy-3", HideKind.Boat, -36f, 0f, 94f, -20f, 0f),
            new HideSpotDef("hide-dinghy-4", HideKind.Boat, 92f, 0f, 96f, -20f, 0f),
            new HideSpotDef("yard-dumpster", HideKind.Dumpster, 12f, 0f, -8.6f, 4f, 0.15f),
            new HideSpotDef("row-dumpster", HideKind.Dumpster, 8f, 0f, 92f, -6f, 0.15f),
            new HideSpotDef("east-dumpster", HideKind.Dumpster, 92f, 0f, 56f, -6f, 0.15f),
            new HideSpotDef("hide-dumpster-town", HideKind.Dumpster, -76f, 4f, 4f, 90f, 0.3f),
        };

        // sim.js NPC_NAMES / NPC_LOOKS. Looks index into characters.yml ids.
        public static readonly string[] NpcNames =
        {
            "Mags", "Tobin", "Wren", "Iver", "Nell", "Corrie", "Abe", "Lotte", "Sim", "Hettie"
        };

        public static readonly string[] NpcLooks = { "dockhand", "gutter", "runaway", "watch" };

        // bot-mimic.js FORM_NAMES. Not the player's Q cycle (that one includes tarp and dinghy).
        public static readonly DisguiseForm[] BotForms =
        {
            DisguiseForm.Crate, DisguiseForm.Barrel, DisguiseForm.Loot,
            DisguiseForm.Fisherman, DisguiseForm.Locker, DisguiseForm.Dumpster
        };

        public static readonly DisguiseForm[] PlayerForms =
        {
            DisguiseForm.None, DisguiseForm.Crate, DisguiseForm.Barrel, DisguiseForm.Loot,
            DisguiseForm.Fisherman, DisguiseForm.Locker, DisguiseForm.Tarp,
            DisguiseForm.Dinghy, DisguiseForm.Dumpster
        };
    }
}
