"use client";

import { useTranslations } from "next-intl";
import { useWizard } from "../WizardContext";

const TIMEZONES = [
  { value: "America/Tegucigalpa", label: "Tegucigalpa (UTC-6)" },
  { value: "America/Mexico_City", label: "México (UTC-6)" },
  { value: "America/Guatemala", label: "Guatemala (UTC-6)" },
  { value: "America/Costa_Rica", label: "Costa Rica (UTC-6)" },
  { value: "America/El_Salvador", label: "El Salvador (UTC-6)" },
  { value: "America/Managua", label: "Nicaragua (UTC-6)" },
  { value: "America/Panama", label: "Panamá (UTC-5)" },
  { value: "America/Bogota", label: "Colombia (UTC-5)" },
  { value: "America/Lima", label: "Perú (UTC-5)" },
  { value: "America/Caracas", label: "Venezuela (UTC-4)" },
  { value: "America/Santiago", label: "Chile (UTC-4/-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { value: "America/Sao_Paulo", label: "Brasil (UTC-3)" },
  { value: "America/New_York", label: "Nueva York (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (UTC-8/-7)" },
  { value: "America/Chicago", label: "Chicago (UTC-6/-5)" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1/+2)" },
];

type FieldKey = "branchName" | "address" | "city" | "timezone" | "phone";

export function Step3Branch() {
  const t = useTranslations("wizard.steps.branch");
  const { data, updateData } = useWizard();
  const step3 = data.step3;

  const update = (field: FieldKey, value: string) => {
    updateData({ step3: { ...step3, [field]: value } });
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

      <div className="space-y-4">
        <Field
          id="branch-name"
          label={t("nameLabel")}
          placeholder={t("namePlaceholder")}
          value={step3.branchName}
          onChange={(v) => update("branchName", v)}
        />
        <Field
          id="branch-address"
          label={t("addressLabel")}
          placeholder={t("addressPlaceholder")}
          value={step3.address}
          onChange={(v) => update("address", v)}
        />
        <Field
          id="branch-city"
          label={t("cityLabel")}
          placeholder={t("cityPlaceholder")}
          value={step3.city}
          onChange={(v) => update("city", v)}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="branch-timezone"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("timezoneLabel")}
          </label>
          <select
            id="branch-timezone"
            value={step3.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <Field
          id="branch-phone"
          label={t("phoneLabel")}
          placeholder={t("phonePlaceholder")}
          value={step3.phone}
          onChange={(v) => update("phone", v)}
          type="tel"
        />
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
      />
    </div>
  );
}
