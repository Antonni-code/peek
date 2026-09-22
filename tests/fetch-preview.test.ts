import { describe, expect, it, vi } from "vitest";

import { fetchPreviewDocument } from "../src/background/fetch-preview";

describe("fetchPreviewDocument", () => {
  it("follows bounded redirects and returns HTML", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/final" } }))
      .mockResolvedValueOnce(
        new Response("<title>Done</title>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    const result = await fetchPreviewDocument("https://example.com/start", new AbortController().signal, fetcher);
    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.html).toContain("Done");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects unsupported content", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("binary", { status: 200, headers: { "content-type": "application/zip" } }),
    );
    await expect(
      fetchPreviewDocument("https://example.com/file.zip", new AbortController().signal, fetcher),
    ).rejects.toMatchObject({ code: "unsupported_content" });
  });

  it("enforces declared response size", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("small", { status: 200, headers: { "content-type": "text/html", "content-length": "1000001" } }),
    );
    await expect(
      fetchPreviewDocument("https://example.com/large", new AbortController().signal, fetcher),
    ).rejects.toMatchObject({ code: "too_large" });
  });
});
