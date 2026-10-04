// Spawns the baked yard: scripts/gen plus the cell scenes, as meshes at the source coordinates.
// Gameplay components stay on the root. "Visual" and "Collision" are children, so a later
// model replaces a mesh without rewriting a door, a hiding spot, or a lamp.
// Regenerate with: node --import ./tools/register-yard.mjs tools/bake-yard.mjs
// Generator ctx.random is the xorshift in that script. Flicker uses UnityEngine.Random
// because the Spawn host RNG is not in this repo; the thresholds are flicker.js and lamp-flicker.js.

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using UnityEngine;
using UnityEngine.Rendering;

namespace HideAndSeek
{
    [Serializable]
    public class YardFile
    {
        public YardForm[] forms;
        public YardAlias[] alias;
        public YardNode[] nodes;
        public YardTerrain terrain;
        public YardHole[] holes;
    }

    [Serializable]
    public class YardForm
    {
        public string id;
        public YardPart[] visual;
        public YardPart[] solid;
    }

    [Serializable]
    public class YardPart
    {
        public int kind;
        public float px, py, pz, qx, qy, qz, qw, sx, sy, sz;
        public int color;
        public int emit;
    }

    [Serializable]
    public class YardAlias
    {
        public string name;
        public string id;
    }

    [Serializable]
    public class YardNode
    {
        public string id;
        public string form;
        public string tags;
        public string behavior;
        public string hideKind;
        public string doorKind;
        public float px, py, pz, pitch, yaw, roll;
        public int render;
        public float insideX, insideY, insideZ;
        public float doorW, doorH, doorSwing, yaw0;
        public float lightR, lightG, lightB, lightIntensity, lightRange, lightBase, lightDist;
        public int shadow;
        public int kind;
        public float sx, sy, sz, oy;
        public int color;
        public YardNode[] children;
    }

    [Serializable]
    public class YardTerrain
    {
        public float ox, oz, step;
        public int nx, nz;
        public float[] h;
        public float sea;
    }

    [Serializable]
    public class YardHole
    {
        public float x0, z0, x1, z1;
    }

    public static class YardForms
    {
        public static bool Ready { get; private set; }

        internal static void Bind(Dictionary<string, string> alias, bool ready)
        {
            _alias = alias;
            Ready = ready;
        }

        static Dictionary<string, string> _alias = new Dictionary<string, string>();

        public static Material SharedMaterial()
        {
            if (_mat != null)
                return _mat;
            _mat = Resources.Load<Material>("HideAndSeek/Yard");
            if (_mat != null)
                return _mat;
            Shader shader = Shader.Find("HideAndSeek/YardVertex");
            if (shader == null)
                shader = Shader.Find("Sprites/Default");
            if (shader == null)
                shader = Shader.Find("Unlit/Color");
            if (shader == null)
                return null;
            _mat = new Material(shader);
            _mat.hideFlags = HideFlags.HideAndDontSave;
            return _mat;
        }

        static Material _mat;

        /// <summary>
        /// Parents a "StandInVisual" mesh under host and turns the host renderer off.
        /// The host keeps its gameplay component. Returns false when the bake is missing.
        /// </summary>
        public static bool Dress(GameObject host, string alias)
        {
            if (host == null || string.IsNullOrEmpty(alias) || !Ready)
                return false;
            if (_alias == null || !_alias.TryGetValue(alias, out string id))
                return false;
            Mesh mesh = YardBuilder.VisualMesh(id);
            if (mesh == null)
                return false;
            var old = host.transform.Find(ActorVisualStandIn.ChildName);
            if (old != null)
                UnityEngine.Object.Destroy(old.gameObject);
            var vis = new GameObject(ActorVisualStandIn.ChildName);
            vis.transform.SetParent(host.transform, false);
            // SpawnMarker scales the primitive. The baked form is already in metres.
            Vector3 s = host.transform.lossyScale;
            vis.transform.localScale = new Vector3(
                1f / (Mathf.Abs(s.x) < 1e-4f ? 1f : s.x),
                1f / (Mathf.Abs(s.y) < 1e-4f ? 1f : s.y),
                1f / (Mathf.Abs(s.z) < 1e-4f ? 1f : s.z));
            var filter = vis.AddComponent<MeshFilter>();
            var rend = vis.AddComponent<MeshRenderer>();
            filter.sharedMesh = mesh;
            Material mat = SharedMaterial();
            if (mat != null)
                rend.sharedMaterial = mat;
            var hostRend = host.GetComponent<Renderer>();
            if (hostRend != null)
                hostRend.enabled = false;
            return true;
        }
    }

