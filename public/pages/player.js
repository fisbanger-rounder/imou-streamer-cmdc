// Multi-view grid: runs several imouPlayer instances side by side. The Cameras
// page writes the pinned (device, channel) list to localStorage; this page
// reads it and can autoplay via ?play=1.
import { $, el, loadSettings, resolveDeviceCode, setDeviceCode, apiCreds, apiPost, banner, queueKey } from "/app.js";

// Resolved once at module load: switching accounts reloads the page.
const QUEUE_KEY = queueKey();
// The vendor demo caps split-screen at 9; decode is CPU-heavy so more than
// that gets choppy fast.
const MAX_VIEWS = 9;
const LAYOUTS = [1, 2, 3, 4, 6, 9];

const grid = $("#grid");
const status = $("#status");
const layoutSel = $("#layout");
const players = new Map(); // cellIndex -> imouPlayer
const codeAsked = new Set(); // cells we've already prompted about this session
let settings = loadSettings();

const params = new URLSearchParams(location.search);

function viewCount() {
  const n = Number(layoutSel.value || 4);
  return LAYOUTS.includes(n) ? n : 4;
}

// Column count for a given number of cells, mirroring the vendor's split
// layouts: 4 becomes 2x2, 6 becomes 2x3, 9 becomes 3x3.
function gridTemplate(count) {
  if (count <= 1) return "1fr";
  if (count <= 3) return `repeat(${count}, 1fr)`;
  if (count === 4) return "repeat(2, 1fr)";
  return "repeat(3, 1fr)";
}

function readQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(q) ? q.slice(0, MAX_VIEWS) : [];
  } catch {
    return [];
  }
}

function destroyAll() {
  for (const p of players.values()) {
    try { p.destroy(); } catch {}
  }
  players.clear();
  codeAsked.clear();
}

function pauseAll() {
  for (const p of players.values()) {
    try { p.pause(); } catch {}
  }
}

