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

  const lang = (business.default_language ?? "es").startsWith("en") ? "en" : "es";
  if (locale !== lang) {
    redirect(`/${lang}/${businessSlug}`);
  }
  const m = lang === "en" ? enMessages.booking : esMessages.booking;

  const vertical = VERTICALS[business.vertical as VerticalKey];
  const appointmentNoun =
    vertical?.bookingPageHints.appointmentNoun[lang] ?? (lang === "en" ? "appointment" : "cita");
  const tagline = `${m.business.bookPrefix} ${appointmentNoun}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-light)" }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="border-b"
        style={{
          borderColor: "var(--border-on-light)",
          backgroundColor: "var(--color-bg-light-surface)",
        }}
      >
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-3">
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={48}
              height={48}
              className="rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(109,100,251,0.1)" }}
            >
              <Logo variant="mark" theme="light" className="scale-75" />
            </div>
          )}
          <div className="min-w-0">
            <div
              className="text-base font-bold truncate"
              style={{ color: "var(--color-text-on-light)" }}
            >
              {business.name}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-8 pb-6 max-w-lg mx-auto"
        style={{ borderBottom: "1px solid var(--border-on-light)" }}
      >
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-on-light)" }}
        >
          {tagline}
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--color-text-on-light-muted)" }}
        >
          {m.business.chooseBranch}
        </p>
      </div>

      {/* ── Branch list ──────────────────────────────────────────────────── */}
      <main className="px-4 pt-5 pb-20 max-w-lg mx-auto">
        <div className="flex flex-col gap-3">
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/${locale}/${businessSlug}/${branch.slug}`}
              className="block rounded-2xl border transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "var(--color-bg-light-surface)",
                borderColor: "var(--border-on-light)",
                padding: "16px",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Branch icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(109,100,251,0.1)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 2C6.24 2 4 4.24 4 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                      fill="var(--color-violet)"
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div
                    className="font-semibold text-sm truncate"
                    style={{ color: "var(--color-text-on-light)" }}
                  >
                    {branch.name}
                  </div>
                  {(branch.address ?? branch.city) && (
                    <div
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--color-text-on-light-muted)" }}
                    >
                      {[branch.address, branch.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="flex-shrink-0"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="var(--color-violet)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
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
