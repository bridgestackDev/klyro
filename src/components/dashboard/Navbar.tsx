"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

interface NavbarProps {
  locale: string;
  userEmail?: string;
  userInitial?: string;
}

function UserMenu({
  userEmail,
  userInitial,
}: {
  userEmail?: string;
  userInitial?: string;
}) {
  const t = useTranslations("dashboard.nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-xl px-2.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-violet)]/20 text-xs font-bold text-[var(--color-violet-soft)]">
          {userInitial ?? "?"}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] shadow-lg">
          <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {userEmail}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MobileNavSheet({
  locale,
  userEmail,
  userInitial,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--color-text-muted)]"
          />
        }
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-r border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-0"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex h-14 items-center px-1">
            <Logo variant="lockup" theme="dark" className="h-9" />
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
              const fullHref = `/${locale}${href}`;
              const isActive =
                pathname === fullHref || pathname.startsWith(`${fullHref}/`);
              return (
                <Link
                  key={key}
                  href={fullHref}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-violet)]/15 text-[var(--color-violet-soft)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{t(key as Parameters<typeof t>[0])}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-violet)]/20 text-xs font-bold text-[var(--color-violet-soft)]">
                {userInitial ?? "?"}
              </div>
              <span className="flex-1 truncate text-xs text-[var(--color-text-muted)]">
                {userEmail}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                  aria-label={t("signOut")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Navbar({ locale, userEmail, userInitial }: NavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4">
      {/* Mobile hamburger */}
      <div className="mr-3 lg:hidden">
        <MobileNavSheet
          locale={locale}
          userEmail={userEmail}
          userInitial={userInitial}
        />
      </div>

      {/* Logo */}
      <div className="flex items-center">
        <Logo variant="lockup" theme="dark" className="h-9" />
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* User menu */}
        <UserMenu userEmail={userEmail} userInitial={userInitial} />
      </div>
    </header>
  );
}
