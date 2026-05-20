import {
  parsePhoneNumberWithError,
  ParseError,
  type CountryCode,
} from "libphonenumber-js";

export type PhoneValidationResult =
  | { ok: true; e164: string }
  | { ok: false; code: "INVALID" | "WRONG_COUNTRY" };

/**
 * Validates a phone number input for the given country.
 * Returns E.164 on success, or a typed error code on failure.
 */
export function validatePhone(
  input: string,
  countryCode: string
): PhoneValidationResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, code: "INVALID" };

  try {
    const country = countryCode.toUpperCase() as CountryCode;
    const phone = parsePhoneNumberWithError(trimmed, country);

    if (!phone.isValid()) return { ok: false, code: "INVALID" };

    if (phone.country && phone.country !== country) {
      return { ok: false, code: "WRONG_COUNTRY" };
    }

    return { ok: true, e164: phone.format("E.164") };
  } catch (err) {
    if (err instanceof ParseError) return { ok: false, code: "INVALID" };
    return { ok: false, code: "INVALID" };
  }
}

/**
 * Normalizes a phone number to E.164, or returns null if invalid.
 * Uses countryCode as the default region for numbers without a country prefix.
 */
export function normalizePhone(
  input: string,
  countryCode: string
): string | null {
  const result = validatePhone(input, countryCode);
  return result.ok ? result.e164 : null;
}

/**
 * Returns true if the number is valid and can receive WhatsApp messages.
 * Accepts numbers from any country (not just countryCode) to support
 * businesses with international WhatsApp numbers.
 */
export function isValidWhatsAppNumber(
  input: string,
  countryCode: string
): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  try {
    const country = countryCode.toUpperCase() as CountryCode;
    const phone = parsePhoneNumberWithError(trimmed, country);
    return phone.isValid();
  } catch {
    return false;
  }
}
