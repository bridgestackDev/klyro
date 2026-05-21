"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getVertical } from "@/lib/verticals/registry";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_COUNTRY, COUNTRIES } from "@/lib/i18n/countries";
import type { ServiceDraft } from "@/lib/schemas/wizard";
import { useWizard } from "../WizardContext";

const DEFAULT_CURRENCY = COUNTRIES[DEFAULT_COUNTRY].currency;
const DEFAULT_LOCALE = COUNTRIES[DEFAULT_COUNTRY].locale;

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];

function genId() {
  return typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function Step4Services() {
  const t = useTranslations("wizard.steps.services");
  const { data, updateData } = useWizard();
  const services = data.step4.services;

  // Pre-seed from vertical on first load
  useEffect(() => {
    if (services.length === 0 && data.step1?.vertical) {
      const profile = getVertical(data.step1.vertical);
      if (profile.defaultServices.length > 0) {
        updateData({
          step4: {
            services: profile.defaultServices.map((s) => ({
              clientId: genId(),
              name: s.name.es,
              durationMinutes: s.durationMinutes,
              price: s.suggestedPriceRange[0],
              currency: "HNL",
            })),
          },
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateService = (index: number, partial: Partial<ServiceDraft>) => {
    const next = services.map((s, i) => (i === index ? { ...s, ...partial } : s));
    updateData({ step4: { services: next } });
  };

  const removeService = (index: number) => {
    updateData({ step4: { services: services.filter((_, i) => i !== index) } });
  };

  const addService = () => {
    updateData({
      step4: {
        services: [
          ...services,
          { clientId: genId(), name: "", durationMinutes: 30, price: 0, currency: "HNL" },
        ],
      },
    });
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

      <div className="space-y-3">
        {/* Column headers — only visible on sm+ where grid layout applies */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_32px] sm:gap-2 sm:px-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t("nameLabel")}
          </span>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t("durationLabel")}
          </span>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {t("priceLabel")}
          </span>
          <span />
        </div>

        {services.map((service, i) => (
          <div
            key={service.clientId ?? `svc-${i}`}
            className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 sm:space-y-0 sm:rounded-none sm:border-0 sm:p-0 sm:grid sm:grid-cols-[1fr_100px_100px_32px] sm:items-center sm:gap-2"
          >
            {/* Service name — full width on both layouts */}
            <input
              type="text"
              value={service.name}
              onChange={(e) => updateService(i, { name: e.target.value })}
              placeholder={t("namePlaceholder")}
              aria-label={t("nameLabel")}
              className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
            />
            {/* On mobile: row with duration + price + delete. On sm+: sm:contents makes children direct grid items */}
            <div className="flex items-center gap-2 sm:contents">
              <select
                value={service.durationMinutes}
                onChange={(e) =>
                  updateService(i, { durationMinutes: Number(e.target.value) })
                }
                aria-label={t("durationLabel")}
                className="flex-1 rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-2 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-violet)] sm:flex-none"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
              <div className="flex-1 space-y-0.5 sm:flex-none">
                <input
                  type="number"
                  value={service.price === 0 ? "" : service.price}
                  onChange={(e) =>
                    updateService(i, { price: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                  min={0}
                  aria-label={t("priceLabel")}
                  className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
                />
                {service.price > 0 && (
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {formatCurrency(service.price, service.currency || DEFAULT_CURRENCY, DEFAULT_LOCALE)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeService(i)}
                disabled={services.length === 1}
                aria-label={t("removeService")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">
            {t("noServices")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={addService}
        className="w-full rounded-[var(--radius-button)] border border-dashed border-[var(--color-violet)]/40 py-2.5 text-sm font-medium text-[var(--color-violet)] transition-colors hover:border-[var(--color-violet)] hover:bg-[var(--color-violet)]/5"
      >
        {t("addService")}
      </button>
    </div>
  );
}
