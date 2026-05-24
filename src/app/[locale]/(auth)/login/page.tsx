import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/shared/Logo";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { LoginForm } from "./LoginForm";

export async function generateMetadata() {
  const t = await getTranslations("auth.login");
  return { title: `${t("title")} — Klyro` };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("auth.login");
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg-base)] p-4">
      <HeroBackground />
      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo variant="lockup" theme="dark" />
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-8 shadow-[0_8px_32px_rgba(109,100,251,0.10)]">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t("subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
              {decodeURIComponent(error)}
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
