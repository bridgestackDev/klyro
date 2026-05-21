import { createClient } from "@/lib/supabase/server";
import { SetupWizard } from "@/components/wizard/SetupWizard";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed non-null here — the layout auth guard redirects
  // unauthenticated requests to /login before this page renders.
  const displayName =
    (user!.user_metadata["full_name"] as string | undefined) ??
    (user!.user_metadata["name"] as string | undefined) ??
    user!.email?.split("@")[0] ??
    "";

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-4 sm:py-10"
      style={{
        background: "var(--grad-wizard-bg), var(--color-bg-base)",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-[620px]">
        <SetupWizard locale={locale} ownerDisplayName={displayName} />
      </div>
    </div>
  );
}
