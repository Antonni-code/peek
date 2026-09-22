import type { EntitlementReceipt } from "../../src/core/receipt";
import { signReceipt } from "./receipt";

const BODY_LIMIT = 8_192;
const PROVIDER_BODY_LIMIT = 64_000;
const PROVIDER_TIMEOUT_MS = 6_000;
const RECEIPT_TTL_SECONDS = 72 * 60 * 60;

interface RateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  CREEM_API_KEY: string;
  CREEM_PRODUCT_ID: string;
  CREEM_MODE: "test" | "prod";
  CREEM_API_BASE?: string;
  ALLOWED_EXTENSION_IDS: string;
  RECEIPT_PRIVATE_JWK: string;
  LICENSE_RATE_LIMITER?: RateLimiter;
}

interface CreemLicense {
  product_id?: unknown;
  status?: unknown;
  mode?: unknown;
  expires_at?: unknown;
  instance?: { id?: unknown; status?: unknown } | null;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface WorkerDependencies {
  fetcher?: typeof fetch;
  cryptoImpl?: Crypto;
  now?: () => number;
}

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return env.CREEM_MODE === "test" ? "*" : null;
  const ids = env.ALLOWED_EXTENSION_IDS.split(",").map((value) => value.trim()).filter(Boolean);
  return ids.some((id) => origin === `chrome-extension://${id}`) ? origin : null;
}

function corsHeaders(origin: string | null, requestId: string): Headers {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "content-type");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-max-age", "86400");
    headers.set("vary", "Origin");
  }
  return headers;
}

function json(body: unknown, status: number, headers: Headers): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > BODY_LIMIT) throw new ApiError(413, "request_too_large", "Request is too large.");
  const text = await request.text();
  if (text.length > BODY_LIMIT) throw new ApiError(413, "request_too_large", "Request is too large.");
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "invalid_json", "Request must be valid JSON.");
  }
}

function boundedString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw new ApiError(400, "invalid_request", `${field} is invalid.`);
  }
  return value;
}

async function readProviderJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length > PROVIDER_BODY_LIMIT) throw new ApiError(502, "provider_error", "License provider returned an invalid response.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(502, "provider_error", "License provider returned an invalid response.");
  }
}