async function removeFromQueue(idx) {
  const q = readQueue();
  q.splice(idx, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  // Cell indices are positional, so the grid must be rebuilt — which stops all
  // players. Resume afterwards if the wall was live, minus the removed camera.
  const wasPlaying = players.size > 0;
  renderGrid();
  if (wasPlaying) await playAll();
}

function renderGrid() {
  // ReplaceChildren() below would otherwise orphan live players: their canvases
  // vanish but the streams stay open, eating the account's concurrency allowance.
  destroyAll();
  settings = loadSettings();
  const queue = readQueue();
  const shown = queue.slice(0, viewCount());
  grid.style.gridTemplateColumns = gridTemplate(shown.length || viewCount());
  grid.replaceChildren();
  if (!queue.length) {
    banner(status, "info", 'No cameras queued. Open the Cameras page and use "Multi-view" or "Play all in multi-view".');
    return;
  }
  shown.forEach((entry, idx) => {
    const stage = el("div", { id: `stage-${idx}`, class: "stage" });
    grid.appendChild(el("div", { class: "player-cell" }, [
      el("div", { class: "label" }, [
        el("span", {}, `${entry.deviceName} · CH${entry.channelId}`),
        el("button", { class: "danger", onclick: () => removeFromQueue(idx) }, "Remove"),
      ]),
      stage,
    ]));
  });
  if (queue.length > shown.length) {
    banner(status, "info", `${queue.length} cameras queued — this layout shows ${shown.length}. Switch Layout for more.`);
  }
}

// One cell's full start sequence, kept separate so a wrong password can be
// retried without disturbing the other streams.
async function playCell(idx, entry) {
  const stage = $(`#stage-${idx}`);
  if (!stage) return false;

  const existing = players.get(idx);
  if (existing) {
    try { existing.destroy(); } catch {}
    players.delete(idx);
  }
  // Drop any leftover markup — an inline password prompt from a previous
  // decryption failure would otherwise sit inside the player's mount point.
  stage.innerHTML = "";

  try {
    const kit = await apiPost("/api/getKitToken", {
      ...apiCreds(settings),
      deviceId: entry.deviceId,
      channelId: entry.channelId,
      // Permission type 0 = all permissions; type 1 (live only) breaks the
      // SDK's controlMovePTZByKitToken call.
      type: 0,
    });
    if (!kit?.kitToken) throw new Error("getKitToken returned no kitToken: " + JSON.stringify(kit));

    const config = {
      id: stage.id,
      // imouPlayer bakes these pixel dimensions in at init, so measure the
      // live cell; the fallbacks cover a container that hasn't laid out yet.
      width: stage.clientWidth || 640,
      height: stage.clientHeight || 360,
      deviceId: entry.deviceId,
      channelId: String(entry.channelId),
      token: kit.kitToken,
      type: 1,
      streamId: Number(settings.defaultStream || 0),
      // imouPlayer concatenates `domain` directly with /openapi/... paths, so
      // it MUST include the https:// scheme or the stream-URL request resolves
      // against our own origin and 404s.
      domain: (settings.host || "").replace(/\/+$/, ""),
      WasmLibPath: "",
      controls: true,
      controlsConfig: ["play", "volume", "capture", "resolution", "ptz", "fullScreen"],
      title: `${entry.deviceName} · CH${entry.channelId}`,
      handleError: (err) => onCellError(idx, entry, err),
    };
    const code = resolveDeviceCode(settings, entry.deviceId);
    if (code) config.code = code;
    players.set(idx, new imouPlayer(config));
    return true;
  } catch (e) {
    stage.innerHTML = `<div style="color:#e0596b;padding:12px;font-size:13px;">Cannot start ${entry.deviceName}: ${e.message}</div>`;
    return false;
  }
}

// 1001 means the stream arrived but won't decrypt — that camera's password is
// missing or wrong. Prompt inline in the cell, save against its deviceId, and
// restart only that cell.
function onCellError(idx, entry, err) {
  console.error(`[imou-player ${idx}]`, err);
  const code = String(err?.errCode ?? err?.code ?? "");
  if (code !== "1001" || codeAsked.has(idx)) {
    banner(status, "error", `Camera ${idx + 1} error ${code || "?"}: ${err?.errMsg || err?.description || "see browser console"}`);
    return;
  }
  codeAsked.add(idx);
  const stage = $(`#stage-${idx}`);
  if (!stage) return;
  stage.innerHTML = "";
  const input = el("input", { type: "text", placeholder: `${entry.deviceName}: camera password`, style: "width:100%;margin-bottom:8px;" });
  const save = el("button", {}, "Save & retry");
  const hint = el("div", { class: "muted-note", style: "margin-bottom:8px" }, "This camera's video is encrypted — enter its password (Imou Life → device → Device Verification Code).");
  save.addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) return;
    setDeviceCode(entry.deviceId, value);
    settings = loadSettings();
    await playCell(idx, entry);
  });
  const wrap = el("div", { style: "padding:12px;color:#ffb6c0;font-size:13px;" }, [hint, input, save]);
  stage.appendChild(wrap);
  banner(status, "info", `Camera ${idx + 1} needs its password — enter it in that cell.`);
}

async function playAll() {
  settings = loadSettings();
  const queue = readQueue().slice(0, viewCount());
  if (!queue.length) {
    banner(status, "info", "Nothing to play. Queue a camera first.");
    return;
  }
  // renderGrid() clears the mount points, so destroy first, then rebuild cells.
  destroyAll();
  renderGrid();
  banner(status, "info", `Starting ${queue.length} camera${queue.length === 1 ? "" : "s"}…`);
  let ok = 0;
  for (let i = 0; i < queue.length; i++) {
    if (await playCell(i, queue[i])) ok++;
  }
  if (ok === queue.length) {
    banner(status, "ok", `Playing ${ok}/${queue.length} camera${queue.length === 1 ? "" : "s"}.`);
  } else if (ok) {
    banner(status, "info", `Playing ${ok}/${queue.length} cameras — failed cells show their reason.`);
  } else {
    banner(status, "error", `Could not start any of the ${queue.length} cameras — see the messages in each cell.`);
  }
}

function initLayout() {
  const requested = Number(params.get("layout"));
  const queue = readQueue();
  // Default to the smallest layout that fits everything queued, so a fleet of
  // cameras all appears on one screen without the user picking a grid size.
  const target = Number.isFinite(requested) && LAYOUTS.includes(requested)
    ? requested
    : (LAYOUTS.find((n) => n >= Math.max(queue.length, 1)) || MAX_VIEWS);
  layoutSel.value = String(target);
}

$("#play-all").addEventListener("click", playAll);
$("#pause-all").addEventListener("click", pauseAll);
$("#destroy-all").addEventListener("click", () => { destroyAll(); renderGrid(); });
layoutSel.addEventListener("change", () => {
  const wasPlaying = players.size > 0;
  renderGrid();
  if (wasPlaying) playAll();
});

initLayout();
renderGrid();
if (params.get("play") === "1") playAll();