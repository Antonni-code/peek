import { PreviewController } from "./preview-controller";
import { copyUrl, openTab, togglePinned } from "./actions";
import { PeekSurface } from "./peek-surface";
import { readStorage } from "../platform/storage";

const ROOT_ATTRIBUTE = "data-peek-extension";

if (!document.documentElement.hasAttribute(ROOT_ATTRIBUTE)) {
  document.documentElement.setAttribute(ROOT_ATTRIBUTE, "ready");
}

void bootstrap();

async function bootstrap(): Promise<void> {
  const storage = await readStorage();
  if (!storage.settings.enabled) return;

  let controller: PreviewController | null = null;
  const surface = new PeekSurface({
    onAction: (action) => {
      if (action.type === "open") void openTab(action.url, action.active);
      if (action.type === "copy") void copyUrl(action.url);
      if (action.type === "pin") {
        void togglePinned(action.record).then((pinned) => {
          storage.pinned = pinned ? [action.record] : storage.pinned.filter((item) => item.normalizedUrl !== action.record.normalizedUrl);
          surface.setPinned(pinned);
        });
      }
      if (action.type === "retry") controller?.retry();
      if (action.type === "dismiss") controller?.dismiss();
    },
  });
  controller = new PreviewController({
    delayMs: storage.settings.intentDelayMs,
    isInteractiveTarget: (target) => surface.contains(target),
    shouldRetain: () => surface.shouldRetain(),
    onStateChange: (state) => {
      if (state.status === "idle") surface.hide();
      if (state.status === "intent") surface.showIntent(state.anchor);
      if (state.status === "loading") surface.showLoading(state.anchor, state.url);
      if (state.status === "resolved") {
        surface.showResolution(state.anchor, state.result);
        surface.setPinned(storage.pinned.some((item) => state.result.status === "ready" && item.normalizedUrl === state.result.record.normalizedUrl));
      }
    },
  });
  controller.start();
}
