import { z } from 'zod';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';

const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

export const businessInfoSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  country: z.enum(COUNTRY_CODES).default(DEFAULT_COUNTRY),
  default_currency: z.string().trim().min(1).max(10),
  default_language: z.enum(['es', 'en']),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;
