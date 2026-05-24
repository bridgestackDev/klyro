"use client";

import { useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { signInWithGoogle, signInWithApple, signInWithMagicLink } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Mail, Loader2, ArrowRight } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");

  const [magicState, magicAction, isMagicPending] = useActionState(
    signInWithMagicLink,
    {}
  );
  const [isGooglePending, startGoogle] = useTransition();
  const [isApplePending, startApple] = useTransition();

  if (magicState.sent) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--color-bg-elevated)]"
          style={{ boxShadow: "0 0 24px rgba(109,100,251,0.18)" }}
        >
          <Mail className="h-6 w-6 text-[var(--color-violet)]" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[var(--color-text-primary)]">
            {t("magicLinkSent")}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("magicLinkSentDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* OAuth buttons */}
      <form action={() => startGoogle(() => signInWithGoogle())}>
        <Button
          type="submit"
          variant="outline"
          disabled={isGooglePending || isApplePending}
          aria-busy={isGooglePending}
          className="h-11 w-full gap-2.5 border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--color-bg-hover)]"
        >
          {isGooglePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {t("google")}
        </Button>
      </form>

      <form action={() => startApple(() => signInWithApple())}>
        <Button
          type="submit"
          variant="outline"
          disabled={isApplePending || isGooglePending}
          aria-busy={isApplePending}
          className="h-11 w-full gap-2.5 border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--color-bg-hover)]"
        >
          {isApplePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AppleIcon />
          )}
          {t("apple")}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border-subtle)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-bg-surface)] px-3 text-[var(--color-text-muted)]">
            {t("divider")}
          </span>
        </div>
      </div>

      {/* Magic link form */}
      <form action={magicAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className={cn(
              "h-11 border-[var(--border-subtle)] bg-[var(--color-bg-elevated)]",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
              "transition-colors duration-200",
              "focus-visible:border-[var(--color-violet)] focus-visible:ring-[var(--color-violet)]/20"
            )}
          />
        </div>

        {magicState.error && (
          <p className="text-xs text-[var(--color-danger)]" role="alert">
            {magicState.error === "emailRequired"
              ? t("emailRequired")
              : magicState.error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isMagicPending || isGooglePending || isApplePending}
          aria-busy={isMagicPending}
          className="h-11 w-full gap-2 rounded-[var(--radius-button)] bg-[var(--color-violet)] text-white transition-all duration-200 hover:bg-[var(--color-violet-hover)]"
          style={{
            boxShadow: isMagicPending
              ? "none"
              : "0 0 0 1px rgba(109,100,251,0.4), 0 4px 20px rgba(109,100,251,0.28)",
          }}
        >
          {isMagicPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {isMagicPending ? tCommon("loading") : t("magicLinkButton")}
        </Button>
      </form>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        {t("noAccount")}
      </p>
    </div>
  );
}
