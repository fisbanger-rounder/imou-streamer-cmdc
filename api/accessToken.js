// Returns a cached admin accessToken. Tokens last ~3 days; the cache is keyed
// per account in ./lib/imou.js so switching profiles doesn't thrash it.
import { fetchAccessToken } from "./lib/imou.js";
import { resolveCreds } from "./lib/config.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const creds = resolveCreds(req.body || {});
    const { accessToken, expireTime, cached } = await fetchAccessToken({
      ...creds,
      force: Boolean(req.body?.force),
    });
    return res.status(200).json({ accessToken, expireTime, cached });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message, code: e.code });
  }
}
