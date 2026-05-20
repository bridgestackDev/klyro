import { DEFAULT_COUNTRY } from "@/lib/i18n/countries";
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
} from "@/lib/schemas/wizard";

export type WizardData = {
  step1: Step1Data | null;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  step6: Step6Data;
  step7: Step7Data;
  businessId: string | null;
  branchId: string | null;
  branchSlug: string | null;
  staffId: string | null;
};

export const WIZARD_TOTAL_STEPS = 9;

export const defaultWizardData: WizardData = {
  step1: null,
  step2: { name: "", slug: "" },
  step3: {
    branchName: "",
    address: "",
    city: "",
    timezone: "America/Tegucigalpa",
    phone: "",
    country: DEFAULT_COUNTRY,
  },
  step4: { services: [] },
  step5: { ownerName: "", ownerSlug: "" },
  step6: {
    availability: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
    ],
  },
  step7: { channel: "whatsapp", whatsappNumber: "" },
  businessId: null,
  branchId: null,
  branchSlug: null,
  staffId: null,
};
