// Returns a cached admin accessToken. accessTokens last ~3 days; we
// cache in-process and re-fetch when within 60s of the reported expiry.
import { callImou } from "./lib/imou.js";
import { resolveCreds } from "./lib/config.js";

let cache = { token: null, expiresAt: 0, appId: null };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { appId, appSecret, host } = resolveCreds(req.body || {});
    const now = Math.floor(Date.now() / 1000);
    if (cache.token && cache.appId === appId && cache.expiresAt - now > 60) {
      return res.status(200).json({ accessToken: cache.token, expireTime: cache.expiresAt - now, cached: true });
    }
    const data = await callImou({ method: "accessToken", appId, appSecret, host });
    cache = {
      token: data.accessToken,
      expiresAt: now + Number(data.expireTime || 60),
      appId,
    };
    return res.status(200).json({ accessToken: data.accessToken, expireTime: Number(data.expireTime || 60), cached: false });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message, code: e.code });
  }
}