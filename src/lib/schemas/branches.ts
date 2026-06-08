import { z } from 'zod';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';

const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

const optionalPhone = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z
    .string()
    .regex(/^\+\d{7,15}$/, 'phone must be in E.164 format (e.g. +50498765432)')
    .optional()
);

export const addBranchSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.enum(COUNTRY_CODES).default(DEFAULT_COUNTRY),
  timezone: z.string().min(1, 'timezone is required').default('America/Tegucigalpa'),
  phone: optionalPhone,
  whatsapp_number: optionalPhone,
});

export const updateBranchSchema = addBranchSchema.extend({
  is_active: z.boolean().optional(),
});

export type AddBranchInput = z.infer<typeof addBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
