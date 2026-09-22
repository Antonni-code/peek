import { describe, expect, it, vi } from "vitest";

import { applyImport, createExport } from "../src/core/import-export";
import { createDefaultStorage } from "../src/core/defaults";

describe("Peek import and export", () => {
  it("never imports license or cache state", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "generated" });
    const current = createDefaultStorage();
    current.license.status = "pro";
    const imported = applyImport(current, JSON.stringify({ format: "peek-export", version: 1, license: { status: "pro", receipt: "forged" }, cache: [{ secret: true }], settings: { enabled: false }, pinned: [{ url: "https://example.com", title: "Imported" }], history: [] }));
    expect(imported.license).toEqual(current.license);
    expect(imported.cache).toEqual(current.cache);
    expect(imported.pinned[0]?.title).toBe("Imported");
  });

  it("limits Free imports to one pin and no history", () => {
    const current = createDefaultStorage();
    const record = { url: "https://example.com", normalizedUrl: "https://example.com/", title: "One" };
    const imported = applyImport(current, JSON.stringify({ format: "peek-export", version: 1, settings: {}, pinned: [record, { ...record, url: "https://two.example.com" }], history: [record] }));
    expect(imported.pinned).toHaveLength(1);
    expect(imported.history).toHaveLength(0);
  });

  it("creates a versioned export", () => {
    const exported = createExport(createDefaultStorage());
    expect(exported).toMatchObject({ format: "peek-export", version: 1 });
    expect(exported).not.toHaveProperty("license");
    expect(exported).not.toHaveProperty("cache");
  });
});
