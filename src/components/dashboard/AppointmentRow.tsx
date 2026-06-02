import type { AppointmentStatus } from "@/lib/dashboard/home-data";
import { StatusBadge } from "./StatusBadge";

export interface AppointmentRowProps {
  /** Pre-formatted local time, e.g. "15:30". */
  time: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  status: AppointmentStatus;
  /** Localized status label for the badge. */
  statusLabel: string;
}

export function AppointmentRow({
  time,
  clientName,
  serviceName,
  staffName,
  status,
  statusLabel,
}: AppointmentRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="w-14 shrink-0 font-mono text-sm tabular-nums text-[var(--color-text-secondary)]">
        {time}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {clientName}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {serviceName}
          {staffName ? ` · ${staffName}` : ""}
        </p>
      </div>
      <StatusBadge status={status} label={statusLabel} />
    </div>
  );
}

export default AppointmentRow;
