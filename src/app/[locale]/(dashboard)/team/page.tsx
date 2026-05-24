import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { StaffCard } from '@/components/dashboard/team/StaffCard';

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('team');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) return null;

  const { data: staffList } = await supabase
    .from('staff')
    .select('id, display_name, slug, avatar_url')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('display_name');

  const staff = staffList ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('title')}
      </h1>

      {staff.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              staff={{
                id: member.id,
                displayName: member.display_name,
                slug: member.slug,
                avatarUrl: (member.avatar_url as string | null) ?? null,
              }}
              businessId={businessId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
