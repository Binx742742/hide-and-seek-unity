// Default implementations. They compile with no Epic package and never report success.

using System;
using System.Collections.Generic;

namespace HideAndSeek.EOS
{
    public sealed class EosAuthStub : IEosAuth
    {
        public bool IsLoggedIn { get { return false; } }
        public string ProductUserId { get { return ""; } }

        public void LoginDeviceId(Action<bool, string> done)
        {
            Fail(done, "Device ID login needs the EOS plugin and portal IDs. See docs/eos-setup.md.");
        }

        public void LoginAccountPortal(Action<bool, string> done)
        {
            Fail(done, "Account Portal login needs the EOS plugin and portal IDs. See docs/eos-setup.md.");
        }

        public void Logout()
        {
        }

        static void Fail(Action<bool, string> done, string reason)
        {
            if (done != null)
                done(false, reason);
        }
    }

    public sealed class EosLobbyStub : IEosLobby
    {
        static readonly EosLobbyMember[] NoMembers = new EosLobbyMember[0];
        static readonly EosLobbyHit[] NoHits = new EosLobbyHit[0];

        public bool IsOnline { get { return false; } }
        public bool IsInLobby { get { return false; } }
        public string LobbyId { get { return ""; } }
        public string HostProductUserId { get { return ""; } }
        public IReadOnlyList<EosLobbyMember> Members { get { return NoMembers; } }

        public void Create(EosLobbyQuery query, Action<bool, string> done)
        {
            Fail(done, "EOS lobby create is offline. This does not write the Spawn SQL board. See docs/eos-setup.md.");
        }

        public void Join(string lobbyId, Action<bool, string> done)
        {
            Fail(done, "EOS lobby join is offline. See docs/eos-setup.md.");
        }

        public void Leave(Action<bool, string> done)
        {
            Fail(done, "EOS lobby leave is offline. See docs/eos-setup.md.");
        }

        public void Search(EosLobbyQuery query, Action<bool, string, IReadOnlyList<EosLobbyHit>> done)
        {
            if (done != null)
                done(false, "EOS lobby search is offline. See docs/eos-setup.md.", NoHits);
        }

        static void Fail(Action<bool, string> done, string reason)
        {
            if (done != null)
                done(false, reason);
        }
    }
}
