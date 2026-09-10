// Cameras index page: lists every device under the developer account with a
// per-camera password field, and offers Watch-live / pin-to-multi-view actions.
import { $, el, loadSettings, saveSettings, resolveDeviceCode, setDeviceCode, apiPost, banner } from "/app.js";

const QUEUE_KEY = "imou-multi-view-queue";
const MAX_VIEWS = 9;

const list = $("#device-list");
const status = $("#status");

let settings = loadSettings();
let devices = [];

async function refresh() {
  list.replaceChildren();
  settings = loadSettings();
  banner(status, "info", "Loading devices…");
  try {
    const data = await apiPost("/api/queryDeviceList", settings);
    // The Imou API returns { deviceList: [...] }; each device carries
    // { deviceId, deviceName, deviceStatus, channelList } and deviceStatus is
    // the string "1" (online) / "0" (offline).
    devices = Array.isArray(data.deviceList) ? data.deviceList : [];
    if (!devices.length) {
      banner(status, "info", "No devices found on this account. Bind the camera to your Open Platform app first.");
      return;
    }
    banner(status, "ok", `Loaded ${devices.length} device${devices.length === 1 ? "" : "s"}.`);
    for (const d of devices) list.appendChild(renderDevice(d));
  } catch (e) {
    banner(status, "error", "Failed to load devices: " + e.message);
  }
}

function renderDevice(d) {
  const channels = Array.isArray(d.channelList) ? d.channelList : [];
  const online = d.deviceStatus === "1";
  const offline = d.deviceStatus === "0";
  const card = el("div", { class: "device" }, [
    el("h3", {}, d.deviceName || d.deviceId || "Unnamed device"),
    el("div", { class: "meta" }, d.deviceId || ""),
    el("div", {}, el("span", {
      class: `status ${online ? "online" : offline ? "offline" : ""}`,
    }, online ? "online" : offline ? "offline" : (d.deviceStatus || "unknown"))),
    renderCodeField(d),
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
      el("button", { onclick: () => watchSingle(d, channelId) }, "Watch live"),
      el("button", { class: "ghost", onclick: () => addToMultiView(d, channelId) }, "Multi-view"),
    ]);
    card.appendChild(row);
  }
  return card;
}

