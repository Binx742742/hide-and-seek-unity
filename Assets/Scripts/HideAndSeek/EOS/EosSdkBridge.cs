// Compiled only when the player define EOS_SDK is set.
// This file does not reference Epic.OnlineServices or PlayEveryWare, so the define
// still builds before the official plugin is imported. Paste those calls here.
// Do not report success from the placeholders below.

#if EOS_SDK
using System;
using System.Collections.Generic;

namespace HideAndSeek.EOS
{
    public static class EosSdkBridge
    {
        public static void LoginDeviceId(EosConfig config, Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste Connect.CreateDeviceId and Connect.Login (Device ID) into EosSdkBridge.LoginDeviceId. See docs/eos-setup.md.");
        }

        public static void LoginAccountPortal(EosConfig config, Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste Auth Account Portal plus Connect login into EosSdkBridge.LoginAccountPortal. See docs/eos-setup.md.");
        }

        public static void Logout(Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste the plugin logout into EosSdkBridge.Logout.");
        }

        public static void Create(EosConfig config, EosLobbyQuery query, Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste Lobby create (attributes MAP and MODE) into EosSdkBridge.Create.");
        }

        public static void Join(EosConfig config, string lobbyId, Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste Lobby join into EosSdkBridge.Join.");
        }

        public static void Leave(EosConfig config, Action<bool, string> done)
        {
            Fail(done, "EOS_SDK is set. Paste Lobby leave into EosSdkBridge.Leave.");
        }

        public static void Search(EosConfig config, EosLobbyQuery query, Action<bool, string, IReadOnlyList<EosLobbyHit>> done)
        {
            if (done != null)
                done(false, "EOS_SDK is set. Paste LobbySearch (MAP and MODE) into EosSdkBridge.Search.", new EosLobbyHit[0]);
        }

        static void Fail(Action<bool, string> done, string reason)
        {
            if (done != null)
                done(false, reason);
        }
    }

    public sealed class EosAuthSdk : IEosAuth
    {
        readonly EosConfig _config;

        public EosAuthSdk(EosConfig config)
        {
            _config = config;
        }

        public bool IsLoggedIn { get { return false; } }
        public string ProductUserId { get { return ""; } }

        public void LoginDeviceId(Action<bool, string> done)
        {
            EosSdkBridge.LoginDeviceId(_config, done);
        }

        public void LoginAccountPortal(Action<bool, string> done)
        {
            EosSdkBridge.LoginAccountPortal(_config, done);
        }

        public void Logout()
        {
            EosSdkBridge.Logout(null);
        }
    }

    public sealed class EosLobbySdk : IEosLobby
    {
        static readonly EosLobbyMember[] NoMembers = new EosLobbyMember[0];
        readonly EosConfig _config;

        public EosLobbySdk(EosConfig config)
        {
            _config = config;
        }

        public bool IsOnline { get { return false; } }
        public bool IsInLobby { get { return false; } }
        public string LobbyId { get { return ""; } }
        public string HostProductUserId { get { return ""; } }
        public IReadOnlyList<EosLobbyMember> Members { get { return NoMembers; } }

        public void Create(EosLobbyQuery query, Action<bool, string> done)
        {
            EosSdkBridge.Create(_config, query, done);
        }

        public void Join(string lobbyId, Action<bool, string> done)
        {
            EosSdkBridge.Join(_config, lobbyId, done);
        }

        public void Leave(Action<bool, string> done)
        {
            EosSdkBridge.Leave(_config, done);
        }

        public void Search(EosLobbyQuery query, Action<bool, string, IReadOnlyList<EosLobbyHit>> done)
        {
            EosSdkBridge.Search(_config, query, done);
        }
    }
}
#endif
