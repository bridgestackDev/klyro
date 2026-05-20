"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/errors";
import { slugify } from "@/lib/validation";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
  type Step5Data,
  type Step6Data,
  type Step7Data,
} from "@/lib/schemas/wizard";

type AdminClient = ReturnType<typeof createAdminClient>;

async function getVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getVerifiedUserAndBusiness(admin: AdminClient) {
  const user = await getVerifiedUser();
  if (!user) return { user: null, businessId: null };

  const { data: userData } = await admin
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  return { user, businessId: (userData?.business_id as string | null) ?? null };
}

export async function saveBusinessStep(
  step1: Step1Data,
  step2: Step2Data
): Promise<{ businessId: string; error?: string }> {
  try {
    // C2: server-side Zod validation
    const p1 = step1Schema.safeParse(step1);
    const p2 = step2Schema.safeParse(step2);
    if (!p1.success) return { businessId: "", error: p1.error.issues[0]?.message };
    if (!p2.success) return { businessId: "", error: p2.error.issues[0]?.message };

    const user = await getVerifiedUser();
    if (!user) return { businessId: "", error: ApiError.unauthorized().code };

    const admin = createAdminClient();

    const { data: userData } = await admin
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .single();

    const existingId = (userData?.business_id as string | null) ?? null;

    if (existingId) {
      const { error } = await admin
        .from("businesses")
        .update({ name: p2.data.name, slug: p2.data.slug, vertical: p1.data.vertical })
        .eq("id", existingId);
      // I5: map slug unique violation to user-friendly message
      if (error?.code === "23505") return { businessId: "", error: ApiError.slugTaken(p2.data.slug).code };
      if (error) return { businessId: "", error: error.message };
      return { businessId: existingId };
    }

    const { data: biz, error } = await admin
      .from("businesses")
      .insert({
        name: p2.data.name,
        slug: p2.data.slug,
        vertical: p1.data.vertical,
        country: "HN",
        default_language: "es",
        default_currency: "HNL",
      })
      .select("id")
      .single();

    // I5: map slug unique violation to user-friendly message
    if (error?.code === "23505") return { businessId: "", error: ApiError.slugTaken(p2.data.slug).code };
    if (error || !biz) return { businessId: "", error: error?.message };

    await admin.from("users").update({ business_id: biz.id }).eq("id", user.id);

    return { businessId: biz.id };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { businessId: "", error: err.code };
  }
}

export async function saveBranchStep(
  step3: Step3Data,
  businessId: string,
  existingBranchId: string | null
): Promise<{ branchId: string; branchSlug: string; error?: string }> {
  try {
    // C2: server-side Zod validation
    const parsed = step3Schema.safeParse(step3);
    if (!parsed.success) return { branchId: "", branchSlug: "", error: parsed.error.issues[0]?.message };

    const admin = createAdminClient();

    // C1: verify businessId belongs to this user
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { branchId: "", branchSlug: "", error: ApiError.unauthorized().code };
    if (!ownBusinessId || ownBusinessId !== businessId) return { branchId: "", branchSlug: "", error: "NOT_AUTHORIZED" };

    const slug = slugify(parsed.data.branchName);

    if (existingBranchId) {
      // C1: verify branch belongs to this business
      const { data: branchCheck } = await admin
        .from("branches")
        .select("id")
        .eq("id", existingBranchId)
        .eq("business_id", ownBusinessId)
        .single();
      if (!branchCheck) return { branchId: "", branchSlug: "", error: "NOT_AUTHORIZED" };

      // I2: check update error
      const { error } = await admin
        .from("branches")
        .update({
          name: parsed.data.branchName,
          slug,
          address: parsed.data.address || null,
          city: parsed.data.city || null,
          phone: parsed.data.phone || null,
          timezone: parsed.data.timezone,
        })
        .eq("id", existingBranchId);
      if (error) return { branchId: "", branchSlug: "", error: error.message };
      return { branchId: existingBranchId, branchSlug: slug };
    }

    const { data: branch, error } = await admin
      .from("branches")
      .insert({
        business_id: businessId,
        name: parsed.data.branchName,
        slug,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        phone: parsed.data.phone || null,
        timezone: parsed.data.timezone,
      })
      .select("id")
      .single();

    if (error || !branch) return { branchId: "", branchSlug: "", error: error?.message };
    return { branchId: branch.id, branchSlug: slug };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { branchId: "", branchSlug: "", error: err.code };
  }
}

export async function saveServicesStep(
  step4: Step4Data,
  businessId: string,
  branchId: string
): Promise<{ error?: string }> {
  try {
    // C2: server-side Zod validation
    const parsed = step4Schema.safeParse(step4);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const admin = createAdminClient();

    // C1: verify businessId and branchId belong to this user
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { error: ApiError.unauthorized().code };
    if (!ownBusinessId || ownBusinessId !== businessId) return { error: "NOT_AUTHORIZED" };

    const { data: branchCheck } = await admin
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", ownBusinessId)
      .single();
    if (!branchCheck) return { error: "BRANCH_NOT_FOUND" };

    // Atomically replace all branch services via a stored procedure (see migration 0007)
    const servicesPayload = parsed.data.services.map((s) => ({
      name: s.name,
      duration_minutes: s.durationMinutes,
      price: s.price,
      currency: s.currency,
    }));

    const { error: rpcError } = await admin.rpc("replace_branch_services", {
      p_branch_id: branchId,
      p_business_id: businessId,
      p_services: servicesPayload,
    });

    if (rpcError) return { error: rpcError.message };
    return {};
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { error: err.code };
  }
}

