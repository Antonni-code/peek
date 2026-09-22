import { describe, expect, it } from "vitest";

import { normalizePreviewUrl, UrlValidationError } from "../src/core/url";

describe("normalizePreviewUrl", () => {
  it("normalizes supported web links and removes fragments", () => {
    expect(normalizePreviewUrl("HTTPS://Example.com:443/path?q=1#section")).toBe("https://example.com/path?q=1");
  });

  it.each(["javascript:alert(1)", "file:///tmp/private", "mailto:test@example.com"])(
    "rejects unsupported scheme %s",
    (url) => expect(() => normalizePreviewUrl(url)).toThrow(UrlValidationError),
  );

  it.each(["http://localhost", "http://127.0.0.1", "http://192.168.1.8", "http://router.local"])(
    "rejects private target %s",
    (url) => expect(() => normalizePreviewUrl(url)).toThrow("Local and private network"),
  );
});
