import { notFound } from "next/navigation";
import {
  getBusinessBySlug,
  getBranchCountForBusiness,
} from "@/lib/booking/queries";

interface Props {
  params: Promise<{ businessSlug: string; locale: string }>;
}

export default async function BusinessLandingPage({ params }: Props) {
  const { businessSlug } = await params;
  const business = await getBusinessBySlug(businessSlug);

  if (!business) notFound();

  const branchCount = await getBranchCountForBusiness(business.id);

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)] p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-on-light)]">
        {business.name}
      </h1>
      <p className="text-[var(--color-text-on-light)] mt-2">
        {branchCount} {branchCount === 1 ? "sucursal" : "sucursales"}
      </p>
    </div>
  );
}
