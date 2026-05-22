import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import Link from "next/link";

export async function CTASection() {
  const [t, locale] = await Promise.all([
    getTranslations("landing"),
    getLocale(),
  ]);

  return (
    <section
      id="cta"
      aria-labelledby="cta-headline"
      className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-20 text-center bg-[var(--color-bg-surface)]"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-violet)]">
        {t("cta.eyebrow")}
      </p>
      <h2
        id="cta-headline"
        className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-4xl"
      >
        {t("cta.headline")}
      </h2>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-[var(--color-text-secondary)]">
        {t("cta.sub")}
      </p>
      <Link
        href={`/${locale}/login`}
        className="mt-8 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-violet)] px-8 py-3 text-base font-semibold text-white shadow-[var(--shadow-violet)] hover:bg-[var(--color-violet-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface)]"
      >
        {t("cta.ctaPrimary")}
      </Link>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        {t("cta.footnote")}
      </p>
    </section>
  );
}
