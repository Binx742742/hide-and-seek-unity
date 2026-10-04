// Swaps a child mesh when VisualsChanged or DisguiseChanged fires.
// The Actor stays on this object. Nothing gameplay-related is stored on the mesh,
// so a later Animator or CDN model can replace the child "StandInVisual".
// If RoundDirector.visualHook implements IActorVisuals, this stand-in steps aside.

using UnityEngine;

namespace HideAndSeek
{
    [RequireComponent(typeof(Actor))]
    public class ActorVisualStandIn : MonoBehaviour
    {
        public const string ChildName = "StandInVisual";

        Actor _a;
        Renderer _root;
        bool _hidden;

        void Awake()
        {
            _a = GetComponent<Actor>();
            _root = GetComponent<Renderer>();
        }

        void OnEnable()
        {
            if (_a == null)
                _a = GetComponent<Actor>();
            _a.VisualsChanged += Refresh;
            _a.DisguiseChanged += OnDisguise;
            Refresh();
        }

        void OnDisable()
        {
            if (_a == null)
                return;
            _a.VisualsChanged -= Refresh;
            _a.DisguiseChanged -= OnDisguise;
        }

        void OnDisguise(DisguiseForm from, DisguiseForm to)
        {
            Refresh();
        }

        void LateUpdate()
        {
            if (_a == null || HookOwns())
                return;
            bool hide = _a.IsFaded || _a.Role == RoleKind.Ghost;
            if (hide == _hidden)
                return;
            _hidden = hide;
            if (hide)
                SetVisualEnabled(false);
            else
                Refresh();
        }

        void Refresh()
        {
            if (_a == null)
                return;
            if (HookOwns())
            {
                ClearChild();
                if (_root != null)
                    _root.enabled = true;
                return;
            }

            ClearChild();
            string alias = null;
            // Revealed, undisguised mimic uses scripts/gen/mimic.js. Ordinary bodies stay capsules.
            // Fisherman is a CDN model in the Spawn templates, so it stays the capsule.
            if (_a.Role == RoleKind.Mimic && _a.Revealed && _a.Disguise == DisguiseForm.None)
                alias = "mimic";
            else
                alias = Alias(_a.Disguise);

            bool dressed = alias != null && YardForms.Dress(gameObject, alias);
            if (!dressed)
                MakeCapsule();
            if (_root != null)
                _root.enabled = false;

            _hidden = _a.IsFaded || _a.Role == RoleKind.Ghost;
            if (_hidden)
                SetVisualEnabled(false);
        }

        static string Alias(DisguiseForm form)
        {
            switch (form)
            {
                case DisguiseForm.Crate: return "crate";
                case DisguiseForm.Barrel: return "barrel";
                case DisguiseForm.Loot: return "loot";
                case DisguiseForm.Locker: return "locker";
                case DisguiseForm.Tarp: return "tarp";
                case DisguiseForm.Dinghy: return "dinghy";
                case DisguiseForm.Dumpster: return "dumpster";
                default: return null;
            }
        }

        bool HookOwns()
        {
            return _a.Director != null && _a.Director.visualHook is IActorVisuals;
        }

        void MakeCapsule()
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = ChildName;
            go.transform.SetParent(transform, false);
            // Root sits on the feet after YardMotion.Snap. The capsule mesh is centred, so lift it.
            go.transform.localPosition = new Vector3(0f, 1f, 0f);
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one;
            var col = go.GetComponent<Collider>();
            if (col != null)
                Destroy(col);
            var rend = go.GetComponent<Renderer>();
            if (rend != null && _root != null && _root.sharedMaterial != null)
                rend.sharedMaterial = _root.sharedMaterial;
        }

        void ClearChild()
        {
            var child = transform.Find(ChildName);
            if (child != null)
                Destroy(child.gameObject);
        }

        void SetVisualEnabled(bool on)
        {
            var child = transform.Find(ChildName);
            if (child == null)
                return;
            var rends = child.GetComponentsInChildren<Renderer>();
            for (int i = 0; i < rends.Length; i++)
                rends[i].enabled = on;
        }
    }
}
