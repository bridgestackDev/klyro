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
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
}

interface StaffCardProps {
  staff: StaffMember;
  businessId: string;
  branches: Branch[];
  assignedBranchIds: string[];
}

export function StaffCard({ staff, businessId, branches, assignedBranchIds }: StaffCardProps) {
  const t = useTranslations('team');
  const assignedNames = branches
    .filter((b) => assignedBranchIds.includes(b.id))
    .map((b) => b.name);

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4 text-center ${
        staff.isActive ? '' : 'opacity-60'
      }`}
    >
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

      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {staff.displayName}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{staff.slug}</p>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
            staff.isActive
              ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
              : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
          }`}
        >
          {staff.isActive ? t('status.active') : t('status.inactive')}
        </span>
      </div>

      {assignedNames.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {assignedNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <Dialog>
        <DialogTrigger className="mt-1 rounded-[var(--radius-button)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors">
          {t('edit')}
        </DialogTrigger>
        <EditStaffDialog
          staffId={staff.id}
          staffName={staff.displayName}
          businessId={businessId}
          currentAvatarUrl={staff.avatarUrl}
          isActive={staff.isActive}
          branches={branches}
          assignedBranchIds={assignedBranchIds}
        />
      </Dialog>
    </div>
  );
}
