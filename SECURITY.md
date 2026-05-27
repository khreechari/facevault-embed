# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in the FaceVault embed loader
or the FaceVault services it depends on (the widget-session endpoint, the
hosted verification page), please **do not open a public GitHub issue**.

Instead, email **security@facevault.id** with:

- A description of the issue and its impact.
- Reproduction steps or a proof-of-concept.
- Affected version (the release tag you pinned, or the commit currently served
  at `https://app.facevault.id/embed.js`).
- Whether you have already disclosed the issue elsewhere.

We will acknowledge receipt within **3 business days** and aim to ship a fix
within **30 days** for high-severity issues. We will credit you in the release
notes unless you ask to remain anonymous.

## Scope

In scope:

- `embed.js` — the loader's `postMessage` origin verification, iframe/modal
  creation, and `widget_token` parsing.
- The `POST /api/v1/widget_sessions` endpoint that mints the single-use
  `widget_token`.
- The hosted verification webapp loaded inside the iframe
  (`https://app.facevault.id`).

Out of scope:

- The integrator's own backend — how you authenticate users before minting a
  token, or how you store API keys. The loader never sees your API key.
- Operator/integrator misconfiguration (e.g. embedding on an origin you did
  not allowlist, or leaking your API key into client-side code).
- DoS / volumetric attacks — the endpoints are rate-limited at the edge.
- Theoretical issues without a demonstrated impact path.

## Supply chain

- All GitHub Actions used in CI and the release workflow are SHA-pinned;
  comments record the human-readable version next to each SHA so bumps stay
  reviewable. `dependabot.yml` watches the pins for updates.
- Release assets include an unsigned `SHA256SUMS.txt`. We are evaluating
  sigstore signing for a future release.
- `embed.js` is served from `app.facevault.id` with cache controls so a
  compromised cached entry cannot persist after we ship a fix.
