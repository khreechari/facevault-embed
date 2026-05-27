"""Minimal FastAPI server that mints a FaceVault widget token and renders the
button. Run, open http://localhost:8000, click the button.

    pip install -r requirements.txt
    export FACEVAULT_API_KEY=fv_live_...
    export FACEVAULT_SITE_ID=fvs_pk_...
    uvicorn app:app --reload

The API key stays on the server — the browser only ever sees the single-use,
5-minute widget_token.
"""
import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse

API_BASE = os.environ.get("FACEVAULT_API_BASE", "https://api.facevault.id/api/v1")
API_KEY = os.environ["FACEVAULT_API_KEY"]       # fv_live_...
SITE_ID = os.environ["FACEVAULT_SITE_ID"]       # fvs_pk_...
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
        // UX only — confirm via webhook server-side before trusting this.
        alert('Decision: ' + e.decision);
      }});
    }});
  </script>
</body></html>"""
