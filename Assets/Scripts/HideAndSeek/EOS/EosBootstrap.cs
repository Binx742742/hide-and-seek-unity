// Idle until a human session has real portal IDs and the EOS_SDK define.
// Solo and bot rounds (humanPlayers < 2, or soloBotRound) never log in.
// This component is not on Bootstrap.unity. Add it when you want the check.

using UnityEngine;

namespace HideAndSeek.EOS
{
    public class EosBootstrap : MonoBehaviour
    {
        [Tooltip("Assets/Settings/EosConfig.asset is the placeholder. Real ids belong on a local asset.")]
        public EosConfig config;

        public IEosAuth Auth { get; private set; }
        public IEosLobby Lobby { get; private set; }
        public bool StayedOffline { get; private set; }
        public string Status { get; private set; }

        void Awake()
        {
#if EOS_SDK
            Auth = new EosAuthSdk(config);
            Lobby = new EosLobbySdk(config);
#else
            Auth = new EosAuthStub();
            Lobby = new EosLobbyStub();
#endif
            var directory = GetComponent<EosLobbyDirectory>();
            if (directory == null)
                directory = gameObject.AddComponent<EosLobbyDirectory>();
            directory.Bind(Lobby);
            StayedOffline = true;
            Status = "idle";
        }

        void Start()
        {
            if (SoloOrBot())
            {
                StayedOffline = true;
                Status = "solo/bot round stays offline";
                Debug.Log("[EOS] Solo or bot round. EOS stays offline.");
                return;
            }
            if (config == null || !config.HasPortalIds)
            {
                StayedOffline = true;
                Status = "portal IDs are placeholders";
                Debug.Log("[EOS] Portal IDs are not filled. See docs/eos-setup.md.");
                return;
            }
#if EOS_SDK
            StayedOffline = true;
            Status = "EOS_SDK is defined; plugin calls are not filled in";
            Debug.Log("[EOS] IDs are set and EOS_SDK is defined. EosSdkBridge still no-ops until the official plugin calls are pasted in. See docs/eos-setup.md.");
#else
            StayedOffline = true;
            Status = "EOS_SDK is not defined";
            Debug.Log("[EOS] Portal IDs are set, but this build has no EOS_SDK define. Offline play continues. See docs/eos-setup.md.");
#endif
        }

        bool SoloOrBot()
        {
            var director = RoundDirector.Instance;
            var driver = GetComponent<LocalRoundDriver>();
            if (driver == null && director != null)
                driver = director.GetComponent<LocalRoundDriver>();
            if (driver != null)
                return driver.humanPlayers < 2;
            if (director != null)
                return director.soloBotRound;
            return true;
        }
    }
}
