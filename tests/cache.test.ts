import { describe, expect, it } from "vitest";

import { findFreshCacheEntry, putCacheEntry } from "../src/core/cache";
import type { PreviewCacheEntry } from "../src/core/types";

function entry(url: string, accessedAt: number, byteSize = 10): PreviewCacheEntry {
  return {
    kind: "failure",
    normalizedUrl: url,
    url,
    code: "network",
    message: "Unavailable",
    expiresAt: 10_000,
    lastAccessedAt: accessedAt,
    byteSize,
  };
}

describe("preview cache", () => {
  it("returns only fresh matching entries", () => {
    const cached = entry("https://example.com/", 1);
    expect(findFreshCacheEntry([cached], cached.normalizedUrl, 9_999)).toBe(cached);
    expect(findFreshCacheEntry([cached], cached.normalizedUrl, 10_000)).toBeNull();
  });

  it("replaces the same URL and keeps newest entries first", () => {
    const next = putCacheEntry(
      [entry("https://one.test/", 1), entry("https://two.test/", 2)],
      entry("https://one.test/", 3),
      0,
    );
    expect(next.map((item) => item.normalizedUrl)).toEqual(["https://one.test/", "https://two.test/"]);
  });
});
