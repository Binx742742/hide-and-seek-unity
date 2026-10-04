# @binxius/hide-and-seek — a live multiplayer world on Spawn

This tree IS the world. A push to main reaches every room open on main with no build and no deploy. Most pushes land in seconds and the rooms hear them seconds later; a large change or a large or busy world can take a minute or more. People may be standing in it while you edit. Play it:
https://www.spawn.co/@binxius/hide-and-seek

## The tree

- `world.config.yaml` — the root: engine, inputs, the player and camera templates, the default place.
- `places/<place>/config.yaml` — one place's atmosphere, terrain, physics, spawn.
- `places/<place>/cells/x<cx>z<cz>.scene` — placements, by 128 m cell over the object's feet:
  `cx = Math.round(x / 128)`, `cz = Math.round(z / 128)` — round, never floor, half up: `x0z0` holds
  −64 ≤ x < 64 (z alike); 64 files under `x1z0`, −64 under `x0z0`. Line 1
  is the header `# spawn-scene v2 yaml <cellKey>`; then one block per placement — the object as it was
  spawned, its fields at the row's indent. `objects.scene` holds placements with no plain world xz.
- `templates/<name>.js` — a module you write when several things share one definition. Export the object def; a row uses `template: "templates/<name>.js#<export>"` + `overrides:`.
- `scripts/**/*.js` — behavior modules (`export function onSpawn(ctx)`, `update(ctx, dt)`, `onCollide(ctx, other, contact)`, `onArrive` …). `scripts/lib/data/*.yml` is importable. `sim.js` runs the world's own program, one copy per room.
- `skills/<name>.md` — a skill for Savi; `commands/<name>.md` — a slash command. Tree files like any other.
- `design.md` — the game's one page: what it is, how a player wins and loses, the loop, who decided what. Savi reads it whole on every turn and writes it too, so it is where you and she hand each other the game: what stands, how it is laid out, what is left.
- `source/**` — a game a person made somewhere else, as its own files. When they ask you to bring their game in, push its code, levels and scenes here as they are, as text (never its engine or libraries), carry each picture, model, sound and font by its bytes (below), and write each carried name beside its original path in `source/ASSETS.md`.
  Then stop and tell them it is in: building it on Spawn as the same game is their next ask, of you or of Savi, who reads `source/` too. Whoever builds it takes every number, rule and level from `source/`, uses the carried art by its names, and leaves `source/` as it is.
- Art is a CDN NAME, never bytes in this tree: reference `model: "/cdn/model-knight.glb"`, `texture: "/cdn/moodboard-pixel/sprite-fox.png"`,
  `clip: "/cdn/sfx-bell.mp3"` — a name the CDN has not cooked is generated on first fetch and is immutable after. Your own art goes
  up by its bytes: `PUT https://www.spawn.co/api/sdk/v1/<worldId>/assets/value.<sha256 of the file>.<ext>` + Bearer, Content-Type its type, the file as the
  body → `{ url }`; the tree references it as `/cdn/value.<sha256>.<ext>`. A sound keeps its own type: a `.wav`, `.ogg` or `.flac` goes up as it is, under its own extension and Content-Type, and the answer names it `value.<sha256>.mp3`, the name the tree references. That PUT carries a body only up to the API's request cap (about 4.5 MB, headers counted); over it the door answers 413 with the road in its body — carry the bytes by address instead: `POST https://www.spawn.co/api/sdk/v1/<worldId>/assets/upload-target` with `{ name, sizeBytes }` for a storage PUT url, PUT the bytes there, then `PUT https://www.spawn.co/api/sdk/v1/<worldId>/assets/<name>` with `{ tempPath }`. A push carrying asset bytes — an image, a model, a sound, by its extension, wherever it sits — is refused typed (law.git.asset-kind); a text file under `assets/` is a tree file.
  A .png whose bytes are not a PNG is refused at the push, like JS that does not parse.
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `.spawn/` — for you. The room never receives these exact paths. Write what you learn about THIS world into AGENTS.md, not into your own memory.

## One placement, whole

`places/main/cells/x0z0.scene` — the row IS the object: one cube standing at (4, 0, 6): round(4/128) = round(6/128) = 0. An
object's fields (primitive, material, physics, feetPosition, …) sit flat beside its frame (id, tags, state, behavior, parent, children).

```yaml
# spawn-scene v2 yaml x0z0
"cube-1":
  "feetPosition": { "x": 4, "y": 0, "z": 6 }
  "material": { "color": "oklch(0.72 0.19 30)" }
  "physics": "static"
  "primitive": { "kind": "box", "size": 2 }
  "tags": ["cube"]
```

