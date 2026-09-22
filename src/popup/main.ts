import "../styles/surface.css";

import type { RuntimeRequest } from "../core/messages";
import { readStorage } from "../platform/storage";

document.querySelector<HTMLButtonElement>("#open-options")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

document.querySelector<HTMLButtonElement>("#toggle-stack")?.addEventListener("click", () => void toggleStack());

async function toggleStack(): Promise<void> {
  const request: RuntimeRequest = { type: "stack.toggle", requestId: crypto.randomUUID() };
  await chrome.runtime.sendMessage(request);
  window.close();
}

void readStorage().then((storage) => {
  const pro = storage.license.status === "pro" || storage.license.status === "grace";
  const plan = document.querySelector("#mini-plan");
  if (plan) plan.textContent = pro ? "Pro" : "Free";
  const status = document.querySelector("#status-copy");
  if (status) status.textContent = storage.settings.enabled ? "Ready on this page" : "Paused in settings";
});
