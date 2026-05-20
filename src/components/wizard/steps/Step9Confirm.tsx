"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { getVertical } from "@/lib/verticals/registry";
import { formatCurrency, formatPhoneDisplay } from "@/lib/format";
import { DEFAULT_COUNTRY, COUNTRIES } from "@/lib/i18n/countries";
import { useWizard } from "../WizardContext";

const DEFAULT_LOCALE = COUNTRIES[DEFAULT_COUNTRY].locale;

export function Step9Confirm() {
  const t = useTranslations("wizard.steps.confirm");
  const { data } = useWizard();
  const vertical = data.step1?.vertical
    ? getVertical(data.step1.vertical)
    : null;

  const rows: { label: string; value: string }[] = [
    {
      label: t("sections.vertical"),
      value: vertical?.displayName.es ?? "—",
    },
    {
      label: t("sections.business"),
      value: data.step2.name || "—",
    },
    {
      label: t("sections.branch"),
      value: data.step3.branchName || "—",
    },
    {
      label: t("sections.services"),
      value: (() => {
        const svcs = data.step4.services;
        if (svcs.length === 0) return "—";
        const prices = svcs.filter((s) => s.price > 0);
        const countStr = t("servicesCount", { count: svcs.length });
        if (prices.length === 0) return countStr;
        const min = Math.min(...prices.map((s) => s.price));
        const max = Math.max(...prices.map((s) => s.price));
        const currency = svcs[0]?.currency ?? "HNL";
        const range =
          min === max
            ? formatCurrency(min, currency, DEFAULT_LOCALE)
            : `${formatCurrency(min, currency, DEFAULT_LOCALE)} – ${formatCurrency(max, currency, DEFAULT_LOCALE)}`;
        return `${countStr} · ${range}`;
      })(),
    },
    {
      label: t("sections.staff"),
      value: data.step5.ownerName || "—",
    },
    {
      label: t("sections.availability"),
      value: t("availabilityCount", {
        count: data.step6.availability.length,
      }),
    },
    {
      label: t("sections.messaging"),
      value: (() => {
        if (data.step7.channel !== "whatsapp") return t("channelEmail");
        const raw = data.step7.whatsappNumber;
        if (!raw) return t("channelWhatsapp");
        const display = formatPhoneDisplay(raw, DEFAULT_COUNTRY) ?? raw;
        return `${t("channelWhatsapp")} · ${display}`;
      })(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/20">
          <Check className="h-6 w-6 text-[var(--color-success)]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-[var(--color-text-muted)]">
              {label}
            </span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
