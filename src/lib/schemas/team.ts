import { z } from "zod";

export const addStaffSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "displayName must be at least 2 characters")
    .max(80, "displayName must be 80 characters or fewer"),
  branchIds: z.array(z.string().uuid("branchId must be a valid UUID")).default([]),
});

export const updateStaffBranchesSchema = z.object({
  staffId: z.string().uuid("staffId must be a valid UUID"),
  branchIds: z.array(z.string().uuid("branchId must be a valid UUID")),
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type UpdateStaffBranchesInput = z.infer<typeof updateStaffBranchesSchema>;
