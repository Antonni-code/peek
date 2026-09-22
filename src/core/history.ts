import type { PeekStorage, PreviewRecord } from "./types";

export const HISTORY_MAX_ENTRIES = 500;

export function addHistoryRecord(
  storage: PeekStorage,
  record: PreviewRecord,
  entitled = storage.license.status === "pro" || storage.license.status === "grace",
): PeekStorage {
  if (!storage.settings.historyEnabled || !entitled) {
    return storage;
  }
  const history = [record, ...storage.history.filter((item) => item.normalizedUrl !== record.normalizedUrl)].slice(
    0,
    HISTORY_MAX_ENTRIES,
  );
  return { ...storage, history };
}

export function searchHistory(records: PreviewRecord[], query: string): PreviewRecord[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return records;
  return records.filter((record) =>
    [record.title, record.description, record.hostname, record.url].some((value) =>
      value.toLocaleLowerCase().includes(normalized),
    ),
  );
}
