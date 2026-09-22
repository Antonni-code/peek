# Preview pipeline

## Why Peek is not iframe-first

Many websites deny framing with Content Security Policy or `X-Frame-Options`. An iframe-first product looks impressive on a demo site and broken in ordinary browsing. Peek instead guarantees a stable metadata card and enhances only when data is safely available.

## Resolution order

1. Accept only a syntactically valid `http:` or `https:` URL.
2. Reject embedded credentials, literal private/local addresses, `.local`, and localhost targets.
3. Remove the fragment and use the normalized URL as the cache key.
4. Return a fresh success or short-lived failure cache entry when present.
5. Coalesce an in-flight request for the same URL.
6. Fetch from the extension service worker with omitted credentials and no referrer.
7. Follow no more than five redirects, revalidating every destination.
8. Stop after eight seconds or one million response bytes.
9. Accept HTML, XHTML, plain text, or a missing content type; reject other file types.
10. Parse Open Graph, Twitter Card, standard metadata, title, favicon, and readable text.
11. Resolve image/favicon URLs through the same web-URL validator.
12. Render a ready, partial, cached, or unavailable state.

## Metadata priority

| Field | Priority |
| --- | --- |
| title | `og:title`, `twitter:title`, document title, hostname |
| description | `og:description`, `twitter:description`, `description`, excerpt |
| image | `og:image:secure_url`, `og:image`, `twitter:image` |
| site | `og:site_name`, `application-name`, hostname |

## Cache contract

- source of truth: the fetched web page;
- key: normalized URL plus the current parser behavior;
- successful TTL: 24 hours;
- failure TTL: 10 minutes;
- maximum: 300 entries and 20 MB;
- eviction: expired entries first, then least recently accessed;
- cancellation: abort only when every subscriber for an in-flight URL leaves;
- failure: bypass cache and show an actionable fallback, never fake fresh content.

## Known limitations

- Pages that require authentication, JavaScript rendering, cookies, or bot challenges may expose only basic metadata or fail.
- DNS resolution is owned by the browser; literal local/private targets are blocked, but Peek is not a network security boundary.
- Reader mode is plain text by design. It does not reproduce the publisher's layout or execute embedded content.
