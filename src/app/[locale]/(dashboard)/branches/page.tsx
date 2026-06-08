// src/app/[locale]/(dashboard)/branches/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { BranchList } from '@/components/dashboard/branches/BranchList';

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('dashboard.branches');
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

  if (!userData?.business_id) return null;

  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', userData.business_id as string)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
      </div>
      <BranchList branches={branches ?? []} addButtonLabel={t('addButton')} emptyLabel={t('empty')} />
    </div>
  );
}
