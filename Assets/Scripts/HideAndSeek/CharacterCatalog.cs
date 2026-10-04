// Transcribed from Assets/SpawnSource/scripts/lib/data/characters.yml.
// model / pic are Spawn CDN paths. IActorVisuals is where a mesh would be parented.

using System;
using UnityEngine;

namespace HideAndSeek
{
    [Serializable]
    public class CharacterDef
    {
        public string id;
        public string displayName;
        public string blurb;
        public string model;
        public string picture;
    }

    [CreateAssetMenu(fileName = "CharacterCatalog", menuName = "HideAndSeek/Character Catalog", order = 2)]
    public class CharacterCatalog : ScriptableObject
    {
        public CharacterDef[] characters = Defaults();

        public bool Has(string id)
        {
            return Find(id) != null;
        }

        public CharacterDef Find(string id)
        {
            if (characters == null || string.IsNullOrEmpty(id))
                return null;
            for (int i = 0; i < characters.Length; i++)
                if (characters[i] != null && characters[i].id == id)
                    return characters[i];
            return null;
        }

        public static CharacterCatalog CreateRuntimeDefaults()
        {
            var c = CreateInstance<CharacterCatalog>();
            c.name = "CharacterCatalog (runtime defaults from characters.yml)";
            c.hideFlags = HideFlags.HideAndDontSave;
            c.characters = Defaults();
            return c;
        }

        static CharacterDef[] Defaults()
        {
            return new[]
            {
                new CharacterDef { id = "own", displayName = "Yourself", blurb = "your own face, in the wrong dream" },
                new CharacterDef
                {
                    id = "dockhand", displayName = "Mara, dockhand", blurb = "first off the boats, last to leave",
                    model = "cdn/character-young-dockhand-woman-orange-rain-jacket-rubber-boots-short-black-hair.glb",
                    picture = "/cdn/value.6cb803a144e8dd18b3a23c2f1cf351dd5d0ce0469f0124bf74b98d610b0f8591.png"
                },
                new CharacterDef
                {
                    id = "gutter", displayName = "Bram, gutter", blurb = "forty years at the fish line",
                    model = "cdn/character-bearded-cannery-worker-man-blue-boilersuit-stained-rubber-apron-beanie.glb",
                    picture = "/cdn/value.fce122319f704d4476d5fbad63eddd131340c1a95b2a6fc10a1eb318bc787130.png"
                },
                new CharacterDef
                {
                    id = "runaway", displayName = "Pip, runaway", blurb = "slept in the net loft. shouldn't have",
                    model = "cdn/character-teen-boy-green-hoodie-wool-beanie-small-backpack.glb",
                    picture = "/cdn/value.bc42099340067aaa1bad68d0e2d671a74887fc8bd67cf1959e2f01496956529f.png"
                },
                new CharacterDef
                {
                    id = "watch", displayName = "Edda, night watch", blurb = "she has walked this yard every night",
                    model = "cdn/character-old-night-watchwoman-long-grey-greatcoat-flat-cap.glb",
                    picture = "/cdn/value.09b16531f4be4ad07496370be83f32cc1bbb6d3b9319e1f31d0c0a6c752d26e7.png"
                },
            };
        }
    }
}
