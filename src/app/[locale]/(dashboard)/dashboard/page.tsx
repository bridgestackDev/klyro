import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { SetupLogoBanner } from "@/components/dashboard/SetupLogoBanner";

async function getSetupStatus(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("business_id, businesses(onboarding_completed, logo_url)")
    .eq("id", userId)
    .single();

  if (!data?.business_id) return { needsSetup: true, logoUrl: null, onboardingCompleted: false };
  const biz = Array.isArray(data.businesses)
    ? data.businesses[0]
    : data.businesses;
  return {
    needsSetup: !biz?.onboarding_completed,
    logoUrl: (biz?.logo_url as string | null) ?? null,
    onboardingCompleted: biz?.onboarding_completed ?? false,
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { needsSetup, logoUrl, onboardingCompleted } = user
    ? await getSetupStatus(user.id)
    : { needsSetup: false, logoUrl: null, onboardingCompleted: false };

  const displayName =
    user?.user_metadata?.["full_name"] ??
    user?.user_metadata?.["name"] ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("welcome")}{displayName ? `, ${displayName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t("title")}
        </p>
      </div>

      {/* Logo nudge — shown when onboarding is done but logo hasn't been uploaded */}
      <SetupLogoBanner
        logoUrl={logoUrl}
        onboardingCompleted={onboardingCompleted}
        locale={locale}
      />

      {/* Setup banner */}
      {needsSetup && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-[var(--color-bg-surface)] p-6 shadow-[0_4px_24px_rgba(109,100,251,0.12)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {t("setup.bannerTitle")}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("setup.bannerDesc")}
              </p>
            </div>
            <Link
              href={`/${locale}/setup`}
              className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-violet)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-violet-hover)]"
            >
              {t("setup.bannerCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Checklist preview */}
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-3">
            {([
              t("setup.checklistStep1"),
              t("setup.checklistStep2"),
              t("setup.checklistStep3"),
            ] as const).map((step) => (
              <div
                key={step}
                className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"
              >
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]/40" />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder content when setup is done */}
      {!needsSetup && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("placeholder")}
          </p>
        </div>
      )}
    </div>
  );
}
