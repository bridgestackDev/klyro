"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

function callbackUrl() {
  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  // Route is at app/[locale]/(auth)/callback — URL is /{locale}/callback,
  // not /auth/callback. Use /callback so next-intl adds the locale prefix.
  return `${base}/callback`;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "oauth_error")}`);
  }
  redirect(data.url);
}

export async function signInWithApple() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: callbackUrl() },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "oauth_error")}`);
  }
  redirect(data.url);
}

export async function signInWithMagicLink(
  _prevState: { error?: string; sent?: boolean },
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = formData.get("email")?.toString().trim();
  if (!email) return { error: "emailRequired" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl() },
  });

  if (error) return { error: error.message };
  return { sent: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
