import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Footer() {
  const [t, locale] = await Promise.all([
    getTranslations("landing"),
    getLocale(),
  ]);

  return (
    <footer
      className="border-t px-6 pt-12 pb-8 bg-[var(--color-bg-base)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Left: logo + tagline */}
          <div className="flex flex-col gap-3">
            <div className="w-[120px]">
              <Logo variant="lockup" theme="dark" />
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Middle: Product */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              {t("footer.productHeading")}
            </p>
            <Link
              href={`/${locale}/login`}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
            >
              {t("footer.productLinks.signIn")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
            >
              {t("footer.productLinks.signUp")}
            </Link>
          </div>

          {/* Right: Company */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              {t("footer.companyHeading")}
            </p>
            <a
              href="#"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
            >
              {t("footer.companyLinks.about")}
            </a>
            <a
              href="mailto:hola@klyro.app"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
            >
              {t("footer.companyLinks.contact")}
            </a>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("footer.copyright")}
          </p>
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
    </footer>
  );
}
