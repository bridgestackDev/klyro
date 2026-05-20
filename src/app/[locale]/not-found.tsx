import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default async function NotFoundPage() {
  const t = await getTranslations("errors");

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center p-6 text-center">
      <Logo variant="mark" className="mb-6" />
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2">
        {t("notFound.title")}
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-8 max-w-sm">
        {t("notFound.body")}
      </p>
      <Link
        href="/"
        className="rounded-[var(--radius-button)] bg-[var(--color-violet)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-violet-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
      >
        {t("notFound.cta")}
      </Link>
    </div>
  );
}
