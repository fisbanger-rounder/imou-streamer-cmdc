// Shared helper for talking to the Imou Open Platform.
//
// Signature: the official docs (English and Chinese) both describe
// Base64(HMAC-SHA256(...)), but the live API only accepts plain MD5:
//
//   sign = MD5("time:{t},nonce:{n},appSecret:{s}").hexdigest()   // lowercase hex
//
// Confirmed against the official Imou-OpenPlatform/Py-Imou-Open-Api client.
//
// Region: an accessToken response may carry `currentDomain`, telling us the
// caller's real data-center host. That redirect is cached PER APP ID — one
// account's region must never leak into another account's requests.
import crypto from "node:crypto";

const DEFAULT_HOST = "openapi-sg.easy4ip.com"; // bare hostname; https:// is added per request

// appId -> { seed, resolved } — resolved only valid while seed matches what the
// caller configured, so changing data center in the UI takes effect at once.
const hostCache = new Map();
// `${appId}@${host}` -> { token, expiresAt }
const accessTokenCache = new Map();
const MAX_CACHE_ENTRIES = 64;

function prune(cache) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const now = Math.floor(Date.now() / 1000);
  for (const [key, value] of cache) {
    if (value?.expiresAt && value.expiresAt <= now) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

function calcSign(time, nonce, appSecret) {
  const source = `time:${time},nonce:${nonce},appSecret:${appSecret}`;
  return crypto.createHash("md5").update(source, "utf8").digest("hex");
}

function makeSystem(appId, appSecret) {
  const time = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  return { ver: "1.0", appId, sign: calcSign(time, nonce, appSecret), time, nonce };
}

function normalizeHost(input) {
  if (!input) return DEFAULT_HOST;
  const host = String(input).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return host || DEFAULT_HOST;
}

function resolveHost(appId, seedHost) {
  const seed = normalizeHost(seedHost);
  const cached = hostCache.get(appId);
  if (cached && cached.seed === seed) return cached.resolved;
  hostCache.set(appId, { seed, resolved: seed });
  return seed;
}

export async function callImou({ method, appId, appSecret, host, params = {}, followRedirect = true }) {
  if (!appId || !appSecret) {
    throw new Error("Missing appId or appSecret");
  }
  const url = `https://${resolveHost(appId, host)}/openapi/${method}`;
  const body = { system: makeSystem(appId, appSecret), id: crypto.randomUUID(), params };
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
  if (followRedirect && data.currentDomain) {
    const next = normalizeHost(data.currentDomain);
    if (next) hostCache.set(appId, { seed: normalizeHost(host), resolved: next });
  }
  return data;
}

export const DEFAULT_DATA_CENTER_HOST = DEFAULT_HOST;

// accessTokens live ~3 days and each mint costs against Imou's per-app rate
// limit, so cache one per account. Serverless instances are isolated and go
// cold, so this is a per-warm-instance optimization, not a shared store.
export async function fetchAccessToken({ appId, appSecret, host, force = false }) {
  const seed = normalizeHost(host);
  const key = `${appId}@${seed}`;
  const now = Math.floor(Date.now() / 1000);
  const cached = accessTokenCache.get(key);
  if (!force && cached && cached.expiresAt - now > 60) {
    return { accessToken: cached.token, expireTime: cached.expiresAt - now, cached: true };
  }
  const data = await callImou({ method: "accessToken", appId, appSecret, host });
  const expireTime = Number(data.expireTime || 60);
  accessTokenCache.set(key, { token: data.accessToken, expiresAt: now + expireTime });
  prune(accessTokenCache);
  return { accessToken: data.accessToken, expireTime, cached: false };
}

export async function getCachedAccessToken(creds) {
  const { accessToken } = await fetchAccessToken(creds);
  return accessToken;
}
