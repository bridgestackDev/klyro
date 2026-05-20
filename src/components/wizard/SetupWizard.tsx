"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
} from "@/lib/schemas/wizard";
import {
  saveBusinessStep,
  saveBranchStep,
  saveServicesStep,
  saveStaffStep,
  saveAvailabilityStep,
  saveMessagingStep,
  completeSetup,
} from "@/lib/actions/wizard";
import { WizardProvider, useWizard } from "./WizardContext";
import { WizardShell } from "./WizardShell";
import { Step1Vertical } from "./steps/Step1Vertical";
import { Step2Business } from "./steps/Step2Business";
import { Step3Branch } from "./steps/Step3Branch";
import { Step4Services } from "./steps/Step4Services";
import { Step5Staff } from "./steps/Step5Staff";
import { Step6Availability } from "./steps/Step6Availability";
import { Step7Messaging } from "./steps/Step7Messaging";
import { Step8Preview } from "./steps/Step8Preview";
import { Step9Confirm } from "./steps/Step9Confirm";

type WizardData = ReturnType<typeof useWizard>["data"];

function isStepValid(step: number, data: WizardData): boolean {
  switch (step) {
    case 1:  return !!data.step1?.vertical;
    case 2:  return step2Schema.safeParse(data.step2).success;
    case 3:  return step3Schema.safeParse(data.step3).success;
    case 4:  return step4Schema.safeParse(data.step4).success;
    case 5:  return step5Schema.safeParse(data.step5).success;
    case 6:  return step6Schema.safeParse(data.step6).success;
    case 7: {
      if (!step7Schema.safeParse(data.step7).success) return false;
      if (data.step7.channel === "whatsapp") return !!data.step7.whatsappNumber?.trim();
      return true;
    }
    case 8:
    case 9:  return true;
    default: return false;
  }
}

/** Map server-returned error codes to i18n keys, fall back to the raw string */
function resolveError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<"errors">>
): string | null {
  if (!code) return null;
  const known = [
    "UNAUTHORIZED",
    "NOT_AUTHORIZED",
    "BUSINESS_NOT_FOUND",
    "BRANCH_NOT_FOUND",
    "STAFF_NOT_FOUND",
    "INTERNAL_ERROR",
    "MISSING_IDS",
    "SLUG_TAKEN",
    "WHATSAPP_INVALID",
    "TIME_END_BEFORE_START",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_FAILED",
    "RATE_LIMITED",
    "INTERNAL",
    "BAD_REQUEST",
    "CONFLICT",
  ] as const;
  if ((known as readonly string[]).includes(code)) {
    return t(code as (typeof known)[number]);
  }
  return code;
}

function WizardInner({
  locale,
  ownerDisplayName,
}: {
  locale: string;
  ownerDisplayName: string;
}) {
  const { data, currentStep, updateData, goNext } = useWizard();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const tErrors = useTranslations("errors");

  const handleClose = () => router.push(`/${locale}/dashboard`);

  const handleNext = async () => {
    if (!isStepValid(currentStep, data)) return;
    setError(null);
    setIsSaving(true);

    try {
      if (currentStep === 2) {
        if (!data.step1) return;
        const r = await saveBusinessStep(data.step1, data.step2);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        updateData({ businessId: r.businessId });
        goNext(); return;
      }

      if (currentStep === 3) {
        if (!data.businessId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await saveBranchStep(data.step3, data.businessId, data.branchId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        updateData({ branchId: r.branchId, branchSlug: r.branchSlug });
        goNext(); return;
      }

      if (currentStep === 4) {
        const { businessId, branchId } = data;
        if (!businessId || !branchId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await saveServicesStep(data.step4, businessId, branchId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        goNext(); return;
      }

      if (currentStep === 5) {
        const { businessId, branchId } = data;
        if (!businessId || !branchId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await saveStaffStep(data.step5, businessId, branchId, data.staffId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        updateData({ staffId: r.staffId });
        goNext(); return;
      }

      if (currentStep === 6) {
        const { staffId, branchId } = data;
        if (!staffId || !branchId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await saveAvailabilityStep(data.step6, staffId, branchId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        goNext(); return;
      }

      if (currentStep === 7) {
        if (!data.branchId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await saveMessagingStep(data.step7, data.branchId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        goNext(); return;
      }

      if (currentStep === 9) {
        if (!data.businessId) { setError(tErrors("MISSING_IDS")); return; }
        const r = await completeSetup(data.businessId);
        if (r.error) { setError(resolveError(r.error, tErrors)); return; }
        try { localStorage.removeItem("klyro_wizard_v1"); } catch {}
        router.push(`/${locale}/dashboard`);
        router.refresh();
        return;
      }

      // Steps 1 and 8 — no DB write, just advance
      goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : tErrors("INTERNAL_ERROR"));
    } finally {
      setIsSaving(false);
    }
  };

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1Vertical />,
    2: <Step2Business />,
    3: <Step3Branch />,
    4: <Step4Services />,
    5: <Step5Staff ownerDisplayName={ownerDisplayName} />,
    6: <Step6Availability />,
    7: <Step7Messaging />,
    8: <Step8Preview />,
    9: <Step9Confirm />,
  };

  return (
    <WizardShell
      canContinue={isStepValid(currentStep, data)}
      isSaving={isSaving}
      isLastStep={currentStep === 9}
      onNext={handleNext}
      onClose={handleClose}
      error={error}
    >
      {stepContent[currentStep] ?? null}
    </WizardShell>
  );
}

export function SetupWizard({
  locale,
  ownerDisplayName,
}: {
  locale: string;
  ownerDisplayName: string;
}) {
  return (
    <WizardProvider>
      <WizardInner locale={locale} ownerDisplayName={ownerDisplayName} />
    </WizardProvider>
  );
}
