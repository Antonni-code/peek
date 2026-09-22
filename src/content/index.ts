import { PreviewController } from "./preview-controller";
import { copyUrl, openTab, removePinned, saveToHistory, togglePinned } from "./actions";
import { PeekSurface } from "./peek-surface";
import { readStorage } from "../platform/storage";
import { isContentRequest } from "../core/messages";
import { DEFAULT_SETTINGS } from "../core/defaults";

const ROOT_ATTRIBUTE = "data-peek-extension";

if (!document.documentElement.hasAttribute(ROOT_ATTRIBUTE)) {
  document.documentElement.setAttribute(ROOT_ATTRIBUTE, "ready");
}

void bootstrap();

async function bootstrap(): Promise<void> {
  const storage = await readStorage();
  if (!storage.settings.enabled) return;

  let controller: PreviewController | null = null;
  let stackOpen = false;
  const isPro = storage.license.status === "pro" || storage.license.status === "grace";
  const effectiveSettings = isPro
    ? storage.settings
    : { ...DEFAULT_SETTINGS, enabled: storage.settings.enabled };
  const surface = new PeekSurface({
    settings: effectiveSettings,
    isPro,
    onAction: (action) => {
      if (action.type === "open") void openTab(action.url, action.active);
      if (action.type === "copy") void copyUrl(action.url);
      if (action.type === "pin") {
        void togglePinned(action.record).then((result) => {
          storage.pinned = result.records;
          surface.setPinned(result.pinned);
          if (stackOpen) surface.renderStack(storage.pinned, true);
        });
      }
      if (action.type === "retry") controller?.retry();
      if (action.type === "dismiss") controller?.dismiss();
      if (action.type === "reader") surface.showReader(action.record);
      if (action.type === "upgrade") void chrome.runtime.openOptionsPage();
      if (action.type === "stack.select") surface.showStored(action.record);
      if (action.type === "stack.close") {
        stackOpen = false;
        surface.renderStack(storage.pinned, false);
      }
      if (action.type === "stack.remove") {
        void removePinned(action.record.normalizedUrl).then((pinned) => {
          storage.pinned = pinned;
          surface.renderStack(pinned, stackOpen);
          surface.setPinned(false);
        });
      }
    },
  });
  controller = new PreviewController({
    delayMs: effectiveSettings.intentDelayMs,
    activationKey: effectiveSettings.activationKey,
    isInteractiveTarget: (target) => surface.contains(target),
    shouldRetain: () => surface.shouldRetain(),
    onStateChange: (state) => {
      if (state.status === "idle") surface.hide();
      if (state.status === "intent") surface.showIntent(state.anchor);
      if (state.status === "loading") surface.showLoading(state.anchor, state.url);
      if (state.status === "resolved") {
        surface.showResolution(state.anchor, state.result);
        surface.setPinned(storage.pinned.some((item) => state.result.status === "ready" && item.normalizedUrl === state.result.record.normalizedUrl));
        if (state.result.status === "ready") void saveToHistory(state.result.record);
      }
    },
  });
  controller.start();

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !isContentRequest(message)) return false;
    stackOpen = !stackOpen;
    void readStorage().then((latest) => {
      storage.pinned = latest.pinned;
      surface.renderStack(latest.pinned, stackOpen);
      sendResponse({ ok: true });
    });
    return true;
  });
}
