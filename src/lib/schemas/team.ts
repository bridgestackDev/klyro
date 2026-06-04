import { z } from "zod";

/** Optional free-text that treats "" / whitespace as "not provided". */
const optionalEmail = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email("email must be a valid email address").optional()
  );

const optionalPhone = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .regex(/^\+\d{7,15}$/, "phone must be in E.164 format (e.g. +50498765432)")
      .optional()
  );

export const addStaffSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "displayName must be at least 2 characters")
    .max(80, "displayName must be 80 characters or fewer"),
  email: optionalEmail,
  phone: optionalPhone,
  branchIds: z.array(z.string().uuid("branchId must be a valid UUID")).default([]),
});

export const updateStaffContactSchema = z.object({
  staffId: z.string().uuid("staffId must be a valid UUID"),
  email: optionalEmail,
  phone: optionalPhone,
});

export const updateStaffBranchesSchema = z.object({
  staffId: z.string().uuid("staffId must be a valid UUID"),
  branchIds: z.array(z.string().uuid("branchId must be a valid UUID")),
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type UpdateStaffContactInput = z.infer<typeof updateStaffContactSchema>;
export type UpdateStaffBranchesInput = z.infer<typeof updateStaffBranchesSchema>;

export const inviteStaffSchema = z.object({
  staffId: z.string().uuid('staffId must be a valid UUID'),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
