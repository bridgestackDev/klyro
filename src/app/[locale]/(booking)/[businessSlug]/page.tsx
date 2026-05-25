import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getBusinessBySlug,
  getBranchesForBusiness,
} from "@/lib/booking/queries";
import { Logo } from "@/components/shared/Logo";
import { VERTICALS } from "@/lib/verticals/registry";
import type { VerticalKey } from "@/lib/verticals/registry";
import esMessages from "@/i18n/locales/es.json";
import enMessages from "@/i18n/locales/en.json";

interface Props {
  params: Promise<{ businessSlug: string; locale: string }>;
}

export default async function BusinessLandingPage({ params }: Props) {
  const { businessSlug, locale } = await params;

  const business = await getBusinessBySlug(businessSlug);
  if (!business) notFound();

  const branches = await getBranchesForBusiness(business.id);
  if (branches.length === 0) notFound();

  // Single-branch: skip this page and go straight to the branch
  if (branches.length === 1) {
    redirect(`/${locale}/${businessSlug}/${branches[0]!.slug}`);
  }

  // Business language overrides URL locale (locked decision)
  const lang = (business.default_language ?? "es").startsWith("en") ? "en" : "es";
  const m = lang === "en" ? enMessages.booking : esMessages.booking;

  const vertical = VERTICALS[business.vertical as VerticalKey];
  const appointmentNoun =
    vertical?.bookingPageHints.appointmentNoun[lang] ?? (lang === "en" ? "appointment" : "cita");
  const tagline = `${m.business.bookPrefix} ${appointmentNoun}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-light)" }}>
      {/* Header */}
      <header
        className="px-4 py-4 border-b"
        style={{ borderColor: "var(--border-on-light)", backgroundColor: "var(--color-bg-light-surface)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={40}
              height={40}
              className="rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <Logo variant="mark" theme="light" className="flex-shrink-0" />
          )}
          <span
            className="text-base font-bold truncate"
            style={{ color: "var(--color-text-on-light)" }}
          >
            {business.name}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 pt-8 pb-16 max-w-lg mx-auto">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--color-text-on-light)" }}
        >
          {tagline}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--color-text-on-light-muted)" }}
        >
          {m.business.chooseBranch}
        </p>

        <div className="flex flex-col gap-3">
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/${locale}/${businessSlug}/${branch.slug}`}
              className="block rounded-2xl border p-4 transition-all hover:shadow-sm"
              style={{
                backgroundColor: "var(--color-bg-light-surface)",
                borderColor: "var(--border-on-light)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="font-semibold truncate"
                    style={{ color: "var(--color-text-on-light)" }}
                  >
                    {branch.name}
                  </div>
                  {(branch.address || branch.city) && (
                    <div
                      className="text-sm mt-0.5 truncate"
                      style={{ color: "var(--color-text-on-light-muted)" }}
                    >
                      {[branch.address, branch.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <span
                  className="text-sm font-medium flex-shrink-0"
                  style={{ color: "var(--color-violet)" }}
                >
                  {m.business.viewAvailability} →
                </span>
              </div>
            </Link>
          ))}
        </div>
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
