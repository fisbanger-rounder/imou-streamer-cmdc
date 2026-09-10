// Shared browser-side helpers used by every page.
// All API calls go to /api/* Vercel serverless functions. Credentials
// are passed through the request body when running locally; on Vercel
// the functions pull appId/appSecret from env vars instead.

const STORAGE_KEY = "imou-streamer-settings";

const DEFAULT_SETTINGS = {
  appId: "",
  appSecret: "",
  host: "https://openapi-sg.easy4ip.com",
  defaultStream: "0", // 0 = HD, 1 = SD
  // Fallback device code (camera password / video-encryption key), used only
  // when a camera has no per-device entry in `deviceCodes`.
  deviceCode: "",
  // Per-camera passwords, keyed by deviceId: { "2306...": "mypassword" }.
  // Imou's verification code is per physical device, so this is the right key.
  // Per the SDK docs: custom encryption key if one was set, otherwise the
  // device password, otherwise the SDK falls back to the device SN.
  deviceCodes: {},
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Password resolution order: this exact device's stored code, then the global
// fallback from Settings, then "" (empty means "let the SDK use the device SN").
export function resolveDeviceCode(settings, deviceId) {
  const perDevice = settings?.deviceCodes?.[deviceId];
  if (perDevice) return perDevice;
  return settings?.deviceCode || "";
}

export function setDeviceCode(deviceId, code) {
  const s = loadSettings();
  s.deviceCodes = { ...(s.deviceCodes || {}) };
  if (code) s.deviceCodes[deviceId] = code;
  else delete s.deviceCodes[deviceId];
  saveSettings(s);
  return s;
}

export function hasServerCredentials() {
  // Serverless env vars hide secrets from the browser; if they're set
  // the user doesn't need to enter anything locally.
  return false; // The browser can't tell — we still send the body and the server decides.
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function banner(parent, type, text) {
  const existing = parent.querySelector(".banner");
  if (existing) existing.remove();
  const node = el("div", { class: `banner ${type}` }, text);
  parent.prepend(node);
  return node;
}