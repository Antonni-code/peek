import styles from "./preview.css?inline";

import type { PreviewRecord, PreviewResolution } from "../core/types";

type SurfaceAction =
  | { type: "open"; url: string; active: boolean }
  | { type: "copy"; url: string }
  | { type: "pin"; record: PreviewRecord }
  | { type: "retry" }
  | { type: "dismiss" };

export interface PeekSurfaceOptions {
  onAction: (action: SurfaceAction) => void;
}

const ICONS = {
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"/></svg>',
  background: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="12" height="12" rx="2"/><path d="M8 17v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-3 1-4 4-1 5-3-3-3-3 5-1 4-4 1-3Z"/><path d="m5 19 4-4"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
};

export class PeekSurface {
  readonly host: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly card: HTMLElement;
  private readonly lens: HTMLElement;
  private currentRecord: PreviewRecord | null = null;
  private anchor: HTMLAnchorElement | null = null;
  private pointerInside = false;
  private pinned = false;

  constructor(private readonly options: PeekSurfaceOptions) {
    this.host = document.createElement("div");
    this.host.dataset.peekRoot = "true";
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<style>${styles}</style>
      <div class="peek-lens" aria-hidden="true"></div>
      <section class="peek-card" role="dialog" aria-label="Link preview" aria-live="polite">
        <aside class="peek-rail" aria-hidden="true">
          <img class="peek-favicon" alt="" />
          <span class="peek-rail-line"></span>
          <span class="peek-type">Preview</span>
        </aside>
        <div class="peek-main">
          <div class="peek-image-wrap"><img class="peek-image" alt="" /></div>
          <div class="peek-body">
            <p class="peek-source"><span class="peek-live-dot"></span><span class="peek-source-text"></span></p>
            <h2 class="peek-title"></h2>
            <p class="peek-description"></p>
            <div class="peek-skeleton" hidden>
              <div class="peek-skeleton-line"></div><div class="peek-skeleton-line"></div><div class="peek-skeleton-line"></div>
            </div>
            <div class="peek-actions"></div>
          </div>
        </div>
      </section>`;
    const card = this.shadow.querySelector<HTMLElement>(".peek-card");
    const lens = this.shadow.querySelector<HTMLElement>(".peek-lens");
    if (!card || !lens) throw new Error("Peek surface failed to initialize.");
    this.card = card;
    this.lens = lens;
    this.card.addEventListener("pointerenter", () => (this.pointerInside = true));
    this.card.addEventListener("pointerleave", () => {
      this.pointerInside = false;
      if (!this.pinned) this.options.onAction({ type: "dismiss" });
    });
    document.documentElement.append(this.host);
  }

  contains(target: EventTarget | null): boolean {
    return target instanceof Node && (target === this.host || this.host.contains(target));
  }

  shouldRetain(): boolean {
    return this.pointerInside || this.pinned;
  }

  setPinned(value: boolean): void {
    this.pinned = value;
    const button = this.shadow.querySelector<HTMLButtonElement>('[data-action="pin"]');
    if (button) {
      button.dataset.active = String(value);
      button.setAttribute("aria-pressed", String(value));
      button.title = value ? "Unpin preview" : "Pin preview";
    }
  }

  showIntent(anchor: HTMLAnchorElement): void {
    this.anchor = anchor;
    this.setPinned(false);
    const rect = anchor.getBoundingClientRect();
    this.lens.style.left = `${Math.min(window.innerWidth - 28, Math.max(8, rect.right + 6))}px`;
    this.lens.style.top = `${Math.min(window.innerHeight - 28, Math.max(8, rect.top + rect.height / 2 - 10))}px`;
    this.lens.dataset.visible = "true";
  }

  showLoading(anchor: HTMLAnchorElement, url: string): void {
    this.anchor = anchor;
    this.currentRecord = null;
    this.lens.dataset.visible = "false";
    this.setText(".peek-source-text", safeHostname(url));
    this.setText(".peek-title", "Looking through…");
    this.setText(".peek-description", "Fetching a safe preview without opening the page.");
    this.setImage(null, null);
    this.setFavicon(`https://${safeHostname(url)}/favicon.ico`);
    this.setSkeleton(true);
    this.setActions([]);
    this.showCard();
  }

