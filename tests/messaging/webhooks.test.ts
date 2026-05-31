import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/log", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/env", () => ({
  env: {
    WHATSAPP_APP_SECRET: "test-wa-secret",
    WHATSAPP_VERIFY_TOKEN: "test-verify-token",
    TWILIO_AUTH_TOKEN: "test-twilio-token",
    RESEND_WEBHOOK_SECRET: "test-resend-secret",
  },
}));

// ── Supabase admin mock ───────────────────────────────────────────────────────
const mockUpdate = vi.fn();
const dbChain = {
  update: vi.fn(() => dbChain),
  eq: vi.fn(() => dbChain),
  neq: mockUpdate,
};
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn(() => dbChain) })),
}));

// ── Twilio mock ───────────────────────────────────────────────────────────────
const mockValidateRequest = vi.fn();
vi.mock("twilio", () => ({
  default: Object.assign(vi.fn(), { validateRequest: mockValidateRequest }),
}));

// ── svix mock ─────────────────────────────────────────────────────────────────
const mockSvixVerify = vi.fn();
vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(function () {
    return { verify: mockSvixVerify };
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWhatsAppSig(body: string, secret = "test-wa-secret") {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

function waPostRequest(body: object, secret?: string): NextRequest {
  const bodyStr = JSON.stringify(body);
  return new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": makeWhatsAppSig(bodyStr, secret),
    },
    body: bodyStr,
  });
}

function twilioPostRequest(params: Record<string, string>): NextRequest {
  const body = new URLSearchParams(params).toString();
  return new NextRequest("http://localhost/api/webhooks/twilio", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "valid-sig",
    },
    body,
  });
}

function resendPostRequest(
  payload: object,
  overrideHeaders?: Record<string, string>,
): NextRequest {
  const body = JSON.stringify(payload);
  return new NextRequest("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_test",
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,valid",
      ...overrideHeaders,
    },
    body,
  });
}

// ── WhatsApp webhook ──────────────────────────────────────────────────────────
describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
  });

  it("returns 403 for invalid HMAC signature", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const req = waPostRequest({ entry: [] }, "wrong-secret");
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 and updates status for a valid delivered event", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const body = {
      entry: [{
        changes: [{
          value: {
            statuses: [{ id: "wamid.abc", status: "delivered", timestamp: "1" }],
          },
        }],
      }],
    };
    const req = waPostRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "delivered" });
    expect(dbChain.eq).toHaveBeenCalledWith("provider_message_id", "wamid.abc");
    expect(mockUpdate).toHaveBeenCalledWith("status", "delivered");
  });

  it("maps Meta 'read' → Klyro 'delivered'", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const body = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.xyz", status: "read" }] } }] }],
    };
    const req = waPostRequest(body);
    await POST(req);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "delivered" });
  });

  it("maps Meta 'failed' → Klyro 'failed'", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const body = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.fail", status: "failed" }] } }] }],
    };
    const req = waPostRequest(body);
    await POST(req);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "failed" });
  });

  it("does not downgrade delivered → sent (neq guard)", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const body = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.sent", status: "sent" }] } }] }],
    };
    const req = waPostRequest(body);
    await POST(req);
    // The neq guard is always applied
    expect(mockUpdate).toHaveBeenCalledWith("status", "delivered");
  });

  it("returns 200 with no DB write for empty statuses array", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const body = { entry: [{ changes: [{ value: { statuses: [] } }] }] };
    const req = waPostRequest(body);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/webhooks/whatsapp", () => {
  it("returns hub.challenge when verify_token matches", async () => {
    const { GET } = await import("@/app/api/webhooks/whatsapp/route");
    const req = new NextRequest(
      "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123");
  });

  it("returns 403 when verify_token does not match", async () => {
    const { GET } = await import("@/app/api/webhooks/whatsapp/route");
    const req = new NextRequest(
      "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123",
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

// ── Twilio webhook ────────────────────────────────────────────────────────────
describe("POST /api/webhooks/twilio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
    mockValidateRequest.mockReturnValue(true);
  });

  it("returns 403 when Twilio signature is invalid", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/route");
    mockValidateRequest.mockReturnValue(false);
    const req = twilioPostRequest({ MessageSid: "SM001", MessageStatus: "delivered" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("updates status to delivered for a valid Twilio delivered event", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/route");
    const req = twilioPostRequest({ MessageSid: "SM001", MessageStatus: "delivered" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "delivered" });
    expect(dbChain.eq).toHaveBeenCalledWith("provider_message_id", "SM001");
  });

  it("maps Twilio 'undelivered' → Klyro 'failed'", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/route");
    const req = twilioPostRequest({ MessageSid: "SM002", MessageStatus: "undelivered" });
    await POST(req);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "failed" });
  });

  it("returns 200 without DB write for unknown MessageStatus", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/route");
    const req = twilioPostRequest({ MessageSid: "SM003", MessageStatus: "queued" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).not.toHaveBeenCalled();
  });

  it("applies neq idempotency guard on every update", async () => {
    const { POST } = await import("@/app/api/webhooks/twilio/route");
    const req = twilioPostRequest({ MessageSid: "SM004", MessageStatus: "sent" });
    await POST(req);
    expect(mockUpdate).toHaveBeenCalledWith("status", "delivered");
  });
});

// ── Resend webhook ────────────────────────────────────────────────────────────
describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ error: null });
    mockSvixVerify.mockReturnValue(undefined); // no throw = valid
  });

  it("returns 403 when svix signature verification throws", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    mockSvixVerify.mockImplementation(() => { throw new Error("Bad signature"); });
    const req = resendPostRequest({ type: "email.delivered", data: { email_id: "re-001" } });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("updates status to delivered for email.delivered event", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const req = resendPostRequest({
      type: "email.delivered",
      data: { email_id: "re-001" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "delivered" });
    expect(dbChain.eq).toHaveBeenCalledWith("provider_message_id", "re-001");
  });

  it("maps email.bounced → failed", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const req = resendPostRequest({ type: "email.bounced", data: { email_id: "re-002" } });
    await POST(req);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "failed" });
  });

  it("maps email.complained → failed", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const req = resendPostRequest({ type: "email.complained", data: { email_id: "re-003" } });
    await POST(req);
    expect(dbChain.update).toHaveBeenCalledWith({ status: "failed" });
  });

  it("returns 200 without DB write for unknown event type", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const req = resendPostRequest({ type: "email.opened", data: { email_id: "re-004" } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbChain.update).not.toHaveBeenCalled();
  });

  it("applies neq idempotency guard", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const req = resendPostRequest({ type: "email.delivered", data: { email_id: "re-005" } });
    await POST(req);
    expect(mockUpdate).toHaveBeenCalledWith("status", "delivered");
  });
});
