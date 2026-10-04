// Walks a body across the baked yard. Decisions stay in the bot scripts; this only
// keeps a capsule from tunnelling through walls and from falling through the ground.
// Floors and ramps (normal.y > 0.45) are ignored by the side casts so a stair tread
// does not read as a wall. A short riser is climbed by the ground snap.
// If the downward ray misses, the body falls back to Actor.GroundY so a round still
// runs when the yard file is absent.

using UnityEngine;

namespace HideAndSeek
{
    public static class YardMotion
    {
        const float Radius = 0.28f;
        const float Skin = 0.02f;

        public static Vector3 Slide(Vector3 pos, Vector3 delta)
        {
            delta.y = 0f;
            Vector3 p = pos;
            for (int iter = 0; iter < 2; iter++)
            {
                float dist = delta.magnitude;
                if (dist < 1e-5f)
                    break;
                Vector3 dir = delta / dist;
                if (!Blocked(p, dir, dist, out RaycastHit hit))
                {
                    p += delta;
                    break;
                }
                float travel = Mathf.Max(0f, hit.distance - Skin);
                p += dir * travel;
                Vector3 left = delta - dir * travel;
                Vector3 n = hit.normal;
                n.y = 0f;
                if (n.sqrMagnitude < 1e-6f)
                    break;
                n.Normalize();
                left -= n * Vector3.Dot(left, n);
                left.y = 0f;
                delta = left;
            }
            return p;
        }

        public static void Snap(ref Vector3 pos, ref float vertical, ref bool grounded, float floorY)
        {
            int mask = Physics.DefaultRaycastLayers;
            if (vertical > 0.05f)
            {
                Vector3 origin = pos + Vector3.up * 0.25f;
                if (Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 0.4f, mask, QueryTriggerInteraction.Ignore)
                    && hit.normal.y > 0.4f
                    && pos.y < hit.point.y)
                {
                    pos.y = hit.point.y;
                    vertical = 0f;
                    grounded = true;
                    return;
                }
                grounded = false;
                return;
            }

            Vector3 from = pos + Vector3.up * 1.25f;
            if (Physics.Raycast(from, Vector3.down, out RaycastHit ground, 3.6f, mask, QueryTriggerInteraction.Ignore)
                && ground.normal.y > 0.4f
                && pos.y <= ground.point.y + 0.45f
                && pos.y >= ground.point.y - 1.6f)
            {
                pos.y = ground.point.y;
                vertical = 0f;
                grounded = true;
                return;
            }

            if (pos.y <= floorY && vertical <= 0f)
            {
                pos.y = floorY;
                vertical = 0f;
                grounded = true;
                return;
            }
            grounded = false;
        }

        static bool Blocked(Vector3 feet, Vector3 dir, float dist, out RaycastHit best)
        {
            best = default;
            float bestDist = float.MaxValue;
            bool any = false;
            Consider(feet, feet + Vector3.up * 0.9f, dir, dist, false, ref best, ref bestDist, ref any);
            Consider(feet, feet + Vector3.up * 0.35f, dir, dist, true, ref best, ref bestDist, ref any);
            return any;
        }

        static void Consider(Vector3 feet, Vector3 origin, Vector3 dir, float dist, bool curb, ref RaycastHit best, ref float bestDist, ref bool any)
        {
            if (!Physics.SphereCast(origin, Radius, dir, out RaycastHit hit, dist, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore))
                return;
            if (hit.normal.y > 0.45f)
                return;
            // Drain treads are about 0.25 m. A contact that low is a curb for Snap, not a wall.
            if (curb && hit.point.y <= feet.y + 0.34f)
                return;
            if (hit.distance < bestDist)
            {
                best = hit;
                bestDist = hit.distance;
                any = true;
            }
        }
    }
}
