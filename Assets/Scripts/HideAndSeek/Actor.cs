// A body the round can move and damage. Stand-in transform: no CDN mesh.
// State fields follow scripts/player.js and the resetBody() in places/main/sim.js.
// Animator hook: VisualsChanged / DisguiseChanged / SwingStarted. IActorVisuals.Apply is optional.

using System;
using UnityEngine;

namespace HideAndSeek
{
    public class ConvinceTalk
    {
        public DreamerNpc Npc;
        public string Name;
        public float StartedAt;
        public float Period;
        public float Zone0;
        public float Zone1;
        public int Hits;
        public int Misses;
        public float PressAt;
        public float NoiseAt;
        public bool LastOk;
        public float FlashAt;
    }

    [DisallowMultipleComponent]
    public class Actor : MonoBehaviour
    {
        public string ActorId = "";
        public string UserId = "";
        public string DisplayName = "Player";
        public bool IsLocal;
        public bool IsBot;
        public bool IsNpc;

        public bool InMenu;
        public bool ShowTutorial;
        public bool SawTutorial;
        public string CharacterId = "own";
        public string MenuMessage;
        public float MenuMessageAt;

        public RoleKind Role = RoleKind.Lobby;
        public TeamKind Team = TeamKind.None;
        public bool Risen;
        public bool Revealed;
        public bool Dead;
        public int RoundJoined = -1;

        public float Hp = 100f;
        public float MaxHp = 100f;
        public int Scrap;
        public int Wire;
        public int Powder;

        public DisguiseForm Disguise = DisguiseForm.None;
        public string BorrowedName;

        public float StunUntil;
        public float RootUntil;
        public float AtkReadyAt;
        public float ClawReadyAt;
        public float AmbushReadyAt;
        public float PlantReadyAt;
        public float DarkReadyAt;
        public float LieReadyAt;
        public float LungeUntil;
        public float FadeUntil;
        public float HurtAt;

        public int Power;
        public float ScentReadyAt;
        public float LungeReadyAt;
        public float WailReadyAt;
        public float FadeReadyAt;

        public HidingSpot HiddenIn;
        public Vector3 HideFrom;
        public ConvinceTalk Talk;
        public int Dread;
        public string PromptVerb;
        public Component PromptTarget;

        public string LastMessage;
        public float MessageAt;
        public string ReadText;
        public string ReadPicture;
        public float ReadAt;

        public Vector3 DesiredVelocity;
        public float GroundY;

        public RoundDirector Director { get; private set; }

        public event Action VisualsChanged;
        public event Action<DisguiseForm, DisguiseForm> DisguiseChanged;
        public event Action SwingStarted;
        public event Action<string> PowerPerformed;
        public event Action<bool> HiddenChanged;

        public bool IsStunned => Time.time < StunUntil;
        public bool IsFaded => Time.time < FadeUntil;
        public bool IsRooted => Time.time < RootUntil || IsStunned || HiddenIn != null || Talk != null;

        public float CooldownReadyAt(string key)
        {
            switch (key)
            {
                case "scent": return ScentReadyAt;
                case "lunge": return LungeReadyAt;
                case "wail": return WailReadyAt;
                case "fade": return FadeReadyAt;
                default: return 0f;
            }
        }

        public void SetCooldownReadyAt(string key, float at)
        {
            switch (key)
            {
                case "scent": ScentReadyAt = at; break;
                case "lunge": LungeReadyAt = at; break;
                case "wail": WailReadyAt = at; break;
                case "fade": FadeReadyAt = at; break;
            }
        }

        public float PlanarSpeed(RoundRules rules)
        {
            float speed = BodyTune.LobbyWalkSpeed;
            if (Role == RoleKind.Hider)
                speed = rules.hiderSpeed;
            else if (Role == RoleKind.Mimic)
            {
                if (Disguise == DisguiseForm.Fisherman)
                    speed = rules.fishermanSpeed;
                else if (Disguise != DisguiseForm.None)
                    speed = rules.disguisedSpeed;
                else if (!Revealed)
                    speed = rules.hiderSpeed;
                else
                    speed = rules.seekerSpeed + Power * rules.hungerSpeedPer;
            }
            else if (Role == RoleKind.Ghost)
                speed = rules.ghostSpeed;
            if (IsRooted)
                speed = 0f;
            return speed;
        }

