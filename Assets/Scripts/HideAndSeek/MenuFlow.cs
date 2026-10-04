// arrival.js + the menu half of scripts/ui.js, as logic with a plain OnGUI page.
// CONTINUE stores SawTutorial on the actor (player.state in Spawn). M will not show it again.
// JOIN / new lobby need ILobbyDirectory. Without one, this says the live list is Spawn-only.

using UnityEngine;

namespace HideAndSeek
{
    public class MenuFlow : MonoBehaviour
    {
        [Tooltip("Optional. The SQL lobby board in places/main/sim.js is not replicated here.")]
        public MonoBehaviour lobbyDirectory;

        public string RoomId = "local";

        ILobbyDirectory Directory => lobbyDirectory as ILobbyDirectory;

        public void BindArrival(Actor actor, bool joining)
        {
            if (actor == null)
                return;
            if (joining)
            {
                actor.InMenu = false;
                actor.ShowTutorial = false;
                return;
            }
            actor.InMenu = true;
            actor.ShowTutorial = !actor.SawTutorial;
        }

        public void ToggleMenu()
        {
            var actor = Local();
            if (actor == null)
                return;
            var dir = RoundDirector.Instance;
            if (!actor.InMenu)
            {
                if ((actor.Role == RoleKind.Hider || actor.Role == RoleKind.Mimic)
                    && dir != null && (dir.Phase == RoundPhase.Hide || dir.Phase == RoundPhase.Hunt))
                {
                    actor.Say("finish the round first");
                    return;
                }
                actor.InMenu = true;
                actor.ShowTutorial = false;
                return;
            }
            if (actor.ShowTutorial)
            {
                actor.ShowTutorial = false;
                actor.SawTutorial = true;
                return;
            }
            actor.InMenu = false;
        }

        public void ContinueTutorial()
        {
            var actor = Local();
            if (actor == null)
                return;
            actor.ShowTutorial = false;
            actor.SawTutorial = true;
        }

        public void ShowTutorial()
        {
            var actor = Local();
            if (actor == null)
                return;
            actor.InMenu = true;
            actor.ShowTutorial = true;
        }

        public void Pick(string id)
        {
            var actor = Local();
            var dir = RoundDirector.Instance;
            if (actor == null || dir == null || dir.dream == null)
                return;
            var chars = dir.GetComponent<LocalRoundDriver>();
            var catalog = chars != null ? chars.Characters : null;
            if (catalog != null && !catalog.Has(id))
                return;
            actor.CharacterId = id;
            actor.NotifyVisuals();
        }

        public void PlayHere()
        {
            var actor = Local();
            if (actor == null)
                return;
            actor.InMenu = false;
            actor.ShowTutorial = false;
        }

        public void RequestJoin(string room)
        {
            var actor = Local();
            if (actor == null)
                return;
            var dir = Directory;
            if (dir == null)
            {
                Fail(actor, "live lobbies are hosted on Spawn. this project has no room list.");
                return;
            }
            if (!dir.TryJoin(room, out string failure))
                Fail(actor, string.IsNullOrEmpty(failure) ? "that lobby is full" : failure);
            else
                actor.InMenu = false;
        }

        public void RequestNewLobby()
        {
            var actor = Local();
            if (actor == null)
                return;
            var dir = Directory;
            if (dir == null)
            {
                Fail(actor, "starting another lobby crosses rooms on Spawn. nothing is opened here.");
                return;
            }
            if (!dir.TryCreate(out string room, out string failure))
                Fail(actor, string.IsNullOrEmpty(failure) ? "that lobby is full" : failure);
            else
            {
                RoomId = room;
                actor.InMenu = false;
            }
        }

        static void Fail(Actor actor, string text)
        {
            actor.MenuMessage = text;
            actor.MenuMessageAt = Time.time;
            actor.InMenu = true;
        }

        Actor Local()
        {
            return RoundDirector.Instance != null ? RoundDirector.Instance.LocalActor : null;
        }

