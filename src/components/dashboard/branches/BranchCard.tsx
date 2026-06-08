'use client';

import { MapPin, Clock, Phone, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchCardProps {
  branch: Branch;
  onEdit: (branch: Branch) => void;
}

export function BranchCard({ branch, onEdit }: BranchCardProps) {
  const t = useTranslations('dashboard.branches');

  return (
    <div className="flex items-start justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-text-primary)]">
            {branch.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              branch.is_active
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {branch.is_active ? t('active') : t('inactive')}
          </span>
        </div>
        {branch.city && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {branch.city}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {branch.timezone}
        </p>
        {branch.whatsapp_number && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {branch.whatsapp_number}
          </p>
        )}
      </div>
      <button
        onClick={() => onEdit(branch)}
        aria-label={t('editBranch', { name: branch.name } as Parameters<typeof t>[1])}
        className="ml-3 shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