        public void Bind(RoundDirector director)
        {
            Director = director;
        }

        public void Say(string text)
        {
            LastMessage = text;
            MessageAt = Time.time;
        }

        public void ChangeDisguise(DisguiseForm next)
        {
            if (Disguise == next)
                return;
            DisguiseForm was = Disguise;
            Disguise = next;
            if (next == DisguiseForm.Fisherman && Director != null && Director.Dream != null)
                BorrowedName = Director.Dream.RandomFakeName();
            DisguiseChanged?.Invoke(was, next);
            NotifyVisuals();
        }

        public void NotifyVisuals()
        {
            VisualsChanged?.Invoke();
            if (Director != null)
                Director.ApplyVisuals(this);
        }

        public void NoteSwing()
        {
            SwingStarted?.Invoke();
        }

        void OnEnable()
        {
            if (string.IsNullOrEmpty(ActorId))
                ActorId = "actor-" + GetInstanceID();
            RoundDirector.Instance?.Register(this);
        }

        void OnDisable()
        {
            RoundDirector.Instance?.Unregister(this);
        }
    }

    /// <summary>
    /// Eases planar velocity the way player.js does (accel while the intent agrees, decel otherwise).
    /// YardMotion slides that step against the baked colliders and snaps the feet to the ground.
    /// Hidden bodies skip this; they are teleported to the hiding spot. Level hook: a CharacterController
    /// can replace Slide and Snap. The numbers (accel, gravity, jump) stay here.
    /// </summary>
    [RequireComponent(typeof(Actor))]
    public class ActorMotor : MonoBehaviour
    {
        Actor _actor;
        float _vertical;
        bool _grounded = true;

        public bool Grounded => _grounded;

        void Awake()
        {
            _actor = GetComponent<Actor>();
            _actor.GroundY = transform.position.y;
        }

        public void Drive(float moveX, float moveZ, Vector3 forward, Vector3 right, RoundRules rules)
        {
            float mag = Mathf.Sqrt(moveX * moveX + moveZ * moveZ);
            if (mag > 1f)
            {
                moveX /= mag;
                moveZ /= mag;
            }
            Vector3 wish = forward * moveZ + right * moveX;
            wish.y = 0f;
            float speed = _actor.PlanarSpeed(rules);
            _actor.DesiredVelocity = wish * speed;
            if (Time.time < _actor.LungeUntil && rules != null)
            {
                Vector3 f = YardMath.Forward(transform);
                _actor.DesiredVelocity = f * rules.lungeSpeed;
            }
        }

        public void Jump()
        {
            if (!_grounded || _actor.IsRooted)
                return;
            _vertical = BodyTune.JumpSpeed * BodyTune.JumpScale;
            _grounded = false;
        }

        void Update()
        {
            if (_actor.HiddenIn != null)
            {
                _actor.DesiredVelocity = Vector3.zero;
                _vertical = 0f;
                return;
            }

            float dt = Time.deltaTime;
            Vector3 v = _actor.DesiredVelocity;
            v.y = 0f;
            Vector3 delta = PlanarDelta(v, dt);
            Vector3 p = YardMotion.Slide(transform.position, delta);
            _vertical += BodyTune.YardGravity * dt;
            p.y += _vertical * dt;
            bool grounded = _grounded;
            YardMotion.Snap(ref p, ref _vertical, ref grounded, _actor.GroundY);
            _grounded = grounded;
            transform.position = p;
        }

        Vector3 _planar;

        Vector3 PlanarDelta(Vector3 intent, float dt)
        {
            bool along = Vector3.Dot(intent, _planar) > 0f
                || (_planar.sqrMagnitude < 1e-8f && intent.sqrMagnitude > 0f);
            float step = (along ? BodyTune.Acceleration : BodyTune.Deceleration) * dt;
            Vector3 delta = intent - _planar;
            float gap = delta.magnitude;
            float k = gap > step ? step / gap : 1f;
            _planar += delta * k;
            return new Vector3(_planar.x * dt, 0f, _planar.z * dt);
        }
    }
}
