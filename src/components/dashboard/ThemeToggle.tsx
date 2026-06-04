"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/shared/ThemeProvider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Monitor, labelKey: "system" },
] as const;

/**
 * Compact 3-segment theme control (light / dark / system) for the dashboard
 * navbar. Renders nothing as "active" until mounted to avoid a hydration
 * mismatch — next-themes can only resolve the stored/system preference on the
 * client.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("dashboard.theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const current = mounted ? theme : undefined;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-base)] p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={t(labelKey)}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
