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