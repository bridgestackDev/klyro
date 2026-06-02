"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { MessageStatusPanel } from "@/components/dashboard/messaging/MessageStatusPanel";
import { updateAppointmentStatus, type UpdatableStatus } from "@/lib/actions/appointments";
import { formatDate, formatTime } from "@/lib/format/date";
import type { AgendaAppointment } from "@/lib/dashboard/agenda-data";

interface AppointmentDrawerProps {
  appt: AgendaAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

export function AppointmentDrawer({ appt, open, onOpenChange, locale }: AppointmentDrawerProps) {
  const t = useTranslations("dashboard.agenda.drawer");
  const tStatus = useTranslations("dashboard.home.status");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatus(status: UpdatableStatus) {
    if (!appt) return;
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appt.id, status);
        toast.success(t("statusUpdated"));
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error(t("statusFailed"));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-[var(--border-subtle)] bg-[var(--color-bg-surface)] sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-[var(--color-text-primary)]">{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        {appt && (
          <div className="mt-4 space-y-6 px-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                  {appt.clientName}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(appt.startsAt, locale)} · {formatTime(appt.startsAt, locale)}–
                  {formatTime(appt.endsAt, locale)}
                </p>
              </div>
              <StatusBadge status={appt.status} label={tStatus(appt.status)} />
            </div>

            <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-button)] border border-[var(--border-subtle)] px-3">
              <Field label={t("service")} value={appt.serviceName} />
              <Field label={t("staff")} value={appt.staffName} />
              <Field label={t("branch")} value={appt.branchName} />
              <Field label={t("phone")} value={appt.clientPhone ?? ""} />
              <Field label={t("email")} value={appt.clientEmail ?? ""} />
              <Field label={t("code")} value={appt.bookingCode ?? ""} />
              <Field label={t("notes")} value={appt.notes ?? ""} />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                {t("messages")}
              </h3>
              <MessageStatusPanel appointmentId={appt.id} />
            </div>
          </div>
        )}

        {appt && (
          <SheetFooter className="gap-2">
            <button
              type="button"
              disabled={isPending || appt.status === "completed"}
              onClick={() => handleStatus("completed")}
              className="min-h-11 flex-1 rounded-[var(--radius-button)] bg-[var(--color-violet)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-violet-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("markCompleted")}
            </button>
            <button
              type="button"
              disabled={isPending || appt.status === "noshow"}
              onClick={() => handleStatus("noshow")}
              className="min-h-11 flex-1 rounded-[var(--radius-button)] border border-[var(--border-subtle)] px-4 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("markNoShow")}
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AppointmentDrawer;
