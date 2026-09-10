// Lists devices under the developer account. Each call internally fetches
// a fresh accessToken via /api/accessToken first (caching saves us from
// re-signing every request).
import { callImou, getCachedAccessToken } from "./lib/imou.js";
import { resolveCreds } from "./lib/config.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = req.body || {};
    const creds = resolveCreds(body);
    const accessToken = await getCachedAccessToken(creds);
    const data = await callImou({
      method: "queryDeviceList",
      ...creds,
      params: { token: accessToken, page: body.page || 0, pageSize: body.pageSize || 50 },
    });
    return res.status(200).json(data);
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message, code: e.code });
  }
}