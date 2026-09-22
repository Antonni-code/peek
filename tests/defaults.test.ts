import { describe, expect, it } from "vitest";

import { createDefaultStorage, DEFAULT_SETTINGS } from "../src/core/defaults";
import { migrateStorage } from "../src/platform/storage";

describe("storage defaults", () => {
  it("creates independent storage snapshots", () => {
    const first = createDefaultStorage();
    const second = createDefaultStorage();

    first.settings.enabled = false;

    expect(second.settings.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.enabled).toBe(true);
  });

  it("falls back safely for an unknown schema", () => {
    expect(migrateStorage({ schemaVersion: 99 }).schemaVersion).toBe(1);
    expect(migrateStorage(null).settings.intentDelayMs).toBe(320);
  });
});
