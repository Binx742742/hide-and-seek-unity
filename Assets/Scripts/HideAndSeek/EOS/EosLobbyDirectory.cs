// ILobbyDirectory backed by IEosLobby. No SQL. An offline session adds no rooms.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace HideAndSeek.EOS
{
    /// <summary>
    /// Drop-in for <see cref="MenuFlow"/>'s lobby directory once EOS is actually connected.
    /// List is a cache. It stays empty while search has not returned hits.
    /// TryCreate and TryJoin fail closed when the lobby service is offline or the callback is not inline.
    /// </summary>
    public class EosLobbyDirectory : MonoBehaviour, ILobbyDirectory
    {
        [Tooltip("Passed through to IEosLobby.Create / Search as the MAP attribute. Empty until you set one.")]
        public string mapAttribute = "";

        [Tooltip("Passed through to IEosLobby.Create / Search as the MODE attribute. Empty until you set one.")]
        public string modeAttribute = "";

        readonly List<LobbyListing> _cache = new List<LobbyListing>();
        IEosLobby _lobby;

        public void Bind(IEosLobby lobby)
        {
            _lobby = lobby;
        }

        public IReadOnlyList<LobbyListing> List(string currentRoomId)
        {
            if (_cache.Count == 0 || string.IsNullOrEmpty(currentRoomId))
                return _cache;
            var filtered = new List<LobbyListing>(_cache.Count);
            for (int i = 0; i < _cache.Count; i++)
            {
                if (_cache[i].RoomId != currentRoomId)
                    filtered.Add(_cache[i]);
            }
            return filtered;
        }

        public bool TryJoin(string roomId, out string failure)
        {
            IEosLobby lobby = Resolve();
            if (!Ready(lobby, out failure))
                return false;
            bool called = false;
            bool ok = false;
            string err = null;
            lobby.Join(roomId, delegate (bool success, string message)
            {
                called = true;
                ok = success;
                err = message;
            });
            if (!called)
            {
                failure = "EOS join did not finish inline. Call IEosLobby.Join. This menu hook does not wait on the network.";
                return false;
            }
            failure = err;
            return ok;
        }

        public bool TryCreate(out string roomId, out string failure)
        {
            roomId = null;
            IEosLobby lobby = Resolve();
            if (!Ready(lobby, out failure))
                return false;
            bool called = false;
            bool ok = false;
            string err = null;
            string id = null;
            var query = new EosLobbyQuery { Map = mapAttribute, Mode = modeAttribute };
            lobby.Create(query, delegate (bool success, string message)
            {
                called = true;
                ok = success;
                err = message;
                if (success)
                    id = lobby.LobbyId;
            });
            if (!called)
            {
                failure = "EOS create did not finish inline. Call IEosLobby.Create. This menu hook does not open a SQL row.";
                return false;
            }
            roomId = id;
            failure = err;
            return ok;
        }

        /// <summary>
        /// Asks IEosLobby to search by MAP and MODE. Offline search leaves the cache empty.
        /// MenuFlow.List does not call this.
        /// </summary>
        public void Refresh(Action<bool, string> done)
        {
            IEosLobby lobby = Resolve();
            string failure;
            if (!Ready(lobby, out failure))
            {
                if (done != null)
                    done(false, failure);
                return;
            }
            var query = new EosLobbyQuery { Map = mapAttribute, Mode = modeAttribute };
            lobby.Search(query, delegate (bool success, string message, IReadOnlyList<EosLobbyHit> hits)
            {
                if (success && hits != null)
                    Replace(hits);
                if (done != null)
                    done(success, message);
            });
        }

        IEosLobby Resolve()
        {
            if (_lobby != null)
                return _lobby;
            var boot = GetComponent<EosBootstrap>();
            if (boot != null)
                _lobby = boot.Lobby;
            return _lobby;
        }

        static bool Ready(IEosLobby lobby, out string failure)
        {
            if (lobby == null || !lobby.IsOnline)
            {
                failure = "EOS lobby is offline. This is not the Spawn SQL board. See docs/eos-setup.md.";
                return false;
            }
            failure = null;
            return true;
        }

        void Replace(IReadOnlyList<EosLobbyHit> hits)
        {
            _cache.Clear();
            for (int i = 0; i < hits.Count; i++)
            {
                var hit = hits[i];
                if (string.IsNullOrEmpty(hit.LobbyId))
                    continue;
                _cache.Add(new LobbyListing
                {
                    RoomId = hit.LobbyId,
                    Players = hit.Members,
                    Phase = string.IsNullOrEmpty(hit.Mode) ? "" : hit.Mode
                });
            }
        }
    }
}
