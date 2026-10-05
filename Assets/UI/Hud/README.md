# HUD chrome

Grimdark plates for the Gullmouth HUD. Art only: `RoundHud` is still the plain `OnGUI` readout, and these files are not placed on a Canvas.

The look is torn paper, salt-bleached iron, blood, and bone type, in the same sparse HUD tone as `docs/style-references/`. It does not add gameplay. There is no stamina stat. `hud_warning_low_stamina.png` keeps that filename; the words baked into the image are replaced in code later.

Import is already set in the `.meta` stubs: Texture Type Sprite (2D and UI), single sprite, full rect, mipmaps off, alpha is transparency, uncompressed. `hud_pip_blood.png` uses Point filter so the pixel droplet stays sharp. The other plates use Bilinear.

## Files

| File | What it is | Bind |
| --- | --- | --- |
| `hud_banner_stack.png` | Torn white banner and divider stack | Objective banner. Chrome for the existing top objective line: the phase cap in `scripts/ui.js` (`Hide` / `The Hunt`) and the OBJECTIVE plate in the style stills. |
| `hud_health_heart_bar.png` | Grimdark heart and a segmented health bar | Hider HP. Frame for the existing bar (`ui.js` `.hp`, the `RoundHud` hider plate, `Actor.Hp`). The mimic dock uses that same HP readout. |
| `hud_pip_blood.png` | One pixel blood droplet | Kit cooldown. A pip on the cooldown the kit slots already draw (`ui.js` `.cd` for plant, blackout, false clue, echo, snare, steal, and the fish-power cooldowns). |
| `hud_bar_rail.png` | Jagged iron horizontal rail | Hunt clock and bars. Rail under the existing top clock (`ui.js` `.clock`, the `RoundHud` phase clock) and under the HP bar. |
| `hud_frame_ring.png` | Broken grunge ring | Salt/role ring. Frame for the existing role plate (hider, mimic hidden or revealed, risen, ghost). Salt-bleached yard chrome, not a salt meter. |
| `hud_warning_low_stamina.png` | Warning plate. Filename kept. | Claws locked, or an empty craft. The HUD already shows both: `ClawReadyAt` / "claws in", and a craft the player cannot afford (`CanAfford` false, scrap / wire / powder at zero). Do not read the baked "LOW STAMINA" line as a new system. |
