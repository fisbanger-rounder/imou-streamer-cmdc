# Imou Streamer

A web app that lists the cameras on your Imou Open Platform account(s) and plays
their live streams in the browser through the official `imou-player` SDK.
Static frontend + Vercel serverless functions that sign Imou's API requests and
cache tokens.

> **Security model, stated plainly:** credentials are supplied by the browser and
> kept in `localStorage`, so the `appSecret` *does* exist client-side. The
> serverless functions exist to sign requests and cache tokens, not to hide a
> secret you've typed into a web page. Use this on a machine you trust. See
> [Multiple accounts](#multiple-accounts) for the tradeoffs and the env-var
> alternative.

## Features

- Lists every camera and channel bound to your developer account, with online status.
- **Watch live** — full-screen overlay streaming one camera.
- **Multi-view** — 1/2/3/4/6/9-up grid (2×2, 2×3, 3×3), Play all / Pause all / Destroy all, per-cell errors.
- **Play all in multi-view** — one click queues every channel and autoplays the wall.
- SDK controls on the player: play, volume, snapshot, resolution switch, **PTZ**, fullscreen.
- **Per-camera passwords.** Each device card has its own verification-code field; encrypted
  streams that fail decryption prompt inline and retry just that cell.
- **Multiple accounts.** Each Imou Open Platform app is a "profile" (its own appId,
  appSecret, region, and camera passwords), switchable from the header.
- Single-account alternative: set env vars and no browser credentials are needed.

## How it works

```
Browser ──POST /api/queryDeviceList──► Vercel function ──MD5-signed HTTPS──► Imou Open Platform
Browser ──POST /api/getKitToken─────► Vercel function ─────────────────────► Imou Open Platform
Browser ◄──{ kitToken }─────────────                                        ◄
Browser ──new imouPlayer({ token: kitToken, domain: "https://openapi-…", … })
        └─► SDK calls {domain}/openapi/getEncryptKitStreamUrl, controlMovePTZByKitToken, … directly
        └─► WebSocket (RTSP-over-WS) to the returned media server, WASM-decoded to canvas
```

The serverless functions sign Imou's API requests (the signature needs the
`appSecret`, which is why it can't happen in the page) and cache the 3-day
`accessToken` per account. Everything media-related (stream URLs, PTZ commands,
the video WebSocket) is authorized by the **kitToken** and goes straight from the
browser to Imou — that's by SDK design, and Imou answers those cross-origin
requests with `Access-Control-Allow-Origin: *`.

### Endpoints

| Function | Imou method | Notes |
| --- | --- | --- |
| `api/accessToken.js` | `accessToken` | 3-day token, cached per account |
| `api/queryDeviceList.js` | `listDeviceDetailsByPage` | `page` is **1-based**; returns `deviceList[]` with `channelList[]` |
| `api/getKitToken.js` | `getKitToken` | 2h token; we request `type: 0` (all permissions) so PTZ works |
| `api/lib/imou.js` | — | MD5 request signer, per-account `currentDomain` region cache, per-account token cache |
| `api/lib/config.js` | — | Request-body credentials win; env vars are the fallback |

## Run locally

```bash
npm install -g vercel   # once
vercel link             # link to your Vercel project
vercel dev              # http://localhost:3000
```

`vercel dev` reads `vercel.json`: serves `public/` as the site root, runs `api/*.js`
as functions, and applies the same COOP/COEP headers as production. Then open
<http://localhost:3000>, go to **Accounts**, and add your Imou app — or set
`IMOU_APP_ID` / `IMOU_APP_SECRET` in `.env.local` to skip typing them.

## Multiple accounts

An "account" is one Imou Open Platform **app** (`appId` + `appSecret`), which owns
its own device list, data-center region, and camera passwords. Add as many as you
like under **Accounts** and switch from the dropdown in the header; devices,
players, saved camera passwords, **and the multi-view pinboard** are all scoped to
whichever account is active (the queue is stored under
`imou-multi-view-queue:<profileId>`, since app A's cameras can't be streamed by
app B). Profile shape, stored in `localStorage` under `imou-streamer-accounts`:

```json
{ "profiles": [{ "id": "…", "label": "Home", "appId": "lc…", "appSecret": "…",
  "host": "https://openapi-sg.easy4ip.com", "defaultStream": "0",
  "deviceCode": "", "deviceCodes": { "2306…": "camera-password" } }],
  "activeId": "…" }
```

**Tradeoffs of browser-side credentials, stated honestly:**

| | |
| --- | --- |
| ✅ | Unlimited accounts with no user system or database to build |
| ✅ | Each visitor brings their own credentials; you never hold anyone's secret |
| ✅ | More accounts = more device-channel quota and per-app rate-limit headroom |
| ⚠️ | `appSecret` sits plaintext in `localStorage` indefinitely — any XSS in this app leaks every account in that browser |
| ⚠️ | Whoever has that browser profile can list **all** cameras bound to the app, not just the pinned ones |
| ⚠️ | Browser sync or a synced profile folder can copy `localStorage` without you noticing |
| ⚠️ | No revocation or audit trail; **Delete** only forgets the profile from that browser |
| ⚠️ | Your public deployment acts as a signing proxy for anyone who knows the URL (Imou still throttles per app) |

**Want the secret server-only instead?** Set `IMOU_APP_ID` / `IMOU_APP_SECRET`;
they apply whenever a request carries no credentials. Precedence here is
deliberately **body wins** so multi-account works — to lock visitors out of
substituting their own, flip the `||` order in `api/lib/config.js` and hide the
account picker.

To share with other people properly, you'd want per-user auth plus an encrypted
credential store (Vercel Postgres/KV). The seams for that are already isolated
behind `apiCreds()` (client) and `resolveCreds()` (server).

## Deploy to Vercel

1. **Create the app in the Imou console** — <https://open.imoulife.com/consoleNew/myApp/appInfo>.
   Note your **data center** (Console → Basic Info → My Info): Singapore / Frankfurt / Oregon.
2. **Add cameras** — devices must be bound to your Open Platform app (via Imou Life and/or `bindDevice`) to appear or stream.
3. **Push this repo** to GitHub/GitLab/Bitbucket and import it at <https://vercel.com/new>.
   No framework preset, no build command — `vercel.json` drives everything.
4. **Project Settings → Environment Variables** — **optional**, only if you want a
   default account baked in rather than typed into the browser:

   | Name | Value |
   | --- | --- |
   | `IMOU_APP_ID` | your `lcxxxxxxxxxxxxxx` |
   | `IMOU_APP_SECRET` | your app secret (keep it private) |
   | `IMOU_DATA_CENTER_HOST` | defaults to `https://openapi-sg.easy4ip.com`. Other options: `openapi-fk` (Frankfurt), `openapi-or` (Oregon). Must match the app's data center. |

   With no env vars set, every visitor adds their own account under **Accounts**.
5. **Deploy** — if you set env vars, **Redeploy** once afterwards so the functions pick them up.
6. Open the URL → **Cameras** → **Watch live**. First frames appear in a few seconds.

Locally and on Vercel the browser calls the Imou API cross-origin; we verified
Imou answers those CORS preflights with `Access-Control-Allow-Origin: *`, so no
proxying is needed.

## File map

```
api/
  accessToken.js           – admin token endpoint (also used internally)
  getKitToken.js           – per device/channel play token
  queryDeviceList.js       – device inventory
  lib/imou.js              – MD5 signer, per-account region + token caches
  lib/config.js            – body-credential resolution, env fallback
public/
  index.html               – camera list page
  player.html              – multi-view grid
  settings.html            – account manager: add / edit / delete + connection test
  app.js                   – profile store, settings, API helper, DOM helpers, header switcher
  styles.css               – app chrome (the SDK renders its own UI)
  pages/devices.js         – list, per-camera passwords, Watch-live overlay, queueing
  pages/player.js          – grid lifecycle: render / playAll / pause / destroy
  pages/settings.js        – account CRUD
  imou-player.js / .css    – official SDK, copied verbatim
  WasmLib/                 – official SDK decoder (MultiThread / SingleThread / AudioProcessor)
vercel.json                – COOP/COEP headers, function sizing, / rewrite
package.json               – engines: node 20.x (sets the function runtime)
imou-player-SDK/           – the vendor drop, kept for reference; not served
```

## SDK gotchas we hit (read this if you fork or upgrade)

These cost real debugging time; the official docs are wrong or silent on each.

- **Request signature is MD5, not HMAC-SHA256.** Both doc pages describe
  `Base64(HMAC-SHA256(...))`, but the live API only accepts
  `MD5("time:{t},nonce:{n},appSecret:{s}")` as lowercase hex — the official
  Python SDK confirms it. Wrong signature surfaces as `OP1005` (invalid URL)
  or `SN1001`.
- **Device list endpoint is `listDeviceDetailsByPage`**, 1-based `page`.
  `queryDeviceList` doesn't exist (`OP1005`); `page: 0` is rejected (`OP1003`).
  Response shape is `deviceList[].channelList[]` with string `deviceStatus`
  (`"1"` online), not `devices[].channels`.
- **`domain` must include the `https://` scheme.** The SDK string-builds
  `${domain}/openapi/...`; a bare host becomes a same-origin relative request
  that 404s against your own site with "Failed to obtain playback address".
- **`WasmLibPath` is a prefix *before* `WasmLib/`**, not the folder itself —
  the SDK appends `WasmLib/MultiThread/liblcplay.js`. The documented default
  `""` is correct when `WasmLib/` sits at your site root; `"/WasmLib/"`
  produces `/WasmLib/WasmLib/...` and 404s.
- **PTZ needs kit-token permission `type: 0`** (all). `type: 1` (live only)
  streams fine but silently rejects `controlMovePTZByKitToken`. The player also
  needs `"ptz"` in `controlsConfig` to render the control.
- **Encrypted cameras need the `code` option, per device.** Camera passwords are
  stored in `settings.deviceCodes[deviceId]` and resolved by
  `resolveDeviceCode()` in `public/app.js`, falling back to the Settings page's
  "default camera password" and then to the SDK's device-SN default. Both player
  call sites prompt again on error `1001` (decryption failed) and retry.
- **COOP/COEP headers are required for multithreaded H.265 decoding** and match
  Imou's own hosted demo; they're set in `vercel.json`. Without them the SDK
  drops to single-thread decoding — still works, just heavier on the CPU.
- **The `getBuryConfig` 404 is noise.** The SDK bundles an analytics ping that
  won't resolve on your origin; playback doesn't depend on it.
- **Vercel build error "Function Runtimes must have a valid version"**: don't
  put `runtime` in `vercel.json` `functions` — pin Node via `engines` in
  `package.json` instead.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `OP1005` on any endpoint | Wrong signing algorithm, wrong method name, or wrong data-center host |
| `OP1003` from device list | `page`/`pageSize` missing or 0 |
| `SN1001` / `SN1002` | `appSecret` mismatch / clock skew >5 min |
| "Failed to obtain playback address" | `domain` missing `https://`, expired kitToken, or camera offline |
| `1001` player error | Wrong camera password — the cell/overlay prompts for it inline; otherwise fix it on the Cameras page |
| Empty camera list | Cameras bound to a **different account** than the one selected in the header, or not bound to the Open Platform app at all |
| `OP1005` only on one account | That profile's data-center host is wrong for the app |
| Black cells in multi-view | Cell error text shows the reason; >9 streams or a weak GPU also cause this |

## Limitations

- Max 9 concurrent streams (the vendor demo's split-screen ceiling); decode is
  canvas + WASM, so 6–9 cells needs a decent GPU/CPU and will lag on weak hardware.
- Live view only; playback (type `2`) is wired into `getKitToken` but there are
  no date/time pickers yet.
- Accounts and camera passwords live in `localStorage`, per browser and per
  profile. Switch device or browser and you re-enter everything; there is no
  sync, and nothing is encrypted at rest.
- Token and region caches are in-process, so they only help within one warm
  serverless instance. Heavy multi-account use across regions would want a shared
  store (Vercel KV / Upstash) to avoid re-minting accessTokens.
- iOS Safari mutes autoplayed streams until unmuted manually; WeChat's embedded
  browser has no snapshot/record buttons. Both are SDK constraints.
- Unfree (console-verified) devices and accounts without device-channel quota
  will fail streaming even with correct config.

## References

- JS SDK: <https://open.imoulife.com/book/js/sdk.html>
- HTTP spec / signature: <https://open.imoulife.com/book/http/develop.html>
- Error codes: <https://open.imou.com/document/pages/254965/>
- Official Python SDK (ground truth for API behavior): <https://github.com/Imou-OpenPlatform/Py-Imou-Open-Api>
- Console: <https://open.imoulife.com/consoleNew/myApp/appInfo>