    public static class YardBuilder
    {
        class Pair
        {
            public Mesh Visual;
            public Mesh Solid;
        }

        static readonly Dictionary<string, Pair> Meshes = new Dictionary<string, Pair>();

        public static Mesh VisualMesh(string id)
        {
            if (id != null && Meshes.TryGetValue(id, out Pair pair))
                return pair.Visual;
            return null;
        }

        public static bool TryBuild(RoundDirector director, Transform parent)
        {
            var root = new GameObject("BakedYard");
            if (parent != null)
                root.transform.SetParent(parent, false);
            try
            {
                YardFile file = Load();
                if (file == null || file.forms == null)
                {
                    UnityEngine.Object.Destroy(root);
                    return false;
                }
                Cache(file);
                var lamps = root.AddComponent<YardLamps>();
                var street = new Light[15];
                if (file.nodes != null)
                {
                    for (int i = 0; i < file.nodes.Length; i++)
                        SpawnNode(file.nodes[i], root.transform, director, street);
                }
                BuildTerrain(file.terrain, file.holes, root.transform);
                BuildSea(file.terrain, root.transform);
                lamps.Street = street;
                if (director != null)
                    director.lampHook = lamps;
                return true;
            }
            catch (Exception e)
            {
                Debug.LogWarning("[Yard] bake failed, using marker cubes. " + e.Message);
                UnityEngine.Object.Destroy(root);
                YardForms.Bind(new Dictionary<string, string>(), false);
                return false;
            }
        }

        static YardFile Load()
        {
            string path = Path.Combine(Application.streamingAssetsPath, "HideAndSeek", "yard.json.gz");
            if (!File.Exists(path))
            {
                Debug.LogWarning("[Yard] missing " + path);
                return null;
            }
            byte[] gz = File.ReadAllBytes(path);
            using (var input = new MemoryStream(gz))
            using (var gzip = new GZipStream(input, CompressionMode.Decompress))
            using (var output = new MemoryStream())
            {
                gzip.CopyTo(output);
                string json = Encoding.UTF8.GetString(output.ToArray());
                return JsonUtility.FromJson<YardFile>(json);
            }
        }

        static void Cache(YardFile file)
        {
            Meshes.Clear();
            var alias = new Dictionary<string, string>();
            if (file.forms != null)
            {
                for (int i = 0; i < file.forms.Length; i++)
                {
                    YardForm form = file.forms[i];
                    if (form == null || string.IsNullOrEmpty(form.id))
                        continue;
                    Mesh visual = BuildMesh(form.visual, form.id);
                    Mesh solid = visual;
                    if (form.solid != null && !SameParts(form.visual, form.solid))
                        solid = BuildMesh(form.solid, form.id + "-solid");
                    Meshes[form.id] = new Pair { Visual = visual, Solid = solid };
                }
            }
            if (file.alias != null)
            {
                for (int i = 0; i < file.alias.Length; i++)
                {
                    YardAlias row = file.alias[i];
                    if (row != null && !string.IsNullOrEmpty(row.name))
                        alias[row.name] = row.id;
                }
            }
            YardForms.Bind(alias, true);
        }

