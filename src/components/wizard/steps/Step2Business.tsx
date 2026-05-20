"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { slugify } from "@/lib/validation";
import { useWizard } from "../WizardContext";

export function Step2Business() {
  const t = useTranslations("wizard.steps.business");
  const { data, updateData } = useWizard();
  const { name, slug } = data.step2;

  // Auto-generate slug from name when slug hasn't been manually edited
  useEffect(() => {
    if (name && !data.step2.slug) {
      updateData({ step2: { ...data.step2, slug: slugify(name) } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameChange = (value: string) => {
    updateData({
      step2: {
        name: value,
        slug: slugify(value),
      },
    });
  };

  const handleSlugChange = (value: string) => {
    updateData({
      step2: {
        ...data.step2,
        slug: value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      },
    });
  };

  const slugError =
    slug.length > 0 && !/^[a-z0-9-]+$/.test(slug)
      ? t("slugError")
      : null;

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
            htmlFor="biz-name"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("nameLabel")}
          </label>
          <input
            id="biz-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={100}
            className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-violet)] focus:ring-1 focus:ring-[var(--color-violet)]"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="biz-slug"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("slugLabel")}
          </label>
          <div className="flex overflow-hidden rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] transition-colors focus-within:border-[var(--color-violet)] focus-within:ring-1 focus-within:ring-[var(--color-violet)]">
            <span className="flex items-center border-r border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2.5 text-xs text-[var(--color-text-muted)] select-none">
              {t("slugPrefix")}
            </span>
            <input
              id="biz-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="mi-negocio"
              maxLength={50}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
            />
          </div>
          {slugError ? (
            <p className="text-xs text-[var(--color-danger)]">{slugError}</p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("slugHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
