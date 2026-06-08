'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import { businessInfoSchema, type BusinessInfoInput } from '@/lib/schemas/settings';

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

export async function updateBusinessInfo(input: BusinessInfoInput): Promise<void> {
  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { error } = await supabase
    .from('businesses')
    .update({
      name: parsed.data.name,
      country: parsed.data.country,
      default_currency: parsed.data.default_currency,
      default_language: parsed.data.default_language,
    })
    .eq('id', businessId);

  if (error) {
    logger.error('updateBusinessInfo failed', { userId: user.id, businessId, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateBusinessInfo', { userId: user.id, businessId });
  revalidatePath('/', 'layout');
}
