import type { LicenseState } from "./types";
import { verifyReceipt } from "./receipt";

const GRACE_MS = 4 * 24 * 60 * 60 * 1_000;

export interface EntitlementConfig {
  productId: string;
  mode: "test" | "prod";
  publicJwk: JsonWebKey | null;
}

export type EffectiveEntitlement = "free" | "pro" | "grace" | "invalid";

export async function deriveEntitlement(
  license: LicenseState,
  config: EntitlementConfig,
  now = Date.now(),
  cryptoImpl: Crypto = crypto,
): Promise<EffectiveEntitlement> {
  if (!license.receipt) return license.licenseKey ? "invalid" : "free";
  if (!config.publicJwk) return "invalid";
  try {
    const payload = await verifyReceipt(
      license.receipt,
      config.publicJwk,
      {
        productId: config.productId,
        mode: config.mode,
        nowSeconds: Math.floor(now / 1_000),
        allowExpired: true,
      },
      cryptoImpl,
    );
    if (payload.instanceId !== license.instanceId) return "invalid";
    const expiresAt = payload.exp * 1_000;
    if (now < expiresAt) return "pro";
    return now < expiresAt + GRACE_MS ? "grace" : "invalid";
  } catch {
    return "invalid";
  }
}
