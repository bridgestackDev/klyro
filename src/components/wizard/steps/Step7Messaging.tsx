"use client";

import { useState } from "react";
import { MessageCircle, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { isValidWhatsAppNumber } from "@/lib/validation";
import { type CountryCode } from "@/lib/i18n/countries";
import { CountryPhoneInput } from "../CountryPhoneInput";
import { useWizard } from "../WizardContext";

export function Step7Messaging() {
  const t = useTranslations("wizard.steps.messaging");
  const { data, updateData } = useWizard();
  const { channel, whatsappNumber } = data.step7;
  const country = (data.step3.country ?? "HN") as CountryCode;
  const [waError, setWaError] = useState<string | null>(null);

  const setChannel = (ch: "whatsapp" | "email") => {
    updateData({ step7: { ...data.step7, channel: ch } });
    setWaError(null);
  };

  const handleWaBlur = () => {
    if (!whatsappNumber?.trim()) {
      setWaError(null);
      return;
    }
    const valid = isValidWhatsAppNumber(whatsappNumber, country);
    setWaError(valid ? null : t("whatsappInvalid"));
  };

  const handleWaChange = (e164: string) => {
    updateData({ step7: { ...data.step7, whatsappNumber: e164 } });
    if (waError) setWaError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <ChannelCard
          icon={<MessageCircle className="h-5 w-5" />}
          label={t("whatsapp")}
          description={t("whatsappDesc")}
          selected={channel === "whatsapp"}
          onSelect={() => setChannel("whatsapp")}
          badge={t("whatsappBadge")}
        />
        <ChannelCard
          icon={<Mail className="h-5 w-5" />}
          label={t("email")}
          description={t("emailDesc")}
          selected={channel === "email"}
          onSelect={() => setChannel("email")}
        />
      </div>

      {channel === "whatsapp" && (
        <div className="space-y-1.5">
          <label
            htmlFor="messaging-whatsapp"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("whatsappNumberLabel")}
          </label>
          <CountryPhoneInput
            id="messaging-whatsapp"
            country={country}
            value={whatsappNumber ?? ""}
            onChange={handleWaChange}
            onBlur={handleWaBlur}
            ariaLabel={t("phone.prefixAriaLabel")}
            error={waError ?? undefined}
          />
        </div>
      )}
    </div>
  );
}

function ChannelCard({
  icon,
  label,
  description,
  selected,
  onSelect,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-start gap-4 rounded-[var(--radius-card)] border p-4 text-left transition-all",
        selected
          ? "border-[var(--color-violet)] bg-[var(--color-violet)]/10 shadow-[0_0_0_1px_var(--color-violet)]"
          : "border-[var(--border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-violet)]/40 hover:bg-[var(--color-bg-elevated)]",
      ].join(" ")}
    >
      <div
        className={[
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          selected
            ? "bg-[var(--color-violet)] text-white"
            : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
        ].join(" ")}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label}
          </span>
          {badge && (
            <span className="rounded-full bg-[var(--color-violet)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-violet-soft)]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      {/* Radio dot */}
      <div
        className={[
          "mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
          selected
            ? "border-[var(--color-violet)] bg-[var(--color-violet)]"
            : "border-[var(--color-text-muted)]",
        ].join(" ")}
      />
    </button>
  );
}
