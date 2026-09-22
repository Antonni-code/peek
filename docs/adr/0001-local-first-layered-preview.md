# ADR 0001: Local-first layered preview

Status: accepted

Date: 2026-09-22

## Context

Iframe previews are inconsistent because publishers can deny embedding. A server screenshot/metadata service would add accounts, cost, logging risk, abuse surface, and latency. A metadata-only card is reliable but undifferentiated.

## Decision

Use a layered local-first preview:

- metadata/excerpt is the reliable base;
- safe image and reader enhancements use the same fetched response;
- blocked sites receive an actionable fallback;
- the extension stores all browsing-derived data locally;
- one stateless Worker exists only for Creem license operations;
- Pro value is Peek Stack, history, reader, preferences, and backup.

## Consequences

The product remains small, privacy-oriented, and inexpensive to operate. Some JavaScript-heavy or protected pages cannot provide rich previews. That limitation is surfaced honestly instead of bypassed. Broad host access is still required for the core automatic hover interaction and must be clearly justified to users and reviewers.
