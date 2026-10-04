// Key map from world.config.yaml inputs.actions.
// `power` has no keyboard key there (touch slot only). The HUD button calls UseBestPower.
// Camera orbit itself is StandInCamera; this only faces the body along that yaw.

using UnityEngine;

namespace HideAndSeek
{
    [RequireComponent(typeof(Actor))]
    public class LocalPlayerInput : MonoBehaviour
    {
        Actor _actor;
        ActorMotor _motor;
        ActorActions _actions;
        StandInCamera _cam;

        void Awake()
        {
            _actor = GetComponent<Actor>();
            _motor = GetComponent<ActorMotor>();
            _actions = GetComponent<ActorActions>();
        }

        void Update()
        {
            if (!_actor.IsLocal)
                return;
            if (_cam == null && RoundDirector.Instance != null)
                _cam = RoundDirector.Instance.GetComponent<StandInCamera>();
            var dir = _actor.Director != null ? _actor.Director : RoundDirector.Instance;
            var menu = dir != null ? dir.GetComponent<MenuFlow>() : null;

            if (Input.GetKeyDown(KeyCode.M))
            {
                if (menu != null)
                    menu.ToggleMenu();
                return;
            }

            if (_actor.InMenu || _actor.ShowTutorial)
            {
                if (_motor != null && dir != null)
                    _motor.Drive(0f, 0f, transform.forward, transform.right, dir.Rules);
                return;
            }

            if (_cam != null)
                transform.rotation = Quaternion.Euler(0f, _cam.Yaw, 0f);

            float mx = Input.GetAxisRaw("Horizontal");
            float mz = Input.GetAxisRaw("Vertical");
            if (_motor != null && dir != null)
                _motor.Drive(mx, mz, transform.forward, transform.right, dir.Rules);

            if (_actions == null || dir == null)
                return;
            if (Input.GetKeyDown(KeyCode.Space))
                _motor?.Jump();
            if (Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.F))
                _actions.Attack();
            if (Input.GetKeyDown(KeyCode.E))
                _actions.Interact();
            if (Input.GetKeyDown(KeyCode.Q))
                _actions.CycleDisguise();
            if (Input.GetKeyDown(KeyCode.R))
                _actions.PlantKey();
            if (Input.GetKeyDown(KeyCode.T))
                _actions.Blackout();
            if (Input.GetKeyDown(KeyCode.G))
                _actions.HangFalseClue();
            if (Input.GetKeyDown(KeyCode.C))
                _actions.UsePower("scent");
            if (Input.GetKeyDown(KeyCode.V))
                _actions.UsePower("lunge");
            if (Input.GetKeyDown(KeyCode.X))
                _actions.UsePower("wail");
            if (Input.GetKeyDown(KeyCode.Z))
                _actions.UsePower("fade");
            if (Input.GetKeyDown(KeyCode.Alpha1))
                _actions.Craft(CraftKind.Trap);
            if (Input.GetKeyDown(KeyCode.Alpha2))
                _actions.Craft(CraftKind.Bait);
            if (Input.GetKeyDown(KeyCode.Alpha3))
                _actions.Craft(CraftKind.Lure);
            if (Input.GetKeyDown(KeyCode.Alpha4))
                _actions.Craft(CraftKind.Flash);
        }
    }
}
