import { format, formatRelative as dateFnsFormatRelative } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

function toDate(input: Date | string): Date {
  return typeof input === "string" ? new Date(input) : input;
}

function getDateFnsLocale(locale: string): Locale {
  // Use Spanish locale for all es-* variants; English for en-*
  return locale.startsWith("en") ? enUS : es;
}

function uses24h(locale: string): boolean {
  // Spanish-speaking LATAM countries use 24h; en-US uses 12h
  return !locale.startsWith("en");
}

/**
 * Returns a compact date string: "lun., 19 may." (es) or "Mon, May 19" (en-US)
 */
export function formatDate(date: Date | string, locale: string): string {
  const d = toDate(date);
  const fnsLocale = getDateFnsLocale(locale);
  return format(d, "E, d MMM", { locale: fnsLocale });
}

/**
 * Returns a time string: "15:30" (24h) or "3:30 PM" (12h, en-US)
 */
export function formatTime(date: Date | string, locale: string): string {
  const d = toDate(date);
  const pattern = uses24h(locale) ? "HH:mm" : "h:mm a";
  return format(d, pattern, { locale: getDateFnsLocale(locale) });
}

/**
 * Returns a date-time string combining formatDate and formatTime.
 */
export function formatDateTime(date: Date | string, locale: string): string {
  return `${formatDate(date, locale)} · ${formatTime(date, locale)}`;
}

/**
 * Returns a human-readable relative string: "en 2 horas", "ayer", "tomorrow"
 */
export function formatRelative(
  date: Date | string,
  locale: string,
  now: Date = new Date()
): string {
  const d = toDate(date);
  return dateFnsFormatRelative(d, now, { locale: getDateFnsLocale(locale) });
}
