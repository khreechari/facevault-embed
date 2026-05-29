// Tests for the /webhook handler — HMAC-SHA256 + status-code contract.
//
//   cd examples/express
//   npm install
//   npm test

// Set env vars BEFORE requiring server.js — server reads them at module-load.
process.env.FACEVAULT_API_KEY = "fv_live_test";
process.env.FACEVAULT_SITE_ID = "fvs_pk_test";
process.env.FACEVAULT_WEBHOOK_SECRET = "whsec_test_secret";

const { describe, it, expect } = require("vitest");
const crypto = require("node:crypto");
const request = require("supertest");
const { app } = require("./server.js");

const SECRET = "whsec_test_secret";

function sign(body) {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("POST /webhook", () => {
  const body = JSON.stringify({
    event: "session.completed",
    session_id: "fvs_test_123",
    trust_decision: "accept",
  });

  it("returns 200 for a valid signature", async () => {
    const sig = sign(body);
    const resp = await request(app)
      .post("/webhook")
      .set("X-FaceVault-Signature", sig)
      .set("Content-Type", "application/json")
      .send(body);
    expect(resp.status).toBe(200);
    expect(resp.text).toBe("ok");
  });

  it("returns 400 for an invalid signature", async () => {
    const wrongSig = "0".repeat(64);
    const resp = await request(app)
      .post("/webhook")
      .set("X-FaceVault-Signature", wrongSig)
      .set("Content-Type", "application/json")
      .send(body);
    expect(resp.status).toBe(400);
  });

  it("returns 400 when the X-FaceVault-Signature header is missing", async () => {
    const resp = await request(app)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .send(body);
    expect(resp.status).toBe(400);
  });
});
