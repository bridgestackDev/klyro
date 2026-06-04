'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import { slugify } from '@/lib/validation/slug';
import {
  addStaffSchema,
  updateStaffBranchesSchema,
  type AddStaffInput,
  type UpdateStaffBranchesInput,
} from '@/lib/schemas/team';

/**
 * Resolves the caller's session and verifies they are the owner of a business.
 * Team management is owner-only; staff manage neither each other nor branches.
 */
async function getOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw ApiError.unauthorized();

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) throw ApiError.notFound('Business');
  if (userData?.role !== 'owner') throw ApiError.forbidden();

  return { supabase, user, businessId };
}

/** Confirms every branch id belongs to the owner's business (prevents cross-tenant assignment). */
async function assertBranchesInBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  branchIds: string[]
) {
  if (branchIds.length === 0) return;
  const { data } = await supabase
    .from('branches')
    .select('id')
    .eq('business_id', businessId)
    .in('id', branchIds);
  const owned = new Set((data ?? []).map((b) => b.id as string));
  if (branchIds.some((id) => !owned.has(id))) throw ApiError.forbidden();
}

/** Builds a slug unique within the business by appending -2, -3, … on collision. */
async function uniqueStaffSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  displayName: string
): Promise<string> {
  const base = slugify(displayName) || 'staff';
  const { data } = await supabase
    .from('staff')
    .select('slug')
    .eq('business_id', businessId)
    .like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Creates a staff row (user_id = null until they accept an invite in a later block)
 * and assigns the selected branches. Owner-only.
 */
export async function addStaffMember(input: AddStaffInput): Promise<{ id: string }> {
  const parsed = addStaffSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }
  const { displayName, branchIds } = parsed.data;

  const { supabase, user, businessId } = await getOwnerContext();
  await assertBranchesInBusiness(supabase, businessId, branchIds);

  const slug = await uniqueStaffSlug(supabase, businessId, displayName);

  const { data: inserted, error } = await supabase
    .from('staff')
    .insert({ business_id: businessId, display_name: displayName, slug, is_active: true })
    .select('id')
    .single();

  if (error || !inserted) {
    logger.error('addStaffMember failed', {
      userId: user.id,
      businessId,
      error: error?.message,
    });
    throw ApiError.internal(new Error(error?.message ?? 'insert returned no row'));
  }

  const staffId = inserted.id as string;

  if (branchIds.length > 0) {
    const { error: linkError } = await supabase
      .from('staff_branches')
      .insert(branchIds.map((branch_id) => ({ staff_id: staffId, branch_id })));
    if (linkError) {
      logger.error('addStaffMember branch link failed', {
        userId: user.id,
        staffId,
        error: linkError.message,
      });
      throw ApiError.internal(new Error(linkError.message));
    }
  }

  logger.info('addStaffMember', { userId: user.id, businessId, staffId });
  revalidatePath('/', 'layout');
  return { id: staffId };
}

/** Toggles a staff member's active flag. Owner-only; deactivated staff stop appearing in booking. */
export async function setStaffActive(staffId: string, isActive: boolean): Promise<void> {
  const { supabase, user, businessId } = await getOwnerContext();

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, business_id')
    .eq('id', staffId)
    .single();

  if (!staffRow || staffRow.business_id !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId);

  if (error) {
    logger.error('setStaffActive failed', { userId: user.id, staffId, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('setStaffActive', { userId: user.id, staffId, isActive });
  revalidatePath('/', 'layout');
}

/** Replaces a staff member's branch assignments with the given set. Owner-only. */
export async function updateStaffBranches(input: UpdateStaffBranchesInput): Promise<void> {
  const parsed = updateStaffBranchesSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }
  const { staffId, branchIds } = parsed.data;

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, business_id')
    .eq('id', staffId)
    .single();

  if (!staffRow || staffRow.business_id !== businessId) throw ApiError.forbidden();

  await assertBranchesInBusiness(supabase, businessId, branchIds);

  const { error: deleteError } = await supabase
    .from('staff_branches')
    .delete()
    .eq('staff_id', staffId);

  if (deleteError) {
    logger.error('updateStaffBranches delete failed', {
      userId: user.id,
      staffId,
      error: deleteError.message,
    });
    throw ApiError.internal(new Error(deleteError.message));
  }

  if (branchIds.length > 0) {
    const { error: insertError } = await supabase
      .from('staff_branches')
      .insert(branchIds.map((branch_id) => ({ staff_id: staffId, branch_id })));
    if (insertError) {
      logger.error('updateStaffBranches insert failed', {
        userId: user.id,
        staffId,
        error: insertError.message,
      });
      throw ApiError.internal(new Error(insertError.message));
    }
  }

  logger.info('updateStaffBranches', { userId: user.id, staffId, count: branchIds.length });
  revalidatePath('/', 'layout');
}