  showResolution(anchor: HTMLAnchorElement, result: PreviewResolution): void {
    this.anchor = anchor;
    this.lens.dataset.visible = "false";
    this.setSkeleton(false);
    if (result.status === "ready") {
      this.currentRecord = result.record;
      this.setText(".peek-source-text", result.record.siteName || result.record.hostname);
      this.setText(".peek-title", result.record.title);
      this.setText(".peek-description", result.record.description || result.record.excerpt || "No summary was provided for this page.");
      this.shadow.querySelector(".peek-description")?.classList.remove("peek-error");
      this.setImage(result.record.imageUrl, result.record.title);
      this.setFavicon(result.record.faviconUrl);
      this.setText(".peek-type", result.fromCache ? "Cached" : "Preview");
      this.setActions([
        { action: "open", label: "Open", icon: ICONS.open, primary: true },
        { action: "background", label: "Background", icon: ICONS.background },
        { action: "copy", label: "Copy", icon: ICONS.copy },
        { action: "pin", label: "Pin", icon: ICONS.pin },
      ]);
    } else {
      this.currentRecord = null;
      this.setPinned(false);
      this.setText(".peek-source-text", safeHostname(result.url));
      this.setText(".peek-title", "Preview unavailable");
      this.setText(".peek-description", result.message);
      this.shadow.querySelector(".peek-description")?.classList.add("peek-error");
      this.setImage(null, null);
      this.setFavicon(`https://${safeHostname(result.url)}/favicon.ico`);
      this.setText(".peek-type", "Fallback");
      this.setActions([
        { action: "open", label: "Open", icon: ICONS.open, primary: true },
        { action: "retry", label: "Retry", icon: ICONS.retry },
        { action: "copy", label: "Copy", icon: ICONS.copy },
      ]);
    }
    this.showCard();
  }

  hide(): void {
    this.card.dataset.visible = "false";
    this.lens.dataset.visible = "false";
    this.pointerInside = false;
    if (!this.pinned) {
      this.currentRecord = null;
      this.anchor = null;
    }
  }

  destroy(): void {
    this.host.remove();
  }

  private showCard(): void {
    this.card.dataset.visible = "true";
    requestAnimationFrame(() => this.position());
  }

  private position(): void {
    if (!this.anchor) return;
    const margin = 12;
    const gap = 10;
    const anchor = this.anchor.getBoundingClientRect();
    const card = this.card.getBoundingClientRect();
    let left = anchor.right + gap;
    if (left + card.width > window.innerWidth - margin) left = anchor.left - card.width - gap;
    left = Math.max(margin, Math.min(left, window.innerWidth - card.width - margin));
    let top = anchor.top;
    if (top + card.height > window.innerHeight - margin) top = window.innerHeight - card.height - margin;
    top = Math.max(margin, top);
    this.card.style.left = `${Math.round(left)}px`;
    this.card.style.top = `${Math.round(top)}px`;
  }

  private setText(selector: string, text: string): void {
    const element = this.shadow.querySelector(selector);
    if (element) element.textContent = text;
  }

  private setSkeleton(visible: boolean): void {
    const skeleton = this.shadow.querySelector<HTMLElement>(".peek-skeleton");
    if (skeleton) skeleton.hidden = !visible;
  }

  private setImage(url: string | null, title: string | null): void {
    const wrap = this.shadow.querySelector<HTMLElement>(".peek-image-wrap");
    const image = this.shadow.querySelector<HTMLImageElement>(".peek-image");
    if (!wrap || !image) return;
    wrap.dataset.visible = String(Boolean(url));
    image.alt = title ? `Preview image for ${title}` : "";
    image.removeAttribute("src");
    if (url) image.src = url;
    image.onerror = () => {
      wrap.dataset.visible = "false";
      image.removeAttribute("src");
    };
  }

  private setFavicon(url: string | null): void {
    const image = this.shadow.querySelector<HTMLImageElement>(".peek-favicon");
    if (!image) return;
    image.hidden = !url;
    image.removeAttribute("src");
    if (url) image.src = url;
    image.onerror = () => (image.hidden = true);
  }

  private setActions(actions: Array<{ action: string; label: string; icon: string; primary?: boolean }>): void {
    const container = this.shadow.querySelector<HTMLElement>(".peek-actions");
    if (!container) return;
    container.replaceChildren();
    for (const action of actions) {
      const button = document.createElement("button");
      button.className = "peek-action";
      button.type = "button";
      button.dataset.action = action.action;
      button.dataset.primary = String(action.primary === true);
      button.setAttribute("aria-label", action.label);
      button.innerHTML = `${action.icon}<span>${action.label}</span>`;
      button.addEventListener("click", () => this.handleAction(action.action));
      container.append(button);
    }
  }

  private handleAction(action: string): void {
    const url = this.currentRecord?.url ?? this.anchor?.href;
    if (action === "retry") return this.options.onAction({ type: "retry" });
    if (!url) return;
    if (action === "open") return this.options.onAction({ type: "open", url, active: true });
    if (action === "background") return this.options.onAction({ type: "open", url, active: false });
    if (action === "copy") return this.options.onAction({ type: "copy", url });
    if (action === "pin" && this.currentRecord) return this.options.onAction({ type: "pin", record: this.currentRecord });
  }
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}
