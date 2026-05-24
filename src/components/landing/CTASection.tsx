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
      className="relative flex min-h-[40vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center bg-[var(--color-bg-base)]"
    >
      {/* Radial violet glow behind content */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(109,100,251,0.13) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      {/* Top hairline accent */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(109,100,251,0.5) 50%, transparent 100%)" }}
        aria-hidden="true"
      />

      <p className="relative z-10 mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-violet)]">
        {t("cta.eyebrow")}
      </p>
      <h2
        id="cta-headline"
        className="relative z-10 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-4xl"
      >
        {t("cta.headline")}
      </h2>
      <p className="relative z-10 mt-4 max-w-md text-lg leading-relaxed text-[var(--color-text-secondary)]">
        {t("cta.sub")}
      </p>
      <Link
        href={`/${locale}/login`}
        className="relative z-10 mt-8 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-violet)] px-8 py-3 text-base font-semibold text-white hover:bg-[var(--color-violet-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]"
        style={{ boxShadow: "0 0 0 1px rgba(109,100,251,0.4), 0 8px 32px rgba(109,100,251,0.28)" }}
      >
        {t("cta.ctaPrimary")}
      </Link>
      <p className="relative z-10 mt-3 text-sm text-[var(--color-text-muted)]">
        {t("cta.footnote")}
      </p>
    </section>
  );
}
