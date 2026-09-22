# Peek v0.1 Design

## Product

Peek is a Chromium extension that lets people inspect a link without losing their place. Hold `Alt` on Windows/Linux or `Option` on macOS and hover a link to open a fast preview beside it.

The product must feel useful before purchase, remain local-first, and degrade honestly when a site blocks richer preview methods.

## Experience

### Primary interaction

1. The user holds the activation key and rests on a link.
2. A small lens indicator appears immediately.
3. After a short intent delay, an anchored preview opens without shifting page layout.
4. The preview shows a stable skeleton while metadata is resolved.
5. The user can open the link, open it in the background, copy it, or pin the preview.
6. Releasing the key or moving away dismisses an unpinned preview. `Escape` always closes the active preview.

Keyboard and pointer paths have equal access to the primary actions. Motion uses opacity and transform only, lasts 150–220 ms, and is removed when reduced motion is requested.

### Visual direction

Peek uses a compact editorial lens rather than a generic dashboard card:

- neutral ink and warm paper surfaces with one electric-lime focus accent;
- one sans-serif system stack, strong title hierarchy, and restrained metadata;
- a hairline border, soft directional shadow, and 16 px radius;
- a narrow source rail containing the favicon, hostname, content type, and freshness;
- no gradients, emoji icons, decorative metrics, glass blur, or oversized empty space;
- light and dark modes with WCAG 2.2 AA contrast targets;
- Shadow DOM isolation so host-page CSS cannot corrupt the interface.

The Pro Peek Stack uses an edge rail of layered preview tabs. This spatial model is the product signature: saved previews remain visible as a small ordered stack rather than becoming a conventional bookmarks list.

## Preview strategy

Three approaches were considered:

1. **Iframe-first:** visually impressive but unreliable because many sites deny framing through CSP or `X-Frame-Options`.
2. **Metadata-only:** reliable and easy to review, but too close to existing browser link cards.
3. **Layered preview:** metadata is always the stable base, then safe source-specific enhancements are added when available.

Peek uses the layered approach.

### Resolution pipeline

1. Normalize and validate `http:` or `https:` URL input.
2. Return a bounded fresh cache entry when available.
3. Fetch the document through the extension service worker with a deadline, redirect limit, response-size limit, and HTML content-type check.
4. Parse Open Graph, Twitter Card, standard metadata, favicon, and a short readable excerpt.
5. Sanitize and return a typed result to the content script.
6. If fetching or parsing fails, show hostname, URL, and an honest unavailable state with an Open action.

Remote scripts never execute inside the preview. Peek does not bypass authentication, paywalls, bot controls, CSP, or embedding restrictions. Images are loaded only from validated `http:`/`https:` URLs and fail without breaking layout.

## Free and Pro

### Free forever

- unlimited link previews;
- layered metadata, image, favicon, and excerpt when available;
- open, open in background, and copy actions;
- one pinned preview;
- automatic light/dark appearance;
- local bounded cache and no account.

### Peek Pro — $5.99 lifetime

- unlimited pinned previews in Peek Stack;
- searchable local preview history;
- clean reader view from already-fetched, sanitized content;
- custom card size, side, appearance, intent delay, and activation key;
- local JSON export/import;
- license activation on the user's own devices subject to the Creem product policy.

Losing, refunding, or failing to refresh a license never deletes local data. Pro-only controls become read-only and the user can export or reduce the stack.

## Architecture

### Extension

- Manifest V3, TypeScript, Vite, and CRXJS;
- content script owns link detection, intent state, positioning, and the Shadow DOM surface;
- service worker owns remote fetches, cache coordination, tabs, commands, and licensing;
- popup owns onboarding, status, settings shortcuts, and upgrade/activation entry points;
- options page owns preferences, history, stack management, export/import, and license management;
- `chrome.storage.local` is the durable source of truth; no account or remote user database;
- a schema version and migrations protect stored data across releases.

### Cloudflare Worker

The Worker is a narrow license boundary, not a general product backend.

- `POST /v1/licenses/activate`
- `POST /v1/licenses/validate`
- `POST /v1/licenses/deactivate`
- `GET /health`

It validates bounded JSON, rate-limits abuse, calls Creem with server-side credentials, returns normalized error codes, and signs short-lived entitlement receipts. The extension contains only the public verification key. Creem secrets never enter the extension or repository.

Test and production configuration are isolated. Live checkout remains disabled until the Mojojo Creem store is approved.

## Privacy and security

- request only permissions required by the core interaction;
- explain broad page access during onboarding and in store documentation;
- validate all runtime messages and reject unknown senders/actions;
- keep privileged fetch and tab operations out of the content script;
- treat fetched HTML, metadata, URLs, imported JSON, and license responses as untrusted;
- render text as text and sanitize reader markup with an allowlist;
- enforce URL scheme, timeout, redirect, body-size, and cache-size limits;
- never collect browsing history remotely;
- never log license keys, fetched content, full URLs, or personal data;
- use strict extension CSP with no remote executable code.

## Performance and caching

- lens feedback begins within one animation frame;
- preview intent delay defaults to 320 ms;
- warm metadata target is under 100 ms locally;
- remote resolution has an 8-second hard deadline and can be cancelled when intent ends;
- cache key is normalized URL plus parser schema version;
- successful entries use a 24-hour TTL, failures a 10-minute TTL;
- least-recently-used eviction caps the cache at 300 entries or 20 MB;
- concurrent requests for the same URL are coalesced;
- DOM listeners are delegated and installed once per frame;
- preview UI code and CSS carry no runtime framework.

These are implementation budgets and local test targets, not universal latency promises.

## Failure behavior

- blocked or unsupported URL: keep an actionable fallback card;
- slow network: stable skeleton, cancel, retry, and Open actions;
- service worker suspension: reconstruct state from storage;
- missing permission: explain and request only from a user gesture;
- license service unavailable: keep the last verified entitlement until its signed grace period expires;
- invalid/refunded license: preserve data and explain the next allowed action;
- corrupt storage/import: reject invalid records and retain the previous valid snapshot.

## Verification

- unit tests cover URL validation, metadata parsing, cache eviction, settings, state transitions, receipts, entitlements, imports, and message schemas;
- integration tests cover content-script/service-worker messages and license API contracts;
- DOM tests cover hover intent, keyboard behavior, focus, dismissal, reduced motion, and failure states;
- build checks verify Manifest V3 CSP, permissions, bundle contents, and absence of secrets;
- manual checks cover Chrome and Brave, light/dark, zoom, narrow windows, common sites, blocked sites, offline mode, and install/update flows.

## Documentation set

The repository will include README, product rules, architecture and data flow, preview fallback pipeline, design system, security/privacy, Creem and Cloudflare setup, testing, release, troubleshooting, and architectural decisions.

## Release boundary

Implementation finishes with tested unpacked and store ZIP builds plus exact upload instructions. The user will perform Chrome Web Store, Cloudflare, and Creem dashboard publishing.
