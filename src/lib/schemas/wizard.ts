import { z } from "zod";

export const VERTICAL_KEYS = [
  "barbershop",
  "salon",
  "fitness",
  "spa",
  "tattoo",
  "carwash",
  "petgrooming",
  "other",
] as const;

export const step1Schema = z.object({
  vertical: z.enum(VERTICAL_KEYS),
});

export const step2Schema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const step3Schema = z.object({
  branchName: z.string().min(2).max(100),
  address: z.string(),
  city: z.string(),
  timezone: z.string().min(1),
  phone: z.string(),
});

export const serviceDraftSchema = z.object({
  clientId: z.string().optional(),
  name: z.string().min(1).max(100),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
  currency: z.string(),
});

export const step4Schema = z.object({
  services: z.array(serviceDraftSchema).min(1),
});

export const step5Schema = z.object({
  ownerName: z.string().min(2).max(100),
  ownerSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

const TIME_RE = /^\d{2}:\d{2}$/;

export const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_RE),
    endTime: z.string().regex(TIME_RE),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: "TIME_END_BEFORE_START",
    path: ["endTime"],
  });

export const step6Schema = z.object({
  availability: z.array(availabilitySlotSchema).min(1),
});

const WHATSAPP_RE = /^\+?[\d\s\-()]{7,20}$/;

export const step7Schema = z
  .object({
    channel: z.enum(["whatsapp", "email"]),
    whatsappNumber: z.string(),
  })
  .refine(
    (s) =>
      s.channel !== "whatsapp" ||
      (s.whatsappNumber.trim().length > 0 && WHATSAPP_RE.test(s.whatsappNumber.trim())),
    {
      message: "WHATSAPP_INVALID",
      path: ["whatsappNumber"],
    }
  );

// Shape schema for localStorage restore validation (I4)
export const wizardStorageSchema = z.object({
  currentStep: z.number().int().min(1).max(9),
  direction: z.number(),
  data: z.object({
    step1: z.unknown().optional(),
    step2: z.unknown().optional(),
    step3: z.unknown().optional(),
    step4: z.unknown().optional(),
    step5: z.unknown().optional(),
    step6: z.unknown().optional(),
    step7: z.unknown().optional(),
    businessId: z.string().nullable().optional(),
    branchId: z.string().nullable().optional(),
    branchSlug: z.string().nullable().optional(),
    staffId: z.string().nullable().optional(),
  }),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;
export type Step7Data = z.infer<typeof step7Schema>;
export type ServiceDraft = z.infer<typeof serviceDraftSchema>;
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
