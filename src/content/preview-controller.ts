import type { RuntimeRequest, RuntimeResponse } from "../core/messages";
import type { PreviewResolution } from "../core/types";

export type PreviewUiState =
  | { status: "idle" }
  | { status: "loading"; requestId: string; url: string; anchor: HTMLAnchorElement }
  | { status: "resolved"; requestId: string; url: string; anchor: HTMLAnchorElement; result: PreviewResolution };

export interface PreviewControllerOptions {
  delayMs: number;
  onStateChange: (state: PreviewUiState) => void;
}

function linkFromTarget(target: EventTarget | null): HTMLAnchorElement | null {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

export class PreviewController {
  private altPressed = false;
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
    this.reset();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = true;
      const focused = linkFromTarget(document.activeElement);
      if (focused) this.schedule(focused);
    }
    if (event.key === "Escape") this.reset();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Alt") {
      this.altPressed = false;
      this.reset();
    }
  };

  private readonly onPointerOver = (event: PointerEvent): void => {
    const link = linkFromTarget(event.target);
    if (link && this.altPressed) this.schedule(link);
  };

  private readonly onPointerOut = (event: PointerEvent): void => {
    const link = linkFromTarget(event.target);
    if (!link || link !== this.candidate) return;
    if (event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
    this.reset();
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const link = linkFromTarget(event.target);
    if (link && this.altPressed) this.schedule(link);
  };

  private readonly onWindowBlur = (): void => {
    this.altPressed = false;
    this.reset();
  };

  private schedule(link: HTMLAnchorElement): void {
    if (link === this.candidate && (this.timer !== null || this.requestId !== null)) return;
    this.reset();
    this.candidate = link;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.resolve(link);
    }, this.options.delayMs);
  }

  private async resolve(link: HTMLAnchorElement): Promise<void> {
    const url = link.href;
    if (!url || link !== this.candidate || !this.altPressed) return;
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

  private reset(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (this.requestId) {
      const message: RuntimeRequest = { type: "preview.cancel", requestId: this.requestId };
      void chrome.runtime.sendMessage(message);
    }
    this.requestId = null;
    this.candidate = null;
    this.options.onStateChange({ status: "idle" });
  }
}
