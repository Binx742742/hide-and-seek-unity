// Gameplay markers: loot, hiding spots, fish, crafted hazards, clues, dreamers, doors, noise pings.
// YardBuilder parents generator meshes as children named Visual. These components stay on the root.
// Door swing numbers are door.js. Dreamer shuffle numbers are dreamer.js.

using System.Collections.Generic;
using UnityEngine;

namespace HideAndSeek
{
    public class NoisePing : MonoBehaviour
    {
        public float Radius = 30f;
        public string Kind = "noise";
        public float At;
        public float DieAt;

        public void Init(float radius, string kind, float life)
        {
            Radius = radius;
            Kind = kind;
            At = Time.time;
            DieAt = At + life;
        }

        void Update()
        {
            if (Time.time >= DieAt)
                Destroy(gameObject);
        }
    }

    public class LootCrate : MonoBehaviour
    {
        public bool Fake;
        public string OwnerId;
        public float EmptyUntil;
        public float SpawnedAt;

        void OnEnable() { RoundDirector.Instance?.RegisterLoot(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterLoot(this); }
    }

    public class HidingSpot : MonoBehaviour
    {
        public string SpotId;
        public HideKind Kind;
        public Vector3 InsideOffset;
        public Actor Occupant;

        // player.js adds state.inside in world space. Marker scale must not stretch it.
        public Vector3 InsidePoint => transform.position + InsideOffset;

        void OnEnable() { RoundDirector.Instance?.RegisterSpot(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterSpot(this); }
    }

    public class FishPile : MonoBehaviour
    {
        public bool Rigged;

        // Food is a pile, not a wall. A collider here would block the witness ray.
        void Awake()
        {
            var c = GetComponent<Collider>();
            if (c != null)
                Destroy(c);
        }

        void OnEnable() { RoundDirector.Instance?.RegisterFood(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterFood(this); }
    }

    public class PlacedHazard : MonoBehaviour
    {
        public PropKind Kind;
        public string OwnerId;
        public float ArmAt;
        public float FireAt;
        public bool Fired;

        void OnEnable() { RoundDirector.Instance?.RegisterHazard(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterHazard(this); }
    }

    /// <summary>
    /// Tripwire, barricade, smoke, scarecrow, and gut snare. The component stays on the root.
    /// A child named Visual is the stand-in mesh. A later model replaces that child.
    /// </summary>
    public class KitPiece : MonoBehaviour
    {
        public KitKind Kind;
        public string OwnerId;
        public float SpawnedAt;
        public float ArmAt;
        public float Until;
        public int Hp;
        public float Radius;

        // rules.yml saltTouched.flicker. Allies may notice. No flicker mesh in this stub.
        public bool SaltFlicker;

        void OnEnable() { RoundDirector.Instance?.RegisterKit(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterKit(this); }

        void Update()
        {
            if (Kind == KitKind.Smoke && Until > 0f && Time.time >= Until)
                Destroy(gameObject);
        }
    }

    /// <summary>
    /// Primitive stand-ins for templates/props.js kit pieces. No CDN textures.
    /// Unity has no cone or torus, so the bell is a short cylinder and the snare is a flat disc.
    /// </summary>
    public static class KitVisuals
    {
        public static Transform AddVisual(GameObject host)
        {
            var vis = new GameObject("Visual");
            vis.transform.SetParent(host.transform, false);
            return vis.transform;
        }

        public static void Tripwire(GameObject host, float length)
        {
            var vis = AddVisual(host);
            // Stakes are cylinders of height 0.45. Unity's cylinder is 2 tall and 1 across.
            Stake(vis, -length * 0.5f);
            Stake(vis, length * 0.5f);
            var wire = Part(vis, PrimitiveType.Cube, new Vector3(0f, 0.3f, 0f), new Vector3(length, 0.012f, 0.012f));
            Tint(wire, new Color(0.72f, 0.66f, 0.5f));
            var bell = Part(vis, PrimitiveType.Cylinder, new Vector3(0f, 0.2f, 0f), new Vector3(0.12f, 0.05f, 0.12f));
            Tint(bell, new Color(0.72f, 0.62f, 0.35f));
        }

