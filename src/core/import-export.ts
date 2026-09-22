import { createDefaultStorage } from "./defaults";
import type { PeekSettings, PeekStorage, PreviewRecord } from "./types";
import { normalizePreviewUrl } from "./url";

const EXPORT_VERSION = 1;
const MAX_RECORDS = 500;

export interface PeekExport {
  format: "peek-export";
  version: typeof EXPORT_VERSION;
  createdAt: string;
  settings: PeekSettings;
  pinned: PreviewRecord[];
  history: PreviewRecord[];
}

export function createExport(storage: PeekStorage): PeekExport {
  return {
    format: "peek-export",
    version: EXPORT_VERSION,
    createdAt: new Date().toISOString(),
    settings: storage.settings,
    pinned: storage.pinned,
    history: storage.history,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function parseRecord(value: unknown): PreviewRecord | null {
  if (!isObject(value)) return null;
  let normalizedUrl: string;
  let url: string;
  try {
    url = normalizePreviewUrl(boundedText(value.url, 8_192));
    normalizedUrl = normalizePreviewUrl(boundedText(value.normalizedUrl, 8_192) || url);
  } catch {
    return null;
  }
  const fetchedAt = typeof value.fetchedAt === "number" && Number.isFinite(value.fetchedAt) ? value.fetchedAt : Date.now();
  return {
    id: boundedText(value.id, 100) || crypto.randomUUID(),
    url,
    normalizedUrl,
    title: boundedText(value.title, 240) || new URL(normalizedUrl).hostname,
    description: boundedText(value.description, 500),
    siteName: boundedText(value.siteName, 120),
    hostname: new URL(normalizedUrl).hostname.replace(/^www\./, ""),
    imageUrl: parseOptionalUrl(value.imageUrl, normalizedUrl),
    faviconUrl: parseOptionalUrl(value.faviconUrl, normalizedUrl),
    contentType: typeof value.contentType === "string" ? value.contentType.slice(0, 120) : null,
    excerpt: typeof value.excerpt === "string" ? value.excerpt.slice(0, 1_400) : null,
    readerText: typeof value.readerText === "string" ? value.readerText.slice(0, 20_000) : null,
    fetchedAt,
    lastAccessedAt:
      typeof value.lastAccessedAt === "number" && Number.isFinite(value.lastAccessedAt)
        ? value.lastAccessedAt
        : fetchedAt,
    byteSize: typeof value.byteSize === "number" && value.byteSize >= 0 ? Math.min(value.byteSize, 1_000_000) : 0,
  };
}

function parseOptionalUrl(value: unknown, base: string): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return normalizePreviewUrl(new URL(value, base).toString());
  } catch {
    return null;
  }
}

function parseSettings(value: unknown): PeekSettings {
  const defaults = createDefaultStorage().settings;
  if (!isObject(value)) return defaults;
  const appearance = value.appearance;
  const cardSize = value.cardSize;
  const cardSide = value.cardSide;
  const activationKey = value.activationKey;
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : defaults.enabled,
    appearance: appearance === "light" || appearance === "dark" || appearance === "system" ? appearance : defaults.appearance,
    cardSize: cardSize === "compact" || cardSize === "comfortable" || cardSize === "wide" ? cardSize : defaults.cardSize,
    cardSide: cardSide === "left" || cardSide === "right" || cardSide === "auto" ? cardSide : defaults.cardSide,
    intentDelayMs:
      typeof value.intentDelayMs === "number" && Number.isFinite(value.intentDelayMs)
        ? Math.max(120, Math.min(1_000, Math.round(value.intentDelayMs)))
        : defaults.intentDelayMs,
    activationKey: activationKey === "alt" || activationKey === "shift" || activationKey === "none" ? activationKey : defaults.activationKey,
    historyEnabled: typeof value.historyEnabled === "boolean" ? value.historyEnabled : defaults.historyEnabled,
  };
}

export function applyImport(current: PeekStorage, text: string): PeekStorage {
  if (text.length > 2_000_000) throw new Error("Import files must be smaller than 2 MB.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This is not valid JSON.");
  }
  if (!isObject(parsed) || parsed.format !== "peek-export" || parsed.version !== EXPORT_VERSION) {
    throw new Error("This is not a supported Peek export.");
  }
  const pinned = (Array.isArray(parsed.pinned) ? parsed.pinned : [])
    .map(parseRecord)
    .filter((record): record is PreviewRecord => record !== null)
    .slice(0, current.license.status === "pro" || current.license.status === "grace" ? MAX_RECORDS : 1);
  const history = (Array.isArray(parsed.history) ? parsed.history : [])
    .map(parseRecord)
    .filter((record): record is PreviewRecord => record !== null)
    .slice(0, current.license.status === "pro" || current.license.status === "grace" ? MAX_RECORDS : 0);
  return { ...current, settings: parseSettings(parsed.settings), pinned, history };
}
