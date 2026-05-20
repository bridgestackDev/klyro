"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWizard } from "../WizardContext";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export function Step5Staff({ ownerDisplayName }: { ownerDisplayName: string }) {
  const t = useTranslations("wizard.steps.staff");
  const { data, updateData } = useWizard();
  const { ownerName, ownerSlug } = data.step5;

  // Pre-fill with the owner's display name on first visit
  useEffect(() => {
    if (!ownerName && ownerDisplayName) {
      updateData({
        step5: {
          ownerName: ownerDisplayName,
          ownerSlug: toSlug(ownerDisplayName),
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameChange = (value: string) => {
    updateData({
      step5: {
        ownerName: value,
        ownerSlug: toSlug(value),
      },
    });
  };

  const handleSlugChange = (value: string) => {
    updateData({
      step5: {
        ...data.step5,
        ownerSlug: value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="staff-name"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("nameLabel")}
          </label>
          <input
            id="staff-name"
            type="text"
            value={ownerName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={100}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="staff-slug"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("slugLabel")}
          </label>
          <input
            id="staff-slug"
            type="text"
            value={ownerSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="carlos-garcia"
            maxLength={50}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("slugHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
