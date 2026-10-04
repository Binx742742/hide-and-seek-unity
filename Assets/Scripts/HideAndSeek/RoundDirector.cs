// Multiplayer, models, and the cannery yard are NOT ported yet.
// This is a local phase-timer stub so a Unity scene can drive Lobby → Hide → Hunt → End
// using the numbers in RoundRules (from Spawn rules.yml). No netcode.

using UnityEngine;

namespace HideAndSeek
{
    public enum RoundPhase
    {
        Lobby,
        Hide,   // bot-only cage phase; skipped for human rounds
        Hunt,
        End
    }

    /// <summary>
    /// Drop on an empty GameObject. Assign RoundRules (or leave null to use runtime defaults).
    /// Human rounds: skip Hide and lock claws for rules.startLockSeconds from Hunt start.
    /// Solo bot rounds: still use Hide (cage) then Hunt.
    /// </summary>
    public class RoundDirector : MonoBehaviour
    {
        [Tooltip("Leave empty to use RoundRules.CreateRuntimeDefaults() from rules.yml numbers.")]
        public RoundRules rules;

        [Tooltip("If true, run Hide (bot cage). If false (human round), go Lobby → Hunt and apply startLock.")]
        public bool soloBotRound = true;

        public RoundPhase Phase { get; private set; } = RoundPhase.Lobby;
        public float PhaseTimeRemaining { get; private set; }
        public float ClawLockRemaining { get; private set; }
        public bool ClawsLocked => ClawLockRemaining > 0f;

        void Awake()
        {
            if (rules == null)
                rules = RoundRules.CreateRuntimeDefaults();
        }

        void Start()
        {
            EnterLobby();
        }

        void Update()
        {
            float dt = Time.deltaTime;

            if (ClawLockRemaining > 0f)
                ClawLockRemaining = Mathf.Max(0f, ClawLockRemaining - dt);

            if (PhaseTimeRemaining <= 0f)
                return;

            PhaseTimeRemaining -= dt;
            if (PhaseTimeRemaining > 0f)
                return;

            AdvancePhase();
        }

        public void EnterLobby()
        {
            Phase = RoundPhase.Lobby;
            PhaseTimeRemaining = rules.lobbySeconds;
            ClawLockRemaining = 0f;
            Debug.Log($"[RoundDirector] Lobby ({rules.lobbySeconds}s)");
        }

        /// <summary>
        /// Human rounds skip Hide: go straight to Hunt and lock claws for startLockSeconds.
        /// Solo bot rounds use Hide (mimic caged) then Hunt without the human startLock path.
        /// </summary>
        void AdvancePhase()
        {
            switch (Phase)
            {
                case RoundPhase.Lobby:
                    if (soloBotRound)
                        EnterHide();
                    else
                        EnterHunt(applyStartLock: true);
                    break;

                case RoundPhase.Hide:
                    EnterHunt(applyStartLock: false);
                    break;

                case RoundPhase.Hunt:
                    EnterEnd();
                    break;

                case RoundPhase.End:
                    EnterLobby();
                    break;
            }
        }

        void EnterHide()
        {
            // Bot-only: mimic caged on the pier for hideSeconds (rules.yml).
            Phase = RoundPhase.Hide;
            PhaseTimeRemaining = rules.hideSeconds;
            ClawLockRemaining = 0f;
            Debug.Log($"[RoundDirector] Hide / bot cage ({rules.hideSeconds}s)");
        }

        void EnterHunt(bool applyStartLock)
        {
            Phase = RoundPhase.Hunt;
            PhaseTimeRemaining = rules.huntSeconds;
            // Human rounds: claws locked for reveal.startLock from hunt start.
            ClawLockRemaining = applyStartLock ? rules.startLockSeconds : 0f;
            Debug.Log(applyStartLock
                ? $"[RoundDirector] Hunt ({rules.huntSeconds}s), claws locked {rules.startLockSeconds}s"
                : $"[RoundDirector] Hunt ({rules.huntSeconds}s)");
        }

        void EnterEnd()
        {
            Phase = RoundPhase.End;
            PhaseTimeRemaining = rules.endSeconds;
            ClawLockRemaining = 0f;
            Debug.Log($"[RoundDirector] End ({rules.endSeconds}s)");
        }

        /// <summary>Manual kick: start a human-style round (skip Hide, apply startLock).</summary>
        public void BeginHumanRound()
        {
            soloBotRound = false;
            EnterHunt(applyStartLock: true);
        }

        /// <summary>Manual kick: start a solo bot round (Hide then Hunt).</summary>
        public void BeginSoloBotRound()
        {
            soloBotRound = true;
            EnterHide();
        }
    }
}