`physics` omitted = walk-through; `"static"` = solid and still; `{ body: "dynamic", mass: 2 }` = falls and pushes. Push the file and the cube stands in every open room.
For several cubes, write the definition once in `templates/cube.js`. Each row uses `"template": "templates/cube.js#cube"`, with differences under `"overrides":`.

```js
export const cube = { primitive: { kind: "box", size: 2 }, material: { color: "oklch(0.72 0.19 30)" }, physics: "static", tags: ["cube"] };
```

## The API, in one screen

`ctx` is the first argument of every hook — `onSpawn(ctx)`, `update(ctx, dt)`, `onCollide(ctx, other, contact)` — and there
are no ambient globals. `ctx` carries the scopes (`ctx.world`, `ctx.place`, `ctx.self`, `ctx.session`) — reads compose like a
prototype chain, writes land in the handle's own layer, `delete` clears — and the eight verbs: `ctx.spawn(spec)` / `ctx.spawn(id, spec)`,
`ctx.destroy(id)`, `ctx.getObject(id)` / `ctx.query(sel)`, a dot assignment is the write (`ctx.self.state.hp = 3`), `ctx.attach(a, b)`,
`ctx.cross(entity, link)`, `ctx.emit(topic, payload)` (+ `ctx.on`). `ctx.now()` is the only clock; `ctx.after(seconds, "export", payload)`
is the one-shot timer. Durable per-player data is
`player.state.*`; shared is `ctx.world.state.*`; room-life-only is `ctx.session.*`. The public API
reference and engine-use guide live in the engine repo pinned by `.spawn/engine.yaml`:
`git clone --depth 1 https://git.spawn.co/engine/6.0.0.git .spawn/engine` (gitignored; same token).

## Test the game

Run `spawn client install-browser` once. `spawn client join @binxius/hide-and-seek --render cpu --ttl 600` starts a client.
Use `spawn client exec` to run game code, `spawn client run` for controls, and `spawn client screenshot` for a frame.
Use `spawn client leave` to end the session.

## The loop

1. `git pull --rebase` first: Savi, `exec`, and other clones commit here too. A refused push names the head.
   Pull, merge or rebase, then push a history that descends from it. The server never merges or force-pushes.
2. Small commits. THE FIRST LINE OF YOUR COMMIT MESSAGE IS THE CREATOR'S CHAT LINE: it lands in
   their chat and their changes list under your name, beside what they and Savi said. Write it as
   one plain sentence about what changed for the player — "the getaway car keeps its grip on wet
   streets" — never how you did it, never a file, a function or a diagnosis; the how goes in the
   body. `git log --notes=spawn` carries the world's own reading of each commit (the clone line below fetches it).
3. Push. The `remote:` lines name the rooms, players, ops and verdicts. Read the `verdicts →` page with `printf 'user = "<you>:%s"\n' "$SPAWN_TOKEN" | curl -K - <url>`.
4. Look. Run code, play and capture frames with your joined client. Read `spawn client exec --help` and `spawn client run --help`.

Agents never wake Savi. She reads your pushes on the creator's next turn. Leave what she needs in `design.md` and the commit's body. There is no door into her chat.

## Run your code in the client

`spawn client exec <file>` or `-e '<code>'` runs an async JS body. Top-level `await` and `return` work. It uses the real pinned engine without an engine checkout.
`--realm game` is the default: real `api`, `ctx` and imports from the world's tree, in the place your body stands in (`--place <name>` names another). `--input <json-file>` reads local JSON into `input`. Local source is not applied automatically.
Runtime edits are transient by default. `--persist` saves the run into the world's files, which every room of the world starts from: from a room of a place that many rooms share, every room of that place gets what the run spawned or painted. To keep a test in one room, run it without `--persist`. A write to a place's terrain or config is a file write and saves either way. `--read-only` refuses game writes. Authored file writes and explicit commits keep their durable effects.
`--realm browser` needs `join --render cpu`. It runs in the real page with DOM, canvas, fetch and WebGPU. Use `await client.ready()` before reading the renderer; capture waits itself. `client.renderer()` and `client.host()` return the live handles.
`await client.exec(script, options)` runs game code where your body stands; options include `input`, `place`, `persist`, `readOnly`. `await client.request(debugRequest)` asks the real simulation.
`await client.capture({method, params})` uses the capture API. For a local draft of an object's geometry or material, use `preview_object` with `params: {object, children}`: `object` is the object's fields and `children` its nested child objects, local to it as in a spawn. It takes no `scripts`; a draft that needs new script source is looked at after that script is pushed to the world. The engine supplies the context.

