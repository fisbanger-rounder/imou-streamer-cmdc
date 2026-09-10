import { $, loadSettings, saveSettings, apiPost, banner } from "/app.js";

const form = $("#form");
const status = $("#status");
const testResult = $("#test-result");

const current = loadSettings();
form.appId.value = current.appId || "";
form.appSecret.value = current.appSecret || "";
form.host.value = current.host;
form.defaultStream.value = current.defaultStream || "0";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    appId: form.appId.value.trim(),
    appSecret: form.appSecret.value.trim(),
    host: form.host.value,
    defaultStream: form.defaultStream.value,
  };
  saveSettings(data);
  const ok = banner(status, "ok", "Saved. Reload the Cameras page to pick up changes.");
});

$("#clear").addEventListener("click", () => {
  localStorage.removeItem("imou-streamer-settings");
  form.reset();
  form.host.value = current.host;
  banner(status, "info", "Cleared. Server-side env vars (if any) will still be used.");
});

$("#test").addEventListener("click", async () => {
  testResult.textContent = "Testing…";
  try {
    const settings = loadSettings();
    await apiPost("/api/accessToken", settings);
    testResult.textContent = "✓ Connected.";
    testResult.style.color = "var(--ok)";
  } catch (e) {
    testResult.textContent = "✗ " + e.message;
    testResult.style.color = "var(--danger)";
  }
});