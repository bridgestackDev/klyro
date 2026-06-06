'use client';

import { useTranslations } from 'next-intl';
import { Mail, Phone, Pencil } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { EditStaffDialog } from './EditStaffDialog';
import { getInitials } from '@/lib/format/initials';

interface StaffMember {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  userId: string | null;
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
      className={`flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-5 transition-colors hover:border-[var(--border-strong)] ${
        staff.isActive ? '' : 'opacity-60'
      }`}
    >
      {/* Header: avatar + name + status */}
      <div className="flex items-center gap-3">
        {staff.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staff.avatarUrl}
            alt={staff.displayName}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-label={getInitials(staff.displayName)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-violet)]/20 text-lg font-semibold text-[var(--color-violet)]"
          >
            {getInitials(staff.displayName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {staff.displayName}
          </p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{staff.slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              staff.isActive
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {staff.isActive ? t('status.active') : t('status.inactive')}
          </span>
          {!staff.userId && staff.email && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
              {t('status.pendingInvite')}
            </span>
          )}
        </div>
      </div>

      {/* Contact */}
      {(staff.email || staff.phone) && (
        <div className="space-y-1.5">
          {staff.email && (
            <p className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
              <span className="truncate">{staff.email}</span>
            </p>
          )}
          {staff.phone && (
            <p className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
              <span className="truncate">{staff.phone}</span>
            </p>
          )}
        </div>
      )}

      {/* Branch chips */}
      {assignedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignedNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[var(--color-bg-elevated)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <Dialog>
        <DialogTrigger className="mt-auto flex items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-elevated)]">
          <Pencil className="h-3.5 w-3.5" />
          {t('edit')}
        </DialogTrigger>
        <EditStaffDialog
          staffId={staff.id}
          staffName={staff.displayName}
          businessId={businessId}
          currentAvatarUrl={staff.avatarUrl}
          isActive={staff.isActive}
          email={staff.email}
          phone={staff.phone}
          userId={staff.userId}
          branches={branches}
          assignedBranchIds={assignedBranchIds}
        />
      </Dialog>
    </div>
  );
}
