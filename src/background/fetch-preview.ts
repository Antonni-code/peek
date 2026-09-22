import type { PreviewErrorCode } from "../core/types";
import { normalizePreviewUrl } from "../core/url";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;

export class PreviewFetchError extends Error {
  constructor(
    readonly code: PreviewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PreviewFetchError";
  }
}

async function readBoundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    throw new PreviewFetchError("too_large", "This page is too large to preview safely.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new PreviewFetchError("too_large", "This page is too large to preview safely.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export interface FetchedPreviewDocument {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  contentType: string | null;
}

export async function fetchPreviewDocument(
  requestedUrl: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<FetchedPreviewDocument> {
  let currentUrl = normalizePreviewUrl(requestedUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let response: Response;
    try {
      response = await fetcher(currentUrl, {
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.8" },
        redirect: "manual",
        referrerPolicy: "no-referrer",
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw new PreviewFetchError("cancelled", "Preview cancelled.");
      throw new PreviewFetchError("network", error instanceof Error ? error.message : "Network request failed.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new PreviewFetchError("redirect", "This link redirects too many times.");
      }
      currentUrl = normalizePreviewUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) {
      throw new PreviewFetchError("http_error", `This page returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type");
    const supported =
      !contentType || /(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType);
    if (!supported) {
      throw new PreviewFetchError("unsupported_content", "This file type cannot be previewed yet.");
    }

    return {
      requestedUrl,
      finalUrl: normalizePreviewUrl(response.url || currentUrl),
      html: await readBoundedText(response),
      contentType,
    };
  }

  throw new PreviewFetchError("redirect", "This link redirects too many times.");
}
