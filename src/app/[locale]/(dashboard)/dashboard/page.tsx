import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, CheckCircle, CalendarDays, Users, LinkIcon } from "lucide-react";
import { SetupLogoBanner } from "@/components/dashboard/SetupLogoBanner";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  TodayAppointments,
  type TodayAppointmentItem,
} from "@/components/dashboard/TodayAppointments";
import {
  deriveHomeData,
  homeFetchWindow,
  type RawAppointmentRow,
  type AppointmentStatus,
} from "@/lib/dashboard/home-data";
import { formatTime } from "@/lib/format/date";

const DEFAULT_TZ = "America/Tegucigalpa";

interface BusinessContext {
  needsSetup: boolean;
  logoUrl: string | null;
  onboardingCompleted: boolean;
  businessId: string | null;
  timezone: string;
}

async function getBusinessContext(userId: string): Promise<BusinessContext> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select(
      "business_id, businesses(onboarding_completed, logo_url, branches(timezone, is_active))"
    )
    .eq("id", userId)
    .single();

  const empty: BusinessContext = {
    needsSetup: true,
    logoUrl: null,
    onboardingCompleted: false,
    businessId: null,
    timezone: DEFAULT_TZ,
  };

  if (!data?.business_id) return empty;

  const biz = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  if (!biz) return empty;

  type BranchRow = { timezone: string; is_active: boolean };
  const rawBranches = biz.branches as BranchRow | BranchRow[] | null;
  const branches: BranchRow[] = Array.isArray(rawBranches)
    ? rawBranches
    : rawBranches
      ? [rawBranches]
      : [];
  const timezone =
    branches.find((b) => b.is_active)?.timezone ?? branches[0]?.timezone ?? DEFAULT_TZ;

  return {
    needsSetup: !biz.onboarding_completed,
    logoUrl: (biz.logo_url as string | null) ?? null,
    onboardingCompleted: biz.onboarding_completed ?? false,
    businessId: data.business_id,
    timezone,
  };
}

async function getHomeData(timezone: string) {
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = homeFetchWindow(now, timezone);

  // RLS scopes appointments to the owner's business — no manual business_id filter.
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, clients(full_name), services(name), staff(display_name)"
    )
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });

  return deriveHomeData((data ?? []) as RawAppointmentRow[], now, timezone);
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

  const ctx = user
    ? await getBusinessContext(user.id)
    : {
        needsSetup: false,
        logoUrl: null,
        onboardingCompleted: false,
        businessId: null,
        timezone: DEFAULT_TZ,
      };
  const { needsSetup, logoUrl, onboardingCompleted, timezone } = ctx;

  const home = needsSetup ? null : await getHomeData(timezone);

  const statusLabel = (status: AppointmentStatus) => t(`home.status.${status}`);
  const todayItems: TodayAppointmentItem[] = (home?.today ?? []).map((appt) => ({
    id: appt.id,
    time: formatTime(appt.startsAt, locale),
    clientName: appt.clientName,
    serviceName: appt.serviceName,
    staffName: appt.staffName,
    status: appt.status,
    statusLabel: statusLabel(appt.status),
  }));

  const displayName =
    user?.user_metadata?.["full_name"] ??
    user?.user_metadata?.["name"] ??
    user?.email?.split("@")[0] ??
    "";

  const quickLinks = [
    { href: `/${locale}/agenda`, label: t("home.quickLinks.agenda"), icon: CalendarDays },
    { href: `/${locale}/team`, label: t("home.quickLinks.team"), icon: Users },
    { href: `/${locale}/links`, label: t("home.quickLinks.links"), icon: LinkIcon },
  ];

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

      {/* Operational view — shown once setup is complete */}
      {!needsSetup && home && (
        <>
          {/* TODO(phase-5-block-e): subscribe to Supabase Realtime on
              appointments:{businessId} to live-refresh these KPIs and the list. */}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label={t("home.kpi.today")} value={home.kpis.today} />
            <KpiCard label={t("home.kpi.upcomingWeek")} value={home.kpis.upcomingWeek} />
            <KpiCard label={t("home.kpi.completedToday")} value={home.kpis.completedToday} />
            <KpiCard label={t("home.kpi.noShowsWeek")} value={home.kpis.noShowsWeek} />
          </div>

          {/* Today's appointments */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t("home.todayHeading")}
            </h2>
            <TodayAppointments
              appointments={todayItems}
              emptyTitle={t("home.empty")}
            />
          </section>

          {/* Quick links */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t("home.quickLinks.heading")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-colors hover:bg-[var(--color-bg-hover)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-violet)]/12 text-[var(--color-violet)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
