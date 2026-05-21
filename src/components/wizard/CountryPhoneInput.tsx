"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, type CountryCode } from "@/lib/i18n/countries";

/** National-format placeholder per country (no dial code prefix). */
const NATIONAL_PLACEHOLDER: Record<CountryCode, string> = {
  HN: "9999-9999",
  SV: "7890-1234",
  GT: "5678-9012",
  NI: "8123-4567",
  CR: "8765-4321",
  MX: "55 1234-5678",
  CO: "300 123-4567",
  US: "(555) 123-4567",
};

interface CountryPhoneInputProps {
  country: CountryCode;
  value: string;
  onChange: (e164: string) => void;
  onBlur?: () => void;
  id: string;
  error?: string;
  placeholder?: string;
  ariaLabel?: string;
}

function nationalFromE164(e164: string, dialCode: string): string {
  if (!e164) return "";
  if (e164.startsWith(dialCode)) return e164.slice(dialCode.length);
  // Fallback: strip any leading + and country digits
  const withoutPlus = e164.replace(/^\+/, "");
  const dialDigits = dialCode.replace(/^\+/, "");
  if (withoutPlus.startsWith(dialDigits)) return withoutPlus.slice(dialDigits.length);
  return "";
}

export function CountryPhoneInput({
  country,
  value,
  onChange,
  onBlur,
  id,
  error,
  placeholder,
  ariaLabel,
}: CountryPhoneInputProps) {
  const dialCode = COUNTRIES[country].dialCode;

  const [nationalInput, setNationalInput] = useState(() =>
    nationalFromE164(value, dialCode)
  );

  // Keep a ref to the current national input to read it from the country-change effect
  const nationalRef = useRef(nationalInput);
  useEffect(() => {
    nationalRef.current = nationalInput;
  });

  // Track previous dialCode to detect country changes
  const prevDialCodeRef = useRef(dialCode);
  useEffect(() => {
    if (prevDialCodeRef.current !== dialCode) {
      prevDialCodeRef.current = dialCode;
      const digits = nationalRef.current.replace(/\D/g, "");
      onChange(dialCode + digits);
    }
  }, [dialCode, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, spaces, dashes only
    const raw = e.target.value.replace(/[^\d\s-]/g, "");
    setNationalInput(raw);
    const digits = raw.replace(/\D/g, "");
    onChange(dialCode + digits);
  };

  const inputClass =
    "flex-1 rounded-r-[var(--radius-button)] border border-l-0 border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]";

  return (
    <div className="space-y-0">
      <div className="flex">
        <span
          role="img"
          aria-label={`${ariaLabel ?? "Country code"}: ${dialCode}`}
          className="flex shrink-0 items-center rounded-l-[var(--radius-button)] border border-r-0 border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] select-none"
        >
          {dialCode}
        </span>
        <input
          id={id}
          type="tel"
          value={nationalInput}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder ?? NATIONAL_PLACEHOLDER[country]}
          autoComplete="tel-national"
          className={inputClass}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
