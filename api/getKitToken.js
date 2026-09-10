// Issues a short-lived kitToken for a specific device/channel. The
// kitToken is what the browser feeds into imouPlayer. It expires in 2h.
import { callImou, getCachedAccessToken } from "./lib/imou.js";
import { resolveCreds } from "./lib/config.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = req.body || {};
    if (!body.deviceId || body.channelId === undefined) {
      return res.status(400).json({ error: "deviceId and channelId are required" });
    }
    const creds = resolveCreds(body);
    const accessToken = await getCachedAccessToken(creds);
    const data = await callImou({
      method: "getKitToken",
      ...creds,
      params: {
        token: accessToken,
        deviceId: body.deviceId,
        channelId: String(body.channelId),
        type: String(body.type ?? "0"),
      },
    });
    return res.status(200).json(data);
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ error: e.message, code: e.code });
  }
}