import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { requireOwner } from '@/lib/dashboard/access';
import { ServiceList } from '@/components/dashboard/services/ServiceList';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOwner(locale);
  const t = await getTranslations('dashboard.services');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(default_currency)')
    .eq('id', user.id)
    .single();

  if (!userData?.business_id) return null;

  const businesses = userData.businesses;
  const defaultCurrency =
    ((Array.isArray(businesses) ? businesses[0] : businesses)?.default_currency as string | undefined) ?? 'HNL';

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', userData.business_id as string)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('title')}
      </h1>
      <ServiceList
        services={services ?? []}
        defaultCurrency={defaultCurrency}
        addButtonLabel={t('addButton')}
        emptyLabel={t('empty')}
      />
    </div>
  );
}
