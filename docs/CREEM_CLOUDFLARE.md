# Creem and Cloudflare setup

Do this only after the extension works locally. Keep Test and Production completely separate. The current Mojojo Creem store must finish its requested changes and be approved before live Peek sales can work.

## 1. Create the Creem product in Test Mode

Create **Peek Pro — Lifetime** with:

- billing: one-time;
- price: USD $5.99;
- license keys: enabled;
- activation limit: 3 devices;
- description: “Unlimited Peek Stack, searchable local history, reader mode, customization, and local backup. One payment. No subscription.”

Copy the Test product ID, Test checkout URL, and Test API key. Never put the API key in extension code.

Creem's current license endpoints are `POST /v1/licenses/activate`, `/validate`, and `/deactivate`, authenticated with `x-api-key`. The Worker implements those contracts.

## 2. Generate receipt keys once

Run:

```bash
node scripts/generate-license-keys.mjs
```

Keep `privateJwk` secret. Copy only `publicJwk` into `src/config.ts`. If the private key is lost, existing receipts cannot be renewed by the same signer; generate a new pair and rebuild the extension deliberately.

## 3. Configure the Worker for Test

Edit `worker/wrangler.jsonc`:

1. `CREEM_PRODUCT_ID`: Test product ID.
2. `CREEM_MODE`: `test`.
3. `ALLOWED_EXTENSION_IDS`: the unpacked extension ID from `chrome://extensions` or `brave://extensions`. Add multiple IDs comma-separated only when needed.
4. `namespace_id`: use a positive integer not shared by another rate-limit binding in the same Cloudflare account.

The included rate limit permits 10 attempts per license/route per minute in each Cloudflare location.

Add secrets interactively:

```bash
npx wrangler secret put CREEM_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put RECEIPT_PRIVATE_JWK --config worker/wrangler.jsonc
```

Paste the Test API key for the first command and the one-line private JWK JSON for the second. Cloudflare recommends secrets rather than plain `vars` for sensitive values.

Deploy:

```bash
npm run worker:deploy
```

Copy the final `https://...workers.dev` URL and verify `GET /health` returns `{ "ok": true, "mode": "test" }`.

## 4. Connect the extension Test build

Edit `src/config.ts`:

- `licenseApiBase`: deployed Worker origin, no trailing slash;
- `checkoutUrl`: Test checkout URL;
- `creemProductId`: Test product ID;
- `creemMode`: `test`;
- `receiptPublicJwk`: the public JWK object, not a string.

Build and reload the unpacked extension:

```bash
npm run check
```

Complete a Creem Test purchase, enter the issued key in Peek settings, activate, refresh, deactivate, and reactivate. Confirm wrong keys, wrong products, network failure, and a different extension ID fail safely.

## 5. Move to Production

Do not change only one value. Production requires a matched set:

1. approved live Creem store;
2. live one-time product with license keys enabled;
3. live product ID, checkout URL, and API key;
4. `CREEM_MODE=prod` in Worker and extension;
5. published Chrome Web Store extension ID in `ALLOWED_EXTENSION_IDS`;
6. exact production Worker URL in `src/config.ts`;
7. production receipt public key in the extension and matching private key in Worker secrets.

Use a separate production Worker or a named Wrangler environment so Test secrets and counters cannot mix with Production. Cloudflare environment bindings and secrets are not inherited automatically.

## 6. Final validation

- Worker rejects unknown extension origins.
- Test keys cannot activate Production and Production keys cannot activate Test.
- Wrong product ID returns `wrong_product`.
- A disabled/refunded key becomes invalid on the next refresh.
- A provider outage uses only a previously signed, time-bounded grace entitlement.
- No secret or private JWK appears in `dist`, ZIP, logs, screenshots, or Git history.

Official references: [Creem license validation](https://docs.creem.io/api-reference/endpoint/validate-license), [Creem activation](https://docs.creem.io/api-reference/endpoint/activate-license), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), and [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
