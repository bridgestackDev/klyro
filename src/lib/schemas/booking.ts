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
