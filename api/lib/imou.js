// Tiny shared helper for talking to the Imou Open Platform.
// Implements the HMAC-SHA256 signature scheme documented at
// https://open.imoulife.com/book/http/develop.html
//
// All endpoints require: system.ver / appId / sign / time / nonce, plus an
// arbitrary request id and a params object.
import crypto from "node:crypto";

const DEFAULT_HOST = "https://openapi-sg.easy4ip.com";

function calcSign(time, nonce, appSecret) {
  const source = `time:${time},nonce:${nonce},appSecret:${appSecret}`;
  const password = crypto
    .createHash("sha256")
    .update(appSecret, "utf8")
    .digest("hex")
    .toLowerCase();
  const digest = crypto
    .createHmac("sha256", password)
    .update(source, "utf8")
    .digest();
  return Buffer.from(digest).toString("base64");
}

function makeSystem(appId, appSecret) {
  const time = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const sign = calcSign(time, nonce, appSecret);
  return { ver: "1.0", appId, sign, time, nonce };
}

function makeId() {
  return crypto.randomUUID();
}

export async function callImou({ host = DEFAULT_HOST, method, appId, appSecret, params = {} }) {
  if (!appId || !appSecret) {
    throw new Error("Missing appId or appSecret");
  }
  const url = `${host.replace(/\/+$/, "")}/openapi/${method}`;
  const body = {
    system: makeSystem(appId, appSecret),
    id: makeId(),
    params,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from Imou: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const code = json?.result?.code;
  if (code && code !== "0") {
    const err = new Error(`Imou API error ${code}: ${json.result.msg}`);
    err.code = code;
    err.raw = json;
    throw err;
  }
  return json?.result?.data ?? {};
}

export const DEFAULT_DATA_CENTER_HOST = DEFAULT_HOST;

// Tiny shared accessToken cache. accessTokens live ~3 days; we keep one
// per appId+host combination so back-to-back device/kit-token requests
// on the same server instance don't all re-sign against /accessToken.
const accessTokenCache = { token: null, expiresAt: 0, key: "" };
export async function getCachedAccessToken({ appId, appSecret, host }) {
  const now = Math.floor(Date.now() / 1000);
  const key = `${appId}@${host || ""}`;
  if (accessTokenCache.token && accessTokenCache.key === key && accessTokenCache.expiresAt - now > 60) {
    return accessTokenCache.token;
  }
  const data = await callImou({ method: "accessToken", appId, appSecret, host });
  accessTokenCache.token = data.accessToken;
  accessTokenCache.expiresAt = now + Number(data.expireTime || 60);
  accessTokenCache.key = key;
  return data.accessToken;
}