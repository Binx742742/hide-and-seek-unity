// Stand-in for scripts/camera.js. Same arm length (1.8–6, default 3.4), height 1.75, look height 1.5.
// Zoom steps by the script's 0.6. Template sensitivity is 2.
// The Spawn engine owned the orbit yaw; this applies that eye offset and faces the body away from it.
// Menu drift matches player.js (period 26 s, radius 46, eye height 26, aim (0, 2, 30), fov 55).

using UnityEngine;

namespace HideAndSeek
{
    public class StandInCamera : MonoBehaviour
    {
        public float Yaw = 20f;
        public float Pitch = 0.35f;
        public float Distance = 3.4f;
        public float Height = 1.75f;
        public float LookHeight = 1.5f;
        public float Sensitivity = 2f;

        float _savedFov = 60f;
        bool _saved;

        void LateUpdate()
        {
            var cam = Camera.main;
            if (cam == null)
                return;
            if (!_saved)
            {
                _savedFov = cam.fieldOfView;
                _saved = true;
            }
            var dir = RoundDirector.Instance;
            var local = dir != null ? dir.LocalActor : null;
            if (local != null && local.InMenu)
            {
                float a = Time.time / 26f;
                Vector3 eye = new Vector3(Mathf.Cos(a) * 46f, 26f, 30f + Mathf.Sin(a) * 46f);
                Vector3 aim = new Vector3(0f, 2f, 30f);
                cam.transform.position = eye;
                cam.transform.LookAt(aim);
                cam.fieldOfView = 55f;
                return;
            }
            cam.fieldOfView = _savedFov;
            if (local == null)
                return;

            Yaw += Input.GetAxis("Mouse X") * Sensitivity;
            Pitch -= Input.GetAxis("Mouse Y") * Sensitivity;
            Pitch = Mathf.Clamp(Pitch, -0.8f, 1.1f);
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.01f)
                Distance = Mathf.Clamp(Distance - Mathf.Sign(scroll) * 0.6f, 1.8f, 6f);

            float yaw = Yaw * Mathf.Deg2Rad;
            float cp = Mathf.Cos(Pitch);
            float dist = Distance;
            Vector3 f = local.transform.position;
            Vector3 offset = new Vector3(Mathf.Sin(yaw) * cp * dist, Height - Mathf.Sin(Pitch) * dist, Mathf.Cos(yaw) * cp * dist);
            cam.transform.position = f + offset;
            Vector3 look = f + Vector3.up * LookHeight;
            cam.transform.LookAt(look);
        }
    }
}
