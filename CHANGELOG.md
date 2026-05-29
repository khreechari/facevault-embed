# Changelog

All notable changes to `facevault-embed`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-28

### Added

- Initial public release of the FaceVault embed loader.
- `embed.js` — drop-in browser loader that opens the hosted verification
  widget in a modal, verifies the `postMessage` origin, and forwards
  `ready` / `progress` / `complete` / `error` / `cancel` events on a global
  `FV` object. Vanilla ES5, zero runtime dependencies. The release workflow
  substitutes the tag into the file's top comment at build time so the
  served `embed.js` always carries its real version.
- Integration examples: FastAPI (`examples/fastapi`), Express
  (`examples/express`), and plain HTML (`examples/html`), all minting the
  single-use `widget_token` server-side.
- Server examples include a `POST /webhook` route that verifies HMAC-SHA256
  against the raw request body using the official `facevault` Python and
  Node SDKs — completes the integration story end-to-end (server-side
  truth, not the browser `complete` event).
- Webhook-handler unit tests (pytest for FastAPI, vitest+supertest for
  Express) covering valid signature, invalid signature, and missing-header
  cases.
- README with a four-step Quick Start (mint → render → listen → confirm),
  JavaScript API reference, and event payloads.
- Project docs: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- CI (`ci.yml`) running on every push and pull request: syntax-checks
  `embed.js` + the examples, plus the new webhook handler tests. Release
  workflow (`release.yml`) that, on tag push, publishes `embed.js` +
  `SHA256SUMS.txt` as release assets with the matching CHANGELOG section
  as the release body.
