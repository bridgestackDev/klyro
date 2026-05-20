"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { validatePhone } from "@/lib/validation";
import { COUNTRIES, type CountryCode } from "@/lib/i18n/countries";
import { useWizard } from "../WizardContext";

const COUNTRY_FLAGS: Record<CountryCode, string> = {
  HN: "🇭🇳",
  SV: "🇸🇻",
  GT: "🇬🇹",
  NI: "🇳🇮",
  CR: "🇨🇷",
  MX: "🇲🇽",
  CO: "🇨🇴",
  US: "🇺🇸",
};

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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  // Tracks whether the user has manually changed the timezone so we don't clobber their choice
  const timezoneTouched = useRef(false);

  const update = (field: FieldKey, value: string) => {
    updateData({ step3: { ...step3, [field]: value } });
  };

  const handleCountryChange = (newCountry: CountryCode) => {
    const countryData = COUNTRIES[newCountry];
    updateData({
      step3: {
        ...step3,
        country: newCountry,
        // Autosuggest timezone unless the user already picked one manually
        timezone: timezoneTouched.current ? step3.timezone : countryData.timezone,
      },
    });
    // Clear phone error when country changes since validation rules change
    setPhoneError(null);
  };

  const handleTimezoneChange = (tz: string) => {
    timezoneTouched.current = true;
    update("timezone", tz);
  };

  const handlePhoneBlur = () => {
    if (!step3.phone) {
      setPhoneError(null);
      return;
    }
    const result = validatePhone(step3.phone, step3.country as CountryCode);
    setPhoneError(result.ok ? null : t("phoneInvalid"));
  };

  const selectClass =
    "w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]";

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

        {/* Country — comes before city so locale context is set first */}
        <div className="space-y-1.5">
          <label
            htmlFor="branch-country"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("country.label")}
          </label>
          <select
            id="branch-country"
            value={step3.country}
            onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
            className={selectClass}
          >
            {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => (
              <option key={code} value={code}>
                {COUNTRY_FLAGS[code]} {COUNTRIES[code].name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--color-text-muted)]">{t("country.help")}</p>
        </div>

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
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className={selectClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="branch-phone"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("phoneLabel")}
          </label>
          <input
            id="branch-phone"
            type="tel"
            value={step3.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder={t("phonePlaceholder")}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
          />
          {phoneError && (
            <p className="text-xs text-[var(--color-danger)]">{phoneError}</p>
          )}
        </div>
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
