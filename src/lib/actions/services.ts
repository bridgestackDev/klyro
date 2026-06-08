'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import {
  addServiceSchema,
  updateServiceSchema,
  type AddServiceInput,
  type UpdateServiceInput,
} from '@/lib/schemas/services';

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

export async function addService(input: AddServiceInput): Promise<{ id: string }> {
  const parsed = addServiceSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: inserted, error } = await supabase
    .from('services')
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price,
      currency: parsed.data.currency,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    logger.error('addService failed', { userId: user.id, businessId, error: error?.message });
    throw ApiError.internal(new Error(error?.message ?? 'insert returned no row'));
  }

  logger.info('addService', { userId: user.id, businessId, serviceId: inserted.id });
  revalidatePath('/', 'layout');
  return { id: inserted.id as string };
}

export async function updateService(id: string, input: UpdateServiceInput): Promise<void> {
  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('services')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('services')
    .update({
      name: parsed.data.name,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price,
      currency: parsed.data.currency,
    })
    .eq('id', id);

  if (error) {
    logger.error('updateService failed', { userId: user.id, serviceId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateService', { userId: user.id, serviceId: id });
  revalidatePath('/', 'layout');
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('services')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    logger.error('setServiceActive failed', { userId: user.id, serviceId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('setServiceActive', { userId: user.id, serviceId: id, isActive });
  revalidatePath('/', 'layout');
}
