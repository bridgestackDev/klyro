import { notFound } from "next/navigation";
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

  // Load services for each staff member (same set per branch for MVP)
  // We use the first staff member's services as the branch service list
  const firstStaff = staff[0];
  const services =
    firstStaff !== undefined
      ? await getActiveServicesForStaff(firstStaff.id, branch.id)
      : [];

  // Business language overrides URL locale (locked decision)
  const lang = (business.default_language ?? "es").startsWith("en") ? "en" : "es";
  const m = lang === "en" ? enMessages.booking : esMessages.booking;

  const vertical = VERTICALS[business.vertical as VerticalKey];
  const staffNoun = vertical?.bookingPageHints.staffNoun[lang] ?? (lang === "en" ? "professional" : "profesional");

  const countryCode = (business.country as CountryCode) ?? "HN";
  const countryLocale = COUNTRIES[countryCode]?.locale ?? "es-HN";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-light)" }}>
      {/* Header */}
      <header
        className="px-4 py-4 border-b sticky top-0 z-10"
        style={{ borderColor: "var(--border-on-light)", backgroundColor: "var(--color-bg-light-surface)" }}
      >
        <div className="max-w-lg mx-auto">
          <Link
            href={`/${locale}/${businessSlug}`}
            className="text-xs mb-1 block"
            style={{ color: "var(--color-text-on-light-muted)" }}
          >
            ← {business.name}
          </Link>
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.name}
                width={28}
                height={28}
                className="rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <Logo variant="mark" theme="light" className="flex-shrink-0 scale-75 origin-left" />
            )}
            <h1
              className="text-base font-bold truncate"
              style={{ color: "var(--color-text-on-light)" }}
            >
              {branch.name}
            </h1>
          </div>
          {(branch.address || branch.city) && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-on-light-muted)" }}>
              {[branch.address, branch.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-8">
        {/* Services section */}
        {services.length > 0 && (
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-on-light-muted)" }}
            >
              {m.branch.servicesLabel}
            </h2>
            <div className="flex flex-col gap-2">
              {services.map((svc) => {
                const price = svc.price_override ?? svc.price ?? 0;
                const currency = svc.currency ?? "HNL";
                return (
                  <div
                    key={svc.id}
                    className="rounded-xl border px-4 py-3 flex items-center justify-between"
                    style={{
                      backgroundColor: "var(--color-bg-light-surface)",
                      borderColor: "var(--border-on-light)",
                    }}
                  >
                    <div>
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
                        {svc.duration_minutes} {lang === "en" ? "min" : "min"}
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

        {/* Staff section */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-text-on-light-muted)" }}
          >
            {m.branch.staffLabel}{staffNoun !== "profesional" && staffNoun !== "professional" ? ` — ${staffNoun}` : ""}
          </h2>

          {staff.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-on-light-muted)" }}>
              {lang === "en" ? "No staff available" : "No hay personal disponible"}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {staff.map((member) => (
                <Link
                  key={member.id}
                  href={`/${locale}/${businessSlug}/${branchSlug}/${member.slug}`}
                  className="rounded-2xl border p-4 flex items-center gap-3 transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: "var(--color-bg-light-surface)",
                    borderColor: "var(--border-on-light)",
                  }}
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt={member.display_name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: "var(--color-violet)" }}
                    >
                      {getInitials(member.display_name)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-semibold text-sm truncate"
                      style={{ color: "var(--color-text-on-light)" }}
                    >
                      {member.display_name}
                    </div>
                    <div
                      className="text-sm mt-0.5"
                      style={{ color: "var(--color-violet)" }}
                    >
                      {lang === "en"
                        ? `Book with ${member.display_name}`
                        : `Reservar con ${member.display_name}`}{" "}
                      →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8">
        <span className="text-xs" style={{ color: "var(--color-text-on-light-muted)" }}>
          {m.business.poweredBy}{" "}
        </span>
        <Logo variant="wordmark" theme="light" className="inline-block align-middle" />
      </footer>
    </div>
  );
}
