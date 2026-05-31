"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MessageStatusPanel } from "@/components/dashboard/messaging/MessageStatusPanel";

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  booking_code: string | null;
  client: { full_name: string; phone: string | null } | null;
  staff: { display_name: string } | null;
  service: { name: string } | null;
}

interface AgendaViewProps {
  appointments: Appointment[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-[var(--color-success)]",
  pending: "text-[var(--color-warning)]",
  cancelled: "text-[var(--color-danger)]",
  noshow: "text-[var(--color-danger)]",
  completed: "text-[var(--color-text-muted)]",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AgendaView({ appointments }: AgendaViewProps) {
  const t = useTranslations("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openDetail(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-[var(--color-text-muted)]">
        <Calendar className="h-10 w-10 opacity-30" aria-hidden />
        <p className="text-sm">{t("noAppointments")}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {appointments.map((appt) => {
          const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
          const staff = Array.isArray(appt.staff) ? appt.staff[0] : appt.staff;
          const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;

          return (
            <li key={appt.id}>
              <button
                onClick={() => openDetail(appt.id)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)] focus:ring-offset-2"
                aria-label={`Open details for ${client?.full_name ?? "appointment"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {client?.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {service?.name} · {staff?.display_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {formatDate(appt.starts_at)} {formatTime(appt.starts_at)}
                    </p>
                    <span
                      className={`text-xs font-medium ${STATUS_COLORS[appt.status] ?? "text-[var(--color-text-muted)]"}`}
                    >
                      {appt.status}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full border-[var(--border-subtle)] bg-[var(--color-bg-surface)] sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="text-[var(--color-text-primary)]">
              Appointment Details
            </SheetTitle>
          </SheetHeader>
          {selectedId && (
            <div className="mt-6 px-1">
              <MessageStatusPanel appointmentId={selectedId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
