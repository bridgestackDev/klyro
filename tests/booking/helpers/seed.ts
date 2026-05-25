import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/types/database";

type VerticalKey =
  | "barbershop"
  | "salon"
  | "fitness"
  | "spa"
  | "tattoo"
  | "carwash"
  | "petgrooming"
  | "other";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for E2E seeding"
    );
  }
  return createClient<Database>(url, key);
}

export interface SeededBusiness {
  bizId: string;
  branchId: string;
  staffId: string;
  serviceId: string;
  bizSlug: string;
  branchSlug: string;
  staffSlug: string;
  serviceName: string;
}

const SERVICE_CONFIG: Record<
  VerticalKey,
  { name: string; duration_minutes: number }
> = {
  barbershop: { name: "Corte de cabello", duration_minutes: 30 },
  fitness: { name: "Sesión de entrenamiento", duration_minutes: 60 },
  salon: { name: "Corte de cabello", duration_minutes: 45 },
  spa: { name: "Masaje relajante", duration_minutes: 60 },
  tattoo: { name: "Tatuaje pequeño", duration_minutes: 60 },
  carwash: { name: "Lavado básico", duration_minutes: 30 },
  petgrooming: { name: "Baño básico", duration_minutes: 45 },
  other: { name: "Servicio", duration_minutes: 30 },
};

export async function seedBusiness(
  vertical: VerticalKey
): Promise<SeededBusiness> {
  const admin = getAdminClient();
  const ts = Date.now();

  const bizSlug = `e2e-${vertical}-${ts}`;
  const branchSlug = `main-${ts}`;
  const staffSlug = `staff-${ts}`;

  const { data: biz, error: bizError } = await admin
    .from("businesses")
    .insert({
      name: `E2E ${vertical} ${ts}`,
      slug: bizSlug,
      vertical,
      country: "HN",
      default_language: "es",
      default_currency: "HNL",
      onboarding_completed: true,
    })
    .select("id")
    .single();
  if (!biz || bizError)
    throw new Error(`seedBusiness businesses: ${bizError?.message}`);

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .insert({
      business_id: biz.id,
      name: "Sucursal principal",
      slug: branchSlug,
      country: "HN",
      timezone: "America/Tegucigalpa",
      is_active: true,
    })
    .select("id")
    .single();
  if (!branch || branchError)
    throw new Error(`seedBusiness branches: ${branchError?.message}`);

  const svcConfig = SERVICE_CONFIG[vertical] ?? SERVICE_CONFIG.other;
  const { data: service, error: serviceError } = await admin
    .from("services")
    .insert({
      business_id: biz.id,
      name: svcConfig.name,
      duration_minutes: svcConfig.duration_minutes,
      price: 200,
      currency: "HNL",
      is_active: true,
    })
    .select("id")
    .single();
  if (!service || serviceError)
    throw new Error(`seedBusiness services: ${serviceError?.message}`);

  const { error: bsError } = await admin.from("branch_services").insert({
    branch_id: branch.id,
    service_id: service.id,
  });
  if (bsError)
    throw new Error(`seedBusiness branch_services: ${bsError.message}`);

  const { data: staff, error: staffError } = await admin
    .from("staff")
    .insert({
      business_id: biz.id,
      display_name: "Carlos Test",
      slug: staffSlug,
      is_active: true,
    })
    .select("id")
    .single();
  if (!staff || staffError)
    throw new Error(`seedBusiness staff: ${staffError?.message}`);

  const { error: sbError } = await admin.from("staff_branches").insert({
    staff_id: staff.id,
    branch_id: branch.id,
  });
  if (sbError)
    throw new Error(`seedBusiness staff_branches: ${sbError.message}`);

  // Availability for every day of the week (0=Sun … 6=Sat), 9 am–6 pm
  const { error: availError } = await admin.from("staff_availability").insert(
    [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      staff_id: staff.id,
      branch_id: branch.id,
      day_of_week: day,
      start_time: "09:00",
      end_time: "18:00",
    }))
  );
  if (availError)
    throw new Error(`seedBusiness staff_availability: ${availError.message}`);

  return {
    bizId: biz.id,
    branchId: branch.id,
    staffId: staff.id,
    serviceId: service.id,
    bizSlug,
    branchSlug,
    staffSlug,
    serviceName: svcConfig.name,
  };
}

export async function cleanupBusiness(bizId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: branches } = await admin
    .from("branches")
    .select("id")
    .eq("business_id", bizId);
  const { data: staffRows } = await admin
    .from("staff")
    .select("id")
    .eq("business_id", bizId);

  const branchIds = (branches ?? []).map((b) => b.id);
  const staffIds = (staffRows ?? []).map((s) => s.id);

  if (staffIds.length > 0) {
    await admin.from("appointments").delete().in("staff_id", staffIds);
    await admin
      .from("staff_availability")
      .delete()
      .in("staff_id", staffIds);
    await admin.from("staff_branches").delete().in("staff_id", staffIds);
  }

  if (branchIds.length > 0) {
    await admin.from("branch_services").delete().in("branch_id", branchIds);
  }

  await admin.from("clients").delete().eq("business_id", bizId);
  await admin.from("staff").delete().eq("business_id", bizId);
  await admin.from("services").delete().eq("business_id", bizId);
  await admin.from("branches").delete().eq("business_id", bizId);
  await admin.from("businesses").delete().eq("id", bizId);
}
