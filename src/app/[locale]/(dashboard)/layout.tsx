import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import type { UserRole } from "@/components/dashboard/nav-items";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Resolve the role so the shell can render role-appropriate navigation.
  // RLS lets a user read their own `users` row.
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role: UserRole = userRow?.role === "owner" ? "owner" : "staff";

  const displayName =
    (user.user_metadata?.["full_name"] as string | undefined) ??
    (user.user_metadata?.["name"] as string | undefined) ??
    user.email ??
    "";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <ThemeProvider>
      <DashboardShell
        locale={locale}
        role={role}
        userEmail={user.email ?? ""}
        userInitial={userInitial}
      >
        {children}
      </DashboardShell>
    </ThemeProvider>
  );
}
