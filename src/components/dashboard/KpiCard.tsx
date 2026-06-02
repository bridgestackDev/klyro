import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  /** Optional secondary line (e.g. a trend or hint). */
  hint?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
}

export function KpiCard({ label, value, hint, icon }: KpiCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        {icon ? (
          <span className="text-[var(--color-text-muted)]" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export default KpiCard;
