"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Logo } from "@/components/shared/Logo";
import { HeroAnimation } from "./HeroAnimation";
import { HeroBackground } from "./HeroBackground";

export function Hero() {
  const t = useTranslations("landing");
  const locale = useLocale();

  return (
    <header>
      {/* Sticky nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md"
        style={{ background: "rgba(10,10,31,0.6)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        aria-label="Main navigation"
      >
        <Logo variant="wordmark" theme="dark" />
        <Link
          href={`/${locale}/login`}
          className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] rounded-sm"
        >
          {t("nav.signIn")}
        </Link>
      </nav>

      {/* Hero section */}
      <section
        id="hero"
        aria-labelledby="hero-headline"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center bg-[var(--color-bg-base)]"
      >
        <HeroBackground />

        {/* Content above background */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Booking flow animation */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-10 flex justify-center"
          >
            <HeroAnimation
              labels={{
                client: t("hero.animation.client"),
                booking: t("hero.animation.booking"),
                confirmed: t("hero.animation.confirmed"),
              }}
            />
          </motion.div>

          <motion.h1
            id="hero-headline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
            className="max-w-2xl text-[2rem] leading-tight tracking-tight font-extrabold text-[var(--color-text-primary)] sm:text-5xl"
          >
            {t("hero.headline")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.25 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]"
          >
            {t("hero.subheadline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.35 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-violet)] px-8 py-3 text-base font-semibold text-white shadow-[var(--shadow-violet)] hover:bg-[var(--color-violet-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]"
              style={{ boxShadow: "0 0 0 1px rgba(109,100,251,0.4), 0 8px 32px rgba(109,100,251,0.28)" }}
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] rounded-sm"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </motion.div>
        </div>
      </section>
    </header>
  );
}
