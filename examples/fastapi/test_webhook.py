"""Tests for the /webhook handler — HMAC-SHA256 + status-code contract.

    cd examples/fastapi
    pip install -r requirements.txt
    pytest -q
"""
import hashlib
import hmac
import os

# Set env vars BEFORE importing app — app reads them at module-load time.
os.environ.setdefault("FACEVAULT_API_KEY", "fv_live_test")
os.environ.setdefault("FACEVAULT_SITE_ID", "fvs_pk_test")
os.environ.setdefault("FACEVAULT_WEBHOOK_SECRET", "whsec_test_secret")

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402

SECRET = "whsec_test_secret"
client = TestClient(app)


def _sign(body: bytes) -> str:
    return hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()


def test_returns_200_for_valid_signature():
    body = b'{"event":"session.completed","session_id":"fvs_test_123","trust_decision":"accept"}'
    sig = _sign(body)
    resp = client.post(
        "/webhook",
        content=body,
        headers={"X-FaceVault-Signature": sig, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.text == "ok"


def test_returns_400_for_invalid_signature():
    body = b'{"event":"session.completed","session_id":"fvs_test_123"}'
    resp = client.post(
        "/webhook",
        content=body,
        headers={"X-FaceVault-Signature": "0" * 64, "Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_returns_400_when_signature_header_missing():
    body = b'{"event":"session.completed","session_id":"fvs_test_123"}'
    resp = client.post(
        "/webhook",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400
