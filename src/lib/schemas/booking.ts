import { z } from "zod";

export const slotsQuerySchema = z.object({
  staffId: z.string().uuid("staffId must be a valid UUID"),
  serviceId: z.string().uuid("serviceId must be a valid UUID"),
  branchId: z.string().uuid("branchId must be a valid UUID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
});

export const createBookingSchema = z.object({
  staffId: z.string().uuid("staffId must be a valid UUID"),
  serviceId: z.string().uuid("serviceId must be a valid UUID"),
  branchId: z.string().uuid("branchId must be a valid UUID"),
  slotStart: z.string().datetime({ message: "slotStart must be a valid ISO 8601 datetime" }),
  clientName: z.string().min(1, "clientName is required").max(100),
  clientPhone: z.string().regex(/^\+\d{7,15}$/, "clientPhone must be in E.164 format (e.g. +50422345678)"),
  clientEmail: z.string().email("clientEmail must be a valid email address").optional(),
  notes: z.string().max(500, "notes must be 500 characters or fewer").optional(),
});

export type SlotsQuery = z.infer<typeof slotsQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ── Response schemas ──────────────────────────────────────────────────────────

export const linkSchema = z.object({
  href: z.string(),
  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum([
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "VALIDATION_ERROR",
      "SLOT_TAKEN",
      "BOOKING_CONFLICT",
      "CONFLICT",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    field: z.string().optional(),
  }),
});

// POST /api/booking/create — 201 response (matches actual handler output)
export const bookingCreatedResponseSchema = z.object({
  data: z.object({
    bookingCode: z.string().regex(/^KLY-[A-Z0-9]{4}$/).meta({
      example: "KLY-7F4A",
    }),
    startsAt: z.string().datetime().meta({
      example: "2026-05-26T15:00:00.000Z",
    }),
    endsAt: z.string().datetime().meta({
      example: "2026-05-26T15:30:00.000Z",
    }),
  }),
  _links: z.object({
    self: linkSchema,
  }),
});

// GET /api/booking/slots — 200 response (matches actual handler output)
export const slotsListResponseSchema = z.object({
  data: z.array(
    z.object({
      startsAt: z.string().datetime().meta({ example: "2026-05-26T15:00:00.000Z" }),
      endsAt: z.string().datetime().meta({ example: "2026-05-26T15:30:00.000Z" }),
    })
  ),
  meta: z.object({
    total: z.number().int().nonnegative().meta({ example: 8 }),
  }),
  _links: z.object({
    self: linkSchema,
  }),
});
