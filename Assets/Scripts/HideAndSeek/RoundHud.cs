// Plain readout of the ui.js HUD: phase, clock, hp, craft, convince needle, end card.
// Not a skinned screen. Buttons call the same ActorActions the keys call.

using UnityEngine;

namespace HideAndSeek
{
    public class RoundHud : MonoBehaviour
    {
        void OnGUI()
        {
            var dir = RoundDirector.Instance;
            if (dir == null)
                return;
            var me = dir.LocalActor;
            if (me != null && me.InMenu)
                return;

            float now = Time.time;
            string phase = dir.Phase.ToString().ToUpperInvariant();
            string clock = YardMath.Clock(dir.PhaseTimeRemaining);
            if (dir.Phase == RoundPhase.Lobby && dir.simulateMatch && dir.EligibleHumans().Count == 0)
                clock = "—";

            GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 160f, 8f, 320f, 80f));
            GUILayout.Label(phase);
            GUILayout.Label(clock);
            if (dir.Phase == RoundPhase.Hide || dir.Phase == RoundPhase.Hunt)
                GUILayout.Label(dir.CountLivingHiders() + " hiders alive");
            else if (dir.Phase == RoundPhase.Lobby)
                GUILayout.Label(dir.EligibleHumans().Count < 2 ? "alone: something else will hunt you" : "one of you will be the mimic. nobody will know who");
            GUILayout.EndArea();

            if ((dir.Phase == RoundPhase.Hide || dir.Phase == RoundPhase.Hunt) && dir.DreamerTotal > 0)
                GUI.Label(new Rect(Screen.width * 0.5f - 120f, 88f, 240f, 24f),
                    "clues " + dir.Clues + "/" + dir.ClueTotal + "    awake " + dir.DreamersAwake + "/" + dir.DreamerTotal);

            int feedY = 16;
            for (int i = 0; i < dir.Feed.Count; i++)
            {
                if (now - dir.Feed[i].At > 7f || dir.Phase == RoundPhase.Lobby)
                    continue;
                GUI.Label(new Rect(16f, feedY, 520f, 22f), dir.Feed[i].Text);
                feedY += 20;
            }

            if (me == null)
                return;

            if (!string.IsNullOrEmpty(me.LastMessage) && now - me.MessageAt < 2.6f)
                GUI.Label(new Rect(Screen.width * 0.5f - 220f, Screen.height * 0.62f, 440f, 24f), me.LastMessage);

            if (!string.IsNullOrEmpty(me.ReadText) && now - me.ReadAt < 6f)
                GUI.Label(new Rect(Screen.width * 0.5f - 220f, Screen.height * 0.28f, 440f, 64f), me.ReadText);

            if (me.Talk != null)
                DrawTalk(me);

            if (me.Role == RoleKind.Hider)
                DrawHider(me, dir);
            else if (me.Role == RoleKind.Mimic)
                DrawMimic(me, dir, now);
            else if (me.Role == RoleKind.Ghost && dir.Phase != RoundPhase.End)
                GUI.Label(new Rect(16f, Screen.height - 80f, 360f, 40f),
                    (me.Team == TeamKind.Mimic ? "PUT TO REST" : "TAKEN") + "\nyou drift unseen. watch the others.");

            if (!string.IsNullOrEmpty(me.PromptVerb))
                GUI.Label(new Rect(Screen.width * 0.5f - 80f, Screen.height * 0.72f, 240f, 24f), "E  " + me.PromptVerb);

