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
    // Pagination: the official Python SDK sends integers (page=1, pageSize=10).
    // We coerce to integers, default to 1/10, and send them as numbers because
    // that's what the API expects. Sending page=0 returns OP1003 (invalid value).
    const page = Math.max(1, parseInt(body.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(body.pageSize, 10) || 10));
    const data = await callImou({
      method: "listDeviceDetailsByPage",
      ...creds,
      params: { token: accessToken, page, pageSize },
    });
    return res.status(200).json(data);
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message, code: e.code });
  }
}