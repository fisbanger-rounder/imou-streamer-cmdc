# Imou Streamer

A small web app that lists the cameras on your Imou Open Platform developer account
and plays their live streams through the official `imou-player` SDK in any modern
Chromium / Firefox / Edge browser. Built as static frontend + Vercel serverless
functions so you can deploy with one click.

## Features

- Lists every camera (and channel) under your developer account.
- One-click "Watch live" overlay that streams a single camera.
- Multi-view grid (1 / 2 / 3 / 4 cells) with independent play / pause / destroy.
- Resolution switch (HD / SD), volume, capture, fullscreen — all the SDK controls.
- Two credential modes:
  - **Recommended for production:** set `IMOU_APP_ID` and `IMOU_APP_SECRET` as
    Vercel project env vars. The secret never reaches the browser.
  - **For local dev:** paste the credentials into the Settings page; they're
    stored in `localStorage` only.

## How it works

```
Browser  ──POST /api/queryDeviceList──►  Vercel function  ──HTTPS──► Imou Open Platform
Browser  ──POST /api/getKitToken──────►  Vercel function  ──HTTPS──► Imou Open Platform
Browser  ◄──{kitToken}───────────────                          ◄
Browser  ──imouPlayer({ token: kitToken, ... })──►  Imou WebSocket streaming endpoints
```

- `api/accessToken.js` — fetches and caches an admin accessToken (3-day TTL).
- `api/queryDeviceList.js` — returns the devices bound to the developer account.
- `api/getKitToken.js` — issues a short-lived (2h) playback token that the SDK
  embeds in the WebSocket URL.
- `public/imou-player.js`, `public/imou-player.css`, `public/WasmLib/` — copied
  verbatim from the official `imou-player-SDK` release. Multi-thread decoding is
  enabled via the COOP / COEP headers in `vercel.json`.

## Run locally

```bash
npm install -g vercel          # one-off
vercel link                    # link to a Vercel project (optional for local)
vercel dev                     # http://localhost:3000
```

`vercel dev` reads `vercel.json`, serves `/public/*` statically and `/api/*` as
Node serverless functions with the same COOP / COEP headers as production.

Open <http://localhost:3000>, click **Settings**, paste your `appId` /
`appSecret`, pick the right data-center host, save, and you're done.

## Deploy to Vercel

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Import the project at <https://vercel.com/new>.
3. In **Project Settings → Environment Variables**, add:
   - `IMOU_APP_ID`
   - `IMOU_APP_SECRET`
   - `IMOU_DATA_CENTER_HOST` *(optional — defaults to Singapore)*
4. Click **Deploy**. Vercel serves `public/` as the site root and runs `api/*.js`
   as Node 20 serverless functions.

Because the credentials live in env vars, the **Settings** page on the deployed
site is effectively a no-op for credentials — you can disable it by simply not
loading the page. The frontend never sees the secret.

## Environment variables

| Name                  | Required | Default                          | Notes                                                  |
| --------------------- | -------- | -------------------------------- | ------------------------------------------------------ |
| `IMOU_APP_ID`         | yes      | —                                | From Console → My Apps → App Info                      |
| `IMOU_APP_SECRET`     | yes      | —                                | Same place; keep secret                                |
| `IMOU_DATA_CENTER_HOST` | no     | `https://openapi-sg.easy4ip.com` | Singapore / Frankfurt / Oregon                         |

## File map

```
api/
  accessToken.js       – admin accessToken (cached per server instance)
  getKitToken.js       – 2h kit token per device/channel
  queryDeviceList.js   – device inventory
  lib/imou.js          – shared signer + accessToken cache
  lib/config.js        – env / body credential resolution
public/
  index.html           – camera list page
  player.html          – multi-view grid page
  settings.html        – credential settings page
  styles.css           – app chrome
  app.js               – shared browser helpers
  pages/
    settings.js
    devices.js
    player.js
  imou-player.js       – SDK
  imou-player.css      – SDK
  WasmLib/             – SDK decoder (MultiThread / SingleThread / AudioProcessor)
vercel.json            – routing, COOP/COEP, function runtime
```

## Limitations & notes

- **`domain` must include the `https://` scheme.** The SDK builds its
  stream-URL request as `${domain}/openapi/getEncryptKitStreamUrl`; a bare
  hostname becomes a relative URL against your own origin and 404s with
  "Failed to obtain playback address".
- **Channel limit.** Up to 4 simultaneous streams — the SDK renders to canvas
  with stream decryption, so beyond 4 things get choppy. This matches the
  Imou demo.
- **Encrypted streams.** If a camera has video encryption enabled, the
  `code` parameter (device password or custom encryption key) is required.
  Add it to the player config in `devices.js` / `player.js` if needed.
- **HTTPS required for multi-thread decoding.** Vercel serves over HTTPS by
  default, so this is automatic. Locally with `vercel dev` it's also HTTPS.
- **Cloud playback.** Type `2` (playback) is wired up in the SDK call but the
  UI doesn't expose date pickers yet. Easy follow-up — see `getKitToken` and
  the `beginTime` / `endTime` params on `imouPlayer`.
- **Browser support.** Chrome / Edge ≥ 91 and Firefox ≥ 97 use the multi-thread
  decoder; older browsers fall back to single-thread automatically.

## References

- SDK docs: <https://open.imoulife.com/book/js/sdk.html>
- Open Platform HTTP spec: <https://open.imoulife.com/book/http/develop.html>
- accessToken: <https://open.imoulife.com/book/http/accessToken.html>
- Console: <https://open.imoulife.com/consoleNew/myApp/appInfo>