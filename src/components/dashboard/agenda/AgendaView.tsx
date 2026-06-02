"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysYmd,
  weekDaysYmd,
  appointmentsForDay,
  applyFilters,
  type AgendaAppointment,
} from "@/lib/dashboard/agenda-data";
import { formatDate } from "@/lib/format/date";
import { DayColumn } from "./DayColumn";
import { WeekGrid } from "./WeekGrid";
import { AppointmentDrawer } from "./AppointmentDrawer";

type ViewMode = "day" | "week";

export interface AgendaViewProps {
  appointments: AgendaAppointment[];
  branches: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; name: string }>;
  tz: string;
  locale: string;
  todayYmd: string;
}

export function AgendaView({
  appointments,
  branches,
  staff,
  tz,
  locale,
  todayYmd,
}: AgendaViewProps) {
  const t = useTranslations("dashboard.agenda");
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState(todayYmd);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = applyFilters(appointments, branchId, staffId);
  const dayAppts = appointmentsForDay(filtered, cursor, tz);
  const weekDays = weekDaysYmd(cursor);
  const selected = appointments.find((a) => a.id === selectedId) ?? null;

  function openDetail(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  function step(direction: -1 | 1) {
    setCursor((c) => addDaysYmd(c, direction * (view === "day" ? 1 : 7)));
  }

  const rangeLabel =
    view === "day"
      ? formatDate(`${cursor}T12:00:00`, locale)
      : `${formatDate(`${weekDays[0]}T12:00:00`, locale)} – ${formatDate(
          `${weekDays[6]}T12:00:00`,
          locale
        )}`;

  const toggleBtn = (mode: ViewMode, label: string) => (
    <button
      type="button"
      aria-pressed={view === mode}
      onClick={() => setView(mode)}
      className={`min-h-11 rounded-[var(--radius-button)] px-4 text-sm font-medium transition-colors ${
        view === mode
          ? "bg-[var(--color-violet)] text-white"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[var(--radius-button)] bg-[var(--color-bg-surface)] p-1">
          {toggleBtn("day", t("day"))}
          {toggleBtn("week", t("week"))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("previous")}
            onClick={() => step(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(todayYmd)}
            className="min-h-11 rounded-[var(--radius-button)] px-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          >
            {t("today")}
          </button>
          <button
            type="button"
            aria-label={t("next")}
            onClick={() => step(1)}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Date label + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{rangeLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 && (
            <select
              aria-label={t("branchFilter")}
              value={branchId ?? ""}
              onChange={(e) => setBranchId(e.target.value || null)}
              className="min-h-11 rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)]"
            >
              <option value="">{t("allBranches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label={t("staffFilter")}
            value={staffId ?? ""}
            onChange={(e) => setStaffId(e.target.value || null)}
            className="min-h-11 rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)]"
          >
            <option value="">{t("allStaff")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar body */}
      {view === "day" ? (
        <DayColumn
          appts={dayAppts}
          tz={tz}
          locale={locale}
          onSelect={openDetail}
          emptyLabel={t("empty")}
        />
      ) : (
        <WeekGrid
          days={weekDays}
          appts={filtered}
          tz={tz}
          locale={locale}
          todayYmd={todayYmd}
          onSelect={openDetail}
        />
      )}

      <AppointmentDrawer appt={selected} open={open} onOpenChange={setOpen} locale={locale} />
    </div>
  );
}

export default AgendaView;
