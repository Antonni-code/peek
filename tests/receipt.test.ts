import { webcrypto } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { verifyReceipt, type EntitlementReceipt } from "../src/core/receipt";
import { signReceipt } from "../worker/src/receipt";

const cryptoImpl = webcrypto as unknown as Crypto;
let privateJwk: JsonWebKey;
let publicJwk: JsonWebKey;

beforeAll(async () => {
  const pair = await cryptoImpl.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  privateJwk = await cryptoImpl.subtle.exportKey("jwk", pair.privateKey);
  publicJwk = await cryptoImpl.subtle.exportKey("jwk", pair.publicKey);
});

const payload: EntitlementReceipt = {
  v: 1,
  productId: "prod_peek",
  instanceId: "instance-1",
  mode: "test",
  status: "pro",
  iat: 100,
  exp: 200,
};

describe("signed entitlement receipts", () => {
  it("verifies valid claims", async () => {
    const receipt = await signReceipt(payload, privateJwk, cryptoImpl);
    await expect(
      verifyReceipt(receipt, publicJwk, { productId: "prod_peek", mode: "test", nowSeconds: 150 }, cryptoImpl),
    ).resolves.toEqual(payload);
  });

  it("rejects tampering, wrong products, and expiry", async () => {
    const receipt = await signReceipt(payload, privateJwk, cryptoImpl);
    const parts = receipt.split(".");
    const tampered = `${parts[0]}.${parts[1]}A.${parts[2]}`;
    await expect(verifyReceipt(tampered, publicJwk, { productId: "prod_peek", mode: "test", nowSeconds: 150 }, cryptoImpl)).rejects.toThrow();
    await expect(verifyReceipt(receipt, publicJwk, { productId: "prod_other", mode: "test", nowSeconds: 150 }, cryptoImpl)).rejects.toThrow("claims");
    await expect(verifyReceipt(receipt, publicJwk, { productId: "prod_peek", mode: "test", nowSeconds: 200 }, cryptoImpl)).rejects.toThrow("claims");
  });
});
