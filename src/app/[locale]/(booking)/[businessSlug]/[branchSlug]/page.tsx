import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getBusinessBySlug,
  getBranchByBizAndSlug,
  getActiveServicesForStaff,
  getStaffForBranch,
} from "@/lib/booking/queries";
import { Logo } from "@/components/shared/Logo";
import { VERTICALS } from "@/lib/verticals/registry";
import type { VerticalKey } from "@/lib/verticals/registry";
import { formatCurrency } from "@/lib/format/currency";
import { getInitials } from "@/lib/format";
import { COUNTRIES } from "@/lib/i18n/countries";
import type { CountryCode } from "@/lib/i18n/countries";
import esMessages from "@/i18n/locales/es.json";
import enMessages from "@/i18n/locales/en.json";

interface Props {
  params: Promise<{ businessSlug: string; branchSlug: string; locale: string }>;
}

export default async function BranchPage({ params }: Props) {
  const { businessSlug, branchSlug, locale } = await params;

  const business = await getBusinessBySlug(businessSlug);
  if (!business) notFound();

  const branch = await getBranchByBizAndSlug(business.id, branchSlug);
  if (!branch) notFound();

  const staff = await getStaffForBranch(branch.id);

  const firstStaff = staff[0];
  const services =
    firstStaff !== undefined
      ? await getActiveServicesForStaff(firstStaff.id, branch.id)
      : [];

  const lang = (business.default_language ?? "es").startsWith("en") ? "en" : "es";
  if (locale !== lang) {
    redirect(`/${lang}/${businessSlug}/${branchSlug}`);
  }
  const m = lang === "en" ? enMessages.booking : esMessages.booking;

  const vertical = VERTICALS[business.vertical as VerticalKey];
  const staffNoun =
    vertical?.bookingPageHints.staffNoun[lang] ??
    (lang === "en" ? "professional" : "profesional");

  const countryCode = (business.country as CountryCode) ?? "HN";
  const countryLocale = COUNTRIES[countryCode]?.locale ?? "es-HN";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-light)" }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          borderColor: "var(--border-on-light)",
          backgroundColor: "var(--color-bg-light-surface)",
        }}
      >
        <div className="px-4 py-3 max-w-lg mx-auto">
          {/* Back link */}
          <Link
            href={`/${locale}/${businessSlug}`}
            className="text-sm font-medium inline-flex items-center gap-1 mb-1"
            style={{ color: "var(--color-violet)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M9 11L5 7l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {business.name}
          </Link>

          {/* Branch name row */}
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.name}
                width={28}
                height={28}
                className="rounded-lg object-cover flex-shrink-0"
              />
            ) : null}
            <h1
              className="text-base font-bold truncate"
              style={{ color: "var(--color-text-on-light)" }}
            >
              {branch.name}
            </h1>
          </div>

          {(branch.address ?? branch.city) && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-on-light-muted)" }}
            >
              {[branch.address, branch.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </header>

      <main className="px-4 py-6 pb-20 max-w-lg mx-auto space-y-8">
        {/* ── Services ──────────────────────────────────────────────────── */}
        {services.length > 0 && (
          <section>
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-on-light-muted)" }}
            >
              {m.branch.servicesLabel}
            </h2>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                backgroundColor: "var(--color-bg-light-surface)",
                borderColor: "var(--border-on-light)",
              }}
            >
              {services.map((svc, idx) => {
                const price = svc.price_override ?? svc.price ?? 0;
                const currency = svc.currency ?? "HNL";
                return (
                  <div
                    key={svc.id}
                    className="px-4 py-3.5 flex items-center justify-between"
                    style={{
                      borderTop:
                        idx > 0 ? "1px solid var(--border-on-light)" : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="font-medium text-sm"
                        style={{ color: "var(--color-text-on-light)" }}
                      >
                        {svc.name}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-text-on-light-muted)" }}
                      >
                        {svc.duration_minutes} min
                      </div>
                    </div>
                    {price > 0 && (
                      <div
                        className="text-sm font-semibold ml-4 flex-shrink-0"
                        style={{ color: "var(--color-text-on-light)" }}
                      >
                        {formatCurrency(price, currency, countryLocale)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Staff ─────────────────────────────────────────────────────── */}
        <section>
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-text-on-light-muted)" }}
          >
            {lang === "en"
              ? `Book with a ${staffNoun}`
              : `Reservar con un ${staffNoun}`}
          </h2>

          {staff.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "var(--color-text-on-light-muted)" }}
            >
              {lang === "en" ? "No staff available" : "No hay personal disponible"}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {staff.map((member) => (
                <Link
                  key={member.id}
                  href={`/${locale}/${businessSlug}/${branchSlug}/${member.slug}`}
                  className="rounded-2xl border flex items-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--color-bg-light-surface)",
                    borderColor: "var(--border-on-light)",
                    padding: "14px",
                  }}
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt={member.display_name}
                      width={52}
                      height={52}
                      className="rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-13 h-13 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{
                        width: "52px",
                        height: "52px",
                        backgroundColor: "var(--color-violet)",
                        fontSize: "16px",
                      }}
                    >
                      {getInitials(member.display_name)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-semibold text-sm"
                      style={{ color: "var(--color-text-on-light)" }}
                    >
                      {member.display_name}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-text-on-light-muted)" }}
                    >
                      {lang === "en" ? "Tap to see availability" : "Ver disponibilidad"}
                    </div>
                  </div>

                  {/* CTA */}
                  <div
                    className="flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: "var(--color-violet)" }}
                  >
                    {lang === "en" ? "Book" : "Reservar"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="text-center pb-8">
        <span className="text-xs" style={{ color: "var(--color-text-on-light-muted)" }}>
          {m.business.poweredBy}{" "}
        </span>
        <Logo variant="wordmark" theme="light" className="inline-block align-middle" />
      </footer>
    </div>
  );
}
