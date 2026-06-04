import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { StaffCard } from '@/components/dashboard/team/StaffCard';
import { AddStaffDialog } from '@/components/dashboard/team/AddStaffDialog';

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

  const [{ data: staffList }, { data: branchList }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, display_name, slug, avatar_url, is_active, email, phone')
      .eq('business_id', businessId)
      .order('is_active', { ascending: false })
      .order('display_name'),
    supabase
      .from('branches')
      .select('id, name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name'),
  ]);

  const staff = staffList ?? [];
  const branches = (branchList ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
  }));

  // Resolve each staff member's branch assignments in a single query.
  const staffIds = staff.map((s) => s.id as string);
  const assignmentsByStaff = new Map<string, string[]>();
  if (staffIds.length > 0) {
    const { data: links } = await supabase
      .from('staff_branches')
      .select('staff_id, branch_id')
      .in('staff_id', staffIds);
    for (const link of links ?? []) {
      const sid = link.staff_id as string;
      const list = assignmentsByStaff.get(sid) ?? [];
      list.push(link.branch_id as string);
      assignmentsByStaff.set(sid, list);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
        <AddStaffDialog branches={branches} />
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              staff={{
                id: member.id as string,
                displayName: member.display_name as string,
                slug: member.slug as string,
                avatarUrl: (member.avatar_url as string | null) ?? null,
                isActive: (member.is_active as boolean) ?? true,
                email: (member.email as string | null) ?? null,
                phone: (member.phone as string | null) ?? null,
              }}
              businessId={businessId}
              branches={branches}
              assignedBranchIds={assignmentsByStaff.get(member.id as string) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