export async function saveStaffStep(
  step5: Step5Data,
  businessId: string,
  branchId: string,
  existingStaffId: string | null
): Promise<{ staffId: string; error?: string }> {
  try {
    // C2: server-side Zod validation
    const parsed = step5Schema.safeParse(step5);
    if (!parsed.success) return { staffId: "", error: parsed.error.issues[0]?.message };

    const admin = createAdminClient();

    // C1: verify businessId and branchId belong to this user
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { staffId: "", error: ApiError.unauthorized().code };
    if (!ownBusinessId || ownBusinessId !== businessId) return { staffId: "", error: "NOT_AUTHORIZED" };

    const { data: branchCheck } = await admin
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", ownBusinessId)
      .single();
    if (!branchCheck) return { staffId: "", error: "BRANCH_NOT_FOUND" };

    if (existingStaffId) {
      // C1: verify existing staff belongs to this business
      const { data: staffCheck } = await admin
        .from("staff")
        .select("id")
        .eq("id", existingStaffId)
        .eq("business_id", ownBusinessId)
        .single();
      if (!staffCheck) return { staffId: "", error: "STAFF_NOT_FOUND" };

      // I2: check update error
      const { error } = await admin
        .from("staff")
        .update({ display_name: parsed.data.ownerName, slug: parsed.data.ownerSlug })
        .eq("id", existingStaffId);
      if (error) return { staffId: "", error: error.message };
      return { staffId: existingStaffId };
    }

    const { data: staff, error } = await admin
      .from("staff")
      .insert({
        business_id: businessId,
        user_id: user.id,
        display_name: parsed.data.ownerName,
        slug: parsed.data.ownerSlug,
      })
      .select("id")
      .single();

    if (error || !staff) return { staffId: "", error: error?.message };

    await admin
      .from("staff_branches")
      .insert({ staff_id: staff.id, branch_id: branchId });

    return { staffId: staff.id };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { staffId: "", error: err.code };
  }
}

export async function saveAvailabilityStep(
  step6: Step6Data,
  staffId: string,
  branchId: string
): Promise<{ error?: string }> {
  try {
    // C2: server-side Zod validation
    const parsed = step6Schema.safeParse(step6);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const admin = createAdminClient();

    // C1: verify staffId and branchId belong to this user's business
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { error: ApiError.unauthorized().code };
    if (!ownBusinessId) return { error: "BUSINESS_NOT_FOUND" };

    const [{ data: staffCheck }, { data: branchCheck }] = await Promise.all([
      admin.from("staff").select("id").eq("id", staffId).eq("business_id", ownBusinessId).single(),
      admin.from("branches").select("id").eq("id", branchId).eq("business_id", ownBusinessId).single(),
    ]);
    if (!staffCheck || !branchCheck) return { error: "NOT_AUTHORIZED" };

    await admin
      .from("staff_availability")
      .delete()
      .eq("staff_id", staffId)
      .eq("branch_id", branchId);

    const { error } = await admin.from("staff_availability").insert(
      parsed.data.availability.map((a) => ({
        staff_id: staffId,
        branch_id: branchId,
        day_of_week: a.dayOfWeek,
        start_time: a.startTime,
        end_time: a.endTime,
      }))
    );

    return { error: error?.message };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { error: err.code };
  }
}

export async function saveMessagingStep(
  step7: Step7Data,
  branchId: string
): Promise<{ error?: string }> {
  try {
    // C2: server-side Zod validation
    const parsed = step7Schema.safeParse(step7);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const admin = createAdminClient();

    // C1: verify branchId belongs to this user's business
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { error: ApiError.unauthorized().code };
    if (!ownBusinessId) return { error: "BUSINESS_NOT_FOUND" };

    const { data: branchCheck } = await admin
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", ownBusinessId)
      .single();
    if (!branchCheck) return { error: "BRANCH_NOT_FOUND" };

    // I2: check update error
    const { error } = await admin
      .from("branches")
      .update({
        whatsapp_number:
          parsed.data.channel === "whatsapp" ? parsed.data.whatsappNumber || null : null,
      })
      .eq("id", branchId);

    return { error: error?.message };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { error: err.code };
  }
}

export async function completeSetup(
  businessId: string
): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient();

    // C1: verify businessId belongs to this user
    const { user, businessId: ownBusinessId } = await getVerifiedUserAndBusiness(admin);
    if (!user) return { error: ApiError.unauthorized().code };
    if (!ownBusinessId || ownBusinessId !== businessId) return { error: "NOT_AUTHORIZED" };

    const { error } = await admin
      .from("businesses")
      .update({ onboarding_completed: true })
      .eq("id", businessId);

    if (!error) revalidatePath("/", "layout");

    return { error: error?.message };
  } catch (e) {
    const err = e instanceof ApiError ? e : ApiError.internal(e instanceof Error ? e : undefined);
    return { error: err.code };
  }
}
