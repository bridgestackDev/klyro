'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { X } from 'lucide-react';

interface SetupLogoBannerProps {
  logoUrl: string | null | undefined;
  onboardingCompleted: boolean;
  locale: string;
}

export function SetupLogoBanner({ logoUrl, onboardingCompleted, locale }: SetupLogoBannerProps) {
  const t = useTranslations('dashboard.banners.logo');
  const [dismissed, setDismissed] = useState(false);

  if (!onboardingCompleted || logoUrl || dismissed) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {t('title')}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('body')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/${locale}/dashboard/settings`}
            className="rounded-[var(--radius-button)] bg-[var(--color-violet)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-violet-hover)] transition-colors"
          >
            {t('cta')}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t('dismiss')}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
