// Named EOS surfaces. Implementations in this repo do not call Epic and do not succeed.
// IEosLobby is the shape that stands in for the SQL room list (ILobbyDirectory). It is not that list.

using System;
using System.Collections.Generic;

namespace HideAndSeek.EOS
{
    /// <summary>
    /// Connect Device ID login, or Auth Account Portal followed by a Connect product user.
    /// ProductUserId is empty until a real plugin login succeeds.
    /// </summary>
    public interface IEosAuth
    {
        bool IsLoggedIn { get; }
        string ProductUserId { get; }
        void LoginDeviceId(Action<bool, string> done);
        void LoginAccountPortal(Action<bool, string> done);
        void Logout();
    }

    /// <summary>Searchable lobby attributes. Keys are MAP and MODE. No extra modes are defined here.</summary>
    public static class EosLobbyAttributes
    {
        public const string Map = "MAP";
        public const string Mode = "MODE";
    }

    public struct EosLobbyQuery
    {
        public string Map;
        public string Mode;
    }

    public struct EosLobbyMember
    {
        public string ProductUserId;
        public bool IsHost;
    }

    public struct EosLobbyHit
    {
        public string LobbyId;
        public string HostProductUserId;
        public int Members;
        public string Map;
        public string Mode;
    }

    /// <summary>
    /// EOS Lobby interface, used as the replacement shape for <see cref="ILobbyDirectory"/>.
    /// Search filters are lobby attributes (map, mode). This is not a SQL query and not Netcode.
    /// IsOnline is false until a product user session exists. Callbacks on the stubs run inline and fail.
    /// </summary>
    public interface IEosLobby
    {
        bool IsOnline { get; }
        bool IsInLobby { get; }
        string LobbyId { get; }
        string HostProductUserId { get; }
        IReadOnlyList<EosLobbyMember> Members { get; }

        void Create(EosLobbyQuery query, Action<bool, string> done);
        void Join(string lobbyId, Action<bool, string> done);
        void Leave(Action<bool, string> done);
        void Search(EosLobbyQuery query, Action<bool, string, IReadOnlyList<EosLobbyHit>> done);
    }
}
