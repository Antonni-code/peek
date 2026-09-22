import { webcrypto } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { deriveEntitlement } from "../src/core/entitlement";
import type { EntitlementReceipt } from "../src/core/receipt";
import type { LicenseState } from "../src/core/types";
import { signReceipt } from "../worker/src/receipt";

const cryptoImpl = webcrypto as unknown as Crypto;
const DAY_MS = 24 * 60 * 60 * 1_000;

let privateJwk: JsonWebKey;
let publicJwk: JsonWebKey;

beforeAll(async () => {
  const pair = await cryptoImpl.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  privateJwk = await cryptoImpl.subtle.exportKey("jwk", pair.privateKey);
  publicJwk = await cryptoImpl.subtle.exportKey("jwk", pair.publicKey);
});

function license(receipt: string | null, overrides: Partial<LicenseState> = {}): LicenseState {
  return {
    status: "pro",
    instanceId: "instance-1",
    licenseKey: "key-1",
    deviceId: "device-1",
    receipt,
    checkedAt: 1,
    expiresAt: 2,
    ...overrides,
  };
}

async function receipt(exp: number, overrides: Partial<EntitlementReceipt> = {}): Promise<string> {
  return signReceipt(
    {
      v: 1,
      productId: "prod_peek",
      instanceId: "instance-1",
      mode: "test",
      status: "pro",
      iat: 100,
      exp,
      ...overrides,
    },
    privateJwk,
    cryptoImpl,
  );
}

const config = () => ({ productId: "prod_peek", mode: "test" as const, publicJwk });

describe("effective entitlement", () => {
  it("requires a signed matching receipt instead of trusting stored status", async () => {
    await expect(deriveEntitlement(license(null), config(), 150_000, cryptoImpl)).resolves.toBe("invalid");
    await expect(
      deriveEntitlement(license(await receipt(200), { instanceId: "other" }), config(), 150_000, cryptoImpl),
    ).resolves.toBe("invalid");
  });

  it("derives Pro and bounded offline grace from receipt expiry", async () => {
    const signed = await receipt(200);
    await expect(deriveEntitlement(license(signed), config(), 150_000, cryptoImpl)).resolves.toBe("pro");
    await expect(deriveEntitlement(license(signed), config(), 200_000 + 2 * DAY_MS, cryptoImpl)).resolves.toBe("grace");
    await expect(deriveEntitlement(license(signed), config(), 200_000 + 4 * DAY_MS, cryptoImpl)).resolves.toBe("invalid");
  });

  it("rejects tampered receipts and missing public configuration", async () => {
    const signed = await receipt(200);
    const parts = signed.split(".");
    const tampered = `${parts[0]}.${parts[1]}A.${parts[2]}`;
    await expect(deriveEntitlement(license(tampered), config(), 150_000, cryptoImpl)).resolves.toBe("invalid");
    await expect(
      deriveEntitlement(license(signed), { ...config(), publicJwk: null }, 150_000, cryptoImpl),
    ).resolves.toBe("invalid");
  });

  it("keeps a never-activated install on the free plan", async () => {
    await expect(
      deriveEntitlement(
        license(null, { status: "free", licenseKey: null, instanceId: null }),
        config(),
        150_000,
        cryptoImpl,
      ),
    ).resolves.toBe("free");
  });
});
