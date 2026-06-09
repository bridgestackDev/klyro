import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { requireOwner } from '@/lib/dashboard/access';
import { LinkCard, type LinkItem } from '@/components/dashboard/links/LinkCard';

export default async function LinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOwner(locale);
  const t = await getTranslations('dashboard.links');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(slug)')
    .eq('id', user.id)
    .single();

  if (!userData?.business_id) return null;

  const businesses = userData.businesses;
  const businessSlug =
    ((Array.isArray(businesses) ? businesses[0] : businesses)?.slug as string | undefined) ?? '';

  if (!businessSlug) return null;

  const { data: staffRows } = await supabase
    .from('staff')
    .select('id, display_name, slug, avatar_url, staff_branches(branches(id, name, slug, is_active))')
    .eq('business_id', userData.business_id as string)
    .eq('is_active', true);

  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  const links: LinkItem[] = (staffRows ?? []).flatMap((member) =>
    (
      (member.staff_branches ?? []) as Array<{
        branches: { id: string; name: string; slug: string; is_active: boolean } | null;
      }>
    )
      .filter((sb) => sb.branches?.is_active)
      .map((sb) => ({
        staffId: member.id as string,
        staffName: member.display_name as string,
        staffSlug: member.slug as string,
        staffAvatarUrl: (member.avatar_url as string | null) ?? null,
        branchName: sb.branches!.name,
        branchSlug: sb.branches!.slug,
        url: `${baseUrl}/${locale}/${businessSlug}/${sb.branches!.slug}/${member.slug}`,
      }))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('title')}
      </h1>
      {links.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <LinkCard key={`${link.staffId}-${link.branchSlug}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
