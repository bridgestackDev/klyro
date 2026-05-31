import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgendaView } from "./AgendaView";

function getAppointmentWindow(): { now: string; weekAhead: string } {
  const ms = Date.now();
  return {
    now: new Date(ms).toISOString(),
    weekAhead: new Date(ms + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

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

  const { data: userRow } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const businessId = userRow?.business_id ?? null;

  const { now, weekAhead } = getAppointmentWindow();

  const { data: appointments } = businessId
    ? await supabase
        .from("appointments")
        .select(`
          id, starts_at, ends_at, status, booking_code,
          client:clients ( full_name, phone ),
          staff:staff ( display_name ),
          service:services ( name )
        `)
        .eq("business_id", businessId)
        .gte("starts_at", now)
        .lte("starts_at", weekAhead)
        .order("starts_at", { ascending: true })
        .limit(50)
    : { data: [] };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">
        {t("nav.agenda")}
      </h1>
      <AgendaView appointments={appointments ?? []} />
    </div>
  );
}
