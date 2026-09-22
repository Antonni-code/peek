import type { PreviewRecord } from "./types";
import { resolveWebUrl } from "./url";

const MAX_TITLE = 240;
const MAX_DESCRIPTION = 500;
const MAX_EXCERPT = 1_400;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const decodePoint = (point: number): string =>
      Number.isInteger(point) && point >= 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : match;
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const point = Number.parseInt(entity.slice(2), 16);
      return decodePoint(point);
    }
    if (entity.startsWith("#")) {
      const point = Number.parseInt(entity.slice(1), 10);
      return decodePoint(point);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function cleanText(value: string, maxLength: number): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag)) !== null) {
    const name = match[1]?.toLowerCase();
    if (!name || name === "meta") continue;
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function collectMetadata(html: string): Map<string, string> {
  const metadata = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    const content = attributes.content?.trim();
    if (key && content && !metadata.has(key)) metadata.set(key, content);
  }
  return metadata;
}

function first(metadata: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = metadata.get(key);
    if (value) return value;
  }
  return "";
}

function extractTitle(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? cleanText(match[1], MAX_TITLE) : "";
}

function extractReaderText(html: string): string {
  const safe = html
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|div|section|article|main|h[1-6]|li|blockquote|br)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(safe)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, 20_000);
}

export interface ParsePreviewInput {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  contentType: string | null;
  fetchedAt: number;
  id?: string;
}

export function parsePreviewHtml(input: ParsePreviewInput): PreviewRecord {
  const metadata = collectMetadata(input.html.slice(0, 300_000));
  const finalUrl = input.finalUrl;
  const url = new URL(finalUrl);
  const readerText = extractReaderText(input.html);
  const description = cleanText(
    first(metadata, ["og:description", "twitter:description", "description"]),
    MAX_DESCRIPTION,
  );
  const title = cleanText(
    first(metadata, ["og:title", "twitter:title"]) || extractTitle(input.html) || url.hostname,
    MAX_TITLE,
  );
  const record: PreviewRecord = {
    id: input.id ?? crypto.randomUUID(),
    url: input.requestedUrl,
    normalizedUrl: finalUrl,
    title,
    description,
    siteName: cleanText(first(metadata, ["og:site_name", "application-name"]), 120),
    hostname: url.hostname.replace(/^www\./, ""),
    imageUrl: resolveWebUrl(first(metadata, ["og:image:secure_url", "og:image", "twitter:image"]), finalUrl),
    faviconUrl: resolveWebUrl("/favicon.ico", finalUrl),
    contentType: input.contentType,
    excerpt: description || cleanText(readerText, MAX_EXCERPT),
    readerText: readerText || null,
    fetchedAt: input.fetchedAt,
    lastAccessedAt: input.fetchedAt,
    byteSize: new TextEncoder().encode(input.html).byteLength,
  };
  return record;
}
