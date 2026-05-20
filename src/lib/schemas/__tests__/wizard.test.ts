import { describe, it, expect } from "vitest";
import {
  availabilitySlotSchema,
  step2Schema,
  step5Schema,
  step7Schema,
} from "../wizard";

// ---------------------------------------------------------------------------
// availabilitySlotSchema
// ---------------------------------------------------------------------------

describe("availabilitySlotSchema", () => {
  it("accepts a valid slot with start before end", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when startTime equals endTime", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endTime");
    }
  });

  it("rejects when startTime is after endTime", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 3,
      startTime: "18:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endTime");
    }
  });

  it("rejects an invalid startTime format", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 1,
      startTime: "9:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("startTime");
    }
  });

  it("rejects an invalid endTime format", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "6pm",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endTime");
    }
  });

  it("rejects dayOfWeek outside 0–6", () => {
    const result = availabilitySlotSchema.safeParse({
      dayOfWeek: 7,
      startTime: "09:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// step7Schema (messaging / WhatsApp)
// ---------------------------------------------------------------------------

describe("step7Schema", () => {
  it("accepts email channel without a WhatsApp number", () => {
    const result = step7Schema.safeParse({ channel: "email", whatsappNumber: "" });
    expect(result.success).toBe(true);
  });

  it("accepts whatsapp channel with a valid number", () => {
    const result = step7Schema.safeParse({
      channel: "whatsapp",
      whatsappNumber: "+504 9999-9999",
    });
    expect(result.success).toBe(true);
  });

  it("accepts whatsapp channel with E.164-style number", () => {
    const result = step7Schema.safeParse({
      channel: "whatsapp",
      whatsappNumber: "+15551234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects whatsapp channel with blank number", () => {
    const result = step7Schema.safeParse({ channel: "whatsapp", whatsappNumber: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("whatsappNumber");
    }
  });

  it("rejects whatsapp channel with whitespace-only number", () => {
    const result = step7Schema.safeParse({
      channel: "whatsapp",
      whatsappNumber: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whatsapp channel with too-short number", () => {
    const result = step7Schema.safeParse({
      channel: "whatsapp",
      whatsappNumber: "+123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whatsapp channel with letters in the number", () => {
    const result = step7Schema.safeParse({
      channel: "whatsapp",
      whatsappNumber: "abc-def-ghij",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown channel value", () => {
    const result = step7Schema.safeParse({
      channel: "sms",
      whatsappNumber: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// step2Schema (slug)
// ---------------------------------------------------------------------------

describe("step2Schema slug validation", () => {
  it("accepts a valid slug", () => {
    const result = step2Schema.safeParse({ name: "Barbería Don José", slug: "barberia-don-jose" });
    expect(result.success).toBe(true);
  });

  it("rejects slug with uppercase letters", () => {
    const result = step2Schema.safeParse({ name: "My Biz", slug: "MyBiz" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("slug");
    }
  });

  it("rejects slug with spaces", () => {
    const result = step2Schema.safeParse({ name: "My Biz", slug: "my biz" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with special characters", () => {
    const result = step2Schema.safeParse({ name: "My Biz", slug: "my_biz!" });
    expect(result.success).toBe(false);
  });

  it("rejects slug shorter than 2 characters", () => {
    const result = step2Schema.safeParse({ name: "My Biz", slug: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects slug longer than 50 characters", () => {
    const result = step2Schema.safeParse({
      name: "My Biz",
      slug: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// step5Schema (staff slug)
// ---------------------------------------------------------------------------

describe("step5Schema staff slug validation", () => {
  it("accepts a valid owner slug", () => {
    const result = step5Schema.safeParse({ ownerName: "Carlos García", ownerSlug: "carlos-garcia" });
    expect(result.success).toBe(true);
  });

  it("rejects staff slug with uppercase letters", () => {
    const result = step5Schema.safeParse({ ownerName: "Carlos", ownerSlug: "Carlos-Garcia" });
    expect(result.success).toBe(false);
  });

  it("rejects staff slug with underscores", () => {
    const result = step5Schema.safeParse({ ownerName: "Carlos", ownerSlug: "carlos_garcia" });
    expect(result.success).toBe(false);
  });

  it("rejects staff slug shorter than 2 characters", () => {
    const result = step5Schema.safeParse({ ownerName: "Carlos", ownerSlug: "a" });
    expect(result.success).toBe(false);
  });
});