        public static void Barricade(GameObject host, float width)
        {
            var box = host.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.95f, 0f);
            box.size = new Vector3(width, 1.9f, 0.12f);
            var vis = AddVisual(host);
            var wood = new Color(0.45f, 0.36f, 0.26f);
            Tint(Part(vis, PrimitiveType.Cube, new Vector3(-width * 0.5f + 0.1f, 0.95f, 0.1f), new Vector3(0.12f, 1.9f, 0.12f)), wood);
            Tint(Part(vis, PrimitiveType.Cube, new Vector3(width * 0.5f - 0.1f, 0.95f, 0.1f), new Vector3(0.12f, 1.9f, 0.12f)), wood);
            Tint(Part(vis, PrimitiveType.Cube, new Vector3(0f, 0.35f, 0f), new Vector3(width, 0.24f, 0.05f)), wood);
            Tint(Part(vis, PrimitiveType.Cube, new Vector3(0f, 0.85f, 0f), new Vector3(width * 0.95f, 0.22f, 0.05f)), wood);
            Tint(Part(vis, PrimitiveType.Cube, new Vector3(0f, 1.4f, 0f), new Vector3(width * 0.9f, 0.24f, 0.05f)), wood);
        }

        public static void SmokeMarker(GameObject host)
        {
            // The cloud itself is an FX script in props.js. This marker is the swappable child, not a solid volume.
            var vis = AddVisual(host);
            Tint(Part(vis, PrimitiveType.Sphere, new Vector3(0f, 0.4f, 0f), Vector3.one * 0.35f), new Color(0.45f, 0.46f, 0.48f));
        }

        public static void Scarecrow(GameObject host)
        {
            // The body is a CDN character model. The capsule stands in for it.
            var vis = AddVisual(host);
            Tint(Part(vis, PrimitiveType.Capsule, new Vector3(0f, 1f, 0f), Vector3.one), new Color(0.55f, 0.48f, 0.32f));
        }

        public static void Snare(GameObject host)
        {
            var vis = AddVisual(host);
            Tint(Part(vis, PrimitiveType.Cylinder, new Vector3(0f, 0.02f, 0f), new Vector3(0.64f, 0.02f, 0.64f)), new Color(0.18f, 0.08f, 0.07f));
        }

        static void Stake(Transform vis, float x)
        {
            Tint(Part(vis, PrimitiveType.Cylinder, new Vector3(x, 0.225f, 0f), new Vector3(0.06f, 0.225f, 0.06f)), new Color(0.28f, 0.22f, 0.16f));
        }

        static GameObject Part(Transform parent, PrimitiveType type, Vector3 localPos, Vector3 localScale)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = "part";
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = localScale;
            var col = go.GetComponent<Collider>();
            if (col != null)
                UnityEngine.Object.Destroy(col);
            return go;
        }

        static void Tint(GameObject go, Color color)
        {
            var rend = go.GetComponent<Renderer>();
            if (rend == null)
                return;
            rend.material.color = color;
        }
    }

    public class ClueShard : MonoBehaviour
    {
        public string ClueId;
        public string Text;
        public string Picture;
        public bool Taken;
        public string OwnerId;
        public bool False;
        public float SpawnedAt;

        void OnEnable() { RoundDirector.Instance?.RegisterClue(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterClue(this); }

        void Update()
        {
            if (Taken)
                return;
            // clue.js: yaw = (now/1000 * 40) % 360. now is ms, so degrees = seconds * 40.
            transform.rotation = Quaternion.Euler(0f, (Time.time * 40f) % 360f, 0f);
        }
    }

    public class DreamerNpc : MonoBehaviour
    {
        public string DreamerId;
        public string DisplayName;
        public string[] Says;
        public Vector3 Home;
        public bool Awake;
        public Actor Talker;
        public float CoolUntil;
        public float ScreamReadyAt;
        public float SniffAt;
        public string Line;
        public float LineAt;
        public float GoneAt;
        public Vector3 WanderTo;
        public float WanderUntil;
        public float MurmurAt;
        public bool Departed;

        int _think;

