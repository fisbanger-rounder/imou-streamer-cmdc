// Cameras index page: lists every device under the developer account and
// provides "Watch live" / "Add to multi-view" buttons per camera.
import { $, el, loadSettings, apiPost, banner } from "/app.js";

const list = $("#device-list");
const status = $("#status");

async function refresh() {
  list.replaceChildren();
  banner(status, "info", "Loading devices…");
  try {
    const settings = loadSettings();
    const data = await apiPost("/api/queryDeviceList", settings);
    const devices = data.devices || [];
    if (!devices.length) {
      banner(status, "info", "No devices found on this account. Add an Imou camera in the Imou Life app first.");
      return;
    }
    banner(status, "ok", `Loaded ${devices.length} device${devices.length === 1 ? "" : "s"}.`);
    for (const d of devices) {
      list.appendChild(renderDevice(d));
    }
  } catch (e) {
    banner(status, "error", "Failed to load devices: " + e.message);
  }
}

function renderDevice(d) {
  const channels = Array.isArray(d.channels) ? d.channels : [];
  // Device shape: { deviceId, deviceName, status: 'online' | 'offline', channels: [{ channelId, channelName }] }
  const card = el("div", { class: "device" }, [
    el("h3", {}, d.deviceName || d.deviceId || "Unnamed device"),
    el("div", { class: "meta" }, d.deviceId || ""),
    el("div", {}, el("span", { class: `status ${d.status === "online" ? "online" : "offline"}` }, d.status || "unknown")),
  ]);

  if (!channels.length) {
    card.appendChild(el("div", { class: "muted-note", style: "margin-top:8px" }, "No channels reported."));
  }
  for (const ch of channels) {
    const channelId = ch.channelId ?? "0";
    const row = el("div", { class: "row", style: "margin-top:10px; gap:6px" }, [
      el("div", { style: "flex:1" }, [
        el("div", {}, ch.channelName || `Channel ${channelId}`),
        el("div", { class: "muted-note" }, `channelId: ${channelId}`),
      ]),
      el("button", {
        onclick: () => watchSingle(d, channelId),
      }, "Watch live"),
      el("button", {
        class: "ghost",
        onclick: () => addToMultiView(d, channelId),
      }, "Multi-view"),
    ]);
    card.appendChild(row);
  }
  return card;
}

async function watchSingle(device, channelId) {
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;";
  const container = document.createElement("div");
  container.id = "single-stage";
  container.style.cssText = "width:min(1200px,90vw);aspect-ratio:16/9;background:black;border-radius:8px;overflow:hidden;";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close ✕";
  closeBtn.className = "danger";
  closeBtn.style.cssText = "padding:8px 14px;";
  stage.append(container, closeBtn);
  document.body.appendChild(stage);

  let player;
  try {
    const settings = loadSettings();
    const kit = await apiPost("/api/getKitToken", {
      ...settings,
      deviceId: device.deviceId,
      channelId,
      type: 1,
    });
    player = new imouPlayer({
      id: container.id,
      width: container.clientWidth || 1200,
      height: container.clientHeight || 675,
      deviceId: device.deviceId,
      channelId: String(channelId),
      token: kit.kitToken,
      type: 1,
      streamId: Number(settings.defaultStream || 0),
      WasmLibPath: "/WasmLib/",
      controls: true,
      title: `${device.deviceName || device.deviceId} · CH${channelId}`,
      handleError: (err) => console.error("[imou-player error]", err),
      handleCallBack: (e) => console.log("[imou-player]", e),
    });
  } catch (e) {
    container.remove();
    banner(status, "error", "Cannot start stream: " + e.message);
    return;
  }

  closeBtn.addEventListener("click", () => {
    try { player?.destroy(); } catch {}
    stage.remove();
  });
}

function addToMultiView(device, channelId) {
  // Multi-view state is read by player.js via localStorage.
  const key = "imou-multi-view-queue";
  const queue = JSON.parse(localStorage.getItem(key) || "[]");
  const entry = { deviceId: device.deviceId, deviceName: device.deviceName || device.deviceId, channelId, channelName: "" };
  if (!queue.some((q) => q.deviceId === entry.deviceId && String(q.channelId) === String(entry.channelId))) {
    queue.push(entry);
    localStorage.setItem(key, JSON.stringify(queue));
  }
  banner(status, "ok", `Added ${entry.deviceName} · CH${channelId} to multi-view. Open Multi-view → Play all.`);
}

$("#refresh").addEventListener("click", refresh);
refresh();