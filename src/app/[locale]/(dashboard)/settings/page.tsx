import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { requireOwner } from '@/lib/dashboard/access';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrandSettingsForm } from '@/components/dashboard/settings/BrandSettingsForm';
import { BusinessInfoForm } from '@/components/dashboard/settings/BusinessInfoForm';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOwner(locale);
  const tBrand = await getTranslations('settings.brand');
  const tBiz = await getTranslations('settings.business');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(id, logo_url, name, country, default_currency, default_language)')
    .eq('id', user.id)
    .single();

  const businesses = userData?.businesses;
  const business = Array.isArray(businesses) ? businesses[0] : businesses;
  const businessId = (business?.id as string | null) ?? (userData?.business_id as string | null);

  if (!businessId || !business) return null;

  const logoUrl = (business.logo_url as string | null) ?? null;

  const bizDefaults = {
    name: (business.name as string) ?? '',
    country: (business.country as string) ?? 'HN',
    default_currency: (business.default_currency as string) ?? 'HNL',
    default_language: (business.default_language as string) ?? 'es',
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {tBrand('pageTitle')}
      </h1>

      {/* Brand / logo */}
      <Card>
        <CardHeader>
          <CardTitle>{tBrand('title')}</CardTitle>
          <CardDescription>{tBrand('help')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandSettingsForm businessId={businessId} currentLogoUrl={logoUrl} />
        </CardContent>
      </Card>

      {/* Business info */}
      <Card>
        <CardHeader>
          <CardTitle>{tBiz('title')}</CardTitle>
          <CardDescription>{tBiz('help')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessInfoForm defaultValues={bizDefaults} />
        </CardContent>
      </Card>
    </div>
  );
}