            if (dir.Phase == RoundPhase.End)
            {
                string title = dir.Winner == RoundWinner.Mimic ? "THE MIMIC FEEDS" : "THE HIDERS LIVE";
                string you = dir.LocalWon() ? "YOU WON" : "YOU LOST";
                GUI.Label(new Rect(Screen.width * 0.5f - 200f, Screen.height * 0.35f, 400f, 80f),
                    title + "\n" + (dir.Why ?? "") + "\n" + you + "\nnext round soon");
            }
        }

        void DrawTalk(Actor me)
        {
            var tk = me.Talk;
            float u = ConvinceMath.Needle(tk.StartedAt, tk.Period, Time.time);
            GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 200f, Screen.height * 0.72f, 400f, 90f), GUI.skin.box);
            GUILayout.Label("WAKE " + (tk.Name ?? "").ToUpperInvariant() + "   hits " + tk.Hits + "/3   misses " + tk.Misses);
            GUILayout.Label("needle " + u.ToString("0.00") + "   gold " + tk.Zone0.ToString("0.00") + "–" + tk.Zone1.ToString("0.00"));
            var actions = me.GetComponent<ActorActions>();
            if (actions != null && GUILayout.Button("say it (E)"))
                actions.JudgeTalk(RoundDirector.Instance);
            GUILayout.EndArea();
        }

        void DrawHider(Actor me, RoundDirector dir)
        {
            var actions = me.GetComponent<ActorActions>();
            GUILayout.BeginArea(new Rect(16f, Screen.height - 210f, 560f, 200f), GUI.skin.box);
            string plate = "HIDER · " + Mathf.Max(0f, me.Hp).ToString("0") + " HP";
            if (me.Smoked)
                plate += " · in smoke";
            GUILayout.Label(plate);
            GUILayout.Label("scrap " + me.Scrap + "   wire " + me.Wire + "   powder " + me.Powder);
            if (me.HiddenIn != null)
                GUILayout.Label("hidden · hold your breath · E to climb out");
            float marked = MarkedMimic(dir);
            if (marked > 0f)
                GUILayout.Label("marked through the walls · " + Mathf.CeilToInt(marked) + "s");
            GUILayout.Label("E search · click stab · 1–8 craft");
            GUILayout.BeginHorizontal();
            CraftButton(actions, CraftKind.Trap, "1 Bear trap");
            CraftButton(actions, CraftKind.Bait, "2 Powder keg");
            CraftButton(actions, CraftKind.Lure, "3 Rattle");
            CraftButton(actions, CraftKind.Flash, "4 Flash");
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            CraftButton(actions, CraftKind.Tripwire, "5 Tripwire");
            CraftButton(actions, CraftKind.Barricade, "6 Barricade");
            CraftButton(actions, CraftKind.Smoke, "7 Smoke");
            CraftButton(actions, CraftKind.Scarecrow, "8 Scarecrow");
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        static float MarkedMimic(RoundDirector dir)
        {
            float left = 0f;
            float now = Time.time;
            var actors = dir.Actors;
            for (int i = 0; i < actors.Count; i++)
            {
                var a = actors[i];
                if (a == null || a.Role != RoleKind.Mimic)
                    continue;
                left = Mathf.Max(left, a.MarkedUntil - now);
            }
            return left;
        }

        void DrawMimic(Actor me, RoundDirector dir, float now)
        {
            float top = me.Risen ? dir.Rules.risenHp : dir.Rules.seekerHp;
            var actions = me.GetComponent<ActorActions>();
            GUILayout.BeginArea(new Rect(16f, Screen.height - 230f, 560f, 220f), GUI.skin.box);
            string plate = me.Risen ? "RISEN · YOU HUNT NOW" : me.Revealed ? "THE MIMIC · REVEALED" : "THE MIMIC · HIDDEN";
            GUILayout.Label(plate + " · " + Mathf.Max(0f, me.Hp).ToString("0") + "/" + top.ToString("0") + " HP");
            string form = "you are " + YardMath.DisguiseLabel(me.Disguise);
            if (!string.IsNullOrEmpty(me.FaceName) && !me.Revealed)
                form += " · wearing " + me.FaceName;
            GUILayout.Label(form);
            GUILayout.Label("power " + me.Power + "/5");
            if (!me.Risen && me.ClawReadyAt > now)
                GUILayout.Label("YOU ARE THE MIMIC. claws in " + YardMath.Clock(me.ClawReadyAt - now));
            else if (!me.Revealed && !me.Risen)
                GUILayout.Label(me.AmbushReadyAt > now
                    ? "hidden · killing strike in " + Mathf.CeilToInt(me.AmbushReadyAt - now) + "s"
                    : "hidden · killing strike ready");
            if (actions != null && GUILayout.Button("POWER (best ready)"))
                actions.UseBestPower();
            GUILayout.BeginHorizontal();
            TrickButton(actions, "echo", "B Voice");
            TrickButton(actions, "snare", "H Snare");
            TrickButton(actions, "steal", "J Face");
            GUILayout.EndHorizontal();
            GUILayout.Label("Q form · E eat · R fake · T dark · G lie · F/click claw · C V X Z");
            GUILayout.EndArea();
        }

        static void TrickButton(ActorActions actions, string key, string label)
        {
            if (actions == null)
                return;
            if (GUILayout.Button(label))
                actions.Trick(key);
        }

        static void CraftButton(ActorActions actions, CraftKind kind, string label)
        {
            if (actions == null)
                return;
            GUI.enabled = actions.CanAfford(kind);
            if (GUILayout.Button(label))
                actions.Craft(kind);
            GUI.enabled = true;
        }
    }
}
