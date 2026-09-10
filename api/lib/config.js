// Resolves credentials for a request.
//
// The browser wins: this deployment supports multiple Imou accounts, and each
// profile in the UI sends its own appId/appSecret. The env vars remain as a
// zero-config fallback for a single-account deployment (and for local dev with
// .env.local), but if you set them AND use profiles, the env values are simply
// ignored whenever the request carries credentials.
export function resolveCreds(body) {
  const appId = body?.appId || process.env.IMOU_APP_ID;
  const appSecret = body?.appSecret || process.env.IMOU_APP_SECRET;
  const host = body?.host || process.env.IMOU_DATA_CENTER_HOST;
  if (!appId || !appSecret) {
    const err = new Error(
      "Missing credentials. Add an account in Settings, or set IMOU_APP_ID and IMOU_APP_SECRET env vars."
    );
    err.statusCode = 400;
    throw err;
  }
  return { appId, appSecret, host };
}