        void OnGUI()
        {
            var actor = Local();
            if (actor == null || !actor.InMenu)
                return;
            if (actor.ShowTutorial)
                DrawTutorial();
            else
                DrawMenu(actor);
        }

        void DrawTutorial()
        {
            GUILayout.BeginArea(new Rect(24f, 24f, 640f, 520f), GUI.skin.box);
            GUILayout.Label("HIDE AND SEEK");
            GUILayout.Label("BEFORE YOU PLAY");
            GUILayout.Label("One of you is the monster. They look like a player until they hurt someone, or someone sees it.");
            GUILayout.Label("On a human round, their claws stay locked for 30 seconds.");
            GUILayout.Label("Hiding: sneak. E searches loot. 1–8 crafts: traps, tripwires, barricades, smoke, scarecrows. Hide in a locker, a tarp, a dinghy, or the dumpster — E in, E out.");
            GUILayout.Label("Win by lasting until dawn, waking the dreamers, or killing every true mimic.");
            GUILayout.Label("WASD moves. Left click or F stabs. E uses what's in front of you. M opens the menu.");
            if (GUILayout.Button("CONTINUE"))
                ContinueTutorial();
            GUILayout.EndArea();
        }

        void DrawMenu(Actor actor)
        {
            var dir = RoundDirector.Instance;
            var driver = dir != null ? dir.GetComponent<LocalRoundDriver>() : null;
            var chars = driver != null ? driver.Characters : null;
            GUILayout.BeginArea(new Rect(24f, 24f, 720f, 640f), GUI.skin.box);
            GUILayout.Label("HIDE AND SEEK");
            GUILayout.Label("a dead cannery, a dream nobody wakes from, and one of you is not who they look like.");
            GUILayout.Label("WAKE UP AS");
            if (chars != null && chars.characters != null)
            {
                GUILayout.BeginHorizontal();
                for (int i = 0; i < chars.characters.Length; i++)
                {
                    var c = chars.characters[i];
                    if (c == null)
                        continue;
                    string mark = c.id == actor.CharacterId ? " [" + c.displayName + "]" : c.displayName;
                    if (GUILayout.Button(mark + "\n" + c.blurb))
                        Pick(c.id);
                }
                GUILayout.EndHorizontal();
            }
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("PLAY HERE"))
                PlayHere();
            if (GUILayout.Button("TUTORIAL"))
                ShowTutorial();
            string phase = dir != null ? dir.Phase.ToString().ToLowerInvariant() : "lobby";
            int n = dir != null ? dir.Actors.Count : 0;
            GUILayout.Label("this lobby · " + n + "/10 · " + phase);
            GUILayout.EndHorizontal();
            GUILayout.Label("OTHER LOBBIES");
            var board = Directory;
            if (board == null)
                GUILayout.Label("no other lobbies right now — the live list is the Spawn SQL board, not this project.");
            else
            {
                var rooms = board.List(RoomId);
                if (rooms == null || rooms.Count == 0)
                    GUILayout.Label("no other lobbies right now");
                else
                {
                    for (int i = 0; i < rooms.Count; i++)
                    {
                        var r = rooms[i];
                        GUILayout.BeginHorizontal();
                        GUILayout.Label(r.RoomId + "  " + r.Players + "/10  " + r.Phase);
                        if (r.Players < 10 && GUILayout.Button("JOIN"))
                            RequestJoin(r.RoomId);
                        GUILayout.EndHorizontal();
                    }
                }
            }
            if (GUILayout.Button("+ START A NEW LOBBY"))
                RequestNewLobby();
            if (!string.IsNullOrEmpty(actor.MenuMessage) && Time.time - actor.MenuMessageAt < 4f)
                GUILayout.Label(actor.MenuMessage);
            GUILayout.Label("M reopens this menu between rounds");
            GUILayout.EndArea();
        }
    }
}
