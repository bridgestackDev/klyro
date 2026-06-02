import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgendaView } from "@/components/dashboard/agenda/AgendaView";
import {
  agendaFetchWindow,
  normalizeAgendaRows,
  resolveBusinessTimezone,
  todayYmd,
  type RawAgendaRow,
} from "@/lib/dashboard/agenda-data";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  // RLS scopes every query below to the owner's business.
  const [{ data: branchRows }, { data: staffRows }] = await Promise.all([
    supabase.from("branches").select("id, name, timezone, is_active"),
    supabase.from("staff").select("id, display_name, is_active"),
  ]);

  const branches = (branchRows ?? []) as Array<{
    id: string;
    name: string;
    timezone: string;
    is_active: boolean;
  }>;
  const tz = resolveBusinessTimezone(branches);
  const now = new Date();
  const { start, end } = agendaFetchWindow(now, tz);

  const { data: apptRows } = await supabase
    .from("appointments")
    .select(
      `id, starts_at, ends_at, status, booking_code, notes,
       client:clients ( full_name, phone, email ),
       service:services ( name ),
       staff:staff ( id, display_name ),
       branch:branches ( id, name )`
    )
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true })
    .limit(500);

  const appointments = normalizeAgendaRows((apptRows ?? []) as unknown as RawAgendaRow[]);

  const activeBranches = branches
    .filter((b) => b.is_active)
    .map((b) => ({ id: b.id, name: b.name }));
  const activeStaff = ((staffRows ?? []) as Array<{
    id: string;
    display_name: string;
    is_active: boolean;
  }>)
    .filter((s) => s.is_active)
    .map((s) => ({ id: s.id, name: s.display_name }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t("nav.agenda")}
      </h1>
      <AgendaView
        appointments={appointments}
        branches={activeBranches}
        staff={activeStaff}
        tz={tz}
        locale={locale}
        todayYmd={todayYmd(now, tz)}
      />
    </div>
  );
}
