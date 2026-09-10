// Multi-view grid: instantiates up to 4 imouPlayer instances side by side.
// The Cameras page pushes pinned (device, channel) entries into
// localStorage; this page consumes them on load.
import { $, el, loadSettings, apiPost, banner } from "/app.js";

const QUEUE_KEY = "imou-multi-view-queue";
const grid = $("#grid");
const status = $("#status");
const layoutSel = $("#layout");
const players = new Map(); // cellIndex -> imouPlayer instance

function gridTemplate() {
  const n = Number(layoutSel.value || 2);
  if (n === 1) return "1fr";
  if (n === 2) return "repeat(2, 1fr)";
  if (n === 3) return "repeat(3, 1fr)";
  return "repeat(2, 1fr)";
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
}

function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

// Destroy every running player and empty the map. Must run before the grid
// is rebuilt — an undestroyed imouPlayer keeps its stream open, and the
// account's concurrent-stream allowance is small.
function destroyAll() {
  for (const p of players.values()) {
    try { p.destroy(); } catch {}
  }
  players.clear();
}

function pauseAll() {
  for (const p of players.values()) {
    try { p.pause(); } catch {}
  }
}

function renderGrid() {
  destroyAll();
  const queue = readQueue();
  grid.style.gridTemplateColumns = gridTemplate();
  grid.replaceChildren();
  if (!queue.length) {
    banner(status, "info", 'No cameras pinned yet. Open the Cameras page and click "Multi-view" on a device.');
    return;
  }
  queue.slice(0, 4).forEach((entry, idx) => {
    const stage = el("div", { id: `stage-${idx}`, class: "stage" });
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
  destroyAll();
  banner(status, "info", "Requesting kit tokens…");
  const settings = loadSettings();
  let failures = 0;
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    const stage = $(`#stage-${i}`);
    if (!stage) {
      failures++;
      continue;
    }
    try {
      const kit = await apiPost("/api/getKitToken", {
        ...settings,
        deviceId: entry.deviceId,
        channelId: entry.channelId,
        // Permission type 0 = all permissions. Type 1 (live view only) makes
        // the SDK's controlMovePTZByKitToken call fail, so we always ask for 0.
        type: 0,
      });
      if (!kit?.kitToken) {
        throw new Error("getKitToken returned no kitToken: " + JSON.stringify(kit));
      }
      const playerConfig = {
        id: stage.id,
        // imouPlayer locks the canvas to these pixel dimensions at init, so
        // measure the live cell rather than guessing; the fallbacks cover a
        // collapsed container (e.g. tab opened in the background).
        width: stage.clientWidth || 640,
        height: stage.clientHeight || 360,
        deviceId: entry.deviceId,
        channelId: String(entry.channelId),
        token: kit.kitToken,
        type: 1,
        streamId: Number(settings.defaultStream || 0),
        // imouPlayer concatenates `domain` directly with /openapi/... paths,
        // so it MUST include the https:// scheme — otherwise the browser treats
        // it as a relative URL against our own origin and the stream-URL request 404s.
        domain: (settings.host || "").replace(/\/+$/, ""),
        WasmLibPath: "",
        controls: true,
        controlsConfig: ["play", "volume", "capture", "resolution", "ptz", "fullScreen"],
        title: `${entry.deviceName} · CH${entry.channelId}`,
        handleError: (err) => {
          console.error(`[imou-player ${i}]`, err);
          banner(status, "error", `Player ${i + 1} error ${err?.errCode ?? "?"}: ${err?.errMsg || err?.description || "see browser console"}`);
        },
      };
      if (settings.deviceCode) playerConfig.code = settings.deviceCode;
      players.set(i, new imouPlayer(playerConfig));
    } catch (e) {
      failures++;
      stage.innerHTML = `<div style="color:#e0596b;padding:12px;font-size:13px;">Cannot start ${entry.deviceName}: ${e.message}</div>`;
    }
  }
  const started = queue.length - failures;
  if (started) {
    banner(status, failures ? "info" : "ok", `Playing ${started}/${queue.length} camera${queue.length === 1 ? "" : "s"}.`);
  } else {
    banner(status, "error", `Could not start any of the ${queue.length} camera${queue.length === 1 ? "" : "s"} — see the messages in each cell.`);
  }
}

$("#play-all").addEventListener("click", playAll);
$("#pause-all").addEventListener("click", pauseAll);
$("#destroy-all").addEventListener("click", destroyAll);

// Changing the layout changes every cell's pixel size, and imouPlayer bakes
// width/height in at init — so rebuild the grid and re-init anything playing.
layoutSel.addEventListener("change", () => {
  const wasPlaying = players.size > 0;
  renderGrid();
  if (wasPlaying) playAll();
});

renderGrid();