        static void SpawnNode(YardNode node, Transform parent, RoundDirector director, Light[] street)
        {
            if (node == null)
                return;
            var go = new GameObject(string.IsNullOrEmpty(node.id) ? "part" : node.id);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(node.px, node.py, node.pz);
            go.transform.localRotation = Quaternion.Euler(node.pitch, node.yaw, node.roll);

            if (!string.IsNullOrEmpty(node.form))
                AttachForm(go, node);
            else if (node.kind >= 0)
                AttachPrimitive(go, node);

            if (node.lightIntensity > 0f || node.lightRange > 0f)
                AttachLight(go, node);

            if (node.children != null)
            {
                for (int i = 0; i < node.children.Length; i++)
                    SpawnNode(node.children[i], go.transform, director, street);
            }

            AttachBehavior(go, node);
            AttachGameplay(go, node, director, street);
        }

        static void AttachForm(GameObject go, YardNode node)
        {
            if (!Meshes.TryGetValue(node.form, out Pair pair))
                return;
            Material mat = YardForms.SharedMaterial();
            if (node.render != 0 && pair.Visual != null)
            {
                var vis = new GameObject("Visual");
                vis.transform.SetParent(go.transform, false);
                vis.AddComponent<MeshFilter>().sharedMesh = pair.Visual;
                var rend = vis.AddComponent<MeshRenderer>();
                if (mat != null)
                    rend.sharedMaterial = mat;
            }
            if (pair.Solid != null)
            {
                var col = new GameObject("Collision");
                col.transform.SetParent(go.transform, false);
                var mc = col.AddComponent<MeshCollider>();
                mc.sharedMesh = pair.Solid;
                mc.convex = false;
            }
        }

        static void AttachPrimitive(GameObject go, YardNode node)
        {
            var part = new YardPart
            {
                kind = node.kind,
                py = node.oy,
                qw = 1f,
                sx = node.sx,
                sy = node.sy,
                sz = node.sz,
                color = node.color
            };
            Mesh mesh = node.render != 0 ? BuildMesh(new[] { part }, go.name) : null;
            if (mesh != null)
            {
                var vis = new GameObject("Visual");
                vis.transform.SetParent(go.transform, false);
                vis.AddComponent<MeshFilter>().sharedMesh = mesh;
                var rend = vis.AddComponent<MeshRenderer>();
                Material mat = YardForms.SharedMaterial();
                if (mat != null)
                    rend.sharedMaterial = mat;
            }
            if (node.kind == 0)
            {
                var box = go.AddComponent<BoxCollider>();
                box.center = new Vector3(0f, node.oy, 0f);
                box.size = new Vector3(Mathf.Max(0.01f, node.sx), Mathf.Max(0.01f, node.sy), Mathf.Max(0.01f, node.sz));
            }
            else if (node.kind == 2)
            {
                var sphere = go.AddComponent<SphereCollider>();
                sphere.center = new Vector3(0f, node.oy, 0f);
                sphere.radius = Mathf.Max(0.01f, node.sx * 0.5f);
            }
            else if (node.kind == 1)
            {
                Mesh solid = mesh ?? BuildMesh(new[] { part }, go.name + "-col");
                if (solid == null)
                    return;
                var col = new GameObject("Collision");
                col.transform.SetParent(go.transform, false);
                var mc = col.AddComponent<MeshCollider>();
                mc.sharedMesh = solid;
                mc.convex = true;
            }
        }

        static void AttachLight(GameObject go, YardNode node)
        {
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(node.lightR, node.lightG, node.lightB);
            light.intensity = node.lightIntensity;
            float range = node.lightRange > 0f ? node.lightRange : node.lightDist;
            light.range = range > 0f ? range : 10f;
            light.shadows = node.shadow != 0 ? LightShadows.Soft : LightShadows.None;
        }

