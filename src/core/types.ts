export const STORAGE_SCHEMA_VERSION = 1 as const;

export type Appearance = "system" | "light" | "dark";
export type CardSize = "compact" | "comfortable" | "wide";
export type CardSide = "auto" | "left" | "right";
export type ActivationKey = "alt";

export interface PeekSettings {
  enabled: boolean;
  appearance: Appearance;
  cardSize: CardSize;
  cardSide: CardSide;
  intentDelayMs: number;
  activationKey: ActivationKey;
  historyEnabled: boolean;
}

export interface LicenseState {
  status: "free" | "pro" | "grace" | "invalid";
  instanceId: string | null;
  receipt: string | null;
  checkedAt: number | null;
  expiresAt: number | null;
}

export interface PreviewRecord {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  description: string;
  siteName: string;
  hostname: string;
  imageUrl: string | null;
  faviconUrl: string | null;
  contentType: string | null;
  excerpt: string | null;
  readerText: string | null;
  fetchedAt: number;
  lastAccessedAt: number;
  byteSize: number;
}

export interface PeekStorage {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  settings: PeekSettings;
  license: LicenseState;
  pinned: PreviewRecord[];
  history: PreviewRecord[];
  cache: PreviewRecord[];
}
