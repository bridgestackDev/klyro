"use client";

import { useRouter, usePathname } from "next/navigation";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    const withoutLocale = pathname.replace(/^\/(es|en)/, "");
    router.replace(`/${next}${withoutLocale}`);
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <button
        onClick={() => switchLocale("es")}
        disabled={currentLocale === "es"}
        aria-current={currentLocale === "es" ? "true" : undefined}
        className={
          currentLocale === "es"
            ? "font-semibold text-[var(--color-text-primary)] cursor-default"
            : "hover:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
        }
      >
        ES
      </button>
      <span aria-hidden="true">|</span>
      <button
        onClick={() => switchLocale("en")}
        disabled={currentLocale === "en"}
        aria-current={currentLocale === "en" ? "true" : undefined}
        className={
          currentLocale === "en"
            ? "font-semibold text-[var(--color-text-primary)] cursor-default"
            : "hover:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet)] rounded-sm"
        }
      >
        EN
      </button>
    </div>
  );
}
