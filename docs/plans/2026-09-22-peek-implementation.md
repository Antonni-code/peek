# Peek v0.1 Implementation Plan

Each phase must end in a working state, pass its checks, and receive one short commit with no co-author footer.

## Phase 0 — Product and architecture

- Lock the approved Free/Pro boundary, preview fallback strategy, security model, performance budgets, and release boundary.
- Record the phased implementation plan.

Checks: documentation review and clean Git status.

Commits: `document design`, `plan implementation`.

## Phase 1 — Extension foundation

- Create a Manifest V3 TypeScript project with Vite and CRXJS.
- Add strict TypeScript, linting, formatting, Vitest, and build scripts.
- Define feature-owned folders, shared contracts, storage schema, migrations, and defaults.
- Add popup, options, content-script, and service-worker entry points.
- Add extension icons and a strict CSP without remote code.

Checks: typecheck, unit tests, production build, manifest inspection.

Commit: `build foundation`.

## Phase 2 — Preview engine

- Implement delegated link discovery and `Alt`/`Option` hover intent state machine.
- Normalize supported URLs and reject unsafe schemes.
- Implement service-worker fetch with cancellation, timeout, redirect, content-type, and size bounds.
- Parse Open Graph, Twitter Card, standard metadata, favicon, and readable text.
- Implement request coalescing and bounded LRU storage cache.
- Add typed runtime-message validation and actionable fallbacks.

Checks: parser, URL, cache, request, timeout, and message-contract tests.

Commit: `build preview engine`.

## Phase 3 — Preview experience

- Build the isolated Shadow DOM preview surface and design tokens.
- Add stable loading, ready, partial, unavailable, offline, and retry states.
- Add open, background open, copy, pin, keyboard, focus, and dismissal behavior.
- Implement collision-aware positioning, zoom support, light/dark mode, and reduced motion.
- Implement the free one-pin rule without interrupting unlimited previews.

Checks: DOM interaction tests, keyboard/focus tests, accessibility scan, rendered visual inspection.

Commit: `build preview experience`.

## Phase 4 — Peek Stack and Pro tools

- Add the edge-based Peek Stack with ordering, restore, close, and overflow behavior.
- Add searchable local history with bounded retention.
- Add sanitized reader view from fetched content.
- Add Pro preferences for size, side, theme, delay, and activation behavior.
- Add validated JSON export/import and non-destructive locked-data behavior.

Checks: entitlement rules, history, stack, reader sanitization, settings, and import/export tests.

Commit: `build pro tools`.

## Phase 5 — Creem license system

- Build a separate Cloudflare Worker with typed environment configuration.
- Implement health, activate, validate, and deactivate routes against Creem's current license API.
- Validate product ID, environment, status, instance, expiration, and provider payloads.
- Add CORS allowlisting for extension origins, rate-limit hooks, timeouts, redacted structured errors, and request IDs.
- Return signed, short-lived entitlement receipts; verify them locally with a bundled public key.
- Keep test and production endpoints/configuration separate.
- Preserve local data when entitlement changes.

Checks: Worker unit and contract tests for valid, invalid, expired, wrong-product, duplicate, timeout, and malformed cases.

Commit: `build license system`.

## Phase 6 — Product surfaces and documentation

- Finish popup onboarding/status and the full options experience.
- Add clear permission, privacy, paywall, license, and recovery copy.
- Write README, product rules, architecture, preview pipeline, design system, security/privacy, Creem/Cloudflare setup, testing, troubleshooting, release, and ADR documents.
- Add privacy policy and Chrome Web Store listing copy.

Checks: copy/state review, documentation link check, permission rationale review.

Commit: `finish product docs`.

## Phase 7 — Hardening and package

- Run the complete test, typecheck, lint, build, and secret-scan suite.
- Inspect bundle size, manifest permissions, CSP, source maps, and packaged contents.
- Exercise Chrome/Brave unpacked flows and important degraded states when browser automation is available.
- Produce versioned Chrome Web Store ZIP and Cloudflare deployment instructions without publishing either.
- Record exact verification evidence and remaining environment-dependent checks.

Checks: all automated checks green, deterministic package contents, clean Git status.

Commit: `prepare release`.

## GitHub handoff

- Create `Antonni-code/peek` as a public repository.
- Push the complete linear commit history to `main`.
- Confirm repository visibility, default branch, README rendering, and downloadable release artifact source.

No author/co-author text is added to commit messages or document prose.
