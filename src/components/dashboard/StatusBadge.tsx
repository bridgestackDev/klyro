import type { AppointmentStatus } from "@/lib/dashboard/home-data";

/**
 * Maps each appointment status to a semantic design token (never a raw color).
 * The badge colors derive from these CSS custom properties at render time.
 */
export const STATUS_TOKEN: Record<AppointmentStatus, string> = {
  pending: "--color-warning",
  confirmed: "--color-info",
  completed: "--color-success",
  noshow: "--color-danger",
  cancelled: "--color-text-muted",
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  /** Localized label resolved by the caller. */
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const token = STATUS_TOKEN[status] ?? "--color-text-muted";
  const color = `var(${token})`;

  return (
    <span
      data-status={status}
      className="inline-flex items-center rounded-[var(--radius-pill)] border px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
