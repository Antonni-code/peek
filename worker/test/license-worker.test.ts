import { webcrypto } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { verifyReceipt } from "../../src/core/receipt";
import { handleRequest, type Env } from "../src/index";

const cryptoImpl = webcrypto as unknown as Crypto;
let privateJwk: JsonWebKey;
let publicJwk: JsonWebKey;

beforeAll(async () => {
  const pair = await cryptoImpl.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  privateJwk = await cryptoImpl.subtle.exportKey("jwk", pair.privateKey);
  publicJwk = await cryptoImpl.subtle.exportKey("jwk", pair.publicKey);
});

function env(overrides: Partial<Env> = {}): Env {
  return {
    CREEM_API_KEY: "secret-test-key",
    CREEM_PRODUCT_ID: "prod_peek",
    CREEM_MODE: "test",
    ALLOWED_EXTENSION_IDS: "extension-id",
    RECEIPT_PRIVATE_JWK: JSON.stringify(privateJwk),
    ...overrides,
  };
}

function request(path: string, body: unknown, origin = "chrome-extension://extension-id"): Request {
  return new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function providerLicense(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    product_id: "prod_peek",
    status: "active",
    mode: "test",
    expires_at: null,
    instance: { id: "instance-1", status: "active" },
    ...overrides,
  };
}

describe("Peek license Worker", () => {
  it("activates through Creem and returns a verifiable scoped receipt", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(providerLicense()), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const response = await handleRequest(
      request("/v1/licenses/activate", { licenseKey: "KEY-123", instanceName: "Peek-device" }),
      env(),
      { fetcher, cryptoImpl, now: () => 1_800_000_000_000 },
    );
    const body = (await response.json()) as { ok: boolean; data: { instanceId: string; receipt: string } };
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("chrome-extension://extension-id");
    expect(fetcher).toHaveBeenCalledOnce();
    const firstCall = fetcher.mock.calls[0];
    expect(firstCall?.[0]).toBe("https://api.creem.io/v1/licenses/activate");
    expect(firstCall?.[1]?.method).toBe("POST");
    expect(new Headers(firstCall?.[1]?.headers).get("x-api-key")).toBe("secret-test-key");
    const receipt = await verifyReceipt(
      body.data.receipt,
      publicJwk,
      { productId: "prod_peek", mode: "test", nowSeconds: 1_800_000_000 },
      cryptoImpl,
    );
    expect(receipt.instanceId).toBe("instance-1");
    expect(JSON.stringify(body)).not.toContain("secret-test-key");
    expect(JSON.stringify(body)).not.toContain("KEY-123");
  });

  it("rejects licenses for another product", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(providerLicense({ product_id: "prod_other" })), { status: 200 }),
    );
    const response = await handleRequest(
      request("/v1/licenses/validate", { licenseKey: "KEY", instanceId: "instance-1" }),
      env(),
      { fetcher, cryptoImpl },
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "wrong_product" } });
  });

  it("denies unknown extension origins before calling Creem", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await handleRequest(
      request("/v1/licenses/activate", { licenseKey: "KEY", instanceName: "Peek" }, "chrome-extension://attacker"),
      env(),
      { fetcher, cryptoImpl },
    );
    expect(response.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("honors the rate-limit binding", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await handleRequest(
      request("/v1/licenses/activate", { licenseKey: "KEY", instanceName: "Peek" }),
      env({ LICENSE_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } }),
      { fetcher, cryptoImpl },
    );
    expect(response.status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
