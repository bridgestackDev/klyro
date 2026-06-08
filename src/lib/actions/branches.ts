'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import { slugify } from '@/lib/validation/slug';
import {
  addBranchSchema,
  updateBranchSchema,
  type AddBranchInput,
  type UpdateBranchInput,
} from '@/lib/schemas/branches';

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

async function uniqueBranchSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  name: string
): Promise<string> {
  const base = slugify(name) || 'branch';
  const { data } = await supabase
    .from('branches')
    .select('slug')
    .eq('business_id', businessId)
    .like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function addBranch(input: AddBranchInput): Promise<{ id: string }> {
  const parsed = addBranchSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }
  const { name, address, city, country, timezone, phone, whatsapp_number } = parsed.data;

  const { supabase, user, businessId } = await getOwnerContext();
  const slug = await uniqueBranchSlug(supabase, businessId, name);

  const { data: inserted, error } = await supabase
    .from('branches')
    .insert({
      business_id: businessId,
      name,
      slug,
      address: address ?? null,
      city: city ?? null,
      country,
      timezone,
      phone: phone ?? null,
      whatsapp_number: whatsapp_number ?? null,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    logger.error('addBranch failed', { userId: user.id, businessId, error: error?.message });
    throw ApiError.internal(new Error(error?.message ?? 'insert returned no row'));
  }

  logger.info('addBranch', { userId: user.id, businessId, branchId: inserted.id });
  revalidatePath('/', 'layout');
  return { id: inserted.id as string };
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<void> {
  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('branches')
    .update({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      phone: parsed.data.phone ?? null,
      whatsapp_number: parsed.data.whatsapp_number ?? null,
      ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {}),
    })
    .eq('id', id);

  if (error) {
    logger.error('updateBranch failed', { userId: user.id, branchId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateBranch', { userId: user.id, branchId: id });
  revalidatePath('/', 'layout');
}

export async function setBranchActive(id: string, isActive: boolean): Promise<void> {
  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('branches')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    logger.error('setBranchActive failed', { userId: user.id, branchId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('setBranchActive', { userId: user.id, branchId: id, isActive });
  revalidatePath('/', 'layout');
}
