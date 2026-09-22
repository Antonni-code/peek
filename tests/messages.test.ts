import { describe, expect, it } from "vitest";

import { isRuntimeRequest } from "../src/core/messages";

describe("runtime message validation", () => {
  it("accepts known bounded requests", () => {
    expect(isRuntimeRequest({ type: "preview.resolve", requestId: "1", url: "https://example.com" })).toBe(true);
    expect(isRuntimeRequest({ type: "preview.cancel", requestId: "1" })).toBe(true);
  });

  it("rejects unknown and oversized requests", () => {
    expect(isRuntimeRequest({ type: "preview.delete", requestId: "1" })).toBe(false);
    expect(isRuntimeRequest({ type: "preview.resolve", requestId: "1", url: "x".repeat(8_193) })).toBe(false);
  });
});
