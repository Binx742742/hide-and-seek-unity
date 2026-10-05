# Style references

These files are the approved style templates for the Hide and Seek / Gullmouth Unity port. They guide lighting, interiors, the seeker silhouette, palette, and HUD tone.

They live under `docs/` so Unity does not import them as runtime assets. They guide art and UI look only. They do not override the Spawn CDN materials and colors rules in `Assets/SpawnSource` — including `scripts/lib/data/aesthetic.yml` (`rust-fog` palette, finishes, and grade), the CDN terrain albedos and tints in `places/main/config.yaml`, and the CDN-name art rule in `AGENTS.md`.

## Files

The approved set is the original still, the motion clip, and the three school stills below.

| File | What it shows |
| --- | --- |
| `hallway-flashlight-creature.jpg` | Still of a dark, decayed school corridor (Ravenhollow High School). A flashlight beam on wet, blood-stained tile, muted gray and brown walls, and a lanky pale seeker silhouette at the end of the hall. Sparse HUD: OBJECTIVE top-left, a flashlight meter, and keybind hints. |
| `style-reference.mp4` | Canonical motion clip of the same look. Slightly re-encoded from the original so it fits attach limits; treat this file as the reference. |
| `hallway-ravenwood-silhouette.jpg` | Ravenwood High. Distant silhouette under doorway light, THEY LIED graffiti, eye×3 and battery HUD. |
| `hallway-westfield-moonlight.jpg` | Westfield High. Moonlight and a wet floor, DON’T STAY AFTER DARK graffiti, health bar and run/flashlight prompts. |
| `hallway-eastview-flashlight.jpg` | Eastview High / Home of the Ravens. Lockers and stairs, a flashlight beam, and an investigate prompt. |

## Look to match

- Dark decayed school corridors: flashlight beams, doorway light, and moonlight on wet floors.
- Lanky pale seeker silhouette at the end of the hall or in a lit doorway.
- Blood stains, warning graffiti, lockers, and stairs. Muted gray and brown palette.
- Sparse HUD: OBJECTIVE, flashlight or battery meter, health, eye count, and short keybind or action prompts.
