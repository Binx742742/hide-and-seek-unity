# Style references

These files are the approved style templates for the Hide and Seek / Gullmouth Unity port. They guide lighting, interiors, the seeker silhouette, palette, and HUD tone.

They live under `docs/` so Unity does not import them as runtime assets. They guide art and UI look only. They do not override the Spawn CDN materials and colors rules in `Assets/SpawnSource` — including `scripts/lib/data/aesthetic.yml` (`rust-fog` palette, finishes, and grade), the CDN terrain albedos and tints in `places/main/config.yaml`, and the CDN-name art rule in `AGENTS.md`.

## Files

| File | What it shows |
| --- | --- |
| `hallway-flashlight-creature.jpg` | Still of a dark, decayed school corridor (Ravenhollow High School). A flashlight beam on wet, blood-stained tile, muted gray and brown walls, and a lanky pale seeker silhouette at the end of the hall. Sparse HUD: OBJECTIVE top-left, a flashlight meter, and keybind hints. |
| `style-reference.mp4` | Canonical motion clip of the same look. Slightly re-encoded from the original so it fits attach limits; treat this file as the reference. |

## Look to match

- Dark decayed school corridor, flashlight horror.
- Lanky pale seeker silhouette at the end of the hall.
- Wet, blood-stained floor. Muted gray and brown palette.
- Sparse HUD: OBJECTIVE top-left, flashlight meter, keybind hints.
