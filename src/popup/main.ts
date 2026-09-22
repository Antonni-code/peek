import "../styles/surface.css";

import type { RuntimeRequest } from "../core/messages";
import { readStorage } from "../platform/storage";
import { deriveEntitlement } from "../core/entitlement";
import { PEEK_CONFIG } from "../config";

document.querySelector<HTMLButtonElement>("#open-options")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

document.querySelector<HTMLButtonElement>("#toggle-stack")?.addEventListener("click", () => void toggleStack());

async function toggleStack(): Promise<void> {
  const request: RuntimeRequest = { type: "stack.toggle", requestId: crypto.randomUUID() };
  await chrome.runtime.sendMessage(request);
  window.close();
}

void readStorage().then(async (storage) => {
  const entitlement = await deriveEntitlement(storage.license, {
    productId: PEEK_CONFIG.creemProductId,
    mode: PEEK_CONFIG.creemMode,
    publicJwk: PEEK_CONFIG.receiptPublicJwk,
  });
  const pro = entitlement === "pro" || entitlement === "grace";
  const plan = document.querySelector("#mini-plan");
  if (plan) plan.textContent = pro ? "Pro" : "Free";
  const status = document.querySelector("#status-copy");
  if (status) status.textContent = storage.settings.enabled ? "Ready on this page" : "Paused in settings";
});
