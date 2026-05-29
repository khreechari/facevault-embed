/* facevault-embed v0.0.0-dev — https://github.com/khreechari/facevault-embed */
/* FaceVault embed loader — drop-in script for customer pages.
 *
 * Usage:
 *   <script src="https://app.facevault.id/embed.js" async></script>
 *   <button data-fv-token="<jwt-from-server>">Verify with FaceVault</button>
 *
 * Customer's backend mints the jwt via POST /v1/widget_sessions.
 * This script:
 *   - Auto-binds [data-fv-token] buttons.
 *   - On click: opens a fullscreen modal containing an iframe pointing at
 *     the FaceVault webapp with the token in the URL fragment.
 *   - Verifies postMessage origin against the iframe src origin.
 *   - Forwards events on a global FV.on(event, handler).
 *   - Closes the modal on fv:complete or fv:cancel.
 *
 * Public API:
 *   FV.open(token, opts)     — open the widget for a given widget_token
 *   FV.on(event, handler)    — listen for fv:ready / fv:progress / fv:complete / fv:error
 *   FV.close()               — close the modal
 *
 * Events delivered to handlers:
 *   { type: 'ready',    session_id }
 *   { type: 'progress', screen }
 *   { type: 'complete', decision, session_id, error }
 *   { type: 'error',    code }
 *   { type: 'cancel' }   (synthesized when user closes the modal)
 */