        void OnEnable() { RoundDirector.Instance?.RegisterDreamer(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterDreamer(this); }

        void Update()
        {
            var dir = RoundDirector.Instance;
            if (dir == null)
                return;
            // dreamer.js updateSchedule every 3. Motion still integrates each frame.
            if (++_think % 3 == 0)
                Think(dir);
            if (!Awake && Talker == null && !Departed)
                Shuffle();
        }

        void Think(RoundDirector dir)
        {
            float now = Time.time;
            if (Awake)
            {
                if (GoneAt <= 0f)
                {
                    GoneAt = now + BodyTune.DreamerWakeHideDelay;
                    dir.PlaySfx("wake", transform.position);
                }
                if (now > GoneAt && !Departed)
                {
                    Departed = true;
                    var r = GetComponent<Renderer>();
                    if (r != null)
                        r.enabled = false;
                }
                return;
            }

            if (now > SniffAt)
            {
                SniffAt = now + BodyTune.FishermanSniffInterval;
                Actor fake = null;
                float best = BodyTune.FishermanCalloutRange;
                var actors = dir.Actors;
                for (int i = 0; i < actors.Count; i++)
                {
                    var a = actors[i];
                    if (a == null || a.Dead || a.Role != RoleKind.Mimic || a.Disguise != DisguiseForm.Fisherman)
                        continue;
                    float d = YardMath.Flat(transform.position, a.transform.position);
                    if (d < best)
                    {
                        best = d;
                        fake = a;
                    }
                }
                if (fake != null && now > ScreamReadyAt)
                {
                    ScreamReadyAt = now + BodyTune.FishermanCalloutCooldown;
                    string who = string.IsNullOrEmpty(fake.BorrowedName) ? "one of us" : fake.BorrowedName;
                    Line = "THAT'S NOT " + who.ToUpperInvariant() + "!";
                    LineAt = now;
                    MurmurAt = now + 5f;
                    dir.PlaySfx("scream", transform.position);
                    dir.RaiseHighlight(fake, BodyTune.FishermanHighlightSeconds, "fisherman");
                    dir.PostFeed(DisplayName + " is screaming at a fisherman");
                    Vector3 look = fake.transform.position - transform.position;
                    look.y = 0f;
                    if (look.sqrMagnitude > 0.01f)
                        transform.rotation = Quaternion.LookRotation(look.normalized, Vector3.up);
                }
            }

            if (Talker != null)
            {
                if (Talker.Talk == null || Talker.Talk.Npc != this)
                    Talker = null;
                else
                {
                    Vector3 look = Talker.transform.position - transform.position;
                    look.y = 0f;
                    if (look.sqrMagnitude > 0.01f)
                        transform.rotation = Quaternion.LookRotation(look.normalized, Vector3.up);
                    return;
                }
            }

            if (WanderTo == Vector3.zero || now > WanderUntil)
            {
                float ang = UnityEngine.Random.value * Mathf.PI * 2f;
                float rad = 1f + UnityEngine.Random.value * 4f;
                WanderTo = new Vector3(Home.x + Mathf.Cos(ang) * rad, Home.y, Home.z + Mathf.Sin(ang) * rad);
                WanderUntil = now + 6f + UnityEngine.Random.value * 6f;
            }

            if (now > MurmurAt && Says != null && Says.Length > 0)
            {
                MurmurAt = now + 9f + UnityEngine.Random.value * 9f;
                Line = Says[UnityEngine.Random.Range(0, Says.Length)];
                LineAt = now;
            }
        }

        void Shuffle()
        {
            Vector3 me = transform.position;
            Vector3 to = WanderTo - me;
            to.y = 0f;
            if (WanderTo == Vector3.zero || to.magnitude < 0.5f)
                return;
            Vector3 step = to.normalized * BodyTune.DreamerShuffleSpeed * Time.deltaTime;
            if (step.magnitude > to.magnitude)
                step = to;
            me += step;
            transform.position = me;
            if (to.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.LookRotation(to.normalized, Vector3.up);
        }
    }

    /// <summary>
    /// door.js press handler. Place at the hinge. The leaf runs along local +X, width metres.
    /// A level owns the mesh; this cube is only so the stand-in has a transform to swing.
    /// </summary>
    public class YardDoor : MonoBehaviour
    {
        public DoorKind Kind = DoorKind.Plank;
        public bool Open;
        public bool Broken;
        public float Yaw0;
        public float Swing = 100f;
        public float Width = 1.2f;
        public float Slide = 1.2f;
        public float BarredUntil;
        public float BarCoolUntil;
        public int Hp = 3;
        public float Cur;
        public Vector3 Home;
        public string LastBy;

        // Salt-touched drain bleed. rules.yml saltTouched.drain.seconds (45).
        // SaltWet stays after the flood so the mimic and careful eyes have a tell. No flood mesh.
        public bool SaltWet;
        public bool SaltForced;
        public float SaltFloodUntil;

        void Awake()
        {
            if (Home == Vector3.zero)
                Home = transform.position;
        }

        void OnEnable() { RoundDirector.Instance?.RegisterDoor(this); }
        void OnDisable() { RoundDirector.Instance?.UnregisterDoor(this); }

        public Vector3 LeafCenter()
        {
            float a = Yaw0 * Mathf.Deg2Rad;
            float hw = Width * 0.5f;
            // player.js: cx = feet.x + cos(a) * hw, cz = feet.z - sin(a) * hw
            return new Vector3(transform.position.x + Mathf.Cos(a) * hw, transform.position.y, transform.position.z - Mathf.Sin(a) * hw);
        }

        public void Press(Actor by, string act)
        {
            var dir = RoundDirector.Instance;
            var rules = dir != null ? dir.Rules : null;
            float now = Time.time;
            bool barred = !Broken && now < BarredUntil;
            float barSeconds = rules != null ? rules.doorBarSeconds : 30f;
            float barCd = rules != null ? rules.doorBarCooldown : 8f;
            int fullHp = rules != null ? rules.doorHp : 3;

            if (act == "bar")
            {
                if (Broken) { by.Say("it's smashed. nothing to bar"); return; }
                if (Open) { by.Say("shut it first"); return; }
                if (barred) { by.Say("already barred. " + Mathf.CeilToInt(BarredUntil - now) + "s"); return; }
                if (now < BarCoolUntil) { by.Say("the bar's still warm. wait"); return; }
                BarredUntil = now + barSeconds;
                BarCoolUntil = BarredUntil + barCd;
                Hp = fullHp;
                dir?.PlaySfx("bar", transform.position);
                by.Say("barred for " + barSeconds.ToString("0") + "s");
                return;
            }

            if (act == "claw")
            {
                if (Open || Broken)
                    return;
                if (!barred)
                {
                    Open = true;
                    LastBy = by.ActorId;
                    dir?.PlaySfx("doorHit", transform.position);
                    return;
                }
                Hp -= 1;
                dir?.MakeNoise(transform.position, rules != null ? rules.noiseDoor : 22f, "door");
                if (Hp <= 0)
                {
                    Broken = true;
                    Open = true;
                    BarredUntil = 0f;
                    dir?.PlaySfx("doorBreak", transform.position);
                }
                else
                    dir?.PlaySfx("doorHit", transform.position);
                return;
            }

            if (barred && !Open)
            {
                dir?.PlaySfx("locked", transform.position);
                float radius = rules != null ? rules.noiseDoor * 0.6f : 13.2f;
                dir?.MakeNoise(transform.position, radius, "door");
                by.Say("barred from the other side");
                return;
            }
            if (Broken)
                return;
            Open = !Open;
            LastBy = by != null ? by.ActorId : "";
            float ping = rules != null ? rules.noiseDoor * 0.5f : 11f;
            dir?.MakeNoise(transform.position, ping, "door");
            string clip = Kind == DoorKind.Panel ? "panelSlide"
                : Kind == DoorKind.Grate ? (Open ? "gateOpen" : "gateShut")
                : Open ? "doorOpen" : "doorShut";
            dir?.PlaySfx(clip, transform.position);
        }

        void Update()
        {
            float want = Open ? 1f : 0f;
            if (Mathf.Approximately(Cur, want))
                return;
            float rate = Kind == DoorKind.Panel ? 0.9f : Broken ? 6f : 2.6f;
            float next = Cur + Mathf.Sign(want - Cur) * Mathf.Min(Mathf.Abs(want - Cur), rate * Time.deltaTime);
            Cur = next;
            if (Kind == DoorKind.Panel)
            {
                float a = Yaw0 * Mathf.Deg2Rad;
                float d = Slide * next;
                transform.position = new Vector3(Home.x + Mathf.Cos(a) * d, Home.y, Home.z - Mathf.Sin(a) * d);
            }
            else
                transform.rotation = Quaternion.Euler(0f, Yaw0 + Swing * next * (Broken ? 1.15f : 1f), 0f);
        }
    }

    /// <summary>
    /// sim.js cageDoor: the pier cage slides up 2.9 m. Open 1.2 s, shut 0.4 s, easeOutCubic.
    /// Animator / level hook: listen to RoundDirector.CageMoved if you have a real gate.
    /// </summary>
    public class CageGate : MonoBehaviour
    {
        public float ClosedY = 0.3f;
        public float OpenLift = 2.9f;
        public bool Open;
        float _from;
        float _to;
        float _dur = 0.4f;
        float _t = 1f;

        public void SetOpen(bool open)
        {
            if (Open == open && _t >= 1f)
                return;
            Open = open;
            _from = transform.position.y;
            _to = open ? ClosedY + OpenLift : ClosedY;
            _dur = open ? 1.2f : 0.4f;
            _t = 0f;
            RoundDirector.Instance?.RaiseCage(open);
        }

        void Update()
        {
            if (_t >= 1f)
                return;
            _t = Mathf.Min(1f, _t + Time.deltaTime / Mathf.Max(0.0001f, _dur));
            float k = 1f - Mathf.Pow(1f - _t, 3f);
            var p = transform.position;
            p.y = Mathf.Lerp(_from, _to, k);
            transform.position = p;
        }
    }

    public static class PropQueries
    {
        public static LootCrate NearestLoot(IList<LootCrate> all, Vector3 me, float radius, bool includeFake)
        {
            LootCrate best = null;
            float bestD = radius;
            for (int i = 0; i < all.Count; i++)
            {
                var c = all[i];
                if (c == null)
                    continue;
                if (c.Fake && !includeFake)
                    continue;
                float d = YardMath.Flat(me, c.transform.position);
                if (d < bestD)
                {
                    bestD = d;
                    best = c;
                }
            }
            return best;
        }
    }
}
