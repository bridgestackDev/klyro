import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from "./countries";

/**
 * Derive a CountryCode from a next-intl locale string.
 * "es-HN" → "HN", "en-US" → "US", "es" → DEFAULT_COUNTRY, unknown → DEFAULT_COUNTRY
 */
export function detectCountryFromLocale(locale: string): CountryCode {
  if (!locale) return DEFAULT_COUNTRY;
  const parts = locale.split("-");
  const region = parts[1]?.toUpperCase();
  if (region && region in COUNTRIES) return region as CountryCode;
  return DEFAULT_COUNTRY;
}
