# Changelog

All notable changes to `facevault-embed`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial public scaffold of the FaceVault embed loader.
- `embed.js` — drop-in browser loader that opens the hosted verification
  widget in a modal, verifies the `postMessage` origin, and forwards
  `ready` / `progress` / `complete` / `error` / `cancel` events on a global
  `FV` object. Vanilla ES5, zero runtime dependencies.
- Integration examples: FastAPI (`examples/fastapi`), Express
  (`examples/express`), and plain HTML (`examples/html`), all minting the
  single-use `widget_token` server-side.
- README with the verification flow, quick start, JavaScript API reference,
  and event payloads.
- Project docs: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- CI (`ci.yml`) running on every push and pull request: syntax-checks
  `embed.js` and the examples. Release workflow (`release.yml`) that, on tag
  push, publishes `embed.js` + `SHA256SUMS.txt` as release assets with the
  matching CHANGELOG section as the release body.
