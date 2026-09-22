const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain", "0.0.0.0"]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a = 0, b = 0] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
}

export class UrlValidationError extends Error {
  constructor(
    readonly code: "unsupported_url" | "blocked_url",
    message: string,
  ) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export function normalizePreviewUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UrlValidationError("unsupported_url", "This link is not a valid web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError("unsupported_url", "Peek supports only web links.");
  }
  if (url.username || url.password) {
    throw new UrlValidationError("blocked_url", "Links containing credentials cannot be previewed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    throw new UrlValidationError("blocked_url", "Local and private network links are not previewed.");
  }

  url.hash = "";
  return url.toString();
}

export function resolveWebUrl(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    return normalizePreviewUrl(new URL(value, base).toString());
  } catch {
    return null;
  }
}
