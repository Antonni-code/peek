# Troubleshooting

## Peek does not appear

- Confirm the extension is enabled and the page is `http` or `https`.
- Reload the page after installing or rebuilding; content scripts do not retroactively attach to an already-open restricted page.
- Hold Option/Alt while the pointer is already over the link, or move onto the link while holding it.
- Browser internal pages, the Chrome Web Store, and some protected pages do not allow ordinary content scripts.
- Check Settings → Enable Peek.

## Preview unavailable

The target may block automated requests, require cookies/JavaScript, return a non-HTML file, redirect too often, exceed one MB, time out, or be a local/private target. Open still works. This is expected fallback behavior, not a reason to weaken security limits.

## Peek Stack button fails

The active tab may be a protected browser page or may not have reloaded since installation. Open a normal web page and reload once.

## License says not configured

Replace every placeholder in `src/config.ts` and `worker/wrangler.jsonc`, configure Worker secrets, deploy, then rebuild the extension.

## Activation rejects a real key

Check the complete matched set:

- Test key + Test product + Test API key + `test` mode;
- Production key + Production product + Production API key + `prod` mode;
- exact product ID in both Worker and extension;
- current unpacked or published extension ID in `ALLOWED_EXTENSION_IDS`;
- exact Worker URL in `src/config.ts`;
- matching receipt public/private JWK pair.

Unpacked and Chrome Web Store builds usually have different extension IDs. This was a source of failure in Later and must be handled explicitly for Peek.

## Build fails

Use Node 20 or newer, remove no lockfile, and run `npm install` followed by `npm run check`. Do not hand-edit generated `dist` files; fix source and rebuild.
