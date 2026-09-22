# Peek

Preview links without losing your place.

Peek is a lightweight Chromium extension. Hold `Option` on macOS or `Alt` on Windows/Linux and hover a link. A fast, isolated card shows the page title, source, summary, image, and useful actions. If a site blocks previewing, Peek keeps an honest fallback with Open, Copy, and Retry instead of showing a broken frame.

## Plans

Free is a complete preview tool: unlimited previews, safe metadata, quick actions, automatic appearance, and one pinned preview.

Peek Pro is a **$5.99 lifetime purchase**: unlimited Peek Stack, searchable local history, reader mode, customization, and JSON backup. There are no accounts and no subscriptions.

## Status

The complete v0.1 implementation is in this repository. Before packaging a sellable build, replace the explicit placeholders in `src/config.ts`, `manifest.config.ts`, and `worker/wrangler.jsonc` with the final Creem and Cloudflare values. Do not publish a build containing placeholders.

## Stack

- Manifest V3, TypeScript, Vite, and CRXJS
- framework-free Shadow DOM interface
- `chrome.storage.local` for settings, cache, pins, history, and license state
- stateless Cloudflare Worker for Creem license operations
- Web Crypto ECDSA P-256 signed entitlement receipts
- Vitest, ESLint, and strict TypeScript

## Local development

```bash
npm install
npm run check
npm run dev
```

For a production extension build:

```bash
npm run build
```

Then open `chrome://extensions` or `brave://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist` directory.

## Project map

```text
src/background/   service worker, preview fetches, tab actions, licensing
src/content/      hover intent, Shadow DOM preview, Peek Stack
src/core/         pure product rules, parsing, cache, receipts, imports
src/options/      settings, history, reader, data, and license management
src/popup/        quick status and Peek Stack launcher
src/platform/     browser storage adapter and serialized updates
worker/           Cloudflare license API
tests/            extension unit and DOM tests
docs/             product, architecture, security, setup, and release guides
```

## Documentation

- [Product rules](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Preview pipeline](docs/PREVIEW_PIPELINE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Security and privacy](docs/SECURITY_PRIVACY.md)
- [Creem and Cloudflare setup](docs/CREEM_CLOUDFLARE.md)
- [Testing](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Release process](docs/RELEASE.md)
- [Privacy policy](docs/PRIVACY_POLICY.md)
- [Chrome Web Store copy](docs/CHROME_WEB_STORE.md)
- [Architecture decisions](docs/adr/0001-local-first-layered-preview.md)

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch the extension build |
| `npm run build` | Typecheck and create `dist` |
| `npm run test` | Run extension and Worker tests |
| `npm run lint` | Run static analysis |
| `npm run check` | Run lint, types, tests, and production build |
| `npm run icons` | Rebuild PNG icons from the SVG source |
| `npm run worker:dev` | Run the license Worker locally |
| `npm run worker:deploy` | Deploy the Worker after configuration |

No secret belongs in the extension package, repository, or commit history.
