import { initializeStorage } from "../platform/storage";
import { isRuntimeRequest, type RuntimeResponse } from "../core/messages";
import { cancelPreview, resolvePreview } from "./preview-service";

chrome.runtime.onInstalled.addListener(() => {
  void initializeStorage();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeStorage();
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

  void resolvePreview(message.requestId, message.url)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch(() => sendResponse({ ok: false, error: { code: "internal", message: "Preview failed safely." } } satisfies RuntimeResponse));
  return true;
});
