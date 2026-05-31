const LOCALE_MAP: Record<string, string> = {
  es: 'es-HN',
  en: 'en-US',
};

export function formatDate(isoTimestamp: string, timezone: string, language: string): string {
  const locale = LOCALE_MAP[language] ?? 'es-HN';
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoTimestamp));
}

export function formatTime(isoTimestamp: string, timezone: string, language: string): string {
  const locale = LOCALE_MAP[language] ?? 'es-HN';
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoTimestamp));
}
