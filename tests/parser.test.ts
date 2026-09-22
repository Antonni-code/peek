import { describe, expect, it, vi } from "vitest";

import { parsePreviewHtml } from "../src/core/parser";

describe("parsePreviewHtml", () => {
  it("prefers rich metadata and resolves asset URLs", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "preview-1" });
    const record = parsePreviewHtml({
      requestedUrl: "https://example.com/story",
      finalUrl: "https://example.com/story",
      fetchedAt: 100,
      contentType: "text/html",
      html: `<!doctype html><html><head>
        <title>Fallback title</title>
        <meta property="og:title" content="A &amp; B" />
        <meta property="og:description" content="The useful summary." />
        <meta property="og:image" content="/cover.jpg" />
        <meta property="og:site_name" content="Example Journal" />
      </head><body><article><p>Reader body</p></article><script>alert(1)</script></body></html>`,
    });

    expect(record).toMatchObject({
      id: "preview-1",
      title: "A & B",
      description: "The useful summary.",
      imageUrl: "https://example.com/cover.jpg",
      siteName: "Example Journal",
      hostname: "example.com",
    });
    expect(record.readerText).toContain("Reader body");
    expect(record.readerText).not.toContain("alert(1)");
  });

  it("falls back to title and readable text", () => {
    const record = parsePreviewHtml({
      id: "preview-2",
      requestedUrl: "https://example.com",
      finalUrl: "https://example.com/",
      fetchedAt: 100,
      contentType: null,
      html: "<title>Plain page</title><main><p>Useful body copy.</p></main>",
    });
    expect(record.title).toBe("Plain page");
    expect(record.excerpt).toContain("Useful body copy");
  });
});
