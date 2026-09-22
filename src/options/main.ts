import "./options.css";

import { createExport, applyImport } from "../core/import-export";
import { searchHistory } from "../core/history";
import type { RuntimeRequest } from "../core/messages";
import type { PeekSettings, PeekStorage, PreviewRecord } from "../core/types";
import { readStorage, updateStorage } from "../platform/storage";
import { isLicenseConfigured, PEEK_CONFIG } from "../config";
import type { RuntimeResponse } from "../core/messages";

let state: PeekStorage;
let toastTimer: number | null = null;

void initialize();

async function initialize(): Promise<void> {
  state = await readStorage();
  bindControls();
  render();
}

function isPro(): boolean {
  return state.license.status === "pro" || state.license.status === "grace";
}

function bindControls(): void {
  input<HTMLInputElement>("enabled").addEventListener("change", (event) => void saveSetting("enabled", (event.target as HTMLInputElement).checked));
  select("activation-key").addEventListener("change", (event) => void saveSetting("activationKey", (event.target as HTMLSelectElement).value as PeekSettings["activationKey"]));
  select("card-size").addEventListener("change", (event) => void saveSetting("cardSize", (event.target as HTMLSelectElement).value as PeekSettings["cardSize"]));
  select("card-side").addEventListener("change", (event) => void saveSetting("cardSide", (event.target as HTMLSelectElement).value as PeekSettings["cardSide"]));
  select("appearance").addEventListener("change", (event) => void saveSetting("appearance", (event.target as HTMLSelectElement).value as PeekSettings["appearance"]));
  input<HTMLInputElement>("history-enabled").addEventListener("change", (event) => void saveSetting("historyEnabled", (event.target as HTMLInputElement).checked));
  input<HTMLInputElement>("intent-delay").addEventListener("input", (event) => text("delay-output", `${Number((event.target as HTMLInputElement).value)} ms`));
  input<HTMLInputElement>("intent-delay").addEventListener("change", (event) => void saveSetting("intentDelayMs", Number((event.target as HTMLInputElement).value)));
  input<HTMLInputElement>("history-search").addEventListener("input", renderHistory);
  byId("clear-history").addEventListener("click", () => void clearHistory());
  byId("open-stack").addEventListener("click", () => void toggleStack());
  byId("upgrade").addEventListener("click", () => void openCheckout());
  byId("activate-license").addEventListener("click", () => void runLicenseAction("activate"));
  byId("validate-license").addEventListener("click", () => void runLicenseAction("validate"));
  byId("deactivate-license").addEventListener("click", () => void runLicenseAction("deactivate"));
  byId("export").addEventListener("click", exportData);
  input<HTMLInputElement>("import").addEventListener("change", (event) => void importData(event));
  byId("close-reader").addEventListener("click", () => dialog().close());
}

function render(): void {
  const pro = isPro();
  text("plan-badge", pro ? "Pro" : "Free");
  input<HTMLInputElement>("enabled").checked = state.settings.enabled;
  select("activation-key").value = state.settings.activationKey;
  select("card-size").value = state.settings.cardSize;
  select("card-side").value = state.settings.cardSide;
  select("appearance").value = state.settings.appearance;
  input<HTMLInputElement>("intent-delay").value = String(state.settings.intentDelayMs);
  text("delay-output", `${state.settings.intentDelayMs} ms`);
  input<HTMLInputElement>("history-enabled").checked = state.settings.historyEnabled;
  input<HTMLFieldSetElement>("pro-settings").disabled = !pro;
  byId("settings-lock").hidden = pro;
  (byId("export") as HTMLButtonElement).disabled = !pro;
  input<HTMLInputElement>("import").disabled = !pro;
  renderLicense();
  renderPinned();
  renderHistory();
}

function renderLicense(): void {
  const configured = isLicenseConfigured();
  const pro = isPro();
  text("license-status", pro ? (state.license.status === "grace" ? "Pro · offline grace" : "Peek Pro active") : state.license.status === "invalid" ? "License needs attention" : "Free plan");
  text(
    "license-detail",
    configured
      ? pro
        ? `Verified on this device${state.license.expiresAt ? ` · refresh by ${new Date(state.license.expiresAt).toLocaleDateString()}` : ""}`
        : "Enter the key Creem emails after purchase."
      : "Add your Worker URL, Creem product ID, and receipt public key in src/config.ts before packaging.",
  );
  input<HTMLInputElement>("license-key").hidden = pro;
  (byId("activate-license") as HTMLButtonElement).hidden = pro;
  (byId("validate-license") as HTMLButtonElement).hidden = !pro;
  (byId("deactivate-license") as HTMLButtonElement).hidden = !pro;
  (byId("activate-license") as HTMLButtonElement).disabled = !configured;
  (byId("upgrade") as HTMLButtonElement).disabled = !configured || !PEEK_CONFIG.checkoutUrl;
}

async function openCheckout(): Promise<void> {
  if (!PEEK_CONFIG.checkoutUrl) return showToast("Add the Creem checkout URL in src/config.ts first.");
  const request: RuntimeRequest = { type: "tab.open", requestId: crypto.randomUUID(), url: PEEK_CONFIG.checkoutUrl, active: true };
  await chrome.runtime.sendMessage(request);
}

