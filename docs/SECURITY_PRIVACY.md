# Security and privacy

## Trust boundaries

Fetched URLs, redirects, response headers, HTML, metadata, images, runtime messages, imported JSON, license keys, Worker responses, and Creem responses are untrusted. Chrome extension APIs, a verified receipt public key, and correctly configured Worker secrets are trusted boundaries.

## Controls

- Manifest V3 and a strict extension CSP prohibit remote executable code.
- Broad web access exists only because automatic link discovery and service-worker cross-origin fetch are core to the product.
- Content scripts perform no privileged fetch or license decision.
- Runtime messages are type, size, and sender validated.
- Preview fetch omits credentials/referrer and enforces URL, redirect, time, type, and byte limits.
- Remote values enter the UI with `textContent`; reader mode is plain text.
- Cache and history are bounded.
- Imports cannot change license or cache state and are capped at 2 MB.
- Creem API key and receipt private key exist only as Worker secrets.
- Receipts bind product, environment, instance, status, issuance, and expiration.
- Provider rejection invalidates immediately; outage grace requires a previously signed receipt.
- Worker CORS allowlists exact extension IDs and can rate-limit on a hashed license-route key.
- Responses and errors never include Creem credentials or the submitted license key.

## Permission rationale

| Permission | Reason |
| --- | --- |
| `storage` | local settings, pin, history, cache, and signed license state |
| `http://*/*`, `https://*/*` content access | detect hovered links on ordinary pages |
| matching host access | fetch metadata from the link destination in the service worker |
| exact Worker host | activate and validate Peek Pro |

Peek does not request cookies, browsing history, bookmarks, downloads, webRequest, debugger, identity, or clipboard permissions.

## Data handling

- Browsing previews, pins, history, settings, and cache stay in `chrome.storage.local`.
- The license key and device/instance identifiers are sent only to the configured license Worker and Creem for activation/validation.
- No analytics or advertising SDK is included.
- Uninstalling the extension removes browser-managed local extension data.
- Deactivating a license clears its key, instance, and receipt but preserves user pins/history.

## Residual limits

No client-side license system is unbreakable because a user controls their installed code. Signed receipts prevent normal storage spoofing and keep secrets out of the package; they are not DRM. Automated checks do not constitute a full security audit.
