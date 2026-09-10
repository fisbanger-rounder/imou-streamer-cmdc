// Shared browser-side helpers used by every page.
//
// Accounts ("profiles") hold an Imou Open Platform app's credentials plus the
// per-camera settings that belong to that app. Everything lives in
// localStorage: this deployment has no user database, so whoever opens the app
// adds their own account and its appSecret stays in their browser.
//
// All API calls go to /api/* Vercel serverless functions, which sign requests
// with the credentials in the POST body (falling back to env vars when the
// browser supplies none).

const ACCOUNTS_KEY = "imou-streamer-accounts";
const LEGACY_KEY = "imou-streamer-settings";

const PROFILE_DEFAULTS = {
  id: "",
  label: "",
  appId: "",
  appSecret: "",
  host: "https://openapi-sg.easy4ip.com",
  defaultStream: "0", // 0 = HD, 1 = SD
  // Fallback device code (camera password / encryption key), used only when a
  // camera has no entry in `deviceCodes`.
  deviceCode: "",
  // Per-camera passwords keyed by deviceId — Imou's verification code belongs
  // to the physical device, and device lists are per app, so these live with
  // the profile rather than globally.
  deviceCodes: {},
};

function newProfileId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStore(raw) {
  const state = { profiles: [], activeId: "" };
  for (const p of (Array.isArray(raw?.profiles) ? raw.profiles : [])) {
    if (!p || typeof p !== "object") continue;
    state.profiles.push({ ...PROFILE_DEFAULTS, ...p, id: p.id || newProfileId(), deviceCodes: { ...(p.deviceCodes || {}) } });
  }
  state.activeId = raw?.activeId || state.profiles[0]?.id || "";
  if (!state.profiles.some((p) => p.id === state.activeId)) state.activeId = state.profiles[0]?.id || "";
  return state;
}

function migrateLegacy() {
  // One release stored a single flat settings object; promote it to a profile.
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw);
    if (!legacy?.appId && !legacy?.appSecret) return null;
    const profile = {
      ...PROFILE_DEFAULTS,
      ...legacy,
      id: newProfileId(),
      label: "Default account",
      deviceCodes: { ...(legacy.deviceCodes || {}) },
    };
    return profile;
  } catch {
    return null;
  }
}

function readStore() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "null");
  } catch {
    state = null;
  }
  const parsed = normalizeStore(state);
  if (!parsed.profiles.length) {
    const legacy = migrateLegacy();
    if (legacy) {
      parsed.profiles = [legacy];
      parsed.activeId = legacy.id;
      writeStore(parsed);
      localStorage.removeItem(LEGACY_KEY);
    }
  }
  return parsed;
}

function writeStore(state) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(normalizeStore(state)));
}

export function listProfiles() {
  return readStore().profiles;
}

export function getActiveProfile() {
  const state = readStore();
  return state.profiles.find((p) => p.id === state.activeId) || state.profiles[0] || null;
}

// The shape every page already expects: the active profile's settings.
export function loadSettings() {
  const active = getActiveProfile();
  return { ...PROFILE_DEFAULTS, ...(active || {}) };
}

// Patches the active profile, creating one if the store is empty.
export function saveSettings(patch) {
  const state = readStore();
  let profile = state.profiles.find((p) => p.id === state.activeId);
  if (!profile) {
    profile = { ...PROFILE_DEFAULTS, id: newProfileId(), label: "Account 1" };
    state.profiles.push(profile);
    state.activeId = profile.id;
  }
  Object.assign(profile, patch, { id: profile.id });
  writeStore(state);
  return profile;
}

export function addProfile(patch = {}) {
  const state = readStore();
  const profile = {
    ...PROFILE_DEFAULTS,
    ...patch,
    id: newProfileId(),
    label: patch.label || `Account ${state.profiles.length + 1}`,
    deviceCodes: { ...(patch.deviceCodes || {}) },
  };
  state.profiles.push(profile);
  state.activeId = profile.id;
  writeStore(state);
  return profile;
}

export function updateProfile(id, patch) {
  const state = readStore();
  const profile = state.profiles.find((p) => p.id === id);
  if (!profile) return null;
  Object.assign(profile, patch, { id });
  writeStore(state);
  return profile;
}

export function deleteProfile(id) {
  const state = readStore();
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.activeId === id) state.activeId = state.profiles[0]?.id || "";
  writeStore(state);
  return state;
}

export function setActiveProfile(id) {
  const state = readStore();
  if (!state.profiles.some((p) => p.id === id)) return state;
  state.activeId = id;
  writeStore(state);
  return state;
}

// Password resolution order: this device's stored code, then the profile's
// fallback, then "" (empty = let the SDK use the device SN).
export function resolveDeviceCode(settings, deviceId) {
  const perDevice = settings?.deviceCodes?.[deviceId];
  if (perDevice) return perDevice;
  return settings?.deviceCode || "";
}

export function setDeviceCode(deviceId, code) {
  const profile = getActiveProfile();
  if (!profile) return null;
  const codes = { ...(profile.deviceCodes || {}) };
  if (code) codes[deviceId] = code;
  else delete codes[deviceId];
  // updateProfile assigns wholesale so deleting an entry actually deletes it.
  return updateProfile(profile.id, { deviceCodes: codes });
}

// The pinned-camera queue belongs to one account: cameras from app A are not
// streamable by app B, so the list is keyed by profile id.
export function queueKey() {
  const id = getActiveProfile()?.id;
  if (!id) return "imou-multi-view-queue";
  const key = `imou-multi-view-queue:${id}`;
  // One-time lift of the old shared queue into whichever account is open now.
  const legacy = localStorage.getItem("imou-multi-view-queue");
  if (legacy !== null && localStorage.getItem(key) === null) {
    localStorage.setItem(key, legacy);
    localStorage.removeItem("imou-multi-view-queue");
  }
  return key;
}

// Only the fields the serverless functions actually need. Keeping camera
// passwords and UI prefs out of the request body avoids sending data the
// functions would just ignore.
export function apiCreds(settings) {
  return { appId: settings.appId, appSecret: settings.appSecret, host: settings.host };
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
    // Callers build children conditionally (`cond && el(...)`), which yields
    // false — skip nullish and boolean junk rather than feeding it to appendChild.
    if (c == null || c === false || c === true) continue;
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

// Account switcher injected into every page header, so the active Imou account
// is always visible and switchable. Reloading on change is deliberate: pages
// cache loaded devices and live players that belong to the old account.
function mountAccountBar() {
  const nav = $("header.top nav");
  if (!nav || $("#account-bar")) return;
  const profiles = listProfiles();
  const active = getActiveProfile();
  const select = el("select", {
    id: "account-bar",
    class: "account-select",
    title: "Switch Imou account",
    onchange: (e) => { setActiveProfile(e.target.value); location.reload(); },
  });
  if (!profiles.length) {
    select.appendChild(el("option", { value: "" }, "No accounts — add one"));
    select.addEventListener("change", () => { location.href = "/settings.html"; });
  } else {
    for (const p of profiles) {
      select.appendChild(el("option", { value: p.id, selected: p.id === active?.id ? "selected" : null }, p.label || p.appId || "Account"));
    }
  }
  nav.insertBefore(select, nav.firstChild);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAccountBar);
} else {
  mountAccountBar();
}