- Game code: `spawn client exec -e 'return ctx.query({tags:["enemy"]}).length;'`. Read data: `spawn client exec .spawn/check.js --input .spawn/data.json --out .spawn/report.json`.
- Browser code: `spawn client exec --realm browser -e 'return new Uint8Array([0,127,255]);' --out .spawn/data.bin`. `--out` saves bytes, exact strings or JSON; stdout keeps the receipt.
- Local JS imports: `spawn client exec .spawn/check.mjs --realm browser --module`. Write `export default async (client, input) => result`; the CLI bundles your code for the browser.
- Play and inspect: `spawn client run -e 'return await play.until(async () => (await play.state()).done, {timeoutSec:5});'`, then `spawn client screenshot --out .spawn/view.png`.

## The doors — one token everywhere

Your token is the password on the git remote and the Bearer on every door. Keep it EXPORTED in your
env as `SPAWN_TOKEN`; never commit it, never print it. The clone that never prompts and carries the
notes (the helper reads `$SPAWN_TOKEN` at use time — nothing on disk, nothing in `git remote -v`):
`git clone --config credential.helper= --config credential.helper='!f() { echo username=<you>; echo password=$SPAWN_TOKEN; }; f' --config remote.origin.fetch='+refs/notes/*:refs/notes/*' https://git.spawn.co/@binxius/hide-and-seek.git`
An existing clone: `git config credential.helper ''` (drops any keychain helper for this clone — a stored credential
for another account answers first otherwise), `git config --add credential.helper '!f() { echo username=<you>; echo password=$SPAWN_TOKEN; }; f'`,
`git config --add remote.origin.fetch '+refs/notes/*:refs/notes/*'`, `git fetch`. `<worldId>` below is the id `me` and `worlds` answer for this world.

- who am I, my worlds with their git and play URLs: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") https://www.spawn.co/api/agent/v1/me`
- this world's live rooms and player counts: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") https://www.spawn.co/api/sdk/v1/<worldId>/agent/rooms`
- the room's script log (errors name your paths): `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") https://www.spawn.co/api/sdk/v1/<worldId>/agent/logs`
- run read-only JS in the live room: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") -X POST https://www.spawn.co/api/sdk/v1/<worldId>/agent/exec -H "Content-Type: application/json" -d '{"script":"return api.query({tags:[\"enemy\"]}).length"}'` (409 `no_live_room` when nobody is in it — your own `spawn client join` below is the room; add `"place":"<name>"` to read one place, else it runs where most of the room's players stand and the answer's `place` says where)
- the reference and skills at this pin over HTTP: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") https://www.spawn.co/api/sdk/v1/<worldId>/agent/docs` — Before you write a shape, read its section of the Tome API reference by name: the docs door with ?section=<heading> answers that one section in tomeApi and lists every heading in sections; with no section named it answers the whole. Every shape in it is exact, and a push in another shape is refused naming the row, the line and the field. That curl is the docs door; the whole reference is also `api-reference.md` at the root of the engine repo above.
- play it as a player, through the door every person enters by: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") -X POST https://www.spawn.co/api/session/grant/agent -H "Content-Type: application/json" -d '{"world":"@binxius/hide-and-seek"}'` answers `attachUrl` — open it as a WebSocket.
- or the packaged client, a body in the room wearing your name: `bun add -g @spawnco/client` (Bun), then `spawn client join @binxius/hide-and-seek --ttl 600` with `$SPAWN_TOKEN` exported — the world boots for your body and `join` prints the boot verdict; `spawn client run play.js` plays it; `spawn client leave` ends it.
- while you play, so the play counts like a person's: `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") -X POST https://www.spawn.co/api/player/heartbeat -H "Content-Type: application/json" -d '{"variant_id":"<worldId>"}'` every minute or so.
- your inbox (notes, plays, invites, a link's verdict): `curl -H @<(printf 'Authorization: Bearer %s\n' "$SPAWN_TOKEN") "https://www.spawn.co/api/notifications?unread=1"`
- make a world: `git push` to `https://git.spawn.co/@@<you>/<free-slug>.git`, or `POST https://www.spawn.co/api/agent/v1/games`.
- the human invites the next agent here: https://www.spawn.co/@binxius/hide-and-seek/code

## The rail is Spawn's

The right-middle block of the game screen (one reservation, vertically centered on the right edge; its size is
the engine's, published to ui.js as CSS variables — the game-ui skill names them) belongs to the platform — home,
creator, like, comments in play; Savi's face while creating. Game UI you write (raw HTML) keeps out of it; the
engine forwards the same keep-out rects.
