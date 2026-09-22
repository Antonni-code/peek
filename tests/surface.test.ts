import { afterEach, describe, expect, it, vi } from "vitest";

import { PeekSurface } from "../src/content/peek-surface";
import { DEFAULT_SETTINGS } from "../src/core/defaults";
import type { PreviewRecord } from "../src/core/types";

const record: PreviewRecord = {
  id: "1",
  url: "https://example.com/story",
  normalizedUrl: "https://example.com/story",
  title: "A useful story",
  description: "A clear summary.",
  siteName: "Example",
  hostname: "example.com",
  imageUrl: null,
  faviconUrl: null,
  contentType: "text/html",
  excerpt: "A clear summary.",
  readerText: "Reader text",
  fetchedAt: 1,
  lastAccessedAt: 1,
  byteSize: 100,
};

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.querySelectorAll("[data-peek-root]").forEach((node) => node.remove());
});

describe("PeekSurface", () => {
  it("renders remote values as text in an isolated shadow root", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const anchor = document.createElement("a");
    anchor.href = record.url;
    document.body.append(anchor);
    const surface = new PeekSurface({ onAction: vi.fn(), settings: { ...DEFAULT_SETTINGS }, isPro: false });
    surface.showResolution(anchor, { status: "ready", record: { ...record, title: "<img src=x onerror=alert(1)>" }, fromCache: false });

    const title = surface.host.shadowRoot?.querySelector(".peek-title");
    expect(title?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(title?.querySelector("img")).toBeNull();
    surface.destroy();
  });

  it("shows actionable fallback state", () => {
    const anchor = document.createElement("a");
    anchor.href = record.url;
    document.body.append(anchor);
    const surface = new PeekSurface({ onAction: vi.fn(), settings: { ...DEFAULT_SETTINGS }, isPro: false });
    surface.showResolution(anchor, {
      status: "unavailable",
      url: record.url,
      normalizedUrl: record.normalizedUrl,
      code: "http_error",
      message: "This page refused the preview.",
      fromCache: false,
    });
    expect(surface.host.shadowRoot?.querySelector(".peek-title")?.textContent).toBe("Preview unavailable");
    expect(surface.host.shadowRoot?.querySelectorAll(".peek-action")).toHaveLength(3);
    surface.destroy();
  });

  it("renders the edge stack with text-safe records", () => {
    const surface = new PeekSurface({ onAction: vi.fn(), settings: { ...DEFAULT_SETTINGS }, isPro: true });
    surface.renderStack([{ ...record, title: "<script>unsafe()</script>" }], true);
    const stack = surface.host.shadowRoot?.querySelector(".peek-stack");
    expect(stack?.getAttribute("data-visible")).toBe("true");
    expect(stack?.querySelector(".peek-stack-name")?.textContent).toBe("<script>unsafe()</script>");
    expect(stack?.querySelector("script")).toBeNull();
    surface.destroy();
  });
});