// The verification code is per device, so the field sits on the card, not on
// each channel row. Empty means "use the Settings-page fallback / device SN".
function renderCodeField(d) {
  const current = d.deviceId ? (settings.deviceCodes?.[d.deviceId] || "") : "";
  const input = el("input", {
    type: "password",
    class: "code-input",
    value: current,
    placeholder: current ? "••••••••" : "Camera password / verification code",
    autocomplete: "off",
  });
  const note = el("div", { class: "muted-note" }, current ? "Password saved for this camera." : "Optional — only needed if this camera encrypts its video.");
  input.addEventListener("change", () => {
    const value = input.value.trim();
    setDeviceCode(d.deviceId, value);
    settings = loadSettings();
    note.textContent = value ? "Password saved for this camera." : "Cleared — falling back to Settings / device SN.";
    input.type = "password";
  });
  input.addEventListener("focus", () => { input.type = "text"; });
  input.addEventListener("blur", () => { input.type = "password"; });
  return el("div", { class: "code-field" }, [input, note]);
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
  let codeAsked = false;

  // Starting a stream is restartable: a wrong password surfaces as SDK error
  // 1001, we prompt for the right code, save it against this deviceId, and
  // call start() again — no page reload needed.
  async function start() {
    try {
      const kit = await apiPost("/api/getKitToken", {
        ...settings,
        deviceId: device.deviceId,
        channelId,
        // Permission type 0 = all permissions; type 1 (live only) makes the
        // SDK's controlMovePTZByKitToken call fail.
        type: 0,
      });
      if (!kit?.kitToken) throw new Error("getKitToken returned no kitToken. Response: " + JSON.stringify(kit));

      const config = {
        id: container.id,
        width: container.clientWidth || 1200,
        height: container.clientHeight || 675,
        deviceId: device.deviceId,
        channelId: String(channelId),
        token: kit.kitToken,
        type: 1,
        streamId: Number(settings.defaultStream || 0),
        // imouPlayer concatenates `domain` directly with /openapi/... paths, so
        // it MUST include the https:// scheme or the browser resolves it
        // against our own origin and the stream-URL request 404s.
        domain: (settings.host || "").replace(/\/+$/, ""),
        WasmLibPath: "",
        controls: true,
        title: `${device.deviceName || device.deviceId} · CH${channelId}`,
        handleError: (err) => onPlayerError(err),
        handleCallBack: (e) => console.log("[imou-player]", e),
      };
      const code = resolveDeviceCode(settings, device.deviceId);
      if (code) config.code = code;
      try { player?.destroy(); } catch {}
      player = new imouPlayer(config);
    } catch (e) {
      container.remove();
      banner(status, "error", "Cannot start stream: " + e.message);
    }
  }

  function onPlayerError(err) {
    console.error("[imou-player]", err);
    const code = err?.errCode ?? err?.code;
    // 1001 = decryption failed: ask for this camera's password once per session.
    if (String(code) === "1001" && !codeAsked) {
      codeAsked = true;
      const value = window.prompt(
        `${device.deviceName || device.deviceId} needs its camera password / verification code.\n` +
        `Find it in Imou Life → device → Gear icon → Device Verification Code.`,
        ""
      );
      if (value && value.trim()) {
        setDeviceCode(device.deviceId, value.trim());
        settings = loadSettings();
        banner(status, "info", "Password saved — restarting stream…");
        start();
        return;
      }
    }
    banner(status, "error", `Player error ${code ?? "?"}: ${err?.errMsg || err?.description || "see browser console"}`);
  }

  closeBtn.addEventListener("click", () => {
    try { player?.destroy(); } catch {}
    stage.remove();
  });

  await start();
}

function queuePush(device, channelId) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  const entry = {
    deviceId: device.deviceId,
    deviceName: device.deviceName || device.deviceId,
    channelId: String(channelId),
  };
  if (queue.some((q) => q.deviceId === entry.deviceId && String(q.channelId) === entry.channelId)) return false;
  if (queue.length >= MAX_VIEWS) return false;
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return true;
}

function addToMultiView(device, channelId) {
  const added = queuePush(device, channelId);
  const label = `${device.deviceName || device.deviceId} · CH${channelId}`;
  banner(status, added ? "ok" : "info", added
    ? `Added ${label}. Open Multi-view → Play all.`
    : `${label} is already queued (or the ${MAX_VIEWS}-cell grid is full).`);
}

// Convenience for a fleet: queue every online channel we know about, up to the
// grid limit, then hand off to the multi-view page which autoplays.
function openAllInMultiView() {
  const queue = [];
  for (const d of devices) {
    for (const ch of (Array.isArray(d.channelList) ? d.channelList : [])) {
      if (queue.length >= MAX_VIEWS) break;
      queue.push({
        deviceId: d.deviceId,
        deviceName: d.deviceName || d.deviceId,
        channelId: String(ch.channelId ?? "0"),
      });
    }
    if (queue.length >= MAX_VIEWS) break;
  }
  if (!queue.length) {
    banner(status, "error", "No channels to add.");
    return;
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  // player.html picks the smallest layout that fits the queue by itself.
  location.href = "/player.html?play=1";
}

$("#refresh").addEventListener("click", refresh);
$("#open-all").addEventListener("click", openAllInMultiView);
$("#clear-codes").addEventListener("click", () => {
  const s = loadSettings();
  s.deviceCodes = {};
  saveSettings(s);
  banner(status, "info", "Saved camera passwords cleared.");
  refresh();
});
refresh();