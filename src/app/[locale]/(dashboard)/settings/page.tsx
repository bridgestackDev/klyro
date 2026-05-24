import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrandSettingsForm } from '@/components/dashboard/settings/BrandSettingsForm';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('settings.brand');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(id, logo_url)')
    .eq('id', user.id)
    .single();

  const businesses = userData?.businesses;
  const business = Array.isArray(businesses) ? businesses[0] : businesses;
  const businessId = (business?.id as string | null) ?? (userData?.business_id as string | null);
  const logoUrl = (business?.logo_url as string | null) ?? null;

  if (!businessId) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('pageTitle')}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('help')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandSettingsForm businessId={businessId} currentLogoUrl={logoUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
