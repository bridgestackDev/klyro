import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBusinessBySlug,
  getBranchByBizAndSlug,
  getStaffByBranchAndSlug,
  getActiveServicesForStaff,
} from "@/lib/booking/queries";
import { BookingFlow } from "./_components/BookingFlow";
import type { BookingMessages } from "./_components/BookingFlow";
import type { CountryCode } from "@/lib/i18n/countries";
import esMessages from "@/i18n/locales/es.json";
import enMessages from "@/i18n/locales/en.json";

interface Props {
  params: Promise<{
    businessSlug: string;
    branchSlug: string;
    staffSlug: string;
    locale: string;
  }>;
}

export default async function BookingPage({ params }: Props) {
  const { businessSlug, branchSlug, staffSlug, locale } = await params;

  const business = await getBusinessBySlug(businessSlug);
  if (!business) notFound();

  const branch = await getBranchByBizAndSlug(business.id, branchSlug);
  if (!branch) notFound();

  const staff = await getStaffByBranchAndSlug(branch.id, staffSlug);
  if (!staff) notFound();

  const services = await getActiveServicesForStaff(staff.id, branch.id);

  // Business language overrides URL locale (locked decision)
  const lang = (business.default_language ?? "es").startsWith("en") ? "en" : "es";
  const rawMessages = lang === "en" ? enMessages : esMessages;

  const messages: BookingMessages = {
    business: rawMessages.booking.business,
    flow: rawMessages.booking.flow,
    form: rawMessages.booking.form,
    success: rawMessages.booking.success,
    errors: rawMessages.booking.errors,
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg-light)", minHeight: "100vh" }}>
      {/* Back nav above the booking flow */}
      <div
        className="px-4 pt-3 pb-1 border-b"
        style={{
          borderColor: "var(--border-on-light)",
          backgroundColor: "var(--color-bg-light-surface)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <Link
            href={`/${locale}/${businessSlug}/${branchSlug}`}
            className="text-xs"
            style={{ color: "var(--color-text-on-light-muted)" }}
          >
            ← {branch.name}
          </Link>
        </div>
      </div>

      <BookingFlow
        staffId={staff.id}
        branchId={branch.id}
        staffName={staff.display_name}
        staffAvatar={staff.avatar_url ?? null}
        businessCountry={(business.country as CountryCode) ?? "HN"}
        businessTimezone={branch.timezone ?? "America/Tegucigalpa"}
        businessLanguage={business.default_language ?? "es"}
        services={services}
        messages={messages}
      />
    </div>
  );
}
