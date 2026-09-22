import { findFreshCacheEntry, putCacheEntry } from "../core/cache";
import { parsePreviewHtml } from "../core/parser";
import type { PreviewCacheEntry, PreviewErrorCode, PreviewResolution } from "../core/types";
import { normalizePreviewUrl, UrlValidationError } from "../core/url";
import { readStorage, updateStorage } from "../platform/storage";
import { fetchPreviewDocument, PreviewFetchError } from "./fetch-preview";

const SUCCESS_TTL_MS = 24 * 60 * 60 * 1_000;
const FAILURE_TTL_MS = 10 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 8_000;

interface PendingRequest {
  controller: AbortController;
  subscribers: Set<string>;
  promise: Promise<PreviewResolution>;
}

const pendingByUrl = new Map<string, PendingRequest>();
const requestToUrl = new Map<string, string>();

function unavailable(
  url: string,
  normalizedUrl: string,
  code: PreviewErrorCode,
  message: string,
  fromCache = false,
): PreviewResolution {
  return { status: "unavailable", url, normalizedUrl, code, message, fromCache };
}

function fromCache(entry: PreviewCacheEntry, now: number): PreviewResolution {
  entry.lastAccessedAt = now;
  if (entry.kind === "success") {
    entry.record.lastAccessedAt = now;
    return { status: "ready", record: entry.record, fromCache: true };
  }
  return unavailable(entry.url, entry.normalizedUrl, entry.code, entry.message, true);
}

async function touchCache(normalizedUrl: string, now: number): Promise<void> {
  await updateStorage((storage) => ({
    ...storage,
    cache: storage.cache.map((entry) => {
      if (entry.normalizedUrl !== normalizedUrl) return entry;
      if (entry.kind === "success") {
        return { ...entry, lastAccessedAt: now, record: { ...entry.record, lastAccessedAt: now } };
      }
      return { ...entry, lastAccessedAt: now };
    }),
  }));
}

async function storeEntry(entry: PreviewCacheEntry, now: number): Promise<void> {
  await updateStorage((storage) => ({
    ...storage,
    cache: putCacheEntry(storage.cache, entry, now),
  }));
}

async function fetchAndParse(url: string, normalizedUrl: string, signal: AbortSignal): Promise<PreviewResolution> {
  const now = Date.now();
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort("timeout"), FETCH_TIMEOUT_MS);
  const onAbort = () => timeoutController.abort("cancelled");
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    const document = await fetchPreviewDocument(url, timeoutController.signal);
    const record = parsePreviewHtml({ ...document, fetchedAt: now });
    const entry: PreviewCacheEntry = {
      kind: "success",
      normalizedUrl,
      record,
      expiresAt: now + SUCCESS_TTL_MS,
      lastAccessedAt: now,
      byteSize: record.byteSize,
    };
    await storeEntry(entry, now);
    return { status: "ready", record, fromCache: false };
  } catch (error) {
    let code: PreviewErrorCode = "network";
    let message = "This page could not be previewed.";
    if (timeoutController.signal.reason === "timeout") {
      code = "timeout";
      message = "This page took too long to respond.";
    } else if (signal.aborted || timeoutController.signal.reason === "cancelled") {
      code = "cancelled";
      message = "Preview cancelled.";
    } else if (error instanceof PreviewFetchError || error instanceof UrlValidationError) {
      code = error.code;
      message = error.message;
    } else if (error instanceof Error) {
      code = "parse_error";
      message = "This page returned metadata Peek could not read safely.";
    }

    if (code !== "cancelled") {
      const entry: PreviewCacheEntry = {
        kind: "failure",
        normalizedUrl,
        url,
        code,
        message,
        expiresAt: now + FAILURE_TTL_MS,
        lastAccessedAt: now,
        byteSize: new TextEncoder().encode(`${normalizedUrl}${message}`).byteLength,
      };
      await storeEntry(entry, now);
    }
    return unavailable(url, normalizedUrl, code, message);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

export async function resolvePreview(requestId: string, url: string): Promise<PreviewResolution> {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePreviewUrl(url);
  } catch (error) {
    if (error instanceof UrlValidationError) return unavailable(url, url, error.code, error.message);
    return unavailable(url, url, "unsupported_url", "This link cannot be previewed.");
  }

  const now = Date.now();
  const storage = await readStorage();
  const cached = findFreshCacheEntry(storage.cache, normalizedUrl, now);
  if (cached) {
    const result = fromCache(cached, now);
    await touchCache(normalizedUrl, now);
    return result;
  }

  const existing = pendingByUrl.get(normalizedUrl);
  if (existing) {
    existing.subscribers.add(requestId);
    requestToUrl.set(requestId, normalizedUrl);
    return existing.promise;
  }

  const controller = new AbortController();
  const subscribers = new Set([requestId]);
  const pending: PendingRequest = {
    controller,
    subscribers,
    promise: fetchAndParse(url, normalizedUrl, controller.signal).finally(() => {
      pendingByUrl.delete(normalizedUrl);
      for (const subscriber of subscribers) requestToUrl.delete(subscriber);
    }),
  };
  pendingByUrl.set(normalizedUrl, pending);
  requestToUrl.set(requestId, normalizedUrl);
  return pending.promise;
}

export function cancelPreview(requestId: string): void {
  const normalizedUrl = requestToUrl.get(requestId);
  if (!normalizedUrl) return;
  requestToUrl.delete(requestId);
  const pending = pendingByUrl.get(normalizedUrl);
  if (!pending) return;
  pending.subscribers.delete(requestId);
  if (pending.subscribers.size === 0) pending.controller.abort("cancelled");
}
