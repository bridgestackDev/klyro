'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';

async function getSessionAndBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw ApiError.unauthorized();

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) throw ApiError.notFound('Business');

  return { supabase, user, businessId };
}

export async function updateBusinessLogo(logoUrl: string): Promise<void> {
  const { supabase, user, businessId } = await getSessionAndBusiness();

  const { error } = await supabase
    .from('businesses')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', businessId);

  if (error) {
    logger.error('updateBusinessLogo failed', { userId: user.id, businessId, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateBusinessLogo', { userId: user.id, businessId });
  revalidatePath('/', 'layout');
}

export async function updateStaffAvatar(
  staffId: string,
  avatarUrl: string
): Promise<void> {
  const { supabase, user, businessId } = await getSessionAndBusiness();

  // Explicit ownership check before the RLS-enforced UPDATE
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, user_id, business_id')
    .eq('id', staffId)
    .single();

  const isOwnerRole = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
    .then(({ data }) => data?.role === 'owner');

  const isSelf = staffRow?.user_id === user.id;
  const belongsToBusiness = staffRow?.business_id === businessId;

  if (!staffRow || !belongsToBusiness || (!isOwnerRole && !isSelf)) {
    throw ApiError.forbidden();
  }

  const { error } = await supabase
    .from('staff')
    .update({ avatar_url: avatarUrl })
    .eq('id', staffId);

  if (error) {
    logger.error('updateStaffAvatar failed', { userId: user.id, staffId, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateStaffAvatar', { userId: user.id, staffId });
  revalidatePath('/', 'layout');
}
