'use client';

import { useOptimistic, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format/currency';
import { setServiceActive } from '@/lib/actions/services';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceRowProps {
  service: Service;
  onEdit: (service: Service) => void;
}

export function ServiceRow({ service, onEdit }: ServiceRowProps) {
  const t = useTranslations('dashboard.services');
  const [optimisticActive, setOptimisticActive] = useOptimistic(service.is_active);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !optimisticActive;
    startTransition(async () => {
      setOptimisticActive(next);
      try {
        await setServiceActive(service.id, next);
      } catch {
        setOptimisticActive(!next);
        toast.error(t('failed'));
      }
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-text-primary)]">
            {service.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              optimisticActive
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {optimisticActive ? t('active') : t('inactive')}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          <span>{service.duration_minutes} min</span>
          <span aria-hidden="true"> · </span>
          <span>{formatCurrency(service.price, service.currency, 'es-HN')}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          role="switch"
          aria-checked={optimisticActive}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            optimisticActive ? 'bg-[var(--color-violet)]' : 'bg-[var(--border-subtle)]'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              optimisticActive ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          onClick={() => onEdit(service)}
          aria-label={`edit ${service.name}`}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
