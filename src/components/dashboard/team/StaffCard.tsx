'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { EditStaffDialog } from './EditStaffDialog';
import { getInitials } from '@/lib/format/initials';

interface StaffMember {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
}

interface StaffCardProps {
  staff: StaffMember;
  businessId: string;
}

export function StaffCard({ staff, businessId }: StaffCardProps) {
  const t = useTranslations('team');

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4 text-center">
      {staff.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={staff.avatarUrl}
          alt={staff.displayName}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div
          aria-label={getInitials(staff.displayName)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-violet)]/20 text-lg font-semibold text-[var(--color-violet)]"
        >
          {getInitials(staff.displayName)}
        </div>
      )}

      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {staff.displayName}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{staff.slug}</p>
      </div>

      <Dialog>
        <DialogTrigger
          className="mt-1 rounded-[var(--radius-button)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          {t('edit')}
        </DialogTrigger>
        <EditStaffDialog
          staffId={staff.id}
          staffName={staff.displayName}
          businessId={businessId}
          currentAvatarUrl={staff.avatarUrl}
        />
      </Dialog>
    </div>
  );
}
