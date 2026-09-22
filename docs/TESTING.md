# Testing

## Automated suite

Run:

```bash
npm run check
```

This performs ESLint, strict TypeScript, 34+ unit/DOM/Worker tests, and the production extension build. Worker packaging is checked separately:

```bash
npx wrangler deploy --config worker/wrangler.jsonc --dry-run --outdir dist
```

Coverage includes URL rejection, metadata priority, script stripping, redirect/content/size handling, LRU behavior, typed messages, Free/Pro history, safe imports, Shadow DOM text rendering, stack output, ECDSA receipt verification, wrong products, origin denial, and rate limiting.

## Manual extension matrix

Test Chrome and Brave with a fresh profile where possible:

1. load `dist` unpacked;
2. open an ordinary page containing several links;
3. hold Option/Alt, hover, and verify lens → skeleton → preview;
4. move into the card, use every action, and press Escape;
5. test a metadata-rich article, plain page, redirect, missing image, PDF/ZIP, login page, blocked/private address, slow/offline network, and HTTP error;
6. pin, replace the Free pin, toggle Peek Stack, and restart the browser;
7. verify narrow window, 200% zoom, light/dark, keyboard focus, and reduced motion;
8. activate Test Pro and verify stack, history, reader, settings, export/import, refresh, grace, and deactivation;
9. inspect service-worker errors from the extension details page;
10. confirm no browsing data is sent to the Worker.

## Acceptance budgets

- intent feedback within one animation frame;
- default preview intent delay: 320 ms;
- warm local preview target: under 100 ms in a normal desktop profile;
- remote hard deadline: 8 seconds;
- preview body: at most 1 MB;
- cache: at most 300 entries and 20 MB;
- content bundle should remain small enough that the interaction has no framework startup cost.

These are local budgets, not promises about arbitrary websites or networks.