        static void AttachBehavior(GameObject go, YardNode node)
        {
            string behavior = node.behavior;
            if (string.IsNullOrEmpty(behavior))
                return;
            if (behavior.EndsWith("lamp-flicker.js"))
            {
                var sodium = go.AddComponent<SodiumFlicker>();
                sodium.Base = node.lightBase > 0f ? node.lightBase : 25f;
                Transform child = go.transform.Find("light");
                sodium.Lamp = child != null ? child.GetComponent<Light>() : go.GetComponent<Light>();
            }
            else if (behavior.EndsWith("flicker.js"))
            {
                var bulb = go.AddComponent<BulbFlicker>();
                if (node.lightBase > 0f)
                    bulb.Base = node.lightBase;
                else if (node.lightIntensity > 0f)
                    bulb.Base = node.lightIntensity;
                bulb.Lamp = go.GetComponent<Light>();
                bulb.RespectBlackout = UnderStreet(go.transform);
            }
        }

        static void AttachGameplay(GameObject go, YardNode node, RoundDirector director, Light[] street)
        {
            if (HasTag(node.tags, "hidespot") && TryHide(node.hideKind, out HideKind hideKind))
            {
                var spot = go.AddComponent<HidingSpot>();
                spot.SpotId = node.id;
                spot.Kind = hideKind;
                spot.InsideOffset = new Vector3(node.insideX, node.insideY, node.insideZ);
            }
            if (HasTag(node.tags, "loot"))
                go.AddComponent<LootCrate>();

            bool door = HasTag(node.tags, "door") || (!string.IsNullOrEmpty(node.behavior) && node.behavior.EndsWith("door.js"));
            if (door)
            {
                var yardDoor = go.AddComponent<YardDoor>();
                yardDoor.Home = go.transform.position;
                yardDoor.Yaw0 = node.yaw0;
                yardDoor.Swing = node.doorSwing;
                yardDoor.Width = node.doorW > 0f ? node.doorW : 1.2f;
                yardDoor.Kind = ParseDoor(node.doorKind);
                yardDoor.Hp = 3;
            }

            if (node.id == "cage-door")
            {
                var gate = go.AddComponent<CageGate>();
                float closed = director != null ? director.Rules.cageFloorY : 0.3f;
                gate.ClosedY = closed;
                Vector3 lp = go.transform.localPosition;
                lp.y = closed;
                go.transform.localPosition = lp;
                if (director != null)
                    director.Cage = gate;
            }

            if (street != null && TryStreet(node.id, out int index))
            {
                Transform child = go.transform.Find("light");
                Light lamp = child != null ? child.GetComponent<Light>() : go.GetComponent<Light>();
                if (lamp != null)
                    street[index] = lamp;
            }
        }

        static bool UnderStreet(Transform t)
        {
            while (t != null)
            {
                if (TryStreet(t.name, out _))
                    return true;
                t = t.parent;
            }
            return false;
        }

        static bool TryStreet(string id, out int index)
        {
            index = 0;
            if (string.IsNullOrEmpty(id) || !id.StartsWith("lamp-"))
                return false;
            if (!int.TryParse(id.Substring(5), out int n))
                return false;
            if (n < 1 || n > 15)
                return false;
            index = n - 1;
            return true;
        }

        static bool TryHide(string kind, out HideKind hide)
        {
            switch (kind)
            {
                case "locker": hide = HideKind.Locker; return true;
                case "tarp": hide = HideKind.Tarp; return true;
                case "boat": hide = HideKind.Boat; return true;
                case "dumpster": hide = HideKind.Dumpster; return true;
                default: hide = HideKind.Locker; return false;
            }
        }

        static DoorKind ParseDoor(string kind)
        {
            if (kind == "grate")
                return DoorKind.Grate;
            if (kind == "panel")
                return DoorKind.Panel;
            return DoorKind.Plank;
        }

