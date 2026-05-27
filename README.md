# FaceVault Embed

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Drop-in browser loader for the [FaceVault](https://facevault.id) hosted verification
widget. Add a button to your page, and your users complete KYC (ID + selfie +
liveness) in a modal — no SDK, no build step, no camera code on your side.

```html
<script src="https://app.facevault.id/embed.js" async></script>
<button data-fv-token="<token-from-your-server>">Verify with FaceVault</button>
```

That's the whole front-end. The verification UI runs inside an iframe served by
FaceVault; `embed.js` just opens it, enforces the postMessage origin, and forwards
events to your page.

## How it works

```
┌────────────┐   1. POST /widget_sessions      ┌──────────────────┐
│ Your       │ ──────(api_key, site_id)──────▶ │ api.facevault.id │
│ backend    │ ◀─────── widget_token ───────── │                  │
└────────────┘                                 └──────────────────┘
       │ 2. render <button data-fv-token=…> + embed.js
       ▼
┌────────────┐   3. click → FV.open()          ┌──────────────────┐
│ Your page  │ ──── opens iframe (modal) ─────▶ │ app.facevault.id │
│ (embed.js) │ ◀──── fv:complete (decision) ─── │  (hosted webapp) │
└────────────┘                                  └──────────────────┘
```

1. **Your backend** mints a single-use `widget_token` by calling
   `POST /api/v1/widget_sessions` with your API key. The key never touches the
   browser.
2. **Your page** renders a `[data-fv-token]` button and loads `embed.js`.
3. **`embed.js`** opens the hosted widget in a modal on click and emits events
   (`ready`, `progress`, `complete`, `error`, `cancel`) back to your page.

The token is HMAC-signed server-side, single-use, and expires in 5 minutes.

## Quick start

### 1. Mint a widget token (server-side)

```http
POST https://api.facevault.id/api/v1/widget_sessions
X-FaceVault-Api-Key: fv_live_your_api_key
Content-Type: application/json

{ "site_id": "fvs_pk_…", "external_user_id": "user-123" }
```

```json
201 Created
{
  "session_id": "…",
  "widget_token": "eyJ…",
  "expires_at": "2026-05-27T14:05:00Z",
  "embed_url": "https://app.facevault.id/?embed=1&site_id=fvs_pk_…#token=eyJ…"
}
```

Required API-key scope: `sessions:create`. Get your `site_id` (`fvs_pk_…`) from the
[dashboard](https://devdash.facevault.id). Working server examples for FastAPI and
Express are in [`examples/`](examples/).

### 2. Render the button

```html
<script src="https://app.facevault.id/embed.js" async></script>
<button data-fv-token="eyJ…">Verify with FaceVault</button>
```

Any element with `[data-fv-token]` is auto-bound on load (and on DOM mutation, so
dynamically-added buttons work too).

### 3. Listen for the result

```html
<script>
  // Register after load so embed.js (async) has defined window.FV.
  window.addEventListener('load', function () {
    FV.on('complete', function (e) {
      // e.decision: "passed" | "review" | "failed"
      console.log('verification', e.session_id, e.decision);
    });
    FV.on('error',  function (e) { console.warn('fv error', e.code); });
    FV.on('cancel', function ()  { console.log('user closed the modal'); });
  });
</script>
```

> The browser `decision` is for UX only — **always confirm the final result
> server-side** via your webhook or by polling the session. Never grant access
> based on a client-side event alone.

## JavaScript API

| Call | Description |
|------|-------------|
| `FV.open(token, opts?)` | Open the widget for a `widget_token`. `opts.siteId` is optional (derived from the token otherwise). |
| `FV.on(event, handler)` | Subscribe to an event. |
| `FV.close()` | Close the modal. |

### Events

| Event | Payload |
|-------|---------|
| `ready` | `{ session_id }` |
| `progress` | `{ screen }` |
| `complete` | `{ decision, session_id, error }` |
| `error` | `{ code }` |
| `cancel` | `{}` — synthesized when the user closes the modal before completing |

## Pointing at a different environment

`embed.js` opens the webapp on the **same origin it was loaded from**. Loading the
script from `app-staging.facevault.id` opens the staging webapp — keeping signing
keys and sessions matched. To override explicitly:

```html
<script src="…/embed.js" data-fv-origin="https://app-staging.facevault.id" async></script>
```

## Browser support

Modern evergreen browsers. Uses `MutationObserver`, `postMessage`, and iframe
`allow="camera; microphone"`; degrades gracefully on very old browsers (buttons
still work; auto-rebind is skipped).

## License

[MIT](LICENSE) © FaceVault
