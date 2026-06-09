"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { navItemsForRole, type UserRole } from "./nav-items";
import type { SidebarMode } from "./DashboardShell";

interface SidebarProps {
  locale: string;
  role: UserRole;
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
}

const MODES: { key: SidebarMode; labelKey: string }[] = [
  { key: "expanded", labelKey: "sidebarExpanded" },
  { key: "collapsed", labelKey: "sidebarCollapsed" },
  { key: "hover", labelKey: "sidebarHover" },
];

export function Sidebar({ locale, role, mode, onModeChange }: SidebarProps) {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const navItems = navItemsForRole(role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ bottom: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleToggle() {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopoverPos({
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
      });
    }
    setMenuOpen((v) => !v);
  }

  const isExpanded = mode === "expanded";
  const isHover = mode === "hover";

  return (
    <div
      className={cn(
        "relative hidden shrink-0 lg:block",
        isExpanded ? "w-56" : "w-14"
      )}
    >
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-10 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--color-bg-surface)] transition-[width] duration-200 ease-in-out",
          isExpanded ? "w-56" : "w-14",
          isHover && "group hover:w-56"
        )}
      >
        {/* Nav — overflow-hidden clips invisible labels */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden px-1.5 py-3">
          {navItems.map(({ key, href, icon: Icon }) => {
            const fullHref = `/${locale}${href}`;
            const isActive =
              pathname === fullHref || pathname.startsWith(`${fullHref}/`);
            return (
              <Link
                key={key}
                href={fullHref}
                title={mode === "collapsed" ? t(key as Parameters<typeof t>[0]) : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 transition-colors",
                  isActive
                    ? "bg-[var(--color-violet)]/15 text-[var(--color-violet-soft)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span
                  className={cn(
                    "truncate text-sm font-medium transition-opacity duration-150",
                    isExpanded
                      ? "opacity-100"
                      : isHover
                        ? "opacity-0 group-hover:opacity-100"
                        : "opacity-0"
                  )}
                >
                  {t(key as Parameters<typeof t>[0])}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar control button */}
        <div className="border-t border-[var(--border-subtle)] px-1.5 py-2">
          <button
            ref={btnRef}
            onClick={handleToggle}
            title={t("sidebarControl")}
            className="flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          >
            <PanelLeft className="h-[18px] w-[18px] shrink-0" />
            <span
              className={cn(
                "truncate text-sm transition-opacity duration-150",
                isExpanded
                  ? "opacity-100"
                  : isHover
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-0"
              )}
            >
              {t("sidebarControl")}
            </span>
          </button>
        </div>
      </aside>

      {/* Popover rendered with fixed positioning to escape all overflow-hidden ancestors */}
      {menuOpen && popoverPos && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            bottom: popoverPos.bottom,
            left: popoverPos.left,
            zIndex: 9999,
          }}
          className="w-52 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-elevated)] shadow-xl"
        >
          <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              {t("sidebarControl")}
            </p>
          </div>
          {MODES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => {
                onModeChange(key);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-hover)]"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  mode === key
                    ? "border-[var(--color-violet-soft)] bg-[var(--color-violet-soft)]"
                    : "border-[var(--border-subtle)]"
                )}
              >
                {mode === key && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              {t(labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
