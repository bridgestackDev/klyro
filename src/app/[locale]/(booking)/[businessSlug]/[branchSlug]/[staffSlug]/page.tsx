import { notFound } from "next/navigation";
import {
  getBusinessBySlug,
  getBranchByBizAndSlug,
  getStaffByBranchAndSlug,
} from "@/lib/booking/queries";

interface Props {
  params: Promise<{
    businessSlug: string;
    branchSlug: string;
    staffSlug: string;
    locale: string;
  }>;
}

export default async function BookingPage({ params }: Props) {
  const { businessSlug, branchSlug, staffSlug } = await params;

  const business = await getBusinessBySlug(businessSlug);
  if (!business) notFound();

  const branch = await getBranchByBizAndSlug(business.id, branchSlug);
  if (!branch) notFound();

  const staff = await getStaffByBranchAndSlug(branch.id, staffSlug);
  if (!staff) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)] p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-on-light)]">
        {staff.display_name}
      </h1>
    </div>
  );
}
