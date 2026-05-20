import {
  parsePhoneNumberWithError,
  ParseError,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Returns the E.164 representation of a phone number, or null if invalid.
 * E.g. "+50498765432"
 */
export function formatPhoneE164(
  input: string,
  country: string
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const phone = parsePhoneNumberWithError(
      trimmed,
      country.toUpperCase() as CountryCode
    );
    if (!phone.isValid()) return null;
    return phone.format("E.164");
  } catch (err) {
    if (err instanceof ParseError) return null;
    return null;
  }
}

/**
 * Returns the national display format of a phone number, or null if invalid.
 * E.g. "9876 5432" for Honduras, "+1 (555) 123-4567" for international.
 */
export function formatPhoneDisplay(
  input: string,
  country: string
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const phone = parsePhoneNumberWithError(
      trimmed,
      country.toUpperCase() as CountryCode
    );
    if (!phone.isValid()) return null;
    return phone.formatNational();
  } catch (err) {
    if (err instanceof ParseError) return null;
    return null;
  }
}
