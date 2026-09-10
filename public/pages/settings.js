// Account manager: CRUD over the Imou profiles stored in localStorage.
import {
  $, el, banner, apiPost,
  listProfiles, getActiveProfile, addProfile, updateProfile, deleteProfile, setActiveProfile,
} from "/app.js";

const status = $("#status");
const form = $("#form");
const list = $("#account-list");
const title = $("#details-title");
const testResult = $("#test-result");

let editingId = "";

function ensureProfile() {
  // The form always edits a real profile, so seed one on a blank browser.
  if (!getActiveProfile()) addProfile({ label: "Account 1" });
  return getActiveProfile();
}

function readForm() {
  return {
    label: form.label.value.trim(),
    appId: form.appId.value.trim(),
    appSecret: form.appSecret.value.trim(),
    host: form.host.value,
    defaultStream: form.defaultStream.value,
    deviceCode: form.deviceCode.value,
  };
}

function fillForm(profile) {
  editingId = profile?.id || "";
  form.label.value = profile?.label || "";
  form.appId.value = profile?.appId || "";
  form.appSecret.value = profile?.appSecret || "";
  form.host.value = profile?.host || "https://openapi-sg.easy4ip.com";
  form.defaultStream.value = profile?.defaultStream || "0";
  form.deviceCode.value = profile?.deviceCode || "";
  const name = profile?.label || profile?.appId || "this account";
  title.textContent = `Account details — ${name}`;
  const cameras = Object.keys(profile?.deviceCodes || {}).length;
  if (cameras) title.textContent += ` (${cameras} saved camera password${cameras === 1 ? "" : "s"})`;
}

function renderAccounts() {
  const profiles = listProfiles();
  const active = getActiveProfile();
  list.replaceChildren();
  if (!profiles.length) {
    list.appendChild(el("div", { class: "muted-note" }, "No accounts yet."));
    return;
  }
  for (const p of profiles) {
    const isActive = p.id === active?.id;
    const isEditing = p.id === editingId;
    const codes = Object.keys(p.deviceCodes || {}).length;
    list.appendChild(el("div", { class: `account-row${isActive ? " active" : ""}` }, [
      el("div", { style: "flex:1; min-width:0" }, [
        el("div", {}, [
          el("strong", {}, p.label || p.appId || "Unnamed account"),
          isActive ? el("span", { class: "status online", style: "margin-left:8px" }, "in use") : null,
        ]),
        el("div", { class: "muted-note" }, `${p.appId || "no app id"} · ${(p.host || "").replace(/^https?:\/\//i, "")}${codes ? ` · ${codes} camera password${codes === 1 ? "" : "s"}` : ""}`),
      ]),
      el("div", { class: "row", style: "margin:0; gap:6px; flex:0 0 auto" }, [
        isEditing
          ? el("span", { class: "muted-note", style: "align-self:center" }, "editing")
          : el("button", { class: "ghost", onclick: () => fillForm(p) }, "Edit"),
        !isActive && el("button", { class: "ghost", onclick: () => { setActiveProfile(p.id); if (editingId === p.id) fillForm(p); renderAccounts(); } }, "Use"),
        el("button", {
          class: "danger",
          onclick: () => {
            if (!window.confirm(`Remove "${p.label || p.appId}" from this browser? Its camera passwords go too.`)) return;
            deleteProfile(p.id);
            fillForm(getActiveProfile());
            renderAccounts();
          },
        }, "Delete"),
      ]),
    ]));
  }
}

$("#add-account").addEventListener("click", () => {
  const profile = addProfile({ label: `Account ${listProfiles().length + 1}` });
  renderAccounts();
  fillForm(profile);
  form.label.focus();
  banner(status, "info", "New account created — fill in its App ID and App Secret, then Save.");
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = readForm();
  if (!data.appId || !data.appSecret) {
    banner(status, "error", "App ID and App Secret are both required.");
    return;
  }
  const target = editingId || getActiveProfile()?.id;
  const saved = target ? updateProfile(target, data) : addProfile(data);
  editingId = saved.id;
  renderAccounts();
  fillForm(saved);
  banner(status, "ok", `Saved "${saved.label || saved.appId}". Reload the Cameras page to list its devices.`);
});

$("#cancel-edit").addEventListener("click", () => {
  fillForm(listProfiles().find((p) => p.id === editingId) || getActiveProfile());
  banner(status, "info", "Reverted to the saved values.");
});

$("#test").addEventListener("click", async () => {
  testResult.textContent = "Testing…";
  testResult.style.color = "var(--muted)";
  try {
    const data = readForm();
    await apiPost("/api/accessToken", { appId: data.appId, appSecret: data.appSecret, host: data.host });
    testResult.textContent = "✓ Connected.";
    testResult.style.color = "var(--ok)";
  } catch (e) {
    testResult.textContent = `✗ ${e.code ? `${e.code}: ` : ""}${e.message}`;
    testResult.style.color = "var(--danger)";
  }
});

fillForm(ensureProfile());
renderAccounts();