import { notFound } from "next/navigation";
import {
  getBusinessBySlug,
  getBranchByBizAndSlug,
} from "@/lib/booking/queries";

interface Props {
  params: Promise<{ businessSlug: string; branchSlug: string; locale: string }>;
}

export default async function BranchPage({ params }: Props) {
  const { businessSlug, branchSlug } = await params;

  const business = await getBusinessBySlug(businessSlug);
  if (!business) notFound();

  const branch = await getBranchByBizAndSlug(business.id, branchSlug);
  if (!branch) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)] p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-on-light)]">
        {branch.name}
      </h1>
      <p className="text-[var(--color-text-on-light)] mt-2">
        {branch.address ?? ""}
        {branch.city ? `, ${branch.city}` : ""}
      </p>
    </div>
  );
}
