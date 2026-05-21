"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/shared/Logo";
import { WIZARD_TOTAL_STEPS } from "./types";
import { useWizard } from "./WizardContext";

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -28 : 28, opacity: 0 }),
};

interface WizardShellProps {
  children: React.ReactNode;
  canContinue: boolean;
  isSaving: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onClose: () => void;
  error?: string | null;
}

export function WizardShell({
  children,
  canContinue,
  isSaving,
  isLastStep,
  onNext,
  onClose,
  error,
}: WizardShellProps) {
  const t = useTranslations("wizard");
  const tc = useTranslations("common");
  const tConfirm = useTranslations("wizard.steps.confirm");
  const { currentStep, direction, goBack } = useWizard();
  const progress = (currentStep / WIZARD_TOTAL_STEPS) * 100;

  return (
    <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg">
            <Logo variant="mark" theme="dark" className="h-7 w-7 [&>svg]:h-7 [&>svg]:w-7" />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Klyro
          </span>
        </div>

        <span className="text-xs text-[var(--color-text-muted)]">
          {t("stepLabel", { current: currentStep, total: WIZARD_TOTAL_STEPS })}
        </span>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] w-full shrink-0 bg-[var(--color-bg-elevated)]">
        <motion.div
          className="h-full bg-[var(--color-violet)]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--color-bg-base)]/60 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goBack}
            disabled={currentStep === 1 || isSaving}
            className="flex items-center gap-1.5 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            {tc("back")}
          </button>

          <button
            onClick={onNext}
            disabled={!canContinue || isSaving}
            className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-[var(--color-violet)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-violet-hover)] disabled:pointer-events-none disabled:opacity-40"
          >
            {isSaving
              ? t("saving")
              : isLastStep
                ? tConfirm("launchButton")
                : tc("continue")}
            {!isSaving && !isLastStep && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
