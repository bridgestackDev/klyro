'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { getInitials } from '@/lib/format/initials';
import { QrCode } from './QrCode';

export interface LinkItem {
  staffId: string;
  staffName: string;
  staffSlug: string;
  staffAvatarUrl: string | null;
  branchName: string;
  branchSlug: string;
  url: string;
}

interface LinkCardProps {
  link: LinkItem;
}

export function LinkCard({ link }: LinkCardProps) {
  const t = useTranslations('dashboard.links');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-violet)]/15 text-sm font-semibold text-[var(--color-violet-soft)]">
          {link.staffAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.staffAvatarUrl}
              alt={link.staffName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            getInitials(link.staffName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)]">{link.staffName}</span>
            <span className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {link.branchName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{link.url}</p>
        </div>

        <button
          onClick={handleCopy}
          aria-label={t('copyLink')}
          className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex justify-center border-t border-[var(--border-subtle)] pt-4">
        <QrCode url={link.url} staffSlug={link.staffSlug} />
      </div>
    </div>
  );
}
