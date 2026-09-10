// Shared helper for talking to the Imou Open Platform.
//
// NOTE on the signature algorithm: the official docs (both English and Chinese)
// describe HMAC-SHA256, but the production API actually expects plain MD5 hex.
// Confirmed against the official Imou-OpenPlatform/Py-Imou-Open-Api SDK, which
// signs every request with:
//
//   sign = MD5( "time:{t},nonce:{n},appSecret:{s}" ).hexdigest()
//
// Endpoint base URL also auto-redirects: the accessToken response may include a
// `currentDomain` field. Subsequent calls must use that host instead of the
// one the user configured, otherwise they'll hit OP1005 (Invalid request URL)
// for endpoints that live on the regional host.
import crypto from "node:crypto";

const DEFAULT_HOST = "openapi-sg.easy4ip.com"; // bare hostname; we add https://

// Mutable global so the accessToken response can swap it in for the right region.
let activeHost = DEFAULT_HOST;

function calcSign(time, nonce, appSecret) {
  const source = `time:${time},nonce:${nonce},appSecret:${appSecret}`;
  return crypto.createHash("md5").update(source, "utf8").digest("hex");
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

function normalizeHost(input) {
  if (!input) return DEFAULT_HOST;
  let h = String(input).trim();
  h = h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return h || DEFAULT_HOST;
}

export async function callImou({ method, appId, appSecret, host, params = {}, followRedirect = true }) {
  if (!appId || !appSecret) {
    throw new Error("Missing appId or appSecret");
  }
  // The configured host is the seed; activeHost is updated by accessToken
  // responses so we follow regional redirects.
  if (host) activeHost = normalizeHost(host);
  const url = `https://${activeHost}/openapi/${method}`;
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
  const data = json?.result?.data ?? {};
  // accessToken may tell us to use a different regional host for future calls.
  if (followRedirect && data.currentDomain) {
    const next = normalizeHost(data.currentDomain);
    if (next && next !== activeHost) activeHost = next;
  }
  return data;
}

export const DEFAULT_DATA_CENTER_HOST = DEFAULT_HOST;

// accessTokens live ~3 days; cache one per (appId, initial host) pair so
// back-to-back device/kit-token calls don't each re-sign against /accessToken.
const accessTokenCache = { token: null, expiresAt: 0, key: "" };
export async function getCachedAccessToken({ appId, appSecret, host }) {
  const now = Math.floor(Date.now() / 1000);
  const key = `${appId}@${normalizeHost(host)}`;
  if (accessTokenCache.token && accessTokenCache.key === key && accessTokenCache.expiresAt - now > 60) {
    return accessTokenCache.token;
  }
  const data = await callImou({ method: "accessToken", appId, appSecret, host });
  accessTokenCache.token = data.accessToken;
  accessTokenCache.expiresAt = now + Number(data.expireTime || 60);
  accessTokenCache.key = key;
  return data.accessToken;
}