        static bool HasTag(string tags, string want)
        {
            if (string.IsNullOrEmpty(tags) || string.IsNullOrEmpty(want))
                return false;
            int i = 0;
            while (i < tags.Length)
            {
                int j = tags.IndexOf(',', i);
                if (j < 0)
                    j = tags.Length;
                if (j - i == want.Length && string.CompareOrdinal(tags, i, want, 0, want.Length) == 0)
                    return true;
                i = j + 1;
            }
            return false;
        }

        static void BuildTerrain(YardTerrain t, YardHole[] holes, Transform parent)
        {
            if (t == null || t.h == null || t.nx < 2 || t.nz < 2 || t.h.Length < t.nx * t.nz)
                return;
            int nx = t.nx;
            int nz = t.nz;
            var verts = new List<Vector3>();
            var cols = new List<Color32>();
            var tris = new List<int>();
            var map = new int[nx * nz];
            for (int i = 0; i < map.Length; i++)
                map[i] = -1;
            var tint = new Color32(92, 96, 78, 0);
            for (int iz = 0; iz < nz - 1; iz++)
            {
                for (int ix = 0; ix < nx - 1; ix++)
                {
                    float cx = t.ox + (ix + 0.5f) * t.step;
                    float cz = t.oz + (iz + 0.5f) * t.step;
                    if (InHole(holes, cx, cz))
                        continue;
                    int a = Use(ix, iz);
                    int b = Use(ix + 1, iz);
                    int c = Use(ix, iz + 1);
                    int d = Use(ix + 1, iz + 1);
                    tris.Add(a); tris.Add(b); tris.Add(d);
                    tris.Add(a); tris.Add(d); tris.Add(c);
                }
            }
            if (verts.Count == 0)
                return;
            var mesh = new Mesh();
            mesh.name = "Terrain";
            mesh.indexFormat = IndexFormat.UInt32;
            mesh.SetVertices(verts);
            mesh.SetColors(cols);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            mesh.hideFlags = HideFlags.HideAndDontSave;
            var go = new GameObject("Terrain");
            go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var rend = go.AddComponent<MeshRenderer>();
            Material mat = YardForms.SharedMaterial();
            if (mat != null)
                rend.sharedMaterial = mat;
            var mc = go.AddComponent<MeshCollider>();
            mc.sharedMesh = mesh;

            int Use(int ix, int iz)
            {
                int idx = iz * nx + ix;
                if (map[idx] >= 0)
                    return map[idx];
                map[idx] = verts.Count;
                float y = t.h[idx];
                verts.Add(new Vector3(t.ox + ix * t.step, y, t.oz + iz * t.step));
                cols.Add(tint);
                return map[idx];
            }
        }

        static void BuildSea(YardTerrain t, Transform parent)
        {
            if (t == null)
                return;
            float x0 = t.ox - 40f;
            float x1 = t.ox + Mathf.Max(1, t.nx - 1) * t.step + 40f;
            float z0 = t.oz - 40f;
            float z1 = t.oz + Mathf.Max(1, t.nz - 1) * t.step + 40f;
            float y = t.sea;
            var mesh = new Mesh();
            mesh.name = "Sea";
            var sea = new Color32(28, 48, 58, 0);
            mesh.vertices = new[]
            {
                new Vector3(x0, y, z0),
                new Vector3(x1, y, z0),
                new Vector3(x1, y, z1),
                new Vector3(x0, y, z1)
            };
            mesh.colors32 = new[] { sea, sea, sea, sea };
            mesh.triangles = new[] { 0, 1, 2, 0, 2, 3 };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            mesh.hideFlags = HideFlags.HideAndDontSave;
            var go = new GameObject("Sea");
            go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var rend = go.AddComponent<MeshRenderer>();
            Material mat = YardForms.SharedMaterial();
            if (mat != null)
                rend.sharedMaterial = mat;
        }

        static bool InHole(YardHole[] holes, float x, float z)
        {
            if (holes == null)
                return false;
            for (int i = 0; i < holes.Length; i++)
            {
                YardHole h = holes[i];
                if (h == null)
                    continue;
                if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1)
                    return true;
            }
            return false;
        }

