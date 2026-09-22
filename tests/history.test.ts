import { describe, expect, it } from "vitest";

import { addHistoryRecord, searchHistory } from "../src/core/history";
import { createDefaultStorage } from "../src/core/defaults";
import type { PreviewRecord } from "../src/core/types";

const record = (title: string, url: string): PreviewRecord => ({ id: title, url, normalizedUrl: url, title, description: "Useful description", siteName: "", hostname: new URL(url).hostname, imageUrl: null, faviconUrl: null, contentType: "text/html", excerpt: null, readerText: null, fetchedAt: 1, lastAccessedAt: 1, byteSize: 1 });

describe("Pro history", () => {
  it("does not collect history on Free", () => {
    expect(addHistoryRecord(createDefaultStorage(), record("One", "https://one.test/"))).toEqual(createDefaultStorage());
  });

  it("deduplicates newest Pro records", () => {
    const storage = createDefaultStorage();
    storage.license.status = "pro";
    const next = addHistoryRecord(addHistoryRecord(storage, record("Old", "https://one.test/")), record("New", "https://one.test/"));
    expect(next.history).toHaveLength(1);
    expect(next.history[0]?.title).toBe("New");
  });

  it("searches title, host, description, and URL", () => {
    const records = [record("Design systems", "https://example.com/design"), record("Release", "https://ship.test/")];
    expect(searchHistory(records, "design")).toHaveLength(1);
    expect(searchHistory(records, "ship.test")).toHaveLength(1);
  });
});
