import { PreviewController } from "./preview-controller";

const ROOT_ATTRIBUTE = "data-peek-extension";

if (!document.documentElement.hasAttribute(ROOT_ATTRIBUTE)) {
  document.documentElement.setAttribute(ROOT_ATTRIBUTE, "ready");
}

const controller = new PreviewController({
  delayMs: 320,
  onStateChange: () => undefined,
});
controller.start();
