import { PEEK_CONFIG, isLicenseConfigured } from "../config";
import { verifyReceipt } from "../core/receipt";
import type { LicenseState } from "../core/types";
import { readStorage, updateStorage } from "../platform/storage";

const REQUEST_TIMEOUT_MS = 8_000;
const GRACE_MS = 4 * 24 * 60 * 60 * 1_000;

interface LicenseApiSuccess {
  ok: true;
  data: { instanceId: string; receipt: string; expiresAt: number };
}

interface LicenseApiFailure {
  ok: false;
  error: { code: string; message: string; requestId?: string };
}

type LicenseApiResponse = LicenseApiSuccess | LicenseApiFailure;

export class LicenseServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LicenseServiceError";
  }
}

async function requestLicense(
  path: "activate" | "validate" | "deactivate",
  body: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<LicenseApiResponse> {
  if (!isLicenseConfigured()) throw new LicenseServiceError("not_configured", "License service is not configured yet.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(`${PEEK_CONFIG.licenseApiBase}/v1/licenses/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    const value: unknown = await response.json();
    if (typeof value !== "object" || value === null) throw new Error();
    return value as LicenseApiResponse;
  } catch (error) {
    if (error instanceof LicenseServiceError) throw error;
    if (controller.signal.aborted) throw new LicenseServiceError("timeout", "License service took too long to respond.");
    throw new LicenseServiceError("unavailable", "License service is temporarily unavailable.");
  } finally {
    clearTimeout(timer);
  }
}

async function validateApiReceipt(data: LicenseApiSuccess["data"]): Promise<void> {
  if (!PEEK_CONFIG.receiptPublicJwk) throw new LicenseServiceError("not_configured", "Receipt key is not configured.");
  const payload = await verifyReceipt(data.receipt, PEEK_CONFIG.receiptPublicJwk, {
    productId: PEEK_CONFIG.creemProductId,
    mode: PEEK_CONFIG.creemMode,
  });
  if (payload.instanceId !== data.instanceId || payload.exp * 1_000 !== data.expiresAt) {
    throw new LicenseServiceError("invalid_receipt", "License service returned inconsistent proof.");
  }
}

async function verifiedLocalStatus(license: LicenseState, now = Date.now()): Promise<"pro" | "grace" | "invalid"> {
  if (!license.receipt || !PEEK_CONFIG.receiptPublicJwk) return "invalid";
  try {
    const payload = await verifyReceipt(
      license.receipt,
      PEEK_CONFIG.receiptPublicJwk,
      { productId: PEEK_CONFIG.creemProductId, mode: PEEK_CONFIG.creemMode, allowExpired: true },
    );
    const expiresAt = payload.exp * 1_000;
    if (now < expiresAt) return "pro";
    return now < expiresAt + GRACE_MS ? "grace" : "invalid";
  } catch {
    return "invalid";
  }
}

export async function activateLicense(licenseKey: string): Promise<LicenseState> {
  const cleanKey = licenseKey.trim();
  if (!cleanKey || cleanKey.length > 200) throw new LicenseServiceError("invalid_key", "Enter a valid license key.");
  const current = await readStorage();
  const deviceId = current.license.deviceId ?? crypto.randomUUID();
  const response = await requestLicense("activate", { licenseKey: cleanKey, instanceName: `Peek-${deviceId.slice(0, 8)}` });
  if (!response.ok) throw new LicenseServiceError(response.error.code, response.error.message);
  await validateApiReceipt(response.data);
  const next: LicenseState = {
    status: "pro",
    instanceId: response.data.instanceId,
    licenseKey: cleanKey,
    deviceId,
    receipt: response.data.receipt,
    checkedAt: Date.now(),
    expiresAt: response.data.expiresAt,
  };
  await updateStorage((storage) => ({ ...storage, license: next }));
  return next;
}

export async function validateLicense(): Promise<LicenseState> {
  const current = await readStorage();
  const { license } = current;
  if (!license.licenseKey || !license.instanceId) return license;
  try {
    const response = await requestLicense("validate", { licenseKey: license.licenseKey, instanceId: license.instanceId });
    if (!response.ok) throw new LicenseServiceError(response.error.code, response.error.message);
    await validateApiReceipt(response.data);
    const next: LicenseState = { ...license, status: "pro", receipt: response.data.receipt, checkedAt: Date.now(), expiresAt: response.data.expiresAt };
    await updateStorage((storage) => ({ ...storage, license: next }));
    return next;
  } catch (error) {
    const mayUseGrace =
      error instanceof LicenseServiceError && ["timeout", "unavailable"].includes(error.code);
    if (!mayUseGrace) {
      const next: LicenseState = { ...license, status: "invalid", checkedAt: Date.now() };
      await updateStorage((storage) => ({ ...storage, license: next }));
      throw error;
    }
    const status = await verifiedLocalStatus(license);
    const next: LicenseState = { ...license, status, checkedAt: Date.now() };
    await updateStorage((storage) => ({ ...storage, license: next }));
    return next;
  }
}

export async function deactivateLicense(): Promise<LicenseState> {
  const current = await readStorage();
  const { license } = current;
  if (license.licenseKey && license.instanceId && isLicenseConfigured()) {
    const response = await requestLicense("deactivate", { licenseKey: license.licenseKey, instanceId: license.instanceId });
    if (!response.ok) throw new LicenseServiceError(response.error.code, response.error.message);
  }
  const next: LicenseState = {
    status: "free",
    instanceId: null,
    licenseKey: null,
    deviceId: license.deviceId,
    receipt: null,
    checkedAt: Date.now(),
    expiresAt: null,
  };
  await updateStorage((storage) => ({ ...storage, license: next }));
  return next;
}
