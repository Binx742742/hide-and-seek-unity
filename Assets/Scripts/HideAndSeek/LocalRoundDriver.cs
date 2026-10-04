// Drops stand-in bodies and, when the bake is present, the yard from scripts/gen.
// 1 human → solo bot (cage, then hunt). 2+ humans → no hide phase, claws locked for startLock.
// If yard.json.gz is missing, the old loot / hide / cage cubes are used instead.

using UnityEngine;

namespace HideAndSeek
{
    public class LocalRoundDriver : MonoBehaviour
    {
        public RoundDirector director;
        public CharacterCatalog characters;
        public bool spawnStandIns = true;
        public int humanPlayers = 1;
        public bool fillNpcSeats = true;
        public bool spawnYardMarkers = true;
        public bool openMenuOnStart = true;

        public CharacterCatalog Characters => characters;

        bool _spawned;

        void Awake()
        {
            if (director == null)
                director = GetComponent<RoundDirector>();
            if (director == null)
                director = gameObject.AddComponent<RoundDirector>();
            director.simulateMatch = true;
            if (characters == null)
                characters = CharacterCatalog.CreateRuntimeDefaults();
            if (GetComponent<MenuFlow>() == null)
                gameObject.AddComponent<MenuFlow>();
            if (GetComponent<RoundHud>() == null)
                gameObject.AddComponent<RoundHud>();
            if (GetComponent<StandInCamera>() == null)
                gameObject.AddComponent<StandInCamera>();
        }

        void Start()
        {
            if (!spawnStandIns || _spawned || director == null)
                return;
            _spawned = true;
            var yard = new GameObject("Yard").transform;
            var persistent = new GameObject("Persistent").transform;
            persistent.SetParent(yard, false);
            var round = new GameObject("Round").transform;
            round.SetParent(yard, false);
            director.PersistentRoot = persistent;
            director.RoundRoot = round;

            bool yardBuilt = false;
            if (spawnYardMarkers)
                yardBuilt = YardBuilder.TryBuild(director, persistent);
            if (spawnYardMarkers && !yardBuilt)
                SpawnPersistent(persistent);

            int humans = Mathf.Max(1, humanPlayers);
            director.soloBotRound = humans < 2;
            for (int i = 0; i < humans; i++)
            {
                Vector3 at = director.Rules.SpawnAt(i, humans);
                var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                go.name = i == 0 ? "Player" : "Player " + (i + 1);
                go.transform.SetParent(yard, true);
                go.transform.position = at;
                var col = go.GetComponent<Collider>();
                if (col != null)
                    Destroy(col);
                var actor = go.AddComponent<Actor>();
                actor.DisplayName = go.name;
                actor.UserId = "local-" + (i + 1);
                actor.ActorId = "player-" + (i + 1);
                actor.IsLocal = i == 0;
                actor.CharacterId = "own";
                actor.GroundY = at.y;
                actor.Bind(director);
                go.AddComponent<ActorMotor>();
                go.AddComponent<ActorActions>();
                go.AddComponent<ActorVisualStandIn>();
                if (i == 0)
                {
                    go.AddComponent<LocalPlayerInput>();
                    director.LocalActor = actor;
                    if (openMenuOnStart)
                        GetComponent<MenuFlow>().BindArrival(actor, false);
                }
            }

            if (!fillNpcSeats)
                director.rules.seats = humanPlayers;
        }

        void SpawnPersistent(Transform parent)
        {
            var rules = director.Rules;
            if (rules.lootSpots != null)
            {
                for (int i = 0; i < rules.lootSpots.Length; i++)
                {
                    var xz = rules.lootSpots[i];
                    var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    go.name = "loot-" + i;
                    go.transform.SetParent(parent, true);
                    go.transform.position = new Vector3(xz.x, 0.35f, xz.y);
                    go.transform.localScale = new Vector3(1.1f, 0.7f, 0.75f);
                    go.AddComponent<LootCrate>();
                }
            }
            var spots = YardLayout.HideSpots;
            for (int i = 0; i < spots.Length; i++)
            {
                var def = spots[i];
                var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                go.name = def.Id;
                go.transform.SetParent(parent, true);
                go.transform.position = def.Position;
                go.transform.rotation = Quaternion.Euler(0f, def.Yaw, 0f);
                go.transform.localScale = new Vector3(0.9f, 1.6f, 0.7f);
                var spot = go.AddComponent<HidingSpot>();
                spot.SpotId = def.Id;
                spot.Kind = def.Kind;
                spot.InsideOffset = def.Inside;
            }
            var cageGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cageGo.name = "cage-door";
            cageGo.transform.SetParent(parent, true);
            cageGo.transform.position = new Vector3(rules.cageXZ.x, rules.cageFloorY, rules.cageXZ.y);
            cageGo.transform.localScale = new Vector3(3.2f, 0.2f, 0.2f);
            var gate = cageGo.AddComponent<CageGate>();
            gate.ClosedY = rules.cageFloorY;
            director.Cage = gate;
        }
    }
}
