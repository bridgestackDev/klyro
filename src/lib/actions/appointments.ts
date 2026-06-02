'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';

/** Statuses an owner may set from the agenda. Cancellation is a separate flow
 *  (it must void the pending reminder + enqueue a cancellation message) and is
 *  intentionally not handled here. */
const ALLOWED_STATUSES = ['completed', 'noshow', 'confirmed'] as const;
export type UpdatableStatus = (typeof ALLOWED_STATUSES)[number];

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

/**
 * Update an appointment's status (mark completed / no-show / confirmed).
 * RLS already scopes writes to the owner's business; we additionally read the
 * row first for an explicit ownership check so the UI gets clean error codes.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: UpdatableStatus
): Promise<void> {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Unsupported status: ${status}`);
  }

  const { supabase, user, businessId } = await getSessionAndBusiness();

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, status')
    .eq('id', appointmentId)
    .single();

  if (!appt) throw ApiError.notFound('Appointment');
  if (appt.business_id !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (error) {
    logger.error('updateAppointmentStatus failed', {
      userId: user.id,
      businessId,
      appointmentId,
      error: error.message,
    });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateAppointmentStatus', { userId: user.id, appointmentId, status });
  revalidatePath('/', 'layout');
}
