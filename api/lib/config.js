// Resolves credentials from the request. We prefer server-side env vars
// (Vercel project settings) so secrets never reach the browser, but fall
// back to a per-user settings payload for quick local testing.
export function resolveCreds(body) {
  const envAppId = process.env.IMOU_APP_ID;
  const envAppSecret = process.env.IMOU_APP_SECRET;
  const envHost = process.env.IMOU_DATA_CENTER_HOST;
  const appId = envAppId || body?.appId;
  const appSecret = envAppSecret || body?.appSecret;
  const host = envHost || body?.host;
  if (!appId || !appSecret) {
    const err = new Error(
      "Missing credentials. Set IMOU_APP_ID and IMOU_APP_SECRET env vars on Vercel, or pass appId/appSecret in the request body."
    );
    err.statusCode = 400;
    throw err;
  }
  return { appId, appSecret, host };
}