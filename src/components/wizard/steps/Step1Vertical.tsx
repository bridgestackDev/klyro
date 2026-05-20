"use client";

import {
  Scissors, Sparkles, Dumbbell, Leaf, PenTool, Car, PawPrint, Building2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getActiveVerticals } from "@/lib/verticals/registry";
import type { VerticalKey } from "@/lib/verticals/registry";
import { useWizard } from "../WizardContext";

const ICONS: Record<VerticalKey, React.ElementType> = {
  barbershop: Scissors,
  salon: Sparkles,
  fitness: Dumbbell,
  spa: Leaf,
  tattoo: PenTool,
  carwash: Car,
  petgrooming: PawPrint,
  other: Building2,
};

export function Step1Vertical() {
  const t = useTranslations("wizard.steps.vertical");
  const locale = useLocale();
  const { data, updateData } = useWizard();
  const verticals = getActiveVerticals();
  const selected = data.step1?.vertical ?? null;

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {verticals.map((v) => {
          const Icon = ICONS[v.key];
          const isSelected = selected === v.key;

          return (
            <button
              key={v.key}
              type="button"
              onClick={() => updateData({ step1: { vertical: v.key } })}
              className={[
                "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border p-4 text-center transition-all duration-150",
                isSelected
                  ? "border-[var(--color-violet)] bg-[var(--color-violet)]/10 shadow-[0_0_0_1px_var(--color-violet)]"
                  : "border-[var(--border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-violet)]/40 hover:bg-[var(--color-bg-elevated)]",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isSelected
                    ? "bg-[var(--color-violet)] text-white"
                    : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={[
                  "text-xs font-medium leading-tight",
                  isSelected
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                {v.displayName[locale as "es" | "en"] ?? v.displayName.en}
              </span>
            </button>
          );
        })}
      </div>

      {!selected && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          {t("hint")}
        </p>
      )}
    </div>
  );
}
