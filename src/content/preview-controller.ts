import type { RuntimeRequest, RuntimeResponse } from "../core/messages";
import type { ActivationKey, PreviewResolution } from "../core/types";

export type PreviewUiState =
  | { status: "idle" }
  | { status: "intent"; url: string; anchor: HTMLAnchorElement }
  | { status: "loading"; requestId: string; url: string; anchor: HTMLAnchorElement }
  | { status: "resolved"; requestId: string; url: string; anchor: HTMLAnchorElement; result: PreviewResolution };

export interface PreviewControllerOptions {
  delayMs: number;
  activationKey: ActivationKey;
  onStateChange: (state: PreviewUiState) => void;
  isInteractiveTarget?: (target: EventTarget | null) => boolean;
  shouldRetain?: () => boolean;
}

function linkFromTarget(target: EventTarget | null): HTMLAnchorElement | null {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

export class PreviewController {
  private modifierPressed = false;
  private candidate: HTMLAnchorElement | null = null;
  private timer: number | null = null;
  private requestId: string | null = null;

  constructor(private readonly options: PreviewControllerOptions) {}

  start(): void {
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("keyup", this.onKeyUp, true);
    document.addEventListener("pointerover", this.onPointerOver, true);
    document.addEventListener("pointerout", this.onPointerOut, true);
    document.addEventListener("focusin", this.onFocusIn, true);
    window.addEventListener("blur", this.onWindowBlur);
  }

  destroy(): void {
    document.removeEventListener("keydown", this.onKeyDown, true);
    document.removeEventListener("keyup", this.onKeyUp, true);
    document.removeEventListener("pointerover", this.onPointerOver, true);
    document.removeEventListener("pointerout", this.onPointerOut, true);
    document.removeEventListener("focusin", this.onFocusIn, true);
    window.removeEventListener("blur", this.onWindowBlur);
    this.reset(true);
  }

  dismiss(force = false): void {
    this.reset(force);
  }

  retry(): void {
    if (!this.candidate) return;
    const link = this.candidate;
    this.cancelRequest();
    void this.resolve(link);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isActivationEvent(event)) {
      this.modifierPressed = true;
      const focused = linkFromTarget(document.activeElement);
      if (focused) this.schedule(focused);
    }
    if (event.key === "Escape") this.reset(true);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.isActivationEvent(event)) {
      this.modifierPressed = false;
      this.reset(false);
    }
  };

  private readonly onPointerOver = (event: PointerEvent): void => {
    const link = linkFromTarget(event.target);
    if (link && this.isActivationReady()) this.schedule(link);
  };

  private readonly onPointerOut = (event: PointerEvent): void => {
    const link = linkFromTarget(event.target);
    if (!link || link !== this.candidate) return;
    if (event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
    if (this.options.isInteractiveTarget?.(event.relatedTarget)) return;
    this.reset(false);
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const link = linkFromTarget(event.target);
    if (link && this.isActivationReady()) this.schedule(link);
  };

  private readonly onWindowBlur = (): void => {
    this.modifierPressed = false;
    this.reset(false);
  };

  private schedule(link: HTMLAnchorElement): void {
    if (link === this.candidate && (this.timer !== null || this.requestId !== null)) return;
    this.reset(true);
    this.candidate = link;
    this.options.onStateChange({ status: "intent", url: link.href, anchor: link });
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.resolve(link);
    }, this.options.delayMs);
  }

  private async resolve(link: HTMLAnchorElement): Promise<void> {
    const url = link.href;
    if (!url || link !== this.candidate || !this.isActivationReady()) return;
    const requestId = crypto.randomUUID();
    this.requestId = requestId;
    this.options.onStateChange({ status: "loading", requestId, url, anchor: link });
    const message: RuntimeRequest = { type: "preview.resolve", requestId, url };
    const response: RuntimeResponse = await chrome.runtime.sendMessage(message);
    if (this.requestId !== requestId || link !== this.candidate) return;
    if (response.ok && "status" in response.data) {
      this.options.onStateChange({ status: "resolved", requestId, url, anchor: link, result: response.data });
    } else {
      this.options.onStateChange({
        status: "resolved",
        requestId,
        url,
        anchor: link,
        result: {
          status: "unavailable",
          url,
          normalizedUrl: url,
          code: "network",
          message: response.ok ? "Preview cancelled." : response.error.message,
          fromCache: false,
        },
      });
    }
  }

  private cancelRequest(): void {
    if (!this.requestId) return;
    const message: RuntimeRequest = { type: "preview.cancel", requestId: this.requestId };
    void chrome.runtime.sendMessage(message);
    this.requestId = null;
  }

  private reset(force: boolean): void {
    if (!force && this.options.shouldRetain?.()) return;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.cancelRequest();
    this.candidate = null;
    this.options.onStateChange({ status: "idle" });
  }

  private isActivationReady(): boolean {
    return this.options.activationKey === "none" || this.modifierPressed;
  }

  private isActivationEvent(event: KeyboardEvent): boolean {
    return (
      (this.options.activationKey === "alt" && event.key === "Alt") ||
      (this.options.activationKey === "shift" && event.key === "Shift")
    );
  }
}