        internal static Mesh BuildMesh(YardPart[] parts, string name)
        {
            if (parts == null || parts.Length == 0)
                return null;
            var verts = new List<Vector3>(parts.Length * 16);
            var norms = new List<Vector3>(parts.Length * 16);
            var cols = new List<Color32>(parts.Length * 16);
            var tris = new List<int>(parts.Length * 24);
            for (int i = 0; i < parts.Length; i++)
                Append(parts[i], verts, norms, cols, tris);
            if (tris.Count == 0)
                return null;
            var mesh = new Mesh();
            mesh.name = string.IsNullOrEmpty(name) ? "yard" : name;
            mesh.indexFormat = IndexFormat.UInt32;
            mesh.SetVertices(verts);
            mesh.SetNormals(norms);
            mesh.SetColors(cols);
            mesh.SetTriangles(tris, 0, true);
            mesh.RecalculateBounds();
            mesh.hideFlags = HideFlags.HideAndDontSave;
            return mesh;
        }

        static void Append(YardPart part, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            if (part == null)
                return;
            var rot = new Quaternion(part.qx, part.qy, part.qz, part.qw);
            if (rot.x == 0f && rot.y == 0f && rot.z == 0f && rot.w == 0f)
                rot = Quaternion.identity;
            var scale = new Vector3(Mathf.Max(part.sx, 0.001f), Mathf.Max(part.sy, 0.001f), Mathf.Max(part.sz, 0.001f));
            var origin = new Vector3(part.px, part.py, part.pz);
            var color = ToColor(part.color, part.emit);
            if (part.kind == 1)
                AppendCylinder(origin, rot, scale, color, verts, norms, cols, tris);
            else if (part.kind == 2)
                AppendSphere(origin, rot, scale, color, verts, norms, cols, tris);
            else
                AppendBox(origin, rot, scale, color, verts, norms, cols, tris);
        }

        static void AppendBox(Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            Vector3[] faces =
            {
                Vector3.right, Vector3.left, Vector3.up, Vector3.down, Vector3.forward, Vector3.back
            };
            for (int f = 0; f < faces.Length; f++)
            {
                Vector3 n = faces[f];
                Vector3 tangent = Mathf.Abs(n.y) > 0.5f ? Vector3.right : Vector3.up;
                Vector3 bitangent = Vector3.Cross(n, tangent);
                Vector3 c = n * 0.5f;
                Quad(
                    c - tangent * 0.5f - bitangent * 0.5f,
                    c + tangent * 0.5f - bitangent * 0.5f,
                    c + tangent * 0.5f + bitangent * 0.5f,
                    c - tangent * 0.5f + bitangent * 0.5f,
                    n, origin, rot, scale, color, verts, norms, cols, tris);
            }
        }

        static void AppendCylinder(Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            const int sides = 8;
            for (int i = 0; i < sides; i++)
            {
                float a0 = i / (float)sides * Mathf.PI * 2f;
                float a1 = (i + 1) / (float)sides * Mathf.PI * 2f;
                float c0 = Mathf.Cos(a0) * 0.5f, s0 = Mathf.Sin(a0) * 0.5f;
                float c1 = Mathf.Cos(a1) * 0.5f, s1 = Mathf.Sin(a1) * 0.5f;
                var b0 = new Vector3(c0, -0.5f, s0);
                var b1 = new Vector3(c1, -0.5f, s1);
                var t0 = new Vector3(c0, 0.5f, s0);
                var t1 = new Vector3(c1, 0.5f, s1);
                Vector3 n0 = new Vector3(c0, 0f, s0);
                Vector3 n1 = new Vector3(c1, 0f, s1);
                int start = verts.Count;
                Push(b0, n0, origin, rot, scale, color, verts, norms, cols);
                Push(b1, n1, origin, rot, scale, color, verts, norms, cols);
                Push(t1, n1, origin, rot, scale, color, verts, norms, cols);
                Push(t0, n0, origin, rot, scale, color, verts, norms, cols);
                tris.Add(start); tris.Add(start + 2); tris.Add(start + 1);
                tris.Add(start); tris.Add(start + 3); tris.Add(start + 2);
                Fan(new Vector3(0f, 0.5f, 0f), t1, t0, Vector3.up, origin, rot, scale, color, verts, norms, cols, tris);
                Fan(new Vector3(0f, -0.5f, 0f), b0, b1, Vector3.down, origin, rot, scale, color, verts, norms, cols, tris);
            }
        }