async function runLicenseAction(action: "activate" | "validate" | "deactivate"): Promise<void> {
  const button = byId(`${action}-license`) as HTMLButtonElement;
  button.disabled = true;
  try {
    const request: RuntimeRequest =
      action === "activate"
        ? { type: "license.activate", requestId: crypto.randomUUID(), licenseKey: input<HTMLInputElement>("license-key").value.trim() }
        : action === "validate"
          ? { type: "license.validate", requestId: crypto.randomUUID() }
          : { type: "license.deactivate", requestId: crypto.randomUUID() };
    const response: RuntimeResponse = await chrome.runtime.sendMessage(request);
    if (!response.ok) throw new Error(response.error.message);
    if (!("license" in response.data)) throw new Error("License service returned an invalid result.");
    state = { ...state, license: response.data.license };
    input<HTMLInputElement>("license-key").value = "";
    render();
    showToast(action === "deactivate" ? "License deactivated" : "License verified");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "License request failed");
  } finally {
    button.disabled = false;
  }
}

async function saveSetting<K extends keyof PeekSettings>(key: K, value: PeekSettings[K]): Promise<void> {
  state = await updateStorage((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  showToast("Saved");
}

function renderPinned(): void {
  renderRecords("pinned-list", state.pinned, "No pins yet. Hold Option or Alt over a link, then choose Pin.", true);
}

function renderHistory(): void {
  const query = input<HTMLInputElement>("history-search").value;
  renderRecords(
    "history-list",
    isPro() ? searchHistory(state.history, query) : [],
    isPro() ? "No preview history yet." : "Searchable history is available with Peek Pro and stays on this device.",
    false,
  );
}

function renderRecords(targetId: string, records: PreviewRecord[], emptyCopy: string, pinned: boolean): void {
  const target = byId(targetId);
  target.replaceChildren();
  if (records.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = emptyCopy;
    target.append(empty);
    return;
  }
  for (const record of records) {
    const row = document.createElement("div");
    row.className = "record";
    const copy = document.createElement("div");
    const title = document.createElement("span");
    title.className = "record__title";
    title.textContent = record.title;
    const host = document.createElement("span");
    host.className = "record__host";
    host.textContent = record.hostname;
    copy.append(title, host);
    const actions = document.createElement("div");
    actions.className = "record__actions";
    actions.append(actionButton("Open", () => void openRecord(record)), actionButton("Read", () => openReader(record)));
    if (pinned) actions.append(actionButton("Remove", () => void removePin(record)));
    row.append(copy, actions);
    target.append(row);
  }
}

function actionButton(label: string, listener: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", listener);
  return button;
}

async function removePin(record: PreviewRecord): Promise<void> {
  state = await updateStorage((current) => ({ ...current, pinned: current.pinned.filter((item) => item.normalizedUrl !== record.normalizedUrl) }));
  renderPinned();
}

async function clearHistory(): Promise<void> {
  if (state.history.length === 0 || !window.confirm("Clear all local Peek history?")) return;
  state = await updateStorage((current) => ({ ...current, history: [] }));
  renderHistory();
  showToast("History cleared");
}

async function toggleStack(): Promise<void> {
  const request: RuntimeRequest = { type: "stack.toggle", requestId: crypto.randomUUID() };
  await chrome.runtime.sendMessage(request);
  showToast("Peek Stack toggled on the current page");
}

async function openRecord(record: PreviewRecord): Promise<void> {
  const request: RuntimeRequest = { type: "tab.open", requestId: crypto.randomUUID(), url: record.url, active: true };
  await chrome.runtime.sendMessage(request);
}

function openReader(record: PreviewRecord): void {
  if (!isPro()) return document.querySelector("#pro")?.scrollIntoView({ behavior: "smooth" });
  text("reader-title", record.title);
  text("reader-body", record.readerText || record.excerpt || "No readable text was available for this page.");
  dialog().showModal();
}

function exportData(): void {
  if (!isPro()) return;
  const blob = new Blob([JSON.stringify(createExport(state), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `peek-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !isPro()) return;
  try {
    const next = applyImport(state, await file.text());
    if (!window.confirm(`Import ${next.pinned.length} pins and ${next.history.length} history entries?`)) return;
    state = await updateStorage(() => next);
    render();
    showToast("Import complete");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Import failed");
  } finally {
    (event.target as HTMLInputElement).value = "";
  }
}

function showToast(message: string): void {
  const toast = byId("toast");
  toast.textContent = message;
  toast.dataset.visible = "true";
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.dataset.visible = "false"), 2_200);
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}
function input<T extends HTMLElement>(id: string): T { return byId(id) as T; }
function select(id: string): HTMLSelectElement { return input<HTMLSelectElement>(id); }
function text(id: string, value: string): void { byId(id).textContent = value; }
function dialog(): HTMLDialogElement { return input<HTMLDialogElement>("reader-dialog"); }
