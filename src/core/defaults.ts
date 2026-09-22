import {
  STORAGE_SCHEMA_VERSION,
  type LicenseState,
  type PeekSettings,
  type PeekStorage,
} from "./types";

export const DEFAULT_SETTINGS: Readonly<PeekSettings> = Object.freeze({
  enabled: true,
  appearance: "system",
  cardSize: "comfortable",
  cardSide: "auto",
  intentDelayMs: 320,
  activationKey: "alt",
  historyEnabled: true,
});

export const DEFAULT_LICENSE: Readonly<LicenseState> = Object.freeze({
  status: "free",
  instanceId: null,
  licenseKey: null,
  deviceId: null,
  receipt: null,
  checkedAt: null,
  expiresAt: null,
});

export function createDefaultStorage(): PeekStorage {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    license: { ...DEFAULT_LICENSE },
    pinned: [],
    history: [],
    cache: [],
  };
}
