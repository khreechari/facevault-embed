// Minimal Express server that mints a FaceVault widget token, renders the
// button, and receives the verification webhook. Run, open http://localhost:3000,
// click the button. The verification result lands at POST /webhook.
//
//   npm install
//   export FACEVAULT_API_KEY=fv_live_...
//   export FACEVAULT_SITE_ID=fvs_pk_...
//   export FACEVAULT_WEBHOOK_SECRET=whsec_...
//   node server.js
//
// The API key stays on the server — the browser only ever sees the single-use,
// 5-minute widget_token. Webhook signature verification is the source of truth
// for the verification outcome (the browser's `complete` event is UX only).
// Requires Node 18+ (native fetch).

const express = require("express");
const { verifySignature, parseEvent } = require("facevault");

const API_BASE = process.env.FACEVAULT_API_BASE || "https://api.facevault.id/api/v1";
const API_KEY = process.env.FACEVAULT_API_KEY;                  // fv_live_...
const SITE_ID = process.env.FACEVAULT_SITE_ID;                  // fvs_pk_...
const WEBHOOK_SECRET = process.env.FACEVAULT_WEBHOOK_SECRET || "";  // whsec_...
const EMBED_SRC = process.env.FACEVAULT_EMBED_SRC || "https://app.facevault.id/embed.js";

if (!API_KEY || !SITE_ID) {
  console.error("Set FACEVAULT_API_KEY and FACEVAULT_SITE_ID");
  process.exit(1);
}

const app = express();

// Server-to-server: create a verification session, get a widget_token.
async function mintWidgetToken(externalUserId) {
  const resp = await fetch(`${API_BASE}/widget_sessions`, {
    method: "POST",
    headers: {
      "X-FaceVault-Api-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ site_id: SITE_ID, external_user_id: externalUserId }),
  });
  if (resp.status !== 201) {
    throw new Error(`FaceVault error ${resp.status}: ${await resp.text()}`);
  }
  return (await resp.json()).widget_token;
}

app.get("/", async (req, res) => {
  try {
    // In a real app, externalUserId is your authenticated user's ID.
    const token = await mintWidgetToken("user-123");
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>FaceVault Embed (Express)</title></head>
<body>
  <h1>Verify your identity</h1>
  <button data-fv-token="${token}">Verify with FaceVault</button>
  <script src="${EMBED_SRC}" async></script>
  <script>
    window.addEventListener('load', function () {
      FV.on('complete', function (e) {
        // UX only — the /webhook handler below is the source of truth.
        alert('Decision (UX): ' + e.decision);
      });
    });
  </script>
</body></html>`);
  } catch (err) {
    res.status(502).send(String(err));
  }
});

// Receive a FaceVault webhook — the source of truth for the verification.
// express.raw() preserves the raw bytes the server signed. A global
// express.json() would parse + destroy them, breaking HMAC verification.
app.post("/webhook", express.raw({ type: "*/*" }), (req, res) => {
  if (!WEBHOOK_SECRET) return res.status(500).send("FACEVAULT_WEBHOOK_SECRET not configured");
  const signature = req.headers["x-facevault-signature"] || "";
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(400).send("bad signature");
  }
  const event = parseEvent(req.body);
  // In a real app: gate access in your own DB based on event.trustDecision.
  console.log(`[fv webhook] session=${event.sessionId} decision=${event.trustDecision}`);
  res.send("ok");
});

// Export the app for tests; only start the listener when invoked directly.
if (require.main === module) {
  app.listen(3000, () => console.log("http://localhost:3000"));
}

module.exports = { app };
