/**
 * Formats an amount using the locale's currency style.
 *
 * HNL displays as "L" in es-HN (e.g. "L 250.00").
 * USD displays as "$" in en-US.
 * MXN displays as "$" in es-MX with the country disambiguated by locale.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
