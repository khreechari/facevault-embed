"""Minimal FastAPI server that mints a FaceVault widget token, renders the
button, and receives the verification webhook. Run, open http://localhost:8000,
click the button. The verification result lands at POST /webhook.

    pip install -r requirements.txt
    export FACEVAULT_API_KEY=fv_live_...
    export FACEVAULT_SITE_ID=fvs_pk_...
    export FACEVAULT_WEBHOOK_SECRET=whsec_...
    uvicorn app:app --reload

The API key stays on the server — the browser only ever sees the single-use,
5-minute widget_token. Webhook signature verification is the source of truth
for the verification outcome (the browser's `complete` event is UX only).
"""
import os

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse

from facevault import parse_event, verify_signature

API_BASE = os.environ.get("FACEVAULT_API_BASE", "https://api.facevault.id/api/v1")
API_KEY = os.environ["FACEVAULT_API_KEY"]                # fv_live_...
SITE_ID = os.environ["FACEVAULT_SITE_ID"]                # fvs_pk_...
WEBHOOK_SECRET = os.environ.get("FACEVAULT_WEBHOOK_SECRET", "")  # whsec_...
EMBED_SRC = os.environ.get("FACEVAULT_EMBED_SRC", "https://app.facevault.id/embed.js")

app = FastAPI()


async def mint_widget_token(external_user_id: str) -> str:
    """Server-to-server: create a verification session, get a widget_token."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{API_BASE}/widget_sessions",
            headers={"X-FaceVault-Api-Key": API_KEY},
            json={"site_id": SITE_ID, "external_user_id": external_user_id},
        )
    if resp.status_code != 201:
        raise HTTPException(502, f"FaceVault error {resp.status_code}: {resp.text}")
    return resp.json()["widget_token"]


@app.get("/", response_class=HTMLResponse)
async def home():
    # In a real app, external_user_id is your authenticated user's ID.
    token = await mint_widget_token(external_user_id="user-123")
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>FaceVault Embed (FastAPI)</title></head>
<body>
  <h1>Verify your identity</h1>
  <button data-fv-token="{token}">Verify with FaceVault</button>
  <script src="{EMBED_SRC}" async></script>
  <script>
    window.addEventListener('load', function () {{
      FV.on('complete', function (e) {{
        // UX only — the /webhook handler below is the source of truth.
        alert('Decision (UX): ' + e.decision);
      }});
    }});
  </script>
</body></html>"""


@app.post("/webhook", response_class=PlainTextResponse)
async def webhook(request: Request):
    """Receive a FaceVault webhook — the source of truth for the verification.

    Verifies HMAC-SHA256 against the **raw** request body using the published
    `facevault` Python SDK (raw-body verify is critical — re-serializing the
    parsed JSON would change the bytes for non-ASCII payloads).
    """
    if not WEBHOOK_SECRET:
        raise HTTPException(500, "FACEVAULT_WEBHOOK_SECRET is not configured")
    body = await request.body()
    signature = request.headers.get("X-FaceVault-Signature", "")
    if not verify_signature(body, signature, WEBHOOK_SECRET):
        raise HTTPException(400, "bad signature")
    event = parse_event(body)
    # In a real app: gate access in your own DB based on event.trust_decision.
    print(f"[fv webhook] session={event.session_id} decision={event.trust_decision}")
    return "ok"
