import { encodeReceiptPart, toBase64Url, type EntitlementReceipt } from "../../src/core/receipt";

export async function signReceipt(
  payload: EntitlementReceipt,
  privateJwk: JsonWebKey,
  cryptoImpl: Crypto = crypto,
): Promise<string> {
  const header = encodeReceiptPart({ alg: "ES256", typ: "PEEK" });
  const body = encodeReceiptPart(payload);
  const key = await cryptoImpl.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoImpl.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${body}`),
  );
  return `${header}.${body}.${toBase64Url(new Uint8Array(signature))}`;
}