(function () {
    'use strict';

    // Default the iframe origin to wherever this loader was served from. That
    // way `<script src="https://app-staging.facevault.id/embed.js">` opens the
    // staging webapp, not prod — keeping signing keys / sessions matched up.
    // Fallback to prod if we can't read the script src (very old browsers).
    var EMBED_ORIGIN = 'https://app.facevault.id';
    try {
        var loader = document.currentScript;
        var override = loader && loader.getAttribute('data-fv-origin');
        if (override) {
            EMBED_ORIGIN = override.replace(/\/$/, '');
        } else if (loader && loader.src) {
            EMBED_ORIGIN = new URL(loader.src).origin;
        }
    } catch (e) { /* ignore */ }

    var listeners = {};
    var current = null; // { iframe, overlay, token, siteId }

    function emit(type, data) {
        var handlers = listeners[type] || [];
        for (var i = 0; i < handlers.length; i++) {
            try { handlers[i](data || {}); } catch (e) {}
        }
    }

    function on(type, handler) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(handler);
    }

    function _parseTokenSiteId(token) {
        // Decode the JWT payload (no signature check — that's the server's job)
        // to extract `kid` (site_id). Pure JS, no deps.
        try {
            var parts = String(token).split('.');
            if (parts.length < 2) return null;
            var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            var json = atob(b64);
            var payload = JSON.parse(json);
            return payload && payload.kid ? String(payload.kid) : null;
        } catch (e) { return null; }
    }

    function _buildOverlay() {
        var ov = document.createElement('div');
        ov.setAttribute('data-fv-overlay', '1');
        ov.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:2147483640',
            'background:rgba(8,10,16,0.78)',
            'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'padding:0', 'margin:0',
        ].join(';');

        var frame = document.createElement('iframe');
        // Bare "camera; microphone" delegates to the iframe's src origin
        // (per Permissions-Policy spec); the "'self'" form was unreliable.
        frame.setAttribute('allow', 'camera; microphone');
        frame.setAttribute('allowfullscreen', '');
        // No sandbox: clickjacking is covered by per-site frame-ancestors,
        // and sandbox breaks getUserMedia in some browsers.
        frame.style.cssText = [
            'border:0', 'background:#06060a',
            'width:100%', 'height:100%', 'max-width:520px', 'max-height:920px',
            'border-radius:16px',
            'box-shadow:0 30px 80px rgba(0,0,0,.5)',
        ].join(';');

        var close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close verification');
        close.textContent = '×';
        close.style.cssText = [
            'position:absolute', 'top:16px', 'right:16px',
            'width:36px', 'height:36px', 'border-radius:50%',
            'border:0', 'background:rgba(255,255,255,0.12)', 'color:#fff',
            'font-size:22px', 'line-height:1', 'cursor:pointer',
            'z-index:2147483641',
        ].join(';');
        close.addEventListener('click', closeModal);

        ov.appendChild(frame);
        ov.appendChild(close);
        return { overlay: ov, iframe: frame };
    }

    function open(token, opts) {
        if (!token) throw new Error('FV.open: token is required');
        if (current) closeModal();
        opts = opts || {};

        var siteId = opts.siteId || _parseTokenSiteId(token);
        if (!siteId) throw new Error('FV.open: could not derive site_id from token');

        var built = _buildOverlay();
        var src = EMBED_ORIGIN + '/?embed=1&site_id=' + encodeURIComponent(siteId)
                  + '#token=' + encodeURIComponent(token);
        built.iframe.src = src;
        document.body.appendChild(built.overlay);
        // Block background page scroll while modal is open
        var prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        current = {
            iframe: built.iframe,
            overlay: built.overlay,
            token: token,
            siteId: siteId,
            prevOverflow: prevOverflow,
        };
    }

    function closeModal(opts) {
        if (!current) return;
        var wasCompleted = !!current.completed;
        try { current.overlay.remove(); } catch (e) {}
        document.documentElement.style.overflow = current.prevOverflow || '';
        var hadIframe = !!current.iframe;
        current = null;
        // 'cancel' fires only when the modal closes before reaching a
        // terminal 'complete' AND the caller didn't explicitly suppress it.
        if (hadIframe && !wasCompleted && !(opts && opts.skipCancel)) {
            emit('cancel', {});
        }
    }

    function _onMessage(event) {
        if (!current) return;
        // Origin must be EMBED_ORIGIN (the iframe src origin).
        if (event.source !== current.iframe.contentWindow) return;
        if (event.origin !== EMBED_ORIGIN) return;
        var msg = event.data;
        if (!msg || msg.source !== 'facevault') return;

        var t = msg.type || '';
        if (t === 'fv:ready') {
            emit('ready', { session_id: msg.session_id });
        } else if (t === 'fv:progress') {
            emit('progress', { screen: msg.screen });
        } else if (t === 'fv:complete') {
            // Mark terminal state first — guarantees any subsequent close
            // (auto-close timeout or impatient user clicking X) won't emit
            // a stale 'cancel' on top of 'complete'.
            current.completed = true;
            emit('complete', {
                decision: msg.decision,
                session_id: msg.session_id,
                error: msg.error,
            });
            // auto_close is opt-out (default true) for backward compat. The
            // iframe sets it false when a house ad is rendered so the user
            // has time to click through.
            var shouldAutoClose = msg.auto_close !== false;
            if (shouldAutoClose) setTimeout(closeModal, 300);
        } else if (t === 'fv:error') {
            emit('error', { code: msg.code });
        }
    }
    window.addEventListener('message', _onMessage);

    function _bindButtons() {
        var nodes = document.querySelectorAll('[data-fv-token]:not([data-fv-bound])');
        for (var i = 0; i < nodes.length; i++) {
            (function (btn) {
                btn.setAttribute('data-fv-bound', '1');
                btn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    var token = btn.getAttribute('data-fv-token');
                    var siteId = btn.getAttribute('data-fv-site') || null;
                    open(token, { siteId: siteId });
                });
            })(nodes[i]);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bindButtons);
    } else {
        _bindButtons();
    }
    // Also re-bind on DOM mutations so dynamically-added buttons work
    try {
        var obs = new MutationObserver(_bindButtons);
        obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* IE / very old browsers */ }

    window.FV = window.FV || {};
    window.FV.open = open;
    window.FV.close = closeModal;
    window.FV.on = on;
})();
