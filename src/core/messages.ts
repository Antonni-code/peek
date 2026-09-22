import type { PreviewResolution } from "./types";

export type RuntimeRequest =
  | { type: "preview.resolve"; requestId: string; url: string }
  | { type: "preview.cancel"; requestId: string };

export type RuntimeResponse =
  | { ok: true; data: PreviewResolution }
  | { ok: true; data: { cancelled: true } }
  | { ok: false; error: { code: "invalid_request" | "internal"; message: string } };

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export function isRuntimeRequest(value: unknown): value is RuntimeRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  if (!isBoundedString(request.requestId, 100)) return false;
  if (request.type === "preview.cancel") return true;
  return request.type === "preview.resolve" && isBoundedString(request.url, 8_192);
}
