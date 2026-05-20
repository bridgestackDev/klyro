"use client";

import { useTranslations } from "next-intl";
import type { AvailabilitySlot } from "@/lib/schemas/wizard";
import { useWizard } from "../WizardContext";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0] as const; // Mon→Sun

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

export function Step6Availability() {
  const t = useTranslations("wizard.steps.availability");
  const { data, updateData } = useWizard();
  const slots = data.step6.availability;

  const isActive = (day: number) => slots.some((s) => s.dayOfWeek === day);

  const getSlot = (day: number): AvailabilitySlot | undefined =>
    slots.find((s) => s.dayOfWeek === day);

  const toggleDay = (day: number) => {
    if (isActive(day)) {
      updateData({
        step6: { availability: slots.filter((s) => s.dayOfWeek !== day) },
      });
    } else {
      updateData({
        step6: {
          availability: [
            ...slots,
            { dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
          ].sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0];
            return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
          }),
        },
      });
    }
  };

  const updateSlot = (
    day: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    updateData({
      step6: {
        availability: slots.map((s) =>
          s.dayOfWeek === day ? { ...s, [field]: value } : s
        ),
      },
    });
  };

  const dayNames: Record<number, string> = {
    0: t("days.0"),
    1: t("days.1"),
    2: t("days.2"),
    3: t("days.3"),
    4: t("days.4"),
    5: t("days.5"),
    6: t("days.6"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-2">
        {ALL_DAYS.map((day) => {
          const active = isActive(day);
          const slot = getSlot(day);

          return (
            <div
              key={day}
              className={[
                "rounded-[var(--radius-card)] border p-4 transition-colors",
                active
                  ? "border-[var(--color-violet)]/30 bg-[var(--color-bg-surface)]"
                  : "border-[var(--border-subtle)] bg-[var(--color-bg-surface)]/50",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  role="switch"
                  aria-checked={active}
                  className={[
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    active
                      ? "bg-[var(--color-violet)]"
                      : "bg-[var(--color-bg-elevated)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      active ? "left-4.5 translate-x-0" : "left-0.5",
                    ].join(" ")}
                  />
                </button>

                <span
                  className={[
                    "w-24 text-sm font-medium",
                    active
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)]",
                  ].join(" ")}
                >
                  {dayNames[day]}
                </span>

                {active && slot && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("from")}
                    </span>
                    <TimeSelect
                      value={slot.startTime}
                      onChange={(v) => updateSlot(day, "startTime", v)}
                      ariaLabel={`${dayNames[day]} ${t("from")}`}
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("to")}
                    </span>
                    <TimeSelect
                      value={slot.endTime}
                      onChange={(v) => updateSlot(day, "endTime", v)}
                      ariaLabel={`${dayNames[day]} ${t("to")}`}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          {t("noSlots")}
        </p>
      )}
    </div>
  );
}

function TimeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-violet)]"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
