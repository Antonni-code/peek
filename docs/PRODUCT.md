# Product rules

## Promise

Peek answers one question quickly: “What is behind this link?” It must not make the user leave the page, wait through heavy UI, or trust a fake live preview.

## Free forever

- unlimited previews on supported `http` and `https` links;
- title, source, description, image, favicon, excerpt, and cached status when available;
- Open, Open in background, Copy, Retry, and one Pin;
- automatic light/dark appearance;
- bounded local cache;
- no account and no remote browsing-history collection.

Free preview count is never throttled. Monetization comes from organization and power-user workflow, not from making the core action frustrating.

## Peek Pro

Price: **$5.99 once, lifetime access**.

- unlimited pinned previews in Peek Stack;
- searchable local history, collected only while Pro is active and history is enabled;
- local reader mode using sanitized plain text already fetched for the preview;
- activation-key, delay, size, side, and appearance controls;
- local JSON export/import;
- signed license entitlement with offline grace.

## Entitlement changes

- A failed refresh caused by network/service outage may use a previously verified receipt during the defined grace window.
- A provider rejection, wrong product, wrong environment, invalid signature, expiration beyond grace, refund, or disabled key removes Pro access.
- Pins and history are never deleted when Pro ends. They remain locally preserved and can be reduced or reactivated later.
- Free enforces one visible/storable pin. It does not silently discard a user's existing Pro collection.

## Explicit non-goals

- no accounts, synchronization, collaboration, AI summaries, analytics, ads, or subscription;
- no remote screenshot service;
- no bypassing logins, paywalls, bot protection, CSP, or `X-Frame-Options`;
- no execution of fetched scripts or remote extension code;
- no iframe-first preview that fails unpredictably.