        static void AppendSphere(Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            const int stacks = 5;
            const int slices = 8;
            for (int s = 0; s < stacks; s++)
            {
                float v0 = s / (float)stacks * Mathf.PI;
                float v1 = (s + 1) / (float)stacks * Mathf.PI;
                for (int i = 0; i < slices; i++)
                {
                    float u0 = i / (float)slices * Mathf.PI * 2f;
                    float u1 = (i + 1) / (float)slices * Mathf.PI * 2f;
                    Vector3 p00 = SpherePoint(v0, u0);
                    Vector3 p01 = SpherePoint(v0, u1);
                    Vector3 p11 = SpherePoint(v1, u1);
                    Vector3 p10 = SpherePoint(v1, u0);
                    int start = verts.Count;
                    Push(p00, p00, origin, rot, scale, color, verts, norms, cols);
                    Push(p01, p01, origin, rot, scale, color, verts, norms, cols);
                    Push(p11, p11, origin, rot, scale, color, verts, norms, cols);
                    Push(p10, p10, origin, rot, scale, color, verts, norms, cols);
                    tris.Add(start); tris.Add(start + 1); tris.Add(start + 2);
                    tris.Add(start); tris.Add(start + 2); tris.Add(start + 3);
                }
            }
        }

        static Vector3 SpherePoint(float v, float u)
        {
            float y = Mathf.Cos(v) * 0.5f;
            float r = Mathf.Sin(v) * 0.5f;
            return new Vector3(Mathf.Cos(u) * r, y, Mathf.Sin(u) * r);
        }

