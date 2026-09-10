# Imou Streamer

A web app that lists the cameras on your Imou Open Platform developer account
and plays their live streams in the browser through the official `imou-player`
SDK. Static frontend + Vercel serverless functions — the `appSecret` stays on
the server, the browser only ever sees short-lived kit tokens.

## Features

- Lists every camera and channel bound to your developer account, with online status.
- **Watch live** — full-screen overlay streaming one camera.
- **Multi-view** — 1/2/3/4/6/9-up grid (2×2, 2×3, 3×3), Play all / Pause all / Destroy all, per-cell errors.
- **Play all in multi-view** — one click queues every channel and autoplays the wall.
- SDK controls on the player: play, volume, snapshot, resolution switch, **PTZ**, fullscreen.
- **Per-camera passwords.** Each device card has its own verification-code field; encrypted
  streams that fail decryption prompt inline and retry just that cell.
- Credentials two ways: server env vars (recommended) or the Settings page (`localStorage`, for local dev).

## How it works

```
Browser ──POST /api/queryDeviceList──► Vercel function ──MD5-signed HTTPS──► Imou Open Platform
Browser ──POST /api/getKitToken─────► Vercel function ─────────────────────► Imou Open Platform
Browser ◄──{ kitToken }─────────────                                        ◄
Browser ──new imouPlayer({ token: kitToken, domain: "https://openapi-…", … })
        └─► SDK calls {domain}/openapi/getEncryptKitStreamUrl, controlMovePTZByKitToken, … directly
        └─► WebSocket (RTSP-over-WS) to the returned media server, WASM-decoded to canvas
```

The serverless functions exist to keep `appSecret` off the client and to cache
the admin `accessToken`. Everything media-related (stream URLs, PTZ commands,
the video WebSocket) is signed with the **kitToken** and goes straight from the
browser to Imou — that's by SDK design.

### Endpoints

| Function | Imou method | Notes |
| --- | --- | --- |
| `api/accessToken.js` | `accessToken` | 3-day token, cached per server instance |
| `api/queryDeviceList.js` | `listDeviceDetailsByPage` | `page` is **1-based**; returns `deviceList[]` with `channelList[]` |
| `api/getKitToken.js` | `getKitToken` | 2h token; we request `type: 0` (all permissions) so PTZ works |
| `api/lib/imou.js` | — | MD5 request signer, host normalization, `currentDomain` region redirect, token cache |
| `api/lib/config.js` | — | env vars take precedence over request-body credentials |

## Run locally

```bash
npm install -g vercel   # once
vercel link             # link to your Vercel project
vercel dev              # http://localhost:3000
```

`vercel dev` reads `vercel.json`: serves `public/` as the site root, runs `api/*.js`
as functions, and applies the same COOP/COEP headers as production. Either set
`IMOU_APP_ID` / `IMOU_APP_SECRET` in a local `.env.local`, or open the app, go to
**Settings**, and paste them there.

## Deploy to Vercel

1. **Create the app in the Imou console** — <https://open.imoulife.com/consoleNew/myApp/appInfo>.
   Note your **data center** (Console → Basic Info → My Info): Singapore / Frankfurt / Oregon.
2. **Add cameras** — devices must be bound to your Open Platform app (via Imou Life and/or `bindDevice`) to appear or stream.
3. **Push this repo** to GitHub/GitLab/Bitbucket and import it at <https://vercel.com/new>.
   No framework preset, no build command — `vercel.json` drives everything.
4. **Project Settings → Environment Variables**, add for Production (and Preview if you want):

   | Name | Value |
   | --- | --- |
   | `IMOU_APP_ID` | your `lcxxxxxxxxxxxxxx` |
   | `IMOU_APP_SECRET` | your app secret (keep it private) |
   | `IMOU_DATA_CENTER_HOST` | optional; defaults to `https://openapi-sg.easy4ip.com`. Other options: `openapi-fk` (Frankfurt), `openapi-or` (Oregon). Must match your app's data center. |

5. **Deploy** — then **Redeploy** once after saving env vars so the functions pick them up.
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
  lib/imou.js              – MD5 signer, region redirect, token cache
  lib/config.js            – env/body credential resolution
public/
  index.html               – camera list page
  player.html              – multi-view grid
  settings.html            – credentials + camera password + connection test
  app.js                   – settings storage, API helper, tiny DOM helpers
  styles.css               – app chrome (the SDK renders its own UI)
  pages/devices.js         – list, Watch-live overlay, pin-to-multi-view
  pages/player.js          – grid lifecycle: render / playAll / pause / destroy
  pages/settings.js        – settings persistence + /api/accessToken test
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
| `1001` player error | Wrong camera password / encryption key in Settings → device code |
| Empty camera list | Camera not bound to the Open Platform app |
| Black cells in multi-view | Cell error text shows the reason; >4 streams or weak GPU also cause this |

## Limitations

- Max 9 concurrent streams (the vendor demo's split-screen ceiling); decode is
  canvas + WASM, so 6–9 cells needs a decent GPU/CPU and will lag on weak hardware.
- Live view only; playback (type `2`) is wired into `getKitToken` but there are
  no date/time pickers yet.
- Camera passwords are stored per browser (`localStorage`), keyed by deviceId.
  Switch device or browser and you re-enter them; there is no account sync.
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