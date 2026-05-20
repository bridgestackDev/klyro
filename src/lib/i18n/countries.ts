export const COUNTRIES = {
  HN: {
    name: "Honduras",
    currency: "HNL",
    dialCode: "+504",
    timezone: "America/Tegucigalpa",
    locale: "es-HN",
  },
  SV: {
    name: "El Salvador",
    currency: "USD",
    dialCode: "+503",
    timezone: "America/El_Salvador",
    locale: "es-SV",
  },
  GT: {
    name: "Guatemala",
    currency: "GTQ",
    dialCode: "+502",
    timezone: "America/Guatemala",
    locale: "es-GT",
  },
  NI: {
    name: "Nicaragua",
    currency: "NIO",
    dialCode: "+505",
    timezone: "America/Managua",
    locale: "es-NI",
  },
  CR: {
    name: "Costa Rica",
    currency: "CRC",
    dialCode: "+506",
    timezone: "America/Costa_Rica",
    locale: "es-CR",
  },
  MX: {
    name: "México",
    currency: "MXN",
    dialCode: "+52",
    timezone: "America/Mexico_City",
    locale: "es-MX",
  },
  CO: {
    name: "Colombia",
    currency: "COP",
    dialCode: "+57",
    timezone: "America/Bogota",
    locale: "es-CO",
  },
  US: {
    name: "United States",
    currency: "USD",
    dialCode: "+1",
    timezone: "America/New_York",
    locale: "en-US",
  },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export type Country = (typeof COUNTRIES)[CountryCode];

export const DEFAULT_COUNTRY: CountryCode = "HN";

export function getCountry(code: string): Country | undefined {
  return COUNTRIES[code.toUpperCase() as CountryCode];
}
