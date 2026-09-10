// Multi-view grid: instantiates up to 4 imouPlayer instances side by side.
// The Cameras page pushes pinned (device, channel) entries into
// localStorage; this page consumes them on load.
import { $, el, loadSettings, apiPost, banner } from "/app.js";

const QUEUE_KEY = "imou-multi-view-queue";
const grid = $("#grid");
const status = $("#status");
const layoutSel = $("#layout");
const players = new Map(); // cellId -> imouPlayer instance

function gridTemplate() {
  const n = Number(layoutSel.value || 2);
  if (n === 1) return "1fr";
  if (n === 2) return "repeat(2, 1fr)";
  if (n === 3) return "repeat(3, 1fr)";
  return "repeat(2, 1fr)";
}

function renderGrid() {
  const queue = readQueue();
  const cols = gridTemplate();
  grid.style.gridTemplateColumns = cols;
  grid.replaceChildren();
  players.clear();
  if (!queue.length) {
    banner(status, "info", "No cameras pinned yet. Open the Cameras page and click \"Multi-view\" on a device.");
    return;
  }
  queue.slice(0, 4).forEach((entry, idx) => {
    const cellId = `cell-${idx}`;
    const stage = el("div", { id: cellId, class: "stage" });
    const cell = el("div", { class: "player-cell" }, [
      el("div", { class: "label" }, [
        el("span", {}, `${entry.deviceName} · CH${entry.channelId}`),
        el("button", { class: "danger", onclick: () => removeFromQueue(idx) }, "Remove"),
      ]),
      stage,
    ]);
    grid.appendChild(cell);
  });
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
}

function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function removeFromQueue(idx) {
  const q = readQueue();
  q.splice(idx, 1);
  writeQueue(q);
  renderGrid();
}

async function playAll() {
  const queue = readQueue().slice(0, 4);
  if (!queue.length) {
    banner(status, "info", "Nothing to play. Pin a camera first.");
    return;
  }
  banner(status, "info", "Requesting kit tokens…");
  const settings = loadSettings();
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    const stage = $(`#cell-${i} .stage`);
    if (!stage) continue;
    // Tear down any previous instance in this cell.
    const existing = players.get(i);
    if (existing) { try { existing.destroy(); } catch {} players.delete(i); }
    stage.id = `stage-${i}-${Date.now()}`;
    try {
      const kit = await apiPost("/api/getKitToken", {
        ...settings,
        deviceId: entry.deviceId,
        channelId: entry.channelId,
        type: 1,
      });
      const playerConfig = {
        id: stage.id,
        width: stage.clientWidth || 640,
        height: stage.clientHeight || 360,
        deviceId: entry.deviceId,
        channelId: String(entry.channelId),
        token: kit.kitToken,
        type: 1,
        streamId: Number(settings.defaultStream || 0),
        // imouPlayer derives the WebSocket media server from `domain`. Pass
        // the bare host (no scheme) of the configured data center.
        domain: (settings.host || "").replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
        WasmLibPath: "/WasmLib/",
        controls: true,
        controlsConfig: ["play", "volume", "capture", "resolution", "fullScreen"],
        title: `${entry.deviceName} · CH${entry.channelId}`,
        handleError: (err) => console.error(`[imou-player ${i}]`, err),
      };
      if (settings.deviceCode) playerConfig.code = settings.deviceCode;
      const player = new imouPlayer(playerConfig);
      players.set(i, player);
    } catch (e) {
      stage.innerHTML = `<div style="color:#e0596b;padding:12px;font-size:13px;">Cannot start ${entry.deviceName}: ${e.message}</div>`;
    }
  }
  banner(status, "ok", "Playing.");
}

function pauseAll() {
  for (const p of players.values()) {
    try { p.pause(); } catch {}
  }
}

function destroyAll() {
  for (const [i, p] of players.entries()) {
    try { p.destroy(); } catch {}
    players.delete(i);
  }
}

$("#play-all").addEventListener("click", playAll);
$("#pause-all").addEventListener("click", pauseAll);
$("#destroy-all").addEventListener("click", destroyAll);
layoutSel.addEventListener("change", renderGrid);

// Auto-resize: the imouPlayer canvas locks to its initial width/height;
// we recreate instances on layout change so they fit the new grid cell.
layoutSel.addEventListener("change", () => {
  // Only re-init if something is already playing; otherwise just rerender.
  if (players.size) playAll();
});

renderGrid();