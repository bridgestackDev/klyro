import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "owner" | "staff";

export interface DashboardUser {
  userId: string;
  /** `users.role`. Defaults to `staff` (least privilege) if somehow absent. */
  role: UserRole;
  businessId: string | null;
}

/**
 * Resolve the signed-in dashboard user's role + business.
 * Returns `null` when there is no session. RLS lets a user read their own
 * `users` row (`users can view their own record`), so this works for staff too.
 */
export async function getDashboardUser(): Promise<DashboardUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const role: UserRole = data?.role === "owner" ? "owner" : "staff";

  return {
    userId: user.id,
    role,
    businessId: (data?.business_id as string | null) ?? null,
  };
}

/**
 * Owner-only page guard. Redirects an unauthenticated visitor to login and a
 * staff member to their agenda. Returns the resolved context for owners.
 *
 * This is a UX guard — the authorization boundary is RLS (owner-only policies),
 * so a staff member who bypassed this would still be unable to mutate
 * owner-scoped data. The redirect just keeps them out of owner-only screens.
 */
export async function requireOwner(locale: string): Promise<DashboardUser> {
  const me = await getDashboardUser();
  if (!me) redirect(`/${locale}/login`);
  if (me.role !== "owner") redirect(`/${locale}/agenda`);
  return me;
}
