export interface EntitlementReceipt {
  v: 1;
  productId: string;
  instanceId: string;
  mode: "test" | "prod";
  status: "pro";
  iat: number;
  exp: number;
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function encodeReceiptPart(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeReceiptPart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(value))) as T;
}

export async function verifyReceipt(
  receipt: string,
  publicJwk: JsonWebKey,
  expected: { productId: string; mode: "test" | "prod"; nowSeconds?: number; allowExpired?: boolean },
  cryptoImpl: Crypto = crypto,
): Promise<EntitlementReceipt> {
  const parts = receipt.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) throw new Error("Malformed receipt.");
  const header = decodeReceiptPart<{ alg?: string; typ?: string }>(parts[0]);
  if (header.alg !== "ES256" || header.typ !== "PEEK") throw new Error("Unsupported receipt.");
  const key = await cryptoImpl.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const valid = await cryptoImpl.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    fromBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("Receipt signature is invalid.");
  const payload = decodeReceiptPart<EntitlementReceipt>(parts[1]);
  const now = expected.nowSeconds ?? Math.floor(Date.now() / 1_000);
  if (
    payload.v !== 1 ||
    payload.status !== "pro" ||
    payload.productId !== expected.productId ||
    payload.mode !== expected.mode ||
    !payload.instanceId ||
    !Number.isFinite(payload.iat) ||
    !Number.isFinite(payload.exp) ||
    (!expected.allowExpired && payload.exp <= now) ||
    payload.iat > now + 300
  ) {
    throw new Error("Receipt claims are invalid.");
  }
  return payload;
}
