import { initializeStorage, readStorage } from "../platform/storage";
import { isRuntimeRequest, type ContentRequest, type RuntimeResponse } from "../core/messages";
import { cancelPreview, resolvePreview } from "./preview-service";
import { normalizePreviewUrl } from "../core/url";
import { activateLicense, deactivateLicense, validateLicense } from "./license-service";

chrome.runtime.onInstalled.addListener(() => {
  void initializeAndRefreshLicense();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeAndRefreshLicense();
});

async function initializeAndRefreshLicense(): Promise<void> {
  await initializeStorage();
  const storage = await readStorage();
  const day = 24 * 60 * 60 * 1_000;
  if (storage.license.licenseKey && (!storage.license.checkedAt || Date.now() - storage.license.checkedAt > day)) {
    await validateLicense().catch(() => undefined);
  }
}

async function toggleActiveStack(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active web page.");
  const request: ContentRequest = { type: "ui.stack.toggle", requestId: crypto.randomUUID() };
  await chrome.tabs.sendMessage(tab.id, request);
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-peek-stack") void toggleActiveStack();
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !isRuntimeRequest(message)) {
    sendResponse({ ok: false, error: { code: "invalid_request", message: "Invalid request." } } satisfies RuntimeResponse);
    return false;
  }

  if (message.type === "preview.cancel") {
    cancelPreview(message.requestId);
    sendResponse({ ok: true, data: { cancelled: true } } satisfies RuntimeResponse);
    return false;
  }

  if (message.type === "tab.open") {
    try {
      const url = normalizePreviewUrl(message.url);
      void chrome.tabs.create({ url, active: message.active });
      sendResponse({ ok: true, data: { opened: true } } satisfies RuntimeResponse);
    } catch {
      sendResponse({ ok: false, error: { code: "invalid_request", message: "Invalid link." } } satisfies RuntimeResponse);
    }
    return false;
  }

  if (message.type === "stack.toggle") {
    void toggleActiveStack()
      .then(() => sendResponse({ ok: true, data: { toggled: true } } satisfies RuntimeResponse))
      .catch(() => sendResponse({ ok: false, error: { code: "internal", message: "Peek Stack is unavailable on this page." } } satisfies RuntimeResponse));
    return true;
  }

  if (message.type === "license.activate" || message.type === "license.validate" || message.type === "license.deactivate") {
    const operation =
      message.type === "license.activate"
        ? activateLicense(message.licenseKey)
        : message.type === "license.validate"
          ? validateLicense()
          : deactivateLicense();
    void operation
      .then((license) => sendResponse({ ok: true, data: { license } } satisfies RuntimeResponse))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: {
            code: "internal",
            message: error instanceof Error ? error.message : "License request failed safely.",
          },
        } satisfies RuntimeResponse),
      );
    return true;
  }

  void resolvePreview(message.requestId, message.url)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch(() => sendResponse({ ok: false, error: { code: "internal", message: "Preview failed safely." } } satisfies RuntimeResponse));
  return true;
});