async function callCreem(
  path: "activate" | "validate" | "deactivate",
  payload: Record<string, string>,
  env: Env,
  fetcher: typeof fetch,
): Promise<CreemLicense> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const base = env.CREEM_API_BASE ?? "https://api.creem.io/v1";
    const response = await fetcher(`${base}/licenses/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.CREEM_API_KEY },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await readProviderJson(response);
    if (!response.ok) {
      const status = response.status === 400 || response.status === 404 ? 400 : 502;
      throw new ApiError(status, "license_rejected", "Creem rejected this license request.");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ApiError(502, "provider_error", "License provider returned an invalid response.");
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError(504, "provider_timeout", "License provider timed out.");
    throw new ApiError(502, "provider_unavailable", "License provider is unavailable.");
  } finally {
    clearTimeout(timer);
  }
}

function validateCreemLicense(license: CreemLicense, env: Env): string {
  if (license.product_id !== env.CREEM_PRODUCT_ID) throw new ApiError(403, "wrong_product", "This key is not for Peek Pro.");
  if (license.mode !== env.CREEM_MODE) throw new ApiError(403, "wrong_environment", "This key belongs to a different environment.");
  if (license.status !== "active" || license.instance?.status !== "active") throw new ApiError(403, "license_inactive", "This license is not active.");
  if (typeof license.instance.id !== "string" || !license.instance.id) throw new ApiError(502, "provider_error", "License provider omitted the instance.");
  if (typeof license.expires_at === "string" && Date.parse(license.expires_at) <= Date.now()) throw new ApiError(403, "license_expired", "This license has expired.");
  return license.instance.id;
}

async function createReceipt(instanceId: string, env: Env, dependencies: WorkerDependencies): Promise<{ receipt: string; expiresAt: number }> {
  const nowSeconds = Math.floor((dependencies.now?.() ?? Date.now()) / 1_000);
  const expiresAt = nowSeconds + RECEIPT_TTL_SECONDS;
  let privateJwk: JsonWebKey;
  try {
    privateJwk = JSON.parse(env.RECEIPT_PRIVATE_JWK) as JsonWebKey;
  } catch {
    throw new ApiError(500, "server_configuration", "License service is not configured.");
  }
  const payload: EntitlementReceipt = { v: 1, productId: env.CREEM_PRODUCT_ID, instanceId, mode: env.CREEM_MODE, status: "pro", iat: nowSeconds, exp: expiresAt };
  return { receipt: await signReceipt(payload, privateJwk, dependencies.cryptoImpl), expiresAt: expiresAt * 1_000 };
}

async function rateLimitKey(request: Request, licenseKey: string, cryptoImpl: Crypto): Promise<string> {
  const material = new TextEncoder().encode(`${request.headers.get("origin") ?? "none"}:${new URL(request.url).pathname}:${licenseKey}`);
  const digest = await cryptoImpl.subtle.digest("SHA-256", material);
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(request: Request, licenseKey: string, env: Env, cryptoImpl: Crypto): Promise<void> {
  if (!env.LICENSE_RATE_LIMITER) return;
  const key = await rateLimitKey(request, licenseKey, cryptoImpl);
  const result = await env.LICENSE_RATE_LIMITER.limit({ key });
  if (!result.success) throw new ApiError(429, "rate_limited", "Too many license attempts. Try again later.");
}

export async function handleRequest(request: Request, env: Env, dependencies: WorkerDependencies = {}): Promise<Response> {
  const requestId = crypto.randomUUID();
  const origin = allowedOrigin(request, env);
  const headers = corsHeaders(origin, requestId);
  if (new URL(request.url).pathname === "/health") return json({ ok: true, mode: env.CREEM_MODE }, 200, headers);
  if (!origin) return json({ ok: false, error: { code: "origin_denied", message: "Origin is not allowed.", requestId } }, 403, headers);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ ok: false, error: { code: "method_not_allowed", message: "Method not allowed.", requestId } }, 405, headers);

  try {
    const path = new URL(request.url).pathname;
    const body = await readJson(request);
    const licenseKey = boundedString(body.licenseKey, "licenseKey", 200);
    await enforceRateLimit(request, licenseKey, env, dependencies.cryptoImpl ?? crypto);
    const fetcher = dependencies.fetcher ?? fetch;
    if (path === "/v1/licenses/activate") {
      const instanceName = boundedString(body.instanceName, "instanceName", 100);
      const license = await callCreem("activate", { key: licenseKey, instance_name: instanceName }, env, fetcher);
      const instanceId = validateCreemLicense(license, env);
      return json({ ok: true, data: { instanceId, ...(await createReceipt(instanceId, env, dependencies)) } }, 200, headers);
    }
    if (path === "/v1/licenses/validate") {
      const instanceId = boundedString(body.instanceId, "instanceId", 200);
      const license = await callCreem("validate", { key: licenseKey, instance_id: instanceId }, env, fetcher);
      const verifiedInstanceId = validateCreemLicense(license, env);
      if (verifiedInstanceId !== instanceId) throw new ApiError(403, "instance_mismatch", "License instance does not match.");
      return json({ ok: true, data: { instanceId, ...(await createReceipt(instanceId, env, dependencies)) } }, 200, headers);
    }
    if (path === "/v1/licenses/deactivate") {
      const instanceId = boundedString(body.instanceId, "instanceId", 200);
      await callCreem("deactivate", { key: licenseKey, instance_id: instanceId }, env, fetcher);
      return json({ ok: true, data: { deactivated: true } }, 200, headers);
    }
    throw new ApiError(404, "not_found", "Route not found.");
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "internal", "License service failed safely.");
    return json({ ok: false, error: { code: apiError.code, message: apiError.message, requestId } }, apiError.status, headers);
  }
}

export default { fetch: handleRequest };
