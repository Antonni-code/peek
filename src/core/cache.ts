import type { PreviewCacheEntry } from "./types";

export const CACHE_MAX_ENTRIES = 300;
export const CACHE_MAX_BYTES = 20 * 1024 * 1024;

export function findFreshCacheEntry(
  entries: PreviewCacheEntry[],
  normalizedUrl: string,
  now: number,
): PreviewCacheEntry | null {
  const entry = entries.find((candidate) => candidate.normalizedUrl === normalizedUrl);
  return entry && entry.expiresAt > now ? entry : null;
}

export function putCacheEntry(
  entries: PreviewCacheEntry[],
  next: PreviewCacheEntry,
  now: number,
): PreviewCacheEntry[] {
  const candidates = entries
    .filter((entry) => entry.normalizedUrl !== next.normalizedUrl && entry.expiresAt > now)
    .concat(next)
    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    .slice(0, CACHE_MAX_ENTRIES);

  const bounded: PreviewCacheEntry[] = [];
  let bytes = 0;
  for (const entry of candidates) {
    if (bytes + entry.byteSize > CACHE_MAX_BYTES) continue;
    bounded.push(entry);
    bytes += entry.byteSize;
  }
  return bounded;
}
