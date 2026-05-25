import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type BranchServiceRow = Database["public"]["Tables"]["branch_services"]["Row"];

export type BookingBusiness = Pick<
  BusinessRow,
  "id" | "name" | "slug" | "vertical" | "country" | "default_language" | "logo_url"
>;

export type BookingBranch = Pick<
  BranchRow,
  "id" | "name" | "slug" | "address" | "city" | "timezone" | "phone" | "business_id"
>;

export type BookingStaff = Pick<
  StaffRow,
  "id" | "display_name" | "slug" | "avatar_url" | "business_id"
>;

export type BookingService = Pick<
  ServiceRow,
  "id" | "name" | "duration_minutes" | "price" | "currency"
> & {
  price_override: BranchServiceRow["price_override"];
};

function getAnonClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getBusinessBySlug(
  slug: string
): Promise<BookingBusiness | null> {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, vertical, country, default_language, logo_url")
    .eq("slug", slug)
    .eq("onboarding_completed", true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getBranchByBizAndSlug(
  bizId: string,
  branchSlug: string
): Promise<BookingBranch | null> {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, slug, address, city, timezone, phone, business_id")
    .eq("business_id", bizId)
    .eq("slug", branchSlug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getStaffByBranchAndSlug(
  branchId: string,
  staffSlug: string
): Promise<BookingStaff | null> {
  const supabase = getAnonClient();
  // Staff must be linked to the branch via staff_branches
  const { data, error } = await supabase
    .from("staff")
    .select(
      "id, display_name, slug, avatar_url, business_id, staff_branches!inner(branch_id)"
    )
    .eq("slug", staffSlug)
    .eq("is_active", true)
    .eq("staff_branches.branch_id", branchId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    display_name: data.display_name,
    slug: data.slug,
    avatar_url: data.avatar_url,
    business_id: data.business_id,
  };
}

export async function getActiveServicesForStaff(
  staffId: string,
  branchId: string
): Promise<BookingService[]> {
  const supabase = getAnonClient();
  // All active services linked to the branch via branch_services.
  // There's no staff_services junction — any branch service is available
  // for any staff member assigned to that branch (MVP assumption).
  // We verify staff membership in the branch separately to avoid
  // exposing services from branches the staff isn't in.
  const { data: staffBranch } = await supabase
    .from("staff_branches")
    .select("branch_id")
    .eq("staff_id", staffId)
    .eq("branch_id", branchId)
    .single();

  if (!staffBranch) return [];

  const { data, error } = await supabase
    .from("branch_services")
    .select("price_override, services!inner(id, name, duration_minutes, price, currency)")
    .eq("branch_id", branchId)
    .eq("services.is_active", true);

  if (error || !data) return [];

  return data.map((row) => {
    const svc = row.services as unknown as ServiceRow;
    return {
      id: svc.id,
      name: svc.name,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      currency: svc.currency,
      price_override: row.price_override,
    };
  });
}

export async function getBranchCountForBusiness(
  bizId: string
): Promise<number> {
  const supabase = getAnonClient();
  const { count } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("business_id", bizId)
    .eq("is_active", true);

  return count ?? 0;
}

export async function getBranchesForBusiness(
  bizId: string
): Promise<BookingBranch[]> {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, slug, address, city, timezone, phone, business_id")
    .eq("business_id", bizId)
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];
  return data;
}

export async function getStaffForBranch(
  branchId: string
): Promise<BookingStaff[]> {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      "id, display_name, slug, avatar_url, business_id, staff_branches!inner(branch_id)"
    )
    .eq("is_active", true)
    .eq("staff_branches.branch_id", branchId);

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    slug: row.slug,
    avatar_url: row.avatar_url,
    business_id: row.business_id,
  }));
}
