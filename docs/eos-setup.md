# Epic Online Services setup

This project ships **names and placeholders only**. It does not log in, create lobbies, replicate movement, or run proximity voice. Solo and bot play never contact EOS. Nothing here reads the Spawn SQL `lobbies` table.

Fill the steps below, then paste the official plugin calls into `EosSdkBridge` (compiled only when the `EOS_SDK` scripting define is set). Until both the plugin and real portal IDs are present, `EosBootstrap` stays idle.

Placeholders in git use the prefix `YOUR_`. Leave `ClientSecret` empty.

## 1. Developer Portal product

1. Sign in to the [Epic Developer Portal](https://dev.epicgames.com/portal/).
2. Create an organization and a product for this game. Epic’s walkthrough is [Set up your account and download the EOS SDK](https://dev.epicgames.com/docs/epic-online-services/eos-get-started/get-started-guide/set-up-account-and-download-eos-sdk).
3. On the product’s **Product Settings** page, copy the identifiers described in [Product, sandbox, and deployment](https://dev.epicgames.com/docs/dev-portal/product-management):
   - **ProductId**
   - **SandboxId** (Dev sandbox while you are testing)
   - **DeploymentId** (a deployment under that sandbox)
4. Create a **client** and a **client policy** that allows Connect and Lobbies. Copy the **ClientId**. The client **secret** is a credential: do not put it in this repo.

## 2. Where to paste the IDs

Committed asset (placeholders only):

`Assets/Settings/EosConfig.asset`

Fields on `HideAndSeek.EOS.EosConfig`:

| Field | Paste from the portal | In git |
| --- | --- | --- |
| ProductId | Product settings | `YOUR_PRODUCT_ID` |
| SandboxId | Sandbox tab | `YOUR_SANDBOX_ID` |
| DeploymentId | Deployment under that sandbox | `YOUR_DEPLOYMENT_ID` |
| ClientId | Clients tab | `YOUR_CLIENT_ID` |
| ClientSecret | Clients tab | **empty** |

`YOUR_*` and a blank id both count as “not filled”. `EosConfig.HasPortalIds` stays false, and the bootstrap does nothing.

You can also create another asset with **Assets → Create → HideAndSeek → EOS Config**. Prefer editing a local copy over committing real IDs. `Assets/Settings/EosConfig.local.asset` is gitignored for that.

### Client secret

Leave the asset field empty. A secret on a committed ScriptableObject would ship with the repo.

For Editor runs, set an environment variable on the process that launches Unity:

```bash
export EOS_CLIENT_SECRET='paste-from-the-portal'
```

`EosConfig.ResolveClientSecret()` reads that variable when the asset field is empty. Do not print it. The official plugin has its own config window (**EOS Plugin → EOS Configuration**). If that file stores the secret, keep the file out of git. This scaffolding does not write it.

The secret is optional for this repo. The EOS platform interface still needs a secret at process start once you wire the plugin; supply it locally, not in a commit.

## 3. Install the official Unity plugin

Epic’s engine page: [EOS SDK and game engines](https://dev.epicgames.com/docs/epic-online-services/game-engines/game-engines-introduction). Use the [EOS Plugin for Unity](https://github.com/EOS-Contrib/eos_plugin_for_unity) (PlayEveryWare). Import steps and the configuration window are in the plugin’s [configure guide](https://github.com/EOS-Contrib/eos_plugin_for_unity/blob/stable/com.playeveryware.eos/Documentation~/configure_plugin.md).

After the package imports:

1. Copy the same Product, Sandbox, Deployment, and Client IDs into the plugin’s configuration window.
2. Add the scripting define `EOS_SDK` under **Project Settings → Player → Scripting Define Symbols**. This repo does not set that symbol, so a normal build compiles the stubs and does not reference `Epic.OnlineServices`.
3. Replace the bodies in `Assets/Scripts/HideAndSeek/EOS/EosSdkBridge.cs` with the plugin’s Connect, Auth, and Lobby calls. That file is inside `#if EOS_SDK` and currently returns failure without calling Epic. Defining the symbol still compiles before those calls exist.

Do not add the Epic package to this repository as part of filling in IDs.

## 4. Device ID auth in the Editor

Editor play should use a **Device ID** product user so a test does not need an Epic account popup.

Epic’s Connect interface:

- [EOS_Connect_CreateDeviceId](https://dev.epicgames.com/docs/api-ref/functions/eos-connect-create-device-id) once per local profile
- [EOS_Connect_Login](https://dev.epicgames.com/docs/api-ref/functions/eos-connect-login) with a Device ID access token on later runs

That login is `IEosAuth.LoginDeviceId`. The product user id it returns is `IEosAuth.ProductUserId`. The stub reports logged-out and invokes the callback with failure until the bridge is filled.

Account Portal (an Epic account in the browser) is the other method, `IEosAuth.LoginAccountPortal`. It maps to Auth `EOS_LCT_AccountPortal`, then a Connect login so you still get a product user id. Reference: [Auth interface](https://dev.epicgames.com/docs/epic-online-services/accounts-and-social/eos-epic-account-services/auth-interface/auth-reference). Use that when you want a real Epic account. Device ID is the Editor path.

`Logout` clears the local session in a future implementation. The stub’s logout leaves `IsLoggedIn` false.

## 5. Lobby for matchmaking

Lobbies are the stand-in for the Spawn SQL room list (`ILobbyDirectory` in `SpawnOnly.cs`). Epic’s overview and sample: [Lobby sample](https://dev.epicgames.com/docs/epic-online-services/multiplayer/lobbies-and-sessions/lobby-interface/eos-lobbies-sample).

`IEosLobby` is the shape to fill:

| Method / property | EOS side |
| --- | --- |
| `Create` | Create a lobby and set searchable attributes |
| `Join` / `Leave` | Join or leave by lobby id |
| `Search` | `LobbySearch` parameters |
| `Members` | Current member list |
| `HostProductUserId` | Lobby owner product user id |

Search and create take `EosLobbyQuery.Map` and `EosLobbyQuery.Mode`. The attribute keys are the constants `MAP` and `MODE` (`EosLobbyAttributes`). This project does not add modes or maps beyond those names.

`EosLobbyDirectory` implements `ILobbyDirectory` by calling `IEosLobby`. It does not open a database and it does not invent rows. `List` returns a cache that stays empty until a real search reports hits. `TryCreate` and `TryJoin` fail while `IEosLobby.IsOnline` is false. The menu hook is synchronous; EOS calls are not. If a future `Create` does not invoke its callback before returning, the directory refuses instead of publishing a room id.

`MenuFlow.lobbyDirectory` is unassigned in the shipped scene. Assign `EosLobbyDirectory` only after the bridge is real. While it is unassigned, the menu still says the live list is the Spawn SQL board.

## 6. Keep solo and bot offline

`LocalRoundDriver` with `humanPlayers` below 2 is a bot round (one human). `EosBootstrap` treats that as offline and does not call login or lobby.

When no driver is present, `RoundDirector.soloBotRound` still defaults to true, so the bootstrap stays offline. A second human (`humanPlayers` of 2 or more) is the case that reaches the “IDs filled?” check. Missing IDs or a missing `EOS_SDK` define still no-op. There is no Netcode session and no proximity voice in this scaffolding (`IProximityVoice` is unchanged).

`Assets/Scenes/Bootstrap.unity` is not modified. Add `EosBootstrap` to a scene object when you want the check to run. The example config can be dragged onto its `config` field. Without that component, play mode never touches these types.

## What you still write

1. Portal product, client, and policy.
2. IDs in a local `EosConfig` (secret via `EOS_CLIENT_SECRET` or the plugin window only).
3. The official plugin import, the `EOS_SDK` define, and the same IDs in the plugin window.
4. The bodies of `EosSdkBridge.LoginDeviceId`, `LoginAccountPortal`, `Logout`, `Create`, `Join`, `Leave`, and `Search`.
