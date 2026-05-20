"use client";

import { useState } from "react";
import { Check, Copy, Link } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWizard } from "../WizardContext";

export function Step8Preview() {
  const t = useTranslations("wizard.steps.preview");
  const { data } = useWizard();
  const [copied, setCopied] = useState(false);

  // Use server-confirmed slugs stored in WizardData; fall back to i18n placeholders.
  const bizSlug = data.step2.slug || t("defaultBizSlug");
  const branchSlug = data.branchSlug || t("defaultBranchSlug");
  const staffSlug = data.step5.ownerSlug || t("defaultStaffSlug");

  const bookingUrl = `klyro.app/${bizSlug}/${branchSlug}/${staffSlug}`;
  const fullUrl = `https://${bookingUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("subtitle")}
        </p>
      </div>

      {/* URL card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-violet)]">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-violet)]">
          <Link className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-widest">
            {t("bookingLinkLabel")}
          </span>
        </div>

        <p className="break-all text-lg font-semibold text-[var(--color-text-primary)]">
          {bookingUrl}
        </p>

        <button
          type="button"
          onClick={copy}
          className="mt-4 flex items-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-violet)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-violet-hover)]"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? t("copied") : t("copyLink")}
        </button>
      </div>

      {/* Ready callout */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("readyLabel")}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("readyDesc")}
        </p>
      </div>
    </div>
  );
}
