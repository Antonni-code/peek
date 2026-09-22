# Release process

Publishing is intentionally manual. Building the repository does not deploy Cloudflare, change Creem, or upload to the Chrome Web Store.

## Before the release build

1. Finish Creem Test validation.
2. Resolve the Mojojo store review request and obtain live access.
3. Configure the production Worker, secrets, rate limit, product, mode, receipt keys, allowed published extension ID, and checkout URL.
4. Replace every `REPLACE_ME` and `example.workers.dev` placeholder.
5. Increment `version` in `package.json` and `manifest.config.ts` together.
6. Update documentation when behavior or permissions change.

## Build and inspect

```bash
npm ci
npm run check
npm run verify:local
npx wrangler deploy --config worker/wrangler.jsonc --dry-run --outdir dist
```

Then verify:

- `dist/manifest.json` uses Manifest V3 and the intended permissions only;
- `dist` contains no source maps, `.env`, `.dev.vars`, private key, API key, test fixture, or placeholder;
- popup, options, content script, service worker, and icons are present;
- the unpacked build completes the manual matrix in `TESTING.md`.

## Package

After production values are configured, run:

```bash
npm run package:extension
```

This performs a clean build, refuses placeholders, checks the manifest and bundle contents, and writes `releases/peek-v<version>.zip`. The ZIP root contains `manifest.json`.

## Cloudflare first, extension second

Deploy and validate the Production Worker before submitting the extension that points to it. Keep the previous Worker version available for rollback. The Worker API is versioned under `/v1`.

## Chrome Web Store

Upload the versioned ZIP, complete the permission justifications and privacy disclosures from the repository documents, add listing assets, save the draft, then submit for review. Do not use **Load unpacked** to update a public store listing.

## Recovery

- Extension defect: fix, increment version, rebuild, and submit an update. Do not mutate the uploaded ZIP.
- Worker defect: deploy the last verified Worker version or forward-fix the `/v1` contract.
- Leaked Creem key: rotate it in Creem and immediately replace the Worker secret.
- Leaked receipt private key: rotate the key pair, update Worker and extension, and shorten/expire the old receipt path deliberately.