        static void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 n, Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            int start = verts.Count;
            Push(a, n, origin, rot, scale, color, verts, norms, cols);
            Push(b, n, origin, rot, scale, color, verts, norms, cols);
            Push(c, n, origin, rot, scale, color, verts, norms, cols);
            Push(d, n, origin, rot, scale, color, verts, norms, cols);
            tris.Add(start); tris.Add(start + 1); tris.Add(start + 2);
            tris.Add(start); tris.Add(start + 2); tris.Add(start + 3);
        }

        static void Fan(Vector3 a, Vector3 b, Vector3 c, Vector3 n, Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols, List<int> tris)
        {
            int start = verts.Count;
            Push(a, n, origin, rot, scale, color, verts, norms, cols);
            Push(b, n, origin, rot, scale, color, verts, norms, cols);
            Push(c, n, origin, rot, scale, color, verts, norms, cols);
            tris.Add(start); tris.Add(start + 1); tris.Add(start + 2);
        }

        static void Push(Vector3 local, Vector3 localN, Vector3 origin, Quaternion rot, Vector3 scale, Color32 color, List<Vector3> verts, List<Vector3> norms, List<Color32> cols)
        {
            verts.Add(origin + rot * Vector3.Scale(local, scale));
            Vector3 n = rot * new Vector3(localN.x / scale.x, localN.y / scale.y, localN.z / scale.z);
            if (n.sqrMagnitude < 1e-8f)
                n = Vector3.up;
            else
                n.Normalize();
            norms.Add(n);
            cols.Add(color);
        }

        static Color32 ToColor(int rgb, int emit)
        {
            byte r = (byte)((rgb >> 16) & 255);
            byte g = (byte)((rgb >> 8) & 255);
            byte b = (byte)(rgb & 255);
            return new Color32(r, g, b, (byte)(emit != 0 ? 255 : 0));
        }

        static bool SameParts(YardPart[] a, YardPart[] b)
        {
            if (a == null || b == null || a.Length != b.Length)
                return false;
            if (a.Length == 0)
                return true;
            return Near(a[0], b[0]) && Near(a[a.Length / 2], b[b.Length / 2]) && Near(a[a.Length - 1], b[b.Length - 1]);
        }

        static bool Near(YardPart a, YardPart b)
        {
            if (a == null || b == null)
                return false;
            return a.kind == b.kind && a.px == b.px && a.py == b.py && a.pz == b.pz && a.sx == b.sx && a.sy == b.sy && a.sz == b.sz;
        }
    }

    /// <summary>
    /// sim.js lamps(): lamp-1..15 child "light" intensity is 25 or 0. Town bulbs are not in that loop.
    /// </summary>
    public class YardLamps : MonoBehaviour, IYardLamps
    {
        public static bool BlackedOut;
        public Light[] Street;

        public void SetLit(bool on)
        {
            BlackedOut = !on;
            if (Street == null)
                return;
            for (int i = 0; i < Street.Length; i++)
            {
                if (Street[i] != null)
                    Street[i].intensity = on ? 25f : 0f;
            }
        }
    }

    /// <summary>
    /// scripts/flicker.js. holdUntil is milliseconds there because ctx.now() is ms.
    /// </summary>
    public class BulbFlicker : MonoBehaviour
    {
        public Light Lamp;
        public float Base = 9f;
        public bool RespectBlackout;
        float _holdUntil;
        float _acc;

        void Update()
        {
            _acc += Time.deltaTime;
            if (_acc < 0.1f)
                return;
            _acc = 0f;
            if (RespectBlackout && YardLamps.BlackedOut)
                return;
            if (Time.time < _holdUntil || Lamp == null)
                return;
            // Host RNG is not in the source. The branches match flicker.js.
            float r = UnityEngine.Random.value;
            float v = Base;
            float holdMs = 300f + r * 1800f;
            if (r < 0.18f)
            {
                v = Base * 0.08f;
                holdMs = 60f + r * 400f;
            }
            else if (r < 0.3f)
            {
                v = Base * 0.5f;
                holdMs = 80f + r * 200f;
            }
            _holdUntil = Time.time + holdMs / 1000f;
            Lamp.intensity = v;
        }
    }

    /// <summary>
    /// scripts/lamp-flicker.js. Sleeps are already seconds. Only lamp-13 uses it in the cells,
    /// and sim.js blacks that lamp out with the rest of lamp-1..15.
    /// </summary>
    public class SodiumFlicker : MonoBehaviour
    {
        public Light Lamp;
        public float Base = 25f;
        int _burst;
        float _wake;

        void Update()
        {
            if (Time.time < _wake)
                return;
            if (YardLamps.BlackedOut)
            {
                _wake = Time.time + 0.2f;
                return;
            }
            if (Lamp == null)
            {
                _wake = Time.time + 2f;
                return;
            }
            if (_burst > 0)
            {
                int left = _burst;
                _burst = left - 1;
                if (left == 1)
                    Lamp.intensity = Base;
                else if (UnityEngine.Random.value < 0.6f)
                    Lamp.intensity = Base * (0.03f + UnityEngine.Random.value * 0.3f);
                else
                    Lamp.intensity = Base * (0.7f + UnityEngine.Random.value * 0.3f);
                _wake = Time.time + 0.04f + UnityEngine.Random.value * 0.14f;
            }
            else
            {
                Lamp.intensity = Base;
                _burst = 3 + Mathf.FloorToInt(UnityEngine.Random.value * 7f);
                _wake = Time.time + 1.5f + UnityEngine.Random.value * 6f;
            }
        }
    }
}
