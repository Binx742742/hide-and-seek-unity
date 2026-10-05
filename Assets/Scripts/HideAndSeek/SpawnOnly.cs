// Surfaces that stay Spawn-only. These are the hooks a later port would fill.
// They are not called with a pretend success.

using System.Collections.Generic;

namespace HideAndSeek
{
    public struct LobbyListing
    {
        public string RoomId;
        public int Players;
        public string Phase;
    }

    /// <summary>
    /// places/main/sim.js postBoard writes the SQL table `lobbies` every 4 s and drops rows older than 20 s.
    /// This Unity project has no Spawn room directory and does not query that table.
    /// HideAndSeek.EOS.EosLobbyDirectory is the EOS-shaped stand-in. It stays empty until the plugin
    /// and portal IDs are filled (docs/eos-setup.md). Leave this unassigned until then.
    /// </summary>
    public interface ILobbyDirectory
    {
        IReadOnlyList<LobbyListing> List(string currentRoomId);
        bool TryJoin(string roomId, out string failure);
        bool TryCreate(out string roomId, out string failure);
    }

    /// <summary>
    /// Spawn proximity voice is not in the gameplay scripts as a local system (design.md still lists it as open).
    /// There is no distance model to transcribe, so this stays an empty hook.
    /// </summary>
    public interface IProximityVoice
    {
        void SetListener(Actor self);
        void SetAudible(Actor speaker, bool audible);
    }

    /// <summary>
    /// templates/player.js, templates/creature.js and templates/dream.js swap CDN models.
    /// Actor.VisualsChanged is the event. Implement this to parent a mesh; do not expect a built-in loader.
    /// </summary>
    public interface IActorVisuals
    {
        void Apply(Actor actor);
    }

    /// <summary>
    /// sim.js lamps() writes lamp-1..15 intensity to 25 or 0. The yard lights are level content.
    /// RoundDirector.BlackoutChanged is the same moment.
    /// </summary>
    public interface IYardLamps
    {
        void SetLit(bool on);
    }
}
