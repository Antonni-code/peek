import { createDefaultStorage } from "../core/defaults";
import { STORAGE_SCHEMA_VERSION, type PeekStorage } from "../core/types";

const STORAGE_KEY = "peek";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateStorage(value: unknown): PeekStorage {
  const defaults = createDefaultStorage();
  if (!isObject(value) || value.schemaVersion !== STORAGE_SCHEMA_VERSION) return defaults;

  const settings = isObject(value.settings) ? value.settings : {};
  const license = isObject(value.license) ? value.license : {};

  return {
    ...defaults,
    settings: { ...defaults.settings, ...settings },
    license: { ...defaults.license, ...license },
    pinned: Array.isArray(value.pinned) ? (value.pinned as PeekStorage["pinned"]) : [],
    history: Array.isArray(value.history) ? (value.history as PeekStorage["history"]) : [],
    cache: Array.isArray(value.cache) ? (value.cache as PeekStorage["cache"]) : [],
  };
}

export async function readStorage(): Promise<PeekStorage> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return migrateStorage(result[STORAGE_KEY]);
}

export async function writeStorage(next: PeekStorage): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

let updateQueue: Promise<void> = Promise.resolve();

export function updateStorage(
  updater: (current: PeekStorage) => PeekStorage | Promise<PeekStorage>,
): Promise<PeekStorage> {
  let resolveResult: (value: PeekStorage) => void;
  let rejectResult: (reason?: unknown) => void;
  const result = new Promise<PeekStorage>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  updateQueue = updateQueue
    .then(async () => {
      const current = await readStorage();
      const next = await updater(current);
      await writeStorage(next);
      resolveResult(next);
    })
    .catch((error: unknown) => {
      rejectResult(error);
    });

  return result;
}

export async function initializeStorage(): Promise<PeekStorage> {
  const next = await readStorage();
  await writeStorage(next);
  return next;
}
